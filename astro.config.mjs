// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { rehypeGuideTerms } from './src/lib/rehype-guide-terms.mjs';
import { rehypeGuideChecklists } from './src/lib/rehype-guide-checklists.mjs';

import cloudflare from '@astrojs/cloudflare';
import { transformWithEsbuild } from 'vite';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHUNK_ROLES_FILE, chunkRoles, moduleGraph, modulepreloadChunks } from './scripts/built-modules.mjs';
import { climateTiles } from './scripts/climate-integration.mjs';

// Consortium v2 (design check A1, coordinator row "v2 build setup", 2026-11-11): Preact 11 without
// @astrojs/preact, whose Astro 6 releases accept only Preact 10. JSX is compiled for Preact in
// src/islands/consortium/**/*.tsx only. Vite has one `esbuild` setting for every file, and its
// `include` also decides which .ts files are compiled at all, so the scope is a plugin of its own and
// vite:esbuild skips those files; every other file compiles exactly as before (probe P7).
const CONSORTIUM_TSX = /\/src\/islands\/consortium\/.*\.tsx$/;
/** @type {import('vite').Plugin} */
const consortiumJsx = {
  name: 'canopi:consortium-jsx',
  enforce: 'pre',
  async transform(/** @type {string} */ code, /** @type {string} */ id) {
    const path = id.split('?')[0];
    if (!CONSORTIUM_TSX.test(path)) return null;
    const out = await transformWithEsbuild(code, path, { loader: 'tsx', jsx: 'automatic', jsxImportSource: 'preact', target: 'esnext' });
    return { code: out.code, map: out.map };
  },
};

// sqlite-wasm's browser build names two helpers with new URL('…', import.meta.url): the deprecated
// Worker #1 promiser (new Worker(new URL('sqlite3-worker1.mjs'))) and the OPFS proxy. Vite would
// bundle the worker, a second copy of the glue and of the 879 KB wasm, and copy the proxy. The page
// opens the database on the main thread with neither (design check §2), so the two names are split
// where Vite cannot see them: neither file is emitted, and the glue's code that would load them
// stays in the loader chunk, never called (it would 404). The build ships one hashed sqlite3 wasm;
// scripts/check-built-site.mjs fails on a second wasm or on either helper file (review B4).
const SQLITE_BROWSER = /\/@sqlite\.org\/sqlite-wasm\/dist\/index\.mjs$/;
/** @type {import('vite').Plugin} */
const sqliteMainThreadOnly = {
  name: 'canopi:sqlite-main-thread-only',
  enforce: 'pre',
  transform(/** @type {string} */ code, /** @type {string} */ id) {
    if (!SQLITE_BROWSER.test(id.split('?')[0])) return null;
    let out = code;
    for (const name of ['sqlite3-worker1.mjs', 'sqlite3-opfs-async-proxy.js']) {
      const literal = `new URL("${name}", import.meta.url)`;
      if (!out.includes(literal)) throw new Error(`canopi:sqlite-main-thread-only: ${literal} is gone from ${id}; check the sqlite-wasm upgrade`);
      out = out.replaceAll(literal, `new URL(${JSON.stringify(name.slice(0, 7))} + ${JSON.stringify(name.slice(7))}, import.meta.url)`);
    }
    return { code: out, map: null };
  },
};

// The roles of the client build's chunks (scripts/built-modules.mjs chunkRoles: every on-demand part
// of the island by entry module, MapLibre's chunks, worker and CSS, the test hook's chunk), read
// from Rollup's bundle so no budget finds a chunk by its file name. Written beside the served directory
// (dist/consortium-chunks.json for dist/client), never served; read by scripts/check-built-site.mjs
// and the browser harness (faults by role).
/** @type {import('vite').Plugin} */
const consortiumChunkRoles = {
  name: 'canopi:consortium-chunk-roles',
  apply: 'build',
  writeBundle(options, bundle) {
    // @ts-ignore Vite 6+ names the environment a hook runs in; only the browser's bundle has roles.
    if (this.environment && this.environment.name !== 'client') return;
    const dir = options.dir ?? '';
    if (basename(dir) !== 'client') throw new Error(`canopi:consortium-chunk-roles: the client build went to ${dir}, not a client/ directory; ${CHUNK_ROLES_FILE} would be served`);
    writeFileSync(join(dir, '..', CHUNK_ROLES_FILE), `${JSON.stringify(chunkRoles(bundle, (/** @type {string} */ id) => this.getModuleInfo(id)), null, 2)}\n`);
  },
};

