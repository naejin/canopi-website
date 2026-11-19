// pf-d (chunk 3) core: the change summary (site-change.ts siteChange, siteSnapshot), the panel's counts
// (lineCounts, limitsOf) and their words (site-change-line.ts), on hand-made verdicts, then on the
// installed release through the scenario file's own places (no tiles: the board-figures rule).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const words = await import('../src/lib/consortium/site-change-line.ts');
const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));

const P = core.periodIds;
const v = (level, factors = [], range = 'judged', notes = []) => ({ level, factors, range, notes, limiting: factors.find((f) => f.level === level) ?? null });
const f = (factor, level, extra = {}) => ({ factor, level, basis: 'range', place: null, low: null, high: null, ...extra });
const t = (id) => ({ id });
const map = (o) => new Map(Object.entries(o));

test('C11: lineCounts takes verdicts by period (a record keyed by period id): no list or no period judged gives no counts', () => {
  assert.deepEqual(core.lineCounts([], {}), core.NO_LINE_COUNTS);
  assert.deepEqual(core.lineCounts([t('a')], {}).periods, [], 'no period judged yet');
  assert.equal(core.lineCounts([t('a')], { [P[0]]: map({ a: v('fits') }) }).periods.length, 1);
});

test('lineCounts: per period the fit plants, each side outside and near its edge, the nights taken, the drier ones', () => {
  const list = ['a', 'b', 'c', 'd'].map(t);
  const today = map({
    a: v('fits'),
    b: v('outside', [f('cold', 'outside')]),
    c: v('look', [f('hot', 'look'), f('dry', 'look', { place: 0.2, low: 0.4 })], 'judged', ['drier']),
    d: v('unknown', [], 'not-recorded'),
  });
  const c = core.lineCounts(list, { [P[0]]: today });
  assert.equal(c.periods.length, 1);
  const p = c.periods[0];
  assert.deepEqual({ of: p.of, fit: p.fit, look: p.look, judged: p.judged, nights: p.nights, drier: p.drier }, { of: 4, fit: 2, look: 1, judged: 3, nights: 2, drier: 1 });
  assert.deepEqual(p.sides.cold, { outside: 1, edge: 0 });
  assert.deepEqual(p.sides.hot, { outside: 0, edge: 1 });
  assert.deepEqual(core.limitsOf(c).map((l) => l.line), ['nights', 'rain']);
});

test('siteChange: fit in and out, second looks, the members with their limit, new soil hints, the holes', () => {
  const list = ['a', 'b', 'c', 'm'].map(t);
  const before = core.siteSnapshot(list, [t('m')], { [P[0]]: map({ a: v('outside', [f('cold', 'outside')]), b: v('fits'), c: v('fits'), m: v('fits') }) }, []);
  const after = core.siteSnapshot(list, [t('m')], { [P[0]]: map({ a: v('fits'), b: v('outside', [f('cold', 'outside')]), c: v('look', [f('cold', 'look')]), m: v('look', [f('cold', 'look'), f('drainage', 'look', { basis: 'spot' })]) }) }, []);
  const c = core.siteChange(before, after);
  assert.deepEqual(c.periods.map(({ fitIn, fitOut, lookNew, lookGone }) => ({ fitIn, fitOut, lookNew, lookGone })), [{ fitIn: 1, fitOut: 1, lookNew: 2, lookGone: 0 }]);
  assert.deepEqual(c.periods[0].members, [{ id: 'm', before: 'fits', after: 'look', limiting: 'cold' }]);
  assert.deepEqual(c.hintsNew, [{ id: 'm', factors: ['drainage'] }]);
});

// Words: every key the lines name is in en.json, and the board's sentences read as the boards write them.
const say = (l) => {
  const k = l.key.slice('consortium.'.length);
  let s = en[`consortium.${k}`];
  assert.ok(s !== undefined, `en has consortium.${k}`);
  if (l.count !== undefined) {
    const forms = Object.fromEntries(s.split(' | ').map((x) => { const m = /^(\w+): ([\s\S]*)$/.exec(x); return [m[1], m[2]]; }));
    s = (l.count === 1 ? forms.one : forms.other).replace(/#/g, String(l.count));
  }
  const vars = { ...l.vars };
  for (const [name, p] of Object.entries(l.parts ?? {})) vars[name] = Array.isArray(p) ? new Intl.ListFormat('en').format(p.map(say)) : say(p);
  for (const [name, val] of Object.entries(vars)) if (typeof val === 'number') vars[name] = name.startsWith('temp') ? `${val} °C` : name.endsWith('Mm') ? `${val} mm` : String(val);
  return s.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? vars[n] : m));
};

test('siteChangeLines: "Coldest nights and hottest days set 2 °C colder. Today: … ; by 2071–2099: … Your 8 plants are kept: …"', () => {
  const change = { periods: [{ period: P[0], fitIn: 39, fitOut: 56, lookNew: 58, lookGone: 0, members: [{ id: 'cal', before: 'fits', after: 'look', limiting: 'cold' }] }, { period: P[1], fitIn: 0, fitOut: 0, lookNew: 0, lookGone: 0, members: [] }, { period: P[2], fitIn: 50, fitOut: 46, lookNew: 0, lookGone: 0, members: [] }], hintsNew: [], holes: { added: [], closed: [], narrowed: [], open: [] } };
  const lines = words.siteChangeLines(change, { nightsShiftC: -2, daysShiftC: -2, tempsTogether: true }, { was: {}, size: 8, nameOf: () => 'Calliandra' });
  const text = lines.map(say).join(' ');
  assert.match(text, /^Coldest nights and hottest days set 2 °C colder\. Today: 17 fewer fit; by 2071–2099: 4 more fit\. Your 8 plants are kept: Calliandra needs a second look, near its cold limit\. /);
  const detail = words.changeDetailLines(change, 515, { size: 8, nameOf: () => 'Calliandra' }).map(say).join(' ');
  assert.match(detail, /^Today: 39 more fit, 56 no longer fit,? and 58 now need a second look; by 2071–2099: 50 more fit and 46 no longer fit, of the 515\. In all, 17 fewer fit today and 4 more fit by 2071–2099\./);
  const back = words.siteChangeLines(change, {}, { was: { nightsShiftC: -2, daysShiftC: -2, tempsTogether: true }, inputs: { nights: { value: 12 }, days: { value: 26 } } }).map(say).join(' ');
  assert.match(back, /^Coldest nights and hottest days back to the climate map: 12 °C and 26 °C today\./);
});

