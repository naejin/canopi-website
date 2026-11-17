// pf stream c, "Your place" (pf commit 0, 2026-11-17): the boards Main's head (the steps give way to the
// h1 and "Data sources", then the place line with Change), Place, LocSearch, LocStates (every state:
// typed coordinates, owner Q6; Stop; Try again; Choose a climate by hand; polar), LocMap and DarkMap,
// LocDesk (search and map side by side), SiteKiambu (the place row), ClimateHand, Country (Why we ask,
// stays on this device, the soft chip when no country is set, Q2), Arrivals (Look / Add its plants to
// mine / Stay with mine with Undo, Q7; "Your palette is back: N plants near X, last changed D", Q3) and
// Loading (its lines, "0.8 of 1.4 MB" and "You can already give your place" included), as tests.
// Dropped by the owner (pf-decisions): Arrivals' old-link, old-save and left-list notices, Place's
// "3 What do you want from it?". Each case is marked expected-fail under pf-c (scripts/expect-fail.mjs
// failing()), its reason the board's first missing word or element (pf-helpers.mjs BOARD); pf-c removes
// a marker in the commit that makes it pass. Place names come from the Nominatim fixture
// (location-fixtures.mjs), climates from the tiles a build installs.
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries F1a-P2 (pp-b2, moved there by PP-B commit 0; a return visit opens "Opening your palette…", never the Place form) -> F1a-P2 → PP-C
//   carries PF3 (pp-pf; the place line on the palette page with Change, the country chip) -> PFC2, PFC9
//   carries PF4 (pp-pf, its Place part; the steps at 390) -> PFC1
//   carries PP-B3 (pp-b1; F1a-P9 restored: every live region on the page before its message) -> PFC14
//   carries PP-B2 no location (pp-b1; "Where is your place?" first, the climates behind "No location? Choose a climate") -> PFC3
//   carries PP-B2 with a location (pp-b1; the climates hidden until "Not this climate? Choose another") -> PFC3
//   carries PP-B2 a climate already chosen, r2-1 (pp-b1; a kept climate leaves the climates open, steady while the lookup returns) -> PFC8
//   carries PP-B2 r2-3 (pp-b1; ClimateHand: what a grower without a location loses, in words) -> PFC8
//   carries PP-B2 r3-1 (pp-b1; Forget on the place row opens the climates) -> PFC7
//   carries PP-B2 conformance-2 (pp-b1; plants added on Place show under "What grows there already") -> PFC3
//   carries PP-B2 conformance-4 (pp-b1; Change on the place line keeps every plant) -> PFC2
//   carries PP-B2 b1a2-2 (pp-b1; Subtropical without a location says "Needs your location") -> PFC8
//   carries PP-B2 b1a2-3 (pp-b1; the map dialog closes with Cancel and leaves the place as it was) -> PFC6
//   carries PP-B2 b1a2-6 (pp-b1; the suggestion's Undo leaves no dialog open and the focus on the page) -> PFC12
//   carries PP-B12 guide over a save (pp-b1; "Kept from the guide: <plant>" with "Open my saved palette instead") -> PFC11
//   carries PP-B13 (pp-b1; a newer link says "Reload", an unreadable one "Start a new palette / Back to mine", the save untouched) -> PFC11
//   carries PP-B12 keyboard answers (pp-b1; Enter on an arrival's choice keeps the focus on the page, the status says it) -> PFC10
//   carries PP-B19 (pp-b1; Place fits 320 px in en, de, ru and ja) -> PFC3
//   carries PP-B72 (pp-b1; an own plant's × on Place hands the focus on, Undo puts it back) -> PFC3
//   carries PP-B15 (pp-b2; a slow list says "Still loading: the connection is slow…") -> PFC13
//   carries PP-B16 (pp-b2; offline, the page says what still works) -> PFC13
//   carries PP-B24 (pp-b2; a part that did not load: "This part did not load. The rest of the page works. Reload") -> PFC13
//   carries BT-1 S4 start (s4; the country line sits above the climate cards, in words) -> PFC9
//   carries memory.test "Use {climate}" (scripts/consortium-memory.test.mjs; a chosen climate the place disagrees with offers "Use <proposed>") -> PFC4
//   dropped PP-B2 c-4 (the "Your place" sheet's foot "Start over" and "Done": the place is changed on Place now),
//   PP-B70 (an old v4 link's notice: no backward compatibility, owner 2026-11-17).
// Kept where they are (lasting seams through hooks pf-c keeps or renames in the same commit): every
// consortium-p5-s5b case (the location's states through p5-helpers), PP-B2 r2-6, r2-7, r3-4, b1a2-1 and
// the Place adds saved, failed-chunk notice, B5, B10, B14, B71 cases in pp-b1. The restored marker
// F1a-P9 restored (scripts/plan/parked-markers.json) now lives in PFC14.
import assert from 'node:assert/strict';
import { aria, h, has, useHarness } from './helpers.mjs';
import { atSite, choose, tool } from './p5-helpers.mjs';
import { SITES } from './location-fixtures.mjs';
import { failing } from '../expect-fail.mjs';
import { BOARD, boxOf, control, dialogText, done, focused, frames, idsOf, inOrder, linkOf, names, palette, pastEdge, press, savedPalette, says, saysNot, withStorage } from './pf-helpers.mjs';

