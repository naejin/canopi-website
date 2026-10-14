# projectcanopi.com overhaul: implementation contract

The approved mockup in `mockup/` is the reference for layout, behaviour and English copy. This
document says how to turn it into the production Astro site, what each part must guarantee, and
what the owner sets up by hand. Approved 2026-10-14.

Run the mockup: `cd mockup && python3 -m http.server 8765 --bind 127.0.0.1`, then open
`http://127.0.0.1:8765/`. Query parameters: `?lang=xx` (painting, plant names, place),
`?design=sanctuaire-aylin|claire-sam`, `?contact=error`.

## 1. Stack

Unchanged where it works, replaced where the mockup differs.

| Keep | Change |
|---|---|
| Astro 6, static output, 11 locales, `prefixDefaultLocale: false` | Fonts: Literata + Source Sans 3 (the app's), replacing Inter + Lora |
| One Cloudflare Worker (`projectcanopi`), Workers Builds deploy on push to `master` | One on-demand route, `POST /api/contact`, in the same Worker |
| `src/data/release.ts` as the only source of download URLs | MapLibre GL 6.10.0 as an npm dependency, loaded lazily |
| `src/lib/installer.mjs` and its tests | Plain CSS (tokens below), vanilla JS modules, no framework |
| `t()` and the JSON translation files | |

No React, no Tailwind, no htmx, no analytics, no third-party requests before the visitor asks for
one. The only third-party origins are OpenFreeMap tiles (when the map nears the viewport),
HelloAsso (when Donate opens) and GitHub (on download).

## 2. File plan

Port the mockup's modules. Do not rewrite their logic: they are tested in a real browser and
encode decisions listed in section 4.

| Mockup | Production |
|---|---|
| `index.html` sections | `src/components/{Header,Hero,FeaturedDesign,Places,Network,Contact,Footer,DownloadDialog,DonateDialog}.astro` |
| `css/site.css` | `src/styles/{tokens,fonts,global,home}.css` (split by concern; same rules) |
| `js/hero-reveal.js` | `src/scripts/hero-reveal.js` (drop the image probing: see 4.2) |
| `js/downloads.js`, `js/installer.mjs` | `src/scripts/downloads.js` reading URLs and strings from the page; `src/lib/installer.mjs` unchanged |
| `js/design-canvas.js` | `src/scripts/design-canvas.js` |
| `js/places-map.js` | `src/scripts/places-map.js` (`import('maplibre-gl')` instead of `vendor/`) |
| `js/dialogs.js`, `js/donate.js` | `src/scripts/dialogs.js`, `src/scripts/donate.js` |
| `js/sections.js` (contact) | `src/scripts/contact.js` (real POST, see section 6) |
| `js/sections.js` (network) | `Network.astro` renders `src/data/network.ts` at build time (no fetch) |
| `js/main.js` | `src/scripts/home.js`; language and theme come from the page, not from query strings |
| `data/featured-designs.json`, `data/plant-symbols.json` | `public/data/` (fetched when the section nears the viewport) |
| `tools/export-designs.py` | `scripts/export-featured-designs.py`, metadata moved to `scripts/featured-designs.json` |
| `tools/compress-heroes.py` | `scripts/compress-heroes.py` (adds the 1200 px phone variant) |
| `assets/hero/hero-{lang}[-night].jpg` | `public/hero/` plus `-1200` variants |
| `assets/fonts/*` | `public/fonts/` (add the Cyrillic subsets, see 5) |
| Mockup-only: badge, `?design=`, `?contact=error`, `?lang=` | Not ported |

Strings in the scripts (installer names, install tips, hint, legend, card labels, form messages)
move to the translation files and reach the scripts through `data-` attributes or one JSON
`<script type="application/json">` block per page. No English left in the JS.

## 3. Design tokens

Copy `:root`, `[data-theme="dark"]` and the `prefers-color-scheme` block from `css/site.css`
verbatim. They mirror the app (`canopi/desktop/web/src/styles/global.css`). Weights 400 and 600
only. Keep the theme key `canopi-theme` in `localStorage` (the current site already uses it) and
the inline head script that applies it before first paint.

## 4. Section contracts

### 4.1 Header
Logo and "Canopi" top left; on the right: Docs (hidden, see 4.10), Donate (opens the donate
dialog), Discord (`https://discord.gg/k7bsyjD9b8`, French pages `https://discord.gg/7wq9HsBdsc`),
language menu (real links to the 11 locale pages, current one `aria-current`), theme toggle.
The wordmark stays visible down to 320 px.

### 4.2 Hero
- Title "Canopi", tagline from `hero.tagline` (unchanged key).
- Primary action names the visitor's system and links straight to its installer; secondary opens
  Canopi Web. Unknown device: primary is Canopi Web, secondary opens the download dialog. Mac
  without a known chip: "Download for Mac" plus the two-chip chooser. After any installer click,
  the install tip appears under the actions (strings `download.install*`).
- Server-rendered default (no JS): primary Canopi Web, secondary a link to the GitHub releases
  page; the script upgrades it to open the download dialog, then applies detection.
- Meta line: "All systems and versions" (opens the dialog) · "Version {version}, free and open
  source" with the version from `release.ts`.
- Painting: one per locale, day and night. Choose it in CSS only, so the browser fetches one
  image: the locale's day JPG by default, its night JPG under `[data-theme="dark"]` and the
  `prefers-color-scheme` block; the `-1200` variant under `max-width: 1200px` via `image-set` or
  media queries. No JS image probing.
- Reveal (hover + fine pointer, no reduced motion): port `hero-reveal.js` as is. Constants are
  tuned; do not change them. The mask colour is `--bg` and is re-read on theme change. The
  welcome stroke runs once, 700 ms after load, unless the pointer moved first.
- Touch or reduced motion: the painting is static at `--painting-opacity-static`.

### 4.3 Download dialog
Native `<dialog>`: Canopi Web block, then Canopi Desktop grouped Windows / macOS / Linux with the
six installers from `release.ts`, the visitor's own marked "(this computer)"; checksums and all
releases links. Closes on Escape, the close button and a backdrop click; focus returns to the
opener. The built-site check keeps asserting all six URLs and the checksum URL on every locale.

### 4.4 Featured design
- One design chosen at random on load from `featured-designs.json`; the map and list swap it.
- Port `design-canvas.js` as is. Its decisions (approved):
  - Plant colours: the app's stratum colours. Symbols: the app's 33 recipes
    (`plant-symbols.json`, exported from `PLANT_SYMBOL_RECIPES`), compact below 16 px diameter,
    detailed above, a dot below 3.6 px radius, with the app's halo and contrast rule.
  - Symbol size grows with zoom up to 42 % of the distance to the nearest plant (max 18 px);
    this differs from the app on purpose so the detailed artwork shows.
  - Zones: one soft line (`--text-muted`, 50 % alpha), not the app's cream-and-casing double line.
  - Opens on the whole plan; when the stage is 55 % visible it glides (1.6 s, after 0.5 s) to the
    densest planting at a 5 px typical symbol radius, recentred on the plants in view. Reduced
    motion jumps.
  - Input: drag pans; Ctrl/trackpad-pinch wheel zooms; the page keeps the plain wheel; one finger
    scrolls the page, two fingers pan and pinch; tap shows the tooltip; double-click zooms in.
  - Tooltip and hover ring copy the app (`hover-tooltip.ts`): common name in the page language
    (fallback English, then scientific only), scientific name in italics.
- Card: name, "by {designer}", place, "{plants} plants · {species} species" (numbers with
  `Intl.NumberFormat(lang)`), project link, organisation link, "Made with Canopi {version}".
  Place: `region` as written plus `Intl.DisplayNames([lang], {type: 'region'}).of(country)`.
- Legend: the strata present in the design, labels translated.
- Canvas `aria-label` describes the plan; zoom buttons are real buttons with labels.

### 4.5 Places map
- OpenFreeMap Liberty (`https://tiles.openfreemap.org/styles/liberty`), the app's basemap.
- MapLibre and its CSS load when the section is within 400 px of the viewport.
- Fit all pins, `maxZoom` 5.2 for the fit and 9 overall, `cooperativeGestures`, no rotation or
  pitch, compact attribution, zoom buttons.
- Pins are buttons (ochre dot on a paper ring; the active one shows its name). The list beside
  the map mirrors them; both call the same select. The note "Locations are approximate." and the
  invite linking to `#contact` stay.
- If MapLibre fails, the list still works and the map box says so.

### 4.6 Network
The current section's content (`src/data/network.ts`, region titles from `network.country.*`),
rendered in the mockup's grid. External links open in the same tab, with the ↗ mark
`aria-hidden`. Never call them partners (`CONTEXT.md`).

### 4.7 Contact
Form: name, email, message, honeypot `website`. Client validation as in the mockup (blur, then
live once invalid; focus the first invalid field). Submit sends to `/api/contact` (section 6) and
shows the result in the status line. The address `contact@projectcanopi.com` never appears in
markup, scripts or error messages.

### 4.8 Donate
Header and footer buttons open our dialog ("Support Canopi", lede, footnote about HelloAsso). The
HelloAsso iframe (`https://www.helloasso.com/associations/canopi/formulaires/1/widget?view=overlay`,
`allow="payment 'self' https://paymenthub.helloassopay.com https://helloasso.com"`) is created
on first open only. Liberapay is removed everywhere.

### 4.9 Footer
Logo, Source code (`https://github.com/naejin/canopi`), Discord, Donate, Contact, Docs (hidden),
"Free software under the AGPL-3.0 licence."

### 4.10 Docs slot
`src/data/site.ts` exports `DOCS_URL = null`. Header and footer render the Docs link only when it
is set. Nothing else exists for docs yet.

### 4.11 Breakpoints and touch
Phones up to 639 px (single column, stacked full-width actions, 44 px targets, dialogs
full-screen), 640 to 959 px (cards under their stage), desktop from 960 px. No horizontal scroll
at 320 px.

## 5. Localisation

- Every new or changed string exists in all 11 locales; the existing key test enforces it. English
  copy is the mockup's, sentence case. Remove the unused keys (`hero.headline*`, `hero.video*`,
  `hero.play`).
