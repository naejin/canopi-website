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
const consortiumJsx = {
  name: 'canopi:consortium-jsx',
  enforce: 'pre',
  async transform(code, id) {
    const path = id.split('?')[0];
    if (!CONSORTIUM_TSX.test(path)) return null;
    const out = await transformWithEsbuild(code, path, { loader: 'tsx', jsx: 'automatic', jsxImportSource: 'preact', target: 'esnext' });
    return { code: out.code, map: out.map };
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
    plugins: [consortiumJsx],
    esbuild: { exclude: [/\.js$/, CONSORTIUM_TSX] },
    // sqlite-wasm finds its .wasm through `locateFile` and an `?url` import (design check P1), so
    // the dependency optimizer must leave the package as published.
    optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  },
});