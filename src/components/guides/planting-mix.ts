// The shares of a <PlantingMixBar>, in whole percent. Fails the build on parts that would draw an
// empty or NaN bar: no parts, a value that is not a finite number >= 0, a zero total, an unknown tone.
export const mixTones = { own: 6, old: 1, new: 5 } as const;
export type MixTone = keyof typeof mixTones;
export interface MixPart { label: string; value: number; tone: MixTone; }

export function mixShares(parts: MixPart[]): number[] {
  if (!Array.isArray(parts) || parts.length === 0) throw new Error('<PlantingMixBar parts>: give at least one part');
  for (const p of parts) {
    if (!(p.tone in mixTones)) throw new Error(`<PlantingMixBar> tone="${p.tone}": use own, old or new`);
    if (typeof p.value !== 'number' || !Number.isFinite(p.value) || p.value < 0) throw new Error(`<PlantingMixBar> value=${p.value} for "${p.label}": use a number of 0 or more`);
  }
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  if (total <= 0) throw new Error('<PlantingMixBar parts>: the values add up to 0');
  return parts.map((p) => Math.round((p.value / total) * 100));
}
