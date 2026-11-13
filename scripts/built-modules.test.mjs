// built-modules.mjs (P5 commit 0, E6 stream B4): the chunks the build gives a role (chunkRoles, written
// by the canopi:consortium-chunk-roles plugin in astro.config.mjs from Rollup's own bundle, so no chunk
// is found by its file name), the chunks that load only when the reader asks for them (onDemandChunks:
// every role of ROLE_ENTRIES, the P5 features and the E6 lazy parts, each costed on its first use, and
// MapLibre with its worker and CSS) and the page's modulepreload links (modulepreloadChunks: the
// first-run closure only, design check A5). Caps per chunk in check-built-site.mjs (A14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkRoles, importsOf, moduleGraph, modulepreloadChunks, onDemandChunks, readChunkRoles, ROLE_ENTRIES, staticClosure } from './built-modules.mjs';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const graphOf = (edges) => new Map(Object.entries(edges).map(([p, imports]) => [p, { code: '', imports }]));
const noFeatures = { location: [], markProviders: [], future: [], pool: [], likely: [], native: [], range: [], details: [], sheets: [], later: [], suggest: [] };
const none = { features: noFeatures, maplibre: [], maplibreCss: [], testHook: [] };
const sets = ({ parts, location, maplibre }) => ({ parts, location, maplibre });
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
    testHook: [],
  });
  assert.deepEqual(Object.keys(ROLE_ENTRIES), Object.keys(noFeatures), 'the role entries, listed once');
  assert.deepEqual(chunkRoles({ '_astro/main.a.js': bundle['_astro/main.a.js'] }), none, 'no location, MapLibre or providers chunk: no roles');
  assert.deepEqual(chunkRoles({ 'a.js': chunk('a.js', '/x.ts', ['/x.ts'], [], 'new Worker("/_astro/other.g.js")'), '_astro/other.g.js': bundle['_astro/other.g.js'] }), none, 'a worker no location or MapLibre chunk names is not MapLibre\'s');
});

test('chunkRoles: the lazy island parts by their entry module, in the one role list with the features (E6 B4)', () => {
  const root = '/w/e6';
  const chunk = (fileName, facadeModuleId, css = []) => ({ type: 'chunk', fileName, facadeModuleId, moduleIds: [facadeModuleId ?? '/x.ts'], code: '', viteMetadata: { importedCss: new Set(css), importedAssets: new Set() } });
  const bundle = Object.fromEntries([
    ['_astro/Add.a.js', `${root}/src/islands/consortium/views/Add.tsx`],
    ['_astro/Swap.b.js', `${root}/src/islands/consortium/views/Swap.tsx`],
    ['_astro/later.c.js', `${root}/src/islands/consortium/views/later.ts`, ['_astro/later.x.css']],
    ['_astro/Details.d.js', `${root}/src/islands/consortium/views/details/Details.tsx`],
    ['_astro/suggest.e.js', `${root}/src/lib/consortium/suggest.ts`],
    ['_astro/shared.g.js', null],
  ].map(([f, id, css]) => [f, chunk(f, id, css)]));
  const r = chunkRoles(bundle);
  assert.deepEqual(r.features, { ...noFeatures, details: ['/_astro/Details.d.js'], sheets: ['/_astro/Add.a.js', '/_astro/Swap.b.js'], later: ['/_astro/later.c.js'], suggest: ['/_astro/suggest.e.js'] });
  assert.equal(r.lazy, undefined, 'one role list: no separate lazy table');
  assert.deepEqual(chunkRoles({ ...bundle, '_astro/test-hook.t.js': chunk('_astro/test-hook.t.js', `${root}/src/islands/consortium/test-hook.ts`) }).testHook, ['/_astro/test-hook.t.js'], 'the browser-test hook by its module');
});

