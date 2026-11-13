// The share link (link v4), carried in the address's fragment so it never reaches a server or CDN log
// (coordinator row "Scale build, coordinator choices" 2026-10-28). Design check §2: v1's 36-bit
// base64url tokens, ported, under a new version; v1 links are not read (owner row 2026-11-11: no
// compatibility with v1 share links).
//
//   #v=4&c=temperate&k=FR&l=sun&s=unsure&w=unsure&m=small&a=…&p=…&x=…&n=…&g=tr…&t=3&e=1
//
//   v link version (LINK_VERSION); c climate (lowercase); k country (ISO alpha-2, only when the reader
//   chose it: a guessed country never goes in a link); l light, s soil, w water, m room (always
//   written, so a link means the same thing if the defaults change); a the members in order, a kept
//   one marked with a leading "*"; p kept plants that are not members; x removed plants; n Main
//   crops (at most MAX_CROPS, each also kept); g plants added from another climate's list, one `g`
//   per list: its two-letter code (GUEST_CODES) then its tokens (each is also in `a`); t the stage
//   (0–6) the views show; o the site's climate cell centre "lat,lon" (P5 S5b: only when the reader
//   ticks "include my location" in Share, owner answer 5; never the precise position), just before
//   e; e=1 the end, always last: a link a mail or chat client cut short lacks it.
//
// Ids. A token is the id's first 36 bits (9 hex digits, dashes aside) in 6 base64url characters, with
// nothing between tokens. When another id the encoder knows shares those 36 bits, the id is written
// whole: "." then its 128 bits in 22 characters. Tokens never depend on a file's order or size, so a
// link survives a data update: decoding matches each token against the ids at hand, and a plant no
// longer listed (or now ambiguous) is left out and counted (LinkNotice.unknownCount). Only "*", "."
// and base64url characters are used, which a query string leaves unescaped. 6 characters per member
// (7 kept): 200 members stay near 1,500 characters. Decoding reads at most MAX_LINK_IDS tokens per key
// (every `g` together), so a hostile link cannot block the page; the rest are counted as unknown.
// Decoding never throws: a malformed value falls back ("Not sure", no climate, no stage) and a token
// list that stops mid-token is read up to there and reported as cut.
import type { ClimateZone, DecodedLink, PhaseOrd, PlantId, ShareState, Site, SiteLookup } from './types.ts';
import { climateZones, lights, rooms, soils, waters } from './types.ts';
import { siteIdOf, zoneOfSiteId } from './zones.ts';

export const LINK_VERSION = 4;
export const MAX_CROPS = 3; // "What do you mainly want to grow?" takes up to three (owner, 2026-10-28)
export const MAX_LINK_IDS = 2000;
// Above this many characters, some apps cut links (design check §5: "Some apps cut long links…").
export const LONG_LINK = 2000;
export const END_KEY = 'e';
export const GUEST_CODES: Record<ClimateZone, string> = { Tropical: 'tr', Subtropical: 'su', Arid: 'ar', Mediterranean: 'me', Temperate: 'te', Continental: 'co', Boreal: 'bo' };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const SHORT = 6, LONG = 22, SHORT_HEX = 9, LONG_HEX = 32, LONG_MARK = '.', KEPT_MARK = '*';
const COUNTRY = /^[A-Z]{2}$/;
const MAX_NAME_LENGTH = 200;

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

// A climate id as the site and links write it ('temperate', any case, spaces around) → its zone: the
// one site-id mapping (zones.ts), under the name the island reads.
export const zoneOf: (code: string | null | undefined) => ClimateZone | null = zoneOfSiteId;
const codeZone = new Map(climateZones.map((z) => [GUEST_CODES[z], z] as const));

