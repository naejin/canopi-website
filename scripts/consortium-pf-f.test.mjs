// pf stream f, "One plant" (chunk 3): the words pf-f owns in the core's verdict-line vocabulary,
// said in the locale files as the boards say them.
// - F2 (chunk 2 hand-off triage): the German thin spot reads "Dünn besetzt: nur 1 Pflanze von Jahr 1
//   bis Jahr 15." (board German), with no row button words (A20: thin rows carry no button), then the
//   word map's backup prompt "Eine Reserve dazunehmen." (C5: every language asks for a backup).
// - M23 (chunk 2 hand-off triage; boards SiteMendoza and Find): a plant's rain line "recorded from
//   25 mm", read from the low end of TaxonClimate.precip, never a guess. C11: board SiteMendoza mixes
//   "registrada" and "registrado" by the plant name's gender; the words take one form that fits every
//   plant (es "con registros desde 25 mm"; pt, it, fr likewise), rather than a gender the data lacks.
// - Fix round 1 (review batch 1): BC2 the Flowers row keeps only the bloom rows whose scope holds the
//   place, as one span in full month names; BC7 a Swap row's gap words and edge words; BC4 the
//   limiting measure's "Recorded up to"; BC11 the keep line counts a later second look.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const line = await import('../src/lib/consortium/verdict-line.ts');
// The hold predicates live beside holdsBy in the verdict rule (M29), not in the words module.
const vd = await import('../src/lib/consortium/verdict.ts');
// The keep line on a member's verdicts today and later: the rule's laterLoss, then the words.
const keep = (now, laters, year) => line.keepLine(now, vd.laterLossOf(now, laters), year);
const { words, said } = await import('./consortium-said.mjs');

test('F2 (pf-f): the German thin spot opens as board German, then the backup prompt (A20; C5; C13 the full value)', () => {
  const one = line.thinLine({ have: 1, fromYear: 1, toYear: 15 });
  assert.match(said(one, 'de'), /^Dünn besetzt: nur 1 Pflanze von Jahr 1 bis Jahr 15\./);
  // The full German value (C13): board German, then the word map's backup prompt; no row button words.
  assert.equal(words.de['consortium.line.thin'], 'one: Dünn besetzt: nur # Pflanze von Jahr {from} bis Jahr {to}. Eine Reserve dazunehmen. | other: Dünn besetzt: nur # Pflanzen von Jahr {from} bis Jahr {to}. Eine Reserve dazunehmen.');
  assert.equal(said(line.thinLine({ have: 2, fromYear: 1, toYear: 15 }), 'de'), 'Dünn besetzt: nur 2 Pflanzen von Jahr 1 bis Jahr 15. Eine Reserve dazunehmen.');
});

