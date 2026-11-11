// P5 seam (commit 0): a plant's marks, the concatenation of the range (S5c), future (S5d) and native
// (S5e) providers, in that order. The views render them generically (views/PlantMarks.tsx in the
// matrix chips, phone rows, Details and Add), so a stream adds a mark without touching a view.
// Empty today: every provider is a stub.
import type { ClimateZone, Mark, PlantId, Scenario, SiteLocation, Taxon } from './types.ts';
import { rangeMarks } from './range.ts';
import { futureMarks } from './future.ts';
import { nativeMarks } from './native.ts';

// What the providers read (store.ts markContext): the chosen climate, the site location, the
// scenario and the source's native-area reader.
export interface MarkContext {
  climate: ClimateZone | null;
  location: SiteLocation | null;
  scenario: Scenario;
  source: { nativeIn(l3: string): ReadonlySet<PlantId> } | null;
}
export type MarkProvider = (taxon: Taxon, ctx: MarkContext) => Mark[];

export const markProviders: readonly MarkProvider[] = [rangeMarks, futureMarks, nativeMarks];

export function plantMarks(taxon: Taxon, ctx: MarkContext, providers: readonly MarkProvider[] = markProviders): Mark[] {
  return providers.flatMap((p) => p(taxon, ctx));
}