// K3 hand-off: once Correction imports the drafts that live in the plant dialog's chunk, Rollup drops
// that chunk's facade (facadeModuleId null; measured on the B4 build, 2026-11-13). The chunk still
// holds Details.tsx, so it keeps its role.
test('chunkRoles: a chunk holding a role\'s entry module reached only through import() keeps the role without being its facade; a facade-only chunk too; a module also imported statically gives no role', () => {
  const root = '/w/k3';
  const details = `${root}/src/islands/consortium/views/details/Details.tsx`;
  const bundle = {
    '_astro/Details.d.js': { type: 'chunk', fileName: '_astro/Details.d.js', facadeModuleId: null, isDynamicEntry: true, moduleIds: [`${root}/src/islands/consortium/views/layers.ts`, `${root}/src/islands/consortium/views/kit/correction.ts`, details], code: '', viteMetadata: { importedCss: new Set(), importedAssets: new Set() } },
    '_astro/Correction.c.js': { type: 'chunk', fileName: '_astro/Correction.c.js', facadeModuleId: `${root}/src/islands/consortium/views/Correction.tsx`, moduleIds: [`${root}/src/islands/consortium/views/Correction.tsx`], code: '', viteMetadata: { importedCss: new Set(), importedAssets: new Set() } },
    '_astro/main.m.js': { type: 'chunk', fileName: '_astro/main.m.js', facadeModuleId: `${root}/src/islands/consortium/main.ts`, isDynamicEntry: true, moduleIds: [`${root}/src/islands/consortium/main.ts`, `${root}/src/lib/consortium/suggest.ts`], code: '', viteMetadata: { importedCss: new Set(), importedAssets: new Set() } },
    '_astro/shared.n.js': { type: 'chunk', fileName: '_astro/shared.n.js', facadeModuleId: null, isDynamicEntry: false, moduleIds: [`${root}/src/islands/consortium/views/Swap.tsx`], code: '', viteMetadata: { importedCss: new Set(), importedAssets: new Set() } },
    '_astro/suggest.s.js': { type: 'chunk', fileName: '_astro/suggest.s.js', facadeModuleId: `${root}/src/lib/consortium/suggest.ts?x`, moduleIds: [], code: '', viteMetadata: { importedCss: new Set(), importedAssets: new Set() } },
  };
  // Rollup's module info: Details.tsx and Swap.tsx reached by import() only; suggest.ts imported statically too.
  const info = { [details]: { importers: [], dynamicImporters: ['/w/k3/src/islands/consortium/views/Sheets.tsx'] }, [`${root}/src/lib/consortium/suggest.ts`]: { importers: [`${root}/src/lib/consortium/index.ts`], dynamicImporters: ['/w/k3/x.ts'] }, [`${root}/src/islands/consortium/views/Swap.tsx`]: { importers: [`${root}/src/islands/consortium/views/x.ts`], dynamicImporters: [] } };
  assert.deepEqual(chunkRoles(bundle).features.details, [], 'without the module info, facades only');
  const r = chunkRoles(bundle, (id) => info[id] ?? null).features;
  assert.deepEqual(r.details, ['/_astro/Details.d.js']);
  assert.deepEqual(r.sheets, ['/_astro/Correction.c.js']);
  assert.deepEqual(r.suggest, ['/_astro/suggest.s.js'], 'a facade-only chunk (query stripped); not the island entry, where suggest.ts is imported statically');
  assert.ok(!r.sheets.includes('/_astro/shared.n.js'), 'a chunk holding a sheet module that is imported statically takes no role');
});

test('readChunkRoles: a missing roles file gives every role empty', () => {
  const root = mkdtempSync(join(tmpdir(), 'built-roles-'));
  try { assert.deepEqual(readChunkRoles(join(root, 'client')), none); } finally { rmSync(root, { recursive: true, force: true }); }
});

