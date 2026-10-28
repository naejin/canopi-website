// The tool's state in a share link (link v3):
//   ?v=3&c=temperate&k=FR&l=sun&s=unsure&w=unsure&m=field&a=…&p=…&x=…&n=…&g=me…
//   v link version (LINK_VERSION, not the export's FORMAT_VERSION), c climate (site id, lowercase),
//   k country (ISO alpha-2, for the invasive warnings only), l light, s soil, w water, m room,
//   a the members in order, a kept member marked with a leading "*";
//   p kept plants that are not members (a no-match result keeps its kept plants, with no `a`);
//   x removed plants; n main crops (at most MAX_CROPS, each also a kept member);
//   g plants added from another climate's list ("Add anyway"): one `g` per list, its two-letter
//     code (GUEST_CODES) then its tokens; each is also in `a`.
// k is written only when the state has a country; the page leaves out a country it guessed, so a
// link carries a country only when the user chose it. `k=-` means "No country", chosen: the page
// writes it only to its saved state (local storage), never to a share link. The page's own `mine`
// (memory.js) never reaches encodeState.
// A guide opens the tool with a preset instead: ?plant=<canonical_name>&climate=<id>. `climate` is
// read when `c` is absent; the plant becomes kept once the cell is known (resolveState), and a
// plant the cell does not have is dropped. encodeState always writes the short keys.
// Site keys are always written, so a link means the same thing if the defaults change. Decoding
// never throws: an unknown or malformed value is left out and listed in `dropped`, so the page can
// say what an old link lost.
//
// Ids (v3). A token is the id's first 36 bits (9 hex digits, dashes aside) in 6 base64url
// characters, with nothing between tokens. When another taxon the encoder knows (the cell, and the
// files of the state's guests) shares those 36 bits, the id is written whole: "." then its 128 bits
// in 22 characters. Tokens never depend on a file's order or size, so a link survives a data
// update: decoding matches each token against the ids at hand; a plant no longer listed is dropped
// and reported ('unknown'), and one that a new taxon now shares 36 bits with is dropped as
// 'ambiguous' (about one chance in 10^5 for a 1,000-taxon file). Only "*", "." and base64url
// characters are used, which a query string leaves unescaped.
//
// Length budget: 6 characters per member, 7 for a kept one; 6 per removed plant, 6 per main crop
// again, and 6 per guest again plus 2 per list. 200 members with 190 kept is 1,390 characters of
// `a`; with 2 main crops, the other keys and https://projectcanopi.com/fr/consortium/ the link is
// about 1,500 characters (v2 needed 3,600), under the 2,000 that the most limited chat and mail
// clients keep whole. A dropped token is reported as the hex prefix it stands for (9 digits).
// Decoding reads at most MAX_LINK_IDS tokens per key: a stated limit, far above any climate list
// (about 200 plants in 2026; they will grow), that keeps a hostile link from blocking the page; the
// ids past it are reported ('excess', with their count), never dropped silently.
//
// Older links (v2, or no `v`): ids are hex prefixes (8 characters, or longer at a UUID segment
// boundary), joined with "." (or ","), in p (kept), x (removed) and a (members). They still decode,
// and a link still waiting for its climate file is written back as v2 by the page (DecodedState
// .version). Links from before the climate-first tool carry r (region) and b (borrowed cell
// region): both are ignored, without a notice, since one climate file now serves every region.
import type { ClimateFile, Taxon } from './types.ts';
import type { Site } from './site.ts';
import type { SiteClimate } from './climates.ts';
import { DEFAULT_SITE, lights, rooms, soils, waters } from './site.ts';
import { isSiteClimate, siteClimates } from './climates.ts';

// The share link's own version, kept apart from the export's FORMAT_VERSION.
export const LINK_VERSION = 3;
// `k=-`: the user chose "No country" (saved state only).
export const NO_COUNTRY = '-';
// Main crops: "What do you mainly want to grow?" takes up to three (owner, 2026-10-28).
export const MAX_CROPS = 3;
// Tokens read per key (see the header): far above any climate list.
export const MAX_LINK_IDS = 2000;
// The two-letter code of each climate in `g`.
export const GUEST_CODES: Record<SiteClimate, string> = { tropical: 'tr', subtropical: 'su', arid: 'ar', mediterranean: 'me', temperate: 'te', continental: 'co', boreal: 'bo' };

