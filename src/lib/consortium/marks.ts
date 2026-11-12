// P5 seam (commit 0): a plant's marks, the concatenation of the range (S5c), future (S5d) and native
// (S5e) providers and the site answers' marks, in that order, for one surface (matrix chip, phone or list row, Add, Details). The
// views render them generically (views/PlantMarks.tsx), so a stream adds a mark without touching a
// view. The providers sit in their own chunk (mark-providers.ts), loaded only when a mark can show (a
// site location, or a climate whose plants are borrowed), so they never weigh on the first run
// (decision row "Island JavaScript budget for P5"). Empty today: every provider is a stub.
import type { ClimateZone, Mark, MarkSurface, PlantId, Scenario, Site, SiteLocation, Taxon } from './types.ts';

// What the providers read (store.ts markContext): the chosen climate, the site location, the
// scenario, the source's native-area reader and the site answers (site-marks.ts; absent: none given).
export interface MarkContext {
  climate: ClimateZone | null;
  location: SiteLocation | null;
  site?: Site;
  scenario: Scenario;
  source: { nativeIn(l3: string): ReadonlySet<PlantId> } | null;
}
export type MarkProvider = (taxon: Taxon, ctx: MarkContext, surface: MarkSurface) => Mark[];

// providers: the loaded ones (store.ts markProviders); none before they load.
export function plantMarks(taxon: Taxon, ctx: MarkContext, surface: MarkSurface, providers: readonly MarkProvider[] = []): Mark[] {
  return providers.flatMap((p) => p(taxon, ctx, surface));
}

// Whether any mark can show: a site location, a climate the export does not curate (its plants are
// borrowed and marked "estimate"), or a dry site (site-marks.ts). curated: SourceInfo.climates.
export function needsMarkProviders(ctx: Pick<MarkContext, 'climate' | 'location' | 'site'>, curated: readonly ClimateZone[]): boolean {
  return ctx.location !== null || (ctx.climate !== null && !curated.includes(ctx.climate)) || ctx.site?.water === 'dry';
}

// The providers' chunk, loaded once.
let loading: Promise<readonly MarkProvider[]> | null = null;
export function loadMarkProviders(): Promise<readonly MarkProvider[]> {
  loading ??= import('./mark-providers.ts').then((m) => m.markProviders, (err: unknown) => { loading = null; throw err; });
  return loading;
}
