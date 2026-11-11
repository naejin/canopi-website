// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { rehypeGuideTerms } from './src/lib/rehype-guide-terms.mjs';
import { rehypeGuideChecklists } from './src/lib/rehype-guide-checklists.mjs';

import cloudflare from '@astrojs/cloudflare';
import { transformWithEsbuild } from 'vite';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleGraph } from './scripts/built-modules.mjs';

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
    // The page downloads the wasm itself (data/load.ts instantiateWasm: a stall timer, not a fixed cap;
    // review R4-4), so the hook gets the wasm's URL as a third argument: the package's own
    // new URL("sqlite3.wasm", import.meta.url), which Vite emits as the one hashed file.
    const hook = /Module\["instantiateWasm"\]\(info, \(inst, mod\) => \{\s*resolve\(receiveInstance\(inst, mod\)\);\s*\}\)/;
    if (!hook.test(out)) throw new Error(`canopi:sqlite-main-thread-only: the instantiateWasm call is gone from ${id}; check the sqlite-wasm upgrade`);
    out = out.replace(hook, (call) => `${call.slice(0, -1)}, new URL("sqlite3.wasm", import.meta.url).href)`);
    return { code: out, map: null };
  },
};

// Design check A2 (review C8): the consortium page loads its island through a dynamic import, and
// the island its loader, so their chunks would arrive one after another. After the build, every page
// holding #ct-root gets a <link rel="modulepreload"> for each chunk of its import graph that it does
// not already load with a <script src>, the sqlite glue included. Other pages are not touched (P7).
// ConsortiumPage.astro preloads the database itself; scripts/check-built-site.mjs checks both.
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
          const links = [...moduleGraph(root, html).keys()]
            .filter((m) => !html.includes(`src="${m}"`) && !html.includes(`href="${m}"`))
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
// review F6; check-built-site also fails if the hook reaches dist/).

export default defineConfig({
  site: 'https://projectcanopi.com',
  output: 'static',

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
  integrations: [mdx({ rehypePlugins: [rehypeGuideTerms, rehypeGuideChecklists] }), sitemap({ filter: (page) => !page.includes('/contact/') }), consortiumModulePreload],
  adapter: cloudflare(),

  vite: {
    plugins: [consortiumJsx, sqliteMainThreadOnly],
    define: { __CT_TEST_HOOK__: JSON.stringify(process.env.CANOPI_BROWSER_TEST === '1') },
    esbuild: { exclude: [/\.js$/, CONSORTIUM_TSX] },
    // sqlite-wasm finds its .wasm with its own new URL('sqlite3.wasm', import.meta.url) (no
    // locateFile, no ?url import); the dependency optimizer must leave the package as published, or
    // in dev that URL would point into .vite/deps, where the wasm is not.
    optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  },
});