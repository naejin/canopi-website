// Field Guides from the content collection: which are published, in what order, and who cites a book.
import { getCollection, type CollectionEntry } from 'astro:content';
import { guideDomains, guideLocales, type GuideLang } from '../i18n/guides';

export type GuideEntry = CollectionEntry<'guides'>;
export { guideDomains };

// Entry ids are "<slug>/<lang>" (the glob loader names entries by path).
export const slugOf = (entry: GuideEntry): string => entry.id.split('/')[0];
export const langOf = (entry: GuideEntry): GuideLang => entry.id.split('/')[1] as GuideLang;

let all: GuideEntry[] | undefined;
async function entries(): Promise<GuideEntry[]> {
  all ??= await getCollection('guides');
  return all;
}

// Published guides in one language, in reading order: by domain, then by order, then by title.
export async function publishedGuides(lang: GuideLang): Promise<GuideEntry[]> {
  const list = await entries();
  const slugs = new Set(list.map(slugOf));
  const published = [...slugs].filter((slug) => guideLocales.every((l) => list.some((e) => slugOf(e) === slug && langOf(e) === l)));
  return list
    .filter((e) => langOf(e) === lang && published.includes(slugOf(e)))
    .sort((a, b) =>
      guideDomains.indexOf(a.data.domain) - guideDomains.indexOf(b.data.domain)
      || a.data.order - b.data.order
      || a.data.title.localeCompare(b.data.title, lang));
}

// The guides citing a book id, for the bibliography's backlinks.
export async function guidesCiting(bookId: string, lang: GuideLang): Promise<GuideEntry[]> {
  return (await publishedGuides(lang)).filter((e) => e.data.sources.some((s) => s.book === bookId));
}