useHarness();

const FIELD = 'Town, region or coordinates';
// Types into the search field (found by its name) and presses Search.
async function searchFor(page, words, { enter = false } = {}) {
  assert.ok(await has(page, aria('textbox', FIELD), 6000) || await has(page, aria('searchbox', FIELD), 100), `board: no field "${FIELD}"`);
  const field = (await page.$(aria('textbox', FIELD))) ?? (await page.$(aria('searchbox', FIELD)));
  await field.click({ clickCount: 3 });
  await field.type(words);
  if (enter) await page.keyboard.press('Enter');
  else await press(page, 'button', 'Search');
}

failing('PFC1 (pf-c steps and head at 390 and 1280): the tool\'s head reads "Plant palette", "beta", then "Data sources"; the steps "Your place", "2 Your palette", "3 Planting plan" sit in a "Steps" navigation, the current one marked; on the palette page the steps give way to the h1 and the place line', { owner: 'pf-c', reason: BOARD }, async () => {
  for (const width of [390, 1280]) {
    const page = await tool({ width });
    const steps = await control(page, 'navigation', 'Steps');
    assert.ok(steps, 'board: a "Steps" navigation');
    await inOrder(page, ['Plant palette', 'Data sources', 'Your place', '2 Your palette', '3 Planting plan']);
    await says(page, '1 Where is your place?');
    await done(page);
  }
});

failing('PFC2 (pf-c Main\'s place line, carried from PF3 and conformance-4): under the h1 "Near Seville, Spain · Mediterranean list · … · 13 plants · Change"; Change opens Place with every plant kept, and back on the palette the same 13 plants', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await palette();
  await says(page, /Near Sevilla?, (?:Spain|España) · Mediterranean list · .*13 plants/);
  await inOrder(page, ['Plant palette', 'Data sources', 'Near ', 'Mediterranean list', '13 plants', 'Change']);
  await press(page, 'button', 'Change');
  await says(page, '1 Where is your place?');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), 13, 'board: Change keeps every plant');
  await press(page, 'button', 'Show my palette');
  await says(page, /13 plants/);
  await done(page);
});

