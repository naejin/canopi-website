// The consortium tool's words: its strings (consortium.* without the prefix, written by
// src/components/consortium/ConsortiumPage.astro), plural forms, lists, numbers and the plain
// time words for a plant's phases. Pure: no DOM, so scripts/consortium-page.test.mjs can test it.
import { phases } from '../../lib/consortium/index.ts';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// A plural string reads "one: # plant | other: # plants": one form per Intl.PluralRules category,
// `#` for the number; a category the string lacks falls back to "other".
export function pluralForms(value) {
  const forms = {};
  for (const part of value.split(' | ')) {
    const m = /^(zero|one|two|few|many|other)\s*:\s*([\s\S]*)$/.exec(part.trim());
    if (m) forms[m[1]] = m[2];
  }
  return forms;
}

export function makeWords(strings, lang) {
  const rules = new Intl.PluralRules(lang);
  const lists = new Intl.ListFormat(lang, { type: 'conjunction' });
  const numbers = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  let regionNames = null;
  try { regionNames = new Intl.DisplayNames([lang], { type: 'region' }); } catch {}

  // A string with its {name} placeholders replaced; values are used as given (escape them first
  // when the result goes into HTML).
  const T = (key, vars) => {
    const value = strings[key] ?? key;
    return vars ? value.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : value;
  };
  const P = (key, n, vars) => {
    const forms = pluralForms(strings[key] ?? key);
    const form = forms[rules.select(n)] ?? forms.other ?? '';
    const text = form.replace(/#/g, numbers.format(n));
    return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text;
  };
  const list = (items) => lists.format(items);
  const num = (n) => numbers.format(n);
  const country = (code) => { try { return regionNames?.of(code) ?? code; } catch { return code; } };
  const climate = (id) => strings['climate.' + id] ?? id;
  const region = (id) => T('region.' + id);
  const cell = (climateId, regionId) => T('cell', { climate: climate(climateId), region: region(regionId) });

  // When a plant leads the planting, plain time first, the app's term beside it:
  // { plain: "Leads from year 1 to year 25", term: "Placenta 3 – Secondary 2" }.
  const phaseKey = (i, part) => `phase.${phases[i]}.${part}`;
  function timeWords(taxon) {
    if (!taxon.phases) return { plain: T('timingUnknown'), term: '' };
    const a = phases.indexOf(taxon.phases.start), b = phases.indexOf(taxon.phases.end);
    const plain = a === b && a < phases.length - 1 ? T(phaseKey(a, 'plain'))
      : b === phases.length - 1 ? T('leadOn', { from: T(phaseKey(a, 'from')) })
      : T('lead', { from: T(phaseKey(a, 'from')), to: T(phaseKey(b, 'to')) });
    const term = a === b ? T(phaseKey(a, 'term')) : `${T(phaseKey(a, 'term'))} – ${T(phaseKey(b, 'term'))}`;
    return { plain, term };
  }

  return { T, P, list, num, country, climate, region, cell, phaseKey, timeWords };
}

// A plant's name in the page language, else English (marked lang="en"), else its scientific name.
export function plantName(taxon, lang) {
  if (taxon.names[lang]) return { text: taxon.names[lang], lang: null };
  if (taxon.names.en) return { text: taxon.names.en, lang: 'en' };
  return { text: taxon.canonical_name, lang: null };
}

// Lowercase, without Latin accents (é → e), recomposed so Japanese and Korean keep their marks:
// what the country and Add searches compare.
export const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase();

// Every name a plant goes by, in every language, and its scientific name, for the Add search.
export const searchText = (taxon) => fold([taxon.canonical_name, ...Object.values(taxon.names)].join(' '));

// What the warnings summary counts: a misfit, invasive here, a medium or high conflict, and
// moderate or severe toxicity; slight toxicity stays on the card only.
export function needsLook(taxon, flags) {
  const tox = taxon.warnings.toxicity?.level;
  return flags.flagged || tox === 'Moderate' || tox === 'Severe';
}
