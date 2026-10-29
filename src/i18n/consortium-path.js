// The consortium tool's path in each locale: /consortium/ in every language, French included (owner,
// 2026-10-29; the French page still calls the tool a « guilde »).
// Plain JavaScript (no JSON imports), so scripts/check-built-site.mjs, which runs in plain Node, uses
// the rule the pages use; src/i18n/utils.ts re-exports it.
/** @param {string} lang @returns {string} */
export const consortiumPath = (lang) => (lang === 'en' ? '/consortium/' : `/${lang}/consortium/`);
