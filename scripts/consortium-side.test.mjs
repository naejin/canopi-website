// The side view at every size (scale chunk C; design-scale.md §1b.3, §1c.3, §2.3, M1, M4; mockup v2
// states 02 and 05; decision row "Scale, coordinator choices": one side-view drawing at every size,
// one mark per plant above 20). The pure rules (src/scripts/consortium/side.js) on the real Temperate
// list, then the view through the tool's own wiring (scripts/consortium-harness.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { device, tab } from './consortium-harness.mjs';
import * as core from '../src/lib/consortium/index.ts';
import * as SV from '../src/scripts/consortium/side.js';
import { roundHeight } from '../src/scripts/consortium/scale.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const real = (c) => JSON.parse(read(`public/data/consortium/${c}.json`));
const temperate = real('temperate');
const ids = temperate.taxa.map((t) => t.id);
const named = (n) => temperate.taxa.find((t) => t.canonical_name === n);
const layer = (s) => temperate.taxa.filter((t) => t.stratum?.value === s);
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];

function linkOf(members, { country = 'FR' } = {}) {
  const q = core.encodeState({ climate: 'temperate', country, site: { ...core.DEFAULT_SITE }, kept: members, removed: [], members, plants: [], crops: [], guests: [] }, temperate);
  return '/consortium/#' + q.toString();
}
async function open(members, opts = {}) {
  const t = tab(device(), linkOf(members, opts), { data: 'real', ...opts });
  return { t, page: await t.load() };
}
// Nine plants over the four layers, Silver birch with no height (state 02's shape).
const NINE = ['Betula pendula', 'Caragana arborescens', 'Juniperus communis', 'Cornus mas', 'Allium sativum', 'Allium schoenoprasum', 'Allium ursinum', 'Viola odorata', 'Malus domestica']
  .map((n) => named(n)?.id).filter(Boolean);
const text = (el) => (el ? render(el) : '');
function render(el) { let s = ''; (function walk(n) { if (n.type === 'text') s += n.data; for (const c of n.children ?? []) walk(c); })(el); return s.replace(/\s+/g, ' ').trim(); }

// ---------- The rules ----------
test('one log scale from 0.05 m to 60 m: the ground, the top, and the 1 m, 5 m and 20 m lines in between', () => {
  assert.equal(SV.heightFrac(0.05), 0);
  assert.equal(SV.heightFrac(60), 1);
  assert.equal(SV.heightFrac(0.01), 0, 'clamped at the ground');
  assert.equal(SV.heightFrac(90), 1, 'clamped at the top');
  assert.equal(SV.heightFrac(null), 0);
  const [one, five, twenty] = SV.SCALE_LINES.map(SV.heightFrac);
  assert.ok(one > 0.4 && one < 0.45 && five > 0.62 && five < 0.68 && twenty > 0.82 && twenty < 0.86, `${one} ${five} ${twenty}`);
  // True to height: a 40 m linden stands above a 0.3 m herb, in every band, on the same scale.
  assert.ok(SV.heightFrac(40) > SV.heightFrac(4) && SV.heightFrac(4) > SV.heightFrac(0.3));
});

test('a plant is drawn as a tree, a shrub or a herb', () => {
  assert.equal(SV.shapeOf(named('Tilia platyphyllos') ?? { traits: { habit: 'Tree' } }), 'tree');
  assert.equal(SV.shapeOf(named('Cornus mas')), named('Cornus mas').traits.habit === 'Tree' ? 'tree' : 'shrub');
  assert.equal(SV.shapeOf(named('Allium schoenoprasum')), 'herb');
  assert.equal(SV.shapeOf({ traits: { habit: 'Climber' } }), 'shrub');
  assert.equal(SV.shapeOf({ traits: { habit: null } }), 'herb');
});

