// built-modules.mjs onDemandChunks (P5 commit 0): the location chunk (S5b, views/location/location.tsx)
// and MapLibre load only when the reader asks for them, so they are neither modulepreloaded nor counted
// in the island's 60 KB; they have budgets of their own (scripts/check-built-site.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { onDemandChunks } from './built-modules.mjs';

const graphOf = (edges) => new Map(Object.entries(edges).map(([p, imports]) => [p, { code: '', imports }]));

test('no location chunk yet: nothing is on demand', () => {
  const g = graphOf({ '/_astro/page.a.js': ['/_astro/main.b.js'], '/_astro/main.b.js': ['/_astro/preact.c.js'], '/_astro/preact.c.js': [] });
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js']), { location: [], maplibre: [] });
});

test('the location chunk, its own dependencies and MapLibre are on demand; shared chunks are not', () => {
  const g = graphOf({
    '/_astro/page.a.js': ['/_astro/main.b.js'],
    '/_astro/main.b.js': ['/_astro/preact.c.js', '/_astro/location.d.js'],
    '/_astro/preact.c.js': [],
    '/_astro/location.d.js': ['/_astro/preact.c.js', '/_astro/geocode.e.js', '/_astro/maplibre-gl.f.js'],
    '/_astro/geocode.e.js': [],
    '/_astro/maplibre-gl.f.js': ['/_astro/style.g.js'],
    '/_astro/style.g.js': [],
  });
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js']), {
    location: ['/_astro/geocode.e.js', '/_astro/location.d.js'],
    maplibre: ['/_astro/maplibre-gl.f.js', '/_astro/style.g.js'],
  });
});

test('a chunk the island also imports statically is not on demand, even if the location chunk uses it', () => {
  const g = graphOf({
    '/_astro/main.b.js': ['/_astro/location.d.js', '/_astro/coords.h.js'],
    '/_astro/location.d.js': ['/_astro/coords.h.js'],
    '/_astro/coords.h.js': [],
  });
  assert.deepEqual(onDemandChunks(g, ['/_astro/main.b.js']), { location: ['/_astro/location.d.js'], maplibre: [] });
});
