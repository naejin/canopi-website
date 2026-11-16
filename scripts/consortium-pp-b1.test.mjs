// PP-B streams b1a (your place, arriving and sharing) and b1b (the pool count into Place): their unit
// tests (plant-palette-slices, PP-B rows). Commit 0 moved two F1a markers here (the suggestion's
// invasive tie); b1a made them pass in suggest.ts and removed the markers.
import assert from 'node:assert/strict';
import test from 'node:test';
import { UNSURE_SITE } from '../src/lib/consortium/index.ts';
import { suggest } from '../src/lib/consortium/suggest.ts';
import { taxon } from './consortium-p5-fixtures.mjs';

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
import { emptyPlace, siteFor, encodeLink, encodePlace, linkOrigin, decodeLink } from '../src/lib/consortium/index.ts';

test('b1a siteFor: today\'s three answers and the room reach fits(); varies and the soil map check nothing', () => {
  assert.equal(Object.isFrozen(emptyPlace), true);
  assert.deepEqual(emptyPlace, { room: 'unsure', plotM2: null, spot: { light: 'unsure', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' }, soil: { from: 'map' } });
  assert.deepEqual(siteFor(emptyPlace, null), { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' });
  const place = { room: 'pots', plotM2: 12, spot: { ...emptyPlace.spot, light: 'shade', water: 'dry' }, soil: { from: 'own', ph: null, word: 'acid', texture: null } };
  assert.deepEqual(siteFor(place, null), { light: 'shade', soil: 'acid', water: 'dry', room: 'pots' });
  assert.equal(siteFor({ ...place, spot: { ...place.spot, light: 'varies' } }, null).light, 'unsure', 'varies checks nothing');
  assert.equal(siteFor({ ...place, soil: { from: 'own', ph: 8.1, word: null, texture: null } }, null).soil, 'chalky', 'a pH gives its word');
  assert.equal(siteFor({ ...place, soil: { from: 'map' } }, null).soil, 'unsure', 'the map checks nothing yet');
  assert.equal(siteFor({ ...place, soil: { from: 'pots' } }, null).soil, 'unsure', 'pots check no ground soil');
});

const persist = await import('../src/islands/consortium/state/persist.ts');
// The device save's own state (fix round 3 save model, state/save.ts): held, and the save as this page
// last wrote or read it.
const saveM = await import('../src/islands/consortium/state/save.ts');
const opened = (raw) => { saveM.lastSave.value = raw; };
const isHeld = () => saveM.held.peek();
const restoreM = await import('../src/islands/consortium/state/restore.ts');
const arrivalM = await import('../src/islands/consortium/state/arrival.ts');
const draft = await import('../src/islands/consortium/state/draft.ts');
const locationM = await import('../src/islands/consortium/state/location.ts');
const store = await import('../src/islands/consortium/store.ts');
const { state: schema } = await import('../src/islands/consortium/state/schema.ts');
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
const { STORE, PLACE_STORE, LOCATION_STORE, COUNTRY_STORE, readRecord, saveRecord, oldRecord } = persist;

test('b1a arrival with the v5 record { fragment, place, at, src, country? }: the save, the tab\'s pl, and canopi-place only as a seed', () => {
  const rec = readRecord(saveRecord('v=5&c=temperate&m=pots&a=&e=1', '2026-11-14', 'location', 'KE', 'l=shade&w=dry'));
  assert.deepEqual(rec, { fragment: 'v=5&c=temperate&m=pots&a=&e=1', place: 'l=shade&w=dry', at: '2026-11-14', src: 'location', country: 'KE' });
  assert.deepEqual(arrivalM.arrival({ hash: '', search: '' }, rec, null), { kind: 'saved', fragment: rec.fragment, at: '2026-11-14', src: 'location', place: 'l=shade&w=dry' });
  // A reload of the page's own address: the tab's place (history.state.pl), not the shared save's;
  // held, since the save holds another palette (pre-push fix 5: never written over).
  assert.deepEqual(arrivalM.arrival({ hash: '#v=5&c=temperate&a=&e=1', search: '' }, rec, null, { ct: 'v=5&c=temperate&a=&e=1', src: 'chosen', pl: 'l=sun' }), { kind: 'saved', fragment: 'v=5&c=temperate&a=&e=1', at: '', src: 'chosen', place: 'l=sun', hold: true });
  // A reload while a link's place still waited (history.state ask: 1, with the link's country in pl):
  // asked again, so the save stays held until the reader chooses.
  assert.deepEqual(arrivalM.arrival({ hash: '#v=5&c=temperate&a=&e=1', search: '' }, rec, null, { ct: 'v=5&c=temperate&a=&e=1', src: 'link', pl: 'k=FR&l=sun', ask: 1 }), { kind: 'saved', fragment: 'v=5&c=temperate&a=&e=1', at: '', src: 'link', place: 'k=FR&l=sun', ask: true, hold: true });
  // A save with no v, and v4 / v6 saves: not a record; v4 alone is the older one.
  for (const f of ['c=temperate&a=&e=1', 'v=4&c=temperate&a=&e=1', 'v=6&c=temperate&a=&e=1']) assert.equal(readRecord(saveRecord(f, 'x', null)), null, f);
  assert.deepEqual(['c=temperate&a=&e=1', 'v=4&c=temperate&a=&e=1', 'v=6&c=temperate&a=&e=1'].map((f) => oldRecord(saveRecord(f, 'x', null))), [false, true, false]);
  // The seed: room, plot, spot and soil read through the link's words; nothing else.
  const seed = arrivalM.placeOfSeed('m=pots&z=40&l=shade&q=windy&s=own.acid.-');
  assert.equal(seed.room, 'pots');
  assert.equal(seed.plot, 40);
  assert.deepEqual(seed.spot, { light: 'shade', water: 'unsure', wind: 'windy', ground: 'unsure', height: 'unsure' });
  assert.deepEqual(seed.soil, { from: 'own', ph: null, word: 'acid', texture: null });
  assert.equal(arrivalM.placeOfSeed(null), null);
});

// The store on the installed export, as consortium-memory.test.mjs sets it up.
const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const real = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
const realSource = createSqliteSource(real.db, { images: {} });
const kept = new Map();
globalThis.localStorage = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => void kept.set(k, String(v)), removeItem: (k) => void kept.delete(k) };
store.start();
persist.watchStore();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SUN = { ...emptyPlace.spot, light: 'sun' };
// A Temperate palette of n plants on screen with the reader's own place (full sun), saved.
async function mine(n = 5) {
  kept.clear();
  // As a page that owns its palette (a save restored), over an empty storage.
  opened(null);
  // Nothing of an earlier test's arrival stays: its link-place notice, its held save.
  persist.linkPlace.value = null;
  persist.holdSave(false);
  store.setSource(realSource);
  store.load.value = { status: 'ready', error: null };
  const pool = await store.loadPool('Temperate');
  persist.quietly(() => {
    store.climate.value = 'Temperate';
    store.country.value = { code: 'FR', source: 'chosen' };
    store.room.value = 'small';
    store.spot.value = { ...SUN };
    store.soil.value = { from: 'map' };
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
const saved = () => readRecord(kept.get(STORE) ?? null);
const known = async (zone) => ({ [zone]: (await realSource.pool(zone)).map((t) => t.id) });
const linkWith = async (zone, n, extra = {}, opts = {}) => {
  const k = await known(zone);
  return encodeLink({ climate: zone, country: null, room: 'unsure', plot: null, period: '1991-2020', spot: null, soil: null, members: k[zone].slice(0, n), removed: [], guests: [], ...extra }, k, opts);
};

test('b1a Start over then one Undo: members, removed and guests come back, the palette\'s place stays', async () => {
  const pool = await mine(5);
  const before = { members: store.members.peek(), removed: store.removed.peek(), guests: { [pool[50].id]: 'Tropical' } };
  store.guests.value = before.guests;
  await wait(0);
  draft.startOver();
  assert.deepEqual([store.members.peek().length, store.removed.peek().length, Object.keys(store.guests.peek()).length], [0, 0, 0]);
  assert.equal(saved(), null, 'the save goes');
  assert.deepEqual(store.spot.peek(), SUN, 'Start over keeps the place');
  assert.ok(store.toast.peek()?.undo, 'no Undo offered after Start over');
  store.toast.peek().undo();
  assert.deepEqual(store.members.peek(), before.members);
  assert.deepEqual(store.removed.peek(), before.removed);
  assert.deepEqual(store.guests.peek(), before.guests);
  assert.deepEqual(store.spot.peek(), SUN);
  await wait(0);
  assert.equal(saved()?.place, 'l=sun', 'the save comes back with its place');
  // A new plant after Start over ends the offer: Undo never puts back a palette over new work.
  draft.startOver();
  store.members.value = [pool[60].id];
  assert.equal(store.toast.peek()?.undo ?? null, null, 'a change ends the Undo offer');
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
  assert.equal(saved()?.place, 'l=sun');
  const link = await linkWith('Mediterranean', 4, { country: 'ES', spot: { ...emptyPlace.spot, light: 'shade' } }, { origin: { lat: 37.39, lon: -5.98 }, place: true });
  const before = restoreM.provideLocationStep(async () => ({ settle: async () => {}, adopt: locationM.adoptLinkLocation }));
  assert.equal(await restoreM.restore(link, { from: 'link' }), true);
  return before;
}
test('b1a link place (a): a palette edit while the notice shows keeps the reader\'s own l=sun in the save', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    assert.equal(store.spot.peek().light, 'shade', 'the page is judged with the link\'s place');
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.equal(saved()?.place, 'l=sun', 'the save keeps its own place until the reader chooses');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});
test('b1a link place (c): "Use my own place" gives back the reader\'s own answers', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    draft.useOwnPlace();
    await wait(0);
    assert.equal(restoreM.linkPlace.peek(), null);
    assert.deepEqual(store.spot.peek(), SUN);
    assert.deepEqual(store.country.peek(), { code: 'FR', source: 'chosen' });
    assert.notEqual(store.location.peek()?.source, 'link', 'the link\'s location goes');
    assert.equal(saved()?.place, 'l=sun');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a link place (d): Back to the reader\'s own palette while the notice shows gives back their own answers and country', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    const own = saved();
    assert.equal(await restoreM.restore(own.fragment, { from: 'saved', src: own.src, place: own.place }), true);
    assert.equal(restoreM.linkPlace.peek(), null, 'the notice goes');
    assert.deepEqual(store.spot.peek(), SUN);
    assert.deepEqual(store.country.peek(), { code: 'FR', source: 'chosen' }, 'never the link\'s country');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a a link\'s m and z never bring a place; k alone keeps the reader\'s country and place', async () => {
  for (const extra of [{ room: 'field', plot: 900 }, { country: 'DE' }, { country: 'DE', spot: { ...emptyPlace.spot } }]) {
    await mine(5);
    const link = await linkWith('Temperate', 3, extra, { place: true });
    assert.equal(await restoreM.restore(link, { from: 'link' }), true);
    assert.deepEqual(store.spot.peek(), SUN, JSON.stringify(extra));
    assert.deepEqual(store.country.peek(), { code: 'FR', source: 'chosen' }, JSON.stringify(extra));
    if (extra.room) assert.deepEqual([store.room.peek(), store.plot.peek()], ['field', 900], 'the link\'s room and plot win');
    assert.equal(restoreM.linkPlace?.peek() ?? null, null, 'no link-place notice');
  }
});

test('b1a Forget this location clears canopi-location, canopi-place and the palette\'s place', async () => {
  await mine(5);
  kept.set(PLACE_STORE, 'm=small&l=sun');
  kept.set(LOCATION_STORE, JSON.stringify({ lat: 37.39, lon: -5.98, source: 'geo' }));
  store.location.value = { lat: 37.39, lon: -5.98, source: 'geo', lookup: null };
  locationM.forget();
  await wait(0);
  assert.equal(kept.get(LOCATION_STORE), undefined, 'canopi-location goes');
  assert.equal(kept.get(PLACE_STORE), undefined, 'Forget left canopi-place');
  assert.deepEqual(store.spot.peek(), emptyPlace.spot);
  assert.deepEqual(store.soil.peek(), { from: 'map' });
  assert.equal(saved()?.place, '', 'the save\'s place goes');
  assert.equal(store.room.peek(), 'small', 'the room is the palette\'s, kept');
});

// Pre-push fix 3 (privacy.tool.device: "'Forget this location' clears your location and your spot
// answers"): on a held page (a link, a guide preset, after Start over) persist writes nothing, so the
// stored record kept its spot and soil answers and a country from the location, and "Open my saved
// palette instead" or a plain visit brought them back. A link's own country, the plants, the room and
// the plot stay.
test('b1a Forget this location on a held page: no stored record keeps the spot or soil answers or a location-derived country', async () => {
  for (const src of ['location', 'link']) {
    await mine(5);
    const fragment = 'v=5&c=temperate&m=small&z=40&a=&e=1';
    kept.set(STORE, saveRecord(fragment, '2026-11-16T00:00:00.000Z', src, 'ES', 'l=sun&s=own.acid.-'));
    opened(kept.get(STORE));
    persist.holdSave(true);
    kept.set(LOCATION_STORE, JSON.stringify({ lat: 37.39, lon: -5.98, source: 'geo' }));
    store.location.value = { lat: 37.39, lon: -5.98, source: 'geo', lookup: null };
    locationM.forget();
    await wait(0);
    const after = saved();
    assert.ok(after, `${src}: the save stays`);
    assert.equal(after.place, '', `${src}: the stored spot and soil answers go`);
    assert.equal(after.fragment, fragment, `${src}: the plants, room and plot stay`);
    if (src === 'location') { assert.equal(after.country, undefined, 'a country from the location goes'); assert.equal(after.src, null); }
    else assert.deepEqual([after.src, after.country], ['link', 'ES'], 'a link\'s own country stays');
    assert.ok(isHeld(), 'the page still holds the save');
    persist.holdSave(false);
  }
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

test('b1a bugs-1: a link the reader has not acted on keeps their save held across a reload and Back/Forward', async () => {
  const restoreAddress = fakeAddress();
  try {
    // A link that brings no place, and one whose place is the reader's own: neither shows the notice.
    for (const [extra, opts] of [[{}, {}], [{ country: 'FR', spot: { ...SUN } }, { place: true }]]) {
      await mine(5);
      await wait(0);
      const own = kept.get(STORE);
      assert.ok(own, 'the reader has a save');
      const link = await linkWith('Temperate', 3, extra, opts);
      assert.equal(await restoreM.restore(link, { from: 'link' }), true);
      await wait(0);
      assert.equal(restoreM.linkPlace.peek(), null, 'no link-place notice for this link');
      assert.equal(kept.get(STORE), own, 'opening the link wrote a save');
      // A reload: the page reads its own address back (history.state) and opens it as the save.
      const how = arrivalM.arrival({ hash: location.hash, search: '' }, saved(), null, history.state);
      assert.equal(how.kind, 'saved');
      assert.equal(await restoreM.restore(how.fragment, { from: 'saved', src: how.src, place: how.place, hold: how.hold }), true);
      await wait(0);
      assert.equal(kept.get(STORE), own, `a reload of a link the reader has not acted on wrote over their save (${JSON.stringify(extra)})`);
      // Back/Forward to the same entry.
      const act = arrivalM.hashAction(location.hash, history.state, null);
      assert.equal(act.kind, 'saved');
      assert.equal(await restoreM.restore(act.fragment, { from: 'saved', src: act.src, place: act.place, keep: true, hold: act.hold }), true);
      await wait(0);
      assert.equal(kept.get(STORE), own, `Back/Forward to a link the reader has not acted on wrote over their save (${JSON.stringify(extra)})`);
      // The reader acts: the save follows, and the address is no longer held.
      store.removeMember(store.members.peek()[0]);
      await wait(0);
      assert.notEqual(kept.get(STORE), own, 'a reader edit is saved');
      assert.equal(history.state?.hold, undefined, 'the address still says held after the reader acted');
    }
  } finally { restoreAddress(); }
});

test('b1a bugs-2: a link\'s country never stands for the reader\'s own (k=FR over a chosen KE)', async () => {
  const KE = { code: 'KE', source: 'chosen' };
  await mine(5);
  // As startMemory opens a link that brings a place: the reader's own country worked out first, then
  // the link's shown on the page.
  persist.quietly(() => { store.country.value = { code: 'FR', source: 'link' }; });
  const link = await linkWith('Temperate', 3, { country: 'FR', spot: { ...emptyPlace.spot, light: 'shade' } }, { place: true });
  assert.equal(await restoreM.restore(link, { from: 'link', country: KE }), true);
  assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
  store.removeMember(store.members.peek()[0]);
  await wait(0);
  assert.equal(saved()?.src, 'chosen', 'the held save took the link\'s country');
  assert.notEqual(saved()?.country, 'FR', 'the held save keeps the link\'s country beside it');
  draft.useOwnPlace();
  assert.deepEqual(store.country.peek(), KE, '"Use my own place" gave back the link\'s country');
  // A reader whose own country came from their location (kept beside the save): the held save keeps KE.
  await mine(5);
  persist.quietly(() => { store.country.value = { code: 'FR', source: 'link' }; });
  assert.equal(await restoreM.restore(link, { from: 'link', country: { code: 'KE', source: 'location' } }), true);
  store.removeMember(store.members.peek()[0]);
  await wait(0);
  assert.equal(saved()?.src, 'location', 'the held save took the link\'s country source');
  assert.equal(saved()?.country, 'KE', 'the held save took the link\'s country');
  // A link whose only difference is its country asks too.
  await mine(5);
  persist.quietly(() => { store.country.value = { code: 'DE', source: 'link' }; });
  const deLink = await linkWith('Temperate', 3, { country: 'DE', spot: { ...SUN } }, { place: true });
  assert.equal(await restoreM.restore(deLink, { from: 'link', country: { code: 'FR', source: 'chosen' } }), true);
  assert.ok(restoreM.linkPlace.peek(), 'a link that differs only by its country gave no notice: the link\'s country was taken as the reader\'s');
});

test('b1a bugs-3: a link\'s cell is compared with the reader\'s own cell, and "Use my own place" brings their location back', async () => {
  const before = instantStep();
  try {
    const PARIS = { lat: 48.85, lon: 2.35, source: 'geo' };
    // An o-only link (no spot answer) over a reader whose answers are all unsure.
    await mine(5);
    persist.quietly(() => { store.spot.value = { ...emptyPlace.spot }; });
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
    persist.quietly(() => { store.spot.value = { ...emptyPlace.spot }; });
    kept.set(LOCATION_STORE, JSON.stringify({ lat: 37.38, lon: -5.97, source: 'search' }));
    assert.equal(await restoreM.restore(seville, { from: 'link' }), true);
    assert.equal(restoreM.linkPlace.peek(), null, 'a link of the reader\'s own cell asked');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a bugs-4: a room or plot change while the notice waits seeds canopi-place with the reader\'s own spot, never the link\'s', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    store.room.value = 'large';
    await wait(0);
    assert.match(kept.get(PLACE_STORE) ?? '', /m=large/, 'the room answer is the reader\'s');
    assert.doesNotMatch(kept.get(PLACE_STORE) ?? '', /l=shade/, 'the link\'s spot answers seeded canopi-place (room)');
    assert.match(kept.get(PLACE_STORE) ?? '', /l=sun/, 'the reader\'s own spot stays in the seed');
    store.plot.value = 120;
    await wait(0);
    assert.match(kept.get(PLACE_STORE) ?? '', /z=120/);
    assert.doesNotMatch(kept.get(PLACE_STORE) ?? '', /l=shade/, 'the link\'s spot answers seeded canopi-place (plot)');
    assert.ok(restoreM.linkPlace.peek(), 'a room change is no answer to the notice');
    // A spot answer the reader gives makes the shown place theirs: then it seeds.
    store.spot.value = { ...store.spot.peek(), water: 'dry' };
    await wait(0);
    assert.match(kept.get(PLACE_STORE) ?? '', /l=shade/, 'a spot answer the reader gives seeds the place shown');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});

test('b1a bugs-5: Forget on Place (back from the palette) also clears the set-aside palette\'s place', async () => {
  await mine(5);
  await wait(0);
  assert.equal(saved()?.place, 'l=sun');
  draft.backToPlace();
  locationM.forget();
  await wait(0);
  assert.equal(saved()?.place, '', 'the set-aside palette kept its place in the save');
  draft.showPalette();
  await wait(0);
  assert.deepEqual(store.spot.peek(), emptyPlace.spot, 'the set-aside palette kept its place: the spot answers came back');
  assert.deepEqual(store.soil.peek(), { from: 'map' });
  assert.equal(store.room.peek(), 'small', 'the room stays');
  assert.equal(saved()?.place, '', 'the palette kept its place in the save after "Show my palette"');
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
  const read = decodeLink(saved().fragment, k);
  assert.deepEqual([...read.state.members].sort(), [only.id, both.id].sort(), 'both read back from the save');
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
  await store.loadPool('Subtropical');
  persist.quietly(() => { store.climate.value = 'Subtropical'; });
  store.location.value = null;
  assert.ok(store.pool.peek()?.length, 'the borrowed list is read');
  assert.deepEqual(store.offerPool.peek(), [], 'the borrowed list is offered without a place');
  persist.quietly(() => { store.climate.value = 'Temperate'; });
  assert.ok(store.offerPool.peek()?.length, 'a curated list is offered');
});

// A reload while a link's place waits: the page forgets its location (the address and history.state
// stay) and opens its own address again, asked against the reader's own place. arrival()'s answer.
// fresh: run once the address is read (the new page's own state).
async function reloadAsking(fresh = () => {}) {
  store.location.value = null;
  const how = arrivalM.arrival({ hash: location.hash, search: '' }, saved(), null, history.state);
  assert.equal(how.ask, true);
  fresh();
  const ask = { spot: { ...SUN }, soil: { from: 'map' }, country: { code: 'FR', source: 'chosen' }, location: null };
  assert.equal(await restoreM.restore(how.fragment, { from: 'saved', src: how.src, place: how.place, ask, hold: how.hold }), true);
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
    const seed = kept.get(PLACE_STORE) ?? '';
    const light = store.spot.peek().light;
    assert.ok(seed === '' || seed.includes(`l=${light}`), `half-way: the page shows l=${light} but canopi-place holds ${seed}`);
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
  const plan = (how, over = {}) => arrivalM.arrivalPlan(how, { saved: null, pref: null, guess: () => null, seed: null, cell, ...over });
  // A link that brings a place (k=FR, l=shade, o=): the link's country shown, the reader's own (KE) kept.
  const shade = { ...emptyPlace.spot, light: 'shade' };
  const link = await linkWith('Temperate', 3, { country: 'FR', spot: shade }, { origin: { lat: 37.39, lon: -5.98 }, place: true });
  const p = plan({ kind: 'link', fragment: link }, { pref: 'KE', guess: () => 'DE' });
  assert.deepEqual(p.country, { code: 'FR', source: 'link' });
  assert.deepEqual(p.own, { code: 'KE', source: 'chosen' }, 'the reader\'s own country');
  assert.deepEqual(p.linkCell, linkOrigin(link));
  assert.ok(p.linkCell, 'the link\'s cell');
  assert.equal(p.ask, undefined);
  assert.equal(reads, 0, 'canopi-location read on a plain link arrival');
  // k alone brings no place: the reader's own country (else the guess).
  const kOnly = await linkWith('Temperate', 3, { country: 'DE' }, { place: true });
  assert.deepEqual(plan({ kind: 'link', fragment: kOnly }, { pref: 'KE' }).country, { code: 'KE', source: 'chosen' });
  assert.deepEqual(plan({ kind: 'link', fragment: kOnly }, { guess: () => 'ES' }).country, { code: 'ES', source: 'guess' });
  // The save with a location's country beside it.
  const f = await linkWith('Temperate', 2);
  const rec = { fragment: f, place: 'l=sun', at: '2026-11-14', src: 'location', country: 'KE' };
  const s = plan({ kind: 'saved', fragment: f, at: rec.at, src: 'location', place: rec.place }, { saved: rec, guess: () => 'DE' });
  assert.deepEqual(s.country, { code: 'KE', source: 'location' });
  assert.equal(s.linkCell, null);
  assert.equal(s.ask, undefined);
  // A reload while a link's place waited (history.state ask, the link's cell in pl): the link's cell,
  // and the ask against the reader's own place (the held save's), country and own cell.
  const pl = encodePlace({ country: 'FR', spot: shade, soil: { from: 'map' } }, { lat: 37.35, lon: -5.95 });
  const r = plan({ kind: 'saved', fragment: link, at: '', src: 'link', place: pl, ask: true }, { saved: rec, pref: 'KE', seed: 'w=dry' });
  assert.deepEqual(r.linkCell, linkOrigin(pl));
  assert.ok(r.linkCell, 'the link\'s cell from the tab\'s place');
  assert.equal(reads, 1, 'the reader\'s own cell read once for the ask');
  assert.deepEqual(r.ask, { spot: { ...emptyPlace.spot, light: 'sun' }, soil: { from: 'map' }, country: { code: 'KE', source: 'chosen' }, location: PARIS });
  // No save: the seed stands for the reader's own place.
  const n = plan({ kind: 'saved', fragment: link, at: '', src: 'link', place: pl, ask: true }, { pref: 'KE', seed: 'w=dry' });
  assert.equal(n.ask.spot.water, 'dry');
});

// perf-1 (b2's review, confirmed): the browser's guess walks every country's time zones (about 0.4 s,
// 1.6 s on a slow phone) before the database opens; it runs only when no link, choice or save names one.
test('b1a perf-1: the browser\'s country guess is worked out only when no link, choice or save names a country', async () => {
  let calls = 0;
  const guess = () => { calls++; return 'US'; };
  const { countryAtStart } = arrivalM;
  assert.deepEqual(countryAtStart({ link: 'fr', pref: null, saved: null, guess }), { code: 'FR', source: 'link' });
  assert.deepEqual(countryAtStart({ link: null, pref: 'DE', saved: null, guess }), { code: 'DE', source: 'chosen' });
  assert.deepEqual(countryAtStart({ link: null, pref: '-', saved: null, guess }), { code: null, source: 'chosen' });
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: 'es', savedFrom: 'location', guess }), { code: 'ES', source: 'location' });
  assert.equal(calls, 0, 'the guess was worked out although a country was named');
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: null, guess }), { code: 'US', source: 'guess' });
  assert.equal(calls, 1);
  // Through arrivalPlan: a saved country (a location's, kept beside the save) needs no guess, also
  // with a link that brings a place (its own country and the reader's own both worked out).
  calls = 0;
  const f = await linkWith('Temperate', 2);
  const rec = { fragment: f, place: '', at: '2026-11-14', src: 'location', country: 'KE' };
  const p = arrivalM.arrivalPlan({ kind: 'saved', fragment: f, at: rec.at, src: 'location', place: '' }, { saved: rec, pref: null, guess, seed: null, cell: () => null });
  assert.deepEqual(p.country, { code: 'KE', source: 'location' });
  const link = await linkWith('Temperate', 3, { country: 'FR', spot: { ...emptyPlace.spot, light: 'shade' } }, { place: true });
  arrivalM.arrivalPlan({ kind: 'link', fragment: link }, { saved: null, pref: 'KE', guess, seed: null, cell: () => null });
  assert.equal(calls, 0, 'the guess was worked out although a country was saved or chosen');
  // No country anywhere: worked out once, though both the link's and the reader's own are decided.
  arrivalM.arrivalPlan({ kind: 'link', fragment: link }, { saved: null, pref: null, guess, seed: null, cell: () => null });
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
    draft.cardsLatched.value = true;
    draft.startOver();
    assert.equal(draft.cardsLatched.peek(), false, 'the cards stay latched open after Start over');
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
    const link = await linkWith('Temperate', 3, { country: 'FR', spot: { ...emptyPlace.spot, light: 'shade' } }, { place: true });
    const how = arrivalM.arrival({ hash: `#${link}`, search: '' }, saved(), null);
    const plan = arrivalM.arrivalPlan(how, { saved: saved(), pref: 'KE', guess: () => null, seed: null, cell: () => null });
    arrivalM.openWith({ how, plan, saved: saved(), seed: null, keptLocation: null });
    await until(() => restoreM.linkPlace.peek());
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.notEqual(saved()?.country, 'FR', 'the held save took the link\'s country');
    assert.equal(saved()?.src, 'chosen', 'the held save took the link\'s country source');
    draft.useOwnPlace();
    assert.deepEqual(store.country.peek(), { code: 'KE', source: 'chosen' }, '"Use my own place" did not give the reader\'s own country');
    // (b) A reload while a link's place waited, with a location kept on this device.
    await mine(5);
    await wait(0);
    store.location.value = null;
    settled.length = 0;
    const pl = encodePlace({ country: 'FR', spot: { ...emptyPlace.spot, light: 'shade' }, soil: { from: 'map' } }, { lat: 37.35, lon: -5.95 });
    const f = await linkWith('Temperate', 3);
    const reload = arrivalM.arrival({ hash: `#${f}`, search: '' }, saved(), null, { ct: f, src: 'link', pl, ask: 1 });
    assert.equal(reload.ask, true);
    const PARIS = JSON.stringify({ lat: 48.85, lon: 2.35, source: 'geo' });
    const plan2 = arrivalM.arrivalPlan(reload, { saved: saved(), pref: null, guess: () => null, seed: null, cell: () => restoreM.ownCell(PARIS) });
    arrivalM.openWith({ how: reload, plan: plan2, saved: saved(), seed: null, keptLocation: PARIS });
    await until(() => store.location.peek()?.source === 'link');
    await wait(20);
    assert.deepEqual(settled.filter((x) => x === 'saved'), [], 'the saved location was looked up over the link\'s cell');
    assert.equal(restoreM.locationAtStart.peek(), false, 'a location kept on this device that is not looked up holds the cards');
  } finally { restoreAddress(); restoreM.provideLocationStep(before); store.location.value = null; persist.linkPlace.value = null; }
});

// ---- fix round 3: the save model (save-model design check 2026-11-15, owner decisions 2026-11-15) ----
// One flag, held: this page's palette is not the save. Every page starts held; a restore of the save, or
// a plant change that can be undone (Add, Remove, Swap, a suggestion placed), lets it go; Start over
// holds again. Not held, the save is the current palette; held, the save is left as it is. Each Undo
// puts back the held flag it saw and, held again, the save as it was then (unless another tab wrote).
// A palette's plant ids as the save reads them back.
const savedIds = async (zone = 'Temperate') => decodeLink(saved().fragment, { ...(await known(zone)), ...(await known('Temperate')) }).state.members;
// The fragment the save holds, as the page encodes the palette now.
const savedIsPalette = () => saved()?.fragment === persist.currentFragment();
// A page just opened over the reader's save R, with nothing of its own yet (held).
async function freshOver() {
  const pool = await mine(5);
  await wait(0);
  const R = kept.get(STORE);
  persist.holdSave(true);
  persist.quietly(() => { store.view.value = 'start'; store.climate.value = null; store.members.value = []; store.removed.value = []; store.guests.value = {}; });
  await wait(0);
  kept.set(STORE, R);
  opened(R);
  store.hideToast();
  return [pool, R];
}
const OTHER = saveRecord('v=5&c=tropical&m=unsure&a=&e=1', '2026-11-11T00:00:00.000Z', null);
const undo = async () => { const t = store.toast.peek(); assert.ok(t?.undo, 'an Undo is offered'); t.undo(); await wait(0); };

// Section 1, the walk.
test('save model walk 1: a reload of [A,B], B removed on the palette, B added again on Place: [A] then [A,B] saved; the add\'s Undo saves [A]', async () => {
  const pool = await mine(5);
  const [A, B] = [pool[0].id, pool[1].id];
  const link = encodeLink({ climate: 'Temperate', country: null, room: 'small', plot: null, period: '1991-2020', spot: null, soil: null, members: [A, B], removed: [], guests: [] }, await known('Temperate'));
  persist.holdSave(true);
  assert.equal(await restoreM.restore(link, { from: 'saved' }), true);
  await wait(0);
  assert.equal(isHeld(), false, 'a restore of the save owns it');
  store.removeMember(B);
  await wait(0);
  assert.deepEqual(await savedIds(), [A]);
  draft.backToPlace();
  store.addMembers([B]);
  await wait(0);
  assert.deepEqual(await savedIds(), [A, B], 'B added again on Place is not saved');
  await undo();
  assert.deepEqual(await savedIds(), [A], 'the add\'s Undo');
});
test('save model walk 2: C added on the palette, removed on Place: C is gone from the save', async () => {
  const pool = await mine(3);
  await wait(0);
  const C = pool[9].id;
  store.addMembers([C]);
  await wait(0);
  assert.ok((await savedIds()).includes(C));
  draft.backToPlace();
  store.removeMember(C);
  await wait(0);
  assert.ok(!(await savedIds()).includes(C), 'C removed on Place is still saved');
});
test('save model walk 3: Start over removes the save and holds; plants added again are saved; that add\'s Undo removes the save and holds', async () => {
  await mine(2);
  await wait(0);
  const ids = store.members.peek().slice();
  draft.startOver();
  await wait(0);
  assert.equal(kept.get(STORE), undefined, 'Start over removes the save');
  assert.equal(isHeld(), true, 'and holds');
  store.addMembers(ids);
  await wait(0);
  assert.ok(saved(), 'the plants added again are not saved');
  assert.deepEqual(await savedIds(), ids);
  await undo();
  assert.equal(kept.get(STORE), undefined, 'the add\'s Undo leaves a save');
  assert.equal(isHeld(), true);
});
test('save model walk 4 (r3-1): a guide preset over R, Start over, Undo: R is untouched throughout and still offered', async () => {
  const [pool, R] = await freshOver();
  await restoreM.applyPreset('Temperate', pool[3].canonical_name);
  await wait(0);
  assert.equal(kept.get(STORE), R, 'the preset touched R');
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(R).fragment, 'R is offered');
  draft.startOver();
  await wait(0);
  assert.equal(kept.get(STORE), R, 'Start over after a preset deleted R');
  await undo();
  assert.deepEqual(store.members.peek(), [pool[3].id], 'Undo brings the guide\'s plant back');
  assert.equal(kept.get(STORE), R, 'after Undo R is not as it was');
  assert.equal(isHeld(), true, 'still held');
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(R).fragment, 'R is still offered');
});
test('save model walk 5: a link over R, Start over, Undo: R is untouched throughout', async () => {
  const [, R] = await freshOver();
  assert.equal(await restoreM.restore(await linkWith('Temperate', 4), { from: 'link' }), true);
  await wait(0);
  assert.equal(kept.get(STORE), R, 'the link touched R');
  draft.startOver();
  await wait(0);
  assert.equal(kept.get(STORE), R, 'Start over on a link page lost R');
  await undo();
  assert.equal(store.members.peek().length, 4, 'Undo brings the link\'s palette back');
  assert.equal(kept.get(STORE), R, 'after Undo R is not in storage');
});
test('save model walk 6 (r3-2): Undo of Start over on Place saves the palette again, and the next change on Place is saved', async () => {
  const pool = await mine(5);
  await wait(0);
  draft.backToPlace();
  draft.startOver();
  await wait(0);
  await undo();
  assert.equal(store.view.peek(), 'start', 'Undo stays on Place');
  assert.equal(isHeld(), false, 'the page owns its save again');
  assert.ok(savedIsPalette(), 'the palette is saved again');
  // Every plant removed on Place (Place's plants then match a stale baseline of none): saved so.
  for (const id of store.members.peek()) store.removeMember(id);
  await wait(0);
  assert.ok(saved(), 'the emptied palette is not saved');
  assert.deepEqual(await savedIds(), [], 'the plants removed on Place after the Undo are still saved');
  assert.ok(savedIsPalette());
  void pool;
});
test('save model walk 7 (owner 2026-11-15, 1): another card on Place is saved at once, "Show my palette" offers no Undo, the old card gives it back; on a held page R stays', async () => {
  await mine(5);
  await wait(0);
  const members = store.members.peek().slice();
  draft.backToPlace();
  draft.chooseClimate('Mediterranean');
  await wait(0);
  assert.match(saved()?.fragment ?? '', /(^|&)c=mediterranean(&|$)/, 'the card is not saved at once');
  draft.showPalette();
  assert.equal(store.toast.peek(), null, '"Show my palette" offers an Undo');
  assert.deepEqual(store.members.peek(), members, 'every plant kept');
  draft.backToPlace();
  draft.chooseClimate('Temperate');
  await wait(0);
  assert.match(saved()?.fragment ?? '', /(^|&)c=temperate(&|$)/, 'the old card gives it back');
  // Held: a card applies to the page and leaves R.
  const [, R] = await freshOver();
  assert.equal(await restoreM.restore(await linkWith('Temperate', 3), { from: 'link' }), true);
  draft.backToPlace();
  draft.chooseClimate('Mediterranean');
  await wait(0);
  assert.equal(kept.get(STORE), R, 'a card on a held page touched R');
});
test('save model walk 8: an add on Place, then "Show my palette": the add\'s Undo is still offered and works', async () => {
  const pool = await mine(3);
  await wait(0);
  draft.backToPlace();
  store.addMembers([pool[8].id]);
  draft.showPalette();
  await undo();
  assert.ok(!store.members.peek().includes(pool[8].id));
  assert.ok(!(await savedIds()).includes(pool[8].id), 'the Undo is saved');
});
test('save model walk 9: a link pasted on Place holds: the reader\'s save P stays and is offered; the first plant change replaces P, its Undo writes P back exactly and holds', async () => {
  const pool = await mine(5);
  await wait(0);
  const P = kept.get(STORE);
  draft.backToPlace();
  assert.equal(await restoreM.restore(await linkWith('Temperate', 3), { from: 'link' }), true);
  await wait(0);
  assert.equal(kept.get(STORE), P, 'the link touched P');
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(P).fragment, 'P is not offered');
  store.addMembers([pool[20].id]);
  await wait(0);
  assert.notEqual(kept.get(STORE), P, 'the plant change is not saved');
  assert.equal(restoreM.savedInstead.peek(), null, 'P still offered after it was replaced');
  await undo();
  assert.equal(kept.get(STORE), P, 'Undo did not write P back byte for byte');
  assert.equal(isHeld(), true, 'held again');
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(P).fragment, 'P offered again');
});
test('save model walk 10: a reload on Place: an owned page\'s address has no hold, a held page\'s has hold: 1', async () => {
  const restoreAddress = fakeAddress();
  try {
    await mine(5);
    await wait(0);
    draft.backToPlace();
    await wait(0);
    assert.ok(history.state?.ct, 'the address keeps the palette on Place');
    assert.equal(history.state?.hold, undefined, 'an owned page\'s address is held');
    await freshOver();
    assert.equal(await restoreM.restore(await linkWith('Temperate', 3), { from: 'link' }), true);
    draft.backToPlace();
    await wait(0);
    assert.equal(history.state?.hold, 1, 'a held page\'s address lost its hold');
  } finally { restoreAddress(); }
});

