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
//   carries PP-B2 a climate already chosen, r2-1 (pp-b1; replaced in fix round 1, BC15: a kept climate opens Place on it, the cards one link away) -> PFC10
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
import { aria, h, has, useHarness } from './helpers.mjs';
import { atSite, releaseTiles, slowTiles, tool } from './p5-helpers.mjs';
import { SITES, lookupAt } from './location-fixtures.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, boxOf, control, dialogText, done, focused, frames, idsOf, inOrder, linkOf, names, palette, pastEdge, press, savedPalette, says as saysOn, saysNot, setSiteEdits, toastText, withStorage } from './pf-helpers.mjs';
import { FIELD, listSize, noticeOf, rankOf, searchFor, searchStub, toneOf } from './pf-c-helpers.mjs';

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
  const page = await tool({ width: 390, nominatim: 'fixture' });
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

test('PFC6 (pf-c LocStates, Use my location): waiting, "Waiting for your device to give its position. Your browser may ask for permission." with "Stop"; refused, "Your location is blocked for this site. Search for a town or pick on a map instead; or allow it in your browser’s site settings."; not found, "Your device did not find its position in N seconds." (the wait the code uses) Try again outdoors, or search for a town." with "Try again" and "Pick on a map"; no location service or no WebGL: the button that cannot work is not shown, Search stays', async () => {
  const wait = await tool({ geolocation: 'timeout', geoTimeoutMs: 3000 });
  await press(wait, 'button', 'Use my location');
  await says(wait, 'Waiting for your device to give its position. Your browser may ask for permission.');
  await control(wait, 'button', 'Stop');
  await says(wait, /Your device did not find its position in (15|45) seconds\. Try again outdoors, or search for a town\./, { timeout: 15_000 });
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

test('PFC10 (pf-c ClimateHand, carried from PP-B2 r2-1, r2-3 and b1a2-2): "No location? Choose a climate" opens "Choose a climate", "Without a location you still get a palette. You do not get: …", each climate with its state and its list ("Ready … its own list, N plants" from the installed release, "Needs your location … nearest lists: …"), "Polar and high mountain No list yet Not covered yet. Ask for this climate", and "Choose a ready climate, or give a location, to go on."; a kept climate opens Place on it, its card chosen', async () => {
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
  // A kept climate opens Place on it (fix round 1 BC15: the r2-1 row "a kept climate leaves the climates
  // open" no longer matches v14); the cards are one link away, the kept one chosen.
  const kept = await withStorage({ 'canopi-climate': 'temperate' });
  await says(kept, 'Temperate list', { timeout: 10_000 });
  await press(kept, 'button', 'Not this climate? Choose another');
  assert.ok(await kept.evaluate(() => [...document.querySelectorAll('#ct-climates input')].find((x) => x.checked)?.closest('label').textContent.startsWith('Temperate')), 'the kept climate is the chosen card');
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

test('F1a-P2 → PP-C (pf-c Arrivals, the return, owner Q3; PFC15): a palette saved here opens with "Opening your palette…", then the palette with "Welcome back. Your palette, last changed 9 November: 8 plants near Kiambu. Kept on this device only." and "Start over"; the Place form never shows', async () => {
  const save = await savedPalette('Temperate', 8, '2026-11-09T10:00:00.000Z');
  const page = await withStorage({ 'canopi-consortium': save, 'canopi-location': JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }) });
  await says(page, 'Welcome back. Your palette, last changed 9 November: 8 plants near Kiambu. Kept on this device only.', { timeout: 10_000 });
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
  await saysNot(lost, 'Meanwhile, the Field Guides', 'BC22: the board has no guide sentence here');
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

// ---- fix round 1 (review of 7fc9e431: board check BC*, code review R*, conformance C*) ----

test('PFC22 (pf-c fix round 1 BC1, R16, C14: the steps): at 390 and 1280, once a plant is added on Place the steps still read "1 Your place", "2 Your palette", "3 Planting plan", step 2 a button that opens the palette; a returning visit marks the head as the palette step before the island runs', async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width, nominatim: 'fixture' });
    await searchFor(page, 'Kiambu');
    await says(page, /We read: /, { timeout: 10_000 });
    const ids = await idsOf(await store(page, () => window.__ctTest.store.climate.value), 1);
    await page.evaluate((x) => window.__ctTest.store.addMembers(x), ids);
    await frames(page);
    const steps = await page.evaluate(() => [...document.querySelectorAll('#ct-steps > li')].filter((li) => li.getClientRects().length).map((li) => li.innerText.replace(/\s+/g, ' ').trim()));
    assert.deepEqual(steps, ['1 Your place', '2 Your palette', '3 Planting plan'], `board Place/PlaceDesk at ${width}: the three steps after an add`);
    await press(page, 'button', '2 Your palette');
    assert.ok(await page.waitForFunction(() => window.__ctTest.store.view.value !== 'start', { timeout: 4000 }).then(() => true, () => false), 'board: step 2 opens the palette');
    await done(page);
  }
  const save = await savedPalette('Temperate', 8);
  const back = await h.open('/palette/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((v) => { localStorage.setItem('canopi-consortium', v); document.addEventListener('DOMContentLoaded', () => { window.__stepAtLoad = document.getElementById('ct-head')?.dataset.step ?? ''; }); }, save) });
  await back.waitForFunction(() => window.__stepAtLoad !== undefined, { timeout: 10_000 });
  assert.equal(await back.evaluate(() => window.__stepAtLoad), 'palette', 'R16: a return visit paints the palette head first (no shift)');
  await done(back);
});

test('PFC23 (pf-c fix round 1 BC3, BC4, BC23, R13, C8: the arrival notices as Arrivals draws them): each with its icon, its bold lead and its actions on their own row; ranks as drawn; warning and danger tones; "near Kiambu" (the short place)', async () => {
  const kiambu = JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' });
  const save = await savedPalette('Temperate', 8, '2026-11-09T10:00:00.000Z');
  const back = await withStorage({ 'canopi-consortium': save, 'canopi-location': kiambu });
  await says(back, 'Welcome back. Your palette, last changed 9 November: 8 plants near Kiambu. Kept on this device only.', { timeout: 15_000 });
  assert.deepEqual(await noticeOf(back, '[data-place-notice="welcome"]'), { lead: 'Welcome back.', icon: true, ownRow: true, acts: 1 }, 'board: welcome back');
  assert.equal(await rankOf(back, 'Start over'), 'quiet', 'board: Start over is a link');
  assert.equal(await toneOf(back, '[data-place-notice="welcome"]'), 'neutral');
  await done(back);
  const hash = await linkOf('Mediterranean', 13);
  const over = await withStorage({ 'canopi-consortium': save, 'canopi-location': kiambu }, `/palette/${hash}`);
  await says(over, '13 plants from the Mediterranean list. Your own palette (8 plants near Kiambu) stays on this device, untouched.', { timeout: 15_000 });
  assert.deepEqual([await rankOf(over, 'Look at the shared palette'), await rankOf(over, 'Add its plants to mine'), await rankOf(over, 'Stay with mine')], ['primary', 'secondary', 'quiet'], 'board: the shared notice ranks');
  await press(over, 'button', 'Look at the shared palette');
  assert.deepEqual(await noticeOf(over, '[data-place-notice="looking"]'), { lead: 'You are looking at a shared palette.', icon: true, ownRow: true, acts: 2 }, 'board: looking');
  assert.deepEqual([await rankOf(over, 'Keep it as mine'), await rankOf(over, 'Back to mine')], ['secondary', 'quiet']);
  await done(over);
  const bare = await tool({ hash: await linkOf('Mediterranean', 5) });
  await says(bare, /This palette came without a place\./, { timeout: 10_000 });
  assert.deepEqual(await noticeOf(bare, '[data-place-notice="noPlace"]'), { lead: 'This palette came without a place.', icon: true, ownRow: true, acts: 2 }, 'board: no place');
  assert.equal(await toneOf(bare, '[data-place-notice="noPlace"]'), 'warning', 'board: without a place, and you have none: amber');
  assert.deepEqual([await rankOf(bare, 'Give my place'), await rankOf(bare, 'Later')], ['primary', 'quiet']);
  await done(bare);
  const bad = await withStorage({ 'canopi-consortium': save }, '/palette/#v=99&c=temperate&a=abcdef&e=1');
  await says(bad, 'This link could not be read. Nothing was changed.', { timeout: 10_000 });
  assert.deepEqual(await noticeOf(bad, '[data-place-notice="unreadable"]'), { lead: 'This link could not be read.', icon: true, ownRow: true, acts: 2 }, 'board: a link that cannot be read');
  assert.equal(await toneOf(bad, '[data-place-notice="unreadable"]'), 'danger');
  assert.deepEqual([await rankOf(bad, 'Start a new palette'), await rankOf(bad, 'Back to mine')], ['secondary', 'quiet']);
  await done(bad);
  const missing = await withStorage({}, '/palette/?plant=Nothingus%20fakeus&climate=temperate');
  await says(missing, /could not be kept/, { timeout: 10_000 });
  assert.equal(await toneOf(missing, '[data-place-notice="guideMissing"]'), 'warning', 'board: the guide\'s plant is not in that list: amber');
  assert.equal(await rankOf(missing, 'Find a plant'), 'secondary');
  await done(missing);
  const guide = await withStorage({ 'canopi-consortium': await savedPalette('Temperate', 4), 'canopi-location': kiambu }, '/palette/?plant=Malus%20domestica&climate=temperate');
  await says(guide, /Your saved palette \(4 plants near Kiambu\) is kept\./, { timeout: 15_000 });
  assert.equal(await rankOf(guide, 'Open my saved palette instead'), 'quiet');
  await done(guide);
});

test('PFC24 (pf-c fix round 1 BC5, BC14, BC15: ClimateHand): "No location? Choose a climate" opens its own screen: "‹ Your place", the title "Choose a climate", one column of rows in the board order with a chip at the right ("Needs your location" amber), and the bar "Choose a ready climate, or give a location, to go on." at the bottom; a choice closes it; a kept climate reads "Temperate list" with "Not this climate? Choose another"', async () => {
  const page = await tool({ width: 390 });
  await press(page, 'button', 'No location? Choose a climate');
  await control(page, 'button', 'Your place');
  await control(page, 'heading', 'Choose a climate');
  await saysNot(page, '1 Where is your place?', 'board ClimateHand: its own screen');
  const rows = await page.evaluate(() => [...document.querySelectorAll('#ct-climates label, #ct-climates [data-climate-polar]')].map((r) => { const b = r.getBoundingClientRect(); const chip = r.querySelector('[data-chip]')?.getBoundingClientRect(); return { name: r.querySelector('[data-name]')?.textContent.trim(), x: b.x, w: b.width, chipRight: chip ? b.right - chip.right : null }; }));
  assert.deepEqual(rows.map((r) => r.name), ['Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal', 'Polar and high mountain'], 'board: the order');
  assert.ok(rows.every((r) => r.x === rows[0].x && r.w > 300), `board: one column of full-width rows (${JSON.stringify(rows)})`);
  assert.ok(rows.every((r) => r.chipRight !== null && r.chipRight < 20), 'board: each chip at the right of its row');
  assert.equal(await toneOf(page, '#ct-climates label:nth-of-type(2) [data-chip]'), 'warning', 'board: Needs your location on the warning tokens');
  const bar = await page.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.trim() === 'Choose a ready climate, or give a location, to go on.'); const b = p?.getBoundingClientRect(); return b ? { bottom: Math.round(b.bottom), vh: innerHeight } : null; });
  assert.ok(bar && Math.abs(bar.vh - bar.bottom) < 24, `board: the closing line is a bar at the bottom (${JSON.stringify(bar)})`);
  await page.click('#ct-climates label:nth-of-type(5)');
  await frames(page);
  await saysNot(page, 'Choose a ready climate', 'board: a choice closes the cards');
  await says(page, '1 Where is your place?');
  await says(page, 'Temperate list');
  await hasAll(page, ['Not this climate? Choose another']);
  assert.ok(!(await page.evaluate(() => [...document.querySelectorAll('p')].some((p) => /·\s*$/.test(p.textContent.trim())))), 'BC14: no separator left at the end of a line');
  await press(page, 'button', 'Not this climate? Choose another');
  await press(page, 'button', 'Your place');
  await says(page, '1 Where is your place?');
  await done(page);
  const read = await tool({ width: 390, nominatim: 'fixture' });
  await searchFor(read, 'Kiambu');
  await says(read, /We read: /, { timeout: 10_000 });
  await press(read, 'button', 'Not this climate? Choose another');
  await read.click('#ct-climates label:nth-of-type(1)');
  await says(read, /We read: Tropical|Tropical list/, { timeout: 5000 });
  await saysNot(read, 'Choose a ready climate');
  await hasAll(read, ['Not this climate? Choose another']);
  await done(read);
  const kept = await withStorage({ 'canopi-climate': 'temperate' });
  await says(kept, 'Temperate list', { timeout: 10_000 });
  await saysNot(kept, 'Choose a ready climate', 'a kept climate opens Place, not the cards (replaces r2-1)');
  await done(kept);
});

