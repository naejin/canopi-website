// The browser-test globals the island reads (E6 design check A13; ADR-1 L0 seams), declared once.
// Each is read inline under `__CT_TEST_HOOK__` (astro.config.mjs defines it true only in
// `npm run build:browser-test`), so a production build drops every read, and check-built-site fails
// if a name reaches dist/. The harness (scripts/browser/harness.mjs) sets them before the first
// navigation; test-hook.ts (imported only by main.ts, in the test build) writes __ctFaults.
// - __ctTimeouts: shorter waits in ms (data/load.ts stall, the location tile read, Suggest's wait);
// - __ctFaults: chunk faults by part (stream K3/S3 move views/lazy.tsx and Details' sheet loader onto
//   it, replacing test-hook.ts's exported testFault).
export {};

declare global {
  var __ctTimeouts: { stall?: number; read?: number; suggest?: number } | undefined;
  var __ctFaults: { sheets?: boolean; later?: 'fail' | 'hold' | null; release?: Promise<void> | null } | undefined;
}
