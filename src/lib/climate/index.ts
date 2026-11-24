// Ported from canopi-climate (https://github.com/opencanopi/canopi-climate, commit 0908add + v0.7.0 WASM):
// Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero General Public License,
// version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
//
// Hybrid 2-tier site climate reader:
// - Core layers (tiles, soil, regions): cross-tile coastal fallback in TS (lookup_across semantics).
// - v0.7.0 layers + analogues.bin + microclimate/trajectory/photoperiod/AWC: decoded directly by the
//   pinned canopi-climate v0.7.0 Rust WASM module (zero hand-ported decoder drift).
//   * Tier 1 (eager on site pick): tiles, soil, regions, extremes, frost_calendar, terrain
//   * Tier 2A (idle/lazy prefetch): extremes_tail, phenology, water_balance, soil_plus
//   * Tier 2B (on-demand + cached): monthly, monthly_precip, analogues.bin (findAnalogues)

import { ALL_LAYERS, LAYERS } from './model.js';
import { cellOf, centerLat, centerLon, searchTiles, tileName, tileNameOf, tileOf, validCoordinate, window as cellWindow } from './grid.ts';
import { climateAt, CLIMATE_GRID, DEFAULT_RADIUS, LAYER_GRID, ownCellAnswers, regionsAt, soilAt, type ClimateAt, type LayerId, type RegionsAt, type SoilAt } from './lookup.ts';
import { decodeRaster, type Inflate, type Raster } from './tiff.ts';
import {
  wasmFindAnalogues,
  wasmLookupExtremes,
  wasmLookupExtremesTail,
  wasmLookupFrostCalendar,
  wasmLookupMonthly,
  wasmLookupMonthlyPrecip,
  wasmLookupPhenology,
  wasmLookupSoilPlus,
  wasmLookupTerrain,
  wasmLookupWaterBalance,
  type AnalogueQuery,
  type AnalogueResult,
  type AnalogueSearchOptions,
  type ExtremesLookup,
  type ExtremesTailLookup,
  type FrostCalendarLookup,
  type MonthlyLookup,
  type MonthlyPrecipLookup,
  type PhenologyLookup,
  type SoilPlusLookup,
  type TerrainLookup,
  type WaterBalanceLookup,
} from './wasm-bridge.ts';

export * from './grid.ts';
export * from './koppen.ts';
export * from './soil.ts';
export * from './regions.ts';
export * from './lookup.ts';
export * from './wasm-bridge.ts';
export { decodeRaster, readTileHeader, inflateDeflate, TileFormatError, type Raster, type Inflate, type TileHeader } from './tiff.ts';
export {
  ALL_LAYERS,
  CLIMATE_V07_PINS,
  COMPATIBLE_TILES_MANIFESTS,
  FROST_FREE_SENTINEL_DOY,
  LAYERS,
  NODATA,
  SLOTS,
  V07_LAYERS,
  VARIABLES,
  YEAR_ROUND_FROST_SENTINEL_DOY,
} from './model.js';

export type AnyLayerId = keyof typeof ALL_LAYERS;

/** What the reader needs of src/data/climate-index.json: where the tiles are and which exist. */
export interface SiteIndex {
  /** URL directory of the install, ending in `/`, e.g. `/data/climate/0.7.0-6d0b9385d5ac/`. */
  base: string;
  /** Tile names per layer (core layers required, v0.7.0 additive layers optional). */
  tiles: Record<LayerId, ReadonlySet<string>> & Partial<Record<AnyLayerId, ReadonlySet<string>>>;
  /** True when analogues.bin is installed at `${base}analogues.bin`. */
  analogues?: boolean;
}

/** The index file's shape (scripts/install-climate.mjs buildIndex); only what the reader reads. */
export interface ClimateIndexFile {
  base: string;
  layers: Partial<Record<AnyLayerId, { dir?: string; tiles: Record<string, number> | readonly string[] }>> &
    Record<LayerId, { dir?: string; tiles: Record<string, number> | readonly string[] }>;
  analogues?: unknown;
  [key: string]: unknown;
}