- Translate naturally, not word for word; keep "Canopi", "Canopi Web" and "Canopi Desktop" as
  product names (`CONTEXT.md`).
- Fonts: Literata and Source Sans 3 Latin and Cyrillic subsets with `unicode-range` (from
  `@fontsource/literata` and `@fontsource/source-sans-3`, OFL texts alongside). Chinese, Japanese
  and Korean use the system fonts already listed in the font stacks.
- Plant names: `featured-designs.json` carries the catalog's common names in the 11 languages
  (re-export when a design is added).
- `<html lang>`, `hreflang` alternates and the sitemap stay as today.

## 6. Contact endpoint

`src/pages/api/contact.ts`, `export const prerender = false`, `POST` only. Bindings from
`cloudflare:workers` (`import { env } from 'cloudflare:workers'`; check the adapter version's docs
and use what it documents).

`wrangler.jsonc` adds:

```jsonc
"send_email": [{
  "name": "EMAIL",
  "destination_address": "projectcanopi@gmail.com",
  "allowed_sender_addresses": ["contact@projectcanopi.com"]
}],
"vars": { "MAIL_TO": "projectcanopi@gmail.com" }
```

Behaviour (the portfolio's `functions/api/contact.js` and `workers/mailer/src/index.js` are the
reference; one Worker here, so no service binding):

