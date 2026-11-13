// The folded-name search (A6; stream S1), apart from the PlantSource: Add and Paste use it, and were
// it in data/sqlite-source.ts, that module would leave the loader's chunk (outside the island's 60 KB
// budget, beside the sqlite glue it needs) for a chunk shared with the sheets, counted in the budget.
import { fold, type Locale, type PlantId } from '../../../lib/consortium/index.ts';

// fold lives in the core leaf src/lib/consortium/fold.ts (E6 design check A9), re-exported here for
// the callers that read it from this module (paste.ts).
export { fold };

const WORD = /[\p{L}\p{N}]/u;
// Scripts written without spaces between words: a query in them matches anywhere in a name.
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export interface NameEntry { id: PlantId; canonical: string; names: Partial<Record<Locale, string>> }
export interface SearchHit { id: PlantId; text: string; score: number } // score: 0 exact, 1 name prefix, 2 word prefix, 3 inside

// How well a folded name matches a folded query, or null.
function scoreOf(name: string, q: string, anywhere: boolean): number | null {
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  for (let at = name.indexOf(q, 1); at > 0; at = name.indexOf(q, at + 1)) if (!WORD.test(name[at - 1])) return 2;
  return anywhere && name.includes(q) ? 3 : null;
}

// A search over every plant's canonical name and names (PlantSource.names: en and the page's
// locale): the best match per plant, best first, then by canonical name.
export function searchIndex(entries: NameEntry[]): (query: string, limit?: number) => SearchHit[] {
  const index = entries.map((e) => ({ e, texts: [e.canonical, ...Object.values(e.names)].filter((t): t is string => !!t).map((t) => [t, fold(t)] as const) }));
  return (query, limit = Infinity) => {
    const q = fold(query).trim().replace(/\s+/g, ' ');
    if (!q) return [];
    const anywhere = UNSPACED.test(q);
    const hits: (SearchHit & { canonical: string })[] = [];
    for (const { e, texts } of index) {
      let best: SearchHit | null = null;
      for (const [text, folded] of texts) {
        const s = scoreOf(folded, q, anywhere);
        if (s !== null && (!best || s < best.score)) best = { id: e.id, text, score: s };
      }
      if (best) hits.push({ ...best, canonical: e.canonical });
    }
    hits.sort((a, b) => a.score - b.score || (a.canonical < b.canonical ? -1 : a.canonical > b.canonical ? 1 : 0));
    return hits.slice(0, limit).map(({ id, text, score }) => ({ id, text, score }));
  };
}
