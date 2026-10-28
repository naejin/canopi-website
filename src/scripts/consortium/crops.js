// The main-crops step and "Add anyway": which plants can be main crops, how the crop search
// matches, where else a plant is listed, the other lists in a fixed order, the Add filters, and the
// Kept filter's values. Pure (no DOM, no strings), so
// scripts/consortium-scale.test.mjs tests them on the fixture.
// Decision rows "Main crops first" and "Scale mockup approved" (owner, 2026-10-28): up to three
// crops, chosen among the climate's own food plants (the feeds-you role); the step never suggests
// switching climate; a plant only another climate lists can be added later with "Add anyway".
import { plantName, fold, searchText } from './words.js';
import { jobsOf, phases } from '../../lib/consortium/index.ts';

// The climate's food plants: the feeds-you role (jobs.ts: a crop feeds you).
export const foodPlants = (cell) => cell.taxa.filter((t) => t.role === 'crop');
export const isFood = (t) => t?.role === 'crop';

// How well a name matches: 0 it starts with the text typed, 1 a word of it does, 2 it is inside a
// word; null when it does not have it.
function rankIn(name, q) {
  const n = fold(name), i = n.indexOf(q);
  if (i < 0) return null;
  return i === 0 ? 0 : /[\s\-'’(]/.test(n[i - 1]) ? 1 : 2;
}
// A plant's match: first on the names the reader sees (the name in the page language, else English,
// as the page shows it, and the scientific name); then on its English name when the page hides it,
// ranked after every shown-name match (3 to 5). `english` is that hidden name, which the option then
// shows in brackets, so the label, the accessible name and the search are one string (R3-m5, R4-m1,
// state 19f: « Cerisier acide (Sour cherry) »). null when no name has the text.
function matchOf(t, q, lang) {
  const shown = plantName(t, lang);
  const ranks = [rankIn(shown.text, q), rankIn(t.canonical_name, q)].filter((r) => r !== null);
  if (ranks.length) return { r: Math.min(...ranks), english: null };
  const en = !shown.lang && t.names.en && t.names.en !== shown.text ? t.names.en : null;
  const r = en ? rankIn(en, q) : null;
  return r === null ? null : { r: 3 + r, english: en };
}

const byShown = (lang) => (a, b) => plantName(a, lang).text.localeCompare(plantName(b, lang).text, lang) || (a.canonical_name < b.canonical_name ? -1 : 1);

// Every food plant matching the text typed, best match first, then by the name shown: { taxon,
// english } (english: the hidden English name it matched, else null). The crops already chosen are
// left out. The status counts them all (B8); the list shows the first few (cropMatches).
export function cropHits(cell, query, lang, chosen = []) {
  const q = fold(query.trim());
  if (!q) return [];
  const skip = new Set(chosen), cmp = byShown(lang);
  return foodPlants(cell).filter((t) => !skip.has(t.id))
    .map((t) => ({ t, m: matchOf(t, q, lang) })).filter((x) => x.m !== null)
    .sort((a, b) => a.m.r - b.m.r || cmp(a.t, b.t)).map((x) => ({ taxon: x.t, english: x.m.english }));
}
export const cropMatches = (cell, query, lang, chosen = [], max = 8) => cropHits(cell, query, lang, chosen).slice(0, max).map((h) => h.taxon);
// The one string an option shows, is named by and was matched on: the shown name, and the English
// one in brackets when the match came from it. paren: the page's brackets (words.js makeWords).
export const cropLabel = (hit, lang, paren) => plantName(hit.taxon, lang).text + (hit.english ? paren(hit.english) : '');

// One-tap examples, which the page names in the reader's language. Ranked by the climate's best-known
// food plants (named in the most languages), then the most edible, then by scientific name: the same
// every time. Then picked for variety (prepush R2; approved state 18: apple, garlic, hazelnut, tomato):
// at most one plant per genus, and each round takes the best of a layer not yet shown, so the examples
// spread across the layers before a layer repeats. The crops already chosen are left out (C5: the
// examples and the field's placeholder).
export function cropExamples(cell, n = 4, chosen = []) {
  const known = (t) => Object.keys(t.names).length, skip = new Set(chosen);
  const ranked = foodPlants(cell).filter((t) => !skip.has(t.id)).sort((a, b) => known(b) - known(a) || (b.traits.edibility_rating ?? 0) - (a.traits.edibility_rating ?? 0) || (a.canonical_name < b.canonical_name ? -1 : 1));
  const out = [], genera = new Set();
  while (out.length < n) {
    const layers = new Set();
    let took = false;
    for (const t of ranked) {
      if (out.length >= n) break;
      const g = t.genus ?? t.canonical_name.split(' ')[0], s = t.stratum?.value ?? '';
      if (out.includes(t) || genera.has(g) || layers.has(s)) continue;
      out.push(t); genera.add(g); layers.add(s); took = true;
    }
    if (!took) break;
  }
  return out;
}

// A plant only another climate's list has, for the crop step's no-match message: the first list (in
// `others` order: inClimateOrder) with a plant matching as the crop search matches; never a plant this
// climate lists. others: [[climate id, climate file], …]. english: as for cropHits.
export function elsewhereHit(query, lang, others, cell) {
  const q = fold(query.trim());
  if (!q) return null;
  const here = new Set(cell.taxa.map((t) => t.id));
  for (const [climate, file] of others) {
    const hits = file.taxa.filter((t) => !here.has(t.id)).map((t) => ({ t, m: matchOf(t, q, lang) })).filter((x) => x.m !== null)
      .sort((a, b) => a.m.r - b.m.r || Number(isFood(b.t)) - Number(isFood(a.t)) || byShown(lang)(a.t, b.t));
    if (hits.length) return { climate, taxon: hits[0].t, english: hits[0].m.english };
  }
  return null;
}

// The other climates' files in the climates' fixed order (B9, C9), never the order they arrived in,
// so "from the … list" and the data a plant brings are the same on every visit. others: Map climate →
// file; order: the climates (src/data/climates.ts); skip: the climate shown.
export const inClimateOrder = (others, order, skip) => order.filter((c) => c !== skip && others.has(c)).map((c) => [c, others.get(c)]);

// Loads the climates' files at once and gives them back in the climates' order, with the climates
// whose file failed (B2): the page says so and offers to try again, and never reads a guest whose
// file failed as a plant no longer listed. load(climate) → Promise of its file.
export async function loadLists(order, load) {
  const got = await Promise.all(order.map((c) => load(c).then((f) => [c, f], () => [c, null])));
  return { files: new Map(got.filter(([, f]) => f)), failed: got.filter(([, f]) => !f).map(([c]) => c) };
}

// The Add sheet's filters, on any plant (its own list's or another's, B13): job, layer, and the stage
// it leads in (phase: an index into phases). An empty filter lets everything through.
export function addFilterMatch(t, { job = '', layer = '', phase = null } = {}) {
  if (job && !jobsOf(t).includes(job)) return false;
  if (layer && (t.stratum?.value ?? 'none') !== layer) return false;
  if (phase != null && phase !== '' && !(t.phases && phases.indexOf(t.phases.start) <= Number(phase) && phases.indexOf(t.phases.end) >= Number(phase))) return false;
  return true;
}

// The Add search's "In another climate's list": plants other lists have and this one lacks, matched
// as Add matches (any of a plant's names, in any language, or its scientific name), each once, with
// the first list that has it.
export function otherListMatches(query, others, cell, max = 20) {
  const q = fold(query.trim());
  if (!q) return [];
  const seen = new Set(cell.taxa.map((t) => t.id)), out = [];
  for (const [climate, file] of others) {
    for (const t of file.taxa) {
      if (seen.has(t.id) || !searchText(t).includes(q)) continue;
      seen.add(t.id);
      out.push({ climate, taxon: t });
    }
  }
  return out.slice(0, max);
}

// The Kept filter of the plant list (chunk B builds its menu): every plant, the kept ones, the ones
// Fill may still replace, and the main crops (design-scale.md §6b, state 26). sel: { kept: Set, crops: [] }.
export const KEPT_FILTERS = ['all', 'kept', 'notKept', 'crops'];
export function keptFilter(ids, sel, value) {
  const crops = new Set(sel.crops);
  if (value === 'kept') return ids.filter((id) => sel.kept.has(id));
  if (value === 'notKept') return ids.filter((id) => !sel.kept.has(id));
  if (value === 'crops') return ids.filter((id) => crops.has(id));
  return [...ids];
}
export const keptCounts = (ids, sel) => Object.fromEntries(KEPT_FILTERS.map((v) => [v, keptFilter(ids, sel, v).length]));