test('M1 on the real Temperate list: typical heights are the middle half, the exceptions are named, unknown heights are counted', () => {
  const mid = SV.bandFacts('medium', layer('medium'));
  assert.deepEqual(mid.typical.map(roundHeight), [0.7, 4], 'Most 0.7–4 m');
  assert.equal(mid.tall.length, 16, '16 tall plants that grow up through the shade');
  assert.deepEqual(mid.tall.slice(0, 3).map((t) => t.names.en), ['Large-leaved linden', 'Norway spruce', 'Small-leaved linden']);
  assert.deepEqual(mid.tall.slice(0, 3).map((t) => roundHeight(SV.heightOf(t))), [40, 40, 30]);
  assert.equal(mid.unknown, 0);
  const high = SV.bandFacts('high', layer('high'));
  assert.deepEqual(high.typical.map(roundHeight), [1, 15]);
  assert.equal(high.tall.length, 3);
  assert.equal(high.unknown, 1, 'Common juniper');
  const em = SV.bandFacts('emergent', layer('emergent'));
  assert.equal(em.short.length, 2, '2 short sun-lovers');
  assert.ok(SV.heightOf(em.short[0]) <= SV.heightOf(em.short[1]), 'shortest first');
  assert.equal(em.unknown, 2, 'Silver birch and English oak');
  assert.equal(em.tall.length, 0, 'Emergent has no "tall" exceptions');
  const low = SV.bandFacts('low', layer('low'));
  assert.deepEqual(low.typical.map(roundHeight), [0.2, 0.6]);
  assert.equal(low.tall.length + low.short.length, 0, 'Low names no exceptions');
  // Every plant is counted once: known or not.
  for (const s of ['emergent', 'high', 'medium', 'low']) assert.equal(SV.bandFacts(s, layer(s)).n, layer(s).length);
});

test('a plant with no height stands at its layer\'s usual height: the band\'s median, else the list\'s, never zero', () => {
  const birch = named('Betula pendula');
  const mid = SV.usualHeight('medium', layer('medium'));
  assert.ok(mid > 1 && mid < 3, String(mid));
  assert.equal(SV.usualHeight('emergent', [birch], temperate.taxa), SV.usualHeight('emergent', layer('emergent')), 'only unknowns in the band: the list\'s layer');
  assert.ok(SV.usualHeight('low', [], []) > 0, 'a fixed height when nothing is known');
});

test('marks are spread honestly: one per plant, tallest first, the unknown heights last', () => {
  const order = SV.markOrder(layer('emergent'));
  assert.equal(order.length, layer('emergent').length);
  const hs = order.map(SV.heightOf);
  assert.deepEqual(hs.slice(-2), [null, null]);
  for (let i = 1; i < hs.length - 2; i++) assert.ok(hs[i - 1] >= hs[i]);
});

// ---------- 1 to 20 plants: the drawing ----------
test('9 plants: four bands named by the light they need; each plant drawn true to height as a tree, shrub or herb, numbered; a legend with name and height', async () => {
  const { page } = await open(NINE);
  const side = page.$('#ct-side');
  assert.ok(side, 'the side view');
  assert.equal(side.attribs['data-size'], 'draw');
  const bands = [...page.$$('#ct-side .sv-band')];
  assert.deepEqual(bands.map((b) => b.attribs['data-s']), ['emergent', 'high', 'medium', 'low']);
  assert.deepEqual(bands.map((b) => text(b.querySelector('.sv-light'))), ['needs full sun', 'needs a lot of light', 'takes some shade', 'takes deep shade']);
  const plants = [...page.$$('#ct-side .sv-plant')];
  assert.equal(plants.length, NINE.length, 'one silhouette per plant');
  for (const p of plants) assert.match(p.attribs['data-shape'], /^(tree|shrub|herb)$/);
  // In its own band.
  for (const id of NINE) {
    const t = temperate.taxa.find((x) => x.id === id);
    assert.ok(page.$(`#ct-side .sv-band[data-s="${t.stratum.value}"] .sv-col[data-t="${id}"] .sv-plant`), `${t.canonical_name} in ${t.stratum.value}`);
  }
  // True to height: the drawn height is the log fraction of the plant's height.
  const garlic = named('Allium sativum'), cherry = named('Cornus mas');
  const hOf = (id) => Number(page.$(`.sv-col[data-t="${id}"] .sv-plant`).attribs['data-h']);
  assert.ok(Math.abs(hOf(cherry.id) - SV.heightFrac(SV.heightOf(cherry))) < 0.01);
  assert.ok(hOf(cherry.id) > hOf(garlic.id), 'a cherry stands above garlic in the same band');
  // No more scale words that say heights only show the layer.
  assert.doesNotMatch(page.text('#ct-side'), /not the exact size/);
  assert.match(page.text('#ct-side .profile-foot'), /Heights are compressed so trees and herbs both fit; the lines mark 1 m, 5 m and 20 m/);
  // The lines at 1 m, 5 m and 20 m in every band.
  for (const b of bands) assert.deepEqual([...b.querySelectorAll('.sv-line')].map((l) => text(l)), ['1 m', '5 m', '20 m']);
  // The legend: every plant once, numbered, with its name and height.
  const legend = [...page.$$('#ct-side .pkey li')];
  assert.equal(legend.length, NINE.length);
  assert.match(text(legend.find((li) => /Cornelian cherry/.test(text(li)))), /^\d+ Cornelian cherry Cornus mas \d+ m$/);
});

