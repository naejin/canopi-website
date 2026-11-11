// The global grids (canopi-climate src/grid.rs and src/layer.rs, manifest.json grid.cell_edges):
// 0.1-degree climate cells and 0.05-degree site-layer cells in the same 10-degree tiles.
// - Cell (col, row): col 0 starts at 180 W, row 0 at 90 N. A cell covers longitudes [west, west + d)
//   and latitudes (north - d, north]: west and north edges inclusive; latitude -90 belongs to the last
//   row; longitude 180 wraps to -180 (the antimeridian).
// - A tile is named after its north-west corner: n50e000 covers 40–50 N, 0–10 E.

export interface GridSpec {
  /** Cell size in degrees. */
  cellDeg: number;
  /** Cells per tile side. */
  tileCells: number;
}

export interface Cell {
  col: number;
  row: number;
}

export const TILE_DEG = 10;
export const TILES_X = 36;
export const TILES_Y = 18;

/** Absorbs binary rounding of decimal inputs (48.9 × 10 = 488.99999…). */
const EPS = 1e-9;

const width = (g: GridSpec) => TILES_X * g.tileCells;
const height = (g: GridSpec) => TILES_Y * g.tileCells;

/** floor(x) clamped to 0..n-1, tolerant of decimal rounding (src/grid.rs grid_index). */
function gridIndex(x: number, n: number): number {
  const i = Math.floor(x + EPS);
  return i <= 0 ? 0 : Math.min(i, n - 1);
}

/** Rust's f64::rem_euclid. */
function remEuclid(x: number, m: number): number {
  const r = x % m;
  return r < 0 ? r + m : r;
}

/** Whether a coordinate can be looked up: finite, latitude within [-90, 90]. */
export const validCoordinate = (lat: number, lon: number): boolean =>
  Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90;

/** The cell holding a point, or null for an invalid coordinate. Longitudes wrap. */
export function cellOf(g: GridSpec, lat: number, lon: number): Cell | null {
  if (!validCoordinate(lat, lon)) return null;
  return {
    col: gridIndex(remEuclid(lon + 180, 360) / g.cellDeg, width(g)),
    row: gridIndex((90 - lat) / g.cellDeg, height(g)),
  };
}

export const centerLat = (g: GridSpec, c: Cell): number => 90 - (c.row + 0.5) * g.cellDeg;
export const centerLon = (g: GridSpec, c: Cell): number => -180 + (c.col + 0.5) * g.cellDeg;

/** Tile (col, row) of a cell. */
export const tileOf = (g: GridSpec, c: Cell): Cell => ({ col: Math.floor(c.col / g.tileCells), row: Math.floor(c.row / g.tileCells) });

/** Row-major index of a cell inside its tile. */
export const indexInTile = (g: GridSpec, c: Cell): number => (c.row % g.tileCells) * g.tileCells + (c.col % g.tileCells);

/** Tile name, e.g. n50e000, s10w080. */
export function tileName(t: Cell): string {
  const north = 90 - TILE_DEG * t.row, west = -180 + TILE_DEG * t.col;
  return `${north >= 0 ? 'n' : 's'}${String(Math.abs(north)).padStart(2, '0')}${west >= 0 ? 'e' : 'w'}${String(Math.abs(west)).padStart(3, '0')}`;
}

/** Tile (col, row) of a name, or null. */
export function parseTileName(name: string): Cell | null {
  const m = /^([ns])(\d\d)([ew])(\d\d\d)$/.exec(name);
  if (!m) return null;
  const north = (m[1] === 'n' ? 1 : -1) * Number(m[2]);
  const west = (m[3] === 'e' ? 1 : -1) * Number(m[4]);
  if (north % 10 || west % 10 || north < -80 || north > 90 || west < -180 || west > 170) return null;
  return { col: (west + 180) / 10, row: (90 - north) / 10 };
}

/** The tile name holding a point (the same for every layer), or null. */
export function tileNameOf(lat: number, lon: number): string | null {
  const g = { cellDeg: 0.1, tileCells: 100 };
  const c = cellOf(g, lat, lon);
  return c ? tileName(tileOf(g, c)) : null;
}

/** Whether a cell lies within `radius` cells of its tile's edge (a search may leave the tile). */
export function nearTileEdge(g: GridSpec, c: Cell, radius: number): boolean {
  const x = c.col % g.tileCells, y = c.row % g.tileCells;
  return x < radius || y < radius || x >= g.tileCells - radius || y >= g.tileCells - radius;
}

/**
 * Cells within `radius` of a cell, in search order (north to south, then west to east), with their
 * squared distance in cells. Longitude wraps at the antimeridian; latitude stops at the poles.
 */
export function window(g: GridSpec, c: Cell, radius: number): Array<{ cell: Cell; d2: number }> {
  const r = Math.min(radius, g.tileCells), out: Array<{ cell: Cell; d2: number }> = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy, row = c.row + dy;
      if (d2 > r * r || row < 0 || row >= height(g)) continue;
      out.push({ cell: { col: remEuclid(c.col + dx, width(g)), row }, d2 });
    }
  }
  return out;
}

/** Names of the tiles a search of `radius` cells around a cell reaches, north then west first. */
export function searchTiles(g: GridSpec, c: Cell, radius: number): string[] {
  const seen = new Map<string, Cell>();
  for (const { cell } of window(g, c, radius)) {
    const t = tileOf(g, cell);
    seen.set(tileName(t), t);
  }
  return [...seen.entries()].sort(([, a], [, b]) => a.row - b.row || a.col - b.col).map(([n]) => n);
}

/** Round to 6 decimals (cell centres, as the crate prints them). */
export const round6 = (x: number): number => roundHalfAway(x * 1e6) / 1e6;

/** Rust's f64::round: half away from zero. */
export const roundHalfAway = (x: number): number => (x < 0 ? -Math.round(-x) : Math.round(x));
