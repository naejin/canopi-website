/** @jsxImportSource preact */
// Your place (v14 boards Place, PlaceDesk (the three questions), SiteKiambu (the frame), ClimateHand,
// Country, Arrivals, Oulu (the place banner), Toasts (Start over); pf-c; v13-spec-update.md section 5).
// - The arrival lines first, in one live region that is always on the page (PlaceNotices): welcome
//   back, a shared link over your palette (Look / Add its plants to mine / Stay with mine), a link
//   with or without a place, a guide's plant, a link that could not be read or did not load.
// - The first visit (PlaceForm): "1 Where is your place?" (LocationSlot: the field, Use my location,
//   Pick on a map, and "No location? Choose a climate"); once a place is read, "We read: <climate>",
//   used at once, with "Not this climate? Choose another" and "Your place in figures" (store.openFigure);
//   the country line; "2 How much room do you have?"; "3 What grows there already…" with "Show my
//   palette" and "No plants in mind? Start from a small suggested palette". On the laptop question 1
//   stands left, 2 and 3 right; the figures (PlaceFigures, pf-d's panel) under the questions.
// - The frame (SiteKiambu: Place again from the palette, with plants): the place row with its ways
//   out, question 2, the country line, the figures, then "Start over" and "Back to my palette".
// - The climate cards (ClimateHand), one link away: what a grower without a location loses, each
//   climate with its state and its list, Polar with "Ask for this climate".
// - On the palette step, Place is its place line (PlaceLine): "Near … · <list> · <room> · <your
//   values> · N plants · Change", the once-said "Your own values were for your old place: cleared", and
//   the place banner of a borrowed climate (Oulu).
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClimateZone, Room } from '../../../../lib/consortium/index.ts';
import { countryStatus, NEAREST_LISTS, roomValues, ROOM_LIMIT_M, siteClimate as climateOf, siteEditLines, zoneOf } from '../../../../lib/consortium/index.ts';
import { addMembers, climate, country, countFits, curatedClimates, editsCleared, knownCountries, location as siteLocation, memberTaxa, members, openFigure, openSheet, removeMember, room, siteEdits, toast, updateToast, view } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import { say } from '../../words.ts';
import { formatLength, formatTemp } from '../../format.ts';
import { LocationSlot } from '../LocationSlot.tsx';
import { PlaceFigures } from '../figures/slots.tsx';
import { PoolSlot, cardPill, hasList, suggestBlock } from '../PoolSlot.tsx';
import { climateChosen, linkPlace, memory, restoring } from '../../state/persist.ts';
import { locationAtStart, notices, savedInstead } from '../../state/restore.ts';
import { openingArrival } from '../../state/arrival.ts';
import { STORE } from '../../state/save.ts';
import { addOwnPlant, answering, backToPlace, cardsLatched, chooseClimate, chooseCountry, openSavedInstead, pickingCountry, placeSaid, showPalette, startOver, useLinkPlace, useOwnPlace } from '../../state/draft.ts';
import { pendingSuggest, requestSuggest } from '../../state/suggest-wait.ts';
import { page } from '../kit/page.ts';
import { markStart } from '../kit/start-mark.ts';
import { focusAfterAdd, focusView } from '../../focus.ts';
import { countryName, nameOf, num, zoneName } from '../kit/names.ts';
import { cardsAsked, focusField, openClimates, placeWords } from '../location/shared.ts';
import { Steps } from './steps.tsx';

const sep = <span class="ct-sep" aria-hidden="true"> · </span>;

