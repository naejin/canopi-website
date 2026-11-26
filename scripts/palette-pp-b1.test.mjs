// PP-B streams b1a (your place, arriving and sharing) and b1b (the pool count into Place): their unit
// tests (plant-palette-slices, PP-B rows). Commit 0 moved two F1a markers here (the suggestion's
// invasive tie); b1a made them pass in suggest.ts and removed the markers.
import assert from 'node:assert/strict';
import test from 'node:test';
import { UNSURE_SITE } from '../src/lib/palette/index.ts';
import { suggest } from '../src/lib/palette/suggest.ts';
import { taxon } from './palette-p5-fixtures.mjs';

let n = 0;
const fn = (f) => ({ function: f, method: 'curated', sources: [] });
const plant = (over = {}) => {
  const k = ++n;
  return taxon({ id: `00000000-9a1e-4000-8000-${String(k).padStart(12, '0')}`, canonical_name: over.canonical_name ?? `Plantus ${String(k).padStart(3, '0')}`, genus: `Plantus${k}`, role: 'support', ...over });
};

// A10 + owner Q1 (decision row "F1a design-check answers"): between plants that bring the same to the
// consortium, the suggestion picks the one not invasive in the chosen country, or, with no country
// chosen, not invasive in any GRIIS country. Invasiveness still never scores beyond the tie, and an
// invasive plant stays addable with its warning. Two plants equal in every gain term, the invasive one
// first in today's tie order (canonical name).
const tied = () => {
  const twin = { stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, functions: [fn('insectary')] }; // helpers: no second-doer gain, so only one is picked
  return [plant({ ...twin, canonical_name: 'Aaa invasiva', warnings: { toxicity: null, invasive_in: [{ country: 'FR', sources: ['griis'] }], allelopathic: null, weed_potential: null } }), plant({ ...twin, canonical_name: 'Bbb modesta' })];
};
const suggestCtx = (over) => ({ site: UNSURE_SITE, interactions: [], country: null, countryStatus: 'none', ...over });

test('F1a-P12 → PP-B (b1a invasive tie, A10): of two plants that bring the same, the suggestion picks the one not invasive in the chosen country', () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx({ country: 'FR', countryStatus: 'checked' })).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in FR on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});

test('F1a-P13 → PP-B (b1a invasive tie, owner Q1): with no country chosen, the tie goes to the plant invasive in no GRIIS country', () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx()).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in a GRIIS country on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});

// PP-B exit (2026-11-16, found by the P5-27n rewrite): a seeded plant the suggestion cannot read (a guest
// whose list failed, PP-B21, or one on no list at hand) is the grower's: it stays, in seed order, after
// the plants the suggestion can read. Before, suggest() kept only the seeds it found, so the press
// removed the plant silently (owner: warn, never hide).
test('PP-B exit: a seeded plant the suggestion cannot read stays in the palette', () => {
  const [a, b] = tied();
  const unread = '00000000-9a1e-4000-8000-ffffffffffff';
  const picked = suggest([a, b], suggestCtx({ seed: [unread, a.id] })).members;
  assert.ok(picked.includes(unread), `the unread seed is dropped (${JSON.stringify(picked)})`);
  assert.ok(picked.includes(a.id));
  assert.equal(new Set(picked).size, picked.length, 'each plant once');
});

// ---- b1a: the place, arriving, Start over, the link's place, Forget (plant-palette-slices section 2,
// row b1a; plant-palette-architecture 3.1, 8.3, 9). The state modules on the installed export, with a
// storage double; Node has no location or history, so the address is left alone. ----
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { encodeLink, encodePlace, linkOrigin, decodeLink, NO_EDITS } from '../src/lib/palette/index.ts';

const persist = await import('../src/islands/palette/state/persist.ts');
const restoreM = await import('../src/islands/palette/state/restore.ts');
const arrivalM = await import('../src/islands/palette/state/arrival.ts');
const draft = await import('../src/islands/palette/state/draft.ts');
const locationM = await import('../src/islands/palette/state/location.ts');
const store = await import('../src/islands/palette/store.ts');
const { openBytes } = await import('../src/islands/palette/data/load.ts');
const { createSqliteSource } = await import('../src/islands/palette/data/sqlite-source.ts');
const { LOCATION_STORE, COUNTRY_STORE } = persist;
const STORE = 'canopi-consortium';
const PLACE_STORE = 'canopi-place';

test('b1a arrival with history.state: tab reload restores pl and ask; plain visit starts fresh', () => {
  assert.deepEqual(arrivalM.arrival({ hash: '', search: '' }, null), { kind: 'start', climate: null });
  assert.deepEqual(arrivalM.arrival({ hash: '#v=5&c=temperate&a=&e=1', search: '' }, null, { ct: 'v=5&c=temperate&a=&e=1', src: 'chosen', pl: 'l=sun' }), { kind: 'saved', fragment: 'v=5&c=temperate&a=&e=1', src: 'chosen', place: 'l=sun' });
  assert.deepEqual(arrivalM.arrival({ hash: '#v=5&c=temperate&a=&e=1', search: '' }, null, { ct: 'v=5&c=temperate&a=&e=1', src: 'link', pl: 'k=FR&l=sun', ask: 1 }), { kind: 'saved', fragment: 'v=5&c=temperate&a=&e=1', src: 'link', place: 'k=FR&l=sun', ask: true });
});

