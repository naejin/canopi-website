// Golden scenario runner and recorder for the single verdict engine (src/lib/palette/report.ts):
// runs all 44 real-place cases in scripts/fixtures/consortium-scenarios.json through
// resolveEffectiveSite + evaluatePlantVerdict + computeReport on the installed consortium release.
//
//   node --experimental-strip-types scripts/palette-scenarios.mjs --outputs
//
// re-records every case's output from report.ts at HEAD using the fixture's embedded climate/soil
// places (no climate tiles needed). scripts/palette-scenarios.test.mjs verifies every case in CI.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
export const FILE = new URL('scripts/fixtures/consortium-scenarios.json', ROOT);
export const consortiumIndex = JSON.parse(readFileSync(new URL('src/data/palette-index.json', ROOT), 'utf8'));
export const releaseFile = new URL(`public${consortiumIndex.files[0].url}`, ROOT);

const { computeReport } = await import('../src/lib/palette/report.ts');
const { openBytes } = await import('../src/islands/palette/data/load.ts');
const { createSqliteSource } = await import('../src/islands/palette/data/sqlite-source.ts');

let opened = null;
const pools = new Map();

export async function pool(list) {
  if (!opened) {
    const db = await openBytes(new Uint8Array(gunzipSync(readFileSync(releaseFile))), {
      releaseId: consortiumIndex.release_id,
      climates: consortiumIndex.climates,
    });
    opened = createSqliteSource(db.db, { images: {} });
  }
  if (!pools.has(list)) pools.set(list, await opened.pool(list));
  return pools.get(list);
}

export function horizonOf(period, scenario = 'ssp245') {
  if (period === '1991-2020') return 'today';
  if (period === '2041-2070') {
    if (scenario === 'ssp126') return 'y2050_ssp126';
    if (scenario === 'ssp370') return 'y2050_ssp370';
    if (scenario === 'ssp585') return 'y2050_ssp585';
    return 'y2050';
  }
  if (period === '2071-2099') {
    return scenario === 'ssp585' ? 'y2080_ssp585' : 'y2080_ssp245';
  }
  throw new Error(`unsupported period ${period} (${scenario})`);
}

function applyRainEdits(periods, edits) {
  const rainShiftMm = edits?.rainShiftMm ?? 0;
  const dryMonthsShift = edits?.dryMonthsShift ?? 0;
  if (!rainShiftMm && !dryMonthsShift) return periods;
  return periods.map((p) => {
    const precipMm = Math.max(0, Math.round(p.precipMm + rainShiftMm));
    const aridityIndex = p.aridityIndex == null || p.precipMm <= 0
      ? p.aridityIndex
      : Math.round((p.aridityIndex * precipMm / p.precipMm) * 1000) / 1000;
    const dryMonths = Math.max(0, Math.min(12, Math.round(p.dryMonths + dryMonthsShift)));
    return { ...p, precipMm, aridityIndex, dryMonths };
  });
}

export function lookupOf(input, places) {
  const place = input.place === null ? null : places[input.place];
  if (input.place !== null && !place) throw new Error(`no place ${input.place} in the file`);
  if (!place) return null;
  const periods = applyRainEdits(place.periods, input.edits);
  const soil = input.pots ? null : (place.soil ?? null);
  return {
    lat: place.lat,
    lon: place.lon,
    climate: periods.length
      ? { cellLat: place.lat, cellLon: place.lon, distanceCells: 0, periods }
      : null,
    soil,
    regions: { wgsrpdL3: null, isoA2: null },
  };
}

export function overridesOf(input) {
  const e = input.edits ?? {};
  const out = {};
  if (input.room) out.room = input.room;
  if (e.watering !== undefined) out.watering = e.watering;
  if (e.soilPh !== undefined) out.soilPh = e.soilPh;
  if (e.drainage !== undefined) out.drainage = e.drainage;
  if (e.coldAir !== undefined) out.coldAir = e.coldAir;
  if (e.nightsShiftC !== undefined) out.nightsShiftC = e.nightsShiftC;
  if (e.daysShiftC !== undefined) out.daysShiftC = e.daysShiftC;
  return out;
}

