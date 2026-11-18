// pf stream c, "Your place" (rewritten for board canvas v14 in pf-c's commit 0, 2026-11-18; the v12
// cases of pf commit 0 T went with the screens they named). The approved boards
// (.local/consortium/v2/f1a/mockups-v14/project/: Place, PlaceDesk (the three questions), SiteKiambu
// (the frame), LocStates, LocMap, LocDesk, ClimateHand, Country, Arrivals, Loading, Oulu (the place
// banner), Toasts (Start over)) read as tests of what the grower reads and does: words, order, roles,
// states. The figures panel inside SiteKiambu and PlaceDesk is pf-d's (its slot is mounted here).
// Spec: .local/consortium/v2/ppc/pf/v14-spec-update.md section 2 'pf-c', failure rows F8 and F12-F14;
// v13-spec-update.md section 5 where v14 does not override it.
// Board figures come from the engine and the installed release (the climate cards' list sizes from
// the index, the climate read from the tiles at each fixture place), never the board's numbers.
// Each case still failing carries an expected-fail marker under pf-c (scripts/expect-fail.mjs
// failing()), its reason the board's first missing word or element (pf-helpers.mjs BOARD); pf-c
// removes a marker in the commit that makes it pass.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries F1a-P2 (pp-b2 → PP-C; a return visit opens "Opening your palette…", never the Place form) -> PFC15
//   carries PF3 (pp-pf; the place line on the palette page with Change, the country line) -> PFC13, PFC11
//   carries PF4 (pp-pf, its Place part; the steps at 390) -> PFC1
//   carries PP-B3 (pp-b1; F1a-P9 restored: every live region on the page before its message) -> PFC21
//   carries PP-B2 no location (pp-b1; "Where is your place?" first, the climates behind "No location? Choose a climate") -> PFC1
//   carries PP-B2 with a location (pp-b1; the climates hidden until "Not this climate? Choose another") -> PFC3
//   carries PP-B2 a climate already chosen, r2-1 (pp-b1; a kept climate leaves the climates open) -> PFC10
//   carries PP-B2 r2-3 (pp-b1; ClimateHand: what a grower without a location loses, in words) -> PFC10
//   carries PP-B2 r3-1 (pp-b1; Forget on the place row) -> PFC12
//   carries PP-B2 conformance-2 (pp-b1; plants added on Place show under "What grows there already") -> PFC2
//   carries PP-B2 conformance-4 (pp-b1; Change on the place line keeps every plant) -> PFC12
//   carries PP-B2 b1a2-2 (pp-b1; Subtropical without a location says "Needs your location") -> PFC10
//   carries PP-B2 b1a2-3 (pp-b1; the map dialog closes with Cancel and leaves the place as it was) -> PFC8
//   carries PP-B12 guide over a save (pp-b1; "Kept from the guide: <plant>" with "Open my saved palette instead") -> PFC19
//   carries PP-B13 (pp-b1; a newer or unreadable link: one message, "Start a new palette / Back to mine", the save untouched) -> PFC19
//   carries PP-B12 keyboard answers (pp-b1; Enter on an arrival's choice keeps the focus on the page) -> PFC16
//   carries PP-B19 (pp-b1; Place fits 320 px in en, de, ru and ja) -> PFC1
//   carries PP-B72 (pp-b1; an own plant's × on Place hands the focus on) -> PFC2
//   carries PP-B15 (pp-b2; a slow list says "Still loading: the connection is slow…") -> PFC20
//   carries PP-B16 (pp-b2; a list that did not load says so, with Try again) -> PFC20
//   carries BT-1 S4 start (s4; the country line sits above the climate cards, in words) -> PFC11
//   carries memory.test "Use {climate}" (consortium-memory.test.mjs): dropped with the confirm (v13: the climate read is used at once; "Use <a> / Use <b>" stays only between two climates) -> PFC7
//   dropped: the "Your place" sheet (ChangePlace, v13: Change opens Place), the plot size on Place (moves
//   to the plan, PP-D), "Your spot" (PP-F), the cut-link, newer-version and old-link notices (one
//   message now: R4, A23), the DarkMap and LocSearch boards (removed in v13).
// Kept where they are (lasting seams through hooks pf-c keeps): the location's data-* hooks the
// consortium-p5-s5b cases read through p5-helpers, and the Place adds saved, failed-chunk notice cases in
// pp-b1. The restored marker F1a-P9 restored (scripts/plan/parked-markers.json) lives in PFC21.
import test from 'node:test';
import assert from 'node:assert/strict';
import { aria, h, useHarness } from './helpers.mjs';
import { atSite, tool } from './p5-helpers.mjs';
import { SITES } from './location-fixtures.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, boxOf, control, dialogText, done, focused, frames, idsOf, inOrder, linkOf, names, palette, pastEdge, press, savedPalette, says as saysOn, saysNot, setSiteEdits, toastText, withStorage } from './pf-helpers.mjs';
import { FIELD, listSize, searchFor, searchStub } from './pf-c-helpers.mjs';

useHarness();

// pf-helpers says(), with the words the page did say added to a failure (the board line stays first).
const says = async (page, words, opts) => {
  try { await saysOn(page, words, opts); } catch (e) {
    const said = await page.evaluate((d) => ((d ? document.querySelector('dialog[open]') : document.querySelector('main'))?.innerText ?? '').replace(/\s+/g, ' '), !!opts?.inDialog).catch(() => '');
    e.message += `\n  the page says: ${said.slice(0, 2400)}`;
    if (process.env.PFC_DEBUG) console.log(`SAID ${said}`);
    throw e;
  }
};

