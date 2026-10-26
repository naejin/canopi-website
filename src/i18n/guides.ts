// Field Guides strings and URLs. Guides exist in English and French only; their chrome strings live
// in src/i18n/guides/{en,fr}.json, outside the 11-locale site files. A visitor in another locale is
// sent to the English guide.
import en from './guides/en.json';
import fr from './guides/fr.json';
import { localizedUrl, type Locale } from './utils';

export const guideLocales = ['en', 'fr'] as const;
export type GuideLang = (typeof guideLocales)[number];
// The groups of the index, in reading order ("domain.<id>" strings below). Kept here, not in
// src/content.config.ts, so pages never import the content loader (node:fs) into the prerender worker.
export const guideDomains = ['seeds', 'crops', 'perennials', 'seasons', 'pests', 'kitchen'] as const;
const strings: Record<GuideLang, Record<string, string>> = { en, fr };

export const isGuideLang = (lang: string | undefined): lang is GuideLang => guideLocales.includes(lang as GuideLang);
// A guide component's language, from the page URL (Astro.currentLocale): /fr/guides/… is French.
export const guideLangOf = (locale: string | undefined): GuideLang => (locale === 'fr' ? 'fr' : 'en');

export function gt(key: string, lang: GuideLang, replacements?: Record<string, string | number>): string {
  let value = strings[lang][key];
  if (value === undefined) throw new Error(`src/i18n/guides/${lang}.json: missing "${key}"`);
  for (const [k, v] of Object.entries(replacements ?? {})) value = value.replaceAll(`{${k}}`, String(v));
  return value;
}

// The guides in the reader's language, else in English.
export const guidesPath = (lang: Locale): string => (isGuideLang(lang) ? localizedUrl('/guides/', lang) : '/guides/');
export const guidePath = (slug: string, lang: Locale): string => (isGuideLang(lang) ? localizedUrl(`/guides/${slug}/`, lang) : `/guides/${slug}/`);

export const formatDate = (date: Date, lang: GuideLang): string =>
  new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
