// pf stream b, "The pictures" (v14 pf-b fix round 1, 2026-11-18): the lasting layer under the pictures,
// tested at its seams rather than through the browser (review C7). weigh.ts (fitGroups and its reason
// table, leaveGroups, the water line in its forms, the soil pH hints), rules/picture.ts (the lane's count
// and the jobs strip read from the engine's targets) on the installed release at the boards' inputs (the
// 0W scenario cases seville-board, kiambu-200, kumasi-today), and the policies that keep the size rule
// and the locale strings whole. Every figure is re-derived through the engine, never a board number.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const weigh = await import('../src/lib/consortium/weigh.ts');
const picture = await import('../src/islands/consortium/rules/picture.ts');
const { yearsPicture } = await import('../src/islands/consortium/rules/picture-years.ts');

// ---- fitGroups: the second look's reasons from the limiting factor (review R3) ----

const v = (id, level, factor = null) => ({ id, level, limiting: factor ? { factor, level, basis: factor === 'soil-ph' ? 'soil-map' : factor === 'light' ? 'spot' : 'range', place: null, low: null, high: null } : null, factors: [], notes: [] });
const plant = (id) => taxon({ id, canonical_name: id });

test('fitGroups (R3, round 2 C2): a second look gives the reason of its limiting factor: the climate factors the edge of the range, light and wind the room or plot; the soil pH, drainage and water are hints that never set the level (types.ts setsLevel), so they are never a reason and the board\'s three reasons stand', () => {
  const cases = [['cold', 'edge'], ['dry', 'edge'], ['light', 'misfit'], ['wind', 'misfit']];
  for (const [factor, reason] of cases) {
    const g = weigh.fitGroups([plant('a')], new Map([['a', v('a', 'look', factor)]]), []);
    assert.deepEqual(g.look, ['a'], `${factor}: on the second-look line`);
    assert.deepEqual(g.reasons[reason], ['a'], `${factor}: the reason "${reason}"`);
    for (const [k, ids] of Object.entries(g.reasons)) if (k !== reason) assert.deepEqual(ids, [], `${factor}: not under "${k}"`);
  }
  // Every factor of the engine has its row (types.ts Factor); a new one fails the type check.
  assert.deepEqual(Object.keys(weigh.LOOK_REASON).sort(), ['cold', 'cool', 'drainage', 'dry', 'hot', 'light', 'mild', 'soil-ph', 'summer', 'water', 'wind']);
  for (const f of ['soil-ph', 'drainage', 'water']) {
    assert.equal(weigh.LOOK_REASON[f], null, `${f}: a hint, no reason of its own`);
    assert.equal(core.setsLevel({ factor: f, level: 'look', basis: f === 'soil-ph' ? 'soil-map' : 'spot', place: null, low: null, high: null }), false, `${f}: never sets the level`);
  }
  const g = weigh.fitGroups([plant('a')], new Map([['a', v('a', 'look', 'cold')]]), []);
  assert.deepEqual(Object.keys(g.reasons).sort(), ['clash', 'edge', 'invasive', 'misfit', 'moderate', 'severe'], 'no soil or water reason');
});

test('fitGroups: toxic outside its range is on the outside line and listed as outsideToxic; Mildly toxic is never a second look (R1) and counts in mildFits only when it fits', () => {
  const flags = [{ id: 'o', kind: 'toxicity', level: 'Moderate' }, { id: 'm', kind: 'toxicity', level: 'Slight' }, { id: 's', kind: 'toxicity', level: 'Severe' }];
  const g = weigh.fitGroups(['o', 'm', 's'].map(plant), new Map([['o', v('o', 'outside', 'cold')], ['m', v('m', 'fits')], ['s', v('s', 'fits')]]), flags);
  assert.deepEqual(g.outside, ['o']);
  assert.deepEqual(g.outsideToxic, ['o']);
  assert.deepEqual(g.fits, ['m']);
  assert.deepEqual(g.look, ['s']);
  assert.deepEqual(g.reasons.severe, ['s']);
  assert.deepEqual(g.mild, ['m']);
  assert.equal(g.mildFits, 1);
  assert.equal(g.several, 0);
});