const buttons = async (page) => [...(await names(page, 'button')), ...(await names(page, 'link'))];
const hasAll = async (page, list) => { const all = await buttons(page); for (const b of list) assert.ok(all.includes(b), `board: "${b}"`); };
const store = (page, f) => page.evaluate(f);

test('PFC1 (pf-c Place, first visit, at 390, 1280 and 320): the steps "1 Your place", "2 Your palette", "3 Planting plan" in a "Steps" list, then "Plant palette" with "Data sources", the lede, "1 Where is your place?" with "A town is enough…", the field, "Search", "Use my location", "Pick on a map" and "No location? Choose a climate"; none of the dropped parts; nothing passes 320 px in en, de, ru, ja', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    await control(page, 'list', 'Steps');
    await inOrder(page, ['Your place', 'Your palette', 'Planting plan', 'Plant palette', 'Data sources',
      'Plants that fit your place and work together, now and as the climate warms. Tell us where your place is, then see your palette. Room and your own plants can wait.',
      '1 Where is your place?', 'A town is enough: the climate is read for a square about 11 km across.']);
    assert.equal(await page.evaluate(() => document.querySelector('[aria-current="step"]')?.textContent.replace(/\s+/g, ' ').trim()), '1 Your place', 'board: "Your place" is the current step');
    await control(page, 'textbox', FIELD).catch(() => control(page, 'searchbox', FIELD));
    await hasAll(page, ['Search', 'Use my location', 'Pick on a map', 'No location? Choose a climate']);
    for (const gone of ['Your spot', 'How big is the piece', 'Nothing is checked against your place until you confirm the climate.', 'A location suggests your climate']) await saysNot(page, gone, 'v13 removal');
    await done(page);
  }
  for (const lang of ['en', 'de', 'ru', 'ja']) {
    const small = await tool({ lang, width: 320 });
    await control(small, 'list', /./);
    assert.deepEqual(await pastEdge(small), [], `board: Place at 320 px in ${lang}`);
    await done(small);
  }
});

test('PFC2 (pf-c Place, questions 2 and 3, PlaceDesk at 1280): with a climate read, "2 How much room do you have?" with its five answers and their heights, the room sentence; "3 What grows there already, or what do you want for sure?", "Start from your own plants. We build around them.", "Add a plant by name, in any language", "Paste a list" on the laptop, each own plant with "Remove <plant>" handing the focus on; "Show my palette" and "No plants in mind? Start from a small suggested palette"; on the laptop questions 2 and 3 stand right of question 1', async () => {
  const page = await tool({ nominatim: 'fixture' });
  await searchFor(page, 'Kiambu');
  await says(page, '2 How much room do you have?', { timeout: 10_000 });
  await inOrder(page, ['2 How much room do you have?', 'Pots or a balcony', 'plants up to 6 m', 'Small garden', 'trees up to 6 m', 'Large garden', 'trees up to 12 m', 'Field or farm', 'trees of any height', 'Not sure', 'nothing is marked as too tall',
    'Room sets the size of a suggested palette (6 plants for a small garden, 9 for a large one or “Not sure”, 12 for a field) and the heights it picks. It never removes a plant: a taller one stays in every list, with a note to prune.',
    '3 What grows there already, or what do you want for sure?', 'Start from your own plants. We build around them.', 'Show my palette', 'No plants in mind? Start from a small suggested palette']);
  await hasAll(page, ['Add a plant by name, in any language', 'Paste a list', 'Start from a small suggested palette']);
  const q1 = await boxOf(page, '1 Where is your place?'), q2 = await boxOf(page, '2 How much room do you have?');
  assert.ok(q1 && q2 && q2.x > q1.x + 300, `board PlaceDesk: question 2 right of question 1 (${JSON.stringify({ q1, q2 })})`);
  const ids = await idsOf('Temperate', 2);
  await page.evaluate((x) => window.__ctTest.store.addMembers(x), ids);
  const removes = (await names(page, 'button')).filter((n) => /^Remove /.test(n));
  assert.equal(removes.length, 2, 'board: each own plant with "Remove <plant>"');
  await page.focus(aria('button', removes[0]));
  await page.keyboard.press('Enter');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'board: the focus moves on, never to <body>');
  await done(page);
});

test('PFC3 (pf-c the climate read, LocStates "read and used at once", Place, PlaceDesk): a found place gives the row "Near Kiambu, Kenya 1.17° S, 36.83° E" with "Not this place? Search again · Adjust on the map" (LocStates "One answer"), then "We read: <climate> (…)." with the list sentence and "Not this climate? Choose another", used at once (no "Use" button); "We use this climate from now on; you can change it at any time. Your place in figures: Köppen class C…; nights in the coldest month average N °C. Every figure the checks use is there, and you can change each one."; the link opens the figures; "Not this climate? Choose another" opens the climates', async () => {
  const page = await tool({ nominatim: 'fixture' });
  await searchFor(page, 'Kiambu');
  await says(page, /Near Kiambu, Kenya 1\.17° S, 36\.8\d° E/, { timeout: 10_000 });
  await hasAll(page, ['Not this place? Search again', 'Adjust on the map']);
  const zone = await store(page, () => window.__ctTest.store.climate.value);
  assert.ok(zone, 'board: the climate read is used at once');
  await says(page, new RegExp(`We read: ${zone} \\([^)]+\\)\\. (?:This climate has its own plant list\\.|No list of its own yet: its plants come from the nearest lists \\([^)]+\\), each marked “estimate”\\.)`));
  assert.ok(!(await buttons(page)).some((b) => /^Use \w+$/.test(b)), 'board: no "Use <climate>" button (v13)');
  await says(page, /We use this climate from now on; you can change it at any time\. Your place in figures: Köppen class C\w\w; nights in the coldest month average -?[\d.]+ ?°C\. Every figure the checks use is there, and you can change each one\./);
  await press(page, 'button', 'Your place in figures');
  assert.ok(await store(page, () => window.__ctTest.store.figureLine.value !== null), 'board: the link opens the figures (store.openFigure)');
  await press(page, 'button', 'Not this climate? Choose another');
  await says(page, 'Choose a climate');
  await says(page, /Tropical Ready/);
  await done(page);
});

