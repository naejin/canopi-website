// The consortium tool's words (design check §6, H9): every consortium.* key in the locale files is
// asked for by the island or its page, and every key the island asks for by name exists in all 11
// files. A key is asked for when its short name (without "consortium.") is a quoted string in the
// island's sources, matches a template of them (`phase.${p}.plain`), or is read by ConsortiumPage.astro.
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
const quoted = new Set([...island.matchAll(/'([\w.]+)'/g)].map((m) => m[1]).filter((k) => !siteWide(k)));
const fromPage = new Set([...page.matchAll(/\b(?:tr|P)\('([\w.]+)'/g)].map((m) => m[1]));
const asked = (k) => quoted.has(k) || fromPage.has(k) || templates.some((re) => re.test(k));

test('no consortium key is left unused (H9)', () => {
  assert.deepEqual(short.filter((k) => !asked(k)), []);
});

test('every key the island asks for by name is in all 11 locale files', () => {
  const named = [...island.matchAll(/\b[TP]\('([\w.]+)'/g)].map((m) => m[1]);
  assert.ok(named.length > 200);
  for (const [lang, w] of Object.entries(words)) {
    const missing = [...new Set(named)].filter((k) => !(siteWide(k) ? k in w : `consortium.${k}` in w));
    assert.deepEqual(missing, [], lang);
  }
});
