// "Paste a list" (stream S3; design check §2: the pure parts of v1 scale.js, ported): a pasted list
// of plant names, read as a spreadsheet writes it, matched against this climate's list and then the
// other climates' lists. Names are matched through data/search.ts, the search Find reads (folded by
// normalization v1, synonyms and names-file names included), never with SQL LIKE (A6).
// Pure: no DOM, no store, so scripts/consortium-paste.test.mjs tests it.
import type { ClimateZone, PlantId } from '../../../../lib/consortium/types.ts';
import { fold } from '../../../../lib/consortium/index.ts';
import { releaseIndex, type FindHit, type Finder } from '../../data/search.ts';

// What matching reads of a plant (a Taxon has all of it).
export interface Named { id: PlantId; canonical_name: string; genus?: string | null; names: Partial<Record<string, string>> }

// ---- reading the paste ----

// The closing quote of a quoted cell starting at i, or -1. Only a quote a spreadsheet would close
// opens a quoted cell: its closing quote ends the cell on the same line, or, past a line break, is
// followed by a tab (the row goes on), or (wide, a table) by a line break or the end. Any other quote
// is text and never swallows the lines after it.
function quotedEnd(src: string, i: number, wide: boolean): number {
  let lines = false;
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\n') lines = true;
    if (c !== '"') continue;
    if (src[j + 1] === '"') { j++; continue; }
    const next = src[j + 1], ends = next === undefined || next === '\t' || next === '\n';
    return (lines ? next === '\t' || (wide && ends) : ends) ? j : -1;
  }
  return -1;
}
function readTable(src: string, wide: boolean): { rows: string[][]; columns: number } {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, start = true, tabs = false;
  const endCell = () => { row.push(cell.replace(/\s+$/, '')); cell = ''; start = true; };
  const endRow = () => { endCell(); if (row.some((c) => c.trim())) rows.push(row); row = []; };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
      continue;
    }
    if (start && c === '"' && quotedEnd(src, i, wide) > 0) { quoted = true; start = false; continue; }
    if (c === '\t') { tabs = true; endCell(); continue; }
    if (c === '\n') { endRow(); continue; }
    if (start && /\s/.test(c)) { cell += c; continue; }
    start = false; cell += c;
  }
  endRow();
  return { rows: tabs ? rows : rows.map((r) => [r.join('\t')]), columns: Math.max(0, ...rows.map((r) => r.length)) };
}
// One line split on a comma or a semicolon, a quoted cell ("…", "" for a quote) kept whole.
function splitLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cell = '', quoted = false, start = true;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === sep) { cells.push(cell.trim()); cell = ''; start = true; }
    else if (start && c === '"') { quoted = true; start = false; }
    else { if (!/\s/.test(c)) start = false; if (!start || !/\s/.test(c)) cell += c; }
  }
  cells.push(cell.trim());
  return cells;
}
// A paste without tabs whose lines (two or more) all split into the same number of cells on a comma,
// or else on a semicolon, is a table with that separator (a CSV export); any other is a list.
function sepTable(src: string): PasteTable | null {
  const lines = src.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return null;
  for (const sep of [',', ';'] as const) {
    const rows = lines.map((l) => splitLine(l, sep));
    const n = rows[0].length;
    if (n > 1 && rows.every((r) => r.length === n)) return { rows, columns: n, sep };
  }
  return null;
}
export interface PasteTable { rows: string[][]; columns: number; sep: '\t' | ',' | ';' | null }
let lastText: string | null = null, lastTable: PasteTable | null = null;
// The rows of a paste and, when it has tabs (or consistent commas or semicolons), its columns. The
// last text's table is kept, so the sheet's several reads of one paste split it once.
export function pasteTable(text: string): PasteTable {
  const src = String(text ?? '').replace(/\r\n?/g, '\n');
  if (src === lastText && lastTable) return lastTable;
  lastText = src;
  return (lastTable = readPasteTable(src));
}
function readPasteTable(src: string): PasteTable {
  const strict = { ...readTable(src, false), sep: src.includes('\t') ? '\t' as const : null };
  if (!src.includes('\t')) return sepTable(src) ?? strict;
  if (!src.includes('"')) return strict;
  const wide = readTable(src, true);
  return wide.rows.length < strict.rows.length && wide.rows.every((r) => r.length === strict.columns) ? { ...wide, sep: '\t' } : strict;
}
// Names come from the first column of a spreadsheet paste (tabs: board Paste, "Pasted from a
// spreadsheet? The names are read from the first column."), and from every cell of a comma or
// semicolon list, so a comma list over several lines never loses a name. No column to pick (v14 pf-e).
const EVERY_CELL = -1;

