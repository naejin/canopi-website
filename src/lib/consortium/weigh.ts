// The palette page's "Your plants" and "Things to weigh" (plant-palette-architecture 2, inventory P39
// and E11; PP-B stream b3), off the first run (palette chunk). Vectors: scripts/vectors/weigh.json.
// - Things to weigh: one family holding a large share of the palette, and water needs (soil hints come
//   with PP-F). Things to keep in mind, never holes and never a verdict: nothing is removed or asked. A
//   check without enough records says so ("n of m recorded: not enough to judge"), never a pass; family
//   spread over many families claims nothing, and even water needs claim nothing either (owner
//   2026-11-15: no all-clear line); with no water line, the plants with no water need recorded are
//   still said on a line of their own ('missing', never silent). On a borrowed list every line carries the estimate term (Line vars
//   `term: 'estimate'`), as the placements it reads are estimates.
// - Never a judgement of part of the palette as the whole: the plants not checked (a guest list that
//   could not be read, a plant on none of this climate's lists) count in m and are said as not checked.
// - A plant's water need is the factAt water_need fact (ADR-6) for the site and period it is given
//   (climateFor's context, architecture 3.1; today's stored value whatever they are), grouped by
//   source.ts waterNeed, the one classifier, beside factAt (site.ts's water check reads the same fact).
// - Your plants: each plant once, warned plants first (owner "warn, never hide"), then the plants it
//   cannot show, and its full-grown size as a Line (the view formats the lengths for the page language).
import type { Flag, Line, PlantId, Taxon, VerdictContext, WeighLine } from './types.ts';
import { factAt, waterNeed } from './source.ts';

const K = (k: string): string => `consortium.plants.${k}`;

// The one "not enough to judge" threshold: water needs recorded for at least this share of the plants.
const WATER_JUDGE_SHARE = 0.5;
// A family is a thing to weigh when it holds at least FAMILY_MIN plants and FAMILY_SHARE of the palette
// (four of thirteen legumes at Seville, board MainMore; six of eight in Fabaceae, F1a-B1; owner
// 2026-11-15 keeps both).
const FAMILY_MIN = 3;
const FAMILY_SHARE = 0.25;

type WeighContext = Pick<VerdictContext, 'lookup' | 'period'>;
interface WeighOptions {
  pending?: boolean; // a list is still being read: 'checking'
  unchecked?: number; // members of the palette not checked (a list unread, on no list of this climate)
}

// The things to weigh for these plants, family lines first (largest first), then the water line.
// pending: a list is still being read, so the palette is not whole: 'checking', never a judgement of part.
export function weighLines(members: readonly Taxon[], ctx: WeighContext, { pending = false, unchecked = 0 }: WeighOptions = {}): WeighLine[] | 'checking' {
  if (pending) return 'checking';
  const m = members.length + unchecked;
  if (!members.length) return [];
  const term: Line['vars'] = members.some((t) => t.origin?.kind === 'borrowed') ? { term: 'estimate' } : {};
  const out: WeighLine[] = [];
  const byFamily = new Map<string, PlantId[]>();
  for (const t of members) if (t.family) byFamily.set(t.family, [...(byFamily.get(t.family) ?? []), t.id]);
  const heavy = [...byFamily].filter(([, ids]) => ids.length >= FAMILY_MIN && ids.length >= FAMILY_SHARE * m)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [family, ids] of heavy) out.push({ kind: 'family', line: { key: K('weigh.family'), vars: { family, n: ids.length, m, ...term } }, members: ids });
  const regular: PlantId[] = [], dry: PlantId[] = [];
  let n = 0;
  for (const t of members) {
    const need = waterNeed(factAt('water_need', t, ctx.lookup, ctx.period));
    if (!need) continue;
    n++;
    if (need === 'regular') regular.push(t.id);
    if (need === 'dry') dry.push(t.id);
  }
  const vars: Line['vars'] = { n, m, missing: members.length - n, unchecked, ...term };
  if (n < WATER_JUDGE_SHARE * m) out.push({ kind: 'water', line: { key: K('weigh.waterFew'), vars }, members: [] });
  // members: the plants needing regular water, then the dry-loving ones (vars.regular of them first).
  else if (regular.length && dry.length) out.push({ kind: 'water', line: { key: K('weigh.waterMix'), vars: { ...vars, regular: regular.length, dry: dry.length } }, members: [...regular, ...dry] });
  // No water line to show: the plants with no water need recorded, said on their own (review b3f-4).
  else if (n < members.length) out.push({ kind: 'water', line: { key: K('weigh.missing'), vars }, members: [] });
  return out;
}

// A flag that puts a plant first in Your plants: every flag a row shows in words (a low conflict is
// left to the plant's sheet, as kit/flags.ts flagLines does).
const shown = (f: Flag): boolean => f.kind !== 'conflict' || f.severity !== 'low';

type PlantRow = { plant: Taxon; warned: boolean } | { id: PlantId; missing: 'failed' | 'unlisted' };
// Your plants: each plant once, the warned ones first, then the members it cannot show (a guest list
// that could not be read, on none of this climate's lists: store.failedMembers, missingMembers.unlisted),
// then the rest, each group in the palette's order.
export function yourPlants(members: readonly Taxon[], flags: readonly Flag[], missing: { failed: readonly PlantId[]; unlisted: readonly PlantId[] } = { failed: [], unlisted: [] }): PlantRow[] {
  const warned = new Set(flags.filter(shown).map((f) => f.id));
  const seen = new Set<PlantId>(), first: PlantRow[] = [], gone: PlantRow[] = [], rest: PlantRow[] = [];
  for (const t of members) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    (warned.has(t.id) ? first : rest).push({ plant: t, warned: warned.has(t.id) });
  }
  for (const [ids, why] of [[missing.failed, 'failed'], [missing.unlisted, 'unlisted']] as const) {
    for (const id of ids) if (!seen.has(id)) { seen.add(id); gone.push({ id, missing: why }); }
  }
  return [...first, ...gone, ...rest];
}

// Its full-grown size: width and height when both are recorded, else the one recorded and that the
// other is not, else "No size recorded" (lengths in metres; the view formats them). The height is the
// wild maximum (types.ts Traits.height_m), so the words say "in the wild".
export function sizeLine(t: Taxon): Line {
  const height = t.traits.height_m?.max ?? null, width = t.traits.width_max_m ?? null;
  if (height !== null && width !== null) return { key: K('size'), vars: { width, height } };
  if (height !== null) return { key: K('sizeTall'), vars: { height } };
  if (width !== null) return { key: K('sizeWide'), vars: { width } };
  return { key: K('sizeNone'), vars: {} };
}
