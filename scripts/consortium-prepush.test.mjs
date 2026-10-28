// The pre-push review of the merged consortium branch (prepush-decisions.md Q1 to Q7, prepush-browser.md
// R1 to R5, coordinator rulings 2026-10-29), tested by what a reader sees.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { device, tab } from './consortium-harness.mjs';
import * as core from '../src/lib/consortium/index.ts';
import { cropExamples } from '../src/scripts/consortium/crops.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const loc = (lang) => JSON.parse(read(`src/i18n/translations/${lang}.json`));
const climate = (c) => JSON.parse(read(`public/data/consortium/${c}.json`));
const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const byName = (file, n) => file.taxa.find((t) => t.canonical_name === n);

function linkOf(c, file, members, { country = 'FR', room = 'field' } = {}) {
  const q = core.encodeState({ climate: c, country, site: { ...core.DEFAULT_SITE, room }, kept: members, removed: [], members, plants: [], crops: [], guests: [] }, file);
  return '/consortium/#' + q.toString();
}
async function open(c, members, opts = {}, pageOpts = {}) {
  const file = climate(c);
  const t = tab(device(), linkOf(c, file, members, opts), { data: 'real', ...pageOpts });
  return { t, page: await t.load(), file };
}

// ---------- Q1 to Q5: words ----------
test('Q1: French never says "consortium": the tool is a « guilde » everywhere', () => {
  for (const [k, v] of Object.entries(loc('fr'))) assert.doesNotMatch(v, /consorti/i, `fr ${k}: ${v}`);
  assert.match(loc('fr')['consortium.mainCropText'], /^Une culture principale de cette guilde\./);
});

test('Q2: an unchecked toxicity never invites tasting or eating, in any language', () => {
  assert.equal(loc('fr')['consortium.d.toxUnk'], 'La toxicité n’a pas encore été vérifiée. En attendant, manipulez-la avec précaution et ne la consommez pas.');
  const taste = /go[uû]t|tast|kost|probier|assagg|prueb|prov[ae]|saborea|degust|попроб|отвед|味見|尝|吃吧|맛보|드세요|smaak|proef/i;
  for (const lang of LOCALES) assert.doesNotMatch(loc(lang)['consortium.d.toxUnk'], taste, lang);
});

test('Q3: the helpers job feeds bees in general, never only the honey bee', () => {
  const ja = loc('ja')['consortium.job.helpers.about'], zh = loc('zh')['consortium.job.helpers.about'];
  assert.match(ja, /ハナバチ/); assert.doesNotMatch(ja, /ミツバチ/);
  assert.match(zh, /蜂类/); assert.doesNotMatch(zh, /蜜蜂/);
});

test('Q4: Japanese calls a warning 警告 wherever the tool means a warning', () => {
  const ja = loc('ja');
  for (const k of ['sv.marksNote', 'fromListText']) {
    assert.match(ja['consortium.' + k], /警告/, k);
    assert.doesNotMatch(ja['consortium.' + k], /注意/, k);
  }
});

test('Q5: the French helpers guide names the tool\'s « rôle », never a « fonction »', () => {
  const fr = read('src/content/guides/garden-helpers/fr.mdx');
  assert.match(fr, /le rôle «\sAttire les auxiliaires\s»/);
  assert.doesNotMatch(fr, /la fonction «\sAttire/);
});

test('Q7: the seedless-crop sentence is its own general tip, outside the bullet credited to Eierman', () => {
  for (const [lang, seedless] of [['en', /saffron/], ['fr', /safran/]]) {
    const lines = read(`src/content/guides/flowers-for-pollinators/${lang}.mdx`).split('\n');
    const bullet = lines.find((l) => /Eierman/.test(l) && /^- \*\*/.test(l) && /hybrid/i.test(l));
    assert.ok(bullet, lang);
    assert.doesNotMatch(bullet, seedless, `${lang}: not in Eierman's bullet`);
    const tip = lines.find((l) => seedless.test(l));
    assert.match(tip, /^\{\/\* general tip, not from the book \*\/\}/, `${lang}: tagged, on its own line`);
  }
});

// ---------- R1: "Use France" beside a guess ----------
test('R1: a guessed country offers a one-tap "Use France" on the country line, and its dashed chip says what a guess means', async () => {
  const file = climate('temperate');
  const ids = file.taxa.slice(0, 9).map((t) => t.id);
  const { page } = await open('temperate', ids, { country: null });
  const chip = page.$('#ct-app .cl-chip');
  assert.equal(chip.attribs['data-src'], 'guess');
  assert.equal(chip.attribs.title, 'France is only a guess from your browser, so shared links leave it out until you use it.');
  const use = page.$('#ct-app .country-line [data-act="use-country"]');
  assert.equal(text(use), 'Use France');
  assert.equal(use.attribs['data-v'], 'FR');
  await page.act('use-country', 'FR');
  const after = page.$('#ct-app .cl-chip');
  assert.equal(after.attribs['data-src'], 'user');
  assert.equal(after.attribs.title, undefined);
  assert.match(text(page.$('#ct-app .country-line')), /chosen by you/);
  assert.equal(page.$$('#ct-app [data-act="use-country"]').length, 0, 'once chosen, nothing to confirm');
  assert.equal(page.document.activeElement?.attribs?.['data-fk'], 'pc-country', 'the focus stays on the country chip');
  // French: « Utiliser France ».
  const fr = await open('temperate', ids, { country: null }, { lang: 'fr' });
  assert.equal(text(fr.page.$('#ct-app .country-line [data-act="use-country"]')), 'Choisir France');
  // A chosen country has nothing to confirm.
  const chosen = await open('temperate', ids, { country: 'FR' });
  assert.equal(chosen.page.$$('#ct-app [data-act="use-country"]').length, 0);
});

