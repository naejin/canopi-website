// The scenario file's runner and recorder (site-inputs layer, owner 2026-11-18): every case of
// scripts/fixtures/consortium-scenarios.json run through the engine (src/lib/palette: siteInputsOf,
// verdicts, flags, holes, thin targets, nextStep, fillers, bestToAdd, jobGapsByPhase) on the installed
// consortium release. The file is
// a golden file recorded from the engine and the contract a later Rust port must meet.
//
//   node --experimental-strip-types scripts/palette-scenarios.mjs --record
//
// re-reads each place's climate slots from the installed climate tiles (src/data/climate-index.json)
// and rewrites every case's output from the engine at HEAD; run it when a release or a rule changes on
// purpose, and read the diff. scripts/palette-scenarios.test.mjs runs the cases without the tiles.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
export const FILE = new URL('scripts/fixtures/consortium-scenarios.json', ROOT);
export const consortiumIndex = JSON.parse(readFileSync(new URL('src/data/palette-index.json', ROOT), 'utf8'));
export const releaseFile = new URL(`public${consortiumIndex.files[0].url}`, ROOT);
const core = await import('../src/lib/palette/index.ts');
const { verdicts, holdsBy } = await import('../src/lib/palette/verdict.ts');
// The dryness notes a verdict carries (beside its level, never a level).
const DRY_NOTES = new Set(['drier', 'drier-later']);
// The factors that are soil hints (soil pH, drainage): listed per member when they are not 'fits'.
const HINT_FACTORS = new Set(['soil-ph', 'drainage']);

let opened = null;
const pools = new Map();
// A list of the installed release, as the page reads it (sqlite-source.ts).
export async function pool(list) {
  if (!opened) {
    const { openBytes } = await import('../src/islands/palette/data/load.ts');
    const { createSqliteSource } = await import('../src/islands/palette/data/sqlite-source.ts');
    const db = await openBytes(new Uint8Array(gunzipSync(readFileSync(releaseFile))), { releaseId: consortiumIndex.release_id, climates: consortiumIndex.climates });
    opened = createSqliteSource(db.db, { images: {} });
  }
  if (!pools.has(list)) pools.set(list, await opened.pool(list));
  return pools.get(list);
}

const ids = (taxa) => taxa.map((t) => t.id);

// A case's merged site inputs (site-inputs.ts siteInputsOf): the place's lookup, the room, the edits and pots.
export function inputsOf(input, places) {
  const place = input.place === null ? null : places[input.place];
  if (input.place !== null && !place) throw new Error(`no place ${input.place} in the file`);
  const lookup = place ? { lat: place.lat, lon: place.lon, climate: place.periods.length ? { cellLat: place.lat, cellLon: place.lon, distanceCells: 0, periods: place.periods } : null, soil: place.soil ?? null, regions: { wgsrpdL3: null, isoA2: null } } : null;
  // The edits as given (a case may hold an answer no control writes yet, e.g. coldAir), with pots.
  const edits = { ...(input.edits ?? core.NO_EDITS), ...('pots' in input ? { pots: input.pots } : {}) };
  return core.siteInputsOf({ lookup, room: input.room ?? 'unsure', edits });
}

