// PP-B commit 0a: link v5 (plant-palette-architecture 8.1–8.3) and the place seams (3.1). The cases
// live in scripts/vectors/link-v5.json (convention palette-vectors: plain JSON in the link's own
// words, no TypeScript names), so the app's Rust code can run them; the adapter from those words to
// the core's ShareState is here. Beside the vectors: the save record and the arrival on each version,
// the country gate of the schema, the shape check of the vector file, emptyPlace and siteOf.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const { decodeLink, encodeLink, linkVersionStatus, linkOrigin, snapOrigin, isLongLink, bringsPlace, zoneOf, siteIdOf, emptyPlace, siteOf, siteInputsOf, NO_INPUTS, climateFor, LINK_VERSION } = core;
const grid = await import('../src/lib/climate/grid.ts');
const persist = await import('../src/islands/consortium/state/persist.ts');
const { saveRecord, readRecord } = persist;
const { arrival, placeOfSeed } = await import('../src/islands/consortium/state/arrival.ts');
const { state: schema } = await import('../src/islands/consortium/state/schema.ts');

const V = JSON.parse(readFileSync(new URL('vectors/link-v5.json', import.meta.url), 'utf8'));
const KNOWN_SCHEMAS = ['canopi-palette-link/5'];

// ---- the adapter: vector words <-> core values ----
const idOf = (name) => { const p = V.plants[name]; assert.ok(p, `plant ${name} is in the file`); return p.id; };
const nameOfId = new Map(Object.entries(V.plants).map(([n, p]) => [p.id, n]));
const knownOf = (lists) => Object.fromEntries(lists.map((l) => [zoneOf(l), Object.values(V.plants).filter((p) => p.lists.includes(l)).map((p) => p.id)]));
const SPOT = { l: 'light', w: 'water', q: 'wind', r: 'ground', h: 'height' };
function placeOf(name) {
  const words = V.places[name];
  assert.ok(words, `place ${name} is in the file`);
  const answered = Object.entries(SPOT).filter(([k]) => words[k]);
  const spot = answered.length ? { ...emptyPlace.spot, ...Object.fromEntries(answered.map(([k, f]) => [f, words[k]])) } : null;
  let soil = null;
  if (words.s === 'pots') soil = { from: 'pots' };
  else if (words.s?.startsWith('own.')) {
    const [, ph, tex] = words.s.split('.');
    const n = /^\d+$/.test(ph) ? Number(ph) / 10 : null;
    soil = { from: 'own', ph: n, word: n === null && ph !== '-' ? ph : null, texture: tex === '-' ? null : tex };
  }
  return { spot, soil, origin: words.o ?? null };
}
const originOf = (text) => { if (!text) return null; const [lat, lon] = text.split(',').map(Number); return { lat, lon }; };
function shareOf(s) {
  const { spot, soil } = placeOf(s.place);
  return {
    climate: zoneOf(s.climate), country: s.country, room: s.room, plot: s.plot_m2, period: s.period, spot, soil,
    members: s.members.map(idOf), removed: s.removed.map(idOf), guests: s.guests.map((g) => ({ id: idOf(g.plant), from: zoneOf(g.list) })),
  };
}
// The decoded state in the file's words.
function wordsOf(st) {
  return {
    climate: st.climate ? siteIdOf(st.climate) : null, country: st.country, room: st.room, plot_m2: st.plot, period: st.period,
    spot: st.spot, soil: st.soil,
    members: st.members.map((id) => nameOfId.get(id) ?? id), removed: st.removed.map((id) => nameOfId.get(id) ?? id),
    guests: st.guests.map((g) => ({ plant: nameOfId.get(g.id) ?? g.id, list: siteIdOf(g.from) })),
  };
}
const noticeOf = (n) => ({ unknown_count: n.unknownCount, cut: n.cut, newer: n.newer, unreadable: n.unreadable, period: n.period });
const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

// ---- the file ----
test('link-v5.json: a known schema id, and every plant and place a case names is in the file', () => {
  assert.ok(KNOWN_SCHEMAS.includes(V.schema), `schema ${V.schema}`);
  assert.equal(V.thresholds.link_version, LINK_VERSION);
  assert.equal(V.thresholds.max_link_ids, core.MAX_LINK_IDS);
  assert.equal(V.thresholds.max_plot_m2, core.MAX_PLOT_M2);
  assert.deepEqual(V.thresholds.period_ids, [...core.periodIds]);
  const names = new Set();
  for (const c of V.cases) {
    assert.ok(c.name && !names.has(c.name), `one case per name: ${c.name}`);
    names.add(c.name);
    const s = c.input.state;
    if (s) { [...s.members, ...s.removed, ...s.guests.map((g) => g.plant)].forEach(idOf); placeOf(s.place); }
    const e = c.expect.state;
    if (e) for (const n of [...(e.members ?? []), ...(e.removed ?? []), ...(e.guests ?? []).map((g) => g.plant)]) idOf(n);
  }
  for (const [name, p] of Object.entries(V.plants)) assert.equal(core.tokenOf(p.id, Object.values(V.plants).map((q) => q.id)), p.token, `${name}'s token`);
});

