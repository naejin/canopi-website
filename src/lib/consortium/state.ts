// The share link (link v5; plant-palette-architecture 8.1, 8.2), carried in the address's fragment so
// it never reaches a server or CDN log (coordinator row "Scale build, coordinator choices" 2026-10-28).
// One version for the whole Plant palette redesign: written from PP-B on, and read under the extension
// rule (coordinator row "Plant palette plan amendments", 2026-11-14), so a tab on PP-B code reads a link
// a later push writes.
//
//   #v=5&c=temperate&m=small&a=…&x=…&g=tr…&z=120&y=2041-2070[&k=FR&o=45.75,4.85&l=sun&w=average&q=sheltered&r=drains&h=town&s=own.65.loam]&e=1
//
//   v link version (LINK_VERSION); c climate (lowercase); m room (pots, small, large, field, unsure;
//   always written); a the members in order; x removed plants; g plants added from another climate's
//   list, one `g` per list: its two-letter code (GUEST_CODES) then its tokens (each is also in `a`);
//   z the plot size in whole m² (1 to MAX_PLOT_M2, when set); y the period shown, a PeriodId span
//   string (absent: today). Only with "Include my place" (encodePlace, the bracketed part): k country
//   (ISO alpha-2, from a chosen, location or link source, never a guess), o the site's climate cell
//   centre "lat,lon" (never the precise position), l w q r h the spot answers (light, water, wind,
//   ground after rain, height; only when answered), s the soil (`pots`, or
//   `own.<pH × 10 | acid | neutral | chalky | ->.<texture id | ->`; absent: the soil map). e=1 the end,
//   always last: a link a mail or chat client cut short lacks it.
//
// Extension rule (8.1): 1. a key this decoder does not know is ignored wherever it appears; 2. a value
// it cannot read falls back for that key alone (m → unsure, an unknown climate dropped, a spot value
// read up to its first "." and unknown words → unsure, s segments after the third ignored, an unknown
// pH or texture → "-", y → today with LinkNotice.period); 3. a key whose absence would change a
// verdict needs a bump or a place in the requires key `u=<comma list>`: a key listed there this
// decoder does not know gives the "newer" notice, plants restored; 4. a version below 5 (the old beta
// tool) is read as any unreadable link (owner 2026-11-17: no backward compatibility work). u is the
// requires key.
//
// Ids. A token is the id's first 36 bits (9 hex digits, dashes aside) in 6 base64url characters, with
// nothing between tokens. When another id the encoder knows shares those 36 bits, the id is written
// whole: "." then its 128 bits in 22 characters. Tokens never depend on a file's order or size, so a
// link survives a data update: decoding matches each token against the ids at hand, and a plant no
// longer listed (or now ambiguous) is left out and counted (LinkNotice.unknownCount). Only "." and
// base64url characters are used, which a query string leaves unescaped. 6 characters per member: 200
// members stay near 1,200 characters. Decoding reads at most MAX_LINK_IDS tokens per key (every `g`
// together), so a hostile link cannot block the page; the rest are counted as unknown. Decoding never
// throws: a token list that stops mid-token is read up to there and reported as cut.
import type { ClimateZone, DecodedLink, LinkNotice, PeriodId, PlantId, ShareState, SiteLookup, SoilAnswer, Spot } from './types.ts';
import { TODAY_PERIOD } from './source.ts';
import { periodIds, roomValues, soilWords, spotGrounds, spotHeights, spotLights, spotWaters, spotWinds, textureIds } from './types.ts';
import { climateZones, siteIdOf, zoneOfSiteId } from './zones.ts';

