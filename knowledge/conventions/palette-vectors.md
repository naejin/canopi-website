---
type: Convention
title: Palette vector files
description: Every JSON vector file of the Plant palette under scripts/vectors/ uses one envelope, modelled on canopi-data's range-verdict vectors, so the app's Rust code and canopi-data can run the same cases.
tags: [consortium, tests, vectors]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T22:19:30Z }
sources:
  - id: architecture-plant-palette-architecture
    resource: /architecture/plant-palette-architecture.md
  - id: project-plant-palette-slices
    resource: /project/plant-palette-slices.md
  - id: link-v5-json
    resource: ../../scripts/vectors/link-v5.json
    title: scripts/vectors/link-v5.json
    digest: sha256:284d7031eff5e113
    last_modified: 2026-11-14T11:07:02Z
  - id: range-verdicts-json
    resource: ../../scripts/vectors/range-verdicts.json
    title: scripts/vectors/range-verdicts.json
    digest: sha256:950058cbfed10592
    last_modified: 2026-11-14T22:14:36Z
  - id: consortium-link-v5-test-mjs
    resource: ../../scripts/consortium-link-v5.test.mjs
    title: scripts/consortium-link-v5.test.mjs
    digest: sha256:da6bff4dfd200892
    last_modified: 2026-11-14T11:07:02Z
---

# Palette vector files

Decided 2026-11-14 (coordinator row "Plant palette plan amendments" (g) in [user decisions](/decisions/consortium-user-decisions.md); look-ahead check item 3). The first file, `scripts/vectors/link-v5.json`, lands in PP-B commit 0a with this envelope; the rest follow with their streams ([slices](/project/plant-palette-slices.md) section 0). No file exists yet.

## Why
Vector files are the lasting test layer: when a feature moves to the Canopi app, its Rust code runs the same cases. A file shaped around TypeScript types or i18n keys would have to be rewritten for each consumer.

## Envelope
```json
{
  "schema": "canopi-palette-<kind>/<n>",
  "source": "optional: where the expectations come from",
  "thresholds": { "optional": "named constants the cases rely on" },
  "plants": { "<id>": { "export snake_case fields": "..." } },
  "places": { "<name>": { "link v5 words": "..." } },
  "cases": [ { "name": "...", "covers": "optional rule or row id", "input": {}, "expect": {} } ]
}
```

Modelled on canopi-data's `tests/vectors/range_verdicts.json` (sibling repository, read 2026-11-14: `schema: canopi-range-verdicts/1`, keys `schema`, `thresholds`, `precision`, `source`, `branches`, `plants`, `sites`, `vectors`; 169 vectors), which keeps its own keys. A later file in either repository takes the envelope (ask DATA-15 in [the plan](/project/consortium-v2-plan.md)).

## Rules
- Plain JSON; plant fields use the export's and the manifest's snake_case names; place answers use the link v5 words ([architecture](/architecture/plant-palette-architecture.md) section 8.1).
- Cases hold rule outputs only, never TypeScript property names, i18n keys or rendered text. The adapter from TS types lives in the test file.
- `/n` stays when cases or optional fields are added; a change of meaning or a removed field is `/n+1`. A loader refuses a schema id it does not know.
- `npm run test:vectors` runs a shape check: a known schema id, and every plant and place a case names exists in the file.
- Release vectors from canopi-data (DATA-1's `range_verdicts.json`) are run from the installed release, never copied (one stamped copy with a release-id test until the installer change lands).

## Files planned
| File | Kind | Owner |
|---|---|---|
| `link-v5.json` | link decode and encode, extension rule | PP-B commit 0a |
| `verdicts.json`, `holes.json` | verdict and hole rules (website cases) | PP-B b2 |
| `weigh.json` | things to weigh | PP-B b3 |
| `plan.json` | planting plan | PP-D d1 |
| `season.json` | seasons and latitude bands | PP-G g1 |

## Files present (PP-B commit 0a, 2026-11-14)

- `scripts/vectors/link-v5.json` (schema `canopi-palette-link/5`) has five plants and five places.
  - About 63 named cases: the version-status table, decode cases (expected notice, state, `brings_place` or `same_as`) and encode cases.
  - `scripts/consortium-link-v5.test.mjs` runs it, and `npm run test:vectors` checks the envelope.
- `scripts/vectors/range-verdicts.json` is the stamped copy of canopi-data's `range_verdicts.json` (release `r-f3c6dd8b3c4391be`).
  - It stays in canopi-data's own shape, and `install-consortium.test.mjs` checks its sha and release id.
  - b2 reads it from the installed release once the installer carries it.

`link-v5.json` holds 82 cases since the coordinator review of 0a. It adds the privacy snap for encode and decode (with hemisphere, edge and antimeridian points), malformed `o` and `k` values, duplicate keys (the first wins), the `g`/`x` round trip with unknown tokens counted, and the dropped `h` metres. Decode cases may also expect `origin` (the cell read) and `reencoded` (the decoded state written back with the place tick).
