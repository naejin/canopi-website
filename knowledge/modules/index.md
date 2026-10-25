# Module

* [mockup](mockup.md) - The approved October 2026 static HTML mockup and its implementation contract; a tracked design reference, not shipped by the build.
* [scripts](scripts.md) - Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
* [src/data](src-data.md) - Build-time content and link authorities for the site (release URLs, site links, network organisations, the bibliography).
* [src/i18n](src-i18n.md) - The 11-locale translation tables and the t() lookup used by every component at build time.
* [src/lib](src-lib.md) - Framework-free logic shared by the Worker endpoint, the page scripts and node --test (contact handler, installer detection, nearest-design distances).
* [src/pages](src-pages.md) - Astro routes; thin per-locale wrappers around components, plus the one on-demand contact endpoint.
* [src/scripts](src-scripts.md) - Vanilla browser modules for the home and bibliography pages (chrome, hero reveal, downloads, featured design canvas and map, contact, donations).