export const LINK_VERSION = 5;
export const MAX_LINK_IDS = 2000;
// Above this many characters, some apps cut links (design check §5: "Some apps cut long links…").
export const LONG_LINK = 2000;
export const END_KEY = 'e';
export const GUEST_CODES: Record<ClimateZone, string> = { Tropical: 'tr', Subtropical: 'su', Arid: 'ar', Mediterranean: 'me', Temperate: 'te', Continental: 'co', Boreal: 'bo' };
// The plot size a link and the save accept, whole square metres (8.1 `z`).
export const MAX_PLOT_M2 = 1_000_000;
// The keys this decoder knows (a key listed in `u=` and not here gives the "newer" notice); any other
// key (n, p and t included) is ignored.
export const LINK_KEYS = ['v', 'c', 'k', 'm', 'a', 'x', 'g', 'z', 'y', 'o', 'l', 'w', 'q', 'r', 'h', 's', 'u', END_KEY] as const;
// The private keys, written only with "Include my place" (encodePlace), in this order.
export const PLACE_KEYS = ['k', 'o', 'l', 'w', 'q', 'r', 'h', 's'] as const;
// Spot answers by link key.
const SPOT_KEYS = { l: ['light', spotLights], w: ['water', spotWaters], q: ['wind', spotWinds], r: ['ground', spotGrounds], h: ['height', spotHeights] } as const;
const UNSURE_SPOT: Spot = { light: 'unsure', water: 'unsure', wind: 'unsure', ground: 'unsure', height: 'unsure' };

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const SHORT = 6, LONG = 22, SHORT_HEX = 9, LONG_HEX = 32, LONG_MARK = '.';
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
// The climate grid's cell size in degrees (canopi-climate v0.2, src/lib/climate/grid.ts; the core may
// not import the reader, so consortium-link-v5.test.mjs checks this snap against the reader's cellOf).
const LINK_CELL_DEG = 0.1;
const CELLS_LAT = 1800, CELLS_LON = 3600, SNAP_EPS = 1e-9;
// The centre of the 0.1° cell holding a point, as the climate grid finds it (rows from the north, a
// point on a row edge belongs to the cell south of it; columns from 180° W, a point on a column edge
// to the cell east of it, longitudes wrapping), in hundredths of a degree so no binary rounding shows.
// null for a latitude outside ±90 or a value not finite. A link only ever holds a cell centre: encode
// snaps the origin it is given, decode snaps the `o` it reads (owner answer 5: never a precise point).
export function snapOrigin(o: LinkOrigin): LinkOrigin | null {
  if (!Number.isFinite(o.lat) || !Number.isFinite(o.lon) || Math.abs(o.lat) > 90) return null;
  const row = Math.min(CELLS_LAT - 1, Math.max(0, Math.floor((90 - o.lat) / LINK_CELL_DEG + SNAP_EPS)));
  const lon = (((o.lon + 180) % 360) + 360) % 360;
  const col = Math.min(CELLS_LON - 1, Math.max(0, Math.floor(lon / LINK_CELL_DEG + SNAP_EPS)));
  return { lat: (9000 - row * 10 - 5) / 100, lon: (col * 10 + 5 - 18000) / 100 };
}
// Written with a literal comma (URLSearchParams would escape it), two decimals: a cell centre needs no more.
const originText = (o: LinkOrigin): string | null => {
  const c = snapOrigin(o);
  return c ? `${c.lat.toFixed(2)},${c.lon.toFixed(2)}` : null;
};

// Where a link version stands against this decoder (8.2), from `v` alone: 'current' (5), 'newer'
// (above 5: nothing restored, a newer save kept), 'unreadable' (not a whole number from 1, or below 5:
// the old beta tool's links, read as any unreadable link (owner 2026-11-17, "No backward compatibility
// work"): nothing restored, the save kept), 'absent' (no `v`: a fragment with `a` is unreadable, one
// without is no palette link). The one version test: decodeLink, persist.ts readRecord and restore.ts
// read it.
export type LinkVersion = 'current' | 'newer' | 'unreadable' | 'absent';
export function linkVersionStatus(v: string | null): LinkVersion {
  if (v === null) return 'absent';
  if (!/^[1-9]\d{0,8}$/.test(v)) return 'unreadable';
  const n = Number(v);
  return n === LINK_VERSION ? 'current' : n > LINK_VERSION ? 'newer' : 'unreadable';
}

// The soil answer as `s` writes it (null: the soil map, written as no `s`).
function soilText(soil: SoilAnswer | null): string | null {
  if (!soil || soil.from === 'map') return null;
  if (soil.from === 'pots') return 'pots';
  const ph = soil.ph !== null && Number.isFinite(soil.ph) && soil.ph >= 0 && soil.ph <= 14 ? String(Math.round(soil.ph * 10)) : soil.word ?? '-';
  return `own.${ph}.${soil.texture ?? '-'}`;
}

