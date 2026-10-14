"""Export featured .canopi designs to privacy-safe mockup data.

Positions become metres relative to the design centre (x east, y south, like the app's
session plane), so the published data never carries the site's real coordinates. Only the
pin is geographic, rounded to 0.1 degree (about 10 km). Notes, budget, calendar, views,
stories and annotations are dropped. Usage: python3 -I export-designs.py <catalog.db> <out.json>
"""
import json, math, sqlite3, sys
from pathlib import Path

DOWNLOADS = Path.home() / "Downloads"
FEATURED = [
    {
        "id": "sanctuaire-aylin",
        "file": "Design verger syntropique v3 (2.0, release).canopi",
        "name": "Le Sanctuaire d'Aylin",
        "designer": "Aylin",
        "projectUrl": "https://lesanctuairedaylin.square.site/",
        "organisation": {"name": "Destination Syntropie", "url": "https://destinationsyntropie.org/"},
        "region": "Sarthe",
        "country": "FR",
    },
    {
        "id": "claire-sam",
        "file": "Design Claire & Sam V6 (2.0).canopi",
        "name": "Claire & Sam",
        "designer": "Stéphane",
        "projectUrl": "https://www.oasisgourmande.fr/",
        "organisation": {"name": "Destination Syntropie", "url": "https://destinationsyntropie.org/"},
        "region": "Morbihan",
        "country": "FR",
    },
]
# The site's 11 locales; tooltips fall back to English, then to the scientific name alone.
LANGS = ('en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')
# The app's stratum display colours (desktop/web/src/canvas/runtime/plant-display.ts).
STRATUM_COLORS = {"emergent": "#E69F00", "high": "#009E73", "medium": "#0072B2", "low": "#CC79A7", "none": "#5E5A52"}


def symbol_for(habit, height):
    if habit == "Tree":
        return "canopy"
    if habit == "Climber":
        return "climber"
    if habit == "Shrub":
        return "groundcover" if (height or 1) < 0.4 else "shrub"
    return "groundcover" if (height or 1) <= 0.3 else "herb"


def main(db_path, out_path):
    db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    designs, symbol_memory = [], {}
    for meta in FEATURED:
        raw = json.loads((DOWNLOADS / meta["file"]).read_text())
        symbol_memory.update(raw.get("plant_species_symbols") or {})
    for meta in FEATURED:
        raw = json.loads((DOWNLOADS / meta["file"]).read_text())
        lons = [p["position"]["lon"] for p in raw["plants"]]
        lats = [p["position"]["lat"] for p in raw["plants"]]
        lon0, lat0 = (min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2
        kx, ky = 111320 * math.cos(math.radians(lat0)), 110540

        def plane(pt):
            return [round((pt["lon"] - lon0) * kx, 2), round(-(pt["lat"] - lat0) * ky, 2)]

        strata = {c["target"].get("canonical_name"): c["stratum"] for c in raw.get("consortiums", []) if c["target"].get("kind") == "species"}
        own_symbols = raw.get("plant_species_symbols") or {}
        species, index = [], {}
        for name in sorted({p["canonical_name"] for p in raw["plants"]}):
            row = db.execute("select id, habit, height_max_m from species where canonical_name = ?", (name,)).fetchone()
            names = {}
            if row:
                for lang, common in db.execute(f"select language, common_name from best_common_names where species_id = ? and language in ({','.join('?' * len(LANGS))})", (row[0], *LANGS)):
                    names[lang] = common
            stratum = strata.get(name)
            stratum = stratum if stratum in STRATUM_COLORS else "none"
            index[name] = len(species)
            species.append({
                "scientific": name,
                "common": names,
                "habit": row[1] if row else None,
                "heightMaxM": round(row[2], 1) if row and row[2] else None,
                "stratum": stratum,
                "color": STRATUM_COLORS[stratum],
                "symbol": own_symbols.get(name) or symbol_memory.get(name) or symbol_for(row[1] if row else None, row[2] if row else None),
            })
        pts = [plane(p["position"]) for p in raw["plants"]]
        plants = []
        for i, (p, xy) in enumerate(zip(raw["plants"], pts)):
            nearest = min((math.dist(xy, q) for j, q in enumerate(pts) if j != i), default=None)
            plants.append([xy[0], xy[1], index[p["canonical_name"]], round(nearest, 2) if nearest is not None else None])

        zones = []
        for z in raw["zones"]:
            pp = [plane(pt) for pt in z["points"]]
            rot = math.radians(z.get("rotation") or 0)
            if z["zone_type"] == "ellipse" and len(pp) >= 2:
                (x1, y1), (x2, y2) = pp[0], pp[1]
                cx, cy, rx, ry = (x1 + x2) / 2, (y1 + y2) / 2, abs(x2 - x1) / 2, abs(y2 - y1) / 2
                ring = [[cx + math.cos(t) * rx, cy + math.sin(t) * ry] for t in (k / 48 * 2 * math.pi for k in range(48))]
                closed, center = True, (cx, cy)
            elif z["zone_type"] == "rect" and len(pp) >= 4:
                xs, ys = [q[0] for q in pp[:4]], [q[1] for q in pp[:4]]
                ring = [[min(xs), min(ys)], [max(xs), min(ys)], [max(xs), max(ys)], [min(xs), max(ys)]]
                closed, center = True, ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
            else:
                ring, closed, center = pp, z["zone_type"] != "line", None
            if center and abs(rot) > 1e-6:
                c, s = math.cos(rot), math.sin(rot)
                ring = [[center[0] + (x - center[0]) * c - (y - center[1]) * s, center[1] + (x - center[0]) * s + (y - center[1]) * c] for x, y in ring]
            zones.append({"closed": closed, "points": [[round(x, 2), round(y, 2)] for x, y in ring]})

        xs = [p[0] for p in plants] + [q[0] for z in zones for q in z["points"]]
        ys = [p[1] for p in plants] + [q[1] for z in zones for q in z["points"]]
        designs.append({
            **{k: v for k, v in meta.items() if k != "file"},
            "pin": {"lon": round(lon0, 1), "lat": round(lat0, 1)},
            "boundsM": [round(min(xs), 2), round(min(ys), 2), round(max(xs), 2), round(max(ys), 2)],
            "speciesCount": len(species),
            "plantCount": len(plants),
            "species": species,
            "plants": plants,
            "zones": zones,
        })
    out = {
        "format": "plants are [xM, yM (south positive), speciesIndex, nearestNeighbourM]; zones are rings in metres, closed unless it is a line",
        "stratumColors": STRATUM_COLORS,
        "designs": designs,
    }
    Path(out_path).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
