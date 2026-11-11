// What the consortium tool keeps and how it opens (src/islands/consortium/memory.ts, stream S4;
// design check §5, BT-7; owner row "Memory", 2026-10-27): the guarded storage, the save record, the
// arrival order (link, guide preset, the last consortium, the shared site climate, else nothing),
// the country at start (a guess is never written), the share state, and the pure parts ported from
// v1 (guessCountry, cropExamples). The real crop examples are read from the installed export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const m = await import('../src/islands/consortium/memory.ts');
const { guarded, saveRecord, readRecord, oldRecord, arrival, hashAction, countryAtStart, shareState, shareUrl, guessCountry, cropExamples, plantName, zoneOf, STORE, COUNTRY_STORE, SITE_CLIMATE } = m;
const { decodeLink, encodeLink } = await import('../src/lib/consortium/index.ts');
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');

function fakeStorage() {
  const map = new Map();
  return { map, getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => void map.set(k, String(v)), removeItem: (k) => void map.delete(k) };
}
const throwing = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };

test('storage keys: the consortium, the country choice and the shared site climate', () => {
  assert.equal(STORE, 'canopi-consortium');
  assert.equal(COUNTRY_STORE, 'canopi-country');
  assert.equal(SITE_CLIMATE, 'canopi-climate', 'the key of knowledge/decisions/climate-ux.md');
});

test('guarded storage: works, and every call is caught when storage throws (§5 storage unavailable)', () => {
  const s = fakeStorage();
  const mem = guarded(() => s);
  assert.equal(mem.works(), true);
  assert.equal(s.map.size, 0, 'the probe is removed');
  assert.equal(mem.write('k', 'v'), true);
  assert.equal(mem.read('k'), 'v');
  assert.equal(mem.remove('k'), true);
  const blocked = guarded(throwing);
  assert.equal(blocked.works(), false);
  assert.equal(blocked.read('k'), null);
  assert.equal(blocked.write('k', 'v'), false);
  assert.equal(blocked.remove('k'), false);
  const full = guarded(() => ({ ...fakeStorage(), setItem: () => { throw new DOMException('quota', 'QuotaExceededError'); } }));
  assert.equal(full.works(), false);
  assert.equal(full.write('k', 'v'), false);
  assert.equal(guarded(() => null).works(), false);
});

test('the save record round-trips with its country source and refuses anything else', () => {
  const r = saveRecord('v=4&c=temperate&a=&e=1', '2026-11-11T00:00:00Z', 'link');
  assert.deepEqual(readRecord(r), { fragment: 'v=4&c=temperate&a=&e=1', at: '2026-11-11T00:00:00Z', src: 'link' });
  assert.equal(readRecord(saveRecord('v=4&c=temperate&a=&e=1', 'x', null)).src, null);
  assert.equal(readRecord(JSON.stringify({ fragment: 'v=4&c=temperate&a=&e=1', at: 'x', src: 'weird' })).src, null, 'an unknown source reads as none');
  for (const bad of [null, '', '{', 'null', '42', '{"q":"c=temperate","at":"x"}', '{"fragment":"","at":"x"}', JSON.stringify({ fragment: 'x'.repeat(30000), at: 'x' }), saveRecord('v=3&c=temperate&a=&e=1', 'x', null)]) assert.equal(readRecord(bad), null, String(bad).slice(0, 40));
});

test('an older save is told apart from nothing saved (review 4): v1 {q, at, src} and a v≠4 fragment', () => {
  assert.equal(oldRecord('{"q":"c=temperate&a=x","at":"2026-10-01","src":"chosen"}'), true);
  assert.equal(oldRecord(saveRecord('v=3&c=temperate&a=&e=1', 'x', null)), true);
  for (const no of [null, '', '{', saveRecord('v=4&c=temperate&a=&e=1', 'x', 'chosen'), '42']) assert.equal(oldRecord(no), false, String(no));
});

