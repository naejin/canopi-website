/** @jsxImportSource preact */
// "Where is your place?" (P5 stream S5b; v14 boards LocStates, LocMap, LocDesk, SiteKiambu's place row;
// pf-c): the location step's lazy chunk, loaded by views/location/load.ts on the reader's first click or
// Search (LocationSlot) or for a link's `o=` or the saved location (state/restore.ts). It renders only
// (E6 S2): the result under the field and the map dialog. The lookups, the site, its climate and its
// country are state/location.ts, which this chunk brings; the shell (LocationSlot) and restore.ts
// (settle) call them through this module's re-exports below, the chunk's entry: a separate import of
// state/location.ts would split it into a second lazy chunk.
// - The result ([data-location-state]), not a live region (R7: no controls in a status message): its
//   short sentence goes to the shell's status line (said()); "Looking for …", several answers to choose
//   from as rows (with the attribution and the privacy line), the place row ("Near …" with its
//   coordinates and its ways out: LocStates "One answer" on the phone, PlaceDesk's settled row on the
//   laptop, SiteKiambu's in the frame),
//   typed coordinates ("Read on this device…"), coordinates not understood, the device's states, the
//   sea, a failed read (Try again), borderline (Use <a> / Use <b>) and polar (Choose a climate by hand,
//   Ask for this climate). The climate read is used at once: the "We read" box is Place's.
// - Pick on a map: MapLibre (its own lazy chunk with its worker and CSS) in a dialog under a centre
//   cross, with zoom buttons, the point under the cross in words (updated when the map stops, never
//   live) and "Use this point"; rendered by the shell outside its status line (R7); on the laptop
//   (board LocDesk) its own search on the left, whose answers move the map, nothing located until
//   "Use this point". OpenFreeMap positron or dark by the theme; jumpTo only.
import { signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BORDERLINE_C, MEANS_MARGIN_C, koppenZone, siteClimate, type ClimateZone, type SiteLocation } from '../../../../lib/consortium/index.ts';
import { loadMapLibreModule } from '../../../../lib/location/maplibre.ts';
import type { PlaceSearchResult } from '../../../../lib/location/place-search.ts';
import * as store from '../../store.ts';
import { T, P, pageLang } from '../../strings.ts';
import { formatNumber } from '../../format.ts';
import { chooseClimate } from '../../state/draft.ts';
import { line, unread, type Line } from '../../state/lookups.ts';
import { asking, badCoords, choices, choose, devicePosition, findPlaces, forget, locate, placeName, searchRead, stop, tryAgain, typed, waited } from '../../state/location.ts';
import { readCoords } from './coords.ts';
import { coords, zoneName } from '../kit/names.ts';
import { page } from '../kit/page.ts';
import { desk, openClimates, focusField, placeWords } from './shared.ts';

export { settle, useMyLocation, stop, adoptLinkLocation as adopt } from '../../state/location.ts';
// The place field's Search: coordinates are read on this device (coords.ts); a second Search on text
// that could not be read as coordinates sends the words as a name (the name path never takes a
// coordinate reading: state/location.ts searchRead, R2).
export const searchPlace = (q: string, asName = badCoords.peek() === q.trim()): Promise<void> => searchRead(q, asName ? null : readCoords(q.trim()));
export { asking, typed } from '../../state/location.ts';

// The map dialog is open (LocationSlot's "Pick on a map", "Adjust on the map").
export const mapOpen = signal(false);
export function openMap(): void { mapOpen.value = true; }

