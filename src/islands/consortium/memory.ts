// What the consortium tool keeps and restores, and how it opens (stream S4; design check §5, §7 BT-7;
// owner row "Memory", 2026-10-27: the shared site climate plus the last consortium on this device;
// sharing is a link that restores the exact state, with no list of saved designs).
//
// - The share link: #v=4 in the address's fragment (core state.ts encodeLink / decodeLink), so it
//   never reaches a server log. The page keeps the address bar on it while a consortium is shown, so
//   a reload restores it, and rewrites it after a link with plants no longer in the list (§5).
// - The last consortium: localStorage STORE, { fragment, at, src }, written on each change (src: whether
//   its country came from a shared link, so it keeps that label); a visit with no link opens it. A
//   guide preset (?plant=&climate=, A5) wins over it. An older save (v1's { q, at, src }, or another
//   link version) gives the "older version" notice once and is removed.
// - The page's own address: replaceState writes history.state { ct: fragment, src }, so a reload of
//   the page's own link opens as the save (its country label kept), not as a link someone shared
//   (v1 bca954c). A link pasted into the open tab (hashchange) is opened.
// - The reader's country choice: localStorage COUNTRY_STORE ('FR', or '-' for "No country"), apart
//   from the consortium. A guess from the browser is shown as a guess, used for the warnings, and
//   never written, neither here nor in a link (owner row "Climate first, details").
// - The shared site climate: localStorage SITE_CLIMATE (knowledge/decisions/climate-ux.md), written
//   when the reader picks a climate on Start, and read when nothing else names one. A link's or a
//   guide's climate never writes it.
// - The site location (P5 S5b): localStorage LOCATION_STORE { lat, lon, source, label }, apart from the
//   consortium and never in a link or the address; a link carries the climate cell's centre (`o=`)
//   only when the reader ticks "include my location" in Share (owner answer 5). A visit that opens no
//   link looks the saved location up again once the plant list is open; a link's `o=` replaces it.
//   A country from the location ("from your location") replaces a guess, never a country the reader
//   chose or a link carried, and is written into a link only with the tick.
// Every storage call may throw (private mode, blocked cookies): each one is caught, and the tool
// works without it; Share then says the link keeps the consortium (§5 "Storage unavailable").
//
// The pure parts come first (scripts/consortium-memory.test.mjs runs them in Node): arrival,
// countryAtStart, the save record, shareState, guessCountry and cropExamples (ported from v1
// logic.js, memory.js and crops.js). The wiring (startMemory) reads and writes the store's signals.
import { batch, computed, effect, signal, untracked } from '@preact/signals';
import type { ClimateZone, DecodedLink, Interaction, LinkNotice, LinkOrigin, PhaseOrd, PlantId, ShareState, Site, Taxon } from '../../lib/consortium/index.ts';
import { decodeLink, encodeLink, linkClimates, linkOrigin, readPreset, zoneOf, LINK_VERSION, MAX_CROPS } from '../../lib/consortium/index.ts';
import type { Country } from './store.ts';
import * as store from './store.ts';
import { focusView } from './focus.ts';
import { loadLocationStep, looking, lookups } from './views/location/load.ts';

export const STORE = 'canopi-consortium';
export const COUNTRY_STORE = 'canopi-country';
export const SITE_CLIMATE = 'canopi-climate';
export const LOCATION_STORE = 'canopi-location';
const NO_COUNTRY = '-';

// ---- storage, guarded ----

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
const attempt = <T>(f: () => T): T | null => { try { return f(); } catch { return null; } };

// A storage whose every call is caught. get() may itself throw (a blocked localStorage getter).
export function guarded(get: () => StorageLike | null | undefined) {
  return {
    read: (k: string): string | null => attempt(() => get()?.getItem(k) ?? null),
    write: (k: string, v: string): boolean => attempt(() => { const s = get(); if (!s) return false; s.setItem(k, v); return true; }) ?? false,
    remove: (k: string): boolean => attempt(() => { const s = get(); if (!s) return false; s.removeItem(k); return true; }) ?? false,
    // Whether this browser keeps anything: a probe key written, read back and removed.
    works(): boolean {
      return attempt(() => {
        const s = get();
        if (!s) return false;
        const key = `${STORE}-probe`;
        s.setItem(key, '1');
        const ok = s.getItem(key) === '1';
        s.removeItem(key);
        return ok;
      }) ?? false;
    },
  };
}
export type Memory = ReturnType<typeof guarded>;

