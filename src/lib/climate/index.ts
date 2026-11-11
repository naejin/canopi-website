// The site's climate reader (P5, design check section A): where is a point, what is its climate in
// each period/scenario, its soil and its botanical area and country, read from the canopi-climate
// v0.2 tiles installed under /data/climate/<version>-<manifest digest>/ (scripts/install-climate.mjs).
//
//   const source = createTileSource({ index: siteIndex(climateIndexJson) });
//   const site = await lookupSite(45.76, 4.84, source);
//
// Fetching: the point's tile of each layer (three requests in parallel), then a neighbouring tile
// only when the point's own cell does not answer (sea, an incomplete cell) and lies within 2 cells
// of a tile edge, as `canopi-climate sample` searches. A tile the index does not list is never
// requested (no data there, and a miss would run the Worker); a listed tile that fails to fetch or
// decode rejects with ClimateTileError. At most `maxTiles` decoded tiles per layer stay in memory.

import { LAYERS } from './model.js';
import { cellOf, searchTiles, tileNameOf, validCoordinate } from './grid.ts';
import { climateAt, CLIMATE_GRID, DEFAULT_RADIUS, LAYER_GRID, ownCellAnswers, regionsAt, soilAt, type ClimateAt, type LayerId, type RegionsAt, type SoilAt } from './lookup.ts';
import { decodeRaster, type Inflate, type Raster } from './tiff.ts';

export * from './grid.ts';
export * from './koppen.ts';
export * from './soil.ts';
export * from './regions.ts';
export * from './lookup.ts';
export { decodeRaster, inflateDeflate, TileFormatError, type Raster, type Inflate } from './tiff.ts';
export { LAYERS, SLOTS, VARIABLES, NODATA } from './model.js';

/** What the reader needs of src/data/climate-index.json: where the tiles are and which exist. */
export interface SiteIndex {
  /** URL directory of the install, ending in `/`, e.g. `/data/climate/0.2.0-04ec85f4603f/`. */
  base: string;
  /** Tile names per layer. */
  tiles: Record<LayerId, ReadonlySet<string>>;
}

/** The index file's shape (scripts/install-climate.mjs buildIndex); only what the reader reads. */
export interface ClimateIndexFile {
  base: string;
  layers: Record<LayerId, { dir: string; tiles: Record<string, number> }>;
  [key: string]: unknown;
}

/** The reader's view of the installer's index (also accepts names-only lists, for a page payload). */
export function siteIndex(file: { base: string; layers: Record<LayerId, { tiles: Record<string, number> | readonly string[] }> }): SiteIndex {
  const names = (t: Record<string, number> | readonly string[]) => new Set(Array.isArray(t) ? t : Object.keys(t));
  return {
    base: file.base,
    tiles: { climate: names(file.layers.climate.tiles), soil: names(file.layers.soil.tiles), regions: names(file.layers.regions.tiles) },
  };
}

