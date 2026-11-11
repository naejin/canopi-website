// The consortium's styles (src/styles/consortium/*.css; review C10). Two site rules, checked here so
// no stream breaks them:
// - breakpoints are max-width 639px and min-width 960px only (no tablet tier, no 1199/1200px tier);
// - green is for plant content only, never chrome (CLAUDE.md "No green in UI chrome"). A declaration
//   whose value holds a green (a hex colour of green hue, a stratum green token, or the site's
//   --leaf* tokens) is allowed only in a strata token definition (--s-*) or in a rule whose selector
//   names a stratum (`[data-stratum…]`, `.stratum…`): the drawing, the matrix row marks, the legend.
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
const GREEN_TOKEN = /var\(\s*--(?:s-high(?:-ink)?|leaf[\w-]*)\s*[,)]/;
export const holdsGreen = (value) => GREEN_TOKEN.test(value) || [...value.matchAll(/#[0-9a-f]{3,8}\b/gi)].some(([h]) => isGreenHex(h));

// Innermost rules: [selector, declarations]; a rule inside @media keeps its own selector.
const rules = (css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => [sel.trim(), body]);

test('consortium styles use the site breakpoints only: max-width 639px and min-width 960px', () => {
  for (const { name, css } of sheets) {
    for (const [, q] of css.matchAll(/@media([^{]+)\{/g)) {
      for (const [, kind, px] of q.matchAll(/\((max|min)-width:\s*(\d+)px\)/g)) {
        assert.ok((kind === 'max' && px === '639') || (kind === 'min' && px === '960'), `${name}: @media${q.trim()} is not a site breakpoint`);
      }
    }
  }
});

test('stratum greens never colour chrome: only strata tokens and rules naming a stratum hold a green', () => {
  for (const { name, css } of sheets) {
    for (const [selector, body] of rules(css)) {
      for (const decl of body.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const prop = decl.slice(0, i).trim(), value = decl.slice(i + 1);
        if (!holdsGreen(value)) continue;
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
});
