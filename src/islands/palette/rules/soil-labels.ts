// Shared localized formatters for USDA soil texture enums and site drainage overrides.
// L2 compliant: imports only from lib/palette/index.ts and ../strings.ts (never views/).
import { textureIds, type ReportDrainage, type TextureId } from '../../../lib/palette/index.ts';
import { T } from '../strings.ts';

const TEXTURE_SET: ReadonlySet<string> = new Set<TextureId>(textureIds);

/**
 * Format a USDA soil texture class (e.g. `silty_clay_loam`) into its localized
 * human-readable label via `details.texture.<id>`.
 * Null / empty values return `ns.unknown` (never a fake `'loam'` fallback).
 * Non-USDA fallback strings replace underscores with spaces so raw snake_case can never leak.
 */
export function soilTextureLabel(
  texture: string | null | undefined,
  t: (key: string) => string = T,
): string {
  const raw = (texture ?? '').trim();
  if (!raw) return t('ns.unknown');
  if (TEXTURE_SET.has(raw)) {
    const key = `details.texture.${raw}`;
    const localized = t(key);
    if (localized && localized !== key) return localized;
  }
  return raw.replace(/_/g, ' ');
}

/**
 * Format a `ReportDrainage` override (`'sandy' | 'clay' | 'wet'`) into its
 * localized label via `ns.land.drain*`.
 */
export function drainageChoiceLabel(
  drainage: ReportDrainage,
  t: (key: string) => string = T,
): string {
  if (drainage === 'sandy') return t('ns.land.drainSandy');
  if (drainage === 'clay') return t('ns.land.drainClay');
  return t('ns.land.drainWet');
}
