// The P5 browser specs' shared helpers (split from consortium-p5, E1 design check A6): the tool
// loaded with the test hook, a site set as the location step would, the climate chosen, the location
// controls and result line, and the picks the specs make from the real export.
//
// The page contract the specs read (the streams implement it; marks already render data-mark):
// - S5b: [data-location-action="geo" | "search" | "map"] controls, input[data-location-search], the
//   result line [data-location-state] ("ready", "denied", "timeout", "unavailable", "no-result",
//   "offline", "sea", "coast", "polar", "borderline", "failed"), [data-location-privacy] beside each
//   control (in the same parent), the suggested climate card checked through store.proposedClimate and
//   committed by [data-location-confirm] (owner answer 1), the map dialog [data-location-map] with [data-location-use-centre] (the test hook gains
//   mapCentre({ lat, lon }) to move it), the share tick input[data-share-location], and
//   store.country.value.source 'location' (never in a link without the tick: owner answer 5);
// - S5c: [data-mark="edge" | "outside" | "estimate" | "unknown"] (views/PlantMarks.tsx), the empty
//   pool [data-pool-empty], borrowed lists through views/PoolSlot.tsx;
// - S5d: [data-future-summary], [data-future="not-checked"] (views/FutureSlot.tsx);
// - S5e (P5.2; its slots and stubs removed before the P5 push, see consortium-p5-seams-s5e.test.mjs):
//   [data-native="native" | "not_recorded" | "unknown"] in Details under the plant's name, [data-likely="soil"] with
//   its "Use it" button [data-likely-use] in each site question on Start;
// - S5f: /privacy/ in every locale, the footer link to it, the /data-sources/ credits [data-credit].
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { h, has, realDb } from './helpers.mjs';
import { SITES, lookupAt } from './location-fixtures.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';