failing('PFC3 (pf-c Place at 390, 1280 and 320, carried from PP-B2, conformance-2, PP-B19 and PP-B72): "1 Where is your place?" with the field, "Search", "Use my location", "Pick on a map", "No location? Choose a climate"; "Nothing is checked against your place until you confirm the climate."; "2 How much room do you have?", "4 What grows there already, or what do you want for sure?", "5 Your spot … Not answered yet Answer", "Show my palette", "No plants in mind? Start from a small suggested palette"; never "3 What do you want from it?"; an own plant\'s "Remove <plant>" hands the focus on; nothing passes 320 px in en, de, ru, ja', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture' });
  await inOrder(page, ['1 Where is your place?', 'No location? Choose a climate', 'Nothing is checked against your place until you confirm the climate.', '2 How much room do you have?', '4 What grows there already, or what do you want for sure?', '5 Your spot', 'Show my palette', 'No plants in mind? Start from a small suggested palette']);
  for (const b of ['Search', 'Use my location', 'Pick on a map']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  await saysNot(page, 'What do you want from it?', 'owner drop');
  await control(page, 'textbox', 'Add a plant by name, in any language');
  // Own plants on Place: each with "Remove <plant>"; the × hands the focus on, never to <body>.
  const ids = await idsOf('Temperate', 2);
  await page.evaluate((x) => window.__ctTest.store.addMembers(x), ids);
  const removes = (await names(page, 'button')).filter((n) => /^Remove /.test(n));
  assert.equal(removes.length, 2, 'board: each own plant under "What grows there already" with "Remove <plant>"');
  await page.focus(aria('button', removes[0]));
  await page.keyboard.press('Enter');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'board: the focus moves to the next ×');
  await done(page);
  for (const lang of ['en', 'de', 'ru', 'ja']) {
    const small = await tool({ lang, width: 320 });
    await control(small, 'navigation', lang === 'en' ? 'Steps' : /./);
    assert.deepEqual(await pastEdge(small), [], `board: Place at 320 px in ${lang}`);
    await done(small);
  }
});

failing('PFC4 (pf-c Place, the climate read, carried from the memory.test "Use {climate}" row): at Kiambu Place says "We read: <climate>. Near Kiambu: Köppen class Cfb (…)" with "Use <climate>" and "Not this climate? Choose another"; with Temperate chosen and a place that reads Mediterranean it offers "Use Mediterranean"', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture' });
  await searchFor(page, 'Kiambu');
  await says(page, /We read: \w+\. Near Kiambu: Köppen class C\w\w \(/);
  await control(page, 'button', /^Use (?:Temperate|Subtropical)$/);
  await control(page, 'button', 'Not this climate? Choose another').catch(async () => control(page, 'link', 'Not this climate? Choose another'));
  await done(page);
  const chosen = await tool();
  await choose(chosen, 'Temperate');
  await atSite(chosen, 'seville');
  await control(chosen, 'button', 'Use Mediterranean');
  await says(chosen, /We read: Mediterranean\./);
  await done(chosen);
});

failing('PFC5 (pf-c LocSearch and LocStates, the search): "A town is enough: the climate is read for a square about 11 km across."; while it looks, "Looking for “Kiambu”…" with Stop; one answer "Near Kiambu, Kiambu County, Kenya 1.17° S, 36.83° E" with "Search again" and "Adjust on the map"; none, "No place found for “Kiambuu”. Check the spelling…" with "Pick on a map" and "Choose a climate by hand"; offline, "The place search did not answer…" with "Try again"; the privacy line; nothing sent as one types', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture' });
  await says(page, 'A town is enough: the climate is read for a square about 11 km across.');
  await says(page, 'Your search words go to OpenStreetMap’s place search (Nominatim) only when you press Search; nothing is sent as you type. Coordinates are read on this device and sent nowhere.');
  await searchFor(page, 'Kiambu');
  await says(page, /Near Kiambu, Kiambu County, (?:Central Kenya, )?Kenya 1\.17° S, 36\.8\d° E/);
  for (const b of ['Search again', 'Adjust on the map']) assert.ok([...(await names(page, 'button')), ...(await names(page, 'link'))].includes(b), `board: "${b}"`);
  await searchFor(page, 'Kiambuu');
  await says(page, 'No place found for “Kiambuu”. Check the spelling, try the nearest town, or pick your place on a map.');
  for (const b of ['Pick on a map', 'Choose a climate by hand']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  await done(page);
  const off = await tool({ nominatim: 'offline' });
  await searchFor(off, 'Kiambu');
  await says(off, 'The place search did not answer. You may be offline, or it is busy. Coordinates work without a connection: type them, or choose a climate by hand.');
  await control(off, 'button', 'Try again');
  await done(off);
});

