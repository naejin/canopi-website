// The words of verdicts, holes and year spans (plant-palette-architecture 3.2): the only places that
// put them into a Line (an i18n key under consortium.line., its variables and the count P() reads).
// A leaf, first-run safe. Each key is one segment after `consortium.line.` (the island draws any Line
// through views/kit/fit.tsx `say`), so Find, Swap, Details, print and the period switch never write
// their own words for these. Numbers stay numbers: the view formats them for the page language.
import type { Hole, Line, PeriodId, PlantVerdict } from './types.ts';

const K = (k: string): string => `consortium.line.${k}`;
const lastYear = (p: PeriodId): number => Number(p.slice(5));
// Months for a year fraction under one (0.25 → 3).
const monthOf = (y: number): number => Math.round(y * 12);

// One plant's verdict: fits (to the end of a later period it is judged at), needs a second look,
// outside its climate range, or not checked (never "fits" when nothing was compared).
export function fitLine(v: PlantVerdict): Line {
  if (v.level === 'fits' && v.judged !== '1991-2020') return { key: K('fitsTo'), vars: { year: lastYear(v.judged) } };
  return { key: K(v.level), vars: {} };
}

// The years of a hole, in words: who is missing and when. A pending hole waits for a list; a gap under
// a year is not judged (drawn as a thin line, never a hole).
export function holeLine(h: Hole): Line {
  if (h.state === 'pending') return { key: K('holePending'), vars: {} };
  if (h.state === 'not-judged') return { key: K('holeNotJudged'), vars: {} };
  const { fromYear: from, toYear: to } = h;
  if (from === 0 && to >= 60) return { key: K('holeAlways'), vars: {} };
  if (from === 0) return { key: K('holeFirst'), vars: {}, count: to };
  // From under a year to 60: every judged year, said as "after month n", never "after year 0.25".
  if (from < 1 && to >= 60) return { key: K('holeAfterMonth'), vars: { month: monthOf(from) } };
  if (to >= 60) return { key: K('holeAfter'), vars: { from } };
  if (from < 1) return { key: K('holeFromMonth'), vars: { month: monthOf(from), to } };
  return { key: K('holeBetween'), vars: { from, to } };
}

// A span of years after planting (to null: it lasts past 60 years).
export function yearsLine(from: number, to: number | null): Line {
  if (to === null) return from === 0 ? { key: K('yearsAlways'), vars: {} } : { key: K('yearsAfter'), vars: { from } };
  if (from === 0 && to < 1) return { key: K('yearsFirstDays'), vars: { days: Math.round(to * 360) } };
  if (from === 0) return { key: K('yearsFirst'), vars: {}, count: to };
  if (from < 1 && to <= 1) return { key: K('yearsMonths'), vars: { from: monthOf(from), to: monthOf(to) } };
  if (from < 1) return { key: K('yearsMonthTo'), vars: { month: monthOf(from), to } };
  return { key: K('yearsSpan'), vars: { from, to } };
}

// "+ {n} more" on a folded lane of a picture (ux-inventory E6; plant-palette-architecture 3.4).
export const moreLine = (n: number): Line => ({ key: K('more'), vars: { n }, count: n });
