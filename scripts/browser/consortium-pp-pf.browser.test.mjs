// PP-C stream pf, the palette-page and Place fixes (plant-palette-slices section 3.4, pf browser rows;
// the mock-up conformance report's items routed to pf in 3.9). The screens will be reworked, so these
// are scenario checks of the text the grower reads and of what is on screen, never of layout details.
// Written failing in PP-C commit 0, each marked expected-fail (scripts/expect-fail.mjs failing(), owner
// pf in its title); pf removes a marker in the commit that makes it pass. pf starts after c1 and c2
// merge (chunk 2). PP-B6's fix (settled(page) and a locator click, design check c2 section 6) lands in
// consortium-pp-b2.browser.test.mjs, pf's file in chunk 2, not here.
//
// The words come from the conformance report and the slices row (each case's first missing phrase is
// its stated reason); the hooks pf adds: [data-place-line] (one place line with Change), the hole's
// "· Find a plant" link [data-hole-find], its candidates [data-candidate] (each with its "+ Add", an
// outlined .button-secondary), the Balcony info card [data-room-card], Your plants' rows
// [data-plant-row] (light need, span and [data-job] tags; Remove a .ct-small button on the name line),
// "Through the years" row heads [data-row-head] and bars [data-plant-id] (name and [data-job] icon),
// the Jobs picture's strips [data-job-strip], the phone's stepper [data-stepper], the map dialog's
// readout [data-map-readout], the offline card [data-location-state="offline"], the country's "Why we
// ask" [data-country-why], the climate cards [data-climate-card] (with their cities), the step heads
// [data-step="1|2|3"] (data-done once done) and the take-away buttons [data-takeaway].
import assert from 'node:assert/strict';
import { has, useHarness } from './helpers.mjs';
import { atSite, choose, temperateLink, tool } from './p5-helpers.mjs';
import { failing } from '../expect-fail.mjs';

useHarness();

const textOf = (page) => page.evaluate(() => document.querySelector('#ct-root')?.innerText.replace(/\s+/g, ' ') ?? '');
const says = async (page, words, timeout = 6000) => assert.ok(await page.waitForFunction((w) => (document.querySelector('#ct-root')?.innerText ?? '').replace(/\s+/g, ' ').includes(w), { timeout }, words).then(() => true, () => false), `the page does not say "${words}"`);

failing('PP-C19 (pf Next step waits for the verdicts): NextStep says "Checking your plants…" until the verdict rule is here or failed, so no hole is named and then flipped', { owner: 'pf', reason: /the page does not say "Checking your plants…"/ }, async () => {
  const page = await tool({ block: { verdict: 'hold' }, hash: await temperateLink() });
  await says(page, 'Checking your plants…');
  assert.equal(await page.$('.ct-next-hole'), null, 'no hole named while the verdicts load');
  await page.releaseHeld();
  assert.ok(await has(page, '.ct-next-hole', 8000), 'then the hole');
});

