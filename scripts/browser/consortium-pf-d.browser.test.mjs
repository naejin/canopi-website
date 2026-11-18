// pf stream d, "Your place in figures" (chunk 3; v14 spec section 2 'pf-d', section 3): the boards
// SiteKiambu, PlaceDesk and SiteMendoza (the panel, "What limits plants here", the Watering line, the
// "Water" card) and the change-summary toasts, as tests, with the failure rows F1, F2, F5, F6, F9 and
// F10 of section 5. Each case was opened marked expected-fail under pf-d (scripts/expect-fail.mjs
// failing(), its reason the board's first missing word, pf-helpers.mjs BOARD) in pf-d's commit 0, and
// loses its marker in the commit that makes it pass. Board figures come from the engine on the
// installed release (pf-d-helpers.mjs engineCounts, the store's own inputs), never a board number.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries none: the panel is new (spec: "Delete: nothing; the 'Soil, likely' card and 'Tell us about
//   your spot' were never built").
import assert from 'node:assert/strict';
import { failing } from '../expect-fail.mjs';
import { useHarness, aria, has } from './helpers.mjs';
import { BOARD, control, done, focused, inOrder, pastEdge, press, says, section, sectionText, toastText } from './pf-helpers.mjs';
import { edits, engineCounts, fieldState, inputs, mendoza, placeStep, summary, tempEn } from './pf-d-helpers.mjs';

useHarness();

const expanded = (page, words) => page.evaluate((w) => [...document.querySelectorAll('main button[aria-expanded]')].find((b) => b.textContent.replace(/\s+/g, ' ').trim().startsWith(w))?.getAttribute('aria-expanded') ?? null, words);
const pressed = (page, group, words) => page.evaluate((g, w) => {
  const gs = [...document.querySelectorAll(`main [role="group"][aria-label="${g}"]`)];
  for (const el of gs) for (const b of el.querySelectorAll('button[aria-pressed]')) if (b.textContent.replace(/\s+/g, ' ').trim().startsWith(w)) return b.getAttribute('aria-pressed');
  return null;
}, group, words);
const tapOption = async (page, group, words) => {
  const ok = await page.evaluate((g, w) => {
    for (const el of document.querySelectorAll(`main [role="group"][aria-label="${g}"]`)) for (const b of el.querySelectorAll('button[aria-pressed]')) if (b.textContent.replace(/\s+/g, ' ').trim().startsWith(w)) { b.click(); return true; }
    return false;
  }, group, words);
  assert.ok(ok, `board: no option "${words}" in "${group}"`);
};
const typeIn = async (page, value) => {
  const f = await page.$('main fieldset input[type="text"]');
  assert.ok(f, 'board: the editor has a number field');
  await f.click({ count: 3 });
  await page.keyboard.press('Backspace');
  await f.type(value);
};

failing('PFD1 (pf-d SiteKiambu at 390): under the place questions, "Your place in figures" with every line in its group, today → 2071–2099 and its source, Change on each; the main limit open with its periods and counts from the engine; the folds closed', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  const text = await section(page, 'Your place in figures', 20_000);
  await inOrder(page, ['How much room do you have?', 'Your place in figures', 'Climate', 'Coldest nights', 'Hottest days', 'Rain a year', 'Dry months in a row', 'Water', 'Watering', 'Soil', 'Soil pH', 'The ground after heavy rain', 'Pots or brought-in soil', 'What it means for your choice']);
  for (const w of ['Change sets your own value; Reset goes back to the map, or to not answered.', 'From the climate map', 'climate map', 'soil map', 'Not answered', 'taken as rain only', 'taken as in the ground']) assert.ok(text.includes(w), `board: "Your place in figures" says "${w}"`);
  for (const line of ['hottest days', 'rain a year', 'dry months in a row', 'watering', 'soil pH', 'the ground after heavy rain', 'pots or brought-in soil']) await control(page, 'button', `Change ${line}`);
  // The main limit here (Kiambu: the nights), open: its three periods, from the store's merged figures.
  const i = await inputs(page);
  const nights = await sectionText(page, 'Your place in figures');
  assert.ok(nights.includes(`Today ${await tempEn(i.nights.value)}`) || nights.includes(`Today${await tempEn(i.nights.value)}`), `board: the nights line says today's ${i.nights.value} °C`);
  for (const p of ['2041–2070', '2071–2099']) assert.ok(nights.includes(p), `board: the open line names ${p}`);
  const c = await engineCounts(page);
  await says(page, `The main limit here. No frost. ${c[0].nights} of the ${c[0].of} plants take these nights today`);
  await says(page, `${c[1].nights} by 2041–2070, ${c[2].nights} by 2071–2099`);
  await says(page, `${c[0].fit} of the ${c[0].of} plants fit today, ${c[1].fit} by 2041–2070, ${c[2].fit} by 2071–2099`);
  await says(page, 'Counts are of the 515 plants on the three nearest lists');
  await says(page, 'Later periods follow the middle emissions path (SSP2-4.5).');
  assert.equal(await expanded(page, 'After release: light on your plot, wind and sea'), 'false', 'board: "After release" starts closed');
  assert.equal(await expanded(page, 'Not asked, and why'), 'false', 'board: "Not asked, and why" starts closed on the phone');
  await press(page, 'button', 'After release: light on your plot, wind and sea');
  await says(page, 'Wind and sea after release');
  assert.deepEqual(await pastEdge(page), [], 'board: nothing passes the right edge at 390');
  await done(page);
});