test('leaveGroups: the members outside their range later and not today, and those near its edge then from a climate factor; nothing without the later verdicts', () => {
  const ms = ['a', 'b', 'c', 'd'].map(plant);
  const now = new Map([['a', v('a', 'fits')], ['b', v('b', 'outside', 'cold')], ['c', v('c', 'fits')], ['d', v('d', 'fits')]]);
  const later = new Map([['a', v('a', 'outside', 'hot')], ['b', v('b', 'outside', 'hot')], ['c', v('c', 'look', 'hot')], ['d', v('d', 'look', 'light')]]);
  assert.deepEqual(weigh.leaveGroups(ms, now, later), { leave: ['a'], edge: ['c'] });
  assert.deepEqual(weigh.leaveGroups(ms, now, null), { leave: [], edge: [] });
});

// ---- the store on the installed release, at the boards' inputs ----

const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const scenarios = JSON.parse(readFileSync(new URL('./fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));
const [{ openBytes }, { createSqliteSource }, store, { state }] = await Promise.all([
  import('../src/islands/consortium/data/load.ts'), import('../src/islands/consortium/data/sqlite-source.ts'),
  import('../src/islands/consortium/store.ts'), import('../src/islands/consortium/state/schema.ts'),
]);
const exportBytes = new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url))));
const real = createSqliteSource((await openBytes(exportBytes, { releaseId: index.release_id, climates: index.climates })).db, { images: {} });
const COUNTRY = { kiambu: 'KE', kumasi: 'GH', 'seville-board': 'ES' };
store.start();
async function boardCase(id) {
  const c = scenarios.cases.find((x) => x.id === id);
  const p = scenarios.places[c.input.place];
  store.hideToast();
  store.setSource(real);
  state.signals.climate.value = c.input.list;
  store.pools.value = { [c.input.list]: await real.pool(c.input.list) };
  store.location.value = { lat: p.lat, lon: p.lon, source: 'search', label: c.input.place, lookup: { lat: p.lat, lon: p.lon, soil: p.soil ?? null, regions: { wgsrpdL3: null, isoA2: COUNTRY[c.input.place] ?? null }, climate: { cellLat: p.lat, cellLon: p.lon, distanceCells: 0, periods: p.periods } } };
  state.signals.country.value = COUNTRY[c.input.place] ? { code: COUNTRY[c.input.place], source: 'chosen' } : { code: null, source: 'none' };
  store.verdictRule.value = await core.loadVerdictRule();
  state.signals.members.value = [...c.input.members];
  state.signals.removed.value = [];
  state.signals.siteEdits.value = core.NO_EDITS;
  state.signals.plantsPerJob.value = c.input.goals?.plantsPerJob ?? 2;
  state.signals.suggestedIds.value = [];
  assert.ok(store.memberVerdicts.value, `${id}: the verdicts`);
  return c;
}
const ctxOf = () => ({ inputs: store.verdictContext.value.inputs, period: store.verdictContext.value.period });
const nameOf = (t) => t.names?.en || t.canonical_name;

test('fitGroups on kiambu-200: the lines add up to the palette, each member on one; the reasons sum to reasonCount; a Mildly toxic member is never on the second-look line for that mark alone', async () => {
  await boardCase('kiambu-200');
  const ms = store.memberTaxa.value, flags = store.flags.value;
  const g = weigh.fitGroups(ms, store.memberVerdicts.value, flags);
  const all = [...g.fits, ...g.look, ...g.outside, ...g.unknown];
  assert.equal(all.length, ms.length, 'the lines add up');
  assert.equal(new Set(all).size, ms.length, 'each member on one line');
  assert.equal(Object.values(g.reasons).reduce((n, ids) => n + ids.length, 0), g.reasonCount);
  for (const id of g.look) {
    const why = Object.entries(g.reasons).filter(([, ids]) => ids.includes(id));
    assert.ok(why.length > 0, `${id}: a second look has a reason`);
  }
  const mildOnly = g.mild.filter((id) => !g.look.includes(id) && !g.outside.includes(id) && !g.unknown.includes(id));
  assert.equal(g.mildFits, mildOnly.length, 'the Mildly toxic members on "Fits your place"');
});