failing('PFC6 (pf-c LocStates typed coordinates, owner Q6, and LocMap, carried from b1a2-3): "-1.17, 36.83" reads "1.17° S, 36.83° E Read on this device. Nothing was sent, so the place has no name." with "Adjust on the map" and "Look up its name", and no place search request; "1.17 36" says "We could not read “1.17 36” as coordinates. Write latitude, then longitude: −1.17, 36.83. Or press Search to look it up as a name."; "Pick on a map" opens "Pick your place on the map" with the board\'s lines, "Cancel" and "Use this point"; Cancel leaves the place as it was', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture' });
  await searchFor(page, '-1.17, 36.83');
  await says(page, '1.17° S, 36.83° E Read on this device. Nothing was sent, so the place has no name.');
  assert.equal(page.nominatim.length, 0, 'board: typed coordinates send nothing');
  await control(page, 'button', 'Look up its name');
  await searchFor(page, '1.17 36');
  await says(page, 'We could not read “1.17 36” as coordinates. Write latitude, then longitude: −1.17, 36.83. Or press Search to look it up as a name.');
  await press(page, 'button', 'Pick on a map');
  await says(page, 'Pick your place on the map', { inDialog: true });
  await says(page, 'Drag the map until the cross is on your land. No need to be exact: the climate is read for a square about 11 km across. With a keyboard, the arrow keys move the map.', { inDialog: true });
  await says(page, 'The map comes from OpenFreeMap. Like any map, its server sees your internet address and the area you look at. The point you choose stays on this device.', { inDialog: true });
  await says(page, /under the cross/, { inDialog: true });
  for (const b of ['Cancel', 'Use this point']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  const before = await page.evaluate(() => JSON.stringify(window.__ctTest.store.location.value));
  await press(page, 'button', 'Cancel');
  assert.ok(await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 4000 }).then(() => true, () => false), 'board: Cancel closes the map');
  assert.equal(await page.evaluate(() => JSON.stringify(window.__ctTest.store.location.value)), before, 'board: the place as it was');
  await done(page);
});

failing('PFC7 (pf-c SiteKiambu and LocStates\' edge states, carried from r3-1): the place row "Near Kiambu, Kenya 1.17° S, 36.83° E · <climate> (Köppen C…): you confirmed it" with "Adjust on the map · Search again · Another climate · Forget" and "Next: how much room do you have?"; Forget opens the climates; the sea says "No climate is recorded at this point…"; the polar point says "That is a polar climate: no plant list covers it…" with "Choose a climate by hand" and "Ask for this climate"', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture' });
  await searchFor(page, 'Kiambu');
  const use = (await names(page, 'button')).find((n) => /^Use \w+$/.test(n));
  assert.ok(use, 'board: "Use <climate>"');
  await press(page, 'button', use);
  await says(page, /Near Kiambu, Kenya 1\.17° S, 36\.8\d° E · \w+ \(Köppen C\w\w\): you confirmed it/);
  await says(page, 'Next: how much room do you have?');
  for (const b of ['Adjust on the map', 'Search again', 'Another climate', 'Forget']) assert.ok([...(await names(page, 'button')), ...(await names(page, 'link'))].includes(b), `board: "${b}"`);
  await press(page, 'button', 'Forget');
  await says(page, /Tropical[^]*Subtropical/);
  await done(page);
  const sea = await tool();
  await atSite(sea, 'ocean');
  await says(sea, 'No climate is recorded at this point: it is in the sea or on a very small island. Move the cross onto the nearest land.');
  await done(sea);
  const polar = await tool({ nominatim: 'fixture' });
  await searchFor(polar, 'Longyearbyen');
  await says(polar, 'That is a polar climate: no plant list covers it, so no climate is suggested.');
  for (const b of ['Choose a climate by hand', 'Ask for this climate']) assert.ok([...(await names(polar, 'button')), ...(await names(polar, 'link'))].includes(b), `board: "${b}"`);
  await done(polar);
});

