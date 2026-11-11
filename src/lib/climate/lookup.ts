// Ported from canopi-climate (https://github.com/opencanopi/canopi-climate, commit 0908add): the grid's
// rules re-written in TypeScript. Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero
// General Public License, version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// Point lookups on decoded tiles, with the semantics of `canopi-climate sample` / `lookup`
// (src/lookup.rs lookup_across, src/layer.rs nearest, src/soil.rs, src/regions.rs):
// - climate: the point's cell when complete (every variable of every slot; aridity may be missing),
//   else the nearest complete cell within `radius` cells (Euclidean), ties to the northern, then
//   western cell, searching across tile edges and the antimeridian, never across the poles;
// - soil: the nearest cell with pH, sand and clay within 2 layer cells, the same way;
// - regions: each code (WGSRPD level 3, ISO alpha-2) from the nearest cell having it.
// `get` gives a decoded tile by name, or null when the layer has no tile there (no data).

import { LAYERS, NODATA, SLOTS, VARIABLES } from './model.js';
import { cellOf, centerLat, centerLon, indexInTile, round6, roundHalfAway, tileName, tileOf, window, type Cell, type GridSpec } from './grid.ts';
import { koppenSymbol, temperatureMargin, type KoppenSymbol } from './koppen.ts';
import { SOIL_BAND, SOIL_DEPTH, textureClass, type TextureId } from './soil.ts';
import { decodeCode, REGION_BAND } from './regions.ts';
import type { Raster } from './tiff.ts';

export type LayerId = keyof typeof LAYERS;
export type TileGetter = (name: string) => Raster | null;

/** Default search radius in cells (climate and site layers). */
export const DEFAULT_RADIUS = 2;

export const CLIMATE_GRID: GridSpec = LAYERS.climate;
export const LAYER_GRID: GridSpec = LAYERS.soil;

/** Climate of one period/scenario slot at a cell (the CLI's `periods[]` entry). */
export interface PeriodClimate {
  /** `1991-2020`, `2041-2070` or `2071-2099`. */
  period: string;
  /** `historical`, `ssp126`, `ssp245`, `ssp370` or `ssp585`. */
  scenario: string;
  koppen: KoppenSymbol;
  koppenCode: number;
  /** °C by which the coldest/warmest monthly means lie outside the class's bounds (0: consistent). */
  koppenTemperatureMarginC: number;
  tminColdC: number;
  tmaxWarmC: number;
  tmeanColdC: number;
  tmeanWarmC: number;
  precipMm: number;
  /** null where potential evapotranspiration is near zero (ice sheets, high Arctic). */
  aridityIndex: number | null;
  dryMonths: number;
}

export interface ClimateAt {
  cellLat: number;
  cellLon: number;
  /** Distance from the point's cell to the cell used, in cells (0: the point's own cell). */
  distanceCells: number;
  /** Tile of the cell used (another tile than the point's after a cross-tile search). */
  tile: string;
  /** One entry per slot, slot 0 (1991–2020) first. */
  periods: PeriodClimate[];
}

export interface SoilAt {
  cellLat: number;
  cellLon: number;
  distanceCells: number;
  tile: string;
  depth: typeof SOIL_DEPTH;
  phH2o: number;
  sandPct: number;
  clayPct: number;
  siltPct: number;
  texture: TextureId | null;
  /** The cell had no SoilGrids value (built-up, water, ice) and took the nearest measured cell's. */
  filled: boolean;
  /** Distance (layer cells) to that measured cell; 0 when measured. */
  fillDistanceCells: number;
}

export interface RegionsAt {
  wgsrpdL3: string | null;
  isoA2: string | null;
  wgsrpdL3DistanceCells: number | null;
  isoA2DistanceCells: number | null;
  /** The point's tile. */
  tile: string;
}

interface Found {
  cell: Cell;
  raster: Raster;
  index: number;
  d2: number;
}

/** The nearest cell where `has` holds within `radius` cells, ties north then west (src/layer.rs nearest). */
export function nearest(g: GridSpec, get: TileGetter, lat: number, lon: number, radius: number, has: (r: Raster, index: number) => boolean): Found | null {
  const cell = cellOf(g, lat, lon);
  if (!cell) throw new RangeError(`invalid coordinate ${lat}, ${lon}`);
  let best: Found | null = null;
  for (const { cell: c, d2 } of window(g, cell, radius)) {
    if (best && best.d2 <= d2) continue;
    const raster = get(tileName(tileOf(g, c)));
    const index = indexInTile(g, c);
    if (raster && has(raster, index)) best = { cell: c, raster, index, d2 };
  }
  return best;
}

const ARIDITY = VARIABLES.findIndex((v) => v.id === 'aridity');
const S = SLOTS.length;

/** Whether a climate cell has every variable for every slot (aridity may be missing). */
export function isComplete(r: Raster, index: number): boolean {
  const base = index * r.bands;
  for (let b = 0; b < r.bands; b++) if (r.data[base + b] === NODATA && Math.floor(b / S) !== ARIDITY) return false;
  return true;
}

/** A stored value decoded (src/model.rs Variable::decode): decimal scales divide by their inverse. */
export function decodeValue(stored: number, scale: number, offset = 0): number | null {
  if (stored === NODATA) return null;
  const inverse = Math.round(1 / scale);
  return (Math.abs(inverse * scale - 1) < 1e-6 ? stored / inverse : stored * scale) + offset;
}

