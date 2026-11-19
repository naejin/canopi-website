// The consortium's styles (src/styles/consortium/*.css; review C10). Site rules, checked here so no
// stream breaks them:
// - breakpoints are max-width 639px and min-width 960px only (no tablet tier, no 1199/1200px tier,
//   no em/rem widths, no range syntax);
// - colour carries meaning (owner 2026-11-13; plant-palette-architecture 3.5): the meaning colours
//   live in src/styles/tokens.css (--role-*, --light-*, --level-*), so consortium CSS, TSX and TS
//   hold no raw hex colour (print.css excepted; base.css's stratum and bar token definitions until
//   their stream moves them to tokens.css);
// - a green (a hex colour of green hue, a stratum green token, the site's --leaf* tokens, or a
//   custom property aliasing one) is plant content: allowed only in a strata or role token
//   definition (--s-*, --role-*) or in a rule whose selector names a stratum or a job
//   (`[data-stratum…]`, `.stratum…`, `[data-job…]`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../src/styles/consortium/', import.meta.url);
const sheets = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => ({ name: f, css: readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }));

// Hue in degrees and saturation (HSL) of #rgb / #rrggbb.
export function hueOf(hex) {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h.slice(0, 3)].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return { hue: 0, sat: 0 };
  const sat = d / (1 - Math.abs(2 * l - 1));
  const hue = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { hue: (hue + 360) % 360, sat };
}
// Green: hue 75–175° with some saturation (Okabe-Ito bluish green #009E73 is 164°; sky blue is 202°).
export const isGreenHex = (hex) => { const { hue, sat } = hueOf(hex); return sat > 0.2 && hue >= 75 && hue <= 175; };
const GREEN_TOKEN = /^--(?:s-high(?:-ink)?|leaf[\w-]*)$/;
// A value holds a green if it has a green hex, names a green token, or names a custom property whose
// value (any definition in these sheets) holds a green: aliases are followed, so `--chip: var(--s-high)`
// then `color: var(--chip)` is caught.
export function holdsGreen(value, defs = new Map(), seen = new Set()) {
  if ([...value.matchAll(/#[0-9a-f]{3,8}\b/gi)].some(([h]) => isGreenHex(h))) return true;
  for (const [, name] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
    if (GREEN_TOKEN.test(name)) return true;
    if (seen.has(name)) continue;
    seen.add(name);
    if ((defs.get(name) ?? []).some((v) => holdsGreen(v, defs, seen))) return true;
  }
  return false;
}

// Innermost rules: [selector, declarations]; a rule inside @media keeps its own selector.
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body]);
const declarations = (body) => body.split(';').map((d) => { const i = d.indexOf(':'); return i < 0 ? null : [d.slice(0, i).trim(), d.slice(i + 1)]; }).filter(Boolean);
// Every custom property definition in the consortium sheets: name → [values].
const defs = new Map();
for (const { css } of sheets) for (const [, body] of rules(css)) for (const [prop, value] of declarations(body)) if (prop.startsWith('--')) defs.set(prop, [...(defs.get(prop) ?? []), value]);

// The width conditions of a media query that are not the site's two: any unit (px, em, rem…), the
// min-/max- form or the range syntax (width <= 639px, 640px <= width < 960px).
export function badWidthConditions(query) {
  const conditions = [...query.matchAll(/\(([^()]*)\)/g)].map(([, c]) => c.replace(/\s+/g, ' ').trim());
  return conditions.filter((c) => /(^|[^-\w])(min-|max-)?(device-)?width\b/.test(c) && c !== 'max-width: 639px' && c !== 'min-width: 960px');
}

test('consortium styles use the site breakpoints only: max-width 639px and min-width 960px', () => {
  for (const { name, css } of sheets) {
    for (const [, q] of css.matchAll(/@media([^{]+)\{/g)) assert.deepEqual(badWidthConditions(q), [], `${name}: @media${q.trim()} is not a site breakpoint`);
  }
});

test('greens never colour chrome: only strata and role tokens and rules naming a stratum or a job hold a green', () => {
  for (const { name, css } of sheets) {
    for (const [selector, body] of rules(css)) {
      for (const [prop, value] of declarations(body)) {
        if (!holdsGreen(value, defs)) continue;
        if (prop.startsWith('--s-') || prop.startsWith('--role-')) continue;
        assert.match(selector, /stratum|\[data-job/, `${name}: "${selector}" sets ${prop} to a green; green is for plant content (a selector naming a stratum or a job)`);
      }
    }
  }
});

test('the green detector knows the palette', () => {
  assert.ok(isGreenHex('#009E73') && isGreenHex('#5FD3AE') && isGreenHex('#005C43') && isGreenHex('#5E7A3A'));
  assert.ok(!isGreenHex('#0072B2') && !isGreenHex('#E69F00') && !isGreenHex('#CC79A7') && !isGreenHex('#4A4237'));
  assert.ok(holdsGreen('1px solid var(--s-high)') && holdsGreen('var(--leaf-deep)') && !holdsGreen('var(--s-high-x)') && !holdsGreen('var(--accent)'));
  const aliases = new Map([['--chip', ['var(--s-high-ink)']], ['--chip2', ['var(--chip)']], ['--loop', ['var(--loop)']]]);
  assert.ok(holdsGreen('var(--chip2)', aliases), 'aliases are followed');
  assert.ok(!holdsGreen('var(--loop)', aliases), 'a loop ends');
});

test('the breakpoint reader catches other units and the range syntax', () => {
  assert.deepEqual(badWidthConditions(' (max-width: 639px)'), []);
  assert.deepEqual(badWidthConditions(' screen and (min-width: 960px) and (prefers-color-scheme: dark)'), []);
  assert.equal(badWidthConditions(' (max-width: 40em)').length, 1);
  assert.equal(badWidthConditions(' (min-width: 60rem)').length, 1);
  assert.equal(badWidthConditions(' (width <= 639px)').length, 1);
  assert.equal(badWidthConditions(' (640px <= width < 960px)').length, 1);
  assert.equal(badWidthConditions(' (max-width: 1199px)').length, 1);
});

// A raw hex colour: #rgb, #rgba, #rrggbb or #rrggbbaa, not part of a longer word (an id like #a1 in a
// selector would be caught: none is used).
const HEX = /#[0-9a-f]{3,8}\b/gi;
// base.css's stratum (--s-*) and bar (--bar) definitions, the one exception until they move to tokens.css.
const BASE_TOKEN = /^--(s-[\w-]+|bar)$/;
const islandFiles = (url) => readdirSync(url, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && /\.(tsx?|mjs|js)$/.test(e.name)).map((e) => join(e.parentPath ?? e.path, e.name));

test('no raw hex colour in consortium CSS (print.css excepted) or island code: the meaning tokens live in tokens.css', () => {
  for (const { name, css } of sheets) {
    if (name === 'print.css') continue;
    for (const [selector, body] of rules(css)) {
      for (const [prop, value] of declarations(body)) {
        const hex = value.match(HEX);
        if (!hex) continue;
        if (name === 'base.css' && BASE_TOKEN.test(prop)) continue;
        assert.fail(`${name}: "${selector}" ${prop} holds ${hex.join(', ')}: use a token from src/styles/tokens.css`);
      }
    }
  }
  for (const file of islandFiles(new URL('../src/islands/consortium/', import.meta.url))) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const hex = [...code.matchAll(/['"`(:,\s]#[0-9a-f]{3,8}\b/gi)].map(([m]) => m.slice(1));
    assert.deepEqual(hex, [], `${file}: raw hex colour ${hex.join(', ')}; use a token from src/styles/tokens.css`);
  }
});

test('the meaning tokens are defined in tokens.css for light and both dark blocks', () => {
  const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  const blocks = tokens.split(/:root\[data-theme="dark"\]|@media \(prefers-color-scheme: dark\)/);
  assert.equal(blocks.length, 3, 'light, dark and the dark media block');
  for (const t of ['food', 'soil', 'helpers', 'mulch', 'ground', 'shelter']) for (const b of blocks) assert.match(b, new RegExp(`--role-${t}:\\s*#[0-9A-F]{6};`), `--role-${t} in each block`);
  for (const t of ['emergent', 'high', 'medium', 'low', 'none', 'outline']) assert.match(blocks[0], new RegExp(`--light-${t}:`));
  for (const t of ['look', 'outside', 'fits', 'unknown']) assert.match(blocks[0], new RegExp(`--level-${t}:\\s*var\\(--`));
});

// Every ct-* class the island writes in a class attribute is styled by a sheet under src/styles/ (PP-B
// commit 0a', when matrix.css went and its shared rules moved to shell.css and print.css), except the
// hook-only names below: containers and rows that tests, focus.ts or print.css's element rules find,
// never styled by class. A class added here needs a reason; a class that gains a rule leaves the list.
const HOOK_ONLY = new Set([
  'ct-climates', 'ct-corr-current', 'ct-corr-sent', 'ct-country-note', 'ct-details', 'ct-future-plants',
  'ct-load-failed', 'ct-location-result', 'ct-location-row', 'ct-paste', 'ct-pool', 'ct-print-marks', 'ct-print-stage',
  'ct-print-table', 'ct-share-location', 'ct-sv-plant', 'ct-swap', 'ct-toast-text',
]);
test('every ct-* class literal in the island is defined in a stylesheet, or listed as hook-only', () => {
  const island = new URL('../src/islands/consortium/', import.meta.url);
  const used = new Map();
  for (const f of readdirSync(island, { recursive: true })) {
    if (!/\.(ts|tsx)$/.test(f)) continue;
    const text = readFileSync(new URL(f, island), 'utf8');
    // class="…", class={…} (one level of nested braces: a template literal's ${…}); a name followed by
    // ${ is a prefix built at run time and is not read.
    for (const m of text.matchAll(/\bclass(?:Name)?=(?:"([^"]*)"|\{([^}]*(?:\{[^}]*\}[^}]*)*)\})/g)) {
      for (const [c] of (m[1] ?? m[2]).matchAll(/\bct-[a-z0-9-]*[a-z0-9](?![\w$-])/g)) used.set(c, [...(used.get(c) ?? []), f]);
    }
  }
  assert.ok(used.size > 100, `class literals found (${used.size})`);
  const styles = new URL('../src/styles/', import.meta.url);
  const defined = new Set();
  for (const f of readdirSync(styles, { recursive: true })) {
    if (!f.endsWith('.css')) continue;
    for (const [, c] of readFileSync(new URL(f, styles), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(ct-[a-z0-9-]+)/g)) defined.add(c);
  }
  assert.deepEqual([...used.keys()].filter((c) => !defined.has(c) && !HOOK_ONLY.has(c)).map((c) => `${c} (${[...new Set(used.get(c))].join(', ')})`), [], 'classes with no rule');
  assert.deepEqual([...HOOK_ONLY].filter((c) => defined.has(c) || !used.has(c)), [], 'a hook-only name that gained a rule or left the island leaves the list');
});
