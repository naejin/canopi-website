// The consortium tool's path in each locale: "Consortium" in every language except French, "Guilde".
// Plain JavaScript (no JSON imports), so scripts/check-built-site.mjs, which runs in plain Node, uses
// the rule the pages use; src/i18n/utils.ts re-exports it.
/** @param {string} lang @returns {string} */
export const consortiumPath = (lang) => (lang === 'en' ? '/consortium/' : lang === 'fr' ? '/fr/guilde/' : `/${lang}/consortium/`);