test('PFC25 (pf-c fix round 1 BC6, BC7, BC8, BC18: question 1 once a place is read): at 1280 "Use my location" and "Pick on a map" as labelled buttons, no "No location? Choose a climate", the row "Adjust on the map · Search again · Forget", PlaceDesk\'s "We read" card; at 390 the LocStates row; the field holds the place found', async () => {
  const desk = await tool({ width: 1280, nominatim: 'fixture' });
  await searchFor(desk, 'Kiambu');
  await says(desk, /We read: /, { timeout: 10_000 });
  const labelled = await desk.evaluate(() => ['Use my location', 'Pick on a map'].map((n) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === n && b.getClientRects().length)?.getBoundingClientRect().top ?? null));
  assert.ok(labelled.every((t) => t !== null) && Math.abs(labelled[0] - labelled[1]) < 4, `board PlaceDesk: two labelled buttons on one row (${labelled})`);
  assert.ok(!(await buttons(desk)).includes('No location? Choose a climate'), 'board PlaceDesk: no "No location?" once a place is read');
  await hasAll(desk, ['Adjust on the map', 'Search again', 'Forget']);
  assert.ok(!(await buttons(desk)).includes('Not this place? Search again'), 'board PlaceDesk: the settled row');
  const zone = await store(desk, () => window.__ctTest.store.climate.value);
  await says(desk, new RegExp(`We read: ${zone}\\. Köppen class C\\w\\w \\([^)]+\\); nights in the coldest month average −?[\\d.]+\\s?°C\\.`));
  await saysNot(desk, 'Your place in figures: Köppen');
  assert.equal(await desk.evaluate(() => document.querySelector('[data-location-search]').value), 'Kiambu, Kenya', 'board: the field holds the place');
  await done(desk);
  const phone = await tool({ width: 390, nominatim: 'fixture' });
  await searchFor(phone, 'Kiambu');
  await says(phone, /We read: \w+ \(/, { timeout: 10_000 });
  await hasAll(phone, ['Not this place? Search again', 'Adjust on the map']);
  assert.equal(await phone.evaluate(() => document.querySelector('[data-location-search]').value), 'Kiambu, Kenya', 'board Place: the field holds the place');
  await done(phone);
});

