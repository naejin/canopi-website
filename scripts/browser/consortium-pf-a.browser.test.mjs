// pf stream a, "What's missing next", as tests of the approved v14 boards (.local/consortium/v2/f1a/
// mockups-v14/project/*.dc.html, 2026-11-18; spec v14-spec-update.md section 2 "pf-a", F17-F21, section
// 6): Main, Palette, DarkMain and Recife (Next step, Other holes), Many and ManyDesk (the Next step card),
// Empty, Balcony (room card and note), Find, FindType, FindResults, FindFilters, FindNone, FindDesk,
// FillHole, HoleOpen, AddMany states 1-3, DeskStates (the Find panel, the toast bottom left) and Toasts
// (add, bulk add, the one counting toast). Owner rules: hole titles take one form everywhere; light
// words, never high/medium/low; inform, don't block (no confirm step, every add one tap with Undo).
// Board figures come from the engine (owner 2026-11-18): every count, name and order a case checks is
// computed through core holes.ts (pf-helpers engineLead) on the installed release at the board's
// inputs (scenario cases kiambu-8-*, kiambu-200), never a board number; the words and the layout come
// from the boards. Cases still failing carry an expected-fail marker (scripts/expect-fail.mjs failing(),
// owner pf-a, reason /board: /); pf-a removes a marker in the commit that makes the case pass.
// Not here: SiteMendoza's rows (its dryness note is the row's fit line, kit/fit.tsx, 0W R2; no Mendoza
// place in the browser fixtures), the parked parts (Balcony's light question, "Before you plant",
// Through the year and the cooler months: PP-F, PP-G), Start over (pf-c) and the removal and swap words
// (their keys are pf-f's in chunk 3).
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
//   carries PP-B1 count line rows (pp-b1; checking, "Could not check" never "0 of m", later period, left out) -> PFA4, PFA5
//   carries PP-C3 (c1; Select several, one toast and one Undo) -> PFA17 (the v14 one-tap burst replaces it)
//   dropped PP-B36 (pp-b2; "Your palette is empty" with Paste and Suggest buttons): the Empty board's three rows replace it
//   dropped PP-B11, PP-B73 (pp-b1; Start over's toast) from this file: Start over is pf-c's (Toasts, chunk 2)
// Kept where they are (lasting seams, through hooks pf-a keeps or renames in the same commit): PP-B26
// (ct:first-view at the Next step), PP-B29 (200-plant scale), PP-B17 (the toast's focus) in pp-b2.
// The restored markers F1a-P1 restored and F1a-P8 restored (scripts/plan/parked-markers.json) now live
// in PFA1 and PFA7.
import assert from 'node:assert/strict';
import { aria, has, realDb, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import test from 'node:test';
import { failing } from '../expect-fail.mjs';
import { BOARD, HOLE_TITLE, LIGHT, OLD_LIGHT, JOBS, PALETTE_200, boxOf, engineLead, loadCase, loadPalette200, nextText, pageText, setPlantsPerJob, control, dialogText, done, emptyPalette, focused, frames, idsInStratum, idsOf, inOrder, linkOf, names, palette, pastEdge, press, says, saysNot, section, sectionBox, sectionText, toastText, verdictsSettled } from './pf-helpers.mjs';

useHarness();

const OTHER_HOLES = /Other holes (\d+)/;
// The Next step's card, its text in one line (the section its "Next step" heading opens).
const nextStep = (page) => section(page, 'Next step');
// The hole the Next step names: its title, the heading after "Next step" that reads like a hole.
const holeTitles = async (page) => (await names(page, 'heading')).filter((n) => HOLE_TITLE.test(n));
// "Add" buttons of candidates (never "Add plants", the head's entry).
const addButtons = async (page) => (await names(page, 'button')).filter((n) => /^Add\b/.test(n) && !/^Add plants$/.test(n) && !/^Add your country$/.test(n) && !/^Add (?:the|all) /.test(n));
// The position line the engine gives ("hole 1 of 6 · then 2 thin spots", "thin spot 1 of 5", "hole 1 of 2 · no thin spot").
const position = (e) => e.lead.kind === 'thin' ? `thin spot ${e.lead.index} of ${e.lead.of}`
  : `hole ${e.lead.index} of ${e.lead.of} · ${e.thins.length && !e.untouched ? `then ${e.thins.length} thin spot${e.thins.length === 1 ? '' : 's'}` : e.thins.length ? `${e.thins.length} thin spot${e.thins.length === 1 ? '' : 's'}` : 'no thin spot'}`;
const plural = (n, one, other = `${one}s`) => `${n} ${n === 1 ? one : other}`;
// The bulk row's words for the lead (AddMany): "Add the 2 that fit best" / "Add all 7 that fill this hole";
// on a thin job "Add the 1 that fits best" / "Add all 22 that do this job then".
// C13: the second button only when it adds more than the first.
const allWords = (e) => e.lead.kind === 'thin' ? (e.fits.length === 1 ? 'Add the 1 that does this job then' : `Add all ${e.fits.length} that do this job then`)
  : (e.fits.length === 1 ? 'Add the 1 that fills this hole' : `Add all ${e.fits.length} that fill this hole`);
const bulkWords = (e) => [
  `Add the ${e.best.length} that ${e.best.length === 1 ? 'fits' : 'fit'} best`,
  ...(e.fits.length > e.best.length ? [allWords(e)] : []),
];
// BC1, BC26: a candidate's first line says what it does for the target and when, in the target's terms
// ("Covers the ground and is planted in shade: fills 4 holes", "Planted in full sun from year 3 on").
const JOB_NAME = { feeds_you: 'Feeds you', feeds_soil: 'Feeds the soil', mulch: 'Makes mulch', ground: 'Covers the ground', helpers: 'Brings helpers', shelter: 'Shelters and protects' };
const reasonRe = (t) => t.kind === 'job' && t.job
  ? new RegExp(`${JOB_NAME[t.job]}(?: and is planted in (?:full sun|mostly sun|part shade|shade)| from (?:year|month) \\d+| in (?:the first|every))`)
  : /Planted in (?:full sun|mostly sun|part shade|shade) (?:from|in)/;
// The Add buttons of Find's rows, by their names ("Add Pinto peanut"), never the Next step's beside it.
const findAdds = (page) => page.$$eval('dialog[open] [data-find-add]:not([data-added])', (bs) => bs.map((b) => b.getAttribute('aria-label')));
// One row's Add in Find (by its name; the Next step's own "Add …" sits beside the desk panel).
// (a DOM click on that very button: the list may still re-rank under a pointer click's coordinates).
const addInFind = (page, label) => page.$eval(`dialog[open] [data-find-add][aria-label="${label}"]`, (b) => b.click());
const members = (page) => page.evaluate(() => window.__ctTest.store.members.value.length);
const until = (page, fn, arg, timeout = 6000) => page.waitForFunction(fn, { timeout }, arg).then(() => true, () => false);

test('PFA1 (pf-a Main at 1280 and 960, Palette at 390): the Next step card ("Next step", the engine\'s position "hole 1 of N · then M thin spots", the lead hole\'s title in one form, a why sentence, the fitting candidates first, each with "Also …", span, size and Add; the bulk row "Add the K that fit best" and "Add all N that fill this hole"; "See all N plants" opening Find preset to the hole with its N plants; "Not now"), then the Other holes card ("Other holes N", one row per hole in one form with Find); beside the pictures at 1280 and 960, on the first screen at 390', async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  assert.ok(e.lead, 'the engine names a lead target');
  const card = await nextText(page);
  assert.ok(card.includes(position(e)), `board: the position line "${position(e)}" ("${card.slice(0, 90)}")`);
  const titles = await holeTitles(page);
  assert.ok(titles.length > 0, 'board: a hole title in one form ("Full sun: nobody in the first 3 years")');
  // The candidates, best fit first: the engine's fits, then "Needs a second look (n)".
  const rows = e.fits.slice(0, 3);
  for (const sci of rows) assert.ok(card.includes(sci), `board: the candidate ${sci} (engine order: ${rows.join(', ')})`);
  if (rows.length > 1) assert.ok(card.indexOf(rows[0]) < card.indexOf(rows[1]), 'board: best fit first, as the engine orders them');
  if (e.look.length) assert.match(card, new RegExp(`Needs a second look \\(${e.look.length}\\)`), `board: "Needs a second look (${e.look.length})"`);
  if (e.lead.target.kind === 'job') assert.match(card, /Also [a-z]/, 'board: a candidate says what else it does ("Also feeds you, makes mulch")');
  assert.match(card, /\b(?:month|year) \d+ to year \d+|first \d+ (?:years|days)|first year|from year \d+ on/, 'board: a candidate\'s span ("month 3 to year 3")');
  assert.match(card, /\d+(?:\.\d+)? c?m (?:wide|tall)|no size recorded/, 'board: a candidate\'s size ("1 m wide, 2.5 m tall")');
  assert.ok((await addButtons(page)).length > 0, 'board: an Add on each candidate');
  // The bulk row (A1: whenever a plant fits), counting what the engine adds (bestToAdd).
  if (e.fits.length) for (const w of bulkWords(e)) await control(page, 'button', w);
  if (e.fits.length && e.fits.length <= e.best.length) assert.ok(!(await names(page, 'button')).some((n) => /^Add all /.test(n)), 'C13: no second bulk button that adds what the first does');
  if (e.fits.length) assert.match(card, reasonRe(e.lead.target), `BC1: a candidate's fit reason in the target's terms ("${card.slice(0, 400)}")`);
  // BC1 (board SiteMendoza): the reason, then what else it does and its size, then the fit word.
  if (e.fits.length) assert.match(card, new RegExp(`${e.fits[0]}\\s*${reasonRe(e.lead.target).source}[^]*?(?:Also|wide|tall|no size)[^]*?Fits your place`), `BC1: "${e.fits[0]}": reason, meta, then the fit word ("${card.slice(0, 500)}")`);
  // BC12 (word map row 103): marks are chips in few words ("Mildly toxic", "Toxic"), never the Details sentence.
  assert.doesNotMatch(card, /in the toxicity records\. Check before eating/, 'BC12: a toxicity mark reads as its chip ("Mildly toxic"), not the long warning');
  // BC11: a second look for its range edge says so as its chip; "Needs a second look" is the group's heading only.
  if (e.lookEdge.length) assert.ok(card.includes('Near the edge of its range'), `BC11: "${e.lookEdge[0]}" carries "Near the edge of its range"`);
  if (e.look.length) assert.equal((card.match(/Needs a second look/g) ?? []).length, 1, 'BC11: "Needs a second look" only as the group heading');
  // BC2, C2: the why sentence counts the plants that do it then, by fit.
  assert.match(card, new RegExp(`${e.all} plants? on your lists (?:does|do) this then: `), `BC2: "${e.all} plants on your lists do this then: …" (the engine's counts)`);
  if (e.fits.length) assert.match(card, new RegExp(`\\b${e.fits.length} fits? your place`), 'BC2: the count that fits');
  await control(page, 'button', 'Not now');
  await control(page, 'button', `See all ${e.seeAll} plants`);
  // Other holes: its own card, one row per open hole but the lead, each in one form with its Find.
  const other = await section(page, 'Other holes');
  const count = Number(other.match(OTHER_HOLES)?.[1] ?? NaN);
  assert.equal(count, e.open.length - 1, `board: "Other holes ${e.open.length - 1}" (the engine's open holes but the lead)`);
  const finds = (other.match(/: (?:nobody|nothing)[^]*?Find/g) ?? []).length;
  assert.equal(finds, count, `board: Other holes lists its ${count} holes, each "…: nobody … Find"`);
  for (const width of [1280, 960]) {
    await page.setViewport({ width, height: 900 });
    await frames(page);
    const chart = await sectionBox(page, 'Through the years'), next = await sectionBox(page, 'Next step');
    assert.ok(chart && next && next.x >= chart.right - 1 && next.y < chart.bottom, `board: at ${width} px the Next step stands beside the pictures (${JSON.stringify({ chart, next })})`);
  }
  await press(page, 'button', `See all ${e.seeAll} plants`);
  assert.ok(await until(page, () => window.__ctTest.store.sheet.value?.kind === 'find'), 'board: See all opens Find');
  assert.ok(await page.evaluate(() => !!window.__ctTest.store.sheetTarget.value.hole), 'board: Find opens preset to the hole');
  await done(page);
  const phone = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(phone, OTHER_HOLES);
  const p = await engineLead(phone);
  assert.ok((await nextText(phone)).includes(position(p)), `board: the Palette board's position line "${position(p)}"`);
  const at = await boxOf(phone, 'Next step');
  assert.ok(at && at.y < 844, `board: at 390 px the Next step is on the first screen (${at?.y})`);
  await done(phone);
});

