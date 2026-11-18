// Stream S5c: the site's climate today, apart from the range rule (range.ts re-exports it), so the first
// run can tell whether the site inputs hold a climate without carrying the rule. Reads the merged site
// inputs (site-inputs.ts), never the lookup. Imports types only: site-inputs.ts imports todayOf from here.
import type { SiteInputs, SitePeriod } from './types.ts';

// The today slot (1991–2020 historical) in a list of slots, or the first one.
export const todayOf = (periods: readonly SitePeriod[]): SitePeriod | null =>
  periods.find((p) => p.scenario === 'historical') ?? periods[0] ?? null;

// The site's climate today (the 1991–2020 period, grower shifts applied), or null with no climate.
export function siteToday(inputs: SiteInputs | null): SitePeriod | null {
  return inputs ? todayOf(inputs.periods) : null;
}
