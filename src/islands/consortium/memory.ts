// What the consortium tool keeps and restores, and how it opens (stream S4; design check §5, §7 BT-7;
// owner row "Memory", 2026-10-27: the shared site climate plus the last consortium on this device;
// sharing is a link that restores the exact state, with no list of saved designs).
//
// - The share link: #v=4 in the address's fragment (core state.ts encodeLink / decodeLink), so it
//   never reaches a server log. The page keeps the address bar on it while a consortium is shown, so
//   a reload restores it, and rewrites it after a link with plants no longer in the list (§5).
// - The last consortium: localStorage STORE, { fragment, at }, written on each change; a visit with
//   no link opens it. A guide preset (?plant=&climate=, A5) wins over it.
// - The reader's country choice: localStorage COUNTRY_STORE ('FR', or '-' for "No country"), apart
//   from the consortium. A guess from the browser is shown as a guess, used for the warnings, and
//   never written, neither here nor in a link (owner row "Climate first, details").
// - The shared site climate: localStorage SITE_CLIMATE (knowledge/decisions/climate-ux.md), written
//   when the reader picks a climate on Start, and read when nothing else names one. A link's or a
//   guide's climate never writes it.
// Every storage call may throw (private mode, blocked cookies): each one is caught, and the tool
// works without it; Share then says the link keeps the consortium (§5 "Storage unavailable").
//
// The pure parts come first (scripts/consortium-memory.test.mjs runs them in Node): arrival,
// countryAtStart, the save record, shareState, guessCountry and cropExamples (ported from v1
// logic.js, memory.js and crops.js). The wiring (startMemory) reads and writes the store's signals.
import { batch, effect, signal } from '@preact/signals';
import type { ClimateZone, DecodedLink, LinkNotice, PhaseOrd, PlantId, ShareState, Site, Taxon } from '../../lib/consortium/index.ts';
import { climateZones, decodeLink, encodeLink, linkClimates, readPreset, LINK_VERSION, MAX_CROPS } from '../../lib/consortium/index.ts';
import type { Country } from './store.ts';
import * as store from './store.ts';

export const STORE = 'canopi-consortium';
export const COUNTRY_STORE = 'canopi-country';
export const SITE_CLIMATE = 'canopi-climate';
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

export interface SavedRecord { fragment: string; at: string }
export const saveRecord = (fragment: string, at: string): string => JSON.stringify({ fragment, at });
// A record read back, or null when it is not one (an older format, damaged JSON).
export function readRecord(text: string | null): SavedRecord | null {
  if (!text) return null;
  const v = attempt(() => JSON.parse(text) as unknown);
  if (!v || typeof v !== 'object') return null;
  const { fragment, at } = v as Record<string, unknown>;
  return typeof fragment === 'string' && fragment.length > 0 && fragment.length < 20_000 && typeof at === 'string' ? { fragment, at } : null;
}

// ---- climates at the island edge (the site's lowercase ids) ----

export const zoneOf = (id: string | null | undefined): ClimateZone | null =>
  (id ? climateZones.find((z) => z.toLowerCase() === id.trim().toLowerCase()) : undefined) ?? null;
export const siteId = (z: ClimateZone): string => z.toLowerCase();

// ---- how the page opens ----

// A fragment is a share link when it holds the link's version or its member list (v1 links carried
// their state in `c` and the query; v2+ share links put `v` first).
const isLinkFragment = (hash: string): boolean => {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  return q.has('v') || q.has('a');
};

export type Arrival =
  | { kind: 'link'; fragment: string }
  | { kind: 'preset'; climate: ClimateZone; plant: string | null }
  | { kind: 'saved'; fragment: string; at: string }
  | { kind: 'start'; climate: ClimateZone | null };

