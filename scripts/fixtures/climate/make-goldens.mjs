// Regenerates goldens.json from `canopi-climate lookup` (run by hand; dev only):
//   node scripts/fixtures/climate/make-goldens.mjs [grid-dir] [cli]
// Each point's expected JSON is the CLI's output (climate, soil, regions), or "invalid" when the CLI
// refuses the coordinate. scripts/climate-reader.test.mjs compares the reader with every field.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const grid = process.argv[2] ?? '/media/daylon/main_hdd/canopi-cache/climate/out-v0.2';
const cli = process.argv[3] ?? '/home/daylon/projects/canopi-climate/target/release/canopi-climate';

export const POINTS = [
  // Cities of the P5 design check's measured pools, and more continents.
  ['Lyon', 45.76, 4.84], ['Seville', 37.39, -5.98], ['Manaus', -3.12, -60.02], ['Nairobi', -1.29, 36.82],
  ['Oslo', 59.91, 10.75], ['Montreal', 45.5, -73.57], ['Dakar', 14.69, -17.44], ['Lima', -12.05, -77.04],
  ['Hanoi', 21.03, 105.85], ['Perth', -31.95, 115.86], ['Phoenix', 33.45, -112.07], ['Yakutsk', 62.03, 129.73],
  ['Paris', 48.8566, 2.3522], ['Sao Paulo', -23.55, -46.63], ['Cairo', 30.04, 31.24], ['Mumbai', 19.08, 72.88],
  ['Tokyo', 35.68, 139.69], ['Reykjavik', 64.15, -21.94], ['Cape Town', -33.92, 18.42], ['Ushuaia', -54.8, -68.3],
  ['Quito', -0.18, -78.47], ['Alice Springs', -23.7, 133.88], ['Marseille coast', 43.25, 5.35],
  // Antimeridian: Fiji both sides, Chukotka, Wrangel Island, longitude 180 itself.
  ['Suva, Fiji', -18.14, 178.44], ['Taveuni, Fiji (west of 180)', -16.85, -179.97], ['Fiji at 180', -16.75, 180],
  ['Anadyr, Chukotka', 64.73, 177.51], ['Uelen, Chukotka', 66.16, -169.81], ['Wrangel east of 180', 71.2, -179.95],
  ['Wrangel west of 180', 71.2, 179.95], ['Chukotka at -180', 65.5, -180],
  // Poles.
  ['South Pole, lon 180', -90, 180], ['South Pole, lon 0', -90, 0], ['North Pole', 90, 0], ['near the North Pole', 89.99, -179.99],
  // Tile edges and corners (north and west edges belong to the tile).
  ['corner 50 N 0 E', 50, 0], ['corner 10 N 10 E', 10, 10], ['corner 0 N 30 E', 0, 30], ['corner 50 N 20 E', 50, 20],
  ['corner 60 N 30 E', 60, 30], ['corner 40 N 0 E (sea)', 40, 0], ['edge 45 N 9.999 E', 45, 9.999], ['edge 45 N 10 E', 45, 10],
  ['corner 20 N -10 E', 20, -10],
  // Coastal cells whose nearest complete cell lies in the next tile (the crate's WASM lookup would say
  // nothing or something else).
  ['Cap Corse coast', 42.75, 9.95], ['Land\'s End coast', 49.95, -5.55], ['Normandy coast', 49.45, -0.05],
  ['Picardy coast', 50.05, 1.15], ['Balearic coast', 40.05, 3.15], ['Portugal coast (soil)', 40.025, -8.975],
  ['Cornwall coast (soil)', 49.975, -5.075],
  // Open sea, and coordinates the CLI refuses.
  ['mid-Atlantic', 30, -40], ['latitude 91', 91, 0], ['latitude -90.5', -90.5, 10],
];

if (process.argv[1] && process.argv[1].endsWith('make-goldens.mjs')) {
  const points = POINTS.map(([name, lat, lon]) => {
    const run = spawnSync(cli, ['lookup', String(lat), String(lon), '--grid', grid], { encoding: 'utf8' });
    if (run.status === 1) return { name, lat, lon, expect: 'invalid' };
    if (run.status !== 0 && run.status !== 2) throw new Error(`${name}: ${run.stderr}`);
    return { name, lat, lon, expect: JSON.parse(run.stdout) };
  });
  const version = spawnSync(cli, ['--version'], { encoding: 'utf8' }).stdout.trim();
  const manifest = createHash('sha256').update(readFileSync(join(grid, 'manifest.json'))).digest('hex');
  writeFileSync(new URL("./goldens.json", import.meta.url), `{"cli": ${JSON.stringify(version)}, "grid_manifest_sha256": "${manifest}", "points": [\n${points.map((p) => JSON.stringify(p)).join(",\n")}\n]}\n`);
  console.log(`${points.length} points from ${version}`);
}