// Section 4, the additions.
test('save model: place answers, "Use it" and "Use my own place" on a held page write nothing (owner 2026-11-15, 2)', async () => {
  const answers = { 'place answers': () => { store.room.value = 'large'; store.plot.value = 40; store.spot.value = { ...store.spot.peek(), water: 'dry' }; draft.chooseCountry('KE'); }, '"Use it"': () => draft.useLinkPlace(), '"Use my own place"': () => draft.useOwnPlace() };
  for (const [name, act] of Object.entries(answers)) {
    const before = await arriveWithPlace();
    try {
      const R = kept.get(STORE);
      await act();
      await wait(0);
      assert.equal(kept.get(STORE), R, `${name} on a held page replaced R`);
    } finally { restoreM.provideLocationStep(before); store.location.value = null; }
  }
});
test('save model link place (b): "Use it" keeps the save R; the link\'s place l=shade reaches the save with the first plant change', async () => {
  const before = await arriveWithPlace();
  try {
    const R = kept.get(STORE);
    await draft.useLinkPlace();
    await wait(0);
    assert.equal(restoreM.linkPlace.peek(), null);
    assert.equal(kept.get(STORE), R, '"Use it" replaced the save');
    const loc = locationM.readLocation(kept.get(LOCATION_STORE) ?? null);
    assert.ok(loc && Math.abs(loc.lat - 37.35) < 0.051 && Math.abs(loc.lon - -5.95) < 0.051, `the link's cell in canopi-location (${kept.get(LOCATION_STORE)})`);
    assert.notEqual(loc.source, 'link', 'kept as the reader\'s own');
    assert.equal(kept.get(COUNTRY_STORE), 'ES', 'the link\'s country kept');
    assert.match(kept.get(PLACE_STORE) ?? '', /l=shade/, 'and it seeds the next palette');
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.equal(saved()?.place, 'l=shade', 'the plant change saves the link\'s place');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});
test('save model: "Show my palette" on a guide preset leaves R and its offer', async () => {
  const [pool, R] = await freshOver();
  await restoreM.applyPreset('Temperate', pool[3].canonical_name);
  draft.showPalette();
  await wait(0);
  assert.equal(kept.get(STORE), R, '"Show my palette" replaced R');
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(R).fragment, 'the offer went');
});
test('save model (owner 2026-11-15, 3): "Open my saved palette instead" is offered on every held page whose save differs, through Place answers, and goes once the save is replaced', async () => {
  const [pool, R] = await freshOver();
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(R).fragment, 'a fresh page over R offers it');
  await restoreM.applyPreset('Temperate', pool[3].canonical_name);
  store.room.value = 'large';
  draft.chooseCountry('KE');
  await wait(0);
  assert.ok(restoreM.savedInstead.peek(), 'gone after Place answers');
  store.addMembers([pool[4].id]);
  await wait(0);
  assert.equal(restoreM.savedInstead.peek(), null, 'offered after the save was replaced');
  await undo();
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(R).fragment, 'not offered again after Undo');
  // A newer link over the save: "Back to mine" through a country and a card; it opens R.
  const [, R2] = await freshOver();
  assert.equal(await restoreM.restore('v=6&c=temperate&a=abcdef&e=1', { from: 'link' }), false);
  draft.chooseCountry('KE');
  draft.chooseClimate('Mediterranean');
  await wait(0);
  assert.ok(restoreM.savedInstead.peek(), '"Back to mine" gone after Place answers');
  assert.equal(kept.get(STORE), R2, 'the save is untouched');
  await draft.openSavedInstead();
  await wait(0);
  assert.equal(isHeld(), false, 'the save opened owns it');
  assert.equal(restoreM.savedInstead.peek(), null);
  // A held page showing the save's own palette offers nothing.
  const [, R3] = await freshOver();
  assert.equal(await restoreM.restore(readRecord(R3).fragment, { from: 'link' }), true);
  await wait(0);
  assert.equal(restoreM.savedInstead.peek(), null, 'offered the palette already shown');
});
test('save model M1, M2, M3, R2-2: another tab\'s save is never lost by an Undo or Start over', async () => {
  // M1: a fresh Start, a card, another tab saves, a paste, Undo: the other tab's save is back.
  let [pool] = await freshOver();
  kept.delete(STORE);
  opened(null);
  draft.chooseClimate('Temperate');
  kept.set(STORE, OTHER);
  store.addMembers([pool[0].id]);
  await wait(0);
  await undo();
  assert.equal(kept.get(STORE), OTHER, 'M1');
  // M2: a guide preset, another tab saves, a paste, Undo: the newer save, not the one read at open.
  [pool] = await freshOver();
  await restoreM.applyPreset('Temperate', null);
  kept.set(STORE, OTHER);
  store.addMembers([pool[0].id]);
  await wait(0);
  await undo();
  assert.equal(kept.get(STORE), OTHER, 'M2');
  // M3: another tab saves, Start over leaves it.
  await mine(5);
  await wait(0);
  kept.set(STORE, OTHER);
  draft.startOver();
  await wait(0);
  assert.equal(kept.get(STORE), OTHER, 'M3');
  // R2-2: Start over, plants added, another tab saves, Undo back to the empty Start leaves it.
  pool = await mine(5);
  await wait(0);
  draft.startOver();
  store.addMembers([pool[1].id, pool[2].id]);
  await wait(0);
  kept.set(STORE, OTHER);
  await undo();
  assert.equal(kept.get(STORE), OTHER, 'R2-2');
});
// A source whose Mediterranean list arrives only when `open` is called (a card clicked before its list
// is read, as the usual first click is).
function slowMediterranean() {
  let open;
  const gate = new Promise((r) => { open = r; });
  const slow = Object.create(realSource);
  slow.pool = async (c) => { if (c === 'Mediterranean') await gate; return realSource.pool(c); };
  const { Mediterranean: _, ...rest } = store.pools.peek();
  store.pools.value = rest;
  store.setSource(slow);
  return open;
}
test('save model r3-3: a card clicked before its list is read, a plant removed, the list arrives: the Undo stays, a link pasted after the click opens, and the save has one g=', async () => {
  const pool = await mine(5);
  const med = await realSource.pool('Mediterranean');
  const inMed = new Set(med.map((t) => t.id));
  const both = pool.filter((t) => inMed.has(t.id)).slice(0, 2).map((t) => t.id);
  const only = pool.find((t) => !inMed.has(t.id)).id;
  persist.quietly(() => { store.members.value = [...both, only]; });
  await wait(0);
  let open = slowMediterranean();
  draft.chooseClimate('Mediterranean');
  const reading = store.loadPool('Mediterranean');
  store.removeMember(both[1]);
  open();
  await reading;
  await wait(0);
  assert.ok(store.toast.peek()?.undo, 'the list arriving ended the Remove\'s Undo');
  const g = new URLSearchParams(saved().fragment).getAll('g');
  assert.equal(g.length, 1, 'the save carries g= for one list');
  const read = decodeLink(saved().fragment, { Mediterranean: med.map((t) => t.id), Temperate: pool.map((t) => t.id) });
  assert.deepEqual(read.state.guests.map((x) => x.id), [only], 'the save names only the missing plant as a guest');
  // A link pasted right after a card click opens once the list arrives.
  persist.quietly(() => { store.climate.value = 'Temperate'; store.guests.value = {}; });
  open = slowMediterranean();
  draft.chooseClimate('Mediterranean');
  const later = store.loadPool('Mediterranean');
  const opening = restoreM.restore(await linkWith('Temperate', 2), { from: 'link' });
  open();
  await later;
  assert.equal(await opening, true, 'the link pasted after the click did not open');
  store.setSource(realSource);
  persist.quietly(() => { store.climate.value = 'Temperate'; store.guests.value = {}; });
});