test('PFC4 (pf-c LocStates, the place search): while it looks "Looking for “Kiambu”…" with "Stop"; one answer, taken directly, with "Not this place? Search again" and "Adjust on the map"; several answers, "3 places answer “Kiambu”. Which one is yours?" with a "Choose" per place, "None of these? Try the nearest town, or pick on a map. Place names © OpenStreetMap contributors." and the privacy line with "Privacy"; none, "No place found for “Kiambuu”. Check the spelling, try the nearest town, or pick your place on a map." with "Pick on a map" and "Choose a climate by hand"; offline, "The place search did not answer. …" with "Try again" and "Choose a climate by hand"', async () => {
  const held = await tool({ width: 390, nominatim: 'fixture', setup: searchStub({ several: { kiambu: [['Kiambu', 'Kiambu, Kiambu County, Kenya', SITES.kiambu[0], SITES.kiambu[1], 'town']] }, hold: true }) });
  await searchFor(held, 'Kiambu');
  await says(held, 'Looking for “Kiambu”…');
  await control(held, 'button', 'Stop');
  await held.evaluate(() => window.__releaseSearch());
  await says(held, /Near Kiambu, Kenya/, { timeout: 10_000 });
  await hasAll(held, ['Not this place? Search again', 'Adjust on the map']);
  await done(held);
  const several = await tool({ width: 390, nominatim: 'fixture', setup: searchStub() });
  await searchFor(several, 'Kiambu');
  await says(several, '3 places answer “Kiambu”. Which one is yours?', { timeout: 10_000 });
  await inOrder(several, ['Kiambu', 'Kiambu County', 'Kiambu Road', 'None of these? Try the nearest town, or pick on a map. Place names © OpenStreetMap contributors.',
    'Your search words go to OpenStreetMap’s place search (Nominatim) only when you press Search; nothing is sent as you type. Coordinates are read on this device and sent nowhere.']);
  const chooses = (await names(several, 'button')).filter((n) => /^Choose/.test(n));
  assert.equal(chooses.length, 3, 'board: a "Choose" for each place');
  await control(several, 'link', 'Privacy');
  assert.equal(await store(several, () => window.__ctTest.store.location.value), null, 'board: several answers: the grower chooses');
  await press(several, 'button', chooses[0]);
  await says(several, /Near Kiambu, Kenya/, { timeout: 10_000 });
  await done(several);
  const none = await tool({ nominatim: 'fixture' });
  await searchFor(none, 'Kiambuu');
  await says(none, 'No place found for “Kiambuu”. Check the spelling, try the nearest town, or pick your place on a map.');
  await hasAll(none, ['Pick on a map', 'Choose a climate by hand']);
  await done(none);
  const off = await tool({ nominatim: 'offline' });
  await searchFor(off, 'Kiambu');
  await says(off, 'The place search did not answer. You may be offline, or it is busy. Coordinates work without a connection: type them, or choose a climate by hand.');
  await hasAll(off, ['Try again', 'Choose a climate by hand']);
  await done(off);
});

failing('PFC5 (pf-c LocStates, typed coordinates, owner Q6): "-1.17, 36.83", "1°10′S 36°50′E" and a pasted map link each read "1.17° S, 36.83° E Read on this device. Nothing was sent, so the place has no name." with "Adjust on the map" and "Look up its name", and send nothing; "1.17 36" says "We could not read “1.17 36” as coordinates. Write latitude, then longitude: −1.17, 36.83. Or press Search to look it up as a name." and sends nothing; Search again looks it up as a name', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ width: 390, nominatim: 'fixture' });
  for (const typed of ['-1.17, 36.83', '1°10′S 36°50′E', 'https://www.openstreetmap.org/#map=12/-1.17/36.83']) {
    await searchFor(page, typed);
    await says(page, '1.17° S, 36.83° E Read on this device. Nothing was sent, so the place has no name.', { timeout: 10_000 });
    await hasAll(page, ['Adjust on the map', 'Look up its name']);
  }
  assert.equal(page.nominatim.length, 0, 'board: typed coordinates send nothing');
  await searchFor(page, '1.17 36');
  await says(page, 'We could not read “1.17 36” as coordinates. Write latitude, then longitude: −1.17, 36.83. Or press Search to look it up as a name.');
  assert.equal(page.nominatim.length, 0, 'board: nothing sent for coordinates not understood');
  await press(page, 'button', 'Search');
  for (let i = 0; i < 50 && page.nominatim.length === 0; i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal(page.nominatim.length, 1, 'board: Search again looks it up as a name');
  await done(page);
});

