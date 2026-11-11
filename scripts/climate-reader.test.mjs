// The canopi-climate v0.2 tile reader (src/lib/climate/, P5 stream S5b; design check
// .local/consortium/v2/p5-design-check.md section A).
//
// Probe (commit 1): one real tile decoded with the platform's DecompressionStream('deflate') and a
// DataView reading int16 little-endian, against `canopi-climate lookup` at one point. It reads the
// extracted grid when present and skips otherwise: `npm test` never needs the 98 MB grid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const GRID = process.env.CANOPI_CLIMATE_GRID ?? '/media/daylon/main_hdd/canopi-cache/climate/out-v0.2';
const hasGrid = existsSync(join(GRID, 'manifest.json'));
const noGrid = hasGrid ? false : `no extracted canopi-climate v0.2 grid at ${GRID} (set CANOPI_CLIMATE_GRID)`;

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

test('probe: n50e000 decodes with DecompressionStream and matches the CLI at Lyon', { skip: noGrid }, async () => {
  const file = readFileSync(join(GRID, 'tiles', 'n50e000.tif'));
  const t0 = performance.now();
  const v = new DataView(file.buffer, file.byteOffset, file.byteLength);
  assert.equal(v.getUint16(0, true), 0x4949, 'little-endian TIFF');
  assert.equal(v.getUint16(2, true), 42, 'classic TIFF');
  const ifd = v.getUint32(4, true);
  const tags = new Map();
  for (let i = 0, n = v.getUint16(ifd, true); i < n; i++) {
    const at = ifd + 2 + 12 * i;
    tags.set(v.getUint16(at, true), { type: v.getUint16(at + 2, true), count: v.getUint32(at + 4, true), at: at + 8 });
  }
  const one = (tag) => { const t = tags.get(tag); return t.type === 3 ? v.getUint16(t.at, true) : v.getUint32(t.at, true); };
  assert.equal(one(259), 8, 'Deflate');
  assert.equal(one(277), 72, '72 bands');
  const [tw, offset, count] = [one(322), one(324), one(325)];
  const raw = await inflate(file.subarray(offset, offset + count));
  const t1 = performance.now();
  assert.equal(raw.byteLength, tw * tw * 72 * 2);
  const pix = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  // Lyon 45.76 N 4.84 E: cell (48, 42) of n50e000 (north-west origin, 0.1 degree cells).
  const [x, y] = [Math.floor(4.84 / 0.1), Math.floor((50 - 45.76) / 0.1)];
  const at = (band) => pix.getInt16(((y * tw + x) * 72 + band) * 2, true);
  // CLI: `canopi-climate lookup 45.76 4.84` → Cfa (14), tmin_cold 0.1, tmax_warm 26.6, precip 809, aridity 1.1.
  assert.deepEqual([at(0), at(9) / 10, at(18) / 10, at(45), at(54) / 100], [14, 0.1, 26.6, 809, 1.1]);
  console.log(`probe: n50e000 ${file.byteLength} B → ${raw.byteLength} B inflated in ${(t1 - t0).toFixed(1)} ms (Node ${process.version})`);
});