test('PFC26 (pf-c fix round 1 BC12, BC13, BC16, BC17, BC19: the country line, room, question 3 and the frame foot): the country line one sentence with its icon, after Room on the phone and full width at the end on the laptop; "Use Kenya" filled; "Not sure" across the row at 390; no "Paste a list" at 390 and the suggestion on one line; the frame foot one row, "Start over" a link left of "Back to my palette"', async () => {
  const phone = await tool({ width: 390, nominatim: 'fixture' });
  await searchFor(phone, 'Kiambu');
  await says(phone, 'Invasive warnings for Kenya · from your location · Change', { timeout: 10_000 });
  await inOrder(phone, ['2 How much room do you have?', 'Invasive warnings for Kenya', '3 What grows there already']);
  const line = await phone.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.startsWith('Invasive warnings for')); return { icon: !!p?.querySelector('svg'), lines: Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight || '22')) }; });
  assert.ok(line.icon, 'board Country: the invasive icon');
  const unsure = await phone.evaluate(() => { const ls = [...document.querySelectorAll('.ct-room label, [name="ct-site-room"]')].map((x) => x.closest('label')).filter(Boolean); const a = ls[0].getBoundingClientRect(), u = ls.at(-1).getBoundingClientRect(); return { first: a.width, unsure: u.width }; });
  assert.ok(unsure.unsure > unsure.first * 1.8, `board Place: "Not sure" across the row (${JSON.stringify(unsure)})`);
  assert.ok(!(await buttons(phone)).includes('Paste a list'), 'board Place: no Paste a list on the phone');
  const sug = await phone.evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => x.textContent.startsWith('No plants in mind?')); const lh = parseFloat(getComputedStyle(p).lineHeight); return { h: p.getBoundingClientRect().height, lh }; });
  assert.ok(sug.h < sug.lh * 1.9 + 12, `board Place: the suggestion on one line (${JSON.stringify(sug)})`);
  await done(phone);
  const desk = await tool({ width: 1280, nominatim: 'fixture' });
  await searchFor(desk, 'Kiambu');
  await says(desk, 'Invasive warnings for Kenya · from your location · Change', { timeout: 10_000 });
  await inOrder(desk, ['3 What grows there already', 'Show my palette', 'Invasive warnings for Kenya']);
  const w = await desk.evaluate(() => [...document.querySelectorAll('p')].find((x) => x.textContent.startsWith('Invasive warnings for')).closest('[data-ct="country"]').getBoundingClientRect().width);
  assert.ok(w > 900, `board PlaceDesk: the country line full width at the end (${w})`);
  await done(desk);
  const guess = await tool({ width: 390, setup: async (pg) => { await pg.emulateTimezone('Africa/Nairobi'); await pg.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'languages', { get: () => ['en-KE', 'en'] }); }); } });
  await press(guess, 'button', 'No location? Choose a climate');
  assert.equal(await rankOf(guess, 'Use Kenya'), 'primary', 'board Country: Use Kenya filled');
  await done(guess);
  const frame = await palette({ climate: 'Temperate', site: 'kiambu', n: 8, width: 390 });
  await press(frame, 'button', 'Change');
  await control(frame, 'button', 'Back to my palette');
  const foot = await frame.evaluate(() => ['Start over', 'Back to my palette'].map((n) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === n && x.getClientRects().length).getBoundingClientRect(); return { x: b.x, y: Math.round(b.top + b.height / 2) }; }));
  assert.ok(Math.abs(foot[0].y - foot[1].y) < 4 && foot[0].x < foot[1].x, `board SiteKiambu: one bar (${JSON.stringify(foot)})`);
  assert.deepEqual([await rankOf(frame, 'Start over'), await rankOf(frame, 'Back to my palette')], ['quiet', 'primary']);
  await done(frame);
});

test('PFC27 (pf-c fix round 1 BC20, R7, R17: the map dialog): LocDesk\'s × close, a filled Search, answers as rows with "Choose" and a pin; "pick on a map." with no space; "Use this point" with its check mark; the dialog outside every live region and its point line not live; LocMap\'s foot at the bottom of the screen; "Centre on my location" says a refusal', async () => {
  const desk = await tool({ width: 1280, nominatim: 'fixture', setup: searchStub() });
  await press(desk, 'button', 'Pick on a map');
  await control(desk, 'dialog', /./);
  await control(desk, 'button', 'Close');
  assert.equal(await desk.evaluate(() => [...document.querySelectorAll('dialog[open] button')].find((b) => b.getAttribute('aria-label') === 'Close')?.textContent.trim()), '', 'board LocDesk: an × icon, no word');
  assert.equal(await rankOf(desk, 'Search'), 'primary', 'board LocDesk: Search filled');
  assert.ok(await desk.evaluate(() => !!document.querySelector('dialog[open] [data-location-use-centre] svg')), 'board: Use this point with its check mark');
  const live = await desk.evaluate(() => { const d = document.querySelector('dialog[open]'); return { inLive: !!d.parentElement.closest('[role="status"], [aria-live]'), liveInside: [...d.querySelectorAll('[aria-live]')].map((x) => x.getAttribute('aria-live')).filter((v) => v !== 'off') }; });
  assert.deepEqual(live, { inLive: false, liveInside: [] }, 'R7: the dialog is no status message, its point line not live');
  await done(desk);
  const several = await tool({ width: 390, nominatim: 'fixture', setup: searchStub() });
  await searchFor(several, 'Kiambu');
  await says(several, '3 places answer “Kiambu”. Which one is yours?', { timeout: 10_000 });
  await says(several, 'None of these? Try the nearest town, or pick on a map. Place names');
  assert.ok(await several.evaluate(() => !document.querySelector('[data-location-choices]').closest('[role="status"]')), 'R7: the answers and their buttons are outside the live region');
  await done(several);
  const phone = await tool({ width: 390, geolocation: 'denied' });
  await press(phone, 'button', 'Pick on a map');
  await phone.waitForSelector('dialog[open] [data-location-use-centre]', { timeout: 10_000 });
  const foot = await phone.evaluate(() => { const d = document.querySelector('dialog[open]').getBoundingClientRect(); const b = document.querySelector('dialog[open] [data-location-use-centre]').getBoundingClientRect(); return { gap: Math.round(d.bottom - b.bottom) }; });
  assert.ok(foot.gap < 40, `board LocMap: the foot at the bottom (${foot.gap} px below)`);
  await press(phone, 'button', 'Centre on my location');
  await says(phone, 'Your location is blocked for this site.', { inDialog: true, timeout: 5000 });
  await done(phone);
});