// One case's output from its inputs: plain JSON, keys and codes only (never a locale string).
// `places`: the file's places table (name -> { lat, lon, periods, soil }); input.place names one, or is null.
export async function run(input, places) {
  const list = await pool(input.list);
  const byId = new Map(list.map((t) => [t.id, t]));
  const members = input.members.map((id) => {
    const t = byId.get(id);
    if (!t) throw new Error(`${id} is not in the ${input.list} list of the installed release`);
    return t;
  });
  const inputs = inputsOf(input, places);
  const goals = core.paletteGoalsOf(input.goals);
  // The second look as the store asks it (conflicts.ts secondLook over flagsFor), no country, no conflict rows.
  const flagCtx = { site: core.siteOf(inputs), interactions: [], country: null };
  const secondOf = (t) => core.secondLook(core.flagsFor(t, members, flagCtx));
  const ctx = { inputs, period: input.period, scenario: input.scenario ?? core.DEFAULT_SCENARIO, canopy: core.canopyOf(members) };
  const mv = verdicts(members, ctx);
  const fit = { fits: [], look: [], outside: [], unknown: [] };
  const why = {}, notes = {}, hints = {};
  for (const t of members) {
    const v = mv.get(t.id);
    fit[v.level].push(t.id);
    if (v.level !== 'fits' && v.limiting) why[t.id] = v.limiting.factor;
    const dry = v.notes.filter((n) => DRY_NOTES.has(n));
    if (dry.length) notes[t.id] = dry;
    // The wet check (site.ts water 'wet', the drainage answer's only check) is the drainage hint.
    const hint = v.factors.map((f) => ({ ...f, factor: f.factor === 'water' && f.basis === 'spot' ? 'drainage' : f.factor })).filter((f) => HINT_FACTORS.has(f.factor) && f.level !== 'fits').map((f) => f.factor);
    if (hint.length) hints[t.id] = hint;
  }
  const second = members.filter(secondOf).map((t) => t.id);
  const hs = core.holes({ members, verdicts: mv, pending: false });
  const next = core.nextStep(hs);
  const inPalette = new Set(input.members);
  const last = core.periodIds[core.periodIds.length - 1];
  const fillersOf = (target, warnedToo) => {
    const cands = list.filter((t) => !inPalette.has(t.id) && core.fills(target, t));
    const pv = verdicts(cands, ctx);
    const holds = new Map(cands.map((t) => [t.id, holdsBy(t, ctx, last)]));
    const warned = warnedToo ? new Set(cands.filter(secondOf).map((t) => t.id)) : new Set();
    return core.fillers(target, cands, pv, holds, warned, members, hs.filter((h) => h.state === 'open'));
  };
  let fillers = null;
  if (next) fillers = Object.fromEntries(Object.entries(fillersOf(next, false)).map(([g, ts]) => [g, { n: ts.length, first: ids(ts.slice(0, 5)) }]));
  const lanes = core.laneCounts({ members, verdicts: mv, pending: false }, goals);
  const thins = core.thinTargets(lanes);
  // The lead target (the first open hole, else the first thin spot) and what a bulk add takes for it
  // (bestToAdd: fits only, a second look left to the grower).
  const lead = core.nextTarget(hs, thins);
  const best = lead ? { target: lead.target.id, ids: core.bestToAdd(lead.target, fillersOf(lead.target, true), goals) } : null;
  return {
    fit, why,
    holes: hs.map((h) => ({ id: h.id, rank: h.rank, state: h.state, ...(h.unchecked ? { unchecked: h.unchecked } : {}) })),
    lanes: lanes.map((l) => ({ lane: `${l.kind}:${l.job ?? l.stratum}`, counts: l.counts, ...(l.thin.length ? { thin: l.thin.map((t) => `${t.fromYear}-${t.toYear}`) } : {}), ...(l.unchecked ? { unchecked: l.unchecked.length } : {}) })),
    jobs: core.jobGapsByPhase(members).map((g) => ({ job: g.job, members: g.members, missing: g.missing })),
    next: next ? { hole: next.id, fillers } : null,
    second, notes,
    thin: thins.map((h) => ({ id: h.id, have: h.thin.have, want: h.thin.want })),
    best, hints,
    change: await changeOf(input, places, list, members, hs),
  };
}

// What the case's grower edits changed (pf-d, core site-change.ts siteChange): the same case without
// its edits (and pots) against it, over the whole list, per period; null for a case with no edits.
// Ids and codes only: per period the plants that now fit, no longer fit, now need a second look, no
// longer do, and each member whose level changed ([id, before, after, limiting factor]); the members
// that newly carry a soil hint; the holes added, closed and narrowed ([before, after]) and how many stay open.
async function changeOf(input, places, list, members, holesAfter) {
  if (!input.edits && !('pots' in input)) return null;
  const plain = { ...input };
  delete plain.edits;
  delete plain.pots;
  const snap = (inp, hs) => {
    const inputs = inputsOf(inp, places);
    const taxa = [...new Map([...list, ...members].map((t) => [t.id, t])).values()];
    const byPeriod = Object.fromEntries(core.periodIds.map((p) => [p, verdicts(taxa, { inputs, period: p, scenario: inp.scenario ?? core.DEFAULT_SCENARIO, canopy: core.canopyOf(members) })]));
    const holes = hs ?? core.holes({ members, verdicts: verdicts(members, { inputs, period: inp.period, scenario: inp.scenario ?? core.DEFAULT_SCENARIO, canopy: core.canopyOf(members) }), pending: false });
    return core.siteSnapshot(list, members, byPeriod, holes);
  };
  const c = core.siteChange(snap(plain, null), snap(input, holesAfter));
  return {
    periods: c.periods.map((p) => ({ period: p.period, in: p.fitIn, out: p.fitOut, lookNew: p.lookNew, lookGone: p.lookGone, members: p.members.map((m) => [m.id, m.before, m.after, m.limiting]) })),
    hintsNew: c.hintsNew,
    holes: { added: ids(c.holes.added), closed: ids(c.holes.closed), narrowed: c.holes.narrowed.map((n) => [n.before.id, n.after.id]), open: c.holes.open.length },
  };
}