failing('PFD2 (pf-d SiteKiambu temperature editor, Toasts): Change opens "Coldest nights: your value" with a shift first, the tick for the hottest days and a preview per period; "Use my value" writes both shifts and the summary names the periods, the plants and the holes; the row reads "Your value" with Reset; Reset goes back and the focus moves to Change (F2)', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await press(page, 'button', 'Change coldest nights');
  await says(page, 'Coldest nights: your value');
  await says(page, 'My plot is about');
  await control(page, 'button', 'colder');
  await control(page, 'button', 'I know my plot’s figure');
  await typeIn(page, '2');
  await says(page, 'Make the hottest days 2 °C colder too');
  const i = await inputs(page);
  await says(page, `With your value: nights ${await tempEn(i.nights.value - 2)} today`);
  await press(page, 'button', 'Use my value');
  assert.deepEqual(await edits(page), { nightsShiftC: -2, daysShiftC: -2 }, 'board: both shifts written, as the tick says');
  const toast = await summary(page);
  assert.match(toast, /^Coldest nights and hottest days set 2 °C colder\. Today: (\d+ (more|fewer) fit|no change in what fits); by 2071–2099: /, `board: the summary's head and periods ("${toast}")`);
  assert.match(toast, /Your 8 plants are kept/, 'board: the summary names the plants');
  assert.match(toast, /hole/, 'board: the summary says the holes');
  await says(page, 'Your value');
  await says(page, '2 °C colder than the map');
  await press(page, 'button', 'Reset coldest nights to the climate map');
  assert.deepEqual(await edits(page), {}, 'board: Reset puts both back (they were set together)');
  assert.match(await summary(page), /^Coldest nights and hottest days back to the climate map/, 'board: the summary after Reset');
  assert.ok(!(await has(page, aria('button', 'Reset coldest nights to the climate map'), 500)), 'board: the Reset button goes away');
  assert.equal((await focused(page)).name, 'Change coldest nights', 'board: the focus moves to the line\'s Change (F2)');
  await done(page);
});

failing('PFD3 (pf-d F1): a number the line cannot take is marked invalid with its range, "Use my value" refuses and keeps the focus, nothing is written; "12,5" reads with a comma as the decimal mark', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await press(page, 'button', 'Change coldest nights');
  for (const bad of ['abc', '16']) {
    await typeIn(page, bad);
    await press(page, 'button', 'Use my value');
    const st = await fieldState(page);
    assert.ok(st?.invalid, `board: "${bad}" marks the field invalid`);
    assert.match(st.message, /^Use a number from 0 to 15/, `board: the message under it ("${st.message}")`);
    assert.ok(st.focused, 'board: the focus stays in the field');
    assert.deepEqual(await edits(page), {}, 'board: nothing is written');
  }
  await typeIn(page, '1,5');
  await press(page, 'button', 'Use my value');
  assert.equal((await edits(page)).nightsShiftC, -1.5, 'board: a comma is the decimal mark');
  await done(page);
});

failing('PFD4 (pf-d PlaceDesk at 1280): every line open in two columns; the choices changed in place with one tap and their counts; the pH editor with five words; "Not asked, and why" open', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('seville-board', { site: 'seville', width: 1280 });
  await section(page, 'Your place in figures', 20_000);
  const opened = await page.evaluate(() => [...document.querySelectorAll('main [role="group"]')].filter((g) => /^(Coldest nights|Hottest days|Rain a year|Dry months in a row)$/.test(g.getAttribute('aria-label') ?? '') && g.innerText.includes('2071–2099')).length);
  assert.equal(opened, 4, 'board: every climate line is open with its periods');
  assert.equal(await expanded(page, 'Not asked, and why'), 'true', 'board: "Not asked, and why" is open on the laptop');
  await says(page, 'Day length: set by your latitude');
  const c = await engineCounts(page);
  assert.equal(await pressed(page, 'Watering', 'Rain only'), 'true', 'board: Rain only taken while not answered');
  await says(page, `Rain only · ${c[0].drier} plants: “may need watering”`);
  await says(page, 'Watered all year · no note');
  await tapOption(page, 'The ground after heavy rain', 'Stays wet for days');
  assert.equal((await edits(page)).drainage, 'wet', 'board: one tap writes the answer');
  assert.match(await summary(page), /^The ground after heavy rain set to “Stays wet for days”\. Today and by 2071–2099 alike \(soil does not change\)/, 'board: the soil summary');
  await control(page, 'button', 'Reset the ground after heavy rain to the soil map');
  await says(page, 'Your answer');
  await press(page, 'button', 'Change soil pH');
  await says(page, 'Soil pH: your value');
  await says(page, 'No number? Choose a word:');
  for (const w of ['Strongly acid', 'Slightly acid', 'Neutral', 'Slightly alkaline', 'Strongly alkaline']) assert.ok(await pressed(page, 'Soil pH in words', w), `board: the word "${w}"`);
  await tapOption(page, 'Soil pH in words', 'Slightly alkaline');
  await press(page, 'button', 'Use my value');
  assert.equal((await edits(page)).soilPh, 7.6, 'board: a word is stored as its band\'s middle');
  await says(page, '7.6, slightly alkaline');
  assert.deepEqual(await pastEdge(page), [], 'board: nothing passes the right edge at 1280');
  await done(page);
});

