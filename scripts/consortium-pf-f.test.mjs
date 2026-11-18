// pf stream f, "One plant" (chunk 3): the words pf-f owns in the core's verdict-line vocabulary,
// said in the locale files as the boards say them.
// - F2 (chunk 2 hand-off triage): the German thin spot reads "Dünn besetzt: nur 1 Pflanze von Jahr 1
//   bis Jahr 15." (board German), with no "Reserve finden" (A20: thin rows carry no button), then the
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
import { readdirSync, readFileSync } from 'node:fs';

const line = await import('../src/lib/consortium/verdict-line.ts');
const { formatMm } = await import('../src/islands/consortium/format.ts');
const dir = new URL('../src/i18n/translations/', import.meta.url);
const words = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));

// A Line in a language's words as the island says it (strings.ts P for a count, words.ts for a
// millimetre variable and a list of Lines): the plural form for the count, # the number, then the {vars}.
function said(l, lang) {
  let text = words[lang][l.key];
  assert.ok(text, `${lang} has ${l.key}`);
  if (typeof l.count === 'number') {
    const forms = Object.fromEntries(text.split(' | ').map((f) => { const i = f.indexOf(': '); return [f.slice(0, i), f.slice(i + 2)]; }));
    text = (forms[new Intl.PluralRules(lang).select(l.count)] ?? forms.other).replace('#', String(l.count));
  }
  const parts = Object.fromEntries(Object.entries(l.parts ?? {}).map(([k, p]) => [k, Array.isArray(p) ? new Intl.ListFormat(lang, { type: 'conjunction' }).format(p.map((x) => said(x, lang))) : said(p, lang)]));
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in parts ? parts[k] : k.endsWith('Mm') ? formatMm(l.vars[k], lang) : k.startsWith('temp') ? `${l.vars[k]} °C` : String(l.vars[k])));
}

test('F2 (pf-f): the German thin spot opens as board German, with no "Reserve finden" (A20; C5 adds the backup prompt)', () => {
  const one = line.thinLine({ have: 1, fromYear: 1, toYear: 15 });
  assert.match(said(one, 'de'), /^Dünn besetzt: nur 1 Pflanze von Jahr 1 bis Jahr 15\./);
  assert.doesNotMatch(words.de['consortium.line.thin'], /Reserve finden/);
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
  assert.equal(bloom.monthsLong(kiambu.months, 'en', 'All year'), 'October–June');
  const almond = [row(['Feb', 'Mar'], { hemisphere: 'N', latitude: '45..48', country: 'CH' }, 'recorded'), row(['Jan', 'Feb', 'Mar'], { hemisphere: 'N', latitude: '35..50' }), row(['Dec', 'Jan', 'Feb'], { hemisphere: 'N', latitude: '23..35' })];
  const seville = bloom.bloomNear(almond, { lat: 37.4, country: 'ES', zone: 'Mediterranean' });
  assert.equal(bloom.monthsLong(seville.months, 'en', 'All year'), 'January–March', 'Seville: the 35..50 band; Switzerland\'s row and the 23..35 band left out');
  assert.equal(bloom.bloomNear(PINTO, { lat: 45, country: 'FR', zone: 'Temperate' }), null, 'no row near: null ("no months recorded near your place")');
  assert.equal(bloom.bloomNear(PINTO, { lat: null, country: null, zone: 'Tropical' }), null, 'no place: no scoped row');
  assert.deepEqual(bloom.bloomNear([row(['Apr'], null, 'recorded')], { lat: null, country: null, zone: 'Tropical' }), { months: ['Apr'], estimate: false }, 'an unscoped row holds everywhere');
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
  // On its cool edge today, in range by 2041–2070.
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
  assert.equal(said(line.gapLines([], [h(3, 15)]).leaves, 'en'), 'leaves a hole from year 3 to year 15');
  assert.equal(said(line.gapLines([h(0, 3), h(15, 60)], []).fills, 'en'), 'also fills 2 holes');
  assert.deepEqual(line.gapLines([], []), { fills: null, leaves: null }, 'no hole changes: no words');
  for (const lang of Object.keys(words)) for (const k of ['gapFillsOne', 'gapLeavesOne']) assert.match(words[lang][`consortium.line.${k}`], /\{span\}/, `${lang} ${k}`);
});

test('BC11 (pf-f keep line): a later second look counts, as the board\'s 15 years for Almond at Seville', () => {
  const now = pv(), look = pv({ judged: '2041-2070', level: 'look' }), fits = pv({ judged: '2071-2099' });
  assert.equal(line.keepLine(now, [look, fits], 2026)?.count, 15);
  assert.equal(said(line.keepLine(now, [look, fits], 2026), 'en'), 'Keeping it is a fair bet for its first 15 years: plant its successor beside it now.');
  assert.equal(line.keepLine(now, [pv({ judged: '2041-2070' }), fits], 2026), null, 'fits through: no line');
});

// ---- fix round 1, batch 2 ----

test('R4 (pf-f M23 in Against): the aridity band\'s line says "recorded from N mm" when the plant has a rain range; the row says it too', () => {
  const W = { period, scenario: 'SSP2-4.5', heightM: null };
  const dry = fv({ factor: 'dry', level: 'fits', place: 0.28, low: 0.27, high: 1.87 });
  const v = pv({ factors: [dry], range: 'judged' });
  const t = { climate: { precip: { low: 24.6, median: null, high: null, count: null, basis: 'cells', blocks: null, lowSource: null, highSource: null, weak: false } } };
  const entry = line.againstLines(v, null, { ...W, rainFrom: line.rainFromLine(t) }).find((e) => e.factor === 'dry');
  const all = (l, lang) => [said({ ...l, also: undefined }, lang), ...(l.also ?? []).map((a) => said(a, lang))].join(' ');
  assert.match(all(entry.line, 'en'), /recorded from 25 mm/);
  assert.match(all(entry.line, 'es'), /registros desde 25 mm/); // C11: no gendered participle
  for (const lang of Object.keys(words)) assert.match(all(entry.line, lang), /25/, `${lang} names the rain in the aridity line`);
  // No rain range: the line as before, nothing guessed.
  const bare = line.againstLines(v, null, { ...W, rainFrom: null }).find((e) => e.factor === 'dry');
  assert.doesNotMatch(all(bare.line, 'en'), /mm/);
});

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
    assert.doesNotMatch(words[lang]['consortium.line.rainFromNote'], re, `${lang}: rainFromNote neutral`);
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