// The tool, loaded, with the test hook (store access) unless hook is false. Map tiles are stubbed for
// every spec (any other third-party request is aborted and listed in page.thirdParty); hash is a link.
export async function tool({ lang = 'en', hook = true, width = 1280, mapTiles = 'stub', hash = '', ...opts } = {}) {
  const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/${hash}`, { width, mapTiles, ...opts });
  if (hook) {
    await page.evaluateOnNewDocument(() => { window.__ctTest = true; });
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  assert.equal(await loadState(page), 'ready');
  if (hook) assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.source.value, { timeout: 20_000 }).then(() => true, () => false), 'no test hook: build with npm run build:browser-test');
  return page;
}

// Sets store.location as S5b would after a lookup (S5c–S5e specs need no location UI).
export async function atSite(page, name, over = {}) {
  const [lat, lon] = SITES[name];
  const lookup = { ...(await lookupAt(lat, lon)), ...over };
  await page.evaluate((loc) => { window.__ctTest.store.location.value = loc; }, { lat, lon, source: 'map', label: name, lookup });
  return lookup;
}

// The store's climate and pool, as the matrix would show them.
export async function choose(page, climate) {
  const ok = await page.evaluate(async (c) => {
    const { store } = window.__ctTest;
    store.climate.value = c;
    return store.loadPool(c);
  }, climate);
  assert.ok(ok, `the ${climate} pool loads`);
}

export const LOCATION_UI = 'S5b: the start step has no "Where is your site?" controls (LocationSlot renders nothing)';

export async function locationControls(page) {
  assert.ok(await has(page, '[data-location-action="geo"]', 4000), LOCATION_UI);
}

export async function locationState(page, timeout = 15_000) {
  await page.waitForSelector('[data-location-state]:not([data-location-state="loading"])', { timeout }).catch(() => {});
  return page.$eval('[data-location-state]', (e) => e.getAttribute('data-location-state')).catch(() => null);
}

// The Add sheet, open and focused: SheetFrame calls showModal() and focuses its heading in an effect,
// which Preact runs after the next frame, so the sheet's input is in the page inside a closed (not
// shown) dialog first (measured: there at 13 ms, open with the heading focused at 64 ms, more under
// load). Typing that starts in that gap loses the keys sent before the heading takes the focus, and
// the row looked for never shows (P5-27q "Good-King-Henry in Add with its cool-season tag").
export const ADD_OPEN = 'dialog.ct-add[open] .ct-search input';

export const text = (page, sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);

export const checkedCard = (page) => page.$eval('input[name="ct-climate"]:checked', (e) => e.value).catch(() => null);

// The card a location suggests: shown as proposed (review round 1, 6), never as a checked radio.
export const proposedCard = (page) => page.$eval('[data-proposed] input[name="ct-climate"]', (e) => e.value).catch(() => null);

export const savedLocation = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('canopi-location') ?? 'null'));

// After page.goto, loadState's wait can end with the navigation (a destroyed context) before the page
// settles, so it is asked again until ready or 20 s.
export const ready = async (page) => {
  let st = 'loading';
  for (const end = Date.now() + 20_000; st !== 'ready' && Date.now() < end;) { st = await loadState(page, 5000); if (st !== 'ready') await new Promise((r) => setTimeout(r, 250)); }
  assert.equal(st, 'ready');
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.source.value, { timeout: 20_000 }).then(() => true, () => false));
};

export const storeClimate = (page) => page.evaluate(() => window.__ctTest.store.climate.value);

// The result line ready, the suggested card confirmed (owner answer 1), then a consortium in the matrix
// and its Share panel open (S5b: the panel opens on its button; the specs read its field).
export async function confirmAndSuggest(page) {
  await page.click('[data-location-confirm]');
  await page.evaluate(async () => { const { store } = window.__ctTest; await store.loadPool(store.climate.value); store.suggestMembers(); store.view.value = 'matrix'; });
  assert.ok(await has(page, '.ct-action-row button', 10_000), 'the matrix\'s actions');
  // The future panel (S5d, views/FutureSlot.tsx; idle, about 150 ms after the matrix) mounts above the
  // action row and pushes Share down by ~720 px: clicking before it lands can hit a tick Puppeteer had
  // scrolled into view a frame earlier ("Node is either not clickable"; P5-13b/13d flake, 2026-11-11).
  assert.ok(await has(page, '[data-future]', 10_000), 'the future panel has landed');
  await page.click('.ct-action-row button');
  assert.ok(await has(page, '#ct-share-field', 10_000), 'the Share panel');
}

export const search = async (page, q) => {
  await page.type('input[data-location-search]', q);
  await page.keyboard.press('Enter');
};

// A page whose /data/climate/ fetches wait `ms` (Infinity: never answer), optionally with a saved location.
export async function slowTiles(ms, { saved = null, geolocation = { lat: SITES.seville[0], lon: SITES.seville[1] } } = {}) {
  const page = await h.open('/consortium/', { mapTiles: 'stub', geolocation });
  await page.evaluateOnNewDocument((wait, rec) => {
    window.__ctTest = true;
    if (rec && !localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
    const f = window.fetch;
    window.fetch = (input, init) => (/\/data\/climate\//.test(String(input?.url ?? input))
      ? (wait === null ? new Promise(() => {}) : new Promise((r) => setTimeout(r, wait)).then(() => f(input, init)))
      : f(input, init));
  }, Number.isFinite(ms) ? ms : null, saved);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}

export const watchFirstMembers = (page) => page.evaluate(() => { const { store } = window.__ctTest; window.__firstMembers = undefined; store.members.subscribe((m) => { if (m.length && window.__firstMembers === undefined) window.__firstMembers = !!store.location.peek()?.lookup; }); });

// ---- S5c: filtered pool and nearest placements ----

// The owner's range rule (2026-11-11) in SQL, for picking a plant: coldest-month minimum on both
// sides and warmest-month maximum on the hot side, 2 °C beyond the percentiles "outside", between
// the percentile and the margin "near the edge".
// An annual skips the winter-cold check (owner, "Annuals skip the winter-cold check").
export const RANGED = `SELECT p.canonical_name name, n.low nlo, n.high nhi, x.high xhi, coalesce(p.is_annual, 0) annual FROM plants p
  JOIN placements pl ON pl.plant = p.plant AND pl.climate_zone = ?3
  JOIN plant_climate n ON n.plant = p.plant AND n.variable = 'tmin_cold'
  JOIN plant_climate x ON x.plant = p.plant AND x.variable = 'tmax_warm'`;
const OUTSIDE = '((NOT annual AND (nlo - 2 > ?1 OR ?1 > nhi + 2)) OR ?2 > xhi + 2)';

export const EDGE = `(NOT ${OUTSIDE} AND ((NOT annual AND (nlo > ?1 OR ?1 > nhi)) OR ?2 > xhi))`;

export const pickRanged = (where, site, zone) => realDb((db) => db.prepare(`SELECT name FROM (${RANGED}) WHERE ${where} ORDER BY name LIMIT 1`).get(site.tminColdC, site.tmaxWarmC, zone)?.name);

// Since annuals skip the winter-cold check and, beyond their heat range, are advised to the cool season
// (decision row "Climate ranges fixed before the P5 push"), an annual is never outside, so every real
// list keeps its annuals anywhere. "Nothing fits" is shown for a list without annuals (the page's
// pools have their annuals taken out as they load), at Yakutsk's coordinates with a warmest month of
// 46 °C, above every recorded summer maximum + 2 °C.
export async function atNowhere(page) {
  await page.evaluate(() => {
    const { store } = window.__ctTest;
    const perennials = (p) => Object.fromEntries(Object.entries(p).map(([k, list]) => [k, list?.filter((t) => t.traits.is_annual !== true && t.traits.grown_as_annual !== true)]));
    store.pools.subscribe((p) => { if (Object.values(p).some((list) => list?.some((t) => t.traits.is_annual === true || t.traits.grown_as_annual === true))) store.pools.value = perennials(p); });
  });
  const l = await lookupAt(...SITES.yakutsk);
  const periods = l.climate.periods.map((p) => (p.scenario === 'historical' ? { ...p, tmaxWarmC: 46 } : p));
  return atSite(page, 'yakutsk', { climate: { ...l.climate, periods } });
}

// ---- P5 seam review (branch consortium/p5-seam): one test per finding, written to fail first ----

// The empty matrix's buttons and words, at both widths.
export const emptyMatrix = async (page) => {
  assert.ok(await has(page, '.ct-mx-empty', 15_000), 'the empty matrix');
  return { buttons: await page.$$eval('.ct-mx-empty button', (els) => els.map((e) => e.textContent.trim())), words: await text(page, '.ct-mx-empty') ?? '' };
};

// A page with the reader's own saved location (Seville, geo) on this device, opened at `hash`.
export async function withSavedSite(hash = '') {
  const page = await h.open(`/consortium/${hash}`, { mapTiles: 'stub' });
  await page.evaluateOnNewDocument((rec) => {
    window.__ctTest = true;
    if (!localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
  }, JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}

export const temperateLink = async (origin = null, n = 5) => {
  const ids = await realDb((db) => db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' ORDER BY 1").all().map((r) => String(r.id)));
  return `#${encodeLink({ climate: 'Temperate', country: null, site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' }, members: ids.slice(0, n), kept: [], removed: [], guests: [], crops: [], stage: null }, { Temperate: ids }, { origin })}`;
};

