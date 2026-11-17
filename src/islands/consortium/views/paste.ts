// "Paste a list" (stream S3; design check §2: the pure parts of v1 scale.js, ported): a pasted list
// of plant names, read as a spreadsheet writes it, matched against this climate's list and then the
// other climates' lists. Names are matched through data/search.ts, the search Find reads (folded by
// normalization v1, synonyms and names-file names included), never with SQL LIKE (A6).
// Pure: no DOM, no store, so scripts/consortium-paste.test.mjs tests it.
import type { ClimateZone, PlantId } from '../../../lib/consortium/types.ts';
import { fold, releaseIndex, type FindHit, type Finder } from '../data/search.ts';

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
// EVERY_CELL: names come from every cell of every row (a comma or semicolon table's default, so a
// comma list over several lines never loses names unless the reader picks a column).
export const EVERY_CELL = -1;
// The column names are read from, always one the text has: null is the default (every cell for comma
// or semicolon columns, else the first column).
export function pasteColumn(text: string, column: number | null): number {
  const table = pasteTable(text), bySep = table.sep === ',' || table.sep === ';';
  if (column === null || column === EVERY_CELL) return bySep ? EVERY_CELL : 0;
  return column > 0 && column < table.columns ? column : 0;
}

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
// (never sent to the word-prefix search: "Malus domestica,Tree,Sun" does not offer trees).
export type PastedNames = string[] & { header?: string | null; split?: ReadonlySet<string> };
// The names in one column: a cell split on commas and semicolons (unless they separate the columns),
// each name once (folded). A first row that looks like column names (in a paste of two rows or more)
// is left out and kept as `header`.
export function pasteNames(text: string, column = 0): PastedNames {
  const out: PastedNames = [], seen = new Set<string>(), split = new Set<string>(), table = pasteTable(text);
  const every = column === EVERY_CELL;
  const first = table.rows[0] ?? [];
  const head = table.rows.length > 1 && (every ? first.length > 0 && first.every((c) => looksLikeHeader(c)) && first.join(', ') : looksLikeHeader(first[column]) && first[column].trim()) || null;
  table.rows.forEach((row, r) => {
    if (r === 0 && head) return;
    const parts = every ? row.map(String) : table.sep === ',' || table.sep === ';' ? [String(row[column] ?? '')] : String(row[column] ?? '').split(/[,;]/);
    for (const part of parts) {
      let name = part.replace(/\s+/g, ' ').trim();
      if ((name.match(/"/g) ?? []).length === 1 && /^"|"$/.test(name)) name = name.replace(/^"|"$/, '').trim();
      const key = fold(name);
      if (!name || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
      if (parts.length > 1) split.add(name);
    }
  });
  Object.defineProperty(out, 'header', { value: head, enumerable: false });
  Object.defineProperty(out, 'split', { value: split, enumerable: false });
  return out;
}

// ---- matching ----

const RANK_WORDS = new Set(['subsp', 'ssp', 'var', 'f', 'cv', 'x', '×', 'agg', 'sp', 'spp']);
// Genus and species without authors or rank words: "Malus domestica Borkh." → "malus domestica".
export function binomial(name: string): string | null {
  const words = fold(name).split(' ').filter((w) => w && !RANK_WORDS.has(w));
  return words.length >= 2 && /^[a-z-]+$/.test(words[0]) && /^[a-z-]+$/.test(words[1]) ? `${words[0]} ${words[1]}` : null;
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

export interface Match<T> { how: 'exact' | 'close' | 'choose'; taxa: T[]; close?: string }
// One name, or null: a whole name of one plant (scientific names first, then a genus and species
// without authors, then any other name in any language the search holds), then a genus or a shared
// name (several plants: choose), then one letter off (shown as "close spelling").
export function matchName<T extends Named>(name: string, lists: PasteLists<T>): Match<T> | null {
  const known = (hits: FindHit[]) => hits.filter((h) => lists.taxa.has(h.id));
  const plants = (hits: FindHit[]) => hits.map((h) => lists.taxa.get(h.id)!);
  const one = (hits: FindHit[]): Match<T> | null => (hits.length === 1 ? { how: 'exact', taxa: plants(hits) } : hits.length > 1 ? { how: 'choose', taxa: plants(hits) } : null);
  const exact = known(lists.index.exact(name)), b = binomial(name);
  const scientific = exact.filter((h) => h.tier === 'scientific');
  const hit = one(scientific) ?? (b ? one(known(lists.index.exact(b)).filter((h) => h.tier === 'scientific')) : null) ?? one(exact);
  if (hit) return hit;
  const f = fold(name), g = lists.genus.get(f);
  if (!f.includes(' ') && g?.length) return { how: 'choose', taxa: g };
  const close = known(lists.index.close(name));
  if (close.length === 1) return { how: 'close', taxa: plants(close), close: close[0].why.text };
  if (close.length > 1) return { how: 'choose', taxa: plants(close) };
  return null;
}

const PREFIX_LIMIT = 8;

export interface PasteResult<T> {
  found: { name: string; taxon: T; close: string | null }[];
  choose: { name: string; taxa: T[]; inside: PlantId[]; climate: ClimateZone | null }[];
  other: { name: string; climate: ClimateZone; taxon: T; close: string | null }[];
  already: { name: string; taxon: T; close: string | null; climate: ClimateZone | null }[];
  duplicate: { name: string; taxon: T }[];
  none: { name: string }[];
  header: string | null;
}
// A whole paste, sorted into the groups the sheet shows, each plant once:
//   found      one plant of this climate's list (added by "Add the N found")
//   choose     several plants match (a genus, a shared name, or, for a line no name matched, Find's
//              search: "Chestnut" → European chestnut); plants another line matched are left out, and
//              a group left empty is dropped; `climate` names another climate's list when only that
//              list has them, null for this one
//   other      only another climate's list has it, one plant: "Add anyway", a guest (A9)
//   already    in the consortium already
//   duplicate  a later line naming a plant an earlier line matched
//   none       in no list
// here: this climate's plants; others: [[climate, plants], …] in the export's order; members: the
// consortium's ids; index: the page's release-wide search (Find's), else one over these lists.
export function readPaste<T extends Named>(names: PastedNames, { here, others = [], members = [], index }: { here: readonly T[]; others?: [ClimateZone, readonly T[]][]; members?: readonly PlantId[]; index?: Finder }): PasteResult<T> {
  const lists = pasteLists(here, others, index), ins = new Set(members), seen = new Set<PlantId>();
  const out: PasteResult<T> = { found: [], choose: [], other: [], already: [], duplicate: [], none: [], header: null };
  const one = (name: string, t: T, close: string | null) => {
    const climate = lists.climate.get(t.id) ?? null;
    if (seen.has(t.id)) { out.duplicate.push({ name, taxon: t }); return; }
    seen.add(t.id);
    if (ins.has(t.id)) out.already.push({ name, taxon: t, close, climate });
    else if (climate) out.other.push({ name, climate, taxon: t, close });
    else out.found.push({ name, taxon: t, close });
  };
  // A choose group from one list: this climate's plants when it has any, else the first other list's.
  const group = (name: string, taxa: T[], limit = Infinity) => {
    const z = taxa.some((t) => lists.climate.get(t.id) === null) ? null : lists.climate.get(taxa[0].id) ?? null;
    out.choose.push({ name, taxa: taxa.filter((t) => (lists.climate.get(t.id) ?? null) === z).slice(0, limit), inside: [], climate: z });
  };
  for (const name of names) {
    const m = matchName(name, lists);
    if (m && m.how !== 'choose') { one(name, m.taxa[0], m.close ?? null); continue; }
    if (m) { group(name, m.taxa); continue; }
    // No name matched: Find's search (not for a piece of a longer cell).
    if (names.split?.has(name)) { out.none.push({ name }); continue; }
    const hits = lists.index(name).filter((h) => lists.taxa.has(h.id)).map((h) => lists.taxa.get(h.id)!);
    if (hits.length) group(name, hits, PREFIX_LIMIT); else out.none.push({ name });
  }
  // Plants another line matched leave the choose groups; a group left empty goes.
  out.choose = out.choose.map((c) => ({ ...c, taxa: c.taxa.filter((t) => !seen.has(t.id)) })).filter((c) => c.taxa.length)
    .map((c) => ({ ...c, inside: c.taxa.filter((t) => ins.has(t.id)).map((t) => t.id) }));
  out.header = names.header ?? null;
  return out;
}
