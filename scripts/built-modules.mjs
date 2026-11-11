// The JavaScript a built page loads, followed through its import graph (review C8, design check §8
// and A2). Used by astro.config.mjs (the consortium page's modulepreload links, written after the
// build) and by scripts/check-built-site.mjs (the island's 60 KB gzip budget).
//
// Entries are the page's module scripts (src), its modulepreload links and the imports of its inline
// module scripts. Each chunk's imports are the static `from "./x.js"` / `import "./x.js"`, the dynamic
// `import("./x.js")` and the dependency lists of Vite's preload helper ("_astro/x.js"): every string
// literal naming a .js file of the build.
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const MODULE_SCRIPT = /<script\b[^>]*\btype="module"[^>]*>([\s\S]*?)<\/script>/g;
const SRC = /\bsrc="([^"]+)"/;
const PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g;
const JS_LITERAL = /["'`]((?:\.{1,2}\/|\/)?(?:_astro\/)?[\w.\-/]+\.js)["'`]/g;

// '/_astro/x.js' paths of a chunk's imports, resolved against its own path.
export function importsOf(code, from = '/_astro/entry.js') {
  const out = new Set();
  for (const [, spec] of code.matchAll(JS_LITERAL)) {
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
// - location: the chunk whose entry module is S5b's lazy views/location/location.tsx;
// - maplibre: the chunks holding node_modules/maplibre-gl modules, and the worker files (emitted .js
//   assets; maplibre's ?worker&url) that a location or MapLibre chunk names;
// - maplibreCss: the CSS the location and MapLibre chunks import (maplibre-gl.css; Vite merges a
//   chunk's CSS into one file), counted in MapLibre's 330 KB;
// - markProviders: the chunk whose entry module is the core's lazy mark-providers.ts.
// Paths as the page names them ('/_astro/x.js'), sorted.
export const CHUNK_ROLES_FILE = 'consortium-chunks.json';
const LOCATION_ENTRY = /\/src\/islands\/consortium\/views\/location\/location\.tsx$/;
const PROVIDERS_ENTRY = /\/src\/lib\/consortium\/mark-providers\.ts$/;
const MAPLIBRE_MODULE = /\/node_modules\/maplibre-gl\//;
export function chunkRoles(bundle) {
  const files = Object.values(bundle);
  const chunks = files.filter((f) => f.type === 'chunk');
  const id = (f) => (f.facadeModuleId ?? '').split('?')[0].replaceAll('\\', '/');
  const location = chunks.filter((c) => LOCATION_ENTRY.test(id(c)));
  const maplibreJs = chunks.filter((c) => (c.moduleIds ?? []).some((m) => MAPLIBRE_MODULE.test(m.replaceAll('\\', '/'))));
  const named = [...location, ...maplibreJs];
  const workers = files.filter((f) => f.type === 'asset' && f.fileName.endsWith('.js') && named.some((c) => c.code.includes(f.fileName.split('/').pop())));
  const css = new Set(named.flatMap((c) => [...(c.viteMetadata?.importedCss ?? [])]));
  const path = (f) => `/${typeof f === 'string' ? f : f.fileName}`;
  return {
    location: location.map(path).sort(),
    maplibre: [...maplibreJs, ...workers].map(path).sort(),
    maplibreCss: [...css].map(path).sort(),
    markProviders: chunks.filter((c) => PROVIDERS_ENTRY.test(id(c))).map(path).sort(),
  };
}
// The roles of a build (root: the served directory, dist/client or dist-test/client): none when the
// file is missing (a build without the plugin), so the checks below fail on a missing chunk.
export function readChunkRoles(root) {
  const none = { location: [], maplibre: [], maplibreCss: [], markProviders: [] };
  for (const file of [join(root, '..', CHUNK_ROLES_FILE), join(root, CHUNK_ROLES_FILE)]) {
    if (existsSync(file)) return { ...none, ...JSON.parse(readFileSync(file, 'utf8')) };
  }
  return none;
}

// P5 (commit 0): the chunks loaded only when the reader asks for them, never modulepreloaded and
// left out of the island's 60 KB, each with its own budget (decision row "Island JavaScript budget
// for P5"): the location chunk with the chunks only it reaches, and MapLibre (its chunks and worker,
// roles from chunkRoles) with the chunks only they reach. entries: the page's own entries (its module
// scripts). Sorted paths.
export function onDemandChunks(graph, entries, roles) {
  const maplibreRoots = roles.maplibre.filter((p) => graph.has(p));
  const locationRoots = roles.location.filter((p) => graph.has(p));
  const always = reachable(graph, entries, new Set([...maplibreRoots, ...locationRoots]));
  const maplibre = [...reachable(graph, maplibreRoots)].filter((p) => !always.has(p));
  const location = [...reachable(graph, locationRoots, new Set(maplibreRoots))].filter((p) => !always.has(p) && !maplibre.includes(p));
  return { location: location.sort(), maplibre: maplibre.sort() };
}