// Design check A2 (review C8) and E6 A5 (L5): the consortium page loads its island through a dynamic
// import, and the island its data loader, so their chunks would arrive one after another. After the
// build, every page holding #ct-root gets a <link rel="modulepreload"> for each chunk the first view
// waits for, and only those (scripts/built-modules.mjs modulepreloadChunks: the island's entry and its
// static imports, the loader chunk with the sqlite glue, the page script's static imports). Nothing
// reached only through import() is preloaded (the sheets, the plant dialog, the views after the
// matrix, suggest, the P5 features, MapLibre), so on a slow phone nothing lazy competes with the
// database download; views/lazy.tsx prefetches those parts once the data is ready. Other pages are not
// touched (P7). ConsortiumPage.astro preloads the database itself; scripts/check-built-site.mjs checks
// both.
/** @type {import('astro').AstroIntegration} */
const consortiumModulePreload = {
  name: 'canopi:consortium-modulepreload',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const out = fileURLToPath(dir);
      const root = existsSync(join(out, '_astro')) ? out : join(out, 'client');
      const stack = [root];
      while (stack.length) {
        const d = /** @type {string} */ (stack.pop());
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory()) { if (p !== join(root, 'app')) stack.push(p); continue; }
          if (!e.name.endsWith('.html')) continue;
          const html = readFileSync(p, 'utf8');
          if (!html.includes('id="ct-root"')) continue;
          const links = modulepreloadChunks(moduleGraph(root, html), html)
            .filter((m) => !html.includes(`href="${m}"`))
            .map((m) => `<link rel="modulepreload" href="${m}">`).join('');
          if (links) writeFileSync(p, html.replace('</head>', `${links}</head>`));
        }
      }
    },
  },
};

// The consortium's browser-test hook (src/islands/consortium/test-hook.ts) is compiled in only for
// the browser tests' own build (npm run build:browser-test, CANOPI_BROWSER_TEST=1). Its switch is the
// compile-time constant __CT_TEST_HOOK__ below, set from that shell flag alone: not a PUBLIC_ or VITE_
// variable, which Vite would also read from .env files, so no .env can turn it on in a deploy (H14,
// review F6; check-built-site also fails if the hook reaches dist/). That build goes to its own
// dist-test/ (served by scripts/browser/serve.mjs), so dist/ only ever holds a production build.

export default defineConfig({
  site: 'https://projectcanopi.com',
  output: 'static',
  outDir: process.env.CANOPI_BROWSER_TEST === '1' ? './dist-test' : './dist',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  // The contact result pages answer form posts only; they are noindex and stay out of the sitemap.
  // Field Guides are MDX (src/content/guides/); @astrojs/mdx 5 is the line for Astro 6, so the pin moves with Astro.
  // rehypeGuideTerms places each <Term>'s glossary note beside the block that first uses it;
  // rehypeGuideChecklists tells each checklist <Item> its list, for page-unique checkbox ids.
  // climateTiles installs the pinned canopi-climate grid before every build (and dev, if missing).
  integrations: [climateTiles(), mdx({ rehypePlugins: [rehypeGuideTerms, rehypeGuideChecklists] }), sitemap({ filter: (page) => !page.includes('/contact/') }), consortiumModulePreload],
  adapter: cloudflare(),

  vite: {
    plugins: [consortiumJsx, sqliteMainThreadOnly, consortiumChunkRoles],
    define: { __CT_TEST_HOOK__: JSON.stringify(process.env.CANOPI_BROWSER_TEST === '1') },
    esbuild: { exclude: [/\.js$/, CONSORTIUM_TSX] },
    // sqlite-wasm's own new URL('sqlite3.wasm', import.meta.url) and main.ts's ?url import name the
    // same emitted file; the dependency optimizer must leave the package as published, or in dev
    // that URL would point into .vite/deps, where the wasm is not.
    optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  },
});