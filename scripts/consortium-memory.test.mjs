// What the consortium tool keeps and how it opens (src/islands/consortium/state/*.ts, split from memory.ts by E6 S2; stream S4;
// design check §5, BT-7; owner row "Memory", 2026-10-27): the guarded storage, the save record, the
// arrival order (link, guide preset, the last consortium, the shared site climate, else nothing),
// the country at start (a guess is never written), the share state, and the pure parts ported from
// v1 (guessCountry, cropExamples). The real crop examples are read from the installed export.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// The state modules themselves (E6 S2 split memory.ts into state/), merged into one namespace `m`.
const persist = await import('../src/islands/consortium/state/persist.ts');
const restoreModule = await import('../src/islands/consortium/state/restore.ts');
const m = {
  ...persist, ...restoreModule,
  ...(await import('../src/islands/consortium/state/arrival.ts')),
  ...(await import('../src/islands/consortium/state/draft.ts')),
  ...(await import('../src/islands/consortium/state/suggest-wait.ts')),
};
const { guarded, saveRecord, readRecord, oldRecord, arrival, hashAction, countryAtStart, shareState, shareUrl, guessCountry, cropExamples, plantName, STORE, COUNTRY_STORE, SITE_CLIMATE } = m;
// Island state, all of it (the text checks below).
const stateSrc = ['persist', 'restore', 'arrival', 'draft', 'suggest-wait', 'lookups', 'location']
  .map((f) => readFileSync(new URL(`../src/islands/consortium/state/${f}.ts`, import.meta.url), 'utf8')).join('\n');
