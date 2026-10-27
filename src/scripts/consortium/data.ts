// The consortium data, fetched from the site's own static files (public/data/consortium/, written by
// scripts/install-consortium.mjs): the manifest first, then one cell file when a place is chosen.
// Each file is fetched once per page view; a failed fetch is forgotten so "Try again" fetches again.
import type { Cell, Labels, Manifest } from '../../lib/consortium/index.ts';

const BASE = '/data/consortium/';
const cache = new Map<string, Promise<unknown>>();

function load<T>(file: string): Promise<T> {
  let p = cache.get(file) as Promise<T> | undefined;
  if (!p) {
    p = fetch(BASE + file).then((r) => {
      if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
      return r.json() as Promise<T>;
    });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p;
}

export const loadManifest = () => load<Manifest>('manifest.json');
export const loadLabels = () => load<Labels>('labels.json');
export const loadCell = (file: string) => load<Cell>(file);