// The store on the installed export, as palette-memory.test.mjs sets it up.
const index = JSON.parse(readFileSync(new URL('../src/data/palette-index.json', import.meta.url), 'utf8'));
const real = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
const realSource = createSqliteSource(real.db, { images: {} });
const kept = new Map();
globalThis.localStorage = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => void kept.set(k, String(v)), removeItem: (k) => void kept.delete(k) };
store.start();
persist.watchStore();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// The reader's own values: none (v14 0W-2 R4: the old spot and soil answers are gone; a link's place
// is its cell, its country and the grower's own values, here a soil test of pH 5).
const SUN = NO_EDITS;
const SHADE = Object.freeze({ soilPh: 5 });
// The save's private place: the reader's own values (none here); their place is their country and location.
const OWN_PLACE = '';
// A Temperate palette of n plants on screen with the reader's own place (full sun), saved.
async function mine(n = 5) {
  kept.clear();
  persist.linkPlace.value = null;
  store.setSource(realSource);
  store.load.value = { status: 'ready', error: null };
  const pool = await store.loadPool('Temperate');
  persist.quietly(() => {
    store.climate.value = 'Temperate';
    store.country.value = { code: 'FR', source: 'chosen' };
    store.room.value = 'small';
    store.siteEdits.value = SUN;
    store.members.value = pool.slice(0, n).map((t) => t.id);
    store.removed.value = [pool[30].id];
    store.guests.value = {};
    store.view.value = 'matrix';
  });
  store.location.value = null;
  restoreM.notices.value = { ...restoreM.NO_NOTICES };
  store.hideToast();
  return pool;
}
const saved = () => kept.get(STORE) ?? null;
const known = async (zone) => ({ [zone]: (await realSource.pool(zone)).map((t) => t.id) });
const linkWith = async (zone, n, extra = {}, opts = {}) => {
  const k = await known(zone);
  return encodeLink({ climate: zone, country: null, room: 'unsure', plot: null, period: '1991-2020', members: k[zone].slice(0, n), removed: [], guests: [], ...extra }, k, opts);
};

test('b1a Start over then one Undo: members, removed and guests come back, the palette\'s place stays', async () => {
  const pool = await mine(5);
  const before = { members: store.members.peek(), removed: store.removed.peek(), guests: { [pool[50].id]: 'Tropical' } };
  store.guests.value = before.guests;
  await wait(0);
  draft.startOver();
  assert.deepEqual([store.members.peek().length, store.removed.peek().length, Object.keys(store.guests.peek()).length], [0, 0, 0]);
  assert.equal(saved(), null, 'no localStorage auto-save');
  assert.deepEqual(store.siteEdits.peek(), SUN, 'Start over keeps the place');
  assert.ok(store.toast.peek()?.undo, 'no Undo offered after Start over');
  store.toast.peek().undo();
  assert.deepEqual(store.members.peek(), before.members);
  assert.deepEqual(store.removed.peek(), before.removed);
  assert.deepEqual(store.guests.peek(), before.guests);
  assert.deepEqual(store.siteEdits.peek(), SUN);
  await wait(0);
  assert.equal(saved(), null, 'Undo never writes localStorage');
  // A new plant after Start over ends the offer: Undo never puts back a palette over new work.
  draft.startOver();
  store.members.value = [pool[60].id];
  assert.equal(store.toast.peek()?.undo ?? null, null, 'a change ends the Undo offer');
});

test('h2 R7: Start over with no plant left (every one removed) says no "Palette cleared: 0 plants"', async () => {
  await mine(5);
  for (const id of store.members.peek()) store.removeMember(id);
  assert.equal(store.members.peek().length, 0);
  assert.ok(store.removed.peek().length > 0, 'the removed list holds them');
  store.hideToast();
  draft.startOver();
  assert.equal(store.toast.peek(), null, 'nothing to count: no "Palette cleared: 0 plants" toast');
  // With plants, the count and its Undo (board Toasts "Palette cleared: 8 plants. Your place is kept.").
  await mine(5);
  draft.startOver();
  assert.ok(store.toast.peek()?.undo, 'with plants: the count toast and its Undo');
});