test('soil words: an answer, the alike form with the hinted plants, the pH bands and their middles', () => {
  const change = { periods: P.map((period) => ({ period, fitIn: 0, fitOut: 0, lookNew: 0, lookGone: 0, members: [] })), hintsNew: [{ id: 'o', factors: ['drainage'] }, { id: 'a', factors: ['drainage'] }], holes: { added: [], closed: [], narrowed: [], open: [] } };
  const text = words.siteChangeLines(change, { drainage: 'wet' }, { was: {}, size: 3, nameOf: (id) => ({ o: 'Olive', a: 'Almond' })[id] }).map(say).join(' ');
  assert.match(text, /^The ground after heavy rain set to “Stays wet for days”\. Today and by 2071–2099 alike \(soil does not change\): Olive and Almond now carry a hint, wants free-draining soil\. Your 3 plants are kept\./);
  assert.deepEqual(words.PH_BANDS.map((b) => b.mid), [5, 6, 6.9, 7.6, 8.5]);
  for (const b of words.PH_BANDS) assert.equal(words.phBandOf(b.mid), b);
  assert.equal(words.phBandOf(5.5).word, 'phAcid');
  assert.equal(words.phBandOf(8.0).word, 'phStrongAlkaline');
});

test('the release: a nights shift at Kiambu moves fits in each period, watering never does (scenario cases)', () => {
  const file = JSON.parse(readFileSync(new URL('./fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));
  const out = (id) => file.cases.find((c) => c.id === id).output.change;
  assert.ok(out('kiambu-8-nights-2c-colder').periods.some((p) => p.in || p.out));
  assert.ok(out('mendoza-board-all-year').periods.every((p) => !p.in && !p.out && !p.lookNew && !p.lookGone));
});

// ---- fix round 1, batch 1 ----

test('BC1: "want more warmth over the year" counts the cool side only; summer warmth stays out of the warmth line and its limit', () => {
  const list = ['a', 'b', 'c', 'd'].map(t);
  const today = map({ a: v('outside', [f('cool', 'outside')]), b: v('look', [f('cool', 'look')]), c: v('outside', [f('summer', 'outside')]), d: v('look', [f('summer', 'look')]) });
  const c = core.lineCounts(list, { [P[0]]: today });
  assert.deepEqual(core.warmthOf(c.periods[0]), { outside: 1, edge: 1 });
  assert.deepEqual(core.limitsOf(c).find((l) => l.line === 'warmth'), { line: 'warmth', n: 1 }, 'no period field: nothing reads it (M6)');
});

test('BC13: rangeMoves: the side most of the dropping plants leave on, and the plants wanting more warmth that come into range by 2041–2070 (crops first)', () => {
  const tx = (id, role = 'support') => ({ id, role });
  const list = [tx('a'), tx('b'), tx('c'), tx('d', 'crop'), tx('e'), tx('g')];
  const by = {
    [P[0]]: map({ a: v('fits'), b: v('fits'), c: v('look', [f('hot', 'look')]), d: v('outside', [f('cool', 'outside')]), e: v('outside', [f('cold', 'outside')]), g: v('outside', [f('mild', 'outside')]) }),
    [P[1]]: map({ a: v('outside', [f('mild', 'outside')]), b: v('fits'), c: v('fits'), d: v('fits'), e: v('look', [f('cold', 'look')]), g: v('fits') }),
    [P[2]]: map({ a: v('outside', [f('mild', 'outside')]), b: v('outside', [f('mild', 'outside')]), c: v('outside', [f('hot', 'outside')]), d: v('fits'), e: v('fits'), g: v('fits') }),
  };
  const m = core.rangeMoves(list, by);
  assert.equal(m.dropSide, 'mild');
  assert.deepEqual(m.arrivals, ['d', 'e'], 'g came in on the mild side: not wanting more warmth');
  assert.equal(core.rangeMoves(list, { [P[0]]: by[P[0]] }).dropSide, null);
});

test('BC4, C5: the soil map\'s texture reads "Likely holds water" for the clay textures (hydrologic soil groups C/D), the board\'s one form; any other texture gives no reading (never "likely drains")', () => {
  assert.equal(words.textureLine('clay').key, 'consortium.figures.textureHolds');
  assert.equal(words.textureLine('clay_loam').key, 'consortium.figures.textureHolds');
  for (const id of ['sandy_loam', 'loam', 'silt_loam', 'silt', 'sand']) assert.equal(words.holdsWater(id), false, `${id}: no reading (holdsWater, the one gate: M6)`);
  assert.equal(words.holdsWater('clay'), true);
  assert.equal(words.holdsWater('silt_loam'), false);
  for (const [loc, json] of LOCALES) assert.equal(json['consortium.figures.textureDrains'], undefined, `${loc}: no "likely drains" form`);
  for (const id of core.textureIds) assert.ok(en[`consortium.figures.tex_${id}`], `en names ${id}`);
  assert.equal(say(words.textureLine('clay')), 'Likely holds water: clay');
  assert.equal(say(words.textureLine('clay_loam')), 'Likely holds water: clay loam');
});

test('BC12: the Reset summary writes the nights with one decimal and the hottest days in whole degrees through the view\'s formatter', () => {
  const change = { periods: P.map((period) => ({ period, fitIn: 0, fitOut: 0, lookNew: 0, lookGone: 0, members: [] })), hintsNew: [], holes: { added: [], closed: [], narrowed: [], open: [] } };
  const fmt = { nights: (c) => `${c.toFixed(1)} °C`, days: (c) => `${Math.round(c)} °C` };
  const back = words.siteChangeLines(change, {}, { was: { nightsShiftC: -2, daysShiftC: -2 }, inputs: { nights: { value: 12 }, days: { value: 26.1 } }, temp: fmt }).map(say).join(' ');
  assert.match(back, /^Coldest nights and hottest days back to the climate map: 12\.0 °C and 26 °C today\./);
});

// ---- fix round 1, batch 2 ----

const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'].map((l) => [l, JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'))]);
const period = (p, o = {}) => ({ period: p, fitIn: 0, fitOut: 0, lookNew: 0, lookGone: 0, members: [], ...o });
const changeOf = (byPeriod, hintsNew = []) => ({ periods: P.map((p, k) => period(p, byPeriod[k] ?? {})), hintsNew, holes: { added: [], closed: [], narrowed: [], open: [] } });

