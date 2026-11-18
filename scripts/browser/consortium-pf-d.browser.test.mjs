// pf stream d, "Your place in figures" (chunk 3; v14 spec section 2 'pf-d', section 3): the boards
// SiteKiambu, PlaceDesk and SiteMendoza (the panel, "What limits plants here", the Watering line, the
// "Water" card) and the change-summary toasts, as tests, with the failure rows F1, F2, F5, F6, F9 and
// F10 of section 5. Each case was opened marked expected-fail under pf-d (scripts/expect-fail.mjs
// failing(), its reason the board's first missing word, pf-helpers.mjs BOARD) in pf-d's commit 0 and
// lost its marker in the commit that made it pass (pf-d commit 1: all eight). Board figures come from the engine on the
// installed release (pf-d-helpers.mjs engineCounts, the store's own inputs), never a board number.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries none: the panel is new (spec: "Delete: nothing; the 'Soil, likely' card and 'Tell us about
//   your spot' were never built").
import assert from 'node:assert/strict';
import test from 'node:test';
import { useHarness, aria, has } from './helpers.mjs';
import { control, done, focused, inOrder, pastEdge, press, says, section, sectionText, toastText } from './pf-helpers.mjs';
import { atBoardPlace, atPlace, edits, engineCounts, engineSides, fieldState, iconBefore, inputs, lookOf, mendoza, namesOf, placeStep, summary, tempEn } from './pf-d-helpers.mjs';

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
// The text of a line (its role="group" by name), spaces collapsed.
const lineText = (page, name) => page.evaluate((n) => (document.querySelector(`main [role="group"][aria-label="${n}"]`)?.innerText ?? '').replace(/\s+/g, ' ').trim(), name);
// Shifts both temperature lines 2 °C colder through the editor (the tick on, as it starts).
const twoColder = async (page) => {
  await press(page, 'button', 'Change coldest nights');
  await typeIn(page, '2');
  await press(page, 'button', 'Use my value');
  await summary(page);
};
const typeIn = async (page, value) => {
  const f = await page.$('main fieldset input[type="text"]');
  assert.ok(f, 'board: the editor has a number field');
  await f.click({ count: 3 });
  await page.keyboard.press('Backspace');
  await f.type(value);
};

test('PFD1 (pf-d SiteKiambu at 390): under the place questions, "Your place in figures" with every line in its group, today → 2071–2099 and its source, Change on each; the main limit open with its periods and counts from the engine; the folds closed', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  const text = await section(page, 'Your place in figures', 20_000);
  await inOrder(page, ['How much room do you have?', 'Your place in figures', 'CLIMATE', 'Coldest nights', 'Hottest days', 'Rain a year', 'Dry months in a row', 'WATER', 'Watering', 'SOIL', 'Soil pH', 'The ground after heavy rain', 'Pots or brought-in soil', 'What it means for your choice']);
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
  await says(page, `Counts are of the ${c[0].of} plants on the three nearest lists (Mediterranean, Tropical, Temperate)`);
  await says(page, 'Later periods follow the middle emissions path (SSP2-4.5).');
  assert.equal(await expanded(page, 'After release: light on your plot, wind and sea'), 'false', 'board: "After release" starts closed');
  assert.equal(await expanded(page, 'Not asked, and why'), 'false', 'board: "Not asked, and why" starts closed on the phone');
  await press(page, 'button', 'After release: light on your plot, wind and sea');
  await says(page, 'Wind and sea after release');
  assert.deepEqual(await pastEdge(page), [], 'board: nothing passes the right edge at 390');
  await done(page);
});

