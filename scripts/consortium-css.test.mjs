// The consortium's styles (src/styles/consortium/*.css; review C10). Two site rules, checked here so
// no stream breaks them:
// - breakpoints are max-width 639px and min-width 960px only (no tablet tier, no 1199/1200px tier,
//   no em/rem widths, no range syntax);
// - green is for plant content only, never chrome (CLAUDE.md "No green in UI chrome"). A declaration
//   whose value holds a green (a hex colour of green hue, a stratum green token, or the site's
//   --leaf* tokens, or a custom property aliasing one) is allowed only in a strata token definition
//   (--s-*) or in a rule whose selector names a stratum (`[data-stratum…]`, `.stratum…`): the drawing, the matrix row marks, the legend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

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

test('stratum greens never colour chrome: only strata tokens and rules naming a stratum hold a green', () => {
  for (const { name, css } of sheets) {
    for (const [selector, body] of rules(css)) {
      for (const [prop, value] of declarations(body)) {
        if (!holdsGreen(value, defs)) continue;
        if (prop.startsWith('--s-')) continue;
        assert.match(selector, /stratum/, `${name}: "${selector}" sets ${prop} to a green; green is for plant content (a selector naming a stratum)`);
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