// ---- the country line (board Country) ----
const whyOpen = signal(false);
function CountryLine() {
  const { code, source: from } = country.value;
  // The page's list until the database opens (store.knownCountries): the line is final in its first frame.
  const known = knownCountries.value;
  const status = countryStatus(code, known);
  const picking = pickingCountry.value;
  const select = useRef<HTMLSelectElement>(null);
  const [other, setOther] = useState(false);
  useEffect(() => { if (other) select.current?.focus(); }, [other]);
  const sorted = [...known.keys()].map((c) => [c, countryName(c)] as const).sort((a, b) => a[1].localeCompare(b[1], pageLang()));
  const name = code ? countryName(code) : '';
  const here = siteLocation.value?.source !== 'link' ? siteLocation.value?.lookup?.regions.isoA2 ?? null : null;
  const travel = <p class="ct-muted ct-small-text">{T('country.travel')}</p>;
  const open = () => { pickingCountry.value = true; setOther(false); };
  const pick = (c: string | null) => { setOther(false); chooseCountry(c); };
  return (
    <div class="ct-country" data-ct="country">
      {code ? (
        <p class="ct-country-text">
          {T('country.line')} <strong>{name}</strong>{sep}<span class="ct-muted">{T(from === 'guess' ? 'country.guessed' : from === 'link' ? 'country.linked' : from === 'location' ? 'country.fromLocation' : 'country.chosen')}</span>
          {from !== 'guess' && !picking && <>{sep}<button type="button" class="link-button ct-link" aria-expanded="false" onClick={open}>{T('country.change')}</button></>}
        </p>
      ) : (
        <p class="ct-country-text">{T('country.noneLine')}</p>
      )}
      {code && status === 'unchecked' && <p class="ct-muted ct-small-text ct-country-note">{T('country.unchecked', { country: name })}</p>}
      {!picking && (from === 'guess' || !code) && (
        <p class="ct-country-acts">
          {code ? <button type="button" class="button button-secondary ct-small" onClick={() => chooseCountry(code)}>{T('country.use', { country: name })}</button>
            : <button type="button" class="button button-secondary ct-small" aria-expanded="false" onClick={open}>{T('country.add')}</button>}
          {code ? <button type="button" class="button button-secondary ct-small" aria-expanded="false" onClick={open}>{T('country.change')}</button>
            : <button type="button" class="button button-secondary ct-small" aria-expanded={whyOpen.value ? 'true' : 'false'} onClick={() => { whyOpen.value = !whyOpen.value; }}>{T('country.whyAsk')}</button>}
        </p>
      )}
      {!code && whyOpen.value && !picking && <><p class="ct-small-text">{T('country.why')}</p>{travel}</>}
      {picking && (
        <div class="ct-country-pick">
          <ul class="ct-country-choices">
            {here && <li><button type="button" class="link-button ct-link" onClick={() => pick(here)}><strong>{countryName(here)}</strong> <span class="ct-muted">{T('country.fromLocation')}</span></button></li>}
            <li>
              <button type="button" class="link-button ct-link" aria-expanded={other ? 'true' : 'false'} onClick={() => setOther(true)}><strong>{T('country.another')}</strong> <span class="ct-muted">{T('country.anotherWhy')}</span></button>
              {other && (
                <p>
                  <label class="ct-sr" for="ct-country-select">{T('country.pick')}</label>
                  <select id="ct-country-select" ref={select} value={code ?? ''} onChange={(e) => pick((e.currentTarget as HTMLSelectElement).value || null)}>
                    <option value="">{T('country.pick')}</option>
                    {sorted.map(([c, n]) => <option value={c}>{n}</option>)}
                  </select>
                </p>
              )}
            </li>
            <li><button type="button" class="link-button ct-link" onClick={() => pick(null)}><strong>{T('country.none')}</strong> <span class="ct-muted">{T('country.noneWhy')}</span></button></li>
          </ul>
          <p class="ct-small-text">{T('country.why')}</p>
          {travel}
          <p><button type="button" class="link-button ct-link" onClick={() => { pickingCountry.value = false; setOther(false); }}>{T('country.cancel')}</button></p>
        </div>
      )}
    </div>
  );
}

