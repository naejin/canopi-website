// The invented consortium v2 fixture: a canopi-data export of format 4, schema 1 (canopi-data
// docs/consortium-export-v2.md), small enough to read, built in Node with node:sqlite (coordinator
// row "v2 build setup", 2026-11-11: no Python on the website). See README.md for what it covers.
//
//   node scripts/fixtures/consortium-v2/make-fixture.mjs [<export-dir>]
//
// writes the export directory (default: scripts/fixtures/consortium-v2/export/, committed): the
// gzipped database under its contract name, manifest.json, SHA256SUMS, try_references.tsv and
// source_credits.tsv. Tests import writeFixtureExport() and pass `edit` (SQL run on the filled
// database), `manifest` (an edit of the manifest object) or `after` (a hook on the directory) to
// build the broken variants they need.
//
// The values are plausible but INVENTED: never shipped. canopi_db_sha256 is all zeros, which a real
// install refuses, and the release id ends in f1c7.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { DDL, DATA_TABLES } from '../../consortium-schema.mjs';

export const FIXTURE_RELEASE = 'r-000000000000f1c7';
export const FIXTURE_BUILT_AT = '2026-11-11T00:00:00Z';
export const DEFAULT_EXPORT = join(dirname(fileURLToPath(import.meta.url)), 'export');
const ZERO_SHA = '0'.repeat(64);

export { DDL, DATA_TABLES };

const CLIMATE_ORDER = ['Tropical', 'Subtropical', 'Arid', 'Mediterranean', 'Temperate', 'Continental', 'Boreal'];
// Three curated climates, as the real export; Arid and the others are uncovered ("Ask for this climate").
export const FIXTURE_CLIMATES = ['Tropical', 'Mediterranean', 'Temperate'];
const REGIONS = { Tropical: ['southern_america'], Mediterranean: ['europe'], Temperate: ['europe', 'asia_temperate'] };
const STRATA = ['emergent', 'high', 'medium', 'low'];
const PHASES = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];
export const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];

const SOURCES = [
  ['sample-review', 'Canopi sample review', null, null, null],
  ['pfaf', 'Plants For A Future', 'https://pfaf.org/', null, 'Plants For A Future (pfaf.org)'],
  ['try', 'TRY Plant Trait Database', 'https://www.try-db.org/', null, null],
  ['canopi-correction', 'Canopi reader correction', null, null, null],
  ['griis', 'Global Register of Introduced and Invasive Species', 'https://griis.org/', 'CC BY 4.0', null],
  ['wcvp', 'World Checklist of Vascular Plants', 'https://powo.science.kew.org/', 'CC BY 4.0', 'Royal Botanic Gardens, Kew'],
  ['eppo', 'EPPO Global Database', 'https://gd.eppo.int/', null, null],
  ['eppo-distribution', 'EPPO distribution page', 'https://gd.eppo.int/taxon/ANSTOB/distribution', null, null],
  ['wikipedia', 'Wikipedia', 'https://www.wikipedia.org/', 'CC BY-SA 4.0', null],
  ['crawford-2010', 'Crawford, Creating a Forest Garden (2010)', null, null, null],
  ['yield-trials', 'Intercropping trials review', 'https://example.org/intercropping-review', null, null],
  ['phenology-photos', 'Dated photographs (derived months)', null, null, null],
];

// Countries: a handful, with invented GRIIS coverage (TW, PR and AQ unchecked: "not checked", never "none").
const COUNTRIES = [['AQ', 0], ['AU', 1], ['BR', 1], ['DE', 1], ['ES', 1], ['FR', 1], ['GB', 1], ['IT', 1], ['NZ', 1], ['PR', 0], ['PT', 1], ['TW', 0], ['US', 1], ['ZA', 1]];
const AREAS = [['BZE', 'southern_america'], ['BZN', 'southern_america'], ['CHC', 'asia_temperate'], ['FRA', 'europe'], ['GER', 'europe'], ['GRB', 'europe'], ['ITA', 'europe'], ['PER', 'southern_america'], ['SPA', 'europe']];
const LABELS = [
  ['moisture_use', 'High', 'fr', 'Élevée'], ['moisture_use', 'Low', 'fr', 'Faible'], ['moisture_use', 'Medium', 'fr', 'Moyenne'],
  ['drought_tolerance', 'High', 'fr', 'Élevée'], ['drought_tolerance', 'Low', 'fr', 'Faible'], ['drought_tolerance', 'None', 'fr', 'Aucune'],
  ['toxicity', 'Severe', 'fr', 'Grave'], ['toxicity', 'Moderate', 'fr', 'Modérée'], ['toxicity', 'Slight', 'fr', 'Légère'], ['toxicity', 'None', 'fr', 'Aucune'],
  ['pollinators', 'Bees', 'fr', 'Abeilles'], ['pollinators', 'Bees', 'de', 'Bienen'], ['habit', 'Tree', 'fr', 'Arbre'], ['habit', 'Climber', 'fr', 'Grimpante'],
];