test('a plant with no height is a dashed outline at its layer\'s usual height, and the caption and the legend say so', async () => {
  const { page } = await open(NINE);
  const birch = named('Betula pendula');
  const p = page.$(`.sv-col[data-t="${birch.id}"] .sv-plant`);
  assert.equal(p.attribs['data-dashed'], 'true');
  assert.ok(Number(p.attribs['data-h']) > 0, 'drawn, at its layer\'s usual height');
  assert.match(page.text('#ct-side .profile-foot'), /A dashed outline: height not known yet, drawn at the layer’s usual height\./);
  assert.match(text([...page.$$('#ct-side .pkey li')].find((li) => /Silver birch/.test(text(li)))), /no height$/);
  // Without such a plant the caption does not say it.
  const { page: all } = await open(NINE.filter((id) => id !== birch.id && id !== named('Juniperus communis').id));
  assert.doesNotMatch(all.text('#ct-side .profile-foot'), /dashed/);
});

test('heights are rounded once, the same in the legend as in the list (one height helper)', async () => {
  const { page } = await open(NINE);
  const legend = new Map([...page.$$('#ct-side .pkey li')].map((li) => [li.querySelector('[data-v]')?.attribs['data-v'], text(li.querySelector('.pkey-h'))]));
  await page.act('mode', 'list');
  for (const id of NINE) assert.equal(legend.get(id), text(page.$(`.lrow[data-id="${id}"] .lheight`)).replace(/^Height /, ''), id);
});

test('the drawing has a text equivalent: each band is an image named by its plants and heights, and the legend lists them all', async () => {
  const { page } = await open(NINE);
  const strips = [...page.$$('#ct-side .sv-strip')];
  assert.equal(strips.length, 4);
  for (const s of strips) assert.equal(s.attribs.role, 'img');
  const mid = page.$('#ct-side .sv-band[data-s="medium"] .sv-strip').attribs['aria-label'];
  assert.match(mid, /^Mid, takes some shade: /);
  assert.match(mid, /Cornelian cherry, \d+ m/);
  assert.equal(page.$$('#ct-side .sv-strip[tabindex]').length, 0, 'the drawing adds no tab stop: the legend buttons open details');
  assert.ok(page.$$('#ct-side .pkey [data-act="details"]').length === NINE.length);
});

// ---------- Above 20: one mark per plant in the same frame ----------
test('21 plants: the same frame, one mark per plant in its band, a dot for a warning, the lines at 1, 5 and 20 m, no legend', async () => {
  const { page } = await open(ids.slice(0, 21));
  const side = page.$('#ct-side');
  assert.equal(side.attribs['data-size'], 'marks');
  assert.equal(page.$$('#ct-side .sv-band').length, 4);
  const marks = [...page.$$('#ct-side .sv-marks i')];
  assert.equal(marks.length, 21);
  assert.equal(new Set(marks.map((m) => m.attribs['data-t'])).size, 21, 'each plant once');
  for (const m of marks) {
    const t = temperate.taxa.find((x) => x.id === m.attribs['data-t']);
    assert.equal(m.closest('.sv-band').attribs['data-s'], t.stratum.value);
  }
  assert.equal(page.$$('#ct-side .pkey li').length, 0, 'no 21-item legend');
  assert.match(page.text('#ct-side .profile-foot'), /Each mark is one plant\. A mark with a dot has a warning\./);
  for (const b of page.$$('#ct-side .sv-band')) assert.deepEqual([...b.querySelectorAll('.sv-line')].map((l) => text(l)), ['1 m', '5 m', '20 m']);
});

