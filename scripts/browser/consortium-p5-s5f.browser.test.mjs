// The P5 browser specs of stream S5f: privacy page and data-source credits (§C). Split from consortium-p5 by owner tag
// (E1 design check A6); each test is "P5-n (S5f …)".
//
// No network: Nominatim and OpenFreeMap are stubbed (harness.mjs nominatim / mapTiles), the device
// location is emulated through CDP (geolocation), and any other request off the site is aborted and
// listed in page.thirdParty. The places and what the climate reader answers there are in
// ./location-fixtures.mjs; the specs' shared helpers in ./p5-helpers.mjs. The page contract the
// specs read is written at the top of ./p5-helpers.mjs. scripts/browser-tests.test.mjs enforces the
// layout. Headless Chrome on dist-test, capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-p5-s5f.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { h, useHarness } from './helpers.mjs';
import { text, search, PRIVACY_LANGS } from './p5-helpers.mjs';

useHarness();

test('P5-23 (S5f privacy page in fr and ja): /fr/privacy/ and /ja/privacy/ name what the location step sends and to whom', async () => {
  for (const [lang, attr] of Object.entries(PRIVACY_LANGS)) {
    const res = await fetch(`${h.url}/${lang}/privacy/`);
    assert.equal(res.status, 200, `/${lang}/privacy/`);
    const page = await h.open(`/${lang}/privacy/`);
    assert.equal(await page.$eval('html', (e) => e.lang), attr);
    const body = await text(page, 'main');
    for (const who of ['Nominatim', 'OpenFreeMap']) assert.ok(body.includes(who), `${lang}: names ${who}`);
    // Each service's own privacy policy is one click away.
    for (const policy of ['https://osmfoundation.org/wiki/Privacy_Policy', 'https://openfreemap.org/privacy/']) {
      assert.ok(await page.$(`main a[href="${policy}"]`), `${lang}: links ${policy}`);
    }
    assert.ok(await page.$('h1'), `${lang}: a title`);
  }
  assert.equal((await fetch(`${h.url}/privacy/`)).status, 200, 'and in English at /privacy/');
});

test('P5-24 (S5f footer link): every page\'s footer links to its locale\'s privacy page', async () => {
  for (const [path, href] of [['/', '/privacy/'], ['/fr/consortium/', '/fr/privacy/'], ['/ja/data-sources/', '/ja/privacy/']]) {
    const page = await h.open(path);
    assert.ok(await page.$(`footer a[href="${href}"]`), `${path}: footer link to ${href}`);
  }
});

test('P5-25 (S5f credits): /data-sources/ credits the climate, soil, region, occurrence, map and search sources', async () => {
  const page = await h.open('/data-sources/');
  const credits = await page.$$eval('[data-credit]', (els) => els.map((e) => e.getAttribute('data-credit')));
  for (const id of ['canopi-climate', 'chelsa', 'koppen-beck', 'soilgrids', 'wgsrpd', 'natural-earth', 'gbif', 'openfreemap', 'nominatim']) {
    assert.ok(credits.includes(id), `credits ${id}`);
  }
  assert.match(await text(page, '[data-credit="gbif"]'), /GBIF\.org/);
});