test('PFA2 (pf-a holes, one form everywhere): the Next step, Other holes, Find\'s hole title and its rows all say "<light or job>: nobody …" with the light words (Full sun, Mostly sun, Part shade, Shade), never "Needs full sun" or high/medium/low; adding a candidate moves the Next step to another hole', async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await saysNot(page, OLD_LIGHT, 'owner "Layer is light"');
  await says(page, OTHER_HOLES);
  const text = await sectionText(page, 'Next step') + ' ' + (await sectionText(page, 'Other holes'));
  for (const [, head] of text.matchAll(/([A-Z][a-z]+(?: [a-z]+){0,3}): nobody/g)) assert.ok([...LIGHT, ...JOBS, 'Cooler months'].includes(head), `board: a hole title starts with a light level or a job, not "${head}"`);
  assert.doesNotMatch(text, /Nobody in (?:full sun|some shade|deep shade)|Nobody covers/, 'board: one form, never "Nobody in …"');
  // Find from an Other holes row: titled by that hole, in the same form.
  const before = (await holeTitles(page))[0];
  // BC21: the whole dashed row is the button, "Find" at its right.
  await control(page, 'button', /: .+ Find$/);
  await page.click('.ct-other-holes button.ct-hole-row');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'board: Find opens from the hole');
  const head = (await dialogText(page)).split(' ').slice(0, 12).join(' ');
  assert.match(head, new RegExp(HOLE_TITLE.source), `board: Find is titled by the hole in one form ("${head}")`);
  await page.keyboard.press('Escape');
  // Add the Next step's first candidate: the Next step names another hole (PP-B6).
  const add = (await addButtons(page))[0];
  await press(page, 'button', add);
  assert.ok(await page.waitForFunction((b, re) => !([...document.querySelectorAll('main h2, main h3, main h4')].map((h) => h.textContent.trim()).filter((t) => new RegExp(re).test(t))[0] === b), { timeout: 8000 }, before, HOLE_TITLE.source).then(() => true, () => false), 'board: the Next step moves on to another hole');
  await done(page);
});

test('PFA3 (pf-a Next step waits for the verdicts, F18): while the fit check loads the Next step says "Checking your plants…", names no hole and offers no bulk add, so none is named and then flipped; then the hole', async () => {
  const page = await tool({ block: { verdict: 'hold' }, hash: await linkOf('Mediterranean', 13) });
  await atSite(page, 'seville');
  await says(page, 'Checking your plants…');
  assert.deepEqual(await holeTitles(page), [], 'board: no hole named while the verdicts load');
  assert.ok(!(await names(page, 'button')).some((n) => /^Add (?:the|all) /.test(n)), 'board: no bulk add while the verdicts load');
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

test('PFA5 (pf-a Empty count line states, carried from PP-B1): while the fit check loads it says it is checking, never "0 of M"; with the check refused it says how many plants the list holds, never a fit; without a place it claims no fit; for a later period it names the period, never "today"', async () => {
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

test('PFA6 (pf-a AddMany state 1, Toasts "several plants added", F19): "Add the K that fit best" adds the engine\'s best K in one tap: the toast "K plants added: <names>." then what it did to the holes ("Covers the ground: nobody after year 25." / "No new hole.", "N holes left."), one Undo takes them all back; a second tap adds nothing and leaves one toast', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  assert.ok(e.fits.length > 0, 'the lead hole has plants that fit (installed release)');
  const before = await members(page);
  const [best] = bulkWords(e);
  await press(page, 'button', best);
  await page.locator(aria('button', best)).click().catch(() => {}); // the double tap (F19): gone or adding nothing
  assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, before + e.best.length), `board: the ${e.best.length} best are added`);
  await frames(page);
  assert.equal(await members(page), before + e.best.length, 'board: a second tap adds nothing');
  const text = await toastText(page);
  assert.match(text, new RegExp(`^${e.best.length} plants? added: [^.]+\\. (?:No new hole\\.|\\d+ new holes?: |[A-Z][^:]+: (?:nobody|still))`), `board: "2 plants added: Pinto peanut, Pineapple. Covers the ground: nobody after year 25. 7 holes left." ("${text}")`);
  assert.ok((text.match(/\. [A-Z][^.:]*: (?:nobody|still)/g) ?? []).length <= 1, `BC6: the toast names the target hole only, then the holes left ("${text}")`);
  assert.doesNotMatch(text, /with a warning/, 'BC6, R4: the plants that fit carry no second look, so no "added with a warning" tail (a Mildly toxic mark is said on the row)');
  assert.equal(await page.$$eval('.ct-toast', (t) => t.length), 1, 'board: one toast');
  await press(page, 'button', 'Undo');
  assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, before), 'board: one Undo takes them all back');
  await done(page);
});

