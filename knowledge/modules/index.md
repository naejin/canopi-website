# Module

* [Consortium core](consortium-core.md) - Format 2 types and the pure, dependency-free functions of the consortium tool (cell lookup, site fit, jobs, conflicts, greedy suggestion, swaps, share-link state), plus the export installer.
* [Consortium page](consortium-page.md) - The consortium tool's page in 11 locales: routes, the browser app that renders it from the core, its strings, styles and checks.
* [Field Guides](field-guides.md) - The English and French Field Guides: MDX content, the shared guide layout, components and build-time diagrams, and their data.
* [mockup](mockup.md) - The approved October 2026 static HTML mockup and its implementation contract; a tracked design reference, not shipped by the build.
* [scripts](scripts.md) - Node build helpers, tests, post-build checks, the legacy Web Edition installer, and Python asset generators.
* [src/data](src-data.md) - Build-time content and link authorities for the site (release URLs, site links, network organisations, the bibliography).
* [src/i18n](src-i18n.md) - The 11-locale translation tables and the t() lookup used by every component at build time.
* [src/lib](src-lib.md) - Framework-free logic shared by the Worker endpoint, the page scripts and node --test (contact handler, installer detection, nearest-design distances, the consortium data core).
* [src/pages](src-pages.md) - Astro routes; thin per-locale wrappers around components, plus the one on-demand contact endpoint.
* [src/scripts](src-scripts.md) - Vanilla browser modules for the home and bibliography pages (chrome, hero reveal, downloads, featured design canvas and map, contact, donations).
