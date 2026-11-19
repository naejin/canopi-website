// pf stream d, "Your place in figures" (chunk 3; v14 spec section 2 'pf-d', section 3): the boards
// SiteKiambu, PlaceDesk and SiteMendoza (the panel, "What limits plants here", the Watering line, the
// "Water" card) and the change-summary toasts, as tests, with the failure rows F1-F7, F9-F11 and F28
// (reported only) of section 5 and the section 6 neighbours at 320, 390, 960 and 1280. Board figures
// come from the engine on the installed release (pf-d-helpers.mjs engineCounts and engineSides call the
// core's lineCounts, limitStatus and rangeMoves on the page's own verdicts), never a board number.
// Cases by round (each opened marked expected-fail under pf-d with scripts/expect-fail.mjs failing(),
// and unmarked in the commit that made it pass):
//   commit 0 and commit 1: PFD1-PFD8 (the boards);
//   fix round 1: batch 1 PFD9-PFD14, batch 2 PFD15-PFD19, batch 3 PFD20-PFD31, batch 4 PFD32-PFD36;
//   fix round 2, batch 1: PFD37-PFD40 (R2/C2, R4, R5, R7).
// One marker is left: PFD32 is expected-fail until main's chunk-3 hand-off makes state/location.ts read
// the soil tile ({ soil: true }, review C4); it loses its marker in that merge.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries none: the panel is new (spec: "Delete: nothing; the 'Soil, likely' card and 'Tell us about
//   your spot' were never built").
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { useHarness, aria, has } from './helpers.mjs';
import { loadCase, control, done, focused, inOrder, pastEdge, press, says, saysNot, section, sectionText, toastText, withStorage } from './pf-helpers.mjs';
import { searchFor } from './pf-c-helpers.mjs';
import { failing } from '../expect-fail.mjs';
import { atBoardPlace, atPlace, edits, movedTo, engineCounts, engineSides, fieldState, iconBefore, inputs, lookOf, mendoza, namesOf, placeStep, summary, tempEn } from './pf-d-helpers.mjs';

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
  for (const w of ['Rain a year', 'Counts are of the Arid list', 'The main limit here.', `${c[0].drier} of the ${c[0].fit} plants that fit your climate are recorded only where it is wetter than here`, 'Watering']) assert.ok(text.includes(w), `board: "What limits plants here" says "${w}"`);
  // Which other lines limit comes from the engine (A5: every line that limits is shown, the others said
  // as "Not a limit here"); the board's Mendoza slots had the rain alone.
  const { status } = await engineSides(page);
  const nights = status.nights.n, heat = status.days.n + status.warmth.n;
  const shown = await sectionBy(page, 'What limits plants here', (s) => [...s.querySelectorAll('[role="group"][aria-label]')].map((g) => g.getAttribute('aria-label')));
  assert.equal(shown.includes('Coldest nights'), nights > 0, `A5: the nights line shown only when it limits (${nights} outside; lines ${JSON.stringify(shown)})`);
  assert.equal(shown.includes('Hottest days'), heat > 0, `A5: the hottest days line shown only when it limits (${heat} outside; lines ${JSON.stringify(shown)})`);
  assert.equal(text.includes('Not a limit here:'), !nights || !heat, 'A5: "Not a limit here" for the lines that do not limit');
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
  assert.equal(await page.evaluate(() => window.__ctTest.store.toast.value?.action?.label ?? null), 'Try again', 'board: Retry on the toast, by its label');
  // F6: the lines' counts read "not checked" while the checks cannot run (never a count from partial data).
  await press(page, 'button', 'Coldest nights');
  assert.match(await lineText(page, 'Coldest nights'), /not checked/, 'F6: the line counts read not checked');
  assert.ok(await page.evaluate(() => typeof window.__ctTest.store.toast.value?.undo === 'function'), 'board: Undo stays');
  await done(page);
});

// ---- fix round 1, batch 1 (review findings BC1-BC14) ----

