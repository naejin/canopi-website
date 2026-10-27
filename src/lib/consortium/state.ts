// The tool's state in a share link: ?v=2&c=tropical&r=southern_america&k=BR&l=sun&s=acid&w=dry&m=large&p=…&x=…&a=…
//   v format version, c climate (site id, lowercase), r the user's region, b the region of the cell
//   shown when it is another one (the user opted into a borrowed cell), k country (ISO alpha-2),
//   l light, s soil, w water, m room, p kept taxon ids, x removed taxon ids, a the members in order.
// Without `a` (links written before it), the page suggests around the kept plants; with it, the
// page shows those members as they were (evaluate(), never refilled). Without `b`, the cell shown is
// the user's region's. Old links decode the same, so `v` stays 2.
// Site keys are always written, so a link means the same thing if the defaults change. Decoding
// never throws: an unknown or malformed value is left out and listed in `dropped`, so the page can
// say what an old link lost.
//
// Ids are shortened to their first 8 hex characters (one UUID segment), joined with "." (which a
// query string leaves unescaped). With the cell at hand, encodeState lengthens an id to the next
// segment boundary (13, 18, 23, then 36 characters) until no other taxon of the cell shares the
// prefix; decoding matches a prefix against the cell's ids and drops one that matches none or
// several. A full UUID is a valid prefix, so links that carry whole ids keep working.
import type { Cell, Region } from './types.ts';
import type { Site } from './site.ts';
import type { SiteClimate } from './cells.ts';
import { FORMAT_VERSION } from './types.ts';
import { DEFAULT_SITE, lights, rooms, soils, waters } from './site.ts';
import { isRegion, isSiteClimate } from './cells.ts';

export interface ConsortiumState {
  climate: SiteClimate | null;
  region: Region | null; // the user's region
  cellRegion?: Region | null; // the region of the cell shown, when it is not `region`; decodeState always sets it
  country: string | null;
  site: Site;
  kept: string[]; // taxon ids; before resolveIds(), the prefixes read from the link
  removed: string[];
  members?: string[] | null; // every member in order; null when the link has none (suggest); decodeState always sets it
}

export interface Dropped { key: string; value: string; reason: 'unknown' | 'malformed' | 'ambiguous' | 'duplicate' }
export interface DecodedState { state: ConsortiumState; dropped: Dropped[] }

const ID_SEPARATOR = '.';
const PREFIX_LENGTHS = [8, 13, 18, 23, 36];
const ID_PREFIX = /^[0-9a-f]{8}(-[0-9a-f]{4}(-[0-9a-f]{4}(-[0-9a-f]{4}(-[0-9a-f]{12})?)?)?)?$/;
const COUNTRY = /^[A-Z]{2}$/;

// The shortest prefix of the id that no other taxon of the cell starts with (8 characters without a cell).
export function shortId(id: string, cell?: Cell | null): string {
  for (const n of PREFIX_LENGTHS) {
    const prefix = id.slice(0, n);
    if (!cell || !cell.taxa.some((t) => t.id !== id && t.id.startsWith(prefix))) return prefix;
  }
  return id;
}

export function encodeState(state: ConsortiumState, cell?: Cell | null): URLSearchParams {
  const q = new URLSearchParams();
  const ids = (list: string[]) => [...new Set(list.map((id) => shortId(id, cell)))].sort().join(ID_SEPARATOR);
  q.set('v', String(FORMAT_VERSION));
  if (state.climate) q.set('c', state.climate);
  if (state.region) q.set('r', state.region);
  if (state.country) q.set('k', state.country.toUpperCase());
  q.set('l', state.site.light);
  q.set('s', state.site.soil);
  q.set('w', state.site.water);
  q.set('m', state.site.room);
  if (state.cellRegion && state.cellRegion !== state.region) q.set('b', state.cellRegion);
  const kept = new Set(state.kept);
  if (kept.size) q.set('p', ids([...kept]));
  const removed = state.removed.filter((id) => !kept.has(id));
  if (removed.length) q.set('x', ids(removed));
  // Members keep their order (it is the order the page lists them in).
  if (state.members?.length) q.set('a', [...new Set(state.members.map((id) => shortId(id, cell)))].join(ID_SEPARATOR));
  return q;
}

