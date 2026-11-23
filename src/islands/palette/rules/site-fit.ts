// A plant's site fit as the flags word it (E6 R2; design check §7.1 "Site-fit messages"): the one
// vocabulary (core verdict-line.ts siteLines, fix round 1 B2), with the misfits kept to those that
// hold beside the other members (their canopy shades a lower plant: core misfitsBeside, the rule of
// the flags, the verdict and the suggestion). Pure over core types (ADR-1); kit/flags.ts renders it.
import type { PlantId, Site, SiteKey, SiteLine, Taxon } from '../../../lib/palette/index.ts';
import { fits, misfitsBeside, siteLines } from '../../../lib/palette/index.ts';

// What the flags' words read (store.ts flagScene): the site answers, the members (the canopy, and the
// other plant a conflict names), the chosen country (invasive here).
export interface FlagScene { site: Site; members: readonly Taxon[]; country: string | null; taxonOf: (id: PlantId) => Taxon | null }

// The plant's messages beside the other members: its misfits that hold beside them, what the check
// could not decide, and the notes.
export function siteFit(t: Taxon, site: Site, others: readonly Taxon[]): SiteLine[] {
  const fit = fits(t, site), beside = misfitsBeside(t, site, others, fit);
  return siteLines(t, site, fit).filter((m) => !m.misfit || beside.includes(m.about as SiteKey));
}
// The misfits (a warning in words) and what the check could not decide (said aloud, never a silent fit).
export const misfitsOf = (ms: readonly SiteLine[]): SiteLine[] => ms.filter((m) => m.misfit);
export const unknownsOf = (ms: readonly SiteLine[]): SiteLine[] => ms.filter((m) => !m.misfit && !m.note);