test('arrival: a link wins, then a guide preset, then an old query link, then the last consortium, then the site climate, else nothing', () => {
  const saved = { fragment: 'v=4&c=tropical&a=&e=1', at: 'x', src: null };
  assert.deepEqual(arrival({ hash: '#v=4&c=temperate&e=1', search: '?plant=Allium+cepa&climate=temperate' }, saved, 'arid'), { kind: 'link', fragment: 'v=4&c=temperate&e=1' });
  assert.deepEqual(arrival({ hash: '#v=3&c=temperate', search: '' }, null, null).kind, 'link', 'an older link is still read as a link (decodeLink says outdated)');
  assert.deepEqual(arrival({ hash: '#main', search: '?plant=Allium+cepa&climate=temperate' }, saved, 'arid'), { kind: 'preset', climate: 'Temperate', plant: 'Allium cepa' });
  assert.deepEqual(arrival({ hash: '', search: '?plant=Allium+cepa&climate=nowhere' }, saved, null), { kind: 'saved', fragment: saved.fragment, at: 'x', src: null }, 'a preset with no climate is no preset');
  assert.deepEqual(arrival({ hash: '', search: '?v=3&c=temperate&a=AbCdEf' }, saved, null), { kind: 'outdated' }, 'a v1 query link: the outdated notice, nothing restored (review 5)');
  assert.deepEqual(arrival({ hash: '', search: '?c=temperate&a=AbCdEf' }, null, null), { kind: 'outdated' });
  assert.deepEqual(arrival({ hash: '', search: '' }, null, 'mediterranean'), { kind: 'start', climate: 'Mediterranean' }, 'the shared site climate when the reader set one');
  assert.deepEqual(arrival({ hash: '', search: '' }, null, null), { kind: 'start', climate: null }, 'nothing chosen: never a default climate');
  assert.deepEqual(arrival({ hash: '', search: '' }, null, 'none'), { kind: 'start', climate: null });
  assert.equal(zoneOf(' Temperate '), 'Temperate');
  assert.equal(zoneOf('x'), null);
  assert.equal(zoneOf(null), null);
});

test('one zoneOf: the island reads climate ids with the core\'s (H15)', async () => {
  const core = await import('../src/lib/consortium/index.ts');
  assert.equal(zoneOf, core.zoneOf, 'memory.ts re-exports the core zoneOf, no copy');
  const main = readFileSync(new URL('../src/islands/consortium/main.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /const zoneOf\b/, 'main.ts has no zoneOf of its own');
  assert.doesNotMatch(readFileSync(new URL('../src/islands/consortium/memory.ts', import.meta.url), 'utf8'), /ct:pool/, 'no ct:pool mark: the timing script reads ct:matrix');
  assert.doesNotMatch(readFileSync(new URL('./browser/consortium-timing.mjs', import.meta.url), 'utf8'), /ct:pool/, 'the timing script has no ct:pool fallback');
});

test('arrival: the page\'s own address after a reload is the save, not a shared link (review 1)', () => {
  const own = { ct: 'v=4&c=temperate&k=FR&a=&e=1', src: 'chosen' };
  assert.deepEqual(arrival({ hash: '#v=4&c=temperate&k=FR&a=&e=1', search: '' }, null, null, own), { kind: 'saved', fragment: own.ct, at: '', src: 'chosen' });
  assert.deepEqual(arrival({ hash: '#v=4&c=temperate&k=DE&a=&e=1', search: '' }, null, null, own), { kind: 'link', fragment: 'v=4&c=temperate&k=DE&a=&e=1' }, 'another link in the address is a link');
  assert.deepEqual(arrival({ hash: '#v=4&c=temperate&k=FR&a=&e=1', search: '' }, null, null, { ct: own.ct, src: 'link' }).src, 'link', 'a country first opened from a link stays labelled so');
  assert.equal(arrival({ hash: '#v=4&c=temperate&a=&e=1', search: '' }, null, null, 'junk').kind, 'link');
});

test('hashchange: own address (Back/Forward) is the save with its source; another link is a link; the shown one is ignored (round 2, 1)', () => {
  const a = 'v=4&c=temperate&k=FR&a=&e=1', b = 'v=4&c=temperate&k=DE&a=&e=1';
  assert.deepEqual(hashAction(`#${a}`, { ct: a, src: 'chosen' }, b), { kind: 'saved', fragment: a, src: 'chosen' }, 'Back to the reader\'s own consortium: never relabelled as a link\'s');
  assert.deepEqual(hashAction(`#${b}`, { ct: a, src: 'chosen' }, a), { kind: 'link', fragment: b });
  assert.deepEqual(hashAction(`#${b}`, null, a), { kind: 'link', fragment: b });
  assert.deepEqual(hashAction(`#${a}`, null, a), { kind: 'ignore' }, 'the address the page itself wrote');
  assert.deepEqual(hashAction('#main', null, a), { kind: 'ignore' });
  assert.deepEqual(hashAction('', null, a), { kind: 'ignore' });
});

test('the country at start: a link, the reader\'s choice ("-" is none), the save (with its source), the guess, none', () => {
  assert.deepEqual(countryAtStart({ link: 'fr', pref: 'DE', saved: 'ES', guess: 'US' }), { code: 'FR', source: 'link' });
  assert.deepEqual(countryAtStart({ link: null, pref: '-', saved: 'ES', guess: 'US' }), { code: null, source: 'chosen' });
  assert.deepEqual(countryAtStart({ link: 'x', pref: 'DE', saved: 'ES', guess: 'US' }), { code: 'DE', source: 'chosen' }, 'a malformed link code is ignored');
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: 'es', guess: 'US' }), { code: 'ES', source: 'chosen' });
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: 'es', savedFrom: 'link', guess: 'US' }), { code: 'ES', source: 'link' }, 'a saved link country is never shown as chosen (review 2)');
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: null, guess: 'US' }), { code: 'US', source: 'guess' });
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: null, guess: null }), { code: null, source: null });
});

