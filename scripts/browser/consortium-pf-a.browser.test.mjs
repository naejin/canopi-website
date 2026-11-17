// pf stream a, "What's missing next" (pf commit 0, 2026-11-17): the boards Main and Palette (Next step,
// Other holes), Empty, Balcony, Toasts (the result lines), FillHole (the result line in Find), Find
// ("fills N holes", "Your palette lacks N holes") and DeskStates (Find as a panel beside the chart at
// 1280 px), as tests. Owner rules: hole titles take one form everywhere ("Full sun: nobody in the first
// 3 years", pf-decisions Q1); light words, never high/medium/low; inform, don't block. Each case is
// marked expected-fail under pf-a (scripts/expect-fail.mjs failing()), its reason the board's first
// missing word or element (pf-helpers.mjs BOARD); pf-a removes a marker in the commit that makes it pass.
// The board's figures (Seville's 13 plants, Kiambu's 324 of 515) are illustrative: the cases read the
// same sentences over the real export, the numbers as patterns.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries PP-C19 (pp-pf; Next step says "Checking your plants…" until the verdicts settle) -> PFA3
//   carries PF1 (pp-pf; Next step on the first screen at 390, candidates with size, span, "Add") -> PFA1
//   carries PF4 (pp-pf; empty palette: "N of M plants fit", no future panel or take-aways) -> PFA4
//   carries PP-B27 (pp-b2; F1a-P1 restored: the Next step's See all opens Find preset to the hole) -> PFA1
//   carries PP-B28 (pp-b2; F1a-P8 restored: keyboard See all opens Find, Escape gives the focus back) -> PFA7
//   carries PP-B6 (pp-b2; the Next step names its hole in words and years; filling it moves it on) -> PFA2
//   carries PP-B33 (pp-b2; keyboard Add from the Next step: focus stays in the tool, the toast names it) -> PFA7
//   carries PP-B38 (pp-b2; at 1280 px the Next step stands beside the pictures; its print part dropped) -> PFA1
//   carries PP-B39 (pp-b2; a filler with a warning under "Needs a second look", its warning in words, one tap) -> PFA11
//   carries PP-B25 (pp-b2; an outside-range plant added from a hole in one tap keeps its words, Undo removes) -> PFA11
//   carries PP-B21, PP-B44, PP-B45 (pp-b2; a guest list that fails: named, holes wait, never "empty", tool stays) -> PFA10
//   carries PP-B11, PP-B73 (pp-b1; Start over: a toast with Undo, the focus on Undo, Undo brings it back) -> PFA6
//   carries PP-B1 count line rows (pp-b1; checking, "Could not check" never "0 of m", later period, left out) -> PFA4, PFA5
//   dropped PP-B36 (pp-b2; "Your palette is empty" with Paste and Suggest buttons): the Empty board's three rows replace it
// Kept where they are (lasting seams, through hooks pf-a keeps or renames in the same commit): PP-B26
// (ct:first-view at the Next step), PP-B29 (200-plant scale), PP-B17 (the toast's focus) in pp-b2.
// The restored markers F1a-P1 restored and F1a-P8 restored (scripts/plan/parked-markers.json) now live
// in PFA1 and PFA7. Unit rows u17-u21 stay in scripts/consortium-pp-pf.test.mjs (u18 and u21 reworded
// to the owner's one form and the Balcony board's room note).
import assert from 'node:assert/strict';
import { aria, has, realDb, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, HOLE_TITLE, LIGHT, OLD_LIGHT, JOBS, boxOf, control, dialogText, done, emptyPalette, focused, frames, idsInStratum, idsOf, inOrder, linkOf, names, palette, pastEdge, press, says, saysNot, section, sectionBox, sectionText, toastText, verdictsSettled } from './pf-helpers.mjs';

useHarness();

const OTHER_HOLES = /Other holes (\d+)/;
// The Next step's card, its text in one line (the section its "Next step" heading opens).
const nextStep = (page) => section(page, 'Next step');
// The hole the Next step names: its title, the heading after "Next step" that reads like a hole.
const holeTitles = async (page) => (await names(page, 'heading')).filter((n) => HOLE_TITLE.test(n));
// "Add" buttons of candidates (never "Add plants", the head's entry).
const addButtons = async (page) => (await names(page, 'button')).filter((n) => /^Add\b/.test(n) && !/^Add plants$/.test(n) && !/^Add your country$/.test(n));

