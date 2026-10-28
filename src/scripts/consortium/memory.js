// What the consortium tool keeps for the reader, apart from the address bar: the last consortium on
// this device (STORE), the reader's own country choice on this device (COUNTRY_STORE), and the same
// choice in this tab (history.state), which survives a reload when storage is blocked (m-3). No
// address, language link or copied URL carries the choice: an old link's MINE marker is dropped on
// arrival, before anything else, and never read (core-fix review 3, M-1, m-1). With storage blocked,
// a language switch therefore reads the reader's country as the link's, never the reverse. Every
// storage call may throw (private mode, blocked cookies): each one is caught, and the tool works
// without it.
// scripts/consortium-country.test.mjs runs this wiring with a stubbed storage and history (m-7).
import { decodeState } from '../../lib/consortium/index.ts';
import { pickCountry, arrivalParams } from './logic.js';

export const STORE = 'canopi-consortium';
// The reader's own country choice ('FR', or '-' for "No country"), apart from the consortium, so a
// reload in any status and Start over keep it (m12). A guess is never written.
export const COUNTRY_STORE = 'canopi-country';
export const MINE = 'mine';
// The main crops and "Add anyway" guests the reader chose on this device (B7): only those read "you
// chose it" or "you added it"; a shared link's are described neutrally (parts.js builtKey). Kept in
// storage and in this tab (history.state), so a reload or a language switch keeps them with storage
// blocked; Start over forgets them.
export const OWN_STORE = 'canopi-own';
const TAB = 'canopiCountry';
const OWN_TAB = 'canopiOwn';
const ownOf = (v) => ({ crops: new Set(v?.crops ?? []), guests: new Set(v?.guests ?? []) });
const attempt = (f) => { try { return f(); } catch { return null; } };

export function memoryOf({ storage, history, location }) {
  const readOwn = () => attempt(() => history.state?.[OWN_TAB]) ?? attempt(() => JSON.parse(storage.getItem(OWN_STORE) ?? 'null'));
  return {
    // Whether the state was read from the fragment (arrive): only those links carry the end marker.
    fromFragment: false,
    own: () => ownOf(readOwn()),
    addOwn({ crops = [], guests = [] }) {
      const o = ownOf(readOwn());
      for (const id of crops) o.crops.add(id);
      for (const id of guests) o.guests.add(id);
      const v = { crops: [...o.crops], guests: [...o.guests] };
      attempt(() => storage.setItem(OWN_STORE, JSON.stringify(v)));
      attempt(() => history.replaceState({ ...(history.state ?? {}), [OWN_TAB]: v }, ''));
    },
    // The last consortium on this device: { q, at, src } or null.
    saved: () => attempt(() => JSON.parse(storage.getItem(STORE) ?? 'null')),
    save: (q, src) => attempt(() => storage.setItem(STORE, JSON.stringify({ q, at: new Date().toISOString(), src }))),
    // The reader's own choice: this tab's, else this device's. Only choose() writes either, so
    // nothing from a link someone else made is ever read as the reader's own (M-1).
    pref: () => attempt(() => history.state?.[TAB]) ?? attempt(() => storage.getItem(COUNTRY_STORE)) ?? null,
    choose(code) {
      const v = code ?? '-';
      attempt(() => storage.setItem(COUNTRY_STORE, v));
      attempt(() => history.replaceState({ ...(history.state ?? {}), [TAB]: v }, ''));
    },
    // On arrival, before any await: the state is read from the fragment, else from the query of a
    // link from before (v2, the first v3 links, a guide preset), which moves into the fragment (C8);
    // an old link's MINE leaves the address bar (so a slow or failed manifest load never leaves it
    // there to be copied or bookmarked: m-1), and the start reads the state without it.
    arrive() {
      const { params, fragment, address } = arrivalParams({ search: location.search, hash: location.hash }, MINE);
      this.fromFragment = fragment;
      if (address != null) attempt(() => history.replaceState(history.state, '', location.pathname + address));
      return params;
    },
    // Start over: the consortium and the reader's own picks go; the country (device and tab) stays.
    startOver(path) {
      attempt(() => storage.removeItem(STORE));
      attempt(() => storage.removeItem(OWN_STORE));
      attempt(() => history.replaceState({ ...(history.state ?? {}), [OWN_TAB]: undefined }, ''));
      attempt(() => history.replaceState(history.state, '', path));
    },
  };
}

// What the page opens with: a link (c, climate or plant) else the save, and the country
// (pickCountry: the link's own k, the reader's choice, the save's with the source it was saved with,
// the guess).
export function startState({ params, memory, guess, known }) {
  const saved = memory.saved();
  const fromLink = params.has('c') || params.has('climate') || params.has('plant');
  const savedState = saved?.q ? decodeState(saved.q).state : null;
  const decoded = fromLink ? decodeState(params) : saved?.q ? decodeState(saved.q) : null;
  const pref = memory.pref();
  const country = pickCountry({ link: fromLink ? decoded.state : null, pref, saved: savedState && { ...savedState, source: saved.src }, guess, known });
  return { decoded, saved, fromLink, pref, country };
}
