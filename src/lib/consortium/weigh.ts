// The palette page's "Your plants" and "Things to weigh" (plant-palette-architecture 2, inventory P39
// and E11; PP-B stream b3), off the first run (palette chunk). Vectors: scripts/vectors/weigh.json.
// - Things to weigh: one family holding a large share of the palette, and water needs (soil hints come
//   with PP-F). Things to keep in mind, never holes and never a verdict: nothing is removed or asked. A
//   check without enough records says so ("n of m recorded: not enough to judge"), never a pass; family
//   spread over many families claims nothing. On a borrowed list every line carries the estimate term
//   (Line vars `term: 'estimate'`), as the placements it reads are estimates.
// - Your plants: each plant once, warned plants first (owner "warn, never hide"), and its full-grown
//   size as a Line (the view formats the lengths for the page language).
import type { Flag, Line, PlantId, Taxon, WeighLine } from './types.ts';

const K = (k: string): string => `consortium.plants.${k}`;

// The one "not enough to judge" threshold: water needs recorded for at least this share of the plants.
export const WATER_JUDGE_SHARE = 0.5;
// A family is a thing to weigh when it holds at least FAMILY_MIN plants and FAMILY_SHARE of the palette
// (four of thirteen legumes at Seville, board MainMore; six of eight in Fabaceae, F1a-B1).
export const FAMILY_MIN = 3;
export const FAMILY_SHARE = 0.25;

export type WaterNeed = 'dry' | 'medium' | 'wet';
const DROUGHT: Record<string, WaterNeed> = { High: 'dry', Medium: 'medium', Low: 'wet', None: 'wet' };
const MOISTURE: Record<string, WaterNeed> = { Low: 'dry', Medium: 'medium', High: 'wet' };
// A plant's water need: its drought tolerance when recorded (the direct answer to "takes a dry
// summer"), else its moisture use, else null (not recorded).
export function waterNeed(t: Taxon): WaterNeed | null {
  const { drought_tolerance: d, moisture_use: m } = t.traits;
  return (d ? DROUGHT[d] : undefined) ?? (m ? MOISTURE[m] : undefined) ?? null;
}

// The things to weigh for these plants, family lines first (largest first), then the water line.
// pending: a list is still being read, so the palette is not whole: 'checking', never a judgement of part.
export function weighLines(members: readonly Taxon[], { pending = false } = {}): WeighLine[] | 'checking' {
  if (pending) return 'checking';
  const m = members.length;
  if (!m) return [];
  const term: Line['vars'] = members.some((t) => t.origin?.kind === 'borrowed') ? { term: 'estimate' } : {};
  const out: WeighLine[] = [];
  const byFamily = new Map<string, PlantId[]>();
  for (const t of members) if (t.family) byFamily.set(t.family, [...(byFamily.get(t.family) ?? []), t.id]);
  const heavy = [...byFamily].filter(([, ids]) => ids.length >= FAMILY_MIN && ids.length >= FAMILY_SHARE * m)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [family, ids] of heavy) out.push({ kind: 'family', line: { key: K('weigh.family'), vars: { family, n: ids.length, m, ...term } }, members: ids });
  const wet: PlantId[] = [], dry: PlantId[] = [];
  let n = 0;
  for (const t of members) {
    const need = waterNeed(t);
    if (need) n++;
    if (need === 'wet') wet.push(t.id);
    if (need === 'dry') dry.push(t.id);
  }
  const vars: Line['vars'] = { n, m, missing: m - n, ...term };
  if (n < WATER_JUDGE_SHARE * m) out.push({ kind: 'water', line: { key: K('weigh.waterFew'), vars }, members: [] });
  else if (wet.length && dry.length) out.push({ kind: 'water', line: { key: K('weigh.waterMix'), vars: { ...vars, wet: wet.length, dry: dry.length } }, members: [...wet, ...dry] });
  else out.push({ kind: 'water', line: { key: K('weigh.waterEven'), vars }, members: [] });
  return out;
}

// A flag that puts a plant first in Your plants: every flag a row shows in words (a low conflict is
// left to the plant's sheet, as kit/flags.ts flagLines does).
const shown = (f: Flag): boolean => f.kind !== 'conflict' || f.severity !== 'low';

export interface PlantRow { plant: Taxon; warned: boolean }
// Your plants: each plant once, the warned ones first, each group in the palette's order.
export function yourPlants(members: readonly Taxon[], flags: readonly Flag[]): PlantRow[] {
  const warned = new Set(flags.filter(shown).map((f) => f.id));
  const seen = new Set<PlantId>(), first: PlantRow[] = [], rest: PlantRow[] = [];
  for (const t of members) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    (warned.has(t.id) ? first : rest).push({ plant: t, warned: warned.has(t.id) });
  }
  return [...first, ...rest];
}

// Its full-grown size: width and height when both are recorded, else the one recorded and that the
// other is not, else "No size recorded" (lengths in metres; the view formats them).
export function sizeLine(t: Taxon): Line {
  const height = t.traits.height_m?.max ?? null, width = t.traits.width_max_m ?? null;
  if (height !== null && width !== null) return { key: K('size'), vars: { width, height } };
  if (height !== null) return { key: K('sizeTall'), vars: { height } };
  if (width !== null) return { key: K('sizeWide'), vars: { width } };
  return { key: K('sizeNone'), vars: {} };
}
