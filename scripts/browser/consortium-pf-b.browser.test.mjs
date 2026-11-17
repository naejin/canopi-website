// pf stream b, "The pictures and your plants" (pf commit 0, 2026-11-17): the boards Main, MainMore
// (pf's right column, owner Q9), Palette, PaletteMore, Toasts (where the toast sits, the marks between
// two plants, "How to read this" with the table kept as the screen-reader form, Q8), DeskStates (the
// toast bottom-left, 420 px wide at the desk, Q4; the climate check notice), Loading (its notice lines),
// DarkMain, DarkPalette and German, as tests. Owner rules: the light words (Full sun, Mostly sun, Part
// shade, Shade), never high/medium/low nor the boards' "Needs full sun"; colour never alone; text at
// 4.5:1 in both themes. Each case is marked expected-fail under pf-b (scripts/expect-fail.mjs failing()),
// its reason the board's first missing word or element (pf-helpers.mjs BOARD); pf-b removes a marker in
// the commit that makes it pass. The board's figures (13 plants near Seville, 8 near Kiambu) are
// illustrative: the cases read the same sentences over the real export, the numbers as patterns.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries PF2 (pp-pf; the pictures name each plant with its job icon, the light words on the rows) -> PFB1
//   carries PP-B7 (pp-b2; the phone steps one time span at a time, 44 px targets, the focus stays) -> PFB2
//   carries PP-B8 (pp-b2; the table is the pictures' screen-reader form, the same plants and spans) -> PFB3
//   carries PP-B37 (pp-b2; the key "Colour and icon show each plant's main job" with the six jobs) -> PFB1
//   carries PP-B43 (pp-b2; each job in its own colour, always beside its word) -> PFB4
//   carries PP-B20 (pp-b2; the climate check refused: no fit claimed, Try again in place; c2's rule) -> PFB9
//   carries PP-B49 (pp-b2; offline it waits and asks again when back online, no Reload offline; c2's rule) -> PFB9
//   carries PP-B50 (pp-b2; Try again never leaves the focus on <body>) -> PFB9
//   carries PP-B22 (pp-b2; the palette page fits 320 px in en, de, ru and ja) -> PFB11
//   carries PP-B46 (pp-b2; offline the page says what still works and what waits, no Reload) -> PFB10
//   carries PP-B9 (pp-b3; F1a-B6 restored row's sibling: plants with a warning first, the warning in words) -> PFB5
//   carries PP-B60 (pp-b3; F1a-B6 restored: Balance "One family: N of your M are <family>") -> PFB6
//   carries PP-B61, PP-B61b (pp-b3; a plant taller than the room carries the height note on its row) -> PFB5
//   carries PP-B62 (pp-b3; a plant Your plants cannot read says so on its row, counted in Balance) -> PFB6
//   carries PP-B63 (pp-b3; water needs not recorded said on their own line, "that is not a pass") -> PFB6
//   carries PP-B23 (pp-b3; 200 plants fold behind "Show all N plants", the focus on the first new row) -> PFB7
//   carries PP-B23b (pp-b3; 1 plant: one row, no fold; 0 plants: no Your plants, no take-aways) -> PFB7
//   carries PP-B64 (pp-b3; Undo after a removal hands the focus back to the plant's row) -> PFB7
//   carries P5-18 (s5d; Warnings "N leave their climate range by 2041–2070" with "See 2041–2070") -> PFB8
//   carries P5-19 (s5d; never "fine" for a plant with no future figures) -> PFB8
//   dropped PP-B18 print at a year step (the PP-D Print board replaces it), P5-19b (the panel below Share,
//   gone with the boards), PF2's old words ("Needs full sun", "taller than your room").
// Kept where they are (lasting seams): PP-B29 (200-plant scale), PP-B30, PP-B31, PP-B32 in pp-b2.
import assert from 'node:assert/strict';
import { aria, has, useHarness } from './helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, JOBS, LIGHT, OLD_LIGHT, boxOf, control, done, emptyPalette, focused, frames, inOrder, names, palette, pastEdge, press, says, saysNot, section, sectionBox, toastText, verdictsSettled } from './pf-helpers.mjs';

