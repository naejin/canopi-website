"""Build the illustrative consortium fixture (format 3) for canopi-website.

Values are plausible but invented for UI work. Never ship them.
Usage: python3 -I make_fixture.py --names            (the fixture's taxon names, one per line)
       python3 -I make_fixture.py <out_dir> <countries.json> <griis.json>
(see README.md: countries.json is the real country list and GRIIS coverage from canopi-data;
griis.json is GRIIS's real invasive countries for each fixture taxon, from canopi-data.)
"""
import hashlib, json, os, sys, uuid

NAMES_ONLY = sys.argv[1:] == ["--names"]
if not NAMES_ONLY:
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    OUT = sys.argv[1]
    COUNTRIES = json.load(open(sys.argv[2], encoding="utf-8"))
    GRIIS = json.load(open(sys.argv[3], encoding="utf-8"))
GEN = "2026-10-27T00:00:00Z"
NS = uuid.UUID("00000000-0000-4000-8000-00000000c0de")

SOURCES = {
    "pfaf": {"label": "Plants For A Future", "url": "https://pfaf.org/", "licence": None, "attribution": "Plants For A Future (pfaf.org)"},
    "griis": {"label": "GRIIS, Global Register of Introduced and Invasive Species", "url": "https://griis.org/", "licence": "CC BY 4.0", "attribution": "GRIIS (griis.org), CC BY 4.0"},
    "try": {"label": "TRY Plant Trait Database", "url": "https://www.try-db.org/", "licence": "CC BY 4.0", "attribution": "TRY Plant Trait Database, CC BY 4.0"},
    "crawford-2010": {"label": "Crawford, Creating a Forest Garden (2010)", "url": None, "licence": None, "attribution": None},
    "jacke-2005": {"label": "Jacke & Toensmeier, Edible Forest Gardens, vol. 2 (2005)", "url": None, "licence": None, "attribution": None},
    "toensmeier-2016": {"label": "Toensmeier, The Carbon Farming Solution (2016)", "url": None, "licence": None, "attribution": None},
    "syntropie": {"label": "Bienvenue en syntropie !", "url": None, "licence": None, "attribution": None},
    "rule-legume": {"label": "Canopi rule: legumes with known nodulation fix nitrogen", "url": None, "licence": None, "attribution": None},
    "extension-rust": {"label": "University extension: cedar-apple rust (illustrative)", "url": "https://example.org/cedar-apple-rust", "licence": None, "attribution": None},
    "extension-juglone": {"label": "University extension: walnut toxicity (illustrative)", "url": "https://example.org/juglone", "licence": None, "attribution": None},
    "sample-review": {"label": "Canopi consortium sample review (illustrative)", "url": None, "licence": None, "attribution": None},
    "extension-banana": {"label": "Plant pathology note: banana weevil and plantains (illustrative)", "url": "https://example.org/banana-weevil", "licence": None, "attribution": None},
    # Real ids, labels and URLs, copied from the canopi-data export of 2026-10-28 (tropical.json).
    "eppo-global-database-anastrepha-fraterculus-anstfr-host": {"label": "EPPO Global Database: Anastrepha fraterculus (ANSTFR), host plants", "url": "https://gd.eppo.int/taxon/ANSTFR/hosts", "licence": None, "attribution": None},
    "eppo-global-database-anastrepha-fraterculus-anstfr": {"label": "EPPO Global Database: Anastrepha fraterculus (ANSTFR), distribution", "url": "https://gd.eppo.int/taxon/ANSTFR/distribution", "licence": None, "attribution": None},
}

BASE_TRAITS = {
    "height_m": None, "width_max_m": None,
    "sun": True, "semi_shade": None, "full_shade": False,
    "hardiness_zone": None, "frost_tender": None,
    "soil_ph": None, "well_drained": None,
    "moisture_use": None, "drought_tolerance": None, "fertility_requirement": None,
    "deciduous_evergreen": None, "active_growth_period": None,
    "bloom_period": None, "harvest_period": None,
    "lifespan": None, "growth_rate": None, "age_of_maturity_years": None,
    "root_depth_min_cm": None, "taproot_persistent": None, "root_system_type": None,
    "mycorrhizal_type": None, "nitrogen_fixer": False, "edibility_rating": None,
    "self_fertile": None, "sexual_system": None, "pollinators": None,
    "vegetative_spread_rate": None, "clonal_growth_form": None,
    "is_annual": False, "is_perennial": True, "habit": None,
}


def taxon(name, genus, family, names, role, reason, stratum, phases, functions, traits, warnings=None, image=None):
    t = dict(BASE_TRAITS)
    t.update(traits)
    for k in ("height_m", "hardiness_zone", "soil_ph"):
        if isinstance(t[k], tuple):
            t[k] = {"min": t[k][0], "max": t[k][1]}
    w = {"toxicity": None, "invasive_in": [], "allelopathic": False, "weed_potential": False}
    w.update(warnings or {})
    return {
        "id": str(uuid.uuid5(NS, name)),
        "canonical_name": name, "genus": genus, "family": family, "names": names,
        "image": image, "role": role, "reasons": reason,  # a text here; climate_file() makes the list
        "stratum": None if stratum is None else {"value": stratum[0], "sources": stratum[1]},
        "phases": None if phases is None else {"start": phases[0], "end": phases[1], "sources": phases[2]},
        # null until a function is accepted; the exporter never writes [].
        "functions": [{"function": f, "method": m, "sources": s} for f, m, s in functions] or None,
        "traits": t, "warnings": w,
    }


def inv(*countries):
    return [{"country": c, "sources": ["griis"]} for c in countries]


def tox(level, en, fr, src="pfaf"):
    return {"level": level, "note": {"en": en, "fr": fr}, "sources": [src]}


def R(en, fr=None):
    d = {"en": en}
    if fr:
        d["fr"] = fr
    return d