const { decodeLink, encodeLink, zoneOf } = await import('../src/lib/consortium/index.ts');
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
  const memory = await import('../src/islands/consortium/memory.ts');
  assert.equal(memory.zoneOf, core.zoneOf, 'memory.ts re-exports the core zoneOf (for the views until chunk 5), no copy');
  assert.doesNotMatch(stateSrc, /const zoneOf\b/, 'island state has no zoneOf of its own');
  const main = readFileSync(new URL('../src/islands/consortium/main.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /const zoneOf\b/, 'main.ts has no zoneOf of its own');
  assert.doesNotMatch(stateSrc, /ct:pool/, 'no ct:pool mark: the timing script reads ct:first-view');
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
// The store's own effects (the Undo offer's end among them), as main.ts starts them with store.start() (E6 S3).
store.start?.();
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

// ---- E6 S1: the consortium's state declared once (src/islands/consortium/state/schema.ts). Each field
// says whether it is in Undo's snapshot, saved, in the link and watched; store.ts and memory.ts take
// every list from there. Per field: save → restore, link → restore and Undo, on the real data. ----
const schemaModule = await import('../src/islands/consortium/state/schema.ts');
const { defineState, CONSORTIUM_FIELDS, STATE_FIELDS, state: schema } = schemaModule;
const { effect } = await import('@preact/signals');
const sorted = (list) => [...list].sort();

test('schema: each field declares its part once (snapshot, Undo, saved, link, watched, plant list)', () => {
  const L = schema.lists;
  assert.deepEqual(sorted(L.snapshot), sorted(['members', 'kept', 'removed', 'crops', 'guests', 'view', 'setAside']), 'Undo puts these back');
  assert.deepEqual(sorted(L.endsUndo), sorted(['climate', 'members', 'kept', 'removed', 'crops', 'guests']), 'a change to these ends the Undo offer');
  const saved = ['climate', 'country', 'site', 'members', 'kept', 'removed', 'guests', 'crops', 'stage'];
  assert.deepEqual(sorted(L.saved), sorted(saved), 'the Consortium the save keeps and Change site sets aside');
  assert.deepEqual(sorted(Object.keys(CONSORTIUM_FIELDS)), sorted(saved), 'CONSORTIUM_FIELDS (the Consortium type) holds the saved fields');
  assert.deepEqual(sorted(L.reader), sorted([...saved, 'view']), 'a write to these is the reader acting');
  assert.deepEqual(sorted(L.save), sorted([...saved, 'view', 'setAside']), 'the save and the address follow these');
  assert.deepEqual(sorted(L.plants), sorted(['members', 'kept', 'removed', 'guests', 'crops']));
  for (const k of Object.keys(STATE_FIELDS)) assert.equal(store[k], schema.signals[k], `store.${k} is the schema's signal`);
});

test('schema: the saved fields are exactly the ShareState the core link codec reads and writes', () => {
  assert.deepEqual(sorted(schema.lists.saved), sorted(Object.keys(decodeLink('v=4&c=temperate&e=1', {}).state)),
    'a field put into the link needs the core codec (lib/consortium/state.ts) to carry it');
});

test('schema: store.ts and island state (state/*.ts) list no state field by hand', () => {
  const memSrc = stateSrc;
  const storeSrc = readFileSync(new URL('../src/islands/consortium/store.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(memSrc, /void \[store\./, 'watcher lists come from schema.lists');
  assert.doesNotMatch(memSrc, /store\.(crops|kept|members)\.value = (s\.|same)/, 'the link and the draft write fields through the schema');
  assert.doesNotMatch(storeSrc, /SNAP_KEYS = \[/, 'SNAP_KEYS comes from schema.lists');
  assert.doesNotMatch(storeSrc, /interface Snapshot \{/, 'Snapshot comes from the schema');
  assert.doesNotMatch(memSrc, /export interface ShareInput/, 'ShareInput comes from the schema');
});

// The link itself is guarded by the codec test above: a new saved field needs the core codec to carry it.
test('schema: a field added to the schema round-trips through the schema (Undo, watchers, save and share state) with no other change', () => {
  const mulch = { initial: () => 'none', undo: true, endsUndo: true, saved: true };
  const s = defineState({ ...STATE_FIELDS, mulch });
  assert.notEqual(s.signals.members, store.members, 'its own signals');
  for (const l of ['snapshot', 'endsUndo', 'saved', 'reader', 'save']) assert.ok(s.lists[l].includes('mulch'), l);
  // Undo: in the snapshot, put back, and a change ends the offer.
  const before = s.snapshot(), then = s.peek(s.lists.endsUndo);
  s.signals.mulch.value = 'straw';
  assert.notEqual(s.peek(s.lists.endsUndo).mulch, then.mulch, 'a change SNAP_KEYS sees');
  s.restore(before);
  assert.equal(s.signals.mulch.peek(), 'none');
  // Watched: the reader's watcher and the save's watcher re-run on it.
  for (const l of ['reader', 'save']) {
    let runs = 0;
    const stop = effect(() => { s.track(s.lists[l]); runs++; });
    s.signals.mulch.value = s.signals.mulch.peek() === 'bark' ? 'leaves' : 'bark';
    stop();
    assert.equal(runs, 2, `${l} watcher`);
  }
  // Saved and shared: in the consortium, put into the link's state and taken back out of it.
  s.signals.climate.value = 'Temperate';
  s.signals.mulch.value = 'bark';
  const consortium = s.peek(s.lists.saved);
  assert.equal(consortium.mulch, 'bark');
  const shared = s.share(consortium, { location: false });
  assert.equal(shared.mulch, 'bark');
  s.signals.mulch.value = 'none';
  s.apply(shared, { countryFrom: 'chosen' });
  assert.equal(s.signals.mulch.peek(), 'bark');
  assert.deepEqual(s.peek(s.lists.saved), consortium, 'every saved field comes back');
});

// A shown Temperate consortium with every saved field at its start value.
async function blankShown() {
  const pool = await shown();
  await store.loadPool('Tropical');
  await store.loadPool('Mediterranean');
  store.country.value = { code: null, source: null };
  store.site.value = { ...UNSURE };
  store.kept.value = [];
  store.removed.value = [];
  store.guests.value = {};
  store.crops.value = [];
  store.stage.value = 0;
  store.setAside.value = null;
  return pool;
}
const SITE = { light: 'part', soil: 'acid', water: 'wet', room: 'large' };
// Per saved field: the change, and the value it reads back (from a link, `link`: a country is labelled so).
const CASES = {
  climate: { change: async () => { const p = await store.loadPool('Mediterranean'); store.climate.value = 'Mediterranean'; store.members.value = p.slice(0, 4).map((t) => t.id); }, want: 'Mediterranean' },
  country: { change: () => { store.country.value = { code: 'DE', source: 'chosen' }; }, want: { code: 'DE', source: 'chosen' }, link: { code: 'DE', source: 'link' } },
  site: { change: () => { store.site.value = { ...SITE }; }, want: SITE },
  members: { change: (p) => { store.members.value = p.slice(10, 14).map((t) => t.id); }, want: (p) => p.slice(10, 14).map((t) => t.id) },
  kept: { change: (p) => { store.kept.value = [p[2].id]; }, want: (p) => [p[2].id] },
  removed: { change: (p) => { store.removed.value = [p[30].id]; }, want: (p) => [p[30].id] },
  guests: { change: async () => { const g = (await store.loadPool('Tropical'))[5].id; store.members.value = [...store.members.peek(), g]; store.guests.value = { [g]: 'Tropical' }; }, want: async () => ({ [(await store.loadPool('Tropical'))[5].id]: 'Tropical' }) },
  crops: { change: (p) => { store.crops.value = [p[1].id]; }, want: (p) => [p[1].id] },
  stage: { change: () => { store.stage.value = 4; }, want: 4 },
};
const valueOf = async (w, p) => (typeof w === 'function' ? w(p) : w);

test('every saved field has a round-trip case below', () => {
  assert.deepEqual(sorted(Object.keys(CASES)), sorted(schema.lists.saved));
});

for (const [k, c] of Object.entries(CASES)) {
  test(`save → restore keeps ${k}`, async () => {
    const pool = await blankShown();
    await c.change(pool);
    const want = await valueOf(c.want, pool);
    assert.deepEqual(store[k].peek(), want);
    const rec = readRecord(storage.getItem(STORE));
    assert.ok(rec, 'saved');
    await blankShown();
    assert.notDeepEqual(store[k].peek(), want, 'changed back before the restore');
    assert.equal(await m.restore(rec.fragment, { from: 'saved', src: rec.src }), true);
    assert.deepEqual(store[k].peek(), want);
  });
  test(`link → restore keeps ${k}`, async () => {
    const pool = await blankShown();
    await c.change(pool);
    const link = m.currentFragment();
    assert.equal(m.shownFragment.value, link, 'Share shows the same link');
    const want = await valueOf(c.link ?? c.want, pool);
    await blankShown();
    assert.equal(await m.restore(link, { from: 'link' }), true);
    assert.deepEqual(store[k].peek(), want);
  });
}

test('Undo puts back each snapshot field; the view only to or from Start', async () => {
  const pool = await blankShown();
  const ids = pool.slice(0, 3).map((t) => t.id);
  const aside = { climate: 'Temperate', members: ids, kept: [], removed: [], guests: {}, crops: [], site: { ...UNSURE }, country: { code: null, source: null }, stage: 0 };
  const values = { members: ids, kept: [ids[0]], removed: [ids[2]], crops: [ids[1]], guests: { [ids[1]]: 'Tropical' }, setAside: aside };
  for (const [k, v] of Object.entries(values)) {
    const before = schema.snapshot();
    store[k].value = v;
    schema.restore(before);
    assert.deepEqual(store[k].peek(), before[k], k);
  }
  store.view.value = 'start';
  let before = schema.snapshot();
  store.view.value = 'matrix';
  schema.restore(before);
  assert.equal(store.view.peek(), 'start', 'back to Start');
  store.view.value = 'matrix';
  before = schema.snapshot();
  store.view.value = 'side';
  schema.restore(before);
  assert.equal(store.view.peek(), 'side', 'a view change between two consortium views stays');
});

test('a change to any field that ends Undo hides the Undo toast', async () => {
  const changes = {
    climate: () => { store.climate.value = 'Mediterranean'; },
    members: (p) => { store.members.value = [p[40].id]; },
    kept: (p) => { store.kept.value = [p[41].id]; },
    removed: (p) => { store.removed.value = [p[42].id]; },
    crops: (p) => { store.crops.value = [p[43].id]; },
    guests: (p) => { store.guests.value = { [p[44].id]: 'Tropical' }; },
  };
  assert.deepEqual(sorted(Object.keys(changes)), sorted(schema.lists.endsUndo));
  for (const [k, change] of Object.entries(changes)) {
    const pool = await blankShown();
    store.removeMember(store.members.peek()[0]);
    assert.ok(store.toast.peek()?.undo, `${k}: Undo offered`);
    change(pool);
    assert.equal(store.toast.peek(), null, `${k}: Undo withdrawn`);
  }
  store.hideToast();
});

// Saved data of today's visitors (written before the schema, 2026-11-12) still opens the same way.
const TODAY_SAVE = '{"fragment":"v=4&c=temperate&k=FR&l=part&s=acid&w=wet&m=large&a=*dhUvw6*hMnoF4cGXxubT_4pfUIFAvOY&x=Tc-F92&n=dhUvw6&g=trIFAvOY&t=2&e=1","at":"2026-11-12T10:00:00.000Z","src":"chosen"}';
const TODAY = {
  climate: 'Temperate', site: SITE, stage: 2,
  members: ['76152fc3-ac02-491f-9130-cc294c13730e', '84c9e817-8dda-434a-954e-73959c39abfd', '7065f1b9-b178-42fd-8c55-4517deae30e9', '4ffe297d-4c34-4da4-83c7-cb549dee5bd0', '20502f39-8694-4322-be9c-655dce7de501'],
  kept: ['76152fc3-ac02-491f-9130-cc294c13730e', '84c9e817-8dda-434a-954e-73959c39abfd'],
  removed: ['4dcf85f7-685c-4347-9489-280b6b08c99a'],
  guests: { '20502f39-8694-4322-be9c-655dce7de501': 'Tropical' },
  crops: ['76152fc3-ac02-491f-9130-cc294c13730e'],
};
for (const [from, country] of [['saved', { code: 'FR', source: 'chosen' }], ['link', { code: 'FR', source: 'link' }]]) {
  test(`a ${from === 'saved' ? 'save' : '#v=4 link'} written before the schema opens as it did`, async () => {
    await blankShown();
    const rec = readRecord(TODAY_SAVE);
    assert.ok(rec);
    assert.equal(await m.restore(rec.fragment, { from, src: rec.src }), true);
    for (const [k, v] of Object.entries({ ...TODAY, country })) assert.deepEqual(store[k].peek(), v, k);
    assert.equal(store.view.peek(), 'matrix');
    assert.equal(m.currentFragment(), rec.fragment, 'and writes the same link back');
  });
}

// ---- E6 S2: the memory split (state/persist, restore, arrival, draft, suggest-wait, lookups; state/location) ----

test('the split: island state imports nothing under views/, statically or through import() (ADR-1 L2); memory.ts only re-exports', () => {
  const dir = new URL('../src/islands/consortium/state/', import.meta.url);
  for (const f of ['persist.ts', 'restore.ts', 'arrival.ts', 'draft.ts', 'suggest-wait.ts', 'lookups.ts', 'location.ts']) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(src, /(from|import\()\s*'[^']*\/views\//, `state/${f} imports a view`);
  }
  const mem = readFileSync(new URL('../src/islands/consortium/memory.ts', import.meta.url), 'utf8');
  const code = mem.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
  assert.ok(code.every((l) => /^export \{[^}]+\} from '[^']+';$/.test(l)), `memory.ts holds re-exports only: ${code.filter((l) => !/^export \{/.test(l)).join(' | ')}`);
  assert.doesNotMatch(readFileSync(new URL('../src/lib/location/place-search.ts', import.meta.url), 'utf8'), /@preact\/signals/, 'the location service imports no UI framework (A12)');
});

test('one country-source enum: the save keeps store.ts CountrySource without the guess; any other source reads as none', () => {
  for (const src of ['link', 'chosen', 'location']) assert.equal(persist.fromOf(src), src, src);
  for (const src of ['guess', 'weird', null, undefined, 1]) assert.equal(persist.fromOf(src), null, String(src));
  assert.equal(readRecord(saveRecord('v=4&c=temperate&a=&e=1', 'x', 'location', 'ES')).country, 'ES', 'a location country beside the fragment');
});

test('one climate shown: the reader\'s choice, else a link\'s still opening, else the location\'s proposal (shown as proposed), else none', async () => {
  await shown();
  const before = { climate: store.climate.peek(), proposed: store.proposedClimate.peek() };
  try {
    store.proposedClimate.value = 'Arid';
    assert.deepEqual(persist.climateShown.peek(), { zone: 'Temperate', proposed: false }, 'chosen wins over a proposal');
    store.climate.value = null;
    assert.deepEqual(persist.climateShown.peek(), { zone: 'Arid', proposed: true }, 'the proposal, marked proposed');
    delays.Tropical = 50;
    const opening = m.restore(await linkOf('Tropical', 3), { from: 'link' });
    assert.deepEqual(persist.climateShown.peek(), { zone: 'Tropical', proposed: false }, 'a link\'s climate while it opens');
    assert.equal(await opening, true);
    store.proposedClimate.value = null;
    store.climate.value = null;
    assert.deepEqual(persist.climateShown.peek(), { zone: null, proposed: false }, 'none');
  } finally { store.climate.value = before.climate ?? 'Temperate'; store.proposedClimate.value = before.proposed; }
});

test('a link\'s o= is looked up through the location step the view hands in (restore.ts provideLocationStep), its lookup held until it settles', async () => {
  await shown();
  const calls = [];
  const lookupsModule = await import('../src/islands/consortium/state/lookups.ts');
  let held = null;
  const before = restoreModule.provideLocationStep(async () => ({ settle: (how, saved) => { calls.push([how, saved, lookupsModule.lookups.peek()]); return new Promise((r) => { held = r; }); } }));
  try {
    const ids = (await realSource.pool('Mediterranean')).map((t) => t.id);
    const link = encodeLink({ climate: 'Mediterranean', country: null, site: UNSURE, members: ids.slice(0, 3), kept: [], removed: [], guests: [], crops: [], stage: null }, { Mediterranean: ids }, { origin: { lat: 37.39, lon: -5.98 } });
    assert.equal(await m.restore(link, { from: 'link', keep: true }), true);
    assert.equal(store.location.peek()?.source, 'link', 'the link\'s site, its lookup to come');
    await wait(0);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(0, 2), ['link', null]);
    assert.equal(calls[0][2], 1, 'one lookup held while it settles');
    held();
    await wait(0);
    assert.equal(lookupsModule.lookups.peek(), 0, 'released once settled');
    // A step that fails to load drops the link's location (as the chunk 404 did before the split).
    restoreModule.provideLocationStep(() => Promise.reject(new Error('chunk gone')));
    assert.equal(await m.restore(link + '&', { from: 'link', keep: true }), true);
    await wait(0);
    assert.equal(store.location.peek(), null, 'a link\'s location whose step cannot load goes');
    // None handed in: said in the console, then the link's location goes the same way.
    restoreModule.provideLocationStep(null);
    const logged = [], error = console.error;
    console.error = (msg) => { logged.push(String(msg)); };
    try {
      assert.equal(await m.restore(link + '&&', { from: 'link', keep: true }), true);
      await wait(0);
    } finally { console.error = error; }
    assert.ok(logged.some((l) => /no location step was provided/.test(l)), `never silent: ${logged}`);
    assert.equal(store.location.peek(), null);
  } finally { store.location.value = null; restoreModule.provideLocationStep(before); }
});
