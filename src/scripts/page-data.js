// The page's language, release and strings, written by src/components/Home.astro.
const data = JSON.parse(document.getElementById('page-data').textContent);

export const { lang, version, installers } = data;

// The same placeholder rule as src/i18n/utils.ts: {name} is replaced, unknown ones stay.
export function text(key, replacements = {}) {
  const value = data.strings[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in replacements ? String(replacements[name]) : match));
}
