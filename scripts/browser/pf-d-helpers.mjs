// pf-d's own helpers (consortium-pf-d.browser.test.mjs; chunk 3): a place of the scenario file the
// location fixtures lack (Mendoza), the Place step with the panel, and the panel's figures from the
// engine on the page's own state (the verdict rule over the list, per period: the board-figures rule,
// never a board number).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lookupAt } from './location-fixtures.mjs';
import { loadCase } from './pf-helpers.mjs';

const FILE = JSON.parse(readFileSync(new URL('../fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));

// Sets store.location at a place of the scenario file (its coordinates, read from the real tiles).
export async function atPlace(page, name) {
  const { lat, lon } = FILE.places[name];
  const lookup = await lookupAt(lat, lon);
  await page.evaluate((loc) => { window.__ctTest.store.location.value = loc; }, { lat, lon, source: 'map', label: name, lookup });
  return lookup;
}

// The board's Mendoza palette (case mendoza-board-rain: the Arid list, 8 plants) at Mendoza, no edits.
export async function mendoza(opts = {}) {
  const page = await loadCase('mendoza-board-rain', { site: null, ...opts });
  await atPlace(page, 'mendoza');
  await page.waitForFunction(() => !!window.__ctTest.store.location.value?.lookup && !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 });
  return page;
}

// A scenario case's palette, then the Place step (where "Your place in figures" stands).
export async function placeStep(id, opts = {}) {
  const page = await loadCase(id, opts);
  await page.evaluate(() => { window.__ctTest.store.view.value = 'start'; });
  return page;
}

// The engine's figures for the panel, on the page's own state: the page's verdict rule judges the list
// for each period (the store's own context), and the core functions the panel calls count them
// (site-change.ts lineCounts, limitStatus, rangeMoves; never a copy of their arithmetic, C3, C12).
const { lineCounts, limitStatus, rangeMoves } = await import('../../src/lib/consortium/site-change.ts');
async function engineVerdicts(page) {
  const { list, byPeriod } = await page.evaluate(() => {
    const s = window.__ctTest.store, rule = s.verdictRule.value, pool = s.pool.value ?? [];
    const out = {};
    for (const p of ['1991-2020', '2041-2070', '2071-2099']) {
      const vs = rule.verdicts(pool, { ...s.verdictContext.value, period: p });
      out[p] = pool.map((t) => [t.id, vs.get(t.id)]).filter(([, v]) => v).map(([id, v]) => [id, { level: v.level, range: v.range, notes: v.notes, factors: v.factors, limiting: v.limiting }]);
    }
    return { list: pool.map((t) => ({ id: t.id, role: t.role })), byPeriod: out };
  });
  return { list, byPeriod: Object.fromEntries(Object.entries(byPeriod).map(([p, rows]) => [p, new Map(rows)])) };
}
// Per period: the list's plants that take the nights, the fit ones, those drier here than their
// recorded band, those carrying the dryness note.
export async function engineCounts(page) {
  const { list, byPeriod } = await engineVerdicts(page);
  return lineCounts(list, byPeriod).periods.map(({ period, of, nights, fit, drier, noted }) => ({ period, of, nights, fit, drier, noted }));
}
// Per period the range sides (outside and near the edge: core lineCounts sides), each limit line's
// status (core limitStatus: limits, free or not checked, its highest count and the period it reaches
// it), and how the list moves as it warms (core rangeMoves: the side most drop out on, the arrivals).
export async function engineSides(page) {
  const { list, byPeriod } = await engineVerdicts(page);
  const c = lineCounts(list, byPeriod);
  return { sides: c.periods.map((p) => p.sides), status: limitStatus(c), moves: rangeMoves(list, byPeriod), of: list.length };
}

// The store's edits and today's merged figures.
export const edits = (page) => page.evaluate(() => ({ ...window.__ctTest.store.siteEdits.value }));
export const inputs = (page) => page.evaluate(() => { const i = window.__ctTest.store.siteInputs.value; return { nights: i.nights, days: i.days, rain: i.rain, dryMonths: i.dryMonths, soilPh: i.soilPh, pots: i.pots }; });
// A temperature as the panel's text reads it in English: one decimal always, as the boards write it
// ("12.0 °C"), a true minus; the narrow space before ° reads as a plain space once collapsed (says).
export const tempEn = (c) => `${c < 0 ? '\u2212' : ''}${Math.abs(c).toFixed(1)} °C`;

// The toast's text once it no longer reads "Counting…", its spaces collapsed (the narrow one before °C too).
export async function summary(page, timeout = 20_000) {
  const ok = await page.waitForFunction(() => { const t = window.__ctTest.store.toast.value?.text ?? ''; return t && !t.includes('Counting'); }, { timeout }).then(() => true, () => false);
  assert.ok(ok, 'board: the change summary arrives on the toast');
  return page.evaluate(() => window.__ctTest.store.toast.value.text.replace(/\s+/g, ' '));
}
// The aria-invalid state and message of the editor's number field.
export const fieldState = (page) => page.evaluate(() => {
  const f = document.querySelector('main fieldset input[type="text"]');
  if (!f) return null;
  const msg = f.getAttribute('aria-describedby')?.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ') ?? '';
  return { invalid: f.getAttribute('aria-invalid') === 'true', message: msg.replace(/\s+/g, ' ').trim(), focused: document.activeElement === f };
});

// The plant names the page shows for these ids (the store's own naming: the member or pool taxon).
export const namesOf = (page, ids) => page.evaluate((xs) => {
  const s = window.__ctTest.store, by = new Map((s.pool.value ?? []).map((t) => [t.id, t]));
  return xs.map((id) => by.get(id)).filter(Boolean).map((t) => t.names?.en || t.canonical_name);
}, ids);
// Whether an icon (an svg) stands in the smallest element of `root` that says `words`, before the words.
export const iconBefore = (page, words, root = 'main') => page.evaluate((w, r) => {
  const els = [...document.querySelector(r).querySelectorAll('*')].filter((e) => e.textContent.replace(/\s+/g, ' ').includes(w));
  const el = els.filter((e) => ![...e.children].some((c) => c.textContent.replace(/\s+/g, ' ').includes(w)))[0];
  if (!el) return null;
  let host = el;
  for (let k = 0; k < 3 && host; k++, host = host.parentElement) {
    const svg = host.querySelector('svg');
    if (svg && (svg.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING || el.contains(svg))) {
      const at = host.textContent.indexOf(w), before = host.textContent.slice(0, Math.max(0, at));
      return before.replace(/\s+/g, '').length <= 40;
    }
  }
  return false;
}, words, root);
// A control's look as the grower sees it: its colour against the accent token, underline, border, position.
export const lookOf = (page, role, name) => page.evaluate((r, n) => {
  const els = [...document.querySelectorAll(r === 'button' ? 'main button' : r)].filter((b) => ((b.getAttribute('aria-label') ?? b.textContent).replace(/\s+/g, ' ').trim()) === n && b.getClientRects().length);
  const b = els[0];
  if (!b) return null;
  const cs = getComputedStyle(b), probe = document.createElement('span');
  probe.style.color = 'var(--accent-ink)';
  b.parentElement.appendChild(probe);
  const accent = getComputedStyle(probe).color;
  probe.remove();
  const box = b.getBoundingClientRect();
  return { color: cs.color, accent, underline: cs.textDecorationLine.includes('underline'), border: cs.borderTopStyle === 'none' || cs.borderTopColor === 'rgba(0, 0, 0, 0)' || cs.borderTopWidth === '0px', bg: cs.backgroundColor, icon: !!b.querySelector('svg'), x: box.left, y: box.top, bottom: box.bottom, count: els.length };
}, role, name);
// A board place of the scenario file (seville-board, mendoza-board): its real lookup with the board's
// climate slots (the 0W board cases: the boards' values in the historical and SSP2-4.5 slots).
export async function atBoardPlace(page, name) {
  const { lat, lon, periods } = FILE.places[name];
  const lookup = await lookupAt(lat, lon);
  lookup.climate = { ...lookup.climate, periods };
  await page.evaluate((loc) => { window.__ctTest.store.location.value = loc; }, { lat, lon, source: 'map', label: name, lookup });
  await page.waitForFunction(() => !!window.__ctTest.store.memberVerdicts.value, { timeout: 20_000 });
  return lookup;
}
// The grower's own new location at a place of the scenario file, through the store's placeAt (a new
// climate cell clears the grower's values, A7), as state/location.ts locate does.
export async function movedTo(page, name) {
  const { lat, lon } = FILE.places[name];
  const lookup = await lookupAt(lat, lon);
  await page.evaluate((loc) => { window.__ctTest.store.placeAt(loc); }, { lat, lon, source: 'map', label: name, lookup });
  return lookup;
}
