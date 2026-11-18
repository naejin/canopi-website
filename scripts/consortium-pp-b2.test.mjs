// PP-B stream b2 (plant-palette-slices section 2, row b2; plant-palette-architecture 3.2-3.5): the
// lasting layer under the palette page. The core verdict engine (verdict.ts) on its vectors
// (scripts/vectors/verdicts.json, website cases) and on canopi-data's range-verdict vectors (the
// stamped copy scripts/vectors/range-verdicts.json, run here, never copied: its release-id test is in
// install-consortium.test.mjs); holes and fillers (holes.ts) on scripts/vectors/holes.json; the words
// of verdicts, holes and years (verdict-line.ts); Kiambu through the store's countFits on the real
// export (b1b: 305 of 515, guests left out). Written failing first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { taxon } from './consortium-p5-fixtures.mjs';

// The rule files' own helpers come from the files (index.ts names only what the views read, fix round 1 B3).
const core = { ...(await import('../src/lib/consortium/index.ts')), ...(await import('../src/lib/consortium/site.ts')), ...(await import('../src/lib/consortium/range.ts')), ...(await import('../src/lib/consortium/future.ts')) };
const { verdict, verdicts, judgedPeriod, holdsBy } = await import('../src/lib/consortium/verdict.ts');
const { gain } = await import('../src/lib/consortium/suggest.ts');
const vectors = (f) => JSON.parse(readFileSync(new URL(`vectors/${f}`, import.meta.url), 'utf8'));
const V = vectors('verdicts.json'), H = vectors('holes.json'), RV = vectors('range-verdicts.json');

// ---- the adapter from the vectors' export fields to the core's Taxon (convention palette-vectors) ----
const range = (r) => (r ? { low: r.low ?? null, median: null, high: r.high ?? null, count: 100, basis: 'thinned_cells', weak: r.weak ?? false } : null);
function plantOf(key, p) {
  const climate = p.climate ?? p; // range_source null: the export has no range for the plant
  const any = p.range_source !== null && ['tmin_cold', 'tmax_warm', 'tmean_year', 'tmean_warm', 'aridity'].some((k) => climate[k]);
  return taxon({
    id: key, canonical_name: p.name ?? key, genus: 'X', family: 'X', role: p.role ?? 'crop',
    stratum: p.stratum ? { value: p.stratum, sources: [] } : null,
    phases: p.phase_start ? { start: p.phase_start, end: p.phase_end, sources: [] } : null,
    functions: p.functions ? p.functions.map((f) => ({ function: f, sources: [] })) : null,
    traits: {
      is_annual: p.is_annual ?? null, grown_as_annual: p.grown_as_annual ?? null,
      sun: p.sun ?? null, semi_shade: p.semi_shade ?? null, full_shade: p.full_shade ?? null,
      ...(p.height_max_m ? { height_m: { min: null, max: p.height_max_m } } : {}),
    },
    warnings: { toxicity: p.toxicity ?? null, invasive_in: (p.invasive_in ?? []).map((country) => ({ country, sources: ['griis'] })), allelopathic: null, weed_potential: null },
    climate: any ? {
      source: p.range_source ?? 'gbif_occurrences', cells: 1000, nativeShare: null, // the vectors carry no record count: never 'few-records'
      tminCold: range(climate.tmin_cold), tmaxWarm: range(climate.tmax_warm), tmeanYear: range(climate.tmean_year), tmeanWarm: range(climate.tmean_warm), aridity: range(climate.aridity),
    } : null,
  });
}
const slotOf = (r) => ({
  period: r.period, scenario: r.scenario, koppen: 'Cfb', koppenTemperatureMarginC: 0,
  tminColdC: r.tmin_cold_c, tmaxWarmC: r.tmax_warm_c, tmeanColdC: r.tmean_cold_c, tmeanWarmC: r.tmean_warm_c, aridityIndex: r.aridity_index ?? null,
});
const lookupOf = (rows) => (rows ? { lat: 0, lon: 0, climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: rows.map(slotOf) }, soil: null, regions: { wgsrpdL3: null, isoA2: null } } : null);
// A vector place's words as grower edits of the site inputs (site-inputs.ts): l the light, h the cold air
// (height), w 'wet' the drainage; the page reaches none of them until the figures panel and PP-F.
const editsOf = (words = {}) => ({ ...(words.l ? { light: words.l } : {}), ...(words.h ? { coldAir: words.h } : {}), ...(words.w === 'wet' ? { drainage: 'wet' } : {}) });
const inputsOf = (lookup, words, room) => core.siteInputsOf({ lookup, room, edits: editsOf(words) });
const vPlant = (k) => plantOf(k, V.plants[k]);
const vCtx = (input, period = V.thresholds.today_period) => ({
  inputs: inputsOf(lookupOf(input.climate ? V.climates[input.climate] : null), V.places[input.place], input.room),
  period, scenario: V.thresholds.scenario, canopy: core.canopyOf((input.members ?? []).map(vPlant)),
});