- Refuse bodies over 32 KB before parsing (413). Parse form data. Reject a foreign `Origin` (403;
  absent or `null` tolerated).
- Normalise: strip control characters; name and email single-line; limits name 120, email 254,
  message 5000. Validate required fields and the email pattern; 400 with per-field error codes.
- Honeypot filled: answer success, send nothing.
- Send `env.EMAIL.send({ from: { email: 'contact@projectcanopi.com', name: 'Canopi website' },
  to: env.MAIL_TO, replyTo: <visitor>, subject: '[Canopi] {LANG} · {name}', text })`. The text
  lists name, email, page language and the message, and ends with "Reply to this email to answer
  the sender." Success only with a `messageId`.
- Time out after 10 s. Map send errors like the portfolio's mailer: permanent (4xx except
  408/429) → 502 "could not be sent"; otherwise 502 "try again in a moment"; missing binding →
  503.
- Response: JSON `{ ok, code, fields? }` for the script (`Accept: application/json`). Without JS
  the form posts normally: success answers 303 to `/{lang}/contact/sent/`, failure 303 to
  `/{lang}/contact/failed/` (two small static, `noindex` pages per locale with a link back).
  The script shows translated messages for each code.
- `Cache-Control: no-store` on every response. Log codes only, never message content.

Tests (`node --test`): validation, normalisation, honeypot, origin check, size limit, success
and each failure mapping, against a fake `env.EMAIL`.