// ---- the climate cards (board ClimateHand), one link away ----
const listsOf = (z: ClimateZone) => NEAREST_LISTS[z].filter((x) => curatedClimates.value.includes(x)).map(zoneName).join(', ');
function Climates() {
  const chosen = climateChosen.value;
  const where = siteLocation.value;
  // Open once asked for, or when a climate is already chosen (a link, a save, the shared site climate,
  // a pick) and no place could stand for it: none on the page and no kept location still being looked
  // up (state/restore.ts locationAtStart). Latched until Start over.
  const latch = !!chosen && !where && !locationAtStart.value;
  if (latch && !cardsLatched.peek()) cardsLatched.value = true;
  const open = cardsAsked.value || cardsLatched.value || latch;
  const read = !!where?.lookup;
  return (
    <fieldset class="ct-climates" id="ct-climates" hidden={!open}>
      <legend class="ct-q-title">{T('start.climate.title')}</legend>
      {!read && <p class="ct-q-lede">{T('place.climate.without')}</p>}
      <div class="ct-cards">
        {page().start.zones.map((zone) => {
          const { id, label } = zone;
          const z = zoneOf(id)!;
          const pill = cardPill(z);
          const size = (zone as { size?: number }).size ?? 0;
          const own = curatedClimates.value.includes(z);
          return (
            <label class={`ct-card${chosen === z ? ' is-chosen' : ''}`}>
              <input type="radio" name="ct-climate" value={id} checked={chosen === z} aria-labelledby={`ct-cl-${id}`} aria-describedby={`ct-cl-${id}-d`} onChange={() => chooseClimate(z)} />
              <span class="ct-card-name" id={`ct-cl-${id}`}>{label}</span>
              <span id={`ct-cl-${id}-d`} class="ct-card-desc">
                <span class={`ct-pill${pill.ready ? ' is-ready' : ''}`}>{pill.label}</span>
                <span class="ct-card-places">{T(`place.climate.desc.${id}`)}{sep}{own ? P('place.climate.ownList', size) : T('place.climate.nearest', { lists: listsOf(z) })}</span>
              </span>
            </label>
          );
        })}
        <div class="ct-card is-off" data-climate-polar>
          <span class="ct-card-name">{T('place.climate.polar')}</span>
          <span class="ct-card-desc">
            <span class="ct-pill">{T('place.climate.noList')}</span>
            <span class="ct-card-places">{T('start.climate.notYet')}. <a href={page().start.contact}>{T('start.uncovered.ask')}</a></span>
          </span>
        </div>
      </div>
      {!chosen && <p class="ct-muted ct-small-text">{T('place.climate.toGoOn')}</p>}
    </fieldset>
  );
}
// ClimateHand: asked for, latched by a choice, or a climate kept with no place read (the cards stay open).
const climatesOpen = () => cardsAsked.value || cardsLatched.value || (!!climate.value && !siteLocation.value?.lookup);
function ClimatesLink() {
  // Board Place: the ways row keeps "No location? Choose a climate"; once a climate is read its panel
  // carries "Not this climate? Choose another" (WeRead), never twice.
  if (climatesOpen()) return null;
  return <button type="button" class="link-button ct-link" data-place-climates aria-expanded="false" aria-controls="ct-climates" onClick={openClimates}>{T('place.climate.open')}</button>;
}

// ---- "We read" (board Place): the climate read from the place, used at once ----
function WeRead() {
  const loc = siteLocation.value, z = climate.value;
  if (!loc?.lookup || !z || loc.source === 'link') return null;
  const sc = climateOf(loc.lookup);
  if (!sc.zone || sc.state === 'polar' || !sc.today) return null;
  const k = sc.koppen, type = k[0] === 'A' || k[0] === 'E' ? k : k.slice(0, 2);
  const own = curatedClimates.value.includes(z);
  return (
    <div class="ct-read" data-place-read>
      <p>
        <strong>{T('place.read', { climate: zoneName(z), words: T(`location.k.${type}`) })}</strong>{' '}
        {own ? T('place.readOwn') : T('place.readBorrowed', { lists: listsOf(z) })}
        {!climatesOpen() && <>{' '}<button type="button" class="link-button ct-link" data-place-climates aria-expanded="false" aria-controls="ct-climates" onClick={openClimates}>{T('place.climate.other')}</button></>}
      </p>
      <p class="ct-small-text">
        {T('place.readUse')}{' '}
        <button type="button" class="link-button ct-link" onClick={() => openFigure('nights')}>{T('place.figures')}</button>
        {T('place.figuresWhy', { koppen: k, temp: formatTemp(sc.today.tminColdC, pageLang()) })}
      </p>
    </div>
  );
}