// --- Recording ---------------------------------------------------------------------------------------

// The places, read from the installed climate and soil tiles (the page's reader). Soil (v14 pf commit 0W):
// marseille's value is a neighbour fill (filled, fillDistanceCells 2); dubai's is measured on its own
// square (pH 8.1); kerguelen has a climate and no soil value.
const PLACES = {
  seville: [37.389, -5.984], kiambu: [-1.1714, 36.8356], mendoza: [-32.889, -68.845], oulu: [65.012, 25.465],
  recife: [-8.054, -34.881], kumasi: [6.688, -1.624], osaka: [34.694, 135.502], lyon: [45.76, 4.84],
  marseille: [43.296, 5.37], dubai: [25.2, 55.27], kerguelen: [-49.35, 70.22],
};
// The boards' places (v14 boards, the round-3 ruling's values): a place of PLACES with the values the
// board shows in the historical and SSP2-4.5 slots; a changed rain scales the aridity index with it
// (as the board tools' boardInputs). The other slots and the soil stay the place's own.
const BOARD_PLACES = {
  'seville-board': ['seville', { '1991-2020': { tmaxWarmC: 36.2, precipMm: 540 }, '2041-2070': { tmaxWarmC: 38.6, precipMm: 480 }, '2071-2099': { tmaxWarmC: 40.9, precipMm: 455 } }],
  'mendoza-board': ['mendoza', { '1991-2020': { precipMm: 237 }, '2041-2070': { precipMm: 237 }, '2071-2099': { precipMm: 236 } }],
};
const boardSlot = (p, vals) => {
  const v = (p.scenario === 'historical' || p.scenario === 'ssp245') ? vals[p.period] : null;
  if (!v) return p;
  const q = { ...p, ...v };
  if (v.precipMm != null && p.aridityIndex != null) q.aridityIndex = Math.round(p.aridityIndex * v.precipMm / p.precipMm * 1000) / 1000;
  return q;
};
// The board palettes, by canonical name: Seville's 13 (SiteSeville), Mendoza's 8 (SiteMendoza), Kiambu's 8 (AddMany, K8).
const SEVILLE_13 = ['Olea europaea', 'Prunus dulcis', 'Ficus carica', 'Punica granatum', 'Cicer arietinum', 'Rosmarinus officinalis', 'Glycyrrhiza glabra', 'Trifolium incarnatum', 'Spartium junceum', 'Centaurea cyanus', 'Myrtus communis', 'Viburnum tinus', 'Pinus halepensis'];
const MENDOZA_8 = ['Cydonia oblonga', 'Prunus dulcis', 'Vitis vinifera', 'Punica granatum', 'Glycyrrhiza glabra', 'Pistacia vera', 'Olea europaea', 'Ficus carica'];
const KIAMBU_8 = ['Zea mays', 'Phaseolus vulgaris', 'Cajanus cajan', 'Musa ×paradisiaca', 'Persea americana', 'Grevillea robusta', 'Calliandra houstoniana var. calothyrsus', 'Cenchrus purpureus'];
// The 200-plant Kiambu palette (the board tools' pal.mjs rule; an illustrative grower, computed fit):
//   1. the 8 plants of the small Kiambu palette; 2. STAPLES, highland-farm staples, each not outside its
//   range today; 3. the other plants that fit today, taken in turn from each light level (Shade first)
//   by scientific name, up to 185; 4. TRIALS, 10 plants near the edge of their range (level look);
//   5. HOPES, 5 lowland crops outside their range today. Recorded as ids (the case's members).
const KIAMBU_STAPLES = ['Coffea arabica', 'Musa acuminata', 'Colocasia esculenta', 'Piper nigrum', 'Ipomoea batatas', 'Mangifera indica', 'Carica papaya', 'Psidium guajava', 'Passiflora edulis', 'Manihot esculenta',
  'Saccharum officinarum', 'Sorghum bicolor', 'Solanum tuberosum', 'Brassica oleracea', 'Allium cepa', 'Solanum lycopersicum', 'Amaranthus cruentus', 'Cucurbita moschata', 'Cucurbita maxima', 'Cucurbita pepo',
  'Arachis hypogaea', 'Lablab purpureus', 'Phaseolus lunatus', 'Phaseolus coccineus', 'Lathyrus oleraceus', 'Citrus limon', 'Citrus reticulata', 'Citrus latifolia', 'Eriobotrya japonica', 'Morus alba',
  'Morus nigra', 'Artocarpus heterophyllus', 'Syzygium cumini', 'Ananas comosus', 'Xanthosoma sagittifolium', 'Arachis pintoi', 'Leucaena leucocephala', 'Sesbania sesban', 'Tithonia diversifolia', 'Tephrosia vogelii',
  'Gymnanthemum amygdalinum', 'Megathyrsus maximus', 'Chrysopogon zizanioides', 'Cymbopogon citratus', 'Desmodium incanum', 'Stylosanthes guianensis', 'Crotalaria micans', 'Casuarina equisetifolia', 'Corymbia citriodora', 'Cedrela odorata',
  'Bambusa vulgaris', 'Dendrocalamus asper', 'Trichanthera gigantea', 'Helianthus annuus', 'Capsicum annuum', 'Capsicum chinense', 'Allium sativum', 'Coriandrum sativum', 'Lactuca sativa', 'Petroselinum crispum',
  'Mentha spicata', 'Rosmarinus officinalis', 'Tagetes erecta', 'Canna indica', 'Ricinus communis', 'Melia azedarach', 'Vicia faba', 'Prunus persica', 'Ficus carica', 'Punica granatum',
  'Vitis vinifera', 'Inga edulis', 'Citrullus lanatus', 'Cucumis melo', 'Beta vulgaris subsp. vulgaris', 'Brassica rapa', 'Allium porrum', 'Talinum fruticosum', 'Passiflora quadrangularis', 'Opuntia ficus-indica',
  'Macroptilium atropurpureum', 'Neustanthus phaseoloides', 'Canavalia ensiformis', 'Bixa orellana', 'Erythrina poeppigiana', 'Eucalyptus camaldulensis', 'Apium graveolens', 'Raphanus raphanistrum subsp. sativus'];
