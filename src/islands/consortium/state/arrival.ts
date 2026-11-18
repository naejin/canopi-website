// How the page opens (stream S4; E6 S2 split it out of memory.ts): what it opens with (a reload of its
// own address, a share link, a guide preset, the last consortium, else Start), the
// reader's country at start and the browser's guess, a link pasted into the open tab, and startMemory,
// which reads the page once and wires all of it (openWith). The pure parts (arrival, hashAction,
// countryAtStart, guessCountry, ported from v1 logic.js and memory.js; arrivalPlan) run in Node
// (scripts/consortium-memory.test.mjs, scripts/consortium-pp-b1.test.mjs).
import type { ClimateZone, LinkOrigin } from '../../../lib/consortium/index.ts';
import { bringsPlace, countryZones, decodeLink, linkOrigin, NO_EDITS, readPreset, zoneOf } from '../../../lib/consortium/index.ts';
import type { Country } from '../store.ts';
import * as store from '../store.ts';
import {
  attempt, currentFragment, fromOf, memory, quietly, readRecord, shows, storageWorks, watchStore,
  COUNTRY_STORE, LOCATION_STORE, NO_COUNTRY, PLACE_STORE, SITE_CLIMATE, STORE, type CountryFrom, type OwnPlace, type SavedRecord,
} from './persist.ts';
import { state as schema } from './schema.ts';
import { applyPreset, locationAtStart, notices, ownCell, ownLocation, restore, waitForSource, NO_NOTICES } from './restore.ts';
import { forgets, lastSave } from './save.ts';
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
  | { kind: 'saved'; fragment: string; at: string; src: CountryFrom; place: string; ask?: true; hold?: true }
  | { kind: 'start'; climate: ClimateZone | null };

// history.state as replaceState left it: the page's own fragment, its country source and this tab's
// place (pl: the private place answers, kept per tab since the save is shared by every tab; '' none;
// with a link's country `k`, and its cell `o` while its place waits); ask: a link's place still waits
// on "Use it" / "Use my own place", so a reload asks again; hold: the page held the save, so a reload
// or Back/Forward holds it again. Each is read only as itself (persist.ts writeAddress; fix round 4, s-3).
// fg: the tab's Forget count when the entry was written; an entry from before the last "Forget this
// location" keeps only the link's own part of its place (its country `k` and cell `o`, which the link
// itself carries), so no history entry brings the forgotten spot or soil answers back (second-round
// review 2). A country from the reader's location is never in `pl`.
interface OwnAddress { ct: string; src: CountryFrom; pl: string; ask: boolean; hold: boolean }
const ownOf = (v: unknown): OwnAddress | null => {
  if (!v || typeof v !== 'object') return null;
  const { ct, src, pl, ask, hold, fg } = v as Record<string, unknown>;
  if (typeof ct !== 'string' || !ct) return null;
  let place = typeof pl === 'string' && pl.length < 2_000 ? pl : '';
  if ((typeof fg === 'number' ? fg : 0) < forgets()) place = linkPartOf(place);
  return { ct, src: fromOf(src), pl: place, ask: ask === 1, hold: hold === 1 };
};
const linkPartOf = (place: string): string => {
  const q = new URLSearchParams(place), out = new URLSearchParams();
  for (const key of ['k', 'o']) { const v = q.get(key); if (v) out.set(key, v); }
  return out.toString().replace(/%2C/gi, ',');
};

// The spot and soil answers of a place string, without a link's country `k` and cell `o` (the tab's
// place carries them, the save's never does).
const answersOf = (place: string): string => {
  const q = new URLSearchParams(place);
  q.delete('k'); q.delete('o');
  return q.toString();
};
// Whether storage still holds the palette an owned page wrote before its reload (pre-push fix 5): its
// fragment, and its place unless a link's place waited (the save then kept the reader's own place).
const stillSaved = (saved: SavedRecord | null, own: OwnAddress): boolean =>
  !!saved && saved.fragment === own.ct && (own.ask || answersOf(saved.place) === answersOf(own.pl));