test('PFA7 (pf-a keyboard, carried from PP-B28 and PP-B33): with the keyboard only, "See all N plants" opens Find and Escape gives the focus back to it; a candidate\'s Add keeps the focus in the tool (the Next step\'s title once the candidate leaves) and its toast says "<plant> added."', async () => {
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

test('PFA8 (pf-a FillHole, HoleOpen): Find opened from a hole says "Best fit first: plants that fit before those that need a second look, then the holes a plant fills, then whether it stays in its climate range to 2071–2099."; a row that holds says "in range to 2099"; Add turns the row to "Added" with its Undo, the sheet stays open, and the line names the hole that is left ("Pineapple added. Covers the ground: nobody after year 15.")', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  // BC21: the whole dashed row is the button, "Find" at its right.
  await control(page, 'button', /: .+ Find$/);
  await page.click('.ct-other-holes button.ct-hole-row');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'Find opens from the hole');
  await says(page, 'Best fit first: plants that fit before those that need a second look, then the holes a plant fills, then whether it stays in its climate range to 2071–2099.', { inDialog: true });
  await says(page, /in range to 2099/, { inDialog: true });
  const add = (await findAdds(page))[0];
  assert.ok(add, 'board: a row\'s Add');
  const name = add.replace(/^Add /, '');
  await addInFind(page, add);
  await control(page, 'button', `Undo adding ${name}`);
  assert.ok(await has(page, 'dialog[open]'), 'board: the sheet stays open');
  assert.match(await toastText(page), new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} added\\.(?: No new hole\\.| [A-Z][^:]+: (?:nobody|nothing)[^.]*\\.)`), `board: "Pineapple added. Covers the ground: nobody after year 15." ("${await toastText(page)}")`);
  // BC6: only the sheet's hole as it is now (it may have split in two), never the other holes the plant narrowed.
  const said = await toastText(page), lane = (await page.evaluate(() => document.querySelector('dialog[open] h2')?.textContent ?? '')).split(':')[0].trim();
  for (const hole of said.match(/[A-Z][^.:]*(?=: (?:nobody|nothing))/g) ?? []) assert.equal(hole, lane, `BC6: the toast names the sheet's hole "${lane}" only ("${said}")`);
  await done(page);
});

test('PFA9 (pf-a Find): Find opened from "Add plants" says "Your palette has N holes" (the engine\'s open holes), a row per hole in one form with its count of plants, and "All N holes" when they do not all show; on an empty palette that line is hidden', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'Find opens');
  await says(page, `Your palette has ${plural(e.open.length, 'hole')}`, { timeout: 8000 });
  const t = await pageText(page) + ' ' + await dialogText(page);
  const rows = t.match(/(?:Full sun|Mostly sun|Part shade|Shade|Feeds you|Feeds the soil|Makes mulch|Covers the ground|Brings helpers|Shelters and protects): nobody[^0-9]*?(?:\d+ plants? not checked)?\s?\d+ plants?\b/g) ?? [];
  assert.ok(rows.length >= Math.min(4, e.open.length), `board: a row per hole with its count of plants ("Shade: nobody, at any time 8 plants"; ${rows.length})`);
  if (e.open.length > 4) await control(page, 'button', `All ${e.open.length} holes`);
  await done(page);
  const empty = await emptyPalette();
  await press(empty, 'button', 'Find plants');
  await saysNot(empty, /Your palette has \d+ holes?/, 'an empty palette lacks nothing yet');
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
  assert.ok(await page.waitForFunction((re) => [...document.querySelectorAll('main h2, main h3, main h4')].some((h) => new RegExp(re).test(h.textContent.trim())), { timeout: 8000 }, HOLE_TITLE.source).then(() => true, () => false), 'board: then a hole is named');
  await done(page);
});

test('PFA11 (pf-a inform, don\'t block, carried from PP-B39 and PP-B25; R1): the candidates that need a second look sit under "Needs a second look (n)", n the engine\'s count, each with its warning in words; a Mildly toxic plant that fits stays under the fitting ones; "Show N outside their climate range" folds the outside ones, each saying so in words, one tap adds it and Undo takes it out', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  const card = await nextText(page);
  if (e.look.length) assert.match(card, new RegExp(`Needs a second look \\(${e.look.length}\\)[^]*?(?:[Tt]oxic|invasive|edge)`), 'board: the warning that put it there, in words');
  const look = card.indexOf('Needs a second look');
  if (look > 0) for (const sci of e.fits) if (card.includes(sci)) assert.ok(card.indexOf(sci) < look, `board: ${sci} fits (Mildly toxic is a mark, not a second look) and sits above "Needs a second look"`);
  if (e.outside.length && e.fits.length + e.look.length) {
    const label = `Show ${e.outside.length} outside ${e.outside.length === 1 ? 'its' : 'their'} climate range`;
    await press(page, 'button', label);
    await says(page, 'Outside its climate range');
    const before = await members(page);
    const add = (await addButtons(page)).at(-1);
    await press(page, 'button', add);
    assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k + 1, before), 'board: one tap adds it, no confirm step');
    await press(page, 'button', 'Undo');
    assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, before), 'Undo takes it out');
  }
  await done(page);
});

test('PFA12 (pf-a Balcony): with "Balcony or pots" the room card says every plant stays in every list, the suggested palette prefers small plants, there is no pot data and the soil map is not used; a candidate taller than 6 m says "Grows to N m: keep it pruned, or pick a smaller plant", and never hides', async () => {
  const page = await palette({ site: 'seville', n: 6, room: 'pots' });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, 'Balcony or pots. Every plant stays in every list: room never hides one. A suggested palette prefers plants that stay small, and a plant that grows above 6 m carries a note to prune. We have no data yet on which plants do well in pots. The soil map is not used for pots: you choose the mix.');
  await saysNot(page, 'taller than your room');
  const card = await nextStep(page);
  for (const [, m] of card.matchAll(/(\d+(?:\.\d+)?) m tall/g)) if (Number(m) > 6) assert.match(card, new RegExp(`Grows to ${m} m: keep it pruned, or pick a smaller plant`), `board: the ${m} m candidate's room note`);
  await done(page);
});

test('PFA13 (pf-a DeskStates, Q4, section 6): at 1280 px "Add plants" opens Find as a panel beside the picture (not a modal: the page stays usable, the chart in view), the same words as the phone\'s sheet, with Done; a message sits bottom left, 420 px wide, never over the panel; at 390 px Find opens as a sheet and a message spans the width above the bar; nothing passes the right edge at 320 px', async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await press(page, 'button', 'Add plants');
  assert.ok(await until(page, () => window.__ctTest.store.sheet.value?.kind === 'find', null, 10_000), 'Find opens');
  assert.ok(await has(page, '.ct-palette-body > dialog.ct-find[open]', 10_000), 'board: at 1280 px Find is a panel beside the picture');
  assert.equal(await page.evaluate(() => !!document.querySelector(':modal')), false, 'board: at 1280 px Find is not a modal sheet');
  const chart = await sectionBox(page, 'Through the years');
  assert.ok(chart && chart.w > 0, 'board: the chart stays in view beside the panel');
  await control(page, 'button', 'Done');
  await page.evaluate(() => window.__ctTest.store.showToast('Almond swapped for Pistachio.', () => {}));
  await frames(page);
  const box = await page.evaluate(() => { const r = document.querySelector('.ct-toast')?.getBoundingClientRect(); return r && { x: r.left, w: r.width }; });
  assert.ok(box && box.x < 80 && Math.abs(box.w - 420) <= 2, `board: the message bottom left, 420 px (${JSON.stringify(box)})`);
  await done(page);
  const phone = await palette({ width: 390 });
  await press(phone, 'button', 'Add plants');
  assert.ok(await until(phone, () => !!document.querySelector(':modal'), null, 10_000), 'board: at 390 px Find is a sheet');
  await done(phone);
  const small = await palette({ width: 320 });
  await says(small, OTHER_HOLES);
  assert.deepEqual(await pastEdge(small), [], 'board: nothing passes the right edge at 320 px');
  await done(small);
});

test('PFA14 (pf-a AddMany state 2, a thin job): once no hole is left to show (each put off), the card reads "thin spot 1 of M · you want 2 · Change" with the engine\'s M, the title "Feeds you: 1 plant in years 15 to 60: add a backup", "Find a backup", and the bulk row counting what the goal still lacks ("Add the 1 that fits best", "Add all N that do this job then"); its toast says the job is still thin ("Feeds you: still 1 plant in years 25 to 60.") or ends it', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  await page.evaluate(() => { const { store } = window.__ctTest; store.notNow.value = new Set(store.openHoles.value.map((h) => h.id)); });
  const e = await engineLead(page);
  assert.ok(e.lead?.kind === 'thin', 'the engine gives a thin spot once the holes are put off (Kiambu 8, goal 2)');
  const card = await nextText(page);
  assert.ok(card.includes(`thin spot ${e.lead.index} of ${e.lead.of} · you want ${e.goal} · Change`), `board: "thin spot 1 of ${e.lead.of} · you want ${e.goal} · Change" ("${card.slice(0, 90)}")`);
  assert.match(card, /: \d+ plants? in years \d+ to \d+: add a backup/, 'board: "Feeds you: 1 plant in years 15 to 60: add a backup"');
  await control(page, 'button', 'Find a backup');
  if (e.fits.length) {
    const [best, all] = bulkWords(e);
    if (all) await control(page, 'button', all);
    const before = await members(page);
    await press(page, 'button', best);
    assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, before + e.best.length), `board: the ${e.best.length} the goal still lacks are added`);
    assert.match(await toastText(page), new RegExp(`^${e.best.length} plants? added: [^.]+\\.`), `board: "1 plant added: Arabica coffee. Feeds you: still 1 plant in years 25 to 60." ("${await toastText(page)}")`);
  }
  await done(page);
});

