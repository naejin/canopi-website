// How the page opens (Wave 7.1): a reload/language-switch of its own address (history.state or
// sessionStorage['canopi-lang-switch']), a share link (#v=5...), a guide preset (?plant=&climate=),
// else Start (with optional shared site climate). Palettes are never auto-restored from localStorage.
import type { ClimateZone, LinkOrigin } from '../../../lib/palette/index.ts';
import { bringsPlace, countryZones, decodeLink, linkOrigin, NO_EDITS, readPreset, zoneOf } from '../../../lib/palette/index.ts';
import type { Country } from '../store.ts';
import * as store from '../store.ts';
import {
  attempt, currentFragment, fromOf, memory, shows, watchStore,
  COUNTRY_STORE, LOCATION_STORE, NO_COUNTRY, SITE_CLIMATE, type CountryFrom, type OwnPlace,
} from './persist.ts';
import { applyPreset, locationAtStart, notices, ownCell, ownLocation, restore, waitForSource, NO_NOTICES } from './restore.ts';
import { forgets, LEGACY_PALETTE_KEYS } from './save.ts';
import { watchSuggest } from './suggest-wait.ts';

// A fragment is a share link when it holds the link's version or its member list (a member list with
// no version is an unreadable link, 8.2; an old beta link of any version reads as unreadable too).
const isLinkFragment = (hash: string): boolean => {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  return q.has('v') || q.has('a');
};

export type Arrival =
  | { kind: 'link'; fragment: string }
  | { kind: 'preset'; climate: ClimateZone; plant: string | null }
  | { kind: 'saved'; fragment: string; src: CountryFrom; place: string; ask?: true }
  | { kind: 'start'; climate: ClimateZone | null };

interface OwnAddress { ct: string; src: CountryFrom; pl: string; ask: boolean }
const ownOf = (v: unknown): OwnAddress | null => {
  if (!v || typeof v !== 'object') return null;
  const { ct, src, pl, ask, fg } = v as Record<string, unknown>;
  if (typeof ct !== 'string' || !ct) return null;
  let place = typeof pl === 'string' && pl.length < 2_000 ? pl : '';
  if ((typeof fg === 'number' ? fg : 0) < forgets()) place = linkPartOf(place);
  return { ct, src: fromOf(src), pl: place, ask: ask === 1 };
};
const linkPartOf = (place: string): string => {
  const q = new URLSearchParams(place), out = new URLSearchParams();
  for (const key of ['k', 'o']) { const v = q.get(key); if (v) out.set(key, v); }
  return out.toString().replace(/%2C/gi, ',');
};