// What the page opens with, in order: the page's own address after a reload (history.state.ct is
// the fragment: the save, with its country label); a share link in the fragment; a guide preset in
// the query (the old beta tool's query links, ?v=3&c=…, are not read: owner 2026-11-17, no backward
// compatibility work); the last consortium on this device; else Start, on the shared site climate when the
// reader set one (nothing is chosen otherwise: never a default climate).
// A reload never overwrites a save that differs from what the page last wrote (pre-push fix 5): when
// storage no longer holds the page's palette (another tab saved since, or removed it), the page opens
// held, so "Open my saved palette instead" offers the stored one. storageWorks false (blocked, or kept
// nothing): there is no other tab's save to protect, so the page opens owned as before; its climate and
// answers may live only in the address (second-round review 3).
export function arrival(loc: { hash: string; search: string }, saved: SavedRecord | null, siteClimate: string | null, state: unknown = null, storageWorks = true): Arrival {
  const hash = loc.hash.replace(/^#/, '');
  const own = ownOf(state);
  if (hash && own && own.ct === hash) {
    const hold = own.hold || (storageWorks && !stillSaved(saved, own));
    return { kind: 'saved', fragment: hash, at: '', src: own.src, place: own.pl, ...(own.ask ? { ask: true as const } : {}), ...(hold ? { hold: true as const } : {}) };
  }
  if (hash && isLinkFragment(hash)) return { kind: 'link', fragment: hash };
  const preset = readPreset(loc.search);
  if (preset.climate) return { kind: 'preset', climate: preset.climate, plant: preset.plant };
  if (saved) return { kind: 'saved', fragment: saved.fragment, at: saved.at, src: saved.src, place: saved.place };
  return { kind: 'start', climate: zoneOf(siteClimate) };
}

// A hashchange (a pasted link, or Back/Forward): the page's own address (history.state.ct, as
// arrival reads it) reopens as the save with its country source; another link opens as a link; the
// address of the consortium shown, or a fragment that is no link, is ignored. hold: the entry's page
// held the save, so it stays held (8.3), and so does any entry while storage no longer holds what this
// page last wrote or read (storageMoved: another tab saved or removed it since; pre-push fix 5).
export type HashAction = { kind: 'ignore' } | { kind: 'saved'; fragment: string; src: CountryFrom; place: string; hold?: true } | { kind: 'link'; fragment: string };
export function hashAction(hash: string, state: unknown, current: string | null, storageMoved = false): HashAction {
  const f = hash.replace(/^#/, '');
  if (!f || !isLinkFragment(f) || f === current) return { kind: 'ignore' };
  const own = ownOf(state);
  if (own && own.ct === f) return { kind: 'saved', fragment: f, src: own.src, place: own.pl, ...(own.hold || storageMoved ? { hold: true as const } : {}) };
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

// ---- the place seed ----

// The canopi-place seed (`m z l w q r h s`, persist.ts placeSeed) as the place fields' values, or null
// when there is none: read through the link decoder (a v5 fragment of the place keys alone), so a seed
// follows the link's words and fallbacks.
export function placeOfSeed(seed: string | null): Pick<ReturnType<typeof schema.peek<'room' | 'plot' | 'spot' | 'soil'>>, 'room' | 'plot' | 'spot' | 'soil'> | null {
  if (!seed || seed.length > 2_000) return null;
  const d = decodeLink(`v=5&${seed}&e=1`, {});
  return { room: d.state.room, plot: d.state.plot, spot: d.state.spot ?? schema.valuesOf(['spot']).spot, soil: d.state.soil ?? { from: 'map' } };
}
// Writes the seed into the place fields (not the reader acting: no save, no seed written back).
function seedPlace(seed: string | null): void {
  const place = placeOfSeed(seed);
  if (place) quietly(() => schema.write(place));
}

// ---- the arrival's decisions (review round 2, 5) ----

// What startMemory reads before it decides: the save record, the reader's country choice on this
// device (canopi-country), the browser's guess (called at most once, and only when nothing else names
// a country: countryAtStart), the place seed (canopi-place), and the reader's own cell (restore.ts
// ownCell), called only when a reload asks again.
export interface ArrivalInputs { saved: SavedRecord | null; pref: string | null; guess: () => string | null; seed: string | null; cell: () => LinkOrigin | null }
// country: the country the page shows (a link's that brings a place, else the reader's own); own: the
// reader's own, worked out without the link (bugs-2: a link's country never stands for the reader's
// own, so the notice gives this one back); linkCell: a link's `o=`, or after a reload while its place
// waited the cell kept in the tab's place (the reader's own location is then not looked up); ask: that
// reload's question, against the reader's own place (the held save's, else the seed), the country
// shown and their own cell, never the link's.
export interface ArrivalPlan { country: Country; own: Country; linkCell: LinkOrigin | null; ask?: OwnPlace }
export function arrivalPlan(how: Arrival, { saved, pref, guess, seed, cell }: ArrivalInputs): ArrivalPlan {
  // A link's country only when the link brings a place (`k` alone keeps the reader's: 8.3).
  const linkK = how.kind === 'link' && bringsPlace(how.fragment, decodeLink(how.fragment, {})) ? new URLSearchParams(how.fragment).get('k') : null;
  // A location's or a link's country is kept beside the saved fragment, never in it (owner answer 5;
  // the fragment is public in link v5).
  const savedK = how.kind === 'saved' && (how.src === 'location' || how.src === 'link') && saved?.fragment === how.fragment ? saved.country ?? null : null;
  let guessed: { code: string | null } | null = null;
  const once = (): string | null => (guessed ??= { code: guess() }).code;
  const countries = { pref, saved: savedK, savedFrom: how.kind === 'saved' ? how.src : null, guess: once };
  const own = countryAtStart({ link: null, ...countries });
  const country = linkK ? countryAtStart({ link: linkK, ...countries }) : own;
  const linkCell = how.kind === 'link' ? linkOrigin(how.fragment) : how.kind === 'saved' && how.ask ? linkOrigin(how.place) : null;
  if (how.kind !== 'saved' || !how.ask) return { country, own, linkCell };
  const mine = placeOfSeed(saved?.place || seed);
  const kept = saved?.place && saved.place.length <= 2_000 ? decodeLink(`v=5&${saved.place}&e=1`, {}).state.siteEdits : null;
  return { country, own, linkCell, ask: { spot: mine?.spot ?? schema.valuesOf(['spot']).spot, soil: mine?.soil ?? { from: 'map' }, siteEdits: kept ?? NO_EDITS, country, location: cell() } };
}

// ---- the wiring ----

// What the page opens with, wired (startMemory calls it once with what it read; a unit test calls it
// with a spy location step, review round 3, 3): the country shown, the saved location looked up again
// unless a link's cell stands for it, the place seed, and the restore of a link or the save, a guide
// preset, or the shared site climate. keptLocation: canopi-location as read once.
export interface Opening { how: Arrival; plan: ArrivalPlan; saved: SavedRecord | null; seed: string | null; keptLocation: string | null }
export function openWith({ how, plan, saved, seed, keptLocation }: Opening): void {
  store.country.value = plan.country;

  // The saved site location, looked up again once the plant list is open (so its tiles never compete
  // with the database); a link's `o=` stands in for it on that page (ownLocation), also after a reload
  // while its place still waits (the cell kept in the tab's place). Until that lookup settles, Place
  // counts the kept location as a place (restore.ts locationAtStart).
  locationAtStart.value = !plan.linkCell && ownCell(keptLocation) !== null;
  if (!plan.linkCell) void waitForSource().then(() => ownLocation(keptLocation));

  // A palette that starts with no place of its own takes the reader's last place answers as its seed
  // (canopi-place, plant-palette-architecture 8.3); a link's room, plot and place still win over it.
  if (how.kind !== 'saved') seedPlace(seed);

  if (how.kind === 'link') {
    // A newer or unreadable link over a readable save: "Back to mine" (Arrivals board; persist.ts
    // savedInstead, derived from the held save).
    void restore(how.fragment, { from: 'link', country: plan.own });
  }
  else if (how.kind === 'saved') {
    // A reload while a link's place still waited on the reader: asked again (plan.ask).
    void restore(how.fragment, { from: 'saved', src: how.src, place: how.place, ask: plan.ask, hold: how.hold });
  }
  else if (how.kind === 'preset') {
    // A guide preset over a saved palette: the save stays untouched, one press away (8.3).
    void applyPreset(how.climate, how.plant);
  }
  else if (how.climate) store.climate.value = how.climate;
}

// What this page opened with, read once: main.ts reads it before the first render (the palette page's
// placeholder, the prefetch), startMemory acts on it.
let opened: Arrival | null = null;
export function openingArrival(): Arrival {
  return opened ??= arrival({ hash: location.hash, search: location.search }, readRecord(memory.read(STORE)), memory.read(SITE_CLIMATE), attempt(() => history.state), memory.works());
}

let started = false;
// Called once by main.ts, before the first render (so the country guess, the stored climate and a
// link's pending climate are drawn in the first frame: N2 layout shift), right after the database's
// open has started. Returns nothing: the effects live as long as the page.
export function startMemory(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  storageWorks.value = memory.works();
  const raw = memory.read(STORE);
  const saved = readRecord(raw);
  lastSave.value = raw;
  const how = openingArrival();
  const languages = attempt(() => [...navigator.languages]) ?? [];
  const zone = attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone) ?? null;
  // The time zone needs the known countries: the page names them (#ct-data `countries`, the
  // database's own list), so this guess is final in the first frame, never refined once the database
  // opens (that refinement shifted all of Start by up to 46 px about a second after load: N2).
  // Each country's zones come from the page (built from the same CLDR data); the browser's own only
  // for a country the page has none for, or a page built without them.
  const guess = (): string | null => guessCountry([...store.knownCountries.peek().keys()], { zone, languages, zonesOf: (c) => store.zonesOfCountry(c) ?? countryZones(c) });
  const seed = memory.read(PLACE_STORE);
  // canopi-location, read once here: whether Place's climate cards wait for its lookup, the reader's
  // own cell for a reload's ask, and the lookup itself.
  const keptLocation = memory.read(LOCATION_STORE);
  const plan = arrivalPlan(how, { saved, pref: memory.read(COUNTRY_STORE), guess, seed, cell: () => ownCell(keptLocation) });
  openWith({ how, plan, saved, seed, keptLocation });

  // A link pasted into the open tab: opened, unless it is the page's own address (review 3).
  // Back/Forward to the page's own address reopens it as the save, its country label kept (round 2).
  window.addEventListener('hashchange', () => {
    const act = hashAction(location.hash, attempt(() => history.state), currentFragment(), memory.read(STORE) !== lastSave.peek());
    if (act.kind === 'ignore') return;
    const keep = shows();
    if (act.kind === 'saved') { void restore(act.fragment, { from: 'saved', src: act.src, keep, place: act.place, hold: act.hold }); return; }
    notices.value = { ...NO_NOTICES };
    void restore(act.fragment, { from: 'link', keep });
  });

  watchSuggest();
  watchStore();
}