test('PFA15 (pf-a A19, F21, an untouched suggestion): a small suggested palette shows its thin spots as a count only (the position line), with no thin-spot card and no "Find a backup"; one add or a goal change brings the card', async () => {
  const page = await emptyPalette();
  await press(page, 'button', (await names(page, 'button')).find((n) => n.startsWith('Start from a small palette')) ?? 'Start from a small palette');
  assert.ok(await until(page, () => window.__ctTest.store.untouchedSuggestion.value, null, 15_000), 'the suggestion is in, untouched');
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await frames(page);
  const e = await engineLead(page);
  await saysNot(page, 'Find a backup', 'A19: no thin-spot card on an untouched suggestion');
  await saysNot(page, /thin spot \d+ of \d+/, 'A19: no thin-spot card on an untouched suggestion');
  if (e.thins.length) await says(page, `${e.thins.length} thin spot${e.thins.length === 1 ? '' : 's'}`);
  if (e.thins.length && !e.open.length) {
    await setPlantsPerJob(page, 2 === e.goal ? 3 : 2);
    assert.ok(await until(page, () => !window.__ctTest.store.untouchedSuggestion.value), 'a goal change touches it');
    await says(page, /thin spot 1 of \d+/);
  }
  await done(page);
});

test('PFA16 (pf-a Many, F17, the 200-plant palette): the card leads with the engine\'s hole and position ("hole 1 of 2 · no thin spot"); when no plant on the lists fits it reads "No plant on your lists fits your place and does this then.", "See the N outside their range" and "Not now", with no bulk button; otherwise its bulk row counts what fits; its groups past the size rule are count cells ("+ N more")', { timeout: 180_000 }, async () => {
  const page = await loadPalette200();
  await says(page, 'Next step', { timeout: 20_000 });
  const e = await engineLead(page);
  assert.ok(e.lead, 'the engine names a lead at 200 plants');
  const card = await nextText(page);
  assert.ok(card.includes(position(e)), `board: "${position(e)}" ("${card.slice(0, 90)}")`);
  // BC2 (board Many): the members not checked, counted and named while few ("7 plants not checked … Garapa, …").
  const unchecked = e.lead.target.unchecked?.length ?? 0;
  if (unchecked) assert.match(card, new RegExp(`${unchecked} plants? not checked`), `BC2: "${unchecked} plants not checked" under the title ("${card.slice(0, 300)}")`);
  // BC4 (board Many, word map row 151): the no-fit state when no plant fits and none is unchecked (R3);
  // the sentence, how many do it outside their range, "See the N outside their range", "Not now"; no "See all".
  if (!e.fits.length && !e.unknown.length) {
    assert.ok(card.includes('No plant on your lists fits your place and does this then.'), 'board: the no-fit sentence');
    if (e.outside.length) assert.ok(card.includes(`${e.outside.length} ${e.outside.length === 1 ? 'does it but is outside its' : 'do it but are outside their'} climate range here.`), 'board Many: "5 do it but are outside their climate range here."');
    if (e.outside.length) await control(page, 'button', `See the ${e.outside.length} outside ${e.outside.length === 1 ? 'its' : 'their'} range`);
    await control(page, 'button', 'Not now');
    assert.ok(!(await names(page, 'button')).some((n) => /^Add (?:the|all) /.test(n)), 'board: no bulk button when none fits');
    // R3: "See all N" whenever N plants are to see (second looks); with none, the outside link only (board Many).
    if (e.seeAll) await control(page, 'button', e.seeAll === 1 ? 'See the plant' : `See all ${e.seeAll} plants`);
    else assert.ok(!(await names(page, 'button')).some((n) => /^See (?:all \d+ plants|the plant)$/.test(n)), 'BC4: no "See all N plants" with nothing to see');
    if (e.look.length) assert.ok(card.indexOf('No plant on your lists fits') < card.indexOf(`Needs a second look (${e.look.length})`), 'board Many: the no-fit sentence, then the second looks under their heading');
  } else {
    assert.ok(!card.includes('No plant on your lists fits your place and does this then.'), 'R3: no no-fit sentence while plants fit or are unchecked');
    await control(page, 'button', e.seeAll === 1 ? 'See the plant' : `See all ${e.seeAll} plants`);
    if (!e.fits.length) assert.ok(!(await names(page, 'button')).some((n) => /^Add (?:the|all) /.test(n)), 'A1: no bulk button while none fits (second looks are added one by one)');
    else for (const w of bulkWords(e)) await control(page, 'button', w);
    if (e.fits.length > 12) assert.match(card, new RegExp(`\\+ ${e.fits.length - 3} more`), `board: the ${e.fits.length} that fit as a count cell ("+ ${e.fits.length - 3} more")`);
  }
  // BC5 (boards Many, ManyDesk): past 40 plants the other holes are one sentence, then the thin spots or
  // "No thin spot: every job that is done has the 2 plants you want, from year 1 to year 60." and "Change the 2".
  const others = e.open.length - 1;
  if (others === 1) assert.match(card, /The other hole: [A-Z][^:]+: nobody/, 'BC5: "The other hole: Covers the ground: nobody known after year 25 …"');
  if (others > 1) assert.ok(card.includes(`The other ${others} holes: `), `BC5: "The other ${others} holes: …"`);
  assert.ok(!/Other holes \d/.test(card), 'BC5: no "Other holes" card at 200 plants');
  if (e.thins.length && !e.untouched) assert.ok(card.includes(`Then ${plural(e.thins.length, 'thin spot')}, with fewer than the ${e.goal} plants you want: `), 'BC5: the thin spots listed');
  if (!e.thins.length) assert.ok(card.includes(`No thin spot: every job that is done has the ${e.goal} plants you want, from year 1 to year 60.`), 'BC5: "No thin spot: every job that is done has the 2 plants you want, from year 1 to year 60."');
  await control(page, 'button', `Change the ${e.goal}`);
  await done(page);
});

test('PFA17 (pf-a AddMany state 3, F20, Toasts "one-tap adds in a row"): in the Add sheet each Add is one tap and the sheet stays open; the head reads "N added this visit · your palette: M plants" with Done; each added row says "Added" with its Undo; one toast counts up ("2 added this visit. Last: Tahitian lime."), never a stack, and its Undo takes back the last add only', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  await page.evaluate(() => window.__ctTest.store.openFind());
  assert.ok(await has(page, 'dialog[open]', 10_000), 'the Add sheet');
  await page.click('dialog[open] [data-job-chip="feeds_you"]');
  await page.waitForSelector('dialog[open] [data-find-row]', { timeout: 6000 });
  const before = await members(page);
  const added = [];
  for (let i = 0; i < 3; i++) {
    const add = (await findAdds(page))[0];
    assert.ok(add, 'board: a row\'s Add');
    await addInFind(page, add);
    added.push(add.replace(/^Add /, ''));
    assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, before + i + 1), 'one tap adds it');
  }
  assert.ok(await has(page, 'dialog[open]'), 'board: the sheet stays open');
  await says(page, `3 added this visit · your palette: ${before + 3} plants`, { inDialog: true });
  for (const n of added) await control(page, 'button', `Undo adding ${n}`);
  assert.equal(await toastText(page), `3 added this visit. Last: ${added[2]}.`, 'board: one message counting up');
  assert.equal(await page.$$eval('.ct-toast', (t) => t.length), 1, 'board: never a stack');
  await page.locator('dialog[open] .ct-toast .ct-toast-undo').click();
  assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k, before + 2), 'board: Undo takes back the last add only');
  await done(page);
});

