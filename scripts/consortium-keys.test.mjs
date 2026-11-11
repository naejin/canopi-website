// The consortium tool's words (design check §6, H9): every consortium.* key in the locale files is
// asked for by the island or its page, and every key the island asks for by name exists in all 11
// files. A key is asked for when the island names it in T('…') or P('…'), matches a template key
// (`phase.${p}.plain`), is in INDIRECT below (a key held in a table and passed to T later), or is read
// by ConsortiumPage.astro. The same holds for the site-wide correction.* keys the island's form uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const locales = readdirSync(join(root, 'i18n/translations')).filter((f) => f.endsWith('.json'));
const words = Object.fromEntries(locales.map((f) => [f.slice(0, -5), JSON.parse(readFileSync(join(root, 'i18n/translations', f), 'utf8'))]));
const island = readdirSync(join(root, 'islands/consortium'), { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => readFileSync(join(root, 'islands/consortium', f), 'utf8')).join('\n');
const page = readFileSync(join(root, 'components/consortium/ConsortiumPage.astro'), 'utf8');
const short = Object.keys(words.en).filter((k) => k.startsWith('consortium.') && !k.startsWith('consortium.block.')).map((k) => k.slice(11));

const templates = [...island.matchAll(/`([a-z][\w.]*\$\{[^`]*)`/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, '\u0000'))
  .filter((b) => /^[\w.\u0000]+$/.test(b)).map((b) => new RegExp(`^${b.replace(/\./g, '\\.').replace(/\u0000/g, '[\\w-]+')}$`));
// 'correction.…' and 'climate.…' in the island are the site-wide keys of those names, never consortium.*.
const siteWide = (k) => /^(correction|climate)\./.test(k);
// The quoted keys in the first argument of every T( or P( call (a ternary names two).
function namedKeys(src) {
  const out = new Set();
  for (const m of src.matchAll(/\b[TP]\(/g)) {
    let depth = 0, i = m.index + m[0].length, arg = '';
    for (; i < src.length; i++) {
      const c = src[i];
      if (depth === 0 && (c === ',' || c === ')')) break;
      if (c === '(' || c === '[' || c === '{') depth++;
      if (c === ')' || c === ']' || c === '}') depth--;
      arg += c;
    }
    for (const q of arg.matchAll(/'([\w.]+)'/g)) out.add(q[1]);
  }
  return out;
}
const named = namedKeys(island);
// Keys the island holds in a table and passes to T later, each checked to be in the sources: the
// layer values' labels (views/layers.ts), the load screens (App.tsx), the correction form's errors and
// results (views/Correction.tsx).
const INDIRECT = [
  't.bloom', 't.fruit', 't.sowing', 't.wind',
  'load.tooOld', 'load.wasmBlocked', 'load.toolFailed', 'load.fetch', 'load.damaged', 'load.stale',
  'correction.fieldError', 'correction.proposedError', 'correction.unchanged', 'correction.tooLong', 'correction.emailError',
  'correction.consentError', 'correction.invalid', 'correction.failed', 'correction.refused', 'correction.offline',
];
const fromPage = new Set([...page.matchAll(/\b(?:tr|P)\('([\w.]+)'/g)].map((m) => m[1]));
const asked = (k) => named.has(k) || INDIRECT.includes(k) || fromPage.has(k) || templates.some((re) => re.test(k));

test('no consortium key is left unused (H9)', () => {
  assert.deepEqual(short.filter((k) => !asked(k)), []);
});

test('no correction.* key is left unused', () => {
  const correction = Object.keys(words.en).filter((k) => k.startsWith('correction.'));
  assert.ok(correction.length > 10);
  assert.deepEqual(correction.filter((k) => !asked(k)), []);
});

test('every INDIRECT key is written in the island as a quoted string', () => {
  for (const k of INDIRECT) assert.ok(island.includes(`'${k}'`), k);
});

test('every key the island asks for by name is in all 11 locale files', () => {
  const direct = new Set([...island.matchAll(/\b[TP]\('([\w.]+)'/g)].map((m) => m[1]));
  assert.ok(direct.size > 200);
  for (const [lang, w] of Object.entries(words)) {
    const missing = [...direct].filter((k) => !(siteWide(k) ? k in w : `consortium.${k}` in w));
    assert.deepEqual(missing, [], lang);
  }
});
