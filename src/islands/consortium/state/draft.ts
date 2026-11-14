// Start's draft and the reader's moves around it (stream S4; E6 S2 split it out of memory.ts): the
// climate card and the country the reader picks, Change site (the consortium set aside, a draft
// seeded from it), Back to your palette, Start over (with one Undo), Show my palette and Add a plant; the answers to
// the arrival notices (PP-B b1a): "Use it" / "Use my own place" for a link's place and "Open my saved
// palette instead".
// The consortium and the draft are two states (persist.ts): the draft never changes the consortium or
// the save.
import { batch, computed, effect, signal } from '@preact/signals';
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { siteIdOf } from '../../../lib/consortium/index.ts';
import * as store from '../store.ts';
import { focusView } from '../focus.ts';
import { state as schema } from './schema.ts';
import { T } from '../strings.ts';
import { adoptPending, attempt, linkPlace, memory, own, placeSaid, placeSeed, release, writeSave, COUNTRY_STORE, NO_COUNTRY, PLACE_STORE, SITE_CLIMATE } from './persist.ts';
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

// The reader picks a climate on Start: the shared site climate is written (climate-ux; v1 setClimate).
// With a consortium set aside, the draft follows the card: the consortium's own card seeds it from
// the consortium again, another card starts it empty (its plants are that card's).
export function chooseClimate(z: ClimateZone): void {
  const aside = store.view.peek() === 'start' ? own() : null;
  batch(() => {
    store.climate.value = z;
    if (aside) schema.write(schema.valuesOf(schema.lists.plants, aside.climate === z ? aside : undefined));
  });
  memory.write(SITE_CLIMATE, siteIdOf(z));
  attempt(() => { document.documentElement.dataset.climate = siteIdOf(z); });
}

// The reader chooses a country (null: "No country"); kept on this device, apart from the consortium.
export function chooseCountry(code: string | null): void {
  store.country.value = { code, source: 'chosen' };
  memory.write(COUNTRY_STORE, code ?? NO_COUNTRY);
  pickingCountry.value = false;
}

// Change site, Start over, Start empty: the "not read" note goes, and a link's location goes with
// its consortium (review round 2, 4), its lookup dropped (round 3, 2: no line, hold or later write).
const dropLinkLocation = () => { const link = store.location.peek()?.source === 'link'; letGo(link); if (link) store.location.value = null; };
// Change site: the consortium set aside, Start's draft seeded from it.
export function changeSite(): void {
  placeSaid.value = '';
  batch(() => {
    dropLinkLocation();
    store.setAside.value = own();
    store.view.value = 'start';
  });
}

// ---- one Undo for a move made on Place ----
// The toast's Undo puts the palette back as it was (schema.snapshot); any later change to what Undo
// covers (schema.lists.endsUndo) ends the offer, so Undo never puts a palette back over new work.
// (store.ts keeps its own offerUndo private; this is the same rule for Place's moves.)
let undoAfter: ReturnType<typeof schema.peek<(typeof schema.lists.endsUndo)[number]>> | null = null;
let undoWatch = false;
export function offerPlaceUndo(text: string, before: ReturnType<typeof schema.snapshot>): void {
  if (!undoWatch) {
    undoWatch = true;
    effect(() => {
      const now = schema.track(schema.lists.endsUndo);
      const after = undoAfter;
      if (!after || !schema.lists.endsUndo.some((k) => now[k] !== after[k])) return;
      undoAfter = null;
      if (store.toast.peek()?.undo) store.hideToast();
    });
  }
  undoAfter = schema.peek(schema.lists.endsUndo);
  store.showToast(text, () => { undoAfter = null; schema.restore(before); });
}

// Start over: the consortium goes, from the store, the save and the address; the climate, the
// palette's place and the country stay. One Undo puts it back (with its save).
export function startOver(): void {
  const before = schema.snapshot();
  placeSaid.value = '';
  writeSave(null);
  batch(() => {
    store.setAside.value = null;
    schema.write(schema.valuesOf(schema.lists.plants));
    store.closeSheet();
    store.view.value = 'start';
    dropLinkLocation();
    notices.value = { ...NO_NOTICES };
  });
  if (before.members.length || before.removed.length || Object.keys(before.guests).length) offerPlaceUndo(T('place.overDone'), before);
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

// "Back to your consortium" from Start: the draft discarded, the consortium shown in its own climate
// again, whatever card was chosen since "Change site", with its own site answers and country
// (F1, R2-4, R4-3); the focus goes to the view (W4).
export const canGoBack = computed(() => store.view.value === 'start' && store.setAside.value !== null);
export function backToConsortium(): void {
  const aside = own();
  batch(() => {
    if (aside) {
      // Its climate and plants (chooseClimate seeds the plants from it), then the rest of it.
      chooseClimate(aside.climate);
      schema.write(aside);
    }
    store.view.value = 'matrix';
  });
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
// to it (W4). A palette set aside on Change site that this draft replaces (another card emptied it)
// gets one Undo, which goes back to Place with it still set aside.
export function showPalette(): void {
  const before = schema.snapshot();
  const aside = store.setAside.peek();
  adoptPending();
  store.view.value = 'matrix';
  focusView();
  const replaced = !!aside?.members.length && (aside.climate !== store.climate.peek() || JSON.stringify(aside.members) !== JSON.stringify(store.members.peek()));
  if (replaced) offerPlaceUndo(T('place.asideReplaced'), before);
}

// "Add a plant by name" on Place: the search sheet (S3); a plant added opens the palette (store.ts
// addMembers).
export function addOwnPlant(): void {
  adoptPending();
  store.openSheet('search');
}