// One case's output from report.ts: plain JSON, keys and codes only (never a locale string).
export async function run(input, places) {
  const list = await pool(input.list);
  const byId = new Map(list.map((t) => [t.id, t]));
  const members = input.members.map((id) => {
    const t = byId.get(id);
    if (!t) throw new Error(`${id} is not in the ${input.list} list of the installed release`);
    return t;
  });

  const report = computeReport({
    taxa: members,
    lookup: lookupOf(input, places),
    climateZone: input.list,
    horizon: horizonOf(input.period, input.scenario),
    overrides: overridesOf(input),
    plantsPerJob: input.goals?.plantsPerJob ?? 2,
  });

  const fit = { fits: [], check: [], at_risk: [], unknown: [] };
  const reasons = {};
  const notes = {};
  for (const t of members) {
    const v = report.verdicts.get(t.id);
    fit[v.level].push(t.id);
    if (v.reasons.length) reasons[t.id] = v.reasons.map((r) => r.code);
    if (v.notes.length) notes[t.id] = [...v.notes];
  }

  const backedUp = report.jobStats.filter((j) => j.status === 'backed_up').map((j) => j.job);
  const r = report.robustness;
  const eff = report.eff;

  return {
    effective: {
      koppen: eff.koppen,
      tmin_cold_c: eff.tminColdC,
      tmax_warm_c: eff.tmaxWarmC,
      soil_ph: eff.soilPh,
      watering: eff.watering,
      drainage: eff.drainage,
      cold_air: eff.coldAir,
      room: eff.room,
    },
    fit,
    reasons,
    notes,
    jobs: {
      covered: report.coveredJobs,
      missing: [...report.missingJobs],
      no_backup: [...report.noBackupJobs],
      backed_up: backedUp,
    },
    robustness: {
      strong_pillars: r.strongPillars,
      redundancy_ok: r.redundancyOk,
      family_diversity_ok: r.familyDiversityOk,
      shock_survival_ok: r.shockSurvivalOk,
      seasonality_ok: r.seasonalityOk,
      family_count: r.familyCount,
      monoculture_warn: r.monocultureWarn,
      survives_all_core: r.survivesAllCore,
      unknown_core_count: r.unknownCoreCount,
      worst_scenario: r.worstScenario?.id ?? null,
    },
  };
}

// Two-space JSON with flat arrays of numbers/strings on one line (readable diffs, compact file).
function layout(value, indent = '') {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    if (value.every((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null)) {
      return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
    }
    const inner = indent + '  ';
    return `[\n${value.map((v) => inner + layout(v, inner)).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    const inner = indent + '  ';
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${layout(v, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function roundRobinFill(list, existingIds, targetCount) {
  const seen = new Set(existingIds);
  const out = [...existingIds];
  if (out.length >= targetCount) return out;
  const groups = new Map();
  for (const t of [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    if (seen.has(t.id)) continue;
    const k = t.stratum?.value ?? 'none';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t.id);
  }
  for (let i = 0; out.length < targetCount; i++) {
    let took = false;
    for (const g of groups.values()) {
      if (g[i] && out.length < targetCount) {
        out.push(g[i]);
        took = true;
      }
    }
    if (!took) break;
  }
  return out;
}

async function rerun() {
  const file = JSON.parse(readFileSync(FILE, 'utf8'));
  file.format_version = 3;
  file.release_id = consortiumIndex.release_id;
  file.note = [
    'Golden file recorded from the single verdict engine (src/lib/palette/report.ts) by scripts/palette-scenarios.mjs --outputs; scripts/palette-scenarios.test.mjs runs all 44 cases.',
    'The contract for a later Rust port of the engine: the same inputs must give the same outputs.',
    'places: each place\'s climate slots (today and the 8 future slots) and its soil reading (phH2o, texture, filled, fillDistanceCells, distanceCells; null: no soil value) as the climate and soil grid reader answers them at its coordinates.',
    'Inputs: the list, the place (a name in places, or null: no location), the period, the scenario (default ssp245), the room (default unsure), the palette goals (default plantsPerJob 2), the grower edits (climate shifts, soil test pH, watering, drainage, coldAir), pots (brought-in soil ignores map soil pH) and the member plant ids of the release.',
    'Outputs, keys and codes only: effective (resolved site climate/soil/overrides), fit (member ids by level: fits, check, at_risk, unknown), reasons (per-member verdict reason codes), notes (per-member verdict note codes), jobs (covered count, missing, no_backup, backed_up), robustness (pillars, diversity, shock survival, worst scenario).',
  ];
  const plants = {};
  for (const c of file.cases) {
    const list = await pool(c.input.list);
    for (const t of list) plants[t.id] ??= t.canonical_name;
    const byId = new Set(list.map((t) => t.id));
    const kept = c.input.members.filter((id) => byId.has(id));
    if (kept.length !== c.input.members.length) {
      c.input.members = roundRobinFill(list, kept, c.input.members.length);
    }
    c.output = await run(c.input, file.places);
  }
  const named = new Set(JSON.stringify(file.cases).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g));
  file.plants = Object.fromEntries(
    Object.entries(plants)
      .filter(([pid]) => named.has(pid))
      .sort(([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  writeFileSync(FILE, layout(file) + '\n');
  console.log(`Re-ran ${file.cases.length} cases on ${file.release_id} (format_version 3).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url) && (process.argv.includes('--outputs') || process.argv.includes('--record'))) {
  await rerun();
}