// ---- 2 How much room do you have? ----
function roomLimit(r: Room): string {
  const m = ROOM_LIMIT_M[r];
  if (r === 'unsure') return T('place.room.limit.unsure');
  if (!Number.isFinite(m)) return T('place.room.limit.any');
  return T(r === 'pots' ? 'place.room.limit.plants' : 'place.room.limit.trees', { len: formatLength(m, pageLang()) });
}
function RoomStep() {
  const r = room.value;
  return (
    <section class="ct-q" aria-labelledby="ct-room-h">
      <h2 class="ct-q-title" id="ct-room-h"><span class="ct-q-n" aria-hidden="true">2</span> {T('place.room.title')}</h2>
      <fieldset class="ct-room" aria-labelledby="ct-room-h">
        <div class="ct-room-row">
          {roomValues.map((v) => (
            <label class={r === v ? 'is-on' : ''}>
              <input type="radio" name="ct-site-room" value={v} checked={r === v} onChange={() => { room.value = v; }} />
              <span class="ct-room-name">{T(`site.a.room.${v}`)}</span>
              <span class="ct-room-limit">{roomLimit(v)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p class="ct-muted ct-small-text">{T('site.roomHint')}</p>
    </section>
  );
}

// ---- 3 What grows there already ----
// A chip's × leaves with its plant: the focus goes to the neighbour's ×, else "Add a plant" (pre-push
// fix 6, A); the chip carries data-plant-id, so Undo finds it again where it was (focus.ts focusPlant).
function OwnPlants() {
  const taxa = memberTaxa.value;
  const list = useRef<HTMLUListElement>(null);
  const remove = (id: string) => {
    const at = taxa.findIndex((t) => t.id === id);
    const near = taxa[at + 1] ?? taxa[at - 1];
    removeMember(id);
    focusAfterAdd(() => (near ? list.current?.querySelector<HTMLElement>(`[data-plant-id="${CSS.escape(near.id)}"] button`) ?? null : null)
      ?? document.querySelector<HTMLElement>('[data-place-add]'));
  };
  return (
    <section class="ct-q" aria-labelledby="ct-own-h" data-place-plants>
      <h2 class="ct-q-title" id="ct-own-h"><span class="ct-q-n" aria-hidden="true">3</span> {T('place.plants.title')}</h2>
      <p class="ct-muted ct-q-lede">{T('place.plants.lede')}</p>
      <p class="ct-own-acts">
        <button type="button" class="ct-place-field ct-field-button" data-place-add onClick={addOwnPlant}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>{T('place.plants.add')}</button>
        <button type="button" class="button button-secondary" onClick={() => openSheet('paste')}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20"><path d="M5.5 2.5h6l3.5 3.5v11.5h-9.5zM11.5 2.5V6H15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>{T('start.paste')}</button>
      </p>
      {taxa.length > 0 && (
        <ul ref={list} class="ct-own" aria-label={T('place.plants.title')}>
          {taxa.map((t) => (
            <li key={t.id} class="ct-own-chip" data-plant-id={t.id}>
              <span>{nameOf(t)}</span>
              <button type="button" class="ct-chip-x" aria-label={T('place.plants.remove', { name: nameOf(t) })} onClick={() => remove(t.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---- Start over (Toasts board): "Palette cleared: 8 plants. Your place is kept." with Undo ----
const welcomeGone = signal(false);
function startOverNow(): void {
  const n = members.peek().length;
  welcomeGone.value = true;
  startOver();
  const t = toast.peek();
  if (t && n) updateToast(t.id, P('place.cleared', n));
}

// ---- the arrival lines (board Arrivals) ----
// The shared link over your palette: asked (Look / Add / Stay), then looked at (Keep it as mine / Back
// to mine). The shown palette is the link's from the start, yours held (state/persist.ts holdSave).
const sharedSeen = signal<'ask' | 'looking' | 'done'>('ask');
const laterPlace = signal(false);
async function addShared(): Promise<void> {
  const theirs = members.peek().slice();
  sharedSeen.value = 'done';
  await openSavedInstead();
  addMembers(theirs);
}
// "9 November" (board Arrivals): day then month; English in its day-first form, unambiguous worldwide.
const dayMonth = (iso: string | undefined): string => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(pageLang() === 'en' ? 'en-GB' : pageLang(), { day: 'numeric', month: 'long' }) : '';
};
function savedWords(): { n: number; at: string } | null {
  try {
    const rec = JSON.parse(memory.read(STORE) ?? 'null') as { fragment?: string; at?: string } | null;
    if (!rec?.fragment) return null;
    // The link's plant tokens (lib state.ts readTokens: 6 characters, or "." and 22), members (a) and
    // plants from other lists (g, after their two-letter list code).
    const count = (v: string) => { let k = 0; for (let i = 0; i < v.length; i += v[i] === '.' ? 23 : 6) k++; return k; };
    const q = new URLSearchParams(rec.fragment);
    const n = count(q.get('a') ?? '') + q.getAll('g').reduce((sum, g) => sum + count(g.slice(2)), 0);
    return { n, at: dayMonth(rec.at) };
  } catch { return null; }
}
const near = () => { const l = siteLocation.value; return l && l.source !== 'link' ? placeWords(l, true) : null; };
function PlaceNotices() {
  const n = notices.value;
  const guideId = n.guidePlant;
  const guide = guideId ? memberTaxa.value.find((t) => t.id === guideId) : null;
  const saved = savedInstead.value;
  const theirs = linkPlace.value;
  const busy = answering.value;
  const onPalette = view.value !== 'start';
  const z = climate.value;
  const mine = near();
  const opened = openingArrival();
  const btn = (label: string, run: () => unknown, attrs: Record<string, string> = {}, primary = false) => <button type="button" class={`button ${primary ? 'button-primary' : 'button-secondary'} ct-small`} onClick={() => void run()} {...attrs}>{label}</button>;
  const savedN = saved ? savedWords() : null;
  const linkOpen = onPalette && opened.kind === 'link' && !n.unreadable && !n.failed;
  // A shared palette over yours: asked once, then looked at.
  const shared = linkOpen && saved && !guide && sharedSeen.value !== 'done' ? sharedSeen.value : null;
  const noPlace = linkOpen && !saved && !theirs && !laterPlace.value && opened.kind === 'link' && !siteLocation.value?.lookup && !locationAtStart.value;
  const checkedAgainst = linkOpen && !saved && !theirs && !!mine && !!siteLocation.value?.lookup;
  const welcome = onPalette && opened.kind === 'saved' && !welcomeGone.value && !saved && members.value.length > 0 ? savedWords() : null;
  return (
    <div class="ct-place-notices" role="status">
      {welcome && (
        <p class="ct-notice ct-notice-calm" data-place-notice="welcome">
          {T(mine ? 'place.welcome' : 'place.welcomeNoPlace', { date: (opened.kind === 'saved' && dayMonth(opened.at)) || welcome.at, count: P('start.count', members.value.length), place: mine ?? '' })}{' '}
          {btn(T('start.over'), startOverNow, { 'data-start-over': '' })}
        </p>
      )}
      {shared === 'ask' && z && (
        <div class="ct-notice" data-place-notice="shared">
          <p><strong>{T('place.shared.title')}</strong></p>
          <p>{T('place.shared.body', { count: P('start.count', members.value.length), list: T('place.line.list', { climate: zoneName(z) }), mine: `${P('start.count', savedN?.n ?? 0)}${mine ? ` ${mine}` : ''}` })}</p>
          <p class="ct-notice-acts">
            {btn(T('place.shared.look'), () => { sharedSeen.value = 'looking'; focusView(); })}
            {btn(T('place.shared.add'), addShared)}
            {btn(T('place.shared.stay'), () => { sharedSeen.value = 'done'; return openSavedInstead(); }, { 'data-back-mine': '' })}
          </p>
        </div>
      )}
      {shared === 'looking' && (
        <p class="ct-notice" data-place-notice="looking">
          {T('place.shared.looking')}{' '}
          {btn(T('place.shared.keep'), () => { sharedSeen.value = 'done'; showPalette(); })}
          {btn(T('place.backToMine'), () => { sharedSeen.value = 'done'; return openSavedInstead(); }, { 'data-back-mine': '' })}
        </p>
      )}
      {n.unreadable && (
        <p class="ct-notice" data-place-notice="unreadable">
          {T('place.unreadable')}{' '}
          {btn(T('place.newPalette'), startOverNow)}
          {saved && btn(T('place.backToMine'), () => openSavedInstead(), { 'data-back-mine': '' })}
        </p>
      )}
      {n.period && <p class="ct-notice" data-place-notice="period">{T('place.period')}</p>}
      {n.failed && <p class="ct-notice" data-place-notice="failed">{T('share.failed')} {btn(T('location.tryAgain'), () => location.reload())}</p>}
      {n.guideMissing && z && (
        <p class="ct-notice" data-place-notice="guideMissing">
          {T('start.guideMissing', { name: n.guideMissing, climate: zoneName(z) })}{' '}
          {btn(T('place.findPlant'), addOwnPlant)}
        </p>
      )}
      {guide && z && (
        <p class="ct-notice ct-notice-calm" data-place-notice="guide">
          {saved && savedN
            ? T('place.guideSaved', { name: nameOf(guide), climate: zoneName(z), count: P('start.count', savedN.n) })
            : T('place.guidePlant', { name: nameOf(guide), climate: zoneName(z) })}{' '}
          {!siteLocation.value?.lookup && btn(T('place.givePlace'), () => { backToPlace(); setTimeout(focusField, 50); })}
          {saved && btn(T('place.openSaved'), () => openSavedInstead(), { 'data-open-saved': '' })}
        </p>
      )}
      {/* Your own save, not the one shown (another tab saved, or a guide over it): back to it. */}
      {saved && !guide && !shared && sharedSeen.value !== 'looking' && !n.unreadable && (
        <p class="ct-notice ct-notice-calm" data-place-notice="saved">
          {btn(T('place.openSaved'), () => openSavedInstead(), { 'data-open-saved': '' })}
        </p>
      )}
      {noPlace && z && (
        <p class="ct-notice ct-notice-calm" data-place-notice="noPlace">
          {T('place.noPlace', { list: T('place.line.list', { climate: zoneName(z) }) })}{' '}
          {btn(T('place.givePlace'), () => { backToPlace(); setTimeout(focusField, 50); })}
          {btn(T('place.later'), () => { laterPlace.value = true; })}
        </p>
      )}
      {checkedAgainst && (
        <p class="ct-notice ct-notice-calm" data-place-notice="checkedAgainst">
          {T('place.checkedAgainst', { place: mine! })}{' '}
          {btn(T('place.changePlace'), backToPlace)}
        </p>
      )}
      {theirs && (
        <p class="ct-notice" data-place-notice="linkPlace">
          {T(Object.keys(siteEdits.value).length ? 'place.linkPlace' : 'place.linkPlaceBare', { place: siteLocation.value ? placeWords({ ...siteLocation.value, source: 'map' }, true) : T('location.linkPlace'), values: siteEditLines(siteEdits.value).map(say).join(', ') })}{' '}
          <span class="ct-notice-acts">
            <button type="button" class="button button-secondary ct-small" data-use-link-place disabled={busy} aria-busy={busy ? 'true' : undefined} onClick={() => void useLinkPlace()}>{T('place.useIt')}</button>
            <button type="button" class="button button-secondary ct-small" data-use-own-place disabled={busy} onClick={useOwnPlace}>{T('place.useMine')}</button>
          </span>
        </p>
      )}
    </div>
  );
}

// ---- the palette step's place line (boards Main, Palette, Many, Oulu) ----
const seenPalette = signal(false);
function OuluBanner({ zone }: { zone: ClimateZone }) {
  const loc = siteLocation.value, n = countFits.value;
  if (curatedClimates.value.includes(zone) || !loc?.lookup) return null;
  const sc = climateOf(loc.lookup);
  if (!sc.today) return null;
  const colder = zone === 'Continental' || zone === 'Boreal';
  return (
    <p class="ct-place-banner" data-place-banner>
      {colder ? `${T('place.banner.colder')} ` : ''}
      {T('place.banner.read', { koppen: sc.koppen, climate: zoneName(zone), how: loc.source === 'link' ? T('location.fromLink') : T('location.readFrom'), temp: formatTemp(sc.today.tminColdC, pageLang()) })}{' '}
      {n ? P('place.banner.kept', n.fits + n.look, { lists: listsOf(zone), of: num(n.of) }) : T('place.banner.lists', { lists: listsOf(zone) })}{' '}
      {T('place.banner.estimate')}
    </p>
  );
}
function PlaceLine() {
  useEffect(() => { seenPalette.value = true; }, []);
  const n = members.value.length, z = climate.value, loc = siteLocation.value, r = room.value;
  const why = z ? suggestBlock(z) : null;
  const own = z ? curatedClimates.value.includes(z) : true;
  const parts: string[] = [];
  if (loc) parts.push(placeWords(loc));
  if (z) parts.push(own ? T('place.line.list', { climate: zoneName(z) }) : T('place.line.borrowed', { climate: zoneName(z) }));
  if (r !== 'unsure') parts.push(T(`place.line.room.${r}`));
  const values = siteEditLines(siteEdits.value).map(say).join(', ');
  if (values) parts.push(values);
  parts.push(P('start.count', n));
  return (
    <div class="ct-result-head">
      <p class="ct-place-line" data-place-line>
        {parts.map((p, i) => <>{i > 0 && sep}<span>{p}</span></>)}
        {sep}<button type="button" class="link-button ct-link" onClick={backToPlace}>{T('place.change')}</button>
      </p>
      {editsCleared.value && <p class="ct-muted ct-small-text" data-edits-cleared>{T('place.editsCleared')}</p>}
      {z && <OuluBanner zone={z} />}
      {z && why && why !== 'nothingFits' && <PoolSlot zone={z} head />}
    </div>
  );
}

function Questions() {
  const z = climateChosen.value;
  const ready = !!z && hasList(z);
  const block = z ? suggestBlock(z) : null;
  return (
    <>
      <div class="ct-place-col">
        <LocationSlot><ClimatesLink /></LocationSlot>
        <WeRead />
        <CountryLine />
        <Climates />
        {z && (block || !hasList(z)) && <PoolSlot zone={z} />}
      </div>
      {ready && (
        <div class="ct-place-col">
          <RoomStep />
          <OwnPlants />
          <div class="ct-cta">
            <button type="button" class="button button-primary" data-place-show onClick={showPalette}>{T('place.show')}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
            {!block && (
              <p class="ct-place-suggest">
                {T('place.none')}{' '}
                <button type="button" class="link-button ct-link" data-place-suggest aria-busy={pendingSuggest.value || restoring.value ? 'true' : undefined} onClick={() => requestSuggest()}>{T('start.suggest')}</button>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PlaceForm() {
  // The ct:start timing mark (F1a commit 0 seam, perf1), told on every render of the form.
  markStart();
  return (
    <div class="ct-start ct-place">
      <div class="ct-place-grid"><Questions /></div>
      <PlaceFigures />
    </div>
  );
}

// The frame (board SiteKiambu): Place again from the palette, with plants.
function Frame() {
  return (
    <div class="ct-start ct-place ct-place-frame">
      <LocationSlot frame />
      <Climates />
      <RoomStep />
      <CountryLine />
      <PlaceFigures />
      <p class="ct-frame-foot">
        <button type="button" class="button button-secondary" data-start-over onClick={startOverNow}>{T('start.over')}</button>
        <button type="button" class="button button-primary" data-place-show onClick={showPalette}>{T('place.back')}</button>
      </p>
    </div>
  );
}

// The "Your place" sheet went with v13 (Change opens Place); views/Sheets.tsx still names it until its
// route goes (hand-off): it shows the frame.
export function PlaceSheet(_: { Frame?: unknown }) { return <Frame />; }

export function Place() {
  const waiting = pendingSuggest.value || restoring.value;
  const start = view.value === 'start';
  const frame = start && seenPalette.value && members.value.length > 0;
  return (
    <>
      <Steps />
      <PlaceNotices />
      {!start ? <PlaceLine /> : frame ? <Frame /> : <PlaceForm />}
      {/* Always on the page, empty when nothing loads (A25); it also says what a notice's answer did. */}
      <p class="status-line ct-place-status" role="status">{start && waiting ? T('load.plants') : placeSaid.value}</p>
    </>
  );
}
