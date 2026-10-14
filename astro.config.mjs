// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  integrations: [sitemap({ filter: (page) => !page.includes('/contact/') })],
  // src/scripts/places-map.js loads MapLibre from public/vendor/maplibre-gl-<version>/.
  vite: { define: { MAPLIBRE_VERSION: JSON.stringify(maplibre.version) } },
  adapter: cloudflare(),
});