failing('PFA1 (pf-a Main at 1280 and 960, Palette at 390): the Next step card ("Next step", "hole 1 of N", a hole title in one form, a why sentence, candidates with "Also …", span and size, each with Add; "See all N plants" opening Find preset to the hole with N plants; "Not now"), then the Other holes card ("Other holes N", one row per hole in one form with Find); beside the pictures at 1280 and 960, on the first screen at 390', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  const card = await nextStep(page);
  assert.match(card, /hole 1 of \d+/, `board: "hole 1 of N" in the Next step ("${card.slice(0, 80)}")`);
  const titles = await holeTitles(page);
  assert.ok(titles.length > 0, 'board: a hole title in one form ("Full sun: nobody in the first 3 years")');
  assert.match(card, /Also [a-z]/, 'board: each candidate says what else it does ("Also feeds you, makes mulch")');
  assert.match(card, /\b(?:month|year) \d+ to year \d+|first \d+ years|first year/, 'board: each candidate\'s span ("month 3 to year 3")');
  assert.match(card, /\d+(?:\.\d+)? (?:c?m) (?:wide|tall)/, 'board: each candidate\'s size ("1 m wide, 2.5 m tall")');
  assert.ok((await addButtons(page)).length > 0, 'board: an Add on each candidate');
  await control(page, 'button', 'Not now');
  const all = (await names(page, 'button')).find((n) => /^See all \d+ plants$/.test(n));
  assert.ok(all, 'board: "See all N plants"');
  const n = Number(all.match(/\d+/)[0]);
  // Other holes: its own card, one row per hole, each in one form with its Find.
  const other = await section(page, 'Other holes');
  const count = Number(other.match(OTHER_HOLES)?.[1] ?? NaN);
  const rows = (other.replace(OTHER_HOLES, '').match(new RegExp(`(?:${[...LIGHT, ...JOBS, 'Cooler months'].join('|')}): nobody[^]*?Find`, 'g')) ?? []);
  assert.equal(rows.length, count, `board: Other holes lists its ${count} holes, each "…: nobody … Find" ("${other.slice(0, 120)}")`);
  // Beside the pictures at 1280 (and 960): the Next step's card right of "Through the years".
  for (const width of [1280, 960]) {
    await page.setViewport({ width, height: 900 });
    await frames(page);
    const chart = await sectionBox(page, 'Through the years'), next = await sectionBox(page, 'Next step');
    assert.ok(chart && next && next.x >= chart.right - 1 && next.y < chart.bottom, `board: at ${width} px the Next step stands beside the pictures (${JSON.stringify({ chart, next })})`);
  }
  // See all: Find opens preset to the hole, listing the same N plants (one count, intake c1 r4).
  await press(page, 'button', all);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'find', { timeout: 10_000 }).then(() => true, () => false), 'board: See all opens Find');
  assert.ok(await page.evaluate(() => !!window.__ctTest.store.sheetTarget.value.hole), 'board: Find opens preset to the hole');
  assert.match(await dialogText(page), new RegExp(`\\b${n} plants\\b`), `board: Find lists the ${n} plants "See all" counts`);
  await done(page);
  // Palette at 390: the Next step on the first screen.
  const phone = await palette({ site: 'kiambu', climate: 'Temperate', n: 8, width: 390 });
  assert.ok(await verdictsSettled(phone), 'the verdicts');
  await says(phone, OTHER_HOLES);
  const at = await boxOf(phone, 'Next step');
  assert.ok(at && at.y < 844, `board: at 390 px the Next step is on the first screen (${at?.y})`);
  await done(phone);
});

