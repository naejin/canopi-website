---
type: Reference
title: canopi-climate tile format
description: Pointer to the crate-owned normative tile format (docs/format.md, v0.2.1) and the release vectors the website consumes.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-12T22:13:45Z }
sources:
  - id: github-com-opencanopi-canopi-climate-blo
    resource: https://github.com/opencanopi/canopi-climate/blob/v0.2.1/docs/format.md
  - id: model-js
    resource: ../../src/lib/climate/model.js
    title: src/lib/climate/model.js
    digest: sha256:23fa6d9b282cd681
    last_modified: 2026-11-12T20:26:30Z
  - id: install-climate-mjs
    resource: ../../scripts/install-climate.mjs
    title: scripts/install-climate.mjs
    digest: sha256:596d9ed4bffe0aeb
    last_modified: 2026-11-12T20:26:30Z
---

# canopi-climate tile format

The normative contract for the climate and site-layer tiles the website reads lives in the crate: `docs/format.md` in opencanopi/canopi-climate (since v0.2.1). It covers the container, georeferencing and grid edges, bands per layer with units and scales, encodings, lookup semantics, the Köppen legend, mask bits reserved for v0.3, error kinds and the compatibility rule.

- The website reader (`src/lib/climate/`) refuses at least what the crate refuses; the crate is stricter in three documented places.
- Each release publishes `vectors/lookup.json` (54 reference points); step E5a wires them into the website's tests.
- The installer compares every soil and regions band's id, unit, scale and offset (`scripts/install-climate.mjs`), so a unit change is refused instead of shipping wrong values.

Related: [climate reader](/modules/climate-reader.md), [plan](/project/consortium-v2-plan.md).
