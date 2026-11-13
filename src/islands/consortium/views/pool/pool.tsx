/** @jsxImportSource preact */
// Stream S5c, a P5 feature chunk (views/PoolSlot.tsx loads it for a climate that borrows its plants
// or once a site location is given; never in the first run): under the climate cards, what the plant
// list holds for this site.
// - A climate with no list of its own: its plants come from the nearest lists, placed as there and
//   marked "estimate" (owner answer 1; core placement.ts NEAREST_LISTS), with P2's "Ask for this
//   climate" link kept in that paragraph. No location needed.
// - With a site climate: how many plants are recorded in a climate like the site's (owner answer 2,
//   core range.ts: coldest month on both sides, the year's mean on the cool side, warmest month on the hot side, RANGE_MARGIN_C margin), how many
//   are near the edge, that the others are left out of suggestions but can still be added with a
//   warning, and that observed ranges include cultivation and are estimates, not reviewed (export
//   meta ranges_review 'estimate_not_reviewed'). Aridity on ice: "not checked".
// - No list at all (none with the real export): P2's "Not covered yet" notice, moved here off the first run.
// - None of them: the "nothing fits" state [data-pool-empty], with the next step (search all plants).
import { useEffect } from 'preact/hooks';
import type { ClimateZone } from '../../../../lib/consortium/index.ts';
import { hasPlants, NEAREST_LISTS, RANGE_MARGIN_C, rangeFit, siteToday, yearMeanC } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { startEmpty } from '../../state/draft.ts';
import { P, T } from '../../strings.ts';
import { page } from '../kit/page.ts';
import { num, zoneName } from '../kit/names.ts';
import { poolCounts } from '../../rules/suggest-block.ts';

export function PoolPanel({ zone }: { zone: ClimateZone }) {
  const list = store.pools.value[zone];
  useEffect(() => { void store.loadPool(zone); }, [zone, store.source.value]);
  const curated = store.curatedClimates.value;
  const own = curated.includes(zone);
  if (!hasPlants(zone, curated)) return (
    <div class="ct-notice" role="status">
      <p><strong>{T('start.uncovered.title', { climate: zoneName(zone) })}</strong></p>
      <p>{T('start.uncovered.body', { list: curated.map(zoneName).join(', ') })}</p>
      <p><a class="button button-primary ct-small" href={page().start.contact}>{T('start.uncovered.ask')}</a></p>
    </div>
  );
  const loc = store.location.value;
  const today = siteToday(loc);
  const temps = today ? { cold: num(today.tminColdC), hot: num(today.tmaxWarmC), mean: num(yearMeanC(today)) } : null;
  const verdicts = today && list ? list.map((t) => rangeFit(t, loc)) : null;
  const { fit, edge } = poolCounts(verdicts ?? []);
  return (
    <div class="ct-pool" data-pool={zone.toLowerCase()}>
      {!own && (
        <p class="ct-muted" data-pool-borrowed>
          {T('estimate.borrowed', { climate: zoneName(zone), lists: NEAREST_LISTS[zone].filter((z) => curated.includes(z)).map(zoneName).join(', ') })}
          {' '}<a href={page().start.contact}>{T('start.uncovered.ask')}</a>
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
          {P('range.pool.count', fit, { total: num(verdicts.length), margin: num(RANGE_MARGIN_C), ...temps })}
          {edge > 0 && <> {P('range.pool.edge', edge)}</>}
          {fit < verdicts.length && <> {T('range.pool.left')}</>}
        </p>
      ))}
      {verdicts && today?.aridityIndex === null && <p class="ct-muted ct-small-text">{T('range.pool.aridityNotChecked')}</p>}
      {verdicts && <p class="ct-muted ct-small-text">{T('range.pool.caveat')}</p>}
    </div>
  );
}
