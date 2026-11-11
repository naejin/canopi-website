// The PlantSource over the opened SQLite database (stream S1; design check §4; canopi-data
// docs/consortium-export-v2.md, format 4, schema 2). It reads plain records with SQL and hands them to
// the core, which computes the matrix, site fit and reason counts itself. No sqlite-wasm import here:
// it takes any database with OO1's selectObjects and selectArrays, so the tests run it on the package's Node build.
// Photos come from the index's {uuid: path} map (design check A4), never the export's remote URLs.
// Search runs in JavaScript over folded names (A6, `fold`): lower case, Latin/Greek/Cyrillic marks
// stripped, ß/œ/æ written out, word prefix;
// never SQL LIKE (ASCII-only folding, a substring match, % and _ unescaped).
import type {
  ClimateRange, ClimateZone, Details, FunctionId, FunctionMethod, Image, Interaction, InvasiveRecord, KoppenShare, Labels, LayerScope, LayerValue, Locale, Month, Placement,
  PlantId, RangeBasis, Reason, Source, SourceInfo, Stratum, Taxon, TaxonClimate, Text, ToxicityLevel, Traits,
} from '../../../lib/consortium/index.ts';
import { months, NEAREST_LISTS, phases } from '../../../lib/consortium/index.ts';
import type { PlantSource } from '../../../lib/consortium/source.ts';

type Row = Record<string, unknown>;
// What the adapter needs of an OO1 database.
// (OO1's DB.selectObjects and selectArrays take a BindingSpec; the adapter only passes arrays of
// strings and numbers.)
export interface Db { selectObjects(sql: string, bind?: (string | number)[]): Row[]; selectArrays(sql: string, bind?: (string | number)[]): unknown[][] }
export interface SourceOptions { images: Record<string, string> }

const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const bool = (v: unknown): boolean | null => (v === null || v === undefined ? null : Number(v) === 1);
const range = (min: unknown, max: unknown) => (min === null && max === null ? null : { min: num(min), max: num(max) });

function group<K>(rows: Row[], key: (r: Row) => K): Map<K, Row[]> {
  const out = new Map<K, Row[]>();
  for (const r of rows) { const k = key(r); let list = out.get(k); if (!list) out.set(k, (list = [])); list.push(r); }
  return out;
}

function traitsOf(r: Row): Traits {
  return {
    height_m: range(r.height_min_m, r.height_max_m),
    width_max_m: num(r.width_max_m),
    sun: bool(r.tolerates_full_sun),
    semi_shade: bool(r.tolerates_semi_shade),
    full_shade: bool(r.tolerates_full_shade),
    hardiness_zone: range(r.hardiness_zone_min, r.hardiness_zone_max),
    frost_tender: bool(r.frost_tender),
    soil_ph: range(r.soil_ph_min, r.soil_ph_max),
    well_drained: bool(r.well_drained),
    moisture_use: str(r.moisture_use),
    drought_tolerance: str(r.drought_tolerance),
    fertility_requirement: str(r.fertility_requirement),
    deciduous_evergreen: str(r.deciduous_evergreen),
    active_growth_period: str(r.active_growth_period),
    bloom_period: str(r.bloom_period),
    harvest_period: str(r.harvest_period),
    lifespan: str(r.lifespan),
    growth_rate: str(r.growth_rate),
    age_of_maturity_years: num(r.age_of_maturity_years),
    root_depth_min_cm: num(r.root_depth_min_cm),
    taproot_persistent: bool(r.taproot_persistent),
    root_system_type: str(r.root_system_type),
    mycorrhizal_type: str(r.mycorrhizal_type),
    nitrogen_fixer: bool(r.nitrogen_fixer),
    edibility_rating: num(r.edibility_rating),
    self_fertile: bool(r.self_fertile),
    sexual_system: str(r.sexual_system),
    pollinators: r.pollinators === null || r.pollinators === undefined ? null : String(r.pollinators).split(', ').filter(Boolean),
    vegetative_spread_rate: str(r.vegetative_spread_rate),
    clonal_growth_form: str(r.clonal_growth_form),
    is_annual: bool(r.is_annual),
    is_perennial: bool(r.is_perennial),
    habit: str(r.habit),
  };
}