test('PFD9 (pf-d BC1, BC2, BC7, BC9, BC12; SiteKiambu "The rows with your value" at 390): closed rows "26 → 28 °C · (pin) climate map"; after 2 °C colder the opened Hottest days row says warmth over the year from the cool side only, "with your values", and the heat-edge count with no take-it sentence, or (heat limiting in a later period, R2) the take-it counts; its periods "24 °C" over "map 26"; Reset is the ochre link', async () => {
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
  // Heat limits when a plant is outside on the hot side in any period (core limitStatus, R2): then the
  // row says how many take it in each period; else no take-it sentence (the board's Kiambu rows).
  if (e.status.days.state === 'limits') assert.match(row, /take it today, \d+ by 2041–2070, \d+ by 2071–2099/, `R2: heat limits by ${e.status.days.period}: the row says the counts ("${row}")`);
  else assert.ok(!row.includes('take it today'), `board: no take-it sentence where heat is not a limit ("${row}")`);
  const cool = a.cool.outside + a.cool.edge;
  assert.ok(row.includes(`A smaller limit here: ${cool} of the ${e.of} want more warmth over the year`), `board: the cool side only, ${cool} ("${row}")`);
  assert.match(row, /\(\d+\.\d °C today with your values\)/, 'board: "with your values" when shifts apply');
  assert.ok(row.includes(`: ${a.cool.outside} are outside their range, ${a.cool.edge} near its edge.`), `board: ${a.cool.outside} outside, ${a.cool.edge} near the edge ("${row}")`);
  if (a.hot.edge && e.status.days.state !== 'limits') assert.ok(row.includes(a.hot.edge === 1 ? '1 is near its heat limit.' : `${a.hot.edge} are near their heat limit.`), `board: the heat-edge count ${a.hot.edge} ("${row}")`);
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
    const bar = [...panel.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo')?.parentElement;
    const el = bar && bar.textContent.replace(/\s+/g, ' ').includes(t.slice(0, 40)) ? bar : null;
    if (!el) return null;
    const undo = [...el.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo');
    const probe = document.createElement('span'); probe.style.color = 'var(--text)'; el.appendChild(probe);
    const ink = getComputedStyle(probe).color; probe.remove();
    return { bg: getComputedStyle(el).backgroundColor, ink, undo: !!undo, headAbove: panel.querySelector('h2').getBoundingClientRect().bottom <= el.getBoundingClientRect().top };
  }, text);
  assert.ok(bar, 'board: the summary stands under the panel head');
  assert.ok(bar.undo && bar.headAbove && bar.bg === bar.ink, `board: the dark bar with Undo under the head (${JSON.stringify(bar)})`);
  await page.evaluate(() => [...document.querySelector('main section[aria-label="Your place in figures"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo').click());
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
  assert.equal(e.moves.dropSide, 'mild', 'engine: at Kiambu most drop out on the mild side');
  await says(page, 'Most that drop out are recorded only where winters are colder.');
  const names = await namesOf(page, e.moves.arrivals);
  assert.ok(names.length >= 2, 'engine: plants come into range by 2041–2070');
  const m = /Lowland tropical plants that want more warmth, like (.+?) and (.+?), come into range by 2041–2070\./.exec(await sectionText(page, 'Your place in figures'));
  assert.ok(m, 'board: the plants that come into range');
  assert.ok(names.includes(m[1]) && names.includes(m[2]), `board: "${m[1]}" and "${m[2]}" come into range by the engine`);
  await done(page);
  const sev = await placeStep('seville-board', { site: 'seville', width: 1280 });
  await atBoardPlace(sev, 'seville-board');
  await section(sev, 'Your place in figures', 20_000);
  const s = await engineSides(sev);
  const nightsFree = s.status.nights.state === 'free' && s.status.warmth.state === 'free';
  const nights = await lineText(sev, 'Coldest nights');
  if (nightsFree) assert.ok(nights.includes('Not a limit for this list, nor is warmth over the year, which is worked out from these two lines. Frosts still happen.'), `board: the not-a-limit sentence ("${nights}")`);
  else assert.ok(!nights.includes('nor is warmth over the year'), 'engine: the nights or the warmth limit plants in some period, so the sentence would be false');
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

// ---- fix round 1, batch 3 (review findings R6-R9, R11-R14, C1-C4; failure rows F3, F4, F7, F11, F28; section 6) ----

// A control pressed as the grower does once they scrolled it to the middle of the screen (a toast at the
// foot of the phone screen covers what stands under it; the grower scrolls, a test presses there).
const centre = (page, sel, name) => page.evaluate((q, n) => {
  const el = [...document.querySelectorAll(q)].find((x) => (n === null ? true : ((x.getAttribute('aria-label') ?? x.textContent).replace(/\s+/g, ' ').trim() === n)) && x.getClientRects().length);
  el?.scrollIntoView({ block: 'center' });
}, sel, name);
const tap = async (page, name) => { await centre(page, 'main button', name); await press(page, 'button', name); };
const typeAt = async (page, value) => { await centre(page, 'main fieldset input[type="text"]', null); await typeIn(page, value); };
const colder = async (page, n = '2') => { await tap(page, 'Change coldest nights'); await typeAt(page, n); await tap(page, 'Use my value'); await summary(page); };

const de = JSON.parse(readFileSync(new URL('../../src/i18n/translations/de.json', import.meta.url), 'utf8'));
// The panel's status bar under its head (the change summary with its Undo), its text or null.
const headSummary = (page) => page.evaluate(() => {
  const panel = document.querySelector('main section[aria-label="Your place in figures"]');
  const el = panel && [...panel.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo')?.parentElement;
  return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
});
// The toast's Undo, pressed as the grower does (the store's toast line holds it).
const undoToast = (page) => page.evaluate(() => { const t = window.__ctTest.store.toast.value; window.__ctTest.store.hideToast(); t?.undo?.(); });
// The text of "What it means for your choice", from its bold head to the end of its paragraph.
const meaningText = (page) => page.evaluate(() => [...document.querySelectorAll('main p')].find((p) => p.innerText.includes('What it means for your choice.'))?.innerText.replace(/\s+/g, ' ').trim() ?? null);
// Waits for the summary of a newer toast than `id` (not "Counting…").
const nextSummary = (page, id) => page.waitForFunction((k) => { const t = window.__ctTest.store.toast.value; return t && t.id !== k && !t.text.includes('Counting') ? t.text.replace(/\s+/g, ' ') : null; }, { timeout: 20_000 }, id).then((h) => h.jsonValue());
const toastId = (page) => page.evaluate(() => window.__ctTest.store.toast.value?.id ?? null);

test('PFD20 (pf-d F3, R6, R7, C2): Undo puts the edits and the counts back and ends the line\'s detail and the summary under the head; a second edit takes the Undo; another toast with Undo is never shown as the change summary; a new place ends the detail', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  const before = await lineText(page, 'Coldest nights');
  await colder(page);
  assert.ok((await paraIn(page, 'Coldest nights', 'Today:')), 'board: the row says what changed');
  assert.ok(await headSummary(page), 'board: the summary under the head');
  await undoToast(page);
  assert.deepEqual(await edits(page), {}, 'F3: the edits are as before');
  assert.ok(await page.waitForFunction((b) => (document.querySelector('main [role="group"][aria-label="Coldest nights"]')?.innerText ?? '').replace(/\s+/g, ' ').trim() === b, { timeout: 6000 }, before).then(() => true, () => false),
    `F3: the line and its counts are back ("${await lineText(page, 'Coldest nights')}" against "${before}")`);
  assert.equal(await paraIn(page, 'Coldest nights', 'Today:'), null, 'R6: no detail after Undo');
  assert.equal(await headSummary(page), null, 'C2: no summary under the head after Undo');
  // The offer ends on another edit: the second edit's Undo puts back only the second.
  await colder(page);
  const first = await toastId(page);
  await tap(page, 'Change watering');
  await tapOption(page, 'Watering', 'Watered all year');
  await nextSummary(page, first);
  await undoToast(page);
  assert.deepEqual(await edits(page), { nightsShiftC: -2, daysShiftC: -2 }, 'F3: Undo takes back the second edit only');
  // R7: another toast with Undo (a plant removed) is never the change summary.
  await tap(page, 'Change the ground after heavy rain');
  await tapOption(page, 'The ground after heavy rain', 'Stays wet for days');
  await summary(page);
  await page.evaluate(() => { const s = window.__ctTest.store; s.removeMember(s.members.value[0]); });
  assert.ok(await page.waitForFunction(() => /removed/i.test(window.__ctTest.store.toast.value?.text ?? ''), { timeout: 4000 }).then(() => true, () => false), 'the removal toast');
  assert.equal(await headSummary(page), null, `R7: the removal toast is not the change summary ("${await headSummary(page)}")`);
  // A new place clears the edits (A7): no detail stays.
  await colder(page, '3');
  assert.ok(await paraIn(page, 'Coldest nights', 'Today:'), 'board: the detail');
  await movedTo(page, 'mendoza');
  assert.ok(await page.waitForFunction(() => Object.keys(window.__ctTest.store.siteEdits.value).length === 0, { timeout: 6000 }).then(() => true, () => false), 'A7: the new place cleared the edits');
  assert.equal(await paraIn(page, 'Coldest nights', 'Today:'), null, 'R6: no detail after a new place');
  assert.equal(await headSummary(page), null, 'R6: no summary under the head after a new place');
  await done(page);
});

test('PFD21 (pf-d R8): in "I know my plot’s figure" the tick follows the figure: a figure warmer than the map says "warmer", and Use sets the days warmer', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  const i = await inputs(page);
  await tap(page, 'Change coldest nights');
  await tap(page, 'I know my plot’s figure');
  await typeAt(page, (i.nights.map + 3).toFixed(1));
  await says(page, 'Make the hottest days 3 °C warmer too');
  await saysNot(page, 'Make the hottest days 3 °C colder too', 'R8: never "colder" for a warmer figure');
  await tap(page, 'Use my value');
  assert.deepEqual(await edits(page), { nightsShiftC: 3, daysShiftC: 3 }, 'R8: the days warmer, as the tick says');
  await done(page);
});

test('PFD22 (pf-d R9, F1): a rain shift of 1,200 mm reopens as a number the field reads back; "1,200" in English and "1.200" in German are 1200', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await tap(page, 'Change rain a year');
  await typeAt(page, '1,200');
  await tap(page, 'more');
  await tap(page, 'Use my value');
  assert.equal((await edits(page)).rainShiftMm, 1200, 'R9: "1,200" is 1200 in English');
  await summary(page);
  await tap(page, 'Change rain a year');
  const shown = await page.evaluate(() => document.querySelector('main fieldset input[type="text"]')?.value ?? null);
  assert.ok(shown && !shown.includes(','), `R9: the field shows the shift without a group mark ("${shown}")`);
  await tap(page, 'Use my value');
  const st = await fieldState(page);
  assert.ok(!st?.invalid, `R9: the prefilled value is read back (${JSON.stringify(st)})`);
  assert.equal((await edits(page)).rainShiftMm, 1200, 'R9: still 1200');
  await done(page);
  const g = await placeStep('kiambu-8', { width: 390, lang: 'de' });
  await section(g, de['consortium.figures.title'], 20_000);
  await tap(g, de['consortium.figures.changeRain']);
  await typeAt(g, '1.200');
  await tap(g, de['consortium.figures.more']);
  await tap(g, de['consortium.figures.use']);
  assert.equal((await edits(g)).rainShiftMm, 1200, 'R9: "1.200" is 1200 in German');
  await done(g);
});

test('PFD23 (pf-d R11): the palette\'s "Every figure, and yours: Your place in figures" brings the panel into view with its heading focused', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  await tap(page, 'Every figure, and yours: Your place in figures');
  await section(page, 'Your place in figures', 20_000);
  const ok = await page.waitForFunction(() => {
    const a = document.activeElement;
    if (!a || a.tagName !== 'H2' || a.textContent.trim() !== 'Your place in figures') return false;
    const r = a.getBoundingClientRect();
    return r.top >= -1 && r.top < innerHeight / 2;
  }, { timeout: 6000 }).then(() => true, () => false);
  assert.ok(ok, `R11: the panel's heading is in view and focused (focus on "${(await focused(page)).name}")`);
  await done(page);
});