test('h2 R8: "Try again" on a missing guest list re-reads it ("busy" meanwhile); failing again, the notice offers Reload ("failed"); a read that answers clears it', async () => {
  const pool = await mine(3);
  const guest = (await realSource.pool('Mediterranean')).find((t) => !pool.some((p) => p.id === t.id));
  let broken = true;
  const src = { ...realSource, pool: (c) => (c === 'Mediterranean' && broken ? Promise.reject(new Error('test: list unreadable')) : realSource.pool(c)), info: () => realSource.info() };
  store.source.value = src;
  try {
    store.guests.value = { [guest.id]: 'Mediterranean' };
    store.members.value = [...store.members.peek(), guest.id];
    await store.loadPool('Mediterranean');
    assert.deepEqual(store.failedPools.peek(), ['Mediterranean'], 'the guest list is missing');
    const run = store.retryFailedLists();
    assert.equal(store.listRetry.peek(), 'busy', 'busy while it re-reads');
    await run;
    assert.equal(store.listRetry.peek(), 'failed', 'failed again: the notice offers Reload');
    broken = false;
    await store.retryFailedLists();
    assert.deepEqual([store.listRetry.peek(), store.failedPools.peek()], ['idle', []], 'a read that answers clears it');
  } finally { store.source.value = realSource; store.failedPools.value = []; store.listRetry.value = 'idle'; }
});

test('b1a a guide preset gives members == [id] and writes no save until the reader acts', async () => {
  const pool = await mine(5);
  persist.quietly(() => { store.view.value = 'start'; store.climate.value = null; store.members.value = []; store.removed.value = []; });
  await wait(0);
  const before = kept.get(STORE);
  await restoreM.applyPreset('Temperate', pool[3].canonical_name);
  assert.deepEqual(store.members.peek(), [pool[3].id]);
  await wait(0);
  assert.equal(kept.get(STORE), before, 'the preset wrote a save');
  assert.equal(restoreM.notices.peek().guidePlant, pool[3].id, 'the guide notice names the plant (not "Kept")');
});

// Link-place notice (plant-palette-architecture 8.3, Arrivals board "Shared link with a place").
async function arriveWithPlace() {
  await mine(5);
  await wait(0);
  assert.equal(saved(), null, 'no localStorage palette save');
  const link = await linkWith('Mediterranean', 4, { country: 'ES', siteEdits: SHADE }, { origin: { lat: 37.39, lon: -5.98 }, place: true });
  const before = restoreM.provideLocationStep(async () => ({ settle: async () => {}, adopt: locationM.adoptLinkLocation }));
  assert.equal(await restoreM.restore(link, { from: 'link' }), true);
  return before;
}
test('b1a link place (a): a palette edit while the notice shows never writes localStorage', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    assert.equal(store.siteEdits.peek().soilPh, 5, 'the page is judged with the link\'s place');
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.equal(saved(), null, 'no localStorage save written');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});
test('b1a link place (c): "Use my own place" gives back the reader\'s own answers', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    draft.useOwnPlace();
    await wait(0);
    assert.equal(restoreM.linkPlace.peek(), null);
    assert.deepEqual(store.siteEdits.peek(), SUN);
    assert.deepEqual(store.country.peek(), { code: 'FR', source: 'chosen' });
    assert.notEqual(store.location.peek()?.source, 'link', 'the link\'s location goes');
    assert.equal(saved(), null);
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a a link\'s m and z never bring a place; k alone keeps the reader\'s country and place', async () => {
  for (const extra of [{ room: 'field', plot: 900 }, { country: 'DE' }, { country: 'DE', siteEdits: NO_EDITS }]) {
    await mine(5);
    const link = await linkWith('Temperate', 3, extra, { place: true });
    assert.equal(await restoreM.restore(link, { from: 'link' }), true);
    assert.deepEqual(store.siteEdits.peek(), SUN, JSON.stringify(extra));
    assert.deepEqual(store.country.peek(), { code: 'FR', source: 'chosen' }, JSON.stringify(extra));
    if (extra.room) assert.deepEqual([store.room.peek(), store.plot.peek()], ['field', 900], 'the link\'s room and plot win');
    assert.equal(restoreM.linkPlace?.peek() ?? null, null, 'no link-place notice');
  }
});

// A stored and current location at Seville, then Forget this location (and its writes settle).
async function forgetSeville() {
  kept.set(LOCATION_STORE, JSON.stringify({ lat: 37.39, lon: -5.98, source: 'geo' }));
  store.location.value = { lat: 37.39, lon: -5.98, source: 'geo', lookup: null };
  locationM.forget();
  await wait(0);
}

test('b1a Forget this location clears canopi-location and the palette\'s place', async () => {
  await mine(5);
  await forgetSeville();
  assert.equal(kept.get(LOCATION_STORE), undefined, 'canopi-location goes');
  assert.equal(kept.get(PLACE_STORE), undefined, 'canopi-place is never written');
  assert.deepEqual(store.siteEdits.peek(), NO_EDITS);
  assert.equal(saved(), null);
  assert.equal(store.room.peek(), 'small', 'the room is the palette\'s, kept');
});