// A plant from another climate's list: its id and the list it came from.
export interface Guest { id: string; climate: SiteClimate }

export interface ConsortiumState {
  climate: SiteClimate | null;
  country: string | null; // ISO alpha-2, upper case; only the invasive warnings use it
  noCountry?: boolean; // the user chose "No country" (k=-); decodeState always sets it
  site: Site;
  kept: string[]; // taxon ids; before resolveState(), the prefixes read from the link
  removed: string[];
  members?: string[] | null; // every member in order; null when the link has none (suggest); decodeState always sets it
  plants?: string[]; // canonical names from a guide preset, until resolveState() makes them kept ids; decodeState always sets it
  crops?: string[]; // main crops, in the order chosen; decodeState always sets it
  guests?: Guest[]; // plants from another climate's list; decodeState always sets it
}

// `excess`: the ids past MAX_LINK_IDS (or MAX_CROPS) in one key, reported once with their count as the value.
export interface Dropped { key: string; value: string; reason: 'unknown' | 'malformed' | 'ambiguous' | 'duplicate' | 'excess' }
// version: the link's id grammar, 2 or 3, so a link still waiting for its file is written back as it came.
export interface DecodedState { state: ConsortiumState; dropped: Dropped[]; version: 2 | 3 }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const SHORT = 6, LONG = 22, SHORT_HEX = 9, LONG_MARK = '.', KEPT_MARK = '*';
const V2_PREFIX = /^[0-9a-f]{8}(-[0-9a-f]{4}(-[0-9a-f]{4}(-[0-9a-f]{4}(-[0-9a-f]{12})?)?)?)?$/;
const COUNTRY = /^[A-Z]{2}$/;
const MAX_NAME_LENGTH = 200;
const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
// An id or prefix as lower-case hex, dashes aside: what tokens and prefixes are matched on.
const hexOf = (id: string) => id.toLowerCase().replace(/-/g, '');

function hexToB64(hex: string): string {
  let bits = '';
  for (const c of hex) bits += parseInt(c, 16).toString(2).padStart(4, '0');
  bits = bits.padEnd(Math.ceil(bits.length / 6) * 6, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 6) out += B64[parseInt(bits.slice(i, i + 6), 2)];
  return out;
}
function b64ToHex(text: string, digits: number): string | null {
  let bits = '';
  for (const c of text) {
    const v = B64.indexOf(c);
    if (v < 0) return null;
    bits += v.toString(2).padStart(6, '0');
  }
  let out = '';
  for (let i = 0; i < digits; i++) out += parseInt(bits.slice(i * 4, i * 4 + 4), 2).toString(16);
  return out;
}

// The v3 token of an id (or of a 9- or 32-hex prefix read from a link): short unless another id of
// `known` shares its 36 bits.
// A 32-digit prefix without dashes came from a whole token of a link still waiting for its file:
// it is written back whole.
function tokenOf(id: string, known: string[] | null): string {
  const hex = hexOf(id), short = hex.slice(0, SHORT_HEX);
  const clash = hex.length >= 32 && (known ? known.some((k) => k !== hex && k.startsWith(short)) : !id.includes('-'));
  return clash ? LONG_MARK + hexToB64(hex.slice(0, 32)) : hexToB64(short);
}

