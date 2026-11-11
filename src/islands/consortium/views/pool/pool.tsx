/** @jsxImportSource preact */
// Stream S5c, a P5 feature chunk (views/PoolSlot.tsx loads it for a climate that borrows its plants
// or once a site location is given; never in the first run): under the climate cards, what the plant
// list holds for this site.
// - A climate with no list of its own: its plants come from the nearest lists, placed as there and
//   marked "estimate" (owner answer 1; core placement.ts NEAREST_LISTS). No location needed.
// - With a site climate: how many plants are recorded in a climate like the site's (owner answer 2,
//   core range.ts: coldest month on both sides, warmest month on the hot side, 2 °C margin), how many
//   are near the edge, that the others are left out of suggestions but can still be added with a
//   warning, and that observed ranges include cultivation and are estimates, not reviewed (export
//   meta ranges_review 'estimate_not_reviewed'). Aridity on ice: "not checked".
// - None of them: the "nothing fits" state [data-pool-empty], with the next step (search all plants).
import { useEffect } from 'preact/hooks';
import type { ClimateZone } from '../../../../lib/consortium/index.ts';
import { NEAREST_LISTS, rangeFit, siteToday } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { startEmpty, zoneOf } from '../../memory.ts';
import { P, T, pageLang } from '../../strings.ts';
import { page, zoneLabel } from '../Start.tsx';

export function PoolPanel({ zone }: { zone: ClimateZone }) {
  const list = store.pools.value[zone];
  useEffect(() => { void store.loadPool(zone); }, [zone, store.source.value]);
  const curated = page().climates.flatMap((c) => zoneOf(c) ?? []);
  const own = curated.includes(zone);
  const loc = store.location.value;
  const today = siteToday(loc);
  const deg = new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 1 });
  const temps = today ? { cold: deg.format(today.tminColdC), hot: deg.format(today.tmaxWarmC) } : null;
  const verdicts = today && list ? list.map((t) => rangeFit(t, loc)) : null;
  const fit = verdicts ? verdicts.filter((v) => v !== 'outside').length : 0;
  const edge = verdicts ? verdicts.filter((v) => v === 'edge').length : 0;
  return (
    <div class="ct-pool" data-pool={zone.toLowerCase()}>
      {!own && (
        <p class="ct-muted" data-pool-borrowed>
          {T('estimate.borrowed', { climate: zoneLabel(zone), lists: NEAREST_LISTS[zone].filter((z) => curated.includes(z)).map(zoneLabel).join(', ') })}
        </p>
      )}
      {verdicts && temps && (fit === 0 ? (
        <div class="ct-notice" role="status" data-pool-empty>
          <p><strong>{T('range.empty.title')}</strong></p>
          <p>{T('range.empty.body', temps)}</p>
          <p><button type="button" class="button button-primary ct-small" onClick={startEmpty}>{T('range.empty.search')}</button></p>
        </div>
      ) : (
        <p data-pool-fit={fit}>
          {P('range.pool.count', fit, { total: deg.format(verdicts.length), ...temps })}
          {edge > 0 && <> {P('range.pool.edge', edge)}</>}
          {fit < verdicts.length && <> {T('range.pool.left')}</>}
        </p>
      ))}
      {verdicts && today?.aridityIndex === null && <p class="ct-muted ct-small-text">{T('range.pool.aridityNotChecked')}</p>}
      {verdicts && <p class="ct-muted ct-small-text">{T('range.pool.caveat')}</p>}
    </div>
  );
}
