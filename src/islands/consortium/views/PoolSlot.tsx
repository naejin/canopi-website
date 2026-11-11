/** @jsxImportSource preact */
// Stream S5c (a thin shell on Start, under the climate cards): what Start says about the chosen
// climate's plant list. hasList(zone): the climate has plants to suggest from, its own curated list
// or a nearest list it borrows (core placement.ts NEAREST_LISTS); Start then shows the crops and the
// site questions, and the card says Ready. Without any list, the panel's "Not covered yet" notice. The panel
// (views/pool/pool.tsx, a P5 feature chunk; decision row "Island JavaScript budget for P5") loads
// only for a climate that borrows its plants or once the site location has a climate: which lists
// are borrowed, how many plants the site's observed climate keeps, and the "nothing fits" state.
// Without one, a curated climate shows nothing here, as in P2. (store.ts siteClimate; the range rule
// itself loads with the panel's chunk, store.ts rangeRule.)
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { hasPlants } from '../../../lib/consortium/index.ts';
import { location, pool, rangeRule, siteClimate } from '../store.ts';
import { zoneOf } from '../memory.ts';
import { lazyPart } from './lazy.tsx';
import { page } from './Start.tsx';

const panel = lazyPart(() => import('./pool/pool.tsx').then((m) => m.PoolPanel), { quiet: true });

const curated = (): ClimateZone[] => page().climates.flatMap((c) => zoneOf(c) ?? []);
export const hasList = (z: ClimateZone): boolean => hasPlants(z, curated());
// Nothing fits (the chosen climate's list, at the site): Start then offers no "Suggest plants" (it could
// only give an empty matrix); the panel's "Search all plants" is the step.
export const nothingFits = (): boolean => !!rangeRule.value?.none(pool.value, location.value);

// The panel also says "Not covered yet" for a climate with no list at all (it never happens with the
// real export, which curates a nearest list for every climate).
export function PoolSlot({ zone }: { zone: ClimateZone }) {
  return !hasList(zone) || !curated().includes(zone) || siteClimate.value ? <panel.View zone={zone} /> : null;
}