useHarness();

const ROW_HEAD = new RegExp(`(?:${LIGHT.join('|')}) \\d+ plants?`);
// Each text element on the page whose contrast with what is behind it falls under 4.5:1 (the first few).
const lowContrast = (page) => page.evaluate(() => {
  const rgb = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const behind = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  const out = [];
  for (const el of document.querySelectorAll('#ct-root *')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    const a = lum(rgb(getComputedStyle(el).color)), b = lum(behind(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 4.5) out.push(`"${el.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1`);
    if (out.length > 4) break;
  }
  return out;
});
const plantNames = (page, ids) => page.evaluate((x) => { const s = window.__ctTest.store; return x.map((id) => s.memberTaxa?.value?.find?.((t) => t.id === id)?.name ?? null); }, ids);

failing('PFB1 (pf-b Main at 1280 and 960): "Through the years" with its intro, one row per light level ("Full sun 4 plants"), each plant named on the picture beside its job icon, the dashed empty place "Nobody in the first 3 years" with "Find a plant"; the key "Colour and icon show each plant’s main job:" with the six jobs in order; "Further down this page: Through the year · The cooler months · Jobs · Warnings (N)"; never high/medium/low nor "Needs full sun"', { owner: 'pf-b', reason: BOARD }, async () => {
  for (const width of [1280, 960]) {
    const page = await palette({ width });
    assert.ok(await verdictsSettled(page), 'the verdicts');
    const chart = await section(page, 'Through the years');
    assert.ok(chart.includes('Who stands where as the plot grows up, by the light each plant needs. A dashed place is empty: select it to see the plants that fill it.'), `board: the intro at ${width} px`);
    assert.match(chart, ROW_HEAD, 'board: a row head in the light words with its count ("Full sun 4 plants")');
    const shown = await plantNames(page, await page.evaluate(() => window.__ctTest.store.members.value.slice()));
    for (const n of shown.filter(Boolean)) assert.ok(chart.includes(n), `board: ${n} named on the picture`);
    if (/Nobody /.test(chart)) assert.ok((await names(page, 'button')).includes('Find a plant') || (await names(page, 'link')).includes('Find a plant'), 'board: an empty place offers "Find a plant"');
    await inOrder(page, ['Colour and icon show each plant’s main job:', ...JOBS]);
    await says(page, /Further down this page: Through the year · The cooler months · Jobs · Warnings \(\d+\)/);
    await saysNot(page, OLD_LIGHT, 'owner "Layer is light"');
    await done(page);
  }
});

failing('PFB2 (pf-b Palette at 390, carried from PP-B7): "Through the years" says "Step through time; an empty level is a hole."; one time span at a time ("Years 1–3", "Time span 3 of 7"), "Earlier" and "Later" step it by one, each a 44 px target, and the focus stays on the pressed button', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette({ site: 'kiambu', climate: 'Temperate', n: 8, width: 390 });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  const chart = await section(page, 'Through the years');
  assert.ok(chart.includes('Step through time; an empty level is a hole.'), 'board: "Step through time; an empty level is a hole."');
  assert.match(chart, /Years? \d+(?:–\d+)?|Months? \d+–\d+/, 'board: the span shown in words ("Years 1–3")');
  const span = await control(page, 'group', /^Time span \d of 7$/).catch(() => null) ?? await control(page, 'img', /^Time span \d of 7$/);
  const at = Number(span.name.match(/\d/)[0]);
  await press(page, 'button', 'Later');
  await control(page, span.role, `Time span ${at + 1} of 7`);
  const f = await focused(page);
  assert.equal(f.name, 'Later', 'board: the focus stays on "Later"');
  for (const b of ['Earlier', 'Later']) {
    const box = await page.$eval(aria('button', b), (e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
    assert.ok(box[0] >= 44 && box[1] >= 44, `board: "${b}" a 44 px target (${box})`);
  }
  await done(page);
});

failing('PFB3 (pf-b "How to read this", owner Q8): the pictures carry "How to read this" in the board\'s words; the table stays the screen-reader form of the picture, every plant once with its light words and its span', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await press(page, 'button', 'How to read this');
  await says(page, /How to read this/);
  await says(page, /Each row is the light a plant needs/);
  const table = await page.$$eval('main table', (ts) => ts.map((t) => t.innerText.replace(/\s+/g, ' ')).join(' '));
  for (const w of LIGHT.slice(0, 1)) assert.ok(table.includes(w), `board: the table says "${w}"`);
  assert.doesNotMatch(table, OLD_LIGHT, 'board: the table in the light words');
  await done(page);
});

failing('PFB4 (pf-b MainMore Jobs, carried from PP-B43): "Jobs" with its intro, one row per job in the board\'s order, each "<job> N plants" with the plants\' names, its strip named "N of 7 time spans covered", a hole "Nobody after year 15" with "Find a plant"; each job\'s icon in its own colour, never alone', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  const jobs = await section(page, 'Jobs');
  assert.ok(jobs.startsWith('Jobs What your plants do for the plot, and for how long. The strip is the seven time spans'), `board: the Jobs intro ("${jobs.slice(0, 80)}")`);
  const order = JOBS.map((j) => jobs.indexOf(`${j} `)).filter((i) => i >= 0);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'board: the jobs in the board\'s order');
  assert.match(jobs, new RegExp(`(?:${JOBS.join('|')}) \\d+ plants?`), 'board: "Feeds you 6 plants"');
  await control(page, 'img', /^\d of 7 time spans covered$/);
  await done(page);
});