failing('PFC8 (pf-c ClimateHand, carried from PP-B2 r2-1, r2-3 and b1a2-2): "No location? Choose a climate" opens "Without a location you still get a palette." and the climates, each with its state ("Ready", "Needs your location", "No list yet"), "Polar and high mountain … Ask for this climate", and "Choose a ready climate, or give a location, to go on."; a kept climate leaves them open', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool();
  await press(page, 'button', 'No location? Choose a climate');
  await says(page, /Without a location you still get a palette\./);
  await says(page, /Tropical Ready/);
  await says(page, /Subtropical Needs your location/);
  await says(page, /Polar and high mountain No list yet/);
  await says(page, 'Choose a ready climate, or give a location, to go on.');
  await done(page);
  const kept = await withStorage({ 'canopi-climate': JSON.stringify('Temperate') });
  await says(kept, /Temperate Ready/);
  await done(kept);
});

failing('PFC9 (pf-c Country, owner Q2, carried from BT-1 S4 and PF3): with no country, "No country. Each plant says in how many countries it is recorded invasive. These counts are worldwide…" with "Add your country" and "Why we ask"; "Why we ask" opens its words; "Your country stays on this device."; the plant chip "Recorded invasive in N countries"; with Kenya guessed, "Invasive warnings for Kenya · guessed from your browser" with "Use Kenya" and "Change", above the climates', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await palette({ site: null });
  await says(page, 'No country. Each plant says in how many countries it is recorded invasive. These counts are worldwide: they do not say whether it is invasive where you are.');
  for (const b of ['Add your country', 'Why we ask']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  await press(page, 'button', 'Why we ask');
  await says(page, /Why we ask\. A plant can be harmless in one country/);
  await says(page, /Your country stays on this device\./);
  await says(page, /Recorded invasive in \d+ countries/);
  await done(page);
  const guess = await tool({ setup: (pg) => pg.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'languages', { get: () => ['en-KE', 'en'] }); }) });
  await press(guess, 'button', 'No location? Choose a climate');
  await says(guess, /Invasive warnings for Kenya · guessed from your browser/);
  await inOrder(guess, ['Invasive warnings for Kenya', 'Tropical']);
  await done(guess);
});

failing('PFC10 (pf-c Arrivals, owner Q7, carried from PP-B12 keyboard answers): a shared link with a palette saved here says "Someone shared a palette with you", "N plants from the Mediterranean list… Your own palette (N plants near …) stays on this device, untouched." and "Look at the shared palette", "Add its plants to mine", "Stay with mine"; Look says "You are looking at a shared palette. Nothing of yours was changed." with "Keep it as mine" and "Back to mine"; Add its plants to mine adds them with Undo; Enter on a choice keeps the focus on the page', { owner: 'pf-c', reason: BOARD }, async () => {
  const save = await savedPalette('Temperate', 8);
  const hash = await linkOf('Mediterranean', 13);
  const page = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await says(page, 'Someone shared a palette with you');
  await says(page, /13 plants from the Mediterranean list/);
  await says(page, /Your own palette \(8 plants(?: near [^)]+)?\) stays on this device, untouched\./);
  for (const b of ['Look at the shared palette', 'Add its plants to mine', 'Stay with mine']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  await page.focus(aria('button', 'Look at the shared palette'));
  await page.keyboard.press('Enter');
  await says(page, 'You are looking at a shared palette. Nothing of yours was changed.');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'board: the focus stays on the page');
  for (const b of ['Keep it as mine', 'Back to mine']) assert.ok((await names(page, 'button')).includes(b), `board: "${b}"`);
  await done(page);
  const add = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await press(add, 'button', 'Add its plants to mine');
  assert.ok(await add.waitForFunction(() => window.__ctTest.store.members.value.length > 8, { timeout: 8000 }).then(() => true, () => false), 'board: its plants join mine');
  assert.ok((await names(add, 'button')).includes('Undo'), 'board: with Undo');
  await press(add, 'button', 'Undo');
  assert.ok(await add.waitForFunction(() => window.__ctTest.store.members.value.length === 8, { timeout: 4000 }).then(() => true, () => false), 'board: Undo gives mine back');
  await done(add);
  const stay = await withStorage({ 'canopi-consortium': save }, `/palette/${hash}`);
  await press(stay, 'button', 'Stay with mine');
  assert.ok(await stay.waitForFunction(() => window.__ctTest.store.members.value.length === 8, { timeout: 8000 }).then(() => true, () => false), 'board: Stay with mine keeps my 8 plants');
  await done(stay);
});