test('onDemandChunks: no roles, nothing is on demand', () => {
  const g = graphOf({ '/_astro/page.a.js': ['/_astro/main.b.js'], '/_astro/main.b.js': ['/_astro/preact.c.js'], '/_astro/preact.c.js': [] });
  assert.deepEqual(onDemandChunks(g, ['/_astro/page.a.js'], none), { parts: [], location: [], maplibre: [], costs: {} });
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
  assert.deepEqual(sets(onDemandChunks(g, ['/_astro/page.a.js'], roles({ location: ['/_astro/where.d.js'] }, ['/_astro/index.f.js', '/_astro/worker.h.js']))), {
    parts: ['/_astro/geocode.e.js', '/_astro/where.d.js'],
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
  assert.deepEqual(sets(onDemandChunks(g, ['/_astro/main.b.js'], roles({ location: ['/_astro/where.d.js'] }))), { parts: ['/_astro/where.d.js'], location: ['/_astro/where.d.js'], maplibre: [] });
});

test('onDemandChunks: every role chunk and what only role chunks reach are parts; the location chunk alone excludes what another feature shares', () => {
  const g = graphOf({
    '/_astro/main.b.js': ['/_astro/later.c.js', '/_astro/marks.d.js', '/_astro/where.e.js'],
    '/_astro/later.c.js': ['/_astro/future.f.js'],
    '/_astro/future.f.js': ['/_astro/geo.g.js'],
    '/_astro/marks.d.js': [],
    '/_astro/where.e.js': ['/_astro/geo.g.js', '/_astro/search.h.js'],
    '/_astro/geo.g.js': [],
    '/_astro/search.h.js': [],
  });
  assert.deepEqual(sets(onDemandChunks(g, ['/_astro/main.b.js'], roles({ location: ['/_astro/where.e.js'], markProviders: ['/_astro/marks.d.js'], future: ['/_astro/future.f.js'] }))), {
    parts: ['/_astro/future.f.js', '/_astro/geo.g.js', '/_astro/marks.d.js', '/_astro/search.h.js', '/_astro/where.e.js'],
    location: ['/_astro/search.h.js', '/_astro/where.e.js'],
    maplibre: [],
  });
});

// Vite's __vite__mapDeps lists what to preload with each dynamic import; it is not an import. A chunk
// named only there (a dependency of a feature chunk) loads with that feature, so it bills to the
// feature's cost, not the first run (S5d hand-off, 2026-11-11).
const MAIN = 'const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/feat.b.js","_astro/shared.c.js"])))=>i.map(i=>d[i]);\n'
  + 'import{h}from"./preact.d.js";const f=()=>ae(()=>import("./feat.b.js"),__vite__mapDeps([0,1]));';
test('importsOf: static and dynamic imports are edges, the __vite__mapDeps preload list is not', () => {
  assert.deepEqual(importsOf(MAIN, '/_astro/main.a.js').sort(), ['/_astro/feat.b.js', '/_astro/preact.d.js']);
  assert.deepEqual(importsOf('import"./shared.c.js";', '/_astro/feat.b.js'), ['/_astro/shared.c.js']);
});

test('a chunk shared only by a feature chunk through mapDeps bills to that feature, not the island', () => {
  const root = mkdtempSync(join(tmpdir(), 'built-modules-'));
  try {
    mkdirSync(join(root, '_astro'));
    const files = { 'main.a.js': MAIN, 'feat.b.js': 'import"./shared.c.js";', 'shared.c.js': '', 'preact.d.js': '' };
    for (const [f, code] of Object.entries(files)) writeFileSync(join(root, '_astro', f), code);
    const graph = moduleGraph(root, '<script type="module" src="/_astro/main.a.js"></script>');
    const lazy = onDemandChunks(graph, ['/_astro/main.a.js'], roles({ future: ['/_astro/feat.b.js'] }));
    assert.deepEqual(lazy.parts, ['/_astro/feat.b.js', '/_astro/shared.c.js']);
    assert.deepEqual(lazy.costs['/_astro/feat.b.js'].chunks, ['/_astro/feat.b.js', '/_astro/shared.c.js'], 'its first use fetches the shared chunk too');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// A built page in a scratch directory: files { name: code } under _astro/, the page's HTML.
function withBuild(files, html, fn) {
  const root = mkdtempSync(join(tmpdir(), 'built-modules-'));
  try {
    mkdirSync(join(root, '_astro'));
    for (const [f, code] of Object.entries(files)) writeFileSync(join(root, '_astro', f), code);
    return fn(moduleGraph(root, html));
  } finally { rmSync(root, { recursive: true, force: true }); }
}
// The consortium page's shape since E6 K3: the page script imports the site chrome statically and the
// island's entry with import(); the entry imports its first-run modules statically, the loader with
// the sqlite glue, the sheets, the plant dialog and the views after the matrix with import(); the plant
// dialog imports the correction form with import() and the first run statically.
const PAGE_FILES = {
  'page.a.js': 'import{i}from"./chrome.b.js";i();import("./main.c.js");',
  'chrome.b.js': 'export const i=()=>{};',
  'main.c.js': 'import{h}from"./preact.d.js";const ids=["ct-root","ct-data"];const l=()=>import("./load.e.js"),s=()=>import("./Add.f.js"),d=()=>import("./Details.g.js"),v=()=>import("./later.h.js"),m=()=>import("./marks.k.js");',
  'preact.d.js': 'export const h=1;',
  'load.e.js': 'import{h}from"./main.c.js";const w="sqlite3_deserialize";new URL("sqlite3.abc.wasm",import.meta.url);',
  'Add.f.js': 'import{h}from"./main.c.js";',
  'Details.g.js': 'import{h}from"./main.c.js";import{p}from"./page.a.js";const c=()=>import("./Correction.i.js");',
  'Correction.i.js': 'import{h}from"./main.c.js";import{drafts}from"./Details.g.js";',
  'later.h.js': 'import{h}from"./main.c.js";import{x}from"./side.j.js";',
  'side.j.js': 'export const x=1;',
  'marks.k.js': 'export const m=1;',
};
const PAGE_HTML = '<head><script type="module" src="/_astro/page.a.js"></script></head>';
const PAGE_ROLES = roles({ markProviders: ['/_astro/marks.k.js'], sheets: ['/_astro/Add.f.js', '/_astro/Correction.i.js'], details: ['/_astro/Details.g.js'], later: ['/_astro/later.h.js'] });

test('modulepreloadChunks: the first-run closure, the loader with the glue and the page script\'s static imports; no part reached only through import() (A5, L5)', () => {
  withBuild(PAGE_FILES, PAGE_HTML, (graph) => {
    assert.deepEqual(modulepreloadChunks(graph, PAGE_HTML), ['/_astro/chrome.b.js', '/_astro/load.e.js', '/_astro/main.c.js', '/_astro/preact.d.js']);
  });
});

test('modulepreloadChunks: in the browser-test build, the hook the entry awaits before its first render is preloaded too', () => {
  const files = { ...PAGE_FILES, 'main.c.js': `${PAGE_FILES['main.c.js']}import("./test-hook.z.js");`, 'test-hook.z.js': 'import{h}from"./main.c.js";window.__ctTest={};' };
  withBuild(files, PAGE_HTML, (graph) => {
    assert.deepEqual(modulepreloadChunks(graph, PAGE_HTML, ['/_astro/test-hook.z.js']), ['/_astro/chrome.b.js', '/_astro/load.e.js', '/_astro/main.c.js', '/_astro/preact.d.js', '/_astro/test-hook.z.js']);
    assert.ok(!modulepreloadChunks(graph, PAGE_HTML).includes('/_astro/test-hook.z.js'), 'not without being named');
  });
});

// E6 hand-off H: the entry is found by main.ts's own "ct-root" literal, not by #ct-data, whose reader
// (views/kit/page.ts) Rollup may put in a chunk of its own.
test('modulepreloadChunks: the island entry is found when the #ct-data reader is in a chunk of its own', () => {
  const files = { ...PAGE_FILES, 'main.c.js': PAGE_FILES['main.c.js'].replace('const ids=["ct-root","ct-data"];', 'import{pd}from"./kit.p.js";const id="ct-root";'), 'kit.p.js': 'export const pd=()=>document.getElementById("ct-data");' };
  withBuild(files, PAGE_HTML, (graph) => {
    assert.deepEqual(modulepreloadChunks(graph, PAGE_HTML), ['/_astro/chrome.b.js', '/_astro/kit.p.js', '/_astro/load.e.js', '/_astro/main.c.js', '/_astro/preact.d.js']);
  });
});

test('modulepreloadChunks: a page without the island entry fails rather than preloading nothing', () => {
  withBuild({ 'page.a.js': 'import("./x.b.js");', 'x.b.js': '' }, PAGE_HTML, (graph) => {
    assert.throws(() => modulepreloadChunks(graph, PAGE_HTML), /one island entry chunk expected, found 0/);
  });
});

test('onDemandChunks: each part costs its chunk and its static imports the page has not loaded; its import()s are other parts (A14)', () => {
  withBuild(PAGE_FILES, PAGE_HTML, (graph) => {
    const size = (p) => graph.get(p).code.length;
    const lazy = onDemandChunks(graph, ['/_astro/page.a.js'], PAGE_ROLES, size);
    assert.deepEqual(lazy.parts, ['/_astro/Add.f.js', '/_astro/Correction.i.js', '/_astro/Details.g.js', '/_astro/later.h.js', '/_astro/marks.k.js', '/_astro/side.j.js']);
    assert.deepEqual(Object.fromEntries(Object.entries(lazy.costs).map(([k, c]) => [k, c.chunks])), {
      '/_astro/Add.f.js': ['/_astro/Add.f.js'],
      '/_astro/Correction.i.js': ['/_astro/Correction.i.js'], // the plant dialog it imports from opened it: costed on its own
      '/_astro/Details.g.js': ['/_astro/Details.g.js'],
      '/_astro/later.h.js': ['/_astro/later.h.js', '/_astro/side.j.js'],
      '/_astro/marks.k.js': ['/_astro/marks.k.js'],
    });
    assert.equal(lazy.costs['/_astro/later.h.js'].bytes, PAGE_FILES['later.h.js'].length + PAGE_FILES['side.j.js'].length);
  });
});

test('staticClosure: static imports only, import() not followed', () => {
  withBuild(PAGE_FILES, PAGE_HTML, (graph) => {
    assert.deepEqual(staticClosure(graph, ['/_astro/Details.g.js']).sort(), ['/_astro/Details.g.js', '/_astro/chrome.b.js', '/_astro/main.c.js', '/_astro/page.a.js', '/_astro/preact.d.js']);
  });
});

// E6 L11: the browser-test build differs from the production build only by the test hook's chunk
// (main.ts imports test-hook.ts with import() under __CT_TEST_HOOK__). Runs only with CANOPI_REQUIRE_BUILDS=1
// after fresh builds (npm run build and npm run build:browser-test): leftover builds from an older commit
// would fail it in a plain `npm test`. Chunks compared by their name
// without the hash (the hook changes main's hash and so every importer's), roles by their count.
const BUILT = { production: 'dist/client', test: 'dist-test/client' };
// CI's job 4 sets CANOPI_REQUIRE_BUILDS=1 with both builds present, so a missing build fails there.
const builtHere = Object.values(BUILT).every((d) => existsSync(join(d, 'consortium', 'index.html')));
const requireBuilds = process.env.CANOPI_REQUIRE_BUILDS === '1';
test('L11: the dist-test chunk graph is the production graph plus the test hook\'s chunk, and the hook is absent from dist', { skip: requireBuilds ? false : 'set CANOPI_REQUIRE_BUILDS=1 after npm run build and npm run build:browser-test' }, () => {
  assert.ok(builtHere, `CANOPI_REQUIRE_BUILDS=1 but ${Object.values(BUILT).filter((d) => !existsSync(join(d, 'consortium', 'index.html'))).join(' and ')} is missing`);
  const stem = (p) => p.replace('/_astro/', '').replace(/\.[\w-]{8}\.js$/, '');
  const graphs = Object.fromEntries(Object.entries(BUILT).map(([k, d]) => [k, moduleGraph(d, readFileSync(join(d, 'consortium', 'index.html'), 'utf8'))]));
  const stems = (g) => [...g.keys()].map(stem).sort();
  const extra = [...graphs.test.keys()].filter((p) => !stems(graphs.production).includes(stem(p)));
  assert.equal(extra.length, 1, `one chunk more in dist-test (the hook's): ${extra.join(', ')}`);
  assert.match(graphs.test.get(extra[0]).code, /__ctTest/, `${extra[0]} is the test hook's chunk`);
  assert.deepEqual(readChunkRoles(BUILT.test).testHook, [extra[0]], 'the roles name it');
  assert.deepEqual(readChunkRoles(BUILT.production).testHook, [], 'none in dist');
  assert.deepEqual(stems(graphs.test).filter((s) => s !== stem(extra[0])), stems(graphs.production), 'the same chunks otherwise');
  const counts = (d) => Object.fromEntries(Object.entries(readChunkRoles(d).features).map(([k, v]) => [k, v.length]));
  assert.deepEqual(counts(BUILT.test), counts(BUILT.production), 'the same roles, with the same number of chunks');
  for (const p of graphs.production.keys()) assert.doesNotMatch(graphs.production.get(p).code, /__ctTest|__ctFaults|__ctTimeouts|failSheets/, `${p}: no test hook in dist`);
  for (const f of readdirSync(join(BUILT.production, '_astro')).filter((x) => x.endsWith('.js'))) assert.doesNotMatch(readFileSync(join(BUILT.production, '_astro', f), 'utf8'), /__ctTest|__ctFaults/, `_astro/${f}: no test hook in dist`);
});

// The time-to-first-view ratchet (E6 A8, ADR-2, R10; scripts/browser/consortium-timing.mjs --ratchet
// scripts/browser/timing.json): the build stream's other budget, tested here with the chunk caps.
test('timing ratchet: within, a warning above, a failure only above 1.5×; null is not compared; the committed file is valid', async () => {
  const { compare, checkRatchet, parseArgs, nullRatchetWarning, FAIL_FACTOR } = await import('./browser/consortium-timing.mjs');
  const allNull = { desktop: { cold: null, warm: null }, phone: { cold: null, warm: null } };
  assert.match(nullRatchetWarning(allNull, 'scripts/browser/timing.json'), /^::warning file=scripts\/browser\/timing\.json::.*every value in scripts\/browser\/timing\.json is null\. The coordinator fills it from a nightly runner run/);
  assert.equal(nullRatchetWarning({ ...allNull, phone: { cold: 6000, warm: null } }, 'x'), null, 'one value set: no warning');
  assert.equal(FAIL_FACTOR, 1.5);
  assert.equal(compare(4000, 4000).level, 'ok');
  assert.equal(compare(4001, 4000).level, 'warn');
  assert.equal(compare(6000, 4000).level, 'warn', 'exactly 1.5× still warns');
  assert.equal(compare(6001, 4000).level, 'fail');
  assert.equal(compare(9000, null).level, 'none', 'no runner value yet');
  const file = JSON.parse(readFileSync(new URL('./browser/timing.json', import.meta.url), 'utf8'));
  assert.doesNotThrow(() => checkRatchet(file), 'scripts/browser/timing.json: a value or null per profile and visit');
  assert.throws(() => checkRatchet({ desktop: { cold: 1 }, phone: { cold: null, warm: null } }), /desktop\.warm/);
  assert.throws(() => checkRatchet({ desktop: { cold: -1, warm: 1 }, phone: { cold: null, warm: null } }), /desktop\.cold is -1/);
  assert.deepEqual(parseArgs(['--ratchet', 'scripts/browser/timing.json', '--dir', '/tmp/x']), { ratchet: 'scripts/browser/timing.json', dir: '/tmp/x' });
  assert.deepEqual(parseArgs([]), { ratchet: null, dir: null });
  assert.throws(() => parseArgs(['--ratchet']), /needs a value/);
  assert.throws(() => parseArgs(['--fast']), /unknown argument --fast/);
});
