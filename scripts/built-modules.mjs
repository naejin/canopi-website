// The JavaScript a built page loads, followed through its import graph (review C8, design check §8
// and A2). Used by astro.config.mjs (the consortium page's modulepreload links, written after the
// build) and by scripts/check-built-site.mjs (the island's 60 KB gzip budget).
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

// The chunk holding the sqlite-wasm glue (and the loader that imports it statically): left out of
// the island's budget (§8) and loaded only once the island asks for it.
export const isSqliteGlue = (code) => code.includes('sqlite3_deserialize') && /sqlite3\.[\w-]+\.wasm/.test(code);

// The chunks reachable from `from` without entering any chunk of `stop` (paths of a moduleGraph).
export function reachable(graph, from, stop = new Set()) {
  const seen = new Set();
  const stack = [...from];
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p) || stop.has(p) || !graph.has(p)) continue;
    seen.add(p);
    stack.push(...graph.get(p).imports);
  }
  return seen;
}

// The island's own chunks (§8): everything reachable from its entry chunk (the one that mounts into
// #ct-root, src/islands/consortium/main.ts), less what the page loads without it (the site chrome,
// the page script with Vite's preload helper) and less the sqlite glue.
export function islandChunks(graph, pageEntries) {
  const main = [...graph].filter(([, m]) => m.code.includes('"ct-root"') && m.code.includes('"ct-data"')).map(([p]) => p);
  if (main.length !== 1) throw new Error(`one island entry chunk expected, found ${main.length}: ${main.join(', ')}`);
  const pageWide = reachable(graph, pageEntries, new Set(main));
  return { entry: main[0], chunks: [...reachable(graph, main)].filter((p) => !pageWide.has(p) && !isSqliteGlue(graph.get(p).code)) };
}

