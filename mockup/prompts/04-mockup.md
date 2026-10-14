# Task: build the high-fidelity mockup of the new projectcanopi.com homepage

Build a static, self-contained HTML/CSS/JS mockup in `mockup/` of `/home/daylon/projects/canopi-website` (branch `overhaul`). It is for the owner's design review: it must look and behave like the finished page, in English, but has no backend. Do not touch anything outside `mockup/` (the live Astro site in `src/` stays as it is; read it for reference only). Do not create or update issues (no `bd` commands). Do not commit.

Entry point: `mockup/index.html`, plus `mockup/mockup.css` and `mockup/mockup.js` (ES modules, no framework, no build step, no CDN). It must work when served by `python3 -m http.server` from `mockup/`. MapLibre is vendored in `mockup/vendor/` (v6.10.0, ES module build: `maplibre-gl.mjs` imports `maplibre-gl-shared.mjs`; the worker is `maplibre-gl-worker.mjs`; read the v6 API in those files for how to point it at the worker). Fonts are in `mockup/assets/fonts/`. Use only what is in `mockup/`; at view time only the map tiles and the HelloAsso iframe come from the network.

## The product, the goal

Canopi is a free, open-source (AGPL-3.0) app to design food forests, syntropic orchards and agroecological gardens on a map. Two editions: **Canopi Desktop** (installers for Linux, macOS, Windows; full plant catalog) and **Canopi Web** (opens in the browser at https://web.projectcanopi.com/; smaller catalog). Version 2.0 is about to ship.

The page must make three things effortless:
1. In under a second, the visitor knows this is the official Canopi website, and downloading the right Desktop installer or opening Canopi Web is one obvious click.
2. They see what a real design made with Canopi looks like and can explore it.
3. They find designs and communities near them, the wider agroecology network, a way to donate and a way to write to us.

## Visual system (match the Canopi 2.0 app exactly)

- Fonts: **Literata** for display (the hero title, section titles) and **Source Sans 3** for everything else, weights 400 and 600 only (italic 400 for scientific names). Self-host from `assets/fonts/` with `font-display: swap`.
- Colour tokens (CSS custom properties on `:root`, dark under `[data-theme="dark"]`; default follows `prefers-color-scheme`, a toggle overrides and is remembered in `localStorage` under `canopi-theme`):

| Token | Light | Dark |
|---|---|---|
| bg (paper) | #EFE9DD | #161510 |
| surface | #FBF8F2 | #201E19 |
| surface-alt | #F3EEE3 | #2A2721 |
| text (ink) | #27231D | #EFE8DA |
| text-secondary | #4A4237 | #D6CEBF |
| text-muted | #645A4C | #B5AC9D |
| accent (ochre) | #9C5A16 | #E3A04C |
| accent-ink | #8A4E12 | #F0B465 |
| on-accent | #FFF8EC | #1D1A14 |
| border | rgba(58,46,28,0.14) | rgba(255,248,235,0.12) |
| border-strong | rgba(58,46,28,0.55) | rgba(255,248,235,0.40) |
| focus | #1F5F8B | #7FB8E0 |

- No green in interface chrome (green belongs to plants). No Tailwind, no frameworks.
- Radii around 7px; quiet borders; generous whitespace. A field-notebook calm, not a SaaS landing page: no gradients, no glassmorphism, no stock icons, no emoji.
- The current site (`src/styles/`, `src/components/`) adds a subtle global paper grain on `<body class="grain">`; keep that idea.
- Responsive: phones up to 639px, desktop from 960px, no tablet tier. No horizontal scroll at 320px. Touch targets at least 44px on phones.
- Accessible: semantic landmarks, one `h1`, visible focus rings in the focus colour, keyboard access to everything, `prefers-reduced-motion` respected, sufficient contrast in both themes.

## Sections, top to bottom

### 1. Header
Left: the Canopi logo (`../public/canopi-logo.svg`; copy it into `mockup/assets/`) and the word "Canopi", exactly as the current site places them. Right, in the current site's order and position: **Donate** (opens the donation dialog, section 8), **Discord** (https://discord.gg/k7bsyjD9b8), the language menu (11 languages: English, Français, Español, Português, Italiano, 中文, Deutsch, 日本語, 한국어, Nederlands, Русский), and the theme toggle. Reserve a **Docs** link slot in the markup, hidden for now (`hidden` attribute and a comment), because docs come later.

In the mockup, choosing a language only switches the hero painting (section 2) and sets `lang`, with a small unobtrusive note "Mockup: only the painting changes" so the reviewer understands; all copy stays English.

### 2. Hero
Centred. The title is the word **Canopi** (the only `h1`), large, in Literata. Under it, exactly: "Agroecological design, free and open to everyone". You choose the order, sizes and rhythm, but the title must read as the brand at first glance.

Actions:
- One primary button whose label names the visitor's system: "Download for Windows", "Download for macOS (Apple silicon)", "Download for macOS (Intel)", "Download for Linux". Detect it with the logic in `src/lib/installer.mjs` (copy it; prefer `navigator.userAgentData.getHighEntropyValues(['architecture','bitness','platform'])` when available, as `src/scripts/downloads.js` does). The button links straight to the installer file (`src/data/release.ts`: GitHub `releases/latest/download/...` URLs; for Linux the AppImage). When the device is unknown or unsupported (phones, ChromeOS, ARM Windows or Linux), the primary button becomes **Open Canopi Web** instead.
- A secondary action: **Open Canopi Web** (https://web.projectcanopi.com/), or "Download Canopi Desktop" when Web is already primary.
- A small text link "Other systems and versions" opens a native `<dialog>` listing every installer, grouped by Windows / macOS / Linux, with one plain-language hint each (copy hints from `src/i18n/translations/en.json`, keys `download.*` and `edition.installer.*`), the SHA-256 checksums link and "All releases on GitHub".
- A quiet meta line: "Version 2.0 · Free and open source (AGPL-3.0) · Windows, macOS, Linux and your browser".
- Improve on the current dialog (`src/components/DownloadDialog.astro`) where you see a better design, but keep it one click for the common case.

**The painting reveal.** Behind the hero sits a canopy painting hidden under a canvas filled with the page background colour. The cursor leaves a soft, brush-like, cloud-shaped trail that reveals the painting and closes again within about half a second. Technique (write your own implementation, around 100 lines):
- A `<canvas>` absolutely positioned over the painting, `pointer-events: none`, sized to the hero, device pixel ratio capped at 2, resized on window resize.
- On `mousemove` and `mouseenter` over the hero, add "ink dots" every ~12px along the path from the last point (cap ~160 alive dots, drop the oldest).
- Each animation frame: repaint the mask (`source-over`, background colour), then with `destination-out` carve every living dot: a radial gradient (opaque core, soft edge) filled inside an irregular outline whose radius wobbles with three summed sines of different frequencies and a random per-dot phase (ink or oil-brush edge). Each dot grows from ~8px to a random 70–130px with ease-out cubic over ~520ms while its alpha fades as 1 − t². Remove dead dots.
- The `requestAnimationFrame` loop runs only while dots are alive, and stops when the pointer rests (zero cost when idle).
- `(hover: none)` devices: no canvas; the painting shows at low opacity (~0.18) behind the text, static. `prefers-reduced-motion`: same static treatment.
- The mask colour follows the theme (light paper or dark paper), updated when the theme toggles.
- Painting per language: `assets/hero/hero-{lang}.png` (light theme) and `assets/hero/hero-{lang}-night.png` (dark theme). Other runs are generating them; some may not exist yet. Fall back in this order: `hero-{lang}.png`, then `hero-en.png`, then `assets/studies/v2/study-1-botanical-engraving.png`, then `assets/studies/study-1-botanical-engraving.png`; for the night image fall back to the light image dimmed with a CSS filter. Probe with `Image()` so nothing breaks visibly. Use `background-size: cover`, positioned bottom centre.

### 3. Featured design
Title like "Designed with Canopi" with one short line. One design at a time, chosen at random on load from `data/featured-designs.json` (two designs now, more later; the URL parameter `?design=<id>` forces one). The map (section 4) switches it.

Render the design on a `<canvas>` with **no basemap**: plants and zones on the page background, as the Canopi app draws them:
- Data: `data/featured-designs.json`. Read its `format` field. Plants are `[xM, yM, speciesIndex, nearestNeighbourM]` in metres, x east, y south (screen orientation, so no flip). Zones are rings of points in metres. `boundsM` frames the design. Every species has `scientific`, `common.en`/`common.fr`, `habit`, `heightMaxM`, `stratum`, `color` and `symbol`.
- Symbols: `data/plant-symbols.json` has all 33 Canopi plant symbols as SVG path strings in −1…1 units (radius 1, centred on 0,0, y down). Build one `Path2D` per symbol and variant, then draw each plant with `ctx.setTransform` (translate to the plant, scale by its radius). Fill `body` in the species colour, then `cutouts` in the backdrop colour. Use `detailed` when the drawn diameter is ≥16px, `compact` below.
- Plant radius in px, as in the app: `ppm` is pixels per metre at the current scale; `symbolic = 2 + 4.75 * ppm / (ppm + 21)`; `radius = max(0.65, min(symbolic, nearestNeighbourM * ppm * 0.42) * 0.8)` (the designer's symbol scale is 0.8). Below 3.6px radius draw a plain filled circle.
- Outline (halo) around each symbol: 0.5px when the diameter is under 10px, else 0.7px, in the backdrop colour; if the plant colour's contrast against the backdrop is below 3:1, use the ink colour for halo and cutouts.
- Zones: closed rings as polygons, open rings as polylines. Light theme: a 4px stroke of rgba(20,16,10,0.6) under a 2px stroke of #FFF3D6 (the app's casing and cream stroke), fill rgba(255,243,214,0.02). Check that this reads well on paper and adjust only if it clearly doesn't, saying so in your notes. Dark theme: the same.
- View: fit `boundsM` with padding, centred, sharp at device pixel ratio. Add small + / − zoom buttons and a "Fit" button, and drag to pan. Do not capture the page's scroll wheel; zoom with Ctrl+wheel or pinch only. Redraw on resize and theme change.
- **Hover tooltip, exactly as the app's**: a box with `padding: 4px 8px`, background `surface`, `1px solid border`, `border-radius: 7px`, no shadow, `white-space: nowrap`, `max-width: 260px`, Source Sans 3. Line 1: the common name, 600 weight, 13px, text colour (omitted when there is no common name). Line 2: the scientific name, italic, 12.5px, text-muted. Positioned at pointer + 12px, flipped to stay inside the canvas. The hovered plant gets a ring: a 4px #FFF8EC casing under a 2px rgba(156,90,22,0.62) stroke at alpha 0.72, ring radius at least 8px. Hit-test the nearest plant within max(radius, 8px) using a simple grid index (2,201 plants). On touch, a tap shows the tooltip for that plant.
- Legend: the four strata with their colours (from `stratumColors`): Emergent, High, Medium, Low (plus "No stratum" when present), in plain words, small.
- Caption card beside the canvas on desktop (below on phones): design name, "by {designer}", place (e.g. "Sarthe, France"), "{plantCount} plants · {speciesCount} species", a link to the project ("Visit the project ↗", `projectUrl`) and the organisation ("With Destination Syntropie ↗", `organisation`). A small "Made with Canopi 2.0" note.
- A short line inviting people to be featured: "Designed something with Canopi? We'd love to feature it." linking to the contact section.

### 4. Map of featured designs
Title like "Designs around the world", one short line ("Find a design near you and the people behind it.").
- MapLibre with the OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`), the same basemap as the app. Keep the attribution control (OpenFreeMap, OpenMapTiles, OpenStreetMap).
- `cooperativeGestures: true` so the page scroll is never hijacked; max zoom 9 (pins are approximate, about 10 km, on purpose; say "Locations are approximate" in a small note).
- One pin per design at its `pin` (lon/lat): a custom HTML marker, an ochre dot with a paper ring, the active one larger with the design name label. Initial view fits all pins with padding (today both are in western France; with one pin, zoom 6).
- Clicking a pin (or pressing Enter on it; pins are buttons with accessible names) makes it active and swaps the featured design in section 3, scrolling it into view only if it is off-screen.
- Under or beside the map, a compact list of the same designs (name, place, designer) for keyboard and screen-reader users and phones, synchronised with the pins.

### 5. Agroecology network
Keep the content and meaning of the current section (`src/data/network.ts`, copy in `en.json` keys `network.*`): "Agroecology network" (never "partners"), "Discover organizations working across the wider agroecology movement." Redesign the presentation: grouped by region (Global, Europe, France, Switzerland, United States, Brazil, India), readable at a glance, each organisation an outbound link. No logos.

### 6. Contact
Title "Contact" or "Write to us", a short line. A form with name, email, message, a hidden honeypot field, and Send. Client-side validation with friendly inline messages. In the mockup, submitting shows a success state ("Thank you, your message is on its way. We usually answer within a few days.") without sending anything; also wire a visible way for the reviewer to see the error state (for example `?contact=error`). The email address is never shown on the page. A short privacy line: messages are only used to reply.

### 7. Footer
Logo, "Canopi", AGPL-3.0, links: GitHub (https://github.com/naejin/canopi), Discord, Donate, Contact, and (hidden for now) Docs. A small line "projectcanopi.com".

### 8. Donation dialog
"Donate" in the header (and footer) opens our own `<dialog>` styled like the site, not HelloAsso's pasted code: a panel on paper with a title ("Support Canopi"), one sentence on why ("Canopi is free for everyone. Donations fund development and the plant catalog."), a close button in our style, Escape and backdrop click close it, focus is trapped and returned. Inside, the HelloAsso form iframe (`https://www.helloasso.com/associations/canopi/formulaires/1/widget?view=overlay`, `allow="payment 'self' https://paymenthub.helloassopay.com https://helloasso.com"`), created only when the dialog opens (lazy), filling the panel height (tall, scrollable, full screen on phones). Liberapay is gone everywhere.

## Copy

English, sentence case, concise and warm, no marketing superlatives. Product terms: "Canopi Desktop", "Canopi Web", "Agroecology network", "Canvas tools". Keep the exact tagline above.

## Deliverables and checks

- `mockup/index.html`, `mockup/mockup.css`, `mockup/mockup.js` (split modules under `mockup/js/` if clearer).
- `mockup/NOTES.md`: what you built, any decision you made that this brief did not settle, anything you could not do, and known gaps.
- Check your work: serve `mockup/` with `python3 -m http.server`. If Playwright or Chromium is available (look in `node_modules` of this repo and of `/home/daylon/projects/canopi/desktop/web`), take screenshots into `mockup/screenshots/`: 1440×900 and 390×844, light and dark, the full page plus the hero with a simulated mouse trail and the canvas with a hovered plant. Network may be unavailable in your sandbox: then the map tiles stay blank, so note it, don't fake it. Fix anything that overflows, overlaps or is unreadable.
- Performance: no layout shift from fonts or images (reserve sizes), the design canvas draws in a few milliseconds, nothing animates when idle, and the heavy parts (MapLibre, design data) load only when their sections approach the viewport (`IntersectionObserver`).
