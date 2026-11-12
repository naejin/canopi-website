# Module

* [Climate reader](climate-reader.md) - The canopi-climate v0.2 tile reader in src/lib/climate/ and its installer, which serves the tiles under /data/climate/ for the consortium page's location lookup.
* [Consortium core](consortium-core.md) - Consortium v2 core seams (types, PlantSource, load failures, the P5 range rule and nearest-list placements, the future and lazy marks seams; native and soil moved to P5.2), the rules S1 ported, and the format 4 schema 3 installer that writes the gzipped SQLite export, its photos and src/data/consortium-index.json.
* [Consortium location step](consortium-location.md) - The consortium's optional site location (geolocation, Nominatim search, MapLibre map) that suggests a climate card and a country from the climate tiles, kept on the device and put in a link only on request.
* [Consortium page](consortium-page.md) - The consortium v2 page in 11 locales: the static Astro shell, the Preact island's store, strings, load screens and view slots, the build setup for JSX and sqlite-wasm, and its built-site and browser checks.
* [Field Guides](field-guides.md) - The English and French Field Guides: MDX content, the shared guide layout, components and build-time diagrams, and their data.
* [mockup](mockup.md) - The approved October 2026 static HTML mockup and its implementation contract; a tracked design reference, not shipped by the build.
* [Privacy page and tool credits](privacy-and-credits.md) - The /privacy/ page in 11 locales, its footer link, and the consortium tool's climate, occurrence, map and search credits on /data-sources/.
* [scripts](scripts.md) - Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
* [src/data](src-data.md) - Build-time content and link authorities for the site (release URLs, site links, network organisations, the bibliography).
* [src/i18n](src-i18n.md) - The 11-locale translation tables and the t() lookup used by every component at build time.
* [src/lib](src-lib.md) - Framework-free logic shared by the Worker endpoints, the page scripts and node --test (contact and correction handlers, installer detection, the TRY list and source credits parsers, the consortium data core).
* [src/pages](src-pages.md) - Astro routes; thin per-locale wrappers around components, plus the two on-demand endpoints, contact and correction.
* [src/scripts](src-scripts.md) - Vanilla browser modules for the site's pages (chrome, climate, hero reveal, downloads, featured design canvas and list, contact, donations).
