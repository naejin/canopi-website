// The consortium tool from 6 to 200 plants (design-scale.md §2, decision rows "Scale, coordinator
// choices" and "Scale mockup approved", owner 2026-10-28): the Cards/List default, honest heights,
// the stage span a row shows, the warning kinds a filter and the warning box count, the list's
// filters, range selection, and reading a pasted list of names. Pure (no DOM, no strings), so
// scripts/consortium-list.test.mjs tests it on the fixture and the real Temperate list.
import { phases, jobsOf, isSerious } from '../../lib/consortium/index.ts';
import { fold, searchText } from './words.js';
import { uncheckedOnCard } from './logic.js';

// Cards up to 20 plants, the list above, until the reader chooses (coordinator, 2026-10-28).
export const CARDS_UP_TO = 20;
export const viewMode = (choice, n) => choice ?? (n > CARDS_UP_TO ? 'list' : 'cards');
// Above 60 plants a layer's group starts closed (design-scale.md §2.1); a filter opens the groups it matches.
export const FOLD_ABOVE = 60;
export function groupOpen(stratum, { total, shown, filtering, choice }) {
  if (choice != null) return choice;
  if (filtering) return shown > 0;
  return total <= FOLD_ABOVE;
}

// A height rounded honestly (m11): one decimal below 1 m, whole metres up to 20 m, 5 m steps above;
// null when unknown (the row says "no height", never 0).
export function roundHeight(m) {
  if (m == null || !(m > 0)) return null;
  if (m < 1) return Math.max(0.1, Math.round(m * 10) / 10);
  if (m <= 20) return Math.round(m);
  return Math.round(m / 5) * 5;
}
// The size a room misfit says (H11): rounded as heights are (C7), unless that would land on or under
// the room's limit (6.096 m in a 6 m garden reads "6 m"): then rounded up to one decimal, so "too big"
// never shows a size the room takes.
export function misfitSize(m, limit) {
  const r = roundHeight(m) ?? 0;
  return r > limit ? r : Math.ceil(m * 10 - 1e-9) / 10;
}
// K6: the height a row, card, details, paste or print shows: when the room flags the plant by its
// height (the larger of height and width, over the limit), the size its warning gives, else
// roundHeight. null when the height is unknown.
export function shownHeight(t, limit) {
  const h = t.traits?.height_m?.max ?? null, w = t.traits?.width_max_m ?? 0;
  return h != null && h > limit && h >= w ? misfitSize(h, limit) : roundHeight(h);
}

// The stages a plant leads in, as indexes into phases ({ a, b }), or null when not checked.
export const stageSpan = (t) => (t.phases ? { a: phases.indexOf(t.phases.start), b: phases.indexOf(t.phases.end) } : null);
// The short words of a span, as keys and values for the page's words (words.js T):
// "Years 3–15", "Year 3 on", "0–6 mo", "3 mo–15 y". Years only when both ends are in years.
const START_YEAR = [null, null, 1, 3, 15, 25, 60];
const END_YEAR = [null, null, 3, 15, 25, 60, null];
export function stageShort(span) {
  if (!span) return null;
  const { a, b } = span, last = phases.length - 1;
  const from = a === 0 ? { num: 0 } : a === 1 ? { key: 'stageStart.' + phases[1] } : { num: START_YEAR[a] };
  if (b === last) return START_YEAR[a] != null ? { key: 'stageYearOn', a: START_YEAR[a] } : { key: 'stageSpan', from, to: { key: 'phase.climax.short' } };
  if (START_YEAR[a] != null && END_YEAR[b] != null) return { key: 'stageYears', a: START_YEAR[a], b: END_YEAR[b] };
  return { key: 'stageSpan', from, to: { key: 'stageEnd.' + phases[b] } };
}

