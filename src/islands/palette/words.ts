// Lines in words (the core's Line: an i18n key, its variables, a count for plurals), outside views/ so
// the store's toasts say them too (v14 pf commit 0W: the bulk add and remove toasts, the change
// summary): views/kit/fit.tsx re-exports say and sayAll and draws the fit icons. Numbers are formatted
// for the page language by format.ts; a country code is said as the country's name.
import type { Line } from '../../lib/palette/index.ts';
import { formatLength, formatMm, formatNumber, formatTemp } from './format.ts';
import { P, pageLang, T } from './strings.ts';

// A country's name in the page language (English where the browser has none for it), else its code.
const regionNames = new Map<string, Intl.DisplayNames>();
function countryName(code: string): string {
  try {
    const lang = pageLang();
    let names = regionNames.get(lang);
    if (!names) { names = new Intl.DisplayNames([lang, 'en'], { type: 'region' }); regionNames.set(lang, names); }
    return names.of(code) ?? code;
  } catch { return code; }
}

// A Line's variables for the page language: temp… in °C and len… in metres with their unit
// (format.ts), …Mm in millimetres, country an ISO code as the country's name, a year in plain digits (never "2,099"),
// every other number in the page's digits; each part (a Line, or Lines said as a list) in words. A
// plant's limit (tempBound) keeps its two decimals: 7.84 against a place's 5.8 is past the 2 °C
// margin and never reads as a rounded 7.8 within it.
function numberOf(k: string, v: number, lang: string): string {
  if (k.startsWith('temp')) return formatTemp(v, lang, k === 'tempBound' ? 2 : 1);
  if (k.startsWith('len')) return formatLength(v, lang);
  if (k.endsWith('Mm')) return formatMm(v, lang);
  if (k === 'year' || k.endsWith('Year')) return String(Math.round(v));
  return formatNumber(v, lang, 2);
}
function varsOf(l: Line): Record<string, string> {
  const lang = pageLang(), out: Record<string, string> = {};
  for (const [k, v] of Object.entries(l.vars)) {
    out[k] = typeof v === 'number' ? numberOf(k, v, lang) : k === 'country' && /^[A-Z]{2}$/.test(v) ? countryName(v) : v;
  }
  for (const [k, p] of Object.entries(l.parts ?? {})) out[k] = Array.isArray(p) ? listOf(p.map(words)) : words(p);
  return out;
}
const listOf = (items: string[]): string => {
  try { return new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items); } catch { return items.join(', '); }
};

// One Line's own words (no `also`). Keys come whole (consortium.<group>.<name>); strings.ts takes them
// without the "consortium." prefix. The line, palette and details groups are written as templates here
// (one segment after the group; the invasive areas two), so the unused-key check sees their keys.
function words(l: Line): string {
  const k = l.key.slice('consortium.'.length);
  const [group, ...rest] = k.split('.'), name = rest.join('.');
  const n = l.count, vars = varsOf(l);
  if (group === 'line') return n === undefined ? T(`line.${name}`, vars) : P(`line.${name}`, n, vars);
  if (group === 'palette') return n === undefined ? T(`palette.${name}`, vars) : P(`palette.${name}`, n, vars);
  if (group === 'details' && rest[0] === 'invArea') return T(`details.invArea.${rest[1]}`);
  if (group === 'details') return T(`details.${name}`, vars);
  return n === undefined ? T(k, vars) : P(k, n, vars);
}
// A Line in words, then the sentences it carries (`also`: its confidence, its bound's source).
export const say = (l: Line): string => [words(l), ...(l.also ?? []).map(say)].join(' ');

// Sentences, one after the other.
export const sayAll = (lines: readonly Line[]): string => lines.map(say).join(' ');
