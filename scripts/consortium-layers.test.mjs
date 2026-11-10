// Layer values and yield-gain pairs in the details sheet (added within format 3, 2026-11-10):
// src/scripts/consortium/layers.js and its rows in app.js, run in the small browser
// (scripts/consortium-harness.mjs) on the invented fixture. Each layer value shows its months in the
// page language, where it holds and its source; a value that is not recorded by a dataset carries the
// word "estimate" inline, with one legend line under the section, never a tooltip. A yield-gain pair
// with another member is a positive line of the plant's checks, never a conflict.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { device, tab } from './consortium-harness.mjs';
import { monthsText, scopeText, layerRows, isEstimate } from '../src/scripts/consortium/layers.js';
import { makeWords } from '../src/scripts/consortium/words.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const temperate = JSON.parse(read('scripts/fixtures/consortium/temperate.json'));
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const strings = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(read(`src/i18n/translations/${l}.json`))]));
const en = strings.en;
const taxon = (name) => temperate.taxa.find((t) => t.canonical_name === name);
const apple = taxon('Malus domestica'), strawberry = taxon('Fragaria vesca'), clover = taxon('Trifolium repens');
const short = (lang, i) => new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2001, i, 15));
// The words app.js builds from the page strings (consortium.* without the prefix, climate words whole).
const wordsFor = (lang) => {
  const s = {};
  for (const [k, v] of Object.entries({ ...en, ...strings[lang] })) {
    if (k.startsWith('consortium.')) s[k.slice(11)] = v;
    else if (k.startsWith('climate.')) s[k] = v;
  }
  return makeWords(s, lang);
};

async function sheet(name, opts = {}) {
  const dev = device();
  const t = tab(dev, '/consortium/', { siteClimate: 'temperate', ...opts });
  const page = await t.load();
  await page.act('crop-add', apple.id);
  await page.act('suggest');
  await page.act('details', taxon(name).id);
  return page;
}
const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
// The dd after the dt that reads `label`, in the traits list.
const ddOf = (page, label) => {
  const dt = page.$$('#ct-dialog .facts dt').find((d) => clean(d.textContent) === label);
  return dt ? dt.next : null;
};
const rows = (dd) => (dd ? dd.children.filter((c) => c.name === 'ul').flatMap((ul) => ul.children.filter((li) => li.name === 'li')) : []);
const textOf = (node) => clean(node?.textContent);
const part = (li, cls) => li.children.find((c) => c.attribs?.class?.split(' ').includes(cls));

test('months: names in the page language, runs joined, a run over the new year kept whole, all twelve as "All year"', () => {
  const W = wordsFor('en');
  assert.equal(monthsText(['Apr', 'May'], W), `${short('en', 3)}–${short('en', 4)}`);
  assert.equal(monthsText(['May'], W), short('en', 4));
  assert.equal(monthsText(['Nov', 'Dec', 'Jan', 'Feb'], W), `${short('en', 10)}–${short('en', 1)}`);
  assert.equal(monthsText(['Feb', 'Mar', 'Nov', 'Dec'], W), new Intl.ListFormat('en', { type: 'unit', style: 'short' }).format([`${short('en', 1)}–${short('en', 2)}`, `${short('en', 10)}–${short('en', 11)}`]));
  assert.equal(monthsText(['Jan', 'Mar', 'Apr', 'Jun'], W), new Intl.ListFormat('en', { type: 'unit', style: 'short' }).format([short('en', 0), `${short('en', 2)}–${short('en', 3)}`, short('en', 5)]));
  assert.equal(monthsText(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], W), en['consortium.t.allYear']);
  for (const lang of ['fr', 'ja', 'ru']) assert.equal(monthsText(['Apr'], wordsFor(lang)), short(lang, 3), lang);
});