// ---- fix round 4: the actions outside the save model, and flags read as each other ----
const waitM = await import('../src/islands/consortium/state/suggest-wait.ts');
const lookupsM = await import('../src/islands/consortium/state/lookups.ts');
// The waiting Suggest's effects, as startMemory sets them up on the page.
waitM.watchSuggest();
// The suggestion's chunk read, so a Suggest acts once its lists are read.
async function suggestReady() {
  store.wantSuggest();
  for (let i = 0; i < 400 && !store.suggestRule.peek(); i++) await wait(5);
  assert.ok(store.suggestRule.peek(), 'the suggestion\'s chunk did not load');
}
// A press of "Suggest plants" that waits for a location lookup, then runs when it settles (s-1).
async function waitedSuggest() {
  lookupsM.lookups.value = 1;
  waitM.requestSuggest();
  assert.equal(waitM.pendingSuggest.peek(), true, 'the press waits for the lookup');
  lookupsM.lookups.value = 0;
  await wait(0);
  await wait(0);
}

test('fix round 4 s-1: a waited suggestion over a held R offers its Undo; the Undo writes R back byte for byte and holds', async () => {
  const [pool, R] = await freshOver();
  await suggestReady();
  await restoreM.applyPreset('Temperate', pool[3].canonical_name);
  await wait(0);
  await waitedSuggest();
  assert.ok(store.members.peek().length > 1, 'the waited suggestion was not placed');
  assert.notEqual(kept.get(STORE), R, 'the suggestion is not saved');
  await undo();
  assert.deepEqual(store.members.peek(), [pool[3].id], 'Undo brings the guide\'s plant back');
  assert.equal(kept.get(STORE), R, 'Undo did not write R back byte for byte');
  assert.equal(isHeld(), true, 'held again');
});
test('fix round 4 s-2: NextStep\'s Suggest on an empty held palette (a guide preset whose plant is missing) offers its Undo, which writes R back and holds', async () => {
  const [, R] = await freshOver();
  await suggestReady();
  await restoreM.applyPreset('Temperate', 'Nonexistent plantus');
  draft.showPalette();
  await wait(0);
  assert.deepEqual(store.members.peek(), []);
  // NextStep's button: the one press every Suggest goes through.
  assert.match(readFileSync(new URL('../src/islands/consortium/views/palette/NextStep.tsx', import.meta.url), 'utf8'), /onClick=\{\(\) => requestSuggest\(\)\}/);
  waitM.requestSuggest();
  await wait(0);
  assert.ok(store.members.peek().length, 'no suggestion placed');
  assert.notEqual(kept.get(STORE), R, 'the suggestion is not saved');
  await undo();
  assert.deepEqual(store.members.peek(), []);
  assert.equal(kept.get(STORE), R, 'Undo did not write R back byte for byte');
  assert.equal(isHeld(), true, 'held again');
});
test('fix round 4 s-3: a plant added while a link\'s place question is open: a reload asks again, and the page still owns its save', async () => {
  const restoreAddress = fakeAddress();
  let before = null;
  try {
    before = await arriveWithPlace();
    const med = await realSource.pool('Mediterranean');
    store.addMembers([med[10].id]);
    await wait(0);
    assert.equal(isHeld(), false, 'the plant change owns the save');
    assert.equal(history.state?.ask, 1, 'the address no longer says the place question waits');
    assert.equal(history.state?.hold, undefined, 'an owned page\'s address says hold');
    assert.equal(arrivalM.hashAction(location.hash, { ...history.state, ct: 'x' }, null).kind, 'link');
    assert.equal(arrivalM.hashAction(location.hash, history.state, null).hold, undefined, 'ask read as hold on Back/Forward');
    const how = await reloadAsking(() => persist.holdSave(true)); // a reload starts held
    assert.equal(how.hold, undefined, 'ask read as hold on arrival');
    await wait(0);
    assert.ok(restoreM.linkPlace.peek(), 'the place question is asked again');
    assert.equal(isHeld(), false, 'the reload held a page that owns its save');
  } finally { restoreAddress(); restoreM.provideLocationStep(before); store.location.value = null; }
});
// Pre-push fix 5: a reload (or Back/Forward) of a page that owned its save never overwrites a save
// another tab wrote since (or removed): history.state.ct alone said "the save", the restore owned it
// and persist wrote it over the other tab's newer palette, silently. Now the page opens held when
// storage no longer holds its palette, so "Open my saved palette instead" offers the stored one.
test('pre-push fix 5: a reload of an owned page whose save another tab replaced (or removed) opens held; the stored save stays, and "Open my saved palette instead" names it', async () => {
  const restoreAddress = fakeAddress();
  try {
    for (const other of ['replaced', 'removed']) {
      await mine(5);
      await wait(0);
      assert.equal(isHeld(), false, 'the page owns its save');
      const own = history.state;
      assert.ok(own?.ct && own.hold === undefined, 'the address marks the owned page');
      // Storage still holds this page's palette: a reload stays owned (s-3).
      assert.equal(arrivalM.arrival({ hash: location.hash, search: '' }, saved(), null, history.state).hold, undefined, 'storage unchanged: owned');
      assert.equal(arrivalM.hashAction(location.hash, history.state, null, false).hold, undefined, 'Back/Forward, storage unchanged: owned');
      // Another tab saves P2 (or Start over there removes the save).
      const p2 = saveRecord(await linkWith('Tropical', 3), '2026-11-16T10:00:00.000Z', null, null, '');
      if (other === 'replaced') kept.set(STORE, p2); else kept.delete(STORE);
      assert.equal(arrivalM.hashAction(location.hash, history.state, null, true).hold, true, `Back/Forward, save ${other}: held`);
      // The reload: every page starts held, and lastSave is what storage holds now (startMemory).
      persist.holdSave(true);
      opened(kept.get(STORE) ?? null);
      const how = arrivalM.arrival({ hash: location.hash, search: '' }, saved(), null, history.state);
      assert.equal(how.kind, 'saved');
      assert.equal(how.hold, true, `save ${other}: the reload opens held`);
      assert.equal(await restoreM.restore(how.fragment, { from: 'saved', src: how.src, place: how.place, hold: how.hold }), true);
      await wait(0);
      assert.equal(isHeld(), true, 'held after the restore');
      assert.equal(kept.get(STORE), other === 'replaced' ? p2 : undefined, `the other tab's save (${other}) is left as it is`);
      assert.equal(persist.savedInstead.peek()?.fragment ?? null, other === 'replaced' ? readRecord(p2).fragment : null, '"Open my saved palette instead" names the stored palette');
      persist.holdSave(false);
    }
  } finally { restoreAddress(); }
});
// Second-round review 1: Forget on a held page scrubs the stored record, which may be another tab's
// save; adopting it as this page's lastSave made B's save look like A's own, so storageMoved and
// putSave's guard stopped protecting it (Back to A's owned entry, or an open toast's Undo, wrote over it).
test('second-round review 1: Forget never makes another tab\'s save look like this page\'s', async () => {
  await mine(5);
  await wait(0);
  const p1 = kept.get(STORE);
  assert.equal(saveM.lastSave.peek(), p1, 'the page owns P1');
  persist.holdSave(true); // a pasted link's entry: held
  const sb = saveRecord(await linkWith('Tropical', 3), '2026-11-16T10:00:00.000Z', null, null, 'l=shade');
  kept.set(STORE, sb); // tab B saves
  locationM.forget();
  await wait(0);
  assert.equal(saved()?.place, '', 'B\'s stored record loses the forgotten answers');
  assert.notEqual(saveM.lastSave.peek(), kept.get(STORE), 'storage still differs from what this page last wrote');
  saveM.putSave(p1); // an Undo of A's earlier action
  assert.equal(readRecord(kept.get(STORE))?.fragment, readRecord(sb).fragment, 'B\'s palette is never written over');
  persist.holdSave(false);
});
test('fix round 4 s-4: "Search all plants" on a page with 6 plants opens the search and keeps every plant saved', async () => {
  await mine(6);
  await wait(0);
  const ids = store.members.peek().slice();
  draft.startEmpty();
  await wait(0);
  try {
    assert.equal(store.sheet.peek()?.kind, 'search', 'the search is not open');
    assert.deepEqual(store.members.peek(), ids, '"Search all plants" removed the reader\'s plants');
    assert.deepEqual(await savedIds(), ids, 'the save lost the reader\'s plants');
  } finally { store.closeSheet(); }
  // With no plant, it starts the empty palette with the search.
  persist.quietly(() => { store.members.value = []; store.view.value = 'start'; });
  draft.startEmpty();
  try {
    assert.equal(store.view.peek(), 'matrix');
    assert.equal(store.sheet.peek()?.kind, 'search');
  } finally { store.closeSheet(); }
});
test('fix round 4 s-5: "Open my saved palette instead" offers and opens what storage holds (another tab\'s T), and the next edit never writes this page\'s stale palette over it', async () => {
  const [pool] = await freshOver();
  assert.equal(await restoreM.restore(await linkWith('Temperate', 3), { from: 'link' }), true);
  await wait(0);
  store.addMembers([pool[20].id]);
  await wait(0);
  const LX = kept.get(STORE);
  assert.equal(isHeld(), false);
  const T = saveRecord(await linkWith('Temperate', 7), '2026-11-15T00:00:00.000Z', null);
  kept.set(STORE, T); // another tab saves T
  await undo();
  assert.equal(isHeld(), true);
  assert.equal(kept.get(STORE), T, 'the Undo wrote over the other tab\'s T');
  assert.equal(restoreM.savedInstead.peek()?.fragment, readRecord(T).fragment, 'the offer names this page\'s stale palette, not what storage holds');
  await draft.openSavedInstead();
  await wait(0);
  assert.equal(store.members.peek().length, 7, 'the offer did not open T');
  store.removeMember(store.members.peek()[0]);
  await wait(0);
  assert.notEqual(kept.get(STORE), LX, 'the next edit wrote the stale palette over T');
  assert.equal((await savedIds()).length, 6);
});

