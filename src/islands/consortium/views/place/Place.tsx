/** @jsxImportSource preact */
// Place (PP-B stream b1a; boards Place, PlaceDesk, Arrivals, Balcony; plant-palette-architecture 3.1,
// 8.3, 9): the grower names a place first, then starts from their own plants, with a small suggested
// palette one link away. Moved here from views/Start.tsx (stream S4), which it replaces.
// - The arrival lines first, in one live region that is always on the page (older, newer and
//   unreadable with "Back to mine" over a saved palette, period, an older save, a guide's plant with
//   "Open my saved palette instead", a link's place with "Use it" / "Use my own place").
// - "Where is your place?" first (owner drop 10, decision row 127 (4)): the location step
//   (LocationSlot: search, map, device), which can be skipped; then the country line, so the browser's
//   guess is seen before it is used.
// - The climate cards one link away (boards Place, PlaceDesk, ClimateHand): "No location? Choose a
//   climate", or "Not this climate? Choose another" once a location gives one (a climate read from it);
//   they open when a link, a save or the shared site climate already chose one and there is no
//   location, on the page or kept on this device and still being looked up, and then stay open. Behind the link, without a
//   climate read from a location, what a grower without one loses; then the cards, nothing chosen (never a
//   default climate): Ready, Needs your location (a climate that borrows plants, without a location:
//   PoolSlot cardPill), or Not covered yet with "Ask for this climate". Picking one writes the shared
//   site climate (state/draft.ts chooseClimate).
// - "How much room do you have?": the room in height words only (pots included; the limits from core
//   site.ts ROOM_LIMIT_M through format.ts) and the optional plot size (format.ts parsePlotSize).
// - "What grows there already": the grower's own plants, "Add a plant by name" (the search sheet) and
//   "Paste a list". (The goal question is not built in PP-B.)
// - "Your spot": today's light, soil and water questions, kept inside Place until PP-F replaces them
//   (owner, 2026-11-14): all start at "Not sure".
// - "Show my palette" and "No plants in mind? Start from a small suggested palette" (one Undo).
// Once a palette is shown (store.view is not 'start'), Place shrinks to its head: the title with the
// count and climate, the basis with "Change your place" and "Start over" (one Undo), the location line
// and the country line, until b2's palette page hosts them. "Change your place" opens the "Your place"
// sheet (PlaceSheet, hosted by views/Sheets.tsx; board ChangePlace, room and location parts; b1a review
// r1 conformance-4): the location step, the climate cards, the room and plot, and the spot questions,
// which change the palette's own place in place, every plant kept (state/draft.ts chooseClimate).
import { signal } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClimateZone, Room, Site } from '../../../../lib/consortium/index.ts';
import { countryStatus, lights, roomValues, ROOM_LIMIT_M, soils, waters, zoneOf } from '../../../../lib/consortium/index.ts';
import { climate, closeSheet, country, location as siteLocation, proposedClimate, knownCountries, memberTaxa, members, openSheet, plot, pool, removeMember, room, site, view } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import { formatArea, formatLength, parsePlotSize } from '../../format.ts';
import { LocationSlot } from '../LocationSlot.tsx';
import { PoolSlot, cardPill, hasList, suggestBlock } from '../PoolSlot.tsx';
import { climateChosen, climateShown, linkPlace, restoring } from '../../state/persist.ts';
import { locationAtStart, notices, savedInstead } from '../../state/restore.ts';
import { addOwnPlant, answering, cardsLatched, chooseClimate, chooseCountry, openSavedInstead, pickingCountry, placeSaid, showPalette, startOver, useLinkPlace, useOwnPlace } from '../../state/draft.ts';
import { pendingSuggest, requestSuggest } from '../../state/suggest-wait.ts';
import { page } from '../kit/page.ts';
import type { Frame } from '../kit/sheet.tsx';
import { markStart } from '../kit/start-mark.ts';
import { basisLine, countryName, nameOf, zoneName } from '../kit/names.ts';