const placementOf = (r: Row): Placement => ({
  role: r.role as Placement['role'],
  stratum: (r.stratum ?? null) as Stratum | null,
  start: r.phase_start === null ? null : phases[Number(r.phase_start)],
  end: r.phase_end === null ? null : phases[Number(r.phase_end)],
  source: str(r.source),
});

// A 12-bit month mask read round the year from its first month (canopi-data months_of), so a run
// over the new year (Nov–Mar) keeps its order.
function monthsOf(mask: number, from: number): Month[] {
  const out: Month[] = [];
  for (let k = 0; k < 12; k++) { const m = (from + k) % 12; if (mask & (1 << m)) out.push(months[m]); }
  return out;
}

function textOf(rows: Row[] | undefined): Text | null {
  if (!rows?.length) return null;
  const t: Partial<Record<Locale, string>> = {};
  for (const r of rows) t[r.locale as Locale] = String(r.text);
  return t.en === undefined ? null : (t as Text);
}

// Schema 2: the observed climate of a climate's plants, in one query of arrays (the pool is read
// before the matrix draws; objects for every row cost ~0.1 s at 4× CPU). A plant without a
// range_source is absent: "range not recorded" (Taxon.climate null).
const CLIMATE_ROWS = `SELECT s.plant, s.range_source, s.gbif_cells, s.native_share, c.variable, c.low, c.median, c.high, c.count, c.basis
  FROM plant_climate_status s LEFT JOIN plant_climate c ON c.plant = s.plant AND c.variable IN ('tmin_cold', 'tmax_warm', 'aridity')
  WHERE s.range_source IS NOT NULL AND s.plant IN (SELECT plant FROM placements WHERE climate_zone = ?1)`;
const RANGE_FIELD = { tmin_cold: 'tminCold', tmax_warm: 'tmaxWarm', aridity: 'aridity' } as const;
function climatesOf(rows: unknown[][]): Map<number, TaxonClimate> {
  const out = new Map<number, TaxonClimate>();
  for (const [plant, source, cells, share, variable, low, median, high, count, basis] of rows) {
    let t = out.get(Number(plant));
    if (!t) out.set(Number(plant), t = { source: String(source), tminCold: null, tmaxWarm: null, aridity: null, cells: num(cells), nativeShare: num(share) });
    const field = RANGE_FIELD[variable as keyof typeof RANGE_FIELD];
    if (field) t[field] = { low: num(low), median: num(median), high: num(high), count: num(count), basis: basis as RangeBasis } satisfies ClimateRange;
  }
  return out;
}

const IN_CLIMATE = 'plant IN (SELECT plant FROM placements WHERE climate_zone = ?1)';
const INTERACTIONS_IN = 'SELECT interaction FROM interactions WHERE climate_zone IS NULL OR climate_zone = ?1';

