/** @jsxImportSource preact */
// Stream S5c, a P5 feature chunk (views/PoolSlot.tsx loads it for a climate that borrows its plants
// or once a site location is given; never in the first run): under the climate cards, what the plant
// list holds for this site.
// - A climate with no list of its own: its plants come from the nearest lists, placed as there and
//   marked "estimate" (owner answer 1; core placement.ts NEAREST_LISTS), with P2's "Ask for this
//   climate" link kept in that paragraph. No location needed.
// - With a site climate: how many plants are recorded in a climate like the site's (owner answer 2,
//   core range.ts: coldest month on both sides, warmest month on the hot side, RANGE_MARGIN_C margin), how many
//   are near the edge, that the others are left out of suggestions but can still be added with a
//   warning, and that observed ranges include cultivation and are estimates, not reviewed (export
//   meta ranges_review 'estimate_not_reviewed'). Aridity on ice: "not checked".
// - No list at all (none with the real export): P2's "Not covered yet" notice, moved here off the first run.
// - None of them: the "nothing fits" state [data-pool-empty], with the next step (search all plants).
import { useEffect } from 'preact/hooks';
import type { ClimateZone, SiteLocation, Taxon } from '../../../../lib/consortium/index.ts';
import { hasPlants, NEAREST_LISTS, RANGE_MARGIN_C, rangeFit, siteToday, withinRange } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { startEmpty, zoneOf } from '../../memory.ts';
import { P, T, pageLang } from '../../strings.ts';
import { page, zoneLabel } from '../Start.tsx';

// The range rule for the first run's store (store.ts rangeRule loads this chunk once the site has a
// climate), so the rule and its marks text stay out of the first run.
export const rangeRule = {
  withinRange,
  rangeFit,
  // Nothing fits: a list with plants, none of which holds the site.
  none: (list: Taxon[] | null, site: SiteLocation | null): boolean => !!list?.length && withinRange(list, site).length === 0,
  // A mark's numbers (°C values) in the page language, to the hundredth the rule compares: fr "5,8".
  local: (vars?: Record<string, string | number>) => {
    const num = new Intl.NumberFormat(pageLang(), { maximumFractionDigits: 2 });
    return vars && Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'number' ? num.format(v) : v]));
  },
};
export type RangeRule = typeof rangeRule;

export function PoolPanel({ zone }: { zone: ClimateZone }) {
  const list = store.pools.value[zone];
  useEffect(() => { void store.loadPool(zone); }, [zone, store.source.value]);
  const curated = page().climates.flatMap((c) => zoneOf(c) ?? []);
  const own = curated.includes(zone);
  if (!hasPlants(zone, curated)) return (
    <div class="ct-notice" role="status">
      <p><strong>{T('start.uncovered.title', { climate: zoneLabel(zone) })}</strong></p>
      <p>{T('start.uncovered.body', { list: curated.map(zoneLabel).join(', ') })}</p>
      <p><a class="button button-primary ct-small" href={page().start.contact}>{T('start.uncovered.ask')}</a></p>
    </div>
  );
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
          {P('range.pool.count', fit, { total: deg.format(verdicts.length), margin: deg.format(RANGE_MARGIN_C), ...temps })}
          {edge > 0 && <> {P('range.pool.edge', edge)}</>}
          {fit < verdicts.length && <> {T('range.pool.left')}</>}
        </p>
      ))}
      {verdicts && today?.aridityIndex === null && <p class="ct-muted ct-small-text">{T('range.pool.aridityNotChecked')}</p>}
      {verdicts && <p class="ct-muted ct-small-text">{T('range.pool.caveat')}</p>}
    </div>
  );
}