const KIAMBU_TRIALS = ['Moringa oleifera', 'Vigna unguiculata subsp. unguiculata', 'Annona muricata', 'Annona squamosa', 'Curcuma longa', 'Maranta arundinacea', 'Coffea canephora', 'Vanilla planifolia', 'Hibiscus sabdariffa', 'Mucuna pruriens'];
const KIAMBU_HOPES = ['Cocos nucifera', 'Anacardium occidentale', 'Tamarindus indica', 'Theobroma cacao', 'Artocarpus altilis'];
async function kiambu200(places) {
  const list = await pool('Subtropical');
  const inputs = inputsOf({ place: 'kiambu' }, places);
  const mv = verdicts(list, { inputs, period: '1991-2020', scenario: core.DEFAULT_SCENARIO, canopy: core.canopyOf([]) });
  const level = new Map(list.map((t) => [t.id, mv.get(t.id).level]));
  const members = [], has = new Set();
  const take = (names, ok, what) => { for (const n of names) {
    const t = list.find((x) => x.canonical_name === n) ?? fail(`kiambu-200: ${n} is not on the Subtropical list`);
    if (!ok(level.get(t.id))) fail(`kiambu-200: ${n} is ${level.get(t.id)}, not ${what}`);
    if (!has.has(t.id)) { members.push(t); has.add(t.id); }
  } };
  take(KIAMBU_8, (l) => l !== 'outside', 'in range'); take(KIAMBU_STAPLES, (l) => l !== 'outside', 'in range');
  const by = (a, b) => (a.canonical_name < b.canonical_name ? -1 : 1);
  const levels = [...core.strata].reverse().map((st) => list.filter((t) => !has.has(t.id) && level.get(t.id) === 'fits' && t.stratum?.value === st).sort(by));
  for (let i = 0; members.length < 185 && levels.some((l) => l.length > i); i++) for (const l of levels) if (l[i] && members.length < 185) { members.push(l[i]); has.add(l[i].id); }
  take(KIAMBU_TRIALS, (l) => l === 'look', 'near the edge'); take(KIAMBU_HOPES, (l) => l === 'outside', 'outside');
  if (members.length !== 200) fail(`kiambu-200: ${members.length} plants`);
  return members;
}
// A palette per list: round-robin over light level (stratum) in id order, `n` plants, deterministic.
// (Ids are UUID strings: until PP-C 0b `a.id - b.id` was NaN and left the pool's own order.)
function palette(list, n = 10) {
  const groups = new Map();
  for (const t of [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const k = t.stratum?.value ?? 'none';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  const out = [];
  for (let i = 0; out.length < n; i++) {
    let took = false;
    for (const g of groups.values()) if (g[i] && out.length < n) { out.push(g[i]); took = true; }
    if (!took) break;
  }
  return out;
}
// [id, place, list, period, extra]: extra holds scenario, room, edits, goals, members ('none': empty
// palette; a number: that many plants of the list, round-robin as palette()) and also (canonical names
// added after the palette, so a case keeps the plant that shows its rule whatever a release changes).
// Lyon: Alnus cordata sits near its cold limit there, so "2 °C colder" changes its verdict (PP-C 0b:
// the round-robin palette alone stopped holding such a plant when placements moved).
const LYON = ['Alnus cordata'];
const CASES = [
  ['seville-today', 'seville', 'Mediterranean', '1991-2020'],
  ['seville-2041-2070', 'seville', 'Mediterranean', '2041-2070'],
  ['seville-2071-2099', 'seville', 'Mediterranean', '2071-2099'],
  ['seville-2071-2099-ssp585', 'seville', 'Mediterranean', '2071-2099', { scenario: 'ssp585' }],
  ['seville-drier-200mm', 'seville', 'Mediterranean', '1991-2020', { edits: { rainShiftMm: -200, dryMonthsShift: 1 } }],
  ['kiambu-today-temperate', 'kiambu', 'Temperate', '1991-2020'],
  ['kiambu-today-tropical', 'kiambu', 'Tropical', '1991-2020'],
  ['kiambu-2071-2099', 'kiambu', 'Temperate', '2071-2099'],
  ['kiambu-empty-palette', 'kiambu', 'Temperate', '1991-2020', { members: 'none' }],
  ['mendoza-rain-only', 'mendoza', 'Arid', '1991-2020', { edits: { watering: 'rain' } }],
  ['mendoza-watered-all-year', 'mendoza', 'Arid', '1991-2020', { edits: { watering: 'all-year' } }],
  ['mendoza-2071-2099-rain-only', 'mendoza', 'Arid', '2071-2099', { edits: { watering: 'rain' } }],
  ['oulu-today', 'oulu', 'Temperate', '1991-2020'],
  ['oulu-2071-2099', 'oulu', 'Temperate', '2071-2099'],
  ['oulu-2071-2099-ssp585', 'oulu', 'Temperate', '2071-2099', { scenario: 'ssp585' }],
  ['oulu-today-boreal', 'oulu', 'Boreal', '1991-2020'],
  ['recife-today', 'recife', 'Tropical', '1991-2020'],
  ['recife-2071-2099', 'recife', 'Tropical', '2071-2099'],
  ['kumasi-today', 'kumasi', 'Tropical', '1991-2020'],
  ['kumasi-2041-2070', 'kumasi', 'Tropical', '2041-2070'],
  ['osaka-balcony', 'osaka', 'Subtropical', '1991-2020', { room: 'pots' }],
  ['osaka-balcony-temperate', 'osaka', 'Temperate', '1991-2020', { room: 'pots' }],
  ['lyon-today', 'lyon', 'Temperate', '1991-2020', { also: LYON }],
  ['lyon-2c-colder', 'lyon', 'Temperate', '1991-2020', { edits: { nightsShiftC: -2, daysShiftC: -2 }, also: LYON }],
  ['lyon-2c-colder-2071-2099', 'lyon', 'Temperate', '2071-2099', { edits: { nightsShiftC: -2, daysShiftC: -2 }, also: LYON }],
  ['lyon-soil-test-acid', 'lyon', 'Temperate', '1991-2020', { edits: { soilPh: 5.2 }, also: LYON }],
  ['lyon-soil-test-chalky', 'lyon', 'Temperate', '1991-2020', { edits: { soilPh: 8.1 }, also: LYON }],
  ['lyon-wet-ground', 'lyon', 'Temperate', '1991-2020', { edits: { drainage: 'wet' }, also: LYON }],
  ['lyon-frost-hollow', 'lyon', 'Temperate', '1991-2020', { edits: { coldAir: 'hollow' }, also: LYON }],
  ['lyon-3-per-job', 'lyon', 'Temperate', '1991-2020', { goals: { plantsPerJob: 3 }, also: LYON }],
  ['seville-200-plants', 'seville', 'Mediterranean', '1991-2020', { members: 200 }],
  ['no-location', null, 'Temperate', '1991-2020'],
  // v14 pf commit 0W: the boards' cases (named palettes: members 'none', the board's plants in `also`).
  ['seville-board', 'seville-board', 'Mediterranean', '1991-2020', { members: 'none', also: SEVILLE_13 }],
  ['mendoza-board-rain', 'mendoza-board', 'Arid', '1991-2020', { members: 'none', also: MENDOZA_8, edits: { watering: 'rain' } }],
  ['mendoza-board-first-years', 'mendoza-board', 'Arid', '1991-2020', { members: 'none', also: MENDOZA_8, edits: { watering: 'first-years' } }],
  ['mendoza-board-all-year', 'mendoza-board', 'Arid', '1991-2020', { members: 'none', also: MENDOZA_8, edits: { watering: 'all-year' } }],
  ['kiambu-8', 'kiambu', 'Subtropical', '1991-2020', { members: 'none', also: KIAMBU_8 }],
  ['kiambu-8-nights-2c-colder', 'kiambu', 'Subtropical', '1991-2020', { members: 'none', also: KIAMBU_8, edits: { nightsShiftC: -2 } }],
  ['kiambu-8-goal-3', 'kiambu', 'Subtropical', '1991-2020', { members: 'none', also: KIAMBU_8, goals: { plantsPerJob: 3 } }],
  ['kiambu-200', 'kiambu', 'Subtropical', '1991-2020', { members: 'kiambu-200' }],
  // Soil: a measured map pH, a neighbour fill, no soil value, and pots on a measured map pH.
  ['soil-map-ph', 'dubai', 'Arid', '1991-2020'],
  ['soil-near-fill', 'marseille', 'Mediterranean', '1991-2020'],
  ['soil-none', 'kerguelen', 'Boreal', '1991-2020'],
  ['soil-map-ph-pots', 'dubai', 'Arid', '1991-2020', { pots: true }],
];

const fail = (message) => { throw new Error(message); };
// Two-space JSON with every array of numbers or strings on one line (readable diffs, a small file).
const layout = (file) => JSON.stringify(file, null, 2).replace(/\[\n\s*((?:-?[\d.]+|"[^"\n]*")(?:,\n\s*(?:-?[\d.]+|"[^"\n]*"))*)\n\s*\]/g, (_, items) => `[${items.split(/,\n\s*/).join(', ')}]`);
async function record() {
  const C = await import('../src/lib/climate/index.ts');
  const climateIndex = JSON.parse(readFileSync(new URL('src/data/climate-index.json', ROOT), 'utf8'));
  const source = C.createTileSource({
    index: C.siteIndex(climateIndex),
    fetchBytes: async (url) => Uint8Array.from(readFileSync(new URL(`public${url}`, ROOT))).buffer, // a copy: its own ArrayBuffer
  });
  const places = {};
  for (const [name, [lat, lon]] of Object.entries(PLACES)) {
    const l = await C.lookupSite(lat, lon, source, C.DEFAULT_RADIUS, { soil: true });
    const s = l.soil;
    places[name] = { lat, lon, periods: l.climate?.periods ?? [], soil: s ? { phH2o: s.phH2o, texture: s.texture, filled: s.filled, fillDistanceCells: s.fillDistanceCells, distanceCells: s.distanceCells } : null };
  }
  for (const [name, [from, vals]] of Object.entries(BOARD_PLACES)) places[name] = { ...places[from], periods: places[from].periods.map((p) => boardSlot(p, vals)) };
  const cases = [], plants = {};
  for (const [id, place, list, period, extra = {}] of CASES) {
    for (const t of await pool(list)) plants[t.id] ??= t.canonical_name;
    const picked = extra.members === 'none' ? [] : extra.members === 'kiambu-200' ? await kiambu200(places) : palette(await pool(list), typeof extra.members === 'number' ? extra.members : 10);
    const listed = await pool(list);
    const also = (extra.also ?? []).map((name) => listed.find((t) => t.canonical_name === name) ?? fail(`${id}: ${name} is not on the ${list} list`));
    const members = [...new Set([...picked, ...also].map((t) => t.id))];
    const input = { list, place, period, ...(extra.scenario ? { scenario: extra.scenario } : {}), ...(extra.room ? { room: extra.room } : {}), ...(extra.edits ? { edits: extra.edits } : {}), ...(extra.goals ? { goals: extra.goals } : {}), ...('pots' in extra ? { pots: extra.pots } : {}), members };
    cases.push({ id, input, output: await run(input, places) });
  }
  const named = new Set(JSON.stringify(cases).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g));
  const file = {
    format: 'canopi-consortium-scenarios',
    format_version: 2,
    note: [
      'Golden file recorded from the engine at HEAD (src/lib/palette) by scripts/palette-scenarios.mjs --record; scripts/palette-scenarios.test.mjs runs every case.',
      'The contract for a later Rust port of the engine: the same inputs must give the same outputs.',
      'places: each place\'s climate slots (today and the 8 future slots) and its soil reading (phH2o, texture, filled, fillDistanceCells, distanceCells; null: no soil value) as the climate and soil grid reader answers them at its coordinates. seville-board and mendoza-board are seville and mendoza with the v14 boards\' values in the historical and SSP2-4.5 slots (aridity scaled with rain).',
      'Inputs: the list, the place (a name in places, or null: no location), the period, the scenario (default ssp245), the room (default unsure), the palette goals (default plantsPerJob 2), the grower edits (SiteEdits: climate shifts applied to every slot, soil test pH, answers), pots (the grower\'s answer: pots or brought-in soil) and the member plant ids of the release.',
      'Outputs, keys and codes only: fit (member ids by level), why (the limiting factor of each member that does not fit), holes (id, rank, state, unchecked members), lanes (each job and light level: plant counts per time step of years.ts PHASE_YEARS, thin year spans below the goal plantsPerJob, default 2, and the count of members not checked), jobs (jobGapsByPhase), next (the lead hole and its fillers: count and first five ids per group, with no country warning), second (members that need a second look: conflicts.ts secondLook, no country), notes (each member\'s dryness notes), thin (thin targets: id, have, want), best (the lead target, hole or thin spot, and bestToAdd\'s ids for it), hints (each member\'s soil hint factors that are not fits: soil-ph, drainage), change (cases with edits only, else null: core site-change.ts siteChange of the case without its edits against it, over the whole list: per period in, out, lookNew, lookGone and the members whose level changed as [id, before, after, limiting factor]; hintsNew; holes added, closed, narrowed as [before, after], open count).',
      'Watering sets the dryness note (v14 0W-2 R2): rain or no answer and first-years give drier / drier-later (first-years in other words, not in these codes); all-year gives none. Dryness never changes a fit.',
    ],
    release_id: consortiumIndex.release_id,
    climate_grid: climateIndex.release.grid_manifest_sha256,
    places,
    cases,
    // Readers' aid: the canonical name of every plant id the cases name (not an input).
    plants: Object.fromEntries(Object.entries(plants).filter(([pid]) => named.has(pid)).sort(([, a], [, b]) => (a < b ? -1 : a > b ? 1 : 0))),
  };
  // Two-space JSON with every array of numbers or strings on one line (readable diffs, a small file).
  writeFileSync(FILE, layout(file) + '\n');
  console.log(`Recorded ${cases.length} cases for ${consortiumIndex.release_id}.`);
}

// Every case's output again from the file's own places (no climate tiles needed): for an engine change
// that leaves the places as they are (pf-d's `change` output). Same layout as record().
async function rerun() {
  const file = JSON.parse(readFileSync(FILE, 'utf8'));
  for (const c of file.cases) c.output = await run(c.input, file.places);
  writeFileSync(FILE, layout(file) + '\n');
  console.log(`Re-ran ${file.cases.length} cases on ${file.release_id}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--record')) await record();
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--outputs')) await rerun();
