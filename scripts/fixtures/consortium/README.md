# Illustrative consortium fixture (format 3)

Plausible but **invented** plant values for building and testing the consortium tool before real data exists.
Never shipped: `canopi_db_sha256` is all zeros, which a real install must reject, and the directory sits
outside `public/`, so it never reaches `dist/`. Built from the example in canopi-data `docs/consortium-export-format.md` and
valid against its `docs/consortium-export.schema.json` (format 3: one file per climate).

Climates: Tropical (southern_america, leads the mockups), Mediterranean (europe), Temperate (europe and an
invented asia_temperate cell, so Malus domestica and Allium schoenoprasum each show two `reasons`).
`countries` in the manifest is the real list from canopi-data, with the real GRIIS coverage (`invasive_checked`),
not invented; every `invasive_in` country is a checked one.

Covers: null versus `[]` (`invasive_in`, `toxicity`), `functions: null` and a taxon with no stratum or phases yet
(Zingiber officinale), invasive in a few or many countries, every toxicity level, genus, species and family-rank
interactions, allelopathy with and without a recorded target, `allelopathy_tolerant`, missing names per locale,
a climate with no interactions (`[]`, checked none), a reason per region with its source, countries GRIIS
does not cover (`invasive_checked: false`, for example TW, PR, PF and the six Antarctic codes).

Regenerate (needs ../canopi-data):

```sh
(cd ../canopi-data && uv run python -c 'import json; from pathlib import Path; from canopi.curated.regions import COUNTRIES; from canopi.curated.consortium_export import DEFAULT_GRIIS_PATH, griis_checked_countries as g; c = g(DEFAULT_GRIIS_PATH); print(json.dumps({k: {"invasive_checked": k in c} for k in COUNTRIES}))') > /tmp/countries.json
python3 -I scripts/fixtures/consortium/make_fixture.py scripts/fixtures/consortium /tmp/countries.json
```