failing('PFA2 (pf-a holes, one form everywhere): the Next step, Other holes, Find\'s hole title and its rows all say "<light or job>: nobody …" with the light words (Full sun, Mostly sun, Part shade, Shade), never "Needs full sun" or high/medium/low; adding a candidate moves the Next step to another hole', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await saysNot(page, OLD_LIGHT, 'owner "Layer is light"');
  await says(page, OTHER_HOLES);
  const text = await sectionText(page, 'Next step') + ' ' + (await sectionText(page, 'Other holes'));
  for (const [, head] of text.matchAll(/([A-Z][a-z]+(?: [a-z]+){0,3}): nobody/g)) assert.ok([...LIGHT, ...JOBS, 'Cooler months'].includes(head), `board: a hole title starts with a light level or a job, not "${head}"`);
  assert.doesNotMatch(text, /Nobody in (?:full sun|some shade|deep shade)|Nobody covers/, 'board: one form, never "Nobody in …"');
  // Find from an Other holes row: titled by that hole, in the same form.
  const before = (await holeTitles(page))[0];
  await press(page, 'button', 'Find');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'board: Find opens from the hole');
  const head = (await dialogText(page)).split(' ').slice(0, 12).join(' ');
  assert.match(head, new RegExp(HOLE_TITLE.source), `board: Find is titled by the hole in one form ("${head}")`);
  await page.keyboard.press('Escape');
  // Add the Next step's first candidate: the Next step names another hole (PP-B6).
  const add = (await addButtons(page))[0];
  await press(page, 'button', add);
  assert.ok(await page.waitForFunction((b, re) => !([...document.querySelectorAll('main h2, main h3')].map((h) => h.textContent.trim()).filter((t) => new RegExp(re).test(t))[0] === b), { timeout: 8000 }, before, HOLE_TITLE.source).then(() => true, () => false), 'board: the Next step moves on to another hole');
  await done(page);
});

failing('PFA3 (pf-a Next step waits for the verdicts): while the fit check loads the Next step says "Checking your plants…" and names no hole, so none is named and then flipped; then the hole', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await tool({ block: { verdict: 'hold' }, hash: await linkOf('Mediterranean', 13) });
  await atSite(page, 'seville');
  await says(page, 'Checking your plants…');
  assert.deepEqual(await holeTitles(page), [], 'board: no hole named while the verdicts load');
  await page.releaseHeld();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  await done(page);
});

failing('PFA4 (pf-a Empty at 390 and 1280): "Start with the plants you want" and its line, three rows (Find plants, Paste a list, Start from a small palette) each with its sub-line, then "The pictures (through the years, through the year, jobs) appear with your first plant." and "N of the M plants on … fit near <place> today."; no picture; the rows open Find and Paste, and the small palette is added with a "suggested" toast and one Undo', { owner: 'pf-a', reason: BOARD }, async () => {
  for (const width of [390, 1280]) {
    const page = await emptyPalette({ width });
    await says(page, 'Start with the plants you want');
    await inOrder(page, [
      'Start with the plants you want',
      'The crops you grow or wish to grow. The palette then shows what is missing around them.',
      'Find plants', 'By name, or by the job you need done',
      'Paste a list', 'From a message, a book or a spreadsheet',
      'Start from a small palette',
      'The pictures (through the years, through the year, jobs) appear with your first plant.',
    ]);
    await says(page, /\d+ plants that fit your place; each is marked “suggested” and can be undone/);
    await says(page, /\d+ of the \d+ plants on .+ fit near .+ today\./);
    await saysNot(page, 'Through the years', 'no picture at 0 plants');
    await saysNot(page, 'Your palette is empty');
    // The rows: Find plants opens Find, Paste a list opens Paste.
    await press(page, 'button', 'Find plants');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'find', { timeout: 10_000 }).then(() => true, () => false), 'board: "Find plants" opens Find');
    await page.evaluate(() => window.__ctTest.store.closeSheet());
    await press(page, 'button', 'Paste a list');
    assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.sheet.value, { timeout: 10_000 }).then(() => true, () => false), 'board: "Paste a list" opens Paste');
    await page.evaluate(() => window.__ctTest.store.closeSheet());
    // Start from a small palette: added, each "suggested", one Undo (board Arrivals' last line).
    await press(page, 'button', 'Start from a small palette');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'board: the small palette is added');
    assert.match(await toastText(page), /^A starting palette of \d+ plants was added, each marked “suggested”\./, 'board: the toast says each is marked "suggested"');
    await press(page, 'button', 'Undo');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 0, { timeout: 4000 }).then(() => true, () => false), 'board: one Undo takes them all away');
    await done(page);
  }
});

