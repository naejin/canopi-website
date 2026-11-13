// A plant's site fit as the flags word it (E6 R2; design check §7.1 "Site-fit messages"): the one
// vocabulary (core site-marks.ts siteFitMessages, types.ts SiteFitMessage; the site marks derive from
// it there too), with the misfits kept to those that hold beside the other members (their canopy
// shades a lower plant: core misfitsBeside, the rule of the flags, the matrix and the suggestion).
// Pure over core types (ADR-1); kit/flags.ts renders what this returns.
import type { PlantId, Site, SiteFitMessage, SiteKey, Taxon } from '../../../lib/consortium/index.ts';
import { fits, misfitsBeside, siteFitMessages } from '../../../lib/consortium/index.ts';

// What the flags' words read (store.ts flagScene): the site answers, the members (the canopy, and the
// other plant a conflict names), the chosen country (invasive here).
export interface FlagScene { site: Site; members: readonly Taxon[]; country: string | null; taxonOf: (id: PlantId) => Taxon | null }

// The plant's messages beside the other members: its misfits that hold beside them, what the check
// could not decide, and the notes.
export function siteFit(t: Taxon, site: Site, others: readonly Taxon[]): SiteFitMessage[] {
  const fit = fits(t, site), beside = misfitsBeside(t, site, others, fit);
  return siteFitMessages(t, site, fit).filter((m) => !m.asks || beside.includes(m.about as SiteKey));
}
// The misfits (they ask first) and what the check could not decide (said aloud, never a silent fit).
export const misfitsOf = (ms: readonly SiteFitMessage[]): SiteFitMessage[] => ms.filter((m) => m.asks);
export const unknownsOf = (ms: readonly SiteFitMessage[]): SiteFitMessage[] => ms.filter((m) => !m.asks && !m.state);