test('PFC6 (pf-c LocStates, Use my location): waiting, "Waiting for your device to give its position. Your browser may ask for permission." with "Stop"; refused, "Your location is blocked for this site. Search for a town or pick on a map instead; or allow it in your browser’s site settings."; not found, "Your device did not find its position in 10 seconds. Try again outdoors, or search for a town." with "Try again" and "Pick on a map"; no location service or no WebGL: the button that cannot work is not shown, Search stays', async () => {
  const wait = await tool({ geolocation: 'timeout', geoTimeoutMs: 3000 });
  await press(wait, 'button', 'Use my location');
  await says(wait, 'Waiting for your device to give its position. Your browser may ask for permission.');
  await control(wait, 'button', 'Stop');
  await says(wait, 'Your device did not find its position in 10 seconds. Try again outdoors, or search for a town.', { timeout: 15_000 });
  await hasAll(wait, ['Try again', 'Pick on a map']);
  await done(wait);
  const denied = await tool({ geolocation: 'denied' });
  await press(denied, 'button', 'Use my location');
  await says(denied, 'Your location is blocked for this site. Search for a town or pick on a map instead; or allow it in your browser’s site settings.');
  await done(denied);
  const noGl = await tool({ webgl: false });
  await control(noGl, 'button', 'Search');
  assert.ok(!(await buttons(noGl)).includes('Pick on a map'), 'board: no WebGL, no "Pick on a map"');
  await done(noGl);
});

test('PFC7 (pf-c LocStates, edge states): the sea, "No climate is recorded at this point: it is in the sea or on a very small island. Move the cross onto the nearest land." with "Adjust on the map" and "Search again"; a new point at sea with a place kept, "There is no climate data there: pick a point on land. Still using near Kiambu, Kenya."; the coast sentence; the polar point with "Choose a climate by hand" and "Ask for this climate"; between two climates, "Between Subtropical and Tropical; we picked Subtropical. Check it. …" with "Use Subtropical" and "Use Tropical"; a climate that could not be read, "We found your place but could not read its climate. The file did not load. Your place is kept." with "Try again"', async () => {
  const page = await tool({ width: 390, nominatim: 'fixture' });
  await searchFor(page, '40, -40');
  await says(page, 'No climate is recorded at this point: it is in the sea or on a very small island. Move the cross onto the nearest land.', { timeout: 10_000 });
  await hasAll(page, ['Adjust on the map', 'Search again']);
  await searchFor(page, 'Kiambu');
  await says(page, /Near Kiambu, Kenya/, { timeout: 10_000 });
  await searchFor(page, '40, -40');
  await says(page, 'There is no climate data there: pick a point on land. Still using near Kiambu, Kenya.', { timeout: 10_000 });
  await searchFor(page, `${SITES.coast[0]}, ${SITES.coast[1]}`);
  await says(page, 'This point is off the coast: the climate comes from the nearest land, and there is no country or soil data here.', { timeout: 10_000 });
  await searchFor(page, 'Longyearbyen');
  await says(page, 'That is a polar climate: no plant list covers it, so no climate is suggested.', { timeout: 10_000 });
  await hasAll(page, ['Choose a climate by hand', 'Ask for this climate']);
  await searchFor(page, `${SITES.nairobi[0]}, ${SITES.nairobi[1]}`);
  await says(page, /Between Subtropical and Tropical; we picked Subtropical\. Check it\. Your place is within [\d.]+ °C of a temperature that separates two climates\./, { timeout: 10_000 });
  await press(page, 'button', 'Use Tropical');
  assert.equal(await store(page, () => window.__ctTest.store.climate.value), 'Tropical', 'board: "Use Tropical" chooses it');
  await control(page, 'button', 'Use Subtropical');
  await done(page);
  const failed = await tool({ climateTiles: 404 });
  await searchFor(failed, '-1.17, 36.83');
  await says(failed, 'We found your place but could not read its climate. The file did not load. Your place is kept.', { timeout: 20_000 });
  await hasAll(failed, ['Try again', 'Choose a climate by hand']);
  await done(failed);
});

test('PFC8 (pf-c LocMap at 390, light and dark, carried from b1a2-3): "Pick on a map" opens "Pick your place on the map" with "Back, without changing your place", "Zoom in", "Zoom out", "N° S, E° E under the cross", the two paragraphs, "Cancel" and "Use this point"; Cancel leaves the place as it was; "Use this point" takes the point under the cross; a map that does not load says "The map did not load. You may be offline. Search by name or type coordinates instead." with "Try again"', async () => {
  for (const theme of ['light', 'dark']) {
    const page = await tool({ width: 390, theme });
    await press(page, 'button', 'Pick on a map');
    await says(page, 'Pick your place on the map', { inDialog: true, timeout: 10_000 });
    await says(page, 'Drag the map until the cross is on your land. No need to be exact: the climate is read for a square about 11 km across. With a keyboard, the arrow keys move the map.', { inDialog: true });
    await says(page, 'The map comes from OpenFreeMap. Like any map, its server sees your internet address and the area you look at. The point you choose stays on this device.', { inDialog: true });
    await says(page, /[\d.]+° [NS], [\d.]+° [EW] under the cross/, { inDialog: true });
    for (const b of ['Back, without changing your place', 'Zoom in', 'Zoom out', 'Cancel', 'Use this point']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
    const before = await store(page, () => JSON.stringify(window.__ctTest.store.location.value));
    await press(page, 'button', 'Cancel');
    assert.ok(await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 }).then(() => true, () => false), 'board: Cancel closes the map');
    assert.equal(await store(page, () => JSON.stringify(window.__ctTest.store.location.value)), before, 'board: the place as it was');
    if (theme === 'light') {
      await press(page, 'button', 'Pick on a map');
      await page.waitForFunction(() => typeof window.__ctTest.mapCentre === 'function', { timeout: 10_000 });
      await page.evaluate(([lat, lon]) => window.__ctTest.mapCentre({ lat, lon }), SITES.kiambu);
      await says(page, /1\.17° S, 36\.8\d° E under the cross/, { inDialog: true });
      await press(page, 'button', 'Use this point');
      assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.location.value?.lookup, { timeout: 10_000 }).then(() => true, () => false), 'board: the point under the cross becomes the place');
    }
    await done(page);
  }
  const broken = await tool({ width: 390, block: { maplibre: 404 } });
  await press(broken, 'button', 'Pick on a map');
  await says(broken, 'The map did not load. You may be offline. Search by name or type coordinates instead.', { inDialog: true, timeout: 10_000 });
  await hasAll(broken, ['Try again', 'Cancel']);
  await done(broken);
});

