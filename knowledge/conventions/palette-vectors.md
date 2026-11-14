---
type: Convention
title: Palette vector files
description: Every JSON vector file of the Plant palette under scripts/vectors/ uses one envelope, modelled on canopi-data's range-verdict vectors, so the app's Rust code and canopi-data can run the same cases.
tags: [consortium, tests, vectors]
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-14T10:05:01Z }
sources:
  - id: architecture-plant-palette-architecture
    resource: /architecture/plant-palette-architecture.md
  - id: project-plant-palette-slices
    resource: /project/plant-palette-slices.md
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