test('PFD24 (pf-d R12): "What it means for your choice" says the real state: checks that could not run, counting, no climate data here; "no location yet" only without a location', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await page.evaluate(() => { const s = window.__ctTest.store; window.__rule = s.verdictRule.value; s.verdictRule.value = null; s.verdictFailed.value = true; });
  assert.ok(await page.waitForFunction(() => [...document.querySelectorAll('main p')].some((p) => p.innerText.includes('What it means for your choice.') && p.innerText.includes('Checks could not run')), { timeout: 6000 }).then(() => true, () => false), `R12: the checks could not run ("${await meaningText(page)}")`);
  assert.ok(!(await meaningText(page)).includes('no location'), 'R12: never "no location" at a located place');
  await page.evaluate(() => { window.__ctTest.store.verdictFailed.value = false; });
  assert.ok(await page.waitForFunction(() => [...document.querySelectorAll('main p')].some((p) => p.innerText.includes('What it means for your choice.') && p.innerText.includes('Counting')), { timeout: 6000 }).then(() => true, () => false), `R12: counting ("${await meaningText(page)}")`);
  await page.evaluate(() => { const s = window.__ctTest.store, l = s.location.value; s.location.value = { ...l, lookup: { ...l.lookup, climate: null } }; });
  assert.ok(await page.waitForFunction(() => [...document.querySelectorAll('main p')].some((p) => p.innerText.includes('What it means for your choice.') && p.innerText.includes('no climate data at this place')), { timeout: 6000 }).then(() => true, () => false), `R12: no climate data here ("${await meaningText(page)}")`);
  await done(page);
  const none = await placeStep('kiambu-8', { site: null, width: 390 });
  await section(none, 'Your place in figures', 20_000);
  assert.ok((await meaningText(none)).includes('With no location yet'), 'R12: "no location yet" without a location');
  await done(none);
});