test('R4: plants that moved in and out in equal numbers are never "no change in what fits"; the moves are said, the hints too', () => {
  const swap = changeOf([{ fitIn: 30, fitOut: 30 }, { fitIn: 30, fitOut: 30 }, { fitIn: 30, fitOut: 30 }]);
  const text = words.siteChangeLines(swap, { nightsShiftC: 3 }, { was: {}, size: 5, nameOf: (id) => id }).map(say).join(' ');
  assert.doesNotMatch(text, /alike|no change in what fits/, `a swap of 30 in, 30 out is a change ("${text}")`);
  assert.match(text, /Today: 30 more fit and 30 no longer fit; by 2071–2099: 30 more fit and 30 no longer fit\./);
  const looks = changeOf([{ lookNew: 40 }, {}, { lookNew: 40 }]);
  const t2 = words.siteChangeLines(looks, { nightsShiftC: 1 }, { was: {}, size: 5 }).map(say).join(' ');
  assert.doesNotMatch(t2, /alike/, `40 plants moved to a second look ("${t2}")`);
  assert.match(t2, /Today: 40 now need a second look; by 2071–2099: 40 now need a second look\./);
  // A net change keeps its board form ("Today: 17 fewer fit") and the new hints stay named.
  const net = changeOf([{ fitIn: 2, fitOut: 19 }, {}, { fitIn: 4 }], [{ id: 'o', factors: ['drainage'] }]);
  const t3 = words.siteChangeLines(net, { drainage: 'wet' }, { was: {}, size: 3, nameOf: () => 'Olive' }).map(say).join(' ');
  assert.match(t3, /Today: 17 fewer fit; by 2071–2099: 4 more fit\. Olive now carries a hint, wants free-draining soil\./, `the hint is kept beside a net change ("${t3}")`);
  // Nothing moved anywhere: the alike form.
  const still = words.siteChangeLines(changeOf([]), { drainage: 'wet' }, { was: {}, size: 3 }).map(say).join(' ');
  assert.match(still, /Today and by 2071–2099 alike \(soil does not change\): no change in what fits\./);
});

test('R5: one size rule for names (A14): past 40 plants in the palette or 12 in the group, a count, never a run of names', () => {
  assert.equal(words.named(12, 40), true);
  assert.equal(words.named(13, 40), false);
  assert.equal(words.named(3, 41), false);
  const hinted = Array.from({ length: 90 }, (_, k) => ({ id: `p${k}`, factors: ['drainage'] }));
  const big = words.siteChangeLines(changeOf([], hinted), { drainage: 'wet' }, { was: {}, size: 200, nameOf: (id) => `Name${id}` }).map(say).join(' ');
  assert.doesNotMatch(big, /Namep\d/, `no names past the size rule ("${big.slice(0, 160)}")`);
  assert.match(big, /Today and by 2071–2099 alike \(soil does not change\): 90 of your plants now carry a hint, wants free-draining soil\. Your 200 plants are kept\./);
  const few = words.siteChangeLines(changeOf([], hinted.slice(0, 2)), { drainage: 'wet' }, { was: {}, size: 200, nameOf: (id) => `Name${id}` }).map(say).join(' ');
  assert.doesNotMatch(few, /Namep\d/, 'a 200-plant palette never names, even 2');
  const net = words.siteChangeLines(changeOf([{ fitOut: 3 }], hinted), { drainage: 'wet' }, { was: {}, size: 200, nameOf: (id) => `Name${id}` }).map(say).join(' ');
  assert.match(net, /90 of your plants now carry a hint, wants free-draining soil\./, `the count beside a net change ("${net}")`);
});

test('BC19: the opened row\'s paragraph says the board\'s clauses: a second look today only, never "no longer need a second look"; nothing moved, no paragraph; its bold run is the moves', () => {
  const change = changeOf([{ fitIn: 39, fitOut: 56, lookNew: 58, lookGone: 53 }, { fitIn: 1 }, { fitIn: 50, fitOut: 46, lookNew: 68, lookGone: 24 }]);
  const lines = words.changeDetailLines(change, 515, { size: 8 });
  const text = lines.map(say).join(' ');
  assert.match(text, /^Today: 39 more fit, 56 no longer fit,? and 58 now need a second look; by 2071–2099: 50 more fit and 46 no longer fit, of the 515\. In all, 17 fewer fit today and 4 more fit by 2071–2099\./, `the board's clauses ("${text}")`);
  assert.doesNotMatch(text, /no longer needs? a second look/);
  assert.equal(say(lines[0].parts.moves), 'Today: 39 more fit, 56 no longer fit, and 58 now need a second look; by 2071–2099: 50 more fit and 46 no longer fit', 'the bold run');
  assert.deepEqual(words.changeDetailLines(changeOf([{ lookGone: 4 }]), 515, { size: 8 }), [], 'only a second look gone: nothing the row says');
  assert.deepEqual(words.changeDetailLines(changeOf([]), 515, { size: 8 }), []);
});