// What warns about a plant, in the kinds the list's Warning filter and the warning box use:
//   invasive  recorded invasive in the chosen country (flags.invasive)
//   somewhere no country chosen, and invasive in at least one country (the soft count)
//   toxic     moderately or very toxic (slight toxicity stays a soft chip)
//   pests     shares a pest or disease with another member, or hosts one of theirs
//   site      does not suit the site, or a serious conflict of another kind
//   unchecked toxicity, invasiveness, spreading or jobs not checked yet
// "any" is invasive, toxic, pests or site: what "With a warning" counts at every size.
export const WARN_KINDS = ['any', 'invasive', 'somewhere', 'toxic', 'pests', 'site', 'unchecked'];
export const PEST_TYPES = new Set(['shared_pest', 'alternate_host']);
export function warnKinds(t, flags, { country }) {
  const out = new Set();
  if (flags?.invasive === true) out.add('invasive');
  if (!country && t.warnings.invasive_in?.length) out.add('somewhere');
  const tox = t.warnings.toxicity?.level;
  if (tox === 'Moderate' || tox === 'Severe') out.add('toxic');
  if (flags?.conflicts.some((c) => PEST_TYPES.has(c.type))) out.add('pests');
  if (flags?.misfits.length || flags?.conflicts.some((c) => !PEST_TYPES.has(c.type) && isSerious(c))) out.add('site');
  if (uncheckedOnCard(t, jobsOf(t).length > 0).length) out.add('unchecked');
  if (out.has('invasive') || out.has('toxic') || out.has('pests') || out.has('site')) out.add('any');
  return out;
}
// The pests and diseases a plant shares, each named once, in the order of its conflicts.
export const pestsOf = (flags) => [...new Set((flags?.conflicts ?? []).filter((c) => PEST_TYPES.has(c.type) && c.agent).map((c) => c.agent))];

// The list's filters: layer, job, time (a stage index), warning (a WARN_KINDS value), kept (crops.js
// KEPT_FILTERS) and the text typed; they combine with AND. An empty value lets everything through.
export const NO_FILTERS = Object.freeze({ layer: '', job: '', time: '', warn: '', kept: '', q: '' });
export const FILTER_KEYS = ['layer', 'job', 'time', 'warn', 'kept'];
export const filtering = (F) => FILTER_KEYS.some((k) => F[k] !== '') || !!F.q.trim();
// ctx: { kinds(t) → Set, kept: Set, crops: [] }.
export function matches(t, F, ctx) {
  if (F.layer && (t.stratum?.value ?? 'none') !== F.layer) return false;
  if (F.job && !jobsOf(t).includes(F.job)) return false;
  if (F.time !== '') { const s = stageSpan(t), i = Number(F.time); if (!s || s.a > i || s.b < i) return false; }
  if (F.warn && !ctx.kinds(t).has(F.warn)) return false;
  if (F.kept === 'kept' && !ctx.kept.has(t.id)) return false;
  if (F.kept === 'notKept' && ctx.kept.has(t.id)) return false;
  if (F.kept === 'crops' && !ctx.crops.includes(t.id)) return false;
  const q = fold(F.q.trim());
  if (q && !searchText(t).includes(q)) return false;
  return true;
}
// The active filters first, in the order they were set, then the others (M2: a phone never scrolls
// the active one away). order: the keys in the order the reader set them.
export const filterOrder = (F, order) => [...order.filter((k) => F[k] !== ''), ...FILTER_KEYS.filter((k) => !order.includes(k) || F[k] === '')].filter((k, i, a) => a.indexOf(k) === i);

// A range selection (Shift+click, Shift+Space): every row from the anchor to `id`, in the order shown,
// takes the state `on`. Returns the new set; without an anchor in view, only `id` changes.
export function selectRange(order, anchor, id, selected, on) {
  const out = new Set(selected), i = order.indexOf(anchor), j = order.indexOf(id);
  const ids = i < 0 || j < 0 ? [id] : order.slice(Math.min(i, j), Math.max(i, j) + 1);
  for (const x of ids) { if (on) out.add(x); else out.delete(x); }
  return out;
}
// A group's select-all box: 'all', 'some' (the native indeterminate state) or 'none'.
export function groupTick(ids, selected) {
  const n = ids.filter((id) => selected.has(id)).length;
  return n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
}