// Matches link prefixes against the cell's ids. Unknown and ambiguous prefixes are dropped.
export function resolveIds(tokens: string[], cell: Cell, key = 'p'): { ids: string[]; dropped: Dropped[] } {
  const ids: string[] = [], dropped: Dropped[] = [];
  for (const token of tokens) {
    const hits = cell.taxa.filter((t) => t.id.startsWith(token));
    if (hits.length === 1) { if (!ids.includes(hits[0].id)) ids.push(hits[0].id); }
    else dropped.push({ key, value: token, reason: hits.length ? 'ambiguous' : 'unknown' });
  }
  return { ids, dropped };
}

const oneOf = <T extends string>(list: readonly T[]) => (v: string): v is T => (list as readonly string[]).includes(v);

// Reads a link's query. With the cell, kept, removed and members hold full ids; without it, the
// checked prefixes, to pass to resolveState() once the cell is loaded.
export function decodeState(params: URLSearchParams | string, cell?: Cell | null): DecodedState {
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

  const version = first('v');
  if (version !== null && version !== String(FORMAT_VERSION)) dropped.push({ key: 'v', value: version, reason: 'unknown' });

  const climate = pick('c', isSiteClimate, (v) => v.toLowerCase());
  const region = pick('r', isRegion, (v) => v.toLowerCase());
  const borrowed = pick('b', isRegion, (v) => v.toLowerCase());
  const cellRegion = borrowed !== region ? borrowed : null;
  const country = pick('k', (v: string): v is string => COUNTRY.test(v), (v) => v.toUpperCase());
  const site: Site = {
    light: pick('l', oneOf(lights)) ?? DEFAULT_SITE.light,
    soil: pick('s', oneOf(soils)) ?? DEFAULT_SITE.soil,
    water: pick('w', oneOf(waters)) ?? DEFAULT_SITE.water,
    room: pick('m', oneOf(rooms)) ?? DEFAULT_SITE.room,
  };

  const tokens = (key: string) => {
    const out: string[] = [];
    for (const raw of (first(key) ?? '').split(/[.,]/)) {
      const token = raw.trim().toLowerCase();
      if (!token) continue;
      if (!ID_PREFIX.test(token)) dropped.push({ key, value: raw, reason: 'malformed' });
      else if (out.includes(token)) dropped.push({ key, value: raw, reason: 'duplicate' });
      else out.push(token);
    }
    return out;
  };
  const decoded: DecodedState = {
    state: { climate, region, cellRegion, country, site, kept: tokens('p'), removed: tokens('x'), members: q.has('a') ? tokens('a') : null },
    dropped,
  };
  const read = consistent(decoded, false);
  return cell ? resolveState(read, cell) : read;
}

// The rules between the lists: a plant both kept and removed stays kept, and no member is removed;
// once ids are resolved, every kept plant is a member too (when the link lists members).
function consistent({ state, dropped }: DecodedState, resolved: boolean): DecodedState {
  let members = state.members ?? null;
  if (members && resolved) {
    const inMembers = new Set(members);
    members = [...members, ...state.kept.filter((id) => !inMembers.has(id))];
  }
  const keep = new Set([...state.kept, ...(members ?? [])]);
  const out = [...dropped];
  for (const id of state.removed) if (keep.has(id)) out.push({ key: 'x', value: id, reason: 'duplicate' });
  return { state: { ...state, members, removed: state.removed.filter((id) => !keep.has(id)) }, dropped: out };
}

// A link decoded without its cell (the page reads `c` and `r` first to choose the cell), resolved
// once the cell is loaded: prefixes become full ids, unknown and ambiguous ones are dropped, and the
// kept-over-removed rule is applied again on the full ids (a link may carry one id at two lengths).
export function resolveState(decoded: DecodedState, cell: Cell): DecodedState {
  const { state } = decoded;
  const k = resolveIds(state.kept, cell, 'p'), x = resolveIds(state.removed, cell, 'x');
  const a = state.members ? resolveIds(state.members, cell, 'a') : null;
  return consistent({
    state: { ...state, kept: k.ids, removed: x.ids, members: a ? a.ids : null },
    dropped: [...decoded.dropped, ...k.dropped, ...x.dropped, ...(a?.dropped ?? [])],
  }, true);
}