test('R1: every limiting line has its own row, main-limit lead and meaning (warmth is never read as summer heat), in all 11 languages', () => {
  const lines = ['nights', 'days', 'warmth', 'rain'];
  assert.deepEqual(Object.keys(words.LIMIT_LINES).sort(), [...lines].sort());
  const warm = words.LIMIT_LINES.warmth;
  assert.equal(warm.row, 'days', 'warmth is said in the Hottest days row (worked out from the two temperature lines)');
  assert.notEqual(warm.meaning, words.LIMIT_LINES.days.meaning, 'its meaning is not summer heat\'s');
  for (const l of lines) {
    const { lead, meaning } = words.LIMIT_LINES[l];
    for (const [loc, json] of LOCALES) {
      if (lead) assert.ok(json[`consortium.figures.${lead}`], `${loc} has figures.${lead}`);
      if (meaning) assert.ok(json[`consortium.figures.${meaning}`], `${loc} has figures.${meaning}`);
    }
  }
  assert.match(en[`consortium.figures.${warm.lead}`], /^The main limit here[.:] /);
  assert.doesNotMatch(en[`consortium.figures.${warm.lead}`], /smaller limit|Not a limit/);
  assert.doesNotMatch(en[`consortium.figures.${warm.meaning}`], /Summer heat/);
  // Kerguelen-like: most of the list is outside on the cool side, few on nights or heat.
  const list = ['a', 'b', 'c', 'd'].map(t);
  const today = map({ a: v('outside', [f('cool', 'outside')]), b: v('outside', [f('cool', 'outside')]), c: v('outside', [f('cold', 'outside')]), d: v('fits') });
  assert.equal(core.limitsOf(core.lineCounts(list, { [P[0]]: today }))[0].line, 'warmth');
});

test('BC23, BC16: the Water card names its list; Spanish quince agrees ("registrado"); the footnote counts the nearest lists in words', () => {
  for (const [loc, json] of LOCALES) assert.ok(/\{list\}/.test(json['consortium.figures.waterList']), `${loc} waterList names {list}`);
  const es = Object.fromEntries(LOCALES)['es'];
  assert.match(es['consortium.figures.waterNowWhy'], /registrado\.$/);
  for (const [loc, json] of LOCALES) for (const k of ['countsNearest', 'listsTwo', 'listsThree']) assert.ok(json[`consortium.figures.${k}`], `${loc} has figures.${k}`);
  assert.match(en['consortium.figures.countsNearest'], /\{n\} plants on the \{k\} nearest lists \(\{lists\}\)/);
});

// ---- fix round 1, batch 4 ----

test('C8: the rain line limits only while a listed plant carries the dryness note; watered all year, no plant does and rain is no limit (A5)', () => {
  const list = ['a', 'b', 'c'].map(t);
  const dry = f('dry', 'look', { place: 0.2, low: 0.4 });
  // Rain only: the verdict rule puts the note on the plants drier here (verdict.ts R2).
  const rain = core.lineCounts(list, { [P[0]]: map({ a: v('fits', [dry], 'judged', ['drier']), b: v('look', [dry], 'judged', ['drier']), c: v('fits') }) });
  assert.deepEqual({ drier: rain.periods[0].drier, noted: rain.periods[0].noted }, { drier: 2, noted: 2 });
  assert.deepEqual(core.limitsOf(rain), [{ line: 'rain', n: 2 }]);
  // Watered all year: the same plants are drier here, and none carries the note.
  const allYear = core.lineCounts(list, { [P[0]]: map({ a: v('fits', [dry]), b: v('look', [dry]), c: v('fits') }) });
  assert.deepEqual({ drier: allYear.periods[0].drier, noted: allYear.periods[0].noted }, { drier: 2, noted: 0 });
  assert.deepEqual(core.limitsOf(allYear), [], 'watered all year: rain is not "The main limit here."');
});

test('C7: "Your place is dry" only in drylands (UNCCD: aridity index under 0.65), never at a humid place where one plant is drier later', () => {
  assert.equal(core.isDryland(0.28), true, 'Mendoza (semi-arid)');
  assert.equal(core.isDryland(0.58), true, 'Seville (dry sub-humid)');
  assert.equal(core.isDryland(1.15), false, 'Kiambu (humid)');
  assert.equal(core.isDryland(0.65), false);
  assert.equal(core.isDryland(null), false, 'unknown is never dry');
});

test('C9: the wind count is the listed plants with a recorded wind tolerance (layer_values tolerates_wind), each once; none recorded is 0', () => {
  const lv = (field, flag) => ({ field, months: null, flag, climate: null, scope: null, source: 's', kind: 'recorded' });
  const values = new Map([['a', [lv('tolerates_wind', true), lv('tolerates_wind', false)]], ['b', [lv('bloom_months', null)]], ['c', [lv('tolerates_wind', false)]], ['x', [lv('tolerates_wind', true)]]]);
  assert.equal(core.windRecorded(['a', 'b', 'c'], values), 2, 'a and c have a recorded wind tolerance (yes or no); x is not on the list');
  assert.equal(core.windRecorded(['a'], new Map()), 0);
});

