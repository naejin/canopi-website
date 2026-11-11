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

// P5 (commit 0): the chunks loaded only when the reader asks for them, never modulepreloaded and
// left out of the island's 60 KB, each with its own budget (decision row "Island JavaScript budget
// for P5"): the location chunk (S5b's lazy views/location/location.tsx, built as location.<hash>.js)
// with the chunks only it reaches, and MapLibre (maplibre-gl.<hash>.js) with the chunks only it
// reaches. entries: the page's own entries (its module scripts). Sorted paths.
export const LOCATION_CHUNK = /^\/_astro\/location\.[\w-]+\.js$/;
export const MAPLIBRE_CHUNK = /^\/_astro\/maplibre-gl\.[\w-]+\.js$/;
export function onDemandChunks(graph, entries) {
  const paths = [...graph.keys()];
  const maplibreRoots = paths.filter((p) => MAPLIBRE_CHUNK.test(p));
  const locationRoots = paths.filter((p) => LOCATION_CHUNK.test(p));
  const always = reachable(graph, entries, new Set([...maplibreRoots, ...locationRoots]));
  const maplibre = [...reachable(graph, maplibreRoots)].filter((p) => !always.has(p));
  const location = [...reachable(graph, locationRoots, new Set(maplibreRoots))].filter((p) => !always.has(p) && !maplibre.includes(p));
  return { location: location.sort(), maplibre: maplibre.sort() };
}
