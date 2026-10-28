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

// Mockup state 05 is drawn at a field (design-scale.md §1c: "200 ids, field, France"), so the side
// view is checked there unless a test says otherwise (review S9).
function linkOf(members, { country = 'FR', room = 'field' } = {}) {
  const q = core.encodeState({ climate: 'temperate', country, site: { ...core.DEFAULT_SITE, room }, kept: members, removed: [], members, plants: [], crops: [], guests: [] }, temperate);
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

test('a plant is drawn as a tree, a shrub, a herb or a climber (never a free-standing tree: a vine on its support)', () => {
  assert.equal(SV.shapeOf(named('Tilia platyphyllos') ?? { traits: { habit: 'Tree' } }), 'tree');
  assert.equal(SV.shapeOf(named('Cornus mas')), named('Cornus mas').traits.habit === 'Tree' ? 'tree' : 'shrub');
  assert.equal(SV.shapeOf(named('Allium schoenoprasum')), 'herb');
  assert.equal(SV.shapeOf({ traits: { habit: 'Climber' } }), 'climber');
  assert.equal(SV.shapeOf(named('Vitis vinifera')), 'climber');
  assert.equal(SV.shapeOf({ traits: { habit: null } }), 'herb');
});

test('M1 on the real Temperate list: "Most" is the middle half of the heights not named as exceptions, both ends real heights; the exceptions and the climbers are named; unknown heights are counted', () => {
  const heights = (list) => new Set(list.map(SV.heightOf));
  for (const s of ['emergent', 'high', 'medium', 'low']) {
    const f = SV.bandFacts(s, layer(s));
    const named = new Set([...f.tall, ...f.short, ...f.climbers]);
    const rest = layer(s).filter((t) => SV.heightOf(t) > 0 && !named.has(t));
    for (const end of f.typical) assert.ok(heights(rest).has(end), `${s}: ${end} m is the height of a plant not named as an exception`);
    assert.equal(f.n, layer(s).length, `${s}: every plant counted once`);
  }
  const em = SV.bandFacts('emergent', layer('emergent'));
  assert.deepEqual(em.typical.map(roundHeight), [18, 40], 'Most 18–40 m (mockup state 05), not 7–40 m across the gap');
  assert.deepEqual(em.short.map((t) => t.names.en), ['Corn', 'Sunflower'], 'shortest first');
  assert.equal(em.unknown, 2, 'Silver birch and English oak');
  assert.equal(em.tall.length, 0, 'Emergent has no "tall" exceptions');
  const high = SV.bandFacts('high', layer('high'));
  assert.deepEqual(high.typical.map(roundHeight), [1, 14]);
  assert.deepEqual(high.tall.map((t) => t.names.en), ['European Ash', 'European chestnut'], 'a climber is never a "tall plant"');
  assert.deepEqual(high.climbers.map((t) => t.names.en), ['Wine grape', 'Hardy kiwi', 'Hop', 'Scarlet runner bean'], 'tallest first');
  assert.equal(high.unknown, 1, 'Common juniper');
  const mid = SV.bandFacts('medium', layer('medium'));
  assert.deepEqual(mid.typical.map(roundHeight), [0.7, 2]);
  assert.equal(mid.tall.length, 14);
  assert.deepEqual(mid.tall.slice(0, 3).map((t) => t.names.en), ['Large-leaved linden', 'Norway spruce', 'Small-leaved linden']);
  assert.equal(mid.climbers.length, 7);
  const low = SV.bandFacts('low', layer('low'));
  assert.deepEqual(low.typical.map(roundHeight), [0.2, 0.6]);
  assert.equal(low.tall.length + low.short.length, 0, 'Low names no exceptions');
  // A band with 4 known heights or fewer lists them all, tallest first, and says no "Most".
  const few = layer('low').slice(0, 4);
  const small = SV.bandFacts('low', few);
  assert.equal(small.typical, null);
  assert.deepEqual(small.all.map(SV.heightOf), few.map(SV.heightOf).filter((h) => h > 0).sort((a, b) => b - a));
  assert.equal(SV.bandFacts('low', layer('low').slice(0, 5)).all.length, 0);
});

test('marks are dense (no gap, alternate shades) only when they are too narrow for a 1 px gap at the width drawn', () => {
  assert.equal(SV.denseAt(940, 107), false, '107 Mid marks at 1280: one shade with gaps');
  assert.equal(SV.denseAt(250, 107), true, 'on a phone they are under 3 px');
  assert.equal(SV.denseAt(0, 107), false, 'not laid out: nothing to decide');
  assert.equal(SV.denseAt(250, 0), false);
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
  for (const p of plants) assert.match(p.attribs['data-shape'], /^(tree|shrub|herb|climber)$/);
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

test('a climber is drawn as a vine on its support, and the legend, the band and the caption say how high it climbs', async () => {
  const grape = named('Vitis vinifera');
  const { page } = await open([...NINE, grape.id]);
  const p = page.$(`#ct-side .sv-col[data-t="${grape.id}"] .sv-plant`);
  assert.equal(p.attribs['data-shape'], 'climber');
  assert.ok(p.querySelector('.sv-support'), 'its support');
  assert.match(text([...page.$$('#ct-side .pkey li')].find((li) => /Wine grape/.test(text(li)))), /climbs to 35 m$/);
  assert.match(page.$('#ct-side .sv-band[data-s="high"] .sv-strip').attribs['aria-label'], /Wine grape, climbs to 35 m/);
  assert.match(page.text('#ct-side .profile-foot'), /A climber is drawn as a vine on its support/);
  const { page: none } = await open(NINE);
  assert.doesNotMatch(none.text('#ct-side .profile-foot'), /climber/);
});

test('the legend, on screen and in print: one name per plant, the scientific name beside it when it differs, and "With a warning" beside each flagged plant', async () => {
  const { page } = await open(NINE);
  const check = (where) => {
    const items = [...page.$$(`${where} .pkey li`)];
    assert.equal(items.length, NINE.length, where);
    let flagged = 0;
    for (const li of items) {
      assert.equal(li.querySelectorAll('.pkey-name').length, 1, `${where}: ${text(li)}`);
      const n = text(li.querySelector('.pkey-n')), sci = li.querySelector('.pkey-sci');
      const t = temperate.taxa.find((x) => x.names.en === n || x.canonical_name === n);
      assert.ok(t, n);
      if (t.canonical_name !== n) { assert.equal(sci?.name, 'i'); assert.equal(text(sci), t.canonical_name); } else assert.equal(sci, null);
      if (li.querySelector('.plook')) { flagged++; assert.equal(text(li.querySelector('.plook .vh')), 'With a warning'); }
    }
    return flagged;
  };
  const shown = check('#ct-side');
  assert.equal(shown, page.$$('#ct-side .sv-nums .num[data-w]').length, 'one per numbered dot');
  assert.ok(shown >= 1);
  await page.act('print');
  assert.equal(check('#ct-print'), shown);
});

test('the light cue says layers are about light, not height (design-scale §2.3, M1)', async () => {
  const { page } = await open(NINE);
  assert.equal(page.text('.light-cue'), 'Layers are about light, not height: the top layers need full sun, the lower ones take the shade of those above.');
  const fr = await open(NINE, { lang: 'fr' });
  assert.equal(fr.page.text('.light-cue'), 'Les strates, c’est la lumière, pas la hauteur : en haut les plantes de plein soleil, plus bas celles qui supportent l’ombre des autres.');
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

test('above 20 a band with marks is one focusable group named by its count and described by its heights; no arrow-key promise; the pointer and the arrow keys name each mark', async () => {
  const { page } = await open(ids);
  const strips = [...page.$$('#ct-side .sv-strip[tabindex="0"]')];
  assert.equal(strips.length, 4, 'one per band');
  for (const s of strips) assert.equal(s.attribs.role, 'group');
  const mid = page.$('#ct-side .sv-band[data-s="medium"] .sv-strip');
  assert.equal(mid.attribs['aria-label'], 'Mid, takes some shade: 107 plants, 10 with a warning.');
  assert.doesNotMatch(mid.attribs['aria-label'], /arrow/i, 'a screen reader in browse mode never gets the arrow keys');
  assert.equal(page.$('#' + mid.attribs['aria-describedby'])?.attribs.class, 'sv-sum', 'described by the band\'s heights');
  mid.focus();
  mid.dispatchEvent(new page.Event('focusin'));
  await page.settle();
  const tip = page.$('#ct-side .sv-band[data-s="medium"] .sv-tip');
  const first = page.$('#ct-side .sv-band[data-s="medium"] .sv-marks i');
  const firstT = temperate.taxa.find((x) => x.id === first.attribs['data-t']);
  assert.ok(!('hidden' in tip.attribs), 'focus names the first mark');
  assert.match(text(tip), new RegExp(`^${firstT.names.en}, \\d+ m`));
  // The arrow keys keep the page's own keys unless they move to another mark.
  const press = (key) => { const e = new page.Event('keydown', { key }); mid.dispatchEvent(e); return e.defaultPrevented; };
  assert.equal(press('ArrowLeft'), false, 'no mark before the first: the key scrolls the page');
  assert.equal(press('PageDown'), false, 'Page Down scrolls the page');
  assert.equal(press('ArrowRight'), true);
  await page.settle();
  const second = [...page.$$('#ct-side .sv-band[data-s="medium"] .sv-marks i')][1];
  assert.match(text(tip), new RegExp(`^${temperate.taxa.find((x) => x.id === second.attribs['data-t']).names.en}, `));
  assert.equal(second.attribs['data-on'], 'true');
  assert.equal(press('End'), true);
  assert.equal(press('End'), false, 'already at the last mark');
  // The pointer: hovering a mark names it.
  const low = [...page.$$('#ct-side .sv-band[data-s="low"] .sv-marks i')][2];
  low.dispatchEvent(new page.Event('pointerover'));
  await page.settle();
  assert.match(text(page.$('#ct-side .sv-band[data-s="low"] .sv-tip')), new RegExp(`^${temperate.taxa.find((x) => x.id === low.attribs['data-t']).names.en}, `));
  const warned = page.$('#ct-side .sv-marks i[data-w]');
  warned.dispatchEvent(new page.Event('pointerover'));
  await page.settle();
  assert.match(text(warned.closest('.sv-band').querySelector('.sv-tip')), /With a warning/);
  // A climber's mark says it climbs.
  const grape = named('Vitis vinifera');
  const g = page.$(`#ct-side .sv-marks i[data-t="${grape.id}"]`);
  g.dispatchEvent(new page.Event('pointerover'));
  await page.settle();
  assert.match(text(g.closest('.sv-band').querySelector('.sv-tip')), /^Wine grape, climbs to 35 m/);
});

test('an empty band takes no tab stop and says it is empty with the list\'s own words', async () => {
  const { page } = await open(ids.slice(0, 21));
  const em = page.$('#ct-side .sv-band[data-s="emergent"]');
  assert.equal(em.querySelectorAll('.sv-marks i').length, 0);
  const strip = em.querySelector('.sv-strip');
  assert.equal(strip.attribs.tabindex, undefined);
  assert.equal(strip.attribs.role, 'img');
  assert.equal(text(em.querySelector('.sv-sum')), 'No plant in this layer.');
  assert.equal(page.$$('#ct-side .sv-strip[tabindex]').length, 3);
});

test('M1 at 200 plants (state 05, a field in France): under each band the heights are spelled out, the exceptions and climbers named with one separator, the unknown heights counted', async () => {
  const { page } = await open(ids);
  const sum = (s) => text(page.$(`#ct-side .sv-band[data-s="${s}"] .sv-sum`));
  assert.equal(sum('emergent'), 'Most 18–40 m. Also 2 short sun-lovers: Corn 2 m, Sunflower 3 m. Height not known for 2.');
  assert.equal(sum('high'), 'Most 1–14 m. Also 2 tall plants that grow up through the shade: European Ash 40 m, European chestnut 35 m. Also 4 climbers: Wine grape climbs to 35 m, Hardy kiwi climbs to 30 m, Hop climbs to 8 m and 1 more. Height not known for 1.');
  assert.match(sum('medium'), /^Most 0\.7–2 m\. Also 14 tall plants that grow up through the shade: Large-leaved linden 40 m, Norway spruce 40 m, Small-leaved linden 30 m and 11 more\. Also 7 climbers: .+ climbs to 12 m, .+ climbs to 10 m, .+ climbs to 6 m and 4 more\.$/);
  assert.equal(sum('low'), 'Most 0.2–0.6 m. Also 1 climber: Common Ivy climbs to 2 m.');
  // The band counts and warnings of state 05: ⚠ 1, 16, 10, 2 (29 of 200).
  assert.deepEqual([...page.$$('#ct-side .sv-n')].map((n) => text(n.querySelector('.vh'))), ['1 with a warning', '16 with a warning', '10 with a warning', '2 with a warning']);
  await page.act('fset', 'layer:medium');
  assert.match(page.text('.fresults'), /Showing 107 of 200/);
});

test('one separator at every count, and "and n more" only past 3; in Chinese and Japanese no space before it', async () => {
  const { page } = await open(ids, { lang: 'zh' });
  const sum = text(page.$('#ct-side .sv-band[data-s="medium"] .sv-sum'));
  assert.match(sum, /、[^、]+等另外 11 种/);
  assert.doesNotMatch(sum, / 等另外/);
  assert.doesNotMatch(sum, /和/);
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
  // Dense is decided at the width drawn (the browser), never by the count alone.
  assert.equal(page.$$('#ct-side .sv-marks[data-dense]').length, 0);
  // The caption explains the alternate shades, shown only where a band is dense.
  assert.match(text(page.$('#ct-side .profile-foot .sv-dense-note')), /every other one is a different shade/);
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

test('print: the drawing and its legend at 20 plants or fewer; above 20 "At a glance" then the table, no marks (state 13)', async () => {
  const { page } = await open(NINE);
  await page.act('print');
  assert.equal(page.$('#ct-print .profile').attribs['data-size'], 'draw');
  assert.equal(page.$$('#ct-print .sv-plant').length, NINE.length);
  assert.equal(page.$$('#ct-print .pkey li').length, NINE.length);
  assert.equal(page.$$('#ct-print [tabindex], #ct-print .sv-tip').length, 0, 'nothing to focus on paper');
  assert.equal(page.$$('#ct-print [id="ct-side"]').length, 0, 'no id shared with the screen');
  const big = await open(ids);
  await big.page.act('print');
  assert.equal(big.page.$$('#ct-print .sv, #ct-print .sv-marks i').length, 0, 'no marks drawing');
  const glance = big.page.$('#ct-print .print-glance');
  assert.ok(glance, 'At a glance');
  assert.equal(text(glance.querySelector('h3')), 'At a glance');
  const rows = [...glance.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => text(c)));
  assert.deepEqual(rows, [['Plants', '10', '59', '107', '24', '200'], ['With a warning', '1', '16', '10', '2', '29']]);
  assert.deepEqual([...glance.querySelectorAll('thead th')].map((c) => text(c)), ['', 'Emergent', 'High', 'Mid', 'Low', 'All']);
  assert.match(text(glance.querySelector('.glance-kinds')), /^With a warning: Invasive in France 3 · Toxic 6 · .+ 20\.$/);
  const order = big.page.$('#ct-print .sheet').children.map((c) => c.attribs?.class ?? c.name).filter(Boolean);
  assert.ok(order.indexOf('print-glance') < order.indexOf('print-table'), 'At a glance, then the table');
  assert.equal(big.page.$$('#ct-print tbody tr[data-id]').length, 200, 'and the table');
});

// (The page text is read with its spaces folded; the locale test checks the no-break spaces.)
test('the side view reads in French', async () => {
  const { page } = await open(ids, { lang: 'fr' });
  assert.equal(text(page.$('#ct-side .sv-band[data-s="medium"] .sv-light')), 'supporte un peu d’ombre');
  assert.match(text(page.$('#ct-side .sv-band[data-s="medium"] .sv-sum')), /^La plupart mesurent entre 0,7 et 2 m\. S’y ajoutent 14 plantes hautes qui montent à travers l’ombre : .+ 40 m, .+ 40 m, .+ 30 m et 11 autres\. S’y ajoutent 7 grimpantes : .+ grimpe jusqu’à 12 m, .+ et 4 autres\.$/);
  assert.match(text(page.$('#ct-side .sv-band[data-s="emergent"] .sv-sum')), /Hauteur inconnue pour 2 plantes\.$/);
  const nine = await open(NINE, { lang: 'fr' });
  assert.match(nine.page.text('#ct-side .profile-foot'), /contour en pointillé/);
});

test('every side-view string is in all 11 locales; the dead ones are gone; French has no-break spaces before : and ; and between a number and its unit', () => {
  const keys = ['sv.drawNote', 'sv.dashedNote', 'sv.climbNote', 'sv.marksNote', 'sv.denseNote', 'sv.most', 'sv.mostOne', 'sv.tall', 'sv.short', 'sv.climb', 'sv.climbsTo', 'sv.all', 'sv.unknown', 'sv.bandLabel', 'glance', 'glancePlants', 'glanceAll', 'glanceWarn', 'lightCue', 'emptyLayer'];
  for (const lang of LOCALES) {
    const s = JSON.parse(read(`src/i18n/translations/${lang}.json`));
    for (const k of keys) assert.ok(s['consortium.' + k], `${lang}: ${k}`);
    for (const k of ['layersNote', 'sv.keys', 'sv.empty', ...['emergent', 'high', 'medium', 'low'].map((x) => `stratum.${x}.short`)]) assert.equal(s['consortium.' + k], undefined, `${lang}: ${k} is gone`);
    for (const k of ['sv.tall', 'sv.short', 'sv.climb', 'sv.unknown']) assert.match(s['consortium.' + k], /other:/, `${lang}: ${k} is plural`);
  }
  const fr = JSON.parse(read('src/i18n/translations/fr.json'));
  for (const [k, v] of Object.entries(fr)) {
    if (!k.startsWith('consortium.')) continue;
    assert.doesNotMatch(v, / [:;!?]/, `fr ${k}: a no-break space before : ; ! ?`);
    assert.doesNotMatch(v, /[\d}] (m|cm|ans?|mois)(?![\p{L}])/u, `fr ${k}: a no-break space between a number and its unit`);
  }
});
