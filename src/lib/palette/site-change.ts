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
//   watering answer that only sets the note's words: verdict.ts R2) beside the plants that carry the
//   dryness note (none when watered all year), which is what makes rain a limit (A5).
import type { Factor, FactorVerdict, Hole, HoleChange, LayerValue, Level, PeriodId, PlantId, PlantVerdict, Taxon } from './types.ts';
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
  noted: number; // of the fit plants, those carrying the dryness note (the watering answer decides: verdict.ts R2)
}
export interface LineCounts { periods: PeriodCounts[] }
export const NO_LINE_COUNTS: LineCounts = Object.freeze({ periods: [] }) as LineCounts;

export function lineCounts(list: readonly Pick<Taxon, 'id'>[], verdictsByPeriod: Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>>): LineCounts {
  if (!list.length) return NO_LINE_COUNTS;
  const periods: PeriodCounts[] = [];
  for (const p of periodIds) {
    const vs = verdictsByPeriod[p];
    if (!vs) continue;
    const sides = Object.fromEntries(RANGE_SIDES.map((s) => [s, { outside: 0, edge: 0 }])) as Record<RangeSideId, SideCount>;
    let fit = 0, look = 0, judged = 0, nights = 0, drier = 0, noted = 0;
    for (const t of list) {
      const v = vs.get(t.id);
      if (!v) continue;
      if (notOutside(v.level)) fit++;
      if (v.level === 'look') look++;
      if (notOutside(v.level) && drierOf(v)) drier++;
      if (notOutside(v.level) && v.notes.includes('drier')) noted++;
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
    periods.push({ period: p, of: list.length, fit, look, judged, sides, nights, drier, noted });
  }
  return { periods };
}

// "Want more warmth over the year" (the warmth line): the cool side only, the year's mean below the
// plant's range (range.ts 'cool'). Summer warmth is its own side and never joins this count.
export const warmthOf = (p: PeriodCounts): SideCount => p.sides.cool;

// The lines that limit plants (the panel's "The main limit here"; A5's "What limits plants here" shows
// every line that limits). One status per line, decided once here and read by both the limits card and
// each row's words, so the two never disagree (review R2, C2): a climate line limits when plants are
// outside on its side in any period (nights: cold and mild; heat: hot; warmth: cool, warmthOf), the
// rain line when plants carry the dryness note in any period (A5: none when watered all year, though
// they are still drier here). `n` is the highest count over the periods and `period` the first period
// that reaches it (a line that limits only later is said with that period's count); `today` is the
// count today. Not checked: no period counted yet.
export type LimitLine = 'nights' | 'days' | 'warmth' | 'rain';
export const LIMIT_IDS: readonly LimitLine[] = Object.freeze(['nights', 'days', 'warmth', 'rain']);
export type LimitState = 'limits' | 'free' | 'unchecked';
export interface LimitStatus { line: LimitLine; state: LimitState; n: number; period: PeriodId | null; today: number }
const LIMIT_COUNT: Readonly<Record<LimitLine, (p: PeriodCounts) => number>> = {
  nights: (p) => p.sides.cold.outside + p.sides.mild.outside,
  days: (p) => p.sides.hot.outside,
  warmth: (p) => warmthOf(p).outside,
  rain: (p) => p.noted,
};
export function limitStatus(c: LineCounts | null | undefined): Record<LimitLine, LimitStatus> {
  const out = {} as Record<LimitLine, LimitStatus>;
  const ps = c?.periods ?? [];
  for (const line of LIMIT_IDS) {
    if (!ps.length) { out[line] = { line, state: 'unchecked', n: 0, period: null, today: 0 }; continue; }
    const count = LIMIT_COUNT[line];
    let n = 0, period: PeriodId | null = null;
    for (const p of ps) { const k = count(p); if (k > n) { n = k; period = p.period; } }
    const first = ps.find((p) => p.period === periodIds[0]);
    out[line] = { line, state: n > 0 ? 'limits' : 'free', n, period, today: first ? count(first) : 0 };
  }
  return out;
}
// Warmth over the year as every row says it (review round 3 R1, C1, R4): one view, built from its
// status, so no row decides "limits" from raw counts. Limits (plants outside in some period): the counts
// of the period it is said for, today when anyone is outside today, else the first period it reaches its
// highest count (`later`). Free: today's plants near the edge only (a count, never a limit). Not counted
// yet: unchecked, no counts.
export interface WarmthView { state: LimitState; period: PeriodId | null; later: boolean; outside: number; edge: number; of: number }
export function warmthView(c: LineCounts | null | undefined): WarmthView {
  const st = limitStatus(c).warmth, ps = c?.periods ?? [];
  const today = ps.find((p) => p.period === periodIds[0]);
  if (st.state === 'unchecked' || !today) return { state: 'unchecked', period: null, later: false, outside: 0, edge: 0, of: 0 };
  if (st.state === 'free') return { state: 'free', period: today.period, later: false, outside: 0, edge: warmthOf(today).edge, of: today.of };
  const p = st.today ? today : ps.find((x) => x.period === st.period) ?? today;
  return { state: 'limits', period: p.period, later: p !== today, outside: warmthOf(p).outside, edge: warmthOf(p).edge, of: p.of };
}

// Each plant's first period drier here than its recorded band (drierOf), in period order; a plant never
// drier is not in the map. The Water card's "today", "by 2041–2070" and "by 2071–2099" read it.
export function drierFrom(list: readonly Pick<Taxon, 'id'>[], verdictsByPeriod: Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>>): Map<PlantId, PeriodId> {
  const first = new Map<PlantId, PeriodId>();
  for (const t of list) for (const p of periodIds) if (drierOf(verdictsByPeriod[p]?.get(t.id))) { first.set(t.id, p); break; }
  return first;
}

// The lines that limit, most first (ties in LIMIT_IDS order); none when nothing is outside and no plant
// carries the note.
export function limitsOf(c: LineCounts | null | undefined): { line: LimitLine; n: number }[] {
  const s = limitStatus(c);
  return LIMIT_IDS.map((l) => s[l]).filter((x) => x.state === 'limits').map(({ line, n }) => ({ line, n })).sort((a, b) => b.n - a.n);
}

// How the list moves as the climate warms ("What it means for your choice", board SiteKiambu):
// - dropSide: the side most of the plants that drop out leave on (fit today, outside in a later
//   period; the side that limits them in the first period they are outside); null when none drops;
// - arrivals: the plants that want more warmth (outside today on the cold or cool side) and come into
//   range by 2041–2070 (not outside then), food crops first, then in the list's order.
export type DropSide = RangeSideId | 'dry' | 'other';
export interface RangeMoves { dropSide: DropSide | null; arrivals: PlantId[] }
export function rangeMoves(list: readonly (Pick<Taxon, 'id'> & Partial<Pick<Taxon, 'role'>>)[], verdictsByPeriod: Partial<Record<PeriodId, ReadonlyMap<PlantId, PlantVerdict>>>): RangeMoves {
  const [today, mid, ...rest] = periodIds.map((p) => verdictsByPeriod[p]);
  if (!today || !mid) return { dropSide: null, arrivals: [] };
  const later = [mid, ...rest].filter((m): m is ReadonlyMap<PlantId, PlantVerdict> => !!m);
  const out = (v: PlantVerdict | undefined) => v?.level === 'outside';
  const sides = new Map<DropSide, number>();
  const arrivals: PlantId[] = [];
  for (const t of list) {
    const v = today.get(t.id);
    if (!v) continue;
    if (!out(v)) {
      const m = later.find((x) => out(x.get(t.id)));
      if (!m) continue;
      const f = m.get(t.id)?.limiting?.factor;
      const side: DropSide = f && (SIDES.has(f) || f === 'dry') ? (f as DropSide) : 'other';
      sides.set(side, (sides.get(side) ?? 0) + 1);
    } else if (!out(mid.get(t.id)) && mid.get(t.id) && (v.limiting?.factor === 'cold' || v.limiting?.factor === 'cool')) arrivals.push(t.id);
  }
  let dropSide: DropSide | null = null, most = 0;
  for (const [k, n] of sides) if (n > most) { dropSide = k; most = n; }
  const role = new Map(list.map((t) => [t.id, t.role]));
  arrivals.sort((a, b) => Number(role.get(b) === 'crop') - Number(role.get(a) === 'crop'));
  return { dropSide, arrivals };
}

// The listed plants with a recorded wind tolerance (layer_values tolerates_wind, yes or no), each once:
// the "After release" wind paragraph's count ("Wind tolerance is recorded for only 25 plants on the list").
export function windRecorded(ids: readonly PlantId[], values: ReadonlyMap<PlantId, readonly LayerValue[]>): number {
  let n = 0;
  for (const id of new Set(ids)) if (values.get(id)?.some((v) => v.field === 'tolerates_wind' && v.flag !== null)) n++;
  return n;
}
