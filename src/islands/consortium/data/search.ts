// The one search module (PP-C c1; slices 3.3, owner row 2026-11-14 "Plant search design"): Find and
// Paste both read it, so a name is found the same way in each. One release-wide index over every
// plant's names (the core's plant_names for the page's language and English, the canonical name) and,
// once fetched, schema 4's names file (vernacular names in 20 languages, WCVP synonyms, accepted
// names; views/find/names.ts fetches it). Pure: no DOM, no store, so scripts/consortium-pp-c1.test.mjs
// runs it in Node. In the find chunk only (Find, Paste): never in the first run.
//
// Ranking tiers (the owner's design, the app's order within a tier):
//   site        names in the page's language: exact, prefix, every query token a whole word, then its
//               alternates (other names in that language, any match);
//   scientific  the canonical name, synonyms and accepted names: exact, prefix, whole words;
//   other       names in any other language, labelled with it: exact, prefix, whole words;
//   then        names where each query token begins a word inside the name (or, in scripts written
//               without spaces, sits inside it), in tier order.
// One hit per plant, at its best rank; each says why it matched (the name, its kind and language)
// and how many other plants use that same name ("also used for 3 other plants").
// Names are compared folded (core fold.ts, canopi-types normalization v1). The scan is linear over
// the folded names (about 30,000, a few milliseconds per query at 4x CPU throttle; probe 2026-11-17),
// with no sorted index. The names file is folded in slices that yield (indexSliced), so no task runs
// long while it is read.
import { fold, queryTokens, type ClimateZone, type Line, type PlantId } from '../../../lib/consortium/index.ts';
import { climateZones } from '../../../lib/consortium/index.ts';

export { fold, queryTokens };

// One plant as the index reads it. names: the core's names by locale (plant_names: English and the
// page's language); other: names-file vernacular names (lang: its code; one in the page's language is an
// alternate); synonyms, accepted: names-file scientific names.
export interface FindEntry {
  id: PlantId;
  canonical: string;
  names: Partial<Record<string, string>>;
  other?: readonly { lang: string; text: string }[];
  synonyms?: readonly string[];
  accepted?: readonly string[];
}
export type Tier = 'site' | 'scientific' | 'other';
export type MatchKind = 'exact' | 'prefix' | 'tokens' | 'alternate';
export type NameKind = 'name' | 'alternate' | 'canonical' | 'synonym' | 'accepted' | 'other';
export interface FindWhy { kind: NameKind; text: string; lang?: string; match: MatchKind }
// shared: how many other plants carry the name that matched.
export interface FindHit { id: PlantId; tier: Tier; why: FindWhy; shared: number }
// A search over the index; langs: the languages of the names-file names it holds (none without it).
export interface Finder { (query: string): FindHit[]; langs: readonly string[]; close(query: string): FindHit[]; exact(query: string): FindHit[] }

const KINDS: readonly NameKind[] = ['name', 'alternate', 'canonical', 'synonym', 'accepted', 'other'];
const TIER_OF: Record<NameKind, Tier> = { name: 'site', alternate: 'site', canonical: 'scientific', synonym: 'scientific', accepted: 'scientific', other: 'other' };
const TIER_RANK: Record<Tier, number> = { site: 0, scientific: 1, other: 2 };
const MATCHES: readonly MatchKind[] = ['exact', 'prefix', 'tokens', 'tokens'];
// Scripts written without spaces between words: a query in them matches inside a name too.
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

// The index as flat arrays (one slot per name), built name by name.
class Builder {
  readonly ids: PlantId[] = [];
  readonly canonical: string[] = [];
  private readonly at = new Map<PlantId, number>();
  readonly plant: number[] = [];
  readonly kind: number[] = [];
  readonly lang: string[] = [];
  readonly text: string[] = [];
  readonly folded: string[] = [];
  // The slots of each folded name, for exact lookups and "also used for N other plants" (kept as
  // names are added, so the sliced build spreads it too).
  readonly slots = new Map<string, number[]>();
  // Each plant's folded names (kind-blind), so a name already there under a better kind is not added again.
  private readonly seen: Set<string>[] = [];
  readonly site: string;
  constructor(site: string) { this.site = site; }
  plantOf(id: PlantId, canonical: string): number {
    let p = this.at.get(id);
    if (p === undefined) { p = this.ids.length; this.at.set(id, p); this.ids.push(id); this.canonical.push(canonical); this.seen.push(new Set()); }
    return p;
  }
  has(id: PlantId): number | undefined { return this.at.get(id); }
  add(p: number, kind: NameKind, lang: string, text: string): void {
    const f = fold(text);
    if (!f) return;
    const key = `${TIER_OF[kind]}\u0000${f}`;
    if (this.seen[p].has(key)) return;
    this.seen[p].add(key);
    this.plant.push(p); this.kind.push(KINDS.indexOf(kind)); this.lang.push(lang); this.text.push(text); this.folded.push(f);
    const at = this.slots.get(f);
    if (at) at.push(this.folded.length - 1); else this.slots.set(f, [this.folded.length - 1]);
  }
  entry(e: FindEntry): void {
    const p = this.plantOf(e.id, e.canonical);
    const own = e.names[this.site];
    if (own) this.add(p, 'name', this.site, own);
    this.add(p, 'canonical', '', e.canonical);
    for (const s of e.synonyms ?? []) this.add(p, 'synonym', '', s);
    for (const s of e.accepted ?? []) this.add(p, 'accepted', '', s);
    for (const o of e.other ?? []) this.vernacular(p, o.lang, o.text);
    for (const [l, t] of Object.entries(e.names)) if (t && l !== this.site) this.add(p, 'other', l, t);
  }
  vernacular(p: number, lang: string, text: string): void {
    this.add(p, lang === this.site ? 'alternate' : 'other', lang, text);
  }
  finish(fileLangs: Iterable<string> = []): Finder {
    return finder(this, [...new Set(fileLangs)].sort());
  }
}