test('PFD25 (pf-d R13): the Water card\'s lead counts the later members by the period they are first drier in', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  // From the engine: list plants by the first period they are drier than their band in (never a board figure).
  const firsts = await page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, list = s.pool.value ?? [];
    const periods = ['1991-2020', '2041-2070', '2071-2099'];
    const drier = (v) => !!v && (v.level === 'fits' || v.level === 'look') && v.factors.some((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low);
    const vs = periods.map((p) => rule.verdicts(list, { ...s.verdictContext.value, period: p }));
    const out = {};
    for (const t of list) { const k = vs.findIndex((m) => drier(m.get(t.id))); if (k >= 0) (out[periods[k]] ??= []).push(t.id); }
    return out;
  });
  const lastOnly = firsts['2071-2099'] ?? [];
  if (!lastOnly.length) { await done(page); return; }
  const mid = (firsts['2041-2070'] ?? []).slice(0, 1), today = (firsts['1991-2020'] ?? []).slice(0, 1);
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, [...today, ...mid, lastOnly[0]]);
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.memberTaxa.value.length === n && !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 }, today.length + mid.length + 1).then(() => true, () => false), 'the members');
  const lead = await sectionBy(page, 'Water', (s) => [...s.querySelectorAll('p')].map((p) => p.innerText.replace(/\s+/g, ' ').trim()).find((t) => t.startsWith('With rain only')) ?? null);
  assert.ok(lead, 'board: the Water card\'s lead');
  assert.ok(lead.includes('1 more by 2071–2099'), `R13: the member first drier by 2071–2099 is counted then ("${lead}")`);
  if (mid.length) assert.ok(lead.includes('1 more by 2041–2070'), `R13: and the one by 2041–2070 ("${lead}")`);
  else assert.ok(!lead.includes('2041–2070'), `R13: no 2041–2070 when no member is first drier then ("${lead}")`);
  await done(page);
});

test('PFD26 (pf-d R14): the preview and the "map" values are the engine\'s: dry months never past 12, rain never below 0, the map figure as the map says', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  const i = await inputs(page);
  await tap(page, 'Dry months in a row');
  await tap(page, 'Change dry months in a row');
  await typeAt(page, '12');
  await tap(page, 'longer');
  const prev = await page.evaluate(() => document.querySelector('main fieldset [aria-live="polite"]')?.innerText.replace(/\s+/g, ' ').trim() ?? '');
  const nums = [...prev.matchAll(/(\d+) (?:today|by)/g)].map((m) => Number(m[1]));
  assert.ok(nums.length === 3 && nums.every((n) => n <= 12), `R14: the preview stays within 12 months ("${prev}")`);
  await tap(page, 'Use my value');
  await summary(page);
  const row = await lineText(page, 'Dry months in a row');
  assert.ok(row.includes(`Today 12 map ${i.dryMonths.map}`), `R14: today 12 over the map's ${i.dryMonths.map} ("${row}")`);
  await tap(page, 'Change rain a year');
  await typeAt(page, String(Math.floor(i.rain.map)));
  await tap(page, 'less');
  const rain = await page.evaluate(() => document.querySelector('main fieldset [aria-live="polite"]')?.innerText.replace(/\s+/g, ' ').trim() ?? '');
  assert.ok(rain && !/[−-]\d/.test(rain), `R14: never a negative rainfall ("${rain}")`);
  await done(page);
});

test('PFD27 (pf-d C1, A5): where two lines limit, "What limits plants here" shows each with its Change, and "Not a limit here" never names a line that limits', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  // Nights 15 °C colder (the hottest days kept): the cold puts plants outside on top of the rain line.
  await page.evaluate(() => window.__ctTest.store.setSiteEdits({ nightsShiftC: -15 }, 'Edits set'));
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.siteInputs.value.nights.shift === -15 && !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 }).then(() => true, () => false), 'the edit');
  const e = await engineSides(page);
  const c = await engineCounts(page);
  const nights = Math.max(...e.sides.map((s) => s.cold.outside + s.mild.outside)), rain = Math.max(...c.map((p) => p.drier));
  assert.ok(nights > 0 && rain > 0, `engine: both the nights (${nights}) and the rain (${rain}) limit here`);
  const text = await section(page, 'What limits plants here', 20_000);
  await control(page, 'button', 'Change coldest nights');
  await control(page, 'button', 'Change rain a year');
  assert.ok(!/Not a limit here:[^.]*winter cold/.test(text), `C1: winter cold is not called "not a limit" ("${text.slice(0, 600)}")`);
  await done(page);
});

test('PFD28 (pf-d C4, A14, F28): a 200-plant palette at Mendoza: the members line and the Water card count past the size rule (three names, "+ N more"); a site edit at 4× CPU is timed and reported', { timeout: 180_000 }, async (t) => {
  const page = await mendoza({ width: 390 });
  await page.evaluate(() => { const s = window.__ctTest.store; s.members.value = [...new Set([...s.members.value, ...(s.pool.value ?? []).map((x) => x.id)])].slice(0, 200); });
  assert.ok(await page.waitForFunction(() => { const s = window.__ctTest.store; return s.memberTaxa.value.length === 200 && !!s.memberVerdicts.value; }, { timeout: 30_000 }).then(() => true, () => false), 'the 200 plants');
  await section(page, 'What limits plants here', 20_000);
  const names = await page.evaluate(() => window.__ctTest.store.memberTaxa.value.map((x) => x.names?.en || x.canonical_name));
  const w = await lineText(page, 'Watering');
  assert.ok(w.includes('of your 200 plants'), `board: the members sentence ("${w.slice(0, 200)}")`);
  assert.ok(names.filter((n) => w.includes(n)).length <= 3, `A14: at most three names in the Watering line ("${w.slice(0, 400)}")`);
  const water = await sectionBy(page, 'Water', (s) => ({ items: s.querySelectorAll('li').length, more: [...s.querySelectorAll('button')].some((b) => /^\+ \d+ more/.test(b.textContent.trim())), text: s.innerText.replace(/\s+/g, ' ') }));
  if (water) {
    assert.ok(water.items <= 3 && (water.more || water.items < 3), `A14: the Water card shows three and "+ N more" (${JSON.stringify({ items: water.items, more: water.more })})`);
    assert.ok(names.filter((n) => water.text.includes(n)).length <= 3, 'A14: no run of names in the Water card');
  }
  // F28: one site edit (six verdict passes over the list and the members) at 4× CPU, reported only.
  await page.evaluate(() => window.__ctTest.store.openFigure('watering'));
  await section(page, 'Your place in figures', 20_000);
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { window.__long = []; new PerformanceObserver((l) => { for (const x of l.getEntries()) window.__long.push(Math.round(x.duration)); }).observe({ type: 'longtask' }); window.__t0 = performance.now(); });
  const id = await toastId(page);
  await tap(page, 'Change the ground after heavy rain');
  await tapOption(page, 'The ground after heavy rain', 'Stays wet for days');
  await nextSummary(page, id);
  const ms = await page.evaluate(() => Math.round(performance.now() - window.__t0));
  const long = await page.evaluate(() => window.__long);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  t.diagnostic(`F28 (reported, never a failure): a drainage edit on 200 plants at 4× CPU: summary in ${ms} ms; longest task ${long.length ? Math.max(...long) : 0} ms; tasks over 200 ms: ${long.filter((x) => x > 200).join(', ') || 'none'} (cause: the six verdict passes of the summary and the panel's counts)`);
  await done(page);
});

