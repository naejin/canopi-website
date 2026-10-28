import en from './translations/en.json';
import fr from './translations/fr.json';
import es from './translations/es.json';
import pt from './translations/pt.json';
import it from './translations/it.json';
import zh from './translations/zh.json';
import de from './translations/de.json';
import ja from './translations/ja.json';
import ko from './translations/ko.json';
import nl from './translations/nl.json';
import ru from './translations/ru.json';

export const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const languageNames: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  zh: '中文',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  ru: 'Русский',
};

const translations: Record<Locale, Record<string, string>> = {
  en, fr, es, pt, it, zh, de, ja, ko, nl, ru,
};

export function t(key: string, lang: Locale, replacements?: Record<string, string>): string {
  let value = translations[lang]?.[key] ?? translations.en[key] ?? key;
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      value = value.replace(`{${k}}`, v);
    }
  }
  return value;
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localizedUrl(path: string, lang: Locale): string {
  if (lang === defaultLocale) return path || '/';
  return `/${lang}${path}`;
}

// A page's path within a locale: the same path in every locale, or one per locale
// (a page whose slug is translated, such as the consortium tool's /fr/guilde/).
export type PagePath = string | ((lang: Locale) => string);

export function pageUrl(path: PagePath, lang: Locale): string {
  return typeof path === 'string' ? localizedUrl(path, lang) : path(lang);
}

// The consortium tool: "Consortium" in every language except French, "Guilde" (one rule, shared
// with scripts/check-built-site.mjs).
export { consortiumPath } from './consortium-path.js';