test('scope: a country by its name, a latitude band with its hemisphere, the climate, everywhere', () => {
  const W = wordsFor('en');
  assert.equal(scopeText({ country: 'GB' }, W), new Intl.DisplayNames('en', { type: 'region' }).of('GB'));
  assert.equal(scopeText({ country: 'GB', hemisphere: 'N' }, W), new Intl.DisplayNames('en', { type: 'region' }).of('GB'), 'the country says the hemisphere already');
  assert.equal(scopeText({ hemisphere: 'N', latitude: '35..50' }, W), en['consortium.scope.latN'].replace('{from}', '35').replace('{to}', '50'));
  assert.equal(scopeText({ hemisphere: 'S', latitude: '-50..-35' }, W), en['consortium.scope.latS'].replace('{from}', '35').replace('{to}', '50'));
  assert.equal(scopeText({ hemisphere: 'N', latitude: '0..23' }, W), en['consortium.scope.latN'].replace('{from}', '0').replace('{to}', '23'));
  assert.equal(scopeText({ hemisphere: 'S' }, W), en['consortium.scope.south']);
  assert.equal(scopeText({ climate: 'Temperate' }, W), en['climate.temperate']);
  assert.equal(scopeText({ region: 'europe' }, W), en['consortium.region.europe']);
  assert.equal(scopeText(null, W), en['consortium.scope.everywhere']);
  assert.equal(scopeText({ country: 'FR' }, wordsFor('fr')), new Intl.DisplayNames('fr', { type: 'region' }).of('FR'));
});

test('kinds: recorded is a value, every other kind an estimate', () => {
  assert.equal(isEstimate({ kind: 'recorded' }), false);
  for (const kind of ['derived', 'extracted', 'llm']) assert.equal(isEstimate({ kind }), true, kind);
});

test('layerRows: the four fields in order, each value with months, place, source and kind', () => {
  const W = wordsFor('en');
  const label = (id) => temperate.sources[id].label;
  const got = layerRows(apple, W, label);
  assert.deepEqual(got.map((r) => r.field), ['bloom_months', 'ripening_or_fruit_seen_months', 'tolerates_wind']);
  assert.deepEqual(got[0].values.map((v) => [v.text, v.where, v.estimate]), [
    [`${short('en', 3)}–${short('en', 4)}`, `${new Intl.DisplayNames('en', { type: 'region' }).of('GB')} · Plants For A Future`, false],
    [`${short('en', 2)}–${short('en', 4)}`, `${en['consortium.scope.latN'].replace('{from}', '35').replace('{to}', '50')} · PhenoVision`, true],
  ]);
  assert.deepEqual(got[2].values.map((v) => [v.text, v.estimate]), [[en['consortium.yes'], true]]);
  assert.deepEqual(layerRows(taxon('Corylus avellana'), W, label), [], 'no layer values, no rows');
});

test('the sheet lists the layer values in its traits, marks each estimate in words and explains the word once', async () => {
  const page = await sheet('Malus domestica');
  const bloom = ddOf(page, en['consortium.t.bloom']);
  assert.ok(bloom, 'a flowering row');
  const [recorded, derived] = rows(bloom);
  assert.equal(textOf(part(recorded, 'lv-v')), `${short('en', 3)}–${short('en', 4)}`);
  assert.ok(textOf(part(recorded, 'lv-where')).includes('Plants For A Future'));
  assert.equal(part(recorded, 'lv-est'), undefined, 'a recorded value carries no marker');
  assert.equal(textOf(part(derived, 'lv-est')), en['consortium.est.word']);
  assert.equal(part(derived, 'lv-est').attribs.title, undefined, 'no tooltip: the word is the marker');
  assert.ok(textOf(part(derived, 'lv-where')).includes('PhenoVision'));
  assert.ok(ddOf(page, en['consortium.t.fruit']));
  assert.equal(ddOf(page, en['consortium.t.sowing']), null, 'no sowing value for the apple');
  assert.equal(textOf(part(rows(ddOf(page, en['consortium.t.wind']))[0], 'lv-v')), en['consortium.yes']);
  const legends = page.$$('#ct-dialog .lv-legend');
  assert.equal(legends.length, 1);
  assert.ok(textOf(legends[0]).includes(en['consortium.est.legend']));
  // The layer sources are credited with the others.
  const srcs = page.$$('#ct-dialog .srcs li').map(textOf);
  assert.ok(srcs.some((s) => s.startsWith('PhenoVision')), srcs.join(' | '));
});