test('PFD29 (pf-d F4, F7): while the checks are counting the toast reads "Counting…" with Undo; a second edit before the summary gives one summary, against the state before the second edit', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await page.evaluate(() => { const s = window.__ctTest.store; window.__rule = s.verdictRule.value; s.verdictRule.value = null; s.verdictFailed.value = false; });
  await tap(page, 'Change watering');
  await tapOption(page, 'Watering', 'Watered all year');
  assert.ok(await page.waitForFunction(() => { const t = window.__ctTest.store.toast.value; return t && t.text.includes('Counting') && typeof t.undo === 'function'; }, { timeout: 4000 }).then(() => true, () => false), `F7: "Counting…" with Undo ("${await toastText(page)}")`);
  await tap(page, 'Change coldest nights');
  await typeAt(page, '2');
  await tap(page, 'Use my value');
  const pending = await toastId(page);
  assert.ok((await toastText(page)).includes('Counting'), 'F7: the second edit counts too');
  await page.evaluate(() => { window.__ctTest.store.verdictRule.value = window.__rule; });
  const got = await summary(page);
  assert.equal(await toastId(page), pending, 'F7: the summary arrives on the same toast');
  assert.ok(await page.evaluate(() => typeof window.__ctTest.store.toast.value?.undo === 'function'), 'F7: Undo kept');
  assert.match(got, /^Coldest nights and hottest days set 2 °C colder\./, `F4: one summary, of the second edit ("${got}")`);
  assert.ok(!/Watering/.test(got), `F4: the first edit is not in it ("${got}")`);
  // The same second edit made from the state before it, with the checks settled, says the same.
  await undoToast(page);
  assert.deepEqual(await edits(page), { watering: 'all-year' }, 'F4: Undo goes back to the state before the second edit');
  const id = await toastId(page);
  await tap(page, 'Change coldest nights');
  await typeAt(page, '2');
  await tap(page, 'Use my value');
  assert.equal(await nextSummary(page, id), got, 'F4: the summary is diffed against the state before the second edit');
  await done(page);
});

test('PFD30 (pf-d F11): a save with grower values comes back after a reload, marked "Your value"; a value it cannot read is dropped and the rest kept', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  // The palette made the reader's own (a plant change lets go of the page the hook opened, which holds the save).
  await page.evaluate(() => { const s = window.__ctTest.store; s.removeMember(s.members.value[0]); s.hideToast(); });
  await colder(page);
  await tap(page, 'Change soil pH');
  await typeAt(page, '6.5');
  await tap(page, 'Use my value');
  await summary(page);
  assert.ok(await page.waitForFunction(() => (localStorage.getItem('canopi-consortium') ?? '').includes('b=65'), { timeout: 6000 }).then(() => true, () => false), 'the save holds the values');
  await page.reload();
  assert.ok(await page.waitForFunction(() => !!window.__ctTest?.store, { timeout: 20_000 }).then(() => true, () => false), 'the reloaded page');
  assert.deepEqual(await edits(page), { nightsShiftC: -2, daysShiftC: -2, soilPh: 6.5 }, 'F11: the values come back');
  // The test's place came through the hook (no saved location): set it again; the values stay (same cell).
  await atPlace(page, 'kiambu');
  await page.evaluate(() => { window.__ctTest.store.view.value = 'start'; });
  await section(page, 'Your place in figures', 20_000);
  await says(page, '2 °C colder than the map');
  assert.ok((await lineText(page, 'Soil pH')).includes('6.5'), 'F11: the pH comes back');
  // The same save with a pH it cannot read and an unknown drainage answer, opened on a new visit.
  const bad = await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('canopi-consortium')); r.place = `${r.place.replace('b=65', 'b=999')}&d=soggy`; return JSON.stringify(r); });
  await done(page);
  const again = await withStorage({ 'canopi-consortium': bad });
  assert.ok(await again.waitForFunction(() => (window.__ctTest?.store?.members.value.length ?? 0) > 0, { timeout: 20_000 }).then(() => true, () => false), 'the saved palette opens');
  assert.deepEqual(await edits(again), { nightsShiftC: -2, daysShiftC: -2 }, 'F11: the bad pH and the unknown answer dropped, the shifts kept');
  await done(again);
});