test('the share state never carries a guessed country, keeps crops to three and lists guests', () => {
  const base = { climate: 'Temperate', site: { light: 'sun', soil: 'unsure', water: 'unsure', room: 'small' }, members: ['a', 'b'], kept: ['a'], removed: ['c'], guests: { b: 'Tropical' }, crops: ['a', 'x', 'y', 'z'], stage: 3 };
  assert.equal(shareState({ ...base, country: { code: 'US', source: 'guess' } }).country, null);
  assert.equal(shareState({ ...base, country: { code: 'FR', source: 'chosen' } }).country, 'FR');
  assert.equal(shareState({ ...base, country: { code: 'FR', source: 'link' } }).country, 'FR');
  const s = shareState({ ...base, country: { code: null, source: null } });
  assert.deepEqual(s.guests, [{ id: 'b', from: 'Tropical' }]);
  assert.deepEqual(s.crops, ['a', 'x', 'y']);
  assert.equal(s.stage, 3);
  assert.equal(shareUrl('https://projectcanopi.com/fr/consortium/?plant=Allium+cepa&climate=temperate#old', 'v=4&e=1'), 'https://projectcanopi.com/fr/consortium/#v=4&e=1', 'a preset query is used once and never shared');
});

test('guessCountry: the one country of the time zone, else the languages\' region; any region before the list is read', () => {
  const zonesOf = (c) => ({ FR: ['Europe/Paris'], DE: ['Europe/Berlin'], US: ['America/New_York', 'America/Chicago'] })[c] ?? [];
  assert.equal(guessCountry(['FR', 'DE', 'US'], { zone: 'Europe/Paris', languages: ['en-US'], zonesOf }), 'FR');
  assert.equal(guessCountry(['FR', 'DE'], { zone: 'Asia/Tokyo', languages: ['de-DE', 'en'], zonesOf }), 'DE');
  assert.equal(guessCountry(['FR'], { zone: null, languages: ['en-US'], zonesOf }), null, 'a region the list does not know is no guess');
  assert.equal(guessCountry([], { languages: ['pt-BR'] }), 'BR');
  assert.equal(guessCountry([], { languages: ['not a tag', ''] }), null);
  assert.equal(guessCountry(['FR'], { zone: 'Europe/Paris', zonesOf: () => { throw new Error('no CLDR'); }, languages: [] }), null);
});

// The installed export (real data): the Temperate examples follow the owner's rule.
const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const realRaw = new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url))));
const real = await openBytes(realRaw, { releaseId: index.release_id, climates: index.climates });
const realSource = createSqliteSource(real.db, { images: {} });

test('cropExamples on the real Temperate list: Onion, European chestnut, Sunflower, Bilberry (owner row 2026-10-29)', async () => {
  const pool = await realSource.pool('Temperate');
  const ex = cropExamples(pool);
  assert.deepEqual(ex.map((t) => plantName(t, 'en')), ['Onion', 'European chestnut', 'Sunflower', 'Bilberry']);
  assert.ok(ex.every((t) => t.role === 'crop'), 'food plants only');
  assert.equal(new Set(ex.map((t) => t.genus)).size, ex.length, 'one per genus');
  assert.equal(new Set(ex.map((t) => t.stratum?.value)).size, ex.length, 'spread across the layers');
  const without = cropExamples(pool, 4, [ex[0].id]);
  assert.ok(!without.includes(ex[0]), 'a chosen crop leaves the examples');
  assert.deepEqual(cropExamples(pool).map((t) => t.id), ex.map((t) => t.id), 'the same every time');
});

