// The palette page's "Your plants" and "Things to weigh" (plant-palette-architecture 2, inventory P39
// and E11; PP-B stream b3), off the first run (palette chunk). Vectors: scripts/vectors/weigh.json.
// - Things to weigh (board MainMore "Balance things to weigh, not holes"; v14 pf-b): one family holding a
//   large share of the palette, the water line and the soil pH hints (A12: the R3 hints, read from each
//   member's verdict). Things to keep in mind, never holes and never a verdict: nothing is removed or asked. A
//   check without enough records says so ("n of m recorded: not enough to judge"), never a pass; family
//   spread over many families claims nothing, and even water needs claim nothing either (owner
//   2026-11-15: no all-clear line); with no water line, the plants with no water need recorded are
//   still said on a line of their own ('missing', never silent). On a borrowed list every line carries the estimate term (Line vars
//   `term: 'estimate'`), as the placements it reads are estimates.
// - Never a judgement of part of the palette as the whole: the plants not checked (a guest list that
//   could not be read, a plant on none of this climate's lists) count in m and are said as not checked.
// - A plant's water need is the factAt water_need fact (ADR-6) for the site and period it is given
//   (climateFor's context, architecture 3.1; today's stored value whatever they are), grouped by
//   waterNeed below (site.ts's water check reads the same fact with its own dry/wet-site mapping; both
//   take a drought value outside the list as not recorded).
// - Your plants: each plant once, warned plants first (owner "warn, never hide"), then the plants it
//   cannot show, and its full-grown size as a Line (the view formats the lengths for the page language).
import type { Factor, Flag, Line, PlantId, PlantVerdict, SiteInputs, Taxon, VerdictContext, WeighLine } from './types.ts';
import { jobsOf } from './jobs.ts';
import type { FactValues } from './types.ts';
import { factAt } from './source.ts';
import { secondLook } from './conflicts.ts';
import { fillerGroup } from './holes.ts';

const K = (k: string): string => `consortium.plants.${k}`;
// The v14 Balance lines (boards MainMore, Kumasi): their words live under consortium.palette.balance.
const B = (k: string): string => `consortium.palette.balance.${k}`;

// The one "not enough to judge" threshold: water needs recorded for at least this share of the plants.
const WATER_JUDGE_SHARE = 0.5;
// A family is a thing to weigh when it holds at least FAMILY_MIN plants and FAMILY_SHARE of the palette
// (four of thirteen legumes at Seville, board MainMore; six of eight in Fabaceae, F1a-B1; owner
// 2026-11-15 keeps both).
const FAMILY_MIN = 3;
const FAMILY_SHARE = 0.25;

// A plant's water need, from its water_need fact: drought tolerance when recorded (the direct answer to
// "takes a dry summer"), else moisture use; null when neither is (a value outside these lists counts as
// not recorded). The v14 boards (approved 2026-11-18, later than the owner's 2026-11-15 "Needs regular
// water") name the 'regular' plants "thirsty" in the mixed form ("Water needs: one thirsty plant among 9
// recorded", PaletteMore); the board wins.
type WaterNeed = 'dry' | 'medium' | 'regular';
const BY_DROUGHT: Record<string, WaterNeed> = { High: 'dry', Medium: 'medium', Low: 'regular', None: 'regular' };
const BY_MOISTURE: Record<string, WaterNeed> = { Low: 'dry', Medium: 'medium', High: 'regular' };
export const waterNeed = (w: FactValues['water_need'] | null): WaterNeed | null =>
  (w?.drought ? BY_DROUGHT[w.drought] : undefined) ?? (w?.moisture ? BY_MOISTURE[w.moisture] : undefined) ?? null;

type WeighContext = Pick<VerdictContext, 'inputs' | 'period'>;
interface WeighOptions {
  pending?: boolean; // a list is still being read: 'checking'
  unchecked?: number; // members of the palette not checked (a list unread, on no list of this climate)
  // The members' verdicts (store.memberVerdicts): the soil line counts the pH hints they carry (R3).
  verdicts?: ReadonlyMap<PlantId, PlantVerdict> | null;
}

