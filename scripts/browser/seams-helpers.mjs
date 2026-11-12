// The seams browser specs' shared helpers (split from consortium-seams, E1 design check A6).
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { h, aria, en, fixtureDb, has, settled } from './helpers.mjs';
import { readFileSync } from 'node:fs';
import { jobOfFunction } from '../../src/lib/consortium/jobs.ts';

export const PHASES = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];

export const STRATA = ['emergent', 'high', 'medium', 'low'];

export const plainOf = Object.fromEntries(PHASES.map((p, i) => [en[`consortium.phase.${p}.plain`], i]));

export const stratumOf = Object.fromEntries(STRATA.map((s) => [en[`consortium.stratum.${s}`], s]));

export const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };

// The fixture's Temperate plants: id, canonical name, stratum, span and jobs.
export const temperate = () => fixtureDb((db) => {
  const rows = db.prepare("SELECT p.plant, p.id, p.canonical_name name, p.height_max_m h, p.habit, p.tolerates_full_shade shade, x.role, x.stratum, x.phase_start a, x.phase_end b FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate'").all();
  const fns = db.prepare('SELECT plant, function FROM functions').all();
  // A crop feeds you; the other jobs come from its functions (core jobs.ts).
  return rows.map((r) => ({ ...r, jobs: new Set([...(r.role === 'crop' ? ['feeds_you'] : []), ...fns.filter((f) => f.plant === r.plant).map((f) => jobOfFunction[f.function]).filter(Boolean)]) }));
});

// "Emergent, Years 1–3" or "Emergent, Years 1–3 → Years 15–25": the cell a control's name holds.
export function cellIn(name) {
  const m = /:\s*([^,]+),\s*(.+)$/.exec(name);
  assert.ok(m, `a cell in "${name}"`);
  const [a, b = a] = m[2].split(' → ');
  return { stratum: stratumOf[m[1]], from: plainOf[a], to: plainOf[b] };
}

// Start → a climate → (light) → (room) → Suggest, through the controls.
export async function suggested(v, { room = null, light = null } = {}) {
  const page = await h.open('/consortium/', { ...v, data: 'fixture' });
  await page.locator(aria('radio', 'Temperate')).click();
  assert.equal(await loadState(page), 'ready');
  if (light) await page.locator(aria('radio', light)).click();
  if (room) await page.locator(aria('radio', room)).click();
  await page.locator(aria('button', 'Suggest plants')).click();
  assert.ok(await has(page, aria('tab', 'Layers × stages'), 8000), 'the matrix');
  return page;
}

// The members shown, as plant ids (chips, phone rows and list rows carry data-plant-id).
export const memberIds = (page) => page.$$eval('#ct-root [data-plant-id]', (els) => [...new Set(els.map((e) => e.dataset.plantId))]);

// The Add sheet's own rows (not "In other lists"), every one (after "Show all N").
export async function addRows(page) {
  const all = await page.$('.ct-add .ct-add-showall');
  if (all) await all.click();
  return page.$$eval('.ct-add .ct-sheet-body > ul.ct-rows > li .ct-sci', (els) => els.map((e) => e.textContent.trim()));
}

// The core's light rule (site.ts) in shade: a plant recorded as not taking full shade misfits; an
// unrecorded one is unknown, never a misfit. The room is advisory (owner request 2026-11-12): a plant
// taller than a small garden is listed with a note, never left out.
export const fitsShade = (p) => p.shade !== 0;

// The members the share link holds (its `a` list), read from the address.
export const linkOf = (page) => page.evaluate(() => location.hash);

// The save as this page's storage holds it.
export const saved = (page) => page.evaluate(() => localStorage.getItem('canopi-consortium'));

export const savedFragment = async (page) => { const raw = await saved(page); return raw ? `#${JSON.parse(raw).fragment}` : null; };

export const tropicalOnly = () => fixtureDb((db) => db.prepare("SELECT p.canonical_name name FROM plants p WHERE EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Tropical') AND NOT EXISTS (SELECT 1 FROM placements x WHERE x.plant = p.plant AND x.climate_zone = 'Temperate')").all().map((r) => r.name));

export const param = (fragment, k) => (fragment ? new URLSearchParams(fragment.slice(1)).get(k) : undefined);

export const changeSiteTo = async (page, card) => {
  await page.locator(aria('button', 'Change site')).click();
  await page.locator(aria('radio', card)).click();
  assert.equal(await loadState(page), 'ready');
};

// Another tab's save, written while this page is open.
export const OTHER_TAB = JSON.stringify({ fragment: 'v=4&c=tropical&l=unsure&s=unsure&w=unsure&m=unsure&a=&e=1', at: '2026-11-11T00:00:00.000Z', src: null });

export const otherTabSaves = (page) => page.evaluate((x) => localStorage.setItem('canopi-consortium', x), OTHER_TAB);

export const pasteOne = async (page, name) => {
  await page.locator(aria('button', 'Paste a list')).click();
  await page.locator('#ct-paste-text').fill(name);
  await page.locator(aria('button', 'Add 1 plant')).click();
  assert.ok(await has(page, aria('button', 'Share'), 5000));
};

// Every visible control in #ct-root (outside an open sheet unless inSheet) with its box.
export const controls = (page, inSheet = false) => page.$$eval(inSheet ? 'dialog[open] button, dialog[open] a[href], dialog[open] [role="tab"]' : '#ct-root button, #ct-root a[href], #ct-root [role="tab"]', (els, sheet) => els
  .filter((el) => sheet || !el.closest('dialog'))
  .map((el) => { const r = el.getBoundingClientRect(); return { name: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), h: Math.round(r.height), w: Math.round(r.width), cls: el.className, inline: el.matches('.ct-explain-btn, a.text-link') } ; })
  .filter((c) => c.h > 0 && c.w > 0), inSheet);
