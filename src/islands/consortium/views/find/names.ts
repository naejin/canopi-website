// Find's search index and the names file (PP-C c1; slices 3.3, design check c1 section 4): one
// module-level load for the page's life, started when Find first opens (4.6: from Place too, before the
// palette shows), so a sheet closed mid-fetch and opened again uses the same load (4.5).
//
// - At once: the index over the core's names (PlantSource.names: the page's language, English and the
//   canonical name of every plant in the release), so search works while the file loads (4.1).
// - Then schema 4's names file (#ct-data `names`; none before schema 4): fetched and checked by
//   data/names-file.ts (digests, header matched to the page's database 4.4, a stalled download
//   aborted), folded in slices that yield (data/search.ts indexSliced, 4.7), and the index swapped
//   once it is whole, so the results refresh once (one announcement).
// - Failures: not found, offline or stalled (4.2): one line, and the next focus on the search tries
//   again (a failed load is never kept); a digest mismatch (4.3) or a file bound to another database
//   (4.4): dropped until the page reloads, the same line.
import { signal } from '@preact/signals';
import type { ClimateZone, Locale, PlantId, PlantSource } from '../../../../lib/consortium/index.ts';
import { indexSliced, releaseIndex, type Finder } from '../../data/search.ts';
import { loadNamesFile, NamesFileError } from '../../data/names-file.ts';
import { pageData } from '../kit/page.ts';

// What the names file is doing: none (the page names no file), loading, ready, failed (tried again on
// the next focus) or dropped (until reload).
export type NamesState = 'none' | 'loading' | 'ready' | 'failed' | 'dropped';
export const namesState = signal<NamesState>('none');
// The search Find and Paste read: the core's names, then with the names file; null until the core's.
export const finder = signal<Finder | null>(null);
// Every plant of the release: its lists (4.8: a hit outside the current list names them), its names.
export interface ReleasePlant { id: PlantId; canonical: string; names: Partial<Record<string, string>>; lists: ClimateZone[] }
export const releasePlants = signal<ReadonlyMap<PlantId, ReleasePlant>>(new Map());

let core: Promise<{ entries: ReleasePlant[]; plantIds: Map<number, PlantId> }> | null = null;
let file: Promise<void> | null = null;
let forSource: PlantSource | null = null;

// Find calls it on opening and on each focus of its search: the core's index once per source, and the
// names file unless it loads, is in, or was dropped.
export function wantNames(source: PlantSource, lang: Locale): void {
  if (source !== forSource) { forSource = source; core = null; file = null; finder.value = null; }
  core ??= source.names(lang).then((list) => {
    const entries = list.map((p) => ({ id: p.id, canonical: p.canonical, names: p.names, lists: p.lists }));
    if (forSource === source) {
      releasePlants.value = new Map(entries.map((e) => [e.id, e]));
      finder.value ??= releaseIndex({ names: entries, lang });
    }
    return { entries, plantIds: new Map(list.map((p) => [p.plant, p.id])) };
  }, (err: unknown) => { core = null; throw err; });
  const d = pageData(), ref = d?.names;
  if (!ref || !d?.db || !d.releaseId) return;
  const state = namesState.peek();
  if (file || state === 'ready' || state === 'dropped') return;
  namesState.value = 'loading';
  const page = { release_id: d.releaseId, core_raw_sha256: d.db.rawSha256 };
  file = (async () => {
    try {
      const text = await loadNamesFile(ref, page);
      const { entries, plantIds } = await core!;
      const full = await indexSliced({ names: entries, lang, file: text, plantIds });
      if (forSource !== source) return;
      finder.value = full;
      namesState.value = 'ready';
    } catch (err) {
      const retry = err instanceof NamesFileError && err.retry;
      console.warn(`Consortium: the names file ${retry ? 'did not load' : 'was dropped'}: ${(err as Error).message}`);
      if (forSource === source) namesState.value = retry ? 'failed' : 'dropped';
      if (retry) file = null; // the next focus tries again (4.2); dropped keeps `file`: no retry until reload
    }
  })();
}