// ---------- Paste a list (design-scale.md §2.5) ----------
// The rows of a paste and, when it has tabs, its columns: { rows: [[cell, …], …], columns }. Read as a
// spreadsheet writes it (B11): a cell that starts with a quote runs to its closing quote, may hold tabs
// and line breaks, and has its quotes taken off ("" is one quote); other cells are kept as typed.
// H10: only a quote that a spreadsheet would close opens a quoted cell: its closing quote is on the
// same line and ends the cell (a tab, a line break or the end follows), or, past a line break, is
// followed by a tab (the row goes on). Any other quote is text, and never swallows the lines after it.
// K4: in a table (tabs), a closing quote past a line break followed by a line break or the end also
// closes the cell, when the rows read that way all keep the table's column count.
function quotedEnd(src, i, wide) {
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
function readTable(src, wide) {
  const rows = [];
  let row = [], cell = '', quoted = false, start = true, tabs = false;
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
export function pasteTable(text) {
  const src = String(text ?? '').replace(/\r\n?/g, '\n');
  const strict = readTable(src, false);
  if (!src.includes('\t') || !src.includes('"')) return strict;
  const wide = readTable(src, true);
  return wide.rows.length < strict.rows.length && wide.rows.every((r) => r.length === strict.columns) ? wide : strict;
}
// The column names are read from, always one the text has (B9): a plain list after a 3-column one reads column 1.
export const pasteColumn = (text, column) => (column > 0 && column < pasteTable(text).columns ? column : 0);
// Column names a list's first row may hold, in the site's 11 languages, folded (H9). A first cell
// made only of these words (and small joining words) is a header; any other first row is read like
// every line, so a plant there is never dropped.
const HEADER_WORDS = new Set([
  // en
  'name', 'names', 'scientific', 'latin', 'botanical', 'common', 'english', 'species', 'plant', 'plants', 'taxon', 'taxa', 'genus', 'family', 'variety', 'cultivar', 'qty', 'quantity', 'number', 'count', 'no', 'notes', 'note', 'type', 'layer', 'stratum',
  // fr
  'nom', 'noms', 'scientifique', 'latin', 'commun', 'vernaculaire', 'francais', 'espece', 'especes', 'plante', 'plantes', 'genre', 'famille', 'variete', 'quantite', 'nombre', 'strate',
  // es, pt, it
  'nombre', 'cientifico', 'comun', 'especie', 'planta', 'plantas', 'genero', 'familia', 'cantidad', 'nome', 'cientifico', 'comum', 'quantidade', 'scientifico', 'specie', 'pianta', 'piante', 'genere', 'famiglia', 'quantita', 'varieta',
  // de, nl
  'wissenschaftlicher', 'botanischer', 'deutscher', 'art', 'arten', 'pflanze', 'pflanzen', 'gattung', 'familie', 'sorte', 'anzahl', 'menge', 'naam', 'wetenschappelijke', 'nederlandse', 'soort', 'soorten', 'geslacht', 'aantal',
  // ru
  'название', 'научное', 'латинское', 'русское', 'вид', 'растение', 'растения', 'род', 'семейство', 'сорт', 'количество', 'имя',
  // K5: more of the usual column words
  'comune', 'latino', 'volgare', 'italiano', 'botanico', 'botanica', 'popular', 'vulgar', 'latim', 'cientifica', 'portugues', 'espanol', 'botanique',
  'lateinischer', 'lateinisch', 'trivialname', 'deutsch', 'latijnse', 'gewone', 'botanische', 'wetenschappelijk', 'nederlands', 'vernacular',
  'научное', 'название', 'русское', 'латинское', 'наименование', 'ботаническое', 'общее',
  // zh, ja, ko (written without spaces: the whole cell)
  '植物名', '植物名称', '中文名称', '拉丁学名', '俗名', '通用名', '物种名', '一般名', '식물명', '일반명', '국명', '名称', '名字', '学名', '中文名', '拉丁名', '物种', '种', '植物', '属', '科', '品种', '数量', '名前', '和名', '種', '種類', '数', '이름', '학명', '종', '식물', '속', '과', '품종', '수량',
].map(fold));
// 's' is the plural of "name(s)" (K5).
const JOINING = new Set(['s', 'of', 'the', 'de', 'du', 'des', 'la', 'le', 'del', 'da', 'do', 'di', 'der', 'die', 'das', 'en', 'in', 'van', 'het', 'een', 'e', 'y', 'et', 'and', 'und', 'en']);
export function looksLikeHeader(cell) {
  const words = fold(String(cell ?? '')).replace(/[()[\]:.#/_*-]/g, ' ').split(/\s+/).filter(Boolean);
  const own = words.filter((w) => !JOINING.has(w));
  return own.length > 0 && own.every((w) => HEADER_WORDS.has(w));
}
// The names in one column (0-based): a cell split on commas and semicolons, each name once. A first
// row that looks like column names (looksLikeHeader, in a paste of two rows or more) is left out and
// kept apart as `header` (H9); readPaste names it.
// A stray quote at the start or end of a name (one with no partner, H10) is taken off.
export function pasteNames(text, column = 0) {
  const out = [], seen = new Set(), table = pasteTable(text);
  const head = table.rows.length > 1 && looksLikeHeader(table.rows[0][column]) ? table.rows[0][column].trim() : null;
  table.rows.forEach((row, r) => {
    if (r === 0 && head) return;
    for (const part of String(row[column] ?? '').split(/[,;]/)) {
      let name = part.replace(/\s+/g, ' ').trim();
      if ((name.match(/"/g) ?? []).length === 1 && /^"|"$/.test(name)) name = name.replace(/^"|"$/, '').trim();
      const key = fold(name);
      if (!name || seen.has(key)) continue;
      seen.add(key); out.push(name);
    }
  });
  Object.defineProperty(out, 'header', { value: head, enumerable: false });
  return out;
}
const RANK_WORDS = new Set(['subsp', 'ssp', 'var', 'f', 'cv', 'x', '×', 'agg', 'sp', 'spp']);
// Genus and species without authors or rank words: "Malus domestica Borkh." → "malus domestica".
export function binomial(name) {
  const words = fold(name).replace(/[.()]/g, ' ').split(/\s+/).filter((w) => w && !RANK_WORDS.has(w));
  return words.length >= 2 && /^[a-z-]+$/.test(words[0]) && /^[a-z-]+$/.test(words[1]) ? `${words[0]} ${words[1]}` : null;
}
// At most one letter off (one added, dropped or changed).
export function oneOff(a, b) {
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
// One index of a list for matching: scientific names, binomials, genera, every common name, and every
// name folded once, by length, for the close-spelling pass (B6: a paste costs about its number of lines).
export function nameIndex(taxa) {
  const sci = new Map(), bi = new Map(), genus = new Map(), common = new Map(), byLen = new Map();
  const add = (m, k, t) => { if (!k) return; const l = m.get(k) ?? []; if (!l.includes(t)) l.push(t); m.set(k, l); };
  taxa.forEach((t, at) => {
    add(sci, fold(t.canonical_name), t);
    add(bi, binomial(t.canonical_name), t);
    add(genus, fold(t.genus ?? t.canonical_name.split(' ')[0]), t);
    for (const n of Object.values(t.names)) add(common, fold(n).trim(), t);
    [t.canonical_name, ...Object.values(t.names)].forEach((n, o) => {
      const f = fold(n).trim();
      if (f.length < 4) return;
      const l = byLen.get(f.length) ?? []; l.push({ f, t, n, at, o }); byLen.set(f.length, l);
    });
  });
  return { sci, bi, genus, common, byLen, taxa };
}
// The index of a climate file, built once per file (and, for another climate's file, once per list it
// is read beside: only its own plants).
const indexes = new WeakMap();
function indexOf(file, without = null) {
  let byCell = indexes.get(file);
  if (!byCell) indexes.set(file, (byCell = new Map()));
  const key = without ?? file;
  if (!byCell.has(key)) {
    const skip = without ? new Set(without.taxa.map((t) => t.id)) : null;
    byCell.set(key, nameIndex(skip ? file.taxa.filter((t) => !skip.has(t.id)) : file.taxa));
  }
  return byCell.get(key);
}
// One name against one list: { how: 'exact' | 'close' | 'choose', taxa, close? } or null.
// Exact scientific name, then genus + species, then a common name in any language, then a genus or a
// shared name (several plants: choose), then one letter off (shown as "close spelling").
export function matchName(name, idx) {
  const f = fold(name).trim(), b = binomial(name);
  const one = (list, how) => (list?.length === 1 ? { how, taxa: list } : list?.length > 1 ? { how: 'choose', taxa: list } : null);
  const hit = one(idx.sci.get(f), 'exact') ?? (b && one(idx.bi.get(b), 'exact')) ?? one(idx.common.get(f), 'exact');
  if (hit) return hit;
  if (!f.includes(' ') && idx.genus.get(f)?.length) return { how: 'choose', taxa: idx.genus.get(f) };
  // Each plant once, by the first of its names (scientific name first) that is one letter off.
  const close = new Map();
  for (let len = f.length - 1; len <= f.length + 1; len++) {
    for (const e of idx.byLen?.get(len) ?? []) {
      if (!oneOff(e.f, f)) continue;
      const had = close.get(e.t);
      if (!had || e.o < had.o) close.set(e.t, e);
    }
  }
  const list = [...close.values()].sort((x, y) => x.at - y.at);
  if (list.length === 1) return { how: 'close', taxa: [list[0].t], close: list[0].n };
  if (list.length > 1) return { how: 'choose', taxa: list.map((c) => c.t) };
  return null;
}
// A whole paste, sorted into the groups the sheet shows, each name once:
//   found   one plant of this climate's list (ticked), close spellings marked
//   choose  several plants match (a genus or a shared name): none ticked; `climate` names another
//           climate's list when only that list has them (B5), null for this one
//   other   only another climate's list has it, one plant: "Add anyway"
//   already in the consortium already
//   none    in no list
//   header  the first row, when it looks like column names (pasteNames, H9): left out of every group
// cell: this climate's file; others: [[climate, file], …] (crops.js inClimateOrder); members: ids.
export function readPaste(names, { cell, others = [], members = [] }) {
  const here = indexOf(cell), ins = new Set(members), seen = new Set();
  const lists = others.map(([climate, file]) => [climate, indexOf(file, cell)]);
  const out = { found: [], choose: [], other: [], already: [], none: [], header: null };
  for (const name of names) {
    const m = matchName(name, here);
    if (m && m.how !== 'choose') {
      const t = m.taxa[0];
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      (ins.has(t.id) ? out.already : out.found).push({ name, taxon: t, close: m.close ?? null });
      continue;
    }
    const inside = (taxa) => taxa.filter((t) => ins.has(t.id)).map((t) => t.id);
    if (m) { out.choose.push({ name, taxa: m.taxa, inside: inside(m.taxa), climate: null }); continue; }
    let elsewhere = null;
    for (const [climate, idx] of lists) { const o = matchName(name, idx); if (o) { elsewhere = { climate, o }; break; } }
    if (!elsewhere) { out.none.push({ name }); continue; }
    const { climate, o } = elsewhere;
    if (o.how === 'choose') { out.choose.push({ name, taxa: o.taxa, inside: inside(o.taxa), climate }); continue; }
    const t = o.taxa[0];
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    (ins.has(t.id) ? out.already : out.other).push({ name, climate, taxon: t, close: o.close ?? null });
  }
  out.header = names.header ?? null;
  return out;
}
// The tick a pasted plant starts with, the same in every group it shows in (B8): ticked when it was
// found by one of its names, else not (a Choose line ticks nothing on its own).
export const pasteDefault = (r, id) => r.found.some((f) => f.taxon.id === id);
// A short sample of a column, for the column picker: "column 1 (Malus domestica…)".
export const columnSample = (text, column, max = 18) => {
  const first = pasteTable(text).rows.find((r) => (r[column] ?? '').trim())?.[column]?.trim() ?? '';
  return first.length > max ? first.slice(0, max) + '…' : first;
};