// The invariants over random runs of the reader's moves:
// - every plant change that lets the save go offers its own Undo;
// - not held, the save is the palette as the page encodes it now (or what another tab wrote since the
//   page's last write);
// - held, the save is what it was when the page became held (or what another tab wrote since);
// - an Undo puts back the held flag the undone action saw and, back to held, the save that action saw
//   (unless another tab wrote since this page's last write);
// - becoming held otherwise never writes the save, but Start over from an owned page removes it;
// - "Search all plants" never removes a plant.
test('save model invariants over random sequences: the save, the flag and every Undo', async () => {
  let seed = 20261115;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  await store.loadPool('Mediterranean');
  await suggestReady();
  const step0 = instantStep();
  const raf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0;
  let placedWaits = 0;
  try {
    for (let run = 0; run < 8; run++) {
      const [pool, R] = run % 2 ? await freshOver() : [await mine(4), null];
      await wait(0);
      if (R) await restoreM.applyPreset('Temperate', pool[run].canonical_name);
      let heldText = kept.get(STORE) ?? null, wasHeld = isHeld(), otherPending = false;
      const PLANT_MOVES = ['add', 'paste', 'remove', 'swap', 'suggest', 'suggestWait', 'nextSuggest'];
      // The save mark each offered Undo saw, by toast id.
      const marks = new Map();
      const log = [];
      const suggestNow = () => { if (store.climate.peek() && store.pool.peek()) { waitM.requestSuggest(); waitM.dropSuggest(); } };
      const moves = {
        add: () => store.addMembers([pick(pool.slice(0, 40)).id]),
        paste: () => store.addMembers([pick(pool.slice(0, 60)).id, pick(pool.slice(0, 60)).id, pick(pool.slice(60, 90)).id]),
        remove: () => { const m = store.members.peek(); if (m.length) store.removeMember(pick(m)); },
        swap: () => { const m = store.members.peek(); const n = pick(pool.slice(40, 80)).id; if (m.length && !m.includes(n)) store.swapMember(pick(m), n); },
        suggest: suggestNow,
        suggestWait: async () => { if (store.climate.peek() && store.pool.peek()) { await waitedSuggest(); waitM.dropSuggest(); } },
        nextSuggest: () => { if (!store.members.peek().length) suggestNow(); },
        search: () => { draft.startEmpty(); store.closeSheet(); },
        place: () => draft.backToPlace(),
        show: () => { if (store.climate.peek()) draft.showPalette(); },
        // A card, and its list read (the save follows the palette once its list is read).
        card: async () => { const c = pick(['Temperate', 'Mediterranean']); draft.chooseClimate(c); await store.loadPool(c); },
        room: () => { store.room.value = pick(['small', 'large', 'pots']); },
        over: () => draft.startOver(),
        undo: () => store.toast.peek()?.undo?.(),
        link: async () => { await restoreM.restore(await linkWith('Temperate', 2 + Math.floor(rnd() * 3)), { from: 'link' }); },
        placeLink: async () => { await restoreM.restore(await linkWith('Temperate', 3, { country: 'ES', spot: { ...emptyPlace.spot, light: 'shade' } }, { place: true }), { from: 'link' }); },
        useIt: async () => { await draft.useLinkPlace(); },
        useOwn: () => draft.useOwnPlace(),
        open: async () => { await draft.openSavedInstead(); },
        other: () => { kept.set(STORE, OTHER); if (isHeld()) heldText = OTHER; else otherPending = true; },
      };
      // Undo weighted up, so most Undos follow the action they undo.
      const names = [...Object.keys(moves), ...Array(8).fill('undo')];
      for (let step = 0; step < 50; step++) {
        const name = pick(names);
        log.push(name);
        const at = () => `(run ${run}: ${log.join(' ')})`;
        const pre = { text: kept.get(STORE) ?? null, held: isHeld() };
        const members = store.members.peek().slice();
        const toast = store.toast.peek();
        const undid = name === 'undo' && toast?.undo ? marks.get(toast.id) : null;
        await moves[name]();
        await wait(0);
        const now = isHeld(), text = kept.get(STORE) ?? null, shown = store.toast.peek();
        if (shown?.undo && shown.id !== toast?.id) marks.set(shown.id, pre);
        if (name === 'search' && members.length) assert.deepEqual(store.members.peek(), members, `"Search all plants" removed plants ${at()}`);
        if (wasHeld && !now && !['undo', 'open'].includes(name)) assert.ok(shown?.undo && shown.id !== toast?.id, `${name} let the save go with no Undo of its own ${at()}`);
        // Every plant change offers its own Undo, held or owned (review of f8c23a4, t-2).
        const changed = store.members.peek().join() !== members.join();
        if (PLANT_MOVES.includes(name) && changed) assert.ok(shown?.undo && shown.id !== toast?.id, `${name} changed the plants with no Undo of its own ${at()}`);
        if (name === 'suggestWait' && changed) placedWaits++;
        if (undid) {
          assert.equal(now, undid.held, `Undo did not put back the held flag ${at()}`);
          if (undid.held) assert.equal(text, pre.text === OTHER ? OTHER : undid.text, `Undo back to held did not write back the save the action saw ${at()}`);
        }
        if (now) {
          if (!wasHeld && !undid) assert.equal(text, name === 'over' && pre.text !== OTHER ? null : pre.text, `${name} made the page held and changed the save ${at()}`);
          if (wasHeld) assert.equal(text, heldText, `held, the save changed ${at()}`);
          heldText = text;
          otherPending = false;
        } else if (savedIsPalette()) otherPending = false;
        else assert.ok(otherPending && text === OTHER, `not held, the save is not the palette ${at()}`);
        wasHeld = now;
      }
    }
    // The waited suggestion is really placed in some runs, so its Undo is checked (t-1).
    assert.ok(placedWaits > 0, 'no waited suggestion was ever placed');
  } finally {
    restoreM.provideLocationStep(step0);
    globalThis.requestAnimationFrame = raf;
    store.location.value = null;
    persist.linkPlace.value = null;
    persist.quietly(() => { store.climate.value = 'Temperate'; store.guests.value = {}; });
  }
});