// The private part of a link alone, without "&" around it: "k=…&o=…&l=…&w=…&q=…&r=…&h=…&s=…" (8.1).
// k: state.country (the caller passes it only from a chosen, location or link source, never a guess);
// o: the site's cell centre, when given; a spot answer only when answered; s only when not the map.
// Also the save's `place` (without k and o: persist.ts) and the canopi-place seed.
export function encodePlace(state: Pick<ShareState, 'country' | 'spot' | 'soil'>, origin: LinkOrigin | null = null): string {
  const out: string[] = [];
  const k = state.country && COUNTRY.test(state.country.toUpperCase()) ? state.country.toUpperCase() : null;
  if (k) out.push(`k=${k}`);
  const o = origin && originText(origin);
  if (o) out.push(`o=${o}`);
  const spot = state.spot ?? UNSURE_SPOT;
  for (const [key, [field]] of Object.entries(SPOT_KEYS) as [keyof typeof SPOT_KEYS, (typeof SPOT_KEYS)[keyof typeof SPOT_KEYS]][]) {
    if (spot[field] !== 'unsure') out.push(`${key}=${spot[field]}`);
  }
  const s = soilText(state.soil);
  if (s) out.push(`s=${s}`);
  return out.join('&');
}

// The link's fragment, without "#": "v=5&…&e=1". place: the reader's "Include my place" tick, which
// adds encodePlace's part (k, o when origin is given, the spot answers, the soil; an origin given
// implies the tick unless place is false, as persist.ts currentFragment); without it the link holds
// the palette only (the address bar and the save's fragment are always this public form).
export function encodeLink(state: ShareState, known: KnownIds, { origin = null, place = origin !== null }: { origin?: LinkOrigin | null; place?: boolean } = {}): string {
  const tok = tokens(Object.values(known).flatMap((ids) => [...(ids ?? [])]));
  const list = (ids: Iterable<PlantId>) => [...new Set([...ids].map(tok))].sort().join('');
  const pairs: [string, string][] = [['v', String(LINK_VERSION)]];
  if (state.climate) pairs.push(['c', siteIdOf(state.climate)]);
  pairs.push(['m', state.room]);
  const members = [...new Set(state.members)];
  // An empty member list is written too: every member removed is a state, not "suggest".
  pairs.push(['a', members.map(tok).join('')]);
  const inMembers = new Set(members);
  // A removed plant no list of the link knows (a guest taken out: its climate is no longer read) is
  // dropped: it would read back as "no longer in the list" (pre-push review 1).
  const listed = new Set(Object.values(known).flatMap((ids) => [...(ids ?? [])]));
  const removed = state.removed.filter((id) => !inMembers.has(id) && listed.has(id));
  if (removed.length) pairs.push(['x', list(removed)]);
  for (const zone of climateZones) {
    const ids = state.guests.filter((g) => g.from === zone).map((g) => g.id);
    if (ids.length) pairs.push(['g', GUEST_CODES[zone] + list(ids)]);
  }
  const plot = plotOf(state.plot);
  if (plot !== null) pairs.push(['z', String(plot)]);
  if (state.period !== TODAY_PERIOD) pairs.push(['y', state.period]);
  const priv = place ? encodePlace(state, origin) : '';
  return `${new URLSearchParams(pairs).toString()}${priv ? `&${priv}` : ''}&${END_KEY}=1`;
}

// A plot size as the link holds it: a whole number of m², 1 to MAX_PLOT_M2, else null.
const plotOf = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_PLOT_M2 ? v : null;

// The site location a link carries (`o=lat,lon`), or null when it has none or it is not a valid
// coordinate. A link's `c` and place answers still win over anything derived from it.
// Any point is read as the centre of its cell (snapOrigin), so a link written by hand with a precise
// point never carries it further. The first `o` wins, as for every key read once.
export function linkOrigin(link: string): LinkOrigin | null {
  const m = /^(-?\d{1,3}(?:\.\d{1,6})?),(-?\d{1,3}(?:\.\d{1,6})?)$/.exec(params(link).get('o')?.trim() ?? '');
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? snapOrigin({ lat, lon }) : null;
}

// The long-link check, on the whole URL the reader is about to share (never on a link being read).
export const isLongLink = (url: string): boolean => url.length > LONG_LINK;

// A key given twice: the first is read (URLSearchParams.get); `g` alone is read per list, a list twice cut.
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

