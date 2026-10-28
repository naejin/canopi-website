# Illustrative consortium fixture (format 3)

Plausible but **invented** plant values for building and testing the consortium tool before real data exists.
Never shipped: `canopi_db_sha256` is all zeros, which a real install must reject, and the directory sits
outside `public/`, so it never reaches `dist/`. Built from the example in canopi-data `docs/consortium-export-format.md` and
valid against its `docs/consortium-export.schema.json` (format 3: one file per climate).

Climates: Tropical (southern_america, leads the mockups), Mediterranean (europe), Temperate (europe and an
invented asia_temperate cell, so Malus domestica and Allium schoenoprasum each show two `reasons`, and
Elaeagnus multiflora has only an asia_temperate reason). Most reasons cite the sample review, a few a book,
as in the real export.
`countries` in the manifest is the real list from canopi-data, with the real GRIIS coverage (`invasive_checked`),
not invented; every `invasive_in` country is a checked one. `invasive_in` lists are invented, but each one
also holds every country where GRIIS really records the plant invasive (`griis.json`), so the fixture never
shows "not recorded invasive" where GRIIS says otherwise.

Covers: null versus `[]` (`toxicity`), `functions: null` and a taxon with no stratum or phases yet
(Zingiber officinale), invasive in a few or many countries, every toxicity level, genus, species and family-rank
interactions, allelopathy with and without a recorded target, `allelopathy_tolerant`, missing names per locale,
a climate with no interactions (`[]`, checked none), a reason per region with its source, an interaction of a
region-bound agent with two sources (Psidium guajava x Citrus, copied from the real export of 2026-10-28: the
EPPO host page, then the distribution page its "only in the Americas" note rests on; it is also the one
interaction with `agent_names`, the agent's EPPO names chosen by Wikipedia in en and pt, while the others
leave the optional field out, as an export from before 2026-10-28 does), countries GRIIS
does not cover (`invasive_checked: false`, for example TW, PR, PF and the six Antarctic codes).
`invasive_in` is never null here: the exporter writes null for every taxon, with every country unchecked,
only when the GRIIS compendium is missing, so a test that needs it sets it on a copy.

Regenerate (needs ../canopi-data):

```sh
(cd ../canopi-data && uv run python -c 'import json; from pathlib import Path; from canopi.curated.regions import COUNTRIES; from canopi.curated.consortium_export import DEFAULT_GRIIS_PATH, griis_checked_countries as g; c = g(DEFAULT_GRIIS_PATH); print(json.dumps({k: {"invasive_checked": k in c} for k in COUNTRIES}))') > /tmp/countries.json
python3 -I scripts/fixtures/consortium/make_fixture.py --names > /tmp/names.txt
(cd ../canopi-data && uv run python -c 'import json, sys; from canopi.curated.consortium_export import DEFAULT_GRIIS_PATH, griis_invasive_countries as g; print(json.dumps(g(DEFAULT_GRIIS_PATH, set(filter(None, sys.stdin.read().splitlines()))), sort_keys=True))' < /tmp/names.txt) > /tmp/griis.json
python3 -I scripts/fixtures/consortium/make_fixture.py scripts/fixtures/consortium /tmp/countries.json /tmp/griis.json
```