// Whether the place has a dry summer today: its Köppen class's second letter is 's' (Csa, Csb, Dsb…).
// There the water line asks whether each recorded plant takes a dry summer ("Water needs"); elsewhere
// it groups the water use the sources record ("Water use", board Kumasi): no check reads dry months,
// they are a reading of the place (v14 spec section 2, chk #30).
export function drySummer(inputs: SiteInputs | null | undefined): boolean {
  const today = inputs?.periods?.find((p) => p.scenario === 'historical') ?? inputs?.periods?.[0];
  return !!today && today.koppen.charAt(1) === 's';
}
// A plant's recorded water use (its moisture use), or null.
type WaterUse = 'high' | 'medium' | 'low';
const BY_USE: Record<string, WaterUse> = { High: 'high', Medium: 'medium', Low: 'low' };
const waterUseOf = (w: FactValues['water_need'] | null): WaterUse | null => (w?.moisture ? BY_USE[w.moisture] ?? null : null);
// A member's soil pH hint (R3): its soil-ph factor gives one (never a level; verdict-line.ts hintLine
// says it on the plant).
const phHint = (v: PlantVerdict | undefined): boolean => !!v?.factors.some((f) => f.factor === 'soil-ph' && f.level !== 'fits' && f.level !== 'unknown');

// The things to weigh for these plants, family lines first (largest first), then the water line.
// pending: a list is still being read, so the palette is not whole: 'checking', never a judgement of part.
export function weighLines(members: readonly Taxon[], ctx: WeighContext, { pending = false, unchecked = 0, verdicts = null }: WeighOptions = {}): WeighLine[] | 'checking' {
  if (pending) return 'checking';
  const m = members.length + unchecked;
  if (!members.length) return [];
  const term: Line['vars'] = members.some((t) => t.origin?.kind === 'borrowed') ? { term: 'estimate' } : {};
  const out: WeighLine[] = [];
  const byFamily = new Map<string, PlantId[]>();
  for (const t of members) if (t.family) byFamily.set(t.family, [...(byFamily.get(t.family) ?? []), t.id]);
  const heavy = [...byFamily].filter(([, ids]) => ids.length >= FAMILY_MIN && ids.length >= FAMILY_SHARE * m)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  // "One family: 4 of your 13 are legumes": the view says a family in plain words where the locale has
  // them (consortium.palette.balance.familyWords.<Family>), else this line with its botanical name.
  for (const [family, ids] of heavy) out.push({ kind: 'family', line: { key: K('weigh.family'), vars: { family, n: ids.length, m, ...term } }, members: ids });
  out.push(...waterLines(members, ctx, m, unchecked, term));
  // The soil pH hints (R3, A12): the members whose verdict carries one, in palette order.
  if (verdicts) {
    const hinted = members.filter((t) => phHint(verdicts.get(t.id))).map((t) => t.id);
    if (hinted.length) out.push({ kind: 'soil', line: { key: B('soilHints'), vars: { n: hinted.length, m, ...term } }, members: hinted });
  }
  return out;
}

// The one water line. With no place read (ctx.inputs absent) or at a place with a dry summer, "Water
// needs" from each plant's drought tolerance (else its moisture use): too few recorded, mixed needs
// (board PaletteMore: "one thirsty plant among N recorded"; members the plants needing regular water,
// the dry-loving ones, those between, then those not recorded: vars regular, dry, medium, missing), all
// recorded take a dry summer (only where the summer is dry), or the plants not recorded on their own.
// Every form names the plants not recorded (the last vars.missing members). Elsewhere (a place read, no
// dry summer: board Kumasi), "Water use": the recorded use, high, medium and low, then the plants not
// recorded; members in that order (vars high, medium, low, missing).
function waterLines(members: readonly Taxon[], ctx: WeighContext, m: number, unchecked: number, term: Line['vars']): WeighLine[] {
  const facts = members.map((t) => ({ t, w: factAt('water_need', t, ctx.inputs, ctx.period) }));
  if (ctx.inputs && !drySummer(ctx.inputs)) {
    const by: Record<WaterUse, PlantId[]> = { high: [], medium: [], low: [] }, none: PlantId[] = [];
    for (const { t, w } of facts) { const u = waterUseOf(w); (u ? by[u] : none).push(t.id); }
    const n = members.length - none.length;
    return [{ kind: 'water', line: { key: B('waterUseTitle'), vars: { n, m, high: by.high.length, medium: by.medium.length, low: by.low.length, missing: none.length, unchecked, ...term } }, members: [...by.high, ...by.medium, ...by.low, ...none] }];
  }
  const by: Record<WaterNeed, PlantId[]> = { regular: [], dry: [], medium: [] }, none: PlantId[] = [];
  for (const { t, w } of facts) { const need = waterNeed(w); (need ? by[need] : none).push(t.id); }
  const n = members.length - none.length;
  const vars: Line['vars'] = { n, m, missing: none.length, unchecked, ...term };
  if (n < WATER_JUDGE_SHARE * m) return [{ kind: 'water', line: { key: K('weigh.waterFew'), vars }, members: none }];
  if (by.regular.length && by.dry.length) {
    return [{ kind: 'water', line: { key: B('waterMix'), vars: { ...vars, regular: by.regular.length, dry: by.dry.length, medium: by.medium.length } }, members: [...by.regular, ...by.dry, ...by.medium, ...none] }];
  }
  // At a place with a dry summer, none needing regular water: "all 12 recorded take a dry summer"; the
  // members are the plants not recorded (vars.missing of them), named on the line.
  if (drySummer(ctx.inputs) && !by.regular.length) return [{ kind: 'water', line: { key: B('waterDrySummer'), vars }, members: none }];
  // No water line to show: the plants with no water need recorded, named on their own (review b3f-4).
  if (none.length) return [{ kind: 'water', line: { key: B('notRecordedNamed'), vars }, members: none }];
  return [];
}