// ---- the country line ----
function CountryLine() {
  const { code, source: from } = country.value;
  // The page's list until the database opens (store.knownCountries): the line is final in its first frame.
  const known = knownCountries.value;
  const status = countryStatus(code, known);
  const picking = pickingCountry.value;
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (picking) select.current?.focus(); }, [picking]);
  const sorted = [...known.keys()].map((c) => [c, countryName(c)] as const).sort((a, b) => a[1].localeCompare(b[1], pageLang()));
  const name = code ? countryName(code) : '';
  return (
    <div class="ct-country" data-ct="country">
      {code ? (
        <p class="ct-country-text">
          <span>{T('country.line')} <strong>{name}</strong> <span class="ct-muted">({T(from === 'guess' ? 'country.guessed' : from === 'link' ? 'country.linked' : from === 'location' ? 'country.fromLocation' : 'country.chosen')})</span></span>
          {status === 'unchecked' && <span class="ct-muted ct-country-note">{T('country.unchecked', { country: name })}</span>}
        </p>
      ) : (
        <p class="ct-country-text"><span>{T('country.line')}: <strong>{T('country.none')}</strong></span> <span class="ct-muted ct-country-note">{T('country.noneNote')}</span></p>
      )}
      {!picking && (
        <p class="ct-country-acts">
          {code && from === 'guess' && <button type="button" class="button button-secondary ct-small" onClick={() => chooseCountry(code)}>{T('country.use', { country: name })}</button>}
          <button type="button" class="link-button ct-link" aria-expanded="false" onClick={() => { pickingCountry.value = true; }}>{code ? T('country.change') : T('country.add')}</button>
          {code && <button type="button" class="link-button ct-link" onClick={() => chooseCountry(null)}>{T('country.none')}</button>}
        </p>
      )}
      {picking && (
        <p class="ct-country-pick">
          <label for="ct-country-select">{T('country.pick')}</label>
          <select id="ct-country-select" ref={select} value={code ?? ''} onChange={(e) => chooseCountry((e.currentTarget as HTMLSelectElement).value || null)}>
            <option value="">{T('country.none')}</option>
            {sorted.map(([c, n]) => <option value={c}>{n}</option>)}
          </select>
          <button type="button" class="link-button ct-link" onClick={() => { pickingCountry.value = false; }}>{T('country.cancel')}</button>
        </p>
      )}
    </div>
  );
}

