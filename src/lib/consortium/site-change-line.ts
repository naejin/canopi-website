// The change summary in words (v14 spec 3.2; pf-d fills it in chunk 3): the Lines a site edit's toast
// says from core site-change.ts SiteChange ("Coldest nights set 2 °C colder. Today: 13 more fit; by
// 2071–2099: 27 more fit. Your 8 plants are kept: … No new hole."). A leaf beside verdict-line.ts.
// 0W lands the typed stub (chk #3): no Lines until pf-d.
import type { SiteChange } from './site-change.ts';
import type { Line, SiteEdits } from './types.ts';

// (stub: no Lines, until pf-d)
export function siteChangeLines(change: SiteChange, edits: SiteEdits): Line[] {
  void change; void edits;
  return [];
}