test('the water line on seville-board (Csa, a dry summer): "Water needs" in one of its forms, its members ending with the plants not recorded; no "Water use"', async () => {
  await boardCase('seville-board');
  assert.equal(weigh.drySummer(ctxOf().inputs), true, 'Seville: a dry summer');
  const out = weigh.weighLines(store.memberTaxa.value, ctxOf(), { verdicts: store.memberVerdicts.value });
  const water = out.find((l) => l.kind === 'water');
  assert.ok(water, 'a water line');
  const key = water.line.key.split('.').pop();
  assert.ok(['waterMix', 'waterDrySummer', 'waterFew', 'notRecordedNamed'].includes(key), `a Water needs form (${key})`);
  const missing = Number(water.line.vars.missing);
  const none = store.memberTaxa.value.filter((t) => !weigh.waterNeed(core.factAt('water_need', t, ctxOf().inputs, ctxOf().period))).map((t) => t.id);
  assert.equal(missing, none.length);
  assert.deepEqual(water.members.slice(water.members.length - missing), none, 'the plants not recorded, named last');
  if (key === 'waterMix') {
    const { regular, dry, medium } = water.line.vars;
    assert.equal(water.members.length, regular + dry + medium + missing, 'the mixed form: regular, dry, between, not recorded');
    assert.equal(water.line.count, undefined, 'round 2 C8: no Line.count only a test reads; the view pluralises on vars.regular');
  }
});

test('the water line on kumasi-today (no dry summer): "Water use", the recorded groups high, medium, low, then the plants not recorded, every member once', async () => {
  await boardCase('kumasi-today');
  assert.equal(weigh.drySummer(ctxOf().inputs), false);
  const out = weigh.weighLines(store.memberTaxa.value, ctxOf(), { verdicts: store.memberVerdicts.value });
  const water = out.find((l) => l.kind === 'water');
  assert.equal(water.line.key, 'consortium.palette.balance.waterUseTitle', 'a key the locales define (review C10)');
  const { high, medium, low, missing } = water.line.vars;
  assert.equal(high + medium + low + missing, store.memberTaxa.value.length);
  assert.equal(new Set(water.members).size, water.members.length);
});

test('the soil line on seville-board: "Soil: N hints on pH", N the members whose verdict carries a pH hint (R3, A12)', async () => {
  await boardCase('seville-board');
  const vs = store.memberVerdicts.value;
  const hinted = store.memberTaxa.value.filter((t) => vs.get(t.id)?.factors.some((f) => f.factor === 'soil-ph' && f.level !== 'fits' && f.level !== 'unknown')).map((t) => t.id);
  const soil = weigh.weighLines(store.memberTaxa.value, ctxOf(), { verdicts: vs }).find((l) => l.kind === 'soil');
  if (!hinted.length) assert.equal(soil, undefined);
  else assert.deepEqual([soil.line.vars.n, soil.members], [hinted.length, hinted]);
});

// ---- the pictures' model ----

test('yearsPicture (R8, round 2 R2): a light row lists the plants standing in it outside their climate range (`outside`, lane order) and counts the others (`count`): the grid head, its fold and its list read these two, one source', async () => {
  await boardCase('kiambu-200');
  const vs = store.memberVerdicts.value;
  const counts = (t) => vs.get(t.id)?.level !== 'outside';
  const p = yearsPicture({ members: store.memberTaxa.value, holes: store.paletteHoles.value, nameOf, counts });
  for (const r of p.rows) {
    const ids = [...new Set(r.cells.flatMap((c) => c.ids))];
    const out = ids.filter((id) => vs.get(id)?.level === 'outside');
    assert.equal(r.count, ids.length - out.length, `${r.key}: the plants that count`);
    assert.deepEqual([...r.outside].sort(), [...out].sort(), `${r.key}: the plants outside their range, by id`);
    for (const c of r.cells) assert.deepEqual(picture.countingIds(r, c), c.ids.filter((id) => !out.includes(id)), `${r.key}: a cell's counting plants`);
  }
  assert.ok(p.rows.some((r) => r.outside.length > 0), 'kiambu-200 has a member outside its range in a light row');
});