// ---- review round 1 (b1a-review-r1: bugs-1 to bugs-5, bugs-7 to bugs-10) ----

// focus.ts waits two frames before it moves the focus; Node has no frames (and no document to focus).
globalThis.requestAnimationFrame ??= () => 0;
// The address bar and history.state for one test (Node has neither): writeAddress then runs as on a
// page, so a reload or Back/Forward can be read back through arrival() and hashAction().
function fakeAddress() {
  const loc = { origin: 'https://projectcanopi.test', pathname: '/palette/', search: '', hash: '', get href() { return `${this.origin}${this.pathname}${this.search}${this.hash}`; }, reload() {} };
  const hist = { state: null, replaceState(s, _t, url) { this.state = s === null ? null : JSON.parse(JSON.stringify(s)); const u = new URL(url); loc.hash = u.hash; loc.search = u.search; } };
  globalThis.location = loc;
  globalThis.history = hist;
  return () => { delete globalThis.location; delete globalThis.history; };
}
// A location step whose lookups answer at once: the saved location is read back as it was kept, a
// link's location stays as the link set it, and "Use it" keeps the link's cell (location.ts).
const instantStep = () => restoreM.provideLocationStep(async () => ({
  settle: async (how, text) => { if (how === 'saved' && text && !store.location.peek()) { const l = JSON.parse(text); store.location.value = { lat: l.lat, lon: l.lon, source: l.source, lookup: null }; } },
  adopt: locationM.adoptLinkLocation,
}));

test('b1a bugs-2: a link\'s country never stands for the reader\'s own (k=FR over a chosen KE)', async () => {
  const KE = { code: 'KE', source: 'chosen' };
  await mine(5);
  persist.quietly(() => { store.country.value = { code: 'FR', source: 'link' }; });
  const link = await linkWith('Temperate', 3, { country: 'FR', siteEdits: SHADE }, { place: true });
  assert.equal(await restoreM.restore(link, { from: 'link', country: KE }), true);
  assert.ok(restoreM.linkPlace.peek(), 'link-place notice shown for k=FR over KE');
  store.removeMember(store.members.peek()[0]);
  draft.useOwnPlace();
  assert.deepEqual(store.country.peek(), KE, '"Use my own place" restores KE');
  assert.equal(saved(), null, 'no localStorage save written');
  // A link whose only difference is its country asks too.
  await mine(5);
  kept.set(LOCATION_STORE, JSON.stringify({ lat: 37.39, lon: -5.98, source: 'geo' }));
  persist.quietly(() => { store.country.value = { code: 'DE', source: 'link' }; });
  const deLink = await linkWith('Temperate', 3, { country: 'DE' }, { origin: { lat: 37.39, lon: -5.98 }, place: true });
  assert.equal(await restoreM.restore(deLink, { from: 'link', country: { code: 'FR', source: 'chosen' } }), true);
  assert.ok(restoreM.linkPlace.peek(), 'a link that differs only by its country gave no notice: the link\'s country was taken as the reader\'s');
});