test('PFC28 (pf-c fix round 1 R2, R12, C9: names and coordinates): a postcode or a single number is looked up as a name; text the field refused as coordinates never places the grower at a guessed point', async () => {
  const page = await tool({ width: 390, nominatim: 'fixture' });
  for (const [q, n] of [['69001', 1], ['W1', 2]]) {
    await searchFor(page, q);
    for (let i = 0; i < 50 && page.nominatim.length < n; i++) await new Promise((r) => setTimeout(r, 100));
    assert.equal(page.nominatim.length, n, `R12: "${q}" goes to the place search`);
    await saysNot(page, 'as coordinates', `R12: "${q}" is no coordinates`);
  }
  await searchFor(page, '1.17 36');
  await says(page, 'We could not read “1.17 36” as coordinates.');
  await press(page, 'button', 'Search');
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal(await store(page, () => window.__ctTest.store.location.value), null, 'R2: never a guessed point');
  await done(page);
});

test('PFC29 (pf-c fix round 1 R5, round 2 R3 and C7: a climate chosen by hand belongs to its cell): after "Use <other>" or "Not this climate? Choose another", a new point in the same cell keeps it; another cell takes its own read, even one that reads the same climate as the last (a shared link\'s place is never the grower\'s own "before": Place drops it, draft.ts backToPlace, and locate ignores it)', async () => {
  const { siteClimate } = await import('../../src/lib/consortium/site-climate.ts');
  const kiambuAt = await lookupAt(...SITES.kiambu), kiambuRead = siteClimate(kiambuAt);
  const cell = (l) => `${l.climate.cellLat},${l.climate.cellLon}`;
  // A neighbouring cell that reads the same climate as Kiambu (the scenario R3 names).
  let twin = null;
  for (const [dlat, dlon] of [[-0.15, 0], [0.15, 0], [0, 0.15], [0, -0.15], [-0.3, 0], [0.3, 0], [0, 0.3], [0, -0.3]]) {
    const p = [SITES.kiambu[0] + dlat, SITES.kiambu[1] + dlon], l = await lookupAt(...p);
    if (l?.climate && cell(l) !== cell(kiambuAt) && siteClimate(l).suggested === kiambuRead.suggested) { twin = p; break; }
  }
  assert.ok(twin, 'fixture: a neighbouring cell reads the same climate as Kiambu');
  const page = await tool({ width: 390, nominatim: 'fixture' });
  await searchFor(page, 'Kiambu');
  await says(page, /We read: /, { timeout: 10_000 });
  const read = await store(page, () => window.__ctTest.store.climate.value);
  assert.equal(read, kiambuRead.suggested);
  const other = read === 'Tropical' ? 'Temperate' : 'Tropical';
  const pick = async (pg, z) => {
    await press(pg, 'button', 'Not this climate? Choose another');
    const nth = await pg.evaluate((x) => [...document.querySelectorAll('#ct-climates label')].findIndex((l) => l.textContent.startsWith(x)) + 1, z);
    await pg.click(`#ct-climates label:nth-of-type(${nth})`);
    await frames(pg);
    assert.equal(await store(pg, () => window.__ctTest.store.climate.value), z);
  };
  await pick(page, other);
  // Adjust on the map, the cross moved, Use this point.
  const at = async (pg, lat, lon) => {
    await press(pg, 'button', 'Adjust on the map');
    await pg.waitForFunction(() => typeof window.__ctTest.mapCentre === 'function', { timeout: 10_000 });
    await pg.evaluate(([a, b]) => window.__ctTest.mapCentre({ lat: a, lon: b }), [lat, lon]);
    await press(pg, 'button', 'Use this point');
    await pg.waitForFunction((a) => Math.abs((window.__ctTest.store.location.value?.lat ?? 99) - a) < 0.01 && window.__ctTest.store.location.value?.source !== 'link' && !!window.__ctTest.store.location.value?.lookup, { timeout: 10_000 }, lat);
  };
  await at(page, SITES.kiambu[0] - 0.002, SITES.kiambu[1] + 0.002);
  assert.equal(await store(page, () => window.__ctTest.store.climate.value), other, 'R5: the same cell keeps the grower\'s climate');
  await at(page, twin[0], twin[1]);
  assert.ok(await page.waitForFunction((z) => window.__ctTest.store.climate.value === z, { timeout: 10_000 }, read).then(() => true, () => false), `R3: another cell that reads ${read} too takes its own read, not the hand choice (${await store(page, () => window.__ctTest.store.climate.value)})`);
  await pick(page, other);
  await at(page, SITES.seville[0], SITES.seville[1]);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.climate.value === 'Mediterranean', { timeout: 10_000 }).then(() => true, () => false), 'R5: another cell takes its own climate');
  await done(page);
});

test('PFC30 (pf-c fix round 1 R3, R4, R9, C11: the shared palette over yours): "Keep it as mine" makes it the save, with Undo; "Add its plants to mine" keeps every plant\'s list and the reader\'s place and values; the welcome line goes at the first change', async () => {
  const kiambu = JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' });
  const save = await savedPalette('Temperate', 8);
  const hash = await linkOf('Mediterranean', 13);
  const keep = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await press(keep, 'button', 'Look at the shared palette', 10_000);
  await press(keep, 'button', 'Keep it as mine');
  // C9: the save is the shared palette now: its fragment is the address of the palette on screen, which
  // holds the link's climate and the link's plants exactly.
  assert.ok(await keep.waitForFunction((link) => { try { const f = JSON.parse(localStorage.getItem('canopi-consortium')).fragment, q = new URLSearchParams(f), l = new URLSearchParams(link); return f === location.hash.slice(1) && q.get('c') === l.get('c') && q.get('a') === l.get('a'); } catch { return false; } }, { timeout: 4000 }, hash.slice(1)).then(() => true, () => false), `R3: the shared palette is the save now (${await keep.evaluate(() => localStorage.getItem('canopi-consortium'))})`);
  // Round 3 C1: no board draws this toast; its words are the pasted-list toast's second sentence
  // (Toasts "12 plants added. Your palette: 20 plants."), the palette that is now yours.
  assert.equal(await toastText(keep), 'Your palette: 13 plants.', 'C1: board words only');
  await saysNot(keep, 'Open my saved palette', 'R3: no offer to go back to what was replaced, but Undo');
  await press(keep, 'button', 'Undo');
  assert.ok(await keep.waitForFunction((s) => localStorage.getItem('canopi-consortium') === s, { timeout: 4000 }, save).then(() => true, () => false), 'R3: Undo puts the old save back');
  await done(keep);
  // C1: the reader's values live in their save (and their place on this device) before the link opens.
  const valued = JSON.stringify({ ...JSON.parse(save), place: 'i=rain' });
  const add = await withStorage({ 'canopi-consortium': valued, 'canopi-location': kiambu }, `/palette/${hash}`);
  await add.waitForFunction(() => !!window.__ctTest?.store?.location.value?.lookup, { timeout: 15_000 });
  await press(add, 'button', 'Add its plants to mine', 10_000);
  assert.ok(await add.waitForFunction(() => window.__ctTest.store.members.value.length > 8, { timeout: 8000 }).then(() => true, () => false), 'its plants join mine');
  await add.waitForFunction(() => window.__ctTest.store.memberTaxa.value.length === window.__ctTest.store.members.value.length, { timeout: 15_000 }).catch(() => {});
  const homes = await add.evaluate(() => { const s = window.__ctTest.store; return { members: s.members.value.length, drawn: s.memberTaxa.value.length, edits: s.siteEdits.value, place: s.location.value?.label }; });
  assert.equal(homes.drawn, homes.members, `R4: every plant keeps its list (${JSON.stringify(homes)})`);
  assert.deepEqual([homes.edits, homes.place], [{ watering: 'rain' }, 'Kiambu, Kenya'], 'C11, C1: the reader\'s place and the values of their save stay');
  await done(add);
  const back = await withStorage({ 'canopi-consortium': save });
  await says(back, /Welcome back\./, { timeout: 15_000 });
  const ids = await idsOf('Temperate', 1, 20);
  await back.evaluate((x) => window.__ctTest.store.addMembers(x), ids);
  await saysNot(back, 'Welcome back.', 'R9: a one-time arrival line');
  await done(back);
});

