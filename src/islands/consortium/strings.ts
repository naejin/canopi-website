// The page's words on the island (frozen seam): ConsortiumPage.astro writes every consortium.* key of
// the page language, without its prefix, into #ct-data `strings`; T and P read them. Plural strings
// use the v1 form "one: # plant | other: # plants" (Intl.PluralRules picks the form, # is the number).
// A missing key shows the key itself, so a gap is visible rather than blank.
import { formatNumber } from './format.ts';

export type Strings = Record<string, string>;

let strings: Strings = {};
let lang = 'en';
let rules = new Intl.PluralRules('en');

export function setStrings(next: Strings, nextLang: string): void {
  strings = next;
  lang = nextLang;
  rules = new Intl.PluralRules(nextLang);
}

export const pageLang = (): string => lang;

// A plant's name in the page language, else English, else its scientific name (every view's one; views
// read it from views/kit/names.ts, the store from here).
export const nameOf = (t: { names: Partial<Record<string, string>>; canonical_name: string }): string => t.names[lang] || t.names.en || t.canonical_name;

type Vars = Record<string, string | number>;
const fill = (value: string, vars?: Vars) =>
  vars ? value.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : value;

// A mark's numbers in the page language, to the hundredth the range rule compares (fr "5,8"; a height
// "13,7"): here, not in the range rule's chunk, so a height note reads well without a site climate.
export function localVars(vars?: Vars): Vars | undefined {
  if (!vars) return vars;
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'number' ? formatNumber(v, lang, 2) : v]));
}

// A string with its {name} placeholders replaced (values as given: Preact escapes text).
export function T(key: string, vars?: Vars): string {
  return fill(strings[key] ?? key, vars);
}

// The forms of a plural string: { one: '# plant', other: '# plants' }.
export function pluralForms(value: string): Partial<Record<Intl.LDMLPluralRule, string>> {
  const forms: Partial<Record<Intl.LDMLPluralRule, string>> = {};
  for (const part of value.split(' | ')) {
    const m = /^(zero|one|two|few|many|other)\s*:\s*([\s\S]*)$/.exec(part.trim());
    if (m) forms[m[1] as Intl.LDMLPluralRule] = m[2];
  }
  return forms;
}

// A plural string for n, # replaced by the formatted number, then its {name} placeholders.
export function P(key: string, n: number, vars?: Vars): string {
  const forms = pluralForms(strings[key] ?? key);
  const form = forms[rules.select(n)] ?? forms.other ?? key;
  return fill(form.replace(/#/g, formatNumber(n, lang)), vars);
}
