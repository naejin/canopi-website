// P5 seam (commit 0), filled by stream S5d: the future check (P5 engineering choices row): per
// period × scenario ensemble means, the latest period a plant's phases reach (phase_end ≥ 3 →
// 2041–2070; = 6 → 2071–2099), SSP2-4.5 by default, warm winters left out, "outside in 3 of 4
// scenarios". Stub: null ("not checked") for every plant.
import type { Scenario, SiteLocation, Taxon } from './types.ts';

export type FuturePeriod = '2041-2070' | '2071-2099';
export interface FutureCheck {
  period: FuturePeriod;
  verdict: 'inside' | 'edge' | 'outside';
  why: ('heat' | 'arid')[];
  agree: number; // scenarios that give this verdict
  of: number; // scenarios checked
}

export function futureCheck(_taxon: Taxon, _site: SiteLocation | null, _scenario: Scenario): FutureCheck | null {
  return null;
}
