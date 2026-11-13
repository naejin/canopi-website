// Opening a link or the save, a guide preset, and the site location a page brings (stream S4, P5
// S5b; E6 S2 split it out of memory.ts). A restore reads everything first and changes no store
// signal until it applies, in one batch, and only if it is still the newest restore and the reader
// has not acted since it began (persist.ts keeps the restore in flight and the reader's actions).
// Saving never waits for it: the store watcher saves every change (persist.ts watchStore), so nothing
// has to be cleared on the way out for saving to work again.
import { batch, effect, signal } from '@preact/signals';
import type { ClimateZone, DecodedLink, Interaction, LinkNotice, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { decodeLink, linkClimates, linkOrigin, zoneOf, LINK_VERSION } from '../../../lib/consortium/index.ts';
import type { CountrySource } from '../store.ts';
import * as store from '../store.ts';
import { state as schema } from './schema.ts';
import { actionCount, attempt, inFlight, memory, quietly, writeAddress, LOCATION_STORE, type CountryFrom } from './persist.ts';
import { lookingThrough } from './lookups.ts';

// The notices a link (or the save) left for the reader (Actions shows them; Start shows `outdated`).
// pasted: a link pasted while a consortium was shown that changed nothing (older version, cut with
// no climate, its plant list not loaded); failed: a link or the save whose plant list did not load.
type PastedProblem = 'outdated' | 'cut' | 'failed';
export interface Notices extends LinkNotice { oldSave: boolean; guideMissing: string | null; guideKept: PlantId | null; pasted: PastedProblem | null; failed: boolean }
export const NO_NOTICES: Notices = { unknownCount: 0, cut: false, outdated: false, oldSave: false, guideMissing: null, guideKept: null, pasted: null, failed: false };
export const notices = signal<Notices>({ ...NO_NOTICES });

// ---- the site location a page brings (P5 S5b) ----

// The location step (state/location.ts, in the lazy location chunk) as the first run calls it. Its
// loader is handed in by the view that owns the chunk (views/location/load.ts), so island state
// never imports a view, statically or through import() (ADR-1 L2), and no cycle closes through it.
export interface LocationSettle { settle(how: 'link' | 'saved', saved: string | null): Promise<void> }
let loadStep: (() => Promise<LocationSettle>) | null = null;
// Returns the loader it replaces (a test puts it back).
export const provideLocationStep = (load: (() => Promise<LocationSettle>) | null): (() => Promise<LocationSettle>) | null => {
  const before = loadStep;
  loadStep = load;
  return before;
};
// None handed in (a view that never loaded): said in the console, never silent; the link's location
// then goes as a failed load leaves it.
const stepLoaded = (): Promise<LocationSettle> => {
  if (loadStep) return loadStep();
  attempt(() => console.error('Consortium: no location step was provided; the location is not looked up'));
  return Promise.reject(new Error('no location step'));
};

// The location chunk looks up store.location (a link's `o=`, or the saved location) and settles it.
// how: 'link' (the link's answers win; no country, no suggestion) or 'saved' (looked up again; saved:
// the stored record's text, read by the chunk, state/location.ts readLocation).
// One lookup is held from the chunk load through its settle (lookingThrough).
function settleLocation(how: 'link' | 'saved', saved: string | null = null): Promise<void> {
  return lookingThrough(stepLoaded, (m) => m.settle(how, saved)).catch(() => {
    if (how === 'link') store.location.value = null;
  });
}
// The reader's own saved site, looked up again while no other location is set. One rule for a fresh
// open and a link pasted into the open tab (seam review 5): a link without `o=` leaves the reader's own
// site in place (their checks are about their site; the link's plants are unchanged); only a link's
// `o=` stands in for it, for that page.
// Once at a time: a fresh link without `o=` asks at startup and again when it opens (seam review
// round 2, 3), and the second ask while the first is looked up would read the tiles again.
let ownLookup: Promise<void> | null = null;
export function ownLocation(): void {
  if (ownLookup || store.location.peek()) return;
  const saved = memory.read(LOCATION_STORE);
  if (saved) ownLookup = settleLocation('saved', saved).finally(() => { ownLookup = null; });
}

// ---- restoring a link or the save ----

// Applies a decoded link or save to the store, in one batch, and opens the result.
function applyDecoded(d: DecodedLink, countryFrom: Extract<CountrySource, 'link' | 'chosen'>): void {
  batch(() => {
    schema.apply(d.state, { countryFrom });
    store.view.value = 'matrix';
    // A sheet left open would show a plant of the consortium replaced (X8).
    store.closeSheet();
  });
}

// The ids each climate's list holds, for the link's tokens. Lists already read come from the store;
// the others are read here, not through store.loadPool, whose failure is app-wide (App then shows the
// load screen in place of the consortium): a link whose list cannot be read only gets its notice.
// The store's caches are written once every list is read.
async function knownFor(zones: ClimateZone[]): Promise<Partial<Record<ClimateZone, PlantId[]>> | null> {
  const src = store.source.peek();
  if (!src) return null;
  const out: Partial<Record<ClimateZone, PlantId[]>> = {};
  const read: Partial<Record<ClimateZone, [Taxon[], Interaction[]]>> = {};
  try {
    for (const z of zones) {
      const have = store.pools.peek()[z];
      if (have) { out[z] = have.map((t) => t.id); continue; }
      const [plants, rows] = await Promise.all([src.pool(z), src.interactions(z)]);
      read[z] = [plants, rows];
      out[z] = plants.map((t) => t.id);
    }
  } catch (err) {
    attempt(() => console.error(`Consortium link: ${(err as Error).message}`));
    return null;
  }
  if (store.source.peek() !== src) return null;
  const fresh = Object.entries(read) as [ClimateZone, [Taxon[], Interaction[]]][];
  if (fresh.length) batch(() => {
    store.pools.value = { ...store.pools.peek(), ...Object.fromEntries(fresh.map(([z, [p]]) => [z, p])) };
    store.interactionSets.value = { ...store.interactionSets.peek(), ...Object.fromEntries(fresh.map(([z, [, r]]) => [z, r])) };
  });
  return out;
}

export const waitForSource = (): Promise<void> => new Promise((resolve) => {
  const stop = effect(() => { if (store.source.value) { queueMicrotask(() => stop()); resolve(); } });
});

let restoreGen = 0;
// Ends the restore in flight without applying it (a newer link that was refused).
function cancelRestore(): void {
  restoreGen++;
  inFlight.value = null;
}

export interface RestoreOptions { from: 'link' | 'saved'; src?: CountryFrom; keep?: boolean }
// Restores a fragment (a link or the save) once its climates are read. Returns whether it opened.
// src: the saved country's source (a save's country that came from a link keeps that label).
// keep: a consortium is shown (a link pasted into the open tab, Back/Forward): a link that cannot
// open changes nothing, says so where the reader is, and the address goes back to the consortium shown.
export async function restore(fragment: string, { from, src = null, keep = false }: RestoreOptions): Promise<boolean> {
  const refuse = (problem: PastedProblem, notice: Partial<Notices>): false => {
    if (keep) { notices.value = { ...notices.peek(), pasted: problem }; writeAddress(true); }
    else notices.value = { ...notices.peek(), ...notice };
    return false;
  };
  // Refusals take no restore number, never touch saving, and cancel the restore in flight: the
  // latest link wins even when it cannot open, and its notice stays.
  const v = new URLSearchParams(fragment).get('v');
  if (v !== null && v !== String(LINK_VERSION)) {
    cancelRestore();
    // Another version: on Start, the climate it names (decodeLink still reads it; a link, not the
    // reader acting) and the notice.
    if (!keep && from === 'link') {
      const d = decodeLink(fragment, {});
      if (d.state.climate) quietly(() => { store.climate.value = d.state.climate; });
    }
    return refuse('outdated', from === 'link' ? { outdated: true } : { oldSave: true });
  }
  // A link with no climate (cut before it, or edited): the cut notice, and nothing opens (review 7).
  const climate = zoneOf(new URLSearchParams(fragment).get('c'));
  if (!climate) { cancelRestore(); return refuse('cut', { cut: true }); }

  const id = ++restoreGen;
  const began = actionCount();
  const current = (): boolean => id === restoreGen && actionCount() === began;
  inFlight.value = { id, climate: keep ? null : climate, from };
  try {
    await waitForSource();
    if (!current()) return false;
    const known = await knownFor(linkClimates(fragment));
    if (!current()) return false;
    if (!known) return refuse('failed', { failed: true });
    const d = decodeLink(fragment, known);
    // A link's site location (`o=`, P5 S5b): set in the same batch, its lookup still to come, so the
    // link's climate, site answers and country stay as the link says; the lookup (the location chunk)
    // fills in the climate facts only, labelled "from the shared link, approximate".
    const origin = from === 'link' ? linkOrigin(fragment) : null;
    // One batch; the watcher then saves it and writes the address (plants no longer in the list are
    // left out of the address, §5).
    quietly(() => batch(() => {
      applyDecoded(d, from === 'link' || src === 'link' ? 'link' : 'chosen');
      // A climate is chosen now: a card the saved site proposed while this opened goes (seam review
      // round 3, 1); only a restore that fails leaves it. One the reader's own locating proposed stays
      // (round 4, 2).
      if (store.proposedFromSave.peek()) { store.proposedClimate.value = null; store.proposedFromSave.value = false; }
      notices.value = { ...notices.peek(), unknownCount: d.notice.unknownCount, cut: d.notice.cut, pasted: null, failed: false };
      if (origin) store.location.value = { lat: origin.lat, lon: origin.lon, source: 'link', lookup: null };
      // A link without `o=` (pasted into the tab): an earlier link's location goes with it, so no
      // stale line shows and Share cannot attach its cell (review round 1, 2). The reader's own stays.
      else if (from === 'link' && store.location.peek()?.source === 'link') store.location.value = null;
    }));
    if (origin) void settleLocation('link');
    // ... and comes back if a link's location had replaced it: as a fresh open of this link gives.
    else if (from === 'link') ownLocation();
    return true;
  } finally {
    if (inFlight.peek()?.id === id) inFlight.value = null;
  }
}

// A guide preset: the climate for this consortium only (never the shared site climate), and the
// guide's plant kept: a main crop when it is a food plant of that list, else a kept plant. The plant
// applies only if the reader has not acted while it was read (another card, a crop: pre-push review 2).
export async function applyPreset(climate: ClimateZone, plant: string | null): Promise<void> {
  store.climate.value = climate;
  if (!plant) return;
  const began = actionCount();
  await waitForSource();
  const pool = await store.loadPool(climate);
  if (!pool || actionCount() !== began || store.climate.peek() !== climate) return;
  const t = pool.find((x) => x.canonical_name === plant);
  if (!t) { notices.value = { ...notices.peek(), guideMissing: plant }; return; }
  // The guide's plant is the guide's choice, not the reader acting.
  quietly(() => batch(() => {
    if (t.role === 'crop') store.crops.value = [t.id];
    store.kept.value = [...new Set([...store.kept.peek(), t.id])];
    notices.value = { ...notices.peek(), guideKept: t.id };
  }));
}
