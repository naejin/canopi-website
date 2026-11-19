// The locale files and a core Line said in them, shared by the unit files that check words
// (consortium-pf-f.test.mjs, consortium-pp-c2.test.mjs; check:dup, M43).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const { formatMm } = await import('../src/islands/consortium/format.ts');
const dir = new URL('../src/i18n/translations/', import.meta.url);
// Every locale's flat key map, by language.
export const words = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));

// A Line in a language's words as the island says it (strings.ts P for a count, words.ts for a
// millimetre variable and a list of Lines): the plural form for the count, # the number, then the {vars}.
export function said(l, lang) {
  let text = words[lang][l.key];
  assert.ok(text, `${lang} has ${l.key}`);
  if (typeof l.count === 'number') {
    const forms = Object.fromEntries(text.split(' | ').map((f) => { const i = f.indexOf(': '); return [f.slice(0, i), f.slice(i + 2)]; }));
    text = (forms[new Intl.PluralRules(lang).select(l.count)] ?? forms.other).replace('#', String(l.count));
  }
  const parts = Object.fromEntries(Object.entries(l.parts ?? {}).map(([k, p]) => [k, Array.isArray(p) ? new Intl.ListFormat(lang, { type: 'conjunction' }).format(p.map((x) => said(x, lang))) : said(p, lang)]));
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in parts ? parts[k] : k.endsWith('Mm') ? formatMm(l.vars[k], lang) : k.startsWith('temp') ? `${l.vars[k]} °C` : String(l.vars[k])));
}