failing('PF1 (pf Kiambu return visit at 390): steps first, one place line with Change, the Next step on the first screen with "· Find a plant", candidates with size, span and the room note; "Your N plants. Plants with a warning come first."; no "Print shows the side view at this time step"', { owner: 'pf', reason: /the page does not say "Plants with a warning come first\."/ }, async () => {
  const page = await tool({ width: 390, hash: await temperateLink() });
  await atSite(page, 'kiambu');
  await says(page, 'Plants with a warning come first.');
  assert.ok(await has(page, '[data-place-line]', 2000), 'one place line with Change');
  assert.ok(await has(page, '[data-hole-find]', 2000), '"· Find a plant" on the hole');
  const top = await page.$eval('.ct-next', (e) => e.getBoundingClientRect().top).catch(() => Infinity);
  assert.ok(top < 844, 'the Next step on the first screen');
  assert.ok(!(await textOf(page)).includes('Print shows the side view at this time step'), '#21: the phone no longer says it');
  const chips = await page.$$eval('#ct-root .ct-chip', (els) => els.filter((e) => e.textContent.trim() && !e.getAttribute('aria-label')).length);
  assert.equal(chips, 0, 'chips icon-only, the words as their accessible name');
  // Candidates under the hole: size, span and the room note; each "+ Add" outlined.
  const cands = await page.$$eval('.ct-next [data-candidate]', (els) => els.map((e) => ({ text: e.innerText.replace(/\s+/g, ' '), add: !!e.querySelector('button.button-secondary') })));
  assert.ok(cands.length > 0, 'candidates under the hole');
  for (const c of cands) {
    assert.match(c.text, /\d+(\.\d+)?\s?m\b/, `a candidate's size ("${c.text.slice(0, 60)}")`);
    assert.match(c.text, /year/i, `a candidate's span ("${c.text.slice(0, 60)}")`);
    assert.ok(c.add, 'an outlined "+ Add"');
  }
  // Your plants: rows with light need, span and job tags, a small Remove on the name line.
  const rows = await page.$$eval('.ct-plants [data-plant-row]', (els) => els.map((e) => ({ text: e.innerText, jobs: e.querySelectorAll('[data-job]').length, remove: !!e.querySelector('button.ct-small') && /Remove/.test(e.innerText) })));
  assert.ok(rows.length > 0, 'Your plants\' rows');
  for (const r of rows) {
    assert.match(r.text, /sun|shade|light/i, 'the light need on the row');
    assert.match(r.text, /year/i, 'the span on the row');
    assert.ok(r.jobs > 0 || /no job/i.test(r.text), 'job tags on the row');
    assert.ok(r.remove, 'a small Remove on the name line');
  }
  // On a balcony: "taller than your room" on a tall candidate, and the Balcony card (every plant stays
  // in every list).
  await page.evaluate(() => { window.__ctTest.store.room.value = 'pots'; });
  assert.ok(await has(page, '[data-room-card]', 4000), 'the Balcony info card');
  assert.match(await page.$eval('[data-room-card]', (e) => e.textContent).catch(() => ''), /every list|stays/i, 'every plant stays in every list');
  await says(page, 'taller than your room');
});

failing('PF2 (pf "Through the years" at 1280): bars carry the plant name and job icon, row heads say the light level in words, no chip block, no stepper; the phone keeps stepper and chips', { owner: 'pf', reason: /a stepper at 1280/ }, async () => {
  const page = await tool({ width: 1280, hash: await temperateLink() });
  assert.ok(await has(page, '.ct-years', 8000), 'Through the years');
  assert.equal(await page.$('.ct-years [data-stepper], .ct-years .ct-stepper'), null, 'a stepper at 1280');
  assert.equal(await page.$('.ct-years .ct-chip'), null, 'no chip block at 1280');
  // Bars: the plant's name and its job icon; row heads: the light level in words with its icon.
  const bars = await page.$$eval('.ct-years .ct-chart [data-plant-id]', (els) => els.map((e) => ({ name: e.textContent.trim(), job: !!e.querySelector('[data-job]') })));
  assert.ok(bars.length > 0 && bars.every((b) => b.name && b.job), 'each bar carries the plant name and its job icon');
  const heads = await page.$$eval('.ct-years [data-row-head]', (els) => els.map((e) => ({ text: e.textContent.trim(), icon: !!e.querySelector('svg') })));
  const LIGHT = ['Needs full sun', 'Needs a lot of light', 'Grows in some shade', 'Grows in deep shade', 'Light need not recorded'];
  assert.ok(heads.length > 0 && heads.every((h) => LIGHT.some((w) => h.text.includes(w)) && h.icon), `row heads say the light level in words with its icon (${heads.map((h) => h.text).join(' | ')})`);
  // Jobs: one strip per row, with its count.
  const strips = await page.$$eval('.ct-jobs-picture [data-job-strip], [data-job-strip]', (els) => els.map((e) => e.textContent));
  assert.ok(strips.length > 0 && strips.every((t) => /\d/.test(t)), 'Jobs: one strip per row with counts');
  const phone = await tool({ width: 390, hash: await temperateLink() });
  assert.ok(await has(phone, '.ct-years .ct-chip', 8000), 'the phone keeps its chips');
  assert.ok(await has(phone, '.ct-years [data-stepper]', 2000), 'the phone keeps its stepper');
});

