// Ported from canopi-climate (https://github.com/opencanopi/canopi-climate, commit 0908add): the grid's
// rules re-written in TypeScript. Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero
// General Public License, version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// Soil layer values (canopi-climate src/soil.rs): SoilGrids 2.0 pH in water, sand and clay (0-30 cm)
// and a fill distance, on the 0.05-degree layer grid; the USDA texture class derived at lookup.

/** Band order of a soil tile. */
export const SOIL_BAND = { ph: 0, sand: 1, clay: 2, fill: 3 } as const;

/** Depth of the stored values. */
export const SOIL_DEPTH = '0-30 cm';

export type TextureId =
  | 'sand' | 'loamy_sand' | 'sandy_loam' | 'loam' | 'silt_loam' | 'silt'
  | 'sandy_clay_loam' | 'clay_loam' | 'silty_clay_loam' | 'sandy_clay' | 'silty_clay' | 'clay';

const within = (x: number, lo: number, hi: number) => x >= lo && x < hi;

/**
 * USDA texture class of a fine-earth fraction (percent; silt = 100 - sand - clay), in the order of
 * the NRCS texture calculator (src/soil.rs texture_class). null for a non-finite input or fractions
 * outside 0–100.
 */
export function textureClass(sand: number, clay: number): TextureId | null {
  const ok = (x: number) => Number.isFinite(x) && x >= 0 && x <= 100;
  if (!ok(sand) || !ok(clay) || sand + clay > 100 + 1e-9) return null;
  const silt = Math.max(100 - sand - clay, 0);
  if (silt + 1.5 * clay < 15) return 'sand';
  if (silt + 2 * clay < 30) return 'loamy_sand';
  if ((within(clay, 7, 20) && sand > 52) || (clay < 7 && silt < 50)) return 'sandy_loam';
  if (within(clay, 7, 27) && within(silt, 28, 50) && sand <= 52) return 'loam';
  if ((silt >= 50 && within(clay, 12, 27)) || (within(silt, 50, 80) && clay < 12)) return 'silt_loam';
  if (silt >= 80 && clay < 12) return 'silt';
  if (within(clay, 20, 35) && silt < 28 && sand > 45) return 'sandy_clay_loam';
  if (within(clay, 27, 40) && sand > 20 && sand <= 45) return 'clay_loam';
  if (within(clay, 27, 40) && sand <= 20) return 'silty_clay_loam';
  if (clay >= 35 && sand > 45) return 'sandy_clay';
  if (clay >= 40 && silt >= 40) return 'silty_clay';
  return 'clay';
}
