// The Plant Palette tool's path in each locale: /palette/ in English and /<lang>/palette/ in every
// other language, French included (2026-11-25 rename: internal filenames moved from consortium* to
// palette*; the consortiumPath export name stays for Header/Footer compatibility, and old /consortium/
// addresses answer 404).
// Plain JavaScript (no JSON imports), so scripts/check-built-site.mjs, which runs in plain Node, uses
// the rule the pages use; src/i18n/utils.ts re-exports it.
/** @param {string} lang @returns {string} */
export const consortiumPath = (lang) => (lang === 'en' ? '/palette/' : `/${lang}/palette/`);
