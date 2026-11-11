// Ported from canopi-climate (https://github.com/opencanopi/canopi-climate, commit 0908add): the grid's
// rules re-written in TypeScript. Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero
// General Public License, version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// Regions layer values (canopi-climate src/regions.rs): the WGSRPD level-3 botanical area and the
// country (ISO 3166-1 alpha-2) of each 0.05-degree cell, stored as the codes themselves in base 26
// (letters A = 0 … Z = 25): "FRA" = 5 × 676 + 17 × 26 + 0, "FR" = 5 × 26 + 17.

import { NODATA } from './model.js';

/** Band order of a regions tile. */
export const REGION_BAND = { wgsrpdL3: 0, isoA2: 1 } as const;

/** A stored code of `letters` letters, or null for no data or an out-of-range value. */
export function decodeCode(stored: number, letters: 2 | 3): string | null {
  let v = stored;
  if (stored === NODATA || v < 0 || v >= 26 ** letters) return null;
  const out: string[] = [];
  for (let i = 0; i < letters; i++) {
    out.unshift(String.fromCharCode(65 + (v % 26)));
    v = Math.floor(v / 26);
  }
  return out.join('');
}

/** The stored value of a 1–3 letter upper-case code, or null. */
export function encodeCode(code: string): number | null {
  if (!/^[A-Z]{1,3}$/.test(code)) return null;
  return [...code].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 65, 0);
}