// Section 6: the panel line, the temperature editor and the choice options at each width.
const layoutAt = (page) => page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, right: r.right, bottom: r.bottom, h: r.height }; };
  const line = document.querySelector('main [role="group"][aria-label="Hottest days"]');
  const change = [...document.querySelectorAll('main button')].find((b) => b.getAttribute('aria-label') === 'Change hottest days');
  const name = line && [...line.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Hottest days');
  const heads = [...document.querySelectorAll('main section[aria-label="Your place in figures"] h3')].map((h) => ({ t: h.textContent.trim(), ...box(h) }));
  const groupW = (g) => document.querySelector(`main [role="group"][aria-label="${g}"] [role="group"]`)?.getBoundingClientRect().width ?? 0;
  const opts = (g) => [...(document.querySelector(`main [role="group"][aria-label="${g}"] [role="group"]`) ?? document.querySelector(`main [role="group"][aria-label="${g}"]`))?.querySelectorAll('button[aria-pressed]') ?? []].map(box);
  return { line: line && box(line), change: change && box(change), name: name && box(name), heads, watering: opts('Watering'), drainage: opts('The ground after heavy rain'), drainageW: groupW('The ground after heavy rain') };
});
for (const width of [320, 390, 960, 1280]) {
  test(`PFD31 (pf-d section 6 at ${width}): the panel line with Change (44 px, at the right of its name), ${width >= 960 ? 'two columns' : 'one column'}; the temperature editor ${width >= 960 ? 'with "Use my value" and "Cancel" on one row' : 'stacked'}; the options 44 px, ${width >= 960 ? 'the two drainage answers in one row' : 'the watering answers stacked'}`, async () => {
    const page = await placeStep('kiambu-8', { width });
    await section(page, 'Your place in figures', 20_000);
    if (width < 960) await tap(page, 'Watering');
    const l = await layoutAt(page);
    assert.ok(l.change && l.change.h >= 44, `section 6: Change is 44 px (${JSON.stringify(l.change)})`);
    assert.ok(l.name && l.change.x > l.name.right && Math.abs(l.change.right - l.line.right) < 4, `section 6: Change at the right of the line (${JSON.stringify({ name: l.name, change: l.change, line: l.line })})`);
    const climate = l.heads.find((h) => h.t.startsWith('CLIMATE') || h.t.startsWith('Climate')), soil = l.heads.find((h) => h.t.startsWith('SOIL') || h.t.startsWith('Soil'));
    assert.ok(climate && soil, `the group heads (${JSON.stringify(l.heads.map((h) => h.t))})`);
    if (width >= 960) assert.ok(soil.x > climate.right && Math.abs(soil.y - climate.y) < 4, `section 6: two columns from 960 px (${JSON.stringify({ climate, soil })})`);
    else assert.ok(soil.y > climate.y && Math.abs(soil.x - climate.x) < 2, 'section 6: one column on the phone');
    for (const o of [...l.watering, ...l.drainage]) assert.ok(o.h >= 44, `section 6: each option 44 px (${JSON.stringify(o)})`);
    // From 960 px the answers stand in one row when they fit (their widths and the 6 px gap within the column).
    const fits = l.drainage.length === 2 && l.drainage[0].right - l.drainage[0].x + l.drainage[1].right - l.drainage[1].x + 6 <= l.drainageW + 1;
    if (width >= 960 && fits) assert.ok(Math.abs(l.drainage[0].y - l.drainage[1].y) < 2, `section 6: the drainage answers in one row (${JSON.stringify(l.drainage)})`);
    if (width >= 1280) assert.ok(fits, `section 6: the two drainage answers fit one row at ${width} (${JSON.stringify(l.drainage)}, ${l.drainageW})`);
    else assert.ok(l.watering.length === 3 && l.watering[1].y >= l.watering[0].bottom - 1 && l.watering[2].y >= l.watering[1].bottom - 1, `section 6: the watering answers stacked (${JSON.stringify(l.watering)})`);
    await tap(page, 'Change coldest nights');
    const ed = await page.evaluate(() => {
      const f = document.querySelector('main section[aria-label="Your place in figures"] fieldset');
      const b = (t) => [...f.querySelectorAll('button')].find((x) => x.textContent.trim() === t)?.getBoundingClientRect();
      const use = b('Use my value'), cancel = b('Cancel'), field = f.querySelector('input[type="text"]').getBoundingClientRect();
      return { use: use && { y: use.top, h: use.height, bottom: use.bottom }, cancel: cancel && { y: cancel.top, h: cancel.height }, field: { bottom: field.bottom } };
    });
    assert.ok(ed.use && ed.cancel && ed.use.h >= 44 && ed.cancel.h >= 44, `section 6: the editor's buttons are 44 px (${JSON.stringify(ed)})`);
    assert.ok(ed.use.y > ed.field.bottom, 'section 6: the buttons under the field');
    if (width >= 960) assert.ok(Math.abs(ed.use.y - ed.cancel.y) < 2, `section 6: "Use my value" and "Cancel" on one row (${JSON.stringify(ed)})`);
    assert.deepEqual(await pastEdge(page), [], `section 6: nothing passes the right edge at ${width}`);
    await done(page);
  });
}

// ---- fix round 1, batch 4 (review findings C5-C12) ----

failing('PFD32 (pf-d C5; waits for the hand-off: state/location.ts reads the soil tile): after a real lookup (typed coordinates at Kiambu) the drainage line reads the soil map\'s texture and the pH line the soil map\'s value', { owner: 'pf-d', reason: /the soil map's reading after a real lookup/ }, async () => {
  const page = await placeStep('kiambu-8', { site: null, width: 390 });
  await searchFor(page, '-1.1714, 36.8356');
  assert.ok(await page.waitForFunction(() => Math.abs((window.__ctTest.store.location.value?.lat ?? 0) + 1.1714) < 0.01 && !!window.__ctTest.store.location.value?.lookup, { timeout: 20_000 }).then(() => true, () => false), 'the typed place is read');
  await section(page, 'Your place in figures', 20_000);
  const drain = await lineText(page, 'The ground after heavy rain');
  assert.match(drain, /^The ground after heavy rain Likely holds water: clay · soil map/, `the soil map's reading after a real lookup ("${drain}")`);
  assert.match(await lineText(page, 'Soil pH'), /^Soil pH \d+\.\d, [a-z ]+ · soil map/, 'the soil map\'s reading after a real lookup: the pH');
  await done(page);
});

test('PFD33 (pf-d C7): at a humid place (Kiambu, 250 mm less rain, still humid) the Water card never says "Your place is dry", and its lead counts each member at the period it is first drier in', async () => {
  const page = await loadKiambuWater();
  const ai = await page.evaluate(() => window.__ctTest.store.siteInputs.value.periods.find((p) => p.period === '1991-2020')?.aridityIndex ?? null);
  assert.ok(ai !== null && ai >= 0.65, `the place stays humid (aridity index ${ai})`);
  const card = await sectionBy(page, 'Water', (s) => s.innerText.replace(/\s+/g, ' '));
  assert.ok(card, 'the Water card shows (a member is drier here)');
  assert.ok(!card.includes('Your place is dry'), `C7: a humid place is not a dry place ("${card.slice(0, 160)}")`);
  const firsts = await memberFirsts(page);
  const lead = await sectionBy(page, 'Water', (s) => [...s.querySelectorAll('p')].map((p) => p.innerText.replace(/\s+/g, ' ').trim()).find((t) => t.startsWith('With rain only')) ?? null);
  assert.ok(lead, 'the Water card\'s lead');
  for (const [p, n] of Object.entries(firsts)) if (p !== '1991-2020') assert.ok(lead.includes(`${n} more by ${p.replace('-', '–')}`), `C7: ${n} more by ${p} ("${lead}")`);
  if (!firsts['2041-2070']) assert.doesNotMatch(lead, /[1-9]\d* more by 2041–2070/, `C7: no member is first drier by 2041–2070 ("${lead}")`);
  await done(page);
});