failing('PFA5 (pf-a Empty count line states, carried from PP-B1): while the fit check loads it says it is checking, never "0 of M"; with the check refused it says how many plants the list holds, never a fit; without a place it claims no fit; for a later period it names the period, never "today"', { owner: 'pf-a', reason: BOARD }, async () => {
  const held = await emptyPalette({ block: { verdict: 'hold' } });
  await says(held, 'Start with the plants you want');
  await says(held, 'Checking which plants fit your place…');
  await saysNot(held, / 0 of the \d+ plants/);
  await held.releaseHeld();
  await says(held, /\d+ of the \d+ plants on .+ fit near .+ today\./);
  await done(held);
  const refused = await emptyPalette({ block: { verdict: 404 } });
  await says(refused, 'Start with the plants you want');
  assert.ok(await refused.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the fit check refused');
  await says(refused, /\d+ plants on the .+ list/);
  await saysNot(refused, / fit near /, 'refused: no fit claimed');
  await done(refused);
  const nowhere = await emptyPalette({ site: null });
  await says(nowhere, 'Start with the plants you want');
  await saysNot(nowhere, / fit near /, 'no place: no fit claimed');
  await done(nowhere);
  const later = await emptyPalette();
  await later.evaluate(() => { window.__ctTest.store.period.value = '2041-2070'; });
  await says(later, /\d+ of the \d+ plants on .+ fit near .+ in 2041–2070\./);
  await saysNot(later, / fit near .+ today\./, 'a later period is never "today"');
  await done(later);
});

failing('PFA6 (pf-a Toasts, the result lines): a removal says "<plant> removed. Its holes are open again." with Undo; Start over says "Palette cleared: N plants. Your place is kept." with the focus on its Undo, and Undo brings every plant back', { owner: 'pf-a', reason: BOARD }, async () => {
  const [tree] = await idsInStratum('Mediterranean', 'emergent', 1);
  const low = await idsInStratum('Mediterranean', 'low', 2);
  const page = await palette({ ids: [tree, ...low] });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  await page.evaluate((id) => window.__ctTest.store.removeMember(id), tree);
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.toast.value, { timeout: 4000 }).then(() => true, () => false), 'a toast');
  assert.match(await toastText(page), /^.+ removed\. Its holes are open again\./, 'board: "Calliandra removed. Its holes are open again."');
  await press(page, 'button', 'Undo');
  assert.ok(await page.waitForFunction((k) => window.__ctTest.store.members.value.length === k, { timeout: 4000 }, 3).then(() => true, () => false), 'Undo puts it back');
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await press(page, 'button', 'Start over');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 0, { timeout: 4000 }).then(() => true, () => false), 'board: Start over, no question first');
  assert.match(await toastText(page), /^Palette cleared: 3 plants\. Your place is kept\./, 'board: "Palette cleared: 8 plants. Your place is kept."');
  await frames(page);
  const at = await focused(page);
  assert.ok(!at.body && /^Undo/.test(at.name), `board: the focus on the toast's Undo (${JSON.stringify(at)})`);
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 3, { timeout: 4000 }).then(() => true, () => false), 'board: Undo brings every plant back');
  await done(page);
});

failing('PFA7 (pf-a keyboard, carried from PP-B28 and PP-B33): with the keyboard only, "See all N plants" opens Find and Escape gives the focus back to it; a candidate\'s Add keeps the focus in the tool (the Next step\'s title once the candidate leaves) and its toast says "<plant> added."', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  const all = (await names(page, 'button')).find((n) => /^See all \d+ plants$/.test(n));
  assert.ok(all, 'board: "See all N plants"');
  await page.focus(aria('button', all));
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'find', { timeout: 10_000 }).then(() => true, () => false), 'board: Find opens');
  await page.keyboard.press('Escape');
  assert.ok(await page.waitForFunction((n) => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim() === n, { timeout: 4000 }, all).then(() => true, () => false), 'board: Escape gives the focus back to "See all"');
  const add = (await addButtons(page))[0];
  await page.focus(aria('button', add));
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.toast.value, { timeout: 4000 }).then(() => true, () => false), 'a toast');
  assert.match(await toastText(page), /^.+ added\./, 'board: "Pinto peanut added."');
  await frames(page);
  const at = await focused(page);
  assert.ok(!at.body && at.inTool, `board: the focus stays in the tool (${JSON.stringify(at)})`);
  await done(page);
});