// ---- the save record ----

// src: where the saved consortium's country came from ('link': a shared link; 'chosen'; 'location':
// the site location (P5 owner answer 5), kept as `country` beside the fragment, never in it; null: none).
export type CountryFrom = 'link' | 'chosen' | 'location' | null;
export interface SavedRecord { fragment: string; at: string; src: CountryFrom; country?: string }
export const saveRecord = (fragment: string, at: string, src: CountryFrom, country: string | null = null): string =>
  JSON.stringify(src === 'location' && country ? { fragment, at, src, country } : { fragment, at, src });
const fromOf = (v: unknown): CountryFrom => (v === 'link' || v === 'chosen' || v === 'location' ? v : null);
const versionOf = (fragment: string): string | null => new URLSearchParams(fragment).get('v');
const parsed = (text: string | null): Record<string, unknown> | null => {
  if (!text) return null;
  const v = attempt(() => JSON.parse(text) as unknown);
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
};
// A record read back, or null when it is not one (an older format, another link version, damaged JSON).
export function readRecord(text: string | null): SavedRecord | null {
  const v = parsed(text);
  if (!v) return null;
  const { fragment, at, src, country } = v;
  if (typeof fragment !== 'string' || !fragment.length || fragment.length >= 20_000 || typeof at !== 'string') return null;
  const ver = versionOf(fragment);
  if (ver !== null && ver !== String(LINK_VERSION)) return null;
  const from = fromOf(src);
  return from === 'location' && typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? { fragment, at, src: from, country } : { fragment, at, src: from };
}
// A save from an older version of the tool: v1's { q, at, src }, or a record of another link version.
export function oldRecord(text: string | null): boolean {
  const v = parsed(text);
  if (!v) return false;
  if (typeof v.q === 'string') return true;
  if (typeof v.fragment !== 'string') return false;
  const ver = versionOf(v.fragment);
  return ver !== null && ver !== String(LINK_VERSION);
}

// ---- climates at the island edge (the site's lowercase ids) ----

export { zoneOf };
export const siteId = (z: ClimateZone): string => z.toLowerCase();

// ---- how the page opens ----

