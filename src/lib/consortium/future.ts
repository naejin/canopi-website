// The future climate check (stream S5d; decision row "P5 engineering choices", 2026-11-11): each plant
// is compared with the site's projected climate, the canopi-climate period × scenario slots (the
// changes of a constrained CMIP6 model ensemble, Beck et al. 2023, applied to the CHELSA v2.1
// 1981–2010 climate), for the latest period its phases reach: a plant that lasts into the secondary
// phases (phase_end ≥ 3) is checked at 2041–2070, a climax plant at 2071–2099; a short-lived one is
// left to today's check. Two reasons: too hot (the warmest-month maximum beyond the plant's Q95 plus
// the 2 °C margin of today's range check, owner answer 2) and too dry (the aridity index below its
// Q05; no edge band, as today's aridity is a mark only). A reason counts only as a change from today:
// a plant already beyond that bound in today's slot is "already" outside, not "too hot by 2041–2070".
// A warmer coldest month is not a failure, so warm winters are left out. The chosen scenario (SSP2-4.5
// by default) gives the verdict; the period's other scenarios give its agreement: for outside, those
// outside for at least one of the shown reasons; otherwise those not outside ("stays within in 4 of
// 4"). No projection, no range or nothing to compare: null, "not checked".
// An annual too hot in the projected slot is not a loss: it is advised to the cool season (coolSeason,
// owner, decision row "Climate ranges fixed before the P5 push"), through range.ts coolSeasonOf.
import type { PlantId, Scenario, SitePeriod, SiteLocation, Taxon } from './types.ts';
import { phases, scenarios } from './types.ts';
import { boundPassed, coolSeasonOf, HOT_BOUND as HOT } from './range.ts';

export const futurePeriods = ['2041-2070', '2071-2099'] as const;
export type FuturePeriod = (typeof futurePeriods)[number];
export type FutureVerdict = 'inside' | 'edge' | 'outside' | 'already';
export type FutureReason = 'heat' | 'arid';
export interface FutureCheck {
  period: FuturePeriod;
  verdict: FutureVerdict; // under the chosen scenario
  why: FutureReason[]; // outside only: the new reasons, in this order
  already: FutureReason[]; // beyond the same bound today (verdict 'already' when there is no new reason)
  agree: number; // the period's scenarios that agree (the chosen one included; see the header)
  of: number; // scenarios of the period with data
  coolSeason: boolean; // an annual beyond its heat range under the chosen scenario: the cool-season advice
}

// Too hot: beyond the warmest-month Q95 by more than today's margin, through today's bound and
// comparison (range.ts HOT_BOUND, one of RANGE_BOUNDS, and boundPassed, the rule's one owner).
const SECONDARY = phases.indexOf('secondary_i');
const CLIMAX = phases.indexOf('climax');

// The period a plant is checked at, or null: it ends before the secondary phases, or is unplaced.
export function futurePeriod(taxon: Taxon): FuturePeriod | null {
  const end = taxon.phases ? phases.indexOf(taxon.phases.end) : -1;
  return end >= CLIMAX ? '2071-2099' : end >= SECONDARY ? '2041-2070' : null;
}

const slotOf = (site: SiteLocation | null, period: FuturePeriod, scenario: Scenario): SitePeriod | null =>
  site?.lookup?.climate?.periods.find((p) => p.period === period && p.scenario === scenario) ?? null;

// Whether the site has any projection (the reader gives all 8 future slots, or none).
function hasFutureData(site: SiteLocation | null): boolean {
  return futurePeriods.some((period) => scenarios.some((s) => slotOf(site, period, s)));
}

const todayOf = (site: SiteLocation | null): SitePeriod | null =>
  site?.lookup?.climate?.periods.find((p) => p.scenario === 'historical') ?? null;