failing('PFB5 (pf-b PaletteMore "Your N plants", carried from PP-B9, PP-B61 and PP-B61b): "Your 8 plants", "Plants with a warning come first.", each row its name, "<light> · <span>", "Grows to N m wide, M m tall" and its job tags; the warned rows first with "has a warning" and the warning in words ("Mildly toxic"); a plant not checked says "Its jobs have not been checked yet"', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette({ site: 'kiambu', climate: 'Temperate', n: 8, width: 390 });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  const yours = await section(page, 'Your 8 plants');
  assert.ok(yours.includes('Plants with a warning come first.'), 'board: "Plants with a warning come first."');
  assert.match(yours, new RegExp(`(?:${LIGHT.join('|')}) · (?:month|year|years|from)`, 'i'), 'board: each row "<light> · <span>"');
  assert.match(yours, /Grows to [\d.]+ m wide, [\d.]+ m tall|Size not recorded/, 'board: "Grows to 4 m wide, 6 m tall"');
  assert.doesNotMatch(yours, OLD_LIGHT, 'board: the light words');
  await done(page);
});

failing('PFB6 (pf-b MainMore Balance, carried from PP-B60, PP-B62 and PP-B63): "Balance things to weigh, not holes"; "One family: N of your M are <family>…"; the water line, "N not recorded: that is not a pass."; "Soil: N hints on pH"; nothing removed', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  const balance = await section(page, 'Balance');
  assert.ok(balance.startsWith('Balance things to weigh, not holes'), `board: "Balance things to weigh, not holes" ("${balance.slice(0, 60)}")`);
  assert.match(balance, /Water needs: /, 'board: the "Water needs:" line');
  if (/not recorded/.test(balance)) assert.match(balance, /\d+ not recorded: that is not a pass\./, 'board: "4 not recorded: that is not a pass."');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), 13, 'nothing removed');
  await done(page);
});

failing('PFB7 (pf-b Your plants at scale, carried from PP-B23, PP-B23b and PP-B64): 200 plants fold behind "Show all 200 plants" and the focus goes to the first new row; Undo after a removal gives the focus back to the row; at 1 plant one row and no fold; at 0 plants no Your plants, no Balance, no Warnings, no "Further down this page"', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette({ n: 200 });
  await section(page, 'Your 200 plants', 30_000);
  await press(page, 'button', 'Show all 200 plants');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'board: the focus on the first new row');
  await done(page);
  const one = await palette({ n: 1 });
  await section(one, 'Your plant');
  assert.ok(!(await names(one, 'button')).some((n) => /^Show all/.test(n)), 'board: one row, no fold');
  await done(one);
  const none = await emptyPalette();
  await says(none, 'Start with the plants you want');
  for (const w of ['Your plants', 'Balance things to weigh', 'Warnings', 'Further down this page']) await saysNot(none, w, 'take-aways hidden at 0 plants');
  await done(none);
});

