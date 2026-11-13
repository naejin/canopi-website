// F1a seam (commit 0; design check A3, A19-A22), filled by stream 4 (bal2, chunk 2): the Balance checks,
// a registry like mark-providers.ts, one rule per check, separate checks and no score. They live in core,
// so the health strip (Palette, pal2) reads the same checks as the Balance panel (views/balance/, its
// own lazy chunk) and still works when that chunk fails (A3). Each check is for the site and its period
// (A20): today's records only, read through factAt. Until bal2 fills a rule, every check says
// 'not-checked', so nothing passes on no data.
import type { BalanceCheck, BalanceCheckId, ClimateZone, FactAt, SiteLocation, Taxon } from './types.ts';
import { balanceCheckIds } from './types.ts';

// What a rule reads: the climate, the site location (null: none given; a site check says
// 'not-checked'), the period it judges (source.ts TODAY_PERIOD) and the fact reader (source.ts factAt).
// bal2 widens it (the range rule's margin, PlantSource.layerValues rows) without changing the signature.
export interface BalanceContext {
  climate: ClimateZone | null;
  location: SiteLocation | null;
  period: string;
  factAt: FactAt;
}
export type BalanceRule = (members: readonly Taxon[], ctx: BalanceContext) => BalanceCheck;

// A check that has not run: none of the members judged.
const notChecked = (id: BalanceCheckId, members: readonly Taxon[]): BalanceCheck => ({ id, state: 'not-checked', n: 0, m: members.length, detail: {}, preset: null });

// One rule per check id; bal2 replaces each entry with its rule (and bal3 the evergreen one after D2a).
// A literal of functions, never built by a call (Object.fromEntries), so the build drops the registry
// from the island's first run until a caller reads it (check-built-site FIRST_RUN_BUDGET).
export const balanceRules: Readonly<Record<BalanceCheckId, BalanceRule>> = {
  family: (m) => notChecked('family', m),
  margin: (m) => notChecked('margin', m),
  water: (m) => notChecked('water', m),
  flowering: (m) => notChecked('flowering', m),
  food: (m) => notChecked('food', m),
  evergreen: (m) => notChecked('evergreen', m),
  roots: (m) => notChecked('roots', m),
  insects: (m) => notChecked('insects', m),
  season: (m) => notChecked('season', m),
};

// Every check of a consortium, in balanceCheckIds order.
export function balanceChecks(members: readonly Taxon[], ctx: BalanceContext): BalanceCheck[] {
  return balanceCheckIds.map((id) => balanceRules[id](members, ctx));
}
