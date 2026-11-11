// The canopi-climate tiles for every Astro build (owner decision 2026-11-11; coordinator, same day):
// the build command Cloudflare Workers Builds runs cannot be confirmed, so the install hangs on Astro
// itself and plain `astro build` installs the pinned, verified grid as well as `npm run build`.
// - build: ensureClimate (scripts/install-climate.mjs) before anything is read; any failure (no
//   network and no CANOPI_CLIMATE_ARCHIVE or cache, a size or sha256 mismatch, a refused grid) fails
//   the build, so nothing deploys without the tiles.
// - dev: the same install if the tiles are missing (nothing when installed), from CANOPI_CLIMATE_ARCHIVE
//   or the cache only, never a download; a failure only warns, and the dev server runs without tiles
//   (the location lookup's tile requests fail).
// - sync, preview (and `astro check`): nothing.
import { ensureClimate } from './install-climate.mjs';

/** @param {{ ensure?: typeof ensureClimate }} [options] @returns {import('astro').AstroIntegration} */
export function climateTiles({ ensure = ensureClimate } = {}) {
  return {
    name: 'canopi:climate-tiles',
    hooks: {
      'astro:config:setup': async ({ command, logger }) => {
        if (command !== 'build' && command !== 'dev') return;
        const log = (/** @type {string} */ m) => (m.startsWith('warning:') ? logger.warn(m.slice(9)) : logger.info(m));
        if (command === 'build') {
          await ensure({ log });
          return;
        }
        try {
          await ensure({ log, allowDownload: false });
        } catch (err) {
          logger.warn(`${/** @type {Error} */ (err).message} The dev server runs without climate tiles: set CANOPI_CLIMATE_ARCHIVE to the grid tar, or run \`npm run build\` once (it downloads into the cache).`);
        }
      },
    },
  };
}