test('PFC31 (pf-c fix round 1 R10, R14/C6, R15, BC22, C1: words that must be true): the timeout names the wait the code uses; "checked against yours" says "with your own values" only when there are some; "You can already give your place." only beside the Place form; the failed load has no added guide sentence; a bad link pasted into the open tab reads as the board says', async () => {
  const wait = await tool({ geolocation: 'timeout', geoTimeoutMs: 1000 });
  await press(wait, 'button', 'Use my location');
  await says(wait, 'Your device did not find its position in 15 seconds.', { timeout: 15_000 });
  await done(wait);
  const mine = await withStorage({ 'canopi-location': JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }) }, `/palette/${await linkOf('Mediterranean', 5)}`);
  await says(mine, 'This palette came without a place, so it is checked against yours: near Kiambu, Kenya. The sender’s place and own values were not sent.', { timeout: 15_000 });
  await done(mine);
  const slow = await h.open(`/palette/${await linkOf('Mediterranean', 5)}`, { hook: true, mapTiles: 'stub', database: 'hold' });
  await says(slow, 'Loading the plant list…', { timeout: 8000 });
  await saysNot(slow, 'You can already give your place.', 'R15: no place form on screen');
  await slow.releaseHeld();
  await done(slow);
  // BC22 (no added guide sentence on a failed load): PFC20's list that did not load.
  const open = await palette({ n: 3 });
  await open.evaluate(() => { location.hash = '#v=99&c=temperate&a=abcdef&e=1'; });
  await says(open, 'This link could not be read. Nothing was changed.', { timeout: 8000 });
  await saysNot(open, 'The pasted link could not be read');
  await done(open);
});

test('PFC32 (pf-c fix round 1 BC10, BC11, C7: the palette head at a borrowed climate): the place line with its pin and the place in bold, small; the Oulu banner neutral, with the two bold spans and the 2041–2070 count from the engine', async () => {
  const page = await palette({ climate: 'Temperate', site: 'yakutsk', n: 5 });
  await page.evaluate(async () => { const s = window.__ctTest.store; s.climate.value = 'Boreal'; await s.loadPool('Boreal'); });
  await says(page, /Colder than any list we have made\./, { timeout: 15_000 });
  await says(page, /whose climate range includes your place, \d+ by 2041–2070\. Each is an estimate\./, { timeout: 15_000 });
  const banner = await page.evaluate(() => [...document.querySelectorAll('[data-place-banner] b, [data-place-banner] strong')].map((b) => b.textContent.trim()));
  assert.deepEqual(banner, ['Colder than any list we have made.', 'Each is an estimate.'], 'board Oulu: the two bold spans');
  assert.equal(await toneOf(page, '[data-place-banner]'), 'neutral', 'board Oulu: information, not a warning');
  const head = await page.evaluate(() => { const p = document.querySelector('[data-place-line]'); return { pin: !!p.querySelector('svg'), bold: p.querySelector('b, strong')?.textContent.trim(), size: parseFloat(getComputedStyle(p).fontSize) }; });
  assert.deepEqual([head.pin, head.bold], [true, 'Near yakutsk'], 'board: pin and the place in bold');
  assert.ok(head.size <= 14, `board: the line in small text (${head.size})`);
  await done(page);
});

// ---- fix round 2 ----

test('PFC33 (pf-c fix round 2 R1, C1, F12: "Add its plants to mine" with values in your save): a grower near Kiambu whose save holds their own values ("watering, rain only") opens a link without a place and adds its plants: the values stay on the place line and in the save; Undo on the add takes the plants back and the values stay', async () => {
  const kiambu = JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' });
  const save = JSON.stringify({ ...JSON.parse(await savedPalette('Temperate', 8)), place: 'i=rain' });
  const page = await withStorage({ 'canopi-consortium': save, 'canopi-location': kiambu }, `/palette/${await linkOf('Mediterranean', 13)}`);
  await press(page, 'button', 'Add its plants to mine', 15_000);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length > 8, { timeout: 8000 }).then(() => true, () => false), 'its plants join mine');
  assert.deepEqual(await store(page, () => window.__ctTest.store.siteEdits.value), { watering: 'rain' }, 'R1: the values of the save stay');
  await says(page, /rain only/, { timeout: 5000 });
  assert.ok(await page.waitForFunction(() => { try { return /(^|&)i=rain(&|$)/.test(JSON.parse(localStorage.getItem('canopi-consortium')).place); } catch { return false; } }, { timeout: 4000 }).then(() => true, () => false), `R1: the save keeps the values (${await page.evaluate(() => localStorage.getItem('canopi-consortium'))})`);
  await press(page, 'button', 'Undo');
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.members.value.length === 8, { timeout: 4000 }).then(() => true, () => false), 'Undo takes the plants back');
  assert.deepEqual(await store(page, () => window.__ctTest.store.siteEdits.value), { watering: 'rain' }, 'R1: Undo leaves the values as they were');
  await done(page);
});

test('PFC34 (pf-c fix round 2 C2, board Loading): "Old browser" says "This browser is too old for the tool. The field guides work everywhere." with "Read the guides"; "WebAssembly blocked" says its sentence with "Try again" and "Read the guides"; neither has the old guide sentence', async () => {
  const old = await h.open('/palette/', { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument(() => { delete window.DecompressionStream; }) });
  await says(old, 'This browser is too old for the tool. The field guides work everywhere.', { timeout: 10_000 });
  await control(old, 'link', 'Read the guides');
  // Round 3 C2: alone, "Read the guides" is drawn as a bordered secondary button (board Loading).
  assert.equal(await rankOf(old, 'Read the guides'), 'secondary', 'C2: Old browser draws "Read the guides" as a secondary button');
  assert.match(await old.evaluate(() => [...document.querySelectorAll('[data-load-error] a')].find((a) => a.textContent.trim() === 'Read the guides')?.getAttribute('href') ?? ''), /\/guides\//, 'the link opens a guide');
  await saysNot(old, 'Meanwhile, the Field Guides');
  await done(old);
  const wasm = await h.open('/palette/', { hook: true, mapTiles: 'stub', data: 'fixture', wasm: false });
  await says(wasm, 'Something blocks a part the tool needs (WebAssembly: a browser setting, an add-on or your network). Try another browser.', { timeout: 10_000 });
  await control(wasm, 'button', 'Try again');
  await control(wasm, 'link', 'Read the guides');
  // Round 3 C2: "Try again" on parchment with an ink border, "Read the guides" an underlined link beside it.
  assert.deepEqual([await rankOf(wasm, 'Try again'), await rankOf(wasm, 'Read the guides')], ['secondary', 'quiet'], 'C2: WebAssembly blocked as board Loading draws it');
  await done(wasm);
});

test('PFC35 (pf-c fix round 2 R6, C4: the head before the island is confirmed or undone): a returning grower whose plant list fails sees the failure with the steps and the lede; a cut, newer or old link, and an old save, paint the Place head first; a good link and a good save paint the palette head', async () => {
  const save = await savedPalette('Temperate', 8);
  const lost = await withStorage({ 'canopi-consortium': save }, '/palette/', { database: 'stall', timeouts: { stall: 500 } });
  await says(lost, 'The plant list did not load. Check your connection.', { timeout: 10_000 });
  const head = await lost.evaluate(() => ({ steps: !!document.querySelector('#ct-steps')?.getClientRects().length, lede: !!document.querySelector('.tool-lede')?.getClientRects().length }));
  assert.deepEqual(head, { steps: true, lede: true }, 'R6: the failure keeps the head\'s steps and lede');
  await done(lost);
  const stepAt = async (path, storage = {}) => {
    const page = await h.open(path, { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((e) => { for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); document.addEventListener('DOMContentLoaded', () => { window.__stepAtLoad = document.getElementById('ct-head')?.dataset.step ?? ''; }); }, storage) });
    await page.waitForFunction(() => window.__stepAtLoad !== undefined, { timeout: 10_000 });
    const step = await page.evaluate(() => window.__stepAtLoad);
    await done(page);
    return step;
  };
  const good = await linkOf('Temperate', 3);
  assert.equal(await stepAt(`/palette/${good.replace('&e=1', '')}`), 'place', 'C4: a cut link paints the Place head');
  assert.equal(await stepAt('/palette/#v=99&c=temperate&a=abcdef&e=1'), 'place', 'C4: a newer link paints the Place head');
  assert.equal(await stepAt(`/palette/${good.replace('v=5', 'v=4')}`), 'place', 'C4: an old link paints the Place head');
  assert.equal(await stepAt('/palette/', { 'canopi-consortium': JSON.stringify({ ...JSON.parse(save), fragment: JSON.parse(save).fragment.replace('v=5', 'v=4') }) }), 'place', 'C4: an old save paints the Place head');
  assert.equal(await stepAt(`/palette/${good}`), 'palette', 'a good link paints the palette head');
  assert.equal(await stepAt('/palette/', { 'canopi-consortium': save }), 'palette', 'a good save paints the palette head');
});