// The island's first run (§8, P2 budget): the chunks its entry imports statically, so evaluated
// before the matrix can draw; what it imports with import() (the sheets, the views after the matrix)
// is left out. Static imports in the built code: `import … from "./x.js"`, `import "./x.js"`,
// `export … from "./x.js"`.
const STATIC_IMPORT = /(?:^|[^\w$.])(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+\.js)["']/g;
export function firstRunChunks(graph, island) {
  const own = new Set(island.chunks);
  const seen = new Set();
  const stack = [island.entry];
  while (stack.length) {
    const p = stack.pop();
    if (seen.has(p) || !own.has(p)) continue;
    seen.add(p);
    for (const [, spec] of graph.get(p).code.matchAll(STATIC_IMPORT)) stack.push(...importsOf(`"${spec}"`, p));
  }
  return [...seen];
}

// P5 (commit 0): the roles the build gives chunks, read from Rollup's own bundle in generateBundle
// (astro.config.mjs canopi:consortium-chunk-roles writes them to <outDir>/consortium-chunks.json,
// outside the served files), so no chunk is found by its file name:
// - features: the P5 feature chunks, each found by its entry module (P5_FEATURE_ENTRIES, the one
//   list): loaded only once the reader gives a location or opens a climate that borrows plants, never
//   modulepreloaded, ≤ 30 KB together (the location chunk alone ≤ 20 KB), outside the island's 60 KB;
// - maplibre: the chunks holding node_modules/maplibre-gl modules, and the worker files (emitted .js
//   assets; maplibre's ?worker&url) that a location or MapLibre chunk names;
// - maplibreCss: the CSS the location and MapLibre chunks import (maplibre-gl.css; Vite merges a
//   chunk's CSS into one file), counted in MapLibre's 330 KB.
// Paths as the page names them ('/_astro/x.js'), sorted. A stream that moves its content into a
// feature chunk names its entry file as listed here (a missing entry is simply no chunk).
export const CHUNK_ROLES_FILE = 'consortium-chunks.json';
export const P5_FEATURE_ENTRIES = {
  location: /\/src\/islands\/consortium\/views\/location\/location\.tsx$/, // S5b
  markProviders: /\/src\/lib\/consortium\/mark-providers\.ts$/, // S5c, S5d, S5e marks
  future: /\/src\/islands\/consortium\/views\/future\/future\.tsx$/, // S5d
  pool: /\/src\/islands\/consortium\/views\/pool\/pool\.tsx$/, // S5c, if not tiny
  likely: /\/src\/islands\/consortium\/views\/likely\/likely\.tsx$/, // S5e, if not tiny
  native: /\/src\/islands\/consortium\/views\/native\/native\.tsx$/, // S5e, if not tiny
};
const MAPLIBRE_MODULE = /\/node_modules\/maplibre-gl\//;
const emptyFeatures = () => Object.fromEntries(Object.keys(P5_FEATURE_ENTRIES).map((k) => [k, []]));
export function chunkRoles(bundle) {
  const files = Object.values(bundle);
  const chunks = files.filter((f) => f.type === 'chunk');
  const id = (f) => (f.facadeModuleId ?? '').split('?')[0].replaceAll('\\', '/');
  const path = (f) => `/${typeof f === 'string' ? f : f.fileName}`;
  const byRole = Object.fromEntries(Object.entries(P5_FEATURE_ENTRIES).map(([k, re]) => [k, chunks.filter((c) => re.test(id(c)))]));
  const maplibreJs = chunks.filter((c) => (c.moduleIds ?? []).some((m) => MAPLIBRE_MODULE.test(m.replaceAll('\\', '/'))));
  const named = [...byRole.location, ...maplibreJs];
  const workers = files.filter((f) => f.type === 'asset' && f.fileName.endsWith('.js') && named.some((c) => c.code.includes(f.fileName.split('/').pop())));
  const css = new Set(named.flatMap((c) => [...(c.viteMetadata?.importedCss ?? [])]));
  return {
    features: Object.fromEntries(Object.entries(byRole).map(([k, list]) => [k, list.map(path).sort()])),
    maplibre: [...maplibreJs, ...workers].map(path).sort(),
    maplibreCss: [...css].map(path).sort(),
  };
}
// The roles of a build (root: the served directory, dist/client or dist-test/client): none when the
// file is missing (a build without the plugin), so the checks fail on a missing chunk.
export function readChunkRoles(root) {
  const none = { features: emptyFeatures(), maplibre: [], maplibreCss: [] };
  for (const file of [join(root, '..', CHUNK_ROLES_FILE), join(root, CHUNK_ROLES_FILE)]) {
    if (existsSync(file)) {
      const r = JSON.parse(readFileSync(file, 'utf8'));
      return { ...none, ...r, features: { ...none.features, ...r.features } };
    }
  }
  return none;
}

// The chunks loaded only when the reader asks for them (paths of a moduleGraph, sorted):
// - features: every P5 feature chunk and the chunks only feature chunks reach (MapLibre aside);
// - location: the location chunk and what only it reaches (not shared with another feature);
// - maplibre: MapLibre's chunks and worker and what only they reach.
// entries: the page's own entries (its module scripts).
export function onDemandChunks(graph, entries, roles) {
  const inGraph = (list) => list.filter((p) => graph.has(p));
  const maplibreRoots = inGraph(roles.maplibre);
  const featureRoots = inGraph(Object.values(roles.features).flat());
  const locationRoots = inGraph(roles.features.location);
  const always = reachable(graph, entries, new Set([...maplibreRoots, ...featureRoots]));
  const maplibre = [...reachable(graph, maplibreRoots)].filter((p) => !always.has(p));
  const features = [...reachable(graph, featureRoots, new Set(maplibreRoots))].filter((p) => !always.has(p) && !maplibre.includes(p));
  const others = reachable(graph, featureRoots.filter((p) => !locationRoots.includes(p)), new Set([...maplibreRoots, ...locationRoots]));
  const location = [...reachable(graph, locationRoots, new Set(maplibreRoots))].filter((p) => !always.has(p) && !maplibre.includes(p) && !others.has(p));
  return { features: features.sort(), location: location.sort(), maplibre: maplibre.sort() };
}