// ---- Warnings and fit (boards Many, ManyDesk, MainMore; v14 spec A13, R1) ----

// The climate factors: a second look from one of these is "Near the edge of their climate range" (the
// one set: views/palette/Weigh.tsx reads it through leaveGroups).
const CLIMATE_FACTORS: ReadonlySet<Factor> = new Set<Factor>(['cold', 'mild', 'cool', 'summer', 'hot', 'dry']);
// The second look's reasons (a member may carry several): the board's near the edge, toxic or very
// toxic, recorded invasive in the chosen country (word-map "Needs a second look"), and the flags'
// misfit (the room or plot) and serious clash.
export type WarnReason = 'edge' | 'severe' | 'moderate' | 'invasive' | 'misfit' | 'clash';
// The reason a 'look' verdict gives, from its limiting factor: one row per Factor, so a new factor fails
// the type check instead of falling into a wrong reason (review R3): the climate factors are the edge of
// the range, light and wind the room or plot. The soil pH, drainage and water are hints that never set
// the level (types.ts setsLevel, v14 0W-2 R3), so never the limiting factor of a look: null, no reason.
export const LOOK_REASON: Readonly<Record<Factor, WarnReason | null>> = {
  cold: 'edge', mild: 'edge', cool: 'edge', summer: 'edge', hot: 'edge', dry: 'edge',
  light: 'misfit', wind: 'misfit', 'soil-ph': null, water: null, drainage: null,
};
// The palette in lines that add up (each member on one): fits, needs a second look, outside its
// climate range, not checked. A member outside its range is on that line whatever else it carries; a
// second look is the verdict's ('look') or the flags' (conflicts.ts secondLook: a serious clash, a
// misfit, recorded invasive in the chosen country, toxic or very toxic; Mildly toxic never, R1). The
// second look's reasons: the verdict's limiting factor (LOOK_REASON), toxic or very toxic (by level),
// recorded invasive in the country, a misfit flag (the room or plot), a serious clash with another
// member. Mildly toxic is a mark on its own line (`mild`), with how many of them fit. `outsideToxic`: the
// members outside their range that are toxic or very toxic (said under the second look's reasons, as
// they are counted on the outside line). Every list in palette order; no verdicts (the rule not loaded
// or refused): every member not checked.
export interface FitGroups {
  fits: PlantId[]; look: PlantId[]; outside: PlantId[]; unknown: PlantId[];
  reasons: Record<WarnReason, PlantId[]>;
  mild: PlantId[]; mildFits: number;
  outsideToxic: PlantId[];
  reasonCount: number; // the reasons on the second-look line, summed
  several: number; // second-look members carrying two or more reasons
}
const toxLevel = (fl: readonly Flag[]): string | null => fl.find((f) => f.kind === 'toxicity')?.level ?? null;
export function fitGroups(members: readonly Taxon[], verdicts: ReadonlyMap<PlantId, PlantVerdict> | null, flags: readonly Flag[]): FitGroups {
  const byId = new Map<PlantId, Flag[]>();
  for (const f of flags) { const l = byId.get(f.id); if (l) l.push(f); else byId.set(f.id, [f]); }
  const reasons: Record<WarnReason, PlantId[]> = { edge: [], severe: [], moderate: [], invasive: [], misfit: [], clash: [] };
  const g: FitGroups = { fits: [], look: [], outside: [], unknown: [], reasons, mild: [], mildFits: 0, outsideToxic: [], reasonCount: 0, several: 0 };
  const seen = new Set<PlantId>();
  for (const t of members) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const v = verdicts?.get(t.id), fl = byId.get(t.id) ?? [];
    const tox = toxLevel(fl);
    // holes.ts fillerGroup, the one ordered rule the Next step and Find use (E7): a warned plant with no
    // range recorded is a second look here too (warn, never hide), never "not checked".
    const grp = fillerGroup(v?.level, secondLook(fl));
    if (grp === 'unknown') g.unknown.push(t.id);
    else if (grp === 'outside') {
      g.outside.push(t.id);
      if (tox === 'Severe' || tox === 'Moderate') g.outsideToxic.push(t.id);
    } else if (grp === 'look') {
      g.look.push(t.id);
      const why = new Set<WarnReason>();
      if (v?.level === 'look') why.add((v.limiting && LOOK_REASON[v.limiting.factor]) || 'edge');
      if (tox === 'Severe') why.add('severe');
      if (tox === 'Moderate') why.add('moderate');
      if (fl.some((f) => f.kind === 'invasive')) why.add('invasive');
      if (fl.some((f) => f.kind === 'misfit')) why.add('misfit');
      if (fl.some((f) => f.kind === 'conflict' && f.severity === 'high')) why.add('clash');
      for (const w of why) reasons[w].push(t.id);
      g.reasonCount += why.size;
      if (why.size > 1) g.several++;
    } else g.fits.push(t.id);
    if (tox === 'Slight') { g.mild.push(t.id); if (v && v.level === 'fits' && !secondLook(fl)) g.mildFits++; }
  }
  return g;
}

