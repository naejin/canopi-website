/** @jsxImportSource preact */
// "Where is your site?" (P5 stream S5b; design check §B; owner answers 1, 4, 5): the location step's
// lazy chunk, loaded by views/location/load.ts on the reader's first click or Enter (LocationSlot) or
// for a link's `o=` or the saved location (state/restore.ts). It renders only (E6 S2): the result line
// and the map dialog. The lookups, the site, its suggestion and its country are state/location.ts,
// which this chunk brings; the shell calls them through this module's re-exports. (Its tile read,
// still without soil until P5.2: lookupSite(lat, lon, tileSource(), DEFAULT_RADIUS, { soil: false });
// scripts/consortium-p5-seams-s5e.test.mjs reads this line here until chunk 5 points it there.)
// - pick on a map: MapLibre (its own lazy chunk with its worker and CSS) in a dialog with a centre
//   cross and "Use the map centre"; OpenFreeMap positron or dark by the theme; jumpTo only.
// The line says what the site means ([data-location-state]): borderline, polar, sea, coast and a
// failed read each have their own words; the proposed card is confirmed with [data-location-confirm].
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import { koppenZone, MEANS_MARGIN_C, siteClimate, type SiteLocation } from '../../../../lib/consortium/index.ts';
import { loadMapLibreModule } from '../../../../lib/location/maplibre.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { climateShown, pendingClimate } from '../../state/persist.ts';
import { line, unread, type Line } from '../../state/suggest-wait.ts';
import { confirmProposed, forget, locate, placeName } from '../../state/location.ts';
import { num, zoneName } from '../kit/names.ts';

export { settle, useMyLocation, searchPlace } from '../../state/location.ts';

// The map dialog is open (LocationSlot's map button: openMap).
export const mapOpen = signal(false);
export function openMap(): void { mapOpen.value = true; }

// ---- words ----
const coords = (lat: number, lon: number): string => {
  return T('location.coords', { lat: num(Math.abs(lat), 2), lon: num(Math.abs(lon), 2), ns: T(lat < 0 ? 'location.dir.s' : 'location.dir.n'), ew: T(lon < 0 ? 'location.dir.w' : 'location.dir.e') });
};
// The class in plain words: its type (Af, BW, Cs, Df, ET…), then its temperature letter where it has one.
function koppenWords(k: string): string {
  const type = k[0] === 'A' || k[0] === 'E' ? k : k.slice(0, 2), temp = k[0] === 'A' || k[0] === 'E' ? '' : k.slice(2);
  const words = T(`location.k.${type}`);
  return temp ? T('location.koppen', { type: words, temp: T(`location.t.${temp}`) }) : words;
}
function placeOf(l: SiteLocation): string {
  const where = l.label ?? (l.source === 'geo' ? T('location.here') : coords(l.lat, l.lon));
  return l.source === 'link' ? `${where} (${T('location.fromLink')})` : where;
}
// A line with no site of its own (a refusal, a failure, the sea). After a failed read or a point at sea,
// the site still in use is named (seam review 2, 3: whenever a site drives the pool, marks and future,
// this panel says which).
function stateText(l: Line, loc: SiteLocation | null): string {
  if (loc?.lookup && (l.state === 'sea' || l.state === 'failed')) return T(l.state === 'sea' ? 'location.state.seaKept' : 'location.state.failedKept', { place: placeOf(loc) });
  return l.state === 'no-result' ? T('location.state.no-result', { q: l.query ?? '' }) : T(`location.state.${l.state}`);
}

// ---- views ----
export function LocationResult({ compact = false }: { compact?: boolean }) {
  const l = line.value, loc = store.location.value, sc = loc?.lookup ? siteClimate(loc.lookup) : null;
  const site = l && sc && sc.today && loc && l.state === sc.state;
  const proposed = store.proposedClimate.value;
  // As Start.tsx's cards: a proposal shows only while no climate is chosen or shown from a link.
  const shown = climateShown.value, picked = !!sc?.zone && shown.proposed && shown.zone === sc.zone;
  // A site line whose site has gone (a link without o= replaced a link's location): nothing to say.
  const gone = !!l && !loc && (l.state === 'ready' || l.state === 'borderline' || l.state === 'polar' || l.state === 'coast');
  return (
    <>
      {unread.value && <p class="ct-notice" role="status" data-location-unread>{T('location.unread')}</p>}
      {l && !gone && (
        <div class="ct-location-result" data-location-state={l.state} role="status" aria-busy={l.state === 'loading' ? 'true' : undefined}>
          {site ? (
            <>
              <p>
                {T('location.why', { place: placeOf(loc), koppen: sc.koppen, words: koppenWords(sc.koppen), tmin: num(sc.today!.tminColdC) })}
                {' '}
                {/* The class from the cell's own means, when the map's stored class gives another zone (site-climate.ts). */}
                {sc.mapKoppen && `${T('location.means', { map: sc.mapKoppen, koppen: sc.koppen })} `}
                {sc.state === 'polar' ? T('location.state.polar')
                  // Borderline (UX audit fix 2): both climates named, the class's own pre-selected.
                  // "We picked X" only while X is the card Start shows as proposed (none chosen;
                  // review round 4, 2); otherwise both named and a plain "check" (a link's or a saved
                  // location under a chosen climate, or a card chosen since).
                  : sc.state === 'borderline' ? (sc.zone && sc.near
                    ? `${T(picked ? 'location.between' : 'location.betweenCheck', { a: zoneName(sc.zone), b: zoneName(sc.near) })} ${T(sc.mapKoppen && sc.near === koppenZone(sc.mapKoppen) ? 'location.meansNear' : 'location.state.borderline', { margin: MEANS_MARGIN_C })}`
                    : `${T('location.state.borderline')}${picked ? ` ${T('location.picked', { climate: zoneName(sc.zone) })}` : ''}`)
                  : T('location.suggests', { climate: zoneName(sc.zone) })}
                {sc.state === 'coast' && ` ${T('location.state.coast')}`}
              </p>
              {/* Not over a link's or save's climate still opening (seam review round 3, 1). */}
              {!compact && proposed && !pendingClimate.value && store.climate.value !== proposed && (
                <p><button type="button" class="button button-primary ct-small" data-location-confirm onClick={() => confirmProposed(proposed)}>{T('location.confirm', { climate: zoneName(proposed) })}</button></p>
              )}
            </>
          ) : (
            <p>{stateText(l, loc)}</p>
          )}
          {!compact && !!l.others?.length && (
            <p class="ct-muted ct-small-text">{T('location.others')}{' '}
              {l.others.map((r) => <button type="button" class="link-button ct-link" onClick={() => void locate(r.lat, r.lon, 'search', placeName(r), { ...l, others: l.others?.filter((x) => x !== r) })}>{placeName(r)}</button>)}
            </p>
          )}
          {!compact && l.attribution && <p class="ct-muted ct-small-text">{l.attribution}</p>}
          {!compact && loc && l.state !== 'loading' && <p><button type="button" class="link-button ct-link" onClick={forget}>{T('location.forget')}</button></p>}
        </div>
      )}
      {!compact && mapOpen.value && <MapDialog />}
    </>
  );
}

