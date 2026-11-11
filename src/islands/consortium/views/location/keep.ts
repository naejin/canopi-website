// What the location step writes beside the consortium (P5 S5b), kept out of memory.ts so these bytes
// load with the location chunk, not on every first run: the site location on this device and the
// country from it. Plain .ts, so node --test imports it (scripts/consortium-p5-seams-s5b.test.mjs).
import type { LocationSource, SiteLocation } from '../../../../lib/consortium/index.ts';
import type { Country } from '../../store.ts';
import * as store from '../../store.ts';
import { LOCATION_STORE, memory, quietly } from '../../memory.ts';

export interface SavedLocation { lat: number; lon: number; source: LocationSource; label?: string }
const SOURCES: readonly LocationSource[] = ['geo', 'search', 'map', 'link'];
// A saved location read back, or null when it is not one.
export function readLocation(text: string | null): SavedLocation | null {
  let v: unknown;
  try { v = text ? JSON.parse(text) : null; } catch { return null; }
  if (!v || typeof v !== 'object') return null;
  const { lat, lon, source, label } = v as Record<string, unknown>;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return null;
  if (!SOURCES.includes(source as LocationSource)) return null;
  const out: SavedLocation = { lat, lon, source: source as LocationSource };
  if (typeof label === 'string' && label && label.length <= 200) out.label = label;
  return out;
}

export const locationRecord = (l: Pick<SiteLocation, 'lat' | 'lon' | 'source' | 'label'>): string =>
  JSON.stringify(l.label ? { lat: l.lat, lon: l.lon, source: l.source, label: l.label } : { lat: l.lat, lon: l.lon, source: l.source });

// The reader's own site location kept on this device (never in a link, never a link's), or removed.
export function keepLocation(l: Pick<SiteLocation, 'lat' | 'lon' | 'source' | 'label'> | null): void {
  if (l) memory.write(LOCATION_STORE, locationRecord(l));
  else memory.remove(LOCATION_STORE);
}

// A country from the site location ("from your location"; null: none there, e.g. offshore). It
// replaces a guess, no country, or an earlier location's; a country the reader chose or a link
// carried stays. reader: the reader's own act (Forget); a lookup's result is quiet, the click having
// been the action, so a restore in flight still applies (review round 1, 4).
export function locationCountry(code: string | null, reader: boolean): void {
  const now = store.country.peek();
  if (now.source === 'chosen' || now.source === 'link') return;
  const next: Country = code ? { code, source: 'location' } : now.source === 'location' ? { code: null, source: null } : now;
  if (next.code === now.code && next.source === now.source) return;
  if (reader) store.country.value = next;
  else quietly(() => { store.country.value = next; });
}
