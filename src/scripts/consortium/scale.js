// The consortium tool from 6 to 200 plants (design-scale.md §2, decision rows "Scale, coordinator
// choices" and "Scale mockup approved", owner 2026-10-28): the Cards/List default, honest heights,
// the stage span a row shows, the warning kinds a filter and the warning box count, the list's
// filters, range selection, and reading a pasted list of names. Pure (no DOM, no strings), so
// scripts/consortium-list.test.mjs tests it on the fixture and the real Temperate list.
import { phases, jobsOf, isSerious } from '../../lib/consortium/index.ts';
import { fold, searchText, plantName } from './words.js';
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
// The lines of a paste and, when it has tabs, its columns: { lines: [[cell, …], …], columns }.
export function pasteTable(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  const rows = lines.map((l) => (l.includes('\t') ? l.split('\t') : [l]));
  return { rows, columns: Math.max(0, ...rows.map((r) => r.length)) };
}
// The names in one column (0-based): a cell split on commas and semicolons, each name once.
export function pasteNames(text, column = 0) {
  const out = [], seen = new Set();
  for (const row of pasteTable(text).rows) {
    for (const part of String(row[column] ?? '').split(/[,;]/)) {
      const name = part.replace(/\s+/g, ' ').trim();
      const key = fold(name);
      if (!name || seen.has(key)) continue;
      seen.add(key); out.push(name);
    }
  }
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
// One index of a list for matching: scientific names, binomials, genera, and every common name.
export function nameIndex(taxa) {
  const sci = new Map(), bi = new Map(), genus = new Map(), common = new Map();
  const add = (m, k, t) => { if (!k) return; const l = m.get(k) ?? []; if (!l.includes(t)) l.push(t); m.set(k, l); };
  for (const t of taxa) {
    add(sci, fold(t.canonical_name), t);
    add(bi, binomial(t.canonical_name), t);
    add(genus, fold(t.genus ?? t.canonical_name.split(' ')[0]), t);
    for (const n of Object.values(t.names)) add(common, fold(n).trim(), t);
  }
  return { sci, bi, genus, common, taxa };
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
  const close = [];
  for (const t of idx.taxa) {
    const names = [t.canonical_name, ...Object.values(t.names)];
    const n = names.find((x) => oneOff(fold(x).trim(), f));
    if (n) close.push({ t, n });
  }
  if (close.length === 1) return { how: 'close', taxa: [close[0].t], close: close[0].n };
  if (close.length > 1) return { how: 'choose', taxa: close.map((c) => c.t) };
  return null;
}
// A whole paste, sorted into the groups the sheet shows, each name once:
//   found   one plant of this climate's list (ticked), close spellings marked
//   choose  several plants match (a genus or a shared name): none ticked
//   other   only another climate's list has it: "Add anyway"
//   already in the consortium already
//   none    in no list
// cell: this climate's file; others: [[climate, file], …] (crops.js inClimateOrder); members: ids.
export function readPaste(names, { cell, others = [], members = [] }) {
  const here = nameIndex(cell.taxa), ins = new Set(members), seen = new Set();
  const lists = others.map(([climate, file]) => [climate, nameIndex(file.taxa.filter((t) => !cell.taxa.some((x) => x.id === t.id)))]);
  const out = { found: [], choose: [], other: [], already: [], none: [] };
  for (const name of names) {
    const m = matchName(name, here);
    if (m && m.how !== 'choose') {
      const t = m.taxa[0];
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      (ins.has(t.id) ? out.already : out.found).push({ name, taxon: t, close: m.close ?? null });
      continue;
    }
    if (m) { out.choose.push({ name, taxa: m.taxa, inside: m.taxa.filter((t) => ins.has(t.id)).map((t) => t.id) }); continue; }
    let elsewhere = null;
    for (const [climate, idx] of lists) {
      const o = matchName(name, idx);
      if (o && o.taxa.length === 1) { elsewhere = { name, climate, taxon: o.taxa[0], close: o.close ?? null }; break; }
    }
    if (elsewhere && !seen.has(elsewhere.taxon.id)) { seen.add(elsewhere.taxon.id); (ins.has(elsewhere.taxon.id) ? out.already : out.other).push(elsewhere); }
    else if (!elsewhere) out.none.push({ name });
  }
  return out;
}
// A short sample of a column, for the column picker: "column 1 (Malus domestica…)".
export const columnSample = (text, column, max = 18) => {
  const first = pasteTable(text).rows.find((r) => (r[column] ?? '').trim())?.[column]?.trim() ?? '';
  return first.length > max ? first.slice(0, max) + '…' : first;
};
// The name a row shows for a taxon: what plantName gives (for sorting and the selection bar).
export const shownName = (t, lang) => plantName(t, lang).text;
