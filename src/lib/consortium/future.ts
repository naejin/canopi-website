// The future climate check (stream S5d; decision row "P5 engineering choices", 2026-11-11): each plant
// is compared with the site's projected climate, the canopi-climate period × scenario slots (CHELSA
// model ensemble means), for the latest period its phases reach: a plant that lasts into the secondary
// phases (phase_end ≥ 3) is checked at 2041–2070, a climax plant at 2071–2099; a short-lived one is
// left to today's check. Two reasons: too hot (the warmest-month maximum beyond the plant's Q95 plus
// the 2 °C margin of today's range check, owner answer 2) and too dry (the aridity index below its
// Q05). A warmer coldest month is not a failure, so warm winters are left out. The chosen scenario
// (SSP2-4.5 by default) gives the verdict; the other scenarios of the same period give its agreement
// ("outside in 3 of 4 scenarios"). No projection, no range or nothing to compare: null, "not checked".
import type { PlantId, Scenario, SitePeriod, SiteLocation, Taxon } from './types.ts';
import { phases, scenarios } from './types.ts';

export const futurePeriods = ['2041-2070', '2071-2099'] as const;
export type FuturePeriod = (typeof futurePeriods)[number];
export type FutureVerdict = 'inside' | 'edge' | 'outside';
export type FutureReason = 'heat' | 'arid';
export interface FutureCheck {
  period: FuturePeriod;
  verdict: FutureVerdict; // under the chosen scenario
  why: FutureReason[]; // outside only, in this order
  agree: number; // scenarios of the period that give this verdict (the chosen one included)
  of: number; // scenarios of the period with data
}

// °C beyond the warmest-month Q95 before a plant is too hot: today's margin (range.ts).
export const FUTURE_HEAT_MARGIN_C = 2;
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
export function hasFutureData(site: SiteLocation | null): boolean {
  return futurePeriods.some((period) => scenarios.some((s) => slotOf(site, period, s)));
}

// One slot's verdict, or null when nothing can be compared.
function verdictAt(taxon: Taxon, slot: SitePeriod): { verdict: FutureVerdict; why: FutureReason[] } | null {
  const high = taxon.climate?.tmaxWarm?.high ?? null;
  const low = taxon.climate?.aridity?.low ?? null;
  const heatChecked = high !== null;
  const aridChecked = low !== null && slot.aridityIndex !== null;
  if (!heatChecked && !aridChecked) return null;
  const why: FutureReason[] = [];
  if (heatChecked && slot.tmaxWarmC > high + FUTURE_HEAT_MARGIN_C) why.push('heat');
  if (aridChecked && (slot.aridityIndex as number) < low) why.push('arid');
  if (why.length) return { verdict: 'outside', why };
  return { verdict: heatChecked && slot.tmaxWarmC > high ? 'edge' : 'inside', why };
}

export function futureCheck(taxon: Taxon, site: SiteLocation | null, scenario: Scenario): FutureCheck | null {
  const period = futurePeriod(taxon);
  if (!period || !taxon.climate) return null;
  const own = slotOf(site, period, scenario);
  const mine = own && verdictAt(taxon, own);
  if (!mine) return null;
  let agree = 0, of = 0;
  for (const s of scenarios) {
    const slot = slotOf(site, period, s);
    const v = slot && verdictAt(taxon, slot);
    if (!v) continue;
    of++;
    if (v.verdict === mine.verdict) agree++;
  }
  return { period, verdict: mine.verdict, why: mine.why, agree, of };
}

// The panel's summary over the members: per period, those checked, those outside, and by reason
// (a plant both too hot and too dry is under both); todayOnly: short-lived plants; notChecked: no
// range, nothing to compare, or (available false) no projection for the site at all.
export interface FuturePeriodSummary { period: FuturePeriod; checked: PlantId[]; outside: PlantId[]; heat: PlantId[]; arid: PlantId[] }
export interface FutureSummary { available: boolean; periods: FuturePeriodSummary[]; todayOnly: PlantId[]; notChecked: PlantId[] }

export function futureSummary(taxa: readonly Taxon[], site: SiteLocation | null, scenario: Scenario): FutureSummary {
  const available = hasFutureData(site);
  const byPeriod = new Map<FuturePeriod, FuturePeriodSummary>();
  const todayOnly: PlantId[] = [], notChecked: PlantId[] = [];
  for (const t of taxa) {
    if (available && t.phases && !futurePeriod(t)) { todayOnly.push(t.id); continue; }
    const c = available ? futureCheck(t, site, scenario) : null;
    if (!c) { notChecked.push(t.id); continue; }
    let p = byPeriod.get(c.period);
    if (!p) byPeriod.set(c.period, (p = { period: c.period, checked: [], outside: [], heat: [], arid: [] }));
    p.checked.push(t.id);
    if (c.verdict === 'outside') p.outside.push(t.id);
    for (const w of c.why) p[w].push(t.id);
  }
  return { available, periods: futurePeriods.flatMap((p) => byPeriod.get(p) ?? []), todayOnly, notChecked };
}

// How the page writes a scenario and a period: 'ssp245' → 'SSP2-4.5', '2041-2070' → '2041–2070'.
export const scenarioName = (s: Scenario): string => `SSP${s[3]}-${s[4]}.${s[5]}`;
export const periodName = (p: FuturePeriod): string => p.replace('-', '–');
