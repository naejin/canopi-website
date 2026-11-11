// built-modules.mjs (P5 commit 0): the chunks the build gives a role (chunkRoles, written by the
// canopi:consortium-chunk-roles plugin in astro.config.mjs from Rollup's own bundle, so no chunk is
// found by its file name), and the chunks that load only when the reader asks for them (onDemandChunks):
// the P5 feature chunks (P5_FEATURE_ENTRIES: location view, mark providers, future panel, pool, likely
// and native content; ≤ 30 KB together, the location chunk alone ≤ 20 KB) and MapLibre with its worker
// and CSS (≤ 330 KB), none modulepreloaded nor counted in the island's 60 KB (decision row "Island
// JavaScript budget for P5", amended; check-built-site.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkRoles, onDemandChunks, P5_FEATURE_ENTRIES } from './built-modules.mjs';

const graphOf = (edges) => new Map(Object.entries(edges).map(([p, imports]) => [p, { code: '', imports }]));
const noFeatures = { location: [], markProviders: [], future: [], pool: [], likely: [], native: [] };
const none = { features: noFeatures, maplibre: [], maplibreCss: [] };
const roles = (features, maplibre = []) => ({ ...none, features: { ...noFeatures, ...features }, maplibre });

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
  bundle['_astro/f.h.js'] = chunk('_astro/f.h.js', `${root}/src/islands/consortium/views/future/future.tsx`, [`${root}/src/islands/consortium/views/future/future.tsx`]);
  assert.deepEqual(chunkRoles(bundle), {
    features: { ...noFeatures, location: ['/_astro/where.b.js'], markProviders: ['/_astro/mark-providers.f.js'], future: ['/_astro/f.h.js'] },
    maplibre: ['/_astro/index.e.js', '/_astro/maplibre-gl-worker.d.js'],
    maplibreCss: ['/_astro/where.c.css'],
  });
  assert.deepEqual(Object.keys(P5_FEATURE_ENTRIES), Object.keys(noFeatures), 'the feature entries, listed once');
  assert.deepEqual(chunkRoles({ '_astro/main.a.js': bundle['_astro/main.a.js'] }), none, 'no location, MapLibre or providers chunk: no roles');
  assert.deepEqual(chunkRoles({ 'a.js': chunk('a.js', '/x.ts', ['/x.ts'], [], 'new Worker("/_astro/other.g.js")'), '_astro/other.g.js': bundle['_astro/other.g.js'] }), none, 'a worker no location or MapLibre chunk names is not MapLibre\'s');
});

test('onDemandChunks: no roles, nothing is on demand', () => {
  const g = graphOf({ '/_astro/page.a.js': ['/_astro/main.b.js'], '/_astro/main.b.js': ['/_astro/preact.c.js'], '/_astro/preact.c.js': [] });
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js'], none), { features: [], location: [], maplibre: [] });
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
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js'], roles({ location: ['/_astro/where.d.js'] }, ['/_astro/index.f.js', '/_astro/worker.h.js'])), {
    features: ['/_astro/geocode.e.js', '/_astro/where.d.js'],
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
  assert.deepEqual(onDemandChunks(g, ['/_astro/main.b.js'], roles({ location: ['/_astro/where.d.js'] })), { features: ['/_astro/where.d.js'], location: ['/_astro/where.d.js'], maplibre: [] });
});

test('onDemandChunks: every feature chunk and what only features reach are features; the location chunk alone excludes what another feature shares', () => {
  const g = graphOf({
    '/_astro/main.b.js': ['/_astro/later.c.js', '/_astro/marks.d.js', '/_astro/where.e.js'],
    '/_astro/later.c.js': ['/_astro/future.f.js'],
    '/_astro/future.f.js': ['/_astro/geo.g.js'],
    '/_astro/marks.d.js': [],
    '/_astro/where.e.js': ['/_astro/geo.g.js', '/_astro/search.h.js'],
    '/_astro/geo.g.js': [],
    '/_astro/search.h.js': [],
  });
  assert.deepEqual(onDemandChunks(g, ['/_astro/main.b.js'], roles({ location: ['/_astro/where.e.js'], markProviders: ['/_astro/marks.d.js'], future: ['/_astro/future.f.js'] })), {
    features: ['/_astro/future.f.js', '/_astro/geo.g.js', '/_astro/marks.d.js', '/_astro/search.h.js', '/_astro/where.e.js'],
    location: ['/_astro/search.h.js', '/_astro/where.e.js'],
    maplibre: [],
  });
});
