// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { rehypeGuideTerms } from './src/lib/rehype-guide-terms.mjs';
import { rehypeGuideChecklists } from './src/lib/rehype-guide-checklists.mjs';

import cloudflare from '@astrojs/cloudflare';
import { transformWithEsbuild } from 'vite';

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
// where Vite cannot see them; the one wasm stays (probe P1: one hashed wasm).
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
  integrations: [mdx({ rehypePlugins: [rehypeGuideTerms, rehypeGuideChecklists] }), sitemap({ filter: (page) => !page.includes('/contact/') })],
  adapter: cloudflare(),

  vite: {
    plugins: [consortiumJsx, sqliteMainThreadOnly],
    esbuild: { exclude: [/\.js$/, CONSORTIUM_TSX] },
    // sqlite-wasm finds its .wasm through `locateFile` and an `?url` import (design check P1), so
    // the dependency optimizer must leave the package as published.
    optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  },
});