failing('PFD5 (pf-d SiteMendoza at 390): "What limits plants here" with only the limiting lines and the Arid list count; "Not a limit here"; the Watering line with its counts and the members; the link to the panel; the Water card', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await mendoza({ width: 390 });
  const text = await section(page, 'What limits plants here', 20_000);
  const c = await engineCounts(page);
  for (const w of ['Rain a year', 'Counts are of the Arid list', 'The main limit here.', `${c[0].drier} of the ${c[0].fit} plants that fit your climate are recorded only where it is wetter than here`, 'Not a limit here:', 'Watering']) assert.ok(text.includes(w), `board: "What limits plants here" says "${w}"`);
  assert.ok(!text.includes('Hottest days Today'), 'board: a line that does not limit is not shown as a line');
  await control(page, 'button', 'Change rain a year');
  await says(page, `Rain only · ${c[0].drier} plants: “may need watering”`);
  await says(page, /\d of your 8 plants may need watering today: /);
  await says(page, 'Every figure, and yours: Your place in figures');
  await section(page, 'Water');
  await says(page, /With rain only, \d of your 8 plants may need watering today/);
  await press(page, 'button', 'Your place in figures');
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', 'board: the link opens the Place step');
  await section(page, 'Your place in figures');
  await done(page);
});

failing('PFD6 (pf-d F5): with no location the climate lines read "Not known: no location yet", with no Change; the soil and water lines can still be set', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('kiambu-8', { site: null, width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await says(page, 'Not known: no location yet');
  assert.ok(!(await has(page, aria('button', 'Change coldest nights'), 800)), 'board: no Change on a climate line with no location');
  await control(page, 'button', 'Change soil pH');
  await control(page, 'button', 'Change watering');
  await done(page);
});

failing('PFD7 (pf-d F9, F10): the room "Pots or a balcony" sets the Pots line "From your room" with no Reset; a neighbour\'s pH says its distance; a place with no soil says so', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('kiambu-8', { site: 'marseille', width: 1280 });
  await section(page, 'Your place in figures', 20_000);
  await says(page, /soil map, nearest square \d+ km away: a weaker guess/);
  await page.evaluate(() => { window.__ctTest.store.room.value = 'pots'; });
  await says(page, 'From your room');
  assert.ok(!(await has(page, aria('button', 'Reset pots or brought-in soil to your room'), 500)), 'board: no Reset on the room\'s value');
  await tapOption(page, 'Pots or brought-in soil', 'In the ground');
  await control(page, 'button', 'Reset pots or brought-in soil to your room');
  await page.evaluate(() => { window.__ctTest.store.location.value = { ...window.__ctTest.store.location.value, lookup: { ...window.__ctTest.store.location.value.lookup, soil: null } }; });
  await says(page, 'Not known · no data for your place or the squares next to it');
  await done(page);
});

failing('PFD8 (pf-d F6): the verdict chunk failed: the edit is kept, the toast reads "Checks could not run" with Retry, and Undo stays', { owner: 'pf-d', reason: BOARD }, async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await page.evaluate(() => { const s = window.__ctTest.store; s.verdictRule.value = null; s.verdictFailed.value = true; });
  await tapOption(page, 'Watering', 'Watered all year');
  assert.equal((await edits(page)).watering, 'all-year', 'board: the edit is kept');
  assert.ok(await page.waitForFunction(() => (window.__ctTest.store.toast.value?.text ?? '').includes('Checks could not run'), { timeout: 5000 }).then(() => true, () => false), `board: the toast says the checks could not run ("${await toastText(page)}")`);
  assert.ok(await page.evaluate(() => window.__ctTest.store.toast.value?.action?.label === 'Try again' || !!window.__ctTest.store.toast.value?.action), 'board: Retry on the toast');
  assert.ok(await page.evaluate(() => typeof window.__ctTest.store.toast.value?.undo === 'function'), 'board: Undo stays');
  await done(page);
});
