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

// The engine's counts for the panel, on the page's own state: per period, the list's plants judged and
// outside on neither night side ("take these nights"), the fit ones (fits or second look), the fit ones
// where the place is drier than their recorded band, and the members drier today and later.
export const engineCounts = (page) => page.evaluate(() => {
  const s = window.__ctTest.store, rule = s.verdictRule.value, list = s.pool.value ?? [];
  const periods = ['1991-2020', '2041-2070', '2071-2099'];
  const drier = (v) => v.factors.some((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low);
  return periods.map((p) => {
    const vs = rule.verdicts(list, { ...s.verdictContext.value, period: p });
    let nights = 0, fit = 0, dry = 0;
    for (const t of list) {
      const v = vs.get(t.id);
      if (!v) continue;
      const ok = v.level === 'fits' || v.level === 'look';
      if (ok) fit++;
      if (ok && drier(v)) dry++;
      if (v.range === 'judged' && !v.factors.some((f) => (f.factor === 'cold' || f.factor === 'mild') && f.level === 'outside')) nights++;
    }
    return { period: p, of: list.length, nights, fit, drier: dry };
  });
});

// The store's edits and today's merged figures.
export const edits = (page) => page.evaluate(() => ({ ...window.__ctTest.store.siteEdits.value }));
export const inputs = (page) => page.evaluate(() => { const i = window.__ctTest.store.siteInputs.value; return { nights: i.nights, days: i.days, rain: i.rain, dryMonths: i.dryMonths, soilPh: i.soilPh, pots: i.pots }; });
// The page's number words (the page language's digits and units), as format.ts writes them.
export const tempEn = (c) => `${c < 0 ? '−' : ''}${Math.abs(c).toFixed(1)} °C`;

// The toast's text once it no longer reads "Counting…".
export async function summary(page, timeout = 20_000) {
  const ok = await page.waitForFunction(() => { const t = window.__ctTest.store.toast.value?.text ?? ''; return t && !t.includes('Counting'); }, { timeout }).then(() => true, () => false);
  assert.ok(ok, 'board: the change summary arrives on the toast');
  return page.evaluate(() => window.__ctTest.store.toast.value.text);
}
// The aria-invalid state and message of the editor's number field.
export const fieldState = (page) => page.evaluate(() => {
  const f = document.querySelector('main fieldset input[type="text"]');
  if (!f) return null;
  const msg = f.getAttribute('aria-describedby')?.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ') ?? '';
  return { invalid: f.getAttribute('aria-invalid') === 'true', message: msg.replace(/\s+/g, ' ').trim(), focused: document.activeElement === f };
});