P = "pfaf"
TROPICAL = [
    taxon("Artocarpus altilis", "Artocarpus", "Moraceae", {"en": "Breadfruit", "fr": "Arbre à pain", "es": "Árbol del pan", "pt": "Fruta-pão"},
          "crop", R("Staple starch tree that shades the whole planting once mature.", "Arbre à féculent qui ombrage toute la plantation une fois adulte."),
          ("emergent", ["toensmeier-2016"]), ("secondary_i", "climax", ["toensmeier-2016"]),
          [("wildlife_habitat", "curated", ["toensmeier-2016"]), ("mulch", "extraction", [P])],
          {"height_m": (12, 21), "width_max_m": 12, "semi_shade": True, "frost_tender": True, "soil_ph": (6.0, 7.5), "well_drained": True,
           "moisture_use": "High", "deciduous_evergreen": "Evergreen", "lifespan": "Long", "growth_rate": "Medium", "age_of_maturity_years": 5,
           "edibility_rating": 5, "habit": "Tree", "root_system_type": "Spreading lateral", "root_depth_min_cm": 120, "mycorrhizal_type": "AM"},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}}),
    taxon("Theobroma cacao", "Theobroma", "Malvaceae", {"en": "Cacao", "fr": "Cacaoyer", "es": "Cacao", "de": "Kakaobaum", "ja": "カカオ"},
          "crop", R("Shade-loving understory crop; the reason many tropical food forests exist.", "Culture de sous-bois qui aime l’ombre ; la raison d’être de beaucoup de forêts comestibles tropicales."),
          ("medium", ["syntropie", "toensmeier-2016"]), ("secondary_i", "climax", ["syntropie"]),
          [("pollinator_forage", "import", [P])],
          {"height_m": (4, 8), "width_max_m": 5, "sun": False, "semi_shade": True, "full_shade": True, "frost_tender": True, "soil_ph": (5.0, 7.5),
           "well_drained": True, "moisture_use": "High", "drought_tolerance": "Low", "deciduous_evergreen": "Evergreen", "lifespan": "Long",
           "age_of_maturity_years": 4, "edibility_rating": 5, "habit": "Tree", "self_fertile": False, "pollinators": ["Midges"],
           "mycorrhizal_type": "AM", "root_system_type": "Taproot", "taproot_persistent": True},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}}),
    taxon("Musa acuminata", "Musa", "Musaceae", {"en": "Banana", "fr": "Bananier", "es": "Plátano", "pt": "Bananeira", "zh": "香蕉"},
          "crop", R("Fast, early shade and heaps of mulch while slower trees grow.", "Ombre rapide et beaucoup de paillis pendant que les arbres lents poussent."),
          ("high", ["syntropie"]), ("placenta_iii", "secondary_i", ["syntropie"]),
          [("mulch", "curated", ["syntropie"]), ("windbreak", "extraction", [P])],
          {"height_m": (3, 6), "width_max_m": 3, "semi_shade": True, "frost_tender": True, "soil_ph": (5.5, 7.0), "moisture_use": "High",
           "fertility_requirement": "High", "deciduous_evergreen": "Evergreen", "lifespan": "Short", "growth_rate": "Fast", "age_of_maturity_years": 1,
           "edibility_rating": 5, "habit": "Herbaceous", "vegetative_spread_rate": "Moderate", "root_system_type": "Fibrous", "root_depth_min_cm": 40},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}}),
    taxon("Carica papaya", "Carica", "Caricaceae", {"en": "Papaya", "fr": "Papayer", "es": "Papaya", "pt": "Mamoeiro"},
          "crop", R("Fruits in the first year or two, then gives way.", "Fructifie dès la première ou la deuxième année, puis laisse la place."),
          ("high", ["syntropie"]), ("placenta_ii", "placenta_iii", ["syntropie"]),
          [("insectary", "extraction", [P])],
          {"height_m": (2, 6), "width_max_m": 2, "frost_tender": True, "soil_ph": (6.0, 7.0), "well_drained": True, "moisture_use": "Medium",
           "lifespan": "Short", "growth_rate": "Fast", "age_of_maturity_years": 1, "edibility_rating": 4, "habit": "Tree", "self_fertile": None,
           "sexual_system": "Dioecious", "root_system_type": None},
          {"toxicity": tox("Slight", "The latex of unripe fruit and leaves irritates skin and can be harmful to eat.", "Le latex des fruits verts et des feuilles irrite la peau et peut être nocif s’il est consommé.")}),
    taxon("Inga edulis", "Inga", "Fabaceae", {"en": "Ice-cream bean", "fr": "Pois sucré", "es": "Guaba", "pt": "Ingá"},
          "support", R("Nitrogen-fixing shade tree that is pruned hard for mulch.", "Arbre d’ombrage fixateur d’azote, taillé fort pour le paillis."),
          ("high", ["toensmeier-2016"]), ("placenta_iii", "secondary_iii", ["toensmeier-2016"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("mulch", "curated", ["toensmeier-2016"]), ("pollinator_forage", "import", [P])],
          {"height_m": (6, 15), "width_max_m": 8, "semi_shade": True, "frost_tender": True, "soil_ph": (4.5, 7.0), "moisture_use": "Medium",
           "drought_tolerance": "Low", "lifespan": "Medium", "growth_rate": "Fast", "edibility_rating": 3, "habit": "Tree", "nitrogen_fixer": True,
           "mycorrhizal_type": "AM"},
          {"invasive_in": inv("FJ")}),
    taxon("Gliricidia sepium", "Gliricidia", "Fabaceae", {"en": "Gliricidia", "fr": "Gliricidia", "es": "Madre de cacao"},
          "support", R("Living fence post and chop-and-drop nitrogen source.", "Piquet vivant et source d’azote taillée sur place."),
          ("high", ["syntropie"]), ("placenta_iii", "secondary_ii", ["syntropie"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("mulch", "curated", ["syntropie"]), ("windbreak", "extraction", [P])],
          {"height_m": (5, 12), "width_max_m": 5, "semi_shade": True, "frost_tender": True, "soil_ph": (4.5, 8.0), "well_drained": True,
           "drought_tolerance": "High", "deciduous_evergreen": "Deciduous", "growth_rate": "Fast", "edibility_rating": 1, "habit": "Tree",
           "nitrogen_fixer": True},
          {"toxicity": tox("Moderate", "Leaves and bark are toxic to some animals and are used as rodent poison.", "Les feuilles et l’écorce sont toxiques pour certains animaux et servent de raticide."),
           "invasive_in": inv("AU", "JM", "TT"), "weed_potential": True}),
    taxon("Leucaena leucocephala", "Leucaena", "Fabaceae", {"en": "White leadtree", "fr": "Faux mimosa", "es": "Guaje"},
          "support", R("Very fast nitrogen fixer; invasive in many countries.", "Fixateur d’azote très rapide ; envahissant dans de nombreux pays."),
          ("high", ["toensmeier-2016"]), ("placenta_iii", "secondary_ii", ["toensmeier-2016"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("mulch", "curated", ["toensmeier-2016"])],
          {"height_m": (5, 15), "width_max_m": 6, "semi_shade": False, "frost_tender": True, "soil_ph": (5.5, 8.5), "drought_tolerance": "High",
           "growth_rate": "Fast", "edibility_rating": 2, "habit": "Tree", "nitrogen_fixer": True, "taproot_persistent": True, "root_system_type": "Taproot"},
          {"toxicity": tox("Moderate", "Leaves contain mimosine, harmful to livestock in large amounts.", "Les feuilles contiennent de la mimosine, nocive pour le bétail en grande quantité."),
           "invasive_in": inv("AU", "BR", "CN", "IN", "PH", "US", "ZA", "JP", "MX"), "weed_potential": True}),
    taxon("Cajanus cajan", "Cajanus", "Fabaceae", {"en": "Pigeon pea", "fr": "Pois d’Angole", "es": "Guandú", "pt": "Feijão-guandu", "zh": "木豆"},
          "crop", R("Quick shrub that feeds the soil and the cook in its first years.", "Arbuste rapide qui nourrit le sol et la cuisine dès les premières années."),
          ("medium", ["syntropie"]), ("placenta_i", "placenta_iii", ["syntropie"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("mulch", "curated", ["syntropie"]), ("insectary", "extraction", [P])],
          {"height_m": (1, 4), "width_max_m": 2, "semi_shade": True, "frost_tender": True, "soil_ph": (5.0, 8.0), "well_drained": True,
           "drought_tolerance": "High", "lifespan": "Short", "growth_rate": "Fast", "edibility_rating": 4, "habit": "Shrub", "nitrogen_fixer": True,
           "root_system_type": "Taproot", "root_depth_min_cm": 90, "taproot_persistent": True},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}}),
    taxon("Manihot esculenta", "Manihot", "Euphorbiaceae", {"en": "Cassava", "fr": "Manioc", "es": "Yuca", "pt": "Mandioca", "zh": "木薯"},
          "crop", R("Hardy staple root for the first years, harvested as the canopy closes.", "Racine de base robuste pour les premières années, récoltée quand le couvert se ferme."),
          ("medium", ["syntropie"]), ("placenta_ii", "placenta_iii", ["syntropie"]),
          [],
          {"height_m": (1, 3), "width_max_m": 1.5, "frost_tender": True, "soil_ph": (4.5, 7.5), "well_drained": True, "drought_tolerance": "High",
           "lifespan": "Short", "growth_rate": "Fast", "edibility_rating": 4, "habit": "Shrub", "root_system_type": "Tuberous"},
          {"toxicity": tox("Severe", "Roots and leaves are poisonous raw; they must be processed before eating. Ask your local food-safety authority.", "Racines et feuilles sont toxiques crues ; elles doivent être transformées avant d’être mangées. Renseignez-vous auprès de l’autorité sanitaire locale."),
           "invasive_in": []}),
    taxon("Ipomoea batatas", "Ipomoea", "Convolvulaceae", {"en": "Sweet potato", "fr": "Patate douce", "es": "Batata", "pt": "Batata-doce", "ja": "サツマイモ"},
          "crop", R("Edible ground cover that shades out weeds while trees are small.", "Couvre-sol comestible qui étouffe les herbes pendant que les arbres sont petits."),
          ("low", ["syntropie"]), ("placenta_i", "placenta_ii", ["syntropie"]),
          [("ground_cover", "curated", ["syntropie"])],
          {"height_m": (0.3, 0.5), "width_max_m": 3, "semi_shade": True, "frost_tender": True, "soil_ph": (5.5, 6.5), "well_drained": True,
           "moisture_use": "Medium", "lifespan": "Short", "growth_rate": "Fast", "edibility_rating": 5, "habit": "Climber", "is_annual": True,
           "is_perennial": True, "vegetative_spread_rate": "Rapid", "root_system_type": "Tuberous"},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}}),
    taxon("Arachis pintoi", "Arachis", "Fabaceae", {"en": "Pinto peanut", "fr": "Arachide pérenne", "pt": "Amendoim forrageiro"},
          "support", R("Low, shade-tolerant living mulch that fixes nitrogen.", "Paillis vivant bas, tolérant l’ombre, qui fixe l’azote."),
          ("low", ["toensmeier-2016"]), ("placenta_ii", "secondary_iii", ["toensmeier-2016"]),
          [("ground_cover", "curated", ["toensmeier-2016"]), ("nitrogen_fixer", "rule", ["rule-legume"]), ("pollinator_forage", "import", [P])],
          {"height_m": (0.1, 0.3), "width_max_m": 1, "semi_shade": True, "full_shade": False, "frost_tender": True, "soil_ph": (4.5, 7.0),
           "moisture_use": "Medium", "edibility_rating": 1, "habit": "Herbaceous", "nitrogen_fixer": True, "vegetative_spread_rate": "Moderate"},
          {"invasive_in": []}),
    taxon("Cymbopogon citratus", "Cymbopogon", "Poaceae", {"en": "Lemongrass", "fr": "Citronnelle", "es": "Hierba limón", "ja": "レモングラス"},
          "support", R("Clumps that edge beds, give mulch and tea.", "Touffes qui bordent les planches, donnent paillis et tisane."),
          ("low", ["syntropie"]), ("placenta_i", "secondary_i", ["syntropie"]),
          [("mulch", "curated", ["syntropie"]), ("pest_repellent", "extraction", [P])],
          {"height_m": (1, 1.5), "width_max_m": 1, "semi_shade": True, "frost_tender": True, "soil_ph": (5.0, 8.0), "drought_tolerance": "Medium",
           "growth_rate": "Fast", "edibility_rating": 3, "habit": "Herbaceous", "root_system_type": "Fibrous"},
          {}),
    taxon("Tithonia diversifolia", "Tithonia", "Asteraceae", {"en": "Mexican sunflower", "fr": "Tournesol mexicain", "es": "Botón de oro"},
          "support", R("Biomass and nutrient pump, cut several times a year.", "Biomasse et pompe à nutriments, coupée plusieurs fois par an."),
          ("medium", ["syntropie"]), ("placenta_i", "placenta_iii", ["syntropie"]),
          [("dynamic_accumulator", "curated", ["syntropie"]), ("mulch", "curated", ["syntropie"]), ("insectary", "extraction", [P])],
          {"height_m": (2, 3), "width_max_m": 2, "semi_shade": False, "frost_tender": True, "drought_tolerance": "Medium", "growth_rate": "Fast",
           "edibility_rating": 0, "habit": "Shrub"},
          {"invasive_in": inv("AU", "ZA", "CN", "KE"), "weed_potential": True, "allelopathic": True}),
    taxon("Moringa oleifera", "Moringa", "Moringaceae", {"en": "Moringa", "fr": "Moringa", "es": "Moringa"},
          "crop", R("Leaf tree that crops within months and coppices.", "Arbre à feuilles qui produit en quelques mois et se recèpe."),
          ("high", ["toensmeier-2016"]), ("placenta_ii", "secondary_ii", ["toensmeier-2016"]),
          [("dynamic_accumulator", "extraction", [P])],
          {"height_m": (5, 10), "width_max_m": 4, "semi_shade": False, "frost_tender": True, "soil_ph": (6.0, 8.0), "well_drained": True,
           "drought_tolerance": "High", "deciduous_evergreen": "Deciduous", "growth_rate": "Fast", "age_of_maturity_years": 1, "edibility_rating": 5,
           "habit": "Tree", "root_system_type": "Taproot", "taproot_persistent": True},
          {"toxicity": tox("Slight", "Root bark is harmful to eat.", "L’écorce des racines est nocive si elle est consommée."), "invasive_in": inv("CU"), "weed_potential": True}),
    taxon("Zingiber officinale", "Zingiber", "Zingiberaceae", {"en": "Ginger", "fr": "Gingembre", "es": "Jengibre", "zh": "姜", "ja": "ショウガ"},
          "crop", R("Shade-tolerant spice for the understory.", "Épice tolérant l’ombre, pour le sous-bois."),
          None, None,
          [],
          {"height_m": (0.6, 1.2), "width_max_m": 0.5, "sun": False, "semi_shade": True, "full_shade": True, "frost_tender": True,
           "moisture_use": "High", "edibility_rating": 4, "habit": "Herbaceous", "root_system_type": "Rhizome"},
          {"invasive_in": []}),
    taxon("Psidium guajava", "Psidium", "Myrtaceae", {"en": "Guava", "fr": "Goyavier", "es": "Guayaba", "pt": "Goiabeira"},
          "crop", R("Guava; fruit from year 2–3 and bird food; prune hard.", "Goyavier ; fruits dès la 2e ou 3e année et nourriture pour les oiseaux ; tailler fort."),
          ("medium", ["sample-review"]), ("placenta_iii", "secondary_ii", ["sample-review"]),
          [("pollinator_forage", "import", [P])],
          {"height_m": (None, 7.6), "width_max_m": 10, "semi_shade": True, "frost_tender": True, "soil_ph": (5.5, 7.0), "well_drained": True,
           "moisture_use": "Medium", "drought_tolerance": "Medium", "deciduous_evergreen": "Evergreen", "lifespan": "Long", "growth_rate": "Medium",
           "edibility_rating": 5, "habit": "Tree", "self_fertile": True, "pollinators": ["Bees"], "mycorrhizal_type": "AM"},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}, "invasive_in": inv("AU"), "weed_potential": True}),
]
TROP_INTER = [
    {"subject": {"name": "Tithonia diversifolia", "rank": "species"}, "object": {"name": "Ipomoea batatas", "rank": "species"},
     "type": "allelopathic_harm", "agent": None, "severity": "medium",
     "note": R("Fresh Tithonia residues can hold back young sweet potato; let mulch wilt before use.", "Les résidus frais de Tithonia peuvent freiner la patate douce jeune ; laissez faner le paillis avant de l’utiliser."),
     "sources": ["toensmeier-2016"]},
    {"subject": {"name": "Musa", "rank": "genus"}, "object": {"name": "Musa", "rank": "genus"},
     "type": "shared_pest", "agent": "Cosmopolites sordidus", "severity": "low",
     "note": R("Banana weevil spreads between banana and plantain stools planted close together.", "Le charançon du bananier passe d’une souche à l’autre quand bananiers et plantains sont serrés."),
     "sources": ["extension-banana"]},
    # A real exported interaction (canopi-data export 2026-10-28, tropical.json), copied as is.
    # Its agent is region-bound, so it cites two sources: the row's host page, then the
    # distribution page the "only in the Americas" note rests on.
    {"subject": {"name": "Psidium guajava", "rank": "species"}, "object": {"name": "Citrus", "rank": "genus"},
     "type": "shared_pest", "agent": "Anastrepha fraterculus", "severity": "medium",
     "note": R("Watch guava near citrus for fruit flies: guava is a major host of the South American fruit fly, which also attacks citrus. EPPO records this fly only in the Americas.",
               "Surveillez les mouches des fruits sur goyavier près des agrumes : le goyavier est hôte majeur de la mouche sud-américaine, qui attaque aussi les agrumes. L'OEPP ne signale cette mouche que dans les Amériques."),
     "sources": ["eppo-global-database-anastrepha-fraterculus-anstfr-host", "eppo-global-database-anastrepha-fraterculus-anstfr"]},
]