test('cropExamples on every installed climate: four food plants, one per genus', async () => {
  for (const zone of index.climates) {
    const ex = cropExamples(await realSource.pool(zone));
    assert.equal(ex.length, 4, zone);
    assert.equal(new Set(ex.map((t) => t.genus)).size, 4, zone);
  }
});

test('a share state round-trips through the #v=4 link', async () => {
  const pool = await realSource.pool('Temperate');
  const ids = pool.slice(0, 9).map((t) => t.id);
  const state = shareState({ climate: 'Temperate', country: { code: 'FR', source: 'chosen' }, site: { light: 'part', soil: 'acid', water: 'wet', room: 'large' }, members: ids, kept: [ids[0]], removed: [pool[20].id], guests: {}, crops: [ids[0]], stage: 2 });
  const back = decodeLink(encodeLink(state, { Temperate: pool.map((t) => t.id) }), { Temperate: pool.map((t) => t.id) });
  assert.deepEqual(back.notice, { unknownCount: 0, cut: false, outdated: false });
  assert.deepEqual(back.state.members, ids);
  assert.deepEqual(back.state.site, state.site);
  assert.equal(back.state.country, 'FR');
  assert.equal(back.state.stage, 2);
});

// ---- restore (rounds 2 and 3 of the S4 review), on the real data with a source whose reads can be
// delayed or made to fail. Node has no location or history: the address is left alone. ----
const store = await import('../src/islands/consortium/store.ts');
const storage = fakeStorage();
let writes = 0;
globalThis.localStorage = { getItem: storage.getItem, removeItem: storage.removeItem, setItem: (k, v) => { writes++; storage.setItem(k, v); } };
const delays = {}, failing = new Set();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const testSource = new Proxy(realSource, {
  get(t, k) {
    if (k === 'pool' || k === 'interactions') {
      return async (c) => {
        if (delays[c]) await wait(delays[c]);
        if (failing.has(c)) throw new Error(`${c} unreadable`);
        return t[k](c);
      };
    }
    const v = t[k];
    return typeof v === 'function' ? v.bind(t) : v;
  },
});
// The save and the address follow every change, as startMemory sets them up in the page.
m.watchStore?.();
const UNSURE = { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' };
const linkOf = async (zone, n, extra = {}) => {
  const ids = (await realSource.pool(zone)).map((t) => t.id);
  return encodeLink({ climate: zone, country: null, site: UNSURE, members: ids.slice(0, n), kept: [], removed: [], guests: [], crops: [], stage: null, ...extra }, { [zone]: ids });
};
// A Temperate consortium on screen, nothing else read.
async function shown() {
  for (const k of Object.keys(delays)) delete delays[k];
  failing.clear();
  store.setSource(testSource);
  store.pools.value = {};
  store.interactionSets.value = {};
  store.load.value = { status: 'ready', error: null };
  const pool = await store.loadPool('Temperate');
  store.climate.value = 'Temperate';
  store.members.value = pool.slice(0, 6).map((t) => t.id);
  store.view.value = 'matrix';
  m.notices.value = { ...m.notices.peek(), pasted: null, failed: false, cut: false, outdated: false };
  writes = 0;
  return pool;
}

test('restore: a pasted link whose list cannot be read changes nothing, saves nothing and says so (round 2, 3; round 3, 4)', async () => {
  const pool = await shown();
  const link = await linkOf('Mediterranean', 5);
  failing.add('Mediterranean');
  const before = store.members.peek();
  assert.equal(await m.restore(link, { from: 'link', keep: true }), false);
  assert.equal(store.climate.peek(), 'Temperate');
  assert.deepEqual(store.members.peek(), before);
  assert.equal(writes, 0, 'nothing saved');
  assert.equal(m.notices.peek().pasted, 'failed');
  assert.equal(store.load.peek().status, 'ready', 'the consortium stays on screen: no app-wide failure');
  assert.equal(m.restoring.peek(), false);
  assert.ok(pool.length > 0);
});

test('restore: only the latest link applies; an older, slower one neither applies nor clears restoring (round 3, 2)', async () => {
  await shown();
  const older = await linkOf('Tropical', 4), newer = await linkOf('Mediterranean', 3);
  delays.Tropical = 80;
  const x = m.restore(older, { from: 'link', keep: true });
  const y = m.restore(newer, { from: 'link', keep: true });
  assert.equal(await y, true);
  assert.equal(m.restoring.peek(), false);
  assert.equal(await x, false, 'the older restore is dropped');
  assert.equal(store.climate.peek(), 'Mediterranean');
  assert.equal(store.members.peek().length, 3);
});

test('restore: the reader acting during a first-visit load cancels it; the link\'s climate shows at once (round 3, 3)', async () => {
  await shown();
  store.view.value = 'start';
  store.climate.value = null;
  store.members.value = [];
  const link = await linkOf('Tropical', 4);
  delays.Tropical = 80;
  const r = m.restore(link, { from: 'link' });
  await wait(5);
  assert.equal(m.pendingClimate.peek(), 'Tropical', 'Start shows the link\'s climate during the load');
  m.chooseClimate('Mediterranean');
  assert.equal(await r, false);
  assert.equal(store.climate.peek(), 'Mediterranean', 'the reader\'s choice wins');
  assert.deepEqual(store.members.peek(), []);
  assert.equal(m.pendingClimate.peek(), null);
  assert.equal(m.restoring.peek(), false);
});

test('restore: an edit made while a pasted link loads and fails is saved (round 3, 1)', async () => {
  const pool = await shown();
  const link = await linkOf('Mediterranean', 5);
  failing.add('Mediterranean');
  delays.Mediterranean = 40;
  const r = m.restore(link, { from: 'link', keep: true });
  await wait(5);
  store.members.value = pool.slice(0, 7).map((t) => t.id);
  assert.equal(await r, false);
  const saved = readRecord(storage.getItem(STORE));
  assert.ok(saved, 'saved');
  assert.equal(decodeLink(saved.fragment, { Temperate: pool.map((t) => t.id) }).state.members.length, 7, 'the edit is the saved state');
});

test('restore: a cut or outdated link arriving during a first-visit restore leaves nothing stuck; edits save again (round 4, 1)', async () => {
  const pool = await shown();
  store.view.value = 'start';
  store.climate.value = null;
  store.members.value = [];
  const link = await linkOf('Tropical', 4);
  delays.Tropical = 60;
  const a = m.restore(link, { from: 'link' });
  await wait(5);
  assert.equal(await m.restore('v=4&k=FR', { from: 'link' }), false, 'cut');
  assert.equal(await m.restore('v=1&c=temperate', { from: 'link' }), false, 'outdated');
  assert.equal(await a, false, 'a newer link, even refused, wins over the older restore');
  assert.equal(m.restoring.peek(), false);
  assert.equal(m.pendingClimate.peek(), null);
  store.climate.value = 'Temperate';
  store.view.value = 'matrix';
  writes = 0;
  store.members.value = pool.slice(0, 3).map((t) => t.id);
  assert.ok(writes > 0, 'an edit is saved again');
  assert.equal(decodeLink(readRecord(storage.getItem(STORE)).fragment, { Temperate: pool.map((t) => t.id) }).state.members.length, 3);
});

test('restore: an edit during restore A, superseded by a newer restore B that fails, is saved (round 4, 2)', async () => {
  const pool = await shown();
  const linkA = await linkOf('Tropical', 4), linkB = await linkOf('Mediterranean', 5);
  delays.Tropical = 60;
  delays.Mediterranean = 20;
  failing.add('Mediterranean');
  const a = m.restore(linkA, { from: 'link', keep: true });
  await wait(5);
  store.members.value = pool.slice(0, 8).map((t) => t.id);
  const b = m.restore(linkB, { from: 'link', keep: true });
  assert.equal(await b, false);
  assert.equal(await a, false, 'the reader acted: A does not apply');
  assert.equal(store.climate.peek(), 'Temperate');
  assert.equal(decodeLink(readRecord(storage.getItem(STORE)).fragment, { Temperate: pool.map((t) => t.id) }).state.members.length, 8, 'the edit is saved');
  assert.equal(m.restoring.peek(), false);
});

for (const [what, act] of [['a site answer', () => { store.site.value = { ...store.site.peek(), light: 'full' }; }], ['a country choice', () => m.chooseCountry('DE')]]) {
  test(`restore: ${what} during a first-visit restore keeps the link's climate shown (redesign review, 1)`, async () => {
    await shown();
    store.view.value = 'start';
    store.climate.value = null;
    store.members.value = [];
    const link = await linkOf('Tropical', 4);
    delays.Tropical = 60;
    const a = m.restore(link, { from: 'link' });
    await wait(5);
    act();
    assert.equal(store.climate.peek(), 'Tropical', 'the climate Start showed stays, now chosen');
    assert.equal(await a, false, 'the reader acted: the link does not apply');
    assert.equal(store.climate.peek(), 'Tropical');
  });
}

test('restore: a newer cut link cancels the older restore and keeps its notice (redesign review, 3)', async () => {
  await shown();
  store.view.value = 'start';
  store.climate.value = null;
  store.members.value = [];
  m.notices.value = { ...m.notices.peek(), cut: false, unknownCount: 0 };
  const link = await linkOf('Tropical', 4);
  delays.Tropical = 40;
  const a = m.restore(link, { from: 'link' });
  await wait(5);
  assert.equal(await m.restore('v=4&k=FR', { from: 'link' }), false);
  assert.equal(await a, false);
  assert.equal(m.notices.peek().cut, true, 'the cut notice stays');
  assert.deepEqual(store.members.peek(), []);
  assert.equal(m.restoring.peek(), false);
});

test('applyPreset: a card the reader picks while the guide\'s plant is read wins; the plant is not applied (pre-push review 2)', async () => {
  await shown();
  store.view.value = 'start';
  store.members.value = [];
  store.crops.value = [];
  store.kept.value = [];
  const crop = (await realSource.pool('Tropical')).find((t) => t.role === 'crop');
  delays.Tropical = 60;
  const p = m.applyPreset('Tropical', crop.canonical_name);
  await wait(5);
  m.chooseClimate('Mediterranean');
  await p;
  assert.equal(store.climate.peek(), 'Mediterranean', 'the reader\'s card');
  assert.deepEqual({ crops: store.crops.peek(), kept: store.kept.peek() }, { crops: [], kept: [] }, 'the guide\'s plant is not applied');
  assert.equal(m.notices.peek().guideKept, null);
});

// P5 owner answer 5 (2026-11-11): a country from the location is labelled "from your location", saved on
// the device, and written into a link only with the reader's "include my location" tick (S5b passes
// { location: true } then). The save keeps it beside the fragment, never in it, so the address bar and
// the save never carry it.
test('a country from the location: never in a link or the address without the tick, saved on the device as "location"', () => {
  const base = { climate: 'Temperate', site: { light: 'sun', soil: 'unsure', water: 'unsure', room: 'small' }, members: ['a'], kept: [], removed: [], guests: {}, crops: [], stage: null };
  const here = { code: 'FR', source: 'location' };
  assert.equal(shareState({ ...base, country: here }).country, null, 'no k= without the tick');
  assert.equal(shareState({ ...base, country: here }, { location: true }).country, 'FR', 'k= with the tick');
  assert.equal(shareState({ ...base, country: { code: 'FR', source: 'chosen' } }, { location: true }).country, 'FR');
  const r = saveRecord('v=4&c=temperate&a=&e=1', 'x', 'location', 'FR');
  assert.deepEqual(readRecord(r), { fragment: 'v=4&c=temperate&a=&e=1', at: 'x', src: 'location', country: 'FR' });
  assert.deepEqual(readRecord(saveRecord('v=4&c=temperate&a=&e=1', 'x', 'chosen')), { fragment: 'v=4&c=temperate&a=&e=1', at: 'x', src: 'chosen' }, 'only a location country is kept beside the fragment');
  assert.equal(readRecord(JSON.stringify({ fragment: 'v=4&c=temperate&a=&e=1', at: 'x', src: 'location', country: 'nope' })).country, undefined, 'a malformed code is dropped');
  assert.deepEqual(countryAtStart({ link: null, pref: null, saved: 'fr', savedFrom: 'location', guess: 'US' }), { code: 'FR', source: 'location' }, 'shown again as "from your location", never as chosen');
  assert.deepEqual(countryAtStart({ link: 'DE', pref: null, saved: 'fr', savedFrom: 'location', guess: 'US' }), { code: 'DE', source: 'link' }, 'a link\'s own country wins');
});
