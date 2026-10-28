// The main-crops step and "Add anyway": which plants can be main crops, how the crop search
// matches, where else a plant is listed, and the Kept filter's values. Pure (no DOM, no strings), so
// scripts/consortium-scale.test.mjs tests them on the fixture.
// Decision rows "Main crops first" and "Scale mockup approved" (owner, 2026-10-28): up to three
// crops, chosen among the climate's own food plants (the feeds-you role); the step never suggests
// switching climate; a plant only another climate lists can be added later with "Add anyway".
import { plantName, fold, searchText } from './words.js';

// The climate's food plants: the feeds-you role (jobs.ts: a crop feeds you).
export const foodPlants = (cell) => cell.taxa.filter((t) => t.role === 'crop');
export const isFood = (t) => t?.role === 'crop';

// How well a plant's shown name and scientific name match: 0 the name starts with the text typed,
// 1 a word of it does, 2 it is inside a word; null when neither name has it. The shown name is the
// one in the reader's language (else English, as the page shows it), never a hidden one (R4-m1).
function matchRank(t, q, lang) {
  let best = null;
  for (const n of [fold(plantName(t, lang).text), fold(t.canonical_name)]) {
    const i = n.indexOf(q);
    if (i < 0) continue;
    const r = i === 0 ? 0 : /[\s\-'’(]/.test(n[i - 1]) ? 1 : 2;
    if (best === null || r < best) best = r;
  }
  return best;
}

const byShown = (lang) => (a, b) => plantName(a, lang).text.localeCompare(plantName(b, lang).text, lang) || (a.canonical_name < b.canonical_name ? -1 : 1);

// The food plants whose shown or scientific name has the text typed, best match first, then by
// the name shown; the crops already chosen are left out.
export function cropMatches(cell, query, lang, chosen = [], max = 8) {
  const q = fold(query.trim());
  if (!q) return [];
  const skip = new Set(chosen), cmp = byShown(lang);
  return foodPlants(cell).filter((t) => !skip.has(t.id))
    .map((t) => ({ t, r: matchRank(t, q, lang) })).filter((x) => x.r !== null)
    .sort((a, b) => a.r - b.r || cmp(a.t, b.t)).slice(0, max).map((x) => x.t);
}

// One-tap examples, which the page names in the reader's language: the climate's best-known food
// plants (named in the most languages), then the most edible, then by scientific name: the same
// every time.
export function cropExamples(cell, _lang, n = 4) {
  const known = (t) => Object.keys(t.names).length;
  return [...foodPlants(cell)].sort((a, b) => known(b) - known(a) || (b.traits.edibility_rating ?? 0) - (a.traits.edibility_rating ?? 0) || (a.canonical_name < b.canonical_name ? -1 : 1)).slice(0, n);
}

// A plant only another climate's list has, for the crop step's no-match message: the first list (in
// `others` order) with a plant whose shown or scientific name matches; never a plant this climate
// lists. others: [[climate id, climate file], …].
export function elsewhereHit(query, lang, others, cell) {
  const q = fold(query.trim());
  if (!q) return null;
  const here = new Set(cell.taxa.map((t) => t.id));
  for (const [climate, file] of others) {
    const hits = file.taxa.filter((t) => !here.has(t.id)).map((t) => ({ t, r: matchRank(t, q, lang) })).filter((x) => x.r !== null)
      .sort((a, b) => a.r - b.r || Number(isFood(b.t)) - Number(isFood(a.t)) || byShown(lang)(a.t, b.t));
    if (hits.length) return { climate, taxon: hits[0].t };
  }
  return null;
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