failing('PFC11 (pf-c Arrivals, the other links, carried from PP-B12 and PP-B13): a guide link over a save says "Kept from the guide: <plant>." with "Give my place" and "Open my saved palette instead"; a newer link says "This link was made by a newer version. Reload the page to get it." with "Reload"; an unreadable one "This link could not be read. Nothing was changed." with "Start a new palette" and "Back to mine"; the save untouched', { owner: 'pf-c', reason: BOARD }, async () => {
  const save = await savedPalette('Temperate', 4);
  const guide = await withStorage({ 'canopi-consortium': save }, '/palette/?plant=Malus%20domestica&climate=temperate');
  await says(guide, /Kept from the guide: [^.]+\./);
  for (const b of ['Give my place', 'Open my saved palette instead']) assert.ok((await names(guide, 'button')).includes(b), `board: "${b}"`);
  await done(guide);
  const newer = await withStorage({ 'canopi-consortium': save }, '/palette/#v=99&c=temperate&a=abcdef&e=1');
  await says(newer, 'This link was made by a newer version. Reload the page to get it.');
  await control(newer, 'button', 'Reload');
  assert.equal(await newer.evaluate(() => localStorage.getItem('canopi-consortium')), save, 'the save untouched');
  await done(newer);
  const bad = await withStorage({ 'canopi-consortium': save }, '/palette/#v=x5&c=temperate&a=abcdef&e=1');
  await says(bad, 'This link could not be read. Nothing was changed.');
  for (const b of ['Start a new palette', 'Back to mine']) assert.ok((await names(bad, 'button')).includes(b), `board: "${b}"`);
  await done(bad);
});

failing('PFC12 (pf-c Arrivals, the return, owner Q3, carried from b1a2-6): a palette saved here opens with "Your palette is back: 8 plants near <place>, last changed 9 November. Kept on this device only." and "Start over"; a link without a place says "This palette came without a place." with "Give my place" and "Later"', { owner: 'pf-c', reason: BOARD }, async () => {
  const save = await savedPalette('Temperate', 8, '2026-11-09T10:00:00.000Z');
  const page = await withStorage({ 'canopi-consortium': save, 'canopi-location': JSON.stringify({ lat: SITES.kiambu[0], lon: SITES.kiambu[1], source: 'geo' }) });
  await says(page, /Your palette is back ?: 8 plants near [^,]+, last changed 9 November\. Kept on this device only\./);
  await control(page, 'button', 'Start over');
  await done(page);
  const bare = await tool({ hash: await linkOf('Mediterranean', 5) });
  await says(bare, 'This palette came without a place.');
  for (const b of ['Give my place', 'Later']) assert.ok((await names(bare, 'button')).includes(b), `board: "${b}"`);
  await done(bare);
});