test('PFC9 (pf-c LocDesk at 1280): "Pick on a map" opens "Where is your place?" with "Search by name, type coordinates, or move the map.", "Close", its own field and "Search" left of the map, "Choose an answer on the left, then drag the map until the cross is on your land. No need to be exact: the climate is read for a square about 11 km across.", "Cancel" and "Use this point"; several answers list on the left', async () => {
  const page = await tool({ width: 1280, nominatim: 'fixture', setup: searchStub() });
  await press(page, 'button', 'Pick on a map');
  await says(page, 'Where is your place?', { inDialog: true, timeout: 10_000 });
  await says(page, 'Search by name, type coordinates, or move the map.', { inDialog: true });
  await says(page, 'Choose an answer on the left, then drag the map until the cross is on your land. No need to be exact: the climate is read for a square about 11 km across.', { inDialog: true });
  for (const b of ['Close', 'Search', 'Zoom in', 'Zoom out', 'Cancel', 'Use this point']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  const field = await page.evaluate((f) => { const el = document.querySelector(`dialog[open] input[aria-label="${f}"], dialog[open] input[placeholder="${f}"]`); const r = el?.getBoundingClientRect(); return r ? { x: r.left, right: r.right } : null; }, FIELD);
  const map = await page.evaluate(() => { const m = document.querySelector('dialog[open] [role="img"]'); const r = m?.getBoundingClientRect(); return r ? { x: r.left } : null; });
  assert.ok(field && map && map.x >= field.right, `board: the map right of the search (${JSON.stringify({ field, map })})`);
  const input = await page.$(`dialog[open] input[aria-label="${FIELD}"]`);
  await input.type('Kiambu');
  await page.keyboard.press('Enter');
  await says(page, '3 places answer “Kiambu”. Which one is yours?', { inDialog: true, timeout: 10_000 });
  assert.match(await dialogText(page), /under the cross/, 'board: the point under the cross');
  await done(page);
});

test('PFC10 (pf-c ClimateHand, carried from PP-B2 r2-1, r2-3 and b1a2-2): "No location? Choose a climate" opens "Choose a climate", "Without a location you still get a palette. You do not get: …", each climate with its state and its list ("Ready … its own list, N plants" from the installed release, "Needs your location … nearest lists: …"), "Polar and high mountain No list yet Not covered yet. Ask for this climate", and "Choose a ready climate, or give a location, to go on."; a kept climate leaves them open', async () => {
  const page = await tool({ width: 390 });
  await press(page, 'button', 'No location? Choose a climate');
  await says(page, 'Choose a climate');
  await says(page, 'Without a location you still get a palette. You do not get: the check of each plant against your climate, the later periods, your place in figures. You can add a location at any time.');
  await says(page, `Tropical Ready Warm all year; wet, or with a dry season · its own list, ${listSize('Tropical')} plants`);
  await says(page, 'Subtropical Needs your location Hot humid summers, or mild with a dry winter · nearest lists: Mediterranean, Tropical, Temperate');
  await says(page, `Arid Ready Desert and steppe · its own list, ${listSize('Arid')} plants`);
  await says(page, 'Polar and high mountain No list yet Not covered yet. Ask for this climate');
  await says(page, 'Choose a ready climate, or give a location, to go on.');
  await done(page);
  const kept = await withStorage({ 'canopi-climate': 'temperate' });
  await says(kept, /Temperate Ready/);
  await done(kept);
});

test('PFC11 (pf-c Country, owner Q2, carried from BT-1 S4 and PF3): from the place "Invasive warnings for Kenya · from your location · Change"; with no location, guessed, "Invasive warnings for Kenya · guessed from your browser" with "Use Kenya" and "Change", above the climates; no country: "No country. Each plant says in how many countries it is recorded invasive. These counts are worldwide: they do not say whether it is invasive where you are." with "Add your country" and "Why we ask", its words and "Your country stays on this device."; Change offers "Another country" and "No country"; a country GRIIS does not cover says "not checked", never "not invasive"', async () => {
  const placed = await tool({ nominatim: 'fixture' });
  await searchFor(placed, 'Kiambu');
  await says(placed, 'Invasive warnings for Kenya · from your location · Change', { timeout: 10_000 });
  await press(placed, 'button', 'Change');
  await says(placed, /Kenya from your location/);
  await says(placed, /Another country for a plot elsewhere than the point you gave/);
  await says(placed, /No country each plant then shows its worldwide count/);
  await done(placed);
  const guess = await tool({ setup: async (pg) => { await pg.emulateTimezone('Africa/Nairobi'); await pg.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'languages', { get: () => ['en-KE', 'en'] }); }); } });
  await press(guess, 'button', 'No location? Choose a climate');
  await says(guess, 'Invasive warnings for Kenya · guessed from your browser');
  await hasAll(guess, ['Use Kenya', 'Change']);
  await inOrder(guess, ['Invasive warnings for Kenya', 'Tropical']);
  await done(guess);
  const none = await withStorage({ 'canopi-country': '-' });
  await says(none, 'No country. Each plant says in how many countries it is recorded invasive. These counts are worldwide: they do not say whether it is invasive where you are.');
  await hasAll(none, ['Add your country', 'Why we ask']);
  await press(none, 'button', 'Why we ask');
  await says(none, 'Why we ask. A plant can be harmless in one country and recorded invasive in the next. We warn, and never hide a plant on our own: an invasive plant stays in every list and in suggestions, with its warning, unless you hide it yourself in Filters. It is added with one tap, no question. You decide.');
  await says(none, 'Your country stays on this device. It goes into a link you share only if you chose it yourself, or tick “Include my place”. A guess from the browser never travels.');
  await done(none);
  const re = await withStorage({ 'canopi-country': 'RE' });
  await says(re, 'Invasive warnings for Réunion · chosen by you · Change');
  await says(re, 'Not checked in Réunion: GRIIS has no checklist for it yet, so no plant is marked invasive there. That is “not checked”, never “not invasive”.');
  await done(re);
});

