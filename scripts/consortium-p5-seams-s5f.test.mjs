// P5 stream S5f (credits and privacy): the tool's credits on /data-sources/ (src/data/consortium-credits.ts)
// stay true to what is installed, and the privacy page's strings exist in every locale.
// S5f owns this file; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const credits = await import('../src/data/consortium-credits.ts');
const root = new URL('../', import.meta.url);
const json = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];

// The installed export's meta table (public/data/consortium/, named by src/data/consortium-index.json).
function exportMeta() {
  const index = json('src/data/consortium-index.json');
  const file = index.files[0].file;
  const dir = mkdtempSync(join(tmpdir(), 'ct-s5f-'));
  try {
    const db = join(dir, 'c.sqlite');
    writeFileSync(db, gunzipSync(readFileSync(new URL(`public/data/consortium/${file}`, root))));
    const conn = new DatabaseSync(db, { readOnly: true });
    const meta = Object.fromEntries(conn.prepare('SELECT key, value FROM meta').all().map((r) => [r.key, r.value]));
    conn.close();
    return meta;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the GBIF credit names the fetch window and the basis of record the installed export states', () => {
  const meta = exportMeta();
  assert.equal(credits.GBIF.fetched, meta.gbif_fetched, 'gbif_fetched: update GBIF in src/data/consortium-credits.ts for the new export');
  assert.deepEqual([...credits.GBIF.basisOfRecord], meta.gbif_basis_of_record.split(','), 'gbif_basis_of_record');
  const line = credits.gbifCredit().line;
  assert.match(line, /^GBIF\.org \(2026\)\. /);
  assert.ok(line.includes('fetched 2026-11-11 03:18–06:27 UTC'), line);
  assert.ok(line.includes('HUMAN_OBSERVATION, OBSERVATION'), line);
});

test('fetchWindow writes one day once, two days in full', () => {
  assert.equal(credits.fetchWindow('2026-11-11T03:18:45Z/2026-11-11T06:27:25Z'), '2026-11-11 03:18–06:27 UTC');
  assert.equal(credits.fetchWindow('2026-11-11T23:00:00Z/2026-11-12T01:30:00Z'), '2026-11-11 23:00 – 2026-11-12 01:30 UTC');
});

const grid = [
  { id: 'beck2023', title: 'Beck', citation: 'Beck et al. https://doi.org/x', landing: 'https://doi.org/b', licence: 'CC BY 4.0' },
  { id: 'chelsa-v2.1', title: 'CHELSA', citation: 'Karger', landing: 'https://doi.org/c', licence: 'CC0 1.0' },
  { id: 'natural-earth-map-units-50m', title: 'NE', citation: 'Made with Natural Earth', landing: null, licence: 'Public domain' },
  { id: 'wgsrpd-level3', title: 'WGSRPD', citation: 'Brummitt', landing: 'https://github.com/tdwg/wgsrpd', licence: 'Not declared' },
  { id: 'soilgrids-2.0', title: 'SoilGrids', citation: 'Poggio', landing: 'https://www.isric.org/explore/soilgrids', licence: 'CC BY 4.0' },
];

test('the tool credits: the grid, its five inputs, GBIF, OpenFreeMap and Nominatim, each once', () => {
  const rows = credits.toolCredits(grid, 'v0.2.0');
  assert.deepEqual(rows.map((r) => r.id), ['canopi-climate', 'chelsa', 'koppen-beck', 'soilgrids', 'wgsrpd', 'natural-earth', 'gbif', 'openfreemap', 'nominatim']);
  assert.match(rows[0].name, /canopi-climate v0\.2\.0/);
  assert.match(rows[0].licence, /AGPL-3\.0-or-later/);
  assert.equal(rows.find((r) => r.id === 'chelsa').licence, 'CC0 1.0', 'licences as the grid publishes them');
  for (const r of rows) assert.ok(r.line, `${r.id}: a citation or attribution`);
  // P5 reads no soil or botanical area: those tiles are credited as served with the grid, not as a feature.
  assert.deepEqual(rows.filter((r) => r.use === 'served').map((r) => r.id), ['soilgrids', 'wgsrpd']);
});

test('a grid source missing from the climate index stops the build; a new one is credited under its own id', () => {
  assert.throws(() => credits.toolCredits(grid.slice(1), 'v0.2.0'), /beck2023/);
  assert.throws(() => credits.toolCredits(null, 'v0.2.0'), /climate-index\.json/);
  const rows = credits.toolCredits([...grid, { id: 'new-src', title: 'New', citation: 'N', landing: null, licence: 'CC0' }], 'v0.2.0');
  assert.ok(rows.some((r) => r.id === 'new-src'));
});

test('the installed climate index, when present, holds every source the page names', { skip: !existsSafe('src/data/climate-index.json') && 'no climate index (built by astro build)' }, () => {
  const index = json('src/data/climate-index.json');
  assert.doesNotThrow(() => credits.toolCredits(index.credits, json('src/data/climate-release.json').tag));
});