// The token function for a set of known ids: an id's token is short unless another known id shares
// its first 36 bits. Clashes are looked up in one table: 36-bit prefix → how many known ids share it.
function tokens(known: Iterable<PlantId>): (id: PlantId) => string {
  const hexes = new Set([...known].map(hexOf)), prefixes = new Map<string, number>();
  for (const h of hexes) { const p = h.slice(0, SHORT_HEX); prefixes.set(p, (prefixes.get(p) ?? 0) + 1); }
  return (id) => {
    const hex = hexOf(id), others = (prefixes.get(hex.slice(0, SHORT_HEX)) ?? 0) - (hexes.has(hex) ? 1 : 0);
    return others > 0 ? LONG_MARK + hexToB64(hex.slice(0, LONG_HEX)) : hexToB64(hex.slice(0, SHORT_HEX));
  };
}

// The token of one id against `known` (encodeLink builds the table once for every id).
export const tokenOf = (id: PlantId, known: readonly PlantId[]): string => tokens(known)(id);

// The ids the link's plants are matched against, per climate: the chosen climate's and each guest
// list's (PlantSource.pool(c) ids). Climates not given match nothing.
export type KnownIds = Partial<Record<ClimateZone, readonly PlantId[]>>;

// The site location a link may carry (`o`): a climate cell centre, latitude and longitude in degrees.
export interface LinkOrigin { lat: number; lon: number }
// The cell a link carries for "include my location" (owner answer 5): the climate cell's centre, so
// a link never holds the reader's precise position. null at sea. Here rather than in site-climate.ts
// so Share (in the island) does not pull the location chunk's core into the island.
export function cellCentre(lookup: SiteLookup | null): LinkOrigin | null {
  const c = lookup?.climate;
  return c ? { lat: c.cellLat, lon: c.cellLon } : null;
}
// Written with a literal comma (URLSearchParams would escape it), at most 3 decimals: the 0.1° grid's
// centres need 2.
const originText = (o: LinkOrigin): string | null =>
  Number.isFinite(o.lat) && Number.isFinite(o.lon) && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180 ? `${+o.lat.toFixed(3)},${+o.lon.toFixed(3)}` : null;

// The link's fragment, without "#": "v=4&…&e=1". origin: the site's cell centre, written as `o` only
// when given (the reader's "include my location" tick, P5 owner answer 5).
export function encodeLink(state: ShareState, known: KnownIds, { origin = null }: { origin?: LinkOrigin | null } = {}): string {
  const tok = tokens(Object.values(known).flatMap((ids) => [...(ids ?? [])]));
  const list = (ids: Iterable<PlantId>) => [...new Set([...ids].map(tok))].sort().join('');
  const pairs: [string, string][] = [['v', String(LINK_VERSION)]];
  if (state.climate) pairs.push(['c', siteIdOf(state.climate)]);
  if (state.country) pairs.push(['k', state.country.toUpperCase()]);
  pairs.push(['l', state.site.light], ['s', state.site.soil], ['w', state.site.water], ['m', state.site.room]);
  const crops = [...new Set(state.crops)].slice(0, MAX_CROPS);
  const kept = new Set([...state.kept, ...crops]);
  const members = [...new Set(state.members)];
  // An empty member list is written too: every member removed is a state, not "suggest".
  pairs.push(['a', members.map((id) => (kept.has(id) ? KEPT_MARK : '') + tok(id)).join('')]);
  const inMembers = new Set(members);
  const keptOnly = [...kept].filter((id) => !inMembers.has(id));
  if (keptOnly.length) pairs.push(['p', list(keptOnly)]);
  // A removed plant no list of the link knows (a guest taken out: its climate is no longer read) is
  // dropped: it would read back as "no longer in the list" (pre-push review 1).
  const listed = new Set(Object.values(known).flatMap((ids) => [...(ids ?? [])]));
  const removed = state.removed.filter((id) => !kept.has(id) && !inMembers.has(id) && listed.has(id));
  if (removed.length) pairs.push(['x', list(removed)]);
  if (crops.length) pairs.push(['n', crops.map(tok).join('')]);
  for (const zone of climateZones) {
    const ids = state.guests.filter((g) => g.from === zone).map((g) => g.id);
    if (ids.length) pairs.push(['g', GUEST_CODES[zone] + list(ids)]);
  }
  if (state.stage !== null) pairs.push(['t', String(state.stage)]);
  const o = origin && originText(origin);
  return `${new URLSearchParams(pairs).toString()}${o ? `&o=${o}` : ''}&${END_KEY}=1`;
}