MEDITERRANEAN = [
    taxon("Ceratonia siliqua", "Ceratonia", "Fabaceae", {"en": "Carob", "fr": "Caroubier", "es": "Algarrobo", "it": "Carrubo", "pt": "Alfarrobeira"},
          "crop", R("Long-lived, drought-hardy canopy tree with sweet pods.", "Arbre de canopée longévif, résistant à la sécheresse, aux gousses sucrées."),
          ("emergent", ["toensmeier-2016"]), ("secondary_ii", "climax", ["toensmeier-2016"]),
          [("wildlife_habitat", "curated", ["toensmeier-2016"])],
          {"height_m": (8, 15), "width_max_m": 10, "semi_shade": True, "soil_ph": (6.5, 8.5), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Evergreen", "lifespan": "Long", "growth_rate": "Slow", "age_of_maturity_years": 7, "edibility_rating": 4,
           "habit": "Tree", "sexual_system": "Dioecious", "self_fertile": False, "root_system_type": "Deep taproot", "taproot_persistent": True,
           "root_depth_min_cm": 300},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}, "invasive_in": inv("AU")}),
    taxon("Olea europaea", "Olea", "Oleaceae", {"en": "Olive", "fr": "Olivier", "es": "Olivo", "it": "Olivo", "de": "Olivenbaum", "pt": "Oliveira"},
          "crop", R("The defining tree crop of dry-summer climates.", "L’arbre fruitier emblématique des climats à été sec."),
          ("high", ["crawford-2010"]), ("secondary_i", "climax", ["crawford-2010"]),
          [("windbreak", "extraction", [P]), ("wildlife_habitat", "import", [P])],
          {"height_m": (4, 10), "width_max_m": 8, "semi_shade": False, "soil_ph": (6.0, 8.5), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Evergreen", "lifespan": "Long", "growth_rate": "Slow", "age_of_maturity_years": 5, "edibility_rating": 4,
           "habit": "Tree", "self_fertile": True, "pollinators": ["Wind"], "mycorrhizal_type": "AM"},
          {"toxicity": {"level": "None", "note": None, "sources": [P]}, "invasive_in": inv("AU", "NZ", "ZA")}),
    taxon("Ficus carica", "Ficus", "Moraceae", {"en": "Fig", "fr": "Figuier", "es": "Higuera", "it": "Fico", "de": "Feige", "pt": "Figueira"},
          "crop", R("Productive fruit tree that tolerates poor dry soil.", "Arbre fruitier productif qui supporte un sol pauvre et sec."),
          ("high", ["crawford-2010"]), ("placenta_iii", "secondary_iii", ["crawford-2010"]),
          [("wildlife_habitat", "import", [P])],
          {"height_m": (3, 9), "width_max_m": 6, "semi_shade": True, "soil_ph": (6.0, 8.0), "well_drained": True, "drought_tolerance": "Medium",
           "deciduous_evergreen": "Deciduous", "lifespan": "Medium", "growth_rate": "Fast", "age_of_maturity_years": 3, "edibility_rating": 5,
           "habit": "Tree", "self_fertile": True, "root_system_type": "Aggressive lateral", "root_depth_min_cm": 100},
          {"toxicity": tox("Slight", "The milky sap irritates skin, worse in sunlight.", "La sève laiteuse irrite la peau, surtout au soleil."), "invasive_in": inv("AU", "US")}),
    taxon("Prunus dulcis", "Prunus", "Rosaceae", {"en": "Almond", "fr": "Amandier", "es": "Almendro", "it": "Mandorlo"},
          "crop", R("Early-flowering nut tree for dry slopes.", "Arbre à noix à floraison précoce pour les coteaux secs."),
          ("high", ["crawford-2010"]), ("secondary_i", "secondary_iii", ["crawford-2010"]),
          [("pollinator_forage", "import", [P])],
          {"height_m": (4, 8), "width_max_m": 6, "soil_ph": (6.0, 8.5), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Deciduous", "bloom_period": "Late Winter", "lifespan": "Medium", "edibility_rating": 4, "habit": "Tree",
           "self_fertile": False, "pollinators": ["Bees"]},
          {"toxicity": tox("Moderate", "Bitter almonds contain compounds that release cyanide; only sweet varieties are eaten.", "Les amandes amères contiennent des composés qui libèrent du cyanure ; seules les variétés douces se mangent.")}),
    taxon("Punica granatum", "Punica", "Lythraceae", {"en": "Pomegranate", "fr": "Grenadier", "es": "Granado", "it": "Melograno"},
          "crop", R("Tough fruiting shrub for the middle layer.", "Arbuste fruitier robuste pour l’étage moyen."),
          ("medium", ["crawford-2010"]), ("placenta_iii", "secondary_iii", ["crawford-2010"]),
          [("pollinator_forage", "import", [P])],
          {"height_m": (2, 5), "width_max_m": 3, "semi_shade": True, "soil_ph": (5.5, 8.0), "drought_tolerance": "High", "deciduous_evergreen": "Deciduous",
           "edibility_rating": 4, "habit": "Shrub", "self_fertile": True},
          {"invasive_in": []}),
    taxon("Medicago arborea", "Medicago", "Fabaceae", {"en": "Tree medick", "fr": "Luzerne arborescente", "es": "Alfalfa arbórea", "it": "Erba medica arborea"},
          "support", R("Drought-hardy nitrogen-fixing shrub, cut for mulch and fodder.", "Arbuste fixateur d’azote résistant à la sécheresse, coupé pour le paillis et le fourrage."),
          ("medium", ["toensmeier-2016"]), ("placenta_ii", "secondary_ii", ["toensmeier-2016"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("mulch", "curated", ["toensmeier-2016"]), ("pollinator_forage", "import", [P])],
          {"height_m": (1, 4), "width_max_m": 2, "soil_ph": (6.5, 8.5), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Evergreen", "growth_rate": "Fast", "edibility_rating": 0, "habit": "Shrub", "nitrogen_fixer": True},
          {"invasive_in": []}),
    taxon("Spartium junceum", "Spartium", "Fabaceae", {"en": "Spanish broom", "fr": "Genêt d’Espagne", "es": "Retama de olor", "it": "Ginestra"},
          "support", R("Nitrogen-fixing pioneer for bare dry ground; invasive outside its range.", "Pionnier fixateur d’azote pour sol nu et sec ; envahissant hors de son aire."),
          ("medium", ["jacke-2005"]), ("placenta_ii", "secondary_i", ["jacke-2005"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("pollinator_forage", "import", [P])],
          {"height_m": (1, 3), "width_max_m": 2, "semi_shade": False, "well_drained": True, "drought_tolerance": "High", "growth_rate": "Fast",
           "edibility_rating": 0, "habit": "Shrub", "nitrogen_fixer": True},
          {"toxicity": tox("Moderate", "All parts are toxic if eaten.", "Toutes les parties sont toxiques si elles sont consommées."),
           "invasive_in": inv("AU", "US", "ZA", "NZ", "AR", "CL"), "weed_potential": True}),
    taxon("Salvia rosmarinus", "Salvia", "Lamiaceae", {"en": "Rosemary", "fr": "Romarin", "es": "Romero", "it": "Rosmarino", "de": "Rosmarin", "ja": "ローズマリー"},
          "crop", R("Evergreen herb that feeds bees through the cool season.", "Aromatique persistante qui nourrit les abeilles pendant la saison fraîche."),
          ("low", ["crawford-2010"]), ("placenta_ii", "secondary_ii", ["crawford-2010"]),
          [("insectary", "extraction", [P]), ("pollinator_forage", "import", [P]), ("pest_repellent", "extraction", [P])],
          {"height_m": (0.5, 1.5), "width_max_m": 1.2, "semi_shade": False, "soil_ph": (6.0, 8.0), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Evergreen", "edibility_rating": 3, "habit": "Shrub"},
          {"invasive_in": []}),
    taxon("Thymus vulgaris", "Thymus", "Lamiaceae", {"en": "Thyme", "fr": "Thym", "es": "Tomillo", "it": "Timo"},
          "crop", R("Low aromatic mat for sunny gaps and edges.", "Tapis aromatique bas pour les trouées et bordures ensoleillées."),
          ("low", ["crawford-2010"]), ("placenta_i", "secondary_i", ["crawford-2010"]),
          [("ground_cover", "extraction", [P]), ("insectary", "extraction", [P])],
          {"height_m": (0.1, 0.3), "width_max_m": 0.4, "semi_shade": False, "soil_ph": (6.0, 8.0), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Evergreen", "edibility_rating": 3, "habit": "Shrub"},
          {"invasive_in": []}),
    taxon("Cynara cardunculus", "Cynara", "Asteraceae", {"en": "Artichoke", "fr": "Artichaut", "es": "Alcachofa", "it": "Carciofo"},
          "crop", R("Deep-rooted perennial vegetable, big leaves for mulch.", "Légume vivace à racines profondes, grandes feuilles pour le paillis."),
          ("low", ["crawford-2010"]), ("placenta_ii", "placenta_iii", ["crawford-2010"]),
          [("dynamic_accumulator", "extraction", [P]), ("mulch", "extraction", [P]), ("insectary", "extraction", [P])],
          {"height_m": (1, 2), "width_max_m": 1.2, "soil_ph": (6.0, 8.0), "well_drained": True, "drought_tolerance": "Medium", "edibility_rating": 4,
           "habit": "Herbaceous", "taproot_persistent": True, "root_system_type": "Taproot", "root_depth_min_cm": 120},
          {"invasive_in": inv("AR", "AU", "US", "CL"), "weed_potential": True}),
    taxon("Vicia faba", "Vicia", "Fabaceae", {"en": "Broad bean", "fr": "Fève", "es": "Haba", "it": "Fava", "zh": "蚕豆"},
          "crop", R("Winter crop that fixes nitrogen in the first season.", "Culture d’hiver qui fixe l’azote dès la première saison."),
          ("low", ["crawford-2010"]), ("placenta_i", "placenta_i", ["crawford-2010"]),
          [("nitrogen_fixer", "rule", ["rule-legume"]), ("pollinator_forage", "import", [P])],
          {"height_m": (0.5, 1.2), "width_max_m": 0.3, "soil_ph": (6.0, 8.0), "edibility_rating": 5, "habit": "Herbaceous", "is_annual": True,
           "is_perennial": False, "nitrogen_fixer": True},
          {"toxicity": tox("Moderate", "Can cause severe anaemia in people with G6PD deficiency (favism).", "Peut provoquer une anémie grave chez les personnes ayant un déficit en G6PD (favisme).")}),
    taxon("Lavandula angustifolia", "Lavandula", "Lamiaceae", {"en": "Lavender", "fr": "Lavande", "es": "Lavanda", "it": "Lavanda", "de": "Lavendel"},
          "support", R("Long-flowering insect magnet for dry edges.", "Aimant à insectes à longue floraison pour les bordures sèches."),
          ("low", ["crawford-2010"]), ("placenta_ii", "secondary_i", ["crawford-2010"]),
          [("insectary", "extraction", [P]), ("pollinator_forage", "import", [P])],
          {"height_m": (0.3, 0.8), "width_max_m": 0.8, "semi_shade": False, "soil_ph": (6.5, 8.5), "well_drained": True, "drought_tolerance": "High",
           "deciduous_evergreen": "Evergreen", "edibility_rating": 2, "habit": "Shrub"},
          {"invasive_in": []}),
]
MED_INTER = []

TEMPERATE = [
    taxon("Juglans nigra", "Juglans", "Juglandaceae", {"en": "Black walnut", "fr": "Noyer noir", "de": "Schwarznuss"},
          "crop", R("Valuable nut and timber tree; its juglone holds back many neighbours.", "Arbre à noix et bois précieux ; sa juglone freine beaucoup de voisins."),
          ("emergent", ["jacke-2005"]), ("secondary_ii", "climax", ["jacke-2005"]),
          [("wildlife_habitat", "import", [P])],
          {"height_m": (20, 30), "width_max_m": 18, "semi_shade": False, "hardiness_zone": (4, 9), "soil_ph": (6.0, 7.5), "well_drained": True,
           "deciduous_evergreen": "Deciduous", "lifespan": "Long", "growth_rate": "Medium", "age_of_maturity_years": 10, "edibility_rating": 4,
           "habit": "Tree", "taproot_persistent": True, "root_system_type": "Deep taproot"},
          {"allelopathic": True, "invasive_in": inv("AT", "DE", "CZ")}),
    taxon("Malus domestica", "Malus", "Rosaceae", {"en": "Apple", "fr": "Pommier", "de": "Apfel", "es": "Manzano", "it": "Melo", "ja": "リンゴ"},
          "crop", R("Staple fruit tree of temperate food forests.", "Arbre fruitier de base des forêts comestibles tempérées."),
          ("high", ["crawford-2010"]), ("secondary_ii", "secondary_iii", ["crawford-2010"]),
          [("pollinator_forage", "import", [P])],
          {"height_m": (None, 10), "width_max_m": 8, "semi_shade": True, "hardiness_zone": (3, 8), "frost_tender": False, "soil_ph": (5.5, 7.5),
           "well_drained": True, "moisture_use": "Medium", "fertility_requirement": "Medium", "deciduous_evergreen": "Deciduous",
           "active_growth_period": "Spring and Summer", "bloom_period": "Mid Spring", "lifespan": "Long", "growth_rate": "Medium", "mycorrhizal_type": "AM",
           "edibility_rating": 5, "self_fertile": False, "sexual_system": "Hermaphrodite", "pollinators": ["Bees", "Insects"], "vegetative_spread_rate": "None",
           "habit": "Tree"},
          {}),
    taxon("Juniperus virginiana", "Juniperus", "Cupressaceae", {"en": "Eastern red cedar", "fr": "Genévrier de Virginie"},
          "support", R("Evergreen windbreak; hosts cedar-apple rust.", "Brise-vent persistant ; hôte de la rouille grillagée du pommier."),
          ("high", ["jacke-2005"]), ("secondary_i", "climax", ["jacke-2005"]),
          [("windbreak", "curated", ["jacke-2005"]), ("wildlife_habitat", "import", [P])],
          {"height_m": (10, 20), "width_max_m": 6, "semi_shade": False, "hardiness_zone": (2, 9), "drought_tolerance": "High", "deciduous_evergreen": "Evergreen",
           "lifespan": "Long", "edibility_rating": 1, "habit": "Tree"},
          {"toxicity": tox("Slight", "Berries and leaves can be harmful in quantity.", "Baies et feuilles peuvent être nocives en quantité."), "weed_potential": True}),
    taxon("Alnus cordata", "Alnus", "Betulaceae", {"en": "Italian alder", "fr": "Aulne de Corse", "it": "Ontano napoletano"},
          "support", R("Nitrogen-fixing nurse tree that thrives on dry soils too.", "Arbre nourricier fixateur d’azote qui réussit aussi en sol sec."),
          ("high", ["crawford-2010"]), ("placenta_iii", "secondary_ii", ["crawford-2010"]),
          [("nitrogen_fixer", "import", ["try"]), ("windbreak", "curated", ["crawford-2010"]), ("mulch", "curated", ["crawford-2010"])],
          {"height_m": (10, 25), "width_max_m": 8, "semi_shade": False, "hardiness_zone": (5, 8), "soil_ph": (5.0, 8.0), "drought_tolerance": "Medium",
           "deciduous_evergreen": "Deciduous", "growth_rate": "Fast", "edibility_rating": 0, "habit": "Tree", "nitrogen_fixer": True},
          {"invasive_in": []}),
    taxon("Elaeagnus umbellata", "Elaeagnus", "Elaeagnaceae", {"en": "Autumn olive", "fr": "Chalef d’automne"},
          "support", R("Nitrogen-fixing shrub with edible berries; highly invasive in North America.", "Arbuste fixateur d’azote aux baies comestibles ; très envahissant en Amérique du Nord."),
          ("medium", ["jacke-2005"]), ("placenta_iii", "secondary_ii", ["jacke-2005"]),
          [("nitrogen_fixer", "import", ["try"]), ("wildlife_habitat", "import", [P]), ("pollinator_forage", "import", [P])],
          {"height_m": (3, 5), "width_max_m": 4, "semi_shade": True, "hardiness_zone": (3, 7), "soil_ph": (5.0, 8.0), "drought_tolerance": "High",
           "deciduous_evergreen": "Deciduous", "growth_rate": "Fast", "edibility_rating": 4, "habit": "Shrub", "nitrogen_fixer": True},
          {"invasive_in": inv("US", "CA"), "weed_potential": True}),
    taxon("Elaeagnus multiflora", "Elaeagnus", "Elaeagnaceae", {"en": "Goumi", "fr": "Chalef à fleurs nombreuses", "ja": "ナツグミ", "zh": "木半夏"},
          "crop", R("Nitrogen-fixing fruit shrub of East Asia's temperate hedges.", "Arbuste fruitier fixateur d’azote des haies tempérées d’Asie de l’Est."),
          ("medium", ["crawford-2010"]), ("placenta_iii", "secondary_ii", ["crawford-2010"]),
          [("nitrogen_fixer", "import", ["try"]), ("pollinator_forage", "import", [P])],
          {"height_m": (2, 3), "width_max_m": 2, "semi_shade": True, "hardiness_zone": (5, 8), "soil_ph": (5.5, 7.5), "drought_tolerance": "Medium",
           "deciduous_evergreen": "Deciduous", "growth_rate": "Medium", "edibility_rating": 4, "habit": "Shrub", "nitrogen_fixer": True,
           "self_fertile": True, "pollinators": ["Bees"]},
          {"invasive_in": []}),
    taxon("Corylus avellana", "Corylus", "Betulaceae", {"en": "Hazel", "fr": "Noisetier", "de": "Haselnuss", "it": "Nocciolo", "es": "Avellano"},
          "crop", R("Nut shrub that coppices and fills the middle layer.", "Arbuste à noisettes qui se recèpe et remplit l’étage moyen."),
          ("medium", ["crawford-2010"]), ("secondary_i", "secondary_iii", ["crawford-2010"]),
          [("wildlife_habitat", "import", [P]), ("windbreak", "curated", ["crawford-2010"])],
          {"height_m": (3, 6), "width_max_m": 4, "semi_shade": True, "hardiness_zone": (4, 8), "soil_ph": (5.5, 7.5), "deciduous_evergreen": "Deciduous",
           "edibility_rating": 4, "habit": "Shrub", "self_fertile": False, "pollinators": ["Wind"], "mycorrhizal_type": "EcM"},
          {"invasive_in": []}),
    taxon("Ribes nigrum", "Ribes", "Grossulariaceae", {"en": "Blackcurrant", "fr": "Cassissier", "de": "Schwarze Johannisbeere"},
          "crop", R("Shade-tolerant fruit bush for the lower layer.", "Arbuste fruitier tolérant l’ombre pour l’étage bas."),
          ("low", ["crawford-2010"]), ("placenta_iii", "secondary_ii", ["crawford-2010"]),
          [("pollinator_forage", "import", [P])],
          {"height_m": (1, 2), "width_max_m": 1.5, "semi_shade": True, "hardiness_zone": (4, 8), "moisture_use": "Medium", "edibility_rating": 4,
           "habit": "Shrub", "self_fertile": True},
          {"invasive_in": []}),
    taxon("Symphytum × uplandicum", "Symphytum", "Boraginaceae", {"en": "Russian comfrey", "fr": "Consoude de Russie", "de": "Futter-Beinwell"},
          "support", R("Deep-rooted mulch plant cut several times a year.", "Plante à paillis aux racines profondes, coupée plusieurs fois par an."),
          ("low", ["crawford-2010"]), ("placenta_ii", "secondary_iii", ["crawford-2010"]),
          [("dynamic_accumulator", "curated", ["crawford-2010"]), ("mulch", "curated", ["crawford-2010"]), ("pollinator_forage", "import", [P])],
          {"height_m": (0.6, 1.5), "width_max_m": 1, "semi_shade": True, "hardiness_zone": (4, 9), "moisture_use": "Medium", "edibility_rating": 1,
           "habit": "Herbaceous", "taproot_persistent": True, "root_system_type": "Taproot", "root_depth_min_cm": 150},
          {"toxicity": tox("Moderate", "Contains pyrrolizidine alkaloids that can damage the liver if eaten.", "Contient des alcaloïdes pyrrolizidiniques qui peuvent abîmer le foie s’ils sont consommés.")}),
    taxon("Trifolium repens", "Trifolium", "Fabaceae", {"en": "White clover", "fr": "Trèfle blanc", "de": "Weißklee", "es": "Trébol blanco", "ja": "シロツメクサ"},
          "support", R("Living mulch that fixes nitrogen and feeds bees.", "Paillis vivant qui fixe l’azote et nourrit les abeilles."),
          ("low", ["crawford-2010"]), ("placenta_i", "secondary_i", ["crawford-2010"]),
          [("ground_cover", "curated", ["crawford-2010"]), ("nitrogen_fixer", "rule", ["rule-legume"]), ("pollinator_forage", "import", [P])],
          {"height_m": (0.1, 0.3), "width_max_m": 1, "semi_shade": True, "hardiness_zone": (3, 10), "moisture_use": "Medium", "edibility_rating": 2,
           "habit": "Herbaceous", "nitrogen_fixer": True, "vegetative_spread_rate": "Rapid"},
          {"invasive_in": []}),
    taxon("Fragaria vesca", "Fragaria", "Rosaceae", {"en": "Wild strawberry", "fr": "Fraisier des bois", "de": "Walderdbeere"},
          "crop", R("Edible ground cover for part shade.", "Couvre-sol comestible pour la mi-ombre."),
          ("low", ["crawford-2010"]), ("placenta_ii", "secondary_ii", ["crawford-2010"]),
          [("ground_cover", "curated", ["crawford-2010"])],
          {"height_m": (0.1, 0.25), "width_max_m": 0.5, "semi_shade": True, "full_shade": False, "hardiness_zone": (5, 9), "edibility_rating": 4,
           "habit": "Herbaceous", "vegetative_spread_rate": "Moderate"},
          {"invasive_in": []}),
    taxon("Allium schoenoprasum", "Allium", "Amaryllidaceae", {"en": "Chives", "fr": "Ciboulette", "de": "Schnittlauch"},
          "crop", R("Tough edging herb whose flowers draw beneficial insects.", "Aromatique de bordure robuste dont les fleurs attirent les auxiliaires."),
          ("low", ["crawford-2010"]), ("placenta_i", "secondary_i", ["crawford-2010"]),
          [("insectary", "extraction", [P]), ("pest_repellent", "extraction", [P])],
          {"height_m": (0.2, 0.4), "width_max_m": 0.3, "semi_shade": True, "hardiness_zone": (3, 9), "edibility_rating": 4, "habit": "Herbaceous"},
          {"invasive_in": []}),
    taxon("Phacelia tanacetifolia", "Phacelia", "Boraginaceae", {"en": "Phacelia", "fr": "Phacélie", "de": "Büschelschön"},
          "support", R("First-season flowers that build soil and draw hoverflies.", "Fleurs de première saison qui nourrissent le sol et attirent les syrphes."),
          ("low", ["crawford-2010"]), ("placenta_i", "placenta_i", ["crawford-2010"]),
          [("insectary", "curated", ["crawford-2010"]), ("pollinator_forage", "import", [P])],
          {"height_m": (0.4, 0.9), "width_max_m": 0.3, "edibility_rating": 0, "habit": "Herbaceous", "is_annual": True, "is_perennial": False},
          {"invasive_in": []}),
]
TEMP_INTER = [
    {"subject": {"name": "Juniperus", "rank": "genus"}, "object": {"name": "Malus", "rank": "genus"},
     "type": "alternate_host", "agent": "Gymnosporangium juniperi-virginianae", "severity": "high",
     "note": R("Cedar-apple rust alternates between junipers and apples; keep them apart.", "La rouille grillagée alterne entre genévriers et pommiers ; éloignez-les."),
     "sources": ["extension-rust"]},
    {"subject": {"name": "Juglans nigra", "rank": "species"}, "object": {"name": "Malus", "rank": "genus"},
     "type": "allelopathic_harm", "agent": "juglone", "severity": "high",
     "note": R("Apples planted within the walnut's root zone often decline.", "Les pommiers plantés dans la zone racinaire du noyer dépérissent souvent."),
     "sources": ["extension-juglone"]},
    {"subject": {"name": "Juglans nigra", "rank": "species"}, "object": {"name": "Symphytum", "rank": "genus"},
     "type": "allelopathy_tolerant", "agent": "juglone", "severity": None,
     "note": R("Comfrey is reported to grow well near walnuts.", "La consoude pousserait bien près des noyers."),
     "sources": ["extension-juglone"]},
]


ALL_TAXA = TROPICAL + MEDITERRANEAN + TEMPERATE
if NAMES_ONLY:
    print("\n".join(sorted({t["canonical_name"] for t in ALL_TAXA})))
    sys.exit(0)
missing = sorted({t["canonical_name"] for t in ALL_TAXA} - set(GRIIS))
assert not missing, f"griis.json has no entry for {missing}; regenerate it (README.md)"


def with_griis(t):
    """Invented invasive_in lists may add countries, but never hide a real GRIIS record: a plant
    GRIIS records invasive in a country always lists that country, so the fixture never shows
    "not recorded invasive" where GRIIS says otherwise."""
    listed = [c["country"] for c in t["warnings"]["invasive_in"]]
    real = [c for c in GRIIS[t["canonical_name"]] if c not in listed]
    if not real:
        return t
    t = dict(t)
    t["warnings"] = dict(t["warnings"], invasive_in=t["warnings"]["invasive_in"] + inv(*real))
    return t


def used_sources(taxa, inter):
    ids = set()
    for t in taxa:
        for r in t["reasons"]:
            ids.update(r["sources"])
        for k in ("stratum", "phases"):
            if t[k]:
                ids.update(t[k]["sources"])
        for f in t["functions"] or []:
            ids.update(f["sources"])
        w = t["warnings"]
        if w["toxicity"]:
            ids.update(w["toxicity"]["sources"])
        for c in w["invasive_in"] or []:
            ids.update(c["sources"])
    for i in inter:
        ids.update(i["sources"])
    return {k: SOURCES[k] for k in sorted(ids)}


REGION_ORDER = ["europe", "africa", "asia_temperate", "asia_tropical", "australasia", "pacific",
                "northern_america", "southern_america"]
# Format 3 unites a climate's cells. The fixture's Temperate climate has a second, invented
# cell (Temperate x asia_temperate) that chose two of its taxa again, so a taxon shows two reasons,
# and chose one taxon alone (ONLY_IN), so a taxon's only reason is not the file's first region.
EXTRA_REASONS = {
    "Temperate": {
        "Malus domestica": [{"region": "asia_temperate",
                             "text": R("Grown across temperate Asia, where the apple was domesticated.",
                                       "Cultivé dans toute l’Asie tempérée, où le pommier a été domestiqué."),
                             "sources": ["jacke-2005"]}],
        "Allium schoenoprasum": [{"region": "asia_temperate",
                                  "text": R("Native perennial onion of temperate Asia's meadows."),
                                  "sources": ["sample-review"]}],
    },
}


# Taxa chosen by one cell only, not the climate's first: (zone, name) -> region.
ONLY_IN = {("Temperate", "Elaeagnus multiflora"): "asia_temperate"}
# Like the real export, most reasons cite the sample review and a few cite a book.
REASON_SOURCES = {"Olea europaea": ["crawford-2010"], "Arachis pintoi": ["toensmeier-2016"],
                  "Corylus avellana": ["crawford-2010"]}


def climate_file(zone, region, taxa, inter):
    """One climate file: the first cell's reasons, then the extra cells' (region order)."""
    extra = EXTRA_REASONS.get(zone, {})
    out = []
    for t in sorted(taxa, key=lambda t: t["canonical_name"]):
        t = with_griis(dict(t))
        assert set(GRIIS[t["canonical_name"]]) <= {c["country"] for c in t["warnings"]["invasive_in"]}
        reasons = [{"region": ONLY_IN.get((zone, t["canonical_name"]), region), "text": t["reasons"],
                    "sources": REASON_SOURCES.get(t["canonical_name"], ["sample-review"])}]
        reasons += extra.get(t["canonical_name"], [])
        t["reasons"] = sorted(reasons, key=lambda r: REGION_ORDER.index(r["region"]))
        for c in t["warnings"]["invasive_in"] or []:
            assert COUNTRIES[c["country"]]["invasive_checked"], c  # GRIIS has a checklist there
        out.append(t)
    regions = sorted({r["region"] for t in out for r in t["reasons"]}, key=REGION_ORDER.index)
    inter = sorted(inter, key=lambda i: (i["subject"]["name"], i["object"]["name"], i["type"]))
    return {"format_version": 3, "climate_zone": zone, "regions": regions, "generated_at": GEN,
            "sources": used_sources(out, inter), "taxa": out, "interactions": inter}


os.makedirs(OUT, exist_ok=True)
# In climate-zone order (Tropical, Subtropical, Arid, Mediterranean, Temperate, Continental, Boreal).
files = {
    "tropical.json": climate_file("Tropical", "southern_america", TROPICAL, TROP_INTER),
    "mediterranean.json": climate_file("Mediterranean", "europe", MEDITERRANEAN, MED_INTER),
    "temperate.json": climate_file("Temperate", "europe", TEMPERATE, TEMP_INTER),
}
labels = {
    "moisture_use": {"High": {"fr": "Élevée"}, "Medium": {"fr": "Moyenne"}},
    "drought_tolerance": {"High": {"fr": "Élevée"}, "Medium": {"fr": "Moyenne"}, "Low": {"fr": "Faible"}},
    "deciduous_evergreen": {"Deciduous": {"fr": "Caduc", "de": "Laubabwerfend"}, "Evergreen": {"fr": "Persistant", "de": "Immergrün"}},
    "habit": {"Tree": {"fr": "Arbre"}, "Shrub": {"fr": "Arbuste"}, "Herbaceous": {"fr": "Herbacée"}, "Climber": {"fr": "Grimpante"}},
    "lifespan": {"Long": {"fr": "Longue"}, "Medium": {"fr": "Moyenne"}, "Short": {"fr": "Courte"}},
    "toxicity.level": {"None": {"fr": "Aucune"}, "Slight": {"fr": "Légère"}, "Moderate": {"fr": "Modérée"}, "Severe": {"fr": "Grave"}},
}
manifest_climates = []
blobs = {}
for name, data in files.items():
    b = (json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    blobs[name] = b
    manifest_climates.append({"climate_zone": data["climate_zone"], "file": name, "regions": data["regions"],
                              "taxa": len(data["taxa"]), "interactions": len(data["interactions"]),
                              "sha256": hashlib.sha256(b).hexdigest()})
blobs["labels.json"] = (json.dumps(labels, ensure_ascii=False, indent=2) + "\n").encode()
manifest = {"format_version": 3, "generated_at": GEN, "canopi_db_sha256": "0" * 64,
            "climates": manifest_climates,
            "locales": ["en", "fr", "es", "pt", "it", "zh", "de", "ja", "ko", "nl", "ru"],
            "countries": {k: {"invasive_checked": bool(COUNTRIES[k]["invasive_checked"])} for k in sorted(COUNTRIES)}}
blobs["manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
sums = "".join(f"{hashlib.sha256(b).hexdigest()}  {n}\n" for n, b in sorted(blobs.items()))
for n, b in blobs.items():
    open(os.path.join(OUT, n), "wb").write(b)
open(os.path.join(OUT, "SHA256SUMS"), "w").write(sums)
open(os.path.join(OUT, "README.md"), "w").write(
    "# Illustrative consortium fixture (format 3)\n\n"
    "Plausible but **invented** plant values for building and testing the consortium tool before real data exists.\n"
    "Never shipped: `canopi_db_sha256` is all zeros, which a real install must reject, and the directory sits\n"
    "outside `public/`, so it never reaches `dist/`. Built from the example in canopi-data `docs/consortium-export-format.md` and\n"
    "valid against its `docs/consortium-export.schema.json` (format 3: one file per climate).\n\n"
    "Climates: Tropical (southern_america, leads the mockups), Mediterranean (europe), Temperate (europe and an\n"
    "invented asia_temperate cell, so Malus domestica and Allium schoenoprasum each show two `reasons`, and\n"
    "Elaeagnus multiflora has only an asia_temperate reason). Most reasons cite the sample review, a few a book,\n"
    "as in the real export.\n"
    "`countries` in the manifest is the real list from canopi-data, with the real GRIIS coverage (`invasive_checked`),\n"
    "not invented; every `invasive_in` country is a checked one. `invasive_in` lists are invented, but each one\n"
    "also holds every country where GRIIS really records the plant invasive (`griis.json`), so the fixture never\n"
    "shows \"not recorded invasive\" where GRIIS says otherwise.\n\n"
    "Covers: null versus `[]` (`toxicity`), `functions: null` and a taxon with no stratum or phases yet\n"
    "(Zingiber officinale), invasive in a few or many countries, every toxicity level, genus, species and family-rank\n"
    "interactions, allelopathy with and without a recorded target, `allelopathy_tolerant`, missing names per locale,\n"
    "a climate with no interactions (`[]`, checked none), a reason per region with its source, an interaction of a\n"
    "region-bound agent with two sources (Psidium guajava x Citrus, copied from the real export of 2026-10-28: the\n"
    "EPPO host page, then the distribution page its \"only in the Americas\" note rests on), countries GRIIS\n"
    "does not cover (`invasive_checked: false`, for example TW, PR, PF and the six Antarctic codes).\n"
    "`invasive_in` is never null here: the exporter writes null for every taxon, with every country unchecked,\n"
    "only when the GRIIS compendium is missing, so a test that needs it sets it on a copy.\n\n"
    "Regenerate (needs ../canopi-data):\n\n"
    "```sh\n"
    "(cd ../canopi-data && uv run python -c 'import json; from pathlib import Path; "
    "from canopi.curated.regions import COUNTRIES; "
    "from canopi.curated.consortium_export import DEFAULT_GRIIS_PATH, griis_checked_countries as g; "
    "c = g(DEFAULT_GRIIS_PATH); print(json.dumps({k: {\"invasive_checked\": k in c} for k in COUNTRIES}))') "
    "> /tmp/countries.json\n"
    "python3 -I scripts/fixtures/consortium/make_fixture.py --names > /tmp/names.txt\n"
    "(cd ../canopi-data && uv run python -c 'import json, sys; "
    "from canopi.curated.consortium_export import DEFAULT_GRIIS_PATH, griis_invasive_countries as g; "
    "print(json.dumps(g(DEFAULT_GRIIS_PATH, set(filter(None, sys.stdin.read().splitlines()))), sort_keys=True))' "
    "< /tmp/names.txt) > /tmp/griis.json\n"
    "python3 -I scripts/fixtures/consortium/make_fixture.py scripts/fixtures/consortium /tmp/countries.json "
    "/tmp/griis.json\n"
    "```\n")
for n, b in sorted(blobs.items()):
    print(f"{n:22s} {len(b):7d} bytes")