// A fragment is a share link when it holds the link's version or its member list (v1 links carried
// their state in `c` and the query; v2+ share links put `v` first).
const isLinkFragment = (hash: string): boolean => {
  const q = new URLSearchParams(hash.replace(/^[#?]/, ''));
  return q.has('v') || q.has('a');
};

export type Arrival =
  | { kind: 'link'; fragment: string }
  | { kind: 'preset'; climate: ClimateZone; plant: string | null }
  | { kind: 'outdated' }
  | { kind: 'saved'; fragment: string; at: string; src: CountryFrom }
  | { kind: 'start'; climate: ClimateZone | null };

// history.state as replaceState left it: the page's own fragment and its country source.
export interface OwnAddress { ct: string; src: CountryFrom }
const ownOf = (v: unknown): OwnAddress | null => {
  if (!v || typeof v !== 'object') return null;
  const { ct, src } = v as Record<string, unknown>;
  return typeof ct === 'string' && ct ? { ct, src: fromOf(src) } : null;
};

// What the page opens with, in order: the page's own address after a reload (history.state.ct is
// the fragment: the save, with its country label); a share link in the fragment; a guide preset in
// the query; a v1 query link (?v=3&c=…&a=…: the outdated notice, nothing restored, owner row
// 2026-11-11); the last consortium on this device; else Start, on the shared site climate when the
// reader set one (nothing is chosen otherwise: never a default climate).
export function arrival(loc: { hash: string; search: string }, saved: SavedRecord | null, siteClimate: string | null, state: unknown = null): Arrival {
  const hash = loc.hash.replace(/^#/, '');
  const own = ownOf(state);
  if (hash && own && own.ct === hash) return { kind: 'saved', fragment: hash, at: '', src: own.src };
  if (hash && isLinkFragment(hash)) return { kind: 'link', fragment: hash };
  const preset = readPreset(loc.search);
  if (preset.climate) return { kind: 'preset', climate: preset.climate, plant: preset.plant };
  if (isLinkFragment(loc.search)) return { kind: 'outdated' };
  if (saved) return { kind: 'saved', fragment: saved.fragment, at: saved.at, src: saved.src };
  return { kind: 'start', climate: zoneOf(siteClimate) };
}

// A hashchange (a pasted link, or Back/Forward): the page's own address (history.state.ct, as
// arrival reads it) reopens as the save with its country source; another link opens as a link; the
// address of the consortium shown, or a fragment that is no link, is ignored.
export type HashAction = { kind: 'ignore' } | { kind: 'saved'; fragment: string; src: CountryFrom } | { kind: 'link'; fragment: string };
export function hashAction(hash: string, state: unknown, current: string | null): HashAction {
  const f = hash.replace(/^#/, '');
  if (!f || !isLinkFragment(f) || f === current) return { kind: 'ignore' };
  const own = ownOf(state);
  if (own && own.ct === f) return { kind: 'saved', fragment: f, src: own.src };
  return { kind: 'link', fragment: f };
}

// The reader's country at start: a link's own (labelled "from the shared link"), else the reader's
// choice on this device ('-' is "No country"), else a saved consortium's (a guess is never written;
// a country that came from a link keeps that label), else the browser's guess, else none.
export function countryAtStart({ link, pref, saved, savedFrom = null, guess }: { link: string | null; pref: string | null; saved: string | null; savedFrom?: CountryFrom; guess: string | null }): Country {
  const code = (c: string | null) => (c && /^[A-Za-z]{2}$/.test(c.trim()) ? c.trim().toUpperCase() : null);
  if (code(link)) return { code: code(link), source: 'link' };
  if (pref === NO_COUNTRY) return { code: null, source: 'chosen' };
  if (code(pref)) return { code: code(pref), source: 'chosen' };
  if (code(saved)) return { code: code(saved), source: savedFrom === 'link' ? 'link' : savedFrom === 'location' ? 'location' : 'chosen' };
  if (code(guess)) return { code: code(guess), source: 'guess' };
  return { code: null, source: null };
}

// ---- the share state ----

export interface ShareInput {
  climate: ClimateZone | null;
  country: Country;
  site: Site;
  members: readonly PlantId[];
  kept: readonly PlantId[];
  removed: readonly PlantId[];
  guests: Partial<Record<PlantId, ClimateZone>>;
  crops: readonly PlantId[];
  stage: PhaseOrd | null;
}
// The state a link or the save holds. A guessed country is never written (owner row 2026-10-28); a
// country from the location only with the reader's "include my location" tick (P5 owner answer 5;
// S5b passes { location: true }).
export function shareState(s: ShareInput, { location = false }: { location?: boolean } = {}): ShareState {
  const written = s.country.source === 'guess' ? false : s.country.source === 'location' ? location : true;
  return {
    climate: s.climate,
    country: written ? s.country.code : null,
    site: { ...s.site },
    members: [...s.members],
    kept: [...s.kept],
    removed: [...s.removed],
    guests: Object.entries(s.guests).flatMap(([id, from]) => (from ? [{ id, from }] : [])),
    crops: s.crops.slice(0, MAX_CROPS),
    stage: s.stage,
  };
}

// The address of a link: the page without its query (a guide preset is used once) and the fragment.
export const shareUrl = (href: string, fragment: string): string => {
  const u = new URL(href);
  return `${u.origin}${u.pathname}#${fragment}`;
};

// ---- ported from v1 logic.js: the browser's country ----

// The browser's country: the time zone first (the one known country whose zones include it; zonesOf
// defaults to the runtime's CLDR data, which Firefox lacks), then the region of the browser's
// languages. With no known codes yet (the plant list still loading), any region of the languages.
// Shown as a guess, never put in a link. Bad input is skipped.
const cldrZones = (c: string): string[] => {
  const l = new Intl.Locale('und-' + c) as Intl.Locale & { getTimeZones?: () => string[]; timeZones?: string[] };
  const z = l.getTimeZones?.() ?? l.timeZones;
  return Array.isArray(z) ? z : [];
};
export function guessCountry(codes: readonly string[], { zone, languages = [], zonesOf = cldrZones }: { zone?: string | null; languages?: readonly string[]; zonesOf?: (c: string) => string[] } = {}): string | null {
  const set = new Set(codes.map((c) => c.toUpperCase()));
  if (zone && codes.length) {
    const hits = codes.filter((c) => { try { return zonesOf(c).includes(zone); } catch { return false; } });
    if (hits.length === 1) return hits[0].toUpperCase();
  }
  for (const l of languages) {
    try {
      const r = new Intl.Locale(l).maximize().region;
      if (r && /^[A-Z]{2}$/i.test(r) && (!set.size || set.has(r.toUpperCase()))) return r.toUpperCase();
    } catch { /* not a language tag */ }
  }
  return null;
}

// ---- ported from v1 crops.js: the Main crops examples ----

// One-tap examples for "What do you mainly want to grow?" (owner row "Crop examples and guide 43",
// 2026-10-29): a rule, not a hand-picked list. Among the climate's food plants (role crop), ranked by
// the best known (named in the most languages), then the most edible, then by scientific name: the
// same every time. Then picked for variety: at most one plant per genus, and each round takes the best
// of a layer not yet shown, so the examples spread across the layers before a layer repeats. The
// crops already chosen are left out.
export function cropExamples(pool: readonly Taxon[], n = 4, chosen: readonly PlantId[] = []): Taxon[] {
  const known = (t: Taxon) => Object.keys(t.names).length, skip = new Set(chosen);
  const ranked = pool.filter((t) => t.role === 'crop' && !skip.has(t.id)).sort((a, b) =>
    known(b) - known(a) || (b.traits.edibility_rating ?? 0) - (a.traits.edibility_rating ?? 0) || (a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : 0));
  const out: Taxon[] = [], genera = new Set<string>();
  while (out.length < n) {
    const layers = new Set<string>();
    let took = false;
    for (const t of ranked) {
      if (out.length >= n) break;
      const g = t.genus || t.canonical_name.split(' ')[0], s = t.stratum?.value ?? '';
      if (out.includes(t) || genera.has(g) || layers.has(s)) continue;
      out.push(t); genera.add(g); layers.add(s); took = true;
    }
    if (!took) break;
  }
  return out;
}

// The name a plant shows in the page language, else English, else its scientific name.
export const plantName = (t: Pick<Taxon, 'names' | 'canonical_name'>, lang: string): string =>
  t.names[lang as keyof Taxon['names']] ?? t.names.en ?? t.canonical_name;

// =====================================================================================================
// The wiring: what the page opens with, the save, the address bar, the country and the site climate.
// =====================================================================================================

// The notices a link (or the save) left for the reader (Actions shows them; Start shows `outdated`).
// pasted: a link pasted while a consortium was shown that changed nothing (older version, cut with
// no climate, its plant list not loaded); failed: a link or the save whose plant list did not load.
export type PastedProblem = 'outdated' | 'cut' | 'failed';
export interface Notices extends LinkNotice { oldSave: boolean; guideMissing: string | null; guideKept: PlantId | null; pasted: PastedProblem | null; failed: boolean }
const NO_NOTICES: Notices = { unknownCount: 0, cut: false, outdated: false, oldSave: false, guideMissing: null, guideKept: null, pasted: null, failed: false };
export const notices = signal<Notices>({ ...NO_NOTICES });
// Whether this browser keeps the consortium (false: Share says the link does).
export const storageWorks = signal(true);
// "Suggest plants" pressed while the plant list loads: the suggestion runs once it is ready (§5).
export const pendingSuggest = signal(false);
// The country picker on the country line is open.
export const pickingCountry = signal(false);

export const memory = guarded(() => (typeof localStorage === 'undefined' ? null : localStorage));

// Applies a decoded link or save to the store, in one batch, and opens the result.
function applyDecoded(d: DecodedLink, countryFrom: 'link' | 'chosen'): void {
  const s = d.state;
  batch(() => {
    if (s.climate) store.climate.value = s.climate;
    store.site.value = { ...s.site };
    store.members.value = s.members;
    store.kept.value = s.kept;
    store.removed.value = s.removed;
    store.crops.value = s.crops;
    store.guests.value = Object.fromEntries(s.guests.map((g) => [g.id, g.from]));
    if (s.stage !== null) store.stage.value = s.stage;
    if (s.country) store.country.value = { code: s.country, source: countryFrom };
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

const waitForSource = (): Promise<void> => new Promise((resolve) => {
  const stop = effect(() => { if (store.source.value) { queueMicrotask(() => stop()); resolve(); } });
});

// The current state as a fragment, against the climate's and the guest lists' ids.
// of: a consortium set aside (Start's draft shows), in place of the store's. origin: the site's cell
// centre, given only for Share's "include my location" tick: the link then carries `o=` and a country
// from the location (owner answer 5); the address bar and the save never pass it.
export function currentFragment(of: store.Consortium | null = null, { origin = null }: { origin?: LinkOrigin | null } = {}): string | null {
  const c = of?.climate ?? store.climate.peek();
  if (!c) return null;
  const guests = of?.guests ?? store.guests.peek();
  const known: Partial<Record<ClimateZone, PlantId[]>> = {};
  for (const z of new Set<ClimateZone>([c, ...Object.values(guests).filter((x): x is ClimateZone => !!x)])) {
    const p = store.pools.peek()[z];
    if (p) known[z] = p.map((t) => t.id);
  }
  return encodeLink(shareState({
    climate: c, country: of?.country ?? store.country.peek(), site: of?.site ?? store.site.peek(), members: of?.members ?? store.members.peek(),
    kept: of?.kept ?? store.kept.peek(), removed: of?.removed ?? store.removed.peek(), guests, crops: of?.crops ?? store.crops.peek(), stage: of?.stage ?? store.stage.peek(),
  }, { location: origin !== null }), known, { origin });
}

// Where the shown consortium's country came from, as the save and history.state keep it.
const countryFrom = (c: Country = store.country.peek()): CountryFrom => {
  return !c.code || c.source === 'guess' ? null : c.source === 'link' ? 'link' : c.source === 'location' ? 'location' : 'chosen';
};

// ---- restoring a link or the save ----
// A restore reads everything first and changes no store signal until it applies, in one batch, and
// only if it is still the newest restore and the reader has not acted since it began. Saving never
// waits for it: the store watcher saves every change (watchStore), so nothing has to be cleared on
// the way out for saving to work again.
let restoreGen = 0;
// Every write to the consortium's signals that is not a restore applying or a guessed country (an
// edit, Suggest, Start empty, a climate, Start over): the reader acted.
let actions = 0;
let quiet = false;
// (Only outside an effect: a write made in an effect reaches the watcher after the effect ends.)
export const quietly = (fn: () => void): void => { quiet = true; try { fn(); } finally { quiet = false; } };
// The newest restore in flight, for display only: Start's "reading" line, and the link's climate on
// Start at once while the plants are read (first visit). Ended by that restore, or by the reader acting.
const inFlight = signal<{ id: number; climate: ClimateZone | null } | null>(null);
export const restoring = computed(() => inFlight.value !== null);
export const pendingClimate = computed(() => (store.climate.value ? null : inFlight.value?.climate ?? null));

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
  const began = actions;
  const current = (): boolean => id === restoreGen && actions === began;
  inFlight.value = { id, climate: keep ? null : climate };
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
      notices.value = { ...notices.peek(), unknownCount: d.notice.unknownCount, cut: d.notice.cut, pasted: null, failed: false };
      if (origin) store.location.value = { lat: origin.lat, lon: origin.lon, source: 'link', lookup: null };
      // A link without `o=` (pasted into the tab): an earlier link's location goes with it, so no
      // stale line shows and Share cannot attach its cell (review round 1, 2). The reader's own stays.
      else if (from === 'link' && store.location.peek()?.source === 'link') store.location.value = null;
    }));
    if (origin) void settleLocation('link');
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
  const began = actions;
  await waitForSource();
  const pool = await store.loadPool(climate);
  if (!pool || actions !== began || store.climate.peek() !== climate) return;
  const t = pool.find((x) => x.canonical_name === plant);
  if (!t) { notices.value = { ...notices.peek(), guideMissing: plant }; return; }
  // The guide's plant is the guide's choice, not the reader acting.
  quietly(() => batch(() => {
    if (t.role === 'crop') store.crops.value = [t.id];
    store.kept.value = [...new Set([...store.kept.peek(), t.id])];
    notices.value = { ...notices.peek(), guideKept: t.id };
  }));
}

// ---- the consortium and the save ----
// Two states: the consortium, and Start's draft (the picked card and its crops) while Start shows.
// Change site sets the consortium aside (store.setAside) and opens a draft seeded from it; the draft
// never changes the consortium or the save. Only Suggest, Start empty, a paste and Back to your
// consortium (which discards the draft) end it. The save always encodes the consortium, written on
// every change of it; Undo restores the consortium (and the view), so it rewrites the save too.
// Every write of the save goes through writeSave, which holds the one multi-tab rule.

// The consortium this page shows or set aside on Start (null: none of its own).
function own(): store.Consortium | null {
  if (store.view.peek() !== 'start') {
    const climate = store.climate.peek();
    return climate && {
      climate, members: store.members.peek(), kept: store.kept.peek(), removed: store.removed.peek(), guests: store.guests.peek(), crops: store.crops.peek(),
      site: store.site.peek(), country: store.country.peek(), stage: store.stage.peek(),
    };
  }
  return store.setAside.peek();
}

// The save as this page last wrote it, or read it when it opened (startMemory).
let lastSave: string | null = null;
// What the save held just before this page's first write over it, or the newer save another tab
// wrote there since (undefined: nothing to put back). Undo back to a Start with no consortium of the
// page's own puts it back (R2-3, R4-1).
let beneath: string | null | undefined;
const sameSave = (a: string | null, b: string | null): boolean => {
  const x = readRecord(a), y = readRecord(b);
  return x && y ? x.fragment === y.fragment && x.src === y.src : a === b;
};
// next: this page's consortium as a record; null: the save removed (Start over, an older save);
// 'back': the page has no consortium of its own any more, so the save goes back to `beneath`.
// The rule: a remove or a put-back happens only while the save is still what this page last wrote
// or read, so another tab's save, or an earlier visit's, is never lost (R2-2, R4-1, R4-2); the
// page's own consortium is written whenever it changes (the reader acted here).
function writeSave(next: string | null | 'back'): void {
  const now = memory.read(STORE);
  if (next === 'back' || next === null) {
    const to = next === 'back' ? beneath : null;
    beneath = undefined;
    if (to === undefined || now !== lastSave) return;
    if (to === null ? memory.remove(STORE) : memory.write(STORE, to)) lastSave = to;
    return;
  }
  if (sameSave(next, lastSave)) return;
  if (beneath === undefined || now !== lastSave) beneath = now;
  if (memory.write(STORE, next)) lastSave = next;
}

// The address bar holds the consortium's link (replaceState, no history entry). Same address:
// nothing written (browsers drop replaceState calls past a rate limit).
function writeAddress(force = false): void {
  if (typeof location === 'undefined') return;
  const mine = own();
  const fragment = mine ? currentFragment(mine) : force ? currentFragment() : null;
  const next = fragment ? shareUrl(location.href, fragment) : `${location.origin}${location.pathname}${location.search}`;
  // history.state marks the address as the page's own, so a reload opens it as the save (review 1).
  const state = fragment ? { ct: fragment, src: countryFrom(mine?.country) } : null;
  if (next !== location.href || JSON.stringify(attempt(() => history.state)) !== JSON.stringify(state)) attempt(() => history.replaceState(state, '', next));
}

// The reader picks a climate on Start: the shared site climate is written (climate-ux; v1 setClimate).
// With a consortium set aside, the draft follows the card: the consortium's own card seeds it from
// the consortium again, another card starts it empty (its crops and plants are that card's).
export function chooseClimate(z: ClimateZone): void {
  const aside = store.view.peek() === 'start' ? own() : null;
  batch(() => {
    store.climate.value = z;
    if (aside) {
      const same = aside.climate === z;
      store.members.value = same ? aside.members : [];
      store.kept.value = same ? aside.kept : [];
      store.removed.value = same ? aside.removed : [];
      store.guests.value = same ? aside.guests : {};
      store.crops.value = same ? aside.crops : [];
    }
  });
  memory.write(SITE_CLIMATE, siteId(z));
  attempt(() => { document.documentElement.dataset.climate = siteId(z); });
}

// The reader chooses a country (null: "No country"); kept on this device, apart from the consortium.
export function chooseCountry(code: string | null): void {
  store.country.value = { code, source: 'chosen' };
  memory.write(COUNTRY_STORE, code ?? NO_COUNTRY);
  pickingCountry.value = false;
}

// ---- the site location (P5 S5b) ----

// The location chunk looks up store.location (a link's `o=`, or the saved location) and settles it.
// how: 'link' (the link's answers win; no country, no suggestion) or 'saved' (looked up again; saved:
// the stored record's text, read by the chunk, views/location/keep.ts).
function settleLocation(how: 'link' | 'saved', saved: string | null = null): Promise<void> {
  return looking(() => loadLocationStep()).then((m) => looking(() => m.settle(how, saved)), () => {
    if (how === 'link') store.location.value = null;
  });
}
// Change site: the consortium set aside, Start's draft seeded from it.
export function changeSite(): void {
  batch(() => {
    store.setAside.value = own();
    store.view.value = 'start';
  });
}

// Start over: the consortium goes, from the store, the save and the address; the climate, the site
// and the country stay.
export function startOver(): void {
  writeSave(null);
  batch(() => {
    store.setAside.value = null;
    store.members.value = [];
    store.kept.value = [];
    store.removed.value = [];
    store.guests.value = {};
    store.crops.value = [];
    store.closeSheet();
    store.view.value = 'start';
    notices.value = { ...NO_NOTICES };
  });
}

// "Back to your consortium" from Start: the draft discarded, the consortium shown in its own climate
// again, whatever card was chosen since "Change site", with its own site answers, country and stage
// (F1, R2-4, R4-3); the focus goes to the view (W4).
export const canGoBack = computed(() => store.view.value === 'start' && store.setAside.value !== null);
export function backToConsortium(): void {
  const aside = own();
  batch(() => {
    if (aside) {
      chooseClimate(aside.climate);
      store.site.value = aside.site;
      store.country.value = aside.country;
      store.stage.value = aside.stage;
    }
    store.view.value = 'matrix';
  });
  focusView();
}

// "Start empty and search": an empty consortium and S3's search sheet.
export function startEmpty(): void {
  adoptPending();
  batch(() => {
    store.members.value = [];
    store.view.value = 'matrix';
    store.openSheet('search');
  });
}

// The reader acts on Start while a link loads: the climate the link shows becomes the chosen one
// (that write is the reader acting, so the restore in flight will not apply).
function adoptPending(): void {
  const shown = pendingClimate.peek();
  if (shown) store.climate.value = shown;
}

// "Suggest plants": now when the plants are read, else once they are (§5 Loading).
export function requestSuggest(): void {
  adoptPending();
  // A location being read: Suggest waits for it (the effect below runs it once lookups settle).
  if (!lookups.peek() && store.suggestMembers()) { store.view.value = 'matrix'; pendingSuggest.value = false; focusView(); return; }
  pendingSuggest.value = true;
}

// The save and the address bar follow the consortium; with none of the page's own, the save goes back.
function persist(): void {
  if (store.view.peek() !== 'start' && !store.pool.peek()) return;
  writeAddress();
  const mine = own();
  writeSave(mine ? saveRecord(currentFragment(mine) ?? '', new Date().toISOString(), countryFrom(mine.country), mine.country.code) : 'back');
}

// The shown consortium's link, recomputed on every change of what the link holds (Share's field).
export const shownFragment = computed(() => {
  void [store.climate.value, store.country.value, store.site.value, store.members.value, store.kept.value, store.removed.value,
    store.guests.value, store.crops.value, store.stage.value, store.view.value, store.pools.value];
  return currentFragment();
});

let started = false;
// Called once by Start when it first mounts (main.ts belongs to S1). Returns nothing: the effects
// live as long as the page.
export function startMemory(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  storageWorks.value = memory.works();
  const raw = memory.read(STORE);
  const saved = readRecord(raw);
  lastSave = raw;
  const how = arrival({ hash: location.hash, search: location.search }, saved, memory.read(SITE_CLIMATE), attempt(() => history.state));
  // An older save: said once, then removed, so the notice does not come back on every visit (review 4).
  if (how.kind === 'start' && oldRecord(raw)) {
    notices.value = { ...notices.peek(), oldSave: true };
    writeSave(null);
  }
  const linkK = how.kind === 'link' ? new URLSearchParams(how.fragment).get('k') : null;
  // A location country is kept beside the saved fragment, not in it (owner answer 5).
  const savedK = how.kind === 'saved' ? new URLSearchParams(how.fragment).get('k') ?? (how.src === 'location' && saved?.fragment === how.fragment ? saved.country ?? null : null) : null;
  const languages = attempt(() => [...navigator.languages]) ?? [];
  const zone = attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone) ?? null;
  store.country.value = countryAtStart({ link: linkK, pref: memory.read(COUNTRY_STORE), saved: savedK, savedFrom: how.kind === 'saved' ? how.src : null, guess: guessCountry([], { languages }) });

  // A better guess once the known countries are read (the time zone needs them).
  effect(() => {
    const src = store.source.value;
    if (!src || store.country.peek().source !== 'guess') return;
    const g = guessCountry([...src.countries().keys()], { zone, languages });
    // Written after this effect, not in it: a write made inside an effect reaches the watcher only once
    // the effect ends, after `quietly`, and a guessed country is not the reader acting.
    if (g && g !== store.country.peek().code) queueMicrotask(() => quietly(() => { store.country.value = { code: g, source: 'guess' }; }));
  });

  // The saved site location, looked up again once the plant list is open (so its tiles never compete
  // with the database); a link brings its own location or none.
  const savedLocation = how.kind === 'link' ? null : memory.read(LOCATION_STORE);
  if (savedLocation) void waitForSource().then(() => { if (!store.location.peek()) void settleLocation('saved', savedLocation); });

  if (how.kind === 'link') void restore(how.fragment, { from: 'link' });
  else if (how.kind === 'saved') void restore(how.fragment, { from: 'saved', src: how.src });
  else if (how.kind === 'outdated') notices.value = { ...notices.peek(), outdated: true };
  else if (how.kind === 'preset') void applyPreset(how.climate, how.plant);
  else if (how.climate) store.climate.value = how.climate;

  // A link pasted into the open tab: opened, unless it is the page's own address (review 3).
  // Back/Forward to the page's own address reopens it as the save, its country label kept (round 2).
  window.addEventListener('hashchange', () => {
    const act = hashAction(location.hash, attempt(() => history.state), currentFragment());
    if (act.kind === 'ignore') return;
    const keep = own() !== null;
    if (act.kind === 'saved') { void restore(act.fragment, { from: 'saved', src: act.src, keep }); return; }
    notices.value = { ...NO_NOTICES };
    void restore(act.fragment, { from: 'link', keep });
  });

  // "Suggest plants" pressed early runs when the climate's plants (and every guest list) are read.
  effect(() => {
    if (!pendingSuggest.value || !store.pool.value || store.guestsPending.value.length || lookups.value) return;
    queueMicrotask(() => { if (pendingSuggest.peek()) requestSuggest(); });
  });

  watchStore();
}

let watching = false;
// The save and the address bar follow every change of the consortium (persist: nothing on a fresh
// Start, where the last consortium stays until another replaces it), and any write to the consortium that
// is not a restore applying counts as the reader acting. Set up once (startMemory; the unit tests).
// (It reads the signals themselves, not shownFragment: the view is not in the link, so a computed
// fragment would not change when the result first shows.)
export function watchStore(): void {
  if (watching) return;
  watching = true;
  let first = true;
  effect(() => {
    void [store.climate.value, store.country.value, store.site.value, store.members.value, store.kept.value, store.removed.value,
      store.guests.value, store.crops.value, store.stage.value, store.view.value];
    if (first) { first = false; return; }
    if (quiet) return;
    actions++;
    // The reader acted during a first-visit restore (any Start write: a country, a site answer, a
    // crop, Suggest): the restore will not apply, and the link's climate Start showed stays, now
    // chosen, so what Start shows never vanishes without the reader choosing.
    untracked(() => {
      const shown = inFlight.peek()?.climate;
      inFlight.value = null;
      if (shown && !store.climate.peek()) store.climate.value = shown;
    });
  });
  effect(() => {
    void [store.climate.value, store.country.value, store.site.value, store.members.value, store.kept.value, store.removed.value,
      store.guests.value, store.crops.value, store.stage.value, store.view.value, store.pools.value, store.setAside.value];
    untracked(persist);
  });
}