// ---- the climate cards, one link away ----
// Opened by the reader on this page (the link); kept open for the page. Opened by the page: latched
// (state/draft.ts cardsLatched).
const cardsAsked = signal(false);
function openCards(): void {
  cardsAsked.value = true;
  // The link leaves with the press: the focus goes to the card Tab would land on (A25: never <body>).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    // In this order (one selector list would give the first card in the page): checked, proposed, first.
    const card = (q: string) => document.querySelector<HTMLInputElement>(`#ct-climates ${q}`);
    (card('input:checked') ?? card('[data-proposed] input') ?? card('input'))?.focus();
  }));
}
function Climates() {
  // The one shown climate (state/persist.ts climateShown): the chosen one, else a link's while it loads,
  // else a location's suggestion (store.proposedClimate, S5b), shown as proposed, not checked: a click
  // on its card confirms it, as the result line's "Use" button does (owner answer 1; review round 1, 6).
  const shown = climateShown.value;
  const chosen = climateChosen.value;
  const proposed = shown.proposed ? shown.zone : null;
  // With a card proposed and none checked (review round 2, 5): Tab lands on the proposed card (the
  // others leave the tab order), and the arrows move the focus without checking a card; Space, Enter
  // or a click confirms one.
  const choose = (z: ClimateZone) => { proposedClimate.value = null; chooseClimate(z); };
  const keys = (e: KeyboardEvent) => {
    if (!proposed) return;
    const r = e.currentTarget as HTMLInputElement;
    if (e.key === 'Enter') { e.preventDefault(); r.click(); return; }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const all = [...r.closest('fieldset')!.querySelectorAll<HTMLInputElement>('input')];
    all[(all.indexOf(r) + (/[RD]/.test(e.key[5]) ? 1 : all.length - 1)) % all.length].focus();
  };
  // Open once asked for, or when a climate is already chosen (a link, a save, the shared site climate,
  // a pick) and no place could stand for it: none on the page and no kept location still being looked
  // up (state/restore.ts locationAtStart: it counts until its lookup settles or Forget removes it,
  // review rounds 2, 1 and 3, 1). Latched until Start over. The cards stay in the page while closed
  // (hidden), so the link names what it opens.
  const where = siteLocation.value;
  const latch = !!chosen && !where && !locationAtStart.value;
  if (latch && !cardsLatched.peek()) cardsLatched.value = true;
  const open = cardsAsked.value || cardsLatched.value || latch;
  // The words follow a climate read from the location (its lookup), not a location object: a location
  // whose tiles failed, or still loading, gives none of the checks (review round 2, 3).
  const read = !!where?.lookup;
  return (
    <>
      {!open && (
        <p class="ct-place-climates">
          <button type="button" class="link-button ct-link" data-place-climates aria-expanded="false" aria-controls="ct-climates" onClick={openCards}>
            {T(proposed || (read && chosen) ? 'place.climate.other' : 'place.climate.open')}
          </button>
        </p>
      )}
    <fieldset class="ct-step ct-climates" id="ct-climates" hidden={!open}>
      <legend class="ct-step-title">{T('start.climate.title')}</legend>
      {!read && <p class="ct-step-lede">{T('place.climate.without')}</p>}
      <p class="ct-muted ct-step-lede">{T('start.climate.lede')}</p>
      <div class="ct-cards">
        {page().start.zones.map(({ id, label, places }) => {
          const z = zoneOf(id)!;
          // Ready, Needs your location (a borrowed climate without one), or Not covered yet (PoolSlot).
          const pill = cardPill(z);
          return (
            <label class={`ct-card${chosen === z ? ' is-chosen' : proposed === z ? ' is-proposed' : ''}`} data-proposed={proposed === z ? '' : undefined}>
              <input type="radio" name="ct-climate" value={id} checked={chosen === z} aria-labelledby={`ct-cl-${id}`} aria-describedby={`ct-cl-${id}-d`} tabIndex={proposed && proposed !== z ? -1 : undefined} onKeyDown={keys} onChange={() => choose(z)} />
              <span class="ct-card-name" id={`ct-cl-${id}`}>{label}</span>
              <span id={`ct-cl-${id}-d`} class="ct-card-desc">
                {proposed === z && <span class="ct-card-proposed">{T('location.proposed')}</span>}
                <span class={`ct-pill${pill.ready ? ' is-ready' : ''}`}>{pill.label}</span>
                <span class="ct-card-places">{places}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
    </>
  );
}

// ---- How much room do you have? ----
// Each answer's height in words (ROOM_LIMIT_M through formatLength; height only, never a count).
function roomLimit(r: Room): string {
  const m = ROOM_LIMIT_M[r];
  if (r === 'unsure') return T('place.room.limit.unsure');
  if (!Number.isFinite(m)) return T('place.room.limit.any');
  return T(r === 'pots' ? 'place.room.limit.plants' : 'place.room.limit.trees', { len: formatLength(m, pageLang()) });
}
function PlotSize() {
  const lang = pageLang();
  const now = plot.value;
  const [text, setText] = useState(now === null ? '' : String(now));
  const [bad, setBad] = useState(false);
  // A plot size from elsewhere (a link, Undo, Start over keeps it) shows in the field.
  useEffect(() => { if (parsePlotSize(text, lang) !== now) { setText(now === null ? '' : String(now)); setBad(false); } }, [now]);
  const commit = (t: string) => {
    const n = t.trim() ? parsePlotSize(t, lang) : null;
    setBad(t.trim() !== '' && n === null);
    if (t.trim() === '' || n !== null) plot.value = n;
  };
  const example = formatArea(200, lang);
  return (
    <p class="ct-plot">
      <label for="ct-plot-size">{T('place.plot.label')} <span class="ct-muted">({T('place.plot.optional')})</span></label>
      <input id="ct-plot-size" class="ct-plot-field" type="text" inputMode="decimal" autoComplete="off" value={text} placeholder={T('place.plot.placeholder', { area: example })}
        aria-describedby="ct-plot-note" aria-invalid={bad ? 'true' : undefined}
        onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)} onChange={(e) => commit((e.currentTarget as HTMLInputElement).value)} />
      <span id="ct-plot-note" class="ct-muted ct-small-text">{bad ? T('place.plot.bad', { area: example }) : T('place.plot.note')}</span>
    </p>
  );
}
function RoomStep() {
  const r = room.value;
  return (
    <section class="ct-step ct-panel" aria-labelledby="ct-room-h">
      <h2 class="ct-step-title" id="ct-room-h">{T('place.room.title')}</h2>
      <fieldset class="ct-seg ct-room">
        <legend class="ct-sr">{T('place.room.title')}</legend>
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
      <PlotSize />
    </section>
  );
}

// ---- What grows there already ----
function OwnPlants() {
  const taxa = memberTaxa.value;
  return (
    <section class="ct-step ct-panel" aria-labelledby="ct-own-h" data-place-plants>
      <h2 class="ct-step-title" id="ct-own-h">{T('place.plants.title')}</h2>
      <p class="ct-muted ct-step-lede">{T('place.plants.lede')}</p>
      {taxa.length > 0 && (
        <ul class="ct-own" aria-label={T('place.plants.title')}>
          {taxa.map((t) => (
            <li class="ct-own-chip">
              <span>{nameOf(t)}</span>
              <button type="button" class="link-button ct-link" aria-label={T('place.plants.remove', { name: nameOf(t) })} onClick={() => removeMember(t.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
      <p class="ct-own-acts">
        <button type="button" class="button button-secondary" data-place-add onClick={addOwnPlant}>{T('place.plants.add')}</button>
        <button type="button" class="link-button ct-link" onClick={() => openSheet('paste')}>{T('start.paste')}</button>
      </p>
    </section>
  );
}

// ---- Your spot (today's three questions, until PP-F) ----
const SPOT_QUESTIONS = { light: lights, soil: soils, water: waters } as const;
function SpotQuestions() {
  const s = site.value;
  const set = (k: keyof typeof SPOT_QUESTIONS, v: string) => { site.value = { ...site.value, [k]: v } as Site; };
  return (
    <section class="ct-step ct-panel" aria-labelledby="ct-site-h">
      <h2 class="ct-step-title" id="ct-site-h">{T('site.title')}</h2>
      <p class="ct-muted ct-step-lede">{T('site.intro')}</p>
      <div class="ct-site-grid">
        {(Object.keys(SPOT_QUESTIONS) as (keyof typeof SPOT_QUESTIONS)[]).map((k) => (
          <fieldset class="ct-seg">
            <legend>{T(`site.q.${k}`)}</legend>
            <div class="ct-seg-row">
              {SPOT_QUESTIONS[k].map((v) => (
                <label class={s[k] === v ? 'is-on' : ''}>
                  <input type="radio" name={`ct-site-${k}`} value={v} checked={s[k] === v} onChange={() => set(k, v)} />
                  <span>{T(`site.a.${k}.${v}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}

// ---- the arrival lines (Arrivals board) ----
// In one live region that stays on the page, so a line is never inserted with its region (A25).
function PlaceNotices() {
  const n = notices.value;
  const guide = n.guidePlant && pool.value?.find((x) => x.id === n.guidePlant);
  const saved = savedInstead.value;
  const theirs = linkPlace.value;
  const busy = answering.value;
  // A newer or unreadable link over a readable save: back to it (Arrivals board).
  const backMine = saved && (n.newer || n.unreadable) ? <>{' '}<button type="button" class="link-button ct-link" data-back-mine onClick={() => void openSavedInstead()}>{T('place.backToMine')}</button></> : null;
  return (
    <div class="ct-place-notices" role="status">
      {n.outdated && <p class="ct-notice" data-place-notice="outdated">{T('share.outdated')}</p>}
      {n.newer && (
        <p class="ct-notice" data-place-notice="newer">
          {T('place.newer')}{' '}
          <button type="button" class="link-button ct-link" onClick={() => location.reload()}>{T('place.reload')}</button>
          {backMine}
        </p>
      )}
      {n.unreadable && <p class="ct-notice" data-place-notice="unreadable">{T('place.unreadable')}{backMine}</p>}
      {n.period && <p class="ct-notice" data-place-notice="period">{T('place.period')}</p>}
      {n.cut && view.value === 'start' && <p class="ct-notice" data-place-notice="cut">{T('share.cut')}</p>}
      {n.failed && <p class="ct-notice" data-place-notice="failed">{T('share.failed')}</p>}
      {n.oldSave && <p class="ct-notice" data-place-notice="oldSave">{T('start.oldSave')}</p>}
      {n.guideMissing && <p class="ct-notice" data-place-notice="guideMissing">{T('start.guideMissing', { name: n.guideMissing, climate: zoneName(climate.value) })}</p>}
      {(guide || (saved && !backMine)) && (
        <p class="ct-notice ct-notice-calm" data-place-notice="guide">
          {guide && <>{T('place.guidePlant', { name: nameOf(guide), climate: zoneName(climate.value) })}{' '}</>}
          {saved && <button type="button" class="link-button ct-link" data-open-saved onClick={() => void openSavedInstead()}>{T('place.openSaved')}</button>}
        </p>
      )}
      {theirs && (
        <p class="ct-notice" data-place-notice="linkPlace">
          {T('place.linkPlace')}{' '}
          <span class="ct-notice-acts">
            <button type="button" class="button button-secondary ct-small" data-use-link-place disabled={busy} aria-busy={busy ? 'true' : undefined} onClick={() => void useLinkPlace()}>{T('place.useIt')}</button>
            <button type="button" class="button button-secondary ct-small" data-use-own-place disabled={busy} onClick={useOwnPlace}>{T('place.useMine')}</button>
          </span>
        </p>
      )}
    </div>
  );
}

// Head and the guide line name store.climate, not climateShown: a palette (and a guide preset's line)
// shows only under a chosen climate, where the two are the same.
function Head() {
  const n = members.value.length, z = climate.value;
  // A borrowed list not fitted to a place, or none at all: the palette suggests and swaps nothing
  // from it (store.offerPool), and says why here (b1a2-2).
  const why = z ? suggestBlock(z) : null;
  return (
    <div class="ct-result-head">
      <h2 class="ct-result-title">{T('start.yours')} <span class="ct-muted ct-result-sub">{P('start.count', n)} · {zoneName(climate.value)}</span></h2>
      <p class="ct-basis">
        <span>{basisLine(site.value)}</span>
        <button type="button" class="link-button ct-link" onClick={() => openSheet('place')}>{T('place.sheet.open')}</button>
        <button type="button" class="link-button ct-link" data-start-over onClick={startOver}>{T('start.over')}</button>
      </p>
      <LocationSlot compact />
      <CountryLine />
      {z && why && why !== 'nothingFits' && <PoolSlot zone={z} head />}
    </div>
  );
}

function PlaceForm() {
  const z = climateChosen.value;
  // The ct:start timing mark (F1a commit 0 seam, perf1), told on every render of the form; perf1 marks
  // once per page, after the paint. A plain call, not an effect: the empty seam costs the first run nothing.
  markStart();
  return (
    <div class="ct-start ct-place">
      <p class="ct-muted ct-place-lede">{T('place.lede')}</p>
      <LocationSlot />
      <CountryLine />
      <Climates />
      {z && <PoolSlot zone={z} />}
      {z && hasList(z) && (
        <>
          <RoomStep />
          <OwnPlants />
          <SpotQuestions />
          <div class="ct-cta">
            <button type="button" class="button button-primary" data-place-show onClick={showPalette}>{T('place.show')}</button>
          </div>
          {/* One rule for "can Suggest now" (PoolSlot suggestBlock): here only nothing-fits can block it, PoolSlot saying why. */}
          {!suggestBlock(z) && (
            <p class="ct-place-suggest">
              {T('place.none')}{' '}
              <button type="button" class="link-button ct-link" data-place-suggest aria-busy={pendingSuggest.value || restoring.value ? 'true' : undefined} onClick={() => requestSuggest()}>{T('start.suggest')}</button>
            </p>
          )}
          <p class="ct-muted ct-small-text">{T('page.hypothesis')}</p>
        </>
      )}
    </div>
  );
}

// ---- the "Your place" sheet (board ChangePlace, room and location parts; b1a review r1 conformance-4)
// ---- The palette's own place, changed in place: no draft, nothing set aside, so the palette follows
// each answer at once and no plant is removed. In its sheet frame (views/Sheets.tsx; Back closes it).
// The country line stays in the head behind it (one picker on the page). A climate with no list of its
// own here (Not covered yet, Needs your location) says why under the cards, with what Place offers
// (PoolSlot; fix round 1, b1a2-2). Its foot: "Start over" and "Done" (board ChangePlace; Done closes,
// as Close does).
export function PlaceSheet({ Frame }: { Frame: Frame }) {
  const z = climate.value;
  return (
    <Frame titleId="ct-place-sheet-h" foot={
      <div class="ct-add-bar" data-place-sheet-foot>
        <button type="button" class="link-button ct-link" onClick={startOver}>{T('start.over')}</button>
        <button type="button" class="button button-primary" onClick={closeSheet}>{T('place.sheet.done')}</button>
      </div>
    }>
      <div class="ct-start ct-place">
        <div>
          <h2 id="ct-place-sheet-h" tabIndex={-1} data-autofocus>{T('place.sheet.title')}</h2>
          <p class="ct-muted ct-place-lede">{T('place.sheet.lede')}{members.value.length > 0 && <> {P('place.sheet.kept', members.value.length)}</>}</p>
        </div>
        <LocationSlot />
        <Climates />
        {z && <PoolSlot zone={z} />}
        <RoomStep />
        <SpotQuestions />
      </div>
    </Frame>
  );
}

export function Place() {
  const waiting = pendingSuggest.value || restoring.value;
  return (
    <>
      <PlaceNotices />
      {view.value === 'start' ? <PlaceForm /> : <Head />}
      {/* Always on the page, empty when nothing loads (A25); it also says what a notice's answer did. */}
      <p class="status-line ct-place-status" role="status">{view.value === 'start' && waiting ? T('load.plants') : placeSaid.value}</p>
    </>
  );
}
