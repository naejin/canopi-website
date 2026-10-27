---
type: Module
title: Consortium core
description: Format 2 types and the pure, dependency-free functions of the consortium tool (cell lookup, site fit, jobs, conflicts, greedy suggestion, swaps, share-link state), plus the export installer.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-27T19:31:20Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-27T19:32:12Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:3a1e2f34f37f8ca2
    last_modified: 2026-10-27T19:14:44Z
  - id: cells-ts
    resource: ../../src/lib/consortium/cells.ts
    title: src/lib/consortium/cells.ts
    digest: sha256:49c8e45ed5278bb3
    last_modified: 2026-10-27T19:14:44Z
  - id: site-ts
    resource: ../../src/lib/consortium/site.ts
    title: src/lib/consortium/site.ts
    digest: sha256:05510d4c61a00f5b
    last_modified: 2026-10-27T19:14:44Z
  - id: jobs-ts
    resource: ../../src/lib/consortium/jobs.ts
    title: src/lib/consortium/jobs.ts
    digest: sha256:ae4b3b9032f4aa31
    last_modified: 2026-10-27T19:14:44Z
  - id: conflicts-ts
    resource: ../../src/lib/consortium/conflicts.ts
    title: src/lib/consortium/conflicts.ts
    digest: sha256:8e8470b4f48f6782
    last_modified: 2026-10-27T19:14:44Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:47853219261dc098
    last_modified: 2026-10-27T19:14:44Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:abb7d497c9d2bb82
    last_modified: 2026-10-27T19:14:44Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:cbe8ebcba6ba1cd0
    last_modified: 2026-10-27T19:14:44Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:cd27c128542e480c
    last_modified: 2026-10-27T19:31:59Z
enforced_by:
  - scripts/consortium.test.mjs
  - scripts/install-consortium.test.mjs
---

# Responsibility

The data side of the consortium tool ([plan](/project/consortium-tool-plan.md), [owner decisions](/decisions/consortium-user-decisions.md)):
types mirroring canopi-data's export format 2, and pure functions with no DOM, Astro or package
imports, so `node --test` runs them and the app can reuse them after its 2.1 refactor. Modules
import each other with `.ts` extensions (Node strips the types). The installer puts a checked
export under `public/data/consortium/`.

# Key files

| File | Exports |
|---|---|
| [types.ts](../../src/lib/consortium/types.ts) | `Manifest`, `ManifestCell`, `Cell`, `Taxon`, `Traits`, `Warnings`, `Interaction`, `Source`, `Labels`; value lists `climateZones`, `regions`, `locales`, `phases`, `strata`, `functionIds`, `interactionTypes`; `FORMAT_VERSION` = 2 |
| [cells.ts](../../src/lib/consortium/cells.ts) | `cellFor(manifest, climate, region)` → `ManifestCell \| null`; `regionsOf(manifest, country)` → `Region[]`; `climateZoneOf`, `siteClimates`, `isSiteClimate`, `isRegion` |
| [site.ts](../../src/lib/consortium/site.ts) | `Site`, `DEFAULT_SITE` (sun, soil and water unsure, large garden), `fits(taxon, site)` → `{ ok, misfits, unknowns }` |
| [jobs.ts](../../src/lib/consortium/jobs.ts) | `jobs` (six ids), `jobsOf(taxon)`, `jobOfFunction`, `phaseBands`, `bandOf(phase)`, `bandsOf(taxon)` |
| [conflicts.ts](../../src/lib/consortium/conflicts.ts) | `conflicts(members, interactions)`, `conflictsOf(taxon, others, interactions)`, `matches(ref, taxon)`, `isSerious`, `invasiveIn(taxon, country)` → `true \| false \| null`, `invasiveCountries(taxon)` |
| [suggest.ts](../../src/lib/consortium/suggest.ts) | `gain(taxon, members, site)` (term by term), `suggest(cell, { site, kept, removed, country })` → `{ members, limit, gaps }`, `alternatives(memberId, consortium, cell, { site, removed, country })`, `GAIN_THRESHOLD`, `SIZE_LIMIT` |
| [state.ts](../../src/lib/consortium/state.ts) | `encodeState(state, cell?)` → `URLSearchParams`, `decodeState(params, cell?)` → `{ state, dropped }`, `resolveIds(tokens, cell)`, `shortId(id, cell?)` |
| [index.ts](../../src/lib/consortium/index.ts) | re-exports all of the above |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | `npm run install:consortium -- <export-dir> [--fixture] [--no-images] [--out <dir>]`; `installConsortium(...)`, `verifyExport`, `shapeErrors`, `thumbnailUrl` |