const privacyHref = () => `${pageLang() === 'en' ? '' : `/${pageLang()}`}/privacy/`;
// A sentence with links in it: {name} placeholders become the given nodes.
function linked(text: string, parts: Record<string, ComponentChildren>): ComponentChildren[] {
  return text.split(/(\{\w+\})/).map((bit) => { const m = /^\{(\w+)\}$/.exec(bit); return m && m[1] in parts ? parts[m[1]] : bit; });
}
const btn = (label: string, run: () => unknown, attrs: Record<string, string> = {}) => <button type="button" class="button button-secondary ct-small" onClick={() => void run()} {...attrs}>{label}</button>;
const link = (label: string, run: () => unknown, attrs: Record<string, string> = {}) => <button type="button" class="link-button ct-link" onClick={() => void run()} {...attrs}>{label}</button>;
const sep = <span class="ct-sep" aria-hidden="true"> · </span>;
// Board icons (LocDesk, LocMap): the pin of a place, the lock of a privacy line, the check of "Use this point".
const pin = (size = 18) => <svg aria-hidden="true" width={size} height={size} viewBox="0 0 20 20" class="ct-ico"><path d="M10 17.5s5.5-5.2 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.1 5.5 9.3 5.5 9.3Z" /><circle cx="10" cy="8.2" r="1.9" /></svg>;
const lock = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" class="ct-ico"><rect x="4.5" y="9" width="11" height="8" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>;
const check = <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" class="ct-ico"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>;
const chevron = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" class="ct-ico"><path d="M7.5 5l5 5-5 5" /></svg>;
const privacy = (text: ComponentChildren) => <p class="ct-privacy" data-location-privacy>{lock}<span>{text}</span></p>;

// ---- the answers to choose from (the field, and the laptop's map dialog): rows (board LocDesk) ----
export function Answers({ query, results, attribution, pick }: { query: string; results: readonly PlaceSearchResult[]; attribution: string | null; pick: (r: PlaceSearchResult) => void }) {
  return (
    <div class="ct-answers" data-location-choices>
      <p class="ct-answers-head">{P('location.several', results.length, { q: query })}</p>
      <ul class="ct-answers-list">
        {results.map((r) => (
          <li class="ct-answer">
            <button type="button" class="ct-answer-row" aria-label={T('location.chooseName', { name: placeName(r) })} onClick={() => pick(r)}>
              {pin()}
              <span class="ct-answer-text"><span class="ct-answer-name">{r.label}</span>{r.detail && <span class="ct-answer-detail">{r.detail}</span>}</span>
              <span class="ct-answer-go" aria-hidden="true">{T('location.choose')}{chevron}</span>
            </button>
          </li>
        ))}
      </ul>
      <p class="ct-muted ct-small-text">{linked(T('location.noneOfThese'), { map: <button type="button" class="link-button ct-inline-link" onClick={openMap}>{T('location.mapLower')}</button>, osm: <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> })}{attribution && !/OpenStreetMap/.test(attribution) ? ` ${attribution}` : ''}</p>
      {privacy(<>{T('location.searchPrivacy')} <a href={privacyHref()}>{T('location.privacyLink')}</a></>)}
    </div>
  );
}

// ---- the place row ----
// frame: the return to Place from the palette (SiteKiambu): its ways out with the climate and Forget.
// On the laptop the settled row (PlaceDesk: Adjust on the map · Search again · Forget); on the phone
// LocStates' "One answer" (Not this place? Search again · Adjust on the map). Typed coordinates: no
// name, Adjust on the map ("Look up its name" waits for a reverse lookup in lib/location: R2, C9).
export function PlaceRow({ loc, frame = false }: { loc: SiteLocation; frame?: boolean }) {
  const sc = loc.lookup ? siteClimate(loc.lookup) : null;
  const z = store.climate.value;
  const fromTyped = typed.value && loc.source === 'map' && !loc.label;
  const named = !!loc.label || loc.source === 'geo' || loc.source === 'link';
  const how = loc.source === 'link' ? T('location.fromLink') : T('location.readFrom');
  return (
    <div class="ct-place-row ct-location-row" data-location-place>
      {pin()}
      <p class="ct-place-row-text">
        {named && <strong class="ct-place-name">{placeWords(loc)}</strong>}
        <span class="ct-place-coords">{coords(loc.lat, loc.lon)}{frame && sc && z && <>{sep}{T('location.rowClimate', { climate: zoneName(z), koppen: sc.koppen, how })}</>}</span>
        {fromTyped && <span class="ct-muted">{T('location.typed')}</span>}
      </p>
      <p class="ct-place-row-acts">
        {frame ? (
          <>{link(T('location.adjust'), openMap)}{sep}{link(T('location.searchAgain'), focusField)}{sep}{link(T('place.climate.other'), openClimates, { 'data-place-climates': '' })}{sep}{link(T('location.forget'), forget)}</>
        ) : fromTyped ? (
          <>{link(T('location.adjust'), openMap)}</>
        ) : desk.value ? (
          <>{link(T('location.adjust'), openMap)}{sep}{link(T('location.searchAgain'), focusField)}{sep}{link(T('location.forget'), forget)}</>
        ) : (
          <>{link(T('location.notThisPlace'), focusField)}{sep}{link(T('location.adjust'), openMap)}</>
        )}
      </p>
    </div>
  );
}

