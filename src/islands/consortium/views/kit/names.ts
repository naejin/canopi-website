// The words every consortium view shares, one helper each (E6 design check §7.1): a plant's name, the
// climate and list names, a country's name, the stage words, a layer's name, the site basis, and
// numbers and lists in the page language. Helpers whose text is the same are one helper (the climate
// name: the site-wide climate.<zone> key, which is also the label #ct-data `start.zones` carries);
// helpers whose text differs stay apart (`listName` says "Temperate list", `zoneName` "Temperate").
// - stage words: plain time first, the app's term beside it ("Years 1–3 · Placenta 3", owner row
//   "Phases" 2026-10-27); a span reads "Years 3–15 → 60 years on · Secondary 1 – Climax".
import type { ClimateZone, Site, SiteKey, Stratum, Taxon } from '../../../../lib/consortium/index.ts';
import { phases } from '../../../../lib/consortium/index.ts';
import { T, nameOf, pageLang } from '../../strings.ts';
import { formatNumber } from '../../format.ts';
import { spanOf } from './span.ts';

// A plant's name in the page language, else English, else its scientific name. Defined in strings.ts,
// because the store reads it and the state layer imports no view (layer rule L2); re-exported here so
// every view takes its words from the kit.
export { nameOf };

// A number in the page language, to at most `max` decimals (src/islands/consortium/format.ts).
export const num = (n: number, max = 1): string => formatNumber(n, pageLang(), max);
// "a, b and c" in the page language.
export const listOf = (items: string[]): string => new Intl.ListFormat(pageLang(), { type: 'conjunction' }).format(items);

// A climate's name ("Temperate"; '' for none). correction.* and climate.<zone> are site-wide keys;
// ConsortiumPage.astro passes them under their own names beside consortium.* (H13).
export const zoneName = (z: ClimateZone | null): string => (z ? T(`climate.${z.toLowerCase()}`) : '');
// A climate's plant list ("Temperate list").
export const listName = (c: ClimateZone): string => T(`list.${c.toLowerCase()}`);

// A country's name in the page language (English where the browser has none for it), else its code.
const regionNames = new Map<string, Intl.DisplayNames>();
export function countryName(code: string): string {
  try {
    const lang = pageLang();
    let names = regionNames.get(lang);
    if (!names) { names = new Intl.DisplayNames([lang, 'en'], { type: 'region' }); regionNames.set(lang, names); }
    return names.of(code) ?? code;
  } catch { return code; }
}

// ---- stage and layer words ----
export const phasePlain = (p: number): string => T(`phase.${phases[p]}.plain`);
export const phaseTerm = (p: number): string => T(`phase.${phases[p]}.term`);
export const phaseWords = (p: number): string => `${phasePlain(p)} · ${phaseTerm(p)}`;
export const stageRun = (from: number, to: number = from): string => (from === to ? phasePlain(from) : `${phasePlain(from)} → ${phasePlain(to)}`);
export const layerName = (s: Stratum): string => T(`stratum.${s}`);

// "Years 3–15 → 60 years on · Secondary 1 – Climax", or one stage's words.
export function spanWords(t: Taxon): string {
  const s = spanOf(t);
  if (!s) return T('timingUnknown');
  return s.from === s.to ? phaseWords(s.from) : `${phasePlain(s.from)} → ${phasePlain(s.to)} · ${phaseTerm(s.from)} – ${phaseTerm(s.to)}`;
}

// "light: not sure · acid soil · …": what the matrix is based on.
export const basisLine = (s: Site): string => (['light', 'soil', 'water', 'room'] as SiteKey[]).map((k) => T(`site.basis.${k}.${s[k]}`)).join(' · ');
