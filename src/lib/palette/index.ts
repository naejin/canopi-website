// The consortium v2 core: types, the PlantSource seam and pure, framework-free rules: site fit,
// conflicts, jobs, the strata × phases matrix, the suggestion and Swap list, share state and the
// .canopi writer. No DOM, no Astro, no import outside this folder (scripts/palette-boundary.test.mjs),
// so node --test runs it and it can move to a canopi-consortium package unchanged.
import { retryableImport } from './retry-import.ts';
export * from './types.ts';
export * from './source.ts';
// Stream S4's file, exported here so S4 never edits this one.
export * from './canopi-file.ts';
export * from './planting-plan.ts';
// The pure helpers the views and the island read (fix round 1 B3: named, never the whole rule file).
export { canopyOf, fits, misfitsBeside, ROOM_LIMIT_M, SIZE_LIMIT, UNSURE_SITE, type Canopy } from './site.ts';
export * from './country-zones.ts';
export * from './retry-import.ts';
export * from './conflicts.ts';
export * from './jobs.ts';
export * from './state.ts';
// P5 seams (commit 0), each filled by one stream (.local/consortium/v2/p5-owners.md).
export { RANGE_MARGIN_C, siteToday, yearMeanC } from './range.ts';
export * from './placement.ts';
export { futureSummary, type FutureCheck, type FutureSummary } from './future.ts';
// S5b: the location core (Köppen zone, borderline).
export * from './site-climate.ts';
// E6 commit 0: the one search fold (Add, Start's crop search, the plant list; design check A9).
export * from './fold.ts';
// E6 R1: the site-id mapping of the one zone list (the list itself, declared in zones.ts, comes through types.ts).
export { siteIdOf, zoneOfSiteId, type SiteId } from './zones.ts';
// E6 R1: the nearest-list table, a leaf.
export * from './nearest.ts';
// PP-B commit 0 seams (plant-palette-architecture 2): the place projections, the years of the phases,
// the verdict words and loader (never verdict.ts itself: its own chunk, through loadVerdictRule),
// holes and the things to weigh (used by lazy chunks only).
export * from './place.ts';
// The site-inputs layer (owner 2026-11-18): every site input the engine reads, merged from the map and
// the grower's edits.
export * from './site-inputs.ts';
export * from './years.ts';
export * from './verdict-line.ts';
export * from './verdict-load.ts';
export * from './holes.ts';
export * from './weigh.ts';
// v14 pf commit 0W (chk #3): the change summary of a grower's edit and its words, typed stubs pf-d fills.
export * from './site-change.ts';
export * from './site-change-line.ts';
// Stage 2A North Star single source of truth report engine + Wave 6 recommendation engine + WGSRPD L3/ISO area names
export * from './area-names.ts';
export * from './report.ts';
export * from './recommend.ts';

// E6 R4 (design check A11): the suggestion and the Swap list (suggest.ts), their own chunk (role
// `suggest`, scripts/built-modules.mjs ROLE_ENTRIES), off the first run, so this barrel does not
// re-export them: this loader is the page's only way in (store.ts suggestRule); node tests import
// suggest.ts directly. Loaded once; a failed load is tried again under a fresh URL (retry-import.ts).
export interface SuggestRule { suggest: typeof import('./suggest.ts').suggest; alternatives: typeof import('./suggest.ts').alternatives }
export const loadSuggest: () => Promise<SuggestRule> = retryableImport(() => import('./suggest.ts'), ({ suggest, alternatives }): SuggestRule => ({ suggest, alternatives }));