failing('PF3 (pf Place): a labelled field with Search, "Use my location" and "Pick on a map"; "place", never "site"; "We read: Temperate" then "Your climate: …"; the map dialog\'s readout and "Use this point"', { owner: 'pf', reason: /the page does not say "We read: "/ }, async () => {
  const page = await tool();
  await atSite(page, 'lyon');
  await says(page, 'We read: ');
  await choose(page, 'Subtropical');
  await says(page, 'Your climate: Subtropical');
  // The country: "Why we ask" and "stays on this device".
  assert.ok(await has(page, '[data-country-why]', 2000), '"Why we ask" beside the country');
  await says(page, 'stays on this device');
  // The map dialog: its coordinate readout, the privacy line, "Use this point" and "Cancel"; "place",
  // never "site", in it (the plan limits the check to the map dialog and the offline card).
  const map = await tool({ mapTiles: 'stub' });
  await map.click('[data-location-action="map"]');
  assert.ok(await has(map, '[data-location-map] [data-map-readout]', 6000), 'the map dialog\'s coordinate readout');
  assert.match(await map.$eval('[data-location-map] [data-map-readout]', (e) => e.textContent), /\d+\.\d+/, 'coordinates in the readout');
  const dialog = await map.$eval('[data-location-map]', (e) => e.innerText);
  assert.match(dialog, /Use this point/, '"Use this point"');
  assert.match(dialog, /Cancel/, '"Cancel"');
  assert.ok(!/\bsite\b/i.test(dialog), `the map dialog says "place", never "site" ("${dialog.slice(0, 80)}")`);
  // Offline: a card with Try again and "Choose a climate by hand", worded "place", never "site".
  const off = await tool({ nominatim: 'offline' });
  await off.locator('input[data-location-search]').fill('Lyon');
  await off.click('[data-location-action="search"]');
  assert.ok(await has(off, '[data-location-state="offline"]', 6000), 'the offline card');
  const card = await off.$eval('[data-location-state="offline"]', (e) => e.innerText);
  assert.match(card, /Try again/);
  assert.match(card, /Choose a climate by hand/);
  assert.ok(!/\bsite\b/i.test(card), `the offline card says "place", never "site" ("${card.slice(0, 80)}")`);
  // At 390: the climate cards name cities; a borrowed climate is "Ready, from the nearest lists".
  const phone = await tool({ width: 390 });
  const cards = await phone.$$eval('[data-climate-card]', (els) => els.map((e) => e.innerText));
  assert.ok(cards.length > 0 && cards.every((t) => /[A-Z][a-z]+(,|\s·|\s\/)/.test(t)), 'cities on the climate cards at 390');
  await choose(phone, 'Subtropical');
  await says(phone, 'Ready, from the nearest lists');
});

failing('PF4 (pf empty palette): no take-away buttons or future panel, "N of M plants fit your place"; loading "You can already give your place."; a shared palette says so and keeps the reader\'s own on the device; step 1 done mark and step 3 "Planting plan · coming later"', { owner: 'pf', reason: /the page does not say "coming later"/ }, async () => {
  // The empty palette (review c0-6: through the page, as PP-B36: every plant of a link taken out).
  const page = await tool({ hash: await temperateLink() });
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.members.value.length > 0, { timeout: 15_000 }).then(() => true, () => false), 'the link\'s palette');
  await page.evaluate(() => { const { store } = window.__ctTest; for (const id of store.members.value.slice()) store.removeMember(id); });
  await says(page, 'coming later');
  await says(page, 'plants fit your place');
  assert.equal(await page.$('#ct-root [data-future]'), null, 'no future panel on an empty palette');
  assert.equal(await page.$('#ct-root [data-takeaway]'), null, 'no take-away buttons on an empty palette');
  assert.ok(await has(page, '[data-step="1"][data-done]', 2000), 'step 1 carries its done mark');
  // While the data loads: "You can already give your place."
  const loading = await tool({ database: 'hold' });
  await says(loading, 'You can already give your place.');
  await loading.releaseHeld();
  const shared = await tool({ hash: await temperateLink() });
  await says(shared, 'This is a shared palette');
  await says(shared, 'Yours is kept on this device.');
});