test('PFA18 (pf-a AddMany, "Find a backup"): Find opened from a thin job reads "Sorted: fills this first." with the filter "Fills a hole or a thin job" on ("Filters · 1"), and lists the plants that do that job then', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  await page.evaluate(() => { const { store } = window.__ctTest; store.notNow.value = new Set(store.openHoles.value.map((h) => h.id)); });
  const e = await engineLead(page);
  assert.equal(e.lead?.kind, 'thin', 'the engine leads with a thin spot once the holes are put off');
  await press(page, 'button', 'Find a backup');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'Find opens');
  await says(page, 'Sorted: fills this first.');
  // BC10 (board AddMany state 3): where it was opened from, and each row a backup, never "fills this hole".
  const t = e.lead.target;
  await says(page, `Opened from “${JOB_NAME[t.job]}, years ${t.fromYear} to ${t.toYear}”; the filter “Fills a hole or a thin job” is on.`, { inDialog: true });
  await says(page, new RegExp(`${JOB_NAME[t.job]} (?:from|in) [^:]+: a backup`), { inDialog: true });
  assert.ok(!(await dialogText(page)).includes('fills this hole'), 'BC10: no row says "fills this hole" on a thin job');
  await control(page, 'button', 'Filters · 1');
  await done(page);
});

test('PFA19 (pf-a FindFilters, FindDesk, the v13 deltas): the filters read Job, Light ("To fill an empty light level. A plant shows under every level it grows in."), When it stands, Climate ("Well inside its range only", "Holds by 2041–2070", "Holds by 2071–2099"), Size and Hide ("Hide plants recorded toxic" with how many are not checked, "Hide plants whose light is not checked yet", "Hide plants with no size recorded"), in that order; no Life, "Has edible parts", "only repeat jobs" or "Select several"', async () => {
  const page = await palette({ width: 390 });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, 'dialog[open]', 10_000), 'Find opens');
  await press(page, 'button', 'Filters');
  const t = await dialogText(page);
  let at = -1;
  for (const w of ['Job', 'To fill what your palette lacks.', 'Light', 'To fill an empty light level. A plant shows under every level it grows in.', 'When it stands', 'Climate', 'Well inside its range only', 'Holds by 2041–2070', 'Holds by 2071–2099', 'Size', 'Hide', 'Hide plants recorded toxic', 'Hide plants whose light is not checked yet', 'Hide plants with no size recorded']) {
    const i = t.indexOf(w, at + 1);
    assert.ok(i > at, `board: "${w}" in the filters' order`);
    at = i;
  }
  assert.match(t, /toxicity not checked for \d+ of the \d+ plants/, 'board: the toxicity line says how many are not checked');
  for (const gone of ['Has edible parts', 'Life', 'repeat jobs', 'Select several']) assert.ok(!t.includes(gone), `board: no "${gone}"`);
  await done(page);
});

test('PFA20 (pf-a F16, Plants per job changed on 200 plants): the thin spots are recounted at once and the Next step\'s position follows the engine; a put-off thin spot stays put off while its job is still thin', { timeout: 180_000 }, async () => {
  const page = await loadPalette200();
  await says(page, 'Next step', { timeout: 20_000 });
  await setPlantsPerJob(page, 5);
  await frames(page);
  const e = await engineLead(page);
  assert.ok(e.lead, 'a lead at goal 5');
  assert.ok(await until(page, (w) => (document.querySelector('main')?.innerText ?? '').replace(/\s+/g, ' ').includes(w), position(e), 8000), `board: the position "${position(e)}" after the goal change`);
  await done(page);
});

test('PFA21 (pf-a Recife, the Portuguese words): on the Portuguese page the Next step\'s heading, position and buttons come from pt.json ("Próximo passo", its "hole i of n", "Ver todas as N plantas", "Agora não")', async () => {
  const pt = JSON.parse((await import('node:fs')).readFileSync(new URL('../../src/i18n/translations/pt.json', import.meta.url), 'utf8'));
  const page = await tool({ lang: 'pt', hash: await linkOf('Mediterranean', 13) });
  await atSite(page, 'seville');
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, pt['consortium.palette.nextTitle']);
  await says(page, pt['consortium.palette.notNow']);
  const e = await engineLead(page);
  await says(page, pt['consortium.palette.holeOf'].replace('{i}', String(e.lead.index)).replace('{n}', String(e.lead.of)));
  // C11, BC34: the board Recife's words, "falha 1 de 3", "Vale olhar de perto (2)".
  await says(page, `falha ${e.lead.index} de ${e.lead.of}`);
  if (e.look.length) await says(page, `Vale olhar de perto (${e.look.length})`);
  // The bulk row in Portuguese (AddMany), from pf-a's keys.
  const form = (s = '', k = 'other') => (s.split('|').map((x) => x.trim()).find((x) => x.startsWith(`${k}:`)) ?? '').slice(k.length + 1).trim();
  const best = form(pt['consortium.palette.next.addBest'], e.best.length === 1 ? 'one' : 'other');
  assert.ok(best, 'board: the bulk row has its Portuguese words');
  if (e.fits.length) await control(page, 'button', best.replace('#', String(e.best.length)));
  await done(page);
});


test('PFA22 (pf-a FillHole at 390, BC7-BC9, BC11): a hole\'s sheet is a bottom sheet over the dimmed page, rounded at the top, its title beside the close button; its intro counts the plants that fit (no second look) then says "Best fit first: …"; no search field, Filters or "Fits your place today" heading: the rows that fit, then "Needs a second look (n)" with each row\'s reason as a chip ("Near the edge of its range"); the foot holds "Show N outside their climate range" and Done', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  assert.ok(e.lead && e.lead.kind !== 'thin', 'the engine names a lead hole');
  await press(page, 'button', e.seeAll === 1 ? 'See the plant' : `See all ${e.seeAll} plants`);
  assert.ok(await has(page, 'dialog[open]', 10_000), 'the hole\'s sheet opens');
  await says(page, 'Best fit first: plants that fit before those that need a second look', { inDialog: true });
  const t = await dialogText(page);
  // BC8: the count of the plants that fit, never with the second looks.
  if (e.fits.length) assert.match(t, new RegExp(`\\b${e.fits.length} plants? on [^.]+ fills? it and fits? your place\\. Best fit first: `), `BC8: "${e.fits.length} plants … fit your place. Best fit first: …" ("${t.slice(0, 260)}")`);
  // BC9: rows only, no search, filters or fit heading.
  const roles = await page.evaluate(() => ({ search: !!document.querySelector('dialog[open] input[type=search]'), heads: [...document.querySelectorAll('dialog[open] h3')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()) }));
  assert.ok(!roles.search, 'BC9: no search field in a hole\'s sheet');
  assert.ok(!(await names(page, 'button')).some((n) => /^Filters\b/.test(n)), 'BC9: no Filters in a hole\'s sheet');
  assert.ok(!roles.heads.some((h) => /^Fits your place/.test(h)), `BC9: no "Fits your place today N" heading (${roles.heads.join(' | ')})`);
  if (e.look.length) assert.ok(roles.heads.includes(`Needs a second look (${e.look.length})`), `BC9: "Needs a second look (${e.look.length})" (${roles.heads.join(' | ')})`);
  if (e.outside.length) await control(page, 'button', `Show ${e.outside.length} outside ${e.outside.length === 1 ? 'its' : 'their'} climate range`);
  await control(page, 'button', 'Done');
  // BC11: a range-edge second look carries its chip.
  // (textContent: rows off screen skip their rendering, content-visibility, so innerText leaves them out)
  const all = await page.evaluate(() => document.querySelector('dialog[open]').textContent.replace(/\s+/g, ' '));
  if (e.lookEdge.length) assert.match(all, new RegExp(`${e.lookEdge[0]}[^]*?Near the edge of its range`), `BC11: "Near the edge of its range" on ${e.lookEdge[0]}`);
  // BC7: a bottom sheet with a strip of the page above, rounded top; the title beside the close button.
  const frame = await page.evaluate(() => {
    const d = document.querySelector('dialog[open]'), r = d.getBoundingClientRect(), cs = getComputedStyle(d);
    const title = d.querySelector('h2')?.getBoundingClientRect(), close = [...d.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Close')?.getBoundingClientRect();
    return { top: r.top, radius: parseFloat(cs.borderTopLeftRadius), title: title && { top: title.top, bottom: title.bottom }, close: close && { top: close.top, bottom: close.bottom } };
  });
  assert.ok(frame.top >= 16, `BC7: the sheet leaves the dimmed page above it (top ${frame.top})`);
  assert.ok(frame.radius >= 8, `BC7: rounded top corners (${frame.radius})`);
  assert.ok(frame.title && frame.close && frame.close.top < frame.title.bottom && frame.title.top < frame.close.bottom, `BC7: the title and the close button share the head row (${JSON.stringify(frame)})`);
  await done(page);
});