test('above 20 the marks are not 200 tab stops: one focusable summary per band; the arrow keys and the pointer name each mark', async () => {
  const { page } = await open(ids);
  const strips = [...page.$$('#ct-side .sv-strip[tabindex="0"]')];
  assert.equal(strips.length, 4, 'one per band');
  const mid = page.$('#ct-side .sv-band[data-s="medium"] .sv-strip');
  assert.match(mid.attribs['aria-label'], /^Mid, takes some shade: 107 plants, \d+ with a warning\. /);
  assert.equal(page.$('#' + mid.attribs['aria-describedby'].split(' ')[0])?.attribs.class, 'sv-sum', 'described by the band\'s heights');
  mid.focus();
  mid.dispatchEvent(new page.Event('focus', { bubbles: false }));
  mid.dispatchEvent(new page.Event('focusin'));
  await page.settle();
  const tip = page.$('#ct-side .sv-band[data-s="medium"] .sv-tip');
  const first = page.$('#ct-side .sv-band[data-s="medium"] .sv-marks i');
  const firstT = temperate.taxa.find((x) => x.id === first.attribs['data-t']);
  assert.ok(!('hidden' in tip.attribs), 'focus names the first mark');
  assert.match(text(tip), new RegExp(`^${firstT.names.en}, \\d+ m`));
  await page.key('ArrowRight');
  const second = [...page.$$('#ct-side .sv-band[data-s="medium"] .sv-marks i')][1];
  assert.match(text(tip), new RegExp(`^${temperate.taxa.find((x) => x.id === second.attribs['data-t']).names.en}, `));
  assert.equal(second.attribs['data-on'], 'true');
  await page.key('End');
  assert.match(text(tip), /no height|\d m/);
  // The pointer: hovering a mark names it.
  const low = [...page.$$('#ct-side .sv-band[data-s="low"] .sv-marks i')][2];
  low.dispatchEvent(new page.Event('pointerover'));
  await page.settle();
  assert.match(text(page.$('#ct-side .sv-band[data-s="low"] .sv-tip')), new RegExp(`^${temperate.taxa.find((x) => x.id === low.attribs['data-t']).names.en}, `));
  // A mark with a warning says so.
  const warned = page.$('#ct-side .sv-marks i[data-w]');
  warned.dispatchEvent(new page.Event('pointerover'));
  await page.settle();
  assert.match(text(warned.closest('.sv-band').querySelector('.sv-tip')), /With a warning/);
});

test('M1 at 200 plants: under each band the heights are spelled out, with named exceptions and the unknown heights counted', async () => {
  const { page } = await open(ids);
  const sum = (s) => text(page.$(`#ct-side .sv-band[data-s="${s}"] .sv-sum`));
  assert.equal(sum('medium'), 'Most 0.7–4 m. Also 16 tall plants that grow up through the shade: Large-leaved linden 40 m, Norway spruce 40 m, Small-leaved linden 30 m and 13 more.');
  assert.match(sum('high'), /^Most 1–15 m\. Also 3 tall plants that grow up through the shade: .+ 40 m, .+ 35 m(,| and) .+ 35 m\. Height not known for 1\.$/);
  assert.match(sum('emergent'), /^Most \d+–\d+ m\. Also 2 short sun-lovers: .+ \d m and .+ \d m\. Height not known for 2\.$/);
  assert.equal(sum('low'), 'Most 0.2–0.6 m.');
  // Each band says its count and warnings, and Show sets the Layer filter on the list.
  assert.match(text(page.$('#ct-side .sv-band[data-s="medium"] .sv-n')), /^107 plants/);
  await page.act('fset', 'layer:medium');
  assert.match(page.text('.fresults'), /Showing 107 of 200/);
});

test('readable at 200 plants: 200 marks, every one on the true scale, a dot only where the list warns', async () => {
  const { page } = await open(ids);
  const marks = [...page.$$('#ct-side .sv-marks i')];
  assert.equal(marks.length, 200);
  for (const m of marks) {
    const t = temperate.taxa.find((x) => x.id === m.attribs['data-t']);
    const h = SV.heightOf(t);
    const pct = Number(/--h:\s*([\d.]+)%/.exec(m.attribs.style)[1]);
    if (h) assert.ok(Math.abs(pct - SV.heightFrac(h) * 100) < 0.1, `${t.canonical_name}: ${pct}`);
    else assert.equal(m.attribs['data-u'], 'true');
  }
  // The dots match the plants the warning box counts.
  const warnedRows = Number(/(\d+) of 200 plants/.exec(page.text('.attention-scale'))[1]);
  assert.equal(page.$$('#ct-side .sv-marks i[data-w]').length, warnedRows);
  // A band with more marks than fit at full width is marked dense (no gaps; alternate shades).
  assert.equal(page.$('#ct-side .sv-band[data-s="medium"] .sv-marks').attribs['data-dense'], 'true');
  assert.equal(page.$('#ct-side .sv-band[data-s="emergent"] .sv-marks').attribs['data-dense'], undefined);
});

