/** @jsxImportSource preact */
// Your place (v14 boards Place, PlaceDesk (the three questions), SiteKiambu (the frame), ClimateHand,
// Country, Arrivals, Oulu (the place banner), Toasts (Start over); pf-c; v13-spec-update.md section 5).
// - The arrival lines first (PlaceNotices, one list), each sentence said once when its notice appears
//   (Announcer), the notices and their buttons outside the status line (R8): welcome
//   back, a shared link over your palette (Look / Add its plants to mine / Stay with mine), a link
//   with or without a place, a guide's plant, a link that could not be read or did not load.
// - The first visit (PlaceForm): "1 Where is your place?" (LocationSlot: the field, Use my location,
//   Pick on a map, and "No location? Choose a climate"); once a place is read, "We read: <climate>",
//   used at once, with "Not this climate? Choose another" and "Your place in figures" (store.openFigure);
//   the country line; "2 How much room do you have?"; "3 What grows there already…" with "Show my
//   palette" and "No plants in mind? Start from a small suggested palette". On the laptop question 1
//   stands left, 2 and 3 right; the figures (PlaceFigures, pf-d's panel) under the questions, then on
//   the laptop the country line (board PlaceDesk).
// - The frame (SiteKiambu: Place again from the palette, with plants): the place row with its ways
//   out, question 2, the country line, the figures, then "Start over" and "Back to my palette".
// - The climate cards (ClimateHand), one link away: what a grower without a location loses, each
//   climate with its state and its list, Polar with "Ask for this climate".
// - On the palette step, Place is its place line (PlaceLine): "Near … · <list> · <room> · <your
//   values> · N plants · Change" (past 40 plants under 960 px "200 plants: Your plants", a link to the
//   list: plants/head-link.tsx PlantsCount), the once-said "Your own values were for your old place: cleared", and
//   the place banner of a borrowed climate (Oulu).
import { signal } from '@preact/signals';
import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { ClimateZone, Room } from '../../../../lib/consortium/index.ts';
import { countryStatus, NEAREST_LISTS, periodIds, roomValues, ROOM_LIMIT_M, siteClimate as climateOf, siteEditLines, zoneOf } from '../../../../lib/consortium/index.ts';
import { type Country, addMembers, climate, country, countFits, curatedClimates, laterFits, editsCleared, guests, knownCountries, location as siteLocation, memberTaxa, members, openFigure, openSheet, removeMember, room, siteEdits, view } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import { say } from '../../words.ts';
import { formatLength, formatTemp } from '../../format.ts';
import { LocationSlot } from '../LocationSlot.tsx';
import { PlaceFigures } from '../figures/slots.tsx';
import { PoolSlot, cardPill, hasList, suggestBlock } from '../PoolSlot.tsx';
import { climateChosen, linkPlace, memory, restoring, COUNTRY_STORE } from '../../state/persist.ts';
import { locationAtStart, notices, savedInstead } from '../../state/restore.ts';
import { openingArrival } from '../../state/arrival.ts';
import { STORE } from '../../state/save.ts';
import { addOwnPlant, answering, backToPlace, chooseClimate, chooseCountry, keepShownAsMine, openSavedInstead, placeSaid, showPalette, startOver, useLinkPlace, useOwnPlace } from '../../state/draft.ts';
import { pendingSuggest, requestSuggest } from '../../state/suggest-wait.ts';
import { page } from '../kit/page.ts';
import { markStart } from '../kit/start-mark.ts';
import { focusAfterAdd, focusView } from '../../focus.ts';
import { countryName, nameOf, num, zoneName } from '../kit/names.ts';
import { cardsAsked, closeClimates, desk, focusField, openClimates, placeWords, shortPlace } from '../location/shared.ts';
import { koppenWordsKey } from '../location/koppen-words.ts';
import { Steps } from './steps.tsx';
import { PlantsCount } from '../plants/head-link.tsx';
import { enterCountry, findCountries } from './country-search.ts';
import { SitePostcard } from './SitePostcard.tsx';
import { AreaStep, OpenCanopiPathB } from './AreaStep.tsx';
import { openPlantPool } from '../../state/studio.ts';

