// P5 seam (commit 0): a plant's marks, the concatenation of the range (S5c) and future (S5d)
// providers (P5.2 adds native, S5e) and the site answers' marks, in that order, for one surface (matrix chip, phone or list row, Add, Details). The
// views render them generically (views/PlantMarks.tsx), so a stream adds a mark without touching a
// view. The providers sit in their own chunk (mark-providers.ts), loaded only when a mark can show (a
// site location, or a climate whose plants are borrowed), so they never weigh on the first run
// (decision row "Island JavaScript budget for P5").
import type { ClimateZone, Mark, MarkSurface, Scenario, Site, SiteLocation, Taxon } from './types.ts';
import { siteMarks } from './site-marks.ts';

// What the providers read (store.ts markContext): the chosen climate, the site location, the
// scenario and the site answers (site-marks.ts; absent: none given). P5.2 (native here) adds the
// source's native-area reader.
export interface MarkContext {
  climate: ClimateZone | null;
  location: SiteLocation | null;
  site?: Site;
  scenario: Scenario;
}
export type MarkProvider = (taxon: Taxon, ctx: MarkContext, surface: MarkSurface) => Mark[];

// providers: the loaded ones (store.ts markProviders); none before they load. The site answers' marks
// (site-marks.ts: dry months, a plant taller than the room) come last and need no provider: they are
// on the island path, so a dry site or a sized room alone never loads the P5 chunk (review 7 of the
// ranges stream; decision row "Island JavaScript budget for P5").
export function plantMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface, providers: readonly MarkProvider[] = []): Mark[] {
  return [...providers.flatMap((p) => p(taxon, ctx, surface)), ...siteMarks(taxon, ctx, surface)];
}

// Whether a provider's mark can show: a site location, or a climate the export does not curate (its
// plants are borrowed and marked "estimate"). curated: SourceInfo.climates.
export function needsMarkProviders(ctx: Pick<MarkContext, 'climate' | 'location'>, curated: readonly ClimateZone[]): boolean {
  return ctx.location !== null || (ctx.climate !== null && !curated.includes(ctx.climate));
}

// The providers' chunk, loaded once.
let loading: Promise<readonly MarkProvider[]> | null = null;
export function loadMarkProviders(): Promise<readonly MarkProvider[]> {
  loading ??= import('./mark-providers.ts').then((m) => m.markProviders, (err: unknown) => { loading = null; throw err; });
  return loading;
}
