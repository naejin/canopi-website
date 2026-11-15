// Start's draft and the reader's moves around it (stream S4; E6 S2 split it out of memory.ts): the
// climate card and the country the reader picks, backToPlace (the palette set aside when the reader
// goes back to Place, a draft seeded from it), Start over (with one Undo), Show my palette and Add a
// plant; the answers to the arrival notices (PP-B b1a): "Use it" / "Use my own place" for a link's place
// and "Open my saved palette instead". (The palette's place changes in place in the "Your place" sheet,
// views/place/Place.tsx PlaceSheet, which sets nothing aside: b1a review r1 conformance-4.)
// The consortium and the draft are two states (persist.ts); plants the reader adds or removes on Place
// make the draft the palette, saved at once (owner 2026-11-15).
import { batch, signal } from '@preact/signals';
import type { ClimateZone, PlantId } from '../../../lib/consortium/index.ts';
import { siteIdOf } from '../../../lib/consortium/index.ts';
import * as store from '../store.ts';
import { focusView } from '../focus.ts';
import { state as schema } from './schema.ts';
import { T } from '../strings.ts';
import { adoptPending, attempt, holdSave, linkPlace, memory, own, placeSaid, placeSeed, quietly, release, saveHeld, setPlaceBase, writeSave, COUNTRY_STORE, NO_COUNTRY, PLACE_STORE, SITE_CLIMATE } from './persist.ts';
import { adoptLinkLocation, notices, ownLocation, restore, savedInstead, NO_NOTICES } from './restore.ts';
import { letGo } from './lookups.ts';

// The country picker on the country line is open.
export const pickingCountry = signal(false);
// What the last answer to an arrival notice did, for Place's status line (persist.ts keeps it, so the
// reader's next action and the next arrival clear it).
export { placeSaid };
// An answer to the link-place notice is still working ("Use it" waits for the location step): both
// buttons are disabled, so the other answer never lands half-way through it.
export const answering = signal(false);

// The reader picks a climate (Place, or the "Your place" sheet): the shared site climate is written
// (climate-ux; v1 setClimate). The plants stay: changing the place never removes a plant (board
// ChangePlace; b1a review r1 conformance-4), and each is still drawn, checked and saved (fix round
// 1, b1a2-1): one the new climate's list lacks becomes a guest of the climate it was in.
export function chooseClimate(z: ClimateZone): void {
  const was = store.climate.peek();
  batch(() => {
    store.climate.value = z;
    store.guests.value = homesAfter(was, z);
  });
  memory.write(SITE_CLIMATE, siteIdOf(z));
  attempt(() => { document.documentElement.dataset.climate = siteIdOf(z); });
  // Judged against the list once read (the usual first click is before it is): a plant it holds is
  // one of its own, not a guest (fix round 2, B).
  if (!store.pools.peek()[z]) void store.loadPool(z).then((list) => { if (list && store.climate.peek() === z) store.guests.value = ownAgain(list); });
}

// Each member's home list once the climate goes from `was` to `z`: a guest of z is one of z's own
// again; one of was's own that z's list lacks becomes a guest of was (each of them while z's list is
// not read, so no plant loses its list; chooseClimate then keeps only those the list lacks).
function homesAfter(was: ClimateZone | null, z: ClimateZone): Partial<Record<PlantId, ClimateZone>> {
  const now = store.guests.peek(), list = store.pools.peek()[z];
  const next: Partial<Record<PlantId, ClimateZone>> = {};
  for (const id of store.members.peek()) {
    const from = now[id];
    if (from) next[id] = from;
    else if (was && was !== z) next[id] = was;
  }
  return list ? ownAgain(list, next) : same(now, next);
}
// The guests without those `list` (the chosen climate's) holds.
function ownAgain(list: readonly { id: PlantId }[], guests = store.guests.peek()): Partial<Record<PlantId, ClimateZone>> {
  const inList = new Set(list.map((t) => t.id));
  const next: Partial<Record<PlantId, ClimateZone>> = {};
  for (const [id, from] of Object.entries(guests)) if (from && !inList.has(id)) next[id] = from;
  return same(store.guests.peek(), next);
}
// `now` itself when `next` holds the same entries (a new object would rebuild every guest's record).
function same(now: Partial<Record<PlantId, ClimateZone>>, next: Partial<Record<PlantId, ClimateZone>>): Partial<Record<PlantId, ClimateZone>> {
  return Object.keys(next).length === Object.keys(now).length && Object.entries(next).every(([id, from]) => now[id] === from) ? now : next;
}

// The reader chooses a country (null: "No country"); kept on this device, apart from the consortium.
export function chooseCountry(code: string | null): void {
  store.country.value = { code, source: 'chosen' };
  memory.write(COUNTRY_STORE, code ?? NO_COUNTRY);
  pickingCountry.value = false;
}

// Back to Place, Start over, Start empty: the "not read" note goes, and a link's location goes with
// its consortium (review round 2, 4), its lookup dropped (round 3, 2: no line, hold or later write).
const dropLinkLocation = () => { const link = store.location.peek()?.source === 'link'; letGo(link); if (link) store.location.value = null; };
// Back to Place from the palette (its "Your place" step, the phone's Back): the consortium set aside,
// Start's draft seeded from it.
export function backToPlace(): void {
  placeSaid.value = '';
  batch(() => {
    dropLinkLocation();
    const aside = own();
    setPlaceBase(aside?.members ?? []);
    store.setAside.value = aside;
    store.view.value = 'start';
  });
}