interface Token { hex: string }

// Concatenated tokens (6 characters, or "." and 22). Returns the tokens read, whether the value stopped
// inside a token (a cut link), and whether any token was readable at all (counted past the cap too).
function readTokens(value: string, cap: { left: number; excess: number }): { tokens: Token[]; malformed: boolean } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < value.length) {
    const long = value[i] === LONG_MARK;
    if (long) i++;
    const n = long ? LONG : SHORT, body = value.slice(i, i + n);
    const hex = body.length === n ? b64ToHex(body, long ? LONG_HEX : SHORT_HEX) : null;
    if (!hex) return { tokens, malformed: true };
    i += n;
    if (cap.left <= 0) { cap.excess++; continue; }
    cap.left--;
    tokens.push({ hex });
  }
  return { tokens, malformed: false };
}

const oneOf = <T extends string>(list: readonly T[], v: string | null): T | null => (v !== null && (list as readonly string[]).includes(v) ? (v as T) : null);

// A spot value: the word before the first "." (a later figure, such as CLIM-4's `h=higher.650`, is
// left to the decoder that knows it), else 'unsure'.
const spotWord = <T extends string>(list: readonly T[], v: string | null): T | 'unsure' =>
  oneOf(list, v === null ? null : v.split('.')[0]) ?? 'unsure';

// The soil a link's `s` holds, or null for the soil map (absent, `map` or a value not read).
function readSoil(v: string | null): SoilAnswer | null {
  if (v === null) return null;
  if (v === 'pots') return { from: 'pots' };
  const [from, ph = '-', texture = '-'] = v.split('.');
  if (from !== 'own') return null;
  const tenths = /^\d{1,3}$/.test(ph) && Number(ph) <= 140 ? Number(ph) / 10 : null;
  return { from: 'own', ph: tenths, word: tenths === null ? oneOf(soilWords, ph) : null, texture: oneOf(textureIds, texture) };
}

// A state that restores nothing: no climate, no plants, every answer as it starts.
const emptyState = (): ShareState => ({ climate: null, country: null, room: 'unsure', plot: null, period: TODAY_PERIOD, spot: null, soil: null, members: [], removed: [], guests: [] });
const noNotice = (): LinkNotice => ({ unknownCount: 0, cut: false, newer: false, unreadable: false, period: false });