test('C5: the soil map\'s texture is a reading of the site inputs layer (a known USDA class, else none), never a hint', () => {
  const lookup = (texture) => ({ climate: null, soil: { phH2o: 6.3, texture, filled: false, fillDistanceCells: 0, distanceCells: 0 } });
  assert.equal(core.soilTextureOf(lookup('clay')), 'clay');
  assert.equal(core.soilTextureOf(lookup('clay_loam')), 'clay_loam');
  assert.equal(core.soilTextureOf(lookup('peat')), null, 'a class the reader does not name');
  assert.equal(core.soilTextureOf(lookup(null)), null);
  assert.equal(core.soilTextureOf({ climate: null, soil: null }), null, 'no soil read');
  assert.equal(core.soilTextureOf(null), null);
  // A reading only (A8): the texture sets no drainage answer.
  assert.equal(core.siteInputsOf({ lookup: lookup('clay') }).drainage.source, 'none');
});

test('C8: the members line\'s words follow the watering answer in all 11 locales', () => {
  for (const [loc, json] of LOCALES) for (const k of ['membersDryFirst', 'membersDryManyFirst', 'laterChip', 'laterWindCount', 'rainDrierFirst', 'rainDrierAllYear']) assert.ok(json[`consortium.figures.${k}`], `${loc} has figures.${k}`);
  assert.match(en['consortium.figures.membersDryFirst'], /water (it|them) the first years/);
  assert.doesNotMatch(en['consortium.figures.membersDryFirst'], /may need watering/);
  assert.equal(en['consortium.figures.laterChip'], 'after release');
  assert.match(en['consortium.figures.laterWindCount'], /Wind tolerance is recorded for only # plants on the list/);
});

// ---- fix round 2, batch 1 ----

test('R2, C2: one status per limit line, over every period: a line that limits only by 2071–2099 limits, said with that period\'s count; the card\'s list is the same status', () => {
  const list = ['a', 'b', 'c', 'd'].map(t);
  // Today nobody is outside; by 2071–2099 two plants want colder winters (mild) and one is too hot.
  const by = {
    [P[0]]: map({ a: v('fits'), b: v('fits'), c: v('fits'), d: v('fits') }),
    [P[1]]: map({ a: v('outside', [f('mild', 'outside')]), b: v('fits'), c: v('fits'), d: v('fits') }),
    [P[2]]: map({ a: v('outside', [f('mild', 'outside')]), b: v('outside', [f('mild', 'outside')]), c: v('outside', [f('hot', 'outside')]), d: v('fits') }),
  };
  const s = core.limitStatus(core.lineCounts(list, by));
  assert.deepEqual(s.nights, { line: 'nights', state: 'limits', n: 2, period: P[2], today: 0 }, 'the nights limit by 2071–2099 though nobody is outside today');
  assert.deepEqual(s.days, { line: 'days', state: 'limits', n: 1, period: P[2], today: 0 });
  assert.deepEqual(s.warmth, { line: 'warmth', state: 'free', n: 0, period: null, today: 0 });
  assert.equal(s.rain.state, 'free');
  // The card lists exactly the lines whose status limits, most first.
  assert.deepEqual(core.limitsOf(core.lineCounts(list, by)), [{ line: 'nights', n: 2 }, { line: 'days', n: 1 }]);
  // Nothing counted yet: not checked, and no line listed.
  for (const l of core.LIMIT_IDS) assert.equal(core.limitStatus(null)[l].state, 'unchecked');
  assert.deepEqual(core.limitsOf(null), []);
  // The later forms exist in every locale, with the period and the later counts.
  for (const [loc, json] of LOCALES) {
    assert.match(json['consortium.figures.nightsTakeLater'] ?? '', /\{period\}[\s\S]*\{sides\}|\{sides\}[\s\S]*\{period\}/, `${loc} nightsTakeLater`);
    assert.match(json['consortium.figures.warmthLater'] ?? '', /\{lead\}[\s\S]*\{period\}|\{period\}[\s\S]*\{lead\}/, `${loc} warmthLater`);
  }
});

test('R5: the Water card\'s lead has three forms, never a zero placeholder: today only, later only, both', () => {
  for (const [loc, json] of LOCALES) {
    for (const k of ['waterLead', 'waterLeadFirst']) assert.doesNotMatch(json[`consortium.figures.${k}`], /\{later\}/, `${loc} ${k}: today only, no later clause`);
    for (const k of ['waterLeadBoth', 'waterLeadBothFirst', 'waterLeadLater', 'waterLeadLaterFirst']) assert.match(json[`consortium.figures.${k}`] ?? '', /\{later\}/, `${loc} ${k} says the later members`);
  }
  assert.equal(en['consortium.figures.waterLeadLater'], 'With rain only, none of your {size} plants needs watering today; {later}:');
});

test('R6: every Reset and Change button\'s accessible name contains its visible word, in all 11 locales (WCAG 2.5.3 Label in Name)', () => {
  for (const [loc, json] of LOCALES) {
    for (const [word, prefix] of [['reset', 'consortium.figures.reset'], ['change', 'consortium.figures.change']]) {
      const visible = json[`consortium.figures.${word}`].toLocaleLowerCase(loc);
      for (const [k, name] of Object.entries(json)) {
        if (!k.startsWith(prefix) || k === prefix || !/^[A-Z]/.test(k.slice(prefix.length))) continue;
        assert.ok(name.toLocaleLowerCase(loc).includes(visible), `${loc} ${k}: "${name}" contains the visible "${json[prefix]}"`);
      }
    }
  }
});

// Fix round 3, batch 1.
const leadOfText = (s) => /^(.+?\s?[:：])/.exec(s)?.[1] ?? '';
test('R1, C1: warmth over the year is said from its one status: plants only near the edge are a count, never "a smaller limit"; the nights row and the card read the same status', () => {
  const list = ['a', 'b', 'c', 'd', 'e'].map(t);
  // Edge only, in every period: three near the edge of their annual warmth range, nobody outside.
  const edge = map({ a: v('look', [f('cool', 'look')]), b: v('look', [f('cool', 'look')]), c: v('look', [f('cool', 'look')]), d: v('fits'), e: v('fits') });
  const c = core.lineCounts(list, { [P[0]]: edge, [P[1]]: edge, [P[2]]: edge });
  assert.equal(core.limitStatus(c).warmth.state, 'free', 'nobody outside: warmth is no limit');
  assert.ok(!core.limitsOf(c).some((l) => l.line === 'warmth'), 'the card leaves warmth out');
  const view = core.warmthView(c);
  assert.deepEqual(view, { state: 'free', period: P[0], later: false, outside: 0, edge: 3, of: 5 });
  const temp = () => '9.0 °C';
  for (const main of [false, true]) for (const yours of [false, true]) {
    const line = words.warmthLine(view, { main, yours, temp });
    const text = say(line);
    assert.doesNotMatch(text, /limit/i, `R1: edge only is never called a limit ("${text}")`);
    assert.equal(text, '3 are near the edge of their range for warmth over the year.');
  }
  // Outside today: the limit forms, main or smaller, with "with your values" when a shift applies.
  const out = map({ a: v('outside', [f('cool', 'outside')]), b: v('look', [f('cool', 'look')]), c: v('fits'), d: v('fits'), e: v('fits') });
  const c2 = core.lineCounts(list, { [P[0]]: out, [P[1]]: out, [P[2]]: out });
  const w2 = core.warmthView(c2);
  assert.deepEqual(w2, { state: 'limits', period: P[0], later: false, outside: 1, edge: 1, of: 5 });
  assert.equal(words.warmthLine(w2, { main: false, yours: false, temp }).key, 'consortium.figures.warmth');
  assert.equal(words.warmthLine(w2, { main: true, yours: true, temp }).key, 'consortium.figures.warmthMainYours');
  assert.match(say(words.warmthLine(w2, { main: false, yours: true, temp })), /^A smaller limit here: 2 of the 5 want more warmth over the year, .*\(9\.0 °C today with your values\): 1 are outside their range, 1 near its edge\.$/);
  // Nothing outside or near: no sentence. Not counted yet: not checked, no sentence.
  const fine = map(Object.fromEntries(list.map((x) => [x.id, v('fits')])));
  assert.equal(words.warmthLine(core.warmthView(core.lineCounts(list, { [P[0]]: fine })), { main: false, yours: false, temp }), null);
  assert.equal(core.warmthView(null).state, 'unchecked');
  assert.equal(words.warmthLine(core.warmthView(null), { main: false, yours: false, temp }), null);
  assert.equal(say(words.warmthLine({ state: 'free', period: P[0], later: false, outside: 0, edge: 1, of: 5 }, { main: false, yours: false, temp })), '1 is near the edge of its range for warmth over the year.', 'M5');
  assert.equal(say(words.warmthLine({ state: 'free', period: P[0], later: false, outside: 0, edge: 3, of: 5 }, { main: false, yours: false, temp })), '3 are near the edge of their range for warmth over the year.', 'M5');
  for (const [loc, json] of LOCALES) {
    assert.ok(json['consortium.figures.warmthEdge'], `${loc} has figures.warmthEdge`);
    assert.doesNotMatch(json['consortium.figures.warmthEdge'], /a little more|un peu plus|un poco más|um pouco mais|un po’ più|稍多|etwas mehr|もう少し|조금 더|iets meer|чуть больше/, `${loc} warmthEdge: on the heatEdge pattern, no "a little more warmth" (M5)`);
    assert.equal(json['consortium.figures.leadWarmth'], leadOfText(json['consortium.figures.warmth']), `${loc} leadWarmth is warmth's lead`);
    assert.equal(json['consortium.figures.leadWarmthMain'], leadOfText(json['consortium.figures.warmthMain']), `${loc} leadWarmthMain is warmthMain's lead`);
  }
});

test('R4, C3: warmth that limits only later says "then with your values" when a shift applies, like the today form; the lead is the row\'s', () => {
  const list = ['a', 'b', 'c'].map(t);
  const fine = map({ a: v('fits'), b: v('fits'), c: v('fits') });
  const later = map({ a: v('outside', [f('cool', 'outside')]), b: v('look', [f('cool', 'look')]), c: v('fits') });
  const c = core.lineCounts(list, { [P[0]]: fine, [P[1]]: fine, [P[2]]: later });
  const view = core.warmthView(c);
  assert.deepEqual(view, { state: 'limits', period: P[2], later: true, outside: 1, edge: 1, of: 3 });
  const temp = (p) => (p === P[2] ? '9.0 °C' : null);
  const yours = say(words.warmthLine(view, { main: false, yours: true, temp }));
  assert.equal(yours, 'A smaller limit here: by 2071–2099, 2 of the 3 want more warmth over the year, the average of the coolest and the warmest month (9.0 °C then with your values): 1 are outside their range, 1 near its edge.');
  const map0 = say(words.warmthLine(view, { main: true, yours: false, temp }));
  assert.match(map0, /^The main limit here: by 2071–2099, .*\(9\.0 °C then\):/);
  for (const [loc, json] of LOCALES) {
    const k = json['consortium.figures.warmthLaterYours'] ?? '';
    for (const slot of ['{lead}', '{period}', '{n}', '{of}', '{temp}', '{out}', '{edge}']) assert.ok(k.includes(slot), `${loc} warmthLaterYours has ${slot}`);
    assert.notEqual(k, json['consortium.figures.warmthLater'], `${loc}: the "with your values" form differs from the map's`);
  }
});

test('R2, C5: the two temperature shifts set as one are data in the edits (tempsTogether), kept by siteEditsOf only beside two equal shifts', () => {
  assert.deepEqual(core.siteEditsOf({ nightsShiftC: -2, daysShiftC: -2, tempsTogether: true }), { nightsShiftC: -2, daysShiftC: -2, tempsTogether: true });
  assert.deepEqual(core.siteEditsOf({ nightsShiftC: -2, daysShiftC: -1, tempsTogether: true }), { nightsShiftC: -2, daysShiftC: -1 }, 'unequal shifts: no link');
  assert.deepEqual(core.siteEditsOf({ nightsShiftC: -2, tempsTogether: true }), { nightsShiftC: -2 }, 'one shift: no link');
  assert.deepEqual(core.siteEditsOf({ nightsShiftC: -2, daysShiftC: -2, tempsTogether: 'yes' }), { nightsShiftC: -2, daysShiftC: -2 }, 'only true');
  assert.equal(core.siteEditsOf({ tempsTogether: true }), core.NO_EDITS);
  assert.equal(core.tempsTogether({ nightsShiftC: -2, daysShiftC: -2, tempsTogether: true }), true);
  assert.equal(core.tempsTogether({ nightsShiftC: -2, daysShiftC: -2 }), false);
  assert.equal(core.sameEdits(core.siteEditsOf({ nightsShiftC: -2, daysShiftC: -2, tempsTogether: true }), { nightsShiftC: -2, daysShiftC: -2 }), false, 'the link is part of the edits');
});

test('R2, C5, M1: the link travels with the save and "Include my place" (a 5th f segment, 1), so a grower opening their own link or save is not asked about "the sender\'s own values"', () => {
  const placeOf = (e) => core.encodePlace({ country: null, siteEdits: e });
  const back = (e) => core.decodeLink('v=5&c=temperate&m=small&a=&e=1', {}, placeOf(e)).state.siteEdits;
  const e = core.siteEditsOf({ nightsShiftC: -2, daysShiftC: -2, tempsTogether: true });
  assert.equal(placeOf(e), 'f=-20.-20...1', 'the link\'s f carries the tick as its 5th segment');
  assert.deepEqual(back(e), e, 'the link travels with the save\'s place');
  // restore.ts samePlace reads sameEdits: the grower's own linked edits against their decoded link are the same place (no question).
  assert.equal(core.sameEdits(core.siteEditsOf(e), back(e)), true, 'own link: the same edits, no "sender\'s own values" question');
  // Two equal shifts set apart stay apart; a 5th segment beside unequal or single shifts says nothing true and is dropped.
  assert.equal(placeOf({ nightsShiftC: -2, daysShiftC: -2 }), 'f=-20.-20');
  assert.deepEqual(back({ nightsShiftC: -2, daysShiftC: -2 }), { nightsShiftC: -2, daysShiftC: -2 });
  const read = (f) => core.decodeLink('v=5&c=temperate&m=small&a=&e=1', {}, `f=${f}`).state.siteEdits;
  assert.deepEqual(read('-20.-10...1'), { nightsShiftC: -2, daysShiftC: -1 }, 'unequal: no link');
  assert.deepEqual(read('-20....1'), { nightsShiftC: -2 }, 'one shift: no link');
  assert.deepEqual(read('-20.-20.50.1.1'), { nightsShiftC: -2, daysShiftC: -2, rainShiftMm: 50, dryMonthsShift: 1, tempsTogether: true }, 'with rain and dry months');
  assert.deepEqual(read('-20.-20...2'), { nightsShiftC: -2, daysShiftC: -2 }, 'a 5th segment other than 1: no link');
  assert.equal(read('-20.-20....1'), null, 'six segments: f dropped whole');
});

test('R3: the summary\'s head says the two set together from the link, whichever field happened to differ; equal numbers set apart are two lines', () => {
  const head = (was, now) => words.setLines(was, now, null).map(say).join(' ');
  // Nights +2 alone, days +1 alone; then the tick with 2: only the days value changes, both are named.
  assert.equal(head({ nightsShiftC: 2, daysShiftC: 1 }, { nightsShiftC: 2, daysShiftC: 2, tempsTogether: true }), 'Coldest nights and hottest days set 2 °C warmer.');
  // Both already at 2, set apart; the tick links them: still the pair.
  assert.equal(head({ nightsShiftC: 2, daysShiftC: 2 }, { nightsShiftC: 2, daysShiftC: 2, tempsTogether: true }), 'Coldest nights and hottest days set 2 °C warmer.');
  // Equal numbers set on their own lines: each line, never "set both".
  assert.equal(head({ nightsShiftC: 2 }, { nightsShiftC: 2, daysShiftC: 2 }), 'Hottest days set 2 °C warmer.');
  assert.equal(head({}, { nightsShiftC: 2, daysShiftC: 2 }), 'Coldest nights set 2 °C warmer. Hottest days set 2 °C warmer.');
  // Another line edited while linked: nothing said about the temperatures.
  assert.equal(head({ nightsShiftC: 2, daysShiftC: 2, tempsTogether: true }, { nightsShiftC: 2, daysShiftC: 2, tempsTogether: true, soilPh: 6.5 }), 'Soil pH set to 6.5.');
});

test('C2: the Water card\'s later-only lead counts each later period with no "more" after "none"; ja and ko keep the board\'s conditional "With rain only"', () => {
  for (const [loc, json] of LOCALES) assert.ok(json['consortium.figures.waterByPeriod'], `${loc} has figures.waterByPeriod`);
  assert.equal(en['consortium.figures.waterByPeriod'], 'one: # by {period} | other: # by {period}');
  const ja = Object.fromEntries(LOCALES)['ja'], ko = Object.fromEntries(LOCALES)['ko'];
  assert.ok(ja['consortium.figures.waterLeadLater'].startsWith('雨だけでは'), 'ja: 雨だけでは, as waterLead');
  assert.ok(ko['consortium.figures.waterLeadLater'].startsWith('빗물만으로는'), 'ko: 빗물만으로는, as waterLead');
});

test('C4: each member\'s first period drier here than its recorded band is the core\'s (drierFrom over drierOf), for the Water card and its tests alike', () => {
  const dry = (place) => f('dry', 'look', { place, low: 0.4 });
  const by = {
    [P[0]]: map({ a: v('look', [dry(0.2)]), b: v('fits'), c: v('fits') }),
    [P[1]]: map({ a: v('look', [dry(0.2)]), b: v('look', [dry(0.3)]), c: v('fits') }),
    [P[2]]: map({ a: v('look', [dry(0.2)]), b: v('look', [dry(0.3)]), c: v('look', [dry(0.5)]) }),
  };
  assert.deepEqual([...core.drierFrom(['a', 'b', 'c'].map(t), by)], [['a', P[0]], ['b', P[1]]], 'c is not drier (0.5 is inside its band): never');
});

// ---- h3 G1 (chunk-3 hand-off) ----

test('M3: the nights sentence names only the sides above zero, never "0 want warmer nights"; "(lowland tropical plants)" only beside plants that want warmer nights; SiteKiambu\'s wording kept when both sides count', () => {
  const sides = (w, c, frostFree = false) => { const l = words.nightsSidesLine(w, c, frostFree); return l && say(l); };
  assert.equal(sides(0, 4), '4 are recorded only where winters are colder');
  assert.equal(sides(21, 168, true), '21 want warmer nights (lowland tropical plants), 168 are recorded only where winters are colder', 'board SiteKiambu, byte for byte');
  assert.equal(sides(21, 168), '21 want warmer nights, 168 are recorded only where winters are colder');
  assert.equal(sides(1, 0), '1 wants warmer nights');
  assert.equal(sides(0, 1), '1 is recorded only where winters are colder');
  assert.equal(sides(0, 5, true), '5 are recorded only where winters are colder', 'frost-free with nobody wanting warmer nights: no "(lowland tropical plants)"');
  assert.equal(sides(0, 0), null, 'both sides 0: no clause');
  for (const [loc, json] of LOCALES) {
    for (const k of ['nightsTake', 'nightsTakeLater']) {
      assert.ok(json[`consortium.figures.${k}`].includes('{sides}'), `${loc} ${k} takes {sides}`);
      assert.doesNotMatch(json[`consortium.figures.${k}`], /\{warmer\}|\{colder\}|\{tropical\}/, `${loc} ${k}: the side counts come only through {sides}`);
    }
    for (const k of ['nightsWarmer', 'nightsColder']) assert.match(json[`consortium.figures.${k}`] ?? '', /#/, `${loc} ${k} is a count form`);
    assert.ok(json['consortium.figures.nightsWarmer'].includes('{tropical}'), `${loc} nightsWarmer carries {tropical}`);
    assert.match(json['consortium.figures.nightsSidesBoth'] ?? '', /\{warmer\}[\s\S]*\{colder\}/, `${loc} nightsSidesBoth`);
  }
  const take = say({ key: 'consortium.figures.nightsTake', vars: { n: 300, of: 515, mid: 280, last: 250, sides: sides(21, 168, true) } });
  assert.equal(take, '300 of the 515 plants take these nights today: 21 want warmer nights (lowland tropical plants), 168 are recorded only where winters are colder. 280 by 2041–2070, 250 by 2071–2099.');
});

test('M4: the Water lead for a one-plant palette says "your one plant", never "your 1 plants"', () => {
  for (const [loc, json] of LOCALES) for (const k of ['waterLeadOne', 'waterLeadOneFirst', 'waterLeadOneLater', 'waterLeadOneLaterFirst']) {
    assert.ok(json[`consortium.figures.${k}`], `${loc} has figures.${k}`);
    assert.doesNotMatch(json[`consortium.figures.${k}`], /\{size\}|#/, `${loc} ${k}: no count of one`);
  }
  for (const [loc, json] of LOCALES) for (const k of ['waterLeadOneLater', 'waterLeadOneLaterFirst']) assert.ok(json[`consortium.figures.${k}`].includes('{period}'), `${loc} ${k} says the later period`);
  assert.equal(en['consortium.figures.waterLeadOne'], 'With rain only, your one plant may need watering today:');
  assert.equal(en['consortium.figures.waterLeadOneFirst'], 'Watered the first years: your one plant needs it today:');
  assert.equal(en['consortium.figures.waterLeadOneLater'], 'With rain only, your one plant needs no watering today; it may by {period}:');
  assert.equal(en['consortium.figures.waterLeadOneLaterFirst'], 'Watered the first years: your one plant does not need it today; it may by {period}:');
});

test('R18: the figures panel reads the year\'s warmth without the range rule: yearMeanC lives in site-today.ts, range.ts only re-exports it', async () => {
  const today = await import('../src/lib/consortium/site-today.ts');
  assert.equal(today.yearMeanC({ tmeanColdC: 17.6, tmeanWarmC: 21.1 }), 19.35, 'Nairobi (17.6 + 21.1) / 2');
  assert.equal(core.yearMeanC, today.yearMeanC, 'the core index hands out the one function');
  const strip = (s) => s.replace(/\/\/.*$/gm, '');
  const range = strip(readFileSync(new URL('../src/lib/consortium/range.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(range, /export\s+(const|function)\s+yearMeanC\b/, 'range.ts does not define it');
  const figures = strip(readFileSync(new URL('../src/islands/consortium/views/figures/Figures.tsx', import.meta.url), 'utf8'));
  assert.doesNotMatch(figures, /from ['"][^'"]*\/range(\.ts)?['"]/, 'the figures view names no range module');
});