// The Mildly toxic line's examples (board ManyDesk: "Mildly toxic is a mark on the plant, not a second
// look: many are common foods (African marigold, Bay laurel, Bell Pepper)"): the first three Mildly toxic
// members in name order (`compare` over `name`, the page's collation), and whether "many are common
// foods" holds: more than half of the Mildly toxic members feed you (jobs.ts jobsOf). Else the view says
// the plain lead.
export function mildExamples(g: Pick<FitGroups, 'mild'>, members: readonly Taxon[], name: (id: PlantId) => string, compare: (a: string, b: string) => number): { ids: PlantId[]; foods: boolean } {
  const byId = new Map(members.map((t) => [t.id, t]));
  const ids = [...g.mild].sort((a, b) => compare(name(a), name(b))).slice(0, 3);
  const fed = g.mild.filter((id) => { const t = byId.get(id); return !!t && jobsOf(t).includes('feeds_you'); }).length;
  return { ids, foods: fed * 2 > g.mild.length };
}

// The small Warnings card's range line (board MainMore): the members that leave their climate range by
// a later period (outside then, not outside today), and those near its edge then (a 'look' from a
// climate factor). Either list empty when the later verdicts are not there.
export function leaveGroups(members: readonly Taxon[], now: ReadonlyMap<PlantId, PlantVerdict> | null, later: ReadonlyMap<PlantId, PlantVerdict> | null): { leave: PlantId[]; edge: PlantId[] } {
  if (!now || !later) return { leave: [], edge: [] };
  const leave = members.filter((t) => later.get(t.id)?.level === 'outside' && now.get(t.id)?.level !== 'outside').map((t) => t.id);
  const edge = members.filter((t) => { const v = later.get(t.id); return v?.level === 'look' && !!v.limiting && CLIMATE_FACTORS.has(v.limiting.factor); }).map((t) => t.id);
  return { leave, edge };
}

// A flag that puts a plant first in Your plants: every flag a row shows in words (a low conflict is
// left to the plant's sheet, as kit/flags.ts flagLines does).
const shown = (f: Flag): boolean => f.kind !== 'conflict' || f.severity !== 'low';

export type PlantRow = { plant: Taxon; warned: boolean } | { id: PlantId; missing: 'failed' | 'unlisted' };
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