test('PFD34 (pf-d C8): the members line follows the watering answer ("water it the first years"); watered all year, rain is no longer the main limit and no member "may need watering"', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  const membersLine = () => sectionBy(page, 'What limits plants here', (s) => s.querySelector('[role="group"][aria-label="Watering"]')?.innerText.replace(/\s+/g, ' ') ?? '');
  assert.match(await membersLine(), /may need watering today/, 'rain only: "may need watering"');
  await tapOption(page, 'Watering', 'Watered the first years');
  await summary(page);
  const first = await membersLine();
  assert.match(first, /water (it|them) the first years/, `C8: the members line says "water it the first years" ("${first.slice(0, 200)}")`);
  assert.doesNotMatch(first.split('Dryness never changes')[0], /may need watering/, 'C8: never "may need watering" once watered the first years');
  await tapOption(page, 'Watering', 'Watered all year');
  await summary(page);
  const card = await section(page, 'What limits plants here');
  const rows = await sectionBy(page, 'What limits plants here', (s) => [...s.querySelectorAll('[role="group"][aria-label]')].map((g) => g.getAttribute('aria-label')));
  assert.ok(!rows.includes('Rain a year'), `C8: watered all year, no plant carries the note: rain is no limit (${JSON.stringify(rows)})`);
  assert.ok(!card.includes('The main limit here.') || !rows.includes('Rain a year'), 'C8: rain is not "The main limit here."');
  const all = await membersLine();
  assert.ok(all.includes('Watered all year: no plant carries the note.'), `C8: the members line says no note ("${all.slice(0, 200)}")`);
  assert.doesNotMatch(all.split('Dryness never changes')[0], /may need watering/, 'C8: no member "may need watering" when watered all year');
  await done(page);
});

test('PFD35 (pf-d C9; PlaceDesk at 1280): "After release" names each part with its "after release" chip', async () => {
  const page = await placeStep('seville-board', { site: 'seville', width: 1280 });
  await atBoardPlace(page, 'seville-board');
  await section(page, 'Your place in figures', 20_000);
  const parts = await sectionBy(page, 'Your place in figures', (s) => [...s.querySelectorAll('p')].filter((p) => /^(Light on your plot|Wind and sea)/.test(p.innerText.trim())).map((p) => ({ head: p.querySelector('strong')?.textContent.trim(), chip: [...p.querySelectorAll('span')].map((x) => x.textContent.trim()).find((t) => t === 'after release') ?? null })));
  assert.deepEqual(parts, [{ head: 'Light on your plot', chip: 'after release' }, { head: 'Wind and sea', chip: 'after release' }], 'board PlaceDesk: the head, then its "after release" chip');
  await done(page);
});

test('PFD36 (pf-d C10, A3, F9; SiteKiambu at 390): the room "Pots or a balcony" shows the Pots line\'s two options in place: "In the ground" is one tap', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await page.evaluate(() => { window.__ctTest.store.room.value = 'pots'; });
  await says(page, 'From your room');
  assert.equal(await pressed(page, 'Pots or brought-in soil', 'Pots or brought-in soil'), 'true', 'A3: the room\'s answer is pressed in place');
  await tapOption(page, 'Pots or brought-in soil', 'In the ground');
  assert.equal((await edits(page)).pots, false, 'A3: one tap writes the answer');
  await done(page);
});

// ---- fix round 2, batch 1 (review findings R2, R4, R5, R7; C2) ----

// Shifts a climate line by the smallest whole or half degree (up to 10 °C) at which the engine says it
// limits only in a later period (core limitStatus: outside nobody today, someone later); null if none.
async function laterOnly(page, field, line, sign) {
  for (let k = 1; k <= 20; k++) {
    const shift = sign * k / 2;
    await page.evaluate(([f, v]) => window.__ctTest.store.setSiteEdits({ [f]: v }, 'Edits set'), [field, shift]);
    await page.waitForFunction(([f, v]) => window.__ctTest.store.siteEdits.value[f] === v && !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 }, [field, shift]);
    const { status } = await engineSides(page);
    if (status[line].state === 'limits' && status[line].today === 0) return { shift, status };
  }
  return null;
}
test('PFD37 (pf-d R2, C2): a line that limits plants only by a later period is listed under "What limits plants here" and its row says why (the later counts), never "Not a limit for this list"; the panel says the same', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  // Mendoza: nobody is outside on the hot side; hotter days put plants past their heat limit later first.
  const found = await laterOnly(page, 'daysShiftC', 'days', 1);
  assert.ok(found, 'engine: a warmer-days shift at which the hottest days limit only later');
  const rows = await sectionBy(page, 'What limits plants here', (s) => [...s.querySelectorAll('[role="group"][aria-label]')].map((g) => g.getAttribute('aria-label')));
  assert.ok(rows.includes('Hottest days'), `A5: the hottest days limit by ${found.status.days.period}, so the card lists them (${JSON.stringify(rows)})`);
  const card = await sectionBy(page, 'What limits plants here', (s) => s.querySelector('[role="group"][aria-label="Hottest days"]').innerText.replace(/\s+/g, ' '));
  assert.ok(!card.includes('Not a limit for this list'), `R2: the listed row never says "Not a limit" ("${card}")`);
  assert.match(card, /take it today, \d+ by 2041–2070, \d+ by 2071–2099/, `R2: the row says the later counts ("${card}")`);
  await page.evaluate(() => { window.__ctTest.store.view.value = 'start'; });
  await section(page, 'Your place in figures', 20_000);
  if (found.status.days.n >= Math.max(found.status.nights.n, found.status.warmth.n, found.status.rain.n)) assert.equal(await expanded(page, 'Hottest days'), 'true', 'R2: the main limit opens first');
  else await press(page, 'button', 'Hottest days');
  const row = await lineText(page, 'Hottest days');
  assert.ok(!row.includes('Not a limit for this list'), `R2: the panel row agrees ("${row}")`);
  await done(page);
});

