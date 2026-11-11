// Decodes one canopi-climate tile file: a little-endian classic TIFF, int16, pixel-interleaved,
// Deflate (zlib) without predictor, one internal tile (112 × 112 climate, 208 × 208 site layers)
// holding the 100 × 100 or 200 × 200 cells, georeferenced by ModelPixelScale and ModelTiepoint
// (canopi-climate docs/decisions/0001-tile-format.md, src/tile.rs decode_raster). Anything else is
// refused: the reader never guesses at a layout.

/** A decoded tile: `side × side` cells × `bands` values, pixel-interleaved, without the padding. */
export interface Raster {
  /** Longitude of the west edge (degrees). */
  west: number;
  /** Latitude of the north edge (degrees). */
  north: number;
  side: number;
  bands: number;
  /** `data[(row * side + col) * bands + band]`. */
  data: Int16Array;
}

export interface RasterShape {
  /** Cells per side (100 climate, 200 site layers). */
  side: number;
  /** Cell size in degrees (0.1 climate, 0.05 site layers). */
  cellDeg: number;
  bands: number;
}

/** Inflates zlib-wrapped Deflate bytes, refusing more than `limit` bytes of output. */
export type Inflate = (bytes: Uint8Array, limit: number) => Promise<Uint8Array>;

export class TileFormatError extends Error {
  constructor(message: string) {
    super(`not a canopi-climate tile: ${message}`);
    this.name = 'TileFormatError';
  }
}

const fail = (message: string): never => {
  throw new TileFormatError(message);
};

/** zlib Deflate through the platform's DecompressionStream, read with a running byte cap. */
export const inflateDeflate: Inflate = async (bytes, limit) => {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const out = new Uint8Array(limit);
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > limit) {
      await reader.cancel().catch(() => {});
      fail(`the tile inflates to more than ${limit} bytes`);
    }
    out.set(value, size);
    size += value.byteLength;
  }
  return size === limit ? out : out.subarray(0, size);
};

// TIFF field types → bytes per value (classic TIFF; LONG8 for completeness).
const TYPE_BYTES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 12: 8, 16: 8 };

interface Field {
  type: number;
  count: number;
  /** Byte offset of the values in the file. */
  at: number;
}

function fields(view: DataView): Map<number, Field> {
  if (view.byteLength < 8) fail('shorter than a TIFF header');
  if (view.getUint16(0, true) !== 0x4949) fail('not little-endian TIFF');
  if (view.getUint16(2, true) !== 42) fail('not a classic TIFF (BigTIFF is not read)');
  const ifd = view.getUint32(4, true);
  if (ifd + 2 > view.byteLength) fail('the IFD lies past the end of the file');
  const n = view.getUint16(ifd, true);
  if (ifd + 2 + 12 * n + 4 > view.byteLength) fail('the IFD runs past the end of the file');
  const out = new Map<number, Field>();
  for (let i = 0; i < n; i++) {
    const entry = ifd + 2 + 12 * i;
    const type = view.getUint16(entry + 2, true);
    const count = view.getUint32(entry + 4, true);
    const size = (TYPE_BYTES[type] ?? 1) * count;
    const at = size <= 4 ? entry + 8 : view.getUint32(entry + 8, true);
    if (at + size > view.byteLength) fail(`tag ${view.getUint16(entry, true)} lies past the end of the file`);
    out.set(view.getUint16(entry, true), { type, count, at });
  }
  if (view.getUint32(ifd + 2 + 12 * n, true) !== 0) fail('more than one image (overviews are not read)');
  return out;
}

function numbers(view: DataView, f: Field): number[] {
  const out: number[] = [];
  for (let i = 0; i < f.count; i++) {
    switch (f.type) {
      case 3: out.push(view.getUint16(f.at + 2 * i, true)); break;
      case 4: out.push(view.getUint32(f.at + 4 * i, true)); break;
      case 12: out.push(view.getFloat64(f.at + 8 * i, true)); break;
      default: fail(`unexpected field type ${f.type}`);
    }
  }
  return out;
}