failing('PFB8 (pf-b MainMore Warnings, carried from P5-18 and P5-19): "Warnings N", "N leave their climate range by 2041–2070" with "See 2041–2070", then each warned plant with its warning in words ("Mildly toxic Crimson clover"); never "fine" for a plant with no future figures', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  const w = await section(page, 'Warnings');
  assert.match(w, /^Warnings \d+/, 'board: "Warnings 2"');
  if (/leave their climate range/.test(w)) {
    assert.match(w, /\d+ leaves? (?:their|its) climate range by 2041–2070/, 'board: "4 leave their climate range by 2041–2070"');
    assert.ok((await names(page, 'button')).includes('See 2041–2070'), 'board: "See 2041–2070"');
  }
  assert.doesNotMatch(w, /\bfine\b/i, 'board: never "fine"');
  await done(page);
});

failing('PFB9 (pf-b the climate check notice, carried from PP-B20, PP-B49 and PP-B50 under c2\'s rule): refused, the page says "The climate check is not available right now. Plants are listed without a fit to your place…" with "Try again" in place, no fit claimed; a Try again that fails online offers "Reload"; the focus never falls to <body>; offline it waits (no Reload while offline) and asks again once back online', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette({ block: { verdict: 404 } });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the climate check refused');
  await says(page, 'The climate check is not available right now. Plants are listed without a fit to your place');
  await saysNot(page, /\bFits\b/, 'no fit claimed');
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await page.focus(aria('button', 'Try again')).catch(() => {});
  await press(page, 'button', 'Try again');
  assert.ok(await has(page, aria('button', 'Reload'), 8000), 'board: a Try again that fails online offers "Reload"');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'board: the focus stays in the tool');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), members, 'the plants stay');
  await done(page);
  const off = await palette({ block: { verdict: 'offline' } });
  assert.ok(await off.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the climate check failed offline');
  await says(off, 'The climate check is not available right now.');
  await off.setOfflineMode(true);
  await frames(off);
  assert.equal(await off.$(aria('button', 'Reload')), null, 'board: no Reload while offline');
  await off.setOfflineMode(false);
  assert.ok(await has(off, aria('button', 'Try again'), 6000), 'board: back online it asks again, then offers Try again');
  await done(off);
});

failing('PFB10 (pf-b Loading notices, carried from PP-B46): offline the page says "You are offline. Still works: your palette, the pictures, plant details you opened, print, download. Waits for the connection: place search and the map, photos, sending a correction." with no Reload', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await page.setOfflineMode(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await says(page, 'You are offline. Still works: your palette, the pictures, plant details you opened, print, download. Waits for the connection: place search and the map, photos, sending a correction.');
  assert.equal(await page.$(aria('button', 'Reload')), null, 'board: no Reload offline');
  await page.setOfflineMode(false);
  await done(page);
});

failing('PFB11 (pf-b German and 320 px, carried from PP-B22): in German the Next step says "Nächster Schritt", "Lücke 1 von N", "Hinzufügen", "Alle N Pflanzen ansehen", "Später", the head "Pflanzenpalette" and "Ändern"; long words never pass the right edge at 390 and 320 px, nor in ru and ja at 320', { owner: 'pf-b', reason: BOARD }, async () => {
  const de = await palette({ lang: 'de', width: 390 });
  assert.ok(await verdictsSettled(de), 'the verdicts');
  for (const w of ['Pflanzenpalette', 'Nächster Schritt', 'Hinzufügen', 'Später', 'Ändern']) await says(de, w);
  await says(de, /Lücke 1 von \d+/);
  await says(de, /Alle \d+ Pflanzen ansehen/);
  assert.deepEqual(await pastEdge(de), [], 'board: German at 390 px');
  await done(de);
  for (const lang of ['de', 'ru', 'ja', 'en']) {
    const page = await palette({ lang, width: 320 });
    assert.ok(await verdictsSettled(page), 'the verdicts');
    await section(page, lang === 'en' ? 'Through the years' : lang === 'de' ? 'Durch die Jahre' : '', 6000).catch(() => {});
    assert.deepEqual(await pastEdge(page), [], `board: ${lang} at 320 px`);
    await done(page);
  }
});