// A line with no site of its own (a refusal, a failure, the sea): its words and its buttons.
function stateText(l: Line, loc: SiteLocation | null): string {
  if (!!loc?.lookup && (l.state === 'sea' || l.state === 'failed')) return T(l.state === 'sea' ? 'location.state.seaKept' : 'location.state.failedKept', { place: placeWords(loc!, true) });
  if (l.state === 'no-result') return T('location.state.no-result', { q: l.query ?? '' });
  if (l.state === 'timeout') return T('location.state.timeout', { s: waited.value });
  return T(`location.state.${l.state}`);
}
function StateLine({ l, loc }: { l: Line; loc: SiteLocation | null }) {
  const kept = !!loc?.lookup && (l.state === 'sea' || l.state === 'failed');
  if (kept) return <p>{stateText(l, loc)}</p>;
  const acts: ComponentChildren[] = [];
  if (l.state === 'no-result') acts.push(btn(T('location.map'), openMap), btn(T('location.byHand'), openClimates));
  else if (l.state === 'offline' || l.state === 'failed') acts.push(btn(T('location.tryAgain'), tryAgain), btn(T('location.byHand'), openClimates));
  else if (l.state === 'timeout' || l.state === 'unavailable') acts.push(btn(T('location.tryAgain'), tryAgain), btn(T('location.map'), openMap));
  else if (l.state === 'sea') acts.push(btn(T('location.adjust'), openMap), btn(T('location.searchAgain'), focusField));
  return <><p>{stateText(l, loc)}</p>{acts.length > 0 && <p class="ct-location-acts">{acts}</p>}</>;
}

// What the site's climate adds under the row: borderline (both climates, one tap each), coast, polar.
// One sentence for "within N °C of a temperature that separates two climates" (C17): the borderline
// margin, or the margin of the area's own averages.
function borderWords(sc: ReturnType<typeof siteClimate>): string {
  const other = sc.near;
  const head = other ? T('location.between', { a: zoneName(sc.zone!), b: zoneName(other) }) : T('location.picked', { climate: zoneName(sc.zone!) });
  const margin = sc.mapKoppen && other === koppenZone(sc.mapKoppen) ? MEANS_MARGIN_C : BORDERLINE_C;
  return `${head} ${T('location.meansNear', { margin: formatNumber(margin, pageLang()) })}${sc.mapKoppen ? ` ${T('location.means', { map: sc.mapKoppen, koppen: sc.koppen })}` : ''}`;
}
function SiteNote({ loc }: { loc: SiteLocation }) {
  const sc = siteClimate(loc.lookup!);
  if (sc.state === 'polar') {
    return (
      <>
        <p>{T('location.state.polar')}</p>
        <p class="ct-location-acts">{btn(T('location.byHand'), openClimates)}<a class="button button-secondary ct-small" href={page().start.contact}>{T('start.uncovered.ask')}</a></p>
      </>
    );
  }
  if (sc.state === 'borderline' && sc.zone) {
    const other = sc.near;
    const z = store.climate.value;
    return (
      <>
        <p>{borderWords(sc)}</p>
        {other && (
          <p class="ct-location-acts">
            {[sc.zone, other].map((c: ClimateZone) => <button type="button" class={`button ct-small ${z === c ? 'button-primary' : 'button-secondary'}`} aria-pressed={z === c ? 'true' : 'false'} onClick={() => chooseClimate(c)}>{T('location.confirm', { climate: zoneName(c) })}</button>)}
          </p>
        )}
      </>
    );
  }
  if (sc.state === 'coast') return <p>{T('location.state.coast')}</p>;
  return null;
}

