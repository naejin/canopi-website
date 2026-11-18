// What a grower's edit changed (v14 spec 3.2; pf-d fills the bodies in chunk 3): the change summary
// per period over two snapshots of the store's verdict rule, before and after an edit, and the
// per-line effect counts of the figures panel. Pure core, no words (site-change-line.ts says them);
// PP-E's period switch and the app's "what changed" read the same shapes. 0W lands the typed stubs
// (chk #3): each returns an empty value until pf-d writes it.
import type { Factor, FactorVerdict, Hole, HoleChange, Level, PeriodId, PlantId, PlantVerdict, Taxon, VerdictNote } from './types.ts';

// One side of a change: per period, each listed plant's level and each member's hints (soil pH,
// drainage), the members and the open holes.
export interface SiteSnapshot {
  levels: Partial<Record<PeriodId, ReadonlyMap<PlantId, Level>>>;
  members: readonly PlantId[];
  holes: readonly Hole[];
  hints: ReadonlyMap<PlantId, readonly Factor[]>;
}
// A member whose level changed in a period, with the factor that limits it now.
export interface MemberChange { id: PlantId; before: Level; after: Level; limiting: FactorVerdict['factor'] | null }
// One period of the summary: how many of the list now fit, no longer fit, now need a second look, no
// longer do; the members that changed.
export interface PeriodChange { period: PeriodId; fitIn: number; fitOut: number; lookNew: number; lookGone: number; members: MemberChange[] }
export interface SiteChange { periods: PeriodChange[]; hintsNew: { id: PlantId; factors: Factor[] }[]; holes: HoleChange }
export const NO_SITE_CHANGE: SiteChange = Object.freeze({ periods: [], hintsNew: [], holes: { added: [], closed: [], narrowed: [], open: [] } }) as SiteChange;

// The summary of an edit (stub: nothing changed, until pf-d).
export function siteChange(before: SiteSnapshot, after: SiteSnapshot): SiteChange {
  void before; void after;
  return NO_SITE_CHANGE;
}

// The counts a panel line says, per factor side and period: plants not outside, outside, near the
// edge; and the dryness notes per watering answer.
export interface SideCounts { factor: Factor; side: 'low' | 'high'; period: PeriodId; within: number; outside: number; edge: number }
export interface LineCounts { sides: SideCounts[]; notes: Partial<Record<VerdictNote, number>> }
export const NO_LINE_COUNTS: LineCounts = Object.freeze({ sides: [], notes: {} }) as LineCounts;
// (stub: no counts, until pf-d)
export function lineCounts(list: readonly Taxon[], verdictsByPeriod: Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>>): LineCounts {
  void list; void verdictsByPeriod;
  return NO_LINE_COUNTS;
}
