/** @jsxImportSource preact */
// Stream S5c, a P5 feature chunk (views/PoolSlot.tsx loads it for a climate that borrows its plants
// or once a site location is given; never in the first run), shown in Place's form and in the "Your
// place" sheet (PP-B b1b folded the pool panel's count into Place; drift check 2026-11-15): under the
// climate cards, what the plant list holds for this site.
// - A climate with no list of its own: its plants come from the nearest lists, placed as there and
//   marked "estimate" (owner answer 1; core placement.ts NEAREST_LISTS), with P2's "Ask for this
//   climate" link kept in that paragraph.
// - With a site climate, the count line [data-pool-count], an always-present status line: how many
//   plants of the chosen climate's list (guests left out) fit or need a second look for the page's
//   period, from the verdicts (store.countFits): "{n} of the {m} plants on the nearest lists fit your
//   place today", or "on the {climate} list" for a curated climate; a later period from a link is
//   named, never "today". While the verdict chunk loads, "Checking…"; refused, "Could not check…" with
//   Try again (store.retryVerdict, in place); offline, "Needs a connection", asked again once back
//   online. Never "0 of m": nothing fits shows the state below instead. The caveat that observed
//   ranges include cultivation and are estimates, not reviewed (export meta ranges_review
//   'estimate_not_reviewed'); aridity on ice: "not checked".
// - No list at all (none with the real export): P2's "Not covered yet" notice, moved here off the first run.
// - Nothing fits (rules/suggest-block.ts nothingFits, the rule that also withholds Suggest): the
//   "nothing fits" state [data-pool-empty], with the site's temperatures and the next step (search
//   all plants).
import { useEffect } from 'preact/hooks';
import type { ClimateZone } from '../../../../lib/consortium/index.ts';
import { hasPlants, NEAREST_LISTS, siteToday, TODAY_PERIOD, yearMeanC } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { startEmpty } from '../../state/draft.ts';
import { P, T } from '../../strings.ts';
import { page } from '../kit/page.ts';
import { num, zoneName } from '../kit/names.ts';
import { nothingFits } from '../../rules/suggest-block.ts';

// The count line's words: borrowed (the nearest lists) or the climate's own list, today or a later period.
function countText(zone: ClimateZone, own: boolean, n: number, of: number): string {
  const p = store.period.value;
  const later = p !== TODAY_PERIOD;
  const vars = { total: num(of), climate: zoneName(zone), period: p.replace('-', '–') };
  return P(own ? (later ? 'place.count.ownLater' : 'place.count.own') : later ? 'place.count.borrowedLater' : 'range.pool.count', n, vars);
}

// The count line (always on the page while the panel is: Checking, the count, failed or offline).
function CountLine({ zone, own }: { zone: ClimateZone; own: boolean }) {
  const off = store.offline.value;
  const failed = store.verdictFailed.value;
  const n = store.countFits.value;
  // Offline with the chunk refused: asked again once the browser is back online (architecture 9).
  useEffect(() => {
    if (!failed || !off) return;
    const again = () => store.retryVerdict();
    addEventListener('online', again, { once: true });
    return () => removeEventListener('online', again);
  }, [failed, off]);
  const state = n ? 'count' : failed ? (off ? 'offline' : 'failed') : 'checking';
  return (
    <p class="status-line ct-pool-count" role="status" data-pool-count={state}>
      {n ? countText(zone, own, n.fits + n.look, n.of)
        : !failed ? T('place.count.checking')
        : off ? T('load.needsConnection')
        : <>{T('place.count.failed')} <button type="button" class="button button-secondary ct-small" onClick={() => store.retryVerdict()}>{T('place.count.retry')}</button></>}
    </p>
  );
}

export function PoolPanel({ zone }: { zone: ClimateZone }) {
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
  // Nothing fits: the chosen climate's list read, the range rule in, and no plant within range.
  const empty = !!temps && nothingFits(store.pool.value, loc, store.rangeRule.value);
  return (
    <div class="ct-pool" data-pool={zone.toLowerCase()}>
      {!own && (
        <p class="ct-muted" data-pool-borrowed>
          {T('estimate.borrowed', { climate: zoneName(zone), lists: NEAREST_LISTS[zone].filter((z) => curated.includes(z)).map(zoneName).join(', ') })}
          {' '}<a href={page().start.contact}>{T('start.uncovered.ask')}</a>
        </p>
      )}
      {temps && (empty ? (
        <div class="ct-notice" role="status" data-pool-empty>
          <p><strong>{T('range.empty.title')}</strong></p>
          <p>{T('range.empty.body', temps)}</p>
          <p><button type="button" class="button button-primary ct-small" onClick={startEmpty}>{T('range.empty.search')}</button></p>
        </div>
      ) : (
        <>
          <CountLine zone={zone} own={own} />
          {today?.aridityIndex === null && <p class="ct-muted ct-small-text">{T('range.pool.aridityNotChecked')}</p>}
          <p class="ct-muted ct-small-text">{T('range.pool.caveat')}</p>
        </>
      ))}
    </div>
  );
}