test('PFC36 (pf-c fix round 2 R4, C10: the field mirrors the place in use): "Kiambu, Kenya" once found; a point from the map clears it; typed coordinates keep the typed text; Forget clears it', async () => {
  const page = await tool({ width: 390, nominatim: 'fixture' });
  const field = () => page.evaluate(() => document.querySelector('[data-location-search]').value);
  await searchFor(page, 'Kiambu');
  await says(page, /We read: /, { timeout: 10_000 });
  assert.equal(await field(), 'Kiambu, Kenya');
  await press(page, 'button', 'Adjust on the map');
  await page.waitForFunction(() => typeof window.__ctTest.mapCentre === 'function', { timeout: 10_000 });
  await page.evaluate(([a, b]) => window.__ctTest.mapCentre({ lat: a, lon: b }), [SITES.kiambu[0] + 0.03, SITES.kiambu[1]]);
  await press(page, 'button', 'Use this point');
  await page.waitForFunction((a) => Math.abs((window.__ctTest.store.location.value?.lat ?? 99) - a) < 0.005, { timeout: 10_000 }, SITES.kiambu[0] + 0.03);
  await frames(page);
  assert.equal(await field(), '', 'R4: the field names no place that is not in use');
  await searchFor(page, '-1.17, 36.83');
  await page.waitForFunction(() => Math.abs((window.__ctTest.store.location.value?.lat ?? 99) + 1.17) < 0.005, { timeout: 10_000 });
  await frames(page);
  assert.equal(await field(), '-1.17, 36.83', 'typed coordinates keep the typed text');
  await done(page);
  // Forget (the laptop's settled row): the field goes empty with the place.
  const desk = await tool({ width: 1280, nominatim: 'fixture' });
  await searchFor(desk, 'Kiambu');
  await says(desk, /We read: /, { timeout: 10_000 });
  assert.equal(await desk.evaluate(() => document.querySelector('[data-location-search]').value), 'Kiambu, Kenya');
  await press(desk, 'button', 'Forget');
  await desk.waitForFunction(() => window.__ctTest.store.location.value === null, { timeout: 4000 });
  await frames(desk);
  assert.equal(await desk.evaluate(() => document.querySelector('[data-location-search]').value), '', 'C10: Forget clears the field');
  await done(desk);
});

test('PFC37 (pf-c fix round 2 R5: the guessed country answered in ClimateHand): "Use Kenya" from the keyboard turns the line into "Invasive warnings for Kenya · chosen by you · Change" in place, and the focus stays on the climate screen (never <body>)', async () => {
  const page = await tool({ width: 390, setup: async (pg) => { await pg.emulateTimezone('Africa/Nairobi'); await pg.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'languages', { get: () => ['en-KE', 'en'] }); }); } });
  await press(page, 'button', 'No location? Choose a climate');
  await page.focus(aria('button', 'Use Kenya'));
  await page.keyboard.press('Enter');
  await frames(page);
  await says(page, 'Invasive warnings for Kenya · chosen by you · Change');
  const f = await page.evaluate(() => { const a = document.activeElement; return { body: a === document.body || !a, inHand: !!a?.closest('[data-place-hand]'), name: a?.textContent.trim() }; });
  assert.deepEqual([f.body, f.inHand], [false, true], `A25: the focus stays on the climate screen (${JSON.stringify(f)})`);
  await done(page);
});

test('PFC38 (pf-c fix round 2 R7, C6: "Centre on my location" names the wait it ran): with the permission already granted and no "Use my location" this visit, a device that does not answer says "…did not find its position in 15 seconds."', async () => {
  const page = await tool({ width: 390, geolocation: 'timeout', geoTimeoutMs: 800 });
  await press(page, 'button', 'Pick on a map');
  await page.waitForSelector('dialog[open] [data-location-use-centre]', { timeout: 10_000 });
  await press(page, 'button', 'Centre on my location');
  await says(page, 'Your device did not find its position in 15 seconds.', { inDialog: true, timeout: 8000 });
  await done(page);
});

test('PFC39 (pf-c fix round 2 R8, C12: arrival notices outside the live region): a shared link over your palette is said in a short status sentence; no live region holds a heading or a button; "Look at the shared palette" changes the sentence only', async () => {
  const save = await savedPalette('Temperate', 8);
  const page = await withStorage({ 'canopi-consortium': save }, `/palette/${await linkOf('Mediterranean', 13)}`);
  await says(page, 'Someone shared a palette with you', { timeout: 15_000 });
  const live = () => page.evaluate(() => [...document.querySelectorAll('[role="status"], [aria-live]:not([aria-live="off"])')].map((r) => ({ text: r.textContent.replace(/\s+/g, ' ').trim(), controls: r.querySelectorAll('button, a, h1, h2, h3, h4, input, select').length })));
  const before = await live();
  assert.ok(before.every((r) => r.controls === 0), `R8: no heading or button inside a live region (${JSON.stringify(before)})`);
  assert.ok(before.some((r) => r.text.startsWith('Someone shared a palette with you')), `R8: the arrival said in a status sentence (${JSON.stringify(before)})`);
  await press(page, 'button', 'Look at the shared palette');
  await frames(page);
  const after = await live();
  assert.ok(after.every((r) => r.controls === 0), `R8: still no control inside a live region (${JSON.stringify(after)})`);
  assert.ok(after.some((r) => r.text === 'You are looking at a shared palette. Nothing of yours was changed.'), `R8: the new notice's sentence only (${JSON.stringify(after)})`);
  await done(page);
});

