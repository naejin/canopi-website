---
type: Project
title: Consortium tool plan (beta)
description: Scope, user paths, data path, scoring contract, states and tests for the beta consortium design tool.
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T08:10:59Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T11:18:29Z }
sources:
  - id: decisions-consortium-user-decisions
    resource: /decisions/consortium-user-decisions.md
  - id: readme-md
    resource: ../../scripts/fixtures/consortium/README.md
    title: scripts/fixtures/consortium/README.md
    digest: sha256:643678089284138e
    last_modified: 2026-10-28T11:18:02Z
  - id: base-astro
    resource: ../../src/layouts/Base.astro
    title: src/layouts/Base.astro
    digest: sha256:e063655df7532635
    last_modified: 2026-10-27T19:02:45Z
  - id: climates-ts
    resource: ../../src/data/climates.ts
    title: src/data/climates.ts
    digest: sha256:42b3b2e5b9af2739
    last_modified: 2026-10-26T23:34:11Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:ced492870b65c23c
    last_modified: 2026-10-28T02:41:10Z
  - id: consortium-app-js
    resource: ../../src/scripts/consortium/app.js
    title: src/scripts/consortium/app.js
    digest: sha256:7d820394d21b0e50
    last_modified: 2026-10-28T08:25:21Z
  - id: consortium-css
    resource: ../../src/styles/consortium.css
    title: src/styles/consortium.css
    digest: sha256:8fd5b17b2c562304
    last_modified: 2026-10-28T08:18:06Z
---

Owner decisions: [Consortium tool — user decisions](/decisions/consortium-user-decisions.md).
They win over this plan. Data contract: canopi-data `docs/consortium-export-format.md`
and `docs/consortium-export.schema.json`, format 2.

## Release scope (beta)
- One page, `/consortium/` (English and 9 locales: `/<lang>/consortium/`),
  `/fr/guilde/` in French. Title "Design a consortium" / « Composer une guilde »,
  a **Beta** badge and a feedback link to the site's contact form.
- Three cells: Temperate × europe, Mediterranean × europe,
  Tropical × southern_america. Every other (climate, region) shows the
  "not covered yet" state of the decision log.
- No Open in Canopi, no saved-design list, no backend.

## User paths
1. **Set the place.** Climate (the shared site choice, `canopi-climate`; nothing
   preselected when unset: never default to temperate) and "Where do you garden?"
   (country search, names from `Intl.DisplayNames` in the page language; the
   browser's region offered as a one-tap suggestion, never applied silently;
   "Rather not say" → pick one of 8 regions). The region is shown and editable.
2. **Describe the site** (optional, defaults shown): light (full sun / part shade /
   shade), soil (acid / neutral / chalky / not sure), water (dry / average / wet /
   not sure), room (small garden ≤ 6 m / large garden ≤ 12 m / field; default
   large garden).