export function encodeState(state: ConsortiumState, cell?: ClimateFile | null, others?: Partial<Record<SiteClimate, ClimateFile>>): URLSearchParams {
  const q = new URLSearchParams();
  const guests = state.guests ?? [];
  const known = cell ? [...cell.taxa, ...guests.flatMap((g) => others?.[g.climate]?.taxa ?? [])].map((t) => hexOf(t.id)) : null;
  const tok = (id: string) => tokenOf(id, known);
  const list = (ids: Iterable<string>) => [...new Set([...ids].map(tok))].sort().join('');
  q.set('v', String(LINK_VERSION));
  if (state.climate) q.set('c', state.climate);
  if (state.country) q.set('k', state.country.toUpperCase());
  else if (state.noCountry) q.set('k', NO_COUNTRY);
  q.set('l', state.site.light);
  q.set('s', state.site.soil);
  q.set('w', state.site.water);
  q.set('m', state.site.room);
  const kept = new Set(state.kept), members = state.members ? [...new Set(state.members)] : null;
  // Members keep their order (it is the order the page lists them in). An empty list is written
  // too: every member removed is a state, not "suggest".
  if (members) q.set('a', members.map((id) => (kept.has(id) ? KEPT_MARK : '') + tok(id)).join(''));
  const inMembers = new Set(members ?? []);
  const keptOnly = [...kept].filter((id) => !inMembers.has(id));
  if (keptOnly.length) q.set('p', list(keptOnly));
  const removed = state.removed.filter((id) => !kept.has(id) && !inMembers.has(id));
  if (removed.length) q.set('x', list(removed));
  if (state.crops?.length) q.set('n', [...new Set(state.crops)].slice(0, MAX_CROPS).map(tok).join(''));
  for (const climate of siteClimates) {
    const ids = guests.filter((g) => g.climate === climate).map((g) => g.id);
    if (ids.length) q.append('g', GUEST_CODES[climate] + list(ids));
  }
  // A guide's plant the page could not resolve yet (no cell loaded) is kept for the next load.
  if (state.plants?.length) q.set('plant', state.plants[0]); // a preset names one plant
  return q;
}

// Matches link prefixes (hex, with or without dashes) against the ids of `pool` (a climate file,
// or its taxa with the guests'). Unknown and ambiguous prefixes are dropped.
export function resolveIds(tokens: string[], pool: { taxa: Taxon[] }, key = 'p'): { ids: string[]; dropped: Dropped[] } {
  const ids = new Set<string>(), dropped: Dropped[] = [];
  const hexes = pool.taxa.map((t) => [hexOf(t.id), t.id] as const);
  for (const token of tokens) {
    const h = hexOf(token);
    const hits = hexes.filter(([x]) => x.startsWith(h));
    if (hits.length === 1) ids.add(hits[0][1]);
    else dropped.push({ key, value: token, reason: hits.length ? 'ambiguous' : 'unknown' });
  }
  return { ids: [...ids], dropped };
}

const oneOf = <T extends string>(list: readonly T[]) => (v: string): v is T => (list as readonly string[]).includes(v);
const codeClimate = new Map(siteClimates.map((c) => [GUEST_CODES[c], c] as const));