test('PFC12 (pf-c SiteKiambu, the frame, carried from r3-1 and conformance-4; Toasts Start over): Change on the palette opens Place with the row "Near … · <climate> (Köppen C…), read from your location" and "Adjust on the map · Search again · Not this climate? Choose another · Forget", question 2, the country line, then "Start over" and "Back to my palette" (no question 3); Back keeps every plant; Start over says "Palette cleared: 8 plants. Your place is kept." with Undo, and Undo brings the 8 back', async () => {
  const page = await palette({ climate: 'Temperate', site: 'kiambu', n: 8, width: 390 });
  await press(page, 'button', 'Change');
  await says(page, '1 Where is your place?');
  await says(page, /Near kiambu 1\.17° S, 36\.8\d° E · Temperate \(Köppen Cfb\), read from your location/);
  await hasAll(page, ['Adjust on the map', 'Search again', 'Not this climate? Choose another', 'Forget', 'Start over', 'Back to my palette']);
  await inOrder(page, ['1 Where is your place?', '2 How much room do you have?', 'Invasive warnings for', 'Start over', 'Back to my palette']);
  await saysNot(page, '3 What grows there already', 'SiteKiambu: the frame has no question 3');
  await press(page, 'button', 'Back to my palette');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.view.value !== 'start', { timeout: 4000 }).then(() => true, () => false), 'board: back on the palette');
  assert.equal(await store(page, () => window.__ctTest.store.members.value.length), 8, 'board: every plant kept');
  await press(page, 'button', 'Change');
  await press(page, 'button', 'Start over');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.toast.value?.text === 'Palette cleared: 8 plants. Your place is kept.', { timeout: 4000 }).then(() => true, () => false), `board: the Start over toast (${await toastText(page)})`);
  await press(page, 'button', 'Undo');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 8, { timeout: 4000 }).then(() => true, () => false), 'board: Undo brings the 8 plants back');
  await done(page);
});

test('PFC13 (pf-c the palette\'s place line, Main, Palette, Many; carried from PF3): "Near seville · Mediterranean list · 13 plants · Change" in that order; a borrowed climate reads "Subtropical, nearest lists: an estimate"; the room in words; the grower\'s own values named ("watering, rain only"); a new climate cell clears them and the line says once "Your own values were for your old place: cleared" (A7, F8); the same cell keeps them', async () => {
  const page = await palette({ room: 'field' });
  await inOrder(page, ['Near seville', 'Mediterranean list', 'farm', '13 plants', 'Change']);
  await setSiteEdits(page, { watering: 'rain' });
  await says(page, /Near seville · Mediterranean list · farm · watering, rain only · 13 plants · Change/);
  await atSite(page, 'seville');
  await says(page, /watering, rain only/);
  await saysNot(page, 'Your own values were for your old place: cleared');
  await page.evaluate(() => window.__ctTest.store.hideToast());
  await page.evaluate(([lat, lon]) => { const s = window.__ctTest.store; s.placeAt({ ...s.location.value, lat, lon, label: 'kiambu', lookup: undefined }); }, SITES.kiambu);
  await says(page, 'Your own values were for your old place: cleared');
  await saysNot(page, 'watering, rain only');
  await done(page);
  const borrowed = await palette({ climate: 'Mediterranean', site: 'kiambu', n: 5 });
  await borrowed.evaluate(async () => { const s = window.__ctTest.store; s.climate.value = 'Subtropical'; await s.loadPool('Subtropical'); });
  await says(borrowed, /Near kiambu · Subtropical, nearest lists: an estimate · 5 plants · Change/);
  await done(borrowed);
});