// The step's state, read once by both the result and its status sentence.
function current() {
  const l = line.value, loc = store.location.value, several = choices.value, bad = badCoords.value, ask = asking.value;
  // A site line whose site has gone (a link without o= replaced a link's location): nothing to say.
  const site = !!loc?.lookup && (!l || l.state === 'ready' || l.state === 'borderline' || l.state === 'polar' || l.state === 'coast');
  return { l, loc, several, bad, ask, site };
}

// The short sentence the shell's status line says (R7: words only, never the answers or the buttons).
export function said(): string {
  const { l, loc, several, bad, ask, site } = current();
  if (bad) return T('location.badCoords', { q: bad });
  if (several) return P('location.several', several.results.length, { q: several.query });
  if (l?.state === 'loading') return ask === 'geo' ? T('location.waiting') : ask === 'search' ? T('location.looking', { q: l.query ?? '' }) : T('location.state.loading');
  if (l && (!site || (loc?.lookup && (l.state === 'sea' || l.state === 'failed')))) return stateText(l, loc);
  if (site && loc) {
    const sc = siteClimate(loc.lookup!);
    const note = sc.state === 'polar' ? T('location.state.polar') : sc.state === 'borderline' && sc.zone ? borderWords(sc) : sc.state === 'coast' ? T('location.state.coast') : '';
    // Joined through the locale's own template (C11: "。" in ja and zh).
    return note ? T('palette.place.said', { place: placeWords(loc), note }) : placeWords(loc);
  }
  return '';
}

// ---- the result under the field ----
export function LocationResult({ frame = false }: { frame?: boolean }) {
  const { l, loc, several, bad, ask, site } = current();
  let body: ComponentChildren = null;
  if (bad) body = <p>{T('location.badCoords', { q: bad })}</p>;
  else if (several) body = <Answers {...several} pick={(r) => void choose(r, { query: several.query, attribution: several.attribution })} />;
  else if (l?.state === 'loading') {
    body = ask === 'geo' ? <><p>{T('location.waiting')}</p><p class="ct-location-acts">{btn(T('location.stop'), stop)}</p></>
      : ask === 'search' ? <p>{T('location.looking', { q: l.query ?? '' })}</p>
      : <p>{T('location.state.loading')}</p>;
  } else if (l && !site) body = <StateLine l={l} loc={loc} />;
  else if (l && loc?.lookup && (l.state === 'sea' || l.state === 'failed')) body = <StateLine l={l} loc={loc} />;
  return (
    <>
      {unread.value && <p class="ct-notice" data-location-unread>{T('location.unread')}</p>}
      <div class="ct-location-result ct-location-body" data-location-state={bad ? 'bad-coords' : several ? 'several' : l?.state ?? (site ? 'ready' : 'none')} aria-busy={l?.state === 'loading' ? 'true' : undefined}>
        {/* The place in use stays named above any new line about it (LocStates "Still using …"). */}
        {site && loc && l?.state !== 'loading' && <PlaceRow loc={loc} frame={frame} />}
        {body}
        {site && loc && l?.state !== 'loading' && !frame && <SiteNote loc={loc} />}
      </div>
    </>
  );
}

