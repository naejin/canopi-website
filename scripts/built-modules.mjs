// The JavaScript a built page loads, followed through its import graph (review C8, design check §8
// and A2; E6 A5, A14). Used by astro.config.mjs (the consortium page's modulepreload links, written
// after the build, and the chunk roles) and by scripts/check-built-site.mjs (the per-chunk caps).
//
// Entries are the page's module scripts (src), its modulepreload links and the imports of its inline
// module scripts. Each chunk's imports are the static `from "./x.js"` / `import "./x.js"` and the
// dynamic `import("./x.js")`: every string literal naming a .js file of the build, except those in
// Vite's preload lists (__vite__mapDeps), which are preloads, not imports.
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const MODULE_SCRIPT = /<script\b[^>]*\btype="module"[^>]*>([\s\S]*?)<\/script>/g;
const SRC = /\bsrc="([^"]+)"/;
const PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g;
const JS_LITERAL = /["'`]((?:\.{1,2}\/|\/)?(?:_astro\/)?[\w.\-/]+\.js)["'`]/g;

// Vite's preload list (`__vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=[…])))`): what to preload
// with each dynamic import, not an import of this chunk. Each listed chunk is still reached through
// the import() it serves, so a chunk only a feature chunk needs is billed to that feature (S5d
// hand-off, 2026-11-11). Removed before the literals are read.
function withoutPreloadLists(code) {
  let out = code;
  for (let at = out.indexOf('__vite__mapDeps='); at >= 0; at = out.indexOf('__vite__mapDeps=', at + 1)) {
    const open = out.indexOf('[', at);
    const close = open < 0 ? -1 : out.indexOf(']', open);
    if (close < 0) break;
    out = out.slice(0, open + 1) + out.slice(close);
  }
  return out;
}

// '/_astro/x.js' paths of a chunk's imports (static and import()), resolved against its own path.
export function importsOf(code, from = '/_astro/entry.js') {
  const out = new Set();
  for (const [, spec] of withoutPreloadLists(code).matchAll(JS_LITERAL)) {
    let path;
    if (spec.startsWith('./') || spec.startsWith('../')) path = posix.join(posix.dirname(from), spec);
    else if (spec.startsWith('/_astro/')) path = spec;
    else if (spec.startsWith('_astro/')) path = `/${spec}`;
    else continue;
    if (path.startsWith('/_astro/')) out.add(path);
  }
  return [...out];
}

export function pageEntries(html) {
  const entries = new Set();
  for (const [tag, body] of html.matchAll(MODULE_SCRIPT)) {
    const src = tag.slice(0, tag.indexOf('>')).match(SRC)?.[1];
    if (src) entries.add(src);
    else for (const p of importsOf(body, '/index.js')) entries.add(p);
  }
  for (const [, href] of html.matchAll(PRELOAD)) entries.add(href);
  return [...entries].filter((p) => p.startsWith('/_astro/'));
}

// Every chunk reachable from the page: Map('/_astro/x.js' → { code, imports }), in visit order.
export function moduleGraph(root, html) {
  const graph = new Map();
  const stack = pageEntries(html).reverse();
  while (stack.length) {
    const path = stack.pop();
    if (graph.has(path)) continue;
    const file = join(root, path);
    if (!existsSync(file)) throw new Error(`${path} is loaded by the page but missing from the build`);
    const code = readFileSync(file, 'utf8');
    const imports = importsOf(code, path);
    graph.set(path, { code, imports });
    for (const p of [...imports].reverse()) if (!graph.has(p)) stack.push(p);
  }
  return graph;
}

// The chunk holding the sqlite-wasm glue (and the loader that imports it statically): outside the
// island's caps (§8), modulepreloaded because the first view waits for it.
export const isSqliteGlue = (code) => code.includes('sqlite3_deserialize') && /sqlite3\.[\w-]+\.wasm/.test(code);

// The chunks reached from `from` through `next` (a chunk's edges) without entering any chunk of
// `stop` (paths of a moduleGraph), in visit order.
function walk(graph, from, stop, next) {
  const seen = new Set();
  const stack = [...from];
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p) || stop.has(p) || !graph.has(p)) continue;
    seen.add(p);
    stack.push(...next(p));
  }
  return seen;
}