test('PFC14 (pf-c Oulu, the place banner): a palette whose climate is colder than any list says "Colder than any list we have made. Köppen class D…: Boreal, read from your location. Coldest month N °C. Its plants come from the nearest lists (Temperate, Mediterranean): …" and "Each is an estimate."', async () => {
  const page = await palette({ climate: 'Temperate', site: 'yakutsk', n: 5 });
  await page.evaluate(async () => { const s = window.__ctTest.store; s.climate.value = 'Boreal'; await s.loadPool('Boreal'); });
  await says(page, /Colder than any list we have made\. Köppen class D\w\w: Boreal, read from your location\. Coldest month [−-]?[\d.]+ ?°C\. Its plants come from the nearest lists \(Temperate, Mediterranean\)/, { timeout: 15_000 });
  await says(page, 'Each is an estimate.');
  await done(page);
});

test('F1a-P2 → PP-C (pf-c Arrivals, the return, owner Q3; PFC15): a palette saved here opens with "Opening your palette…", then the palette with "Welcome back. Your palette, last changed 9 November: 8 plants near Kiambu, Kenya. Kept on this device only." and "Start over"; the Place form never shows', async () => {
  const save = await savedPalette('Temperate', 8, '2026-11-09T10:00:00.000Z');
  const page = await withStorage({ 'canopi-consortium': save, 'canopi-location': JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }) });
  await says(page, 'Welcome back. Your palette, last changed 9 November: 8 plants near Kiambu, Kenya. Kept on this device only.', { timeout: 10_000 });
  await control(page, 'button', 'Start over');
  await saysNot(page, '1 Where is your place?', 'a return visit never shows the Place form');
  assert.equal(await store(page, () => window.__ctTest.store.members.value.length), 8, 'the saved plants');
  await done(page);
});

test('PFC16 (pf-c Arrivals, a shared link over your palette, owner Q7, carried from PP-B12 keyboard answers): "Someone shared a palette with you", "13 plants from the Mediterranean list. Your own palette (8 plants) stays on this device, untouched." with "Look at the shared palette", "Add its plants to mine", "Stay with mine"; Look says "You are looking at a shared palette. Nothing of yours was changed." with "Keep it as mine" and "Back to mine", the focus kept on the page; Add its plants to mine adds them with Undo; Stay with mine keeps mine', async () => {
  const save = await savedPalette('Temperate', 8);
  const hash = await linkOf('Mediterranean', 13);
  const page = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await says(page, 'Someone shared a palette with you', { timeout: 10_000 });
  await says(page, '13 plants from the Mediterranean list. Your own palette (8 plants) stays on this device, untouched.');
  await hasAll(page, ['Look at the shared palette', 'Add its plants to mine', 'Stay with mine']);
  await page.focus(aria('button', 'Look at the shared palette'));
  await page.keyboard.press('Enter');
  await says(page, 'You are looking at a shared palette. Nothing of yours was changed.');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'board: the focus stays on the page');
  await hasAll(page, ['Keep it as mine', 'Back to mine']);
  await done(page);
  const add = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await press(add, 'button', 'Add its plants to mine', 10_000);
  assert.ok(await add.waitForFunction(() => window.__ctTest.store.members.value.length > 8, { timeout: 8000 }).then(() => true, () => false), 'board: its plants join mine');
  await press(add, 'button', 'Undo');
  assert.ok(await add.waitForFunction(() => window.__ctTest.store.members.value.length === 8, { timeout: 4000 }).then(() => true, () => false), 'board: Undo gives mine back');
  await done(add);
  const stay = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await press(stay, 'button', 'Stay with mine', 10_000);
  assert.ok(await stay.waitForFunction(() => window.__ctTest.store.members.value.length === 8, { timeout: 8000 }).then(() => true, () => false), 'board: Stay with mine keeps my 8 plants');
  await saysNot(stay, 'Someone shared a palette with you');
  await done(stay);
});

test('PFC17 (pf-c Arrivals, a link without a place, F13): with no place of yours, "This palette came without a place. Its plants are from the Mediterranean list. Give your place to check them against your climate." with "Give my place" and "Later"; with your own place, "This palette came without a place, so it is checked against yours: near Kiambu, Kenya, with your own values. The sender’s place and own values were not sent." with "Change place"', async () => {
  const bare = await tool({ hash: await linkOf('Mediterranean', 5) });
  await says(bare, 'This palette came without a place. Its plants are from the Mediterranean list. Give your place to check them against your climate.', { timeout: 10_000 });
  await hasAll(bare, ['Give my place', 'Later']);
  await press(bare, 'button', 'Later');
  await saysNot(bare, 'This palette came without a place.');
  await done(bare);
  const mine = await withStorage({ 'canopi-location': JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }) }, `/palette/${await linkOf('Mediterranean', 5)}`);
  await mine.waitForFunction(() => !!window.__ctTest?.store?.location.value?.lookup, { timeout: 15_000 });
  await setSiteEdits(mine, { watering: 'first-years' });
  await says(mine, 'This palette came without a place, so it is checked against yours: near Kiambu, Kenya, with your own values. The sender’s place and own values were not sent.', { timeout: 10_000 });
  await control(mine, 'button', 'Change place');
  await done(mine);
});