// ---- Board check b2 (BC13-BC25): the card's layout and words, Other holes, the Find start, the desk panel.
const core = await import('../../src/lib/consortium/holes.ts');
const { periodIds } = await import('../../src/lib/consortium/types.ts');
// Per open hole, what the engine's fillers() puts in each group (core holes.ts, the installed release):
// the count every hole row says (the Next step's, Other holes', Find's), BC25.
async function holeCounts(page) {
  const s = await page.evaluate((last) => {
    const st = window.__ctTest.store;
    const members = st.memberTaxa.value, ids = new Set(members.map((t) => t.id));
    const pool = (st.offerPool.value ?? []).filter((t) => !ids.has(t.id));
    const rule = st.verdictRule.value, ctx = st.verdictContext.value;
    return { holes: st.paletteHoles.value, members, pool, pv: [...(st.poolVerdicts.value ?? new Map())], holds: rule ? pool.map((t) => [t.id, rule.holdsBy(t, ctx, last)]) : [], warned: pool.filter((t) => st.warnedPlant(t)).map((t) => t.id) };
  }, periodIds[periodIds.length - 1]);
  const open = s.holes.filter((h) => h.state === 'open');
  return open.map((h) => {
    const f = core.fillers(h, s.pool.filter((t) => core.fills(h, t)), new Map(s.pv), new Map(s.holds), new Set(s.warned), s.members, open);
    return { id: h.id, fits: f.fits.length, look: f.look.length, unknown: f.unknown.length };
  });
}
// A colour token as the page computes it (rgb()).
const token = (page, name) => page.evaluate((n) => { const e = document.createElement('span'); e.style.color = `var(${n})`; document.querySelector('.ct').append(e); const c = getComputedStyle(e).color; e.remove(); return c; }, name);
const style = (page, sel, props) => page.$eval(sel, (e, p) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return { ...Object.fromEntries(p.map((k) => [k, s.getPropertyValue(k)])), x: r.left, y: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; }, props);
const plantsWord = (n) => `${n} ${n === 1 ? 'plant' : 'plants'}`;
const endWords = (c) => c.fits ? plantsWord(c.fits) : c.look ? `${c.look} ${c.look === 1 ? 'needs' : 'need'} a second look` : 'no plant fits here';

test('PFA23 (pf-a Main, DarkMain, BC14-BC17, BC20): the card\'s head is a small ochre "Next step" with the position right-aligned on its line, the hole title the large Literata heading; its edge is ochre in both themes; each row\'s Add is an outline "+ Add" at the row\'s right; "See all N plants" (left) and "Not now" (right) are underlined links; no bare count repeated under a counted heading', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  const label = await style(page, '.ct-next-card .ct-next-label', ['color', 'font-size']);
  assert.equal((await page.$eval('.ct-next-card .ct-next-label', (e) => e.innerText.trim().toLowerCase())), 'next step');
  assert.equal(label.color, await token(page, '--accent-ink'), 'BC14: the label is ochre');
  assert.ok(parseFloat(label['font-size']) <= 16, 'BC14: the label is small');
  const pos = await style(page, '.ct-next-card [data-next-position]', ['text-align']);
  const head = await style(page, '.ct-next-card .ct-next-head', []);
  assert.ok(Math.abs(pos.y - label.y) < 8 && Math.abs(pos.right - head.right) < 2, `BC14: the position right-aligned on the label's line (${JSON.stringify({ pos, label, head })})`);
  const title = await style(page, '.ct-next-card .ct-next-hole', ['font-family', 'font-size']);
  assert.match(title['font-family'], /Literata/, 'BC14: the hole title in Literata');
  assert.equal(title['font-size'], '20px', 'BC14: the hole title is the large heading');
  assert.equal((await style(page, '.ct-next-card', ['border-top-color']))['border-top-color'], await token(page, '--accent'), 'BC15: an ochre edge (light)');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await frames(page);
  assert.equal((await style(page, '.ct-next-card', ['border-top-color']))['border-top-color'], await token(page, '--accent'), 'BC15: an ochre edge (dark)');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  // BC16: "+ Add", an outline button right of the row's words.
  const add = await page.$eval('.ct-next .ct-fillers li button.ct-filler-add', (b) => { const r = b.getBoundingClientRect(), s = getComputedStyle(b), text = b.parentElement.querySelector('.ct-filler-text').getBoundingClientRect(); return { words: b.innerText.trim(), svg: !!b.querySelector('svg'), border: s.borderTopStyle, left: r.left, textRight: text.right }; });
  assert.equal(add.words, 'Add', 'BC16: the row button says Add');
  assert.ok(add.svg && add.border === 'solid', 'BC16: a + and an outline');
  assert.ok(add.left >= add.textRight - 1, `BC16: right of the row's words (${JSON.stringify(add)})`);
  // BC17: the foot's links.
  const links = await page.$$eval('.ct-next .ct-next-actions button', (bs) => bs.map((b) => ({ t: b.innerText.trim(), u: getComputedStyle(b).textDecorationLine, x: b.getBoundingClientRect().left, r: b.getBoundingClientRect().right })));
  const all = links.find((l) => /^See all \d+ plants$/.test(l.t)), not = links.find((l) => l.t === 'Not now');
  assert.ok(all && not, `BC17: See all and Not now (${JSON.stringify(links)})`);
  assert.ok(links.every((l) => /underline/.test(l.u)), 'BC17: underlined links');
  assert.ok(all.x < not.x, 'BC17: See all at the left, Not now at the right');
  // BC20: no bare number in the card but its heading counts.
  const bare = await page.$$eval('.ct-next *, .ct-other-holes *', (els) => els.filter((e) => e.children.length === 0 && /^\d+$/.test(e.innerText?.trim() ?? '') && e.offsetParent && !e.closest('h2, h3')).map((e) => e.className));
  assert.deepEqual(bare, [], 'BC20: no bare count under a counted heading');
  await done(page);
});

test('PFA24 (pf-a Main, BC21, BC25): "Other holes" is its own card under the Next step card; each hole a dashed row with a +, its bold lane name and an ochre "Find"; a hole one to three plants fill says "1 plant fills it: <name>" with its name', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  const card = await style(page, '.ct-next-card', []), other = await style(page, '.ct-other-holes', ['border-top-style']);
  assert.ok(other.y >= card.bottom, 'BC21: below the Next step card');
  assert.equal(await page.$eval('.ct-other-holes', (e) => !!e.closest('.ct-next-card')), false, 'BC21: a card of its own');
  const rows = await page.$$eval('.ct-other-holes button.ct-hole-row', (bs) => bs.map((b) => ({ dashed: getComputedStyle(b).borderTopStyle, svg: !!b.querySelector('svg'), lane: b.querySelector('b:not(.ct-hole-row-end)')?.innerText.trim(), end: b.querySelector('.ct-hole-row-end')?.innerText.trim(), endColor: getComputedStyle(b.querySelector('.ct-hole-row-end')).color })));
  assert.ok(rows.length > 0, 'BC21: hole rows');
  const accent = await token(page, '--accent-ink'), accent2 = await token(page, '--accent');
  for (const r of rows) {
    assert.equal(r.dashed, 'dashed', 'BC21: a dashed row');
    assert.ok(r.svg && r.lane && /:$/.test(r.lane), `BC21: the + and the bold lane name (${JSON.stringify(r)})`);
    assert.equal(r.end, 'Find');
    assert.ok([accent, accent2].includes(r.endColor), 'BC21: an ochre Find');
  }
  const e = await engineLead(page), counts = await holeCounts(page);
  for (const c of counts.filter((x) => x.id !== e.lead.target.id)) {
    const n = c.fits + c.look + c.unknown;
    if (n >= 1 && n <= 3) await says(page, `${n} ${n === 1 ? 'plant fills' : 'plants fill'} it:`);
  }
  await done(page);
});

test('PFA25 (pf-a AddMany at 390, BC18, BC19): under 640 px the bulk buttons are full width and stacked; a mark is named in the sentence ("Pineapple is mildly toxic and says so on its row."), never "is marked"', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  if (e.fits.length > 1) {
    const bs = await page.$$eval('.ct-next-bulk .button', (els) => els.map((b) => { const r = b.getBoundingClientRect(), p = b.parentElement.getBoundingClientRect(); return { y: r.top, w: r.width, pw: p.width }; }));
    assert.ok(bs.length >= 1 && bs.every((b) => Math.abs(b.w - b.pw) <= 1), `BC18: full width (${JSON.stringify(bs)})`);
    if (bs.length > 1) assert.ok(bs[1].y > bs[0].y, 'BC18: stacked');
  }
  const note = await page.$eval('[data-next-bulk-note]', (p) => p.innerText).catch(() => '');
  assert.doesNotMatch(note, /is marked|carr(?:y|ies) a mark/, `BC19: the mark is named ("${note}")`);
  if (/says so on its row/.test(note)) assert.match(note, /\S is [a-z][^.]* and says so on its row\./, `BC19: "<plant> is mildly toxic and says so on its row." ("${note}")`);
  await done(page);
});