function existsSafe(path) { try { readFileSync(new URL(path, root)); return true; } catch { return false; } }

// The privacy page's and the credits' strings, in every locale, inside S5f's translation block.
const KEYS = [
  'privacy.title', 'privacy.lede', 'privacy.policy',
  'privacy.site.title', 'privacy.site.host', 'privacy.site.none', 'privacy.site.storage', 'privacy.site.logs',
  'privacy.tool.title', 'privacy.tool.device', 'privacy.tool.share',
  'privacy.location.title', 'privacy.location.device', 'privacy.location.tiles', 'privacy.location.link', 'privacy.location.search', 'privacy.location.map',
  'privacy.contact.title', 'privacy.contact.body',
  'privacy.correction.title', 'privacy.correction.body', 'privacy.correction.email',
  'privacy.donate.title', 'privacy.donate.body',
  'privacy.ask.title', 'privacy.ask.body', 'privacy.ask.link',
  'dataSources.tool.title', 'dataSources.tool.lede', 'dataSources.tool.gridUse', 'dataSources.tool.servedUse', 'dataSources.tool.gbifUse', 'dataSources.tool.mapUse', 'dataSources.tool.searchUse', 'dataSources.tool.privacy',
];

test('every privacy and tool-credit string is in all 11 locales, after consortium.block.s5f and before consortium.block.end', () => {
  for (const lang of LOCALES) {
    const words = json(`src/i18n/translations/${lang}.json`);
    const keys = Object.keys(words);
    const from = keys.indexOf('consortium.block.s5f');
    const to = keys.indexOf('consortium.block.end');
    for (const key of KEYS) {
      assert.ok(typeof words[key] === 'string' && words[key].trim(), `${lang}: ${key}`);
      const at = keys.indexOf(key);
      assert.ok(at > from && at < to, `${lang}: ${key} sits in the S5f block`);
    }
    for (const key of ['privacy.policy', 'privacy.site.logs', 'privacy.ask.body', 'dataSources.tool.privacy']) assert.ok(words[key].includes('{link}'), `${lang}: ${key} has {link}`);
    // Nominatim and OpenFreeMap are named in every language (the page says who receives what).
    for (const who of ['Nominatim', 'OpenFreeMap']) assert.ok(KEYS.some((k) => k.startsWith('privacy.') && words[k].includes(who)), `${lang}: names ${who}`);
  }
  // French: the tool is a « guilde », never a consortium (owner rule).
  const fr = json('src/i18n/translations/fr.json');
  for (const key of KEYS) assert.doesNotMatch(fr[key], /consortium/i, `fr: ${key} says guilde`);
});

// What the location paragraphs claim, checked against the code (ho-misc seam check), in every locale:
// - the grid cell's size: the climate grid's 0.1° cell is about 11 km north to south (lookup.ts
//   CLIMATE_GRID, the cell centre a ticked link carries as `o=`);
// - a ticked link also carries the country the location gave (state/persist.ts shareState: a location's
//   country is written only with the tick; state.ts encodeLink `k=`);
// - the location is read on the device for the climate and the country (state/location.ts locateNow:
//   lookup.regions.isoA2);
// - the tile downloads hide the precise point, not the point: on a coast or in a town near a tile
//   edge, the neighbouring tile loads too (src/lib/climate/index.ts lookupSite, searchTiles).
const COUNTRY = { en: /country/, fr: /pays/, es: /país/, pt: /país/, it: /paese/, zh: /国家/, de: /Land/, ja: /国/, ko: /국가/, nl: /land/, ru: /стран/ };
const PRECISE = { en: /precise point/, fr: /point précis/, es: /punto exacto/, pt: /ponto exato/, it: /punto preciso/, zh: /精确位置/, de: /genauen Punkt/, ja: /正確な地点/, ko: /정확한 지점/, nl: /precieze punt/, ru: /точное место/ };

test('the location paragraphs say what the code does: an 11 km cell, its country with the tick, climate and country read, the precise point hidden', async () => {
  const { CLIMATE_GRID } = await import('../src/lib/climate/lookup.ts');
  const km = Math.round(CLIMATE_GRID.cellDeg * 111.32);
  assert.equal(km, 11);
  for (const lang of LOCALES) {
    const words = json(`src/i18n/translations/${lang}.json`);
    for (const key of ['privacy.location.link', 'consortium.share.locationNote']) {
      const sizes = [...words[key].matchAll(/(\d+)\s*(?:km|км|公里)/g)].map((m) => Number(m[1]));
      assert.deepEqual(sizes, [km], `${lang}: ${key} gives the cell as about ${km} km`);
      assert.match(words[key], COUNTRY[lang], `${lang}: ${key} names the country the link carries`);
    }
    assert.match(words['privacy.location.device'], COUNTRY[lang], `${lang}: privacy.location.device says the country is read too`);
    assert.match(words['privacy.location.tiles'], PRECISE[lang], `${lang}: privacy.location.tiles hides only the precise point`);
  }
});
