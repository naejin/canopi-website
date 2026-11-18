// What a grower's edit changed, and the counts each line of "Your place in figures" says (v14 spec
// 3.2; pf-d). Pure core, no words: site-change-line.ts says them. PP-E's period switch and the app's
// "what changed" read the same shapes.
//
// - siteSnapshot: one side of an edit, from the store's verdict rule run over the list (the plants the
//   panel counts: the climate's list or the nearest lists) and the members, for each period, and the
//   members' open holes at the page period.
// - siteChange(before, after): per period, how many of the list now fit, no longer fit, now need a
//   second look, no longer do (fit = fits or second look: "not outside"; a plant not checked counts
//   nowhere); each member whose level changed, with the factor that limits it now; members that newly
//   carry a soil hint (soil pH, drainage); what happened to the holes (holes.ts holeChange).
// - lineCounts(list, verdictsByPeriod): per period, the list's plants that fit, the outside and
//   near-the-edge counts of each range side (cold, mild, cool, summer, hot), the plants that take the
//   nights (judged and outside on neither night side), and the dryness counts (the place drier than the
//   plant's recorded band, read from the aridity factor itself, so the count does not depend on the
//   watering answer that only sets the note's words: verdict.ts R2).
import type { Factor, FactorVerdict, Hole, HoleChange, Level, PeriodId, PlantId, PlantVerdict, Taxon } from './types.ts';
import { periodIds } from './types.ts';
import { holeChange } from './holes.ts';

// The range sides a panel line counts (range.ts RangeSide): the coldest nights (cold: too cold for it;
// mild: winters too mild, it is recorded only where they are colder), the warmth over the year (cool),
// summer warmth (summer) and the hottest days (hot).
export const RANGE_SIDES = ['cold', 'mild', 'cool', 'summer', 'hot'] as const;
export type RangeSideId = (typeof RANGE_SIDES)[number];
const SIDES = new Set<string>(RANGE_SIDES);
// The soil hints (types.ts setsLevel: never a level, v14 0W-2 R3); the drainage answer's wet check is
// the 'water' factor with basis 'spot'.
const hintOf = (f: FactorVerdict): Factor | null => {
  if (f.level === 'fits' || f.level === 'unknown') return null;
  if (f.factor === 'soil-ph' || f.factor === 'drainage') return f.factor;
  return f.factor === 'water' && f.basis === 'spot' ? 'drainage' : null;
};
export const hintsOf = (v: PlantVerdict | null | undefined): Factor[] => [...new Set((v?.factors ?? []).map(hintOf).filter((f): f is Factor => f !== null))];
// The place is drier than the band the plant is recorded in (the 'dry' factor's dry side).
export const drierOf = (v: PlantVerdict | null | undefined): boolean =>
  !!v?.factors.some((f) => f.factor === 'dry' && f.level === 'look' && f.place !== null && f.low !== null && f.place < f.low);
const notOutside = (l: Level | undefined): boolean => l === 'fits' || l === 'look';

// ---- one side of an edit ----

// Per period, each listed plant's level and limiting factor; the members, their soil hints (today) and
// their open holes at the page period.
export interface SiteSnapshot {
  levels: Partial<Record<PeriodId, ReadonlyMap<PlantId, Level>>>;
  limits?: Partial<Record<PeriodId, ReadonlyMap<PlantId, Factor | null>>>;
  members: readonly PlantId[];
  holes: readonly Hole[];
  hints: ReadonlyMap<PlantId, readonly Factor[]>;
}
// verdictsByPeriod: the verdicts of the list and the members, per period; holes: the members' open holes.
export function siteSnapshot(list: readonly Taxon[], members: readonly Taxon[], verdictsByPeriod: Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>>, holes: readonly Hole[]): SiteSnapshot {
  const levels: SiteSnapshot['levels'] = {}, limits: NonNullable<SiteSnapshot['limits']> = {};
  const ids = [...new Set([...list, ...members].map((t) => t.id))];
  for (const p of periodIds) {
    const vs = verdictsByPeriod[p];
    if (!vs) continue;
    levels[p] = new Map(ids.map((id) => [id, vs.get(id)?.level ?? 'unknown']));
    limits[p] = new Map(ids.map((id) => [id, vs.get(id)?.limiting?.factor ?? null]));
  }
  const today = verdictsByPeriod[periodIds[0]];
  return { levels, limits, members: members.map((t) => t.id), holes: holes.filter((h) => h.state === 'open'), hints: new Map(members.map((t) => [t.id, hintsOf(today?.get(t.id))])) };
}

// ---- the summary of an edit ----

// A member whose level changed in a period, with the factor that limits it now.
export interface MemberChange { id: PlantId; before: Level; after: Level; limiting: Factor | null }
// One period: how many of the list now fit, no longer fit, now need a second look, no longer do; the
// members that changed.
export interface PeriodChange { period: PeriodId; fitIn: number; fitOut: number; lookNew: number; lookGone: number; members: MemberChange[] }
export interface SiteChange { periods: PeriodChange[]; hintsNew: { id: PlantId; factors: Factor[] }[]; holes: HoleChange }
export const NO_SITE_CHANGE: SiteChange = Object.freeze({ periods: [], hintsNew: [], holes: { added: [], closed: [], narrowed: [], open: [] } }) as SiteChange;