test('verdicts.json: a known schema id, and every plant, place and climate a case names is in the file', () => {
  assert.equal(V.schema, 'canopi-palette-verdicts/1');
  for (const c of V.cases) {
    for (const k of [c.input.plant, ...(c.input.members ?? [])]) assert.ok(V.plants[k], `${c.name}: plant ${k}`);
    if (c.input.place) assert.ok(V.places[c.input.place], `${c.name}: place ${c.input.place}`);
    if (c.input.climate) assert.ok(V.climates[c.input.climate], `${c.name}: climate ${c.input.climate}`);
  }
  assert.equal(V.thresholds.margin_c, core.RANGE_MARGIN_C);
});

test('PP-B (b2 verdict engine, 3.2): verdicts.json, website cases (shade relief, levels, not checked, notes, judgedPeriod, holdsBy)', () => {
  for (const c of V.cases) {
    const t = vPlant(c.input.plant);
    if ('page' in c.input) { assert.equal(judgedPeriod(t, c.input.page), c.expect.judged, c.name); continue; }
    if ('holds_by' in c.input) { assert.equal(holdsBy(t, vCtx(c.input), c.input.holds_by), c.expect.holds, c.name); continue; }
    const v = verdict(t, vCtx(c.input));
    assert.equal(v.level, c.expect.level, `${c.name}: level (verdict stub returns unknown)`);
    if ('limiting' in c.expect) assert.equal(v.limiting?.factor, c.expect.limiting, `${c.name}: limiting`);
    if ('light_factor' in c.expect) assert.equal(v.factors.some((f) => f.factor === 'light'), c.expect.light_factor, `${c.name}: light factor`);
    if ('factors' in c.expect) assert.deepEqual(v.factors.map((f) => f.factor), c.expect.factors, `${c.name}: factors`);
    if ('notes' in c.expect) assert.deepEqual([...v.notes].sort(), [...c.expect.notes].sort(), `${c.name}: notes`);
    assert.ok(v.factors.every((f) => f.basis === 'range' || f.level !== 'outside'), `${c.name}: a spot or soil hint is never beyond a second look`);
  }
});

// canopi-data's range-verdict vectors (DATA-1), the stamped copy: inside → fits, edge → look,
// outside → outside, unknown → not checked; each side as the vector gives it.
const LEVEL_OF = { inside: 'fits', edge: 'look', outside: 'outside', unknown: 'unknown' };
const SIDE_OF = { fits: 'inside', look: 'edge', outside: 'beyond' };
test('PP-B (b2 verdict engine, DATA-1): every range-verdict vector of the installed release gives its verdict and sides through verdict()', () => {
  assert.equal(RV.thresholds.margin_c, core.RANGE_MARGIN_C);
  let run = 0;
  for (const x of RV.vectors) {
    const p = RV.plants[x.plant], s = RV.sites[x.site];
    if (!p || !s) continue; // a plant absent from the export (source.absent_plants)
    const rows = s.no_climate ? null : [s.period === '1991-2020' ? s : { ...s, period: '1991-2020', scenario: 'historical' }, ...(s.period === '1991-2020' ? [] : [s])];
    const t = plantOf(x.plant, { ...p, phase_start: 'secondary_i', phase_end: 'climax' });
    const v = verdict(t, { inputs: inputsOf(lookupOf(rows)), period: s.period ?? '1991-2020', scenario: s.scenario === 'historical' ? 'ssp245' : s.scenario });
    const name = `${x.site} / ${x.plant}`;
    assert.equal(v.level, LEVEL_OF[x.verdict], `${name}: level (verdict stub returns unknown)`);
    for (const [side, want] of Object.entries(x.sides)) {
      const f = v.factors.find((y) => y.factor === side);
      const got = !f ? null : side === 'hot' && f.level === 'fits' && v.notes.includes('cool-season') ? 'cool_season' : SIDE_OF[f.level];
      assert.equal(got, want, `${name}: side ${side}`);
    }
    assert.equal(v.notes.includes('cool-season'), x.cool_season, `${name}: cool season`);
    run++;
  }
  assert.ok(run >= 160, `${run} vectors run`);
});