const sep = <span class="ct-sep" aria-hidden="true"> · </span>;

// ---- the country line (board Country) ----
// The standard design (pf-c step back, 2026-11-18): one line mounted at a time (the Place form's own
// goes while the climate screen shows its own: MainCountry), its ids its own (useId), and its choices
// open or closed by the line itself (local state), so a remount or a screen change closes them.
// - The trigger ("Change", or "Add your country" with no country) stays on the line, aria-expanded;
//   Escape or the trigger again closes the choices, the focus back on the trigger. No Cancel and no
//   confirm button: the board draws neither.
// - The choices are board Country's radio rows, a native radio group that commits on change, as
//   ClimateHand's climates do: "<country> · from your location" puts the location's country back
//   (source 'location', never "chosen by you"), "No country" clears it, "Another country" reveals the
//   field "Your country". So the checked row is always the country in use, whatever moved it (a tap,
//   the arrows, Space, a screen reader). A tap or Enter on a row also closes the choices. The country
//   in use when the choices opened is kept: "Another country" checked again with nothing picked puts
//   it back, with its source and what the device held (review S1: an arrow past "No country" is
//   undone by the arrow back).
// - The field (always under "Another country", as the board draws it): typing checks that row; what is
//   typed filters the countries (by the page-language name, the English name or the ISO code; Latin
//   accents aside, as a grower types them, never kana voicing) into a short list of buttons; one
//   polite status line, always in the accessibility tree, says how many match, or that none does.
//   Enter takes an exact name or the one match (country-search.ts enterCountry), else goes to the list.
// - "Why we ask." is the board's note box, under the rows and under "Why we ask" with no country.
type Row = 'here' | 'other' | 'none';
let english: Intl.DisplayNames | null = null;
const englishName = (c: string): string => { try { english ??= new Intl.DisplayNames(['en'], { type: 'region' }); return english.of(c) ?? c; } catch { return c; } };
// The country's state as the line moves it, beside chooseCountry (state/draft.ts; hand-off: these two
// belong there, next to it, as state/location.ts is the lazy location chunk the line never loads).
// The location's country put back: from the location again, so it follows the place (the stored
// choice goes; state/arrival.ts reads the location's country when none is stored).
function followLocationCountry(code: string): void {
  country.value = { code, source: 'location' };
  memory.remove(COUNTRY_STORE);
}
// The country in use and what the device holds, and both put back as they were.
interface CountryAt { country: Country; stored: string | null }
const countryAt = (): CountryAt => ({ country: country.peek(), stored: memory.read(COUNTRY_STORE) });
function putCountryBack(at: CountryAt): void {
  country.value = at.country;
  if (at.stored === null) memory.remove(COUNTRY_STORE); else memory.write(COUNTRY_STORE, at.stored);
}
// Board Country's invasive mark (the spreading arrows), leading the line and the note.
const invasiveMark = (cls: string) => <svg aria-hidden="true" class={cls} width="18" height="18" viewBox="0 0 20 20"><path d="M10 10L4.5 4.5M10 10l5.5-5.5M10 10l-5.5 5.5M10 10l5.5 5.5M4.5 8V4.5H8M12 4.5h3.5V8M4.5 12v3.5H8M12 15.5h3.5V12" /></svg>;
// A sentence-led text ("Why we ask. …", "No country. …"): its first sentence in bold, then the rest.
function Lead({ text }: { text: string }) {
  const m = /^(.+?[.。])\s*([\s\S]*)$/.exec(text);
  return m ? <><strong>{m[1]}</strong>{m[1].endsWith('.') ? ' ' : ''}{m[2]}</> : <>{text}</>;
}
function WhyNote() {
  return (
    <div class="ct-country-why">
      {invasiveMark('ct-country-icon')}
      <p><Lead text={T('country.why')} /></p>
    </div>
  );
}
function CountryLine() {
  const { code, source: from } = country.value;
  // The page's list until the database opens (store.knownCountries): the line is final in its first frame.
  const known = knownCountries.value;
  const status = countryStatus(code, known);
  const uid = useId();
  const pickId = `${uid}-pick`, listId = `${uid}-found`, statusId = `${uid}-said`;
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  // "Another country" checked before a country is picked from the field.
  const [another, setAnother] = useState(false);
  // The country in use when the choices opened (review S1).
  const opened = useRef<CountryAt | null>(null);
  const [query, setQuery] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const pick = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // Where the focus goes once the render it waits for is on the page.
  const focusTo = useRef<'checked' | 'trigger' | 'field' | null>(null);
  useEffect(() => {
    const to = focusTo.current;
    if (!to) return;
    focusTo.current = null;
    if (to === 'trigger') trigger.current?.focus();
    else if (to === 'field') field.current?.focus();
    else (pick.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked') ?? pick.current?.querySelector<HTMLInputElement>('input[type="radio"]'))?.focus();
  });
  const name = code ? countryName(code) : '';
  const here = siteLocation.value?.source !== 'link' ? siteLocation.value?.lookup?.regions.isoA2 ?? null : null;
  const row: Row = another || (code && code !== here) ? 'other' : code ? 'here' : 'none';
  const found = findCountries(query, known.keys(), countryName, englishName, pageLang());
  const typed = query.trim() !== '';
  const close = () => { setOpen(false); setAnother(false); setQuery(''); focusTo.current = 'trigger'; };
  const toggle = () => { if (open) close(); else { opened.current = countryAt(); setOpen(true); setAnother(false); setQuery(''); setWhy(false); focusTo.current = 'checked'; } };
  // A row checked (a tap, the arrows, Space, typing in the field): the country follows at once.
  // "Another country" with nothing picked: the country of another place it opened on comes back.
  const commit = (r: Row) => {
    if (r === 'other') {
      setAnother(true);
      const was = opened.current?.country.code;
      if (was && was !== here) putCountryBack(opened.current!);
      return;
    }
    setAnother(false);
    if (r === 'here' && here) followLocationCountry(here);
    else if (r === 'none') chooseCountry(null);
  };
  // A tap or Enter on a row: done (the field instead for "Another country"; it is on the page already,
  // so the focus moves now: a row the arrows checked first changes no state, so no render follows).
  const finish = (r: Row) => { if (r !== 'other') close(); else if (field.current) field.current.focus(); else focusTo.current = 'field'; };
  const choose = (c: string) => { chooseCountry(c); close(); };
  const triggerProps = { ref: trigger, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': pickId, onClick: toggle } as const;
  const travel = <p class="ct-muted ct-small-text">{T('country.travel')}</p>;
  // A row: its own radio over the whole row (a tap anywhere on it is the radio's), the board's circle.
  const radio = (r: Row, label: string, sub: string) => (
    <label class="ct-country-row">
      <input type="radio" name={`${uid}-row`} value={r} checked={row === r} onChange={() => commit(r)}
        onClick={(e) => { if (e.detail > 0) { commit(r); finish(r); } }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(r); finish(r); } }} />
      <span class="ct-country-dot" aria-hidden="true" />
      <span class="ct-country-row-text"><span class="ct-country-row-name">{label}</span>{' '}<span class="ct-country-row-why">{sub}</span></span>
    </label>
  );
  // The field's keys: Enter takes an exact name or the one match, else goes to the list; the arrows walk
  // the list and back up to the field.
  const fieldKeys = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const c = enterCountry(query, known.keys(), countryName, englishName, pageLang());
      if (c) choose(c);
      else list.current?.querySelector('button')?.focus();
    } else if (e.key === 'ArrowDown' && found.list.length) { e.preventDefault(); list.current?.querySelector('button')?.focus(); }
  };
  const listKeys = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const bs = [...(list.current?.querySelectorAll('button') ?? [])];
    const i = bs.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? bs[Math.min(i + 1, bs.length - 1)] : i <= 0 ? field.current : bs[i - 1];
    next?.focus();
  };
  return (
    <div class="ct-country" data-ct="country">
      {code ? (
        <p class="ct-country-text">
          {invasiveMark('ct-country-icon')}{T('country.line')} <strong>{name}</strong>{sep}<span class="ct-muted">{T(from === 'guess' ? 'country.guessed' : from === 'link' ? 'country.linked' : from === 'location' ? 'country.fromLocation' : 'country.chosen')}</span>
          {from !== 'guess' && <>{sep}<button type="button" class="link-button ct-link" {...triggerProps}>{T('country.change')}</button></>}
        </p>
      ) : (
        <p class="ct-country-text">{invasiveMark('ct-country-icon')}<span><Lead text={T('country.noneLine')} /></span></p>
      )}
      {code && status === 'unchecked' && <p class="ct-muted ct-small-text ct-country-note">{T('country.unchecked', { country: name })}</p>}
      {(from === 'guess' || !code) && (
        <p class="ct-country-acts">
          {code ? !open && <button type="button" class="button button-secondary ct-small" onClick={() => { chooseCountry(code); focusTo.current = 'trigger'; }}>{T('country.use', { country: name })}</button>
            : <button type="button" class="button button-secondary ct-small" {...triggerProps}>{T('country.add')}</button>}
          {code ? <button type="button" class="button button-secondary ct-small" {...triggerProps}>{T('country.change')}</button>
            : !open && <button type="button" class="button button-secondary ct-small" aria-expanded={why ? 'true' : 'false'} onClick={() => setWhy(!why)}>{T('country.whyAsk')}</button>}
        </p>
      )}
      {!code && why && !open && <><WhyNote />{travel}</>}
      {open && (
        <div class="ct-country-pick" id={pickId} ref={pick} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
          <fieldset class="ct-country-choices">
            <legend class="ct-sr">{T('country.line')}</legend>
            {here && radio('here', countryName(here), T('country.fromLocation'))}
            {radio('other', T('country.another'), T('country.anotherWhy'))}
            <div class="ct-country-other">
              <label class="ct-country-search">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5" /><path d="M12.3 12.3l4.2 4.2" /></svg>
                <input type="text" ref={field} value={query} aria-label={T('country.pick')} placeholder={T('country.pick')} autoComplete="off"
                  aria-controls={found.list.length ? listId : undefined} aria-describedby={statusId}
                  onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setQuery(v); if (v.trim() && row !== 'other') commit('other'); }} onKeyDown={fieldKeys} />
              </label>
              {found.list.length > 0 && (
                <ul class="ct-country-results" id={listId} ref={list} onKeyDown={listKeys}>
                  {found.list.map(([c, n]) => <li><button type="button" class="link-button ct-link" onClick={() => choose(c)}>{n}</button></li>)}
                </ul>
              )}
              <p class="ct-muted ct-small-text" id={statusId} role="status">{!typed ? '' : !found.count ? T('country.noMatch') : found.count > found.list.length ? P('country.foundMore', found.count, { shown: found.list.length }) : P('country.found', found.count)}</p>
            </div>
            {radio('none', T('country.none'), T('country.noneWhy'))}
          </fieldset>
          <WhyNote />
          {travel}
        </div>
      )}
    </div>
  );
}
// The Place form's country line: none while the climate screen is open, which shows its own (N3).
const MainCountry = () => (cardsAsked.value ? null : <CountryLine />);

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
// Each row carries data-climate-row, the polar row data-climate-polar: the hooks the layout-stability
// check measures (scripts/browser/seams-helpers.mjs STABLE).
// Mounted with Place and hidden until asked, so the questions keep their state behind it and the
// radios are always in the page (the location step's tests read them).
function ClimateHand({ open }: { open: boolean }) {
  const chosen = climateChosen.value;
  // The guessed country line stays once shown while the screen is open (R5): answered, it turns into
  // its chosen form in place, so the focus it keeps has somewhere to be.
  const countryShown = useRef(false);
  if (!open) countryShown.current = false;
  else if (country.value.source === 'guess') countryShown.current = true;
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
      {open && countryShown.current && <CountryLine />}
      <fieldset class="ct-climates" id="ct-climates" aria-labelledby="ct-hand-h">
        {zones.map((zone) => {
          const { id, label, size } = zone;
          const z = zoneOf(id)!;
          const pill = cardPill(z);
          const own = curatedClimates.value.includes(z);
          return (
            <label class={`ct-hand-row${chosen === z ? ' is-chosen' : ''}`} data-climate-row>
              <input type="radio" name="ct-climate" value={id} checked={chosen === z} aria-labelledby={`ct-cl-${id}`} aria-describedby={`ct-cl-${id}-d`} onChange={() => chooseClimate(z)} onClick={closeOnPointer(z)} onKeyDown={closeOnKey} />
              <span class="ct-hand-head"><span class="ct-hand-name" id={`ct-cl-${id}`} data-name>{label}</span>{chip(pill.ready ? 'ready' : pill.site ? 'site' : 'none', pill.label)}</span>
              <span id={`ct-cl-${id}-d`} class="ct-hand-desc">{T(`place.climate.desc.${id}`)}{sep}{own ? P('place.climate.ownList', size) : T('place.climate.nearest', { lists: listsOf(z) })}</span>
            </label>
          );
        })}
        <div class="ct-hand-row is-off" data-climate-row data-climate-polar>
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
  welcomeGone.value = true;
  startOver();
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
// "Add its plants to mine" (R4, C11; R1, C1 of fix round 2): the reader's own palette comes back as
// saved, with its place and values (the merge only adds plants and never touches the place), then
// each of the link's plants joins with the list it came from (the link's climate, or its own guest
// list), as one undoable add.
async function addShared(): Promise<void> {
  const theirs = members.peek().slice(), homes = { ...guests.peek() }, linkZone = climate.peek();
  sharedSeen.value = 'done';
  await openSavedInstead();
  const mine = climate.peek();
  const from: Partial<Record<string, ClimateZone>> = {};
  for (const id of theirs) { const z = homes[id] ?? linkZone; if (z && z !== mine) from[id] = z; }
  addMembers(theirs, from);
}
// "Keep it as mine" (R3): the shared palette becomes the save now (state/draft.ts keepShownAsMine, with
// its Undo), then the palette.
function keepShared(): void {
  sharedSeen.value = 'done';
  keepShownAsMine();
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
  // One list of the arrivals (C3 of fix round 3): each with the sentence a screen reader hears and
  // what the page draws, in the board's order; Announcer says each once, PlaceNotices draws them.
  const items: Arrival[] = [];
  const notice = (id: string, text: string, props: { tone?: Tone; mark: keyof typeof ICONS }, children?: ComponentChildren) =>
    items.push({ id, said: heard(text), view: <Notice id={id} text={text} {...props}>{children}</Notice> });
  if (welcome) {
    notice('welcome', T(mine ? 'place.welcome' : 'place.welcomeNoPlace', { date: (opened.kind === 'saved' && dayMonth(opened.at)) || welcome.at, count: P('start.count', list.length), place: mine ?? '' }), { mark: 'check' },
      act(T('start.over'), startOverNow, 'quiet', { 'data-start-over': '' }));
  }
  if (shared === 'ask' && z) {
    const title = T('place.shared.title');
    const body = T('place.shared.body', { count: P('start.count', list.length), list: T('place.line.list', { climate: zoneName(z) }), mine: savedCount });
    items.push({
      id: 'shared',
      said: T('palette.place.sharedSaid', { title, body }),
      view: (
        <section class="ct-arrival ct-arrival-card is-neutral" data-place-notice="shared" aria-labelledby="ct-shared-h">
          <h3 class="ct-arrival-title" id="ct-shared-h">{icon('share')}{title}</h3>
          <p>{body}</p>
          <p class="ct-arrival-acts ct-arrival-stack">
            {act(T('place.shared.look'), () => { sharedSeen.value = 'looking'; focusView(); }, 'primary')}
            {act(T('place.shared.add'), addShared, 'secondary')}
            {act(T('place.shared.stay'), () => { sharedSeen.value = 'done'; return openSavedInstead(); }, 'quiet', { 'data-back-mine': '' })}
          </p>
        </section>
      ),
    });
  }
  if (shared === 'looking') {
    notice('looking', T('place.shared.looking'), { mark: 'share' }, <>
      {act(T('place.shared.keep'), keepShared, 'secondary')}
      {act(T('place.backToMine'), () => { sharedSeen.value = 'done'; return openSavedInstead(); }, 'quiet', { 'data-back-mine': '' })}
    </>);
  }
  if (n.unreadable) {
    notice('unreadable', T('place.unreadable'), { tone: 'danger', mark: 'alert' }, <>
      {act(T('place.newPalette'), startOverNow, 'secondary')}
      {saved && act(T('place.backToMine'), () => openSavedInstead(), 'quiet', { 'data-back-mine': '' })}
    </>);
  }
  if (n.period) notice('period', T('place.period'), { tone: 'warning', mark: 'clock' });
  if (n.failed) notice('failed', T('share.failed'), { tone: 'danger', mark: 'alert' }, act(T('location.tryAgain'), () => location.reload(), 'secondary'));
  if (n.guideMissing && z) notice('guideMissing', T('start.guideMissing', { name: n.guideMissing, climate: zoneName(z) }), { tone: 'warning', mark: 'leaf' }, act(T('place.findPlant'), addOwnPlant, 'secondary'));
  if (guide && z) {
    notice('guide', saved && savedN ? T('place.guideSaved', { name: nameOf(guide), climate: zoneName(z), count: savedCount }) : T('place.guidePlant', { name: nameOf(guide), climate: zoneName(z) }), { mark: 'leaf' }, <>
      {!siteLocation.value?.lookup && act(T('place.givePlace'), givePlace, 'primary')}
      {saved && act(T('place.openSaved'), () => openSavedInstead(), 'quiet', { 'data-open-saved': '' })}
    </>);
  }
  // Your own save, not the one shown (another tab saved, or a guide over it): back to it (no sentence).
  if (saved && !guide && !shared && sharedSeen.value !== 'looking' && !n.unreadable) {
    items.push({ id: 'saved', said: null, view: <p class="ct-arrival-acts" data-place-notice="saved">{act(T('place.openSaved'), () => openSavedInstead(), 'quiet', { 'data-open-saved': '' })}</p> });
  }
  if (noPlace && z) {
    notice('noPlace', T('place.noPlace', { list: T('place.line.list', { climate: zoneName(z) }) }), { tone: 'warning', mark: 'pin' }, <>
      {act(T('place.givePlace'), givePlace, 'primary')}
      {act(T('place.later'), () => { laterPlace.value = true; }, 'quiet')}
    </>);
  }
  if (checkedAgainst) notice('checkedAgainst', T(values ? 'place.checkedAgainst' : 'place.checkedAgainstBare', { place: placeWords(siteLocation.value!, true) }), { mark: 'pin' }, act(T('place.changePlace'), backToPlace, 'quiet'));
  if (theirs) {
    notice('linkPlace', T(values ? 'place.linkPlace' : 'place.linkPlaceBare', { place: siteLocation.value ? placeWords({ ...siteLocation.value, source: 'map' }, true) : T('location.linkPlace'), values }), { mark: 'pin' }, <>
      {act(T('place.useIt'), () => useLinkPlace(), 'primary', { 'data-use-link-place': '', disabled: busy, 'aria-busy': busy ? 'true' : undefined })}
      {act(T('place.useMine'), useOwnPlace, 'secondary', { 'data-use-own-place': '', disabled: busy })}
    </>);
  }
  return (
    <>
      <Announcer items={items} />
      <div class="ct-place-notices">{items.map((x) => <Fragment key={x.id}>{x.view}</Fragment>)}</div>
    </>
  );
}

// What a screen reader hears of the arrivals (R3 of fix round 3): each notice's sentence once, when
// the notice first appears, in a short status line of its own (outside the notices, their headings
// and buttons: R8). A notice whose words change (your own values set, the link's place read) is not
// said again; one that goes and comes back is; one that goes takes its sentence. The line empties
// after a while, so browsing the page does not read the sentence twice. It is on the page empty
// before its first words (A25): they come from an effect, after the first paint.
type Arrival = { id: string; said: string | null; view: ComponentChildren };
const heard = (text: string) => text.replace(/\*\*/g, '');
const SAID_MS = 7000;
function Announcer({ items }: { items: readonly Arrival[] }) {
  const heardIds = useRef(new Set<string>());
  const [said, setSaid] = useState<{ ids: readonly string[]; text: string }>({ ids: [], text: '' });
  const spoken = items.filter((x) => x.said);
  const key = spoken.map((x) => x.id).join(' ');
  useEffect(() => {
    const fresh = spoken.filter((x) => !heardIds.current.has(x.id));
    heardIds.current = new Set(spoken.map((x) => x.id));
    if (fresh.length) setSaid({ ids: fresh.map((x) => x.id), text: fresh.map((x) => x.said).join(' ') });
  }, [key]);
  useEffect(() => {
    if (!said.text) return;
    const t = setTimeout(() => setSaid({ ids: [], text: '' }), SAID_MS);
    return () => clearTimeout(t);
  }, [said]);
  // A notice gone takes its sentence with it, in the same frame.
  const live = said.ids.every((id) => spoken.some((x) => x.id === id));
  return <p class="ct-sr" role="status">{live ? said.text : ''}</p>;
}

// ---- the palette step's place line (boards Main, Palette, Many, Oulu) ----
const seenPalette = signal(false);
// Board Oulu: on the neutral card with a wave icon; "Colder than any list we have made." and "Each is an
// estimate." in bold. "Colder" stays the zone rule (Continental, Boreal: the climates with no list of
// their own colder than every list), as the board's case.
function OuluBanner({ zone }: { zone: ClimateZone }) {
  const loc = siteLocation.value;
  if (curatedClimates.value.includes(zone) || !loc?.lookup) return null;
  const sc = climateOf(loc.lookup);
  if (!sc.today) return null;
  // Read only here, after the own-list and lookup checks: a palette on its own list never runs the
  // later period's pass (C5).
  const n = countFits.value, later = laterFits.value;
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
  const parts: ComponentChildren[] = [];
  if (z) parts.push(<span>{own ? T('place.line.list', { climate: zoneName(z) }) : T('place.line.borrowed', { climate: zoneName(z) })}</span>);
  if (r !== 'unsure') parts.push(<span>{T(`place.line.room.${r}`)}</span>);
  const values = siteEditLines(siteEdits.value).map(say).join(', ');
  if (values) parts.push(<span>{values}</span>);
  // The count: "200 plants: Your plants" (a link to the list) under 960 px past 40 plants (board Many, BC1).
  parts.push(<PlantsCount n={n} />);
  return (
    <div class="ct-result-head">
      <p class="ct-place-line" data-place-line>
        {/* Board Oulu, Main: the pin and the place in bold lead the line (BC11). */}
        {loc && <><svg aria-hidden="true" class="ct-ico" width="16" height="16" viewBox="0 0 20 20"><path d="M10 17.5s5.5-5.2 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.1 5.5 9.3 5.5 9.3Z" /><circle cx="10" cy="8.2" r="1.9" /></svg><strong>{placeWords(loc)}</strong>{parts.length > 0 && sep}</>}
        {parts.map((p, i) => <>{i > 0 && sep}{p}</>)}
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

  const startWinterGuild = () => {
    openPlantPool({ tab: 'all', intent: 'winter', banner: 'Winter-planted starter guild' });
    if (ready && !block) void requestSuggest();
    else if (ready) showPalette();
    else openClimates();
  };

  return (
    <div class="ct-onboard-grid">
      <div class="ct-ob-left">
        {/* Step 1 · Your Place & Soil */}
        <div class="ct-ob-card">
          <span class="ct-eyebrow">STEP 1 · YOUR PLACE &amp; SOIL</span>
          <LocationSlot>{askLink() ? <ClimatesLink /> : null}</LocationSlot>
          {!siteLocation.value?.lookup && <WeRead />}
          <SitePostcard />
          <KeptClimate />
          <details class="ct-adv-figures">
            <summary class="ct-adv-summary">{T('studio.advOverrides')}</summary>
            <PlaceFigures />
          </details>
          <MainCountry />
          {z && (block || !hasList(z)) && <PoolSlot zone={z} />}
          <p class="ct-ob-attr">canopi-climate v0.7.0 · canopi-data Schema 4.9</p>
        </div>

        {/* Step 2 · Your Space (always visible on initial load, matching v14) */}
        <div class="ct-ob-card">
          <span class="ct-eyebrow">STEP 2 · YOUR SPACE</span>
          <RoomStep />
          <AreaStep />
        </div>
      </div>

      {/* Right Sticky Sidebar: Path A + Path B */}
      <aside class="ct-ob-aside" aria-label="Start or open a palette">
        <div class="ct-ob-card">
          <span class="ct-eyebrow">PATH A · START FRESH FOR YOUR LAND</span>
          <h2 class="ct-ob-h2">Choose a starter palette</h2>
          <div class="ct-kit-list">
            {!block && (
              <button
                type="button"
                class="ct-kit-opt"
                data-place-suggest
                aria-busy={pendingSuggest.value || restoring.value ? 'true' : undefined}
                onClick={() => (ready ? void requestSuggest() : openClimates())}
              >
                <strong>{T('start.suggest')}</strong>
                <span class="ct-small-text ct-muted" aria-hidden="true">Balanced 6-species starter guild tuned to your climate and soil.</span>
              </button>
            )}
            <button
              type="button"
              class="ct-kit-opt"
              onClick={startWinterGuild}
            >
              <strong>❄ Winter-planted guild</strong>
              <span class="ct-small-text ct-muted">Opens studio with cool-season, autumn-sowable plants pre-filtered.</span>
            </button>
          </div>
          {ready ? <OwnPlants /> : <p class="ct-muted ct-small-text">{T('place.none')}</p>}
          <button
            type="button"
            class="button button-primary ct-ob-cta"
            data-place-show
            onClick={() => (ready ? showPalette() : openClimates())}
          >
            {T('place.show')}
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </div>

        <div class="ct-ob-card">
          <span class="ct-eyebrow">PATH B · EXISTING PROJECT</span>
          <h2 class="ct-ob-h2">Open an existing .canopi file</h2>
          <OpenCanopiPathB />
        </div>
      </aside>
    </div>
  );
}

function PlaceForm() {
  // The ct:start timing mark (F1a commit 0 seam, perf1), told on every render of the form.
  markStart();
  return (
    <div class="ct-start ct-place">
      <div class="ct-place-main" hidden={cardsAsked.value}>
        <Questions />
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
        <MainCountry />
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
