// Stream S5c: the site's climate today, apart from the range rule (range.ts re-exports it), so the first
// run can tell whether a location gave a climate without carrying the rule.
import type { SiteLocation, SitePeriod } from './types.ts';

// The site's climate today (the 1991–2020 period), or null when the location gave none.
export function siteToday(site: SiteLocation | null): SitePeriod | null {
  const periods = site?.lookup?.climate?.periods;
  if (!periods?.length) return null;
  return periods.find((p) => p.scenario === 'historical') ?? periods[0];
}
