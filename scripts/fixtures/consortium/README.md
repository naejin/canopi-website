# Illustrative consortium fixture (format 2)

Plausible but **invented** plant values for building and testing the consortium tool before real data exists.
Never shipped: `canopi_db_sha256` is all zeros, which a real install must reject, and the directory sits
outside `public/`, so it never reaches `dist/`. Built from the example in canopi-data `docs/consortium-export-format.md` and
valid against its `docs/consortium-export.schema.json` (format 2).

Cells: Tropical × southern_america (leads the mockups), Mediterranean × europe, Temperate × europe.
`country_regions` in the manifest is the real table from canopi-data, not invented.

Covers: null versus `[]` (`invasive_in`, `toxicity`), `functions: null` and a taxon with no stratum or phases yet
(Zingiber officinale), invasive in a few or many countries, every toxicity level, genus, species and family-rank
interactions, allelopathy with and without a recorded target, `allelopathy_tolerant`, missing names per locale,
a cell with no interactions (`[]`, checked none).

Regenerate (needs ../canopi-data):

```sh
(cd ../canopi-data && uv run python -c 'import json; from canopi.curated.regions import COUNTRY_REGIONS as C; print(json.dumps({k: list(v) for k, v in C.items()}))') > /tmp/country_regions.json
python3 -I scripts/fixtures/consortium/make_fixture.py scripts/fixtures/consortium /tmp/country_regions.json
```
