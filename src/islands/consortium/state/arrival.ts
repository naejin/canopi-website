// How the page opens (stream S4; E6 S2 split it out of memory.ts): what it opens with (a reload of
// its own address, a share link, a guide preset, an outdated v1 link, the last consortium, else
// Start), the reader's country at start and the browser's guess, a link pasted into the open tab, and
// startMemory, which wires all of it once. The pure parts (arrival, hashAction, countryAtStart,
// guessCountry; ported from v1 logic.js and memory.js) run in Node (scripts/consortium-memory.test.mjs).
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { linkOrigin, readPreset, zoneOf } from '../../../lib/consortium/index.ts';
import type { Country } from '../store.ts';
import * as store from '../store.ts';
import {
  attempt, currentFragment, fromOf, memory, oldRecord, openedWith, own, readRecord, storageWorks, watchStore, writeSave,
  COUNTRY_STORE, NO_COUNTRY, SITE_CLIMATE, STORE, type CountryFrom, type SavedRecord,
} from './persist.ts';
import { applyPreset, notices, ownLocation, restore, waitForSource, NO_NOTICES } from './restore.ts';
import { watchSuggest } from './suggest-wait.ts';

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
interface OwnAddress { ct: string; src: CountryFrom }
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
  if (code(saved)) return { code: code(saved), source: savedFrom === 'link' || savedFrom === 'location' ? savedFrom : 'chosen' };
  if (code(guess)) return { code: code(guess), source: 'guess' };
  return { code: null, source: null };
}

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

// ---- the wiring ----

let started = false;
// Called once by Start when it first mounts (main.ts belongs to S1). Returns nothing: the effects
// live as long as the page.
export function startMemory(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  storageWorks.value = memory.works();
  const raw = memory.read(STORE);
  const saved = readRecord(raw);
  openedWith(raw);
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
  // The time zone needs the known countries: the page names them (#ct-data `countries`, the
  // database's own list), so this guess is final in the first frame, never refined once the database
  // opens (that refinement shifted all of Start by up to 46 px about a second after load: N2).
  store.country.value = countryAtStart({ link: linkK, pref: memory.read(COUNTRY_STORE), saved: savedK, savedFrom: how.kind === 'saved' ? how.src : null, guess: guessCountry([...store.knownCountries.peek().keys()], { zone, languages }) });

  // The saved site location, looked up again once the plant list is open (so its tiles never compete
  // with the database); a link's `o=` stands in for it on that page (ownLocation).
  if (!(how.kind === 'link' && linkOrigin(how.fragment))) void waitForSource().then(ownLocation);

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

  watchSuggest();
  watchStore();
}