// Kiambu (concept P1; architecture 3.2 countFits): a Subtropical place borrows the nearest lists
// (Mediterranean, Tropical, Temperate: 515 plants). The site values are the climate reader's answer
// at Kiambu (-1.1714, 36.8356) on the v0.2.0 tiles, historical slot.
const KIAMBU = { lat: -1.1714, lon: 36.8356, source: 'search', label: 'Kiambu', lookup: {
  lat: -1.1714, lon: 36.8356, soil: null, regions: { wgsrpdL3: 'KEN', isoA2: 'KE' },
  climate: { cellLat: -1.25, cellLon: 36.75, distanceCells: 0, periods: [{ period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC: 12, tmaxWarmC: 26.1, tmeanColdC: 17.2, tmeanWarmC: 20.8, aridityIndex: 1.15 }] },
} };
const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
async function kiambuStore() {
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
  const real = createSqliteSource(opened.db, { images: {} });
  const store = await import('../src/islands/consortium/store.ts');
  const { state } = await import('../src/islands/consortium/state/schema.ts');
  state.signals.climate.value = 'Subtropical';
  store.pools.value = { Subtropical: await real.pool('Subtropical') };
  store.location.value = KIAMBU;
  store.verdictRule.value = await core.loadVerdictRule();
  return store;
}
// The figure (coordinator, chunk 2 drift check 2026-11-15): the live range rule (P5 decision row of
// 2026-11-12, cool and chill sides) gives 305 of 515 at Kiambu on r-fcf4307ffd1549b3 (fits 196, look
// 109); the boards' 324 came from the mock-up rule. A new export moves it: re-run and re-pin the figure.
// Re-run on r-b7fb536f9cfd0700 (D9a, 673 plants): the same 305 of 515, since the 158 new plants are on
// the Arid list only, which Subtropical does not borrow. Re-run on r-415fcc60773473a4 (Q1 data fixes):
// the same 305 of 515 (196 fit, 109 look). Re-run on r-c15a216b9663d2fa (S4, PFAF page values): the same.
// Re-run on r-4db8a127ab860011 (sand cherry pH back to 5.1–8.5): the same.
// Re-run on r-bcc417fd89a3147c (schema 4.5 light span, 681 plants): the same; the 8 new plants are Arid only.
// Re-run on r-255553893fa4f4b4 (schema 4.7, AI-estimate kinds; 13 placements moved): the same 305 of 515.
test('PP-B (b1b countFits, real data): Kiambu, 305 of the 515 plants on the nearest lists fit (196) or need a second look (109) today', async () => {
  assert.equal(index.release_id, 'r-255553893fa4f4b4', 'the export the figure was read on');
  const store = await kiambuStore();
  const n = store.countFits.value;
  assert.deepEqual(n, { fits: 196, look: 109, unknown: 0, of: 515 });
});
// Guests (plants from another climate's list) are not on the chosen climate's list: the line's {m}
// ("the plants on the nearest lists") leaves them out, and so does {n} (drift check section 3).
// (Subtropical borrows every curated list, so the guest case runs on the Temperate list at Kiambu.)
test('PP-B (b1b countFits, real data): guests in the palette are left out of the count', async () => {
  const store = await kiambuStore();
  const { state } = await import('../src/islands/consortium/state/schema.ts');
  const { openBytes } = await import('../src/islands/consortium/data/load.ts');
  const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
  const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
  const real = createSqliteSource(opened.db, { images: {} });
  const temperate = await real.pool('Temperate'), tropical = await real.pool('Tropical');
  const own = new Set(temperate.map((t) => t.id));
  const guest = tropical.find((x) => !own.has(x.id) && ['inside', 'edge'].includes(core.rangeFit(x, inputsOf(KIAMBU.lookup))));
  assert.ok(guest, 'a Tropical plant, not on the Temperate list, that fits Kiambu');
  try {
    state.signals.climate.value = 'Temperate';
    store.pools.value = { Temperate: temperate, Tropical: tropical };
    const alone = store.countFits.value;
    assert.equal(alone.of, temperate.length);
    state.signals.members.value = [guest.id];
    state.signals.guests.value = { [guest.id]: 'Tropical' };
    assert.equal(store.guestTaxa.value.length, 1, 'the guest is read');
    assert.deepEqual(store.countFits.value, alone, 'the guest changes neither {n} nor {m}');
  } finally {
    state.signals.members.value = [];
    state.signals.guests.value = {};
    state.signals.climate.value = 'Subtropical';
  }
});
test('PP-B (b2 countFits, real data): Kiambu, countFits counts what the pool panel\'s range rule keeps (inside or near the edge)', async () => {
  const store = await kiambuStore();
  const n = store.countFits.value;
  const kept = store.pools.value.Subtropical.filter((t) => ['inside', 'edge'].includes(core.rangeFit(t, inputsOf(KIAMBU.lookup)))).length;
  assert.equal(n.of, 515);
  assert.equal(n.fits + n.look, kept, `countFits ${n.fits + n.look}, the range rule keeps ${kept} (verdict stub counts none)`);
});

