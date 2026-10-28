---
type: Module
title: Consortium core
description: Format 2 types and the pure, dependency-free functions of the consortium tool (cell lookup, site fit, jobs, conflicts, greedy suggestion, swaps, share-link state), plus the export installer.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T02:42:43Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-27T21:39:25Z }
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
    digest: sha256:4f10399cd9863a0a
    last_modified: 2026-10-27T20:00:11Z
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
    digest: sha256:ced492870b65c23c
    last_modified: 2026-10-28T02:41:10Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:3fa89b2af0f2dffb
    last_modified: 2026-10-27T22:35:16Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:cbe8ebcba6ba1cd0
    last_modified: 2026-10-27T19:14:44Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:99377319b7f988d0
    last_modified: 2026-10-28T02:33:09Z
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
| [suggest.ts](../../src/lib/consortium/suggest.ts) | `gain(taxon, members, site)` (term by term), `suggest(cell, { site, kept, removed, country })` → `{ members, limit, gaps }` (the only function that fills), `evaluate(cell, ids, { site, kept, country })` → the same `{ members, limit, gaps }` for a fixed list, never refilled, `alternatives(memberId, consortium, cell, { site, removed, country })`, `flagsFor(cell, id, memberIds, { site, country })` (the flags of one plant against a list: what Add uses to sort and confirm), `SIZE_LIMIT` |
| [state.ts](../../src/lib/consortium/state.ts) | `ConsortiumState` (`climate`, `region`, `cellRegion`, `country`, `site`, `kept`, `removed`, `members`, `plants`), `encodeState(state, cell?)` → `URLSearchParams`, `decodeState(params, cell?)` → `{ state, dropped }`, `resolveState(decoded, cell)`, `taxonByName(cell, name)` (a guide's plant: exact canonical name, else case and spacing aside), `resolveIds(tokens, cell)`, `shortId(id, cell?)`, `MAX_LINK_IDS` = 256 |
| [index.ts](../../src/lib/consortium/index.ts) | re-exports all of the above |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | `npm run install:consortium -- <export-dir> [--fixture [--no-images]] [--out <dir>]`; `installConsortium(...)`, `verifyExport`, `verifyInstall(dir, { fixture })` (re-checks an installed folder: manifest, labels, `SHA256SUMS`, each cell's sha256, shape, counts and sources, every photo a local file that exists; `check-built-site.mjs` runs it on `dist/`), `shapeErrors`, `cellShape`, `isHttpUrl`, `thumbnailUrl`, `STAGING_DIR`, `stagingDirFor(out)` |

# Rules the code fixes (the plan left them open)

- **Site fit.** Light: sun/part/shade need `sun`/`semi_shade`/`full_shade`. Soil vs `soil_ph`: acid < 6, neutral 6–7.5, chalky > 7.5; a misfit only when the known bound rules out overlap. Water: dry is a misfit for drought tolerance Low/None (or, when that is unknown, moisture use High); wet is a misfit for `well_drained` true with drought tolerance High (or, when that is unknown, moisture use Low: the 2026-10-27 export's thyme, sage and *Asparagus acutifolius*). Room: small ≤ 6 m, large ≤ 12 m on height and width; field anything. An unknown trait is never a misfit, only an unknown.
- **Gain.** `10·new jobs + 3·empty (stratum × band) cells + 1·cells with one member + 6·new stratum + 8·bands with no food yet (crops) + 4·second doer of feeds_soil/ground/mulch + 1·edibility − 3·weed potential − 0.5·unknowns`, where unknowns are the site checks `fits()` could not decide. Counted in integer tenths so ties are exact. Only plants that fill a gap (a new job, a cell with fewer than two members, a band with no food, a key job with one doer) are picked, until size = 6/9/12; ties go to the plant with more `names` (better known), then `canonical_name` in code-unit order (not `localeCompare`). On the 2026-10-27 export every cell and room fills to its limit, in under 30 ms.
- **Evaluate.** `evaluate()` scores a fixed list (the page's state after a Remove, whose gap stays, or a restored link): members in the order given, repeats and ids not in the cell ignored, the same flags as `suggest()` (one shared code path), a gain of what each adds to those before it (null when kept), and the gaps. The ids of a suggestion give that suggestion back.
- **Suggest.** Kept plants come first and always stay, flagged or not (kept wins over removed; ids not in the cell are ignored). Automatic picks skip misfits, plants invasive in the user's country (`invasive_in: null` is not a reason), medium/high conflicts with a member, and removed ids. Every member carries `flags` (`misfits`, `unknowns`, `invasive`, `conflicts`, `flagged`).
- **Conflicts.** Rows match at species (canonical name), genus or family, in either member order; a same-genus row pairs two members once. `allelopathy_tolerant` rows are not conflicts. `suggest()`'s exclusion of medium/high partners is built from `conflicts()` over the whole cell, so it matches exactly as the flags do.
- **Alternatives.** Plants without a flag first, flagged ones (misfit, invasive here, medium/high conflict) last so the page can list them under a warning; within each, same stratum, then most shared jobs, then gain against the rest, then better known, then name. Members and removed plants are not listed.
- **Share links.** Keys `v c r b k l s w m p x a`; site keys always written. `r` is the user's region, `b` the region of the cell shown when the user opted into another region's cell (written only when it differs), `a` the members in order (absent: the page suggests; present: it calls `evaluate()`). Old links without `b` or `a` decode as before, so `v` stays 2. Ids are shortened to the first 8 hex characters, lengthened at UUID segment boundaries (13, 18, 23, 36) when another taxon of the cell shares the prefix, joined with `.`; at most `MAX_LINK_IDS` tokens are read per key, the rest reported once as `excess` with their count. Decoding never throws; unknown, malformed, ambiguous, duplicate and excess values go to `dropped`.
- **Resolution.** The page decodes without the cell (`c`, `r` and `b` choose it), then calls `resolveState(decoded, cell)`: prefixes become full ids, and the list rules are applied again on full ids (kept wins over removed; a member is never removed; with `a`, every kept plant is a member). `decodeState(params, cell)` does the same in one call.
- **Guide preset.** `?plant=<canonical_name>&climate=<id>`: `climate` is read when `c` is absent (`c` wins, `climate` dropped as a duplicate); `plant` waits in `state.plants` until `resolveState()`, which keeps it when the cell has that canonical name (exact, else case and spacing aside) and drops it as `unknown` otherwise. `encodeState` writes only the short keys.

# Installer

- Refuses, before any work: `--no-images` without `--fixture` (a real install always copies its photos), and an `--out` that exists, is not empty and holds no previous install (the `INSTALLED_BY` mark every install writes; a canopi-data export has a format 2 manifest too and is not in git), and an `--out` that is, holds or sits inside the export directory.
- Refuses: a file not matching `SHA256SUMS`, a listed file missing, an unlisted `.json`, `format_version` ≠ 2, `canopi_db_sha256` all zeros without `--fixture`, a cell's sha256 or taxa/interactions count differing from the manifest, a missing required key or wrong type (hand-written from the schema's required lists; extra keys allowed), an `edibility_rating` outside the integers 0–5, a `sources[].url` or `image.source_page_url` that is not an http(s) URL, a `names`, `reason` or `note` key or a manifest locale outside the 11 site locales, a `labels.json` that is not trait → English value → locale → text, duplicate taxon ids, undefined source ids.
- Photos: an image url that is not http(s) (protocol-relative, `data:`) becomes `image: null`. The rest are fetched once per taxon id, one request at a time with a 500 ms pause, `User-Agent: CanopiWebsite/1.0 (https://projectcanopi.com; contact form)`. Commons originals are fetched as **500 px** thumbnails: Commons answers HTTP 400 for non-standard widths such as 640 (https://w.wiki/GHai). SVG thumbnails get `.png`, TIFF `.jpg`. iNaturalist open-data `original.<ext>` photos are fetched as `medium.<ext>` (500 px). Rate limiting (429, 503) is waited out up to 4 retries (`Retry-After`, else 5 s doubling). Only a missing smaller copy (400, 403, 404: a Commons file narrower than 500 px; S3 answers 403 for a missing key) falls back to the original, never a rate-limited one; files over 3 MB (a larger `content-length` refused unread, a body without one cancelled once it passes 3 MB), non-image types and SVG count as failed. Redirects are followed by hand (at most 5) only to the host first asked or to `PHOTO_HOSTS` (upload.wikimedia.org, inaturalist-open-data.s3.amazonaws.com); any other is a failure. Every body not kept (redirects, 429/503 before a retry, errors) is cancelled before the next request. A failed photo becomes `image: null` and is listed in the summary; more than 10% failing stops the install.
- Changed cells are re-serialised minified with their sha256 recomputed in the installed manifest; an installed `SHA256SUMS` lists every file, images included. The output is written in a staging directory, `.cache/consortium-install/` (git-ignored, outside `public/`, so `astro build` never ships leftovers; an `--out` outside the repository stages in `.consortium-install/` beside it, as a rename needs one file system), then renamed into place. Each run first removes the staging directory and any `consortium.tmp-<pid>`/`.old-<pid>` folders older versions left beside the output.

# Gotchas

- Infos are cached per taxon object and site in a `WeakMap`: treat cell data as immutable once loaded.
- `npm test` covers this module in `scripts/consortium.test.mjs` (fixture data, a 200-taxon synthetic cell under 50 ms warm) and the installer in `scripts/install-consortium.test.mjs` (stub fetch, temporary output; never `public/`).