// Column words a list's first row may hold, in the site's 11 languages (folded). A first cell made
// only of these words (and small joining words) is a header; any other first row is read like every
// line, so a plant there is never dropped.
const HEADER_WORDS = new Set([
  'name', 'names', 'scientific', 'latin', 'botanical', 'common', 'english', 'species', 'plant', 'plants', 'taxon', 'taxa', 'genus', 'family', 'variety', 'cultivar', 'qty', 'quantity', 'number', 'count', 'no', 'notes', 'note', 'type', 'layer', 'stratum', 'vernacular',
  'nom', 'noms', 'scientifique', 'commun', 'vernaculaire', 'francais', 'espece', 'especes', 'plante', 'plantes', 'genre', 'famille', 'variete', 'quantite', 'nombre', 'strate', 'botanique',
  'cientifico', 'cientifica', 'comun', 'especie', 'planta', 'plantas', 'genero', 'familia', 'cantidad', 'nome', 'comum', 'quantidade', 'scientifico', 'specie', 'pianta', 'piante', 'genere', 'famiglia', 'quantita', 'varieta',
  'comune', 'latino', 'volgare', 'italiano', 'botanico', 'botanica', 'popular', 'vulgar', 'latim', 'portugues', 'espanol',
  'wissenschaftlicher', 'botanischer', 'deutscher', 'art', 'arten', 'pflanze', 'pflanzen', 'gattung', 'familie', 'sorte', 'anzahl', 'menge', 'lateinischer', 'lateinisch', 'trivialname', 'deutsch',
  'naam', 'wetenschappelijke', 'wetenschappelijk', 'nederlandse', 'nederlands', 'soort', 'soorten', 'geslacht', 'aantal', 'latijnse', 'gewone', 'botanische',
  'название', 'научное', 'латинское', 'русское', 'вид', 'растение', 'растения', 'род', 'семейство', 'сорт', 'количество', 'имя', 'наименование', 'ботаническое', 'общее',
  '植物名', '植物名称', '中文名称', '拉丁学名', '俗名', '通用名', '物种名', '一般名', '식물명', '일반명', '국명', '名称', '名字', '学名', '中文名', '拉丁名', '物种', '种', '植物', '属', '科', '品种', '数量', '名前', '和名', '種', '種類', '数', '이름', '학명', '종', '식물', '속', '과', '품종', '수량',
].map(fold));
const JOINING = new Set(['s', 'of', 'the', 'de', 'du', 'des', 'la', 'le', 'del', 'da', 'do', 'di', 'der', 'die', 'das', 'en', 'in', 'van', 'het', 'een', 'e', 'y', 'et', 'and', 'und']);
export function looksLikeHeader(cell: string | undefined): boolean {
  const words = fold(String(cell ?? '')).replace(/[()[\]:.#/_*-]/g, ' ').split(/\s+/).filter(Boolean);
  const own = words.filter((w) => !JOINING.has(w));
  return own.length > 0 && own.every((w) => HEADER_WORDS.has(w));
}

// header: the first row, when it holds column names; split: the names cut out of a longer cell
// (never sent to the word-prefix search: "Malus domestica,Tree,Sun" does not offer trees); twice: the
// names pasted more than once (one row, "listed twice, counted once", board Paste).
export type PastedNames = string[] & { header?: string | null; split?: ReadonlySet<string>; twice?: ReadonlySet<string>; repeats?: number };
// repeats: the lines that repeat a name already read (board Paste: "8 names read" counts every line).
// The names of a paste, every line read (no cap: v14 pf-e, F23): a spreadsheet's first column, a cell
// split on commas and semicolons (unless they separate the columns, when every cell is a name), each
// name once (folded; a repeat marks the first as `twice`). A first row that looks like column names
// (in a paste of two rows or more) is left out and kept as `header`.
export function pasteNames(text: string): PastedNames {
  const out: PastedNames = [], seen = new Map<string, string>(), split = new Set<string>(), twice = new Set<string>(), table = pasteTable(text);
  let repeats = 0;
  const column = table.sep === ',' || table.sep === ';' ? EVERY_CELL : 0;
  const every = column === EVERY_CELL;
  const first = table.rows[0] ?? [];
  const head = table.rows.length > 1 && (every ? first.length > 0 && first.every((c) => looksLikeHeader(c)) && first.join(', ') : looksLikeHeader(first[column]) && first[column].trim()) || null;
  table.rows.forEach((row, r) => {
    if (r === 0 && head) return;
    const cell = String(row[column] ?? '');
    const parts = every ? row.map(String) : table.sep === ',' || table.sep === ';' ? [cell] : cell.split(/[,;]/);
    // A list typed by hand ("corn, beans, sukuma wiki": a space after each comma) is read word by word
    // like any line; a machine row ("Malus domestica,Tree,Sun") keeps its other cells off the search.
    const machine = every || !/[,;]\s/.test(cell);
    for (const part of parts) {
      let name = part.replace(/\s+/g, ' ').trim();
      if ((name.match(/"/g) ?? []).length === 1 && /^"|"$/.test(name)) name = name.replace(/^"|"$/, '').trim();
      const key = fold(name);
      if (!name) continue;
      if (seen.has(key)) { twice.add(seen.get(key)!); repeats++; continue; }
      seen.set(key, name);
      out.push(name);
      if (parts.length > 1 && machine) split.add(name);
    }
  });
  Object.defineProperty(out, 'header', { value: head, enumerable: false });
  Object.defineProperty(out, 'split', { value: split, enumerable: false });
  Object.defineProperty(out, 'twice', { value: twice, enumerable: false });
  Object.defineProperty(out, 'repeats', { value: repeats, enumerable: false });
  return out;
}

// ---- matching ----

const RANK_WORDS = new Set(['subsp', 'ssp', 'var', 'f', 'cv', 'x', '×', 'agg', 'sp', 'spp']);
// Genus and species without authors or rank words, folded: "Malus domestica Borkh." → "malus
// domestica". The pasted words are split before folding (the fold makes a hyphen a space), so a
// hyphenated or apostrophe epithet stays one word: "Opuntia ficus-indica (L.) Mill." → "opuntia ficus
// indica", the fold of "Opuntia ficus-indica". Case does not count ("PRUNUS AVIUM L."): an author read
// as the epithet only makes a lookup that finds nothing.
const GENUS = /^[a-z]+$/, EPITHET = /^[a-z]+(?: [a-z]+)*$/;
export function binomial(name: string): string | null {
  const words = name.trim().split(/\s+/).filter((w) => fold(w) && !RANK_WORDS.has(fold(w)));
  if (words.length < 2) return null;
  const genus = fold(words[0]), epithet = fold(words[1]);
  return GENUS.test(genus) && EPITHET.test(epithet) ? `${genus} ${epithet}` : null;
}

// The lists a paste is read against: the search (data/search.ts, the one module Find reads too) and
// the plants it may answer with, this climate's first, then each other list's own (a plant of this
// list is never offered from another).
export interface PasteLists<T extends Named> { index: Finder; taxa: Map<PlantId, T>; climate: Map<PlantId, ClimateZone | null>; genus: Map<string, T[]> }
export function pasteLists<T extends Named>(here: readonly T[], others: readonly (readonly [ClimateZone, readonly T[]])[] = [], index?: Finder): PasteLists<T> {
  const taxa = new Map<PlantId, T>(), climate = new Map<PlantId, ClimateZone | null>(), genus = new Map<string, T[]>();
  const put = (t: T, z: ClimateZone | null) => {
    if (taxa.has(t.id)) return;
    taxa.set(t.id, t); climate.set(t.id, z);
    const g = fold(t.genus ?? t.canonical_name.split(' ')[0]);
    genus.set(g, [...(genus.get(g) ?? []), t]);
  };
  for (const t of here) put(t, null);
  for (const [z, list] of others) for (const t of list) put(t, z);
  // Without the page's release-wide index (the node tests), one over these plants' own names.
  index ??= releaseIndex({ lang: 'en', names: [...taxa.values()].map((t) => ({ id: t.id, canonical: t.canonical_name, names: t.names })) });
  return { index, taxa, climate, genus };
}

// sci: matched by a scientific name (a synonym, a binomial, a genus), not by a name of the plant.
export interface Match<T> { how: 'exact' | 'choose'; taxa: T[]; sci?: boolean }
// One name, or null: a whole name of one plant (scientific names first, then a genus and species
// without authors, then any other name in any language the search holds), then a genus or a shared
// name (several plants: choose). A slip is read as Find reads it, after its search (readPaste).
export function matchName<T extends Named>(name: string, lists: PasteLists<T>): Match<T> | null {
  const known = (hits: FindHit[]) => hits.filter((h) => lists.taxa.has(h.id));
  const plants = (hits: FindHit[]) => hits.map((h) => lists.taxa.get(h.id)!);
  const one = (hits: FindHit[]): Match<T> | null => (hits.length === 1 ? { how: 'exact', taxa: plants(hits) } : hits.length > 1 ? { how: 'choose', taxa: plants(hits) } : null);
  const exact = known(lists.index.exact(name)), b = binomial(name);
  const scientific = exact.filter((h) => h.tier === 'scientific');
  const sciHit = one(scientific) ?? (b ? one(known(lists.index.exact(b)).filter((h) => h.tier === 'scientific')) : null);
  if (sciHit) return { ...sciHit, sci: true };
  const hit = one(exact);
  if (hit) return hit;
  const f = fold(name), g = lists.genus.get(f);
  if (!f.includes(' ') && g?.length) return { how: 'choose', taxa: g, sci: true };
  return null;
}

// `at`: the reading's line in the paste (the sheet lists the paste in its order, board Paste).
export interface PasteResult<T> {
  found: { at: number; name: string; taxon: T; close: string | null; sci?: boolean }[];
  choose: { at: number; name: string; word: string; taxa: T[]; inside: PlantId[]; climate: ClimateZone | null; guess: boolean; loose: boolean }[];
  other: { at: number; name: string; climate: ClimateZone; taxon: T; close: string | null }[];
  already: { at: number; name: string; taxon: T; close: string | null; climate: ClimateZone | null; sci?: boolean }[];
  duplicate: { at: number; name: string; taxon: T }[];
  none: { at: number; name: string }[];
  header: string | null;
  twice: ReadonlySet<string>;
}
// A whole paste, sorted into the groups the sheet shows, each plant once:
//   found      one plant of this climate's list (added by "Add the N found")
//   choose     several plants match (a genus, a shared name), or, for a line no name matched, Find's
//              search guessed (`guess`: "beans" → the beans, "Date" → Date plum); `word` is what the
//              question asks about (the line, or its singular when only that matched: "Which bean?");
//              plants another line matched are left out; `climate` names another climate's list when
//              only that list has them, null for this one. A name that matches one plant from the start (a
//              genus of one) is no question: that plant is found (or other, already…); a guess, or a
//              group the other lines left with one plant, stays a question (never added unasked);
//              `loose`: no plant has the line as a whole name (a loose word, "beans": board AddMany)
//   other      only another climate's list has it, one plant: "Add anyway", a guest (A9)
//   already    in the consortium already
//   duplicate  a line naming a plant another line matched (a later line; or a choice whose every
//              plant another line took: "Malus" then "Malus domestica")
//   none       in no list
// here: this climate's plants; others: [[climate, plants], …] in the export's order; members: the
// consortium's ids; index: the page's release-wide search (Find's), else one over these lists.
// rank: a plant's order among a guess's choices after the name rule (A16), lower first (the sheet gives
// its fit: fits, a second look, outside, not checked); lang: the page's language.
export function readPaste<T extends Named>(names: PastedNames, { here, others = [], members = [], index, rank, lang = 'en' }: { here: readonly T[]; others?: [ClimateZone, readonly T[]][]; members?: readonly PlantId[]; index?: Finder; rank?: (id: PlantId) => number; lang?: string }): PasteResult<T> {
  const lists = pasteLists(here, others, index), ins = new Set(members), seen = new Set<PlantId>();
  // A hit on the plant's own name (the page's language, or English) holding the query's words whole.
  const ownName = (h: FindHit): boolean => (h.why.match === 'exact' || h.why.match === 'tokens' || h.why.match === 'prefix') && (h.why.kind === 'name' || (h.why.kind === 'other' && h.why.lang === 'en' && lang !== 'en'));
  const out: PasteResult<T> = { found: [], choose: [], other: [], already: [], duplicate: [], none: [], header: null, twice: names.twice ?? new Set() };
  let at = 0;
  const one = (name: string, t: T, close: string | null, sci = false) => {
    const climate = lists.climate.get(t.id) ?? null;
    if (seen.has(t.id)) { out.duplicate.push({ at, name, taxon: t }); return; }
    seen.add(t.id);
    if (ins.has(t.id)) out.already.push({ at, name, taxon: t, close, climate, sci });
    else if (climate) out.other.push({ at, name, climate, taxon: t, close });
    else out.found.push({ at, name, taxon: t, close, sci });
  };
  // A choose group from one list: this climate's plants when it has any, else the first other list's;
  // a name's one plant is no question (board Paste: a found line), a guess's is.
  const group = (name: string, taxa: T[], guess: boolean, word = name, sci = false, loose = false) => {
    const z = taxa.some((t) => lists.climate.get(t.id) === null) ? null : lists.climate.get(taxa[0].id) ?? null;
    const own = taxa.filter((t) => (lists.climate.get(t.id) ?? null) === z);
    if (own.length === 1 && !guess) one(name, own[0], null, sci);
    else out.choose.push({ at, name, word, taxa: own, inside: [], climate: z, guess, loose });
  };
  for (const [i, name] of names.entries()) {
    at = i;
    const m = matchName(name, lists);
    if (m?.how === 'exact') { one(name, m.taxa[0], null, !!m.sci); continue; }
    // A16: a name several plants share (a genus, or another language's name: "beans") yields to the
    // search below when that finds plants whose own name holds the word ("Which bean?").
    const shared = m && !m.sci ? m : null;
    if (m && !shared) { group(name, m.taxa, false, name, true); continue; }
    // No name matched: Find's search (not for a piece of a longer cell), then, as Find, its close
    // spellings (data/search.ts close with words: "chesnut" is one letter off "European chestnut"),
    // one plant read as it ("read as …", left unticked), several to choose.
    const search = (q: string) => (names.split?.has(name) ? [] : lists.index(q)).filter((h) => lists.taxa.has(h.id));
    // A plural common name ("beans", "pommes"): the plants named by its singular too, to choose (B10).
    // A16: a plant's own name holding the word as a whole word, in the page's language or English,
    // ranks first ("beans": Common bean, Lima bean, Sword bean before a scientific prefix or another
    // language's name), then the rank the caller gives (its fit), then the search's order.
    const plural = /\p{L}{3}s$/u.test(name.trim()) ? name.trim().slice(0, -1) : null;
    let word = name, found = search(name);
    if (plural) { const more = search(plural); if (more.length && (!found.length || more.some((h) => ownName(h)))) word = plural; found = [...found, ...more]; }
    if (shared && !found.some((h) => ownName(h))) { group(name, shared.taxa, false); continue; }
    const best = new Map<PlantId, { h: FindHit; at: number }>();
    found.forEach((h, k) => { const had = best.get(h.id); if (!had || (ownName(h) && !ownName(had.h))) best.set(h.id, { h, at: had?.at ?? k }); });
    // BC15, A16: the plain names first. A plant's own name holding the word whole ("Common bean") before
    // one where it only begins the name; among them the fewest words ("Lima bean" before "Scarlet runner
    // bean"), then the genus most of the whole-word names share (the beans of Phaseolus before a lone
    // Castor bean), then its fit (the caller's rank), then by name; every other match after, in the
    // search's order. A plant you have stays among them, said to be in your palette.
    const whole = (h: FindHit) => ownName(h) && h.why.match !== 'prefix';
    const genusOf = (id: PlantId) => fold(lists.taxa.get(id)!.genus ?? lists.taxa.get(id)!.canonical_name.split(' ')[0]);
    const share = new Map<string, number>();
    for (const { h } of best.values()) if (whole(h)) share.set(genusOf(h.id), (share.get(genusOf(h.id)) ?? 0) + 1);
    const key = ({ h }: { h: FindHit }) => ({
      tier: whole(h) ? 0 : ownName(h) ? 1 : 2,
      words: ownName(h) ? fold(h.why.text).split(' ').filter(Boolean).length : 0,
      share: whole(h) ? share.get(genusOf(h.id)) ?? 0 : 0,
      name: ownName(h) ? fold(h.why.text) : '',
    });
    const hits = [...best.values()].map((x) => ({ ...x, k: key(x) }))
      .sort((a, b) => a.k.tier - b.k.tier || a.k.words - b.k.words || b.k.share - a.k.share || (a.k.tier < 2 ? (rank?.(a.h.id) ?? 0) - (rank?.(b.h.id) ?? 0) || (a.k.name < b.k.name ? -1 : a.k.name > b.k.name ? 1 : 0) : 0) || a.at - b.at)
      .map((x) => lists.taxa.get(x.h.id)!);
    for (const t of shared?.taxa ?? []) if (!hits.includes(t)) hits.push(t);
    // A search guess stays a question, even of one plant (c1r3 T1; pf decisions 2026-11-18: Paste never
    // takes a plant unasked): "napier" asks about Napiergrass (board Paste draws it found: a known board
    // difference, v14 spec A26).
    // A guess of one plant you already have asks nothing (nothing would be added): you have it.
    if (hits.length === 1 && ins.has(hits[0].id)) { one(name, hits[0], null); continue; }
    if (hits.length) { group(name, hits, true, word, false, !m); continue; }
    const close = lists.index.close(name, true).filter((h) => lists.taxa.has(h.id));
    if (close.length === 1) one(name, lists.taxa.get(close[0].id)!, close[0].why.text);
    else if (close.length) group(name, close.map((h) => lists.taxa.get(h.id)!), true, name, false, true);
    else out.none.push({ at, name });
  }
  // Plants another line matched leave the choose groups; a group they leave empty keeps its line, as
  // covered by another line (a duplicate of the plant it named first); a group left with one plant
  // stays a question ("Which Malus?" with the wild apple once "Malus domestica" took the apple, c1r4
  // U1): only a name that has one plant from the start is found.
  const groups = out.choose;
  out.choose = [];
  for (const c of groups) {
    const taxa = c.taxa.filter((t) => !seen.has(t.id));
    if (taxa.length) out.choose.push({ ...c, taxa, inside: taxa.filter((t) => ins.has(t.id)).map((t) => t.id) });
    else out.duplicate.push({ at: c.at, name: c.name, taxon: c.taxa[0] });
  }
  out.header = names.header ?? null;
  return out;
}

// What "Add all" adds from a reading: the found plants (a close spelling only once ticked: "chesnut"
// is read as European chestnut, offered, never added unasked; one found only on another list too, BC20)
// and the ticked choices, each once, none already in the palette; climateOf names the other list a
// ticked choice comes from.
export function plan<T extends Named>(r: PasteResult<T>, ticked: readonly PlantId[], members: readonly PlantId[]): { ids: PlantId[]; climateOf: Map<PlantId, ClimateZone> } {
  const climateOf = new Map<PlantId, ClimateZone>();
  for (const c of r.choose) if (c.climate) for (const t of c.taxa) climateOf.set(t.id, c.climate);
  for (const o of r.other) if (o.close) climateOf.set(o.taxon.id, o.climate);
  const chosen = ticked.filter((id) => r.choose.some((c) => c.taxa.some((t) => t.id === id)) || r.found.some((f) => f.close && f.taxon.id === id) || r.other.some((o) => o.close && o.taxon.id === id));
  const ids = [...new Set([...r.found.filter((f) => !f.close).map((f) => f.taxon.id), ...chosen])].filter((id) => !members.includes(id));
  return { ids, climateOf };
}