// Reads a link's query. With the cell (and, for guests, the other climates' files), kept, removed,
// members and crops hold full ids; without it, the checked prefixes (lower-case hex: 9 or 32
// digits from a v3 link, as written in a v2 one), to pass to resolveState() once the files are loaded.
export function decodeState(params: URLSearchParams | string, cell?: ClimateFile | null, others?: Partial<Record<SiteClimate, ClimateFile>>): DecodedState {
  const q = typeof params === 'string' ? new URLSearchParams(params) : params;
  const dropped: Dropped[] = [];

  // The first value of a key; repeats are dropped.
  const first = (key: string): string | null => {
    const all = q.getAll(key);
    for (const extra of all.slice(1)) dropped.push({ key, value: extra, reason: 'duplicate' });
    return all.length ? all[0] : null;
  };
  const pick = <T extends string>(key: string, valid: (v: string) => v is T, normalise = (v: string) => v): T | null => {
    const raw = first(key);
    if (raw === null) return null;
    const v = normalise(raw.trim());
    if (valid(v)) return v;
    dropped.push({ key, value: raw, reason: 'unknown' });
    return null;
  };

  const v = first('v');
  if (v !== null && v !== '2' && v !== '3') dropped.push({ key: 'v', value: v, reason: 'unknown' });
  const version: 2 | 3 = v === '3' ? 3 : 2;

  // A guide preset names the climate `climate`; a link's own `c` wins over it.
  const climate = q.has('c') || !q.has('climate')
    ? pick('c', isSiteClimate, (x) => x.toLowerCase())
    : pick('climate', isSiteClimate, (x) => x.toLowerCase());
  if (q.has('c')) for (const extra of q.getAll('climate')) dropped.push({ key: 'climate', value: extra, reason: 'duplicate' });
  const plants: string[] = [];
  const plant = first('plant');
  if (plant !== null) {
    if (plant.trim() && plant.length <= MAX_NAME_LENGTH) plants.push(plant.trim());
    else dropped.push({ key: 'plant', value: plant.slice(0, MAX_NAME_LENGTH), reason: 'malformed' });
  }
  // r and b (an old link's region and borrowed cell) are not read: no notice, nothing lost that matters.
  const k = pick('k', (x: string): x is string => x === NO_COUNTRY || COUNTRY.test(x), (x) => x.toUpperCase());
  const noCountry = k === NO_COUNTRY;
  const country = noCountry ? null : k;
  const site: Site = {
    light: pick('l', oneOf(lights)) ?? DEFAULT_SITE.light,
    soil: pick('s', oneOf(soils)) ?? DEFAULT_SITE.soil,
    water: pick('w', oneOf(waters)) ?? DEFAULT_SITE.water,
    room: pick('m', oneOf(rooms)) ?? DEFAULT_SITE.room,
  };

  // Every token counts toward the cap, so malformed ones cannot flood `dropped`.
  const capped = (key: string, cap = MAX_LINK_IDS) => {
    const out = new Set<string>(), kept = new Set<string>();
    let read = 0, excess = 0;
    return {
      // token null: a malformed one, which still counts toward the cap.
      add(token: string | null, raw: string, star = false) {
        if (read++ >= cap) { excess++; return false; }
        if (token === null) return true;
        if (out.has(token)) { dropped.push({ key, value: raw, reason: 'duplicate' }); return; }
        out.add(token);
        if (star) kept.add(token);
        return true;
      },
      done() { if (excess) dropped.push({ key, value: String(excess), reason: 'excess' }); return { ids: [...out], kept: [...kept] }; },
    };
  };
  // v2: dotted hex prefixes.
  const v2Tokens = (key: string) => {
    const c = capped(key);
    for (const raw of (first(key) ?? '').split(/[.,]/)) {
      const token = raw.trim().toLowerCase();
      if (!token) continue;
      if (!V2_PREFIX.test(token)) { if (c.add(null, raw)) dropped.push({ key, value: raw, reason: 'malformed' }); continue; }
      c.add(token, raw);
    }
    return c.done().ids;
  };
  // v3: concatenated tokens ([*] then 6 characters, or "." and 22); the rest of a value that does
  // not parse is one malformed entry.
  const v3Tokens = (key: string, value: string | null, cap = MAX_LINK_IDS, stars = false) => {
    const c = capped(key, cap);
    const text = value ?? '';
    let i = 0;
    while (i < text.length) {
      const start = i;
      const star = stars && text[i] === KEPT_MARK;
      if (star) i++;
      const long = text[i] === LONG_MARK;
      if (long) i++;
      const n = long ? LONG : SHORT, body = text.slice(i, i + n);
      const hex = body.length === n ? b64ToHex(body, long ? 32 : SHORT_HEX) : null;
      if (!hex) { dropped.push({ key, value: text.slice(start, start + 40), reason: 'malformed' }); break; }
      i += n;
      c.add(hex, text.slice(start + (star ? 1 : 0), i), star);
    }
    return c.done();
  };

  let kept: string[], removed: string[], members: string[] | null, crops: string[] = [];
  const guests: Guest[] = [];
  if (version === 3) {
    const a = q.has('a') ? v3Tokens('a', first('a'), MAX_LINK_IDS, true) : null;
    members = a ? a.ids : null;
    kept = [...new Set([...(a?.kept ?? []), ...v3Tokens('p', first('p')).ids])];
    removed = v3Tokens('x', first('x')).ids;
    crops = v3Tokens('n', first('n'), MAX_CROPS).ids;
    for (const value of q.getAll('g')) {
      const c = codeClimate.get(value.slice(0, 2));
      if (!c) { dropped.push({ key: 'g', value: value.slice(0, 40), reason: 'unknown' }); continue; }
      for (const id of v3Tokens('g', value.slice(2)).ids) guests.push({ id, climate: c });
    }
  } else {
    kept = v2Tokens('p'); removed = v2Tokens('x'); members = q.has('a') ? v2Tokens('a') : null;
  }
  const decoded: DecodedState = {
    state: { climate, country, noCountry, site, kept, removed, members, plants, crops, guests },
    dropped,
    version,
  };
  const read = consistent(decoded, false);
  return cell ? resolveState(read, cell, others) : read;
}

