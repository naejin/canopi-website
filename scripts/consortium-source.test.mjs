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
import { writeFixtureExport } from './fixtures/consortium-v2/make-fixture.mjs';

const { openBytes, LoadError } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource, fold, searchIndex } = await import('../src/islands/consortium/data/sqlite-source.ts');
const core = await import('../src/lib/consortium/index.ts');

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
    for (const [opts, want] of [[{ userVersion: 2 }, 'schema'], [{ applicationId: 0x12345678 }, 'schema']]) {
      const out = join(dir, String(want) + Object.keys(opts)[0]);
      const { file } = await writeFixtureExport(out, opts);
      const bytes = new Uint8Array(gunzipSync(readFileSync(join(out, file))));
      assert.equal(await failure(openBytes(bytes, expected)), want, JSON.stringify(opts));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.equal(await failure(openBytes(new Uint8Array(4096).fill(0x5a), expected)), 'damaged');
});

test('info and countries come from meta and the countries table', () => {
  assert.deepEqual(source.info(), { releaseId: manifest.release_id, schemaVersion: 1, builtAt: manifest.generated_at, climates: expected.climates, griisAvailable: true });
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
  assert.equal(t.from, undefined);
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
  assert.deepEqual(robinia.warnings.invasive_in.map((r) => r.country).sort(), ['DE', 'FR', 'IT', 'ZA']);
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

// ---- interactions, placements, labels ----

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
  assert.deepEqual(robinia.invasiveIn.map((r) => r.country).sort(), ['DE', 'FR', 'IT', 'ZA']);
  assert.ok(robinia.sources.griis);
});

test('cellCounts is the SQL oracle of the core matrix', async () => {
  for (const c of expected.climates) {
    const pool = await source.pool(c);
    const m = core.buildMatrix(c, pool, [], core.UNSURE_SITE);
    const counts = await source.cellCounts(c);
    const total = counts.reduce((s, r) => s + r.n, 0);
    assert.equal(total, m.rows.flatMap((r) => r.cells).reduce((s, cell) => s + cell.inList, 0), c);
    for (const r of counts) assert.equal(m.rows[core.strata.indexOf(r.stratum)].cells[r.phase].inList, r.n, `${c} ${r.stratum} ${r.phase}`);
  }
});

// ---- names and folded search (A6) ----

test('names and search: folded (lower case, Latin, Greek and Cyrillic marks off, ß œ æ written out), word prefix, never LIKE', async () => {
  assert.equal(fold('Châtaignier'), 'chataignier');
  assert.equal(fold('TRÈFLE Blanc'), 'trefle blanc');
  assert.equal(fold('Ёлка'), 'елка', 'Cyrillic marks go');
  assert.equal(fold('Ἀμπέλι'), 'αμπελι', 'Greek marks go');
  // Marks stay where they make a different letter: Korean syllables and kana voicing (NFC back).
  assert.equal(fold('백합'), '백합');
  assert.ok(!fold('백합').startsWith(fold('배')), '배 (pear) is not a prefix of 백합 (lily)');
  assert.equal(fold('ばら'), 'ばら');
  assert.notEqual(fold('ばら'), fold('はら'));
  // Ligatures and sharp s expand, on names and on the query alike.
  assert.equal(fold('Weißdorn'), 'weissdorn');
  assert.equal(fold('Cœur'), 'coeur');
  assert.equal(fold('Æble'), 'aeble');
  const extra = searchIndex([{ id: 'a', canonical: 'Crataegus monogyna', names: { de: 'Weißdorn' } }, { id: 'b', canonical: 'Pyrus pyrifolia', names: { ko: '배' } }, { id: 'c', canonical: 'Lilium', names: { ko: '백합' } }, { id: 'd', canonical: 'Rosa', names: { ja: 'ばら' } }, { id: 'e', canonical: 'X', names: { fr: 'Cœur de bœuf' } }]);
  assert.deepEqual(extra('weissdorn').map((h) => h.id), ['a']);
  assert.deepEqual(extra('Weißd').map((h) => h.id), ['a']);
  assert.deepEqual(extra('배').map((h) => h.id), ['b'], 'Korean: the syllable is not decomposed into jamo');
  assert.deepEqual(extra('はら').map((h) => h.id), [], 'kana voicing is kept');
  assert.deepEqual(extra('coeur').map((h) => h.id), ['e']);
  assert.deepEqual(extra('bœuf').map((h) => h.id), ['e']);
  const names = await source.names('fr');
  assert.equal(names.length, oracle.prepare('SELECT count(*) n FROM plants').get().n);
  const chestnut = names.find((n) => n.canonical === 'Castanea sativa');
  assert.deepEqual(chestnut.names, { en: 'European chestnut', fr: 'Châtaignier' });
  const search = searchIndex(names);
  const hits = (q) => search(q).map((h) => names.find((n) => n.id === h.id).canonical);
  assert.deepEqual(hits('chataig'), ['Castanea sativa']);
  assert.deepEqual(hits('Trefle'), ['Trifolium repens']);
  assert.deepEqual(hits('phacé'), ['Phacelia tanacetifolia']);
  assert.deepEqual(hits('oak').sort(), ['Quercus ilex', 'Quercus robur']);
  assert.deepEqual(hits('ak'), [], 'word prefix: "ak" is inside "oak", not at a word start');
  assert.deepEqual(hits('quercus r'), ['Quercus robur']);
  assert.deepEqual(hits('50%_'), []);
  assert.deepEqual(hits(''), []);
  // Scripts written without spaces match inside the name.
  const zh = searchIndex(await source.names('zh'));
  assert.deepEqual(zh('栗').map((h) => h.id), [idOf('Castanea sativa')]);
  // Exact and prefix matches rank first.
  assert.equal(hits('olive')[0], 'Olea europaea');
});

// ---- the real install ----

const ROOT = new URL('../', import.meta.url);
const indexPath = new URL('src/data/consortium-index.json', ROOT);
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : null;
const realFile = index && new URL(`public${index.files[0].url}`, ROOT);

test('real install: opens with the index, every pool and image path, cell counts, and 9 plants with every answer unsure', { skip: !(realFile && existsSync(realFile)) && 'no real install' }, async () => {
  const real = await openBytes(new Uint8Array(gunzipSync(readFileSync(realFile))), { releaseId: index.release_id, climates: index.climates });
  try {
    const src = createSqliteSource(real.db, { images: index.images });
    assert.equal(src.info().releaseId, index.release_id);
    for (const c of index.climates) {
      const pool = await src.pool(c);
      assert.deepEqual(pool.map((t) => t.canonical_name).sort(), [...index.names[c]].sort(), c);
      for (const t of pool) if (t.image) assert.match(t.image.url, /^\/data\/consortium\/images\//);
      const m = core.buildMatrix(c, pool, [], core.UNSURE_SITE);
      for (const r of await src.cellCounts(c)) assert.equal(m.rows[core.strata.indexOf(r.stratum)].cells[r.phase].inList, r.n);
    }
    const temperate = await src.pool('Temperate');
    const m = core.buildMatrix('Temperate', temperate, [], core.UNSURE_SITE);
    assert.equal(m.rows[3].cells[0].empty, 'gap', 'real Temperate low × first 90 days is a data gap');
    const s = core.suggest(temperate, { site: core.UNSURE_SITE, interactions: await src.interactions('Temperate'), country: null, countryStatus: 'none' });
    assert.equal(s.members.length, 9, 'A7: Room unsure suggests 9');
    const names = await src.names('fr');
    assert.ok(searchIndex(names)('chataig').length >= 1);
  } finally { real.db.close(); }
});
