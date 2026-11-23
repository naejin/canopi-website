// Opening a link or the save, a guide preset, and the site location a page brings (stream S4, P5
// S5b; E6 S2 split it out of memory.ts). A restore reads everything first and changes no store
// signal until it applies, in one batch, and only if it is still the newest restore and the reader
// has not acted since it began (persist.ts keeps the restore in flight and the reader's actions).
// Saving never waits for it: the store watcher saves every change (persist.ts watchStore), so nothing
// has to be cleared on the way out for saving to work again.
import { batch, effect, signal } from '@preact/signals';
import type { ClimateZone, DecodedLink, Interaction, LinkNotice, LinkOrigin, Locale, PlantId, PlantSource, Taxon } from '../../../lib/palette/index.ts';
import { nameOf, pageLang } from '../strings.ts';
import { bringsPlace, decodeLink, linkClimates, linkOrigin, linkPlaceName, linkVersionStatus, NO_EDITS, sameEdits, snapOrigin, zoneOf } from '../../../lib/palette/index.ts';
import type { Country, CountrySource } from '../store.ts';
import * as store from '../store.ts';
import { state as schema } from './schema.ts';
import { actionCount, attempt, holdSave, inFlight, linkPlace, memory, placeSaid, quietly, savedInstead, writeAddress, LOCATION_STORE, SUGGESTED_KEY, type CountryFrom, type OwnPlace } from './persist.ts';
import { lookingThrough } from './lookups.ts';

// The notices a link (or the save) left for the reader (Place shows them).
// newer, unreadable and period (link v5, plant-palette-architecture 8.2) are set here.
// guidePlant: the plant a guide preset put in the palette (8.3; not "kept").
// pasted: a link pasted while a consortium was shown that changed nothing (unreadable: cut, damaged,
// no climate or another version, one message as v14 Arrivals gives it; or its plant list not loaded);
// failed: a link or the save whose plant list did not load. `newer` stays false: the core's LinkNotice
// still carries it, but restore() refuses every other version as unreadable (C2).
type PastedProblem = 'unreadable' | 'failed';
export interface Notices extends LinkNotice { guideMissing: string | null; guidePlant: PlantId | null; pasted: PastedProblem | null; failed: boolean }
export const NO_NOTICES: Notices = { unknownCount: 0, cut: false, newer: false, unreadable: false, period: false, guideMissing: null, guidePlant: null, pasted: null, failed: false };
export const notices = signal<Notices>({ ...NO_NOTICES });
// A link that brings a place (persist.ts keeps the signal, below this module, so the save follows it),
// and the save to go back to (persist.ts derives it from the held save).
export { linkPlace, savedInstead };

// ---- the site location a page brings (P5 S5b) ----

// The location step (state/location.ts, in the lazy location chunk) as the first run calls it. Its
// loader is handed in by the view that owns the chunk (views/location/load.ts), so island state
// never imports a view, statically or through import() (ADR-1 L2), and no cycle closes through it.
// adopt: "Use it" on a link's place keeps the link's cell as the reader's own location (8.3); whether
// it was kept on this device.
export interface LocationSettle { settle(how: 'link' | 'saved', saved: string | null): Promise<void>; adopt(): boolean }
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
// "Use it": the link's cell kept as the reader's own location, through the location step. Whether it
// was kept on this device (false: the chunk did not load, or storage refused it).
export const adoptLinkLocation = (): Promise<boolean> => stepLoaded().then((m) => m.adopt(), () => false);

// The reader's own site, as a link's cell is compared with it (8.3): their location on the page (never
// a link's), else the one kept on this device (canopi-location; a link's `o=` stands in for it on the
// page before it is looked up again), else none. text: canopi-location as already read (startMemory
// reads it once), else it is read here.
export function ownCell(text?: string | null): LinkOrigin | null {
  const at = store.location.peek();
  if (at && at.source !== 'link') return { lat: at.lat, lon: at.lon };
  const kept = attempt(() => JSON.parse((text === undefined ? memory.read(LOCATION_STORE) : text) ?? 'null') as { lat?: unknown; lon?: unknown } | null);
  return kept && typeof kept.lat === 'number' && typeof kept.lon === 'number' ? { lat: kept.lat, lon: kept.lon } : null;
}

// A location kept on this device whose lookup is still on the way (set by arrival.ts openWith, when the
// page will look it up; cleared when that lookup settles, found or not, and by Forget): Place counts it
// as a place meanwhile, so the climate cards never close under the grower when the lookup comes back
// (review round 2, 1), and open once nothing stands for a place any more (review round 3, 1).
export const locationAtStart = signal(false);