// C13 (fix round 1, batch 4): a reader of Details sees the soil card's level and its own words, never a
// range-source line; the props say only what each view reads, so no reader of the code thinks the trait
// pH's source reaches Against or the soil card (it reaches neither: soilSayOf reads only the band's level).
test('C13 (pf-f): Against and the soil card take no traitSources; no alias of the bands', () => {
  const src = readFileSync(new URL('../src/islands/consortium/views/details/Against.tsx', import.meta.url), 'utf8');
  const details = readFileSync(new URL('../src/islands/consortium/views/details/Details.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /traitSources/, 'Against.tsx reads no trait source');
  assert.doesNotMatch(src, /climateBands/, 'no alias of the bands');
  assert.doesNotMatch(details, /<Against[^>]*traitSources/, 'Details passes none to Against');
  assert.doesNotMatch(details, /<SoilCard[^>]*traitSources/, 'Details passes none to the soil card');
  assert.doesNotMatch(details, /soilSayOf\([^)]*traitSources/, 'the desk\'s soil say takes none');
});

test('M23 (pf-f): "recorded from N mm" from the low end of the plant\'s recorded rain; none without a rain range', () => {
  const t = (low) => ({ climate: { precip: low === undefined ? null : { low, median: null, high: null, count: null, basis: 'cells', blocks: null, lowSource: null, highSource: null, weak: false } } });
  const l = line.rainFromLine(t(24.6));
  assert.equal(said(l, 'es'), 'con registros desde 25 mm'); // C11: one form for every plant's gender
  assert.equal(said(l, 'en'), 'recorded from 25 mm');
  for (const lang of Object.keys(words)) assert.match(said(l, lang), /25/, `${lang} names the rain`);
  assert.equal(line.rainFromLine(t(undefined)), null, 'no rain range: no line');
  assert.equal(line.rainFromLine(t(null)), null, 'a rain range with no low: no line');
  assert.equal(line.rainFromLine({ climate: null }), null, 'no climate: no line');
});

// ---- fix round 1, batch 1 ----

const bloom = await import('../src/islands/consortium/views/details/bloom.ts');
const row = (months, scope, kind = 'derived') => ({ field: 'bloom_months', months, flag: null, climate: null, scope, source: 'phenovision', kind });
// The installed release's rows for Pinto peanut (phenovision: N 0..23, N 23..35, S −23..0) and Almond.
const PINTO = [
  row(['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], { hemisphere: 'N', latitude: '0..23' }),
  row(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], { hemisphere: 'N', latitude: '23..35' }),
  row(['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], { hemisphere: 'S', latitude: '-23..0' }),
];

test('BC2 (pf-f Flowers): only the bloom rows whose scope holds the place, one span in full month names; none near: null', () => {
  const kiambu = bloom.bloomNear(PINTO, { lat: -1.17, country: 'KE', zone: 'Subtropical' });
  assert.deepEqual(kiambu?.months, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Oct', 'Nov', 'Dec'], 'Kiambu (S): the S −23..0 row only, never the northern months');
  assert.equal(kiambu.estimate, true);
  assert.equal(kiambu.state, 'found');
  assert.equal(bloom.monthsLong(kiambu.months, 'en', 'All year'), 'October–June');
  const almond = [row(['Feb', 'Mar'], { hemisphere: 'N', latitude: '45..48', country: 'CH' }, 'recorded'), row(['Jan', 'Feb', 'Mar'], { hemisphere: 'N', latitude: '35..50' }), row(['Dec', 'Jan', 'Feb'], { hemisphere: 'N', latitude: '23..35' })];
  const seville = bloom.bloomNear(almond, { lat: 37.4, country: 'ES', zone: 'Mediterranean' });
  assert.equal(bloom.monthsLong(seville.months, 'en', 'All year'), 'January–March', 'Seville: the 35..50 band; Switzerland\'s row and the 23..35 band left out');
  assert.deepEqual(bloom.bloomNear(PINTO, { lat: 45, country: 'FR', zone: 'Temperate' }), { state: 'none' }, 'no row near: "no months recorded near your place"');
  assert.deepEqual(bloom.bloomNear(PINTO, { lat: null, country: null, zone: 'Tropical' }), { state: 'no-place' }, 'no place: no scoped row, said as no place (R4)');
  assert.deepEqual(bloom.bloomNear([row(['Apr'], null, 'recorded')], { lat: null, country: null, zone: 'Tropical' }), { state: 'found', months: ['Apr'], estimate: false }, 'an unscoped row holds everywhere');
});

const fv = (o) => ({ basis: 'range', confidence: undefined, ...o });
const pv = (o = {}) => ({ level: 'fits', judged: '1991-2020', factors: [], notes: [], limiting: null, ...o });
const period = (p) => p.replace('-', '–');

test('BC7 (pf-f Swap rows): the edge words of the limiting measure today and in the later period', () => {
  // Ice cream bean at Kiambu (board): near its cool edge today, farther inside by 2041–2070.
  const cool = fv({ factor: 'cool', level: 'fits', place: 18.7, low: 18.2, high: 28, confidence: { term: 'edge' } });
  const hot = fv({ factor: 'hot', level: 'fits', place: 27, low: 20, high: 38 });
  const now = pv({ factors: [hot, cool] });
  const later = pv({ judged: '2041-2070', factors: [fv({ ...hot, place: 28.5 }), fv({ ...cool, place: 20.1, confidence: { term: 'edge' } })] });
  const b = line.rowBandOf(now, later, period);
  assert.equal(b.measure, 'tmeanYear', 'the measure nearest its bound');
  assert.deepEqual([b.low, b.high, b.place, b.later], [18.2, 28, 18.7, 20.1]);
  assert.equal(said(b.line, 'en'), 'Near its cool edge today; safer as it warms');
  // Near its cool edge today (a fit hedged edge), in range by 2041–2070 (the "On its" form: C1, round 2).
  const later2 = pv({ judged: '2041-2070', factors: [fv({ ...cool, place: 21, confidence: undefined })] });
  assert.equal(said(line.rowBandOf(pv({ factors: [cool] }), later2, period).line, 'en'), 'Near its cool edge today; in range by 2041–2070');
  // In range, nothing to add; hot side outside later.
  assert.equal(said(line.rowBandOf(pv({ factors: [hot] }), null, period).line, 'en'), 'In range today');
  const outLater = pv({ judged: '2041-2070', level: 'outside', factors: [fv({ ...hot, level: 'outside', place: 40 })] });
  assert.equal(said(line.rowBandOf(pv({ factors: [hot] }), outLater, period).line, 'en'), 'In range today; outside its range by 2041–2070');
  assert.equal(line.rowBandOf(pv({ factors: [fv({ factor: 'hot', level: 'unknown', place: null, low: null, high: null })] }), null, period), null, 'no range: no band');
});

test('BC4 (pf-f What you can do): the measure that limits the member, as how far the candidate is recorded', () => {
  const hot = fv({ factor: 'hot', level: 'fits', place: 36.2, low: 20, high: 41 });
  assert.equal(said(line.rowBandOf(pv({ factors: [hot] }), null, period, 'hot').line, 'en'), 'Recorded up to 41 °C');
  const cold = fv({ factor: 'cold', level: 'fits', place: 5.8, low: -8.2, high: 20 });
  assert.equal(said(line.rowBandOf(pv({ factors: [cold] }), null, period, 'cold').line, 'en'), 'Recorded down to -8.2 °C');
  assert.equal(line.rowBandOf(pv({ factors: [cold] }), null, period, 'hot'), null, 'no row for that measure: no band');
});

test('BC7 (pf-f Swap rows): the gap words in the row\'s sentence, one hole named, more counted', () => {
  const h = (fromYear, toYear) => ({ kind: 'job', job: 'feeds_soil', fromYear, toYear, state: 'open' });
  assert.equal(said(line.gapLines([h(15, 60)], []).fills, 'en'), 'also fills the hole after year 15');
  assert.equal(said(line.gapLines([h(0, 3), h(15, 60)], []).fills, 'en'), 'also fills 2 holes');
  assert.deepEqual(line.gapLines([], []), { fills: null, leaves: null }, 'no hole changes: no words');
  for (const lang of Object.keys(words)) assert.match(words[lang]['consortium.line.gapFillsOne'], /\{span\}/, `${lang} gapFillsOne`);
});

test('BC11 (pf-f keep line): a later second look counts, as the board\'s 15 years for Almond at Seville', () => {
  const hot = fv({ factor: 'hot', level: 'fits', place: 36.2, low: 20, high: 38 });
  const now = pv({ factors: [hot] }), look = pv({ judged: '2041-2070', level: 'look', factors: [fv({ ...hot, level: 'look', place: 38.4 })] }), fits = pv({ judged: '2071-2099', factors: [hot] });
  assert.equal(keep(now, [look, fits], 2026)?.count, 15);
  assert.equal(said(keep(now, [look, fits], 2026), 'en'), 'Keeping it is a fair bet for its first 15 years: plant its successor beside it now.');
  assert.equal(keep(now, [pv({ judged: '2041-2070', factors: [hot] }), fits], 2026), null, 'fits through: no line');
});

// ---- fix round 1, batch 2 ----
// R4 (Against's rain sentence) was undone by round 2's C3: the boards draw no rain line in Against.

// ---- fix round 1, batch 3 (review findings C1 to C12) ----

const core = await import('../src/lib/consortium/index.ts');
const { verdict } = await import('../src/lib/consortium/verdict.ts');
// A plant for the site checks: its drainage need (well_drained) and a high drought tolerance, so a wet
// ground is a misfit only when it wants free-draining soil (site.ts water).
const drainPlant = (wd) => ({ id: 1, canonical_name: 'Fixture plant', names: {}, traits: { well_drained: wd, drought_tolerance: 'High', moisture_use: null, soil_ph: null, height_m: null, habit: null }, climate: null, stratum: null, warnings: {}, phases: null });
const verdictAt = (t, drainage) => verdict(t, { inputs: core.siteInputsOf({ lookup: null, room: 'unsure', edits: drainage ? { drainage } : core.NO_EDITS }), period: '1991-2020', scenario: 'ssp245' });

test('C1 (pf-f drainage): the words come from well_drained and the grower\'s answer, the engine\'s hint when the ground stays wet', () => {
  const cases = [
    [true, null, 'Wants free-draining soil'], [false, null, 'Does not need free-draining soil'], [null, null, 'No need recorded'],
    [true, 'wet', 'Wants free-draining soil, and your ground stays wet for days after heavy rain'],
    [false, 'wet', 'Does not need free-draining soil'], [null, 'wet', 'No need recorded'], [true, 'drains', 'Wants free-draining soil'],
  ];
  for (const [wd, drainage, want] of cases) {
    const t = drainPlant(wd);
    assert.equal(said(line.drainageLine(t, verdictAt(t, drainage)), 'en'), want, `well_drained ${wd}, drainage ${drainage}`);
  }
  assert.equal(said(line.drainageLine(drainPlant(null), null), 'en'), 'No need recorded', 'no verdict yet: what the release records');
  // The hint is the engine's (hintLine on the wet check), never a second rule in the words.
  const t = drainPlant(true), v = verdictAt(t, 'wet');
  assert.ok(v.factors.some((f) => line.hintLine(f)), 'the engine raises the drainage hint');
  for (const lang of Object.keys(words)) for (const wd of [true, false, null]) assert.ok(said(line.drainageLine(drainPlant(wd), v), lang), `${lang}: drainage words`);
  for (const lang of Object.keys(words)) assert.match(words[lang]['consortium.details.drainageSay'], /\{what\}/, `${lang}: "Drainage: {what}."`);
});

test('C3 (pf-f A9): the light misfit on shade names the light level, never a "spot" in any locale', () => {
  const OLD = { en: /spot/, fr: /coin/, es: /rincón/, pt: /canto/, it: /angolo/, de: /Platz/, nl: /plek/, ru: /месте/, zh: /阴凉处/, ja: /場所/, ko: /자리/ };
  assert.equal(words.en['consortium.misfit.light.shade'], 'Needs more light than shade gives');
  for (const [lang, re] of Object.entries(OLD)) assert.doesNotMatch(words[lang]['consortium.misfit.light.shade'], re, `${lang}: no spot word`);
});

test('C5 (pf-f F2): the German thin spot keeps the board\'s opening and asks for a backup, as every language does', () => {
  assert.equal(said(line.thinLine({ have: 1, fromYear: 1, toYear: 15 }), 'de'), 'Dünn besetzt: nur 1 Pflanze von Jahr 1 bis Jahr 15. Eine Reserve dazunehmen.');
  assert.equal(said(line.thinLine({ have: 2, fromYear: 3, toYear: 9 }), 'de'), 'Dünn besetzt: nur 2 Pflanzen von Jahr 3 bis Jahr 9. Eine Reserve dazunehmen.');
});

test('C11 (pf-f M23): the rain words fit a plant of either gender (es, pt, it, fr: no gendered participle)', () => {
  const t = { climate: { precip: { low: 202, median: null, high: null, count: null, basis: 'cells', blocks: null, lowSource: null, highSource: null, weak: false } } };
  assert.equal(said(line.rainFromLine(t), 'es'), 'con registros desde 202 mm');
  const GENDERED = { es: /registrad[ao]/, pt: /registrad[ao]/, it: /registrat[ao]/, fr: /recensée?\b/ };
  for (const [lang, re] of Object.entries(GENDERED)) {
    assert.doesNotMatch(words[lang]['consortium.line.rainFrom'], re, `${lang}: rainFrom neutral`);
  }
});

test('C7 (pf-f Swap rows): the years as the board says them against the member\'s years', () => {
  const m = { from: 1, to: 15 };
  assert.equal(said(line.swapYearsLine(m, { from: 1, to: 25 }), 'en'), 'and stands to year 25');
  assert.equal(said(line.swapYearsLine(m, { from: 1, to: 3 }), 'en'), 'to year 3 only');
  assert.equal(said(line.swapYearsLine(m, { from: 3, to: null }), 'en'), 'from year 3 on');
  assert.equal(said(line.swapYearsLine(m, { from: 1, to: 15 }), 'en'), 'from year 1 to year 15');
  assert.equal(said(line.swapYearsLine(null, { from: 1, to: 25 }), 'en'), 'from year 1 to year 25');
});

test('C9 (pf-f What you can do): the board\'s row words: same years, what it does not do, what it adds, holds in', () => {
  const almond = ['feeds_you', 'helpers'], y = { from: 3, to: 60 };
  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Pistachio: feeds you, not helpers, same years, holds.
  assert.equal(capital(said(line.candoLine(almond, y, ['feeds_you'], y, '2041–2070'), 'en')), 'Feeds you in the same years, brings no helpers; holds in 2041–2070');
  // Jujube: the same jobs and years, and shelters too.
  assert.equal(capital(said(line.candoLine(['feeds_you'], y, ['feeds_you', 'shelter'], y, null), 'en')), 'Same job, same years; also shelters');
  assert.equal(capital(said(line.candoLine(almond, y, almond, { from: 1, to: 25 }, null), 'en')), 'Same jobs, from year 1 to year 25');
  for (const lang of Object.keys(words)) assert.ok(said(line.candoLine(almond, y, ['feeds_you', 'shelter'], y, '2041–2070'), lang).includes('2041–2070'), `${lang}: cando words`);
});

// ---- fix round 2, batch 1 (review findings R1 to R4, C1 to C6) ----

// R1: a later period counts as a loss only when its climate is worse than today's, read from the
// climate factors alone (those with a measure), never from light or wind that stay the same.
test('R1 (pf-f period edge): hazel in full sun at Seville, a second look for light that holds through 2070, gets no "by 2041–2070" chip and no keep line', () => {
  const light = { factor: 'light', basis: 'spot', level: 'look', place: null, low: null, high: null };
  const cold = fv({ factor: 'cold', level: 'fits', place: 5.8, low: -15, high: 20 });
  const hot = fv({ factor: 'hot', level: 'fits', place: 33, low: 20, high: 38 });
  const now = pv({ level: 'look', factors: [light, cold, hot], limiting: light });
  const laters = [pv({ judged: '2041-2070', level: 'look', factors: [light, cold, fv({ ...hot, place: 35 })], limiting: light }), pv({ judged: '2071-2099', level: 'look', factors: [light, cold, fv({ ...hot, place: 36.5 })], limiting: light })];
  assert.equal(vd.laterLossOf(now, laters), null, 'light stays the same: no loss by any later period');
  assert.equal(keep(now, laters, 2026), null, 'no "plant its successor beside it now"');
});

test('R1 (pf-f period edge): a climate edge today that stays an edge is no loss; an outside today is never "outside by"; a new climate limit is', () => {
  const hotLook = fv({ factor: 'hot', level: 'look', place: 38.5, low: 20, high: 38 });
  const hotOut = fv({ factor: 'hot', level: 'outside', place: 41, low: 20, high: 38 });
  const hotFits = fv({ factor: 'hot', level: 'fits', place: 33, low: 20, high: 38 });
  const at = (judged, level, f) => pv({ judged, level, factors: [f], limiting: f });
  // Already a second look at its hot edge today, still one by 2041–2070: nothing new.
  assert.equal(vd.laterLossOf(at('1991-2020', 'look', hotLook), [at('2041-2070', 'look', fv({ ...hotLook, place: 38.8 }))]), null);
  // Outside today, outside then: no "Outside its range by".
  assert.equal(vd.laterLossOf(at('1991-2020', 'outside', hotOut), [at('2041-2070', 'outside', hotOut)]), null);
  // An edge today that is outside by 2071–2099: a loss then, said as outside, on heat.
  const worse = vd.laterLossOf(at('1991-2020', 'look', hotLook), [at('2041-2070', 'look', hotLook), at('2071-2099', 'outside', hotOut)]);
  assert.deepEqual([worse?.verdict.judged, worse?.level, worse?.factor], ['2071-2099', 'outside', 'hot']);
  // Fits today, a second look on heat by 2041–2070 (board DetailsDesk, Almond at Seville): the loss and its keep line.
  const almond = vd.laterLossOf(at('1991-2020', 'fits', hotFits), [at('2041-2070', 'look', hotLook)]);
  assert.deepEqual([almond?.verdict.judged, almond?.level, almond?.factor], ['2041-2070', 'look', 'hot']);
  assert.equal(keep(at('1991-2020', 'fits', hotFits), [at('2041-2070', 'look', hotLook)], 2026)?.count, 15);
  // A light second look today and a new heat edge then: the climate change is a loss (read from climate only).
  const light = { factor: 'light', basis: 'spot', level: 'look', place: null, low: null, high: null };
  const both = vd.laterLossOf(pv({ level: 'look', factors: [light, hotFits], limiting: light }), [pv({ judged: '2041-2070', level: 'look', factors: [light, hotLook], limiting: light })]);
  assert.deepEqual([both?.level, both?.factor], ['look', 'hot']);
});

// R3: Swap and Details read one hold state per candidate (holds, not, unknown) from one core function.
test('R3 (pf-f hold states): one core function says holds, not or unknown at the hold period; nothing compared is unknown, never "not"', () => {
  const taxa = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const rule = {
    verdicts: (ts) => new Map(ts.map((t) => [t.id, { range: t.id === 3 ? 'not-recorded' : 'judged' }])),
    holdsBy: (t) => t.id === 1,
  };
  const states = vd.holdStatesOf(rule, taxa, { period: '1991-2020' }, '2041-2070');
  assert.deepEqual([...states], [[1, 'holds'], [2, 'not'], [3, 'unknown']]);
  assert.deepEqual([...vd.holdStatesOf(null, taxa, {}, '2041-2070')], [], 'no rule yet: no state');
});

// C1: "On its cool edge today" (at its bound, a level-setting second look) apart from "Near its cool edge today" (a fit hedged edge).
// Patterns on invented factors (words and order only); the board's own rows at kiambu-8 are re-derived
// through the engine on the installed release in the browser spec (PFF15, round 3 C4).
test('C1 (pf-f Swap rows, pattern): a level-setting second look on its bound "On its cool edge today; in range by 2041–2070", a hedged fit "Near its cool edge today; safer as it warms"', () => {
  const sesban = fv({ factor: 'cool', level: 'look', place: 18.2, low: 18.2, high: 27 });
  const later = pv({ judged: '2041-2070', factors: [fv({ ...sesban, level: 'fits', place: 20.1 })] });
  assert.equal(said(line.rowBandOf(pv({ level: 'look', factors: [sesban] }), later, period).line, 'en'), 'On its cool edge today; in range by 2041–2070');
  const bean = fv({ factor: 'cool', level: 'fits', place: 18.7, low: 18.2, high: 28, confidence: { term: 'edge' } });
  const later2 = pv({ judged: '2041-2070', factors: [fv({ ...bean, place: 20.1 })] });
  assert.equal(said(line.rowBandOf(pv({ factors: [bean] }), later2, period).line, 'en'), 'Near its cool edge today; safer as it warms');
  for (const lang of Object.keys(words)) for (const s of ['Cold', 'Cool', 'Mild', 'Hot', 'Dry', 'Wet']) assert.ok(words[lang][`consortium.line.edgeOn${s}`], `${lang} edgeOn${s}`);
});

// C2: the hole a swap leaves, in the board's words (a pattern; the board's row is re-derived in PFF15).
test('C2 (pf-f Swap rows, pattern): "leaves years 3 to 15 empty" and the other span forms', () => {
  const h = (fromYear, toYear) => ({ kind: 'job', job: 'mulch', fromYear, toYear, state: 'open' });
  assert.equal(said(line.gapLines([], [h(3, 15)]).leaves, 'en'), 'leaves years 3 to 15 empty');
  assert.equal(said(line.gapLines([], [h(0, 3)]).leaves, 'en'), 'leaves the first 3 years empty');
  assert.equal(said(line.gapLines([], [h(15, 60)]).leaves, 'en'), 'leaves every year after year 15 empty');
  // M33: the month forms, as the grower reads them (the boards draw only Between; v14-spec-update A29).
  assert.equal(said(line.gapLines([], [h(0.25, 60)]).leaves, 'en'), 'leaves it empty after month 3');
  assert.equal(said(line.gapLines([], [h(0.25, 15)]).leaves, 'en'), 'leaves it empty from month 3 to year 15');
  assert.equal(said(line.gapLines([], [h(0, 60)]).leaves, 'en'), 'leaves every year empty');
  const monthForms = {
    fr: ['laisse un vide après le mois 3', 'laisse un vide du mois 3 à l’année 15'],
    de: ['lässt es nach Monat 3 leer', 'lässt es von Monat 3 bis Jahr 15 leer'],
    es: ['deja vacío después del mes 3', 'deja vacío del mes 3 al año 15'],
    pt: ['deixa vazio depois do mês 3', 'deixa vazio do mês 3 ao ano 15'],
    it: ['lascia vuoto dopo il mese 3', 'lascia vuoto dal mese 3 all’anno 15'],
    nl: ['laat het leeg na maand 3', 'laat het leeg van maand 3 tot jaar 15'],
    ru: ['оставляет пустым время после 3-го месяца', 'оставляет пустым время с 3-го месяца по 15-й год'],
  };
  for (const [lang, [after, from]] of Object.entries(monthForms)) {
    assert.equal(said(line.gapLines([], [h(0.25, 60)]).leaves, lang), after, `${lang} AfterMonth`);
    assert.equal(said(line.gapLines([], [h(0.25, 15)]).leaves, lang), from, `${lang} FromMonth`);
  }
  for (const lang of Object.keys(words)) for (const [f, t] of [[3, 15], [0, 3], [0, 60], [15, 60], [0.25, 60], [0.25, 15]]) assert.ok(said(line.gapLines([], [h(f, t)]).leaves, lang), `${lang} leaves ${f}-${t}`);
});

// C3: Against says no rain sentence the boards do not draw.
test('C3 (pf-f Against): the aridity band\'s line ends as the boards end it, with no "recorded from N mm of rain a year"', () => {
  const W = { period, scenario: 'SSP2-4.5', heightM: null };
  const v = pv({ factors: [fv({ factor: 'dry', level: 'fits', place: 0.28, low: 0.27, high: 1.87 })], range: 'judged' });
  const entry = line.againstLines(v, null, W).find((e) => e.factor === 'dry');
  assert.ok(!(entry.line.also ?? []).some((a) => a.key === 'consortium.line.rainFromNote'), 'no rain note');
  for (const lang of Object.keys(words)) assert.equal(words[lang]['consortium.line.rainFromNote'], undefined, `${lang}: no rainFromNote key`);
});

// R4: the Flowers row without a place says so, never "no months recorded near your place".
test('R4 (pf-f Flowers): no place set and months recorded per hemisphere: the no-place state, never "none near your place"', () => {
  const almond = [row(['Jan', 'Feb', 'Mar'], { hemisphere: 'N', latitude: '35..50' }), row(['Jul', 'Aug', 'Sep'], { hemisphere: 'S', latitude: '-50..-35' })];
  assert.deepEqual(bloom.bloomNear(almond, { lat: null, country: null, zone: 'Mediterranean' }), { state: 'no-place' });
  assert.deepEqual(bloom.bloomNear(almond, { lat: 45, country: 'FR', zone: 'Mediterranean' }), { state: 'found', months: ['Jan', 'Feb', 'Mar'], estimate: true });
  assert.deepEqual(bloom.bloomNear(almond, { lat: 10, country: 'NG', zone: 'Mediterranean' }), { state: 'none' });
  for (const lang of Object.keys(words)) assert.ok(words[lang]['consortium.details.flowersNoPlace'], `${lang} flowersNoPlace`);
});

// ---- fix round 3, batch 1 (review findings R1 to R5, C1 to C7) ----

// R2: the Flowers row says loading or failed while the details are not here, never "no months".
// R3/C3: "set a place" only when a scoped row exists that a place could select; no bloom rows at all is
// "no months recorded", with or without a place.
test('R2 R3 (pf-f Flowers): loading, failed, not recorded, no place, none near, found: one pure function owns every case', () => {
  const at = { lat: null, country: null, zone: 'Tropical' };
  assert.deepEqual(bloom.bloomNear('loading', at), { state: 'loading' }, 'the details query still out: loading');
  assert.deepEqual(bloom.bloomNear('failed', { ...at, lat: 37.4 }), { state: 'failed' }, 'the details query failed: failed, never "none near your place"');
  assert.deepEqual(bloom.bloomNear([], at), { state: 'unrecorded' }, 'no bloom rows, no place: "no months recorded", never "set a place"');
  assert.deepEqual(bloom.bloomNear([], { ...at, lat: 37.4 }), { state: 'unrecorded' }, 'no bloom rows, a place: the same words');
  assert.deepEqual(bloom.bloomNear(PINTO, at), { state: 'no-place' }, 'rows a latitude would select: "set a place"');
  // A country-scoped row only (no latitude needed): a place does not change it, so never "set a place".
  assert.deepEqual(bloom.bloomNear([row(['Apr'], { country: 'CH' })], at), { state: 'none' });
  for (const lang of Object.keys(words)) assert.ok(words[lang]['consortium.details.flowersUnrecorded'], `${lang} flowersUnrecorded`);
  for (const lang of Object.keys(words)) assert.notEqual(words[lang]['consortium.details.flowersUnrecorded'], words[lang]['consortium.details.flowersNone'], `${lang}: not the near-your-place words`);
});

// R4/C5: a later loss is read per climate factor: a factor whose rank then is worse than its own today.
test('R4 C5 (pf-f period edge): a second look on cold today that fits by 2041–2070 but is a second look on heat then is a loss on heat', () => {
  const coldLook = fv({ factor: 'cold', level: 'look', place: -2, low: -2, high: 20 });
  const coldFits = fv({ ...coldLook, level: 'fits', place: 1 });
  const hotFits = fv({ factor: 'hot', level: 'fits', place: 33, low: 20, high: 38 });
  const hotLook = fv({ ...hotFits, level: 'look', place: 38.4 });
  const now = pv({ level: 'look', factors: [coldLook, hotFits], limiting: coldLook });
  const later = pv({ judged: '2041-2070', level: 'look', factors: [coldFits, hotLook], limiting: hotLook });
  const loss = vd.laterLossOf(now, [later]);
  assert.deepEqual([loss?.verdict.judged, loss?.level, loss?.factor], ['2041-2070', 'look', 'hot'], 'the new heat limit, not today\'s cold');
  assert.equal(keep(now, [later], 2026)?.count, 15, 'and the keep line counts to it');
  // The same factor at the same rank is still no loss; a recovering factor alone is none.
  assert.equal(vd.laterLossOf(now, [pv({ judged: '2041-2070', level: 'fits', factors: [coldFits, hotFits] })]), null);
});

// R5: every (today, then) pair of standings has its words; outside today and near its edge then says so.
test('R5 (pf-f Swap rows): outside its range today, near its edge by 2041–2070: "Outside its range today; near the edge by 2041–2070"', () => {
  const coldOut = fv({ factor: 'cold', level: 'outside', place: -9, low: -6, high: 20 });
  const near = pv({ judged: '2041-2070', factors: [fv({ ...coldOut, level: 'fits', place: -5.8, confidence: { term: 'edge' } })] });
  assert.equal(said(line.rowBandOf(pv({ level: 'outside', factors: [coldOut], limiting: coldOut }), near, period).line, 'en'), 'Outside its range today; near the edge by 2041–2070');
  const on = pv({ judged: '2041-2070', level: 'look', factors: [fv({ ...coldOut, level: 'look', place: -6 })] });
  assert.equal(said(line.rowBandOf(pv({ level: 'outside', factors: [coldOut], limiting: coldOut }), on, period).line, 'en'), 'Outside its range today; near the edge by 2041–2070');
  const inRange = pv({ judged: '2041-2070', factors: [fv({ ...coldOut, level: 'fits', place: 2 })] });
  assert.equal(said(line.rowBandOf(pv({ level: 'outside', factors: [coldOut], limiting: coldOut }), inRange, period).line, 'en'), 'Outside its range today; in range by 2041–2070');
});

// ---- h3 G4 batch 1 (chunk 3 hand-off triage M29 to M39) ----

// M29: the hold predicates sit beside holdsBy in the verdict rule; the views reach them through the
// loaded rule (the rule's own chunk), and the words module no longer holds them.
test('M29: holdStatesOf, laterLossOf and holdCounts are the verdict rule\'s, reached through loadVerdictRule; the words module has none', async () => {
  for (const k of ['holdStatesOf', 'laterLossOf', 'holdCounts']) {
    assert.equal(typeof vd[k], 'function', `verdict.ts ${k}`);
    assert.equal(line[k], undefined, `verdict-line.ts has no ${k}`);
  }
  const { loadVerdictRule } = await import('../src/lib/consortium/verdict-load.ts');
  const rule = await loadVerdictRule();
  for (const k of ['holdStates', 'laterLoss', 'holdCounts']) assert.equal(typeof rule[k], 'function', `rule.${k}`);
});

// M30: one count for the hold period: 3 "not" and 2 "unknown" say both, never only the unknown.
test('M30: holdCounts counts holds, not and unknown over the given ids; an id with no state is unknown', () => {
  const states = new Map([[1, 'not'], [2, 'not'], [3, 'not'], [4, 'unknown'], [5, 'unknown'], [6, 'holds']]);
  assert.deepEqual(vd.holdCounts(states, [1, 2, 3, 4, 5]), { holds: 0, not: 3, unknown: 2 });
  assert.deepEqual(vd.holdCounts(states, [6, 7]), { holds: 1, not: 0, unknown: 1 });
  assert.deepEqual(vd.holdCounts(new Map(), []), { holds: 0, not: 0, unknown: 0 });
});

// M31: a serious conflict carries its seriousness on the line itself, so every surface (Details, Swap,
// Find, the Next step) draws it in the danger colour with the word.
test('M31: flagLines gives a high conflict the danger level and a chip ending "(serious)"; a medium one stays a warning', async () => {
  const strings = await import('../src/islands/consortium/strings.ts');
  strings.setStrings(Object.fromEntries(Object.entries(words.en).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice(11), v])), 'en');
  const { flagLines } = await import('../src/islands/consortium/views/kit/flags.ts');
  const olive = { id: 9, names: { en: 'Olive' }, canonical_name: 'Olea europaea' };
  const scene = { site: core.UNSURE_SITE, members: [], country: null, taxonOf: (id) => (id === 9 ? olive : null) };
  const t = drainPlant(true);
  const [high, medium] = flagLines(t, [
    { id: 1, kind: 'conflict', severity: 'high', other: 9, type: 'shared_pest', agent: null },
    { id: 1, kind: 'conflict', severity: 'medium', other: 9, type: 'shared_pest', agent: null },
  ], scene);
  assert.equal(high.level, 'danger');
  assert.equal(high.chip, 'With Olive: a shared pest or disease (serious)');
  assert.equal(medium.level ?? 'warning', 'warning');
  assert.doesNotMatch(medium.chip, /serious/);
});

// M32: no place set, a bloom row scoped to a country and a latitude band: setting a place could select
// it, so "set a place", never "no months recorded near your place"; at a set place elsewhere: none.
test('M32 (Flowers): a GB-scoped row with a hemisphere and a latitude band says no-place without a place, none at a place in FR', () => {
  const gb = [row(['Apr', 'May'], { country: 'GB', hemisphere: 'N', latitude: '50..60' })];
  assert.deepEqual(bloom.bloomNear(gb, { lat: null, country: null, zone: 'Temperate' }), { state: 'no-place' });
  assert.deepEqual(bloom.bloomNear(gb, { lat: null, country: 'FR', zone: 'Temperate' }), { state: 'no-place' });
  assert.deepEqual(bloom.bloomNear(gb, { lat: 48.8, country: 'FR', zone: 'Temperate' }), { state: 'none' });
});

// M36: the rain a plant is recorded from, on a row, only at a dryland and only when the release has it.
test('M36: rowRainLine says "recorded from N mm" at a dryland with a rain range, nothing at a humid place or without one', () => {
  const t = (low) => ({ climate: { precip: low === undefined ? undefined : { low, high: 900 } } });
  assert.equal(said(line.rowRainLine(t(24.6), 0.12), 'en'), 'recorded from 25 mm');
  assert.equal(said(line.rowRainLine(t(24.6), 0.12), 'es'), 'con registros desde 25 mm');
  assert.equal(line.rowRainLine(t(undefined), 0.12), null, 'dryland, no rain range: no line');
  assert.equal(line.rowRainLine(t(24.6), 1.2), null, 'humid: no line');
  assert.equal(line.rowRainLine(t(24.6), null), null, 'no aridity known: no line');
});

// M39: the soil card's distance in each language's own kilometre form.
test('M39: formatKm writes kilometres in the language\'s unit form', async () => {
  const { formatKm } = await import('../src/islands/consortium/format.ts');
  assert.equal(formatKm(12, 'en'), '12 km');
  assert.equal(formatKm(12, 'ja'), new Intl.NumberFormat('ja', { style: 'unit', unit: 'kilometer', unitDisplay: 'short', maximumFractionDigits: 0 }).format(12));
  assert.equal(formatKm(1250, 'en'), '1,250 km');
});

// M38, h3 R1-R4: a plant's sheet opened from a sheet stacks over it (store.sheets); the sheet under it
// is the way back (sheetBack), and closing the top one shows the one under as it was (same opening).
test('M38, h3 R1-R4: Details from Find stacks over it; Swap from Details stacks too; the same kind replaces the top; each back pops one level, Find and its target kept', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  store.closeSheet();
  store.openSheet('details', 5);
  assert.equal(store.sheetBack.peek(), null, 'from the palette: no way back');
  store.closeSheet();
  const job = { job: 'feeds_soil', hole: null, fits: null, title: null };
  store.openSheet('find', null, job);
  const n = store.sheet.peek().n;
  store.openSheet('details', 5);
  assert.deepEqual(store.sheets.peek().map((s) => s.kind), ['find', 'details'], 'Details over Find');
  assert.deepEqual([store.sheetBack.peek().kind, store.sheetBack.peek().n], ['find', n]);
  assert.equal(store.findSheet.peek().n, n, 'Find keeps its own opening while Details is on top');
  assert.equal(store.sheetTarget.peek().job, 'feeds_soil', 'and its target');
  // R4: Details → Swap → "Back to" Details keeps Find under Details.
  const dn = store.sheet.peek().n;
  store.openSheet('swap', 5);
  assert.deepEqual(store.sheets.peek().map((s) => s.kind), ['find', 'details', 'swap']);
  store.backToSheet();
  assert.deepEqual([store.sheet.peek().kind, store.sheet.peek().n], ['details', dn], 'back to the same Details');
  assert.equal(store.sheetBack.peek().kind, 'find', 'still over Find');
  store.backToSheet();
  assert.deepEqual([store.sheet.peek().kind, store.sheet.peek().n, store.sheetTarget.peek().job], ['find', n, 'feeds_soil'], 'back to the same opening of Find');
  assert.equal(store.sheetBack.peek(), null);
  // Over its own kind a plant's sheet takes the top one's place, the one under kept.
  store.openSheet('details', 5);
  store.openSheet('details', 6);
  assert.deepEqual(store.sheets.peek().map((s) => [s.kind, s.id]), [['find', null], ['details', 6]], 'Details over Details: replaced');
  store.backToSheet();
  // Find and Paste replace the stack (Paste's "Search by hand" opens Find in its place).
  store.openSheet('paste');
  assert.deepEqual(store.sheets.peek().map((s) => s.kind), ['paste']);
  store.openSheet('details', 5);
  store.closeSheet();
  assert.deepEqual(store.sheets.peek(), [], 'closeSheet closes every level');
  store.openSheet('details', 5);
  store.backToSheet();
  assert.equal(store.sheet.peek(), null, 'back with nothing under: closed');
});

// h3 fix round 2, B2.1: a history that refuses pushState (Safari's SecurityError past 100 calls,
// Firefox's rate limit) never hangs the page: pushWaiting stops at the first refused push.
test('B2.1 (h3): pushWaiting returns when pushState throws, with sheets above the entries', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  const had = Object.getOwnPropertyDescriptor(globalThis, 'history');
  let calls = 0;
  Object.defineProperty(globalThis, 'history', { configurable: true, value: { state: null, pushState() { calls++; throw new Error('SecurityError'); }, go() {} } });
  try {
    store.closeSheet();
    store.openFind();
    store.openSheet('details', 5);
    assert.equal(store.sheets.peek().length, 2, 'two sheets, no entry pushed');
    calls = 0;
    store.pushWaiting(); // a hang here is the bug
    assert.ok(calls <= 2, `at most one refused push per missing level (${calls})`);
  } finally {
    store.closeSheet();
    if (had) Object.defineProperty(globalThis, 'history', had); else delete globalThis.history;
  }
});

// h3 fix round 2, B4.1: "‹ Back to results" only on a Details opened from a Find row (board Details),
// never on one opened from the page while the desk's Find panel is open, nor on one a toast's Show
// opened over that Details.
test('B4.1 (h3): a sheet records where it was opened from; only a Find row\'s Details shows the way back', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  store.closeSheet();
  store.openFind();
  store.openSheet('details', 5);
  assert.equal(store.sheet.peek().from, null, 'from the page over the Find panel: from nowhere');
  store.openSheet('details', 6, {}, 'find');
  assert.equal(store.sheet.peek().from, 'find', 'from a Find row');
  store.openSheet('details', 7);
  assert.equal(store.sheet.peek().from, null, 'a toast\'s Show over it: from nowhere');
  store.closeSheet();
  const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  assert.match(src('../src/islands/consortium/views/find/Find.tsx'), /openSheet\('details', t\.id, \{\}, 'find'\)/, 'Find\'s row says it opened Details');
  assert.match(src('../src/islands/consortium/views/details/Details.tsx'), /from === 'find' && \w+\?\.kind === 'find'/, 'Details shows the link only from Find, over Find');
});