test('PFD2 (pf-d SiteKiambu temperature editor, Toasts): Change opens "Coldest nights: your value" with a shift first, the tick for the hottest days and a preview per period; "Use my value" writes both shifts and the summary names the periods, the plants and the holes; the row reads "Your value" with Reset; Reset goes back and the focus moves to Change (F2)', async () => {
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

test('PFD3 (pf-d F1): a number the line cannot take is marked invalid with its range, "Use my value" refuses and keeps the focus, nothing is written; "12,5" reads with a comma as the decimal mark', async () => {
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

test('PFD4 (pf-d PlaceDesk at 1280): every line open in two columns; the choices changed in place with one tap and their counts; the pH editor with five words; "Not asked, and why" open', async () => {
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

test('PFD5 (pf-d SiteMendoza at 390): "What limits plants here" with only the limiting lines and the Arid list count; "Not a limit here"; the Watering line with its counts and the members; the link to the panel; the Water card', async () => {
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
  await press(page, 'button', 'Every figure, and yours: Your place in figures');
  assert.equal(await page.evaluate(() => window.__ctTest.store.view.value), 'start', 'board: the link opens the Place step');
  await section(page, 'Your place in figures');
  await done(page);
});

test('PFD6 (pf-d F5): with no location the climate lines read "Not known: no location yet", with no Change; the soil and water lines can still be set', async () => {
  const page = await placeStep('kiambu-8', { site: null, width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await says(page, 'Not known: no location yet');
  assert.ok(!(await has(page, aria('button', 'Change coldest nights'), 800)), 'board: no Change on a climate line with no location');
  await control(page, 'button', 'Change soil pH');
  await control(page, 'button', 'Change watering');
  await done(page);
});

test('PFD7 (pf-d F9, F10): the room "Pots or a balcony" sets the Pots line "From your room" with no Reset; a neighbour\'s pH says its distance; a place with no soil says so', async () => {
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

test('PFD8 (pf-d F6): the verdict chunk failed: the edit is kept, the toast reads "Checks could not run" with Retry, and Undo stays', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await page.evaluate(() => { const s = window.__ctTest.store; s.verdictRule.value = null; s.verdictFailed.value = true; });
  await press(page, 'button', 'Change watering');
  await tapOption(page, 'Watering', 'Watered all year');
  assert.equal((await edits(page)).watering, 'all-year', 'board: the edit is kept');
  assert.ok(await page.waitForFunction(() => (window.__ctTest.store.toast.value?.text ?? '').includes('Checks could not run'), { timeout: 5000 }).then(() => true, () => false), `board: the toast says the checks could not run ("${await toastText(page)}")`);
  assert.ok(await page.evaluate(() => window.__ctTest.store.toast.value?.action?.label === 'Try again' || !!window.__ctTest.store.toast.value?.action), 'board: Retry on the toast');
  assert.ok(await page.evaluate(() => typeof window.__ctTest.store.toast.value?.undo === 'function'), 'board: Undo stays');
  await done(page);
});

// ---- fix round 1, batch 1 (review findings BC1-BC14) ----

test('PFD9 (pf-d BC1, BC2, BC7, BC9, BC12; SiteKiambu "The rows with your value" at 390): closed rows "26 → 28 °C · (pin) climate map"; after 2 °C colder the opened Hottest days row says warmth over the year from the cool side only, "with your values", and the heat-edge count, with no take-it sentence; its periods "24 °C" over "map 26"; Reset is the ochre link', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  const i0 = await inputs(page);
  const days = await lineText(page, 'Hottest days');
  assert.match(days, new RegExp(`^Hottest days ${Math.round(i0.days.value)} → \\d+ °C · climate map`), `board: the closed row writes whole degrees and the unit once ("${days}")`);
  assert.match(await lineText(page, 'Rain a year'), /^Rain a year [\d,]+ → [\d,]+ mm · climate map/, 'board: rain writes its unit once on the range');
  assert.equal(await iconBefore(page, 'From the climate map'), true, 'board: the pin before "From the climate map"');
  assert.equal(await iconBefore(page, 'climate map', 'main [role="group"][aria-label="Hottest days"]'), true, 'board: the pin before a closed row\'s "climate map"');
  assert.equal(await iconBefore(page, 'soil map', 'main [role="group"][aria-label="Soil pH"]'), true, 'board: the pin before "soil map"');
  await twoColder(page);
  const reset = await lookOf(page, 'button', 'Reset coldest nights to the climate map');
  assert.ok(reset, 'board: Reset on the grower\'s value');
  assert.ok(reset.underline && reset.border && reset.color === reset.accent, `board: Reset is the ochre underlined link (${JSON.stringify(reset)})`);
  await press(page, 'button', 'Hottest days');
  const e = await engineSides(page);
  const a = e.sides[0];
  const row = await lineText(page, 'Hottest days');
  assert.ok(!row.includes('take it today'), `board: no take-it sentence where heat is not a limit ("${row}")`);
  const cool = a.cool.outside + a.cool.edge;
  assert.ok(row.includes(`A smaller limit here: ${cool} of the ${e.of} want more warmth over the year`), `board: the cool side only, ${cool} ("${row}")`);
  assert.match(row, /\(\d+\.\d °C today with your values\)/, 'board: "with your values" when shifts apply');
  assert.ok(row.includes(`: ${a.cool.outside} are outside their range, ${a.cool.edge} near its edge.`), `board: ${a.cool.outside} outside, ${a.cool.edge} near the edge ("${row}")`);
  if (a.hot.edge) assert.ok(row.includes(a.hot.edge === 1 ? '1 is near its heat limit.' : `${a.hot.edge} are near their heat limit.`), `board: the heat-edge count ${a.hot.edge} ("${row}")`);
  const i = await inputs(page);
  assert.ok(row.includes(`Today ${Math.round(i.days.value)} °C map ${Math.round(i.days.map)}`), `board: "${Math.round(i.days.value)} °C" over "map ${Math.round(i.days.map)}" ("${row}")`);
  await done(page);
});

test('PFD10 (pf-d BC3, BC4, BC8; PlaceDesk at 1280, SiteKiambu): the drainage line names the soil map\'s texture while not answered and "in place of the soil map\'s clay loam" once answered; the summary under the head is the dark bar with its own Undo; "(?) Not answered"', async () => {
  const k = await placeStep('kiambu-8', { width: 390 });
  await section(k, 'Your place in figures', 20_000);
  assert.match(await lineText(k, 'The ground after heavy rain'), /^The ground after heavy rain Likely holds water: clay · soil map/, 'board: the soil map\'s texture as the unanswered value');
  assert.equal(await iconBefore(k, 'Not answered', 'main [role="group"][aria-label="Watering"]'), true, 'board: the (?) inside "Not answered"');
  await done(k);
  const page = await placeStep('seville-board', { site: 'seville', width: 1280 });
  await section(page, 'Your place in figures', 20_000);
  assert.ok((await lineText(page, 'The ground after heavy rain')).includes('Likely holds water: clay loam'), 'board: Seville\'s texture while not answered');
  await tapOption(page, 'The ground after heavy rain', 'Stays wet for days');
  const text = await summary(page);
  assert.ok((await lineText(page, 'The ground after heavy rain')).includes('Your answer in place of the soil map’s clay loam'), 'board: the answer in place of the texture');
  const bar = await page.evaluate((t) => {
    const panel = document.querySelector('main section[aria-label="Your place in figures"]');
    const el = [...panel.querySelectorAll('[role="status"]')].find((x) => x.textContent.replace(/\s+/g, ' ').includes(t.slice(0, 40)));
    if (!el) return null;
    const undo = [...el.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo');
    const probe = document.createElement('span'); probe.style.color = 'var(--text)'; el.appendChild(probe);
    const ink = getComputedStyle(probe).color; probe.remove();
    return { bg: getComputedStyle(el).backgroundColor, ink, undo: !!undo, headAbove: panel.querySelector('h2').getBoundingClientRect().bottom <= el.getBoundingClientRect().top };
  }, text);
  assert.ok(bar, 'board: the summary stands under the panel head');
  assert.ok(bar.undo && bar.headAbove && bar.bg === bar.ink, `board: the dark bar with Undo under the head (${JSON.stringify(bar)})`);
  await page.evaluate(() => [...document.querySelector('main section[aria-label="Your place in figures"] [role="status"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo').click());
  assert.ok(await page.waitForFunction(() => !window.__ctTest.store.siteEdits.value.drainage, { timeout: 4000 }).then(() => true, () => false), 'board: the bar\'s Undo puts the answer back');
  await done(page);
});

test('PFD11 (pf-d BC10, BC11, BC12; SiteKiambu temperature editor at 390): the field and °C on one row, "✓ colder | warmer" as one segmented pair under it; "✓ Use my value"; the ochre "I know my plot’s figure"; no Change on the line while its editor is open; the preview\'s semicolon and bold runs; the Reset toast "12.0 °C and 26 °C today"', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await press(page, 'button', 'Change coldest nights');
  assert.ok(!(await lookOf(page, 'button', 'Change coldest nights')), 'board: no Change on Coldest nights while its editor is open');
  const pair = await page.evaluate(() => {
    const g = document.querySelector('main fieldset [role="group"][aria-label="Colder or warmer"]');
    const f = document.querySelector('main fieldset input[type="text"]');
    if (!g || !f) return null;
    const bs = [...g.querySelectorAll('button')], fb = f.getBoundingClientRect();
    return { n: bs.length, sameRow: bs.length === 2 && Math.abs(bs[0].getBoundingClientRect().top - bs[1].getBoundingClientRect().top) < 2, below: bs[0].getBoundingClientRect().top >= fb.bottom - 1, check: bs.map((b) => b.getAttribute('aria-pressed') === 'true' ? !!b.querySelector('svg') : !b.querySelector('svg')) };
  });
  assert.ok(pair && pair.n === 2 && pair.sameRow && pair.below && pair.check.every(Boolean), `board: the segmented pair under the field, ✓ on the pressed one (${JSON.stringify(pair)})`);
  const use = await lookOf(page, 'button', 'Use my value');
  assert.ok(use?.icon, 'board: "✓ Use my value"');
  const know = await lookOf(page, 'button', 'I know my plot’s figure');
  assert.ok(know && know.color === know.accent && know.underline, `board: the ochre underlined link (${JSON.stringify(know)})`);
  await typeIn(page, '2');
  const i = await inputs(page);
  const prev = await page.evaluate(() => { const p = document.querySelector('main fieldset [aria-live="polite"]'); return p ? { text: p.innerText.replace(/\s+/g, ' ').trim(), bold: [...p.querySelectorAll('strong, b')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()) } : null; });
  assert.ok(prev, 'board: the preview');
  assert.match(prev.text, new RegExp(`^With your value: nights ${tempEn(i.nights.value - 2).replace('.', '\\.')} today, \\S+ °C by 2041–2070, \\S+ °C by 2071–2099; hottest days ${Math.round(i.days.value - 2)} °C, \\d+ °C, \\d+ °C\\. The same 2 °C in every period: `), `board: the preview's form ("${prev.text}")`);
  assert.deepEqual(prev.bold, ['With your value:', 'The same 2 °C in every period:'], 'board: the bold runs');
  await press(page, 'button', 'Use my value');
  await summary(page);
  await press(page, 'button', 'Reset coldest nights to the climate map');
  const back = await summary(page);
  assert.ok(back.startsWith(`Coldest nights and hottest days back to the climate map: ${tempEn(i.nights.value)} and ${Math.round(i.days.value)} °C today.`), `board: the Reset toast's figures ("${back}")`);
  await done(page);
});

test('PFD12 (pf-d BC13, BC14; SiteKiambu, PlaceDesk): the nights line says "(lowland tropical plants)"; "What it means" says who drops out and names the plants that come into range by 2041–2070; a list the nights do not limit reads "Not a limit for this list, nor is warmth over the year…"; the heat form links to the palette in 2041–2070', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  const e = await engineSides(page);
  await says(page, `${e.sides[0].cold.outside} want warmer nights (lowland tropical plants), ${e.sides[0].mild.outside} are recorded only where winters are colder`);
  const top = Object.entries(e.drops).sort((x, y) => y[1] - x[1])[0]?.[0];
  assert.equal(top, 'mild', 'engine: at Kiambu most drop out on the mild side');
  await says(page, 'Most that drop out are recorded only where winters are colder.');
  const names = await namesOf(page, e.arrivals);
  assert.ok(names.length >= 2, 'engine: plants come into range by 2041–2070');
  const m = /Lowland tropical plants that want more warmth, like (.+?) and (.+?), come into range by 2041–2070\./.exec(await sectionText(page, 'Your place in figures'));
  assert.ok(m, 'board: the plants that come into range');
  assert.ok(names.includes(m[1]) && names.includes(m[2]), `board: "${m[1]}" and "${m[2]}" come into range by the engine`);
  await done(page);
  const sev = await placeStep('seville-board', { site: 'seville', width: 1280 });
  await atBoardPlace(sev, 'seville-board');
  await section(sev, 'Your place in figures', 20_000);
  const s = await engineSides(sev);
  const t0 = s.sides[0], nightsFree = !t0.cold.outside && !t0.mild.outside && !t0.cool.outside;
  const nights = await lineText(sev, 'Coldest nights');
  if (nightsFree) assert.ok(nights.includes('Not a limit for this list, nor is warmth over the year, which is worked out from these two lines. Frosts still happen.'), `board: the not-a-limit sentence ("${nights}")`);
  else assert.ok(!nights.includes('nor is warmth over the year'), 'engine: a plant is outside on the night or warmth side today, so the sentence would be false');
  assert.ok(!/0 want warmer nights, 0 are recorded/.test(nights), 'board: never zero counts in place of the sentence');
  const meaning = await sectionText(sev, 'Your place in figures');
  assert.ok(meaning.includes('What it means for your choice. Summer heat decides. A tree planted today is still young in 2041: look at your palette in 2041–2070 before you plant the long-lived ones.'), `board: Seville's heat form ("${meaning.slice(meaning.indexOf('What it means'), meaning.indexOf('What it means') + 160)}")`);
  await press(sev, 'button', 'look at your palette in 2041–2070');
  assert.equal(await sev.evaluate(() => window.__ctTest.store.period.value), '2041-2070', 'board: the link sets the period');
  await done(sev);
});

// ---- fix round 1, batch 2 (review findings BC15-BC23, R1-R5) ----

// The text of the first paragraph in a line (role="group" by name) that says `words`, with its bold runs.
const paraIn = (page, group, words) => page.evaluate((g, w) => {
  const el = [...document.querySelectorAll(`main [role="group"][aria-label="${g}"] p`)].find((p) => p.innerText.replace(/\s+/g, ' ').includes(w));
  if (!el) return null;
  return { text: el.innerText.replace(/\s+/g, ' ').trim(), bold: [...el.querySelectorAll('strong, b')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()), rule: getComputedStyle(el).borderLeftStyle, weight: getComputedStyle(el.querySelector('strong, b') ?? el).fontWeight };
}, group, words);
// The section under the heading `h` (an h2), by its own words.
const sectionBy = (page, h, fn) => page.evaluate((hh, f) => {
  const s = [...document.querySelectorAll('main section')].find((x) => x.querySelector('h2')?.textContent.trim() === hh);
  return s ? new Function('s', `return (${f})(s)`)(s) : null;
}, h, fn.toString());

test('PFD13 (pf-d BC15, BC16, BC18, BC21; PlaceDesk at 1280): rain and dry months say a value of yours is a shift; a flat dry run "does not get longer"; the Pots line "(?) Not answered taken as in the ground" and the board\'s room sentence; pH words "7.3–8.0", "above 8.0"; "After release" open; the SSP line once', async () => {
  const page = await placeStep('seville-board', { site: 'seville', width: 1280 });
  await atBoardPlace(page, 'seville-board');
  await section(page, 'Your place in figures', 20_000);
  const rain = await lineText(page, 'Rain a year');
  assert.ok(rain.includes('A value of yours is a shift in mm: “my plot gets about 100 mm less rain a year than the map”.'), `board: the rain line's shift sentence ("${rain}")`);
  const dry = await lineText(page, 'Dry months in a row');
  const m = /Today (\d+) 2041–2070 (\d+) 2071–2099 (\d+)/.exec(dry);
  assert.ok(m, `board: the dry months' three periods ("${dry}")`);
  const flat = m[1] === m[2] && m[2] === m[3];
  assert.ok(flat, 'engine: Seville\'s board slots keep the dry run flat');
  assert.ok(dry.includes(`${m[1]} dry months in a row, and it does not get longer. Shown for your reading: the note on dryness comes from the rain line. A value of yours is a shift in whole months: “about 1 month longer”.`), `board: the dry line ("${dry}")`);
  const pots = await lineText(page, 'Pots or brought-in soil');
  assert.ok(pots.includes('Not answered taken as in the ground'), `board: "(?) Not answered taken as in the ground" ("${pots}")`);
  assert.ok(!pots.includes('also what is taken'), 'board: no "also what is taken" on an unanswered line');
  assert.ok(pots.includes('“Pots or a balcony” under Room sets this line, with its source and Reset.'), `board: the room sentence ("${pots}")`);
  await press(page, 'button', 'Change soil pH');
  const words = await page.evaluate(() => [...document.querySelectorAll('main [role="group"][aria-label="Soil pH in words"] button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
  assert.deepEqual(words, ['Strongly acid below 5.5', 'Slightly acid 5.5–6.5', 'Neutral 6.5–7.3', 'Slightly alkaline 7.3–8.0', 'Strongly alkaline above 8.0'], 'board: the pH words with one decimal');
  assert.equal(await expanded(page, 'After release: light on your plot, wind and sea'), 'true', 'board: "After release" open on the laptop');
  await says(page, 'Wind and sea after release');
  const panel = await sectionText(page, 'Your place in figures');
  assert.equal(panel.split('Later periods follow the middle emissions path (SSP2-4.5).').length - 1, 1, 'board: the emissions path said once (in the climate note)');
  await done(page);
});

test('PFD14 (pf-d BC16, BC19; SiteKiambu at 390): the foot counts "the three nearest lists (Mediterranean, Tropical, Temperate)"; the opened row\'s paragraph: the moves in bold body text, a second look today only, no quote box; gone after Reset; none where nothing moved', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  const c = await engineCounts(page);
  await says(page, `Counts are of the ${c[0].of} plants on the three nearest lists (Mediterranean, Tropical, Temperate): Subtropical has no list of its own yet`);
  await twoColder(page);
  const d = await paraIn(page, 'Coldest nights', 'Today:');
  assert.ok(d, 'board: the opened row says what changed');
  assert.match(d.text, /^Today: .+; by 2071–2099: .+, of the \d+\./, `board: the moves, of the list ("${d.text}")`);
  assert.ok(!/no longer needs? a second look/.test(d.text), `board: never "no longer need a second look" ("${d.text}")`);
  const later = d.text.slice(d.text.indexOf('by 2071–2099'), d.text.indexOf(', of the'));
  assert.ok(!later.includes('second look'), `board: no second look by 2071–2099 ("${later}")`);
  assert.equal(d.bold.length, 1, `board: one bold run (${JSON.stringify(d.bold)})`);
  assert.ok(d.bold[0].startsWith('Today:') && d.text.startsWith(`${d.bold[0]}, of the`), `board: the moves in bold, "of the" after ("${d.bold[0]}")`);
  assert.equal(d.rule, 'none', 'board: no quote box');
  await press(page, 'button', 'Reset coldest nights to the climate map');
  await summary(page);
  assert.equal(await paraIn(page, 'Coldest nights', 'Today:'), null, 'board: after Reset only the toast says it');
  await press(page, 'button', 'Change the ground after heavy rain');
  await tapOption(page, 'The ground after heavy rain', 'Stays wet for days');
  await summary(page);
  assert.equal(await paraIn(page, 'The ground after heavy rain', 'no change in what fits'), null, 'board: nothing moved, no paragraph on the drainage line');
  await done(page);
});

test('PFD15 (pf-d BC22, BC23; SiteMendoza at 390): the limits card\'s Watering line with its icon, its first sentence bold in one paragraph, regular option labels but the chosen, the whole ochre link; the Water card\'s drop chips, the bold rain figure and "of the Arid list"', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  assert.equal(await iconBefore(page, 'Watering', 'main [role="group"][aria-label="Watering"]'), true, 'board: the watering-can before "Watering"');
  const p = await paraIn(page, 'Watering', 'may need watering today');
  assert.ok(p, 'board: the members sentence');
  assert.equal(p.bold.length, 1, `board: one bold run (${JSON.stringify(p.bold)})`);
  assert.match(p.bold[0], /^\d+ of your 8 plants may need watering today:$/, `board: the bold run ("${p.bold[0]}")`);
  assert.ok(p.text.includes('Dryness never changes a plant’s fit.'), 'board: one paragraph with the dryness sentence');
  const weights = await page.evaluate(() => [...document.querySelectorAll('main [role="group"][aria-label="Watering"] button[aria-pressed]')].slice(0, 3).map((b) => ({ on: b.getAttribute('aria-pressed') === 'true', w: [...b.querySelectorAll('*')].concat([b]).map((e) => getComputedStyle(e).fontWeight)[0], label: getComputedStyle(b.querySelector('span') ?? b).fontWeight })));
  for (const w of weights) assert.equal(w.label, w.on ? '600' : '400', `board: option label weight (${JSON.stringify(weights)})`);
  const link = await lookOf(page, 'button', 'Every figure, and yours: Your place in figures');
  assert.ok(link && link.color === link.accent, `board: the whole sentence is one ochre link (${JSON.stringify(link)})`);
  const c = await engineCounts(page);
  const water = await sectionBy(page, 'Water', (s) => ({
    text: s.innerText.replace(/\s+/g, ' ').trim(),
    chips: [...s.querySelectorAll('li')].map((li) => !!li.firstElementChild?.querySelector('svg')),
    bold: [...s.querySelectorAll('p')][0]?.querySelector('strong, b')?.textContent.trim() ?? null,
  }));
  assert.ok(water, 'board: the Water card');
  assert.ok(water.chips.length && water.chips.every(Boolean), `board: the drop icon on every chip (${JSON.stringify(water.chips)})`);
  assert.match(water.bold ?? '', /^\d+ mm of rain a year$/, `board: the rain figure in bold ("${water.bold}")`);
  assert.ok(water.text.includes(`Of the ${c[0].fit} plants of the Arid list that fit your climate`), `board: the list named ("${water.text.slice(-200)}")`);
  await done(page);
  const es = await mendoza({ width: 390, lang: 'es' });
  const agua = await sectionBy(es, 'El agua', (s) => s.innerText.replace(/\s+/g, ' ').trim());
  assert.ok(agua, 'board: "El agua"');
  assert.ok(agua.includes('de la lista Árida que entran en tu clima'), `board: "de la lista Árida" ("${agua.slice(-200)}")`);
  assert.ok(/: tu lugar es más seco que donde está registrado\./.test(agua) && !agua.includes('donde está registrada'), 'board: "donde está registrado"');
  await done(es);
});

test('PFD16 (pf-d R2): while the checks are not available, "What limits plants here" says so ("Counting…", "Checks could not run.") and never "Not a limit here"', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  await page.evaluate(() => { const s = window.__ctTest.store; s.verdictRule.value = null; s.verdictFailed.value = true; });
  const failed = await page.waitForFunction(() => { const s = [...document.querySelectorAll('main section')].find((x) => x.querySelector('h2')?.textContent.trim() === 'What limits plants here'); return s && s.innerText.includes('Checks could not run.') ? s.innerText.replace(/\s+/g, ' ') : null; }, { timeout: 6000 }).then((h) => h.jsonValue(), () => null);
  assert.ok(failed, 'board: the card says the checks could not run');
  assert.ok(!failed.includes('Not a limit here'), `board: no claim without counts ("${failed}")`);
  await page.evaluate(() => { window.__ctTest.store.verdictFailed.value = false; });
  const counting = await page.waitForFunction(() => { const s = [...document.querySelectorAll('main section')].find((x) => x.querySelector('h2')?.textContent.trim() === 'What limits plants here'); return s && s.innerText.includes('Counting…') ? s.innerText.replace(/\s+/g, ' ') : null; }, { timeout: 6000 }).then((h) => h.jsonValue(), () => null);
  assert.ok(counting, 'board: the card says it is counting');
  assert.ok(!counting.includes('Not a limit here'), `board: no claim while counting ("${counting}")`);
  await done(page);
});

test('PFD17 (pf-d R3): with no location climate, a soil or water answer gets its summary at once (no "Counting…" that never ends)', async () => {
  const page = await placeStep('kiambu-8', { site: null, width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await page.evaluate(() => { const s = window.__ctTest.store; s.verdictRule.value = null; s.verdictFailed.value = false; });
  await press(page, 'button', 'Change pots or brought-in soil');
  await tapOption(page, 'Pots or brought-in soil', 'Pots or brought-in soil');
  assert.equal((await edits(page)).pots, true, 'board: the answer is written');
  assert.match(await summary(page, 3000), /^Pots or brought-in soil set to “Pots or brought-in soil”\. Your 8 plants are kept\./, 'board: the summary arrives');
  await done(page);
});

test('PFD18 (pf-d R5): a 60-plant palette in a dry place: the limits card counts the plants that may need watering (no run of names, "+ N more" to show them), the Water card folds its list and counts the rest; the toast counts the hinted plants', async () => {
  const page = await mendoza({ width: 390 });
  await page.evaluate(() => { const s = window.__ctTest.store; s.members.value = [...new Set([...s.members.value, ...(s.pool.value ?? []).map((t) => t.id)])].slice(0, 60); });
  assert.ok(await page.waitForFunction(() => { const s = window.__ctTest.store; return s.memberTaxa.value.length === 60 && !!s.memberVerdicts.value; }, { timeout: 20_000 }).then(() => true, () => false), 'the 60 plants');
  await section(page, 'What limits plants here', 20_000);
  const names = await page.evaluate(() => window.__ctTest.store.memberTaxa.value.map((t) => t.names?.en || t.canonical_name));
  const p = await paraIn(page, 'Watering', 'may need watering today');
  assert.ok(p, 'board: the members sentence');
  assert.match(p.bold[0] ?? '', /^\d+ of your 60 plants may need watering today:$/, `board: the count in bold ("${p.bold[0]}")`);
  const sentence = p.text.slice(0, p.text.indexOf('Dryness never changes'));
  assert.ok(names.filter((n) => sentence.includes(n)).length <= 3, `board: no run of names past the size rule ("${sentence.slice(0, 300)}")`);
  const water = await sectionBy(page, 'Water', (s) => ({ items: s.querySelectorAll('li').length, more: [...s.querySelectorAll('button')].some((b) => /^\+ \d+ more/.test(b.textContent.trim())), foot: [...s.querySelectorAll('p')].pop()?.innerText.replace(/\s+/g, ' ').trim() ?? '' }));
  if (water) {
    assert.ok(water.items <= 3 || water.more, `board: the Water card folds past the size rule (${JSON.stringify(water)})`);
    assert.ok(names.filter((n) => water.foot.includes(n)).length === 0, `board: the rest counted, not named ("${water.foot.slice(0, 200)}")`);
  }
  await page.evaluate(() => window.__ctTest.store.openFigure(null));
  await section(page, 'Your place in figures', 20_000);
  await press(page, 'button', 'Change the ground after heavy rain');
  await tapOption(page, 'The ground after heavy rain', 'Stays wet for days');
  const toast = await summary(page);
  assert.ok(names.filter((n) => toast.includes(n)).length === 0, `board: the toast names no plant past the size rule ("${toast.slice(0, 300)}")`);
  await done(page);
});

test('PFD19 (pf-d R1): where too little warmth over the year is the main limit (Kerguelen), the Hottest days row leads with it ("The main limit here: … want more warmth"), never "Not a limit" or "Summer heat decides"; the palette shows that row', async () => {
  const page = await placeStep('kiambu-8', { site: null, width: 390 });
  await atPlace(page, 'kerguelen');
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 }).then(() => true, () => false), 'the verdicts');
  await section(page, 'Your place in figures', 20_000);
  const e = await engineSides(page);
  const most = (f) => Math.max(...e.sides.map(f));
  const nights = most((s) => s.cold.outside + s.mild.outside), warm = most((s) => s.cool.outside), heat = most((s) => s.hot.outside);
  assert.ok(warm > nights && warm > heat, `engine: warmth is the main limit at Kerguelen (warmth ${warm}, nights ${nights}, heat ${heat})`);
  assert.equal(await expanded(page, 'Hottest days'), 'true', 'board: the main limit\'s row opens first');
  const row = await lineText(page, 'Hottest days');
  assert.ok(row.includes('The main limit here: ') && row.includes('want more warmth over the year'), `board: the warmth lead ("${row}")`);
  assert.ok(!/Not a limit for this list|A smaller limit here/.test(row), `board: the row does not contradict itself ("${row}")`);
  const text = await sectionText(page, 'Your place in figures');
  assert.ok(!text.includes('Summer heat decides'), 'board: never summer heat where warmth limits');
  assert.ok(text.includes('Warmth over the year decides'), 'board: the warmth meaning');
  await page.evaluate(() => { window.__ctTest.store.view.value = 'matrix'; });
  const limits = await section(page, 'What limits plants here', 20_000);
  assert.ok(limits.includes('The main limit here: ') && !limits.includes('Not a limit for this list'), `board: the palette's limiting row ("${limits.slice(0, 400)}")`);
  await done(page);
});