test('PFA26 (pf-a Find at 390, BC23-BC25): with nothing typed, Find says "<climate> · N of the M plants … fit your place today", its field "Name in any language, or a job", a sliders mark on Filters, no "Show the N plants that fit"; "Your palette has N holes" a small label over dashed hole rows with ochre counts (each the Next step\'s count, or the no-fit words), four before "All N holes"; job chips in the board\'s ink glyphs; the foot "Look in another climate\'s list"', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  const counts = await holeCounts(page);
  const fit = await page.evaluate(() => { const n = window.__ctTest.store.countFits.value; return n && { k: n.fits + n.look, of: n.of }; });
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, 'dialog[open] [data-find-holes]', 10_000), 'Find opens');
  const sub = await dialogText(page);
  assert.match(sub, new RegExp(`[A-Z][a-z]+ · ${fit.k} of the ${fit.of} plants [^.]*fit your place today`), `BC23: the subtitle ("${sub.slice(0, 200)}")`);
  assert.equal(await page.$eval('dialog[open] [data-find-search]', (i) => i.placeholder), 'Name in any language, or a job', 'BC23: the placeholder');
  assert.ok(await page.$('dialog[open] .ct-find-filters-btn svg'), 'BC23: a sliders mark on Filters');
  assert.ok(!/Show the \d+ plants? that fits?/.test(sub), 'BC23: no "Show the N plants that fit"');
  assert.ok(parseFloat((await style(page, 'dialog[open] #ct-find-holes', ['font-size']))['font-size']) <= 14, 'BC23: "Your palette has N holes" is a small label');
  const rows = await page.$$eval('dialog[open] [data-find-hole]', (bs) => bs.map((b) => ({ id: b.dataset.findHole, dashed: getComputedStyle(b).borderTopStyle, end: b.querySelector('.ct-hole-row-end')?.innerText.trim(), color: getComputedStyle(b.querySelector('.ct-hole-row-end')).color })));
  assert.equal(rows.length, Math.min(4, counts.length), 'BC23: four holes before "All N holes"');
  if (counts.length > 4) await control(page, 'button', `All ${counts.length} holes`);
  const ochre = [await token(page, '--accent-ink'), await token(page, '--accent')];
  for (const r of rows) {
    assert.equal(r.dashed, 'dashed', 'BC23: dashed hole rows');
    assert.ok(ochre.includes(r.color), 'BC23: an ochre count');
    const c = counts.find((x) => x.id === r.id);
    assert.equal(r.end, endWords(c), `BC25: the row counts what the Next step counts (${JSON.stringify(c)})`);
  }
  // BC24: the board's glyphs, in ink.
  const ink = await token(page, '--text');
  const glyph = await page.$$eval('dialog[open] [data-job-chip] .ct-job-icon', (els) => els.map((e) => ({ job: e.dataset.job, color: getComputedStyle(e).color, mark: getComputedStyle(e).getPropertyValue('--job-mark') })));
  assert.ok(glyph.length > 0, 'the job chips');
  const PATH = { feeds_soil: 'M10 3v7', mulch: 'M3 13l7 3 7-3', helpers: "cx='10' cy='5.2'", shelter: 'M3 7h9a2.5' };
  for (const g of glyph) {
    assert.equal(g.color, ink, `BC24: ${g.job} in ink`);
    if (PATH[g.job]) assert.ok(g.mark.includes(PATH[g.job]), `BC24: ${g.job} is the board's glyph`);
  }
  await control(page, 'button', 'Look in another climate’s list');
  await done(page);
});

test('PFA27 (pf-a FindDesk, HoleOpen, BC13): at 1280 the plain Find panel\'s filters are checkbox rows, each count at the right, under "Filters" with "Clear all"; "Searched on this computer; nothing is sent." beside the field; a hole\'s panel is one column about 440 px wide beside the chart', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder');
  await says(page, OTHER_HOLES);
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, '.ct-palette-body > dialog.ct-find-panel[open]', 10_000), 'the panel');
  await says(page, 'Searched on this computer; nothing is sent.', { inDialog: true });
  await control(page, 'button', 'Clear all');
  const boxes = await page.$$eval('dialog[open] input[type=checkbox][data-filter="job"]', (is) => is.map((i) => { const l = i.closest('label'), c = l.querySelector('.ct-find-boxcount'); return { count: c?.innerText.trim(), right: c && Math.abs(c.getBoundingClientRect().right - l.getBoundingClientRect().right) < 2 }; }));
  assert.ok(boxes.length >= 4, `BC13: the jobs as checkbox rows (${boxes.length})`);
  assert.ok(boxes.every((b) => /^\d+$/.test(b.count) && b.right), `BC13: each count at the right (${JSON.stringify(boxes)})`);
  await done(page);
  const hole = await loadCase('kiambu-8-nights-2c-colder');
  await says(hole, OTHER_HOLES);
  await hole.click('.ct-other-holes button.ct-hole-row');
  assert.ok(await has(hole, '.ct-palette-body > dialog.ct-find-panel.ct-find-hole[open]', 10_000), 'the hole panel');
  const w = (await style(hole, 'dialog.ct-find-panel[open]', [])).w;
  assert.ok(w >= 320 && w <= 445, `BC13: one column of about 440 px (${w})`);
  await done(hole);
});

test('PFA28 (pf-a Main in Spanish at 390, BC14): the position line never breaks inside a part', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390, lang: 'es' });
  assert.ok(await has(page, '.ct-next-card [data-next-position]', 15_000), 'the position');
  const parts = await page.$$eval('.ct-next-card .ct-next-part', (ps) => ps.map((p) => ({ t: p.innerText, lines: p.getClientRects().length })));
  assert.ok(parts.length > 0, 'BC14: the position\'s parts');
  for (const p of parts) assert.equal(p.lines, 1, `BC14: "${p.t}" on one line`);
  await done(page);
});

// ---- Board check b3 (BC26-BC33) and review R1-R3: the grower's scenarios, each a case.
// (BC29, BC30, BC31's words and BC34 are word tests in scripts/consortium-pf-a.test.mjs; BC31's rain
// figure "registrada desde 25 mm" waits for a recorded rain minimum the release does not hold.)
const visibleButtons = (page, within) => page.evaluate((w) => [...(w ? document.querySelector(w) : document).querySelectorAll('button')]
  .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(b).visibility !== 'hidden'; })
  .map((b) => (b.getAttribute('aria-label') ?? b.textContent).replace(/\s+/g, ' ').trim()), within);
const boxByName = (page, name) => page.evaluate((n) => {
  const el = [...document.querySelectorAll('dialog[open] button, dialog[open] span')].find((b) => (b.getAttribute('aria-label') ?? b.textContent).replace(/\s+/g, ' ').trim() === n);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, right: r.right, y: r.top, mid: r.top + r.height / 2 };
}, name);

test('PFA29 (pf-a R1, AddMany "Find a backup"): with "Fills a hole or a thin job" on, the grower adds the plant that closes the thin spot; its row stays, "Added" with its Undo, and every other row for that job stays listed', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  await page.evaluate(() => { const { store } = window.__ctTest; store.notNow.value = new Set(store.openHoles.value.map((h) => h.id)); });
  const e = await engineLead(page);
  assert.equal(e.lead?.kind, 'thin', 'the engine leads with a thin spot once the holes are put off');
  assert.equal(e.lead.target.thin.want - e.lead.target.thin.have, 1, 'one add closes it (have 1, want 2)');
  await press(page, 'button', 'Find a backup');
  await page.waitForSelector('dialog[open] [data-find-row]', { timeout: 10_000 });
  const rows = () => page.$$eval('dialog[open] [data-find-row]', (l) => l.map((r) => r.getAttribute('data-plant-id')));
  const before = await rows();
  // The grower's pick: the first row whose years span the thin spot, so its add closes it.
  const { yearsOf } = await import('../../src/lib/consortium/years.ts');
  const t = e.lead.target;
  const taxa = await page.evaluate((ids) => ids.map((id) => window.__ctTest.store.taxonOf(id)), before);
  const pick = taxa.find((x) => { const y = x && yearsOf(x); return y && y.from <= t.fromYear && (y.to === null || y.to >= t.toYear); });
  assert.ok(pick, 'a row that does the job through the whole thin spot');
  const add = await page.$eval(`dialog[open] [data-find-row][data-plant-id="${pick.id}"] [data-find-add]`, (b) => b.getAttribute('aria-label'));
  const name = add.replace(/^Add /, '');
  await addInFind(page, add);
  assert.ok(await until(page, (job) => !window.__ctTest.store.thinSpots.value.some((h) => h.state === 'open' && h.job === job), e.lead.target.job), 'the add closes the thin spot');
  await frames(page);
  await control(page, 'button', `Undo adding ${name}`);
  await says(page, '1 added this visit', { inDialog: true });
  assert.deepEqual(await rows(), before, 'R1: no row leaves the list when the add closes the thin spot');
  await done(page);
});