// ---- the cases ----
for (const c of V.cases) {
  test(`link v5: ${c.name}`, () => {
    const { input, expect } = c;
    if ('v' in input) { assert.equal(linkVersionStatus(input.v), expect.status); return; }
    if (input.state) {
      const origin = originOf(input.origin);
      assert.equal(encodeLink(shareOf(input.state), knownOf(input.lists), { origin, place: input.place }), expect.link);
      return;
    }
    const known = knownOf(input.lists);
    const d = decodeLink(input.link, known);
    if (expect.same_as) {
      const other = decodeLink(expect.same_as, known);
      assert.deepEqual(wordsOf(d.state), wordsOf(other.state));
      assert.deepEqual(d.notice, other.notice);
      return;
    }
    if (expect.notice) assert.deepEqual(noticeOf(d.notice), expect.notice);
    if (expect.state) assert.deepEqual(pick(wordsOf(d.state), Object.keys(expect.state)), expect.state);
    if ('brings_place' in expect) assert.equal(bringsPlace(input.link, d), expect.brings_place);
    // origin: the cell the link brings, as its text (null: none); reencoded: the decoded state written
    // back with the place tick and the cell read, so nothing the decoder dropped can come back.
    const o = linkOrigin(input.link);
    if ('origin' in expect) assert.equal(o && `${o.lat.toFixed(2)},${o.lon.toFixed(2)}`, expect.origin);
    if (expect.reencoded) assert.equal(encodeLink(d.state, known, { origin: o, place: true }), expect.reencoded);
  });
}

// The core may not import the climate reader, so its cell snap is checked here against the reader's
// own cell rule (src/lib/climate/grid.ts cellOf and centre, canopi-climate v0.2's 0.1° grid), on every
// cell-edge kind and a sweep of points.
test('link v5: an origin snaps to the centre of the climate grid\'s cell holding it', () => {
  const g = { cellDeg: 0.1, tileCells: 100 };
  const pts = [[45.764, 4.8357], [-33.8688, 151.2093], [40.7128, -74.006], [-22.9068, -43.1729], [45.7, 4.8], [0, 0], [-0.1, -0.1], [90, 180], [-90, -180], [10.01, 180], [48.9, 2.3], [-48.9, -2.3]];
  for (let i = 0; i < 500; i++) pts.push([((i * 7919) % 18000) / 100 - 90, ((i * 104729) % 36000) / 100 - 180]);
  for (const [lat, lon] of pts) {
    const c = grid.cellOf(g, lat, lon);
    const want = { lat: Math.round(grid.centerLat(g, c) * 100) / 100, lon: Math.round(grid.centerLon(g, c) * 100) / 100 };
    assert.deepEqual(snapOrigin({ lat, lon }), want, `${lat},${lon}`);
    assert.deepEqual(snapOrigin(want), want, `a centre is its own snap (${lat},${lon})`);
  }
  assert.equal(snapOrigin({ lat: 91, lon: 0 }), null);
  assert.equal(snapOrigin({ lat: NaN, lon: 0 }), null);
});

// The two limits are not vectors: a link at MAX_LINK_IDS tokens is 12,000 characters, past what a
// readable JSON case holds, so the Rust port tests them from these two descriptions.
test('link v5: at most MAX_LINK_IDS tokens per key are read, the rest counted as unknown', () => {
  const known = knownOf(['temperate']);
  const filler = 'AAAAAA'; // a valid token no list knows
  const d = decodeLink(`v=5&c=temperate&m=small&a=${filler.repeat(core.MAX_LINK_IDS)}obLD1O&e=1`, known);
  assert.deepEqual(d.state.members, [], 'apple is token MAX_LINK_IDS + 1: not read');
  assert.equal(d.notice.unknownCount, 2, 'the filler once and the one token past the cap');
  assert.equal(d.notice.unreadable, false);
  const e = decodeLink(`v=5&c=temperate&m=small&a=${filler.repeat(core.MAX_LINK_IDS - 1)}obLD1O&e=1`, known);
  assert.deepEqual(wordsOf(e.state).members, ['apple'], 'token MAX_LINK_IDS is read');
});
test('link v5: a link is long past LONG_LINK characters of the whole address', () => {
  assert.equal(core.LONG_LINK, 2000);
  assert.equal(isLongLink('x'.repeat(core.LONG_LINK)), false);
  assert.equal(isLongLink('x'.repeat(core.LONG_LINK + 1)), true);
});

