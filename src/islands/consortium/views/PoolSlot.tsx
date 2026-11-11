/** @jsxImportSource preact */
// P5 seam (commit 0), owned by S5c (borrowed lists): what Start shows under the climate cards for the
// chosen climate's plant list. hasList(zone) says whether the climate has a list to suggest from (Start
// shows the crops and site questions then, and the card says Ready); PoolSlot renders the "Not covered
// yet" notice when it has none. Today only the curated climates have lists. S5c lets every climate
// borrow its nearest curated list (core placement.ts NEAREST_LISTS), so hasList turns true and PoolSlot
// says which list is borrowed, without editing Start.
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { zoneOf } from '../memory.ts';
import { T } from '../strings.ts';
import { page, zoneLabel } from './Start.tsx';

export const hasList = (z: ClimateZone): boolean => page().climates.includes(z.toLowerCase());

export function PoolSlot({ zone }: { zone: ClimateZone }) {
  if (hasList(zone)) return null;
  const list = page().climates.map((c) => zoneLabel(zoneOf(c))).join(', ');
  return (
    <div class="ct-notice" role="status">
      <p><strong>{T('start.uncovered.title', { climate: zoneLabel(zone) })}</strong></p>
      <p>{T('start.uncovered.body', { list })}</p>
      <p><a class="button button-primary ct-small" href={page().start.contact}>{T('start.uncovered.ask')}</a></p>
    </div>
  );
}
