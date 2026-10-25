// The "Find your crop" index of CrossLookup (will-they-cross) and HybridLookup
// (hybrids-heirlooms-landraces): every name a reader may know a crop by, in the page's language,
// sorted A–Z with the language's collation, each a link to the crop's entry. There is no matching:
// the reader picks a name, and the link goes to the one entry it belongs to. Type imports only, so
// scripts/guides-lookups.test.mjs can run it under node.
import type { Crop } from '../../../../data/crops';
import type { GuideLang } from '../../../../i18n/guides';

export interface IndexEntry { name: string; crop: string | null; href: string; }
export interface IndexLetter { letter: string; entries: IndexEntry[]; }

// A row that names several crops ("Cabbage, kale, broccoli", "Beet and chard", "Piment et poivron")
// is indexed under each of them. Quoted or bracketed names are one name.
const nameParts = (name: string) => (/[“«(]/.test(name) ? [name] : name.split(/,\s*|\s+(?:and|et)\s+/)).map((p) => p.trim()).filter(Boolean);
export const exampleNames = (c: Crop, lang: GuideLang) => (c.examples?.[lang] ?? '').split(/[,;]/).map((p) => p.trim()).filter(Boolean);
const initial = (name: string) => name.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toLocaleUpperCase();

export const entryId = (prefix: string, id: string) => `${prefix}-${id}`;

export function cropIndex(list: Crop[], lang: GuideLang, prefix: string): IndexLetter[] {
  const collator = new Intl.Collator(lang, { sensitivity: 'base' });
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];
  const add = (name: string, crop: string | null, id: string) => {
    const href = `#${entryId(prefix, id)}`;
    const key = `${name.toLocaleLowerCase(lang)}|${href}`;
    if (!seen.has(key)) { seen.add(key); entries.push({ name, crop, href }); }
  };
  for (const c of list) {
    for (const part of nameParts(c.name[lang])) add(part, null, c.id);
    // An example is shown with its crop's name, so "sweet" reads as sweet corn and "pumpkin" as a pepo squash.
    for (const example of exampleNames(c, lang)) add(example, c.name[lang], c.id);
  }
  entries.sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.crop ?? '', b.crop ?? ''));
  const letters: IndexLetter[] = [];
  for (const entry of entries) {
    const letter = initial(entry.name);
    if (letters.at(-1)?.letter !== letter) letters.push({ letter, entries: [] });
    letters.at(-1)!.entries.push(entry);
  }
  return letters;
}

// HybridLookup's crops. Fine: only the crops of his stated list (Landrace Gardening, "Heirlooms,
// Hybrids, and Landraces": tomato, cucumber, squash, corn, watermelon, melon, spinach). His project
// tomatoes are not seed you buy, so they are left out.
export const hisFine = ['tomato-garden', 'cucumber', 'squash-pepo', 'squash-moschata', 'squash-maxima', 'corn', 'watermelon', 'melon', 'spinach'];
export const projectRows = ['tomato-panamorous', 'tomato-promiscuous'];
export const hybridCrops = (all: Crop[]): Crop[] => all.filter((c) => c.cms && !projectRows.includes(c.id));