export function siteChange(before: Partial<SiteSnapshot>, after: Partial<SiteSnapshot>): SiteChange {
  const periods: PeriodChange[] = [];
  const members = after.members ?? [];
  for (const p of periodIds) {
    const a = before.levels?.[p], b = after.levels?.[p];
    if (!a || !b) continue;
    let fitIn = 0, fitOut = 0, lookNew = 0, lookGone = 0;
    for (const [id, was] of a) {
      const now = b.get(id);
      if (now === undefined) continue;
      if (!notOutside(was) && notOutside(now)) fitIn++;
      else if (notOutside(was) && !notOutside(now)) fitOut++;
      if (was === 'fits' && now === 'look') lookNew++;
      else if (was === 'look' && now === 'fits') lookGone++;
    }
    const changed: MemberChange[] = [];
    for (const id of members) {
      const was = a.get(id), now = b.get(id);
      if (was !== undefined && now !== undefined && was !== now) changed.push({ id, before: was, after: now, limiting: after.limits?.[p]?.get(id) ?? null });
    }
    periods.push({ period: p, fitIn, fitOut, lookNew, lookGone, members: changed });
  }
  const hintsNew: SiteChange['hintsNew'] = [];
  for (const id of members) {
    const was = new Set(before.hints?.get(id) ?? []);
    const fresh = (after.hints?.get(id) ?? []).filter((f) => !was.has(f));
    if (fresh.length) hintsNew.push({ id, factors: [...fresh] });
  }
  return { periods, hintsNew, holes: holeChange(before.holes ?? [], after.holes ?? []) };
}

// ---- the counts a panel line says ----

export interface SideCount { outside: number; edge: number }
export interface PeriodCounts {
  period: PeriodId;
  of: number; // the plants counted (the list)
  fit: number; // fits or second look
  look: number;
  judged: number; // checked against a climate range ('judged'): the others are not checked
  sides: Record<RangeSideId, SideCount>;
  nights: number; // judged and outside on neither night side (cold, mild): "take these nights"
  drier: number; // of the fit plants, those where the place is drier than their recorded band
}
export interface LineCounts { periods: PeriodCounts[] }
export const NO_LINE_COUNTS: LineCounts = Object.freeze({ periods: [] }) as LineCounts;

export function lineCounts(list: readonly Taxon[], verdictsByPeriod: Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>> | ReadonlyMap<unknown, unknown>): LineCounts {
  if (!list.length || verdictsByPeriod instanceof Map) return NO_LINE_COUNTS;
  const byPeriod = verdictsByPeriod as Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>>;
  const periods: PeriodCounts[] = [];
  for (const p of periodIds) {
    const vs = byPeriod[p];
    if (!vs) continue;
    const sides = Object.fromEntries(RANGE_SIDES.map((s) => [s, { outside: 0, edge: 0 }])) as Record<RangeSideId, SideCount>;
    let fit = 0, look = 0, judged = 0, nights = 0, drier = 0;
    for (const t of list) {
      const v = vs.get(t.id);
      if (!v) continue;
      if (notOutside(v.level)) fit++;
      if (v.level === 'look') look++;
      if (notOutside(v.level) && drierOf(v)) drier++;
      if (v.range !== 'judged') continue;
      judged++;
      let night = false;
      for (const f of v.factors) {
        if (!SIDES.has(f.factor)) continue;
        const s = sides[f.factor as RangeSideId];
        if (f.level === 'outside') { s.outside++; if (f.factor === 'cold' || f.factor === 'mild') night = true; }
        else if (f.level === 'look') s.edge++;
      }
      if (!night) nights++;
    }
    periods.push({ period: p, of: list.length, fit, look, judged, sides, nights, drier });
  }
  return { periods };
}

// The line that limits plants most (the panel's "The main limit here"; A5's "What limits plants
// here" shows every line that limits): a climate line by its outside count in any period (nights:
// cold and mild; heat: hot; warmth: cool and summer), the rain line by its dryness count; none when
// nothing is outside and nothing is drier.
export type LimitLine = 'nights' | 'days' | 'warmth' | 'rain';
export function limitsOf(c: LineCounts): { line: LimitLine; n: number }[] {
  const most = (f: (p: PeriodCounts) => number) => Math.max(0, ...c.periods.map(f));
  const out: { line: LimitLine; n: number }[] = [
    { line: 'nights', n: most((p) => p.sides.cold.outside + p.sides.mild.outside) },
    { line: 'days', n: most((p) => p.sides.hot.outside) },
    { line: 'warmth', n: most((p) => p.sides.cool.outside + p.sides.summer.outside) },
    { line: 'rain', n: most((p) => p.drier) },
  ];
  return out.filter((l) => l.n > 0).sort((a, b) => b.n - a.n);
}