test('PFC18 (pf-c Arrivals, a link with a place, F12): "The link carries a place: near …, with the sender’s own values: watering, rain only." with "Use it" and "Use my own place"; Use my own place leaves the reader\'s values untouched', async () => {
  const { encodeLink } = await import('../../src/lib/consortium/state.ts');
  const { TODAY_PERIOD } = await import('../../src/lib/consortium/source.ts');
  const { realDb } = await import('./helpers.mjs');
  const all = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' ORDER BY 1").all().map((r) => String(r.id)));
  const members = await idsOf('Mediterranean', 5);
  const frag = encodeLink({ climate: 'Mediterranean', country: 'ES', room: 'unsure', plot: null, period: TODAY_PERIOD, members, removed: [], guests: [], siteEdits: { watering: 'rain' } }, { Mediterranean: all }, { origin: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  const page = await withStorage({ 'canopi-location': JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }) }, `/palette/#${frag}`);
  await says(page, /The link carries a place: near [^(]+\(a square about 11 km across\), with the sender’s own values: watering, rain only\./, { timeout: 15_000 });
  await hasAll(page, ['Use it', 'Use my own place']);
  await press(page, 'button', 'Use my own place');
  assert.deepEqual(await store(page, () => window.__ctTest.store.siteEdits.value), {}, 'board: the reader\'s own values (none) come back');
  await done(page);
});

test('PFC19 (pf-c Arrivals, the other links, F14, carried from PP-B12 and PP-B13): a guide link over a save, "Kept from the guide: Apple. Your saved palette (4 plants) is kept. Apple is one of your plants now, on the Temperate list the guide named. Add your place to check it." with "Give my place" and "Open my saved palette instead"; a guide plant the list lacks, "… is not in the Temperate list, so the guide’s plant could not be kept." with "Find a plant"; a cut, damaged or newer link, "This link could not be read. Nothing was changed." with "Start a new palette" and "Back to mine", the save untouched and nothing restored', async () => {
  const save = await savedPalette('Temperate', 4);
  const guide = await withStorage({ 'canopi-consortium': save }, '/palette/?plant=Malus%20domestica&climate=temperate');
  await says(guide, /Kept from the guide: (\S[^.]*)\. Your saved palette \(4 plants\) is kept\. \1 is one of your plants now, on the Temperate list the guide named\. Add your place to check it\./, { timeout: 10_000 });
  await hasAll(guide, ['Give my place', 'Open my saved palette instead']);
  await done(guide);
  const missing = await withStorage({}, '/palette/?plant=Nothingus%20fakeus&climate=temperate');
  await says(missing, 'Nothingus fakeus is not in the Temperate list, so the guide’s plant could not be kept.', { timeout: 10_000 });
  await control(missing, 'button', 'Find a plant');
  await done(missing);
  for (const frag of ['#v=99&c=temperate&a=abcdef&e=1', '#v=x5&c=temperate&a=abcdef&e=1', `${(await linkOf('Temperate', 3)).replace('&e=1', '')}`]) {
    const bad = await withStorage({ 'canopi-consortium': save }, `/palette/${frag}`);
    await says(bad, 'This link could not be read. Nothing was changed.', { timeout: 10_000 });
    await hasAll(bad, ['Start a new palette', 'Back to mine']);
    await saysNot(bad, 'newer version');
    assert.equal(await bad.evaluate(() => localStorage.getItem('canopi-consortium')), save, 'the save untouched');
    assert.equal(await store(bad, () => window.__ctTest.store.members.value.length), 0, 'nothing restored');
    await done(bad);
  }
});

test('PFC20 (pf-c Loading, carried from PP-B15 and PP-B16): "Loading the plant list… You can already give your place." with the field usable; slow, "Still loading: the connection is slow. Keep going; your answers are kept."; a list that did not load, "The plant list did not load. Check your connection." with "Try again"; damaged, "The plant list arrived damaged. We did not use it." with "Try again"', async () => {
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', database: 'hold', timeouts: { slow: 400 } });
  await says(page, 'Loading the plant list… You can already give your place.', { timeout: 8000 });
  await control(page, 'textbox', FIELD);
  await says(page, /Still loading: the connection is slow\. Keep going; your answers are kept\./, { timeout: 8000 });
  await page.releaseHeld();
  await done(page);
  // Nothing arrives (the stall timer, board: "also when nothing arrives for 15 seconds"); a 404 is read as a
  // newer tool ("The tool was updated…"), not as the list missing.
  const lost = await h.open('/palette/', { hook: true, mapTiles: 'stub', database: 'stall', timeouts: { stall: 500 } });
  await says(lost, 'The plant list did not load. Check your connection.', { timeout: 10_000 });
  await control(lost, 'button', 'Try again');
  await done(lost);
  const bad = await h.open('/palette/', { hook: true, mapTiles: 'stub', database: 'corrupt' });
  await says(bad, 'The plant list arrived damaged. We did not use it.', { timeout: 10_000 });
  await control(bad, 'button', 'Try again');
  await done(bad);
});

test('PFC21 (pf-c status regions, F1a-P9\'s row, carried from PP-B3): from Place to the palette every live region is on the page before its message (the search\'s "Looking for “Kiambu”…", the climate read)', async () => {
  const page = await tool({ nominatim: 'fixture', setup: (pg) => pg.evaluateOnNewDocument(() => {
    window.__late = [];
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches?.('[role="status"], [aria-live]') && n.textContent.trim()) window.__late.push(n.textContent.trim().slice(0, 40)); }).observe(document, { subtree: true, childList: true });
  }) });
  await searchFor(page, 'Kiambu');
  await says(page, /We read: /, { timeout: 10_000 });
  assert.deepEqual(await page.evaluate(() => window.__late), [], 'board: every live region there before its message');
  await done(page);
});