// The map dialog: the map under a centre cross; "Use the map centre" looks that point up. The dialog
// stays open on the open sea (its line asks for a point on land) and closes once a site is found.
interface MapLike { getCenter(): { lat: number; lng: number; wrap(): { lat: number; lng: number } }; jumpTo(o: { center: [number, number]; zoom?: number }): void; remove(): void }
function MapDialog() {
  const dialog = useRef<HTMLDialogElement>(null), box = useRef<HTMLDivElement>(null), map = useRef<MapLike | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    let gone = false;
    loadMapLibreModule().then((ml) => {
      if (gone || !box.current) return;
      const loc = store.location.peek(), theme = document.documentElement.dataset.theme;
      const dark = theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches);
      const m = new ml.Map({
        container: box.current, style: `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`,
        center: loc ? [loc.lon, loc.lat] : [10, 25], zoom: loc ? 8 : 1.2, dragRotate: false, touchPitch: false,
        attributionControl: { compact: matchMedia('(max-width: 639px)').matches },
      });
      map.current = m;
      if (__CT_TEST_HOOK__) {
        const hook = (globalThis as { __ctTest?: unknown }).__ctTest;
        if (hook && typeof hook === 'object') (hook as Record<string, unknown>).mapCentre = ({ lat, lon }: { lat: number; lon: number }) => m.jumpTo({ center: [lon, lat] });
      }
    }).catch((err: unknown) => { console.error(`Consortium: the map did not load: ${(err as Error).message}`); if (!gone) setFailed(true); });
    return () => { gone = true; map.current?.remove(); map.current = null; };
  }, []);
  // Closed through the dialog itself, as Escape does, so the browser returns focus to the map button
  // (review round 1, 5); its close event then unmounts it.
  const close = () => { const d = dialog.current; if (d?.open) d.close(); else mapOpen.value = false; };
  const use = async () => {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter().wrap();
    await locate(c.lat, c.lng, 'map', undefined);
    const s = line.peek()?.state;
    if (s !== 'sea' && s !== 'failed') close();
  };
  const state = line.value?.state;
  return (
    <dialog ref={dialog} class="ct-map-dialog" data-location-map aria-labelledby="ct-map-h" onClose={() => { mapOpen.value = false; }}>
      <h2 class="ct-step-title" id="ct-map-h">{T('location.mapTitle')}</h2>
      <div class="ct-map-frame">
        <div ref={box} class="ct-map-canvas" />
        {/* The site pin at the centre (design check §B): ink cross, ochre point. */}
        <svg class="ct-map-pin" aria-hidden="true" width="40" height="40" viewBox="0 0 40 40">
          <path class="ct-map-pin-halo" d="M20 3v12M20 25v12M3 20h12M25 20h12" />
          <path class="ct-map-pin-cross" d="M20 3v12M20 25v12M3 20h12M25 20h12" />
          <circle class="ct-map-pin-dot" cx="20" cy="20" r="4" />
        </svg>
      </div>
      {failed && <p class="ct-notice" role="alert">{T('location.mapFailed')}</p>}
      {(state === 'sea' || state === 'failed') && <p class="ct-notice" role="status">{stateText(line.value!, store.location.value)}</p>}
      <p class="ct-location-row">
        <button type="button" class="button button-primary" data-location-use-centre disabled={state === 'loading'} onClick={() => void use()}>{T('location.useCentre')}</button>
        {' '}<button type="button" class="button button-secondary" data-location-close onClick={close}>{T('location.close')}</button>
      </p>
    </dialog>
  );
}