test('PFD38 (pf-d R4): the summary under the panel head holds the toast while the focus is on its Undo, is no second live region, and after its Undo the focus goes to the edited line\'s Change', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await twoColder(page);
  // From here the toast runs 300 ms each time it is armed (the test build's hook).
  await page.evaluate(() => { window.__ctTimeouts = { ...(window.__ctTimeouts ?? {}), toast: 300 }; });
  const live = await page.evaluate(() => {
    const panel = document.querySelector('main section[aria-label="Your place in figures"]');
    const undo = [...panel.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Undo');
    if (!undo) return null;
    undo.focus();
    return !!undo.closest('[role="status"], [aria-live]');
  });
  assert.equal(live, false, 'R4: the summary under the head is no live region (the toast announces it once)');
  // A later text on the same toast re-arms its timer unless the toast is held (store updateToast).
  await page.evaluate(() => { const t = window.__ctTest.store.toast.value; window.__ctTest.store.updateToast(t.id, t.text); });
  await new Promise((r) => setTimeout(r, 900));
  assert.ok(await headSummary(page), 'R4: past the toast\'s time, the summary stays while the focus is on its Undo');
  assert.ok(await page.evaluate(() => !!window.__ctTest.store.toast.value), 'R4: the toast is held too');
  await page.keyboard.press('Enter');
  assert.ok(await page.waitForFunction(() => !window.__ctTest.store.siteEdits.value.nightsShiftC, { timeout: 4000 }).then(() => true, () => false), 'R4: its Undo puts the edit back');
  assert.ok(await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Change coldest nights', { timeout: 4000 }).then(() => true, () => false), `R4: the focus goes to the line's Change (on ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))})`);
  await done(page);
});

test('PFD39 (pf-d R5): the Water card\'s lead says only the parts that are there: today only, or none today and the later ones, never "0 more"', async () => {
  const page = await mendoza({ width: 390 });
  await section(page, 'What limits plants here', 20_000);
  // Each member's first period drier here than its recorded band, from the engine (none: never).
  const firsts = await page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, ms = s.memberTaxa.value;
    const drier = (v) => !!v && v.factors.some((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low);
    const ps = ['1991-2020', '2041-2070', '2071-2099'], vs = ps.map((p) => rule.verdicts(ms, { ...s.verdictContext.value, period: p }));
    return ms.map((t) => [t.id, ps[vs.findIndex((m) => drier(m.get(t.id)))] ?? null]);
  });
  const now = firsts.find(([, p]) => p === '1991-2020')?.[0], later = firsts.find(([, p]) => p && p !== '1991-2020'), never = firsts.find(([, p]) => !p)?.[0];
  assert.ok(now && later && never, `engine: Mendoza's members are drier today, later and never (${JSON.stringify(firsts)})`);
  const lead = async (ids) => {
    await page.evaluate((x) => { window.__ctTest.store.members.value = x; }, ids);
    await page.waitForFunction((n) => window.__ctTest.store.memberTaxa.value.length === n && !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 }, ids.length);
    return page.waitForFunction(() => {
      const s = [...document.querySelectorAll('main section')].find((x) => x.querySelector('h2')?.textContent.trim() === 'Water');
      return s ? [...s.querySelectorAll('p')].map((p) => p.innerText.replace(/\s+/g, ' ').trim()).find((t) => t.startsWith('With rain only')) ?? null : null;
    }, { timeout: 20_000 }).then((h) => h.jsonValue());
  };
  assert.equal(await lead([now, never]), 'With rain only, 1 of your 2 plants may need watering today:', 'R5: today only, no "0 more"');
  assert.equal(await lead([later[0], never]), `With rain only, none of your 2 plants needs watering today; 1 more by ${later[1].replace('-', '–')}:`, 'R5: later only, never "0 of your 2"');
  await done(page);
});

test('PFD40 (pf-d R7): two equal shifts set on their own lines are two values: Reset on Hottest days puts back the hottest days only', async () => {
  const page = await placeStep('kiambu-8', { width: 390 });
  await section(page, 'Your place in figures', 20_000);
  await tap(page, 'Change coldest nights');
  await typeAt(page, '2');
  await page.evaluate(() => { const c = document.querySelector('main fieldset input[type="checkbox"]'); if (c.checked) c.click(); });
  await tap(page, 'Use my value');
  await summary(page);
  assert.deepEqual(await edits(page), { nightsShiftC: -2 }, 'the tick off: the nights alone');
  const id = await toastId(page);
  await tap(page, 'Change hottest days');
  await typeAt(page, '2');
  await tap(page, 'Use my value');
  await nextSummary(page, id);
  assert.deepEqual(await edits(page), { nightsShiftC: -2, daysShiftC: -2 }, 'the days set on their own line');
  const id2 = await toastId(page);
  await tap(page, 'Reset hottest days to the climate map');
  const back = await nextSummary(page, id2);
  assert.deepEqual(await edits(page), { nightsShiftC: -2 }, 'R7: Reset on Hottest days keeps the nights');
  assert.match(back, /^Hottest days back to the climate map/, `R7: the summary names the hottest days only ("${back}")`);
  await done(page);
});

// Kiambu's 8 plants, plus (when none is drier) a plant of the list first drier later, so the Water card
// shows; the members' first drier period from the engine.
async function memberFirsts(page) {
  return page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, ms = s.memberTaxa.value;
    const periods = ['1991-2020', '2041-2070', '2071-2099'];
    const drier = (v) => !!v && v.factors.some((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low);
    const vs = periods.map((p) => rule.verdicts(ms, { ...s.verdictContext.value, period: p }));
    const out = {};
    for (const t of ms) { const k = vs.findIndex((m) => drier(m.get(t.id))); if (k >= 0) out[periods[k]] = (out[periods[k]] ?? 0) + 1; }
    return out;
  });
}
async function loadKiambuWater() {
  const page = await loadCase('kiambu-8', { width: 390 });
  await page.evaluate(() => { window.__ctTest.store.siteEdits.value = { rainShiftMm: -250 }; });
  await section(page, 'What limits plants here', 20_000);
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.memberVerdicts.value && window.__ctTest.store.siteInputs.value.rain.shift === -250, { timeout: 20_000 }).then(() => true, () => false), 'the rain cut is read');
  if (Object.keys(await memberFirsts(page)).length) return page;
  const drierOne = await page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, list = s.pool.value ?? [];
    const drier = (v) => !!v && v.factors.some((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low);
    const vs = ['2071-2099', '2041-2070', '1991-2020'].map((p) => rule.verdicts(list, { ...s.verdictContext.value, period: p }));
    return list.find((t) => vs.some((m) => drier(m.get(t.id))))?.id ?? null;
  });
  assert.ok(drierOne, 'engine: a plant of Kiambu\'s lists is drier here with 250 mm less rain');
  const ids = await page.evaluate(() => window.__ctTest.store.members.value);
  await page.evaluate((x) => { window.__ctTest.store.members.value = x; }, [...ids, drierOne]);
  assert.ok(await page.waitForFunction((n) => window.__ctTest.store.memberTaxa.value.length === n && !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 }, ids.length + 1).then(() => true, () => false), 'the members');
  return page;
}