const ALL_LAYER_IDS = Object.keys(ALL_LAYERS) as AnyLayerId[];

/** The reader's view of the installer's index (also accepts names-only lists, for a page payload). */
export function siteIndex(file: ClimateIndexFile): SiteIndex {
  const names = (t: Record<string, number> | readonly string[]) => new Set(Array.isArray(t) ? t : Object.keys(t));
  const tiles = {} as SiteIndex['tiles'];
  for (const id of ALL_LAYER_IDS) {
    const entry = file.layers[id];
    if (entry?.tiles) tiles[id] = names(entry.tiles);
  }
  return {
    base: file.base,
    tiles,
    ...(file.analogues ? { analogues: true } : {}),
  };
}

/** A tile the index lists that could not be fetched or decoded (the page's "fetch failed" state). */
export class ClimateTileError extends Error {
  readonly layer: AnyLayerId;
  readonly tile: string;
  constructor(layer: AnyLayerId, tile: string, cause: unknown) {
    super(`climate tile ${ALL_LAYERS[layer].dir}/${tile}.tif could not be read: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = 'ClimateTileError';
    this.layer = layer;
    this.tile = tile;
  }
}

/** Where tiles come from: `has` from the index, `get` for core rasters, `getRaw` for WASM layers, `getAnalogues` for analogues.bin. */
export interface TileSource {
  has(layer: AnyLayerId, name: string): boolean;
  get(layer: LayerId, name: string): Promise<Raster>;
  getRaw?(layer: AnyLayerId, name: string): Promise<Uint8Array>;
  hasAnalogues?(): boolean;
  getAnalogues?(): Promise<Uint8Array>;
}

export interface TileSourceOptions {
  index: SiteIndex;
  /** Bytes of a URL (default: fetch, rejecting a non-2xx answer). */
  fetchBytes?: (url: string) => Promise<ArrayBuffer>;
  /** Decoded/raw tiles kept per layer (default 4: a lookup at a tile corner needs 4). */
  maxTiles?: number;
  inflate?: Inflate;
}

const defaultFetch = async (url: string): Promise<ArrayBuffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
};

/** A TileSource over the installed tiles, with a small LRU per layer and cached analogues.bin. */
export function createTileSource({ index, fetchBytes = defaultFetch, maxTiles = 4, inflate }: TileSourceOptions): TileSource & { cached(layer: LayerId): string[] } {
  const caches: Record<LayerId, Map<string, Promise<Raster>>> = { climate: new Map(), soil: new Map(), regions: new Map() };
  const rawCaches = new Map<AnyLayerId, Map<string, Promise<Uint8Array>>>();
  let analoguesPromise: Promise<Uint8Array> | null = null;

  const rawCacheFor = (layer: AnyLayerId): Map<string, Promise<Uint8Array>> => {
    let c = rawCaches.get(layer);
    if (!c) { c = new Map(); rawCaches.set(layer, c); }
    return c;
  };

  const lruGet = <T>(cache: Map<string, Promise<T>>, name: string, load: () => Promise<T>): Promise<T> => {
    const hit = cache.get(name);
    if (hit) {
      cache.delete(name);
      cache.set(name, hit);
      return hit;
    }
    const p = load();
    cache.set(name, p);
    p.catch(() => { if (cache.get(name) === p) cache.delete(name); });
    while (cache.size > maxTiles) cache.delete(cache.keys().next().value as string);
    return p;
  };

  return {
    has: (layer, name) => index.tiles[layer]?.has(name) ?? false,
    cached: (layer) => [...caches[layer].keys()],
    hasAnalogues: () => Boolean(index.analogues),
    get(layer, name) {
      if (!index.tiles[layer].has(name)) return Promise.reject(new ClimateTileError(layer, name, 'not in the climate index'));
      const spec = LAYERS[layer];
      const url = `${index.base}${spec.dir}/${name}.tif`;
      return lruGet(caches[layer], name, async () => {
        let raster: Raster;
        try {
          raster = await decodeRaster(await fetchBytes(url), { side: spec.tileCells, cellDeg: spec.cellDeg, bands: spec.bands }, inflate);
        } catch (err) {
          throw new ClimateTileError(layer, name, err);
        }
        if (tileNameOf(raster.north - spec.cellDeg / 2, raster.west + spec.cellDeg / 2) !== name) throw new ClimateTileError(layer, name, `the file holds the tile at ${raster.north} N, ${raster.west} E`);
        return raster;
      });
    },
    getRaw(layer, name) {
      if (!index.tiles[layer]?.has(name)) return Promise.reject(new ClimateTileError(layer, name, 'not in the climate index'));
      const url = `${index.base}${ALL_LAYERS[layer].dir}/${name}.tif`;
      return lruGet(rawCacheFor(layer), name, () =>
        fetchBytes(url)
          .then((buf) => new Uint8Array(buf))
          .catch((err) => { throw new ClimateTileError(layer, name, err); }),
      );
    },
    getAnalogues() {
      if (!index.analogues) return Promise.reject(new Error('analogues.bin is not in the climate index'));
      if (analoguesPromise) return analoguesPromise;
      const url = `${index.base}analogues.bin`;
      analoguesPromise = fetchBytes(url).then((buf) => new Uint8Array(buf));
      analoguesPromise.catch(() => { analoguesPromise = null; });
      return analoguesPromise;
    },
  };
}

/** Tier 1 eager v0.7.0 layers fetched alongside core climate/soil/regions. */
export interface SiteTier1 {
  extremes: ExtremesLookup | null;
  frostCalendar: FrostCalendarLookup | null;
  terrain: TerrainLookup | null;
}

/** Tier 2A idle/lazy v0.7.0 layers prefetched after site pick. */
export interface SiteTier2A {
  extremesTail: ExtremesTailLookup | null;
  phenology: PhenologyLookup | null;
  waterBalance: WaterBalanceLookup | null;
  soilPlus: SoilPlusLookup | null;
}

/** Tier 2B on-demand monthly climatology layers. */
export interface SiteMonthly {
  monthly: MonthlyLookup | null;
  monthlyPrecip: MonthlyPrecipLookup | null;
}

/** A site lookup: each layer null when nothing is near (sea), with what was read. */
export interface SiteLookup {
  lat: number;
  lon: number;
  /** The point's tile name. */
  tile: string;
  /** null: no complete climate cell within 2 cells (sea, or the point's tile is not in the index). */
  climate: ClimateAt | null;
  /** null: no soil value within 2 layer cells (sea, ice, built-up gap wider than the fill), or soil not read ({ soil: false }). */
  soil: SoilAt | null;
  /** Always an object; its codes are null offshore. */
  regions: RegionsAt;
  /** Tiles read for this lookup, per core layer (the point's tile first). */
  tilesRead: Record<LayerId, string[]>;
  /** A layer's answer came from a neighbouring tile's cell. */
  crossTile: boolean;
  /** Tier 1 v0.7.0 layers (extremes, frost_calendar, terrain) decoded by Rust WASM when available. */
  tier1?: SiteTier1 | null;
  /** Tier 2A v0.7.0 layers (extremes_tail, phenology, water_balance, soil_plus) once prefetched. */
  tier2A?: SiteTier2A | null;
  /** Tier 2B on-demand monthly climatology once loaded. */
  monthly?: SiteMonthly | null;
}

/** Search radius of the site layers (src/layer.rs LAYER_LOOKUP_RADIUS; `lookup --radius` leaves it). */
export const LAYER_RADIUS = 2;

const LAYER_IDS: LayerId[] = ['climate', 'soil', 'regions'];

async function readAtCell<T>(
  source: TileSource,
  layer: AnyLayerId,
  tile: string,
  cellLat: number,
  cellLon: number,
  decode: (bytes: Uint8Array, lat: number, lon: number) => Promise<T | null>,
): Promise<T | null> {
  if (!source.getRaw || !source.has(layer, tile)) return null;
  const bytes = await source.getRaw(layer, tile);
  return decode(bytes, cellLat, cellLon);
}

/**
 * Looks a point up:
 * - Core layers (`tiles`, `soil`, `regions`) with full cross-tile coastal fallback (`lookup_across`).
 * - Tier 1 v0.7.0 layers (`extremes`, `frost_calendar`, `terrain`) decoded via Rust WASM at the
 *   resolved climate cell `(cellLat, cellLon)` when `tier1 !== false` and `source.getRaw` is available.
 */
export async function lookupSite(
  lat: number,
  lon: number,
  source: TileSource,
  radius = DEFAULT_RADIUS,
  { soil: withSoil = true, tier1: withTier1 = true }: { soil?: boolean; tier1?: boolean } = {},
): Promise<SiteLookup> {
  if (!validCoordinate(lat, lon)) throw new RangeError(`invalid coordinate ${lat}, ${lon}`);
  const own = tileNameOf(lat, lon) as string;
  const loaded: Record<LayerId, Map<string, Raster>> = { climate: new Map(), soil: new Map(), regions: new Map() };
  const load = (layer: LayerId, names: string[]) =>
    Promise.all(names.filter((n) => !loaded[layer].has(n) && source.has(layer, n)).map(async (n) => { loaded[layer].set(n, await source.get(layer, n)); }));
  const layers = withSoil ? LAYER_IDS : LAYER_IDS.filter((l) => l !== 'soil');

  await Promise.all(layers.map((layer) => load(layer, [own])));
  await Promise.all(layers.map((layer) => {
    if (ownCellAnswers(layer, loaded[layer].get(own) ?? null, lat, lon)) return null;
    const g = layer === 'climate' ? CLIMATE_GRID : LAYER_GRID;
    return load(layer, searchTiles(g, cellOf(g, lat, lon)!, layer === 'climate' ? radius : LAYER_RADIUS));
  }));

  const getter = (layer: LayerId) => (name: string) => loaded[layer].get(name) ?? null;
  const climate = climateAt(getter('climate'), lat, lon, radius);
  const soil = withSoil ? soilAt(getter('soil'), lat, lon, LAYER_RADIUS) : null;
  const regions = regionsAt(getter('regions'), lat, lon, LAYER_RADIUS);
  const read = (layer: LayerId) => [...loaded[layer].keys()].sort((a, b) => (a === own ? -1 : b === own ? 1 : 0));

  let tier1: SiteTier1 | null | undefined;
  if (withTier1 && source.getRaw && climate) {
    const hasAny = source.has('extremes', climate.tile) || source.has('frost_calendar', climate.tile) || source.has('terrain', climate.tile);
    if (hasAny) {
      const [extremes, frostCalendar, terrain] = await Promise.all([
        readAtCell(source, 'extremes', climate.tile, climate.cellLat, climate.cellLon, wasmLookupExtremes),
        readAtCell(source, 'frost_calendar', climate.tile, climate.cellLat, climate.cellLon, wasmLookupFrostCalendar),
        readAtCell(source, 'terrain', climate.tile, climate.cellLat, climate.cellLon, wasmLookupTerrain),
      ]);
      tier1 = { extremes, frostCalendar, terrain };
    }
  }

  return {
    lat, lon, tile: own, climate, soil, regions,
    tilesRead: { climate: read('climate'), soil: read('soil'), regions: read('regions') },
    crossTile: (climate !== null && climate.tile !== own) || (soil !== null && soil.tile !== own),
    ...(tier1 !== undefined ? { tier1 } : {}),
  };
}

/**
 * Tier 2A (idle/lazy prefetch): fetches and decodes `extremes_tail`, `phenology`, `water_balance`,
 * and `soil_plus` via Rust WASM.
 */
export async function lookupSiteTier2A(site: SiteLookup, source: TileSource): Promise<SiteTier2A> {
  if (!source.getRaw) return { extremesTail: null, phenology: null, waterBalance: null, soilPlus: null };
  const c = site.climate;
  const soilTile = site.soil?.tile ?? site.tile;
  const soilLat = site.soil ? site.soil.cellLat : site.lat;
  const soilLon = site.soil ? site.soil.cellLon : site.lon;
  const [extremesTail, phenology, waterBalance, soilPlus] = await Promise.all([
    c ? readAtCell(source, 'extremes_tail', c.tile, c.cellLat, c.cellLon, wasmLookupExtremesTail) : Promise.resolve(null),
    c ? readAtCell(source, 'phenology', c.tile, c.cellLat, c.cellLon, wasmLookupPhenology) : Promise.resolve(null),
    c ? readAtCell(source, 'water_balance', c.tile, c.cellLat, c.cellLon, wasmLookupWaterBalance) : Promise.resolve(null),
    readAtCell(source, 'soil_plus', soilTile, soilLat, soilLon, wasmLookupSoilPlus),
  ]);
  return { extremesTail, phenology, waterBalance, soilPlus };
}

const PRECIP_GRID = ALL_LAYERS.monthly_precip;

async function readMonthlyPrecipAcross(source: TileSource, lat: number, lon: number, ownTile: string): Promise<MonthlyPrecipLookup | null> {
  if (!source.getRaw) return null;
  const ownRes = await readAtCell(source, 'monthly_precip', ownTile, lat, lon, wasmLookupMonthlyPrecip);
  if (ownRes && ownRes.distance_cells === 0) return ownRes;
  const ownCell = cellOf(PRECIP_GRID, lat, lon);
  if (!ownCell) return ownRes;
  const candidateTiles = searchTiles(PRECIP_GRID, ownCell, 1).filter((t) => t !== ownTile && source.has('monthly_precip', t));
  if (!candidateTiles.length) return ownRes;
  const rawByTile = new Map<string, Uint8Array>();
  await Promise.all(candidateTiles.map(async (t) => { rawByTile.set(t, await source.getRaw!('monthly_precip', t)); }));
  let best: MonthlyPrecipLookup | null = ownRes;
  let bestD2 = ownRes ? ownRes.distance_cells * ownRes.distance_cells : Number.POSITIVE_INFINITY;
  for (const { cell, d2 } of cellWindow(PRECIP_GRID, ownCell, 1)) {
    if (d2 >= bestD2) continue;
    const tName = tileName(tileOf(PRECIP_GRID, cell));
    if (tName === ownTile) continue;
    const raw = rawByTile.get(tName);
    if (!raw) continue;
    const hit = await wasmLookupMonthlyPrecip(raw, centerLat(PRECIP_GRID, cell), centerLon(PRECIP_GRID, cell));
    if (hit && hit.distance_cells === 0) {
      bestD2 = d2;
      best = { ...hit, lat, lon, distance_cells: Math.sqrt(d2) };
    }
  }
  return best;
}

/**
 * Tier 2B (on-demand + cached): fetches and decodes `monthly` and `monthly_precip` via Rust WASM,
 * including cross-tile coastal fallback for `monthly_precip` (0.25° grid, radius 1).
 */
export async function lookupSiteMonthly(site: SiteLookup, source: TileSource): Promise<SiteMonthly> {
  if (!source.getRaw) return { monthly: null, monthlyPrecip: null };
  const c = site.climate;
  const [monthly, monthlyPrecip] = await Promise.all([
    c ? readAtCell(source, 'monthly', c.tile, c.cellLat, c.cellLon, wasmLookupMonthly) : Promise.resolve(null),
    readMonthlyPrecipAcross(source, site.lat, site.lon, site.tile),
  ]);
  return { monthly, monthlyPrecip };
}

/**
 * Tier 2B (on-demand + cached): fetches `analogues.bin` once and searches for historical climate twins
 * via Rust WASM `findAnalogues()`.
 */
export async function lookupSiteAnalogues(
  source: TileSource,
  query: AnalogueQuery,
  options?: AnalogueSearchOptions,
): Promise<AnalogueResult | null> {
  if (!source.getAnalogues || !source.hasAnalogues?.()) return null;
  const bytes = await source.getAnalogues();
  return wasmFindAnalogues(bytes, query, options);
}
