// The island's one number formatter (E6 design check §7.1: "Number formatters (7)"): every number the
// consortium writes goes through it, in the language given, to at most `max` decimals (1 by default;
// the range rule's marks and coordinates take 2). One Intl.NumberFormat per language and precision,
// made once. A leaf beside strings.ts (it imports nothing), outside views/ so the state layer may use it
// (layer rule L2); views take the page-language form `num` from views/kit/names.ts.
const formats = new Map<string, Intl.NumberFormat>();
function numberFormat(lang: string, max = 1): Intl.NumberFormat {
  const key = `${lang} ${max}`;
  let f = formats.get(key);
  if (!f) { f = new Intl.NumberFormat(lang, { maximumFractionDigits: max }); formats.set(key, f); }
  return f;
}
export const formatNumber = (n: number, lang: string, max = 1): string => numberFormat(lang, max).format(n);

// ---- measures (PP-B commit 0; plant-palette-architecture 3 "Names and numbers") ----
// Every measure the palette writes goes through one of these, in the page language, with its unit
// (Intl style 'unit'); new keys take the result as {len}, {area}, {depth}, {temp} or {tempDiff} and
// never write a unit after a placeholder (palette-keys.test.mjs). Behaviour is metric; these are
// the single switch point should imperial units ever be offered.
const unitFormats = new Map<string, Intl.NumberFormat>();
function unitFormat(lang: string, unit: string, max: number, signed = false): Intl.NumberFormat {
  const key = `${lang} ${unit} ${max} ${signed}`;
  let f = unitFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: max, ...(signed ? { signDisplay: 'exceptZero' as const } : {}) });
    unitFormats.set(key, f);
  }
  return f;
}
/** @public A length in metres ("2.5 m"); b3's size line is its first reader. */
export const formatLength = (m: number, lang: string, max = 1): string => unitFormat(lang, 'meter', max).format(m);
/** @public Rain in millimetres ("540 mm"); the grower's rain values (0W siteEditLines) are its first reader. */
export const formatMm = (mm: number, lang: string): string => unitFormat(lang, 'millimeter', 0).format(mm);
/** A distance in whole kilometres ("12 km", ja "12 km" in its own form); the soil card's "the soil map's nearest reading" (M39) is its reader. */
export const formatKm = (km: number, lang: string): string => unitFormat(lang, 'kilometer', 0).format(km);
/** A file size in megabytes ("1.4 MB"); the loading line's progress (M28) is its reader. */
export const formatMegabytes = (mb: number, lang: string): string => unitFormat(lang, 'megabyte', 1).format(mb);
/** @public A soil depth in centimetres ("30 cm"); PP-F's soil lines are its first reader. */
export const formatDepthCm = (cm: number, lang: string): string => unitFormat(lang, 'centimeter', 0).format(cm);
// The boards' temperature form: a true minus sign (U+2212) and a narrow no-break space before the degree
// sign where Intl puts no space ("−3.5 °C"; fr keeps its own U+202F, de its space).
const boardTemp = (s: string): string => s.replace(/-/g, '\u2212').replace(/(\d)°/, '$1\u202f°');
/** @public A temperature in degrees Celsius ("−3.5 °C"). */
export const formatTemp = (c: number, lang: string, max = 1): string => boardTemp(unitFormat(lang, 'celsius', max).format(c));
/** @public A temperature difference, signed ("+2 °C"): a difference converts without the +32 offset. */
export const formatTempDiff = (dc: number, lang: string, max = 1): string => boardTemp(unitFormat(lang, 'celsius', max, true).format(dc));
/** @public An area in square metres: Intl has no square-metre unit, so the number and " m²". */
export const formatArea = (m2: number, lang: string, max = 0): string => `${formatNumber(m2, lang, max)} m²`;

// The plot size a grower types (Place, b1a): a whole number of square metres from 1 to MAX_PLOT_M2,
// read with the page language's separators ("1 200", "1.200", "1,200" and "1200" all 1200 where
// that language groups so; a decimal part is rounded), null for anything else (empty, 0, negative,
// too large, not a number).
const MAX_PLOT_M2 = 1_000_000; // core state.ts MAX_PLOT_M2 (format.ts imports nothing; the test pins them equal)
/** @public b1a's plot size field is its first reader. */
export function parsePlotSize(text: string, lang: string): number | null {
  const parts = new Intl.NumberFormat(lang).formatToParts(12345.6);
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  let t = text.trim().replace(/\s*(m²|m2|sq ?m)$/i, '').replace(/\s/g, ''); // \s holds no-break and narrow spaces
  if (!t || !/^[\d.,'’]+$/.test(t)) return null;
  if (!/\s/.test(group)) t = t.split(group).join(''); // a space group went with the spaces above
  t = t.replace(/['’]/g, '').replace(decimal, '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(Number(t));
  return n >= 1 && n <= MAX_PLOT_M2 ? n : null;
}