// Reads a link (with or without its "#") against the ids at hand (see linkClimates). Never throws.
// place: a private part kept apart from the fragment (a save's `place`, history.state.pl), read for
// the keys the link itself does not hold.
export function decodeLink(link: string, known: KnownIds, place: string | null = null): DecodedLink {
  const text = link.replace(/^[#?]/, '');
  const q = params(text);
  if (place) for (const [key, value] of params(place)) if ((PLACE_KEYS as readonly string[]).includes(key) && !q.has(key)) q.append(key, value);
  const notice = noNotice();
  const status = linkVersionStatus(q.get('v'));
  // Another version, a `v` that is no version, or no `v` with plants: nothing restored (8.2).
  if (status !== 'current') {
    const state = emptyState();
    if (status === 'newer') notice.newer = true;
    else if (status === 'unreadable' || q.has('a')) notice.unreadable = true;
    return { state, notice };
  }
  notice.cut = q.get(END_KEY) !== '1';
  // `u=`: the keys this link needs read (rule 3); one this decoder does not know: the newer line.
  const requires = (q.get('u') ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  if (requires.some((k) => !(LINK_KEYS as readonly string[]).includes(k))) notice.newer = true;
  const state = emptyState();
  const c = q.get('c');
  state.climate = c === null ? null : zoneOf(c);
  // Two upper-case letters exactly, as encodePlace writes them; anything else (fr, ZZZ, empty) is no country.
  const k = q.get('k') ?? '';
  state.country = COUNTRY.test(k) ? k : null;
  state.room = oneOf(roomValues, q.get('m')) ?? 'unsure';
  const z = q.get('z');
  state.plot = z !== null && /^\d{1,7}$/.test(z) ? plotOf(Number(z)) : null;
  const y = q.get('y');
  const period = oneOf(periodIds, y);
  if (y !== null && !period) notice.period = true;
  state.period = period ?? TODAY_PERIOD;
  const spot: Spot = { ...UNSURE_SPOT };
  for (const [key, [field, list]] of Object.entries(SPOT_KEYS) as [keyof typeof SPOT_KEYS, (typeof SPOT_KEYS)[keyof typeof SPOT_KEYS]][]) {
    (spot as unknown as Record<string, string>)[field] = spotWord(list as readonly string[], q.get(key));
  }
  // No answer other than 'unsure': the link brings no spot (8.3 "A link without a place").
  state.spot = Object.values(spot).some((v) => v !== 'unsure') ? spot : null;
  state.soil = readSoil(q.get('s'));

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
  for (const zone of zones) index(known[zone] ?? [], byShort, byLong);
  const unknown = new Set<string>();
  const resolveIn = (tok: Token, short: Map<string, PlantId[]>, long: Map<string, PlantId>): PlantId | null => {
    const hit = tok.hex.length === LONG_HEX ? long.get(tok.hex) ?? null : (short.get(tok.hex)?.length === 1 ? short.get(tok.hex)![0] : null);
    if (!hit) unknown.add(tok.hex.slice(0, SHORT_HEX));
    return hit;
  };
  const resolve = (tok: Token) => resolveIn(tok, byShort, byLong);
  const uniq = (ids: (PlantId | null)[]) => [...new Set(ids.filter((x): x is PlantId => x !== null))];

  // Members. `e=1` with a non-empty `a` holding no readable token is unreadable (8.2: a token matter,
  // not a cut); an empty `a` is a valid empty palette.
  const aCap = { left: MAX_LINK_IDS, excess: 0 };
  const a = q.get('a') ?? '';
  const r = readTokens(a, aCap);
  if (a && !r.tokens.length && !aCap.excess && r.malformed && !notice.cut) {
    return { state: emptyState(), notice: { ...noNotice(), unreadable: true } };
  }
  if (r.malformed) notice.cut = true;
  notice.unknownCount += aCap.excess;
  const members: PlantId[] = [];
  for (const tok of r.tokens) {
    const id = resolve(tok);
    if (id && !members.includes(id)) members.push(id);
  }
  const xCap = { left: MAX_LINK_IDS, excess: 0 };
  const x = readTokens(q.get('x') ?? '', xCap);
  if (x.malformed) notice.cut = true;
  notice.unknownCount += xCap.excess;
  const removed = uniq(x.tokens.map(resolve));
  // Guests are matched in their own list; one cap for every `g` together; a list given twice is cut.
  const guests: ShareState['guests'] = [];
  const gCap = { left: MAX_LINK_IDS, excess: 0 }, codes = new Set<string>();
  for (const value of q.getAll('g')) {
    const code = value.slice(0, 2), zone = codeZone.get(code);
    if (!zone || codes.has(code)) { notice.cut = true; continue; }
    codes.add(code);
    const short = new Map<string, PlantId[]>(), long = new Map<string, PlantId>();
    index(known[zone] ?? [], short, long);
    const g = readTokens(value.slice(2), gCap);
    if (g.malformed) notice.cut = true;
    for (const tok of g.tokens) {
      const id = resolveIn(tok, short, long);
      if (id && !guests.some((h) => h.id === id)) guests.push({ id, from: zone });
    }
  }
  notice.unknownCount += gCap.excess + unknown.size;
  const keep = new Set(members);
  Object.assign(state, { members, removed: removed.filter((id) => !keep.has(id)), guests });
  return { state, notice };
}

// Whether a decoded link brings a place (8.3): its cell (`o`), or a spot or soil answer other than
// 'unsure' and the soil map. `m` and `z` never count (they belong to the palette), nor does `k` alone:
// the reader's country is then kept.
export function bringsPlace(link: string, decoded: DecodedLink): boolean {
  return linkOrigin(link) !== null || decoded.state.spot !== null || decoded.state.soil !== null;
}

// A Field Guide opens the tool with ?plant=<canonical name>&climate=<id> (design check A5; not a
// share link). The page resolves the plant in the climate's list once it is loaded.
export function readPreset(search: string): { climate: ClimateZone | null; plant: string | null } {
  const q = params(search);
  const c = q.get('climate');
  const plant = (q.get('plant') ?? '').trim();
  return { climate: c === null ? null : zoneOf(c), plant: plant && plant.length <= MAX_NAME_LENGTH ? plant : null };
}
