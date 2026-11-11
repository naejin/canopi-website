// Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero General Public License,
// version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// copied from canopi desktop/web/src/maplibre/loader.ts at b039f14ee612c6090c91d44b9968357cbdd1d33e
// (loadMapLibreModule). Changes for the website (P5 S5b, design check §B): MapLibre comes with its
// stylesheet through ./maplibre-entry.ts; the worker is ./maplibre-worker.ts, a chunk of the site's
// build sharing MapLibre's shared code, not a `?worker&url` bundle (which duplicated it).
// Owner of the MapLibre worker setup: MapLibre's worker script is chosen and its URL set only here.

type MapLibre = typeof import('./maplibre-entry.ts');

let mapLibreModulePromise: Promise<MapLibre> | null = null;

export function loadMapLibreModule(): Promise<MapLibre> {
  if (!mapLibreModulePromise) {
    mapLibreModulePromise = Promise.all([
      import('./maplibre-entry.ts'),
      import('./maplibre-worker.ts'),
    ])
      .then(([module, worker]) => {
        module.setWorkerUrl(worker.workerUrl);
        return module;
      })
      .catch((error: unknown) => {
        mapLibreModulePromise = null;
        throw error;
      });
  }
  return mapLibreModulePromise;
}
