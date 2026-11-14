// The consortium tool's path in each locale: /palette/ in English and /<lang>/palette/ in every other
// language, French included (PP-B commit 0b; owner row "Plant palette name": readers see "Plant
// palette", code names stay "consortium"). The old /consortium/ addresses answer with a 301 to these
// in public/_redirects, query and fragment kept.
// Plain JavaScript (no JSON imports), so scripts/check-built-site.mjs, which runs in plain Node, uses
// the rule the pages use; src/i18n/utils.ts re-exports it.
/** @param {string} lang @returns {string} */
export const consortiumPath = (lang) => (lang === 'en' ? '/palette/' : `/${lang}/palette/`);
