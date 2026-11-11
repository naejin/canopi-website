// Shared by the consortium browser tests (one file per owner, review C1): the installed index, the
// English strings, the §7 variants, accessibility-tree readers and the plant data the tests name.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fixture, VARIANTS, variantName } from './harness.mjs';
import { ROOT } from './serve.mjs';

export const index = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'consortium-index.json'), 'utf8'));
export const en = JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'translations', 'en.json'), 'utf8'));

// Each variant of §7 (390/1280 px, light/dark) as a subtest.
export const eachVariant = async (t, fn) => { for (const v of VARIANTS) await t.test(variantName(v), () => fn(v)); };

export const has = async (page, selector, timeout = 2500) => !!(await page.waitForSelector(selector, { timeout }).catch(() => null));
// A node of the accessibility tree by role and exact name.
export const aria = (role, name) => `::-p-aria([role="${role}"][name="${name.replace(/"/g, '\\"')}"])`;

// The accessibility tree, flattened: [{ role, name, checked, pressed, value, level, disabled }].
export async function axNodes(page) {
  const out = [];
  const walk = (n) => { if (!n) return; out.push(n); for (const c of n.children ?? []) walk(c); };
  walk(await page.accessibility.snapshot({ interestingOnly: true }));
  return out;
}
// Waits for a node whose role matches and whose name matches (string: exact; RegExp: test).
export async function findAx(page, { role, name }, timeout = 4000) {
  const ok = (n) => (!role || n.role === role) && (name === undefined || (name instanceof RegExp ? name.test(n.name ?? '') : n.name === name));
  const until = Date.now() + timeout;
  for (;;) {
    const hit = (await axNodes(page)).find(ok);
    if (hit || Date.now() > until) return hit ?? null;
    await new Promise((r) => setTimeout(r, 150));
  }
}
export const countAx = async (page, pred) => (await axNodes(page)).filter(pred).length;

// Runs fn on a read-only node:sqlite copy of a gzipped database.
async function withDb(gz, fn) {
  const { DatabaseSync } = await import('node:sqlite');
  const dir = mkdtempSync(join(tmpdir(), 'consortium-browser-'));
  try {
    const path = join(dir, 'db.sqlite');
    writeFileSync(path, gunzipSync(gz));
    const db = new DatabaseSync(path, { readOnly: true });
    try { return fn(db); } finally { db.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
export const realDb = (fn) => withDb(readFileSync(join(ROOT, 'public', index.files[0].url)), fn);
export const fixtureDb = (fn) => withDb(fixture().gz, fn);

// The English name the page shows for a canonical name (falls back to the canonical name).
export const englishName = (db, canonical) => db.prepare("SELECT coalesce((SELECT n.name FROM plant_names n WHERE n.plant = p.plant AND n.locale = 'en'), p.canonical_name) name FROM plants p WHERE p.canonical_name = ?").get(canonical)?.name ?? null;