failing('PFB12 (pf-b DarkMain and DarkPalette): in the dark theme the same words and order as Main and Palette ("Through the years", the key, "Next step"), the light words, and every text at 4.5:1 against what is behind it, at 1280 and 390 px', { owner: 'pf-b', reason: BOARD }, async () => {
  for (const width of [1280, 390]) {
    const page = await palette({ width, theme: 'dark', ...(width === 390 ? { site: 'kiambu', climate: 'Temperate', n: 8 } : {}) });
    assert.ok(await verdictsSettled(page), 'the verdicts');
    await section(page, 'Through the years');
    await inOrder(page, ['Through the years', 'Colour and icon show each plant’s main job:']);
    await section(page, 'Next step');
    await says(page, /hole 1 of \d+/);
    if (width === 1280) await says(page, /Further down this page: Through the year · The cooler months · Jobs · Warnings \(\d+\)/);
    else await says(page, 'Step through time; an empty level is a hole.');
    await saysNot(page, OLD_LIGHT);
    assert.deepEqual(await lowContrast(page), [], `board: dark text at 4.5:1 (${width} px)`);
    await done(page);
  }
});

failing('PFB13 (pf-b Toasts, where they sit, owner Q4): at 1280 px the toast sits bottom-left, 420 px wide, and says "<plant> added." with Undo; at 390 px it spans the bottom; a mark between two plants says "With <plant>: they share a pest or disease"', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  const add = (await names(page, 'button')).find((n) => /^Add\b/.test(n) && n !== 'Add plants' && n !== 'Add your country');
  assert.ok(add, 'board: a candidate\'s Add in the Next step');
  await press(page, 'button', add);
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.toast.value, { timeout: 4000 }).then(() => true, () => false), 'a toast');
  assert.match(await toastText(page), /^.+ added\./, 'board: "Pinto peanut added."');
  const box = await page.evaluate(() => { const r = [...document.querySelectorAll('[role="status"]')].find((e) => e.textContent.includes(window.__ctTest.store.toast.value.text))?.getBoundingClientRect(); return r ? { x: r.left, w: r.width, bottom: innerHeight - r.bottom } : null; });
  assert.ok(box && Math.abs(box.w - 420) <= 8 && box.x < 200 && box.bottom < 80, `board: the toast bottom-left, 420 px wide (${JSON.stringify(box)})`);
  await done(page);
  const phone = await palette({ width: 390 });
  assert.ok(await verdictsSettled(phone), 'the verdicts');
  const add2 = (await names(phone, 'button')).find((n) => /^Add\b/.test(n) && n !== 'Add plants' && n !== 'Add your country');
  assert.ok(add2, 'board: a candidate\'s Add in the Next step');
  await press(phone, 'button', add2);
  const wide = await phone.evaluate(() => { const r = [...document.querySelectorAll('[role="status"]')].find((e) => e.textContent.includes(window.__ctTest.store.toast.value?.text ?? '\u0000'))?.getBoundingClientRect(); return r ? r.width : 0; });
  assert.ok(wide >= 390 - 40, `board: at 390 px the toast spans the bottom (${wide})`);
  await done(phone);
});

failing('PFB14 (pf-b MainMore foot): under the take-aways "Your palette is saved on this device." with "Copy link" and "Print"', { owner: 'pf-b', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, 'Your palette is saved on this device.');
  for (const b of ['Copy link', 'Print']) assert.ok([...(await names(page, 'button')), ...(await names(page, 'link'))].includes(b), `board: "${b}"`);
  const foot = await boxOf(page, 'Your palette is saved on this device.'), chart = await sectionBox(page, 'Through the years');
  assert.ok(foot && chart && foot.y > chart.y, 'board: the foot below the pictures');
  await done(page);
});
