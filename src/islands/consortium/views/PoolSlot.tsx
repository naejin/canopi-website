/** @jsxImportSource preact */
// Stream S5c (a thin shell on Start, under the climate cards): what Start says about the chosen
// climate's plant list. hasList(zone): the climate has plants to suggest from, its own curated list
// or a nearest list it borrows (core placement.ts NEAREST_LISTS); Start then shows the crops and the
// site questions, and the card says Ready. Without any list, the "Not covered yet" notice. The panel
// (views/pool/pool.tsx, a P5 feature chunk; decision row "Island JavaScript budget for P5") loads
// only for a climate that borrows its plants or once the site location has a climate: which lists
// are borrowed, how many plants the site's observed climate keeps, and the "nothing fits" state.
// Without one, a curated climate shows nothing here, as in P2. (siteToday here keeps the small
// range.ts in the main chunk: shared by the lazy parts only, it became its own chunk, which the
// page modulepreloads; that cost about 0.1 s at ct:matrix.)
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { hasPlants, siteToday, withinRange } from '../../../lib/consortium/index.ts';
import { location, pools } from '../store.ts';
import { zoneOf } from '../memory.ts';
import { T } from '../strings.ts';
import { lazyPart } from './lazy.tsx';
import { page, zoneLabel } from './Start.tsx';

const panel = lazyPart(() => import('./pool/pool.tsx').then((m) => m.PoolPanel), { quiet: true });

const curated = (): ClimateZone[] => page().climates.flatMap((c) => zoneOf(c) ?? []);
export const hasList = (z: ClimateZone): boolean => hasPlants(z, curated());
// Nothing fits: the site has a climate and no plant of the climate's list holds it. Start then offers
// no "Suggest plants" (it could only give an empty matrix); the panel's "Search all plants" is the step.
export const nothingFits = (z: ClimateZone): boolean => {
  const list = pools.value[z], loc = location.value;
  return !!list && list.length > 0 && withinRange(list, loc).length === 0 && !!siteToday(loc);
};

export function PoolSlot({ zone }: { zone: ClimateZone }) {
  if (hasList(zone)) return !curated().includes(zone) || siteToday(location.value) ? <panel.View zone={zone} /> : null;
  const list = curated().map(zoneLabel).join(', ');
  return (
    <div class="ct-notice" role="status">
      <p><strong>{T('start.uncovered.title', { climate: zoneLabel(zone) })}</strong></p>
      <p>{T('start.uncovered.body', { list })}</p>
      <p><a class="button button-primary ct-small" href={page().start.contact}>{T('start.uncovered.ask')}</a></p>
    </div>
  );
}