// Place's climate cards opened by the page (a climate chosen and no location): latched, so a location
// that comes later (the saved location's lookup, about a second after load) never closes cards already
// open under the grower's thumb (review round 2, 1). Place writes it; Start over lets the page decide
// the cards afresh (review round 3, 1).
export const cardsLatched = signal(false);

// Start over: the consortium goes, from the store, the save and the address; the climate, the
// palette's place and the country stay. One Undo puts it back (with its save).
// On a link's or a guide's page whose save is still held (the reader's own save R untouched), R stays,
// and the Undo puts the page back as it was, R still held (S3).
export function startOver(): void {
  const before = schema.snapshot(), wasHeld = saveHeld();
  placeSaid.value = '';
  cardsLatched.value = false;
  setPlaceBase([]);
  if (!wasHeld) writeSave(null);
  batch(() => {
    store.setAside.value = null;
    schema.write(schema.valuesOf(schema.lists.plants));
    store.closeSheet();
    store.view.value = 'start';
    dropLinkLocation();
    notices.value = { ...NO_NOTICES };
  });
  if (before.members.length || before.removed.length || Object.keys(before.guests).length) {
    store.offerUndo(T('place.overDone'), before, null, [], wasHeld ? (put) => { holdSave(true); quietly(put); } : undefined);
  }
}

// ---- the arrival notices' answers (plant-palette-architecture 8.3) ----

// "Use it": the link's place becomes the palette's (the save's place), its cell the reader's own
// location on this device and its country the reader's choice, so they hold across reloads; the
// place answers then seed the next palette.
// The location step comes first; nothing is written until it is back and the notice still waits.
export async function useLinkPlace(): Promise<void> {
  const pending = linkPlace.peek();
  if (!pending || answering.peek()) return;
  answering.value = true;
  try {
    // Kept on this device unless the link's cell could not be (the location chunk failed, or storage
    // refused it): the line then says so (review round 2, 4).
    const kept = store.location.peek()?.source === 'link' ? await adoptLinkLocation() : true;
    if (linkPlace.peek() !== pending) return;
    const c = store.country.peek();
    if (c.code && c.source === 'link') chooseCountry(c.code);
    const seeded = memory.write(PLACE_STORE, placeSeed());
    linkPlace.value = null;
    release();
    answered(T(kept && seeded ? 'place.usedLink' : 'place.usedLinkUnkept'));
  } finally { answering.value = false; }
}

// "Use my own place": the reader's own spot, soil and country come back, the link's location goes and
// the reader's own is looked up again.
export function useOwnPlace(): void {
  const pending = linkPlace.peek();
  if (!pending || answering.peek()) return;
  batch(() => {
    store.spot.value = pending.own.spot;
    store.soil.value = pending.own.soil;
    store.country.value = pending.own.country;
    dropLinkLocation();
    linkPlace.value = null;
  });
  release();
  ownLocation();
  answered(T('place.usedMine'));
}

// "Open my saved palette instead" (a guide preset opened over a saved palette) and "Back to mine" (a
// newer or unreadable link over one): the save restored as on a visit with no link.
export async function openSavedInstead(): Promise<void> {
  const saved = savedInstead.peek();
  if (!saved) return;
  savedInstead.value = null;
  notices.value = { ...notices.peek(), guidePlant: null, guideMissing: null, newer: false, unreadable: false };
  if (await restore(saved.fragment, { from: 'saved', src: saved.src, place: saved.place })) answered(T('place.openedSaved'));
}
// An answer given: said on Place's status line, the focus on the view (never on <body>).
function answered(line: string): void {
  placeSaid.value = line;
  focusView();
}

// "Start empty and search" (the pool panel's "nothing fits" line): an empty palette and S3's search
// sheet.
export function startEmpty(): void {
  adoptPending();
  batch(() => {
    dropLinkLocation();
    store.members.value = [];
    store.view.value = 'matrix';
    store.openSheet('search');
  });
}

// "Show my palette": the palette with the grower's own plants (none is a valid start); the focus goes
// to it (W4). A palette set aside on the way back to Place that this draft replaces (another card, a
// plant added or removed on Place) gets one Undo, which goes back to Place with it still set aside.
export function showPalette(): void {
  const before = schema.snapshot();
  const aside = store.setAside.peek();
  adoptPending();
  store.view.value = 'matrix';
  focusView();
  const replaced = !!aside?.members.length && (aside.climate !== store.climate.peek() || JSON.stringify(aside.members) !== JSON.stringify(store.members.peek()));
  if (replaced) store.offerUndo(T('place.asideReplaced'), before);
}

// "Add a plant by name" on Place: the search sheet (S3); a plant added joins the list on Place
// (store.ts addMembers leaves the view alone; b1a review r1 conformance-2).
export function addOwnPlant(): void {
  adoptPending();
  store.openSheet('search');
}
