// The consortium tool's credits on /data-sources/ (P5 stream S5f): the canopi-climate grid and the
// datasets it is derived from, the GBIF occurrence maps behind the plants' observed climate ranges,
// and the map and place-search services. Each row carries a stable id (the page's data-credit).
//
// - The grid's input datasets are read from src/data/climate-index.json `credits`, which
//   scripts/install-climate.mjs copies from the installed grid's manifest at every build (titles,
//   citations, landing pages and licences as canopi-climate publishes them, in English). A known
//   source missing from the index stops the build: a credit is never dropped silently.
// - GBIF: the documented citation for data read through the API (decision "GBIF credit for the
//   observed ranges", 2026-11-11), with the fetch window and the basis of record the consortium
//   export's meta table states (`gbif_fetched`, `gbif_basis_of_record`).
//   scripts/consortium-p5-seams-s5f.test.mjs checks both against the installed export. No
//   derived-dataset DOI yet (follow-up in that decision row).
// - OpenFreeMap and Nominatim: the attribution each service asks for.
// Names, citations and licences stay in English, as the other credits on the page do.

export interface ToolCredit {
  /** Stable id, written as the row's data-credit attribute. */
  id: string;
  name: string;
  href: string | null;
  /** The citation or attribution, in English; URLs in it become links. */
  line: string;
  licence: string | null;
  /** What the tool uses it for, as a line the page translates (DataSourcesPage.astro USE_KEYS). */
  use?: 'grid' | 'gbif' | 'map' | 'search';
}

/** The climate index entries this page reads (src/data/climate-index.json `credits`). */
export interface ClimateCredit { id: string; title: string; citation: string | null; landing: string | null; licence: string }

/** canopi-climate's source ids → this page's data-credit ids, in the order the page lists them. */
export const GRID_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['chelsa-v2.1', 'chelsa'],
  ['beck2023', 'koppen-beck'],
  ['soilgrids-2.0', 'soilgrids'],
  ['wgsrpd-level3', 'wgsrpd'],
  ['natural-earth-map-units-50m', 'natural-earth'],
];

export const CLIMATE_REPO = 'https://github.com/opencanopi/canopi-climate';

export const GBIF = {
  /** The export's meta `gbif_fetched`: start/end, UTC. */
  fetched: '2026-11-11T03:18:45Z/2026-11-11T06:27:25Z',
  /** The export's meta `gbif_basis_of_record`. */
  basisOfRecord: ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'PRESERVED_SPECIMEN', 'MATERIAL_SAMPLE', 'MATERIAL_CITATION', 'OCCURRENCE'],
  api: 'https://api.gbif.org/v2/map/occurrence/density',
} as const;

/** "2026-11-11T03:18:45Z/2026-11-11T06:27:25Z" → "2026-11-11 03:18–06:27 UTC" (one day) or both dates. */
export function fetchWindow(range: string): string {
  const [a, b] = range.split('/');
  const day = (s: string) => s.slice(0, 10);
  const time = (s: string) => s.slice(11, 16);
  return day(a) === day(b) ? `${day(a)} ${time(a)}–${time(b)} UTC` : `${day(a)} ${time(a)} – ${day(b)} ${time(b)} UTC`;
}

export function gbifCredit(): ToolCredit {
  const year = GBIF.fetched.slice(0, 4);
  return {
    id: 'gbif',
    name: 'GBIF, the Global Biodiversity Information Facility',
    href: 'https://www.gbif.org/',
    line: `GBIF.org (${year}). Occurrence density maps, GBIF maps API (${GBIF.api}), fetched ${fetchWindow(GBIF.fetched)}. Basis of record: ${GBIF.basisOfRecord.join(', ')} (fossil and living specimens left out). Records are published through GBIF under CC0 1.0, CC BY 4.0 or CC BY-NC 4.0 by the institutions that share them.`,
    licence: null,
    use: 'gbif',
  };
}

export const MAP_CREDITS: readonly ToolCredit[] = [
  {
    id: 'openfreemap',
    name: 'OpenFreeMap',
    href: 'https://openfreemap.org/',
    line: 'Map tiles and styles by OpenFreeMap (https://openfreemap.org/). © OpenMapTiles (https://openmaptiles.org/). Data © OpenStreetMap contributors (https://www.openstreetmap.org/copyright).',
    licence: 'Open Database License (ODbL) 1.0 for the OpenStreetMap data',
    use: 'map',
  },
  {
    id: 'nominatim',
    name: 'Nominatim',
    href: 'https://nominatim.org/',
    line: 'Place search by Nominatim (https://nominatim.org/) on the OpenStreetMap Foundation\'s servers (https://nominatim.openstreetmap.org/). Data © OpenStreetMap contributors (https://www.openstreetmap.org/copyright).',
    licence: 'Open Database License (ODbL) 1.0 for the OpenStreetMap data',
    use: 'search',
  },
];

/**
 * Every row of the tool's credits: the grid, its inputs (from the climate index), GBIF, the map and
 * the search; tag is the pinned grid release (src/data/climate-release.json). Throws when the index lacks one of the grid's known sources.
 */
export function toolCredits(climateCredits: readonly ClimateCredit[] | null | undefined, tag: string): ToolCredit[] {
  const byId = new Map((climateCredits ?? []).map((c) => [c.id, c]));
  const missing = GRID_SOURCES.filter(([source]) => !byId.has(source)).map(([source]) => source);
  if (missing.length) throw new Error(`src/data/climate-index.json credits lack ${missing.join(', ')}: run the build (scripts/install-climate.mjs) or update GRID_SOURCES`);
  const known = new Set(GRID_SOURCES.map(([source]) => source));
  const row = (c: ClimateCredit, id: string): ToolCredit => ({ id, name: c.title, href: c.landing, line: c.citation ?? '', licence: c.licence });
  return [
    {
      id: 'canopi-climate',
      name: `canopi-climate ${tag} grid`,
      href: CLIMATE_REPO,
      line: `canopi-climate ${tag} by opencanopi (${CLIMATE_REPO}): climate on a 0.1° grid (1991–2020 and CMIP6 projections to 2099), soil and regions on a 0.05° grid. The grid is derived from the datasets below; their licences and attribution requirements apply to it.`,
      licence: 'AGPL-3.0-or-later (the code)',
      use: 'grid',
    },
    ...GRID_SOURCES.map(([source, id]) => row(byId.get(source)!, id)),
    // A source a later grid adds is credited under its own id until it is named here.
    ...[...byId.values()].filter((c) => !known.has(c.id)).map((c) => row(c, c.id)),
    gbifCredit(),
    ...MAP_CREDITS,
  ];
}
