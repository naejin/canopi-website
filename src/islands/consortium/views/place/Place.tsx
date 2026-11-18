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
import { computed, signal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClimateZone, Room } from '../../../../lib/consortium/index.ts';
import { countryStatus, NEAREST_LISTS, periodIds, roomValues, ROOM_LIMIT_M, siteClimate as climateOf, siteEditLines, zoneOf } from '../../../../lib/consortium/index.ts';
import { addMembers, climate, country, countFits, curatedClimates, editsCleared, guests, knownCountries, location as siteLocation, memberTaxa, members, offerUndo, openFigure, openSheet, pool, removeMember, room, siteEdits, snapshot, toast, updateToast, verdictContext, verdictRule, view } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import { say } from '../../words.ts';
import { formatLength, formatTemp } from '../../format.ts';
import { LocationSlot } from '../LocationSlot.tsx';
import { PlaceFigures } from '../figures/slots.tsx';
import { PoolSlot, cardPill, hasList, suggestBlock } from '../PoolSlot.tsx';
import { climateChosen, holdSave, linkPlace, memory, restoring } from '../../state/persist.ts';
import { locationAtStart, notices, savedInstead } from '../../state/restore.ts';
import { openingArrival } from '../../state/arrival.ts';
import { STORE } from '../../state/save.ts';
import { addOwnPlant, answering, backToPlace, chooseClimate, chooseCountry, openSavedInstead, pickingCountry, placeSaid, showPalette, startOver, useLinkPlace, useOwnPlace } from '../../state/draft.ts';
import { pendingSuggest, requestSuggest } from '../../state/suggest-wait.ts';
import { page } from '../kit/page.ts';
import { markStart } from '../kit/start-mark.ts';
import { focusAfterAdd, focusView } from '../../focus.ts';
import { countryName, nameOf, num, zoneName } from '../kit/names.ts';
import { cardsAsked, closeClimates, desk, focusField, openClimates, placeWords, shortPlace } from '../location/shared.ts';
import { koppenWordsKey } from '../location/koppen-words.ts';
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
  // Board Country: the invasive icon (a shield) leads the line.
  const mark = <svg aria-hidden="true" class="ct-country-icon" width="16" height="16" viewBox="0 0 20 20"><path d="M10 2.5 16 5v4.5c0 4-2.6 6.7-6 8-3.4-1.3-6-4-6-8V5Z" /><path d="M10 6.5v4M10 13v.1" /></svg>;
  const open = () => { pickingCountry.value = true; setOther(false); };
  const pick = (c: string | null) => { setOther(false); chooseCountry(c); };
  return (
    <div class="ct-country" data-ct="country">
      {code ? (
        <p class="ct-country-text">
          {mark}{T('country.line')} <strong>{name}</strong>{sep}<span class="ct-muted">{T(from === 'guess' ? 'country.guessed' : from === 'link' ? 'country.linked' : from === 'location' ? 'country.fromLocation' : 'country.chosen')}</span>
          {from !== 'guess' && !picking && <>{sep}<button type="button" class="link-button ct-link" aria-expanded="false" onClick={open}>{T('country.change')}</button></>}
        </p>
      ) : (
        <p class="ct-country-text">{mark}{T('country.noneLine')}</p>
      )}
      {code && status === 'unchecked' && <p class="ct-muted ct-small-text ct-country-note">{T('country.unchecked', { country: name })}</p>}
      {!picking && (from === 'guess' || !code) && (
        <p class="ct-country-acts">
          {code ? <button type="button" class="button button-primary ct-small" onClick={() => chooseCountry(code)}>{T('country.use', { country: name })}</button>
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

// ---- the climate cards (board ClimateHand): their own screen, one link away (BC5, BC15) ----
// "‹ Your place", "Choose a climate", what a grower without a location loses, the country guess, then one
// row per climate in the board's order, each with its chip at the right (Ready; Needs your location on
// the warning tokens; No list yet) and its line; the bar "Choose a ready climate, or give a location,
// to go on." at the bottom. A choice closes it (closeClimates); so does "‹ Your place".
const ORDER: ClimateZone[] = ['Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal'];
const listsOf = (z: ClimateZone) => NEAREST_LISTS[z].filter((x) => curatedClimates.value.includes(x)).map(zoneName).join(', ');
const CHIP = {
  ready: 'M4.5 10.5l3.5 3.5 7.5-8',
  site: 'M10 3v4M10 13v4M3 10h4M13 10h4M10 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  none: 'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM10 6.5V10l2.5 1.5',
};
const chip = (kind: keyof typeof CHIP, label: string) => (
  <span class={`ct-chip${kind === 'site' ? ' is-warning' : ''}`} data-chip><svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20"><path d={CHIP[kind]} /></svg>{label}</span>
);
// Mounted with Place and hidden until asked, so the questions keep their state behind it and the
// radios are always in the page (the location step's tests read them).
function ClimateHand({ open }: { open: boolean }) {
  const chosen = climateChosen.value;
  const read = !!siteLocation.value?.lookup;
  const zones = [...page().start.zones].sort((x, y) => ORDER.indexOf(zoneOf(x.id)!) - ORDER.indexOf(zoneOf(y.id)!));
  // A tap or a click on a row chooses and closes (board ClimateHand). From the keyboard the arrows move
  // through the climates and choose, as a radio group does, and Enter closes (a click the keyboard made
  // has detail 0); Escape or "‹ Your place" closes too.
  // The pointer's choice is made here, before the close re-renders the group (a re-render between
  // the click and its change event would undo the check).
  const closeOnPointer = (z: ClimateZone) => (e: MouseEvent) => { if (e.detail > 0) { chooseClimate(z); closeClimates(); } };
  const closeOnKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); closeClimates(); } };
  return (
    <div class="ct-hand" data-place-hand hidden={!open} onKeyDown={(e) => { if (e.key === 'Escape') closeClimates(); }}>
      <button type="button" class="link-button ct-link ct-hand-back" onClick={closeClimates}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>{T('palette.stepPlace')}</button>
      <h2 class="ct-hand-title" id="ct-hand-h">{T('start.climate.title')}</h2>
      {!read && <p class="ct-q-lede">{T('place.climate.without')}</p>}
      {open && country.value.source === 'guess' && <CountryLine />}
      <fieldset class="ct-climates" id="ct-climates" aria-labelledby="ct-hand-h">
        {zones.map((zone) => {
          const { id, label } = zone;
          const z = zoneOf(id)!;
          const pill = cardPill(z);
          const size = (zone as { size?: number }).size ?? 0;
          const own = curatedClimates.value.includes(z);
          return (
            <label class={`ct-card ct-hand-row${chosen === z ? ' is-chosen' : ''}`}>
              <input type="radio" name="ct-climate" value={id} checked={chosen === z} aria-labelledby={`ct-cl-${id}`} aria-describedby={`ct-cl-${id}-d`} onChange={() => chooseClimate(z)} onClick={closeOnPointer(z)} onKeyDown={closeOnKey} />
              <span class="ct-hand-head"><span class="ct-hand-name" id={`ct-cl-${id}`} data-name>{label}</span>{chip(pill.ready ? 'ready' : pill.site ? 'site' : 'none', pill.label)}</span>
              <span id={`ct-cl-${id}-d`} class="ct-hand-desc">{T(`place.climate.desc.${id}`)}{sep}{own ? P('place.climate.ownList', size) : T('place.climate.nearest', { lists: listsOf(z) })}</span>
            </label>
          );
        })}
        <div class="ct-card ct-hand-row is-off" data-climate-polar>
          <span class="ct-hand-head"><span class="ct-hand-name" data-name>{T('place.climate.polar')}</span>{chip('none', T('place.climate.noList'))}</span>
          <span class="ct-hand-desc">{T('start.climate.notYet')}. <a href={page().start.contact}>{T('start.uncovered.ask')}</a></span>
        </div>
      </fieldset>
      {!chosen && open && <div class="ct-hand-bar"><p>{T('place.climate.toGoOn')}</p></div>}
    </div>
  );
}
// "No location? Choose a climate" under the field: only while there is neither a place read nor a
// climate (once one is, its own line carries "Not this climate? Choose another"; never twice, BC7).
const askLink = () => !siteLocation.value?.lookup && !climate.value;
function ClimatesLink() {
  return <button type="button" class="link-button ct-link" data-place-climates aria-expanded="false" onClick={openClimates}>{T('place.climate.open')}</button>;
}
// A climate kept with no place read (a link, a save, the shared site climate, a pick): its list, with
// the way to another (BC15: Place opens on it, never the cards).
function KeptClimate() {
  const z = climate.value;
  if (!z || siteLocation.value?.lookup) return null;
  const own = curatedClimates.value.includes(z);
  return (
    <p class="ct-kept" data-place-kept>
      <span>{own ? T('place.line.list', { climate: zoneName(z) }) : T('place.line.borrowed', { climate: zoneName(z) })}</span>{sep}
      <button type="button" class="link-button ct-link" data-place-climates aria-expanded="false" onClick={openClimates}>{T('place.climate.other')}</button>
    </p>
  );
}

// ---- "We read" (board Place): the climate read from the place, used at once ----
function WeRead() {
  const loc = siteLocation.value, z = climate.value;
  if (!loc?.lookup || !z || loc.source === 'link') return null;
  const sc = climateOf(loc.lookup);
  if (!sc.zone || sc.state === 'polar' || !sc.today) return null;
  const k = sc.koppen, type = koppenWordsKey(k);
  const own = curatedClimates.value.includes(z);
  const words = T(`location.k.${type}`), temp = formatTemp(sc.today.tminColdC, pageLang());
  const other = <button type="button" class="link-button ct-link" data-place-climates aria-expanded="false" onClick={openClimates}>{T('place.climate.other')}</button>;
  const figures = <button type="button" class="link-button ct-link" onClick={() => openFigure('nights')}>{T('place.figures')}</button>;
  // PlaceDesk (BC8): the card says the class and the nights itself; "We use…" and the figures link below it.
  if (desk.value) {
    return (
      <div class="ct-read-wrap" data-place-read>
        <div class="ct-read">
          {icon('check')}
          <p><strong>{T('place.readDesk', { climate: zoneName(z) })}</strong>{' '}{T('place.readDeskKoppen', { koppen: k, words, temp })}{' '}{own ? T('place.readOwn') : T('place.readBorrowed', { lists: listsOf(z) })}{' '}{other}</p>
        </div>
        <p class="ct-small-text ct-read-use">{T('place.readUse')}{' '}{figures}</p>
      </div>
    );
  }
  return (
    <div class="ct-read-wrap" data-place-read>
      <div class="ct-read">
        {icon('check')}
        <p><strong>{T('place.read', { climate: zoneName(z), words })}</strong>{' '}{own ? T('place.readOwn') : T('place.readBorrowed', { lists: listsOf(z) })}{' '}{other}</p>
      </div>
      <p class="ct-small-text ct-read-use">{T('place.readUse')}{' '}{figures}{T('place.figuresWhy', { koppen: k, temp })}</p>
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
        {desk.value && <button type="button" class="button button-secondary" onClick={() => openSheet('paste')}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20"><path d="M5.5 2.5h6l3.5 3.5v11.5h-9.5zM11.5 2.5V6H15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /></svg>{T('start.paste')}</button>}
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
// Each notice as Arrivals draws it (BC3, BC4): an icon, a bold lead (the translation marks it **…**),
// the sentence, then its actions on their own row, ranked: the answer the board expects filled, the
// others outlined, a way back as a link. Tone: neutral, warning (amber: a place or a plant missing, a
// period not known) or danger (brick: a link that cannot be read or did not load); never colour alone,
// the icon and the words say it too.
type Tone = 'neutral' | 'warning' | 'danger';
const ICONS: Record<string, string> = {
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  share: 'M14 6.5a2 2 0 1 0 0-.1M6 10a2 2 0 1 0 0-.1M14 13.5a2 2 0 1 0 0-.1M7.8 9l4.4-2M7.8 11l4.4 2',
  pin: 'M10 17.5s5.5-5.2 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.1 5.5 9.3 5.5 9.3ZM10 6.3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z',
  leaf: 'M4 16c0-7 4-11 12-12 0 8-4 12-11 12M4 16l6-6',
  alert: 'M10 3.5 17.5 16.5h-15ZM10 8.5v3.5M10 14.2v.1',
  clock: 'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM10 6.5V10l2.5 1.5',
};
const icon = (name: keyof typeof ICONS) => <svg aria-hidden="true" class="ct-arrival-icon" width="18" height="18" viewBox="0 0 20 20"><path d={ICONS[name]} /></svg>;
// "**Lead.** The rest": the lead in bold.
const bold = (text: string) => text.split(/\*\*/).map((bit, i) => (i % 2 ? <strong>{bit}</strong> : bit));
type Rank = 'primary' | 'secondary' | 'quiet';
const act = (label: string, run: () => unknown, rank: Rank, attrs: Record<string, unknown> = {}) => (
  <button type="button" class={rank === 'quiet' ? 'link-button ct-link' : `button ${rank === 'primary' ? 'button-primary' : 'button-secondary'} ct-small`} onClick={() => void run()} {...attrs}>{label}</button>
);
function Notice({ id, tone = 'neutral', mark, text, children }: { id: string; tone?: Tone; mark: keyof typeof ICONS; text: string; children?: ComponentChildren }) {
  return (
    <div class={`ct-arrival is-${tone}`} data-place-notice={id}>
      <p class="ct-arrival-text">{icon(mark)}<span>{bold(text)}</span></p>
      {children && <p class="ct-arrival-acts">{children}</p>}
    </div>
  );
}

// The shared link over your palette: asked (Look / Add / Stay), then looked at (Keep it as mine / Back
// to mine). The shown palette is the link's from the start, yours held (state/persist.ts holdSave).
const sharedSeen = signal<'ask' | 'looking' | 'done'>('ask');
const laterPlace = signal(false);
// "Add its plants to mine" (R4, C11): each of its plants joins with the list it came from (the link's
// climate, or its own guest list), and the reader's place and own values stay (a link without a place
// brings none, so the values set while looking are the reader's).
async function addShared(): Promise<void> {
  const theirs = members.peek().slice(), homes = { ...guests.peek() }, linkZone = climate.peek();
  const edits = linkPlace.peek() ? null : siteEdits.peek();
  sharedSeen.value = 'done';
  await openSavedInstead();
  const mine = climate.peek();
  const from: Partial<Record<string, ClimateZone>> = {};
  for (const id of theirs) { const z = homes[id] ?? linkZone; if (z && z !== mine) from[id] = z; }
  if (edits) siteEdits.value = edits;
  addMembers(theirs, from);
}
// "Keep it as mine" (R3): the shared palette becomes the save now, with Undo putting the earlier save back.
function keepShared(): void {
  sharedSeen.value = 'done';
  const before = snapshot();
  holdSave(false);
  offerUndo(T('place.keptMine'), before);
  showPalette();
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
    const q = new URLSearchParams(rec.fragment);
    return { n: countTokens(q), at: dayMonth(rec.at) };
  } catch { return null; }
}
// The plants a saved address names (R8, C5): its member tokens (lib state.ts readTokens: 6 characters,
// or "." and 22) in `a`; guests travel in `a` too, `g` only names their lists.
function countTokens(q: URLSearchParams): number {
  const v = q.get('a') ?? '';
  let k = 0;
  for (let i = 0; i < v.length; i += v[i] === '.' ? 23 : 6) k++;
  return k;
}
// The welcome line is said once (R9): it goes at the first change to the palette.
const welcomeAt = signal<readonly string[] | null>(null);
// "near Kiambu" (board Arrivals): the place's short name in a sentence; none for a link's place.
const near = () => shortPlace(siteLocation.value);
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
  const savedN = saved ? savedWords() : null;
  const savedCount = savedN ? `${P('start.count', savedN.n)}${mine ? ` ${mine}` : ''}` : '';
  const linkOpen = onPalette && opened.kind === 'link' && !n.unreadable && !n.failed;
  const shared = linkOpen && saved && !guide && sharedSeen.value !== 'done' ? sharedSeen.value : null;
  const ownLookup = !!siteLocation.value?.lookup && siteLocation.value?.source !== 'link';
  const noPlace = linkOpen && !saved && !theirs && !laterPlace.value && !siteLocation.value?.lookup && !locationAtStart.value;
  const checkedAgainst = linkOpen && !saved && !theirs && !!mine && ownLookup;
  const list = members.value;
  const candidate = onPalette && opened.kind === 'saved' && !welcomeGone.value && !saved && list.length > 0 ? savedWords() : null;
  useEffect(() => {
    if (candidate && !welcomeAt.peek()) welcomeAt.value = members.peek();
    else if (welcomeAt.peek() && welcomeAt.peek() !== members.peek()) welcomeGone.value = true;
  });
  const welcome = candidate && (!welcomeAt.value || welcomeAt.value === list) ? candidate : null;
  const givePlace = () => { backToPlace(); setTimeout(focusField, 50); };
  const values = siteEditLines(siteEdits.value).map(say).join(', ');
  return (
    <div class="ct-place-notices" role="status">
      {welcome && (
        <Notice id="welcome" mark="check" text={T(mine ? 'place.welcome' : 'place.welcomeNoPlace', { date: (opened.kind === 'saved' && dayMonth(opened.at)) || welcome.at, count: P('start.count', list.length), place: mine ?? '' })}>
          {act(T('start.over'), startOverNow, 'quiet', { 'data-start-over': '' })}
        </Notice>
      )}
      {shared === 'ask' && z && (
        <section class="ct-arrival ct-arrival-card is-neutral" data-place-notice="shared" aria-labelledby="ct-shared-h">
          <h3 class="ct-arrival-title" id="ct-shared-h">{icon('share')}{T('place.shared.title')}</h3>
          <p>{T('place.shared.body', { count: P('start.count', list.length), list: T('place.line.list', { climate: zoneName(z) }), mine: savedCount })}</p>
          <p class="ct-arrival-acts ct-arrival-stack">
            {act(T('place.shared.look'), () => { sharedSeen.value = 'looking'; focusView(); }, 'primary')}
            {act(T('place.shared.add'), addShared, 'secondary')}
            {act(T('place.shared.stay'), () => { sharedSeen.value = 'done'; return openSavedInstead(); }, 'quiet', { 'data-back-mine': '' })}
          </p>
        </section>
      )}
      {shared === 'looking' && (
        <Notice id="looking" mark="share" text={T('place.shared.looking')}>
          {act(T('place.shared.keep'), keepShared, 'secondary')}
          {act(T('place.backToMine'), () => { sharedSeen.value = 'done'; return openSavedInstead(); }, 'quiet', { 'data-back-mine': '' })}
        </Notice>
      )}
      {n.unreadable && (
        <Notice id="unreadable" tone="danger" mark="alert" text={T('place.unreadable')}>
          {act(T('place.newPalette'), startOverNow, 'secondary')}
          {saved && act(T('place.backToMine'), () => openSavedInstead(), 'quiet', { 'data-back-mine': '' })}
        </Notice>
      )}
      {n.period && <Notice id="period" tone="warning" mark="clock" text={T('place.period')} />}
      {n.failed && (
        <Notice id="failed" tone="danger" mark="alert" text={T('share.failed')}>
          {act(T('location.tryAgain'), () => location.reload(), 'secondary')}
        </Notice>
      )}
      {n.guideMissing && z && (
        <Notice id="guideMissing" tone="warning" mark="leaf" text={T('start.guideMissing', { name: n.guideMissing, climate: zoneName(z) })}>
          {act(T('place.findPlant'), addOwnPlant, 'secondary')}
        </Notice>
      )}
      {guide && z && (
        <Notice id="guide" mark="leaf" text={saved && savedN ? T('place.guideSaved', { name: nameOf(guide), climate: zoneName(z), count: savedCount }) : T('place.guidePlant', { name: nameOf(guide), climate: zoneName(z) })}>
          {!siteLocation.value?.lookup && act(T('place.givePlace'), givePlace, 'primary')}
          {saved && act(T('place.openSaved'), () => openSavedInstead(), 'quiet', { 'data-open-saved': '' })}
        </Notice>
      )}
      {/* Your own save, not the one shown (another tab saved, or a guide over it): back to it. */}
      {saved && !guide && !shared && sharedSeen.value !== 'looking' && !n.unreadable && (
        <p class="ct-arrival-acts" data-place-notice="saved">{act(T('place.openSaved'), () => openSavedInstead(), 'quiet', { 'data-open-saved': '' })}</p>
      )}
      {noPlace && z && (
        <Notice id="noPlace" tone="warning" mark="pin" text={T('place.noPlace', { list: T('place.line.list', { climate: zoneName(z) }) })}>
          {act(T('place.givePlace'), givePlace, 'primary')}
          {act(T('place.later'), () => { laterPlace.value = true; }, 'quiet')}
        </Notice>
      )}
      {checkedAgainst && (
        <Notice id="checkedAgainst" mark="pin" text={T(values ? 'place.checkedAgainst' : 'place.checkedAgainstBare', { place: placeWords(siteLocation.value!, true) })}>
          {act(T('place.changePlace'), backToPlace, 'quiet')}
        </Notice>
      )}
      {theirs && (
        <Notice id="linkPlace" mark="pin" text={T(values ? 'place.linkPlace' : 'place.linkPlaceBare', { place: siteLocation.value ? placeWords({ ...siteLocation.value, source: 'map' }, true) : T('location.linkPlace'), values })}>
          {act(T('place.useIt'), () => useLinkPlace(), 'primary', { 'data-use-link-place': '', disabled: busy, 'aria-busy': busy ? 'true' : undefined })}
          {act(T('place.useMine'), useOwnPlace, 'secondary', { 'data-use-own-place': '', disabled: busy })}
        </Notice>
      )}
    </div>
  );
}

// ---- the palette step's place line (boards Main, Palette, Many, Oulu) ----
const seenPalette = signal(false);
// The plants of the borrowed list kept for the next period (C7, BC10): the same rule and site as the
// page's count, judged for 2041–2070; null until the rule and the list are here.
const laterKept = computed<number | null>(() => {
  const rule = verdictRule.value, p = pool.value;
  if (!rule || !p) return null;
  const v = rule.verdicts(p, { ...verdictContext.value, period: periodIds[1] });
  let k = 0;
  for (const t of p) { const x = v.get(t.id)?.level; if (x === 'fits' || x === 'look') k++; }
  return k;
});
// Board Oulu: on the neutral card with a wave icon; "Colder than any list we have made." and "Each is an
// estimate." in bold. "Colder" stays the zone rule (Continental, Boreal: the climates with no list of
// their own colder than every list), as the board's case.
function OuluBanner({ zone }: { zone: ClimateZone }) {
  const loc = siteLocation.value, n = countFits.value, later = laterKept.value;
  if (curatedClimates.value.includes(zone) || !loc?.lookup) return null;
  const sc = climateOf(loc.lookup);
  if (!sc.today) return null;
  const colder = zone === 'Continental' || zone === 'Boreal';
  const lists = listsOf(zone);
  const kept = n ? (later !== null
    ? P('place.banner.keptLater', n.fits + n.look, { lists, of: num(n.of), later: num(later), period: periodIds[1].replace('-', '–') })
    : P('place.banner.kept', n.fits + n.look, { lists, of: num(n.of) })) : T('place.banner.lists', { lists });
  return (
    <p class="ct-place-banner is-neutral" data-place-banner>
      <svg aria-hidden="true" class="ct-ico" width="18" height="18" viewBox="0 0 20 20"><path d="M2.5 8c2.5-2 5-2 7.5 0s5 2 7.5 0M2.5 13c2.5-2 5-2 7.5 0s5 2 7.5 0" /></svg>{' '}
      {colder && <><strong>{T('place.banner.colder')}</strong>{' '}</>}
      {T('place.banner.read', { koppen: sc.koppen, climate: zoneName(zone), how: loc.source === 'link' ? T('location.fromLink') : T('location.readFrom'), temp: formatTemp(sc.today.tminColdC, pageLang()) })}{' '}
      {kept}{' '}
      <strong>{T('place.banner.estimate')}</strong>
    </p>
  );
}
function PlaceLine() {
  useEffect(() => { seenPalette.value = true; }, []);
  const n = members.value.length, z = climate.value, loc = siteLocation.value, r = room.value;
  const why = z ? suggestBlock(z) : null;
  const own = z ? curatedClimates.value.includes(z) : true;
  const parts: string[] = [];
  if (z) parts.push(own ? T('place.line.list', { climate: zoneName(z) }) : T('place.line.borrowed', { climate: zoneName(z) }));
  if (r !== 'unsure') parts.push(T(`place.line.room.${r}`));
  const values = siteEditLines(siteEdits.value).map(say).join(', ');
  if (values) parts.push(values);
  parts.push(P('start.count', n));
  return (
    <div class="ct-result-head">
      <p class="ct-place-line" data-place-line>
        {/* Board Oulu, Main: the pin and the place in bold lead the line (BC11). */}
        {loc && <><svg aria-hidden="true" class="ct-ico" width="16" height="16" viewBox="0 0 20 20"><path d="M10 17.5s5.5-5.2 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.1 5.5 9.3 5.5 9.3Z" /><circle cx="10" cy="8.2" r="1.9" /></svg><strong>{placeWords(loc)}</strong>{parts.length > 0 && sep}</>}
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
  const wide = desk.value;
  // The country line (BC13): after question 2 on the phone (Place), full width at the end on the laptop
  // (PlaceDesk, rendered by PlaceForm); guessed, it stands in ClimateHand above the climates.
  return (
    <>
      <div class="ct-place-col">
        <LocationSlot>{askLink() ? <ClimatesLink /> : null}</LocationSlot>
        <WeRead />
        <KeptClimate />
        {!ready && !wide && <CountryLine />}
        {z && (block || !hasList(z)) && <PoolSlot zone={z} />}
      </div>
      {ready && (
        <div class="ct-place-col">
          <RoomStep />
          {!wide && <CountryLine />}
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
      <div class="ct-place-main" hidden={cardsAsked.value}>
        <div class="ct-place-grid"><Questions /></div>
        {desk.value && <CountryLine />}
        <PlaceFigures />
      </div>
      {/* After the questions, so the view's first heading (focus.ts) is question 1 while it is hidden. */}
      <ClimateHand open={cardsAsked.value} />
    </div>
  );
}

// The frame (board SiteKiambu): Place again from the palette, with plants.
function Frame() {
  return (
    <div class="ct-start ct-place ct-place-frame">
      <div class="ct-place-main" hidden={cardsAsked.value}>
        <LocationSlot frame />
        <KeptClimate />
        <RoomStep />
        <CountryLine />
        <PlaceFigures />
        <p class="ct-frame-foot">
          <button type="button" class="link-button ct-link ct-frame-over" data-start-over onClick={startOverNow}>{T('start.over')}</button>
          <button type="button" class="button button-primary" data-place-show onClick={showPalette}>{T('place.back')}</button>
        </p>
      </div>
      <ClimateHand open={cardsAsked.value} />
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