// The reader's own saved site, looked up again while no other location is set. One rule for a fresh
// open and a link pasted into the open tab (seam review 5): a link without `o=` leaves the reader's own
// site in place (their checks are about their site; the link's plants are unchanged); only a link's
// `o=` stands in for it, for that page.
// Once at a time: a fresh link without `o=` asks at startup and again when it opens (seam review
// round 2, 3), and the second ask while the first is looked up would read the tiles again.
// text: canopi-location as startMemory read it (so a plain open reads it once), else read here.
let ownLookup: Promise<void> | null = null;
export function ownLocation(text?: string | null): void {
  if (ownLookup) return;
  // A location already on the page stands for the kept one: Place no longer waits for it (b1a2-4).
  if (store.location.peek()) { locationAtStart.value = false; return; }
  const saved = text === undefined ? memory.read(LOCATION_STORE) : text;
  if (saved) ownLookup = settleLocation('saved', saved).finally(() => { ownLookup = null; locationAtStart.value = false; });
}

// ---- restoring a link or the save ----

// Applies a decoded link or save to the store, in one batch, and opens the result. place: whether it
// brings a place (core bringsPlace): its country and the grower's own values apply only then.
// suggested: the save marks its palette as the last suggestion untouched (persist.ts SUGGESTED_KEY).
function applyDecoded(d: DecodedLink, countryFrom: Extract<CountrySource, 'link' | 'chosen'>, place: boolean, suggested = false): void {
  batch(() => {
    schema.apply(d.state, { countryFrom, bringsPlace: place });
    store.suggestedIds.value = suggested ? [...d.state.members] : [];
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

export interface RestoreOptions { from: 'link' | 'saved'; src?: CountryFrom; keep?: boolean; place?: string | null; ask?: OwnPlace; hold?: boolean; country?: Country }
// Restores a fragment (a link or the save) once its climates are read. Returns whether it opened.
// src: the saved country's source (a save's country that came from a link keeps that label).
// place: the private place kept apart from a saved fragment (the record's `place`, history.state.pl).
// keep: a consortium is shown (a link pasted into the open tab, Back/Forward): a link that cannot
// open changes nothing, says so where the reader is, and the address goes back to the consortium shown.
// ask: a reload of a page whose link place still waited (history.state ask): the notice again, against
// this own place; the link's cell, kept in the tab's place (pl `o`), comes back. It holds nothing.
// hold: a reload or Back/Forward of a page that held the save (history.state hold): the save stays
// held (8.3). Each flag is read only as itself (fix round 4, s-3). country: the reader's own country, worked out before a link's was shown (startMemory),
// which the notice gives back and the held save keeps.
export async function restore(fragment: string, { from, src = null, keep = false, place = null, ask = undefined, hold = false, country = undefined }: RestoreOptions): Promise<boolean> {
  // A new arrival: what an earlier notice's answer did is said no more (review round 2, 4).
  placeSaid.value = '';
  const refuse = (problem: PastedProblem, notice: Partial<Notices>): false => {
    if (keep) { notices.value = { ...notices.peek(), pasted: problem }; writeAddress(true); }
    else { notices.value = { ...notices.peek(), ...notice }; store.endOpening(); }
    return false;
  };
  // Refusals take no restore number, never touch saving, and cancel the restore in flight: the
  // latest link wins even when it cannot open, and its notice stays.
  // The version, by the core's one test (linkVersionStatus; plant-palette-architecture 8.2): newer
  // (above 5) and unreadable (the old beta tool's versions below 5 included) restore nothing; a save of
  // those is not removed here.
  const status = linkVersionStatus(new URLSearchParams(fragment).get('v'));
  // A newer link reads as any link this version cannot read (v14 Arrivals, F14: one message, nothing
  // restored; "Reload to get it" went with the newer notice).
  if (status !== 'current') { cancelRestore(); return refuse('unreadable', { unreadable: true }); }
  // A link with no climate (cut before it, or edited): unreadable, and nothing opens (review 7; R4).
  const climate = zoneOf(new URLSearchParams(fragment).get('c'));
  if (!climate) { cancelRestore(); return refuse('unreadable', { unreadable: true }); }

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
    const d = decodeLink(fragment, known, place);
    // A cut link (no e=1, a token list stopping mid-token): nothing restored (8.2; R4).
    if (d.notice.unreadable) return refuse('unreadable', { unreadable: true });
    // A link's site location (`o=`, P5 S5b): set in the same batch, its lookup still to come, so the
    // link's climate, site answers and country stay as the link says; the lookup (the location chunk)
    // fills in the climate facts only, labelled "from the shared link, approximate".
    const origin = from === 'link' ? linkOrigin(fragment) : ask && place ? linkOrigin(place) : null;
    // A save's place is the palette's own (a record without one: every answer unsure); a link's
    // applies only when it brings one (8.3).
    const brings = from === 'saved' || bringsPlace(fragment, d);
    // A link's place that differs from the reader's own: applied to this page only, with the notice;
    // the save keeps the reader's own until they choose (8.3).
    const waiting = linkPlace.peek();
    // The reader's own cell is read only when a place could wait on the reader (it is kept with it):
    // a link without a place leaves canopi-location read once, as on a plain open (P5-27j).
    const mayAsk = (from === 'link' || !!ask) && brings;
    const mine: OwnPlace = ask ?? waiting?.own ?? { siteEdits: store.siteEdits.peek(), country: country ?? store.country.peek(), location: mayAsk ? ownCell() : null };
    const asks = mayAsk && !samePlace(mine, d, origin);
    // One batch; the watcher then saves it and writes the address (plants no longer in the list are
    // left out of the address, §5).
    // A link's place still waiting when another palette opens (Back to the reader's own, another link):
    // the reader's own place and country come back first, so nothing of the earlier link stays.
    quietly(() => batch(() => {
      if (waiting && !ask) { store.siteEdits.value = waiting.own.siteEdits; store.country.value = waiting.own.country; }
      // Arriving by a link holds the save until a plant change, as does a reload or Back/Forward of
      // it; opening the save owns it (state/save.ts). In the batch, so the save sees the palette applied.
      holdSave(from === 'link' || hold);
      applyDecoded(d, from === 'link' || src === 'link' ? 'link' : 'chosen', brings, from === 'saved' && !!place && new URLSearchParams(place).get(SUGGESTED_KEY) === '1');
      notices.value = { ...notices.peek(), unknownCount: d.notice.unknownCount, cut: false, newer: false, period: d.notice.period, unreadable: false, pasted: null, failed: false };
      linkPlace.value = asks ? { own: mine } : null;
      // The sender's place name (D6, `n`), shown as it came: no reverse lookup on open.
      const name = origin ? linkPlaceName(from === 'link' ? fragment : place ?? '') : null;
      if (origin) store.location.value = { lat: origin.lat, lon: origin.lon, source: 'link', ...(name ? { label: name, placeLevel: true as const } : {}), lookup: null };
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

// Whether a decoded link's place is the reader's own already: the grower's own values, the country and
// the cell (a link's `o` is the reader's only when it is the cell of their own location).
function samePlace(mine: OwnPlace, d: DecodedLink, origin: LinkOrigin | null): boolean {
  const s = d.state;
  const cell = mine.location && snapOrigin(mine.location);
  const sameCell = !origin || (!!cell && cell.lat === origin.lat && cell.lon === origin.lon);
  return sameCell && sameEdits(s.siteEdits ?? NO_EDITS, mine.siteEdits) && (!s.country || s.country === mine.country.code);
}

// The guide's plant as the notice names it when the list lacks it (chunk-2 M29): its common name from
// the release's names (nameOf: the page language, else English, else the scientific name); the guide's
// own words when the release lacks it or its names do not read.
async function guideName(src: PlantSource, plant: string): Promise<string> {
  const p = await src.names(pageLang() as Locale).then((all) => all.find((x) => x.canonical === plant), () => undefined);
  return p ? nameOf({ names: p.names, canonical_name: p.canonical }) : plant;
}

// A guide preset: the climate for this consortium only (never the shared site climate), and the
// guide's plant: a member (plant-palette-architecture 8.3: a preset gives members == [id] and holds the
// save until a plant change; a new suggestion is built around it). The plant applies only if the reader
// has not acted while it was read (another card: pre-push review 2).
export async function applyPreset(climate: ClimateZone, plant: string | null): Promise<void> {
  // The guide's climate is the guide's choice, not the reader acting (it ends no "Open my saved palette instead").
  quietly(() => batch(() => { holdSave(true); store.climate.value = climate; }));
  if (!plant) return;
  const began = actionCount();
  await waitForSource();
  const src = store.source.peek()!;
  const pool = await store.loadPool(climate);
  const stale = () => actionCount() !== began || store.climate.peek() !== climate;
  if (!pool || stale()) return;
  const t = pool.find((x) => x.canonical_name === plant);
  if (!t) {
    // The names file is read after the check: the reader may have acted meanwhile (C3).
    const name = await guideName(src, plant);
    if (!stale()) notices.value = { ...notices.peek(), guideMissing: name };
    return;
  }
  // The guide's plant is the guide's choice, not the reader acting.
  quietly(() => batch(() => {
    store.members.value = [...new Set([...store.members.peek(), t.id])];
    notices.value = { ...notices.peek(), guidePlant: t.id };
  }));
}