export const ownSite = (page) => page.waitForFunction((a, b) => { const l = window.__ctTest.store.location.value; return !!l?.lookup && l.lat === a && l.lon === b && l.source === 'geo'; }, { timeout: 15_000 }, ...SITES.seville).then(() => true, () => false);

// A saved Temperate consortium and a saved site at Seville (which proposes Mediterranean). list: the
// restore's first list read waits until the saved site is looked up, then 'fail's or 'open's.
// window.__confirmSeen: whether the location line's "Use …" ever showed.
export async function savedOpening({ list = null } = {}) {
  const q = (await temperateLink()).slice(1);
  const page = await h.open('/consortium/', { mapTiles: 'stub' });
  await page.evaluateOnNewDocument((save, rec, outcome) => {
    if (!localStorage.getItem('canopi-consortium')) localStorage.setItem('canopi-consortium', save);
    if (!localStorage.getItem('canopi-location')) localStorage.setItem('canopi-location', rec);
    window.__confirmSeen = false;
    new MutationObserver(() => { if (document.querySelector('[data-location-confirm]')) window.__confirmSeen = true; }).observe(document, { subtree: true, childList: true });
    let hook = true;
    Object.defineProperty(window, '__ctTest', { configurable: true, get: () => hook, set: (v) => {
      hook = v;
      if (!v?.store || !outcome) return;
      v.store.source.subscribe((src) => {
        if (!src || src.wrapped) return;
        src.wrapped = true;
        const read = src.interactions.bind(src);
        let once = true; // the restore's read only; later reads (a card chosen) work
        src.interactions = (z) => {
          if (!once) return read(z);
          once = false;
          return new Promise((resolve, reject) => { v.store.location.subscribe((l) => { if (l?.lookup) setTimeout(() => (outcome === 'fail' ? reject(new Error('test: list unreadable')) : resolve(read(z))), 50); }); });
        };
      });
    } });
  }, JSON.stringify({ fragment: q, at: '2026-11-01', src: 'chosen' }), JSON.stringify({ lat: SITES.seville[0], lon: SITES.seville[1], source: 'geo' }), list);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}

export const savedFailing = () => savedOpening({ list: 'fail' });

export const proposal = (page) => page.evaluate(() => ({ proposed: window.__ctTest.store.proposedClimate.value, climate: window.__ctTest.store.climate.value, seen: window.__confirmSeen, shown: !!document.querySelector('[data-location-confirm]') }));

// An empty Temperate matrix with a kept guest from Tropical whose list read is held: window.__guest
// .release() lets it through, .fail() fails it (as after Start empty, which keeps guests).
export async function guestHeld(width) {
  const guest = await realDb((db) => String(db.prepare("SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Tropical' ORDER BY 1 LIMIT 1").get().id));
  const page = await tool({ width, hash: '#v=4&c=temperate&a=&e=1' });
  assert.ok(await has(page, '.ct-mx-empty .button-primary', 15_000), 'the empty matrix with "Suggest a start"');
  await page.evaluate((id) => {
    const { store } = window.__ctTest, src = store.source.value;
    const pool = src.pool.bind(src), rows = src.interactions.bind(src);
    let release, fail; const held = new Promise((r, j) => { release = r; fail = j; });
    held.catch(() => {});
    window.__guest = { release, fail: () => fail(new Error('test: guest list unreadable')) };
    src.pool = (z) => (z === 'Tropical' ? held.then(() => pool(z)) : pool(z));
    src.interactions = (z) => (z === 'Tropical' ? held.then(() => rows(z)) : rows(z));
    store.guests.value = { [id]: 'Tropical' };
  }, guest);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.guestsPending.value.length === 1, { timeout: 5000 }).then(() => true, () => false), 'the guest list is being read');
  return page;
}

export const members = (page) => page.evaluate(() => window.__ctTest.store.members.value.length);

// ---- S5f: credits and privacy ----

export const PRIVACY_LANGS = { fr: 'fr', ja: 'ja' };