test('link v5: an encoded place round-trips through decode', () => {
  for (const c of V.cases.filter((x) => x.input.state)) {
    const s = shareOf(c.input.state);
    const known = knownOf(c.input.lists);
    const d = decodeLink(encodeLink(s, known, { origin: originOf(c.input.origin), place: c.input.place }), known);
    assert.deepEqual(d.state.members.sort(), [...s.members].sort(), c.name);
    if (c.input.place) { assert.deepEqual(d.state.spot, s.spot, c.name); assert.deepEqual(d.state.soil, s.soil, c.name); }
    else { assert.equal(d.state.spot, null, c.name); assert.equal(d.state.country, null, c.name); }
  }
});

test('link v5: the private place kept beside a save fills only the keys the fragment lacks', () => {
  const known = knownOf(['temperate']);
  const d = decodeLink('v=5&c=temperate&m=small&a=obLD1O&l=shade&e=1', known, 'l=sun&s=pots&k=FR&m=field');
  assert.equal(d.state.spot.light, 'shade', 'the fragment wins');
  assert.deepEqual(d.state.soil, { from: 'pots' }, 'the place fills the soil');
  assert.equal(d.state.country, 'FR');
  assert.equal(d.state.room, 'small', 'm is not a place key');
});

// ---- the save record and the arrival on each version (8.2) ----
const AT = '2026-11-14T00:00:00Z';
test('the save record: only a v5 fragment is read back; v1–v4 (the old beta tool), v6 and no-v are not read', () => {
  const r = (fragment) => saveRecord(fragment, AT, 'chosen', null, 'l=sun');
  assert.deepEqual(readRecord(r('v=5&c=temperate&a=&e=1')), { fragment: 'v=5&c=temperate&a=&e=1', place: 'l=sun', at: AT, src: 'chosen' });
  for (const f of ['v=4&c=temperate&a=&e=1', 'v=1&c=temperate&a=', 'v=6&c=temperate&a=&e=1', 'c=temperate&a=&e=1', 'v=5.0&c=temperate&a=']) assert.equal(readRecord(r(f)), null, f);
  assert.equal(readRecord(JSON.stringify({ q: 'v=3&c=te', at: AT, src: null })), null, 'the beta tool\'s { q } save');
  assert.equal('oldRecord' in persist, false, 'no older-save path (owner 2026-11-17)');
});

test('the save record keeps a link\'s or a location\'s country beside the public fragment, and a place under 2000 characters', () => {
  const f = 'v=5&c=temperate&a=&e=1';
  assert.equal(readRecord(saveRecord(f, AT, 'link', 'FR')).country, 'FR');
  assert.equal(readRecord(saveRecord(f, AT, 'location', 'ES')).country, 'ES');
  assert.equal(readRecord(saveRecord(f, AT, 'chosen', 'DE')).country, undefined, 'a chosen country lives in canopi-country');
  assert.equal(readRecord(saveRecord(f, AT, null, null, 'l='.padEnd(2_100, 'x'))).place, '');
  assert.equal(readRecord(JSON.stringify({ fragment: f, at: AT, src: null })).place, '', 'a record without place reads unsure');
});

test('arrival: a v4 or v6 link in the fragment is a link (restore gives its notice); a v4 save is not restored', () => {
  for (const hash of ['#v=4&c=temperate&a=&e=1', '#v=6&c=temperate&a=&e=1']) assert.deepEqual(arrival({ hash, search: '' }, null, null), { kind: 'link', fragment: hash.slice(1) });
  const old = readRecord(saveRecord('v=4&c=temperate&a=&e=1', AT, null));
  assert.deepEqual(arrival({ hash: '', search: '' }, old, 'temperate'), { kind: 'start', climate: 'Temperate' });
});

test('a place seed (canopi-place) reads back room, plot size, spot and soil; nothing on damage', () => {
  const p = placeOfSeed('m=pots&z=6&l=shade&s=pots');
  assert.equal(p.room, 'pots');
  assert.equal(p.plot, 6);
  assert.equal(p.spot.light, 'shade');
  assert.deepEqual(p.soil, { from: 'pots' });
  assert.equal(placeOfSeed(null), null);
});