test('speed: at 200 plants the side view renders in under 50 ms', async () => {
  const { page } = await open(ids);
  const times = [];
  for (let i = 0; i < 5; i++) { const t0 = performance.now(); page.app.__test.sideViewHTML(); times.push(performance.now() - t0); }
  times.sort((a, b) => a - b);
  assert.ok(times[0] < 50 && times[2] < 50, `${times.map((x) => x.toFixed(1)).join(', ')} ms`);
});

test('patched, not rebuilt: Keep and a tick leave the side view as it was; a Remove draws it again', async () => {
  const { page } = await open(ids);
  const before = page.$('#ct-side');
  await page.act('group', 'medium');
  const row = page.$('#ct-lg-medium .lrow').attribs['data-id'];
  await page.act('keep', row);
  assert.equal(page.$('#ct-side'), before, 'Keep in the list');
  await page.act('sel', row);
  assert.equal(page.$('#ct-side'), before, 'a tick');
  await page.act('bulk-keep');
  assert.equal(page.$('#ct-side'), before, 'Keep n renders the result, the side view stays');
  // Cards: Keep renders the page; the side view is moved back, not written again.
  const nine = await open(NINE);
  const drawn = nine.page.$('#ct-side');
  await nine.page.act('keep', NINE[3]);
  assert.equal(nine.page.$('#ct-side'), drawn, 'Keep on a card');
  await nine.page.act('remove', NINE[3]);
  assert.notEqual(nine.page.$('#ct-side'), drawn, 'a Remove changes what it shows');
  assert.equal(nine.page.$$('#ct-side .sv-plant').length, NINE.length - 1);
});

test('print: the drawing and its legend at 20 plants or fewer, the marks and band heights above 20; nothing to focus on paper', async () => {
  const { page } = await open(NINE);
  await page.act('print');
  assert.equal(page.$('#ct-print .profile').attribs['data-size'], 'draw');
  assert.equal(page.$$('#ct-print .sv-plant').length, NINE.length);
  assert.equal(page.$$('#ct-print .pkey li').length, NINE.length);
  const big = await open(ids);
  await big.page.act('print');
  assert.equal(big.page.$('#ct-print .profile').attribs['data-size'], 'marks');
  assert.equal(big.page.$$('#ct-print .sv-marks i').length, 200);
  assert.equal(big.page.$$('#ct-print .sv-sum').length, 4);
  assert.equal(big.page.$$('#ct-print [tabindex], #ct-print button, #ct-print .sv-tip').length, 0);
  assert.equal(big.page.$$('#ct-print tbody tr[data-id]').length, 200, 'and the table');
  assert.equal(big.page.$$('#ct-print [id="ct-side"]').length, 0, 'no id shared with the screen');
});

test('the side view reads in French', async () => {
  const { page } = await open(ids, { lang: 'fr' });
  assert.equal(text(page.$('#ct-side .sv-band[data-s="medium"] .sv-light')), 'supporte un peu d’ombre');
  assert.match(text(page.$('#ct-side .sv-band[data-s="medium"] .sv-sum')), /^La plupart entre 0,7 et 4 m\. Aussi 16 plantes hautes qui montent à travers l’ombre : .+ 40 m, .+ 40 m, .+ 30 m et 13 autres\.$/);
  const nine = await open(NINE, { lang: 'fr' });
  assert.match(nine.page.text('#ct-side .profile-foot'), /contour en pointillé/);
});

test('every side-view string is in all 11 locales; the old "not the exact size" note is gone', () => {
  const keys = ['sv.drawNote', 'sv.dashedNote', 'sv.marksNote', 'sv.most', 'sv.mostOne', 'sv.tall', 'sv.short', 'sv.unknown', 'sv.bandLabel', 'sv.keys', 'sv.empty'];
  for (const lang of LOCALES) {
    const s = JSON.parse(read(`src/i18n/translations/${lang}.json`));
    for (const k of keys) assert.ok(s['consortium.' + k], `${lang}: ${k}`);
    assert.equal(s['consortium.layersNote'], undefined, `${lang}: layersNote is gone`);
    for (const k of ['sv.tall', 'sv.short', 'sv.unknown']) assert.match(s['consortium.' + k], /other:/, `${lang}: ${k} is plural`);
  }
});

test('chip text hyphenates in the page language rather than breaking mid-word', () => {
  const css = read('src/styles/consortium.css');
  assert.match(css, /\.ct \.warn-chip > span \{[^}]*hyphens: auto/);
  assert.match(css, /\.ct \.warn > span \{[^}]*hyphens: auto/);
  assert.match(read('src/layouts/Base.astro'), /<html lang=\{lang\}>/);
});