/** A tile the index lists that could not be fetched or decoded (the page's "fetch failed" state). */
export class ClimateTileError extends Error {
  readonly layer: LayerId;
  readonly tile: string;
  constructor(layer: LayerId, tile: string, cause: unknown) {
    super(`climate tile ${LAYERS[layer].dir}/${tile}.tif could not be read: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = 'ClimateTileError';
    this.layer = layer;
    this.tile = tile;
  }
}

/** Where tiles come from: `has` from the index, `get` fetching and decoding. */
export interface TileSource {
  has(layer: LayerId, name: string): boolean;
  get(layer: LayerId, name: string): Promise<Raster>;
}

export interface TileSourceOptions {
  index: SiteIndex;
  /** Bytes of a URL (default: fetch, rejecting a non-2xx answer). */
  fetchBytes?: (url: string) => Promise<ArrayBuffer>;
  /** Decoded tiles kept per layer (default 4: a lookup at a tile corner needs 4). */
  maxTiles?: number;
  inflate?: Inflate;
}

const defaultFetch = async (url: string): Promise<ArrayBuffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
};

/** A TileSource over the installed tiles, with a small LRU of decoded tiles per layer. */
export function createTileSource({ index, fetchBytes = defaultFetch, maxTiles = 4, inflate }: TileSourceOptions): TileSource & { cached(layer: LayerId): string[] } {
  const caches: Record<LayerId, Map<string, Promise<Raster>>> = { climate: new Map(), soil: new Map(), regions: new Map() };
  return {
    has: (layer, name) => index.tiles[layer].has(name),
    cached: (layer) => [...caches[layer].keys()],
    get(layer, name) {
      if (!index.tiles[layer].has(name)) return Promise.reject(new ClimateTileError(layer, name, 'not in the climate index'));
      const cache = caches[layer];
      const hit = cache.get(name);
      if (hit) {
        cache.delete(name);
        cache.set(name, hit);
        return hit;
      }
      const spec = LAYERS[layer];
      const url = `${index.base}${spec.dir}/${name}.tif`;
      const p = (async () => {
        let raster: Raster;
        try {
          raster = await decodeRaster(await fetchBytes(url), { side: spec.tileCells, cellDeg: spec.cellDeg, bands: spec.bands }, inflate);
        } catch (err) {
          throw new ClimateTileError(layer, name, err);
        }
        if (tileNameOf(raster.north - spec.cellDeg / 2, raster.west + spec.cellDeg / 2) !== name) throw new ClimateTileError(layer, name, `the file holds the tile at ${raster.north} N, ${raster.west} E`);
        return raster;
      })();
      cache.set(name, p);
      p.catch(() => { if (cache.get(name) === p) cache.delete(name); });
      while (cache.size > maxTiles) cache.delete(cache.keys().next().value as string);
      return p;
    },
  };
}

/** A site lookup: each layer null when nothing is near (sea), with what was read. */
export interface SiteLookup {
  lat: number;
  lon: number;
  /** The point's tile name. */
  tile: string;
  /** null: no complete climate cell within 2 cells (sea, or the point's tile is not in the index). */
  climate: ClimateAt | null;
  /** null: no soil value within 2 layer cells (sea, ice, built-up gap wider than the fill). */
  soil: SoilAt | null;
  /** Always an object; its codes are null offshore. */
  regions: RegionsAt;
  /** Tiles read for this lookup, per layer (the point's tile first). */
  tilesRead: Record<LayerId, string[]>;
  /** A layer's answer came from a neighbouring tile's cell. */
  crossTile: boolean;
}

/** Search radius of the site layers (src/layer.rs LAYER_LOOKUP_RADIUS; `lookup --radius` leaves it). */
export const LAYER_RADIUS = 2;

const LAYER_IDS: LayerId[] = ['climate', 'soil', 'regions'];

/**
 * Looks a point up: climate within `radius` cells (default 2, the crate's), soil and regions within
 * 2 layer cells (the CLI's fixed LAYER_LOOKUP_RADIUS). Rejects with a RangeError for an invalid
 * coordinate (latitude outside [-90, 90], non-finite) and with ClimateTileError when a listed tile
 * cannot be read.
 */
export async function lookupSite(lat: number, lon: number, source: TileSource, radius = DEFAULT_RADIUS): Promise<SiteLookup> {
  if (!validCoordinate(lat, lon)) throw new RangeError(`invalid coordinate ${lat}, ${lon}`);
  const own = tileNameOf(lat, lon) as string;
  const loaded: Record<LayerId, Map<string, Raster>> = { climate: new Map(), soil: new Map(), regions: new Map() };
  const load = (layer: LayerId, names: string[]) =>
    Promise.all(names.filter((n) => !loaded[layer].has(n) && source.has(layer, n)).map(async (n) => { loaded[layer].set(n, await source.get(layer, n)); }));

  await Promise.all(LAYER_IDS.map((layer) => load(layer, [own])));
  // Neighbours only where the point's own cell does not answer; the search window leaves the tile
  // only within `radius` cells of its edge.
  await Promise.all(LAYER_IDS.map((layer) => {
    if (ownCellAnswers(layer, loaded[layer].get(own) ?? null, lat, lon)) return null;
    const g = layer === 'climate' ? CLIMATE_GRID : LAYER_GRID;
    return load(layer, searchTiles(g, cellOf(g, lat, lon)!, layer === 'climate' ? radius : LAYER_RADIUS));
  }));

  const getter = (layer: LayerId) => (name: string) => loaded[layer].get(name) ?? null;
  const climate = climateAt(getter('climate'), lat, lon, radius);
  const soil = soilAt(getter('soil'), lat, lon, LAYER_RADIUS);
  const regions = regionsAt(getter('regions'), lat, lon, LAYER_RADIUS);
  const read = (layer: LayerId) => [...loaded[layer].keys()].sort((a, b) => (a === own ? -1 : b === own ? 1 : 0));
  return {
    lat, lon, tile: own, climate, soil, regions,
    tilesRead: { climate: read('climate'), soil: read('soil'), regions: read('regions') },
    crossTile: (climate !== null && climate.tile !== own) || (soil !== null && soil.tile !== own),
  };
}