export function createSqliteSource(db: Db, options: SourceOptions): PlantSource {
  const meta = new Map(db.selectObjects('SELECT key, value FROM meta').map((r) => [String(r.key), String(r.value)]));
  const info: SourceInfo = {
    releaseId: meta.get('release_id') ?? '',
    schemaVersion: 2,
    builtAt: meta.get('built_at') ?? '',
    climates: db.selectObjects('SELECT id FROM climates ORDER BY ord').map((r) => r.id as ClimateZone),
    griisAvailable: meta.get('griis_available') === '1',
    climateGrid: meta.get('climate_grid_manifest_sha256') || null,
    rangesReview: meta.get('ranges_review') || null,
  };
  const countries: ReadonlyMap<string, { invasiveChecked: boolean }> = new Map(
    db.selectObjects('SELECT code, invasive_checked FROM countries ORDER BY code').map((r) => [String(r.code), { invasiveChecked: Number(r.invasive_checked) === 1 }]));
  const imageOf = (id: PlantId, r: Row | undefined): Image | null => {
    const url = options.images[id];
    return r && url ? { url, credit: str(r.credit), licence: str(r.licence), source_page_url: str(r.source_page_url) } : null;
  };
  const invasiveOf = (rows: Row[] | undefined): InvasiveRecord[] | null => {
    if (!info.griisAvailable) return null;
    const byCountry = group(rows ?? [], (r) => String(r.country));
    return [...byCountry].map(([country, list]) => ({ country, sources: list.map((r) => String(r.source)) }));
  };

  // Pools are read once per climate and kept: the same objects every time, so the core's per-plant
  // caches hold across recomputes.
  const pools = new Map<ClimateZone, Taxon[]>();
  function readPool(c: ClimateZone): Taxon[] {
    const rows = db.selectObjects(`SELECT p.*, x.role, x.stratum, x.phase_start, x.phase_end, x.source psrc
      FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ?1 ORDER BY p.canonical_name`, [c]);
    const names = group(db.selectObjects(`SELECT plant, locale, name FROM plant_names WHERE ${IN_CLIMATE}`, [c]), (r) => Number(r.plant));
    const fns = group(db.selectObjects(`SELECT f.function_id, f.plant, f.function, f.method, s.source FROM functions f
      LEFT JOIN function_sources s USING (function_id) WHERE f.${IN_CLIMATE} ORDER BY f.function_id, s.source`, [c]), (r) => Number(r.plant));
    const invasive = group(db.selectObjects(`SELECT plant, country, source FROM plant_invasive WHERE ${IN_CLIMATE} ORDER BY country, source`, [c]), (r) => Number(r.plant));
    const images = new Map(db.selectObjects(`SELECT * FROM plant_images WHERE ${IN_CLIMATE}`, [c]).map((r) => [Number(r.plant), r]));
    const tox = group(db.selectObjects(`SELECT plant, source FROM toxicity_sources WHERE ${IN_CLIMATE} ORDER BY plant, ord`, [c]), (r) => Number(r.plant));
    const climates = climatesOf(db.selectArrays(CLIMATE_ROWS, [c]));
    return rows.map((r): Taxon => {
      const plant = Number(r.plant), id = String(r.id);
      const own = Object.fromEntries((names.get(plant) ?? []).map((n) => [n.locale, String(n.name)])) as Partial<Record<Locale, string>>;
      const fnRows = group(fns.get(plant) ?? [], (f) => Number(f.function_id));
      const functions = fnRows.size
        ? [...fnRows.values()].map((list) => ({ function: list[0].function as FunctionId, method: list[0].method as FunctionMethod, sources: list.flatMap((f) => (f.source === null ? [] : [String(f.source)])) }))
        : null;
      const src = str(r.psrc);
      return {
        id,
        canonical_name: String(r.canonical_name),
        genus: String(r.genus),
        family: str(r.family),
        names: own,
        image: imageOf(id, images.get(plant)),
        role: r.role as Taxon['role'],
        stratum: r.stratum === null ? null : { value: r.stratum as Stratum, sources: src ? [src] : [] },
        phases: r.phase_start === null || r.phase_end === null ? null : { start: phases[Number(r.phase_start)], end: phases[Number(r.phase_end)], sources: src ? [src] : [] },
        functions,
        traits: traitsOf(r),
        warnings: {
          toxicity: r.toxicity === null ? null : { level: r.toxicity as ToxicityLevel, sources: (tox.get(plant) ?? []).map((t) => String(t.source)) },
          invasive_in: invasiveOf(invasive.get(plant)),
          allelopathic: bool(r.allelopathic),
          weed_potential: bool(r.weed_potential),
        },
        climate: climates.get(plant) ?? null,
        areasKnown: r.wcvp_match !== null && r.wcvp_match !== undefined,
      };
    });
  }

  function placementsOf(ids: PlantId[]): Map<PlantId, Partial<Record<ClimateZone, Placement>>> {
    const out = new Map<PlantId, Partial<Record<ClimateZone, Placement>>>();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      if (!chunk.length) continue;
      const rows = db.selectObjects(`SELECT p.id, x.* FROM placements x JOIN plants p USING (plant) WHERE p.id IN (${chunk.map(() => '?').join(',')}) ORDER BY p.id`, chunk);
      for (const r of rows) {
        const id = String(r.id);
        if (!out.has(id)) out.set(id, {});
        out.get(id)![r.climate_zone as ClimateZone] = placementOf(r);
      }
    }
    return out;
  }

  // Native plants per WGSRPD level-3 area, read once each (schema 2 plant_areas, introduced = 0).
  const natives = new Map<string, ReadonlySet<PlantId>>();

  return {
    info: () => info,
    countries: () => countries,
    async pool(c) {
      // A climate the export does not curate borrows its nearest lists (P5, S5c's borrowed below).
      if (!info.climates.includes(c)) return this.borrowed(c, NEAREST_LISTS[c]);
      let p = pools.get(c);
      if (!p) pools.set(c, (p = readPool(c)));
      return p;
    },
    // P5 seam (commit 0): stream S5c owns this method's body and nobody else edits it. The plants of a
    // climate the export does not curate, each placed from the first list of `order` that places it
    // (core placement.ts placeFor), with Taxon.estimate true and Taxon.placedFrom that list. Stub:
    // nothing, today's "Not covered yet".
    async borrowed(_zone, _order) {
      return [];
    },
    async interactions(c) {
      const rows = db.selectObjects(`SELECT * FROM interactions WHERE interaction IN (${INTERACTIONS_IN}) ORDER BY interaction`, [c]);
      const notes = group(db.selectObjects(`SELECT interaction, locale, text FROM interaction_notes WHERE interaction IN (${INTERACTIONS_IN})`, [c]), (r) => Number(r.interaction));
      const sources = group(db.selectObjects(`SELECT interaction, source FROM interaction_sources WHERE interaction IN (${INTERACTIONS_IN}) ORDER BY interaction, ord`, [c]), (r) => Number(r.interaction));
      const agentNames = group(db.selectObjects('SELECT agent, locale, name FROM agent_names'), (r) => String(r.agent));
      const agentSources = group(db.selectObjects('SELECT agent, source FROM agent_name_sources ORDER BY agent, ord'), (r) => String(r.agent));
      return rows.map((r): Interaction => {
        const agent = str(r.agent);
        const named = agent ? agentNames.get(agent) : undefined;
        return {
          subject: { name: String(r.subject), rank: r.subject_rank as Interaction['subject']['rank'] },
          object: { name: String(r.object), rank: r.object_rank as Interaction['object']['rank'] },
          type: r.type as Interaction['type'],
          climate_zone: (r.climate_zone ?? null) as ClimateZone | null,
          agent,
          agent_names: named?.length
            ? { names: Object.fromEntries(named.map((n) => [n.locale, String(n.name)])), sources: (agentSources.get(agent!) ?? []).map((s) => String(s.source)) }
            : null,
          severity: (r.severity ?? null) as Interaction['severity'],
          note: textOf(notes.get(Number(r.interaction))),
          sources: (sources.get(Number(r.interaction)) ?? []).map((s) => String(s.source)),
        };
      });
    },
    async placements(ids) { return placementsOf(ids); },
    async names(l) {
      const rows = db.selectObjects(`SELECT p.id, p.canonical_name, n.locale, n.name FROM plants p
        LEFT JOIN plant_names n ON n.plant = p.plant AND n.locale IN ('en', ?1) ORDER BY p.canonical_name`, [l]);
      return [...group(rows, (r) => String(r.id))].map(([id, list]) => ({
        id,
        canonical: String(list[0].canonical_name),
        names: Object.fromEntries(list.filter((r) => r.locale !== null).map((r) => [r.locale, String(r.name)])) as Partial<Record<Locale, string>>,
      }));
    },
    async details(id, c, l): Promise<Details> {
      const found = db.selectObjects('SELECT plant FROM plants WHERE id = ?1', [id])[0]?.plant;
      if (found === undefined) throw new Error(`no plant ${id}`);
      const plant = Number(found);
      const reasonRows = db.selectObjects(`SELECT r.reason, r.region, r.source, t.locale, t.text FROM placement_reasons r JOIN reason_texts t USING (reason)
        WHERE r.plant = ?1 AND r.climate_zone = ?2 AND t.locale IN ('en', ?3) ORDER BY r.reason`, [plant, c, l]);
      const reasons: Reason[] = [...group(reasonRows, (r) => Number(r.reason)).values()].flatMap((list) => {
        const text = textOf(list);
        return text ? [{ region: list[0].region as Reason['region'], text, source: String(list[0].source) }] : [];
      });
      const layerValues: LayerValue[] = db.selectObjects('SELECT * FROM layer_values WHERE plant = ?1 AND (climate_zone IS NULL OR climate_zone = ?2) ORDER BY layer_value', [plant, c]).map((r) => {
        const scope: LayerScope = {};
        if (r.scope_climate !== null) scope.climate = r.scope_climate as ClimateZone;
        if (r.scope_country !== null) scope.country = String(r.scope_country);
        if (r.scope_hemisphere !== null) scope.hemisphere = r.scope_hemisphere as 'N' | 'S';
        if (r.scope_latitude !== null) scope.latitude = String(r.scope_latitude);
        if (r.scope_region !== null) scope.region = r.scope_region as LayerScope['region'];
        return {
          field: r.field as LayerValue['field'],
          months: r.months === null ? null : monthsOf(Number(r.months), Number(r.months_from ?? 0)),
          flag: bool(r.flag),
          climate: (r.climate_zone ?? null) as ClimateZone | null,
          scope: Object.keys(scope).length ? scope : null,
          source: String(r.source),
          kind: r.kind as LayerValue['kind'],
        };
      });
      const imageRow = db.selectObjects('SELECT * FROM plant_images WHERE plant = ?1', [plant])[0];
      const invasiveIn = invasiveOf(db.selectObjects('SELECT country, source FROM plant_invasive WHERE plant = ?1 ORDER BY country, source', [plant]));
      const toxicitySources = db.selectObjects('SELECT source FROM toxicity_sources WHERE plant = ?1 ORDER BY ord', [plant]).map((r) => String(r.source));
      const placements = placementsOf([id]).get(id) ?? {};
      const koppen: KoppenShare[] = db.selectObjects('SELECT koppen, share, cells FROM plant_koppen WHERE plant = ?1 ORDER BY share DESC, koppen', [plant])
        .map((r) => ({ code: String(r.koppen), share: Number(r.share), cells: Number(r.cells) }));
      const rangeSource = db.selectObjects('SELECT range_source FROM plant_climate_status WHERE plant = ?1 AND range_source IS NOT NULL', [plant]).map((r) => String(r.range_source));
      const fnSources = db.selectObjects('SELECT s.source FROM functions f JOIN function_sources s USING (function_id) WHERE f.plant = ?1', [plant]).map((r) => String(r.source));
      const cited = new Set<string>([
        ...reasons.map((r) => r.source), ...layerValues.map((v) => v.source), ...toxicitySources, ...fnSources,
        ...(invasiveIn ?? []).flatMap((r) => r.sources), ...Object.values(placements).flatMap((p) => (p?.source ? [p.source] : [])), ...rangeSource,
      ]);
      const list = [...cited];
      const sources: Record<string, Source> = {};
      if (list.length) {
        for (const r of db.selectObjects(`SELECT * FROM sources WHERE id IN (${list.map(() => '?').join(',')})`, list)) {
          sources[String(r.id)] = { label: String(r.label), url: str(r.url), licence: str(r.licence), attribution: str(r.attribution) };
        }
      }
      return { id, climate: c, reasons, layerValues, image: imageOf(id, imageRow), invasiveIn, toxicitySources, sources, placements, koppen };
    },
    async labels(l) {
      const out: Labels = {};
      for (const r of db.selectObjects('SELECT field, value_en, label FROM labels WHERE locale = ?1', [l])) {
        const field = String(r.field), value = String(r.value_en);
        ((out[field] ??= {})[value] ??= {})[l] = String(r.label);
      }
      return out;
    },
    nativeIn(l3) {
      let set = natives.get(l3);
      if (!set) {
        set = new Set(db.selectObjects('SELECT DISTINCT p.id FROM plant_areas a JOIN plants p USING (plant) WHERE a.area = ?1 AND a.introduced = 0', [l3]).map((r) => String(r.id)));
        natives.set(l3, set);
      }
      return set;
    },
    async cellCounts(c) {
      return db.selectObjects(`SELECT x.stratum, f.ord phase, count(*) n FROM placements x JOIN phases f ON f.ord BETWEEN x.phase_start AND x.phase_end
        WHERE x.climate_zone = ?1 GROUP BY 1, 2 ORDER BY 1, 2`, [c]).map((r) => ({ stratum: r.stratum as Stratum, phase: Number(r.phase), n: Number(r.n) }));
    },
  };
}