// The chunks reachable from `from` (static and import() edges) without entering any chunk of `stop`.
export const reachable = (graph, from, stop = new Set()) => walk(graph, from, stop, (p) => graph.get(p).imports);

// The island's own chunks (§8): everything reachable from its entry chunk (the one that mounts into
// #ct-root, src/islands/consortium/main.ts), less what the page loads without it (the site chrome,
// the page script with Vite's preload helper) and less the sqlite glue.
export function islandChunks(graph, pageEntries) {
  const main = [...graph].filter(([, m]) => m.code.includes('"ct-root"') && m.code.includes('"ct-data"')).map(([p]) => p);
  if (main.length !== 1) throw new Error(`one island entry chunk expected, found ${main.length}: ${main.join(', ')}`);
  const pageWide = reachable(graph, pageEntries, new Set(main));
  return { entry: main[0], chunks: [...reachable(graph, main)].filter((p) => !pageWide.has(p) && !isSqliteGlue(graph.get(p).code)) };
}

// The island's first run (§8, P2 budget; 40 KB cap): the chunks its entry imports statically, so
// evaluated before the matrix can draw; what it imports with import() (the sheets, the views after the matrix)
// is left out. Static imports in the built code: `import … from "./x.js"`, `import "./x.js"`,
// `export … from "./x.js"`.
const STATIC_IMPORT = /(?:^|[^\w$.])(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+\.js)["']/g;
export function firstRunChunks(graph, island) {
  const own = new Set(island.chunks);
  return staticClosure(graph, [island.entry], new Set([...graph.keys()].filter((p) => !own.has(p))));
}

// The chunks `roots` need before they can run: themselves and their static imports, transitively
// (paths of a moduleGraph; import() is not followed), without entering a chunk of `stop`.
const staticImportsOf = (graph, p) => [...graph.get(p).code.matchAll(STATIC_IMPORT)].flatMap(([, spec]) => importsOf(`"${spec}"`, p));
export const staticClosure = (graph, roots, stop = new Set()) => [...walk(graph, roots, stop, (p) => staticImportsOf(graph, p))];

// The roles the build gives chunks (P5 commit 0; E6 stream B4 merged the lazy island parts in), read
// from Rollup's own bundle in writeBundle (astro.config.mjs canopi:consortium-chunk-roles writes them to
// <outDir>/consortium-chunks.json, outside the served files), so no chunk is found by its file name:
// - features: every on-demand part of the island, by role (ROLE_ENTRIES, the one list): the P5
//   features (loaded once the reader gives a location or opens a climate that borrows plants) and the
//   E6 lazy parts (the plant dialog, the sheets, the views after the matrix, suggest; views/lazy.tsx
//   prefetches them once the data is ready or the consortium is first on screen). None is
//   modulepreloaded; each has its own cap (check-built-site.mjs ROLE_CAPS). The key keeps its P5 name
//   because the browser harness reads it (harness.mjs roleUrls);
// - maplibre: the chunks holding node_modules/maplibre-gl modules, and the worker files (emitted .js
//   assets; maplibre's ?worker&url) that a location or MapLibre chunk names;
// - maplibreCss: the CSS the location and MapLibre chunks import (maplibre-gl.css; Vite merges a
//   chunk's CSS into one file), counted in MapLibre's 330 KB;
// - testHook: the browser-test hook's chunk (dist-test only; none in a production build, L11).
// A role's chunks are those whose facade is a module its pattern names, and those holding such a module
// that is reached only through import() (moduleInfo: Rollup's this.getModuleInfo; no module imports it
// statically): when another chunk imports a binding from an entry module's chunk (Correction importing
// the correction drafts that live in the plant dialog's chunk), Rollup drops that chunk's facade
// (facadeModuleId null), and only its module list still names the entry (K3 hand-off, measured
// 2026-11-13). A module also imported statically (suggest.ts, in the island's entry until R4's
// loadSuggest) gives no chunk its role: the role stays empty, and check-built-site says so.
// Paths as the page names them ('/_astro/x.js'), sorted. A stream that moves code into a part names
// its entry file here (a missing entry is simply no chunk).
export const CHUNK_ROLES_FILE = 'consortium-chunks.json';
export const ROLE_ENTRIES = {
  // P5 features
  location: /\/src\/islands\/consortium\/views\/location\/location\.tsx$/, // S5b
  markProviders: /\/src\/lib\/consortium\/mark-providers\.ts$/, // S5c, S5d, S5e marks
  future: /\/src\/islands\/consortium\/views\/future\/future\.tsx$/, // S5d
  pool: /\/src\/islands\/consortium\/views\/pool\/pool\.tsx$/, // S5c, if not tiny
  likely: /\/src\/islands\/consortium\/views\/likely\/likely\.tsx$/, // S5e, if not tiny
  native: /\/src\/islands\/consortium\/views\/native\/native\.tsx$/, // S5e, if not tiny
  // The range rule (core marks.ts loadRangeRule; E6 design check A10): loaded once the site location
  // has a climate.
  range: /\/src\/lib\/consortium\/range\.ts$/, // R2
  // E6 lazy island parts (design check A5, A6, A11; L1-L12)
  details: /\/src\/islands\/consortium\/views\/details\/Details\.tsx$/, // K3: the plant dialog
  sheets: /\/src\/islands\/consortium\/views\/(Add|Swap|Paste|Correction)\.tsx$/, // K3
  later: /\/src\/islands\/consortium\/views\/later\.ts$/, // K3: the views after the matrix
  suggest: /\/src\/lib\/consortium\/suggest\.ts$/, // R4: loadSuggest
};
const MAPLIBRE_MODULE = /\/node_modules\/maplibre-gl\//;
// The browser-test hook (main.ts imports it with import() under __CT_TEST_HOOK__ and awaits it before
// the first render), in the browser-test build only: not a part, never in dist/ (L11).
const TEST_HOOK = /\/src\/islands\/consortium\/test-hook\.ts$/;
const emptyRoles = () => Object.fromEntries(Object.keys(ROLE_ENTRIES).map((k) => [k, []]));
const norm = (id) => (id ?? '').split('?')[0].replaceAll('\\', '/');
/**
 * @param {Record<string, any>} bundle Rollup's output bundle
 * @param {((id: string) => { importers: readonly string[], dynamicImporters: readonly string[] } | null) | null} [moduleInfo] Rollup's this.getModuleInfo
 */
export function chunkRoles(bundle, moduleInfo = null) {
  const files = Object.values(bundle);
  const chunks = files.filter((f) => f.type === 'chunk');
  const path = (f) => `/${typeof f === 'string' ? f : f.fileName}`;
  const lazyOnly = (m) => { const info = moduleInfo?.(m); return !!info && info.dynamicImporters.length > 0 && info.importers.length === 0; };
  const holds = (c, re) => re.test(norm(c.facadeModuleId)) || (c.moduleIds ?? []).some((m) => re.test(norm(m)) && lazyOnly(m));
  const byRole = Object.fromEntries(Object.entries(ROLE_ENTRIES).map(([k, re]) => [k, chunks.filter((c) => holds(c, re))]));
  const maplibreJs = chunks.filter((c) => (c.moduleIds ?? []).some((m) => MAPLIBRE_MODULE.test(norm(m))));
  const named = [...byRole.location, ...maplibreJs];
  const workers = files.filter((f) => f.type === 'asset' && f.fileName.endsWith('.js') && named.some((c) => c.code.includes(f.fileName.split('/').pop())));
  const css = new Set(named.flatMap((c) => [...(c.viteMetadata?.importedCss ?? [])]));
  return {
    features: Object.fromEntries(Object.entries(byRole).map(([k, list]) => [k, list.map(path).sort()])),
    maplibre: [...maplibreJs, ...workers].map(path).sort(),
    maplibreCss: [...css].map(path).sort(),
    testHook: chunks.filter((c) => TEST_HOOK.test(norm(c.facadeModuleId))).map(path).sort(),
  };
}
// The roles of a build (root: the served directory, dist/client or dist-test/client): none when the
// file is missing (a build without the plugin), so the checks fail on a missing chunk.
export function readChunkRoles(root) {
  const none = { features: emptyRoles(), maplibre: [], maplibreCss: [], testHook: [] };
  for (const file of [join(root, '..', CHUNK_ROLES_FILE), join(root, CHUNK_ROLES_FILE)]) {
    if (existsSync(file)) {
      const r = JSON.parse(readFileSync(file, 'utf8'));
      return { ...none, ...r, features: { ...none.features, ...r.features } };
    }
  }
  return none;
}

// The chunks loaded only when the reader asks for them (paths of a moduleGraph, sorted):
// - parts: every role chunk and the chunks only role chunks reach (MapLibre aside);
// - location: the location chunk and what only it reaches (not shared with another part);
// - maplibre: MapLibre's chunks and worker and what only they reach;
// - costs: per role chunk, the gzip bytes a first use of it fetches: the chunk and its static imports
//   that the page has not loaded already (not in the always-loaded set, not MapLibre). Its import()s,
//   and another role chunk it imports statically (the correction form importing the drafts from the
//   plant dialog's chunk, which opened it), are other parts, costed on their own.
// entries: the page's own entries (its module scripts). size: (path) => bytes.
export function onDemandChunks(graph, entries, roles, size = () => 0) {
  const inGraph = (list) => list.filter((p) => graph.has(p));
  const maplibreRoots = inGraph(roles.maplibre);
  const partRoots = inGraph(Object.values(roles.features).flat());
  const locationRoots = inGraph(roles.features.location ?? []);
  const always = reachable(graph, entries, new Set([...maplibreRoots, ...partRoots]));
  const maplibre = [...reachable(graph, maplibreRoots)].filter((p) => !always.has(p));
  const parts = [...reachable(graph, partRoots, new Set(maplibreRoots))].filter((p) => !always.has(p) && !maplibre.includes(p));
  const others = reachable(graph, partRoots.filter((p) => !locationRoots.includes(p)), new Set([...maplibreRoots, ...locationRoots]));
  const location = [...reachable(graph, locationRoots, new Set(maplibreRoots))].filter((p) => !always.has(p) && !maplibre.includes(p) && !others.has(p));
  const loaded = new Set([...always, ...maplibre]);
  const costs = Object.fromEntries([...new Set(partRoots)].sort().map((r) => {
    const own = staticClosure(graph, [r], new Set(partRoots.filter((p) => p !== r))).filter((p) => !loaded.has(p));
    return [r, { chunks: own.sort(), bytes: own.reduce((n, p) => n + size(p), 0) }];
  }));
  return { parts: parts.sort(), location: location.sort(), maplibre: maplibre.sort(), costs };
}

// Design check A5 (L5): the modulepreload links of a page holding #ct-root: the first-run closure only,
// so nothing lazy competes with the database download on a slow phone. That is what the first view
// waits for: the page's module scripts' static imports (the site chrome), the island's entry chunk
// (imported by the page script with import()) and its static imports, and the chunk holding the data
// loader with the sqlite-wasm glue (imported by the entry with import(), awaited before the matrix
// can draw) with its static imports. Nothing else reached only through import() is preloaded: not the
// sheets, the plant dialog, the views after the matrix, suggest, the P5 features or MapLibre (one rule,
// not a role list). The module scripts themselves are already loaded by their <script src>.
// awaited: chunks the entry imports with import() and awaits before its first render (the browser-test
// hook, in the browser-test build only: without its preload the page sat empty and not busy for a
// round trip, which the specs' loadState read as ready).
export function modulepreloadChunks(graph, html, awaited = []) {
  const scripts = [];
  const inline = [];
  for (const [tag, body] of html.matchAll(MODULE_SCRIPT)) {
    const src = tag.slice(0, tag.indexOf('>')).match(SRC)?.[1];
    if (src) scripts.push(src);
    else for (const [, spec] of body.matchAll(STATIC_IMPORT)) inline.push(...importsOf(`"${spec}"`, '/index.js'));
  }
  const island = islandChunks(graph, scripts);
  const glue = [...graph].filter(([, m]) => isSqliteGlue(m.code)).map(([p]) => p);
  return staticClosure(graph, [...scripts, ...inline, island.entry, ...glue, ...awaited.filter((p) => graph.has(p))]).filter((p) => !scripts.includes(p)).sort();
}