test('yearsPicture (round 2 C6): a hole run in the grid spans the hole\'s own years (Hole.fromYear, toYear), read from the hole, never from its id', () => {
  const crop = taxon({ id: 'crop', canonical_name: 'Crop', stratum: { value: 'medium' }, traits: { lifecycle: 'annual' } });
  // A hole over the first 3 years whose id names no years: the run still starts at the first span.
  const hole = { id: 'any-id', kind: 'light', stratum: 'low', job: null, fromYear: 0, toYear: 3, state: 'open', tier: 'core' };
  const p = yearsPicture({ members: [crop], holes: [hole], nameOf: (t) => t.canonical_name });
  const low = p.rows.find((r) => r.key === 'low');
  const cells = low.cells.flatMap((c, i) => (c.hole === 'any-id' ? [i] : []));
  if (!cells.length) return; // the judged window holds no span of years 0-3 at this PHASE_YEARS
  assert.deepEqual(low.holeRuns.map((h) => [h.id, h.from, h.to]), [['any-id', Math.min(cells[0], core.phaseOfYear(0)), Math.max(cells.at(-1), core.phaseOfYear(3, true))]]);
  assert.equal(low.holeRuns[0].from, 0, 'from the first time span, as board Main draws "Full sun: nobody in the first 3 years"');
});

test('stripStates (R1, R9, BC9, round 2 R4): a span inside an open job hole is a hole, inside an open thin spot thin, any other span with a plant full, also outside year 1 to 60; no fourth "pending" state (while a list loads the view draws no strip and says the holes are being checked)', async () => {
  await boardCase('seville-board');
  const holes = store.paletteHoles.value, thins = store.thinSpots.value;
  for (const l of store.lanes.value.filter((x) => x.kind === 'job')) {
    const s = picture.stripStates(l, holes, thins);
    assert.ok(s.every((x) => ['full', 'thin', 'hole', 'line'].includes(x)), `${l.job}: only the legend's states and the line`);
    core.PHASE_YEARS.forEach(([from, to], c) => {
      const n = l.counts[c];
      if (!picture.judgedColumn(c)) assert.equal(s[c], n > 0 ? 'full' : 'line', `${l.job} span ${c}: not judged, never a hole or thin`);
      if (s[c] === 'thin') assert.ok(l.thin.some((t) => t.fromYear < (to ?? Infinity) && from < t.toYear), `${l.job} span ${c}: thin only inside a thin stretch`);
      if (s[c] === 'hole') assert.equal(n, 0, `${l.job} span ${c}: a hole holds nobody who counts`);
    });
  }
  // Feeds you: Chickpea alone in the first spans and Olive alone after 60 years are drawn full (BC9).
  const food = store.lanes.value.find((x) => x.job === 'feeds_you');
  const sf = picture.stripStates(food, holes, thins);
  for (const c of [0, 1, 6]) if (food.counts[c] > 0) assert.equal(sf[c], 'full', `Feeds you span ${c}: full`);
});

