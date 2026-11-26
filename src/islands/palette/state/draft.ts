// Place and the reader's moves around it (stream S4; E6 S2 split it out of memory.ts): the climate
// card and the country the reader picks, leavePalette and backToPlace (the head's step 1), Start over
// (with one Undo), Show my palette and Add a plant; the answers to the arrival notices (PP-B b1a):
// "Use it" / "Use my own place" for a link's place and "Open my saved palette instead".
// Place and the palette page show one palette: Place's answers and plants change it as they are given,
// saved at once while the page owns the save (state/save.ts held; owner 2026-11-15).
import { batch, signal } from '@preact/signals';
import type { ClimateZone, PlantId } from '../../../lib/palette/index.ts';
import { siteIdOf } from '../../../lib/palette/index.ts';
import * as store from '../store.ts';
import { focusAfterStartOver, focusView } from '../focus.ts';
import { state as schema } from './schema.ts';
import { P, T } from '../strings.ts';
import { adoptPending, attempt, linkPlace, memory, placeSaid, COUNTRY_STORE, NO_COUNTRY, SITE_CLIMATE } from './persist.ts';
import { adoptLinkLocation, notices, ownLocation, NO_NOTICES } from './restore.ts';
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
}

// Each member's home list once the climate goes from `was` to `z`: a guest of z is one of z's own
// again; one of was's own that z's list lacks becomes a guest of was (each of them while z's list is
// not read, so no plant loses its list: a plant in both is drawn from z's own list either way,
// store.ts guestTaxa, and the save leaves out a guest z's list holds, persist.ts palette).
function homesAfter(was: ClimateZone | null, z: ClimateZone): Partial<Record<PlantId, ClimateZone>> {
  const now = store.guests.peek(), list = store.pools.peek()[z];
  const inZ = list ? new Set(list.map((t) => t.id)) : null;
  const next: Partial<Record<PlantId, ClimateZone>> = {};
  for (const id of store.members.peek()) {
    const from = now[id];
    if (from) { if (from !== z) next[id] = from; }
    else if (was && was !== z && !inZ?.has(id)) next[id] = was;
  }
  const same = Object.keys(next).length === Object.keys(now).length && Object.entries(next).every(([id, from]) => now[id] === from);
  return same ? now : next;
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
// "Your place" from the palette step (the head's step 1): back in history past the palette step's
// entry, and any sheet's above it, when the page pushed it (store.leaveEntry: the next Back then leaves
// the page), else the step itself.
export function leavePalette(): void {
  if (!store.leaveEntry('palette')) backToPlace();
}

// Back to Place from the palette (its "Your place" step, the phone's Back): the same palette, on Place.
export function backToPlace(): void {
  placeSaid.value = '';
  batch(() => {
    dropLinkLocation();
    store.view.value = 'start';
  });
}

// Start over: the consortium goes, from the store, the save and the address; the climate, the
// palette's place and the country stay. The page holds again: a save it owned is removed (unless
// another tab wrote since), one it held (a link's or a guide's page over the reader's save) stays. One
// Undo puts it back, with its save (store.ts offerUndo).
export function startOver(): void {
  const before = store.snapshot();
  placeSaid.value = '';
  batch(() => {
    schema.write(schema.valuesOf(schema.lists.plants));
    store.view.value = 'start';
    dropLinkLocation();
    notices.value = { ...NO_NOTICES };
  });
  // Board Toasts "Palette cleared: 8 plants. Your place is kept." with its Undo, for a palette with
  // plants; none left (each removed already), nothing to count and no toast (h2 R7: never "0 plants").
  if (before.members.length) store.offerUndo(P('place.cleared', before.members.length), before);
  // Its button leaves with the palette: the toast's Undo, else Place's heading (pre-push fix 6, B).
  focusAfterStartOver();
}

// ---- the arrival notices' answers (plant-palette-architecture 8.3) ----

// "Use it": the link's place becomes the palette's, its cell the reader's own location on this device
// and its country the reader's choice, so they hold across reloads; the place answers then seed the
// next palette. The save is left as it is: the place reaches it with the first plant change (owner
// 2026-11-15, decision 2).
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
    linkPlace.value = null;
    answered(T(kept ? 'place.usedLink' : 'place.usedLinkUnkept'));
  } finally { answering.value = false; }
}

// "Use my own place": the reader's own values and country come back, the link's location goes and
// the reader's own is looked up again.
export function useOwnPlace(): void {
  const pending = linkPlace.peek();
  if (!pending || answering.peek()) return;
  batch(() => {
    store.siteEdits.value = pending.own.siteEdits;
    store.country.value = pending.own.country;
    dropLinkLocation();
    linkPlace.value = null;
  });
  ownLocation();
  answered(T('place.usedMine'));
}

// An answer given: said on Place's status line, the focus on the view (never on <body>).
function answered(line: string): void {
  placeSaid.value = line;
  focusView();
}

export function showPalette(): void {
  adoptPending();
  store.view.value = 'matrix';
  focusView();
}
