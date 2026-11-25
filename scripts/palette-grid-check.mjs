// One canopi-climate grid for the plant ranges and the site lookup (P5 commit 0). The consortium index
// (src/data/palette-index.json, written by install-consortium.mjs) names the grid its ranges were
// sampled from; the climate index (src/data/climate-index.json, written by install-climate.mjs) names
// the grid of the tiles the reader samples and records its own comparison as consortium_grid_check.
// The built site is refused unless both name one grid and that check says "matched": a site looked up
// on one grid must never be compared with ranges sampled from another. An empty sha is missing.
import { COMPATIBLE_TILES_MANIFESTS } from '../src/lib/climate/model.js';

const HEX64 = /^[0-9a-f]{64}$/;

/** The first problem, or null when the grids match. */
export function consortiumGridProblem(consortiumIndex, climateIndex) {
  const release = consortiumIndex?.release_id ?? 'unknown release';
  const want = consortiumIndex?.climate_grid_manifest_sha256;
  if (typeof want !== 'string' || !HEX64.test(want)) return `the consortium index (${release}) has no climate_grid_manifest_sha256 (${JSON.stringify(want)}): reinstall the export (scripts/install-consortium.mjs).`;
  const have = climateIndex?.release?.grid_manifest_sha256;
  const tilesSha = climateIndex?.release?.climate_tiles_sha256;
  const compatMatch = typeof tilesSha === 'string' && (tilesSha === want || (COMPATIBLE_TILES_MANIFESTS[tilesSha]?.includes(want) ?? false));
  if (have !== want && !compatMatch) return `the consortium export ${release} was sampled from the grid ${want.slice(0, 12)}…, the installed climate tiles are ${String(have).slice(0, 12)}…: install the matching grid or the matching consortium export.`;
  const status = climateIndex?.consortium_grid_check?.status;
  if (status !== 'matched') return `the climate index consortium_grid_check status is ${JSON.stringify(status)}, not "matched": rebuild so install-climate.mjs compares the grid with the installed consortium index.`;
  return null;
}
