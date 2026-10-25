// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { rehypeGuideTerms } from './src/lib/rehype-guide-terms.mjs';
import { rehypeGuideChecklists } from './src/lib/rehype-guide-checklists.mjs';

import cloudflare from '@astrojs/cloudflare';
import maplibre from 'maplibre-gl/package.json' with { type: 'json' };

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
  // src/scripts/places-map.js loads MapLibre from public/vendor/maplibre-gl-<version>/.
  vite: { define: { MAPLIBRE_VERSION: JSON.stringify(maplibre.version) } },
  adapter: cloudflare(),
});