// ---- holes.json ----
const hPlant = (k) => plantOf(k, H.plants[k]);
const levelsOf = (levels = {}) => new Map(Object.entries(levels).map(([id, level]) => [id, { id, level, judged: '1991-2020', ownYears: false, limiting: null, factors: [], notes: [] }]));
const holesFor = (input) => core.holes({ members: (input.members ?? []).map(hPlant), verdicts: levelsOf(input.levels), pending: input.pending ?? false });

test('holes.json: a known schema id, the thresholds are the core\'s, and every plant a case names is in the file', () => {
  assert.equal(H.schema, 'canopi-palette-holes/1');
  assert.deepEqual(H.thresholds.phase_years, core.PHASE_YEARS);
  assert.equal(H.thresholds.judged_from_year, core.JUDGED_FROM_YEAR);
  assert.equal(H.thresholds.judged_to_year, core.JUDGED_TO_YEAR);
  assert.deepEqual(H.thresholds.rank_order, core.HOLE_ORDER);
  for (const c of H.cases) for (const k of [...(c.input.members ?? []), ...(c.input.pool ?? []), ...Object.keys(c.input.levels ?? {}), ...(c.input.warned ?? [])]) assert.ok(H.plants[k], `${c.name}: plant ${k}`);
});

test('PP-B (b2 holes, 3.3): holes.json (one hole for a job missing in years 3-15, not judged under a year, nothing after 60, rank order, outside members, P11 pending, month ids, fillers)', () => {
  for (const c of H.cases) {
    const i = c.input, e = c.expect;
    if (i.id) { assert.equal(core.holeId(i.id.kind, i.id.what, i.id.from, i.id.to, i.id.months), e.id, c.name); continue; }
    const list = holesFor(i);
    if (i.hole) {
      const hole = list.find((h) => h.id === i.hole);
      assert.ok(hole, `${c.name}: hole ${i.hole}`);
      const holds = new Map(Object.entries(i.holds ?? {}));
      const got = core.fillers(hole, i.pool.map(hPlant), levelsOf(i.levels), holds, new Set(i.warned), i.members.map(hPlant), list);
      assert.deepEqual(Object.fromEntries(Object.entries(got).map(([g, ts]) => [g, ts.map((t) => t.id)])), { fits: e.fits, look: e.look, outside: e.outside, unknown: e.unknown }, c.name);
      // suggest's hole term reads the same fills(): a plant that is no filler brings no hole gain.
      for (const [k, want] of Object.entries(e.gain_holes ?? {})) assert.equal(gain(hPlant(k), i.members.map(hPlant), core.UNSURE_SITE, levelsOf(i.levels)).holes, want, `${c.name}: gain().holes of ${k}`);
      continue;
    }
    if (e.holes) assert.deepEqual(list.map((h) => ({ id: h.id, rank: h.rank, state: h.state, from: h.fromYear, to: h.toYear })), e.holes, c.name);
    if (e.ranks) assert.deepEqual(list.map((h) => h.rank), e.ranks, c.name);
    if (e.order) assert.deepEqual(list.map((h) => h.id), e.order, c.name);
    assert.equal(core.nextStep(list)?.id ?? null, e.next, `${c.name}: next step`);
  }
});