// ---------- R2: crop examples with variety ----------
test('R2: the crop examples are the same every time, one plant per genus, spread across the layers', () => {
  for (const c of ['temperate', 'mediterranean', 'tropical']) {
    const file = climate(c);
    const ex = cropExamples(file, 4);
    assert.equal(ex.length, 4, c);
    assert.deepEqual(cropExamples(file, 4).map((t) => t.id), ex.map((t) => t.id), `${c}: deterministic`);
    assert.equal(new Set(ex.map((t) => t.genus)).size, 4, `${c}: one per genus: ${ex.map((t) => t.canonical_name)}`);
    const layers = new Set(ex.map((t) => t.stratum?.value)).size;
    const offered = new Set(file.taxa.filter((t) => t.role === 'crop').map((t) => t.stratum?.value)).size;
    assert.ok(layers >= Math.min(3, offered), `${c}: ${layers} layers: ${ex.map((t) => t.canonical_name)}`);
    // The placeholder's three are the first three examples.
    assert.deepEqual(cropExamples(file, 3).map((t) => t.id), ex.slice(0, 3).map((t) => t.id));
    // A chosen crop is left out and its genus no longer blocks the next.
    const rest = cropExamples(file, 4, [ex[0].id]);
    assert.ok(!rest.some((t) => t.id === ex[0].id));
  }
  assert.ok(cropExamples(climate('temperate'), 4).filter((t) => t.genus === 'Allium').length <= 1, 'not four alliums');
});

// ---------- R3: one print title ----------
test('R3: every print is titled "Your consortium", at any plant count; printTitle is gone', async () => {
  for (const lang of LOCALES) assert.equal(loc(lang)['consortium.printTitle'], undefined, lang);
  const file = climate('temperate');
  for (const n of [9, 21]) {
    const { page } = await open('temperate', file.taxa.slice(0, n).map((t) => t.id));
    await page.act('print');
    assert.equal(text(page.$('#ct-print .sheet-title')), 'Your consortium', `${n} plants`);
  }
  const fr = await open('temperate', file.taxa.slice(0, 9).map((t) => t.id), {}, { lang: 'fr' });
  await fr.page.act('print');
  assert.equal(text(fr.page.$('#ct-print .sheet-title')), 'Votre guilde');
});

// ---------- R4: a spread is said as a spread ----------
test('R4: when a plant\'s width breaks the room limit, its chip says it spreads, in all 11 languages', async () => {
  for (const lang of LOCALES) for (const r of ['small', 'large']) assert.match(loc(lang)[`consortium.misfit.room.${r}.wide`], /\{w\}/, `${lang} ${r}`);
  const file = climate('temperate');
  const walnut = byName(file, 'Juglans regia');
  const { page } = await open('temperate', [...file.taxa.filter((t) => t.id !== walnut.id).slice(0, 8).map((t) => t.id), walnut.id], { room: 'large' });
  const card = page.$(`#ct-app [data-id="${walnut.id}"]`) ?? [...page.$$('#ct-app .card, #ct-app .pcard')].find((c) => /Walnut/.test(text(c)));
  assert.ok(card, 'the walnut card');
  assert.match(text(card), /Spreads to 20\sm: too big for a large garden/);
  assert.doesNotMatch(text(card), /Grows to 20/);
  // A plant taller than it is wide still "grows to" its height.
  assert.equal(loc('en')['consortium.misfit.room.large'], 'Grows to {w} m: too big for a large garden');
});

// ---------- R5: the count of countries looks the same everywhere ----------
test('R5: with no country, a card shows the count of countries as the rows do: a muted dashed globe, no warning sign', async () => {
  const file = climate('tropical');
  const pigeon = byName(file, 'Cajanus cajan');
  const ids = [pigeon.id, ...file.taxa.filter((t) => t.id !== pigeon.id).slice(0, 8).map((t) => t.id)];
  const { page } = await open('tropical', ids, { country: null });
  await page.act('open-place', 'country');
  await page.act('no-country');
  const card = [...page.$$('#ct-app .warns')].find((w) => /countries/.test(text(w)) && /Pigeon/.test(text(w.closest('li, article, .card') ?? w)))
    ?? [...page.$$('#ct-app .warns')].find((w) => /5 countries/.test(text(w)));
  assert.ok(card, 'a card with the count');
  const inv = card.querySelector('.inv-count');
  assert.ok(inv, 'the globe chip');
  assert.match(text(inv), /Invasive in 5 countries/);
  assert.ok(inv.querySelector('svg circle[stroke-dasharray]'), 'the dashed globe');
  for (const w of card.querySelectorAll('.warn')) assert.doesNotMatch(text(w), /countries/, 'never in a warning chip');
});
