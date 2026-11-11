// built-modules.mjs (P5 commit 0): the chunks the build gives a role (chunkRoles, written by the
// canopi:consortium-chunk-roles plugin in astro.config.mjs from Rollup's own bundle, so no chunk is
// found by its file name), and the chunks that load only when the reader asks for them (onDemandChunks):
// the location chunk (S5b, views/location/location.tsx) and MapLibre with its worker and CSS, neither
// modulepreloaded nor counted in the island's 60 KB, with budgets of their own; the mark providers
// (core mark-providers.ts) lazy, in the island's total but not its first run (check-built-site.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkRoles, onDemandChunks } from './built-modules.mjs';

const graphOf = (edges) => new Map(Object.entries(edges).map(([p, imports]) => [p, { code: '', imports }]));
const none = { location: [], maplibre: [], maplibreCss: [], markProviders: [] };

test('chunkRoles: the location entry and the mark providers by their entry module, MapLibre by its modules, its worker and the CSS they import', () => {
  const root = '/w/p5';
  const chunk = (fileName, facadeModuleId, moduleIds, css = [], code = '') => ({ type: 'chunk', fileName, facadeModuleId, moduleIds, code, viteMetadata: { importedCss: new Set(css), importedAssets: new Set() } });
  const bundle = {
    '_astro/main.a.js': chunk('_astro/main.a.js', `${root}/src/islands/consortium/main.ts`, [`${root}/src/islands/consortium/main.ts`, `${root}/src/lib/consortium/marks.ts`]),
    '_astro/where.b.js': chunk('_astro/where.b.js', `${root}/src/islands/consortium/views/location/location.tsx`, [`${root}/src/islands/consortium/views/location/location.tsx`], ['_astro/where.c.css'], 'new Worker("/_astro/maplibre-gl-worker.d.js")'),
    '_astro/index.e.js': chunk('_astro/index.e.js', null, [`${root}/node_modules/maplibre-gl/dist/maplibre-gl.mjs`]),
    '_astro/mark-providers.f.js': chunk('_astro/mark-providers.f.js', `${root}/src/lib/consortium/mark-providers.ts`, [`${root}/src/lib/consortium/mark-providers.ts`, `${root}/src/lib/consortium/range-marks.ts`]),
    '_astro/maplibre-gl-worker.d.js': { type: 'asset', fileName: '_astro/maplibre-gl-worker.d.js', names: [], originalFileNames: [], source: 'self.onmessage' },
    '_astro/other.g.js': { type: 'asset', fileName: '_astro/other.g.js', names: [], originalFileNames: [], source: '' },
    '_astro/where.c.css': { type: 'asset', fileName: '_astro/where.c.css', names: ['location.css'], originalFileNames: [], source: '.maplibregl-map{}' },
  };
  assert.deepEqual(chunkRoles(bundle), {
    location: ['/_astro/where.b.js'],
    maplibre: ['/_astro/index.e.js', '/_astro/maplibre-gl-worker.d.js'],
    maplibreCss: ['/_astro/where.c.css'],
    markProviders: ['/_astro/mark-providers.f.js'],
  });
  assert.deepEqual(chunkRoles({ '_astro/main.a.js': bundle['_astro/main.a.js'] }), none, 'no location, MapLibre or providers chunk: no roles');
  assert.deepEqual(chunkRoles({ 'a.js': chunk('a.js', '/x.ts', ['/x.ts'], [], 'new Worker("/_astro/other.g.js")'), '_astro/other.g.js': bundle['_astro/other.g.js'] }), none, 'a worker no location or MapLibre chunk names is not MapLibre\'s');
});

test('onDemandChunks: no roles, nothing is on demand', () => {
  const g = graphOf({ '/_astro/page.a.js': ['/_astro/main.b.js'], '/_astro/main.b.js': ['/_astro/preact.c.js'], '/_astro/preact.c.js': [] });
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js'], none), { location: [], maplibre: [] });
});

test('onDemandChunks: the location chunk, its own dependencies and MapLibre (its worker too) are on demand; shared chunks are not', () => {
  const g = graphOf({
    '/_astro/page.a.js': ['/_astro/main.b.js'],
    '/_astro/main.b.js': ['/_astro/preact.c.js', '/_astro/where.d.js'],
    '/_astro/preact.c.js': [],
    '/_astro/where.d.js': ['/_astro/preact.c.js', '/_astro/geocode.e.js', '/_astro/index.f.js', '/_astro/worker.h.js'],
    '/_astro/geocode.e.js': [],
    '/_astro/index.f.js': ['/_astro/style.g.js'],
    '/_astro/style.g.js': [],
    '/_astro/worker.h.js': [],
  });
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js'], { ...none, location: ['/_astro/where.d.js'], maplibre: ['/_astro/index.f.js', '/_astro/worker.h.js'] }), {
    location: ['/_astro/geocode.e.js', '/_astro/where.d.js'],
    maplibre: ['/_astro/index.f.js', '/_astro/style.g.js', '/_astro/worker.h.js'],
  });
});

test('onDemandChunks: a chunk the island also imports statically is not on demand, even if the location chunk uses it', () => {
  const g = graphOf({
    '/_astro/main.b.js': ['/_astro/where.d.js', '/_astro/coords.h.js'],
    '/_astro/where.d.js': ['/_astro/coords.h.js'],
    '/_astro/coords.h.js': [],
  });
  assert.deepEqual(onDemandChunks(g, ['/_astro/main.b.js'], { ...none, location: ['/_astro/where.d.js'] }), { location: ['/_astro/where.d.js'], maplibre: [] });
});