failing('PFA8 (pf-a FillHole, the result line): Find opened from a hole adds a plant with "Added" on its row and the line "<plant> added. <what it filled>." with Undo; a row that fills more than one hole says "fills N holes"', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  await press(page, 'button', 'Find');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'Find opens from the hole');
  await says(page, /Best fit first: the holes a plant fills, then how long it stays in its climate range\./, { inDialog: true });
  const add = (await names(page, 'button')).find((n) => /^Add\b/.test(n));
  assert.ok(add, 'board: a row\'s Add');
  await press(page, 'button', add);
  await says(page, /\S+ added\. [A-Z][^.]+\./, { inDialog: true });
  assert.ok((await names(page, 'button')).includes('Undo'), 'board: the result line\'s Undo');
  const text = await dialogText(page);
  if (/fills \d+ holes/.test(text)) assert.match(text, /: fills [2-9]\d* holes/, 'board: "Covers the ground and grows in deep shade: fills 2 holes"');
  await done(page);
});

failing('PFA9 (pf-a Find "lacks N holes"): Find opened from "Add plants" says "Your palette lacks N holes" with a row per hole in one form and its count of plants; on an empty palette that line is hidden', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, 'dialog[open], [role="region"][aria-label*="Find"]', 10_000), 'Find opens');
  await says(page, /Your palette lacks \d+ holes/);
  const t = await pageText(page);
  const n = Number(t.match(/Your palette lacks (\d+) holes/)[1]);
  const rows = t.match(new RegExp(`(?:${[...LIGHT, ...JOBS].join('|')}): nobody[^0-9]*\\d+ plants`, 'g')) ?? [];
  assert.equal(rows.length, n, `board: a row per hole with its count of plants ("Covers the ground: nobody 8 plants"; ${rows.length} of ${n})`);
  await done(page);
  const empty = await emptyPalette();
  await press(empty, 'button', 'Find plants');
  await saysNot(empty, /Your palette lacks/, 'an empty palette lacks nothing yet');
  await done(empty);
});

failing('PFA10 (pf-a a guest list that fails, carried from PP-B21, PP-B44 and PP-B45): the list is named as missing with Try again, its plants are not checked, the Next step says the holes wait for it and names none, the tool stays; a palette of only those plants is never "Start with the plants you want"; once the grower removes them the line goes and a hole is named', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await tool();
  await choose(page, 'Temperate');
  const own = await idsOf('Temperate', 2);
  const guest = (await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' AND p.plant NOT IN (SELECT plant FROM placements WHERE climate_zone = 'Temperate') ORDER BY 1 LIMIT 1").get()?.id));
  await page.evaluate((g, ids) => {
    const { store } = window.__ctTest, src = store.source.value, read = src.pool.bind(src);
    src.pool = (c) => (c === 'Mediterranean' ? Promise.reject(new Error('test: list unreadable')) : read(c));
    store.addMembers([...ids, g], { [g]: 'Mediterranean' });
    store.loadPool('Mediterranean');
    store.view.value = 'matrix';
  }, String(guest), own);
  await says(page, /Mediterranean list/);
  assert.ok((await names(page, 'button')).includes('Try again'), 'board: the missing list\'s line offers Try again');
  assert.equal(await page.evaluate(() => window.__ctTest.store.load.value.status), 'ready', 'the tool stays');
  assert.deepEqual(await holeTitles(page), [], 'board: no hole named while a list is missing');
  await saysNot(page, 'Start with the plants you want', 'a palette with plants is never empty');
  // Removing the guest: the line goes, a hole is named.
  await page.evaluate((g) => window.__ctTest.store.removeMember(g), String(guest));
  assert.ok(await page.waitForFunction((re) => [...document.querySelectorAll('main h2, main h3')].some((h) => new RegExp(re).test(h.textContent.trim())), { timeout: 8000 }, HOLE_TITLE.source).then(() => true, () => false), 'board: then a hole is named');
  await done(page);
});