test('b1a bugs-3: a link\'s cell is compared with the reader\'s own cell, and "Use my own place" brings their location back', async () => {
  const before = instantStep();
  try {
    const PARIS = { lat: 48.85, lon: 2.35, source: 'geo' };
    // An o-only link (none of the grower's values) over a reader whose answers are all unsure.
    await mine(5);
    persist.quietly(() => { store.siteEdits.value = NO_EDITS; });
    kept.set(LOCATION_STORE, JSON.stringify(PARIS));
    const seville = await linkWith('Temperate', 3, {}, { origin: { lat: 37.39, lon: -5.98 }, place: true });
    assert.equal(await restoreM.restore(seville, { from: 'link' }), true);
    assert.equal(store.location.peek()?.source, 'link');
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice for a link whose cell differs from the reader\'s');
    draft.useOwnPlace();
    await wait(0);
    const back = store.location.peek();
    assert.ok(back && back.source === 'geo' && back.lat === PARIS.lat, `"Use my own place" did not bring the reader's location back (${JSON.stringify(back)})`);
    // The same cell as the reader's own (a point inside it): no notice.
    await mine(5);
    persist.quietly(() => { store.siteEdits.value = NO_EDITS; });
    kept.set(LOCATION_STORE, JSON.stringify({ lat: 37.38, lon: -5.97, source: 'search' }));
    assert.equal(await restoreM.restore(seville, { from: 'link' }), true);
    assert.equal(restoreM.linkPlace.peek(), null, 'a link of the reader\'s own cell asked');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a bugs-4: a room or plot change while the notice waits never writes canopi-place', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    store.room.value = 'large';
    await wait(0);
    assert.equal(kept.get(PLACE_STORE), undefined, 'canopi-place is never written');
    store.plot.value = 120;
    await wait(0);
    assert.equal(kept.get(PLACE_STORE), undefined, 'canopi-place is never written');
    assert.ok(restoreM.linkPlace.peek(), 'a room change is no answer to the notice');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a bugs-5: Forget on Place (back from the palette) clears the palette\'s place', async () => {
  await mine(5);
  await wait(0);
  draft.backToPlace();
  locationM.forget();
  await wait(0);
  draft.showPalette();
  await wait(0);
  assert.deepEqual(store.siteEdits.peek(), NO_EDITS, 'the set-aside palette kept its place: the values came back');
  assert.equal(store.room.peek(), 'small', 'the room stays');
});

// conformance-2 (b1a review r1): the grower lists their own plants on Place (boards Place, PlaceDesk):
// each plant added from Place stays there as a chip, with the spot questions and "Show my palette".
test('b1a conformance-2: plants added on Place keep the grower on Place, every one listed', async () => {
  const pool = await mine(0);
  persist.quietly(() => { store.view.value = 'start'; });
  store.addMembers([pool[1].id]);
  store.addMembers([pool[2].id]);
  assert.equal(store.view.peek(), 'start', 'adding a plant on Place opened the palette');
  assert.deepEqual(store.memberTaxa.peek().map((t) => t.id), [pool[1].id, pool[2].id]);
});

// conformance-4 (b1a review r1; board ChangePlace): changing the place never removes a plant, and the
// dropped "Back to your palette" control is gone.
test('b1a conformance-4: another climate keeps every plant, on the palette and on Place', async () => {
  await mine(5);
  const before = store.members.peek();
  draft.chooseClimate('Mediterranean');
  assert.deepEqual(store.members.peek(), before, 'a climate chosen on the palette removed plants');
  draft.backToPlace();
  draft.chooseClimate('Tropical');
  assert.deepEqual(store.members.peek(), before, 'a climate chosen on Place removed plants');
});

// b1a2-1 (fix round 1): changing the place never removes a plant; each kept plant is still drawn,
// checked and saved. A plant the new climate's list lacks is a guest of the climate it came from.
test('b1a2-1: Temperate to Mediterranean keeps a Temperate-only plant drawn and in the save; back to Temperate it is no guest', async () => {
  const pool = await mine(5);
  const med = await store.loadPool('Mediterranean');
  const inMed = new Set(med.map((t) => t.id));
  const only = pool.find((t) => !inMed.has(t.id));
  const both = pool.find((t) => inMed.has(t.id));
  assert.ok(only && both, 'a Temperate-only plant and one in both lists');
  persist.quietly(() => { store.members.value = [only.id, both.id]; });
  draft.chooseClimate('Mediterranean');
  await wait(0);
  assert.equal(store.guests.peek()[only.id], 'Temperate', 'the Temperate-only plant is a guest of Temperate');
  assert.equal(store.guests.peek()[both.id], undefined, 'a plant in the new list is no guest');
  assert.deepEqual(store.memberTaxa.peek().map((t) => t.id).sort(), [only.id, both.id].sort(), 'both drawn');
  const k = { Temperate: pool.map((t) => t.id), Mediterranean: med.map((t) => t.id) };
  const read = decodeLink(persist.currentFragment(), k);
  assert.deepEqual([...read.state.members].sort(), [only.id, both.id].sort(), 'both read back from the fragment');
  draft.chooseClimate('Temperate');
  await wait(0);
  assert.equal(store.guests.peek()[only.id], undefined, 'back in its own climate, no guest');
});

// b1a2-4 (fix round 1): a location already on the page stands for the kept one.
test('b1a2-4: ownLocation with a location already set clears locationAtStart', async () => {
  await mine(5);
  restoreM.locationAtStart.value = true;
  store.location.value = { lat: 48.85, lon: 2.35, source: 'search', label: 'Paris', lookup: null };
  restoreM.ownLocation('{"lat":40,"lon":3}');
  assert.equal(restoreM.locationAtStart.peek(), false, 'locationAtStart still true with a location set');
  store.location.value = null;
});

// b1a2-2 (fix round 1): a borrowed list not fitted to a place offers nothing to suggest or swap from.
test('b1a2-2: with a borrowed climate and no location, the pool the palette offers from is empty', async () => {
  await mine(5);
  // All 7 climates are curated since r-61c991c93df2effd; simulate an uncurated Subtropical climate to verify borrowed offerPool gating.
  const partialDb = new Proxy(real.db, { get(o, k) {
    if (k !== 'selectObjects') return typeof o[k] === 'function' ? o[k].bind(o) : o[k];
    return (sql, params) => sql === 'SELECT id FROM climates ORDER BY ord'
      ? o.selectObjects(sql, params).filter((r) => r.id !== 'Subtropical')
      : o.selectObjects(sql, params);
  } });
  const partialSource = createSqliteSource(partialDb, { images: {} });
  try {
    store.setSource(partialSource);
    await store.loadPool('Subtropical');
    persist.quietly(() => { store.climate.value = 'Subtropical'; });
    store.location.value = null;
    assert.ok(store.pool.peek()?.length, 'the borrowed list is read');
    assert.equal(store.offerPool.peek().length, 0, 'the borrowed list is offered without a place');
    await store.loadPool('Temperate');
    persist.quietly(() => { store.climate.value = 'Temperate'; });
    assert.ok(store.offerPool.peek()?.length, 'a curated list is offered');
  } finally {
    store.setSource(realSource);
  }
});

// A reload while a link's place waits: the page forgets its location (the address and history.state
// stay) and opens its own address again, asked against the reader's own place. arrival()'s answer.
// fresh: run once the address is read (the new page's own state).
async function reloadAsking(fresh = () => {}) {
  store.location.value = null;
  const how = arrivalM.arrival({ hash: location.hash, search: '' }, null, history.state);
  assert.equal(how.ask, true);
  fresh();
  const ask = { siteEdits: SUN, country: { code: 'FR', source: 'chosen' }, location: null };
  assert.equal(await restoreM.restore(how.fragment, { from: 'saved', src: how.src, place: how.place, ask }), true);
  return how;
}
test('b1a bugs-9: a reload while the notice waits keeps the link\'s cell, so "Use it" still adopts it', async () => {
  const restoreAddress = fakeAddress();
  let before = null;
  try {
    before = await arriveWithPlace();
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    assert.equal(history.state?.ask, 1, 'the address says the notice waits');
    await reloadAsking();
    assert.ok(restoreM.linkPlace.peek(), 'asked again after the reload');
    assert.equal(store.location.peek()?.source, 'link', 'the link\'s cell was lost on reload');
    await draft.useLinkPlace();
    const loc = locationM.readLocation(kept.get(LOCATION_STORE) ?? null);
    assert.ok(loc && Math.abs(loc.lat - 37.35) < 0.051, `the link's cell was lost: "Use it" kept ${kept.get(LOCATION_STORE)}`);
  } finally { restoreAddress(); restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a bugs-10: "Use my own place" pressed while "Use it" is still working changes nothing half-way', async () => {
  const before = await arriveWithPlace();
  const slow = restoreM.provideLocationStep(async () => { await wait(30); return { settle: async () => {}, adopt: locationM.adoptLinkLocation }; });
  try {
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    const using = draft.useLinkPlace();
    draft.useOwnPlace();
    await using;
    await wait(0);
    const chosen = kept.get(COUNTRY_STORE) ?? null;
    assert.equal(chosen === null || chosen === store.country.peek().code, true, `half-way: the page shows ${store.country.peek().code} but the device keeps ${chosen}`);
    assert.equal(kept.get(PLACE_STORE), undefined, 'canopi-place is never written');
  } finally { restoreM.provideLocationStep(slow); restoreM.provideLocationStep(before); store.location.value = null; }
});

// ---- review round 2 (b1a-review-r2: r2-4, r2-5) ----

test('b1a r2-4: "Use it" says the place is kept on this device only when it was; the status line clears on the reader\'s next action and the next arrival', async () => {
  // (a) The location chunk fails to load: the link's cell is not kept.
  const before = await arriveWithPlace();
  restoreM.provideLocationStep(() => Promise.reject(new Error('chunk failed')));
  try {
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    await draft.useLinkPlace();
    await wait(0);
    assert.equal(kept.get(LOCATION_STORE), undefined, 'the cell is not kept');
    assert.notEqual(draft.placeSaid.peek(), 'place.usedLink', 'said "kept on this device" although the location was not kept');
    assert.equal(draft.placeSaid.peek(), 'place.usedLinkUnkept');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
  // With the location kept, the line says so.
  const again = await arriveWithPlace();
  try {
    await draft.useLinkPlace();
    assert.equal(draft.placeSaid.peek(), 'place.usedLink');
    // (b) The reader's next action clears it.
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.equal(draft.placeSaid.peek(), '', 'the status line still says what an earlier answer did after the reader acted');
  } finally { restoreM.provideLocationStep(again); store.location.value = null; }
  // (c) The next arrival clears it.
  const third = await arriveWithPlace();
  try {
    draft.useOwnPlace();
    assert.equal(draft.placeSaid.peek(), 'place.usedMine');
    const other = await linkWith('Temperate', 2);
    assert.equal(await restoreM.restore(other, { from: 'link', keep: true }), true);
    assert.equal(draft.placeSaid.peek(), '', 'the status line still says what an earlier answer did after another link opened');
  } finally { restoreM.provideLocationStep(third); store.location.value = null; }
});

test('b1a r2-5: arrivalPlan works out the arrival: the reader\'s own country before a link\'s, the link\'s cell, and the ask after a reload', async () => {
  let reads = 0;
  const PARIS = { lat: 48.85, lon: 2.35 };
  const cell = () => { reads++; return PARIS; };
  const plan = (how, over = {}) => arrivalM.arrivalPlan(how, { pref: null, guess: () => null, cell, ...over });
  const shade = SHADE;
  const link = await linkWith('Temperate', 3, { country: 'FR', siteEdits: shade }, { origin: { lat: 37.39, lon: -5.98 }, place: true });
  const p = plan({ kind: 'link', fragment: link }, { pref: 'KE', guess: () => 'DE' });
  assert.deepEqual(p.country, { code: 'FR', source: 'link' });
  assert.deepEqual(p.own, { code: 'KE', source: 'chosen' }, 'the reader\'s own country');
  assert.deepEqual(p.linkCell, linkOrigin(link));
  assert.ok(p.linkCell, 'the link\'s cell');
  assert.equal(p.ask, undefined);
  assert.equal(reads, 0, 'canopi-location read on a plain link arrival');
  const kOnly = await linkWith('Temperate', 3, { country: 'DE' }, { place: true });
  assert.deepEqual(plan({ kind: 'link', fragment: kOnly }, { pref: 'KE' }).country, { code: 'KE', source: 'chosen' });
  assert.deepEqual(plan({ kind: 'link', fragment: kOnly }, { guess: () => 'ES' }).country, { code: 'ES', source: 'guess' });
  const pl = encodePlace({ country: 'FR', siteEdits: shade }, { lat: 37.35, lon: -5.95 });
  const r = plan({ kind: 'saved', fragment: link, src: 'link', place: pl, ask: true }, { pref: 'KE' });
  assert.deepEqual(r.linkCell, linkOrigin(pl));
  assert.ok(r.linkCell, 'the link\'s cell from the tab\'s place');
  assert.equal(reads, 1, 'the reader\'s own cell read once for the ask');
  assert.deepEqual(r.ask, { siteEdits: NO_EDITS, country: { code: 'KE', source: 'chosen' }, location: PARIS });
});

test('b1a perf-1: the browser\'s country guess is worked out only when no link or choice names a country', async () => {
  let calls = 0;
  const guess = () => { calls++; return 'US'; };
  const { countryAtStart } = arrivalM;
  assert.deepEqual(countryAtStart({ link: 'fr', pref: null, saved: null, guess }), { code: 'FR', source: 'link' });
  assert.deepEqual(countryAtStart({ link: null, pref: 'DE', saved: null, guess }), { code: 'DE', source: 'chosen' });
  assert.deepEqual(countryAtStart({ link: null, pref: '-', saved: null, guess }), { code: null, source: 'chosen' });
  assert.equal(calls, 0, 'the guess was worked out although a country was named');
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: null, guess }), { code: 'US', source: 'guess' });
  assert.equal(calls, 1);
  calls = 0;
  const link = await linkWith('Temperate', 3, { country: 'FR', siteEdits: SHADE }, { place: true });
  arrivalM.arrivalPlan({ kind: 'link', fragment: link }, { pref: 'KE', guess, cell: () => null });
  assert.equal(calls, 0, 'the guess was worked out although a country was chosen');
  arrivalM.arrivalPlan({ kind: 'link', fragment: link }, { pref: null, guess, cell: () => null });
  assert.equal(calls, 1, 'the guess was worked out more than once');
});