const round1 = (x: number) => roundHalfAway(x * 10) / 10;

function period(r: Raster, index: number, slot: number): PeriodClimate {
  const at = (v: number) => r.data[index * r.bands + v * S + slot];
  const value = (v: number) => decodeValue(at(v), VARIABLES[v].scale, VARIABLES[v].offset) ?? Number.NaN;
  const code = at(0) >= 0 && at(0) <= 255 ? at(0) : 0;
  const [tmeanCold, tmeanWarm] = [value(3), value(4)];
  return {
    period: SLOTS[slot].period,
    scenario: SLOTS[slot].scenario,
    koppen: koppenSymbol(code),
    koppenCode: code,
    koppenTemperatureMarginC: round1(temperatureMargin(code, tmeanCold, tmeanWarm)),
    tminColdC: value(1),
    tmaxWarmC: value(2),
    tmeanColdC: tmeanCold,
    tmeanWarmC: tmeanWarm,
    precipMm: value(5),
    aridityIndex: decodeValue(at(ARIDITY), VARIABLES[ARIDITY].scale, VARIABLES[ARIDITY].offset),
    dryMonths: Math.min(Math.max(Math.trunc(value(7)), 0), 12),
  };
}

const where = (g: GridSpec, f: Found) => ({
  cellLat: round6(centerLat(g, f.cell)),
  cellLon: round6(centerLon(g, f.cell)),
  distanceCells: Math.sqrt(f.d2),
  tile: tileName(tileOf(g, f.cell)),
});

/** Climate at a point (null: no complete cell within the radius, i.e. sea or land without data). */
export function climateAt(get: TileGetter, lat: number, lon: number, radius = DEFAULT_RADIUS): ClimateAt | null {
  const f = nearest(CLIMATE_GRID, get, lat, lon, radius, isComplete);
  if (!f) return null;
  return { ...where(CLIMATE_GRID, f), periods: SLOTS.map((_, s) => period(f.raster, f.index, s)) };
}

const hasSoil = (r: Raster, i: number) => r.data[i * r.bands + SOIL_BAND.ph] !== NODATA && r.data[i * r.bands + SOIL_BAND.sand] !== NODATA && r.data[i * r.bands + SOIL_BAND.clay] !== NODATA;

/** Soil at a point (null: nothing within the radius: sea, ice sheets, a gap wider than the fill). */
export function soilAt(get: TileGetter, lat: number, lon: number, radius = DEFAULT_RADIUS): SoilAt | null {
  const f = nearest(LAYER_GRID, get, lat, lon, radius, hasSoil);
  if (!f) return null;
  const at = (b: number) => f.raster.data[f.index * f.raster.bands + b];
  const [ph, sand, clay] = [at(SOIL_BAND.ph) / 10, at(SOIL_BAND.sand) / 10, at(SOIL_BAND.clay) / 10];
  const fill = Math.min(Math.max(at(SOIL_BAND.fill), 0), 255);
  return {
    ...where(LAYER_GRID, f),
    depth: SOIL_DEPTH,
    phH2o: ph,
    sandPct: sand,
    clayPct: clay,
    siltPct: roundHalfAway(Math.max(100 - sand - clay, 0) * 10) / 10,
    texture: textureClass(sand, clay),
    filled: fill > 0,
    fillDistanceCells: fill,
  };
}

const hasBand = (band: number) => (r: Raster, i: number) => r.data[i * r.bands + band] !== NODATA;

/** Regions at a point: each code from the nearest cell having it (null codes when none is near). */
export function regionsAt(get: TileGetter, lat: number, lon: number, radius = DEFAULT_RADIUS): RegionsAt {
  const own = cellOf(LAYER_GRID, lat, lon);
  if (!own) throw new RangeError(`invalid coordinate ${lat}, ${lon}`);
  const l3 = nearest(LAYER_GRID, get, lat, lon, radius, hasBand(REGION_BAND.wgsrpdL3));
  const a2 = nearest(LAYER_GRID, get, lat, lon, radius, hasBand(REGION_BAND.isoA2));
  const code = (f: Found | null, band: number, letters: 2 | 3) => (f ? decodeCode(f.raster.data[f.index * f.raster.bands + band], letters) : null);
  return {
    wgsrpdL3: code(l3, REGION_BAND.wgsrpdL3, 3),
    isoA2: code(a2, REGION_BAND.isoA2, 2),
    wgsrpdL3DistanceCells: l3 ? Math.sqrt(l3.d2) : null,
    isoA2DistanceCells: a2 ? Math.sqrt(a2.d2) : null,
    tile: tileName(tileOf(LAYER_GRID, own)),
  };
}

/** Whether the point's own cell already answers a layer (no neighbouring tile can change it). */
export function ownCellAnswers(layer: LayerId, raster: Raster | null, lat: number, lon: number): boolean {
  if (!raster) return false;
  const g = layer === 'climate' ? CLIMATE_GRID : LAYER_GRID;
  const cell = cellOf(g, lat, lon);
  if (!cell) return false;
  const i = indexInTile(g, cell);
  if (layer === 'climate') return isComplete(raster, i);
  if (layer === 'soil') return hasSoil(raster, i);
  return hasBand(REGION_BAND.wgsrpdL3)(raster, i) && hasBand(REGION_BAND.isoA2)(raster, i);
}