// ---- the map dialog (boards LocMap, LocDesk) ----
interface LngLat { lat: number; lng: number }
interface MapLike { getCenter(): LngLat & { wrap(): LngLat }; jumpTo(o: { center: [number, number]; zoom?: number }): void; zoomIn(): void; zoomOut(): void; on(e: string, f: () => void): void; remove(): void }
export function MapDialog() {
  const dialog = useRef<HTMLDialogElement>(null), box = useRef<HTMLDivElement>(null), map = useRef<MapLike | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [centre, setCentre] = useState<{ lat: number; lon: number } | null>(null);
  const [found, setFound] = useState<{ query: string; results: readonly PlaceSearchResult[]; attribution: string | null } | null>(null);
  const [said, setSaid] = useState('');
  const [finding, setFinding] = useState(false);
  const wide = useRef(desk.peek()).current;
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    let gone = false;
    setFailed(false);
    loadMapLibreModule().then((ml) => {
      if (gone || !box.current) return;
      const loc = store.location.peek(), theme = document.documentElement.dataset.theme;
      const dark = theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches);
      const m = new ml.Map({
        container: box.current, style: `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`,
        center: loc ? [loc.lon, loc.lat] : [10, 25], zoom: loc ? 9 : 1.2, dragRotate: false, touchPitch: false,
        attributionControl: { compact: !wide },
      }) as unknown as MapLike;
      map.current = m;
      // The point under the cross, once the map stops (R7: never many times a second while it moves).
      const tell = () => { const c = m.getCenter().wrap(); setCentre({ lat: c.lat, lon: c.lng }); };
      m.on('moveend', tell);
      tell();
      if (__CT_TEST_HOOK__) {
        const hook = (globalThis as { __ctTest?: unknown }).__ctTest;
        if (hook && typeof hook === 'object') (hook as Record<string, unknown>).mapCentre = ({ lat, lon }: { lat: number; lon: number }) => m.jumpTo({ center: [lon, lat] });
      }
    }).catch((err: unknown) => { console.error(`Consortium: the map did not load: ${(err as Error).message}`); if (!gone) setFailed(true); });
    // Unmounted without its close event: closed, so it never opens again by itself (fix round 1,
    // b1a2-3), first, before the map's own remove (which can throw).
    return () => {
      gone = true; mapOpen.value = false;
      // The test hook goes with its map: a map opened again installs its own (no stale jumpTo).
      if (__CT_TEST_HOOK__) { const hook = (globalThis as { __ctTest?: Record<string, unknown> }).__ctTest; if (hook) delete hook.mapCentre; }
      map.current?.remove(); map.current = null;
    };
  }, [attempt]);
  // Closed through the dialog itself, as Escape does, so the browser returns focus to the button that
  // opened it (review round 1, 5); its close event then unmounts it.
  const close = () => { const d = dialog.current; if (d?.open) d.close(); else mapOpen.value = false; };
  const use = async () => {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter().wrap();
    await locate(c.lat, c.lng, 'map', undefined);
    const s = line.peek()?.state;
    if (s !== 'sea' && s !== 'failed') close();
  };
  const go = (lat: number, lon: number) => map.current?.jumpTo({ center: [lon, lat], zoom: 10 });
  const find = async (q: string) => {
    const typedAt = readCoords(q);
    setFound(null);
    if (typedAt === 'bad') { setSaid(T('location.badCoords', { q })); return; }
    if (typedAt) { setSaid(''); go(typedAt.lat, typedAt.lon); return; }
    setSaid(T('location.looking', { q }));
    const r = await findPlaces(q);
    const results = r.results.filter((x) => x.source !== 'coordinates');
    if (r.failed) setSaid(T('location.state.offline'));
    else if (!results.length) setSaid(T('location.state.no-result', { q }));
    else if (results.length === 1) { setSaid(''); go(results[0].lat, results[0].lon); }
    else { setSaid(''); setFound({ query: q, results, attribution: r.attribution }); }
  };
  // "Centre on my location" (LocMap): busy while the device answers; a refusal, a timeout or no
  // position says so, as "Use my location" does (R17), a timeout naming the wait this read ran (R7, C6).
  const near = async () => {
    if (finding) return;
    setFinding(true);
    setSaid(T('location.waiting'));
    const { at, seconds } = await devicePosition();
    setFinding(false);
    if ('code' in at) { setSaid(at.code === 1 ? T('location.state.denied') : at.code === 3 ? T('location.state.timeout', { s: seconds }) : T('location.state.unavailable')); return; }
    setSaid('');
    go(at.lat, at.lon);
  };
  const state = line.value?.state;
  const canLocate = isSecureContext && !!navigator.geolocation;
  return (
    <dialog ref={dialog} class={`ct-map-dialog${wide ? ' is-desk' : ''}`} data-location-map aria-labelledby="ct-map-h" onClose={() => { mapOpen.value = false; }}>
      <div class="ct-map-head">
        {!wide && <button type="button" class="ct-icon-button" aria-label={T('location.mapBack')} data-location-close onClick={close}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>}
        <div class="ct-map-titles">
          <h2 class="ct-step-title" id="ct-map-h">{T(wide ? 'location.title' : 'location.mapTitle')}</h2>
          {wide && <p class="ct-muted ct-map-lede">{T('location.deskLede')}</p>}
        </div>
        {wide && <button type="button" class="ct-icon-button" aria-label={T('location.close')} onClick={close}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><path d="M5 5l10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg></button>}
      </div>
      <div class="ct-map-body">
        {wide && (
          <div class="ct-map-side">
            <form class="ct-field-row" onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim(); if (q) void find(q); }}>
              <input name="q" type="text" class="ct-place-field" enterKeyHint="search" autoComplete="off" aria-label={T('location.field')} placeholder={T('location.field')} />
              <button type="submit" class="button button-primary">{T('location.searchButton')}</button>
            </form>
            <p role="status" class="ct-map-said">{said}</p>
            {found && <Answers {...found} pick={(r) => go(r.lat, r.lon)} />}
          </div>
        )}
        <div class="ct-map-main">
          <div class="ct-map-frame">
            <div ref={box} class="ct-map-canvas" role="img" aria-label={T('location.mapTitle')} />
            {/* The site pin at the centre (design check §B): ink cross, ochre point. */}
            <svg class="ct-map-pin" aria-hidden="true" width="40" height="40" viewBox="0 0 40 40">
              <path class="ct-map-pin-halo" d="M20 3v12M20 25v12M3 20h12M25 20h12" />
              <path class="ct-map-pin-cross" d="M20 3v12M20 25v12M3 20h12M25 20h12" />
              <circle class="ct-map-pin-dot" cx="20" cy="20" r="4" />
            </svg>
            <div class="ct-map-zoom">
              <button type="button" class="ct-icon-button" aria-label={T('location.zoomIn')} onClick={() => map.current?.zoomIn()}>+</button>
              <button type="button" class="ct-icon-button" aria-label={T('location.zoomOut')} onClick={() => map.current?.zoomOut()}>−</button>
              {!wide && canLocate && <button type="button" class="ct-icon-button" aria-label={T('location.centreMe')} aria-busy={finding ? 'true' : undefined} onClick={() => void near()}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="4" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M9 1v3M9 14v3M1 9h3M14 9h3" stroke="currentColor" stroke-width="1.6" /></svg></button>}
            </div>
            {centre && <p class="ct-map-centre">{T('location.underCross', { at: coords(centre.lat, centre.lon) })}</p>}
          </div>
          {!wide && <p role="status" class="ct-map-said">{said}</p>}
          {failed && <p class="ct-notice" role="alert">{T('location.mapFailed')} {link(T('location.tryAgain'), () => setAttempt((n) => n + 1))}</p>}
          {(state === 'sea' || state === 'failed') && <p class="ct-notice" role="status">{state === 'sea' ? T('location.state.sea') : T('location.state.failed')}</p>}
          <p class="ct-small-text">{T(wide ? 'location.deskHow' : 'location.mapHow')}</p>
          {privacy(T('location.mapPrivacy'))}
        </div>
      </div>
      <p class="ct-map-foot">
        <button type="button" class="button button-secondary" onClick={close} {...(wide ? { 'data-location-close': '' } : {})}>{T('location.cancel')}</button>
        <button type="button" class="button button-primary" data-location-use-centre disabled={state === 'loading' || failed} onClick={() => void use()}>{check}{T('location.usePoint')}</button>
      </p>
    </dialog>
  );
}
