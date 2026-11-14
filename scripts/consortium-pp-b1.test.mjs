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

// ---- b1a: the place, arriving, Start over, the link's place, Forget (plant-palette-slices section 2,
// row b1a; plant-palette-architecture 3.1, 8.3, 9). The state modules on the installed export, with a
// storage double; Node has no location or history, so the address is left alone. ----
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { emptyPlace, siteFor, encodeLink, encodePlace, linkOrigin } from '../src/lib/consortium/index.ts';

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
  // A reload of the page's own address: the tab's place (history.state.pl), not the shared save's.
  assert.deepEqual(arrivalM.arrival({ hash: '#v=5&c=temperate&a=&e=1', search: '' }, rec, null, { ct: 'v=5&c=temperate&a=&e=1', src: 'chosen', pl: 'l=sun' }), { kind: 'saved', fragment: 'v=5&c=temperate&a=&e=1', at: '', src: 'chosen', place: 'l=sun' });
  // A reload while a link's place still waited (history.state ask: 1, with the link's country in pl):
  // asked again, so the save stays held until the reader chooses.
  assert.deepEqual(arrivalM.arrival({ hash: '#v=5&c=temperate&a=&e=1', search: '' }, rec, null, { ct: 'v=5&c=temperate&a=&e=1', src: 'link', pl: 'k=FR&l=sun', ask: 1 }), { kind: 'saved', fragment: 'v=5&c=temperate&a=&e=1', at: '', src: 'link', place: 'k=FR&l=sun', ask: true });
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
  // As a fresh page: the save it last wrote is the empty storage's.
  persist.openedWith(null);
  // Nothing of an earlier test's arrival stays: its link-place notice, its held save, its saved-instead.
  persist.linkPlace.value = null;
  persist.holdSave(false);
  restoreM.savedInstead.value = null;
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
test('b1a link place (b): "Use it" makes l=shade the palette\'s place and the link\'s cell the device location', async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    await draft.useLinkPlace();
    await wait(0);
    assert.equal(restoreM.linkPlace.peek(), null);
    assert.equal(saved()?.place, 'l=shade', 'the save holds the link\'s place');
    const loc = locationM.readLocation(kept.get(LOCATION_STORE) ?? null);
    assert.ok(loc && Math.abs(loc.lat - 37.35) < 0.051 && Math.abs(loc.lon - -5.95) < 0.051, `the link's cell in canopi-location (${kept.get(LOCATION_STORE)})`);
    assert.notEqual(loc.source, 'link', 'kept as the reader\'s own');
    assert.equal(kept.get(COUNTRY_STORE), 'ES', 'the link\'s country kept');
    assert.match(kept.get(PLACE_STORE) ?? '', /l=shade/, 'and it seeds the next palette');
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

test('b1a bugs-5: Forget on Change site also clears the set-aside palette\'s place', async () => {
  await mine(5);
  await wait(0);
  assert.equal(saved()?.place, 'l=sun');
  draft.changeSite();
  locationM.forget();
  await wait(0);
  assert.equal(saved()?.place, '', 'the set-aside palette kept its place in the save');
  draft.backToConsortium();
  await wait(0);
  assert.deepEqual(store.spot.peek(), emptyPlace.spot, 'the set-aside palette kept its place: Back brought the spot answers back');
  assert.deepEqual(store.soil.peek(), { from: 'map' });
  assert.equal(store.room.peek(), 'small', 'the room stays');
  assert.equal(saved()?.place, '', 'the set-aside palette kept its place in the save after Back');
});

test('b1a bugs-7: "Show my palette" after an emptied draft offers one Undo that gives the set-aside palette back', async () => {
  const pool = await mine(5);
  const before = store.members.peek();
  draft.changeSite();
  draft.chooseClimate('Mediterranean');
  assert.equal(store.members.peek().length, 0, 'another card starts the draft empty');
  draft.showPalette();
  assert.ok(store.toast.peek()?.undo, 'no Undo after "Show my palette" replaced the set-aside palette');
  store.toast.peek().undo();
  assert.equal(store.view.peek(), 'start', 'Undo goes back to Place');
  draft.backToConsortium();
  assert.deepEqual(store.members.peek(), before, 'and the set-aside palette is there to go back to');
  assert.equal(store.climate.peek(), 'Temperate');
  void pool;
});

// r2-2 (review round 2): the offer goes when the save is replaced, not on any answer: a room or country
// answer on Place writes no save while the page has no palette of its own.
test('b1a bugs-8 / r2-2: "Open my saved palette instead" and "Back to mine" stay through Place answers that write no save, and go once a plant added replaces the save', async () => {
  // As a fresh page opened over the reader's save: the save it read is the stored one.
  const fresh = async () => {
    const pool = await mine(5);
    await wait(0);
    const text = kept.get(STORE);
    persist.quietly(() => { store.view.value = 'start'; store.setAside.value = null; store.climate.value = null; store.members.value = []; store.removed.value = []; });
    await wait(0);
    kept.set(STORE, text);
    persist.openedWith(text);
    return [pool, text];
  };
  // (a) A guide preset over the save.
  const [pool, text] = await fresh();
  restoreM.savedInstead.value = readRecord(text);
  await restoreM.applyPreset('Temperate', pool[3].canonical_name);
  assert.ok(restoreM.savedInstead.peek(), 'offered after the preset');
  store.room.value = 'large';
  await wait(0);
  assert.ok(restoreM.savedInstead.peek(), '"Open my saved palette instead" gone after a Place answer that wrote no save (room)');
  draft.chooseCountry('KE');
  await wait(0);
  assert.ok(restoreM.savedInstead.peek(), '"Open my saved palette instead" gone after a Place answer that wrote no save (country)');
  assert.equal(kept.get(STORE), text, 'the save is untouched');
  // A plant added (as "Add a plant by name" does) opens the palette, whose save replaces the reader's.
  store.addMembers([pool[4].id]);
  await wait(0);
  assert.notEqual(kept.get(STORE), text, 'the palette is saved');
  assert.equal(restoreM.savedInstead.peek(), null, '"Open my saved palette instead" still offered after the save was replaced');
  // (b) A newer link over the save: "Back to mine" through a country and a card.
  const [, text2] = await fresh();
  assert.equal(await restoreM.restore('v=6&c=temperate&a=abcdef&e=1', { from: 'link' }), false);
  restoreM.savedInstead.value = readRecord(text2);
  draft.chooseCountry('KE');
  draft.chooseClimate('Mediterranean');
  await wait(0);
  assert.ok(restoreM.savedInstead.peek(), '"Back to mine" gone after a Place answer that wrote no save (country, card)');
  assert.equal(kept.get(STORE), text2, 'the save is untouched');
  restoreM.savedInstead.value = null;
});

test('b1a bugs-9: a reload while the notice waits keeps the link\'s cell, so "Use it" still adopts it', async () => {
  const restoreAddress = fakeAddress();
  let before = null;
  try {
    before = await arriveWithPlace();
    assert.ok(restoreM.linkPlace.peek(), 'no link-place notice');
    assert.equal(history.state?.ask, 1, 'the address says the notice waits');
    // The reload: the page forgets its location; the address and history.state stay.
    store.location.value = null;
    const how = arrivalM.arrival({ hash: location.hash, search: '' }, saved(), null, history.state);
    assert.equal(how.ask, true);
    const ask = { spot: { ...SUN }, soil: { from: 'map' }, country: { code: 'FR', source: 'chosen' }, location: null };
    assert.equal(await restoreM.restore(how.fragment, { from: 'saved', src: how.src, place: how.place, ask, hold: how.hold }), true);
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
  const plan = (how, over = {}) => arrivalM.arrivalPlan(how, { saved: null, pref: null, guess: null, seed: null, cell, ...over });
  // A link that brings a place (k=FR, l=shade, o=): the link's country shown, the reader's own (KE) kept.
  const shade = { ...emptyPlace.spot, light: 'shade' };
  const link = await linkWith('Temperate', 3, { country: 'FR', spot: shade }, { origin: { lat: 37.39, lon: -5.98 }, place: true });
  const p = plan({ kind: 'link', fragment: link }, { pref: 'KE', guess: 'DE' });
  assert.deepEqual(p.country, { code: 'FR', source: 'link' });
  assert.deepEqual(p.own, { code: 'KE', source: 'chosen' }, 'the reader\'s own country');
  assert.deepEqual(p.linkCell, linkOrigin(link));
  assert.ok(p.linkCell, 'the link\'s cell');
  assert.equal(p.ask, undefined);
  assert.equal(reads, 0, 'canopi-location read on a plain link arrival');
  // k alone brings no place: the reader's own country (else the guess).
  const kOnly = await linkWith('Temperate', 3, { country: 'DE' }, { place: true });
  assert.deepEqual(plan({ kind: 'link', fragment: kOnly }, { pref: 'KE' }).country, { code: 'KE', source: 'chosen' });
  assert.deepEqual(plan({ kind: 'link', fragment: kOnly }, { guess: 'ES' }).country, { code: 'ES', source: 'guess' });
  // The save with a location's country beside it.
  const f = await linkWith('Temperate', 2);
  const rec = { fragment: f, place: 'l=sun', at: '2026-11-14', src: 'location', country: 'KE' };
  const s = plan({ kind: 'saved', fragment: f, at: rec.at, src: 'location', place: rec.place }, { saved: rec, guess: 'DE' });
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