function finder(b: Builder, langs: string[]): Finder {
  const { plant, kind, lang, text, folded, ids, canonical, slots } = b;
  const users = (f: string): number => new Set(slots.get(f)!.map((i) => plant[i])).size;
  const hitOf = (i: number, m: MatchKind): FindHit => {
    const k = KINDS[kind[i]];
    const why: FindWhy = { kind: k, text: text[i], match: k === 'alternate' ? 'alternate' : m };
    if (k === 'other' || k === 'alternate') why.lang = lang[i];
    return { id: ids[plant[i]], tier: TIER_OF[k], why, shared: users(folded[i]) - 1 };
  };
  const ordered = (best: Map<number, [number, number, MatchKind]>): FindHit[] =>
    [...best].sort((x, y) => x[1][0] - y[1][0] || (canonical[x[0]] < canonical[y[0]] ? -1 : canonical[x[0]] > canonical[y[0]] ? 1 : 0))
      .map(([, [, i, m]]) => hitOf(i, m));
  const find = ((query: string): FindHit[] => {
    const { admission, tokens } = queryTokens(query);
    if (admission !== 'active-text') return [];
    const q = fold(query), inside = UNSPACED.test(q);
    // Every match holds the query's longest token: one native indexOf skips most names.
    const key = inside ? q : tokens.reduce((a, t) => (t.length > a.length ? t : a), '');
    // Each plant's best: [rank, name slot, match].
    const best = new Map<number, [number, number, MatchKind]>();
    for (let i = 0; i < folded.length; i++) {
      const f = folded[i];
      if (f.indexOf(key) < 0) continue;
      let m: number;
      if (f === q) m = 0;
      else if (f.startsWith(q)) m = 1;
      else if (tokens.every((t) => ` ${f} `.includes(` ${t} `))) m = 2;
      else if (tokens.every((t) => f.startsWith(t) || f.includes(` ${t}`)) || (inside && f.includes(q))) m = 3;
      else continue;
      const k = KINDS[kind[i]];
      // Whole words rank in their tier; a word begun inside a name ("gombo" in "Little gombosia")
      // ranks after every tier, so a scientific name's prefix still comes first.
      const rank = m === 3 ? 12 + TIER_RANK[TIER_OF[k]] : TIER_RANK[TIER_OF[k]] * 4 + (k === 'alternate' ? 3 : m);
      const had = best.get(plant[i]);
      if (!had || rank < had[0]) best.set(plant[i], [rank, i, MATCHES[m]]);
    }
    return ordered(best);
  }) as Finder;
  find.langs = langs;
  // Each plant once, by its best tier, over some name slots (match 'exact': the whole name).
  const byTier = (at: Iterable<number>): FindHit[] => {
    const best = new Map<number, [number, number, MatchKind]>();
    for (const i of at) {
      const rank = TIER_RANK[TIER_OF[KINDS[kind[i]]]];
      const had = best.get(plant[i]);
      if (!had || rank < had[0]) best.set(plant[i], [rank, i, 'exact']);
    }
    return ordered(best);
  };
  // The close spellings of a query nothing answers: names one letter off, each plant once (PP-C2).
  find.close = (query: string): FindHit[] => {
    const q = fold(query), at: number[] = [];
    if ([...q].length < 5) return [];
    for (let i = 0; i < folded.length; i++) if (Math.abs(folded[i].length - q.length) <= 1 && oneOff(folded[i], q)) at.push(i);
    return byTier(at);
  };
  // The plants with a name that folds to exactly the query (Paste: a pasted line is a whole name).
  find.exact = (query: string): FindHit[] => byTier(slots.get(fold(query)) ?? []);
  return find;
}

// The index over entries, folded at once (Paste's and the tests' path; the page's core names are 673
// plants). plants: the release's plants (every entry when absent); lang: the page's language.
export function releaseIndex({ names, plants, lang }: { names: readonly FindEntry[]; plants?: readonly PlantId[]; lang: string }): Finder {
  const b = new Builder(lang), keep = plants ? new Set(plants) : null;
  for (const e of names) if (!keep || keep.has(e.id)) b.entry(e);
  return b.finish();
}