## 7. Featured designs data

- `scripts/export-featured-designs.py <catalog.db> <out.json>` reads the `.canopi` files named in
  `scripts/featured-designs.json` (path, id, name, designer, projectUrl, organisation, region,
  country). The `.canopi` files stay outside the repository. It opens the catalog read-only and
  never writes to it.
- Privacy contract: positions are metres from the design centre; the only geographic value is the
  pin, rounded to 0.1°. No notes, budget, calendar, views, stories, annotations, file names or
  owner data. A `node --test` check asserts this on the committed JSON: allowed keys only, pin
  values with one decimal, no other lon/lat anywhere.
- Adding a design: owner consent first, then a metadata entry, re-export, commit the JSON.
- `plant-symbols.json` is regenerated only when the app's symbol recipes change (export through a
  temporary vitest file in `canopi/desktop/web` that writes `PLANT_SYMBOL_RECIPES` through
  `plantSymbolPath`; delete it afterwards).

## 8. Assets and budgets

- Hero JPGs: 2400 px wide, quality 78, progressive (the compress script). Each under 460 KB; the
  1200 px variants under 160 KB. 44 files (11 locales × day/night × 2 sizes).
- The PNG originals stay out of git (about 110 MB). Keep them in the owner's archive.
- `og:image` per locale: 1200 × 630 crop of the day painting with the wordmark, generated by a
  script into `public/og/`.
- Initial JS (excluding MapLibre and the data files) under 30 KB gzipped. Data and MapLibre load
  near their sections.
- Delete: `public/demo-canopi-720.mp4`, `public/orchard-screenshot.png`, Inter and Lora fonts,
  the Liberapay link, the video markup and its strings. Update `scripts/check-built-site.mjs`:
  drop the poster and video assertions, add hero images, the contact form posting to
  `/api/contact`, no `contact@projectcanopi.com` in any built file, no `liberapay`.

## 9. Gates

`npm test`, `npm run build`, `node scripts/check-built-site.mjs`, then a Playwright pass on
`npm run preview` (or `wrangler dev` on the build): 1440 × 900 and 390 × 844, light and dark,
locales en, fr, ja and ru. Compare each section with the mockup; exercise the trail, tooltip,
map pin swap, both dialogs and the contact form against a local `send_email` simulation.

## 10. Release

- Work on the `overhaul` branch. Never push `master`: it deploys production.
- The new site ships with Canopi 2.0: set `CANOPI_VERSION = '2.0.0'` and the release date in
  `release.ts` only when the 2.0 installers are published under the permanent URLs.
- Merge to `master` on the owner's go, after the owner's setup below is done.

## 11. Owner setup (by hand)

1. **Email Routing on projectcanopi.com** (Cloudflare dashboard → the zone → Email → Email
   Routing). Enabling it replaces the zone's MX records: if the domain already receives mail
   elsewhere, stop and decide first. Add the destination address `projectcanopi@gmail.com` and
   click the verification link Cloudflare sends there. Add a routing rule
   `contact@projectcanopi.com` → `projectcanopi@gmail.com`.
2. **First deploy with the binding**: the `send_email` binding works only once the destination is
   verified. Send a test message from the live form and check Gmail (and its spam folder; mark it
   "not spam" once).
3. **Rate limit**: Security → WAF → Rate limiting rules: `http.request.method eq "POST" and
   http.request.uri.path eq "/api/contact"`, per IP, more than 3 requests in 10 s blocks for a few
   minutes.
4. **HelloAsso back office**: in the Canopi donation form's customisation, set the main colour to
   `#9C5A16` and upload the Canopi logo, so the embedded form matches the site.
5. **Featured design owners**: Aylin and Stéphane agreed to publication (2026-10-14). Ask again
   before adding new designs.

## 12. Later (not in this build)

Docs (set `DOCS_URL`), HelloAsso Checkout API with our own amount picker, more featured designs,
a "near you" sort of the list once there are many.
