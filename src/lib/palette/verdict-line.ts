// Words for periods, scenarios, holes, site edits, and bulk-removal toasts.
// Pure core leaf (no DOM, no Preact); returns Line descriptors formatted by the island.
import type { Hole, HoleChange, Line, PeriodId, Scenario, SiteEdits, ThinChange } from './types.ts';

const K = (k: string): string => `consortium.line.${k}`;
const monthOf = (y: number): number => Math.round(y * 12);

/** Format a CMIP6 scenario id ('ssp245' -> 'SSP2-4.5'). */
export const scenarioName = (s: Scenario): string => `SSP${s[3]}-${s[4]}.${s[5]}`;
/** Format a climate period id ('2041-2070' -> '2041–2070'). */
export const periodName = (p: PeriodId): string => p.replace('-', '–');

/** Describe a hole's time span in words. */
export function holeLine(h: Hole): Line {
  if (h.state === 'pending') return { key: K('holePending'), vars: {} };
  if (h.state === 'not-judged') return { key: K('holeNotJudged'), vars: {} };
  const { fromYear: from, toYear: to } = h;
  const k = (name: string) => K(h.unchecked?.length ? `${name}Known` : name);
  if (from === 0 && to >= 60) return { key: k('holeAlways'), vars: {} };
  if (from === 0) return { key: k('holeFirst'), vars: {}, count: to };
  if (from < 1 && to >= 60) return { key: k('holeAfterMonth'), vars: { month: monthOf(from) } };
  if (to >= 60) return { key: k('holeAfter'), vars: { from } };
  if (from < 1) return { key: k('holeFromMonth'), vars: { month: monthOf(from), to } };
  return { key: k('holeBetween'), vars: { from, to } };
}

export const laneLine = (h: Pick<Hole, 'kind' | 'job' | 'stratum'>): Line => ({
  key: h.kind === 'job' ? `consortium.job.${h.job}` : `consortium.palette.light_${h.stratum}`,
  vars: {},
});

export const holeTitleLine = (h: Hole): Line => ({
  key: 'consortium.palette.holeTitle',
  vars: {},
  parts: { lane: laneLine(h), span: holeLine(h) },
});

/** Describe what a bulk removal or edit did to open holes and thin spots. */
export function holeChangeLines(
  c: HoleChange,
  { left = true, thins = null, jobs = null, target = null }: {
    left?: boolean;
    thins?: ThinChange | null;
    jobs?: readonly string[] | null;
    target?: Pick<Hole, 'kind' | 'job' | 'stratum' | 'fromYear' | 'toYear'> | 'none' | null;
  } = {},
): Line[] {
  const out: Line[] = [];
  out.push(c.added.length ? { key: K('holesNew'), vars: {}, count: c.added.length, parts: { holes: c.added.map(holeTitleLine) } } : { key: K('holesNoNew'), vars: {} });
  const sameLane = (h: Hole) => target !== 'none' && (!target || (h.kind === target.kind && (h.job ?? h.stratum) === (target.job ?? target.stratum) && h.fromYear < target.toYear && target.fromYear < h.toYear));
  for (const n of c.narrowed) if (sameLane(n.before)) out.push({ key: K('holeNow'), vars: {}, parts: { hole: holeTitleLine(n.after) } });
  if (left && (c.added.length || c.closed.length || c.narrowed.length)) out.push(c.open.length ? { key: K('holesLeft'), vars: {}, count: c.open.length } : { key: K('holesNoneLeft'), vars: {} });
  const wasHole = (h: Hole) => [...c.closed, ...c.narrowed.map((n) => n.before)].some((b) => b.kind === 'job' && b.job === h.job && b.fromYear < h.toYear && h.fromYear < b.toYear);
  for (const h of thins?.added ?? []) {
    if ((jobs && !jobs.includes(h.job!)) || wasHole(h)) continue;
    out.push({ key: K('thinNew'), vars: { from: h.fromYear, to: h.toYear }, count: h.thin?.have ?? 0, parts: { lane: laneLine(h) } });
  }
  for (const t of thins?.still ?? []) {
    if (jobs && !jobs.includes(t.job)) continue;
    out.push({ key: K('thinStill'), vars: { from: t.fromYear, to: t.toYear }, count: t.have, parts: { lane: laneLine({ kind: 'job', job: t.job }) } });
  }
  return out;
}

/** Describe the grower's site edits in words. */
export function siteEditLines(e: SiteEdits): Line[] {
  const out: Line[] = [];
  const shift = (n: number | undefined, less: string, more: string, key: string) => { if (n) out.push({ key: K(n < 0 ? less : more), vars: { [key]: Math.abs(n) } }); };
  shift(e.nightsShiftC, 'editNightsColder', 'editNightsWarmer', 'tempShift');
  shift(e.daysShiftC, 'editDaysColder', 'editDaysWarmer', 'tempShift');
  shift(e.rainShiftMm, 'editRainLess', 'editRainMore', 'rainMm');
  if (e.dryMonthsShift) out.push({ key: K(e.dryMonthsShift < 0 ? 'editDryFewer' : 'editDryMore'), vars: {}, count: Math.abs(e.dryMonthsShift) });
  if (e.watering) out.push({ key: K(e.watering === 'rain' ? 'editWateringRain' : e.watering === 'first-years' ? 'editWateringFirst' : 'editWateringAll'), vars: {} });
  if (e.soilPh !== undefined) out.push({ key: K('editPh'), vars: { ph: e.soilPh } });
  if (e.drainage) out.push({ key: K(e.drainage === 'wet' ? 'editWet' : 'editDrains'), vars: {} });
  if (e.pots !== undefined) out.push({ key: K(e.pots ? 'editPots' : 'editGround'), vars: {} });
  return out;
}

export const removedManyLine = (n: number): Line => ({ key: K('removedMany'), vars: {}, count: n });
export const paletteSizeLine = (n: number): Line => ({ key: K('paletteSize'), vars: {}, count: n });