test('PFA30 (pf-a R2, DeskStates): at 1280 px with Find open beside the chart, a page action while the focus sits outside the panel keeps the focus where it is', async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, OTHER_HOLES);
  await press(page, 'button', 'Add plants');
  assert.ok(await has(page, 'dialog[data-find-panel][open]', 10_000), 'the Find panel');
  await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ct-find-title', 'the panel takes the focus when it opens');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#ct-root button')].find((x) => !x.closest('dialog') && x.textContent.trim() === 'Not now');
    b.setAttribute('data-test-pick', ''); b.focus();
  });
  await page.evaluate(() => { const { store } = window.__ctTest, ids = new Set(store.members.value); store.addMembers([store.offerPool.value.find((t) => !ids.has(t.id)).id]); });
  await frames(page);
  assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-test-pick') ?? false), true, `R2: the focus stays on the page's control (now on ${await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.slice(0, 40))})`);
  await done(page);
});

test('PFA31 (pf-a R3): without a place nothing is judged; the Next step lists the plants under "Not checked (n)", never says "No plant on your lists fits", and keeps "See all N plants"', async () => {
  const page = await palette({ site: null });
  await says(page, 'Next step', { timeout: 20_000 });
  await page.waitForFunction(() => !!document.querySelector('.ct-next[data-hole]'), { timeout: 15_000 }).catch(() => {});
  const e = await engineLead(page);
  assert.ok(e.lead, 'the engine names a lead');
  assert.equal(e.fits.length + e.look.length, 0, 'no place: nothing judged to fit');
  assert.ok(e.unknown.length > 0, 'the plants that do it are not checked');
  const card = await nextText(page);
  assert.ok(!card.includes('No plant on your lists fits your place'), `R3: never "No plant fits" for plants never judged ("${card.slice(0, 300)}")`);
  assert.ok(card.includes(`Not checked (${e.unknown.length})`), `R3: their own heading "Not checked (${e.unknown.length})"`);
  assert.ok(!/Fits your place/.test(card), 'R3: no unchecked plant reads as fitting');
  await control(page, 'button', e.seeAll === 1 ? 'See the plant' : `See all ${e.seeAll} plants`);
  await done(page);
});

test('PFA32 (pf-a FillHole at 390, BC26): a hole sheet\'s row says its fit reason (the light in it), then what else it does, its years when the reason does not say them, its size and "in range to 2099"; no "Fits your place by …" line and no light word repeated in the meta', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  const e = await engineLead(page);
  await press(page, 'button', e.seeAll === 1 ? 'See the plant' : `See all ${e.seeAll} plants`);
  await page.waitForSelector('dialog[open] [data-find-row] [data-find-fills]', { timeout: 10_000 });
  const rows = await page.$$eval('dialog[open] [data-find-group="fits"] [data-find-row]', (l) => l.map((r) => ({ reason: r.querySelector('[data-find-fills]')?.textContent.replace(/\s+/g, ' ').trim() ?? '', text: r.textContent.replace(/\s+/g, ' ').trim(), meta: r.querySelector('[data-find-meta]')?.textContent.trim() ?? '' })));
  assert.ok(rows.length > 0, 'rows that fit');
  for (const r of rows) {
    assert.ok(!/Fits your place by/.test(r.text), `BC26: no later-period fit line ("${r.text}")`);
    assert.ok(!/grows in:/i.test(r.meta), `BC26: no light word in the meta ("${r.meta}")`);
    if (/is planted in/.test(r.reason)) assert.match(r.meta, /\b(?:month \d+ to year \d+|year \d+ to year \d+|first (?:\d+ )?(?:year|years|days)|from year \d+ on)\b/, `BC26 (board FillHole): the years in the meta when the reason names the light ("${r.meta}")`);
    else assert.doesNotMatch(r.meta, /\b(?:month \d+ to year \d+|year \d+ to year \d+|from year \d+ on)\b/, `the years only once ("${r.reason}" / "${r.meta}")`);
  }
  await done(page);
});

test('PFA33 (pf-a AddMany state 3 at 390, BC27): after an add the sheet\'s head reads "1 added this visit · your palette: M plants" with Done, above the rows; the row says "Added" with its Undo inline at its right, and the focus is on that Undo', async () => {
  const page = await loadCase('kiambu-8-nights-2c-colder', { width: 390 });
  await says(page, OTHER_HOLES);
  await page.evaluate(() => window.__ctTest.store.openFind());
  await page.click('dialog[open] [data-job-chip="feeds_you"]');
  await page.waitForSelector('dialog[open] [data-find-row]', { timeout: 6000 });
  const before = await members(page);
  const add = (await findAdds(page))[0], name = add.replace(/^Add /, '');
  await page.focus(`dialog[open] [data-find-add][aria-label="${add}"]`);
  await page.keyboard.press('Enter');
  assert.ok(await until(page, (k) => window.__ctTest.store.members.value.length === k + 1, before), 'one tap adds it');
  await frames(page);
  await says(page, `1 added this visit · your palette: ${before + 1} plants`, { inDialog: true });
  const head = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); const t = d.querySelector('h2').getBoundingClientRect(); const done = [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Done').getBoundingClientRect(); const row = d.querySelector('[data-find-row]').getBoundingClientRect(); return { titleTop: t.top, titleBottom: t.bottom, doneTop: done.top, doneBottom: done.bottom, rowTop: row.top }; });
  assert.ok(head.doneBottom <= head.rowTop && head.doneTop < head.titleBottom + 30, `BC27: Done in the head beside the title, above the rows (${JSON.stringify(head)})`);
  const added = await boxByName(page, '✓ Added') ?? await boxByName(page, 'Added');
  const undo = await boxByName(page, `Undo adding ${name}`);
  assert.ok(added && undo, 'BC27: "Added" and its Undo');
  assert.ok(Math.abs(added.mid - undo.mid) <= 8 && undo.x > added.x, `BC27: "Added  Undo" on one line, Undo at the right (${JSON.stringify({ added, undo })})`);
  assert.ok(!(await names(page, 'button')).includes(`Added ${name}`) && !(await names(page, 'button')).includes(add), 'BC27: "Added" is words, not a boxed button');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), `Undo adding ${name}`, 'BC27: the focus moves to the row\'s Undo');
  await done(page);
});

test('PFA34 (pf-a Toasts, DeskStates, BC28): a message shows its words and Undo only, no close button drawn; Dismiss stays for the keyboard and shows once it has the focus', async () => {
  const page = await palette();
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await page.evaluate(() => window.__ctTest.store.showToast('Almond swapped for Pistachio.', () => {}));
  await page.waitForSelector('.ct-toast', { timeout: 4000 });
  assert.deepEqual(await visibleButtons(page, '.ct-toast'), ['Undo'], 'BC28: Undo only, as the boards draw it');
  await page.focus(aria('button', 'Dismiss'));
  assert.deepEqual(await visibleButtons(page, '.ct-toast'), ['Undo', 'Dismiss'], 'BC28: Dismiss shows while it has the focus');
  await done(page);
});

test('PFA35 (pf-a Balcony, BC32): the room note "Balcony or pots. …" is a note above the Next step card, never inside it', async () => {
  const page = await palette({ site: 'seville', n: 6, room: 'pots' });
  assert.ok(await verdictsSettled(page), 'the verdicts');
  await says(page, 'Balcony or pots.');
  const card = await nextStep(page);
  assert.ok(!card.includes('Balcony or pots.'), `BC32: not inside the card ("${card.slice(0, 160)}")`);
  const order = await page.evaluate(() => { const t = document.querySelector('main').innerText; return [t.indexOf('Balcony or pots.'), t.indexOf('Next step')]; });
  assert.ok(order[0] >= 0 && order[0] < order[1], `BC32: the note before the card (${order})`);
  await done(page);
});

test('PFA36 (pf-a Empty at 390, BC33): the three ways are bordered buttons, each with its mark, its label, what it does and a chevron; under the card a note says when the pictures come and "N of the M plants on … fit near <place> today."', async () => {
  const page = await emptyPalette({ width: 390 });
  await says(page, 'Start with the plants you want');
  const card = await section(page, 'Start with the plants you want');
  assert.ok(!card.includes('The pictures (through the years'), `BC33: the note is under the card, not in it ("${card}")`);
  const ways = await page.evaluate(() => ['Find plants', 'Paste a list', 'Start from a small palette'].map((n) => { const b = [...document.querySelectorAll('main button')].find((x) => x.getAttribute('aria-label') === n); const cs = b && getComputedStyle(b); return b && { marks: b.querySelectorAll('svg').length, border: parseFloat(cs.borderTopWidth), label: getComputedStyle(b.querySelector('span span') ?? b).color, ink: getComputedStyle(document.querySelector('main')).color }; }));
  for (const [i, w] of ways.entries()) {
    assert.ok(w, `way ${i}`);
    assert.equal(w.marks, 2, `BC33: way ${i} has its mark and a chevron`);
    assert.ok(w.border >= 1, `BC33: way ${i} is a bordered button`);
  }
  await says(page, /The pictures \(through the years, through the year, jobs\) appear with your first plant\. \d+ of the \d+ plants on .+ fit near .+ today\./);
  await done(page);
});