3. **Start from a plant or let it suggest.** Search a crop of the cell ("I want to
   grow…") or "Suggest a consortium". The tool fills a consortium around the
   chosen plants.
4. **Read the consortium** in three views: **Layers** (profile drawing by stratum
   with HTML labels, plus a list by stratum), **Over time** (phase bands, plain
   time words first: "Years 1–3 · Placenta 3"), **Jobs** (six plain jobs: who does
   each, gaps named).
5. **Adjust.** Per plant: details (photo if any, reason, traits, sources,
   warnings, guides that cover it), Swap (ranked alternatives of the same stratum
   and jobs; flagged ones shown with their warning), Remove (gap stays, Undo),
   Keep (pinned plants survive site changes). Add a plant (search).
6. **Share or print.** A link restores the exact state; the last consortium on this
   device is restored on return; print view lists plants by stratum and phase.
7. **Learn.** Explain popovers on strata, phases and jobs link to guides; guides
   open the tool preset (`?plant=<canonical_name>&climate=<id>`). A preset's
   climate applies to that consortium only and never changes the shared site
   climate (`canopi-climate`); only a climate the reader picks in the tool does.
   A preset without a place reuses the place of the consortium saved on this
   device, and says so.

## Data path
- `scripts/install-consortium.mjs <export-dir>`: verifies `SHA256SUMS`, the
  manifest (format_version 2, each cell's sha256, taxa/interactions counts),
  validates each cell against the schema's required shape (structural checks,
  no dependency), and copies `manifest.json`, `labels.json` and the cell files to
  `public/data/consortium/`. It refuses `canopi_db_sha256` of all zeros (the
  fixture) unless `--fixture` (tests only). Committed output; run by hand.
- Photos: the installer downloads each `image.url` once into
  `public/data/consortium/images/<id>.<ext>` and rewrites `url` locally; credit,
  licence and source page stay. Missing photo = no photo.
- Client loads the manifest, then one cell file (`fetch`, cached in memory).

## Scoring module (`src/lib/consortium/`, dependency-free TypeScript)
Types mirror format 2. Pure functions, unit-tested with `node --test`:
- `cellFor(manifest, climate, region)` → file or null; `regionsOf(manifest, country)`.
- `fits(taxon, site)` → `{ ok, misfits[] }` using traits (sun/semi/full shade,
  soil pH range, drought/moisture, `height_m.max`/`width_max_m` vs room). Unknown
  trait = no misfit (counts as an unknown).
- `jobsOf(taxon)`: crop role → `feeds_you`; functions → `feeds_soil`
  (nitrogen_fixer), `mulch` (mulch, dynamic_accumulator), `ground` (ground_cover),
  `helpers` (insectary, pollinator_forage), `shelter` (windbreak, pest_repellent,
  trap_crop, wildlife_habitat).
- `conflicts(consortium, interactions)`: pairs matched at rank (genus/family).
- `suggest(cell, site, kept, removed, country)`: greedy, deterministic. Each
  round adds the candidate with the highest gain
  `10·new jobs + 3·empty (stratum × phase band) cells + 1·cells with one member + 6·new stratum + 8·phase bands with no food yet (crops) + 4·second doer of feeds-soil, ground or mulch + 1·edibility − 3·weed potential − 0.5·unknown traits`,
  among plants that fill a gap (a new job, a cell with fewer than two members,
  a phase band with no food yet, or a second doer of a key job that has one),
  until size = limit (small 6, large 9, field 12); ties go to the
  plant named in more languages (a widely grown one), then `canonical_name`.
  (Amended 2026-10-27: the first rule, gain > 5 with 0.3·edibility, stopped the
  real cells at 4–7 plants, and name-order ties picked obscure plants; the
  mockup reviewer asked for food in every phase band and backed-up key jobs.) Excluded from automatic picks: misfits, invasive in the user's
  country, a medium/high conflict with a member, removed plants. Kept plants are
  always members.
- `evaluate(cell, ids, options)`: the same members, flags and gaps for a fixed
  list, never refilled (Remove leaves its gap; a link restores its members).
- `alternatives(member, …)`: unflagged before flagged, then same stratum, shared jobs, gain;
  flagged ones included and marked.
- `encodeState`/`decodeState`/`resolveState`: URL query (`c`, `r` the user's
  region, `b` the borrowed cell's region, `k` country, site keys,
  `p` = taxon ids kept, `x` removed, `a` members in order, `v` = format
  version; guide presets `plant`, `climate`); unknown ids are dropped with a
  notice.
Recompute < 50 ms for 200 taxa.

## UI states (each in the mockup and in browser checks)
First visit (nothing chosen), choosing climate/country, no match for the site,
loading, error (fetch fails: retry), cell not covered (with opt-in), result,
plant details, swap list, removed with Undo, warnings (toxicity, invasive in your
country, invasive elsewhere count, conflict, allelopathic, misfit), `null`
versus `[]` (unknown versus checked none), old share link (dropped ids), print.

## Interface languages
All 11 locales for the interface (`consortium.*` keys in every translation file).
Plant names from `names[lang]`, fallback English then the scientific name; the
scientific name is shown beside the name in every list (rows, Swap, Add, Over
time, Jobs, the drawing's numbered key, print) and in details. The desktop
drawing's column labels and sentences that name plants (toasts, gap rows) show
the name only, for space. `reason`/notes: the locale's text if present
(en, fr), else English marked `lang="en"`. Strata labels: the app's (en
Emergent/High/Mid/Low; fr Émergent/Haut/Moyen/Bas). Phases: plain time words +
app term. Region names translated (8 × 11).

## Entry points (decision log)
Header item (inline ≥ 640 px; phone Menu below), measured at 640 px in all 11
locales; footer link; home section after Start here; guides index and
bibliography mention it (Learn section); guides → tool preset links;
plant details → guides (hand-made map `src/data/consortium-guides.ts`,
canonical name → guide slugs).

## Site changes needed
- Per-locale slugs: `Base`'s alternates and the header's language menu take a
  per-locale path (`paths?: Partial<Record<Locale, string>>`); the built-site
  check follows. All existing pages keep one path.
- Warning tokens (`--warning`, `--warning-bg`, `--warning-line`, light and
  dark) in `tokens.css`; strata colours (Okabe-Ito: emergent #E69F00, high
  #009E73, mid #0072B2, low #CC79A7) only in the drawing (with its numbered
  labels, strata lines and key) and the strata legend; elsewhere the stratum
  word, and number rings and timeline bars in neutral ink.
- Climate ids: data `Tropical` ↔ site `tropical` (lowercase at the module edge).

## Budgets
Cell file ≤ 100 KB compressed; tool JS ≤ 30 KB compressed; LCP ≤ 2.5 s on slow
4G; no layout shift when data arrives; works at 320 px; keyboard complete;
WCAG AA contrast in both themes.

## Testing (agent-only, owner decision)
- `node --test` units for the scoring module and state encoding (fixture data).
- `npm test` translation parity covers the new keys; built-site check asserts
  the page in 11 locales (title, hreflang with per-locale slugs, header item,
  data files present, no fixture data shipped).
- Browser: headless Chrome via CDP at 390 and 1280 px, light/dark, en/fr/de/ja:
  each user path scripted; accessibility tree snapshot; axe-core injected from a
  pinned copy in the scratch area (not a dependency); keyboard walk; an agent
  usability walkthrough. No real screen-reader pass (noted at handoff).

## Order
1. Data: curate and accept the 3 cells (canopi-data), export, install.
2. Mockup artifact (all states, switches), reviewer critique, iterate.
3. Build: site seams (slugs, tokens), scoring module + tests, page and island,
   entry points, translations, installer.
4. Browser checks, reviews, fixes, until clean. Owner reviews locally.