failing('PFA11 (pf-a inform, don\'t block, carried from PP-B39 and PP-B25): a candidate with a warning sits under "Needs a second look" with the warning in words and adds in one tap; "Show N outside their climate range" folds the outside ones, each saying so in words, one tap adds it and Undo takes it out', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette({ site: 'kiambu', climate: 'Temperate', n: 8 });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  const card = await nextStep(page);
  if (/Needs a second look/.test(card)) assert.match(card, /Needs a second look[^]*?(?:toxic|invasive|outside|spreads)/i, 'board: the warning that put it there, in words');
  const outside = (await names(page, 'button')).find((n) => /^Show \d+ outside (?:its|their) climate range$/.test(n));
  if (outside) {
    await press(page, 'button', outside);
    await says(page, 'Outside its climate range');
    const before = await page.evaluate(() => window.__ctTest.store.members.value.length);
    const add = (await addButtons(page)).at(-1);
    await press(page, 'button', add);
    assert.ok(await page.waitForFunction((k) => window.__ctTest.store.members.value.length === k + 1, { timeout: 4000 }, before).then(() => true, () => false), 'board: one tap adds it, no confirm step');
    await press(page, 'button', 'Undo');
    assert.ok(await page.waitForFunction((k) => window.__ctTest.store.members.value.length === k, { timeout: 4000 }, before).then(() => true, () => false), 'Undo takes it out');
  }
  await done(page);
});

failing('PFA12 (pf-a Balcony): with "Balcony or pots" the room card says every plant stays in every list, the suggested palette prefers small plants, there is no pot data and the soil map is not used; a candidate taller than 6 m says "Grows to N m: keep it pruned, or pick a smaller plant", and never hides', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette({ site: 'seville', n: 6, room: 'pots' });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, 'Balcony or pots. Every plant stays in every list: room never hides one. A suggested palette prefers plants that stay small, and a plant that grows above 6 m carries a note to prune. We have no data yet on which plants do well in pots. The soil map is not used for pots: you choose the mix.');
  await saysNot(page, 'taller than your room');
  const card = await nextStep(page);
  for (const [, m] of card.matchAll(/(\d+(?:\.\d+)?) m tall/g)) if (Number(m) > 6) assert.match(card, new RegExp(`Grows to ${m} m: keep it pruned, or pick a smaller plant`), `board: the ${m} m candidate's room note`);
  await done(page);
});

failing('PFA13 (pf-a DeskStates, Find beside the chart): at 1280 px "Add plants" opens Find as a panel beside the picture (not a modal: the page stays usable, the chart in view), the same content and words as the phone\'s sheet; at 390 px it opens as a sheet; nothing passes the right edge at 320 px', { owner: 'pf-a', reason: BOARD }, async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await press(page, 'button', 'Add plants');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.sheet.value?.kind === 'find', { timeout: 10_000 }).then(() => true, () => false), 'Find opens');
  await frames(page);
  const modal = await page.evaluate(() => !!document.querySelector(':modal'));
  assert.equal(modal, false, 'board: at 1280 px Find opens as a panel beside the picture, not a modal sheet');
  const chart = await sectionBox(page, 'Through the years');
  assert.ok(chart && chart.w > 0, 'board: the chart stays in view beside the panel');
  await done(page);
  const phone = await palette({ width: 390 });
  await press(phone, 'button', 'Add plants');
  assert.ok(await phone.waitForFunction(() => !!document.querySelector(':modal'), { timeout: 10_000 }).then(() => true, () => false), 'board: at 390 px Find is a sheet');
  await done(phone);
  const small = await palette({ width: 320 });
  await says(small, OTHER_HOLES);
  assert.deepEqual(await pastEdge(small), [], 'board: nothing passes the right edge at 320 px');
  await done(small);
});