test('PP-B (b2 holes, 3.3): each neighbouring HOLE_ORDER pair ranks in order, and a hole\'s rank is read from the table', () => {
  const order = [['job', true], ['light', true], ['flowering', false], ['job', false], ['cool', false], ['soil', false]];
  for (let i = 1; i < order.length; i++) assert.ok(core.holeRank(...order[i - 1]) < core.holeRank(...order[i]), `${order[i - 1]} before ${order[i]}`);
  assert.equal(core.holeRank('light', false), core.holeRank('job', false), 'a job or a light level empty for part of the years rank together');
  const list = core.holes({ members: [], verdicts: null, pending: false });
  assert.ok(list.every((h) => h.rank === core.holeRank(h.kind, h.fromYear === 0 && h.toYear === core.JUDGED_TO_YEAR)));
  assert.ok(list.every((h) => !('preset' in h)), 'a hole carries no Add preset (PP-C commit 0: Find opens for the hole through store.openFind)');
});

test('PP-B (b2 holes, P11 restored): while a guest list loads the holes are pending, never a false hole; with every list read, the holes', () => {
  const members = [hPlant('crop_all')];
  assert.ok(core.holes({ members, verdicts: null, pending: true }).every((h) => h.state !== 'open'), 'loading: no open hole');
  assert.equal(core.nextStep(core.holes({ members, verdicts: null, pending: true })), null);
  assert.ok(core.holes({ members, verdicts: null, pending: false }).some((h) => h.state === 'open'), 'read: the holes');
});

test('PP-B (b2 holes, 3.3): fills is the one predicate (the job or light level in some year of the hole); a member is never its own filler; no hole a filler filled stays the next step', () => {
  const members = ['tree_all', 'high_any', 'medium_any', 'low_any', 'crop_early', 'crop_late'].map(hPlant);
  const [hole] = core.holes({ members, verdicts: null, pending: false });
  assert.ok(core.fills(hole, hPlant('fit_a')));
  assert.ok(!core.fills(hole, hPlant('too_early')), 'gone before year 3');
  assert.ok(!core.fills(hole, hPlant('no_food')), 'not the job');
  const after = core.holes({ members: [...members, hPlant('fit_a')], verdicts: null, pending: false });
  assert.equal(core.nextStep(after), null, 'filled: no next step');
});

// Pre-push fix 1: a plant counts as filling a hole only if adding it changes that hole. Holes are
// judged from year 1, so a filler must stand in a judged year of the hole: Lettuce (first 90 days)
// fills nothing of job:feeds_you:0-60 (the hole would stay open as 0.25-60).
test('PP-B (pre-push fix 1): adding any plant fills() names changes its hole (its judged years shrink or it closes); a plant fills() refuses leaves it as it was', () => {
  const judged = (h) => `${h.kind}:${h.job ?? h.stratum}:${Math.max(h.fromYear, core.JUDGED_FROM_YEAR)}-${h.toYear}`;
  const openOf = (members) => core.holes({ members, verdicts: null, pending: false }).filter((h) => h.state === 'open');
  const keys = Object.keys(H.plants);
  const palettes = [[], ['tree_all', 'high_any', 'medium_any', 'low_any'], ['tree_all', 'high_any', 'low_any', 'crop_early', 'crop_late'], ['tree_all', 'high_any', 'crop_early']];
  let checked = 0, refused = 0;
  for (const m of palettes) {
    const members = m.map(hPlant);
    for (const hole of openOf(members)) {
      for (const k of keys) {
        if (m.includes(k)) continue;
        const after = new Set(openOf([...members, hPlant(k)]).map(judged));
        if (core.fills(hole, hPlant(k))) { checked++; assert.ok(!after.has(judged(hole)), `${k} fills ${hole.id}, so adding it changes that hole`); }
        else { refused++; assert.ok(after.has(judged(hole)), `${k} is no filler of ${hole.id}, and adding it leaves the hole as it was`); }
      }
    }
  }
  assert.ok(checked > 10 && refused > 10, `pairs checked: ${checked} fillers, ${refused} not`);
  const lettuce = hPlant('crop_skip');
  const [feeds] = openOf(['tree_all', 'high_any', 'medium_any', 'low_any'].map(hPlant));
  assert.equal(feeds.id, 'job:feeds_you:0-60');
  assert.equal(core.fills(feeds, lettuce), false, 'a crop of the first 90 days fills nothing judged');
  assert.equal(core.nextStep(core.holes({ members: ['tree_all', 'high_any', 'medium_any', 'low_any', 'crop_skip'].map(hPlant), verdicts: null, pending: false }))?.id, 'job:feeds_you:0.25-60', 'the hole stays open after it is added');
});