// ---- review round 3 (b1a-review-r3: r3-1, r3-3; r3-2 is in bugs-8 above) ----

// r3-1: "a location kept on this device" counts for Place's climate cards only while its lookup is on
// the way: once it settles (found or not), or Forget removes it, a climate chosen with no location
// opens the cards again; Start over lets the page decide them afresh.
test('b1a r3-1: the kept location stops holding the climate cards once its lookup settles or Forget removes it; Start over resets the cards', async () => {
  const before = instantStep();
  try {
    await mine(5);
    store.location.value = null;
    const PARIS = JSON.stringify({ lat: 48.85, lon: 2.35, source: 'geo' });
    restoreM.locationAtStart.value = true;
    restoreM.ownLocation(PARIS);
    await wait(0);
    await wait(0);
    assert.equal(restoreM.locationAtStart.peek(), false, 'the kept location still holds the cards after its lookup settled');
    restoreM.locationAtStart.value = true;
    kept.set(LOCATION_STORE, PARIS);
    locationM.forget();
    assert.equal(restoreM.locationAtStart.peek(), false, 'the kept location still holds the cards after Forget');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

// r3-3: the arrival's wiring (arrival.ts openWith, which startMemory calls with what it read), run with
// a spy location step: (a) a link that brings a place restores with the reader's own country, so the
// held save and "Use my own place" never take the link's; (b) a reload while a link's place waited
// looks up no saved location over the link's cell.
test('b1a r3-3: startMemory\'s wiring passes the reader\'s own country to a link\'s restore and looks up no saved location over a link\'s cell', async () => {
  const settled = [];
  const before = restoreM.provideLocationStep(async () => ({ settle: async (how) => { settled.push(how); }, adopt: () => false }));
  const restoreAddress = fakeAddress();
  const until = async (f) => { for (let i = 0; i < 200 && !f(); i++) await wait(5); };
  try {
    // (a) canopi-country KE, a k=FR link with a spot answer.
    await mine(5);
    await wait(0);
    const link = await linkWith('Temperate', 3, { country: 'FR', siteEdits: SHADE }, { place: true });
    const how = arrivalM.arrival({ hash: `#${link}`, search: '' }, null);
    const plan = arrivalM.arrivalPlan(how, { pref: 'KE', guess: () => null, cell: () => null });
    arrivalM.openWith({ how, plan, keptLocation: null });
    await until(() => restoreM.linkPlace.peek());
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.equal(saved(), null, 'no localStorage save');
    draft.useOwnPlace();
    assert.deepEqual(store.country.peek(), { code: 'KE', source: 'chosen' }, '"Use my own place" did not give the reader\'s own country');
    // (b) A reload while a link's place waited, with a location kept on this device.
    await mine(5);
    await wait(0);
    store.location.value = null;
    settled.length = 0;
    const pl = encodePlace({ country: 'FR', siteEdits: SHADE }, { lat: 37.35, lon: -5.95 });
    const f = await linkWith('Temperate', 3);
    const reload = arrivalM.arrival({ hash: `#${f}`, search: '' }, null, { ct: f, src: 'link', pl, ask: 1 });
    assert.equal(reload.ask, true);
    const PARIS = JSON.stringify({ lat: 48.85, lon: 2.35, source: 'geo' });
    const plan2 = arrivalM.arrivalPlan(reload, { pref: null, guess: () => null, cell: () => restoreM.ownCell(PARIS) });
    arrivalM.openWith({ how: reload, plan: plan2, keptLocation: PARIS });
    await until(() => store.location.peek()?.source === 'link');
    await wait(20);
    assert.deepEqual(settled.filter((x) => x === 'saved'), [], 'the saved location was looked up over the link\'s cell');
    assert.equal(restoreM.locationAtStart.peek(), false, 'a location kept on this device that is not looked up holds the cards');
  } finally { restoreAddress(); restoreM.provideLocationStep(before); store.location.value = null; persist.linkPlace.value = null; }
});

test('pre-push re-review: "In the ground" under "Pots or a balcony" with a soil pH survives a plant change and a share link carrying p=0', async () => {
  const GROUND = Object.freeze({ pots: false, soilPh: 6.2 });
  const counts = (at) => {
    const i = store.siteInputs.peek();
    assert.equal(i.pots.value, false, `${at}: "In the ground" was lost`);
    assert.equal(i.soilPh.value, 6.2, `${at}: the soil pH no longer counts`);
  };
  await mine(5);
  store.room.value = 'pots';
  store.siteEdits.value = GROUND;
  await wait(0);
  store.removeMember(store.members.peek()[0]);
  await wait(0);
  counts('after the plant change');
  const link = await linkWith('Temperate', 3, { room: 'pots', siteEdits: GROUND }, { place: true });
  assert.match(link, /(^|&)p=0(&|$)/, 'premise: the link says "In the ground" (p=0)');
  kept.clear();
  assert.equal(await restoreM.restore(link, { from: 'link' }), true);
  assert.equal(store.room.peek(), 'pots');
  counts('through the link');
  persist.linkPlace.value = null;
});

// ---- Wave 7.1: no browser localStorage palette auto-save ----
test('Wave 7.1: palette edits, room/plot/siteEdits changes, Start over and Undo make 0 localStorage writes to palette keys', async () => {
  const paletteKeys = new Set(['canopi-consortium', 'canopi-place', 'canopi-ns-existing', 'canopi-ns-checked']);
  const pool = await mine(5);
  await wait(0);
  const written = [];
  const origSetItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = (k, v) => {
    if (paletteKeys.has(k)) written.push(k);
    origSetItem(k, v);
  };
  try {
    store.addMembers([pool[10].id]);
    store.removeMember(pool[0].id);
    store.room.value = 'large';
    store.plot.value = 250;
    store.siteEdits.value = { watering: 'all-year', soilPh: 6.4 };
    draft.startOver();
    store.toast.peek()?.undo?.();
    await wait(0);
    assert.deepEqual(written, [], 'zero localStorage writes to palette keys');
    for (const k of paletteKeys) assert.equal(kept.get(k), undefined, `${k} stays absent`);
  } finally {
    globalThis.localStorage.setItem = origSetItem;
  }
});

test('Wave 7.1: arrival ignores any leftover canopi-consortium key and lands on start', () => {
  kept.set(STORE, '{"fragment":"v=5&c=temperate&m=small&a=&e=1","at":"2026-11-26T00:00:00.000Z","src":"chosen"}');
  const how = arrivalM.arrival({ hash: '', search: '' }, 'temperate', null);
  assert.equal(how.kind, 'start');
  assert.equal('savedInstead' in restoreM, false);
});