// The site location a link carries (`o=lat,lon`), or null when it has none or it is not a valid
// coordinate. A link's `c` and site answers still win over anything derived from it.
export function linkOrigin(link: string): LinkOrigin | null {
  const m = /^(-?\d{1,3}(?:\.\d{1,6})?),(-?\d{1,3}(?:\.\d{1,6})?)$/.exec(params(link).get('o')?.trim() ?? '');
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

// The long-link check, on the whole URL the reader is about to share (never on a link being read).
export const isLongLink = (url: string): boolean => url.length > LONG_LINK;

const params = (link: string) => new URLSearchParams(link.replace(/^[#?]/, ''));

// The climates whose plants must be at hand before decodeLink: the chosen one, then each guest list.
export function linkClimates(link: string): ClimateZone[] {
  const q = params(link);
  const out: ClimateZone[] = [];
  const c = q.get('c');
  const zone = c === null ? null : zoneOf(c);
  if (zone) out.push(zone);
  for (const g of q.getAll('g')) { const z = codeZone.get(g.slice(0, 2)); if (z && !out.includes(z)) out.push(z); }
  return out;
}

interface Token { hex: string; star: boolean }

// Concatenated tokens ([*] then 6 characters, or "." and 22). Returns the tokens read and whether the
// value stopped inside a token (a cut link).
function readTokens(value: string, stars: boolean, cap: { left: number; excess: number }): { tokens: Token[]; malformed: boolean } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < value.length) {
    const star = stars && value[i] === KEPT_MARK;
    if (star) i++;
    const long = value[i] === LONG_MARK;
    if (long) i++;
    const n = long ? LONG : SHORT, body = value.slice(i, i + n);
    const hex = body.length === n ? b64ToHex(body, long ? LONG_HEX : SHORT_HEX) : null;
    if (!hex) return { tokens, malformed: true };
    i += n;
    if (cap.left <= 0) { cap.excess++; continue; }
    cap.left--;
    tokens.push({ hex, star });
  }
  return { tokens, malformed: false };
}

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | null => (v !== null && (list as readonly string[]).includes(v) ? (v as T) : null);

// Reads a link (with or without its "#") against the ids at hand (see linkClimates). Never throws.
export function decodeLink(link: string, known: KnownIds): DecodedLink {
  const text = link.replace(/^[#?]/, '');
  const q = params(text);
  const notice = { unknownCount: 0, cut: q.get(END_KEY) !== '1', outdated: false };
  const c = q.get('c');
  const climate = c === null ? null : zoneOf(c);
  const k = (q.get('k') ?? '').trim().toUpperCase();
  const site: Site = {
    light: oneOf(lights, q.get('l')) ?? 'unsure',
    soil: oneOf(soils, q.get('s')) ?? 'unsure',
    water: oneOf(waters, q.get('w')) ?? 'unsure',
    room: oneOf(rooms, q.get('m')) ?? 'unsure',
  };
  const t = q.get('t');
  const stage = t !== null && /^[0-6]$/.test(t) ? (Number(t) as PhaseOrd) : null;
  const state: ShareState = { climate, country: COUNTRY.test(k) ? k : null, site, members: [], kept: [], removed: [], guests: [], crops: [], stage };
  // A link without `v` is read as this version; another version reads no plants.
  const v = q.get('v');
  if (v !== null && v !== String(LINK_VERSION)) {
    notice.outdated = true;
    notice.cut = false;
    return { state, notice };
  }

  // The ids of the climates the link names, by 36-bit prefix and by whole id.
  const zones = linkClimates(text);
  const byShort = new Map<string, PlantId[]>(), byLong = new Map<string, PlantId>();
  const index = (ids: readonly PlantId[], short: Map<string, PlantId[]>, long: Map<string, PlantId>) => {
    for (const id of ids) {
      const hex = hexOf(id);
      if (long.has(hex.slice(0, LONG_HEX))) continue;
      long.set(hex.slice(0, LONG_HEX), id);
      const p = hex.slice(0, SHORT_HEX);
      if (!short.has(p)) short.set(p, []);
      short.get(p)!.push(id);
    }
  };
  for (const z of zones) index(known[z] ?? [], byShort, byLong);
  const unknown = new Set<string>();
  const resolveIn = (tok: Token, short: Map<string, PlantId[]>, long: Map<string, PlantId>): PlantId | null => {
    const hit = tok.hex.length === LONG_HEX ? long.get(tok.hex) ?? null : (short.get(tok.hex)?.length === 1 ? short.get(tok.hex)![0] : null);
    if (!hit) unknown.add(tok.hex.slice(0, SHORT_HEX));
    return hit;
  };
  const resolve = (tok: Token) => resolveIn(tok, byShort, byLong);
  // Plants past MAX_LINK_IDS are left out and counted; crops past MAX_CROPS are ignored (only three
  // can be chosen, and each is also a member or kept, so nothing is lost).
  const read = (key: string, stars = false, cap = MAX_LINK_IDS, countExcess = true) => {
    const counter = { left: cap, excess: 0 };
    const r = readTokens(q.get(key) ?? '', stars, counter);
    if (r.malformed) notice.cut = true;
    if (countExcess) notice.unknownCount += counter.excess;
    return r.tokens;
  };
  const uniq = (ids: (PlantId | null)[]) => [...new Set(ids.filter((x): x is PlantId => x !== null))];

  const members: PlantId[] = [], starred: PlantId[] = [];
  for (const tok of read('a', true)) {
    const id = resolve(tok);
    if (!id || members.includes(id)) continue;
    members.push(id);
    if (tok.star) starred.push(id);
  }
  const keptOnly = uniq(read('p').map(resolve));
  const crops = uniq(read('n', false, MAX_CROPS, false).map(resolve));
  const removed = uniq(read('x').map(resolve));
  // Guests are matched in their own list; one cap for every `g` together; a list given twice is cut.
  const guests: ShareState['guests'] = [];
  const gCap = { left: MAX_LINK_IDS, excess: 0 }, codes = new Set<string>();
  for (const value of q.getAll('g')) {
    const code = value.slice(0, 2), zone = codeZone.get(code);
    if (!zone || codes.has(code)) { notice.cut = true; continue; }
    codes.add(code);
    const short = new Map<string, PlantId[]>(), long = new Map<string, PlantId>();
    index(known[zone] ?? [], short, long);
    const r = readTokens(value.slice(2), false, gCap);
    if (r.malformed) notice.cut = true;
    for (const tok of r.tokens) {
      const id = resolveIn(tok, short, long);
      if (id && !guests.some((g) => g.id === id)) guests.push({ id, from: zone });
    }
  }
  notice.unknownCount += gCap.excess + unknown.size;

  const kept = uniq([...starred, ...keptOnly, ...crops]);
  const keep = new Set([...kept, ...members]);
  Object.assign(state, { members, kept, crops, removed: removed.filter((id) => !keep.has(id)), guests });
  return { state, notice };
}

// A Field Guide opens the tool with ?plant=<canonical name>&climate=<id> (design check A5; not a
// share link). The page resolves the plant in the climate's list once it is loaded.
export function readPreset(search: string): { climate: ClimateZone | null; plant: string | null } {
  const q = params(search);
  const c = q.get('climate');
  const plant = (q.get('plant') ?? '').trim();
  return { climate: c === null ? null : zoneOf(c), plant: plant && plant.length <= MAX_NAME_LENGTH ? plant : null };
}