// The reasons a slot is beyond the plant's bounds, or null when nothing can be compared.
function beyond(taxon: Taxon, slot: SitePeriod): { reasons: FutureReason[]; edge: boolean; coolSeason: boolean } | null {
  const low = taxon.climate?.aridity?.low ?? null;
  const heat = boundPassed(taxon, HOT, slot);
  const aridChecked = low !== null && slot.aridityIndex !== null;
  if (heat === null && !aridChecked) return null;
  const reasons: FutureReason[] = [];
  const coolSeason = coolSeasonOf(taxon, HOT, heat);
  if (heat === 'beyond' && !coolSeason) reasons.push('heat');
  if (aridChecked && (slot.aridityIndex as number) < low) reasons.push('arid');
  return { reasons, edge: heat === 'edge', coolSeason };
}

export function futureCheck(taxon: Taxon, site: SiteLocation | null, scenario: Scenario): FutureCheck | null {
  const period = futurePeriod(taxon);
  if (!period || !taxon.climate) return null;
  const own = slotOf(site, period, scenario);
  const mine = own && beyond(taxon, own);
  if (!mine) return null;
  const today = todayOf(site);
  const already = (today && beyond(taxon, today)?.reasons) || [];
  const fresh = (b: { reasons: FutureReason[] }) => b.reasons.filter((r) => !already.includes(r));
  const why = fresh(mine);
  // A new heat edge outranks "already": a plant already too dry today still shows the edge (with the suffix).
  const verdict: FutureVerdict = why.length ? 'outside' : mine.edge && !already.includes('heat') ? 'edge' : already.length ? 'already' : 'inside';
  let agree = 0, of = 0;
  for (const s of scenarios) {
    const slot = slotOf(site, period, s);
    const b = slot && beyond(taxon, slot);
    if (!b) continue;
    of++;
    const f = fresh(b);
    if (why.length ? f.some((r) => why.includes(r)) : f.length === 0) agree++;
  }
  return { period, verdict, why, already, agree, of, coolSeason: mine.coolSeason };
}

// The panel's summary over the members, each in exactly one place: per period those checked (m),
// those outside (n) and by new reason (a plant both too hot and too dry is under both); already: the
// plants with no new reason that are already beyond a bound today, by reason; todayOnly: short-lived
// plants; notChecked: no range, nothing to compare, or (available false) no projection for the site.
// checks: every checked plant's FutureCheck, so the panel's lines never decide again.
export interface FuturePeriodSummary { period: FuturePeriod; checked: PlantId[]; outside: PlantId[]; heat: PlantId[]; arid: PlantId[] }
export interface FutureSummary {
  available: boolean; periods: FuturePeriodSummary[]; already: Record<FutureReason, PlantId[]>;
  todayOnly: PlantId[]; notChecked: PlantId[]; checks: Record<PlantId, FutureCheck>;
}

export function futureSummary(taxa: readonly Taxon[], site: SiteLocation | null, scenario: Scenario): FutureSummary {
  const available = hasFutureData(site);
  const byPeriod = new Map<FuturePeriod, FuturePeriodSummary>();
  const already: Record<FutureReason, PlantId[]> = { heat: [], arid: [] };
  const todayOnly: PlantId[] = [], notChecked: PlantId[] = [];
  const checks: Record<PlantId, FutureCheck> = {};
  for (const t of taxa) {
    if (available && t.phases && !futurePeriod(t)) { todayOnly.push(t.id); continue; }
    const c = available ? futureCheck(t, site, scenario) : null;
    if (!c) { notChecked.push(t.id); continue; }
    checks[t.id] = c;
    if (c.verdict === 'already') { for (const r of c.already) already[r].push(t.id); continue; }
    let p = byPeriod.get(c.period);
    if (!p) byPeriod.set(c.period, (p = { period: c.period, checked: [], outside: [], heat: [], arid: [] }));
    p.checked.push(t.id);
    if (c.verdict === 'outside') p.outside.push(t.id);
    for (const w of c.why) p[w].push(t.id);
  }
  return { available, periods: futurePeriods.flatMap((p) => byPeriod.get(p) ?? []), already, todayOnly, notChecked, checks };
}

// How the page writes a scenario and a period: 'ssp245' → 'SSP2-4.5', '2041-2070' → '2041–2070'.
export const scenarioName = (s: Scenario): string => `SSP${s[3]}-${s[4]}.${s[5]}`;
export const periodName = (p: FuturePeriod): string => p.replace('-', '–');
