// Shared by the consortium browser tests (one file per owner, review C1): the installed index, the
// English strings, the §7 variants, accessibility-tree readers and the plant data the tests name.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { after, afterEach, before, beforeEach } from 'node:test';
import { fixture, startHarness, VARIANTS, variantName } from './harness.mjs';
import { ROOT } from './serve.mjs';

// The file's harness (one wrangler dev and one Chrome per test file), started before its first test
// and closed after its last; `h` is a live binding, so the shared helper modules (p5-helpers,
// seams-helpers) reach the same harness as the file that called useHarness(). Hooks are bounded
// (A10, failure row F9): start 120 s, close 30 s; each test by the runner's --test-timeout (90 s).
// A failed test leaves its pages' console, network log and a screenshot under
// test-results/browser/<file>/<test>/ (./trace.mjs) and prints where.
export let h;
export function useHarness(options) {
  before(async () => { h = await startHarness(options); }, { timeout: 120_000 });
  after(async () => { await h?.close(); }, { timeout: 30_000 });
  beforeEach(() => { h?.beginTest(); });
  afterEach(async (t) => {
    if (t.passed || !h) return;
    const dir = await h.failTest(t.filePath ?? process.argv[1], t.fullName ?? t.name, t.error);
    process.stderr.write(`# trace of "${t.name}": ${dir}\n`);
  }, { timeout: 15_000 });
}

export const index = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'consortium-index.json'), 'utf8'));
export const en = JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'translations', 'en.json'), 'utf8'));

// Variants by purpose (E1 design check A7), each as a subtest named for its variant:
// - layoutVariants: all four of §7 (390/1280 px × light/dark), for a test that asserts geometry,
//   overflow, size or theme;
// - behaviour: 1280 px light only (theme never changes behaviour), plus 390 px light with
//   { phone: true } where the DOM differs below 960 px (the phone grid, stepper or sheets).
export const layoutVariants = async (t, fn) => { for (const v of VARIANTS) await t.test(variantName(v), () => fn(v)); };
const BEHAVIOUR_VARIANTS = { desktop: [{ width: 1280, theme: 'light' }], phone: [{ width: 390, theme: 'light' }, { width: 1280, theme: 'light' }] };
export const behaviour = async (t, fn, { phone = false } = {}) => { for (const v of BEHAVIOUR_VARIANTS[phone ? 'phone' : 'desktop']) await t.test(variantName(v), () => fn(v)); };

export const has = async (page, selector, timeout = 2500) => !!(await page.waitForSelector(selector, { timeout }).catch(() => null));
// Waits until nothing moves under a click aimed at selector: the window's scroll offset and the
// element's box unchanged over five animation frames. The site scrolls smoothly (global.css html
// scroll-behavior), so the focus and scrollIntoView a view change makes animate for a few hundred ms,
// and page.click() measures the box first and presses a moment later: a click aimed during the
// animation lands where the control was.
export async function settled(page, selector, timeout = 5000) {
  await page.waitForFunction((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    const now = r ? `${scrollX}:${scrollY}:${r.left}:${r.top}` : null;
    const s = (window.__ctSettle ??= { sel, at: null, n: 0 });
    if (s.sel !== sel) Object.assign(s, { sel, at: null, n: 0 });
    if (now !== null && now === s.at) s.n += 1; else { s.at = now; s.n = 0; }
    if (s.n < 5) return false;
    delete window.__ctSettle;
    return true;
  }, { polling: 'raf', timeout }, selector);
}
// A node of the accessibility tree by role and exact name.
export const aria = (role, name) => `::-p-aria([role="${role}"][name="${name.replace(/"/g, '\\"')}"])`;

// The accessibility tree, flattened: [{ role, name, checked, pressed, value, level, disabled }].
// The full tree (H11): puppeteer's "interesting only" view drops tables, rows, cells and groups, which
// the tests ask for. Inline text boxes and unnamed wrappers are left out, and Chrome's "image" role is read as
// the ARIA "img".
const SKIP = new Set(['none', 'generic', 'InlineTextBox', 'LineBreak']);
export async function axNodes(page) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n.role === 'image') n.role = 'img';
    if (!SKIP.has(n.role) || (n.role === 'generic' && n.name)) out.push(n);
    for (const c of n.children ?? []) walk(c);
  };
  walk(await page.accessibility.snapshot({ interestingOnly: false }));
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