# Rules the code fixes (the plan left them open)

- **Site fit.** Light: sun/part/shade need `sun`/`semi_shade`/`full_shade`. Soil vs `soil_ph`: acid < 6, neutral 6–7.5, chalky > 7.5; a misfit only when the known bound rules out overlap. Water: dry is a misfit for drought tolerance Low/None (or, when that is unknown, moisture use High); wet is a misfit for `well_drained` true with drought tolerance High. Room: small ≤ 6 m, large ≤ 12 m on height and width; field anything. An unknown trait is never a misfit, only an unknown.
- **Gain.** `10·new jobs + 3·new (stratum × band) cells + 6·new stratum + 0.3·edibility − 0.5·unknowns`, where unknowns are the site checks `fits()` could not decide. Counted in integer tenths so ties are exact; added while gain > 5 and size < 6/8/10; ties by `canonical_name` in code-unit order (not `localeCompare`).
- **Suggest.** Kept plants come first and always stay, flagged or not (kept wins over removed; ids not in the cell are ignored). Automatic picks skip misfits, plants invasive in the user's country (`invasive_in: null` is not a reason), medium/high conflicts with a member, and removed ids. Every member carries `flags` (`misfits`, `unknowns`, `invasive`, `conflicts`, `flagged`).
- **Conflicts.** Rows match at species (canonical name), genus or family, in either member order; a same-genus row pairs two members once. `allelopathy_tolerant` rows are not conflicts.
- **Alternatives.** Same stratum, then most shared jobs, then gain against the rest, then name. Flagged plants are listed with flags; members and removed plants are not.
- **Share links.** Keys `v c r k l s w m p x`; site keys always written. Ids are shortened to the first 8 hex characters, lengthened at UUID segment boundaries (13, 18, 23, 36) when another taxon of the cell shares the prefix, joined with `.`. Decoding never throws; unknown, malformed, ambiguous and duplicate values go to `dropped`.

# Installer

- Refuses: a file not matching `SHA256SUMS`, a listed file missing, an unlisted `.json`, `format_version` ≠ 2, `canopi_db_sha256` all zeros without `--fixture`, a cell's sha256 or taxa/interactions count differing from the manifest, a missing required key or wrong type (hand-written from the schema's required lists; extra keys allowed), duplicate taxon ids, undefined source ids.
- Photos: once per taxon id, one request at a time with a 500 ms pause, `User-Agent: CanopiWebsite/1.0 (https://projectcanopi.com; contact form)`. Commons originals are fetched as **500 px** thumbnails: Commons answers HTTP 400 for non-standard widths such as 640 (https://w.wiki/GHai). SVG thumbnails get `.png`, TIFF `.jpg`. Rate limiting (429, 503) is waited out up to 4 retries (`Retry-After`, else 5 s doubling). Only a missing thumbnail (400, 404: a file narrower than 500 px) falls back to the original, never a rate-limited one; files over 3 MB, non-image types and SVG count as failed. A failed photo becomes `image: null` and is listed in the summary; more than 10% failing stops the install.
- Changed cells are re-serialised minified with their sha256 recomputed in the installed manifest; an installed `SHA256SUMS` lists every file, images included. The output directory is written beside the target and renamed into place.

# Gotchas

- Infos are cached per taxon object and site in a `WeakMap`: treat cell data as immutable once loaded.
- `npm test` covers this module in `scripts/consortium.test.mjs` (fixture data, a 200-taxon synthetic cell under 50 ms warm) and the installer in `scripts/install-consortium.test.mjs` (stub fetch, temporary output; never `public/`).