test('PP-B (b2 holes, 7.3): jobGapsByPhase moved to holes.ts (one gap engine), still exported from the core', async () => {
  const jobs = readFileSync(new URL('../src/lib/consortium/jobs.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(jobs, /export function jobGapsByPhase/);
  const holes = await import('../src/lib/consortium/holes.ts');
  assert.equal(typeof holes.jobGapsByPhase, 'function');
  assert.equal(core.jobGapsByPhase, holes.jobGapsByPhase);
});

// ---- verdict-line.ts: the only words of verdicts, holes and years ----
const pv = (level, judged = '1991-2020') => ({ id: 'x', level, judged, ownYears: false, limiting: null, factors: [], notes: [] });
const hole = (fromYear, toYear, state = 'open') => ({ id: `job:mulch:${fromYear}-${toYear}`, kind: 'job', rank: 4, job: 'mulch', fromYear, toYear, state });
test('PP-B (b2 lines, 3.2): fitLine, holeLine and yearsLine give one key under consortium.line. with numbers and counts, never "fits" for not checked', () => {
  const L = core;
  assert.deepEqual(L.fitLine(pv('fits')), { key: 'consortium.line.fits', vars: {} });
  assert.deepEqual(L.fitLine(pv('fits', '2071-2099')), { key: 'consortium.line.fitsTo', vars: { period: '2071–2099' } });
  assert.deepEqual(L.fitLine(pv('unknown')), { key: 'consortium.line.unknown', vars: {} });
  assert.deepEqual(L.fitLine(pv('look')), { key: 'consortium.line.look', vars: {} });
  assert.deepEqual(L.fitLine(pv('outside')), { key: 'consortium.line.outside', vars: {} });
  assert.deepEqual(L.holeLine(hole(3, 15)), { key: 'consortium.line.holeBetween', vars: { from: 3, to: 15 } });
  assert.deepEqual(L.holeLine(hole(0, 60)), { key: 'consortium.line.holeAlways', vars: {} });
  assert.deepEqual(L.holeLine(hole(0, 3)), { key: 'consortium.line.holeFirst', vars: {}, count: 3 });
  assert.deepEqual(L.holeLine(hole(15, 60)), { key: 'consortium.line.holeAfter', vars: { from: 15 } });
  // A gap from under a year to 60 covers every judged year (review r1 conformance-4): never "after year 0.25".
  assert.deepEqual(L.holeLine(hole(0.25, 60)), { key: 'consortium.line.holeAfterMonth', vars: { month: 3 } });
  assert.deepEqual(L.holeLine(hole(1, 60)), { key: 'consortium.line.holeAfter', vars: { from: 1 } });
  assert.deepEqual(L.holeLine(hole(0, 1, 'not-judged')), { key: 'consortium.line.holeNotJudged', vars: {} });
  assert.deepEqual(L.holeLine(hole(3, 15, 'pending')), { key: 'consortium.line.holePending', vars: {} });
  assert.deepEqual(L.yearsLine(3, 15), { key: 'consortium.line.yearsSpan', vars: { from: 3, to: 15 } });
  assert.deepEqual(L.yearsLine(0, 3), { key: 'consortium.line.yearsFirst', vars: {}, count: 3 });
  assert.deepEqual(L.yearsLine(25, null), { key: 'consortium.line.yearsAfter', vars: { from: 25 } });
  assert.deepEqual(L.yearsLine(0.25, 1), { key: 'consortium.line.yearsMonths', vars: { from: 3, to: 12 } });
  assert.deepEqual(L.moreLine(4), { key: 'consortium.line.more', vars: { n: 4 }, count: 4 });
  for (const l of [L.fitLine(pv('fits')), L.holeLine(hole(3, 15)), L.yearsLine(0, null)]) assert.match(l.key, /^consortium\.line\.[A-Za-z]+$/, 'one segment after consortium.line.');
});

// The probe (slices "Probes", b2): verdicts + holes for a 200-plant palette, target under 150 ms.
test('PP-B (b2 probe): verdicts and holes for 200 plants of the real export are timed and reported', async (t) => {
  const store = await kiambuStore();
  const members = store.pools.value.Subtropical.slice(0, 200);
  const ctx = { inputs: inputsOf(KIAMBU.lookup), period: '1991-2020', scenario: 'ssp245', canopy: core.canopyOf(members) };
  const t0 = performance.now();
  const v = verdicts(members, ctx);
  core.nextStep(core.holes({ members, verdicts: v, pending: false }));
  const ms = performance.now() - t0;
  t.diagnostic(`${ms.toFixed(1)} ms (reference 150 ms; reported, never a failure: owner row "No hard limits", 2026-11-16)`);
});

// ---- the picture model (rules/picture.ts, picture-years.ts, change-summary.ts; the jobs picture is drawn from store.lanes since pf-b)) ----
const pictures = async () => ({
  ...await import('../src/islands/consortium/rules/picture.ts'),
  ...await import('../src/islands/consortium/rules/picture-years.ts'),
  ...await import('../src/islands/consortium/rules/change-summary.ts'),
});
const { sameCells } = await import('./picture-table.mjs');
const nameOf = (t) => t.canonical_name;
const palette = ['tree_all', 'high_any', 'crop_early', 'crop_late'].map(hPlant);
const pictureOf = (P, kind, members) => P[kind]({ members, holes: core.holes({ members, verdicts: null, pending: false }), nameOf });

test('PP-B (b2 pictures, 3.4): Through the years has a row per light level, bands in years, open holes in empty judged cells, and the table form has the same cells (P17)', async () => {
  const P = await pictures();
  const p = pictureOf(P, 'yearsPicture', palette);
  assert.deepEqual(p.rows.map((r) => r.key), ['emergent', 'high', 'medium', 'low']);
  assert.equal(p.columns.length, 7);
  assert.deepEqual(p.columns[3], core.yearsLine(3, 15));
  const low = p.rows.find((r) => r.key === 'low');
  assert.deepEqual(low.marks.map((m) => [m.name, m.from, m.to]), [['Crop early', 0, 3]], 'a band from year 0 to year 3');
  const medium = p.rows.find((r) => r.key === 'medium');
  assert.deepEqual(medium.cells.map((c) => c.hole), [null, null, 'light:medium:0-60', 'light:medium:0-60', 'light:medium:0-60', 'light:medium:0-60', null], 'holes only in judged steps');
  assert.deepEqual(p.rows.find((r) => r.key === 'emergent').cells.map((c) => c.ids.length), [1, 1, 1, 1, 1, 1, 1]);
  sameCells(p, P.tableOf(p));
  const bare = pictureOf(P, 'yearsPicture', [...palette, plantOf('nolayer', { name: 'No layer', role: 'crop', phase_start: 'placenta_i', phase_end: 'climax' })]);
  assert.equal(bare.rows.at(-1).state, 'not-recorded', 'plants with no light level are a row of their own, never dropped');
  assert.deepEqual(bare.summary[0], { key: 'consortium.palette.yearsSummary', vars: {}, count: 5 });
  sameCells(bare, P.tableOf(bare));
});

// Review r1 conformance-6: colour never alone. The band colour and the chip's icon and word read the
// main job from the picture itself (Picture.jobs), the same job the band is drawn with.
test('PP-B (b2 pictures, review r1 conformance-6): Through the years names every plant\'s main job; Through the years draws each band with it', async () => {
  const P = await pictures();
  const p = pictureOf(P, 'yearsPicture', palette);
  assert.deepEqual(p.jobs, Object.fromEntries(palette.map((t) => [t.id, P.mainJob(t)])), 'yearsPicture: the main job of every plant');
  for (const r of p.rows) for (const m of r.marks) assert.equal(m.job, p.jobs[m.id], `yearsPicture ${r.key}: ${m.id}'s band and its job agree`);
});

test('PP-B (b2 changeSummary, 3.4): nothing changed says nothing; a plant added says the plants and the holes that changed; another time step says its years first', async () => {
  const P = await pictures();
  const before = pictureOf(P, 'yearsPicture', palette);
  assert.deepEqual(P.changeSummary(before, before), []);
  const after = pictureOf(P, 'yearsPicture', [...palette, plantOf('mid', { name: 'Mid', role: 'support', stratum: 'medium', phase_start: 'placenta_i', phase_end: 'climax' })]);
  assert.deepEqual(P.changeSummary(before, after), [{ key: 'consortium.palette.change_plants', vars: {}, count: 5 }, { key: 'consortium.palette.change_holes', vars: {}, count: 1 }]);
  const s3 = P.columnOf(before, 2), s4 = P.columnOf(before, 3);
  assert.deepEqual(P.changeSummary(s3, s4), [core.yearsLine(3, 15), { key: 'consortium.palette.change_plants', vars: {}, count: 2 }, { key: 'consortium.palette.change_holes', vars: {}, count: 2 }], 'years 3-15: the tree and High any; no one in some shade or low');
});

// ---- scale (owner directive 2026-11-14: smooth to 200 plants), on the shared 200-plant palette ----
// (scripts/palette-200.mjs: real export ids, mixed light levels and roles, 6 guests; b3 reuses it.)
const p200 = await import('./palette-200.mjs');
const derive = (P, members) => {
  const ctx = { inputs: inputsOf(p200.KIAMBU.lookup), period: '1991-2020', scenario: 'ssp245', canopy: core.canopyOf(members) };
  const v = verdicts(members, ctx);
  const holes = core.holes({ members, verdicts: v, pending: false });
  core.nextStep(holes);
  return { v, holes, years: P.yearsPicture({ members, holes, nameOf }) };
};
test('PP-B (b2 scale, 200 plants): Through the years holds all 200 (no fold in the model, v14 A14) and its table lists them; verdicts, holes and one added plant timed and reported', async (t) => {
  const P = await pictures();
  const { members } = await p200.palette200();
  assert.equal(members.length, 200);
  derive(P, members.slice(0, 20)); // warm the modules' code paths once
  const t0 = performance.now();
  const ctx = { inputs: inputsOf(p200.KIAMBU.lookup), period: '1991-2020', scenario: 'ssp245', canopy: core.canopyOf(members) };
  const v = verdicts(members, ctx);
  core.nextStep(core.holes({ members, verdicts: v, pending: false }));
  const probe = performance.now() - t0;
  const levels = new Set([...v.values()].map((x) => x.level));
  assert.ok(levels.size >= 2, `the verdicts mix (${[...levels]})`);
  const d = derive(P, members);
  for (const [kind, p] of [['years', d.years]]) {
    sameCells(p, P.tableOf(p), kind);
    assert.equal(P.plantsIn(p).size, 200, `${kind}: the table lists all 200`);
  }
  const extra = (await p200.palette200()).pools.Tropical.find((x) => !members.some((m) => m.id === x.id));
  // The median of five runs: npm test runs the files in parallel, and one run can lose the CPU.
  const runs = Array.from({ length: 5 }, () => { const t1 = performance.now(); derive(P, [...members, extra]); return performance.now() - t1; }).sort((a, b) => a - b);
  const add = runs[2];
  t.diagnostic(`200 plants: verdicts + holes ${probe.toFixed(1)} ms; one added, verdicts + holes + the picture ${add.toFixed(1)} ms (median of 5)`);
  // Owner, 2026-11-16 (row "No hard limits"): timings are reported, never a failure.
  if (probe >= 150 || add >= 30) t.diagnostic(`over the reference figures (150 ms, 30 ms), reported, not a failure`);
});

test('PP-B (b2 years, review r1 conformance-12): phaseOfYear is the one year → time step rule (a start year, an end year, past 60 the last step)', () => {
  core.PHASE_YEARS.forEach(([from, to], i) => {
    assert.equal(core.phaseOfYear(from), i, `year ${from} starts step ${i}`);
    assert.equal(core.phaseOfYear(to, true), i, `year ${to} ends step ${i}`);
  });
  assert.equal(core.phaseOfYear(null, true), core.PHASE_YEARS.length - 1, 'past 60: the last step');
});

test('PP-B (b2 scale fixture, review r1 perf-11): the 10-plant palette is the 200-plant one\'s first 4 own plants and the same 6 guests, from the same three lists', async () => {
  const [big, small] = await Promise.all([p200.palette200(), p200.palette200({ own: 4 })]);
  assert.equal(small.members.length, 10);
  assert.deepEqual(small.ids.slice(0, 4), big.ids.slice(0, 4));
  assert.deepEqual(small.guests, big.guests);
  assert.deepEqual(Object.keys(small.pools).sort(), Object.keys(big.pools).sort());
});