test('PFC40 (pf-c fix round 2 C9, C11: words as the reader sees them): the privacy page says the tool keeps "your place\'s climate" on this device; in Japanese the place and its borderline note are joined with "。"', async () => {
  const priv = await h.open('/privacy/', {});
  await says(priv, /your location and your place's climate on this device/, { timeout: 8000 });
  await done(priv);
  const ja = await h.open('/ja/palette/', { hook: true, mapTiles: 'stub', nominatim: 'fixture' });
  await ja.waitForSelector('[data-location-search]', { timeout: 10_000 });
  const f = await ja.$('[data-location-search]');
  await f.type('Lyon');
  await ja.keyboard.press('Enter');
  assert.ok(await ja.waitForFunction(() => [...document.querySelectorAll('.ct-location [role="status"]')].some((r) => /。\S/.test(r.textContent) && !/\. /.test(r.textContent.slice(0, 40))), { timeout: 15_000 }).then(() => true, () => false), `C11: joined with "。" (${await ja.evaluate(() => [...document.querySelectorAll('.ct-location [role="status"]')].map((r) => r.textContent).join(' | '))})`);
  await done(ja);
});

// ---- fix round 3 ----

// The country line's control of a name (within the line) and its aria-expanded, or null.
const countryControl = (page, name) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('[data-ct="country"] button')].find((x) => x.textContent.replace(/\s+/g, ' ').trim() === n && x.getClientRects().length);
  return b ? (b.getAttribute('aria-expanded') ?? 'none') : null;
}, name);
// The focused element and its name as read out (a radio by its label).
const focusedChoice = (page) => page.evaluate(() => { const a = document.activeElement; return { body: !a || a === document.body, name: ((a?.labels?.[0] ?? a)?.textContent ?? '').replace(/\s+/g, ' ').trim() }; });
const focusCountry = (page, name) => page.evaluate((n) => [...document.querySelectorAll('[data-ct="country"] button')].find((x) => x.textContent.replace(/\s+/g, ' ').trim() === n && x.getClientRects().length)?.focus(), name);

test('PFC41 (pf-c fix round 3 R1: the country picker is a disclosure): Enter on "Change" keeps "Change" on the line, expanded, and puts the focus on the first choice; Escape and Cancel close the choices and give the focus back to "Change"; "Add your country" does the same; on the climate screen, "Use Kenya" then "Change" keeps the focus on that screen (never <body>)', async () => {
  const placed = await tool({ nominatim: 'fixture' });
  await searchFor(placed, 'Kiambu');
  await says(placed, 'Invasive warnings for Kenya · from your location · Change', { timeout: 10_000 });
  await focusCountry(placed, 'Change');
  await placed.keyboard.press('Enter');
  await frames(placed);
  let f = await focusedChoice(placed);
  assert.ok(!f.body && /^Kenya from your location/.test(f.name), `R1: the focus on the first choice (${JSON.stringify(f)})`);
  assert.equal(await countryControl(placed, 'Change'), 'true', 'R1: "Change" stays, expanded');
  await placed.keyboard.press('Escape');
  await frames(placed);
  f = await focused(placed);
  assert.equal(f.name, 'Change', `R1: Escape gives the focus back to "Change" (${JSON.stringify(f)})`);
  assert.equal(await countryControl(placed, 'Change'), 'false', 'R1: "Change" collapsed');
  await placed.keyboard.press('Enter');
  await frames(placed);
  await focusCountry(placed, 'Cancel');
  await placed.keyboard.press('Enter');
  await frames(placed);
  f = await focused(placed);
  assert.equal(f.name, 'Change', `R1: Cancel gives the focus back to "Change" (${JSON.stringify(f)})`);
  await done(placed);
  const none = await withStorage({ 'canopi-country': '-' });
  await says(none, /No country\. Each plant says/);
  await focusCountry(none, 'Add your country');
  await none.keyboard.press('Enter');
  await frames(none);
  f = await focusedChoice(none);
  assert.ok(!f.body && /^Another country/.test(f.name), `R1: the focus on the first choice (${JSON.stringify(f)})`);
  assert.equal(await countryControl(none, 'Add your country'), 'true', 'R1: "Add your country" stays, expanded');
  await focusCountry(none, 'Cancel');
  await none.keyboard.press('Enter');
  await frames(none);
  f = await focused(none);
  assert.equal(f.name, 'Add your country', `R1: Cancel gives the focus back (${JSON.stringify(f)})`);
  await done(none);
  const hand = await tool({ width: 390, setup: async (pg) => { await pg.emulateTimezone('Africa/Nairobi'); await pg.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'languages', { get: () => ['en-KE', 'en'] }); }); } });
  await press(hand, 'button', 'No location? Choose a climate');
  await focusCountry(hand, 'Use Kenya');
  await hand.keyboard.press('Enter');
  await frames(hand);
  await says(hand, 'Invasive warnings for Kenya · chosen by you · Change');
  await focusCountry(hand, 'Change');
  await hand.keyboard.press('Enter');
  await frames(hand);
  const g = await hand.evaluate(() => { const a = document.activeElement; return { body: a === document.body || !a, inHand: !!a?.closest('[data-place-hand]'), name: a?.textContent.trim() }; });
  assert.deepEqual([g.body, g.inHand], [false, true], `R1: the focus stays on the climate screen (${JSON.stringify(g)})`);
  await done(hand);
});

test('PFC42 (pf-c final1 N2, board Country "Changing it"; round 3 R2): "Change" opens the choices as radio rows "Kenya from your location", "Another country for a plot elsewhere than the point you gave" and "No country each plant then shows its worldwide count"; moving through them changes nothing; "Another country" shows the field "Your country", where "Tan" offers Tanzania and Enter commits it, the focus back on "Change"; no list box and no "Use <country>" beside it', async () => {
  const page = await tool({ nominatim: 'fixture' });
  await searchFor(page, 'Kiambu');
  await says(page, 'Invasive warnings for Kenya · from your location · Change', { timeout: 10_000 });
  await press(page, 'button', 'Change');
  await frames(page);
  for (const r of ['Kenya from your location', 'Another country for a plot elsewhere than the point you gave', 'No country each plant then shows its worldwide count']) {
    assert.ok(await page.$(aria('radio', r)), `board Country: the radio row "${r}"`);
  }
  assert.equal(await page.$eval(aria('radio', 'Kenya from your location'), (e) => e.checked), true, 'board: the country in use is the checked row');
  // From the keyboard, the arrows move through the rows: nothing is committed, the rows stay.
  await page.focus(aria('radio', 'Kenya from your location'));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await frames(page);
  assert.equal(await store(page, () => window.__ctTest.store.country.value.code), 'KE', 'R2: a move through the rows commits nothing');
  assert.ok(await page.$(aria('radio', 'No country each plant then shows its worldwide count')), 'R2: the rows stay open');
  await page.keyboard.press('ArrowUp');
  await frames(page);
  assert.ok(await has(page, aria('textbox', 'Your country'), 2000), 'board: "Another country" shows the field "Your country"');
  assert.equal(await page.$eval(aria('textbox', 'Your country'), (e) => e.placeholder), 'Your country', 'board: its placeholder');
  assert.equal(await page.$('select'), null, 'board: no list box');
  const inLine = await page.$$eval('[data-ct="country"] button', (bs) => bs.map((b) => b.textContent.trim()));
  assert.ok(!inLine.some((b) => /^Use /.test(b)), `board: no "Use <country>" beside the field (${inLine.join(' | ')})`);
  await page.focus(aria('textbox', 'Your country'));
  await page.keyboard.type('Tan');
  await frames(page);
  assert.ok((await buttons(page)).includes('Tanzania'), `board: "Tan" offers Tanzania (${(await buttons(page)).join(' | ')})`);
  assert.equal(await store(page, () => window.__ctTest.store.country.value.code), 'KE', 'typing commits nothing');
  await page.keyboard.press('Enter');
  await frames(page);
  assert.deepEqual(await store(page, () => { const c = window.__ctTest.store.country.value; return [c.code, c.source]; }), ['TZ', 'chosen'], 'Enter commits the first match');
  await says(page, 'Invasive warnings for Tanzania · chosen by you · Change');
  assert.equal((await focused(page)).name, 'Change', 'R1: the focus back on "Change"');
  // A click on a match commits it too; "No country" by pointer commits at once.
  await press(page, 'button', 'Change');
  await page.locator(aria('radio', 'Another country for a plot elsewhere than the point you gave')).click();
  await page.locator(aria('textbox', 'Your country')).fill('ken');
  await press(page, 'button', 'Kenya');
  await says(page, 'Invasive warnings for Kenya · chosen by you · Change');
  await press(page, 'button', 'Change');
  await page.locator(aria('radio', 'No country each plant then shows its worldwide count')).click();
  await says(page, /No country\. Each plant says/);
  await done(page);
});

