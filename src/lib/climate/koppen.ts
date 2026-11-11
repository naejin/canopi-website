// Köppen-Geiger classes of the grid (canopi-climate src/koppen.rs): the Beck et al. (2023) legend
// and the check of a stored class against its stored coldest/warmest monthly means.

/** Class symbols by code 1–30 (index 0: no class). */
export const KOPPEN_SYMBOLS = [
  '', 'Af', 'Am', 'Aw', 'BWh', 'BWk', 'BSh', 'BSk', 'Csa', 'Csb', 'Csc', 'Cwa', 'Cwb', 'Cwc',
  'Cfa', 'Cfb', 'Cfc', 'Dsa', 'Dsb', 'Dsc', 'Dsd', 'Dwa', 'Dwb', 'Dwc', 'Dwd', 'Dfa', 'Dfb',
  'Dfc', 'Dfd', 'ET', 'EF',
] as const;

export type KoppenSymbol = (typeof KOPPEN_SYMBOLS)[number];

/** Symbol of a class code ('' for an unknown code). */
export const koppenSymbol = (code: number): KoppenSymbol => KOPPEN_SYMBOLS[code] ?? '';

/** Main group: 'A', 'B', 'C', 'D' or 'E' (null for no class). */
export const koppenGroup = (code: number): 'A' | 'B' | 'C' | 'D' | 'E' | null =>
  (koppenSymbol(code).charAt(0) || null) as 'A' | 'B' | 'C' | 'D' | 'E' | null;

const f = Math.fround;

/**
 * How far (°C) the coldest- and warmest-month means lie outside the temperature bounds of a class;
 * 0 when they agree. Computed in 32-bit floats like the crate (src/koppen.rs temperature_margin), so
 * the rounded margin matches `canopi-climate lookup` to the last digit.
 */
export function temperatureMargin(code: number, tCold: number, tWarm: number): number {
  const sym = koppenSymbol(code);
  const cold: [number, number] = [-Infinity, Infinity], warm: [number, number] = [-Infinity, Infinity];
  const summer = (third: string) => {
    if (third === 'a') warm[0] = 22;
    else if (third === 'b' || third === 'c') {
      warm[1] = 22;
      if (third === 'c' && !Number.isFinite(cold[0])) cold[0] = -38;
    } else if (third === 'd') {
      warm[1] = 22;
      cold[1] = Math.min(cold[1], -38);
    }
  };
  if (sym.startsWith('A')) cold[0] = 18;
  else if (sym.length === 3 && sym[0] === 'C') { cold[0] = 0; cold[1] = 18; warm[0] = 10; summer(sym[2]); }
  else if (sym.length === 3 && sym[0] === 'D') { cold[1] = 0; warm[0] = 10; summer(sym[2]); }
  else if (sym === 'ET') { warm[0] = 0; warm[1] = 10; }
  else if (sym === 'EF') warm[1] = 0;
  else return 0;
  const x = f(tCold), y = f(tWarm);
  const outside = (v: number, [lo, hi]: [number, number]) => Math.max(f(lo - v), f(v - hi), 0);
  return Math.max(outside(x, cold), outside(y, warm));
}