failing('PFC13 (pf-c Loading, carried from PP-B15, PP-B16 and PP-B24): while the list loads "Loading the plant list… You can already give your place." with Place usable; slow, "Still loading: the connection is slow. Keep going; your answers are kept. 0.8 of 1.4 MB." (the sizes as numbers); a part that did not load says "This part did not load. The rest of the page works." with "Reload"', { owner: 'pf-c', reason: BOARD }, async () => {
  // The database held, with the page's slow threshold shortened (h.open timeouts.slow): the first
  // line, then the slow one with the sizes as numbers, then the tool.
  const page = await h.open('/palette/', { hook: true, mapTiles: 'stub', database: 'hold', timeouts: { slow: 400 } });
  await says(page, 'Loading the plant list… You can already give your place.', { timeout: 8000 });
  await control(page, 'textbox', FIELD);
  await says(page, /Still loading: the connection is slow\. Keep going; your answers are kept\. [\d.]+ of [\d.]+ MB\./, { timeout: 8000 });
  await page.releaseHeld();
  await done(page);
  const part = await tool({ block: { palette: 404 } });
  await choose(part, 'Temperate');
  await part.evaluate(() => { window.__ctTest.store.view.value = 'matrix'; });
  await says(part, 'This part did not load. The rest of the page works.');
  await control(part, 'button', 'Reload');
  await done(part);
});

failing('PFC14 (pf-c status regions, F1a-P9\'s row, carried from PP-B3): from Place to the palette every live region is on the page before its message (the search\'s "Looking for “Kiambu”…", the climate read, the toast), each speaking the board\'s words', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture', setup: (pg) => pg.evaluateOnNewDocument(() => {
    window.__late = [];
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.matches?.('[role="status"], [aria-live]') && n.textContent.trim()) window.__late.push(n.textContent.trim().slice(0, 40)); }).observe(document, { subtree: true, childList: true });
  }) });
  await searchFor(page, 'Kiambu');
  await says(page, /Near Kiambu, Kiambu County/);
  assert.deepEqual(await page.evaluate(() => window.__late), [], 'board: every live region there before its message');
  await done(page);
});

failing('PFC15 (pf-c LocDesk and DarkMap): at 1280 px "Where is your place?" shows the search and the map side by side ("Search by name, type coordinates, or move the map."), the map right of the field; in the dark theme the map dialog keeps its words and buttons', { owner: 'pf-c', reason: BOARD }, async () => {
  const page = await tool({ nominatim: 'fixture' });
  await press(page, 'button', 'Pick on a map');
  await says(page, 'Search by name, type coordinates, or move the map.');
  const field = await boxOf(page, 'Search by name, type coordinates'), map = await page.evaluate(() => { const m = document.querySelector('[role="img"][aria-label^="Map of"]'); if (!m) return null; const r = m.getBoundingClientRect(); return { x: r.left, y: r.top }; });
  assert.ok(field && map && map.x > field.x + 200, `board: the map beside the search (${JSON.stringify({ field, map })})`);
  await done(page);
  const dark = await tool({ theme: 'dark', width: 390 });
  await press(dark, 'button', 'Pick on a map');
  await says(dark, 'Pick your place on the map', { inDialog: true });
  for (const b of ['Cancel', 'Use this point', 'Zoom in', 'Zoom out']) assert.ok((await names(dark, 'button')).includes(b), `board: "${b}"`);
  assert.match(await dialogText(dark), /under the cross/, 'board: the point under the cross');
  await done(dark);
});

failing('F1a-P2 → PP-C (pf-c return visit, Arrivals): a saved palette opens with "Opening your palette…" while it restores and then the palette page; the Place form never shows', { owner: 'pf-c', reason: BOARD }, async () => {
  const save = await savedPalette('Temperate', 5);
  const page = await withStorage({ 'canopi-consortium': save }, '/palette/', { setup: undefined });
  await says(page, /Your palette is back ?: 5 plants/);
  await saysNot(page, '1 Where is your place?', 'a return visit never shows the Place form');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), 5, 'the saved plants');
  await done(page);
});
