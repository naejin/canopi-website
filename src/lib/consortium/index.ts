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
