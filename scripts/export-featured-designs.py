"""Export the featured .canopi designs to the site's privacy-safe data (public/data/featured-designs.json).

Positions become metres relative to the design centre (x east, y south, like the app's
session plane), so the published data never carries the site's real coordinates. Only the
pin is geographic, rounded to 0.1 degree (about 10 km). Notes, budget, calendar, views,
stories and annotations are dropped. The designs and their public details are listed in
scripts/featured-designs.json. The .canopi files stay outside the repository: the git-ignored
scripts/featured-files.local.json maps each design id to its file on this computer. The catalog
is opened read-only. Publish a design only with its owner's consent.
Usage: python3 -I scripts/export-featured-designs.py <canopi-core.db> public/data/featured-designs.json
"""
import json, math, sqlite3, sys
from pathlib import Path

# The site's 11 locales; tooltips fall back to English, then to the scientific name alone.
LANGS = ('en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru')
# Each plant shows its role: what it gives or does in the design, drawn with the app's 2.0 symbol
# for that role and one colour of the app's named palette (canvas/plant-colors.ts), so one short
# legend explains every plan. A designer's own role symbol wins; otherwise the role comes from
# scripts/featured-roles.json, proposed from the catalog's traits and checked by hand, since the
# catalog's fruit types are not reliable enough to show unchecked.
ROLE_COLORS = {
    "apple": "#C44230",      # Fruit, Poppy
    "berry": "#8B3A6E",      # Berries, Elderberry
    "nut": "#7A5C30",        # Nut, Walnut
    "pod": "#3E8E4E",        # Nitrogen fixer, Clover
    "carrot": "#D4822A",     # Vegetable, Calendula
    "chili": "#C25B82",      # Spice, Peony
    "medicinal": "#7B5EA7",  # Medicinal, Wisteria
    "bee": "#C8A51E",        # Pollinator, Goldenrod
    "timber": "#71716A",     # Timber, Flint
    "biomass": "#2E8B7A",    # Biomass, Verdigris
}


FEATURED_LIST = Path(__file__).with_name('featured-designs.json')
FEATURED_FILES = Path(__file__).with_name('featured-files.local.json')
FEATURED_ROLES = Path(__file__).with_name('featured-roles.json')


def main(db_path, out_path):
    files = json.loads(FEATURED_FILES.read_text())
    featured = [{**meta, "file": files[meta["id"]]} for meta in json.loads(FEATURED_LIST.read_text())]
    db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    roles = json.loads(FEATURED_ROLES.read_text())
    designs = []
    for meta in featured:
        raw = json.loads(Path(meta["file"]).expanduser().read_text())
        lons = [p["position"]["lon"] for p in raw["plants"]]
        lats = [p["position"]["lat"] for p in raw["plants"]]
        lon0, lat0 = (min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2
        kx, ky = 111320 * math.cos(math.radians(lat0)), 110540

        def plane(pt):
            return [round((pt["lon"] - lon0) * kx, 2), round(-(pt["lat"] - lat0) * ky, 2)]

        own_symbols = raw.get("plant_species_symbols") or {}
        missing = sorted({p["canonical_name"] for p in raw["plants"]} - set(roles) - {k for k, v in own_symbols.items() if v in ROLE_COLORS})
        if missing:
            sys.exit(f"{meta['id']}: give these species a role in {FEATURED_ROLES.name}: {', '.join(missing)}")
        species, index = [], {}
        for name in sorted({p["canonical_name"] for p in raw["plants"]}):
            row = db.execute("select id, habit, height_max_m from species where canonical_name = ?", (name,)).fetchone()
            names = {}
            if row:
                for lang, common in db.execute(f"select language, common_name from best_common_names where species_id = ? and language in ({','.join('?' * len(LANGS))})", (row[0], *LANGS)):
                    names[lang] = common
            role = own_symbols.get(name) if own_symbols.get(name) in ROLE_COLORS else roles[name]
            index[name] = len(species)
            species.append({
                "scientific": name,
                "common": names,
                "habit": row[1] if row else None,
                "heightMaxM": round(row[2], 1) if row and row[2] else None,
                "color": ROLE_COLORS[role],
                "symbol": role,
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
        "designs": designs,
    }
    Path(out_path).write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