export const small = (list) => list.filter((c) => c.h < (c.inline ? 36 : 40)).map((c) => `${c.name} ${c.w}×${c.h} (${c.cls})`);

// "What is a layer?", "Show them anyway" and "+ Add" are primary controls of the matrix: 40 px (W6).
export const MATRIX_40 = /^(What is a |Show them anyway|Add a plant: )/;

// What has focus: its tag, its name and the plant it is for.
export const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el?.tagName.toLowerCase(), name: (el?.getAttribute('aria-label') || el?.textContent || '').trim().slice(0, 80), plant: el?.closest('[data-plant-id]')?.dataset.plantId ?? el?.dataset?.plantId ?? null };
});

// The test hook, on a page opened before the island loads (F4, F5).
export async function hookedPage(v) {
  const page = await h.open('/consortium/', { ...v, data: 'fixture', hook: true });
  assert.ok(await page.waitForFunction(() => typeof window.__ctTest === 'object', { timeout: 20_000 }).then(() => true, () => false), 'a build:browser-test build');
  return page;
}

// P5 walk-through 2, N2: "What are these stages?" ran off phones (466 px wide at 390 en). Every pop-up
// of the tool stays inside the viewport with the 16 px gutter: the layer and stage explanations (phone
// matrix and side view), "Add it anyway?" and the map dialog, at 320 and 390 px in en, fr and ja.
export const STRINGS = Object.fromEntries(['en', 'fr', 'ja'].map((l) => [l, JSON.parse(readFileSync(new URL(`../../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'))]));

// Layout stability (P5 flake investigation, N2): nothing on Start moves after its first paint because
// data arrived. The page opens with the browser's languages saying one country and its time zone
// another (a long name, or Puerto Rico, a country GRIIS did not check), so a guess refined when the
// database opens would change the country line's height and shift every control below it (46 px at
// en 320 and ja 390) about a second after load. Each control's box in the first frame it exists is
// compared with its box once the database is open and the guess settled: no movement over 1 px, and
// the layout-shift entries (PerformanceObserver, buffered) add up to 0.01 at most.
export const STABLE = ['[data-location-action="geo"]', 'input[data-location-search]', '[data-location-action="map"]', '.ct-card:first-of-type', '.ct-card:last-of-type'];

export const MISMATCH = { en: { languages: ['en-US', 'en'], zone: 'Africa/Bangui', guess: 'CF' }, fr: { languages: ['fr-FR', 'fr'], zone: 'America/St_Vincent', guess: 'VC' }, ja: { languages: ['ja-JP', 'ja'], zone: 'America/Puerto_Rico', guess: 'PR' } };

export async function stableStart(lang, width) {
  const { languages, zone } = MISMATCH[lang];
  // The one deliberate open-then-reload left after E1 removed the double load of hooked pages (A3):
  // opened once, then reloaded with the probes, so the measured load is a warm one (fonts and chunks
  // cached), as this check has always measured. Moving the probes before the first navigation made
  // it a cold load, where the web fonts land at ~400 ms and shift the header at 960 px (CLS 0.014;
  // filed in the E1 report), which is not what this check is about. The hook is set by the harness
  // (hook: true) for both loads.
  const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/`, { width, mapTiles: 'stub', hook: true });
  await page.emulateTimezone(zone);
  await page.evaluateOnNewDocument((langs, sels) => {
    Object.defineProperty(Navigator.prototype, 'languages', { get: () => langs, configurable: true });
    Object.defineProperty(Navigator.prototype, 'language', { get: () => langs[0], configurable: true });
    const s = (window.__stable = { shifts: [], first: {} });
    new PerformanceObserver((list) => { for (const e of list.getEntries()) s.shifts.push({ value: e.value, at: Math.round(e.startTime), from: e.sources?.map((x) => x.node?.className || x.node?.nodeName).join(', ') }); }).observe({ type: 'layout-shift', buffered: true });
    // Each control's box in the first frame it exists (a rAF callback runs before that frame paints).
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
    const look = () => {
      for (const sel of sels) { const el = document.querySelector(sel); if (el && !s.first[sel]) s.first[sel] = box(el); }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, languages, STABLE);
  await page.reload({ waitUntil: 'domcontentloaded' });
  return page;
}

export async function moved(page) {
  // The database open, the guess refined (a microtask after the source) and twenty frames with
  // nothing changing.
  await page.waitForFunction(() => !!window.__ctTest?.store?.source.value, { timeout: 20_000 });
  await loadState(page);
  await page.waitForFunction(() => {
    const key = JSON.stringify([window.__ctTest.store.country.value, document.querySelector('#ct-root')?.getBoundingClientRect().height]);
    const w = (window.__still ??= { key, n: 0 });
    if (w.key === key) w.n += 1; else Object.assign(w, { key, n: 0 });
    return w.n >= 20;
  }, { polling: 'raf', timeout: 10_000 });
  return page.evaluate((sels) => {
    const s = window.__stable, out = [];
    for (const sel of sels) {
      const el = document.querySelector(sel), a = s.first[sel];
      if (!el || !a) continue;
      const r = el.getBoundingClientRect(), b = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
      const d = Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(b[k] - a[k])));
      if (d > 1) out.push(`${sel}: ${['x', 'y', 'w', 'h'].map((k) => `${Math.round(a[k])}→${Math.round(b[k])}`).join(' ')}`);
    }
    const cls = s.shifts.reduce((n, e) => n + e.value, 0);
    return { out, cls, shifts: s.shifts, country: window.__ctTest.store.country.value, seen: sels.filter((x) => s.first[x]) };
  }, STABLE);
}
