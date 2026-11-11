// The consortium v2 core: types, the PlantSource seam and (from stream S1) pure, framework-free
// rules: site fit, matrix fill, swaps, conflicts, jobs, share state and the .canopi writer. No DOM,
// no Astro, no import outside this folder (scripts/consortium-boundary.test.mjs), so node --test runs
// it and it can move to a canopi-consortium package unchanged.
//
// site.ts, conflicts.ts, jobs.ts, suggest.ts and state.ts here are still the v1 modules, kept for S1
// to port in place (design check §2); tsconfig.json excludes them and nothing imports them until then.
export * from './types.ts';
export * from './source.ts';
// Stream S4's file, exported now so S4 never edits this one (S1 adds the rule exports below).
export * from './canopi-file.ts';