test('mildExamples (round 2 C9): the Mildly toxic line names the first three Mildly toxic members in name order (board ManyDesk\'s rule), and says "many are common foods" only when more than half of them feed you', async () => {
  await boardCase('kiambu-200');
  const ms = store.memberTaxa.value, g = weigh.fitGroups(ms, store.memberVerdicts.value, store.flags.value);
  const byId = new Map(ms.map((t) => [t.id, t])), name = (id) => nameOf(byId.get(id)), order = new Intl.Collator('en');
  const ex = weigh.mildExamples(g, ms, name, order.compare);
  assert.deepEqual(ex.ids, [...g.mild].sort((a, b) => order.compare(name(a), name(b))).slice(0, 3), 'the first three by name');
  const foods = g.mild.filter((id) => core.jobsOf(byId.get(id)).includes('feeds_you')).length;
  assert.equal(ex.foods, foods * 2 > g.mild.length, `"many are common foods" when ${foods} of ${g.mild.length} feed you is more than half`);
  // One Mildly toxic food among three: never "many are common foods".
  const three = ['a', 'b', 'c'].map((id) => taxon({ id, canonical_name: id, role: id === 'a' ? 'crop' : 'support' }));
  const g3 = weigh.fitGroups(three, null, three.map((t) => ({ id: t.id, kind: 'toxicity', level: 'Slight' })));
  const ex3 = weigh.mildExamples(g3, three, (id) => id, order.compare);
  assert.deepEqual(ex3.ids, ['a', 'b', 'c']);
  assert.equal(ex3.foods, false, 'one food of three: the plain lead');
});

// ---- policies ----

const VIEWS = new URL('../src/islands/consortium/views/palette/', import.meta.url);
test('policy (R2, C1): the pictures name member plants only through the one names list (kit/chart.tsx Names: every name at 40 plants or fewer and 12 or fewer, else the count cell); no view joins member names itself', () => {
  for (const f of ['Years.tsx', 'JobsPicture.tsx', 'Weigh.tsx']) {
    const src = readFileSync(new URL(f, VIEWS), 'utf8');
    for (const bad of ['commaList(', 'listOf(', 'wordList(', 'named(', '.join(\', \')']) assert.ok(!src.includes(bad), `${f}: no ${bad} (use <Names>)`);
  }
});

const LOCALES = readdirSync(new URL('../src/i18n/translations/', import.meta.url)).filter((f) => f.endsWith('.json'));
const locale = (f) => JSON.parse(readFileSync(new URL(`../src/i18n/translations/${f}`, import.meta.url), 'utf8'));
test('locales: the goal sentence is a plural on the goal (R6); "How to read this" has its five paragraphs (C4); the reasons note pluralises its parts (R7); no invented copy strings (C9); pt is Brazilian (C11)', () => {
  assert.equal(LOCALES.length, 11);
  const keys = ['jobsIntro', 'readYears', 'readJobs', 'readUnknown', 'readFigures', 'readSyntropic', 'warningsReasons', 'warningsReasonsPlants', 'warningsReasonsCarry', 'warningsOutsideToxic', 'warningsMildFoods', 'balance.waterMix', 'balance.waterMixHigh', 'balance.waterMixLow', 'balance.waterMixMid', 'balance.notAPass'].map((k) => `consortium.palette.${k}`);
  for (const f of LOCALES) {
    const s = locale(f);
    for (const k of keys) assert.ok(typeof s[k] === 'string' && s[k].length > 0, `${f}: ${k}`);
    for (const k of ['jobsIntro', 'warningsReasons', 'warningsReasonsPlants', 'warningsReasonsCarry', 'balance.waterMix']) assert.match(s[`consortium.palette.${k}`], /(?:^|\| )other:/, `${f}: ${k} a plural`);
    for (const k of ['warningsSoil', 'warningsWater', 'cellsOutside']) assert.equal(s[`consortium.palette.${k}`], undefined, `${f}: ${k} gone (round 2 C2: on no board and in no word-map row)`);
    for (const k of ['chart.copied', 'chart.copyRefused']) assert.equal(s[`consortium.palette.${k}`], undefined, `${f}: ${k} gone (C9, C3)`);
    assert.doesNotMatch(s['consortium.palette.warningsMisfit'] ?? '', /\bspot\b/, `${f}: no retired "spot"`);
  }
  const pt = JSON.stringify(Object.fromEntries(Object.entries(locale('pt.json')).filter(([k]) => k.startsWith('consortium.palette.'))));
  assert.doesNotMatch(pt, /registad|registam/, 'pt: registrad-, registram');
  assert.equal(locale('en.json')['consortium.palette.warningsMisfit'], 'Does not suit your room or plot');
});