test('PFC43 (pf-c fix round 3 R3, C3: each arrival said once): a link without a place over your own place says "…checked against yours…" once when it appears; setting your own values changes the visible sentence to "with your own values" and says nothing again', async () => {
  const kiambu = JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' });
  const page = await h.open(`/palette/${await linkOf('Mediterranean', 5)}`, { hook: true, mapTiles: 'stub', setup: (pg) => pg.evaluateOnNewDocument((loc) => {
    if (localStorage.getItem('canopi-location') === null) localStorage.setItem('canopi-location', loc);
    window.__said = [];
    const last = new WeakMap();
    new MutationObserver(() => {
      for (const r of document.querySelectorAll('#ct-root [role="status"], #ct-root [aria-live]:not([aria-live="off"])')) {
        const t = r.textContent.replace(/\s+/g, ' ').trim();
        if (t !== (last.get(r) ?? '')) { last.set(r, t); if (t) window.__said.push(t); }
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, kiambu) });
  await says(page, 'This palette came without a place, so it is checked against yours: near Kiambu, Kenya. The sender’s place and own values were not sent.', { timeout: 15_000 });
  await frames(page);
  const first = await page.evaluate(() => window.__said.filter((t) => t.includes('checked against yours')));
  assert.equal(first.length, 1, `R3: said once when it appears (${JSON.stringify(first)})`);
  await page.evaluate(() => { window.__said.length = 0; });
  await setSiteEdits(page, { watering: 'first-years' });
  await says(page, /checked against yours: near Kiambu, Kenya, with your own values\./, { timeout: 8000 });
  await frames(page);
  const again = await page.evaluate(() => window.__said.filter((t) => t.includes('checked against yours') || t.includes('without a place')));
  assert.deepEqual(again, [], 'R3: a notice whose words change is not said again');
  await done(page);
});

// ---- final1 ----

test('PFC44 (pf-c final1 N1: the page never writes over the grower\'s typing): a saved place, named or not, whose lookup comes back while the grower types in the field leaves their words; an untouched field shows the saved name', async () => {
  for (const [rec, what] of [[{ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'map' }, 'a place with no name'], [{ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }, 'a named place']]) {
    const page = await slowTiles('held', { saved: JSON.stringify(rec) });
    await page.waitForSelector('[data-location-search]', { timeout: 10_000 });
    await page.focus('[data-location-search]');
    await page.keyboard.type('Nak');
    await releaseTiles(page);
    await page.waitForFunction(() => !!window.__ctTest.store.location.value?.lookup, { timeout: 15_000 });
    await frames(page);
    assert.equal(await page.$eval('[data-location-search]', (e) => e.value), 'Nak', `N1, ${what}: the grower's words stay`);
    await done(page);
  }
  const page = await slowTiles('held', { saved: JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'search', label: 'Kiambu, Kenya' }) });
  await releaseTiles(page);
  await page.waitForFunction(() => !!window.__ctTest.store.location.value?.lookup, { timeout: 15_000 });
  await frames(page);
  assert.equal(await page.$eval('[data-location-search]', (e) => e.value), 'Kiambu, Kenya', 'BC18: an untouched field shows the saved place');
  await done(page);
});

test('PFC45 (pf-c final1 N2: typed coordinates belong to their place only): after "-1.17, 36.83" read on the device, a link with a place opened in the same tab and "Use it" leave no typed text and no "Read on this device" line for the link\'s place', async () => {
  const { encodeLink } = await import('../../src/lib/consortium/state.ts');
  const { TODAY_PERIOD } = await import('../../src/lib/consortium/source.ts');
  const { realDb } = await import('./helpers.mjs');
  const page = await tool({ width: 390, nominatim: 'fixture' });
  await searchFor(page, '-1.17, 36.83');
  await says(page, 'Read on this device. Nothing was sent, so the place has no name.', { timeout: 10_000 });
  const all = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Mediterranean' ORDER BY 1").all().map((r) => String(r.id)));
  const members = await idsOf('Mediterranean', 5);
  const frag = encodeLink({ climate: 'Mediterranean', country: 'ES', room: 'unsure', plot: null, period: TODAY_PERIOD, members, removed: [], guests: [], siteEdits: { watering: 'rain' } }, { Mediterranean: all }, { origin: { lat: SITES.seville[0], lon: SITES.seville[1] } });
  await page.evaluate((f) => { location.hash = f; }, frag);
  await says(page, /The link carries a place/, { timeout: 15_000 });
  await press(page, 'button', 'Use it');
  await page.waitForFunction(() => window.__ctTest.store.location.value?.source === 'map', { timeout: 8000 });
  if (await page.evaluate(() => window.__ctTest.store.view.value !== 'start')) await press(page, 'button', 'Change');
  await says(page, '1 Where is your place?');
  await frames(page);
  await saysNot(page, 'Read on this device. Nothing was sent, so the place has no name.', 'N2: the link\'s place was not typed');
  assert.equal(await page.$eval('[data-location-search]', (e) => e.value), '', 'N2: the field holds no coordinates of another place');
  await done(page);
});

test('PFC46 (pf-c final1 N3: one country picker at a time): on the climate screen with a guessed country, "Change" opens one set of choices; its aria-controls names the choices on screen; no id is used twice', async () => {
  const page = await tool({ width: 1280, setup: async (pg) => { await pg.emulateTimezone('Africa/Nairobi'); await pg.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'languages', { get: () => ['en-KE', 'en'] }); }); } });
  await press(page, 'button', 'No location? Choose a climate');
  await focusCountry(page, 'Change');
  await page.keyboard.press('Enter');
  await frames(page);
  const r = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('#ct-root [id]')].map((e) => e.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    const t = [...document.querySelectorAll('[data-ct="country"] button[aria-controls]')].filter((b) => b.getClientRects().length);
    const target = t[0] && document.getElementById(t[0].getAttribute('aria-controls'));
    return { dup, lines: document.querySelectorAll('[data-ct="country"]').length, shown: !!target?.getClientRects().length, inHand: !!target?.closest('[data-place-hand]') };
  });
  assert.deepEqual(r.dup, [], 'N3: no id twice');
  assert.equal(r.lines, 1, 'N3: one country line mounted');
  assert.deepEqual([r.shown, r.inHand], [true, true], 'N3: aria-controls names the choices on the climate screen');
  await done(page);
});