// The rules between the lists: a main crop is kept, a plant both kept and removed stays kept, and
// no member is removed; once ids are resolved, every kept plant is a member too (when the link
// lists members).
function consistent({ state, dropped, version }: DecodedState, resolved: boolean): DecodedState {
  const crops = state.crops ?? [];
  const keptAll = [...new Set([...state.kept, ...crops])];
  let members = state.members ?? null;
  if (members && resolved) {
    const inMembers = new Set(members);
    members = [...members, ...keptAll.filter((id) => !inMembers.has(id))];
  }
  const keep = new Set([...keptAll, ...(members ?? [])]);
  const out = [...dropped];
  for (const id of state.removed) if (keep.has(id)) out.push({ key: 'x', value: id, reason: 'duplicate' });
  return { state: { ...state, kept: keptAll, crops, members, removed: state.removed.filter((id) => !keep.has(id)) }, dropped: out, version };
}

// The cell's taxon a guide names, by canonical name: exact first, then case and spacing aside;
// null when the cell has none. resolveState() and the page's guide notice both use it.
export function taxonByName(cell: ClimateFile, name: string): Taxon | null {
  return cell.taxa.find((t) => t.canonical_name === name) ?? cell.taxa.find((t) => nameKey(t.canonical_name) === nameKey(name)) ?? null;
}

// A link decoded without its files (the page reads `c` and `g` first to choose them), resolved once
// they are loaded: a guest is found in its own list (or, once this climate's list has it, is an
// ordinary member); prefixes become full ids; unknown and ambiguous ones are dropped; a main crop
// must be a food plant of this climate (else it stays kept, unmarked); and the kept-over-removed
// rule is applied again on the full ids (a link may carry one id at two lengths).
export function resolveState(decoded: DecodedState, cell: ClimateFile, others?: Partial<Record<SiteClimate, ClimateFile>>): DecodedState {
  const { state } = decoded;
  const guestDropped: Dropped[] = [], guests: Guest[] = [], guestTaxa: Taxon[] = [];
  for (const g of state.guests ?? []) {
    if (resolveIds([g.id], cell).ids.length) continue; // in this climate's list now
    const file = others?.[g.climate];
    const r = file ? resolveIds([g.id], file, 'g') : { ids: [], dropped: [{ key: 'g', value: g.id, reason: 'unknown' as const }] };
    if (r.ids.length && !guests.some((x) => x.id === r.ids[0])) { guests.push({ id: r.ids[0], climate: g.climate }); guestTaxa.push(file!.taxa.find((t) => t.id === r.ids[0])!); }
    guestDropped.push(...r.dropped);
  }
  const pool = { taxa: [...cell.taxa, ...guestTaxa] };
  const k = resolveIds(state.kept, pool, 'p'), x = resolveIds(state.removed, pool, 'x');
  const a = state.members ? resolveIds(state.members, pool, 'a') : null;
  const n = resolveIds(state.crops ?? [], cell, 'n');
  const crops = n.ids.filter((id) => cell.taxa.find((t) => t.id === id)?.role === 'crop');
  // A guide's plant, by canonical name (case and spacing aside), joins the kept plants.
  const kept = new Set([...k.ids, ...n.ids]), named: Dropped[] = [];
  for (const name of state.plants ?? []) {
    const hit = taxonByName(cell, name);
    if (hit) kept.add(hit.id);
    else named.push({ key: 'plant', value: name, reason: 'unknown' });
  }
  // A guest left out is in `g` and again in `a` (and kept): it is reported once, under `g`.
  const lostGuest = new Set(guestDropped.map((d) => hexOf(d.value)));
  const notGuest = (d: Dropped) => !lostGuest.has(hexOf(d.value));
  return consistent({
    state: { ...state, kept: [...kept], removed: x.ids, members: a ? a.ids : null, plants: [], crops, guests },
    dropped: [...decoded.dropped, ...guestDropped, ...k.dropped.filter(notGuest), ...x.dropped, ...(a?.dropped ?? []).filter(notGuest), ...n.dropped, ...named],
    version: decoded.version,
  }, true);
}
