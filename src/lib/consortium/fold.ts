// A name as search compares it: canopi-types species-search normalization v1 (the app's rule, one
// for both; scripts/fixtures/canopi-types/species-search-normalization.json, its corpus run by
// scripts/consortium-pp-c1.test.mjs; coordinator row 2026-11-17 "Schema 4.1 staging and search
// normalization"). Callers: data/search.ts (Find and Paste, one search module). A leaf: it imports
// nothing.
//
// v1, in order: compatibility decomposition (NFKD; ligatures written out, ﬃ = ffi), lower case,
// combining marks removed (general categories Mn, Mc, Me: é = e, ё = е, kana voicing ば = は), the two
// case folds ß → ss and ς → σ, then every run of characters other than letters, numbers and the
// underscore is one space between tokens (Carleton's = carleton s). So the folded text is its tokens
// joined by single spaces, and a word start is a space or the start.
// Changes from the website's earlier fold (accepted to match the app): Korean syllables decompose
// into jamo (배 is a prefix of 백합), kana lose their voicing (ばら = はら), œ and æ stay (Cœur is not
// coeur).
// The Unicode-15 gap: v1 pins Unicode 15.0 data (its facts file, 48 KB gzip, not shipped); this uses
// the browser's own normalize() and \p classes, so a scalar assigned after Unicode 15.0 may fold as a
// letter here where v1 drops it (the corpus case "scalar-newer-than-pinned-unicode-data", skipped).
const MARKS = /\p{M}+/gu;
const NOT_TOKEN = /[^\p{L}\p{N}_]+/gu;
const CASE_FOLDS: Record<string, string> = { ß: 'ss', ς: 'σ' };
export const fold = (text: string): string =>
  text.normalize('NFKD').toLowerCase().normalize('NFKD').replace(MARKS, '').replace(/[ßς]/g, (c) => CASE_FOLDS[c]).replace(NOT_TOKEN, ' ').trim();

// v1's query admission: the tokens a query searches by. A query folding to nothing browses; one of a
// single scalar is too short; else its unique tokens of two scalars or more, or every unique token
// when none is that long ("A/B": a and b together).
export type Admission = 'browse' | 'too-short' | 'active-text';
export function queryTokens(text: string): { admission: Admission; tokens: string[] } {
  const f = fold(text);
  const scalars = [...f.replace(/ /g, '')].length;
  if (!scalars) return { admission: 'browse', tokens: [] };
  if (scalars < 2) return { admission: 'too-short', tokens: [] };
  const all = [...new Set(f.split(' '))];
  const long = all.filter((t) => [...t].length >= 2);
  return { admission: 'active-text', tokens: long.length ? long : all };
}
