// The consortium island's PlantSource over SQLite-WASM (src/islands/consortium/data/sqlite-source.ts
// and the open checks of data/load.ts; stream S1, design check §4). It runs the sqlite-wasm package's
// Node build on the invented fixture (scripts/fixtures/consortium-v2/export/), where every value is
// known, then a smoke test on the real install (public/data/consortium/, src/data/consortium-index.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync } from 'node:zlib';
import { writeFixtureExport, FIXTURE_GRID_SHA256 } from './fixtures/consortium-v2/make-fixture.mjs';

const { openBytes, LoadError } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');
const { fold } = await import('../src/lib/consortium/index.ts');
const { releaseIndex } = await import('../src/islands/consortium/data/search.ts');
const core = await import('../src/lib/consortium/index.ts');
const { suggest } = await import('../src/lib/consortium/suggest.ts');

const fixtureDir = new URL('fixtures/consortium-v2/export/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureDir), 'utf8'));
const gz = readFileSync(new URL(manifest.files[0].file, fixtureDir));
const raw = () => new Uint8Array(gunzipSync(gz));
const expected = { releaseId: manifest.release_id, climates: manifest.climates.map((c) => c.climate_zone) };
const failure = async (p) => { try { await p; } catch (err) { assert.ok(err instanceof LoadError, String(err)); return err.failure; } return null; };

// node:sqlite on a copy of the fixture, as the oracle for counts.
const oracleDir = mkdtempSync(join(tmpdir(), 'consortium-source-'));
const oraclePath = join(oracleDir, 'db.sqlite');
writeFileSync(oraclePath, gunzipSync(gz));
const oracle = new DatabaseSync(oraclePath, { readOnly: true });
test.after(() => { oracle.close(); rmSync(oracleDir, { recursive: true, force: true }); });
const idOf = (name) => oracle.prepare('SELECT id FROM plants WHERE canonical_name = ?').get(name).id;

const images = { [idOf('Castanea sativa')]: '/data/consortium/images/castanea.jpg', [idOf('Quercus robur')]: '/data/consortium/images/quercus.jpg' };
const opened = await openBytes(raw(), expected);
const source = createSqliteSource(opened.db, { images });

// ---- open (§4 "open") ----

test('open: application_id, user_version, the release id and the climates are checked', async () => {
  assert.equal(await failure(openBytes(raw(), { ...expected, releaseId: 'r-0000000000000000' })), 'schema');
  assert.equal(await failure(openBytes(raw(), { ...expected, climates: ['Tropical', 'Temperate'] })), 'schema');
  const dir = mkdtempSync(join(tmpdir(), 'consortium-variant-'));
  try {
    for (const [opts, want] of [[{ userVersion: 1 }, 'schema'], [{ applicationId: 0x12345678 }, 'schema']]) {
      const out = join(dir, String(want) + Object.keys(opts)[0]);
      const { file } = await writeFixtureExport(out, opts);
      const bytes = new Uint8Array(gunzipSync(readFileSync(join(out, file))));
      assert.equal(await failure(openBytes(bytes, expected)), want, JSON.stringify(opts));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.equal(await failure(openBytes(new Uint8Array(4096).fill(0x5a), expected)), 'damaged');
});

test('info and countries come from meta and the countries table', () => {
  assert.deepEqual(source.info(), { releaseId: manifest.release_id, schemaVersion: 4, builtAt: manifest.generated_at, climates: expected.climates, griisAvailable: true, climateGrid: FIXTURE_GRID_SHA256, rangesReview: 'estimate_not_reviewed', frostRecorded: true });
  const countries = source.countries();
  assert.equal(countries.get('FR').invasiveChecked, true);
  assert.equal(countries.get('TW').invasiveChecked, false);
  assert.equal(countries.size, oracle.prepare('SELECT count(*) n FROM countries').get().n);
});

// ---- pool ----

test('pool: every plant placed in the climate, with that climate\'s placement', async () => {
  for (const c of expected.climates) {
    const pool = await source.pool(c);
    const n = oracle.prepare('SELECT count(*) n FROM placements WHERE climate_zone = ?').get(c).n;
    assert.equal(pool.length, n, c);
    assert.equal(new Set(pool.map((t) => t.id)).size, n);
  }
  const t = (await source.pool('Temperate')).find((x) => x.canonical_name === 'Malus domestica');
  const m = (await source.pool('Mediterranean')).find((x) => x.canonical_name === 'Malus domestica');
  assert.equal(t.stratum.value, 'high');
  assert.equal(m.stratum.value, 'medium');
  assert.deepEqual(t.phases, { start: 'secondary_i', end: 'secondary_iii', sources: ['sample-review'] });
  assert.equal('origin' in t, false, 'the climate\'s own plant is not stamped');
});

test('pool: a Taxon carries names, traits, warnings, functions and the self-hosted image only', async () => {
  const pool = await source.pool('Temperate');
  const by = (name) => pool.find((x) => x.canonical_name === name);
  const chestnut = by('Castanea sativa');
  assert.match(chestnut.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.equal(chestnut.genus, 'Castanea');
  assert.equal(chestnut.family, 'Fagaceae');
  assert.equal(chestnut.role, 'crop');
  assert.equal(chestnut.names.fr, 'Châtaignier');
  assert.equal(chestnut.names.en, 'European chestnut');
  assert.equal(chestnut.names.ko, undefined);
  assert.deepEqual(chestnut.traits.height_m, { min: 20, max: 35 });
  assert.equal(chestnut.traits.width_max_m, 15);
  assert.equal(chestnut.traits.sun, true);
  assert.equal(chestnut.traits.full_shade, false);
  assert.deepEqual(chestnut.traits.soil_ph, { min: 4.5, max: 6.5 });
  assert.equal(chestnut.traits.habit, 'Tree');
  assert.deepEqual(chestnut.image, { url: images[chestnut.id], credit: 'Invented Photographer', licence: 'CC BY-SA 4.0', source_page_url: 'https://commons.wikimedia.org/wiki/File:Castanea_sativa_fixture.jpg' });
  assert.deepEqual(chestnut.functions.map((f) => f.function).sort(), ['pollinator_forage', 'wildlife_habitat']);
  assert.ok(chestnut.functions.every((f) => f.method && Array.isArray(f.sources)));
  assert.equal(chestnut.warnings.toxicity.level, 'None');
  // An image the index does not map stays null: never the export's remote URL.
  assert.equal(by('Fragaria vesca').image, null);
  assert.equal(by('Quercus robur').image.credit, null, 'CC0: no credit');
  assert.equal(by('Phacelia tanacetifolia').traits.height_m, null, 'height not recorded');
  assert.equal(by('Rubus idaeus').functions, null, 'no rows: not curated, never none');
  const robinia = by('Robinia pseudoacacia');
  assert.deepEqual(robinia.warnings.invasive_in.map((r) => r.country).sort(), ['DE', 'ES', 'FR', 'IT', 'ZA'], 'GRIIS, and ES from the atlas (4.3)');
  assert.deepEqual(robinia.warnings.invasive_in[0].sources, ['griis']);
  assert.equal(robinia.warnings.weed_potential, true);
  assert.equal(robinia.warnings.toxicity.level, 'Severe');
  assert.deepEqual(by('Pyrus communis').warnings.invasive_in, []);
  assert.equal(by('Pyrus communis').warnings.toxicity, null);
  assert.equal(by('Juglans regia').warnings.allelopathic, true);
  assert.ok(Array.isArray(by('Trifolium repens').traits.pollinators) || by('Trifolium repens').traits.pollinators === null);
  const zingiber = (await source.pool('Mediterranean')).find((x) => x.canonical_name === 'Zingiber officinale');
  assert.equal(zingiber.stratum, null);
  assert.equal(zingiber.phases, null);
});

// ---- schemas 2 and 3: climate ranges, Köppen shares, native areas (P5 commit 0; the ranges rebuild) ----

test('pool: a Taxon carries its observed climate range (cultivation included) or null when none is recorded', async () => {
  const pool = await source.pool('Temperate');
  const by = (name) => pool.find((x) => x.canonical_name === name);
  // The fixture's rule (make-fixture.mjs climateRows): Castanea is plant 1, Temperate, shifted by -1 °C.
  // Schema 3's columns: blocks 40 + i, each end from the row's own source, no weak row.
  const s3 = { blocks: 40, lowSource: 'gbif_occurrences', highSource: 'gbif_occurrences', weak: false };
  assert.deepEqual(by('Castanea sativa').climate, {
    source: 'gbif_occurrences',
    tminCold: { low: -15, median: -4, high: 2.5, count: 200, basis: 'thinned_cells', ...s3 },
    tmaxWarm: { low: 18, median: 24, high: 30, count: 200, basis: 'thinned_cells', ...s3 },
    // Schema 3: the year's warmth (not shifted, as aridity).
    tmeanYear: { low: 5, median: 10.5, high: 15, count: 200, basis: 'thinned_cells', ...s3 },
    // and an annual's summer warmth (schema 3 tmean_warm; not shifted).
    tmeanWarm: { low: 12, median: 18, high: 23, count: 200, basis: 'thinned_cells', ...s3 },
    aridity: { low: 0.55, median: 1.05, high: 2.1, count: 200, basis: 'thinned_cells', ...s3 },
    cells: 200,
    nativeShare: 0.2,
  });
  assert.equal(by('Phacelia tanacetifolia').climate, null, 'no range_source: "range not recorded", never a fit');
  assert.equal(by('Castanea sativa').areasKnown, true);
  assert.equal(by('Phacelia tanacetifolia').areasKnown, false, 'WCVP did not match it: native here is unknown');
  // No placement borrowed from another climate in a curated pool (S5c gives borrowed plants an origin).
  assert.ok(pool.every((t) => t.origin === undefined));
});

test('details: the Köppen shares of a plant\'s observed cells, largest first, rare classes included (the view hides < 1 %)', async () => {
  const d = await source.details(idOf('Castanea sativa'), 'Temperate', 'en');
  assert.deepEqual(d.koppen[0], { code: 'Cfb', share: 0.5, cells: 100 });
  assert.deepEqual(d.koppen.map((k) => k.share), [...d.koppen.map((k) => k.share)].sort((a, b) => b - a));
  assert.ok(d.koppen.some((k) => k.share < 0.01), 'a rare class is read; Details hides it');
  assert.ok(d.sources.gbif_occurrences, 'the range source is cited');
  assert.deepEqual((await source.details(idOf('Phacelia tanacetifolia'), 'Temperate', 'en')).koppen, []);
});

test('interactions: no-climate rows plus this climate\'s yield gains, with notes, agent names and sources in order', async () => {
  const rows = await source.interactions('Temperate');
  const n = oracle.prepare("SELECT count(*) n FROM interactions WHERE climate_zone IS NULL OR climate_zone = 'Temperate'").get().n;
  assert.equal(rows.length, n);
  assert.ok(!rows.some((r) => r.climate_zone === 'Tropical'));
  const walnut = rows.find((r) => r.type === 'allelopathic_harm');
  assert.deepEqual(walnut.subject, { name: 'Juglans regia', rank: 'species' });
  assert.deepEqual(walnut.object, { name: 'Malus', rank: 'genus' });
  assert.equal(walnut.severity, 'high');
  assert.equal(walnut.note.fr.startsWith('La juglone'), true);
  assert.deepEqual(walnut.sources, ['crawford-2010']);
  const fly = (await source.interactions('Tropical')).find((r) => r.agent === 'Anastrepha obliqua');
  assert.deepEqual(fly.agent_names, { names: { en: 'West Indian fruit fly', pt: 'mosca-das-frutas' }, sources: ['eppo', 'wikipedia'] });
  assert.deepEqual(fly.sources, ['eppo', 'eppo-distribution']);
  assert.equal(rows.find((r) => r.type === 'shared_pest' && r.severity === 'low').note, null);
});

test('placements: each plant in every curated climate; labels by locale', async () => {
  const chestnut = idOf('Castanea sativa'), ginger = idOf('Zingiber officinale');
  const map = await source.placements([chestnut, ginger, 'not-a-plant']);
  assert.deepEqual(Object.keys(map.get(chestnut)).sort(), ['Mediterranean', 'Temperate']);
  assert.deepEqual(map.get(chestnut).Temperate, { role: 'crop', stratum: 'emergent', start: 'secondary_i', end: 'climax', source: 'sample-review' });
  assert.deepEqual(map.get(ginger).Mediterranean, { role: 'crop', stratum: null, start: null, end: null, source: null });
  assert.equal(map.has('not-a-plant'), false);
  const labels = await source.labels('fr');
  assert.equal(labels.moisture_use.High.fr, 'Élevée');
  assert.equal(labels.toxicity.Severe.fr, 'Grave');
});

test('details: reasons per region, layer values in run order, sources cited, placements elsewhere', async () => {
  const malus = idOf('Malus domestica');
  const d = await source.details(malus, 'Temperate', 'fr');
  assert.equal(d.id, malus);
  assert.equal(d.climate, 'Temperate');
  assert.deepEqual(d.reasons.map((r) => r.region).sort(), ['asia_temperate', 'europe']);
  assert.ok(d.reasons.every((r) => typeof r.text.en === 'string' && r.source));
  assert.deepEqual(Object.keys(d.placements).sort(), ['Mediterranean', 'Temperate']);
  const bloom = d.layerValues.filter((v) => v.field === 'bloom_months');
  assert.equal(bloom.length, 2);
  assert.ok(bloom.every((v) => v.kind === 'derived' && v.scope.hemisphere));
  for (const id of [...d.reasons.map((r) => r.source), ...d.layerValues.map((v) => v.source)]) assert.ok(d.sources[id]?.label, id);
  const hazel = await source.details(idOf('Corylus avellana'), 'Temperate', 'en');
  assert.deepEqual(hazel.layerValues.find((v) => v.field === 'bloom_months').months, ['Dec', 'Jan', 'Feb', 'Mar'], 'a run over the new year keeps its order');
  assert.equal(hazel.layerValues[0].scope, null);
  const oak = await source.details(idOf('Quercus robur'), 'Temperate', 'en');
  const wind = oak.layerValues.find((v) => v.field === 'tolerates_wind');
  assert.equal(wind.flag, true);
  assert.equal(wind.months, null);
  assert.equal(wind.kind, 'llm');
  assert.equal(oak.image.url, images[idOf('Quercus robur')]);
  // Sowing ships only in Temperate.
  const onion = await source.details(idOf('Allium cepa'), 'Temperate', 'en');
  assert.deepEqual(onion.layerValues.find((v) => v.field === 'sowing_months').months, ['Mar', 'Apr']);
  const robinia = await source.details(idOf('Robinia pseudoacacia'), 'Temperate', 'en');
  assert.deepEqual(robinia.invasiveIn.map((r) => r.country).sort(), ['DE', 'ES', 'FR', 'IT', 'ZA']);
  assert.ok(robinia.sources.griis);
});

// ---- names and folded search (A6; PP-C c1: canopi-types normalization v1, data/search.ts) ----

test('names and search: folded by normalization v1 (NFKD, lower case, marks off, ß and ς folded, punctuation splits tokens), word prefix, never LIKE', async () => {
  assert.equal(fold('Châtaignier'), 'chataignier');
  assert.equal(fold('TRÈFLE Blanc'), 'trefle blanc');
  assert.equal(fold('Ёлка'), 'елка', 'Cyrillic marks go');
  assert.equal(fold('Ἀμπέλι'), 'αμπελι', 'Greek marks go');
  // v1 (coordinator row 2026-11-17, the app's rule): NFKD splits Korean syllables into jamo and kana
  // voicing is a mark, folded off; œ and æ stay as they are.
  assert.ok(fold('백합').startsWith(fold('배')), 'v1: 배 (pear) is a prefix of 백합 (lily)');
  assert.equal(fold('ばら'), fold('はら'), 'v1: kana voicing folded off');
  assert.equal(fold('Weißdorn'), 'weissdorn');
  assert.notEqual(fold('Cœur'), fold('coeur'), 'v1: œ is not written out');
  assert.equal(fold("Carleton's soap/pod"), 'carleton s soap pod', 'punctuation splits tokens');
  const extra = releaseIndex({ lang: 'de', names: [{ id: 'a', canonical: 'Crataegus monogyna', names: { de: 'Weißdorn' } }, { id: 'b', canonical: 'Pyrus pyrifolia', names: { ko: '배나무' } }, { id: 'e', canonical: 'Xus', names: { fr: 'Cœur de bœuf' } }] });
  assert.deepEqual(extra('weissdorn').map((h) => h.id), ['a']);
  assert.deepEqual(extra('Weißd').map((h) => h.id), ['a']);
  assert.deepEqual(extra('배나').map((h) => h.id), ['b']);
  assert.deepEqual(extra('bœuf').map((h) => h.id), ['e']);
  assert.deepEqual(extra('boeuf').map((h) => h.id), [], 'v1: œ is its own letter');
  const names = await source.names('fr');
  assert.equal(names.length, oracle.prepare('SELECT count(*) n FROM plants').get().n);
  const chestnut = names.find((n) => n.canonical === 'Castanea sativa');
  assert.deepEqual(chestnut.names, { en: 'European chestnut', fr: 'Châtaignier' });
  const search = releaseIndex({ names, lang: 'fr' });
  const hits = (q) => search(q).map((h) => names.find((n) => n.id === h.id).canonical);
  assert.deepEqual(hits('chataig'), ['Castanea sativa']);
  assert.deepEqual(hits('Trefle'), ['Trifolium repens']);
  assert.deepEqual(hits('phacé'), ['Phacelia tanacetifolia']);
  assert.deepEqual(hits('oak').sort(), ['Quercus ilex', 'Quercus robur'], 'an English name on the French page (other languages tier)');
  assert.deepEqual(hits('ak'), [], 'word prefix: "ak" is inside "oak", not at a word start');
  assert.equal(hits('quercus r')[0], 'Quercus robur', 'the whole query as a prefix first');
  assert.deepEqual(hits('50%_'), []);
  assert.deepEqual(hits(''), []);
  assert.deepEqual(hits('c'), [], 'v1: a one-letter query is too short');
  // Scripts written without spaces match inside the name.
  const zh = releaseIndex({ names: await source.names('zh'), lang: 'zh' });
  assert.deepEqual(zh('洲栗').map((h) => h.id), [idOf('Castanea sativa')]);
  // Exact and prefix matches rank first.
  assert.equal(hits('olive')[0], 'Olea europaea');
});

// ---- the real install ----

const ROOT = new URL('../', import.meta.url);
const indexPath = new URL('src/data/consortium-index.json', ROOT);
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : null;
const realFile = index && new URL(`public${index.files[0].url}`, ROOT);

test('real install: opens with the index, every pool and image path, and 9 plants with every answer unsure', { skip: !(realFile && existsSync(realFile)) && 'no real install' }, async () => {
  const real = await openBytes(new Uint8Array(gunzipSync(readFileSync(realFile))), { releaseId: index.release_id, climates: index.climates });
  try {
    const src = createSqliteSource(real.db, { images: index.images });
    assert.equal(src.info().releaseId, index.release_id);
    for (const c of index.climates) {
      const pool = await src.pool(c);
      assert.deepEqual(pool.map((t) => t.canonical_name).sort(), [...index.names[c]].sort(), c);
      for (const t of pool) if (t.image) assert.match(t.image.url, /^\/data\/consortium\/images\//);
    }
    const temperate = await src.pool('Temperate');
    const s = suggest(temperate, { site: core.UNSURE_SITE, interactions: await src.interactions('Temperate'), country: null, countryStatus: 'none' });
    assert.equal(s.members.length, 9, 'A7: Room unsure suggests 9');
    const names = await src.names('fr');
    assert.ok(releaseIndex({ names, lang: 'fr' })('chataig').length >= 1);
  } finally { real.db.close(); }
});

// ---- store: pool loading, guests, country status, source replacement (src/islands/consortium/store.ts) ----

const store = await import('../src/islands/consortium/store.ts');
const { DEFAULT_SITE } = await import('../src/islands/consortium/state/schema.ts');
const tick = () => new Promise((r) => setTimeout(r, 0));
// A PlantSource over the fixture that counts pool reads and can fail them.
function counting(base = source, { fail = () => false } = {}) {
  const reads = [];
  return {
    reads,
    src: {
      ...base,
      info: () => base.info(),
      countries: () => base.countries(),
      pool: (c) => { reads.push(c); return fail(c) ? Promise.reject(new Error(`no table for ${c}`)) : base.pool(c); },
      interactions: (c) => base.interactions(c),
    },
  };
}
function reset() {
  store.setSource(null);
  store.pools.value = {};
  store.interactionSets.value = {};
  store.climate.value = null;
  store.guests.value = {};
  store.members.value = [];
  store.removed.value = [];
  store.country.value = { code: null, source: null };
  store.site.value = { ...DEFAULT_SITE };
  store.load.value = { status: 'ready', error: null };
}
const quiet = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

test('store: a pool read that fails after the database opened is damage, and a later call reads again', async () => {
  reset();
  let broken = true;
  const { src, reads } = counting(source, { fail: () => broken });
  store.setSource(src);
  assert.equal(await quiet(() => store.loadPool('Temperate')), null);
  assert.deepEqual(store.load.value, { status: 'failed', error: 'damaged' });
  assert.equal(store.pools.value.Temperate, undefined, 'never a partial pool');
  broken = false;
  assert.ok((await store.loadPool('Temperate')).length > 0);
  assert.deepEqual(reads, ['Temperate', 'Temperate']);
  assert.ok(store.interactionSets.value.Temperate.length > 0);
  // Read once: later calls share it.
  await store.loadPool('Temperate');
  assert.equal(reads.length, 2);
});

test('store: watchPools reads the chosen and guest climates once each, and never retries a failure in a loop', async () => {
  reset();
  const { src, reads } = counting(source, { fail: (c) => c === 'Tropical' });
  const stop = store.watchPools();
  try {
    store.climate.value = 'Temperate';
    await tick();
    assert.deepEqual(reads, [], 'nothing before the database is open');
    store.setSource(src);
    await tick(); await tick();
    assert.deepEqual(reads, ['Temperate']);
    assert.ok(store.pool.value.length > 0);
    store.guests.value = { [idOf('Vitis vinifera')]: 'Mediterranean' };
    await tick(); await tick();
    assert.deepEqual(reads, ['Temperate', 'Mediterranean'], 'a pool arriving does not re-run the effect');
    await quiet(async () => { store.climate.value = 'Tropical'; for (let i = 0; i < 5; i++) await tick(); });
    assert.deepEqual(reads, ['Temperate', 'Mediterranean', 'Tropical'], 'a failed read is tried once, not looped');
    assert.equal(store.load.value.status, 'failed');
  } finally { stop(); }
  store.climate.value = 'Mediterranean';
  await tick();
  assert.equal(reads.length, 3, 'disposed');
});

test('store: a guest whose list is still loading is never dropped silently; Suggest waits for it', async () => {
  reset();
  const vitis = idOf('Vitis vinifera');
  store.setSource(source);
  store.climate.value = 'Temperate';
  await store.loadPool('Temperate');
  store.guests.value = { [vitis]: 'Mediterranean' };
  store.members.value = [vitis];
  assert.deepEqual(store.guestsPending.value, ['Mediterranean']);
  assert.deepEqual(store.missingMembers.value, { loading: [vitis], unlisted: [] });
  assert.equal(store.suggestMembers(), false);
  assert.deepEqual(store.members.value, [vitis], 'a refused suggestion changes nothing');
  await store.loadPool('Mediterranean');
  assert.deepEqual(store.guestsPending.value, []);
  assert.deepEqual(store.missingMembers.value, { loading: [], unlisted: [] });
  assert.deepEqual(store.memberTaxa.value[0].origin, { list: 'Mediterranean', kind: 'guest' });
  assert.equal(store.suggestMembers(), true);
  assert.equal(store.members.value[0], vitis, 'the guest already there (the seed) is a member of the suggestion');
  assert.ok(store.members.value.length > 1);
  // An id not in its list once read is "unlisted", not loading.
  store.members.value = [...store.members.value, '00000000-f1c7-4000-8000-ffffffffffff'];
  assert.deepEqual(store.missingMembers.value.unlisted, ['00000000-f1c7-4000-8000-ffffffffffff']);
});

test('store: flagContext keeps "no country" apart from "not checked"', () => {
  reset();
  store.setSource(source);
  const checked = [...source.countries()].find(([, v]) => v.invasiveChecked)?.[0];
  assert.ok(checked, 'the fixture has a checked country');
  assert.equal(store.flagContext.value.countryStatus, 'none');
  store.country.value = { code: 'ZZ', source: 'chosen' };
  assert.equal(store.flagContext.value.countryStatus, 'unchecked');
  store.country.value = { code: checked, source: 'chosen' };
  assert.equal(store.flagContext.value.countryStatus, 'checked');
});

test('store: setSource closes the database before it (Retry), and a read of the old one neither writes nor fails', async () => {
  reset();
  const closed = [];
  let release;
  const slow = { ...source, info: () => source.info(), countries: () => source.countries(), interactions: (c) => source.interactions(c), pool: () => new Promise((_, reject) => { release = () => reject(new Error('database closed')); }) };
  store.setSource(slow, () => closed.push('first'));
  const pending = store.loadPool('Temperate');
  store.setSource(source, () => closed.push('second'));
  assert.deepEqual(closed, ['first']);
  release();
  assert.equal(await pending, null);
  assert.deepEqual(store.load.value, { status: 'ready', error: null }, 'the old read does not fail the new load');
  assert.equal(store.pools.value.Temperate, undefined);
  assert.ok((await store.loadPool('Temperate')).length > 0, 'the new source reads');
  store.setSource(null);
  assert.deepEqual(closed, ['first', 'second']);
  assert.equal(store.source.value, null);
});

// ---- schema 4 (PP-C commit 0): the optional tables and the release-wide names ----

test('schema 4: Details reads disputes, audiences, trait sources, frost, toxic parts and gbif_records', async () => {
  const d = (name, c) => source.details(idOf(name), c, 'en');
  const hedera = await d('Hedera helix', 'Mediterranean');
  assert.deepEqual(hedera.disputes, [{ field: 'toxicity', kind: 'queue', value: 'Moderate', unit: null, derived: false, scope: null, source: 'ncsu_plant_toolbox' }]);
  assert.deepEqual(hedera.traitSources.map((t) => [t.field, t.source, t.scope]), [['frost_tender', 'pfaf', 'GB'], ['toxicity', 'canopi-correction', null]]);
  assert.equal(hedera.sources.ncsu_plant_toolbox.label, 'NC State Extension Gardener Plant Toolbox');
  assert.equal(hedera.sources['canopi-correction'].label, 'Canopi reader correction');
  const castanea = await d('Castanea sativa', 'Temperate');
  assert.deepEqual(castanea.disputes.map((x) => [x.field, x.kind, x.value, x.unit, x.derived]), [['tmean_year.low', 'range', '9.5', 'C', true], ['tmin_cold.low', 'range', '-10.0', 'C', false]]);
  assert.equal(typeof castanea.gbifRecords === 'number' || castanea.gbifRecords === null, true);
  // A flag-only row beside a NULL toxicity and beside 'None'.
  assert.deepEqual((await d('Pyrus communis', 'Temperate')).disputes.map((x) => [x.field, x.value, x.source]), [['toxicity', null, 'pfaf']]);
  assert.deepEqual((await d('Corylus avellana', 'Temperate')).disputes.map((x) => [x.field, x.value]), [['toxicity', null]]);
  assert.deepEqual((await d('Olea europaea', 'Mediterranean')).disputes.map((x) => [x.field, x.value, x.scope]), [['plant_invasive', 'Invasive', 'AU']]);
  assert.deepEqual((await d('Malus domestica', 'Temperate')).audiences, [{ who: 'pets', level: null, source: 'aspca' }]);
  assert.deepEqual((await d('Taxus baccata', 'Temperate')).audiences, [{ who: 'livestock', level: 'Severe', source: 'merck_vet_manual' }]);
  assert.deepEqual((await d('Zingiber officinale', 'Tropical')).traitSources.map((t) => t.source), ['canopi-knowledge']);
  // Frost: the release has a row, so a plant without one reads [] ("not recorded"), Mangifera its fact.
  assert.equal(source.info().frostRecorded, true);
  assert.deepEqual((await d('Mangifera indica', 'Tropical')).frost, [{ kind: 'ktmp', valueC: -1, frostClass: null, variety: null, coarse: false, source: 'ecocrop', scopeCountry: null }]);
  assert.deepEqual(castanea.frost, []);
  // 4.2 toxic parts, whole plant first, the bare part before its conditioned forms.
  const parsley = await d('Petroselinum crispum', 'Mediterranean');
  assert.deepEqual(parsley.toxicityParts.map((p) => [p.part, p.condition]), [['whole_plant', 'large_amounts'], ['whole_plant', 'skin_contact'], ['essential_oil', null], ['seeds', 'pregnancy']]);
  assert.deepEqual((await d('Manihot esculenta', 'Tropical')).toxicityParts.map((p) => [p.part, p.condition, p.source]), [['roots', null, 'pfaf'], ['roots', 'raw', 'ncsu_plant_toolbox']]);
  assert.equal((await d('Allium cepa', 'Temperate')).toxicityParts[0].genusWide, true);
  assert.deepEqual((await d('Taxus baccata', 'Temperate')).toxicityParts, [{ who: 'livestock', part: 'leaves', condition: null, genusWide: false, source: 'merck_vet_manual' }]);
});

// Schema 4.3 (canopi-data docs/website-handoff/2026-11-17-invasive-scope.md): plant_invasive_areas,
// each source's areas within a country, per source (Details only; the pool keeps country level).
test('schema 4.3: plant_invasive_areas gives each source its areas within the country; a pair with no rows is the whole country', async () => {
  const d = (name, climate) => source.details(idOf(name), climate, 'en');
  // The Arundo donax pattern (format note): the atlas names Baleares and mainland Spain, the catálogo Canarias.
  const tropaeolum = await d('Tropaeolum majus', 'Temperate');
  assert.deepEqual(tropaeolum.invasiveIn, [{ country: 'ES', sources: ['atlas_aloctonas_es'] }], 'the plant_invasive row: the wider scope');
  assert.deepEqual(tropaeolum.invasiveAreas, [
    { country: 'ES', source: 'atlas_aloctonas_es', areas: ['BAL', 'SPA'] },
    { country: 'ES', source: 'es_catalogo', areas: ['CNY'] },
  ]);
  assert.match(tropaeolum.sources.atlas_aloctonas_es.label, /expert atlas, not a legal list/, 'the atlas credited by its label');
  assert.ok(tropaeolum.sources.es_catalogo, 'a source named only in the areas is credited too');
  // The Ricinus pattern: one source covering all three areas (the whole country) beside a narrower one.
  assert.deepEqual((await d('Robinia pseudoacacia', 'Temperate')).invasiveAreas, [
    { country: 'ES', source: 'atlas_aloctonas_es', areas: ['BAL', 'CNY', 'SPA'] },
    { country: 'ES', source: 'es_catalogo', areas: ['CNY'] },
  ]);
  // One source naming part of the country.
  const guava = await d('Psidium guajava', 'Tropical');
  assert.deepEqual(guava.invasiveAreas, [{ country: 'ES', source: 'atlas_aloctonas_es', areas: ['CNY'] }]);
  assert.ok(guava.invasiveIn.some((r) => r.country === 'AU'), 'its whole-country GRIIS rows stay country level');
  // A pair with an area code the reader has no words for falls back to country level (never wrong).
  const elaeagnus = await d('Elaeagnus umbellata', 'Temperate');
  assert.ok(elaeagnus.invasiveIn.some((r) => r.country === 'ES'), 'still invasive in ES');
  assert.deepEqual(elaeagnus.invasiveAreas, [], 'its ES rows dropped: an area outside the closed list');
  assert.deepEqual((await d('Castanea sativa', 'Temperate')).invasiveAreas, []);
  assert.deepEqual([...core.invasiveAreaCodes], ['BAL', 'CNY', 'SPA']);
  assert.deepEqual([...core.invasiveSources], ['griis', 'es_catalogo', 'atlas_aloctonas_es']);
});

test('schema 4.3: an unknown source in plant_invasive_areas drops that pair to country level', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'consortium-areas-'));
  try {
    const { file } = await writeFixtureExport(join(dir, 'x'), { edit: (db) => db.exec(`
      INSERT INTO sources VALUES ('pt_lista', 'Lista Nacional (PT)', NULL, NULL, NULL);
      INSERT INTO plant_invasive_areas VALUES ((SELECT plant FROM plants WHERE canonical_name = 'Psidium guajava'), 'ES', 'pt_lista', 'SPA')`) });
    const db = (await openBytes(new Uint8Array(gunzipSync(readFileSync(join(dir, 'x', file)))), expected)).db;
    const g = await createSqliteSource(db, { images: {} }).details(idOf('Psidium guajava'), 'Tropical', 'en');
    assert.deepEqual(g.invasiveAreas, []);
    assert.ok(g.invasiveIn.some((r) => r.country === 'ES'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('schema 4: a value the reader does not know skips its row, never the plant', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'consortium-vocab-'));
  try {
    const { file } = await writeFixtureExport(join(dir, 'x'), { edit: (db) => db.exec(`
      INSERT INTO plant_disputes VALUES (1, 'flammability', 'queue', 'High', NULL, 0, NULL, 'pfaf');
      INSERT INTO plant_toxicity_parts VALUES (1, NULL, 'thorns', NULL, 0, 'pfaf');
      INSERT INTO layer_values (plant, field, flag, source, kind) VALUES (1, 'tolerates_salt', 1, 'pfaf', 'recorded')`) });
    const db = (await openBytes(new Uint8Array(gunzipSync(readFileSync(join(dir, 'x', file)))), expected)).db;
    const d = await createSqliteSource(db, { images: {} }).details(idOf('Castanea sativa'), 'Temperate', 'en');
    assert.ok(!d.disputes.some((x) => x.field === 'flammability'));
    assert.deepEqual(d.toxicityParts, []);
    assert.ok(!d.layerValues.some((v) => v.field === 'tolerates_salt'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('schema 3: the export opens; every schema-4 field is null (the feature off), no frost line', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'consortium-s3-'));
  try {
    const { file } = await writeFixtureExport(join(dir, 'x'), { schema: 3 });
    const db = (await openBytes(new Uint8Array(gunzipSync(readFileSync(join(dir, 'x', file)))), expected)).db;
    const s3 = createSqliteSource(db, { images: {} });
    assert.equal(s3.info().schemaVersion, 3);
    assert.equal(s3.info().frostRecorded, false);
    const d = await s3.details(idOf('Hedera helix'), 'Mediterranean', 'en');
    assert.deepEqual([d.disputes, d.audiences, d.traitSources, d.frost, d.toxicityParts, d.invasiveAreas], [null, null, null, null, null, null]);
    assert.ok((await s3.names('fr')).length > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('names(): every plant of the release with its integer, its lists, en and the page language', async () => {
  const all = await source.names('fr');
  assert.equal(all.length, oracle.prepare('SELECT count(*) n FROM plants').get().n);
  const okra = all.find((p) => p.canonical === 'Abelmoschus esculentus');
  assert.deepEqual(okra, { plant: oracle.prepare("SELECT plant FROM plants WHERE canonical_name = 'Abelmoschus esculentus'").get().plant, id: idOf('Abelmoschus esculentus'), canonical: 'Abelmoschus esculentus', names: { en: 'Okra' }, lists: ['Tropical'] });
  // "Gombo" is in the names file only, never in plant_names.
  assert.ok(!all.some((p) => Object.values(p.names).includes('Gombo')));
  assert.deepEqual(all.find((p) => p.canonical === 'Castanea sativa').lists, ['Mediterranean', 'Temperate']);
});

// PP-C c2 unit row (disputes): none of the schema-4 facts changes a verdict, a filter or NextStep's
// grouping, since they reach Details only: the pool's Taxon (which verdict.ts, Find's filters and
// holes.ts fillers read) carries none of them.
test('schema 4: disputes, audiences, trait sources and frost reach Details only, never the pool\'s Taxon', async () => {
  const pool = await source.pool('Mediterranean');
  const hedera = pool.find((t) => t.canonical_name === 'Hedera helix');
  assert.ok(hedera, 'the fixture places Hedera helix on the Mediterranean list');
  for (const t of pool) for (const k of ['disputes', 'audiences', 'traitSources', 'frost', 'toxicityParts']) assert.equal(k in t, false, `${t.canonical_name}: no ${k} on the Taxon`);
  assert.equal(hedera.warnings.toxicity?.level, 'Slight', 'the shipped level, not the disputed one');
  assert.ok((await source.details(hedera.id, 'Mediterranean', 'en')).disputes.length > 0, 'the dispute is on Details');
});

// Review c0-4 and round 2 (4a; open vocabularies): every trait_sources.field naming a plants column the
// reader reads is kept (the staging export ships 21, such as tolerates_full_sun and nitrogen_fixer:
// c2's sourceLine labels a corrected value); one naming no column it reads (a later minor's addition)
// is skipped, as an unknown dispute field or audience is, never handed to the views.
test('trait_sources: every plants column the reader reads is kept; a field it does not know is skipped', async () => {
  const path = join(oracleDir, 'extra.sqlite');
  writeFileSync(path, gunzipSync(gz));
  const rw = new DatabaseSync(path);
  const plant = rw.prepare('SELECT plant FROM plants WHERE canonical_name = ?').get('Hedera helix').plant;
  rw.prepare("INSERT INTO trait_sources VALUES (?, 'spread_rate', 'pfaf', NULL, 'recorded')").run(plant);
  for (const f of ['tolerates_full_sun', 'nitrogen_fixer', 'weed_potential']) rw.prepare("INSERT INTO trait_sources VALUES (?, ?, 'canopi-correction', NULL, 'recorded')").run(plant, f);
  const columns = rw.prepare('PRAGMA table_info(plants)').all().map((c) => c.name);
  assert.deepEqual(core.traitFields.filter((f) => !columns.includes(f)), [], 'each trait field is a plants column');
  rw.close();
  const copy = await openBytes(new Uint8Array(readFileSync(path)), expected);
  const d = await createSqliteSource(copy.db, { images: {} }).details(idOf('Hedera helix'), 'Mediterranean', 'en');
  assert.deepEqual(d.traitSources.map((t) => t.field).sort(), ['frost_tender', 'nitrogen_fixer', 'tolerates_full_sun', 'toxicity', 'weed_potential'], 'the known columns kept, spread_rate skipped');
  // Every plants column the staging export's trait_sources names is one the reader knows.
  const STAGING = ['allelopathic', 'deciduous_evergreen', 'drought_tolerance', 'edibility_rating', 'frost_tender', 'habit', 'hardiness_zone_max', 'hardiness_zone_min', 'height_max_m', 'is_annual', 'is_perennial', 'mycorrhizal_type', 'nitrogen_fixer', 'sexual_system', 'soil_ph_max', 'soil_ph_min', 'taproot_persistent', 'tolerates_full_shade', 'tolerates_full_sun', 'toxicity', 'weed_potential'];
  assert.deepEqual(STAGING.filter((f) => !core.traitFields.includes(f)), [], 'staging r-c15a216b9663d2fa: no field dropped');
});

// plant_aliases (declared in the fixture with two rows) is accepted and never read (owner 2026-11-17,
// "No backward compatibility work"): the source has no aliases reader.
test('plant_aliases: a schema-4 export holding rows opens; the source offers no aliases reader', () => {
  assert.equal('aliases' in source, false);
  assert.ok(opened.db.selectObjects('SELECT COUNT(*) AS n FROM plant_aliases')[0].n > 0, 'the fixture ships alias rows');
});