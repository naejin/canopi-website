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
const v = (level, factors = [], range = 'judged') => ({ level, factors, range, limiting: factors.find((f) => f.level === level) ?? null });
const f = (factor, level, extra = {}) => ({ factor, level, basis: 'range', place: null, low: null, high: null, ...extra });
const t = (id) => ({ id });
const map = (o) => new Map(Object.entries(o));

test('empty inputs give the empty shapes (the 0W stubs keep their meaning)', () => {
  assert.deepEqual(core.siteChange({}, {}), core.NO_SITE_CHANGE);
  assert.deepEqual(core.lineCounts([], new Map()), core.NO_LINE_COUNTS);
  assert.deepEqual(core.siteChangeLines(core.NO_SITE_CHANGE, core.NO_EDITS), []);
});

test('lineCounts: per period the fit plants, each side outside and near its edge, the nights taken, the drier ones', () => {
  const list = ['a', 'b', 'c', 'd'].map(t);
  const today = map({
    a: v('fits'),
    b: v('outside', [f('cold', 'outside')]),
    c: v('look', [f('hot', 'look'), f('dry', 'look', { place: 0.2, low: 0.4 })]),
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
  const lines = words.siteChangeLines(change, { nightsShiftC: -2, daysShiftC: -2 }, { was: {}, size: 8, nameOf: () => 'Calliandra' });
  const text = lines.map(say).join(' ');
  assert.match(text, /^Coldest nights and hottest days set 2 °C colder\. Today: 17 fewer fit; by 2071–2099: 4 more fit\. Your 8 plants are kept: Calliandra needs a second look, near its cold limit\. /);
  const detail = words.changeDetailLines(change, 515, { size: 8, nameOf: () => 'Calliandra' }).map(say).join(' ');
  assert.match(detail, /^Today: 39 more fit, 56 no longer fit,? and 58 now need a second look; by 2071–2099: 50 more fit and 46 no longer fit, of the 515\. In all, 17 fewer fit today and 4 more fit by 2071–2099\./);
  const back = words.siteChangeLines(change, {}, { was: { nightsShiftC: -2, daysShiftC: -2 }, inputs: { nights: { value: 12 }, days: { value: 26 } } }).map(say).join(' ');
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
  assert.deepEqual(core.limitsOf(c).find((l) => l.line === 'warmth'), { line: 'warmth', n: 1 });
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

test('BC4: the soil map\'s texture reads as likely holding water or likely draining (hydrologic soil groups C/D against A/B), in words', () => {
  assert.equal(words.textureLine('clay').key, 'consortium.figures.textureHolds');
  assert.equal(words.textureLine('clay_loam').key, 'consortium.figures.textureHolds');
  assert.equal(words.textureLine('sandy_loam').key, 'consortium.figures.textureDrains');
  assert.equal(words.textureLine('loam').key, 'consortium.figures.textureDrains');
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