const TAG = {
  width: 256, height: 257, bitsPerSample: 258, compression: 259, samplesPerPixel: 277, planar: 284,
  predictor: 317, tileWidth: 322, tileLength: 323, tileOffsets: 324, tileByteCounts: 325, sampleFormat: 339,
  pixelScale: 33550, tiepoint: 33922,
} as const;

/** Decodes a whole tile file (the bytes as fetched) into its cells; throws TileFormatError. */
export async function decodeRaster(file: ArrayBuffer | Uint8Array, shape: RasterShape, inflate: Inflate = inflateDeflate): Promise<Raster> {
  const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tags = fields(view);
  const get = (tag: number): number[] => {
    const f = tags.get(tag);
    return f ? numbers(view, f) : fail(`tag ${tag} is missing`);
  };
  const one = (tag: number, fallback?: number): number => (tags.has(tag) ? get(tag)[0] : fallback ?? fail(`tag ${tag} is missing`));
  const { side, cellDeg, bands } = shape;
  if (one(TAG.width) !== side || one(TAG.height) !== side) fail(`${one(TAG.width)} × ${one(TAG.height)} cells, expected ${side} × ${side}`);
  if (one(TAG.samplesPerPixel) !== bands) fail(`${one(TAG.samplesPerPixel)} bands, expected ${bands}`);
  if (get(TAG.bitsPerSample).some((b) => b !== 16)) fail('samples are not 16-bit');
  if (one(TAG.sampleFormat, 1) !== 2) fail('samples are not signed integers');
  if (one(TAG.compression) !== 8 && one(TAG.compression) !== 32946) fail(`compression ${one(TAG.compression)}, expected Deflate`);
  if (one(TAG.predictor, 1) !== 1) fail('a predictor is set');
  if (one(TAG.planar, 1) !== 1) fail('not pixel-interleaved');
  const [tw, tl] = [one(TAG.tileWidth), one(TAG.tileLength)];
  const offsets = get(TAG.tileOffsets), counts = get(TAG.tileByteCounts);
  if (tw < side || tl < side || offsets.length !== 1 || counts.length !== 1) fail('not one internal tile covering the image');
  const [offset, count] = [offsets[0], counts[0]];
  if (offset + count > bytes.byteLength) fail('the tile data lies past the end of the file');

  // Position: the raster origin (pixel corner) is a tile corner, the cell size the grid's.
  const scale = get(TAG.pixelScale), tie = get(TAG.tiepoint);
  if (scale.length < 2 || Math.abs(scale[0] - cellDeg) > 1e-9 || Math.abs(scale[1] - cellDeg) > 1e-9) fail(`pixel size ${scale.slice(0, 2).join(' × ')}, expected ${cellDeg}`);
  if (tie.length < 6) fail('short ModelTiepoint');
  const west = tie[3] - tie[0] * cellDeg, north = tie[4] + tie[1] * cellDeg;
  const rw = Math.round(west / 10) * 10, rn = Math.round(north / 10) * 10;
  if (Math.abs(west - rw) > 1e-6 || Math.abs(north - rn) > 1e-6 || rw < -180 || rw > 170 || rn < -80 || rn > 90) fail(`origin ${west}, ${north} is not a tile corner`);

  const expected = tw * tl * bands * 2;
  const raw = await inflate(bytes.subarray(offset, offset + count), expected);
  if (raw.byteLength !== expected) fail(`the tile inflates to ${raw.byteLength} bytes, expected ${expected}`);
  const pix = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const data = new Int16Array(side * side * bands);
  for (let row = 0; row < side; row++) {
    for (let col = 0; col < side; col++) {
      const from = (row * tw + col) * bands, to = (row * side + col) * bands;
      for (let b = 0; b < bands; b++) data[to + b] = pix.getInt16((from + b) * 2, true);
    }
  }
  return { west: rw, north: rn, side, bands, data };
}