// What the page opens with, in order: the page's own address after a reload or language switch
// (history.state.ct is the fragment), a share link in the fragment, a guide preset in the query,
// else Start on the shared site climate when set (never auto-restores a palette from localStorage).
export function arrival(loc: { hash: string; search: string }, siteClimate: string | null, state: unknown = null): Arrival {
  const hash = loc.hash.replace(/^#/, '');
  const own = ownOf(state);
  if (hash && own && own.ct === hash) {
    return { kind: 'saved', fragment: hash, src: own.src, place: own.pl, ...(own.ask ? { ask: true as const } : {}) };
  }
  if (hash && isLinkFragment(hash)) return { kind: 'link', fragment: hash };
  const preset = readPreset(loc.search);
  if (preset.climate) return { kind: 'preset', climate: preset.climate, plant: preset.plant };
  return { kind: 'start', climate: zoneOf(siteClimate) };
}

// A hashchange (a pasted link, or Back/Forward): the page's own address reopens with its country
// source and tab place; another link opens as a link; the current fragment or non-link is ignored.
export type HashAction = { kind: 'ignore' } | { kind: 'saved'; fragment: string; src: CountryFrom; place: string } | { kind: 'link'; fragment: string };
export function hashAction(hash: string, state: unknown, current: string | null): HashAction {
  const f = hash.replace(/^#/, '');
  if (!f || !isLinkFragment(f) || f === current) return { kind: 'ignore' };
  const own = ownOf(state);
  if (own && own.ct === f) return { kind: 'saved', fragment: f, src: own.src, place: own.pl };
  return { kind: 'link', fragment: f };
}

// The reader's country at start: a link's own (labelled "from the shared link"), else the reader's
// choice on this device ('-' is "No country"), else a saved consortium's (a guess is never written;
// a country that came from a link keeps that label), else the browser's guess, else none. guess is
// called only when none of the others names a country: guessCountry reads every country's time zones,
// from the page (built at build time), since asking the browser for them took about 0.4 s, 1.6 s on a
// slow phone, before the database opens (b2 review perf-1; 2026-11-14 load profile).
export function countryAtStart({ link, pref, saved, savedFrom = null, guess }: { link: string | null; pref: string | null; saved: string | null; savedFrom?: CountryFrom; guess: () => string | null }): Country {
  const code = (c: string | null) => (c && /^[A-Za-z]{2}$/.test(c.trim()) ? c.trim().toUpperCase() : null);
  if (code(link)) return { code: code(link), source: 'link' };
  if (pref === NO_COUNTRY) return { code: null, source: 'chosen' };
  if (code(pref)) return { code: code(pref), source: 'chosen' };
  if (code(saved)) return { code: code(saved), source: fromOf(savedFrom) ?? 'chosen' };
  const guessed = code(guess());
  return guessed ? { code: guessed, source: 'guess' } : { code: null, source: null };
}

// ---- ported from v1 logic.js: the browser's country ----

// The browser's country: the time zone first (the one known country whose zones include it; zonesOf
// defaults to the runtime's CLDR data, which Firefox lacks: countryZones), then the region of the browser's
// languages. With no known codes yet (the plant list still loading), any region of the languages.
// Shown as a guess, never put in a link. Bad input is skipped. The page hands every known country's
// zones (store.zonesOfCountry, built at build time); zonesOf falls back to the browser's.
export function guessCountry(codes: readonly string[], { zone, languages = [], zonesOf = countryZones }: { zone?: string | null; languages?: readonly string[]; zonesOf?: (c: string) => string[] } = {}): string | null {
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

// ---- the arrival's decisions ----

export interface ArrivalInputs { pref: string | null; guess: () => string | null; cell: () => LinkOrigin | null }
export interface ArrivalPlan { country: Country; own: Country; linkCell: LinkOrigin | null; ask?: OwnPlace }
export function arrivalPlan(how: Arrival, { pref, guess, cell }: ArrivalInputs): ArrivalPlan {
  const linkK = how.kind === 'link' && bringsPlace(how.fragment, decodeLink(how.fragment, {})) ? new URLSearchParams(how.fragment).get('k') : null;
  let guessed: { code: string | null } | null = null;
  const once = (): string | null => (guessed ??= { code: guess() }).code;
  const countries = { pref, saved: null, savedFrom: null, guess: once };
  const own = countryAtStart({ link: null, ...countries });
  const country = linkK ? countryAtStart({ link: linkK, ...countries }) : own;
  const linkCell = how.kind === 'link' ? linkOrigin(how.fragment) : how.kind === 'saved' && how.ask ? linkOrigin(how.place) : null;
  if (how.kind !== 'saved' || !how.ask) return { country, own, linkCell };
  return { country, own, linkCell, ask: { siteEdits: NO_EDITS, country, location: cell() } };
}

// ---- the wiring ----

export interface Opening { how: Arrival; plan: ArrivalPlan; keptLocation: string | null }
export function openWith({ how, plan, keptLocation }: Opening): void {
  store.country.value = plan.country;

  locationAtStart.value = !plan.linkCell && ownCell(keptLocation) !== null;
  if (!plan.linkCell) void waitForSource().then(() => ownLocation(keptLocation));

  if (how.kind === 'link') {
    void restore(how.fragment, { from: 'link', country: plan.own });
  }
  else if (how.kind === 'saved') {
    void restore(how.fragment, { from: 'saved', src: how.src, place: how.place, ask: plan.ask });
  }
  else if (how.kind === 'preset') {
    void applyPreset(how.climate, how.plant);
  }
  else if (how.climate) store.climate.value = how.climate;
}

export const LANG_SWITCH_KEY = 'canopi-lang-switch';

function consumeLangSwitchState(): unknown {
  return attempt(() => {
    const raw = sessionStorage.getItem(LANG_SWITCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LANG_SWITCH_KEY);
    return JSON.parse(raw) as unknown;
  });
}

let opened: Arrival | null = null;
export function openingArrival(): Arrival {
  if (opened) return opened;
  const hist = attempt(() => history.state);
  const state = ownOf(hist) ? hist : (consumeLangSwitchState() ?? hist);
  return opened = arrival({ hash: location.hash, search: location.search }, memory.read(SITE_CLIMATE), state);
}

let started = false;
export function startMemory(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  // One-time cleanup of legacy palette localStorage keys (plain removeItem, never read; Wave 7.1).
  for (const key of LEGACY_PALETTE_KEYS) memory.remove(key);
  const how = openingArrival();
  const languages = attempt(() => [...navigator.languages]) ?? [];
  const zone = attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone) ?? null;
  const guess = (): string | null => guessCountry([...store.knownCountries.peek().keys()], { zone, languages, zonesOf: (c) => store.zonesOfCountry(c) ?? countryZones(c) });
  const keptLocation = memory.read(LOCATION_STORE);
  const plan = arrivalPlan(how, { pref: memory.read(COUNTRY_STORE), guess, cell: () => ownCell(keptLocation) });
  openWith({ how, plan, keptLocation });

  window.addEventListener('hashchange', () => {
    const act = hashAction(location.hash, attempt(() => history.state), currentFragment());
    if (act.kind === 'ignore') return;
    const keep = shows();
    if (act.kind === 'saved') { void restore(act.fragment, { from: 'saved', src: act.src, keep, place: act.place }); return; }
    notices.value = { ...NO_NOTICES };
    void restore(act.fragment, { from: 'link', keep });
  });

  watchSuggest();
  watchStore();
}
