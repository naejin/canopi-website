// The island's one number formatter (E6 design check §7.1: "Number formatters (7)"): every number the
// consortium writes goes through it, in the language given, to at most `max` decimals (1 by default;
// the range rule's marks and coordinates take 2). One Intl.NumberFormat per language and precision,
// made once. A leaf: it imports nothing, so strings.ts (P, localVars) uses it without a cycle; views
// take the page-language form `num` from kit/names.ts.
const formats = new Map<string, Intl.NumberFormat>();
export function numberFormat(lang: string, max = 1): Intl.NumberFormat {
  const key = `${lang} ${max}`;
  let f = formats.get(key);
  if (!f) { f = new Intl.NumberFormat(lang, { maximumFractionDigits: max }); formats.set(key, f); }
  return f;
}
export const formatNumber = (n: number, lang: string, max = 1): string => numberFormat(lang, max).format(n);