// ---- the names file (schema 4; canopi-data format note "The names file") ----

// Its first line: `#canopi-names/1 release_id=… core_raw_sha256=…`.
export interface NamesHeader { release_id: string; core_raw_sha256: string }
export function namesHeader(text: string): NamesHeader | null {
  const first = text.slice(0, text.indexOf('\n'));
  const m = /^#canopi-names\/1 (.*)$/.exec(first);
  if (!m) return null;
  const fields = Object.fromEntries(m[1].split(' ').map((kv) => kv.split('=') as [string, string]));
  return fields.release_id && fields.core_raw_sha256 ? { release_id: fields.release_id, core_raw_sha256: fields.core_raw_sha256 } : null;
}
// Whether a names file belongs to the page's database (4.4): its integers are that release's
// plants.plant, so a file bound to another release or core is dropped, never mapped onto wrong plants.
export const namesFor = (file: NamesHeader | null, page: NamesHeader): boolean =>
  !!file && file.release_id === page.release_id && file.core_raw_sha256 === page.core_raw_sha256;

// The names file's kind codes (its `#codes kind=` line: 1 vernacular, 2 scientific_synonym,
// 3 accepted_name); a code the reader does not know is skipped (open vocabulary).
const FILE_KINDS: Record<string, 'vernacular' | 'synonym' | 'accepted'> = { vernacular: 'vernacular', scientific_synonym: 'synonym', accepted_name: 'accepted' };
function kindCodes(text: string): Map<string, 'vernacular' | 'synonym' | 'accepted'> {
  const out = new Map<string, 'vernacular' | 'synonym' | 'accepted'>();
  const line = /^#codes (.*)$/m.exec(text.slice(0, 4096))?.[1] ?? '';
  const kinds = /(?:^| )kind=([^ ]*)/.exec(line)?.[1] ?? '';
  for (const pair of kinds.split(',')) { const [code, name] = pair.split(':'); if (FILE_KINDS[name]) out.set(code, FILE_KINDS[name]); }
  return out;
}

// Gives the main thread back between slices: scheduler.yield() where the browser has it, else a task.
const pause = (): Promise<void> => {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return s?.yield ? s.yield() : new Promise((r) => setTimeout(r, 0));
};

// The index over the core's entries and the names file's rows, folded in slices of `slice` names
// that yield between them (4.7: no long task while the file is read). plantIds: the core's integer
// plants.plant → id (PlantSource.names); a row of a plant the core does not list is skipped.
// The text must already be checked to belong to the page's database (namesFor).
export async function indexSliced(
  { names, lang, file, plantIds }: { names: readonly FindEntry[]; lang: string; file: string; plantIds: ReadonlyMap<number, PlantId> },
  { slice = 2000, rest = pause }: { slice?: number; rest?: () => Promise<void> } = {},
): Promise<Finder> {
  const b = new Builder(lang);
  for (let i = 0; i < names.length; i++) { b.entry(names[i]); if ((i + 1) % slice === 0) await rest(); }
  const codes = kindCodes(file), langs = new Set<string>();
  let at = 0, n = 0;
  // Past the three header lines (#canopi-names, #codes, the column line).
  for (let h = 0; h < 3 && at >= 0; h++) at = file.indexOf('\n', at) + 1;
  while (at > 0 && at < file.length) {
    const end = file.indexOf('\n', at), line = file.slice(at, end < 0 ? file.length : end);
    at = end < 0 ? file.length : end + 1;
    const [plant, kind, l, text] = line.split('\t');
    const id = plantIds.get(Number(plant)), k = codes.get(kind);
    const p = id === undefined ? undefined : b.has(id);
    if (p !== undefined && k && text) {
      if (k === 'vernacular') { if (l) { b.vernacular(p, l, text); langs.add(l); } } else b.add(p, k, '', text);
    }
    if (++n % slice === 0) await rest();
  }
  return b.finish(langs);
}

// ---- around the search ----

// The lists that hold a plant, in the climate order (4.8: a hit outside the current list names them).
export const listsOf = (id: PlantId, lists: Partial<Record<ClimateZone, readonly PlantId[]>>): ClimateZone[] =>
  climateZones.filter((z) => lists[z]?.includes(id));

// The names line (boards FindType, FindNone): how many languages the names file holds, never a fixed
// count; without the file, the page's language, English and scientific names.
export const namesLine = (fileLangs: readonly string[]): Line =>
  fileLangs.length ? { key: 'consortium.find.namesFile', vars: { n: fileLangs.length }, count: fileLangs.length } : { key: 'consortium.find.namesCore', vars: {} };

// At most one letter off (one added, dropped or changed), for names of five letters or more: the
// close spellings of Find's no-result state and Paste's close matches.
export function oneOff(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1 || Math.min(la, lb) < 5) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}