// ---- the country gate of the schema (8.1 k, 8.3) ----
test('schema: k goes in a link only with "Include my place" and never from a guess', () => {
  const values = (source) => ({ ...schema.valuesOf(schema.lists.saved), climate: 'Temperate', country: { code: 'FR', source } });
  assert.equal(schema.share(values('chosen'), { place: false }).country, null);
  assert.equal(schema.share(values('chosen'), { place: true }).country, 'FR');
  assert.equal(schema.share(values('location'), { place: true }).country, 'FR');
  assert.equal(schema.share(values('guess'), { place: true }).country, null);
  assert.equal(schema.share(values('chosen'), { place: false }).spot, null);
  assert.equal(schema.share(values('chosen'), { place: false }).soil, null);
});

test('schema: a link that brings no place keeps the reader\'s country and place; one that does replaces them', () => {
  const known = knownOf(['temperate']);
  schema.write({ country: { code: 'DE', source: 'chosen' }, spot: { ...emptyPlace.spot, light: 'shade' }, soil: { from: 'pots' } });
  for (const link of ['v=5&c=temperate&m=small&a=&k=FR&e=1', 'v=5&c=temperate&m=small&a=&l=unsure&e=1']) {
    const d = decodeLink(link, known);
    schema.apply(d.state, { countryFrom: 'link', bringsPlace: bringsPlace(link, d) });
    assert.deepEqual(schema.signals.country.peek(), { code: 'DE', source: 'chosen' }, link);
    assert.equal(schema.signals.spot.peek().light, 'shade', link);
  }
  const link = 'v=5&c=temperate&m=small&a=&k=FR&w=wet&e=1';
  const d = decodeLink(link, known);
  schema.apply(d.state, { countryFrom: 'link', bringsPlace: bringsPlace(link, d) });
  assert.deepEqual(schema.signals.country.peek(), { code: 'FR', source: 'link' });
  assert.deepEqual(schema.signals.spot.peek(), { ...emptyPlace.spot, water: 'wet' }, 'the whole place: light back to unsure');
  assert.deepEqual(schema.signals.soil.peek(), { from: 'map' });
});

// ---- the place seams (3.1) ----
test('emptyPlace: every answer unsure, no plot size, the soil map; frozen', () => {
  assert.deepEqual(emptyPlace, { room: 'unsure', plotM2: null, spot: { light: 'unsure', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' }, soil: { from: 'map' } });
  assert.ok(Object.isFrozen(emptyPlace) && Object.isFrozen(emptyPlace.spot));
});

test('siteOf: the Site fits() reads comes from the site inputs; a soil test pH gives the word, the soil map checks nothing', () => {
  const inputs = (edits, room) => siteInputsOf({ lookup: { lat: 0, lon: 0, climate: null, soil: { phH2o: 8, texture: null, filled: false, fillDistanceCells: 0, distanceCells: 0 }, regions: { wgsrpdL3: null, isoA2: null } }, room, edits });
  assert.deepEqual(siteOf(NO_INPUTS), { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' });
  assert.deepEqual(siteOf(inputs({ light: 'shade', drainage: 'wet', soilPh: 5 }, 'small')), { light: 'shade', soil: 'acid', water: 'wet', room: 'small' });
  assert.equal(siteOf(inputs({ soilPh: 8.0 })).soil, 'chalky', 'a pH gives the word');
  assert.equal(siteOf(inputs({ soilPh: 6.5 })).soil, 'neutral');
  assert.equal(siteOf(inputs({})).soil, 'unsure', 'the soil map checks nothing until PP-F');
});

test('climateFor: today is the historical slot; another period takes the context\'s scenario', () => {
  const slot = (period, scenario) => ({ period, scenario });
  const inputs = siteInputsOf({ lookup: { climate: { periods: [slot('1991-2020', 'historical'), slot('2041-2070', 'ssp245'), slot('2041-2070', 'ssp585')] } } });
  assert.deepEqual(climateFor({ inputs, scenario: 'ssp245' }, '1991-2020'), slot('1991-2020', 'historical'));
  assert.deepEqual(climateFor({ inputs, scenario: 'ssp585' }, '2041-2070'), slot('2041-2070', 'ssp585'));
  assert.equal(climateFor({ inputs, scenario: 'ssp245' }, '2071-2099'), null);
  assert.equal(climateFor({ inputs: NO_INPUTS, scenario: 'ssp245' }, '1991-2020'), null);
});
