// PP-B streams b1a (your place, arriving and sharing) and b1b (the pool count into Place): their unit
// tests (plant-palette-slices, PP-B rows). Commit 0 moved two F1a markers here unchanged (they still
// fail for their stated reason after 0a): the suggestion's invasive tie, which b1a makes pass in
// suggest.ts (expected-fail, owner in each title, scripts/expect-fail.mjs failing(); the owner removes
// the marker in the commit that makes it pass).
import assert from 'node:assert/strict';
import { UNSURE_SITE } from '../src/lib/consortium/index.ts';
import { suggest } from '../src/lib/consortium/suggest.ts';
import { failing } from './expect-fail.mjs';
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

failing('F1a-P12 → PP-B (b1a invasive tie, A10): of two plants that bring the same, the suggestion picks the one not invasive in the chosen country', { owner: 'b1a', reason: /picked the plant invasive in FR on a tie/ }, () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx({ country: 'FR', countryStatus: 'checked' })).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in FR on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});

failing('F1a-P13 → PP-B (b1a invasive tie, owner Q1): with no country chosen, the tie goes to the plant invasive in no GRIIS country', { owner: 'b1a', reason: /picked the plant invasive in a GRIIS country on a tie/ }, () => {
  const [inv, plain] = tied();
  const picked = suggest([inv, plain], suggestCtx()).members;
  assert.ok(!picked.includes(inv.id), `picked the plant invasive in a GRIIS country on a tie (${picked.length} picked)`);
  assert.ok(picked.includes(plain.id));
});

// ---- b1a: the place, arriving, Start over, the link's place, Forget (plant-palette-slices section 2,
// row b1a; plant-palette-architecture 3.1, 8.3, 9). The state modules on the installed export, with a
// storage double; Node has no location or history, so the address is left alone. ----
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { emptyPlace, siteFor, encodeLink } from '../src/lib/consortium/index.ts';

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

failing('b1a Start over then one Undo: members, removed and guests come back, the palette\'s place stays', { owner: 'b1a', reason: /no Undo offered after Start over/ }, async () => {
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

failing('b1a a guide preset gives members == [id] and writes no save until the reader acts', { owner: 'b1a', reason: /the preset wrote a save/ }, async () => {
  const pool = await mine(5);
  const before = kept.get(STORE);
  persist.quietly(() => { store.view.value = 'start'; store.climate.value = null; store.members.value = []; store.removed.value = []; });
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
failing('b1a link place (a): a palette edit while the notice shows keeps the reader\'s own l=sun in the save', { owner: 'b1a', reason: /no link-place notice/ }, async () => {
  const before = await arriveWithPlace();
  try {
    assert.ok(restoreM.linkPlace?.peek(), 'no link-place notice');
    assert.equal(store.spot.peek().light, 'shade', 'the page is judged with the link\'s place');
    store.removeMember(store.members.peek()[0]);
    await wait(0);
    assert.equal(saved()?.place, 'l=sun', 'the save keeps its own place until the reader chooses');
  } finally { restoreM.provideLocationStep(before); store.location.value = null; }
});
failing('b1a link place (b): "Use it" makes l=shade the palette\'s place and the link\'s cell the device location', { owner: 'b1a', reason: /no link-place notice/ }, async () => {
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
failing('b1a link place (c): "Use my own place" gives back the reader\'s own answers', { owner: 'b1a', reason: /no link-place notice/ }, async () => {
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

failing('b1a Forget this location clears canopi-location, canopi-place and the palette\'s place', { owner: 'b1a', reason: /Forget left canopi-place/ }, async () => {
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