test('a plant whose values are all recorded has no legend; a plant with none has no rows', async () => {
  const page = await sheet('Fragaria vesca');
  assert.ok(ddOf(page, en['consortium.t.sowing']));
  assert.equal(textOf(part(rows(ddOf(page, en['consortium.t.fruit']))[0], 'lv-v')), `${short('en', 10)}–${short('en', 1)}`);
  assert.equal(page.$$('#ct-dialog .lv-legend').length, 1, 'the southern fruit months are an estimate');
  const hazel = await sheet('Corylus avellana');
  assert.equal(ddOf(hazel, en['consortium.t.bloom']), null);
  assert.equal(hazel.$$('#ct-dialog .lv-legend').length, 0);
  // Recorded only: no legend.
  const only = structuredClone(temperate);
  only.taxa.find((t) => t.canonical_name === 'Fragaria vesca').layer_values.splice(1);
  assert.deepEqual(layerRows(only.taxa.find((t) => t.canonical_name === 'Fragaria vesca'), wordsFor('en'), (id) => id).flatMap((r) => r.values.map((v) => v.estimate)), [false]);
});

test('the sheet speaks the page language: month names, the marker and the legend', async () => {
  const page = await sheet('Malus domestica', { lang: 'fr' });
  const bloom = ddOf(page, strings.fr['consortium.t.bloom']);
  assert.ok(bloom);
  assert.equal(textOf(part(rows(bloom)[0], 'lv-v')), `${short('fr', 3)}–${short('fr', 4)}`);
  assert.equal(textOf(part(rows(bloom)[1], 'lv-est')), strings.fr['consortium.est.word']);
  assert.ok(textOf(page.$('#ct-dialog .lv-legend')).includes(strings.fr['consortium.est.legend']));
});

test('a yield-gain pair with another member is a positive check with its evidence and source, never a warning', async () => {
  const page = await sheet('Malus domestica');
  const items = page.$$('#ct-dialog .w-list .w-item');
  const cloverName = clover.names.en;
  const pair = items.find((li) => li.attribs.class.includes('good') && textOf(li).includes(cloverName));
  assert.ok(pair, items.map(textOf).join(' | '));
  assert.ok(textOf(pair).startsWith(en['consortium.d.yieldGain'].replace('{other}', cloverName)));
  assert.ok(textOf(pair).includes(cloverName));
  assert.ok(textOf(pair).includes(temperate.interactions.find((r) => r.type === 'intercropped_yield_gain').note.en), 'the exporter\'s note');
  assert.ok(textOf(pair).includes('Horticulture intercropping experiments'), 'its source');
  assert.ok(!items.some((li) => /warning|soft/.test(li.attribs.class) && textOf(li).includes(cloverName)), 'no conflict with the clover');
  // The clover's sheet shows the same pair from its side.
  await page.escape();
  await page.act('details', clover.id);
  assert.ok(page.$$('#ct-dialog .w-item.good').some((li) => textOf(li).includes(apple.names.en)));
});

test('strings: the estimate, scope, layer and pair words in all 11 locales, translated', () => {
  const keys = ['consortium.est.word', 'consortium.est.legend', 'consortium.t.bloom', 'consortium.t.fruit', 'consortium.t.sowing', 'consortium.t.wind', 'consortium.t.allYear',
    'consortium.scope.everywhere', 'consortium.scope.latN', 'consortium.scope.latS', 'consortium.scope.north', 'consortium.scope.south',
    'consortium.ctype.intercropped_yield_gain', 'consortium.d.yieldGain'];
  for (const lang of LOCALES) for (const key of keys) {
    assert.ok(strings[lang][key]?.trim(), `${lang}: ${key}`);
    if (lang !== 'en' && !key.startsWith('consortium.scope.lat')) assert.notEqual(strings[lang][key], en[key], `${lang}: ${key} is translated`);
  }
});

test('layout: the marker never splits, and on a phone it may wrap onto its own line', () => {
  const css = read('src/styles/consortium.css');
  assert.match(css, /\.ct \.lv-est \{[^}]*white-space: nowrap/);
  assert.match(css, /\.ct \.lv-list li \{[^}]*flex-wrap: wrap/);
});
