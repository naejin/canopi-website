// The search matching of the guide lookups (CrossLookup here, HybridLookup in
// hybrids-heirlooms-landraces). Pure and dependency-free, so the components' client scripts and
// scripts/guides-lookups.test.mjs run the same code. The lists themselves are plain HTML; this only
// narrows them and picks which entries to open.
//
// - Accents and case fold away ("Maïs" = "mais").
// - A typed word matches the start of a word in an entry's names, examples or species, so "corn" is
//   not found inside "acorn" and "melon" not inside "melongena". When some entry has the word whole,
//   only those count; otherwise it matches as a prefix (a word still being typed).
// - Words naming a whole group ("squash", "bean": three or more entries) and qualifiers ("sweet",
//   "hot") are generic: they list their entries only when nothing more specific was typed, and never
//   open one. Several crops typed ("zucchini butternut") show and open all of them.
// - A name of two words or more typed whole ("fava bean", "sweet potato") counts as one match.
import type { Crop } from '../../../../data/crops';

export const fold = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const words = (text: string): string[] => fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Little words of a query, and qualifiers that describe a variety rather than name a crop.
const filler = new Set(['and', 'or', 'with', 'the', 'of', 'vs', 'et', 'ou', 'avec', 'de', 'du', 'des', 'd', 'l', 'la', 'le', 'les', 'un', 'une', 'a']);
const qualifiers = new Set(['sweet', 'hot', 'mild', 'early', 'late', 'doux', 'douce', 'fort', 'forte', 'piquant', 'piquante', 'precoce', 'tardif', 'tardive']);
const GENERIC = 3;

export interface Entry { words: string[]; phrases: string[][]; }
export interface Match { shown: number[]; open: number[]; none: boolean; empty: boolean; }

// What an entry is found by, as two data-attribute strings: its words, and its names of two words or
// more (each name and each comma-separated example), "|"-separated.
export function cropTerms(c: Crop): { terms: string; phrases: string } {
  const names = [c.name.en, c.name.fr, ...[c.examples?.en, c.examples?.fr].flatMap((e) => e?.split(/[,;]/) ?? [])];
  const all = [...names, c.species ?? ''];
  const phrases = names.map(words).filter((w) => w.length > 1).map((w) => w.join(' '));
  return { terms: [...new Set(all.flatMap(words))].join(' '), phrases: [...new Set(phrases)].join('|') };
}

export const parseEntry = (terms: string, phrases: string): Entry => ({
  words: terms.split(' ').filter(Boolean),
  phrases: phrases.split('|').filter(Boolean).map((p) => p.split(' ')),
});

export function matchLookup(query: string, entries: Entry[], options: { ignore?: string[] } = {}): Match {
  const ignore = new Set(options.ignore ?? []);
  const typed = words(query).filter((w) => !filler.has(w) && !ignore.has(w));
  const all = entries.map((_, i) => i);
  if (typed.length === 0) return { shown: all, open: [], none: false, empty: true };

  const specific = new Set<number>();
  const open = new Set<number>();
  const generic = new Set<number>();
  const used = new Array(typed.length).fill(false);

  // Names of several words typed whole.
  entries.forEach((entry, i) => {
    for (const phrase of entry.phrases) {
      for (let at = 0; at + phrase.length <= typed.length; at++) {
        if (phrase.every((w, k) => typed[at + k] === w)) {
          specific.add(i); open.add(i);
          for (let k = 0; k < phrase.length; k++) used[at + k] = true;
        }
      }
    }
  });

  typed.forEach((word, k) => {
    if (used[k]) return;
    const whole = all.filter((i) => entries[i].words.includes(word));
    const hits = whole.length > 0 ? whole : all.filter((i) => entries[i].words.some((w) => w.startsWith(word)));
    if (hits.length === 0) return;
    if (qualifiers.has(word) || hits.length >= GENERIC) {
      for (const i of hits) generic.add(i);
      return;
    }
    for (const i of hits) {
      specific.add(i);
      // A single letter or two narrows the list but opens nothing yet.
      if (whole.length > 0 || word.length >= 3) open.add(i);
    }
  });

  const shown = [...(specific.size > 0 ? specific : generic)].sort((a, b) => a - b);
  return { shown, open: [...open].sort((a, b) => a - b), none: shown.length === 0, empty: false };
}
