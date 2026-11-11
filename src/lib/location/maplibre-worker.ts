// MapLibre's worker as a chunk of the site's own build (P5 S5b): Vite's `?worker&url` bundles a
// worker on its own, which put a second copy of maplibre-gl-shared (146 KB gzip) in it, past the
// 330 KB budget. Imported like any module instead, the worker entry shares the main bundle's
// maplibre-gl-shared chunk, and this chunk's own URL is the worker script (a module worker: MapLibre
// starts one for any URL not ending in .cjs). Evaluated on the page, the entry only defines its
// classes: it starts its worker only inside a worker scope. Its export is re-exported so the build
// keeps the module: maplibre-gl declares its dist files free of side effects, so a bare import of it
// would be dropped.
// @ts-expect-error the worker entry ships no type declarations
import MapLibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs';

export const workerUrl: string = import.meta.url;
export const worker: unknown = MapLibreWorker;
