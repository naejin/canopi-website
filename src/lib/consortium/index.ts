// The consortium v2 core: types, the PlantSource seam and pure, framework-free rules: site fit,
// conflicts, jobs, the strata × phases matrix, the suggestion and Swap list, share state and the
// .canopi writer. No DOM, no Astro, no import outside this folder (scripts/consortium-boundary.test.mjs),
// so node --test runs it and it can move to a canopi-consortium package unchanged.
export * from './types.ts';
export * from './source.ts';
// Stream S4's file, exported here so S4 never edits this one.
export * from './canopi-file.ts';
export * from './site.ts';
export * from './conflicts.ts';
export * from './jobs.ts';
export * from './matrix.ts';
export * from './suggest.ts';
export * from './state.ts';
// P5 seams (commit 0), each filled by one stream (.local/consortium/v2/p5-owners.md).
export * from './range.ts';
export * from './placement.ts';
export * from './future.ts';
export * from './marks.ts';
// E6 R2: the one site-fit vocabulary (its marks reach the views through plantMarks).
export { siteFitMessages } from './site-marks.ts';
// S5b: the location core (Köppen zone, borderline).
export * from './site-climate.ts';
// E6 commit 0: the one search fold (Add, Start's crop search, the plant list; design check A9).
export * from './fold.ts';
// E6 R1: the site-id mapping of the one zone list (the list itself, declared in zones.ts, comes through types.ts).
export { siteIdOf, zoneOfSiteId, type SiteId } from './zones.ts';
// E6 R1: the nearest-list table, a leaf.
export * from './nearest.ts';

// E6 R4 (design check A11): the suggestion and the Swap list (suggest.ts), their own chunk (role
// `suggest`, scripts/built-modules.mjs LAZY_ENTRIES), off the first run. This loader is the way in for
// the page (store.ts suggestRule); the `export *` above stays for node tests and builds no edge, as
// long as no first-run module takes `suggest` or `alternatives` from this barrel (check-built-site's
// role `suggest` would then find no chunk). Loaded once; a failed load clears the promise.
export interface SuggestRule { suggest: typeof import('./suggest.ts').suggest; alternatives: typeof import('./suggest.ts').alternatives }
let suggestLoading: Promise<SuggestRule> | null = null;
export function loadSuggest(): Promise<SuggestRule> {
  // Destructured, so Rollup keeps only these two exports of the chunk's facade.
  suggestLoading ??= import('./suggest.ts').then(({ suggest, alternatives }): SuggestRule => ({ suggest, alternatives }), (err: unknown) => { suggestLoading = null; throw err; });
  return suggestLoading;
}
