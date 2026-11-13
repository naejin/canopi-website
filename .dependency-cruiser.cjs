// Layer direction and cycles of the website's code (E4; ADR-1; design check E6 §7.2, A24, A25).
// dependency-cruiser owns direction and cycles only; scripts/consortium-boundary.test.mjs owns "core,
// climate and location imports stay in their folder" and "no browser globals in core" (A27). Neither
// checks the other's rule.
//
// Run through the ratchet, never alone in a gate: `npm run check:arch` (scripts/quality/ratchet.mjs arch).
// An `error` rule fails on any violation. A `warn` rule is a known violation that E6 removes: its
// current violations are keys in scripts/quality/baselines/arch.json; a new key warns locally and fails
// in CI (A26). Chunk 5 flips L2/L5/L6/L8 and L7 to `error`; Q3 flips L1 after S2's merge.
//
// The edge set (probe P-E4a, 2026-11-13, at 972246a):
// - tsPreCompilationDeps: true. With `false`, dependency-cruiser parses the transpiled output and loses
//   `import('./Swap.tsx') as Promise<…>` (Details.tsx's four sheet loaders), so cycle C4 disappears.
// - Runtime edges = every edge except `type-only` (`import type`, `export type`, inline `type` names).
//   `type-import` (`typeof import('x')`) is kept on purpose: when a file holds both `typeof import('x')`
//   and a real `import('x')` (main.ts, location/load.ts, maplibre.ts), dependency-cruiser merges them
//   into one `type-import` edge and drops the dynamic flag. Counting it keeps the real dynamic edge.
// - Dynamic edges are kept for cycles (A24): C4 and C5 close through import().
// - `.astro` files are not parsed (dependency-cruiser has no Astro parser): L9 covers .ts/.tsx/.js/.mjs.
//   src/scripts/ (client scripts of the pages) is not the repo-root scripts/ that L9 guards.

const ISL = '^src/islands/consortium/';
const RUNTIME = ['type-only'];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'L1-lib-no-ui',
      severity: 'warn', // error after S2's merge (Q3): place-search.ts imports @preact/signals until then (A12)
      comment: 'L1: src/lib/{consortium,climate,location} import no preact, @preact/signals, src/islands or src/components (ADR-1).',
      from: { path: '^src/lib/(consortium|climate|location)/' },
      // (^|/): a package reached through a symlinked node_modules resolves outside the repo
      to: { path: ['(^|/)node_modules/(preact|@preact/signals|@preact/signals-core)/', '^src/(islands|components)/'] },
    },
    {
      name: 'L2-state-no-views',
      severity: 'warn', // error in chunk 5
      comment: 'L2: store.ts, state/**, rules/**, focus.ts and strings.ts import nothing under views/, static or dynamic (ADR-1).',
      from: { path: `${ISL}(store\\.ts$|state/|rules/|focus\\.ts$|strings\\.ts$)` },
      to: { path: `${ISL}views/` },
    },
    {
      name: 'L3-data-down',
      severity: 'error',
      comment: 'L3: data/** imports no views/, state/ or store.ts (ADR-1).',
      from: { path: `${ISL}data/` },
      to: { path: `${ISL}(views/|state/|store\\.ts$)` },
    },
    {
      name: 'L4-views-core-entry',
      severity: 'error',
      comment: 'L4: views/** reach the core only through src/lib/consortium/index.ts and types.ts (ADR-1).',
      from: { path: `${ISL}views/` },
      to: { path: '^src/lib/consortium/', pathNot: '^src/lib/consortium/(index|types)\\.ts$' },
    },
    {
      name: 'L5-kit-leaf',
      severity: 'warn', // error in chunk 5
      comment: 'L5: views/kit/** imports no other views/ module and no store.ts or state/ (strings and core allowed) (ADR-1).',
      from: { path: `${ISL}views/kit/` },
      to: { path: [`${ISL}views/`, `${ISL}(store\\.ts$|state/)`], pathNot: `${ISL}views/kit/` },
    },
    {
      name: 'L6-sheets-not-details',
      severity: 'warn', // error in chunk 5
      comment: 'L6: no module imports views/details/** except views/Sheets.tsx (ADR-1).',
      from: { pathNot: `${ISL}views/(Sheets\\.tsx$|details/)` },
      to: { path: `${ISL}views/details/` },
    },
    {
      name: 'L6-sheets-not-details',
      severity: 'warn', // error in chunk 5
      comment: 'L6: views/Sheets.tsx reaches views/details/** only through import() (ADR-1).',
      from: { path: `${ISL}views/Sheets\\.tsx$` },
      to: { path: `${ISL}views/details/`, dependencyTypesNot: ['dynamic-import', 'type-only'] },
    },
    {
      name: 'L7-no-circular',
      severity: 'warn', // known cycles C1-C5 until E6; error in chunk 5 (choice 15, A24)
      comment: 'L7: no runtime import cycle (static and dynamic edges, type-only edges dropped) in src/islands/consortium and src/lib (ADR-1, A24).',
      from: { path: '^src/(islands/consortium|lib)/' },
      to: {
        circular: true,
        dependencyTypesNot: RUNTIME,
        viaOnly: { dependencyTypesNot: RUNTIME },
      },
    },
    {
      name: 'L8-test-hook-entry-only',
      severity: 'warn', // error in chunk 5
      comment: 'L8: only main.ts imports test-hook.ts (A13; ADR-1).',
      from: { pathNot: `${ISL}(main|test-hook)\\.ts$` },
      to: { path: `${ISL}test-hook\\.ts$` },
    },
    {
      name: 'L9-no-build-scripts-in-src',
      severity: 'error',
      comment: 'L9: src/** imports nothing from the repo-root scripts/ (ADR-1).',
      from: { path: '^src/' },
      to: { path: '^scripts/' },
    },
  ],
  options: {
    // (^|/): a symlinked node_modules resolves outside the repo; never walk into it either way
    doNotFollow: { path: '(^|/)node_modules/' },
    // .d.ts stays in: npm packages resolve to their type files (preact → node_modules/preact/src/index.d.ts),
    // and L1 reads those edges.
    exclude: { path: ['\\.css$', '\\.svg$'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
    },
  },
};
