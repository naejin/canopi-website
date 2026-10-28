---
type: Module
title: Consortium core
description: Format 3 types and the pure, dependency-free functions of the consortium tool (climate file lookup, country checks, site fit, jobs, conflicts, greedy suggestion, swaps, share-link state), plus the export installer.
resource: ../../src/lib/consortium
tags: [module, consortium]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-28T18:58:02Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-10-28T09:55:54Z }
sources:
  - id: types-ts
    resource: ../../src/lib/consortium/types.ts
    title: src/lib/consortium/types.ts
    digest: sha256:8a20ea76eefa724c
    last_modified: 2026-10-28T12:22:08Z
  - id: climates-ts
    resource: ../../src/lib/consortium/climates.ts
    title: src/lib/consortium/climates.ts
    digest: sha256:8f5253475ea0a087
    last_modified: 2026-10-28T13:09:26Z
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
    digest: sha256:79476173394e0839
    last_modified: 2026-10-28T14:56:59Z
  - id: suggest-ts
    resource: ../../src/lib/consortium/suggest.ts
    title: src/lib/consortium/suggest.ts
    digest: sha256:6efa0ebd6e232793
    last_modified: 2026-10-28T18:44:38Z
  - id: state-ts
    resource: ../../src/lib/consortium/state.ts
    title: src/lib/consortium/state.ts
    digest: sha256:608ccc8a28fc24c7
    last_modified: 2026-10-28T14:56:59Z
  - id: index-ts
    resource: ../../src/lib/consortium/index.ts
    title: src/lib/consortium/index.ts
    digest: sha256:5d2de8846da93bef
    last_modified: 2026-10-28T12:22:08Z
  - id: install-consortium-mjs
    resource: ../../scripts/install-consortium.mjs
    title: scripts/install-consortium.mjs
    digest: sha256:7282971901bcffbc
    last_modified: 2026-10-28T12:08:03Z
enforced_by:
  - scripts/consortium.test.mjs
  - scripts/install-consortium.test.mjs
---

# Responsibility

The data side of the consortium tool ([plan](/project/consortium-tool-plan.md), [owner decisions](/decisions/consortium-user-decisions.md)):
types mirroring canopi-data's export format 3 (one plant list per climate, each plant with one
reason per region; `/home/daylon/projects/canopi-data/docs/consortium-export-format.md`), and pure functions with no DOM, Astro or package
imports, so `node --test` runs them and the app can reuse them after its 2.1 refactor. Modules
import each other with `.ts` extensions (Node strips the types). The installer puts a checked
export under `public/data/consortium/`.

# Key files