// One plant: [canonical, family, traits, placements by climate ([role, stratum|null, start, end]), names, extras].
// Traits keys: h [min, max] (null: height not recorded), w width, sun/semi/shade, ph [min, max], wd well drained,
// moist, drought, habit, annual, nfix, tox, allelo, weed, wcvp ('accepted' unless given; null: not found).
const P = [
  // Temperate. Emergent starts at secondary I or later, all taller than 6 m (Room Small: "No plant fits
  // your site here"); low starts at placenta II (Temperate low × placenta I: "No plant in the list
  // for this cell yet", as in the real export).
  ['Castanea sativa', 'Fagaceae', { h: [20, 35], w: 15, sun: 1, semi: 1, shade: 0, ph: [4.5, 6.5], wd: 1, moist: 'Medium', drought: 'Medium', habit: 'Tree', tox: 'None' }, { Temperate: ['crop', 'emergent', 3, 6], Mediterranean: ['crop', 'emergent', 3, 6] }, { en: 'European chestnut', fr: 'Châtaignier', de: 'Edelkastanie', es: 'Castaño', it: 'Castagno', zh: '欧洲栗', ja: 'ヨーロッパグリ', ru: 'Каштан посевной' }, { image: ['https://upload.wikimedia.org/wikipedia/commons/a/ab/Castanea_sativa_fixture.jpg', 'Invented Photographer', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Castanea_sativa_fixture.jpg'], functions: ['wildlife_habitat', 'pollinator_forage'] }],
  ['Juglans regia', 'Juglandaceae', { h: [15, 25], w: 15, sun: 1, semi: 0, shade: 0, ph: [6, 8], moist: 'Medium', drought: 'Medium', habit: 'Tree', allelo: 1, tox: 'Slight' }, { Temperate: ['crop', 'emergent', 4, 6] }, { en: 'Walnut', fr: 'Noyer commun', de: 'Walnuss' }, { functions: ['wildlife_habitat'] }],
  ['Quercus robur', 'Fagaceae', { h: [25, 40], w: 25, sun: 1, semi: 1, shade: 0, ph: [4.5, 7.5], moist: 'Medium', drought: 'Medium', habit: 'Tree', tox: 'Moderate' }, { Temperate: ['support', 'emergent', 5, 6] }, { en: 'English oak', fr: 'Chêne pédonculé', de: 'Stieleiche' }, { image: ['https://upload.wikimedia.org/wikipedia/commons/c/cd/Quercus_robur_fixture.jpg', null, 'CC0', 'https://commons.wikimedia.org/wiki/File:Quercus_robur_fixture.jpg'], functions: ['wildlife_habitat', 'windbreak'] }],
  ['Robinia pseudoacacia', 'Fabaceae', { h: [12, 25], w: 12, sun: 1, semi: 0, shade: 0, ph: [4.5, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Tree', nfix: 1, tox: 'Severe', weed: 1 }, { Temperate: ['support', 'emergent', 2, 5] }, { en: 'Black locust', fr: 'Robinier faux-acacia', de: 'Gewöhnliche Robinie' }, { functions: ['nitrogen_fixer', 'pollinator_forage'], invasive: ['DE', 'FR', 'IT', 'ZA'] }],
  ['Malus domestica', 'Rosaceae', { h: [4, 10], w: 8, sun: 1, semi: 1, shade: 0, ph: [5.5, 7.5], moist: 'Medium', drought: 'Low', habit: 'Tree', tox: 'Slight' }, { Temperate: ['crop', 'high', 3, 5], Mediterranean: ['crop', 'medium', 3, 5] }, { en: 'Apple', fr: 'Pommier', de: 'Kulturapfel', es: 'Manzano' }, { image: ['https://upload.wikimedia.org/wikipedia/commons/1/15/Malus_domestica_fixture.jpg', 'Invented Photographer', 'CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:Malus_domestica_fixture.jpg'], functions: ['pollinator_forage'], reasons2: true }],
  ['Pyrus communis', 'Rosaceae', { h: [8, 15], w: 8, sun: 1, semi: 1, shade: 0, ph: [6, 7.5], moist: 'Medium', drought: 'Medium', habit: 'Tree' }, { Temperate: ['crop', 'high', 3, 6] }, { en: 'Pear', fr: 'Poirier' }, { functions: ['pollinator_forage'] }],
  ['Sambucus nigra', 'Viburnaceae', { h: [4, 6], w: 4, sun: 1, semi: 1, shade: 0, ph: [5.5, 8], moist: 'Medium', drought: 'Medium', habit: 'Shrub', tox: 'Moderate' }, { Temperate: ['support', 'high', 2, 4] }, { en: 'Elder', fr: 'Sureau noir', de: 'Schwarzer Holunder' }, { functions: ['insectary', 'wildlife_habitat'] }],
  ['Taxus baccata', 'Taxaceae', { ever: 1, h: [10, 20], w: 8, sun: 1, semi: 1, shade: 1, ph: [5, 8], moist: 'Medium', drought: 'Medium', habit: 'Tree', tox: 'Severe' }, { Temperate: ['support', 'high', 5, 6] }, { en: 'Yew', fr: 'If commun' }, { functions: ['windbreak'] }],
  ['Corylus avellana', 'Betulaceae', { h: [3, 6], w: 4, sun: 1, semi: 1, shade: 0, ph: [5.5, 7.5], moist: 'Medium', drought: 'Medium', habit: 'Shrub', tox: 'None' }, { Temperate: ['crop', 'medium', 2, 5] }, { en: 'Hazel', fr: 'Noisetier', de: 'Gemeine Hasel' }, { functions: ['wildlife_habitat'] }],
  ['Ribes nigrum', 'Grossulariaceae', { h: [1, 2], w: 1.5, sun: 1, semi: 1, shade: 0, ph: [5.5, 7], moist: 'High', drought: 'Low', habit: 'Shrub' }, { Temperate: ['crop', 'medium', 1, 3] }, { en: 'Blackcurrant', fr: 'Cassis' }, { functions: ['pollinator_forage'] }],
  ['Elaeagnus umbellata', 'Elaeagnaceae', { h: [3, 5], w: 4, sun: 1, semi: 1, shade: 0, ph: [5, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Shrub', nfix: 1, weed: 1 }, { Temperate: ['support', 'medium', 1, 4] }, { en: 'Autumn olive', fr: 'Chalef en ombelle' }, { functions: ['nitrogen_fixer', 'windbreak'], invasive: ['US', 'NZ'], wcvp: 'synonym' }],
  ['Helianthus annuus', 'Asteraceae', { h: [1, 3], w: 0.6, sun: 1, semi: 0, shade: 0, ph: [6, 7.5], moist: 'Medium', drought: 'Medium', annual: 1, habit: 'Herb' }, { Temperate: ['crop', 'medium', 0, 1] }, { en: 'Sunflower', fr: 'Tournesol', de: 'Sonnenblume' }, { functions: ['pollinator_forage', 'trap_crop'] }],
  ['Rubus idaeus', 'Rosaceae', { h: [1, 2], w: 1, sun: 1, semi: 1, shade: 0, ph: [5.5, 7], moist: 'Medium', drought: 'Low', habit: 'Shrub' }, { Temperate: ['crop', 'medium', 1, 3] }, { en: 'Raspberry', fr: 'Framboisier' }, { functions: [] }],
  ['Juniperus communis', 'Cupressaceae', { h: [1, 10], w: 3, sun: 1, semi: 0, shade: 0, ph: [5, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Shrub' }, { Temperate: ['support', 'medium', 3, 6] }, { en: 'Juniper', fr: 'Genévrier commun' }, { functions: ['wildlife_habitat'] }],
  ['Vaccinium myrtillus', 'Ericaceae', { h: [0.2, 0.6], w: 0.5, sun: 1, semi: 1, shade: 1, ph: [4, 5.5], moist: 'Medium', drought: 'Low', habit: 'Shrub' }, { Temperate: ['crop', 'low', 1, 6] }, { en: 'Bilberry', fr: 'Myrtille', de: 'Heidelbeere' }, { functions: ['ground_cover'] }],
  ['Fragaria vesca', 'Rosaceae', { h: [0.1, 0.3], w: 0.3, sun: 1, semi: 1, shade: 0, ph: [5, 7], moist: 'Medium', drought: 'Low', habit: 'Herb' }, { Temperate: ['crop', 'low', 1, 4] }, { en: 'Wild strawberry', fr: 'Fraisier des bois', de: 'Wald-Erdbeere' }, { image: ['https://upload.wikimedia.org/wikipedia/commons/2/2e/Fragaria_vesca_fixture.jpg', 'Invented Photographer', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Fragaria_vesca_fixture.jpg'], functions: ['ground_cover'] }],
  ['Allium cepa', 'Amaryllidaceae', { h: [0.3, 0.6], w: 0.2, sun: 1, semi: 0, shade: 0, ph: [6, 7.5], moist: 'Medium', drought: 'Low', habit: 'Herb', tox: 'Slight' }, { Temperate: ['crop', 'low', 1, 2] }, { en: 'Onion', fr: 'Oignon', de: 'Zwiebel' }, { functions: ['pest_repellent'] }],
  ['Trifolium repens', 'Fabaceae', { h: [0.1, 0.2], w: 0.5, sun: 1, semi: 1, shade: 0, ph: [5.5, 7.5], moist: 'Medium', drought: 'Medium', habit: 'Herb', nfix: 1 }, { Temperate: ['support', 'low', 1, 3] }, { en: 'White clover', fr: 'Trèfle blanc' }, { functions: ['nitrogen_fixer', 'ground_cover', 'pollinator_forage'] }],
  ['Symphytum officinale', 'Boraginaceae', { h: [0.6, 1.2], w: 0.6, sun: 1, semi: 1, shade: 0, ph: [6, 7.5], moist: 'High', drought: 'Low', habit: 'Herb', tox: 'Slight' }, { Temperate: ['support', 'low', 2, 6] }, { en: 'Comfrey', fr: 'Consoude officinale' }, { functions: ['dynamic_accumulator', 'mulch'] }],
  // Height not recorded: never a silent fit (design check A7).
  ['Phacelia tanacetifolia', 'Boraginaceae', { h: null, sun: 1, semi: 0, shade: 0, moist: 'Low', annual: 1, habit: 'Herb' }, { Temperate: ['support', 'low', 1, 1] }, { en: 'Phacelia', fr: 'Phacélie' }, { functions: ['insectary', 'pollinator_forage'], wcvp: null }],
  ['Tropaeolum majus', 'Tropaeolaceae', { h: [0.3, 3], w: 1, sun: 1, semi: 1, shade: 0, ph: [5.5, 7.5], moist: 'Medium', annual: 1, habit: 'Climber' }, { Temperate: ['crop', 'low', 1, 2], Tropical: ['crop', 'low', 0, 2] }, { en: 'Nasturtium', fr: 'Capucine' }, { functions: ['trap_crop'] }],
  // Mediterranean, with one plant whose placement has no layer yet (Zingiber officinale).
  ['Olea europaea', 'Oleaceae', { ever: 1, h: [6, 15], w: 8, sun: 1, semi: 0, shade: 0, ph: [6, 8.5], wd: 1, moist: 'Low', drought: 'High', habit: 'Tree' }, { Mediterranean: ['crop', 'high', 3, 6] }, { en: 'Olive', fr: 'Olivier', es: 'Olivo', it: 'Olivo' }, { image: ['https://upload.wikimedia.org/wikipedia/commons/7/7d/Olea_europaea_fixture.jpg', 'Invented Photographer', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Olea_europaea_fixture.jpg'], functions: [] }],
  ['Ficus carica', 'Moraceae', { h: [3, 10], w: 6, sun: 1, semi: 1, shade: 0, ph: [6, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Tree' }, { Mediterranean: ['crop', 'high', 2, 5] }, { en: 'Fig', fr: 'Figuier' }, { functions: ['wildlife_habitat'] }],
  ['Quercus ilex', 'Fagaceae', { ever: 1, h: [15, 25], w: 15, sun: 1, semi: 1, shade: 0, ph: [5, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Tree' }, { Mediterranean: ['support', 'emergent', 4, 6] }, { en: 'Holm oak', fr: 'Chêne vert' }, { functions: ['windbreak'] }],
  ['Ceratonia siliqua', 'Fabaceae', { ever: 1, h: [8, 15], w: 10, sun: 1, semi: 0, shade: 0, ph: [6.5, 8.5], wd: 1, moist: 'Low', drought: 'High', habit: 'Tree' }, { Mediterranean: ['support', 'emergent', 4, 6] }, { en: 'Carob', fr: 'Caroubier' }, { functions: [] }],
  ['Salvia rosmarinus', 'Lamiaceae', { h: [0.5, 2], w: 1.5, sun: 1, semi: 0, shade: 0, ph: [6, 8], wd: 1, moist: 'Low', habit: 'Shrub' }, { Mediterranean: ['crop', 'low', 1, 6] }, { en: 'Rosemary', fr: 'Romarin' }, { functions: ['insectary', 'pollinator_forage'] }],
  ['Thymus vulgaris', 'Lamiaceae', { h: [0.1, 0.4], w: 0.4, sun: 1, semi: 0, shade: 0, ph: [6, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Shrub' }, { Mediterranean: ['crop', 'low', 0, 3] }, { en: 'Thyme', fr: 'Thym' }, { functions: ['insectary'] }],
  ['Vitis vinifera', 'Vitaceae', { h: [5, 20], w: 4, sun: 1, semi: 1, shade: 0, ph: [5.5, 8], wd: 1, moist: 'Low', drought: 'Medium', habit: 'Climber' }, { Mediterranean: ['crop', 'medium', 2, 6] }, { en: 'Grapevine', fr: 'Vigne' }, { functions: [] }],
  ['Zingiber officinale', 'Zingiberaceae', { h: [0.6, 1.2], w: 0.5, sun: 0, semi: 1, shade: 1, ph: [5.5, 6.5], moist: 'High', drought: 'None', habit: 'Herb', frost: 1 }, { Mediterranean: ['crop', null, null, null], Tropical: ['crop', 'low', 1, 3] }, { en: 'Ginger', fr: 'Gingembre' }, { functions: null }],
  // Tropical. Emergent starts at secondary I (Tropical emergent × placenta I–II empty, as in the real export).
  ['Bertholletia excelsa', 'Lecythidaceae', { ever: 1, h: [30, 50], w: 20, sun: 1, semi: 0, shade: 0, ph: [4.5, 6.5], moist: 'High', habit: 'Tree' }, { Tropical: ['support', 'emergent', 3, 6] }, { en: 'Brazil nut', fr: 'Noix du Brésil', pt: 'Castanheira-do-pará' }, { functions: ['wildlife_habitat'] }],
  ['Mangifera indica', 'Anacardiaceae', { ever: 1, h: [10, 30], w: 15, sun: 1, semi: 0, shade: 0, ph: [5.5, 7.5], moist: 'Medium', habit: 'Tree', tox: 'Slight', frost: 1 }, { Tropical: ['crop', 'emergent', 4, 6] }, { en: 'Mango', fr: 'Manguier', pt: 'Mangueira' }, { functions: [] }],
  ['Inga edulis', 'Fabaceae', { ever: 1, h: [6, 15], w: 10, sun: 1, semi: 1, shade: 0, ph: [4.5, 7], moist: 'High', habit: 'Tree', nfix: 1, frost: 1 }, { Tropical: ['support', 'high', 1, 5] }, { en: 'Ice-cream bean', fr: 'Pois sucré', pt: 'Ingá' }, { image: ['https://inaturalist-open-data.s3.amazonaws.com/photos/123456/original.png', 'Invented Observer', 'CC BY-NC 4.0', 'https://www.inaturalist.org/photos/123456'], functions: ['nitrogen_fixer', 'mulch'] }],
  ['Carica papaya', 'Caricaceae', { ever: 1, h: [2, 10], w: 3, sun: 1, semi: 0, shade: 0, ph: [5.5, 7], moist: 'High', habit: 'Tree', frost: 1 }, { Tropical: ['crop', 'high', 1, 3] }, { en: 'Papaya', fr: 'Papayer', pt: 'Mamoeiro' }, { functions: [] }],
  ['Musa acuminata', 'Musaceae', { h: [2, 8], w: 4, sun: 1, semi: 1, shade: 0, ph: [5.5, 7.5], moist: 'High', habit: 'Herb', frost: 1 }, { Tropical: ['crop', 'medium', 1, 4] }, { en: 'Banana', fr: 'Bananier', pt: 'Bananeira' }, { functions: ['mulch'] }],
  ['Theobroma cacao', 'Malvaceae', { ever: 1, h: [4, 8], w: 6, sun: 0, semi: 1, shade: 1, ph: [5, 7.5], moist: 'High', habit: 'Tree', frost: 1 }, { Tropical: ['crop', 'medium', 3, 6] }, { en: 'Cacao', fr: 'Cacaoyer', pt: 'Cacaueiro' }, { functions: [] }],
  ['Psidium guajava', 'Myrtaceae', { ever: 1, h: [3, 10], w: 5, sun: 1, semi: 1, shade: 0, ph: [4.5, 8.5], moist: 'Medium', habit: 'Tree', weed: 1, frost: 1 }, { Tropical: ['crop', 'medium', 2, 5] }, { en: 'Guava', fr: 'Goyavier', pt: 'Goiabeira' }, { functions: ['wildlife_habitat'], invasive: ['AU', 'ZA', 'US'] }],
  ['Manihot esculenta', 'Euphorbiaceae', { h: [1, 3], w: 1, sun: 1, semi: 0, shade: 0, ph: [4.5, 8], wd: 1, moist: 'Low', drought: 'High', habit: 'Shrub', tox: 'Severe', frost: 1 }, { Tropical: ['crop', 'low', 0, 2] }, { en: 'Cassava', fr: 'Manioc', pt: 'Mandioca' }, { functions: [] }],
  ['Arachis pintoi', 'Fabaceae', { h: [0.1, 0.3], w: 1, sun: 1, semi: 1, shade: 1, ph: [4.5, 7], moist: 'Medium', habit: 'Herb', nfix: 1, frost: 1 }, { Tropical: ['support', 'low', 0, 6] }, { en: 'Pinto peanut', pt: 'Amendoim-forrageiro' }, { functions: ['nitrogen_fixer', 'ground_cover'] }],
];

// Interactions: [subject, subject_rank, object, object_rank, type, climate, agent, severity, notes, sources].
const INTERACTIONS = [
  ['Juglans regia', 'species', 'Malus', 'genus', 'allelopathic_harm', null, null, 'high', { en: 'Juglone from walnut roots stunts apples planted under its crown.', fr: 'La juglone des racines du noyer freine les pommiers plantés sous sa couronne.' }, ['crawford-2010']],
  ['Juglans regia', 'species', 'Sambucus nigra', 'species', 'allelopathy_tolerant', null, null, null, { en: 'Elder grows under walnuts.' }, ['crawford-2010']],
  ['Juniperus communis', 'species', 'Rosaceae', 'family', 'alternate_host', null, 'Gymnosporangium clavariiforme', 'high', { en: 'Juniper carries a rust that alternates onto pears, apples and their kin.' }, ['eppo']],
  ['Corylus avellana', 'species', 'Castanea sativa', 'species', 'shared_pest', null, 'Curculio nucum', 'medium', null, ['eppo']],
  ['Ribes nigrum', 'species', 'Rubus idaeus', 'species', 'shared_pest', null, null, 'low', null, ['pfaf']],
  ['Malus domestica', 'species', 'Trifolium repens', 'species', 'intercropped_yield_gain', 'Temperate', null, null, null, ['yield-trials']],
  ['Psidium guajava', 'species', 'Mangifera indica', 'species', 'shared_pest', null, 'Anastrepha obliqua', 'high', { en: 'Only in the Americas.' }, ['eppo', 'eppo-distribution']],
  ['Musa acuminata', 'species', 'Theobroma cacao', 'species', 'intercropped_yield_gain', 'Tropical', null, null, null, ['yield-trials']],
];
const AGENT_NAMES = [['Anastrepha obliqua', [['en', 'West Indian fruit fly'], ['pt', 'mosca-das-frutas']], ['eppo', 'wikipedia']]];

// Layer values: [canonical, climate|null, field, months [first bit, ...bits] | null, flag, scope, source, kind].
const LAYERS = [
  ['Fragaria vesca', null, 'bloom_months', [3, 4, 5], null, { country: 'FR' }, 'pfaf', 'recorded'],
  ['Fragaria vesca', 'Temperate', 'ripening_or_fruit_seen_months', [5, 6], null, { climate: 'Temperate' }, 'pfaf', 'extracted'],
  ['Malus domestica', null, 'bloom_months', [3, 4], null, { latitude: '35..50', hemisphere: 'N' }, 'phenology-photos', 'derived'],
  ['Malus domestica', null, 'bloom_months', [9, 10], null, { latitude: '-50..-35', hemisphere: 'S' }, 'phenology-photos', 'derived'],
  // A run over the new year (Dec–Mar), read from its first month.
  ['Corylus avellana', null, 'bloom_months', [11, 0, 1, 2], null, null, 'pfaf', 'recorded'],
  ['Allium cepa', 'Temperate', 'sowing_months', [2, 3], null, null, 'pfaf', 'recorded'],
  ['Quercus robur', null, 'tolerates_wind', null, 1, null, 'pfaf', 'llm'],
  ['Olea europaea', null, 'ripening_or_fruit_seen_months', [9, 10, 11, 0], null, { region: 'europe' }, 'pfaf', 'recorded'],
];

const uuid = (i) => `00000000-f1c7-4000-8000-${String(i + 1).padStart(12, '0')}`;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Fills a new database at `path` (absent). Returns nothing; the caller gzips it.
export async function buildFixtureDb(path, { edit = null, userVersion = 1, applicationId = 0x43434f4e } = {}) {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA page_size = 4096; PRAGMA foreign_keys = ON;');
  db.exec(DDL);
  const run = (sql, ...rows) => { const st = db.prepare(sql); for (const r of rows) st.run(...r); };
  db.exec('BEGIN');
  run('INSERT INTO climates VALUES (?, ?)', ...FIXTURE_CLIMATES.map((c) => [c, CLIMATE_ORDER.indexOf(c)]));
  run('INSERT INTO climate_regions VALUES (?, ?)', ...FIXTURE_CLIMATES.flatMap((c) => REGIONS[c].map((r) => [c, r])));
  run('INSERT INTO strata VALUES (?, ?)', ...STRATA.map((s, i) => [s, i]));
  run('INSERT INTO phases VALUES (?, ?)', ...PHASES.map((p, i) => [i, p]));
  run('INSERT INTO sources VALUES (?, ?, ?, ?, ?)', ...SOURCES);
  run('INSERT INTO countries VALUES (?, ?)', ...COUNTRIES);
  run('INSERT INTO areas VALUES (?, ?)', ...AREAS);
  run('INSERT INTO labels VALUES (?, ?, ?, ?)', ...LABELS);
  const plantSql = 'INSERT INTO plants (plant, id, canonical_name, genus, family, height_min_m, height_max_m, width_max_m, tolerates_full_sun, tolerates_semi_shade, tolerates_full_shade, hardiness_zone_min, hardiness_zone_max, frost_tender, soil_ph_min, soil_ph_max, well_drained, moisture_use, drought_tolerance, deciduous_evergreen, lifespan, edibility_rating, nitrogen_fixer, is_annual, is_perennial, habit, pollinators, toxicity, allelopathic, weed_potential, wcvp_match) VALUES (' + Array(31).fill('?').join(', ') + ')';
  const v = (x) => (x === undefined ? null : x);
  let reason = 0, fn = 0;
  P.forEach(([name, family, t, placements, names, extra], i) => {
    const plant = i + 1;
    const wcvp = 'wcvp' in extra ? extra.wcvp : 'accepted';
    run(plantSql, [plant, uuid(i), name, name.split(' ')[0], family, t.h?.[0] ?? null, t.h?.[1] ?? null, v(t.w), v(t.sun), v(t.semi), v(t.shade),
      t.frost ? 10 : 5, t.frost ? 12 : 9, t.frost ? 1 : 0, t.ph?.[0] ?? null, t.ph?.[1] ?? null, v(t.wd), v(t.moist), v(t.drought),
      t.habit === 'Tree' ? (t.ever ? 'Evergreen' : 'Deciduous') : null, t.annual ? 'Annual' : 'Perennial', t.annual ? 3 : 2, t.nfix ?? 0, t.annual ?? 0, t.annual ? 0 : 1,
      v(t.habit), t.habit === 'Herb' || t.habit === 'Shrub' ? 'Bees, Flies' : 'Bees', v(t.tox), v(t.allelo), v(t.weed), wcvp]);
    for (const [loc, text] of Object.entries(names)) run('INSERT INTO plant_names VALUES (?, ?, ?)', [plant, loc, text]);
    if (extra.image) run('INSERT INTO plant_images VALUES (?, ?, ?, ?, ?)', [plant, ...extra.image]);
    if (t.tox) run('INSERT INTO toxicity_sources VALUES (?, ?, ?)', [plant, 0, 'pfaf']);
    for (const c of extra.invasive ?? []) run('INSERT INTO plant_invasive VALUES (?, ?, ?)', [plant, c, 'griis']);
    if (wcvp) {
      const home = Object.keys(placements)[0] === 'Tropical' ? ['BZN', 'PER'] : ['FRA', 'GER', 'SPA'];
      for (const a of home) run('INSERT INTO plant_areas VALUES (?, ?, ?)', [plant, a, 0]);
      if (extra.invasive) run('INSERT INTO plant_areas VALUES (?, ?, ?)', [plant, 'GRB', 1]);
    }
    for (const [climate, [role, stratum, start, end]] of Object.entries(placements)) {
      run('INSERT INTO placements VALUES (?, ?, ?, ?, ?, ?, ?)', [plant, climate, role, stratum, start, end, stratum ? 'sample-review' : null]);
      const regions = climate === 'Temperate' && extra.reasons2 ? ['europe', 'asia_temperate'] : [REGIONS[climate][0]];
      for (const region of regions) {
        reason++;
        run('INSERT INTO placement_reasons VALUES (?, ?, ?, ?, ?)', [reason, plant, climate, region, region === 'asia_temperate' ? 'crawford-2010' : 'sample-review']);
        const label = (names.en ?? name).toLowerCase();
        run('INSERT INTO reason_texts VALUES (?, ?, ?)', [reason, 'en', `Invented reason: ${label} as a ${role} in the ${climate} ${region.replace('_', ' ')} sample.`]);
        if (names.fr) run('INSERT INTO reason_texts VALUES (?, ?, ?)', [reason, 'fr', `Raison inventée : ${names.fr.toLowerCase()} dans l’échantillon ${climate}.`]);
      }
    }
    for (const f of extra.functions ?? []) {
      fn++;
      run('INSERT INTO functions VALUES (?, ?, ?, ?)', [fn, plant, f, f === 'nitrogen_fixer' ? 'import' : 'curated']);
      run('INSERT INTO function_sources VALUES (?, ?)', [fn, f === 'nitrogen_fixer' ? 'try' : 'pfaf']);
    }
  });
  const plantOf = (name) => P.findIndex((p) => p[0] === name) + 1;
  INTERACTIONS.forEach(([s, sr, o, or, type, climate, agent, severity, notes, sources], i) => {
    const id = i + 1;
    run('INSERT INTO interactions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, s, sr, o, or, type, climate, agent, severity]);
    for (const [loc, text] of Object.entries(notes ?? {})) run('INSERT INTO interaction_notes VALUES (?, ?, ?)', [id, loc, text]);
    sources.forEach((src, ord) => run('INSERT INTO interaction_sources VALUES (?, ?, ?)', [id, ord, src]));
  });
  for (const [agent, names, sources] of AGENT_NAMES) {
    for (const [loc, name] of names) run('INSERT INTO agent_names VALUES (?, ?, ?)', [agent, loc, name]);
    sources.forEach((src, ord) => run('INSERT INTO agent_name_sources VALUES (?, ?, ?)', [agent, ord, src]));
  }
  LAYERS.forEach(([name, climate, field, months, flag, scope, source, kind], i) => {
    const mask = months ? months.reduce((m, b) => m | (1 << b), 0) : null;
    run('INSERT INTO layer_values VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [i + 1, plantOf(name), climate, field, mask, months ? months[0] : null, flag,
      scope?.climate ?? null, scope?.country ?? null, scope?.hemisphere ?? null, scope?.latitude ?? null, scope?.region ?? null, source, kind]);
  });
  const notFound = P.filter((p) => 'wcvp' in p[5] && p[5].wcvp === null).map((p) => p[0]).join('; ');
  const meta = {
    schema_version: '1', format_version: '4', release_id: FIXTURE_RELEASE, canopi_db_sha256: ZERO_SHA, built_at: FIXTURE_BUILT_AT,
    part: 'all', climates: FIXTURE_CLIMATES.join(','), griis_available: '1', areas_source: 'wcvp', wcvp_not_found: notFound,
    wcvp_sha256: ZERO_SHA, wcvp_record: 'WCVP (fixture: invented)', photo_state: 'fixture',
  };
  run('INSERT INTO meta VALUES (?, ?)', ...Object.entries(meta));
  // A test's edit runs on the filled database, its meta included; the counts are taken after it.
  if (edit) edit(db);
  for (const table of DATA_TABLES) meta[`count.${table}`] = String(db.prepare(`SELECT count(*) n FROM ${table}`).get().n);
  run('INSERT OR REPLACE INTO meta VALUES (?, ?)', ...DATA_TABLES.map((t) => [`count.${t}`, meta[`count.${t}`]]));
  db.exec('COMMIT');
  db.exec(`PRAGMA application_id = ${applicationId}; PRAGMA user_version = ${userVersion};`);
  db.exec('VACUUM');
  const counts = Object.fromEntries(DATA_TABLES.map((t) => [t, Number(meta[`count.${t}`])]));
  const perClimate = Object.fromEntries(FIXTURE_CLIMATES.map((c) => [c, {
    plants: db.prepare('SELECT count(*) n FROM placements WHERE climate_zone = ?').get(c).n,
    interactions: db.prepare(`SELECT count(*) n FROM interactions i WHERE (i.climate_zone IS NULL OR i.climate_zone = ?1) AND EXISTS (
      SELECT 1 FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ?1 AND (
        (i.subject_rank = 'species' AND i.subject = p.canonical_name) OR (i.subject_rank = 'genus' AND i.subject = p.genus) OR (i.subject_rank = 'family' AND i.subject = p.family)))`).get(c).n,
  }]));
  db.close();
  return { counts, perClimate };
}

export const FIXTURE_TRY = 'dataset_id\tdataset\tcustodian\treference\n1\tInvented Leaf Database\tA. Custodian\tCustodian, A. 2001. An invented paper. Journal of Fixtures 1: 1-2.\n1\tInvented Leaf Database\tA. Custodian\tCustodian, A. 2003. A second invented paper.\n2\tInvented Root Database\tB. Keeper\tKeeper, B. 2010. Roots, invented. https://example.org/roots\n';
export const FIXTURE_CREDITS = 'source\ttags\tname\tcredit\tlicence\tlicence_status\turl\tstatus\ntry\ttry\tTRY Plant Trait Database\t\t\tterms\thttps://www.try-db.org/\tused\npfaf\tpfaf\tPlants For A Future\tPlants For A Future (pfaf.org)\t\tpermission\thttps://pfaf.org/\tused\nsample-review\tsample-review\tCanopi sample review\t\t\tnone\t\tinternal\n';

// Writes a whole export directory (format 4) at `dir`, which must be absent or empty. Returns
// { dir, file, manifest }.
export async function writeFixtureExport(dir, { edit = null, userVersion = 1, applicationId = 0x43434f4e, manifest: editManifest = null, after = null } = {}) {
  mkdirSync(dir, { recursive: true });
  if (readdirSync(dir).length) throw new Error(`${dir} is not empty`);
  const work = mkdtempSync(join(tmpdir(), 'consortium-fixture-'));
  try {
    const raw = join(work, 'fixture.sqlite');
    const { counts, perClimate } = await buildFixtureDb(raw, { edit, userVersion, applicationId });
    const rawBytes = readFileSync(raw);
    const gz = gzipSync(rawBytes, { level: 9 });
    const rawSha = sha256(rawBytes);
    const file = `consortium-v1.${FIXTURE_RELEASE}.${rawSha.slice(0, 12)}.sqlite.gz`;
    writeFileSync(join(dir, file), gz);
    writeFileSync(join(dir, 'try_references.tsv'), FIXTURE_TRY);
    writeFileSync(join(dir, 'source_credits.tsv'), FIXTURE_CREDITS);
    const manifest = {
      format_version: 4, schema_version: 1, generated_at: FIXTURE_BUILT_AT, canopi_db_sha256: ZERO_SHA, release_id: FIXTURE_RELEASE,
      split: false, max_gzip_bytes: 10_000_000,
      files: [{ file, climate_zones: FIXTURE_CLIMATES, sha256: sha256(gz), bytes: gz.length, raw_sha256: rawSha, raw_bytes: rawBytes.length, counts }],
      climates: FIXTURE_CLIMATES.map((c) => ({ climate_zone: c, regions: REGIONS[c], ...perClimate[c] })),
      locales: LOCALES,
      wcvp: { sha256: ZERO_SHA, record: 'WCVP (fixture: invented)', plants_with_areas: counts.plants - 1, plants_not_found: ['Phacelia tanacetifolia'] },
      try_references: { file: 'try_references.tsv', sha256: sha256(Buffer.from(FIXTURE_TRY)), rows: 3, dataset_ids: 2 },
      source_credits: { file: 'source_credits.tsv', sha256: sha256(Buffer.from(FIXTURE_CREDITS)), rows: 3 },
    };
    if (editManifest) editManifest(manifest);
    writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    if (after) after(dir, manifest);
    const sums = readdirSync(dir).filter((n) => n !== 'SHA256SUMS').sort().map((n) => `${sha256(readFileSync(join(dir, n)))}  ${n}\n`).join('');
    writeFileSync(join(dir, 'SHA256SUMS'), sums);
    return { dir, file, manifest };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] ?? DEFAULT_EXPORT);
  rmSync(out, { recursive: true, force: true });
  const { file, manifest } = await writeFixtureExport(out);
  console.log(`Wrote the consortium v2 fixture to ${out}: ${file}, ${manifest.files[0].counts.plants} plants, ${manifest.files[0].bytes} bytes gzipped.`);
}