// What the page opens with, in order: a share link in the fragment; a guide preset in the query;
// the last consortium on this device; else Start, on the shared site climate when the reader set one
// (nothing is chosen otherwise: never a default climate).
export function arrival(loc: { hash: string; search: string }, saved: SavedRecord | null, siteClimate: string | null): Arrival {
  if (loc.hash && isLinkFragment(loc.hash)) return { kind: 'link', fragment: loc.hash.replace(/^#/, '') };
  const preset = readPreset(loc.search);
  if (preset.climate) return { kind: 'preset', climate: preset.climate, plant: preset.plant };
  if (saved) return { kind: 'saved', fragment: saved.fragment, at: saved.at };
  return { kind: 'start', climate: zoneOf(siteClimate) };
}

// The reader's country at start: a link's own (labelled "from the shared link"), else the reader's
// choice on this device ('-' is "No country"), else a saved consortium's (only a chosen country is
// ever written), else the browser's guess, else none.
export function countryAtStart({ link, pref, saved, guess }: { link: string | null; pref: string | null; saved: string | null; guess: string | null }): Country {
  const code = (c: string | null) => (c && /^[A-Za-z]{2}$/.test(c.trim()) ? c.trim().toUpperCase() : null);
  if (code(link)) return { code: code(link), source: 'link' };
  if (pref === NO_COUNTRY) return { code: null, source: 'chosen' };
  if (code(pref)) return { code: code(pref), source: 'chosen' };
  if (code(saved)) return { code: code(saved), source: 'chosen' };
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
// The state a link or the save holds. A guessed country is never written (owner row 2026-10-28).
export function shareState(s: ShareInput): ShareState {
  return {
    climate: s.climate,
    country: s.country.source === 'guess' ? null : s.country.code,
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
export interface Notices extends LinkNotice { oldSave: boolean; guideMissing: string | null; guideKept: PlantId | null }
const NO_NOTICES: Notices = { unknownCount: 0, cut: false, outdated: false, oldSave: false, guideMissing: null, guideKept: null };
export const notices = signal<Notices>({ ...NO_NOTICES });
// Whether this browser keeps the consortium (false: Share says the link does).
export const storageWorks = signal(true);
// "Suggest plants" pressed while the plant list loads: the suggestion runs once it is ready (§5).
export const pendingSuggest = signal(false);
// Restoring a link or the save: Start shows the climate at once, and the result when the plants are read.
export const restoring = signal(false);
// The country picker on the country line is open.
export const pickingCountry = signal(false);

const memory = guarded(() => (typeof localStorage === 'undefined' ? null : localStorage));

// Applies a decoded link or save to the store, in one batch, and opens the result.
function applyDecoded(d: DecodedLink, countryLink: boolean): void {
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
    if (s.country) store.country.value = countryLink ? { code: s.country, source: 'link' } : { code: s.country, source: 'chosen' };
    store.view.value = 'matrix';
  });
}

// The ids each climate's list holds, for the link's tokens (the climates must be read first).
async function knownFor(zones: ClimateZone[]): Promise<Partial<Record<ClimateZone, PlantId[]>> | null> {
  const out: Partial<Record<ClimateZone, PlantId[]>> = {};
  for (const z of zones) {
    const p = await store.loadPool(z);
    if (!p) return null;
    out[z] = p.map((t) => t.id);
  }
  return out;
}

const waitForSource = (): Promise<void> => new Promise((resolve) => {
  const stop = effect(() => { if (store.source.value) { queueMicrotask(() => stop()); resolve(); } });
});

// The current state as a fragment, against the climate's and the guest lists' ids.
export function currentFragment(): string | null {
  const c = store.climate.peek();
  if (!c) return null;
  const known: Partial<Record<ClimateZone, PlantId[]>> = {};
  for (const z of new Set<ClimateZone>([c, ...Object.values(store.guests.peek()).filter((x): x is ClimateZone => !!x)])) {
    const p = store.pools.peek()[z];
    if (p) known[z] = p.map((t) => t.id);
  }
  return encodeLink(shareState({
    climate: c, country: store.country.peek(), site: store.site.peek(), members: store.members.peek(), kept: store.kept.peek(),
    removed: store.removed.peek(), guests: store.guests.peek(), crops: store.crops.peek(), stage: store.stage.peek(),
  }), known);
}

// Restores a fragment (a link or the save) once its climates are read. Returns whether it opened.
async function restore(fragment: string, from: 'link' | 'saved'): Promise<boolean> {
  restoring.value = true;
  try {
    const zones = linkClimates(fragment);
    const v = new URLSearchParams(fragment).get('v');
    if (v !== null && v !== String(LINK_VERSION)) {
      // Another version: nothing is restored but what decodeLink still reads (climate, site).
      const d = decodeLink(fragment, {});
      batch(() => {
        if (d.state.climate && from === 'link') store.climate.value = d.state.climate;
        notices.value = { ...notices.peek(), outdated: from === 'link', oldSave: from === 'saved' };
      });
      return false;
    }
    if (zones[0]) store.climate.value = zones[0];
    await waitForSource();
    const known = await knownFor(zones);
    if (!known) return false;
    const d = decodeLink(fragment, known);
    applyDecoded(d, from === 'link');
    notices.value = { ...notices.peek(), unknownCount: d.notice.unknownCount, cut: d.notice.cut };
    // Plants no longer in the list are left out: the address is rewritten without them (§5).
    if (d.notice.unknownCount > 0 && from === 'link') writeAddress(true);
    return true;
  } finally {
    restoring.value = false;
  }
}

// A guide preset: the climate for this consortium only (never the shared site climate), and the
// guide's plant kept: a main crop when it is a food plant of that list, else a kept plant.
async function applyPreset(climate: ClimateZone, plant: string | null): Promise<void> {
  store.climate.value = climate;
  if (!plant) return;
  await waitForSource();
  const pool = await store.loadPool(climate);
  if (!pool) return;
  const t = pool.find((x) => x.canonical_name === plant);
  if (!t) { notices.value = { ...notices.peek(), guideMissing: plant }; return; }
  batch(() => {
    if (t.role === 'crop') store.crops.value = [t.id];
    store.kept.value = [...new Set([...store.kept.peek(), t.id])];
    notices.value = { ...notices.peek(), guideKept: t.id };
  });
}

// The address bar holds the shown consortium's link (replaceState, no history entry). Same address:
// nothing written (browsers drop replaceState calls past a rate limit).
function writeAddress(force = false): void {
  if (typeof location === 'undefined') return;
  const fragment = store.view.peek() !== 'start' || force ? currentFragment() : null;
  const next = fragment ? shareUrl(location.href, fragment) : `${location.origin}${location.pathname}${location.search}`;
  if (next !== location.href) attempt(() => history.replaceState(history.state, '', next));
}

// The reader picks a climate on Start: the shared site climate is written (climate-ux; v1 setClimate).
export function chooseClimate(z: ClimateZone): void {
  store.climate.value = z;
  memory.write(SITE_CLIMATE, siteId(z));
  attempt(() => { document.documentElement.dataset.climate = siteId(z); });
}

// The reader chooses a country (null: "No country"); kept on this device, apart from the consortium.
export function chooseCountry(code: string | null): void {
  store.country.value = { code, source: 'chosen' };
  memory.write(COUNTRY_STORE, code ?? NO_COUNTRY);
  pickingCountry.value = false;
}

// Start over: the consortium goes, from the store, the save and the address; the climate, the site
// and the country stay.
export function startOver(): void {
  batch(() => {
    store.members.value = [];
    store.kept.value = [];
    store.removed.value = [];
    store.guests.value = {};
    store.crops.value = [];
    store.sheet.value = null;
    store.view.value = 'start';
    notices.value = { ...NO_NOTICES };
  });
  memory.remove(STORE);
  writeAddress();
}

// "Suggest plants": now when the plants are read, else once they are (§5 Loading).
export function requestSuggest(): void {
  if (store.suggestMembers()) { store.view.value = 'matrix'; pendingSuggest.value = false; return; }
  pendingSuggest.value = true;
}

let started = false;
// Called once by Start when it first mounts (main.ts belongs to S1). Returns nothing: the effects
// live as long as the page.
export function startMemory(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  storageWorks.value = memory.works();
  const saved = readRecord(memory.read(STORE));
  const how = arrival({ hash: location.hash, search: location.search }, saved, memory.read(SITE_CLIMATE));
  const linkK = how.kind === 'link' ? new URLSearchParams(how.fragment).get('k') : null;
  const savedK = how.kind === 'saved' ? new URLSearchParams(how.fragment).get('k') : null;
  const languages = attempt(() => [...navigator.languages]) ?? [];
  const zone = attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone) ?? null;
  store.country.value = countryAtStart({ link: linkK, pref: memory.read(COUNTRY_STORE), saved: savedK, guess: guessCountry([], { languages }) });

  // A better guess once the known countries are read (the time zone needs them).
  effect(() => {
    const src = store.source.value;
    if (!src || store.country.peek().source !== 'guess') return;
    const g = guessCountry([...src.countries().keys()], { zone, languages });
    if (g && g !== store.country.peek().code) store.country.value = { code: g, source: 'guess' };
  });

  if (how.kind === 'link') void restore(how.fragment, 'link');
  else if (how.kind === 'saved') void restore(how.fragment, 'saved');
  else if (how.kind === 'preset') void applyPreset(how.climate, how.plant);
  else if (how.climate) store.climate.value = how.climate;

  // "Suggest plants" pressed early runs when the climate's plants (and every guest list) are read.
  effect(() => {
    if (!pendingSuggest.value || !store.pool.value || store.guestsPending.value.length) return;
    queueMicrotask(() => { if (pendingSuggest.peek()) requestSuggest(); });
  });

  // The first time the chosen climate's plants are at hand (the §8 timing script reads this mark
  // until the matrix's own ct:matrix exists).
  let marked = false;
  effect(() => {
    if (marked || !store.pool.value) return;
    marked = true;
    attempt(() => performance.mark('ct:pool'));
  });

  // Each change of a shown consortium: the save and the address bar (never while restoring, and
  // never on Start with nothing chosen: the last consortium stays until another replaces it).
  effect(() => {
    // Read every piece of state the link holds, so the effect runs on each change.
    void [store.climate.value, store.country.value, store.site.value, store.members.value, store.kept.value, store.removed.value,
      store.guests.value, store.crops.value, store.stage.value, store.view.value, store.pools.value, restoring.value];
    if (restoring.peek() || store.view.peek() === 'start' || !store.pool.peek()) return;
    const fragment = currentFragment();
    if (!fragment) return;
    memory.write(STORE, saveRecord(fragment, new Date().toISOString()));
    writeAddress();
  });
}