| File | Exports |
|---|---|
| [types.ts](../../src/lib/consortium/types.ts) | `Manifest` (`climates`, `countries: Record<code, { invasive_checked }>`), `ManifestClimate`, `ClimateFile` (`regions[]`), `Taxon` (`reasons: Reason[]`), `Reason` (`region`, `text`, `sources`), `Traits`, `Warnings`, `Interaction`, `Source`, `Labels`; value lists `climateZones`, `regions`, `locales`, `phases`, `strata`, `functionIds`, `interactionTypes`; `FORMAT_VERSION` = 3 |
| [climates.ts](../../src/lib/consortium/climates.ts) | `fileFor(manifest, climate)` → `ManifestClimate \| null`; `isCountry(manifest, code)`; `invasiveChecked(manifest, code)` (GRIIS checked that country); `climateZoneOf`, `siteClimates`, `isSiteClimate` |
| [site.ts](../../src/lib/consortium/site.ts) | `Site`, `DEFAULT_SITE` (sun, soil and water unsure, large garden), `fits(taxon, site)` → `{ ok, misfits, unknowns }` |
| [jobs.ts](../../src/lib/consortium/jobs.ts) | `jobs` (six ids), `jobsOf(taxon)`, `jobOfFunction`, `phaseBands`, `bandOf(phase)`, `bandsOf(taxon)` |
| [conflicts.ts](../../src/lib/consortium/conflicts.ts) | `conflicts(members, interactions)`, `conflictsOf(taxon, others, interactions)`, `matches(ref, taxon)`, `isSerious`, `invasiveIn(taxon, country, checked)` → `true \| false \| null` (null when the country is unchecked, the record unknown, or `checked` is not given as true: a caller that forgets the flag never gets "none") |
| [suggest.ts](../../src/lib/consortium/suggest.ts) | `gain(taxon, members, site)` (term by term), `suggest(file, { site, kept, removed, country, countryChecked })` → `{ members, limit, gaps }` (the only function that fills), `evaluate(cell, ids, { site, kept, country })` → the same `{ members, limit, gaps }` for a fixed list, never refilled, `alternatives(memberId, consortium, cell, { site, removed, country })`, `flagsFor(cell, id, memberIds, { site, country })` (the flags of one plant against a list: what Add uses to sort and confirm), `SIZE_LIMIT` |
| [state.ts](../../src/lib/consortium/state.ts) | `ConsortiumState` (`climate`, `country`, `noCountry`, `site`, `kept`, `removed`, `members`, `plants`, `crops`, `guests`), `encodeState(state, cell?, others?)` → `URLSearchParams`, `decodeState(params, cell?, others?)` → `{ state, dropped, version }`, `resolveState(decoded, cell, others?)`, `taxonByName(cell, name)` (a guide's plant: exact canonical name, else case and spacing aside), `resolveIds(tokens, pool, key?, match?)` (one prefix `matcher(pool)` per pool), `END_KEY` = `e` (`encodeState` writes `e=1` last, `decodeState` reports `ended`, so a link cut between two tokens is seen as cut; an unknown `v` reads no plant keys; every `g` value shares one cap and a repeated guest code is dropped as `duplicate`), `shortId(id, cell?)`, `MAX_LINK_IDS` = 2000, `MAX_CROPS` = 3, `GUEST_CODES` (two letters per climate), `LINK_VERSION` = 3, `NO_COUNTRY` = `-` |
| [index.ts](../../src/lib/consortium/index.ts) | re-exports all of the above |
| [install-consortium.mjs](../../scripts/install-consortium.mjs) | `npm run install:consortium -- <export-dir> [--fixture [--no-images]] [--out <dir>]`; `installConsortium(...)`, `verifyExport`, `verifyInstall(dir, { fixture })` (re-checks an installed folder: manifest, labels, `SHA256SUMS`, each climate file's sha256, regions, shape, counts, sources and `ruleProblem`, every photo a local file that exists; `check-built-site.mjs` runs it on `dist/`), `shapeErrors`, `cellShape`, `ruleProblem(file, climateFile, countries)`, `isHttpUrl`, `thumbnailUrl`, `STAGING_DIR`, `stagingDirFor(out)` |

# Rules the code fixes (the plan left them open)

- **Site fit.** Light: sun/part/shade need `sun`/`semi_shade`/`full_shade`. Soil vs `soil_ph`: acid < 6, neutral 6–7.5, chalky > 7.5; a misfit only when the known bound rules out overlap. Water: dry is a misfit for drought tolerance Low/None (or, when that is unknown, moisture use High); wet is a misfit for `well_drained` true with drought tolerance High (or, when that is unknown, moisture use Low: the 2026-10-27 export's thyme, sage and *Asparagus acutifolius*). Room: small ≤ 6 m, large ≤ 12 m on height and width; field anything. An unknown trait is never a misfit, only an unknown.
- **Gain.** `10·new jobs + 3·empty (stratum × band) cells + 1·cells with one member + 6·new stratum + 8·bands with no food yet (crops) + 4·second doer of feeds_soil/ground/mulch + 1·edibility − 3·weed potential − 0.5·unknowns`, where unknowns are the site checks `fits()` could not decide. Counted in integer tenths so ties are exact. Only plants that fill a gap (a new job, a cell with fewer than two members, a band with no food, a key job with one doer) are picked, until size = 6/9/12; ties go to the plant with more `names` (better known), then `canonical_name` in code-unit order (not `localeCompare`). On the 2026-10-28 format 3 export (three climate files, 200 plants each) the default site (full sun, soil and water not sure) fills every climate to its limit in each room, but 50 of the 432 site combinations (3 climates × 3 lights × 4 soils × 4 waters × 3 rooms) fill fewer places than the room allows, because too few plants fit; the slowest of the 432 took 42 ms (cold). A short consortium is expected, not a bug: the page reports the free places.
- **Evaluate.** `evaluate()` scores a fixed list (the page's state after a Remove, whose gap stays, or a restored link): members in the order given, repeats and ids not in the file ignored, the same flags as `suggest()` (one shared code path), a gain of what each adds to those before it (null when kept), and the gaps. The ids of a suggestion give that suggestion back.
- **Suggest.** Kept plants come first and always stay, flagged or not (kept wins over removed; ids not in the cell are ignored). Automatic picks skip misfits, medium/high conflicts with a member, and removed ids; a plant whose only misfit is light is a candidate, and is picked only while the members chosen so far shade it (`siteMisfits(i, strata, site)` read at each pick, scale-b fix2 H12), so Fill and the flags use one shade rule. The country never changes the plants (owner, 2026-10-28): a plant invasive in it is still picked, and carries `flags.invasive === true` as a warning. `flagged` (what keeps a plant out of automatic picks and makes Add or Swap ask first) is a misfit or a medium/high conflict only. A shaded lower layer (decision row "Scale build, coordinator choices"; design-scale.md §2.6 m10, scale-b fix): on a sunny site, a Mid or Low plant that does not take full sun is not a light misfit while another member grows in a layer above it (Emergent or High over Mid; any of them over Low); a top-layer plant, or one with nothing above it, keeps the flag (`shaded`/`siteMisfits` in suggest.ts, read by `evaluate`, `suggest` (its picks too), `flagsFor` and `alternatives` alike; at 200 Temperate plants in a field, "With a warning" counts 29 with France, 26 with no country). Every member carries `flags` (`misfits`, `unknowns`, `invasive`, `conflicts`, `flagged`); `invasive` is null when the country is unset or `countryChecked` is not true; the `Country` option type requires `countryChecked` whenever `country` is a string.
- **Conflicts.** Rows match at species (canonical name), genus or family, in either member order; a same-genus row pairs two members once. `allelopathy_tolerant` rows are not conflicts. `suggest()`'s exclusion of medium/high partners is built from `conflicts()` over the whole cell, so it matches exactly as the flags do.
- **Alternatives.** Plants without a flag first, flagged ones (misfit, medium/high conflict) last so the page can list them under a warning; within each, same stratum, then most shared jobs, then gain against the rest, then better known, then name. Members and removed plants are not listed.
- **Share links (v3, 2026-10-28).** Keys `v c k l s w m a p x n g`; site keys always written. `k` is written only when the state has a country (the page leaves out a guessed one); `k=-` (`NO_COUNTRY`) is "No country", which the page writes only to its local save. `a` is the members in order, a kept member marked with a leading `*` (absent: the page suggests; present: it calls `evaluate()`); `p` kept plants that are not members; `x` removed; `n` main crops (at most `MAX_CROPS`, each a kept member); `g` plants added from another climate's list, one `g` per list: its `GUEST_CODES` code then its tokens. A token is 6 base64url characters (the first 36 bits of the id), or `.` plus 22 characters (the whole id) when another taxon of the pool shares those bits; tokens are joined without a separator. At 200 plants (190 kept, 2 crops) a link is about 1,500 characters, against about 3,600 in v2. At most `MAX_LINK_IDS` tokens are read per key, the rest reported once as `excess` with their count. v2 links (8-hex prefixes joined with `.`, `p` for kept) still decode, with `version: 2`; links from the region era carry `r` and `b`, ignored silently. Decoding never throws; unknown, malformed, ambiguous, duplicate and excess values go to `dropped` (a dropped v3 token is reported as its 9 hex characters).
- **Guests.** `suggest`, `evaluate`, `flagsFor` and `alternatives` take `guests?: Taxon[]` (plants of another list the page added): they count as members for jobs, layers and conflicts but are never suggested.
- **Resolution.** The page decodes without the climate file (`c` chooses it), then calls `resolveState(decoded, cell)`: prefixes become full ids, and the list rules are applied again on full ids (kept wins over removed; a member is never removed; with `a`, every kept plant is a member). `decodeState(params, cell)` does the same in one call.
- **Guide preset.** `?plant=<canonical_name>&climate=<id>`: `climate` is read when `c` is absent (`c` wins, `climate` dropped as a duplicate); `plant` waits in `state.plants` until `resolveState()`, which keeps it when the cell has that canonical name (exact, else case and spacing aside) and drops it as `unknown` otherwise. `encodeState` writes only the short keys.

# Installer

- Refuses, before any work: `--no-images` without `--fixture` (a real install always copies its photos), and an `--out` that exists, is not empty and holds no previous install (the `INSTALLED_BY` mark every install writes; a canopi-data export has a format 3 manifest too and is not in git), and an `--out` that is, holds or sits inside the export directory.
- Refuses: a file not matching `SHA256SUMS`, a listed file missing, an unlisted `.json`, `format_version` ≠ 3, `canopi_db_sha256` all zeros without `--fixture`, a climate file's sha256, regions or taxa/interactions count differing from the manifest, a climate listed twice, a country key that is not two capitals, a missing required key or wrong type (hand-written from the schema's required lists; extra keys allowed), an `edibility_rating` outside the integers 0–5, a `sources[].url` or `image.source_page_url` that is not an http(s) URL, a `names`, `reasons[].text` or `note` key or a manifest locale outside the 11 site locales, a `labels.json` that is not trait → English value → locale → text, duplicate taxon ids, undefined source ids (reasons included). `ruleProblem` adds the rules the schema cannot express: a taxon's reasons are one per region in region order and each region is in the file's `regions`; the file's `regions` are exactly the union of its reasons' regions; every `invasive_in` country is a manifest country with `invasive_checked: true`.
- Photos: an image url that is not http(s) (protocol-relative, `data:`) becomes `image: null`. The rest are fetched once per taxon id, one request at a time with a 500 ms pause, `User-Agent: CanopiWebsite/1.0 (https://projectcanopi.com; contact form)`. Commons originals are fetched as **500 px** thumbnails: Commons answers HTTP 400 for non-standard widths such as 640 (https://w.wiki/GHai). SVG thumbnails get `.png`, TIFF `.jpg`. iNaturalist open-data `original.<ext>` photos are fetched as `medium.<ext>` (500 px). Rate limiting (429, 503) is waited out up to 4 retries (`Retry-After`, else 5 s doubling). Only a missing smaller copy (400, 403, 404: a Commons file narrower than 500 px; S3 answers 403 for a missing key) falls back to the original, never a rate-limited one; files over 3 MB (a larger `content-length` refused unread, a body without one cancelled once it passes 3 MB), non-image types and SVG count as failed. Redirects are followed by hand (at most 5) only to the host first asked or to `PHOTO_HOSTS` (upload.wikimedia.org, inaturalist-open-data.s3.amazonaws.com); any other is a failure. Every body not kept (redirects, 429/503 before a retry, errors) is cancelled before the next request. A failed photo becomes `image: null` and is listed in the summary; more than 10% failing stops the install.
- Changed climate files are re-serialised minified with their sha256 recomputed in the installed manifest; an installed `SHA256SUMS` lists every file, images included. The output is written in a staging directory, `.cache/consortium-install/` (git-ignored, outside `public/`, so `astro build` never ships leftovers; an `--out` outside the repository stages in `.consortium-install/` beside it, as a rename needs one file system), then renamed into place. Each run first removes the staging directory and any `consortium.tmp-<pid>`/`.old-<pid>` folders older versions left beside the output.

# Gotchas

- Infos are cached per taxon object and site in a `WeakMap`: treat climate file data as immutable once loaded.
- A taxon may be in several climate files (same id); photos are fetched once per id.
- Parameters and page variables are still called `cell` (one loaded climate file): a name kept from format 2, not a separate notion.
- `npm test` covers this module in `scripts/consortium.test.mjs` (fixture data, a 200-taxon synthetic file timed cold against a same-process baseline, under 2.5 times it; `CONSORTIUM_PERF=1` adds the 50 ms budget) and the installer in `scripts/install-consortium.test.mjs` (stub fetch, temporary output; never `public/`).
