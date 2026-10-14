// Copies MapLibre's own ES modules into public/vendor/ before each build. Served unbundled, the
// page and its worker share one maplibre-gl-shared.mjs; bundled, each would carry its own copy.
// The versioned folder lets browsers cache it until the dependency changes.
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'maplibre-gl');
const { version } = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
const vendor = join(root, 'public', 'vendor');
const target = join(vendor, `maplibre-gl-${version}`);

rmSync(vendor, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const file of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) {
  cpSync(join(source, 'dist', file), join(target, file));
}
cpSync(join(source, 'LICENSE.txt'), join(target, 'LICENSE.txt'));
console.log(`maplibre-gl ${version} copied to public/vendor/`);
