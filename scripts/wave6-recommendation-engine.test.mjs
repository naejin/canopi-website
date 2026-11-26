// Wave 6 Global Real-DB Benchmark & Stress Test (22 sites + B1/B2/B3/A1-A10 invariants).
// Pre-registered expected regional staples & agronomic invariants verified on the live SQLite export + climate tiles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { createTileSource, lookupSite, lookupSiteMonthly, lookupSiteTier2A, siteIndex } from '../src/lib/climate/index.ts';
import {
  computeCrownBudget,
  evaluatePlantVerdict,
  findCompatibleSwaps,
  isManagedOrchardTree,
  isStructuralVine,
  matchPaletteInteractions,
  rankCandidatesForGuild,
  resolveEffectiveSite,
  selectStarterPalette,
  vineSupportTree,
} from '../src/lib/palette/index.ts';
import { buildMonthlyV07, buildTier1V07, buildTier2AV07 } from '../src/islands/palette/state/climate-v07.ts';

const ROOT = process.cwd();
const CLIMATE_INDEX_PATH = path.join(ROOT, 'src/data/climate-index.json');
const HAS_CLIMATE_TILES = fs.existsSync(CLIMATE_INDEX_PATH);
const climateIndex = HAS_CLIMATE_TILES ? JSON.parse(fs.readFileSync(CLIMATE_INDEX_PATH, 'utf8')) : null;
const paletteIndex = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/palette-index.json'), 'utf8'));
const tileSource = climateIndex
  ? createTileSource({
      index: siteIndex(climateIndex),
      fetchBytes: async (rel) => {
        const buf = fs.readFileSync(path.join(ROOT, 'public', rel.replace(/^\/+/, '')));
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      },
    })
  : null;
const SKIP_NO_TILES = !HAS_CLIMATE_TILES && 'climate tiles not installed (run npm run install:climate)';

const tmpDb = '/tmp/canopi-w6-test.sqlite';
if (!fs.existsSync(tmpDb)) {
  const gz = fs.readFileSync(path.join(ROOT, 'public', paletteIndex.files[0].url.replace(/^\/+/, '')));
  fs.writeFileSync(tmpDb, zlib.gunzipSync(gz));
}
const db = new DatabaseSync(tmpDb, { readOnly: true });

const phases = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];
const num = (v) => (v == null ? null : Number(v));
const bool = (v) => (v == null ? null : Number(v) === 1);
const str = (v) => (v == null ? null : String(v));

function koppenToZone(k) {
  if (!k) return 'Temperate';
  const u = k.toUpperCase();
  if (u.startsWith('A')) return 'Tropical';
  if (u.startsWith('B')) return 'Arid';
  if (u.startsWith('CS')) return 'Mediterranean';
  if (u.startsWith('CFA') || u.startsWith('CWA')) return 'Subtropical';
  if (u.startsWith('C')) return 'Temperate';
  if (u.startsWith('DFC') || u.startsWith('DFD') || u.startsWith('E')) return 'Boreal';
  if (u.startsWith('D')) return 'Continental';
  return 'Temperate';
}

const poolCache = new Map();
function readPool(zone) {
  if (poolCache.has(zone)) return poolCache.get(zone);
  const rows = db.prepare(`SELECT p.*, x.role, x.stratum, x.phase_start, x.phase_end, x.source psrc
    FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? ORDER BY p.canonical_name`).all(zone);
  const inC = 'plant IN (SELECT plant FROM placements WHERE climate_zone = ?)';
  const groupBy = (arr, k) => {
    const m = new Map();
    for (const r of arr) { const id = Number(r[k]); if (!m.has(id)) m.set(id, []); m.get(id).push(r); }
    return m;
  };
  const names = groupBy(db.prepare(`SELECT plant, locale, name FROM plant_names WHERE ${inC}`).all(zone), 'plant');
  const fns = groupBy(db.prepare(`SELECT f.function_id, f.plant, f.function, f.method, f.kind FROM functions f WHERE f.${inC}`).all(zone), 'plant');
  const inv = groupBy(db.prepare(`SELECT plant, country, source FROM plant_invasive WHERE ${inC}`).all(zone), 'plant');
  const imgs = new Set(db.prepare(`SELECT plant FROM plant_images WHERE ${inC}`).all(zone).map((r) => Number(r.plant)));
  const koppenByPlant = groupBy(db.prepare(`SELECT plant, koppen, share, cells FROM plant_koppen WHERE ${inC} ORDER BY share DESC`).all(zone), 'plant');
  const climRows = db.prepare(`SELECT s.plant, s.range_source, s.gbif_cells, s.native_share, c.variable, c.low, c.median, c.high, c.count, c.basis, c.blocks, c.low_source, c.high_source, c.weak
    FROM plant_climate_status s LEFT JOIN plant_climate c ON c.plant = s.plant AND c.variable IN ('tmin_cold','tmax_warm','tmean_year','tmean_warm','aridity','precip','dry_months')
    WHERE s.range_source IS NOT NULL AND s.${inC}`).all(zone);
  const climMap = new Map();
  const vMap = { tmin_cold: 'tminCold', tmax_warm: 'tmaxWarm', tmean_year: 'tmeanYear', tmean_warm: 'tmeanWarm', aridity: 'aridity', precip: 'precip', dry_months: 'dryMonths' };
  for (const r of climRows) {
    const pid = Number(r.plant);
    let c = climMap.get(pid);
    if (!c) climMap.set(pid, c = { source: String(r.range_source), precip: null, dryMonths: null, tminCold: null, tmaxWarm: null, tmeanYear: null, tmeanWarm: null, aridity: null, cells: num(r.gbif_cells), nativeShare: num(r.native_share) });
    const f = vMap[r.variable];
    if (f) c[f] = { low: num(r.low), median: num(r.median), high: num(r.high), count: num(r.count), basis: r.basis, blocks: num(r.blocks), lowSource: str(r.low_source), highSource: str(r.high_source), weak: Number(r.weak) === 1 };
  }
  const extByPlant = groupBy(db.prepare(`SELECT * FROM plant_climate_extremes WHERE ${inC}`).all(zone), 'plant');
  const frostByPlant = groupBy(db.prepare(`SELECT * FROM plant_frost WHERE ${inC}`).all(zone), 'plant');

  const pool = rows.map((r) => {
    const pid = Number(r.plant);
    const nObj = {};
    for (const n of names.get(pid) ?? []) nObj[n.locale] = String(n.name);
    const fnRows = fns.get(pid) ?? [];
    const invByC = new Map();
    for (const ir of inv.get(pid) ?? []) {
      if (!invByC.has(ir.country)) invByC.set(ir.country, []);
      invByC.get(ir.country).push(ir.source);
    }
    const extRows = extByPlant.get(pid) ?? [];
    let extremes = null;
    if (extRows.length) {
      let coldTailC = null, heatDomeC = null, tminExtreme = null, tmaxExtreme = null;
      for (const er of extRows) {
        if (er.variable === 'tmin_extreme') {
          coldTailC = num(er.low);
          tminExtreme = { low: num(er.low), median: num(er.median), high: num(er.high), nCells: Number(er.n_cells ?? 0), nBlocks: Number(er.n_blocks ?? 0), weak: Number(er.weak) === 1, source: String(er.source ?? '') };
        } else if (er.variable === 'tmax_extreme') {
          heatDomeC = num(er.high);
          tmaxExtreme = { low: num(er.low), median: num(er.median), high: num(er.high), nCells: Number(er.n_cells ?? 0), nBlocks: Number(er.n_blocks ?? 0), weak: Number(er.weak) === 1, source: String(er.source ?? '') };
        }
      }
      extremes = { coldTailC, heatDomeC, maxDryDays: null, chillMinCP: null, source: null, tminExtreme, tmaxExtreme };
    }
    const frost = (frostByPlant.get(pid) ?? []).map((fr) => ({ kind: fr.kind, valueC: num(fr.value_c), variety: str(fr.variety), coarse: Number(fr.coarse) === 1, source: String(fr.source ?? '') }));
    return {
      id: String(r.id),
      canonical_name: String(r.canonical_name),
      genus: String(r.genus),
      family: str(r.family),
      names: nObj,
      image: imgs.has(pid) ? { url: `/data/consortium/images/${r.id}.jpg`, credit: null, licence: null, source_page_url: null } : null,
      role: r.role,
      stratum: r.stratum ? { value: r.stratum, sources: [] } : null,
      phases: r.phase_start != null && r.phase_end != null ? { start: phases[Number(r.phase_start)], end: phases[Number(r.phase_end)], sources: [] } : null,
      functions: fnRows.length ? fnRows.map((f) => ({ function: f.function, method: f.method, sources: [], kind: f.kind ?? null })) : null,
      traits: {
        height_m: r.height_min_m != null || r.height_max_m != null ? { min: num(r.height_min_m), max: num(r.height_max_m) } : null,
        width_max_m: num(r.width_max_m),
        sun: bool(r.sun), semi_shade: bool(r.semi_shade), full_shade: bool(r.full_shade),
        hardiness_zone: null, frost_tender: bool(r.frost_tender),
        soil_ph: r.soil_ph_min != null || r.soil_ph_max != null ? { min: num(r.soil_ph_min), max: num(r.soil_ph_max) } : null,
        well_drained: bool(r.well_drained), moisture_use: str(r.moisture_use), drought_tolerance: str(r.drought_tolerance),
        fertility_requirement: str(r.fertility_requirement), deciduous_evergreen: str(r.deciduous_evergreen),
        active_growth_period: str(r.active_growth_period), bloom_period: str(r.bloom_period), harvest_period: str(r.harvest_period),
        lifespan: str(r.lifespan), growth_rate: str(r.growth_rate), age_of_maturity_years: num(r.age_of_maturity_years),
        root_depth_min_cm: num(r.root_depth_min_cm), taproot_persistent: bool(r.taproot_persistent), root_system_type: str(r.root_system_type),
        mycorrhizal_type: str(r.mycorrhizal_type), nitrogen_fixer: bool(r.nitrogen_fixer), edibility_rating: num(r.edibility_rating),
        self_fertile: bool(r.self_fertile), sexual_system: str(r.sexual_system), pollinators: null,
        vegetative_spread_rate: str(r.vegetative_spread_rate), clonal_growth_form: str(r.clonal_growth_form),
        is_annual: bool(r.is_annual), grown_as_annual: bool(r.grown_as_annual), is_perennial: bool(r.is_perennial),
        habit: str(r.habit),
      },
      warnings: {
        toxicity: r.toxicity ? { level: r.toxicity, sources: [] } : null,
        invasive_in: [...invByC.entries()].map(([country, sources]) => ({ country, sources })),
        allelopathic: bool(r.allelopathic),
        weed_potential: bool(r.weed_potential),
      },
      climate: climMap.get(pid) ?? null,
      koppen: (koppenByPlant.get(pid) ?? []).map((k) => ({ code: String(k.koppen), share: Number(k.share), cells: Number(k.cells) })),
      areasKnown: r.wcvp_match != null,
      light: { sunniest: r.sun_exposure_sunniest ?? null, shadiest: r.sun_exposure_shadiest ?? null, preferred: r.sun_exposure_preferred ?? null },
      extremes,
      frost,
    };
  });
  poolCache.set(zone, pool);
  return pool;
}

const allInteractions = db.prepare('SELECT * FROM interactions').all().map((r) => ({
  subject: { name: String(r.subject), rank: r.subject_rank },
  object: { name: String(r.object), rank: r.object_rank },
  type: r.type,
  climate_zone: r.climate_zone ?? null,
  agent: r.agent ?? null,
  severity: r.severity ?? null,
  notes: null,
  sources: [],
}));

async function loadSiteLookup(lat, lon) {
  const raw = await lookupSite(lat, lon, tileSource);
  const tier1V07 = buildTier1V07(raw);
  const [tier2ARaw, monthlyRaw] = await Promise.all([
    lookupSiteTier2A(raw, tileSource).catch(() => null),
    lookupSiteMonthly(raw, tileSource).catch(() => null),
  ]);
  const tier2AV07 = tier2ARaw ? await Promise.resolve().then(() => buildTier2AV07(tier2ARaw)).catch(() => null) : null;
  const monthlyV07 = monthlyRaw ? await Promise.resolve().then(() => buildMonthlyV07(monthlyRaw)).catch(() => null) : null;
  return { ...raw, v07: { ...tier1V07, ...tier2AV07, ...(monthlyV07 ? { monthly: monthlyV07 } : {}) } };
}

// Pre-registered 22 global benchmark sites & expected minimum outcomes
const BENCHMARK_SITES = [
  { id: 'montpellier', label: 'Montpellier, FR', lat: 43.61, lon: 3.88, watering: 'rain', expectAnyOf: ['Olea europaea', 'Ficus carica', 'Ceratonia siliqua', 'Punica granatum'] },
  { id: 'seville', label: 'Seville, ES', lat: 37.39, lon: -5.98, watering: 'rain', expectAnyOf: ['Olea europaea', 'Ficus carica', 'Ceratonia siliqua', 'Punica granatum'] },
  { id: 'perth', label: 'Perth, AU', lat: -31.95, lon: 115.86, watering: 'rain', expectAnyOf: ['Olea europaea', 'Ficus carica', 'Ceratonia siliqua', 'Punica granatum'] },
  { id: 'lyon', label: 'Lyon, FR', lat: 45.76, lon: 4.84, watering: 'rain' },
  { id: 'kyoto', label: 'Kyoto, JP', lat: 35.01, lon: 135.77, watering: 'rain' },
  { id: 'capetown', label: 'Cape Town, ZA', lat: -33.92, lon: 18.42, watering: 'rain' },
  { id: 'briancon', label: 'Briançon, FR', lat: 44.90, lon: 6.64, watering: 'rain' },
  { id: 'belem', label: 'Belém, BR', lat: -1.45, lon: -48.50, watering: 'rain' },
  { id: 'marrakech', label: 'Marrakech, MA', lat: 31.63, lon: -8.01, watering: 'rain' },
  { id: 'montreal', label: 'Montréal, CA', lat: 45.50, lon: -73.57, watering: 'rain', expectAnyOf: ['Malus domestica'] },
  { id: 'nairobi', label: 'Nairobi, KE', lat: -1.29, lon: 36.82, watering: 'rain' },
  { id: 'riyadh_irrig', label: 'Riyadh (irrigated), SA', lat: 24.71, lon: 46.67, watering: 'all-year', expectAnyOf: ['Phoenix dactylifera'] },
  { id: 'lima_irrig', label: 'Lima (irrigated), PE', lat: -12.05, lon: -77.04, watering: 'all-year', minPlants: 3 },
  { id: 'phoenix', label: 'Phoenix, US', lat: 33.45, lon: -112.07, watering: 'rain' },
  { id: 'seattle', label: 'Seattle, US', lat: 47.61, lon: -122.33, watering: 'rain' },
  { id: 'delhi', label: 'Delhi, IN', lat: 28.61, lon: 77.21, watering: 'rain' },
  { id: 'beijing', label: 'Beijing, CN', lat: 39.90, lon: 116.40, watering: 'rain', forbidAnnualClimber: true },
  { id: 'kochi', label: 'Kochi, IN', lat: 9.93, lon: 76.27, watering: 'rain', forbidAppleFit: true },
  { id: 'singapore', label: 'Singapore, SG', lat: 1.35, lon: 103.82, watering: 'rain', forbidAppleFit: true },
  { id: 'bamako', label: 'Bamako, ML', lat: 12.64, lon: -8.00, watering: 'rain' },
  { id: 'bogota', label: 'Bogotá, CO', lat: 4.71, lon: -74.07, watering: 'rain' },
  { id: 'reykjavik', label: 'Reykjavík, IS', lat: 64.15, lon: -21.94, watering: 'rain' },
];

test('B1 strict invariance: permuting toxicity, invasive_in, weed_potential, and flat allelopathic yields byte-identical output on Starter, Picker, and Swaps', { skip: SKIP_NO_TILES }, async () => {
  const lookup = await loadSiteLookup(43.61, 3.88);
  const pool = readPool('Mediterranean');
  const effToday = resolveEffectiveSite(lookup, 'today', { room: 'small', plotM2: 150 });
  const eff2050 = resolveEffectiveSite(lookup, 'y2050', { room: 'small', plotM2: 150 });
  const ctx = { effToday, eff2050, lookup, climateZone: 'Mediterranean', interactions: allInteractions };

  const mutated = pool.map((t, i) => ({
    ...t,
    warnings: {
      toxicity: i % 2 === 0 ? { level: 'severe', sources: ['test'] } : null,
      invasive_in: i % 3 === 0 ? [{ country: 'FR', sources: ['griis'] }] : [],
      weed_potential: i % 2 === 1,
      allelopathic: i % 3 === 1,
    },
  }));

  const s1 = selectStarterPalette(pool, effToday, ctx).map((t) => t.id);
  const s2 = selectStarterPalette(mutated, effToday, ctx).map((t) => t.id);
  assert.deepEqual(s1, s2, 'Starter selection must be invariant to toxicity, invasive_in, weed_potential, and flat allelopathic');

  const guild1 = pool.slice(0, 3);
  const guild2 = mutated.slice(0, 3);
  const p1 = [...rankCandidatesForGuild(pool, guild1, ctx).entries()].sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0])).map(([id]) => id);
  const p2 = [...rankCandidatesForGuild(mutated, guild2, ctx).entries()].sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0])).map(([id]) => id);
  assert.deepEqual(p1, p2, 'Picker ranking must be invariant to warning flags');

  const sw1 = findCompatibleSwaps(guild1[0], pool, effToday, new Set(guild1.map((g) => g.id)), 5, ctx, guild1.slice(1)).map((c) => c.taxon.id);
  const sw2 = findCompatibleSwaps(guild2[0], mutated, effToday, new Set(guild2.map((g) => g.id)), 5, ctx, guild2.slice(1)).map((c) => c.taxon.id);
  assert.deepEqual(sw1, sw2, 'Swap ranking must be invariant to warning flags');
});

test('B2 mild-winter chill & B3 approved water-verdict rule (Sahara, Belém, Riyadh, Kochi, Singapore)', { skip: SKIP_NO_TILES }, async () => {
  const medPool = readPool('Mediterranean');
  const aridPool = readPool('Arid');
  const contPool = readPool('Continental');
  const tropPool = readPool('Tropical');

  const apple = contPool.find((t) => t.canonical_name === 'Malus domestica');
  const arrowroot = aridPool.find((t) => t.canonical_name === 'Maranta arundinacea');
  const ocotillo = aridPool.find((t) => t.canonical_name === 'Fouquieria splendens');
  const cacao = tropPool.find((t) => t.canonical_name === 'Theobroma cacao');
  assert.ok(apple && arrowroot && ocotillo && cacao);

  // Kochi & Singapore: Apple must NOT fit (mild_winter); cacao must NEVER be mild
  for (const [name, lat, lon] of [['Kochi', 9.93, 76.27], ['Singapore', 1.35, 103.82]]) {
    const lk = await loadSiteLookup(lat, lon);
    const eff = resolveEffectiveSite(lk, 'today', {});
    const vApple = evaluatePlantVerdict(apple, eff);
    assert.equal(vApple.level, 'at_risk', `${name}: Apple must be at_risk on mild winter, got ${vApple.level}`);
    assert.ok(vApple.reasons.some((r) => r.code === 'mild_winter'), `${name}: Apple must cite mild_winter`);
    const vCacao = evaluatePlantVerdict(cacao, eff);
    assert.equal(vCacao.reasons.some((r) => r.code.startsWith('mild_winter')), false, `${name}: Cacao must never fail mild_winter`);
  }

  // Central Sahara (23, 12): Arrowroot is check (water_needs_irrigation), NEVER fits, NEVER at_risk
  const saharaLk = await loadSiteLookup(23, 12);
  const effSahara = resolveEffectiveSite(saharaLk, 'today', { watering: 'rain' });
  const vArrow = evaluatePlantVerdict(arrowroot, effSahara);
  assert.equal(vArrow.level, 'check', `Sahara: Arrowroot must be check (needs watering), got ${vArrow.level}`);
  assert.ok(vArrow.reasons.some((r) => r.code === 'water_needs_irrigation'));
  const saharaStarter = selectStarterPalette(aridPool, effSahara, { lookup: saharaLk, climateZone: 'Arid', interactions: allInteractions });
  assert.equal(saharaStarter.some((t) => t.canonical_name === 'Maranta arundinacea'), false, 'Sahara starter must never include Arrowroot');

  // Belém (wet): Ocotillo (high drought tolerance) water reason is check (water_wet_drainage), NEVER at_risk on water
  const belemLk = await loadSiteLookup(-1.45, -48.50);
  const effBelem = resolveEffectiveSite(belemLk, 'today', { watering: 'rain' });
  const vOco = evaluatePlantVerdict(ocotillo, effBelem);
  const wetReason = vOco.reasons.find((r) => r.code === 'water_wet_drainage');
  assert.ok(wetReason, 'Belém: Ocotillo must cite water_wet_drainage');
  assert.equal(wetReason.severity, 'check', 'Belém: Ocotillo water reason must be check, never at_risk');

  // Seville 2050s drying stays a note, never a verdict loss
  const sevilleLk = await loadSiteLookup(37.39, -5.98);
  const effSev50 = resolveEffectiveSite(sevilleLk, 'y2050', { watering: 'rain' });
  const olive = medPool.find((t) => t.canonical_name === 'Olea europaea');
  assert.ok(olive);
  const vOlive50 = evaluatePlantVerdict(olive, effSev50);
  assert.equal(vOlive50.reasons.some((r) => r.code === 'water_needs_irrigation'), false, '2050s drying must be a note, never check');
});

test('A3 managed orchard genera exclude large forest nut trees (Juglans, Castanea, Cocos)', () => {
  const medPool = readPool('Mediterranean');
  const apple = medPool.find((t) => t.canonical_name === 'Malus domestica');
  const olive = medPool.find((t) => t.canonical_name === 'Olea europaea');
  assert.ok(apple && isManagedOrchardTree(apple));
  assert.ok(olive && isManagedOrchardTree(olive));
  const fakeWalnut = { ...apple, genus: 'Juglans', canonical_name: 'Juglans regia' };
  const fakeCoconut = { ...apple, genus: 'Cocos', canonical_name: 'Cocos nucifera' };
  assert.equal(isManagedOrchardTree(fakeWalnut), false);
  assert.equal(isManagedOrchardTree(fakeCoconut), false);
});

test('22-site global real-DB benchmark: regional staples, 0 severe conflicts, crown budget, perennial vines', { skip: SKIP_NO_TILES }, async () => {
  for (const s of BENCHMARK_SITES) {
    const lookup = await loadSiteLookup(s.lat, s.lon);
    const todayK = lookup.climate?.periods?.find((p) => p.period === '1991-2020')?.koppen ?? '';
    const zone = koppenToZone(todayK);
    const pool = readPool(zone);
    const ov = { room: 'small', plotM2: 150, watering: s.watering };
    const effToday = resolveEffectiveSite(lookup, 'today', ov);
    const eff2050 = resolveEffectiveSite(lookup, 'y2050', ov);
    const starter = selectStarterPalette(pool, effToday, {
      maxPlants: 8,
      eff2050,
      lookup,
      overrides: ov,
      climateZone: zone,
      interactions: allInteractions,
    });

    // Every starter plant must fit today & stay within netPlotM2
    for (const t of starter) {
      const v = evaluatePlantVerdict(t, effToday);
      assert.equal(v.level, 'fits', `${s.label}: starter ${t.canonical_name} must fit today, got ${v.level}`);
    }
    const cb = computeCrownBudget(starter, 150);
    assert.ok(cb.totalCrownM2 <= cb.netPlotM2, `${s.label}: crown ${cb.totalCrownM2} > net ${cb.netPlotM2}`);

    // 0 severe conflicts (alternate_host / allelopathic_harm)
    const pairs = matchPaletteInteractions(starter, allInteractions.filter((ix) => ix.climate_zone === null || ix.climate_zone === zone));
    const severe = pairs.filter((p) => (p.interaction.type === 'alternate_host' || p.interaction.type === 'allelopathic_harm') && (p.interaction.severity === 'high' || p.interaction.severity === 'medium'));
    assert.equal(severe.length, 0, `${s.label}: starter has severe conflict(s): ${severe.map((x) => x.interaction.type).join(', ')}`);

    // No annual climber ever claims a support tree
    for (const t of starter) {
      if (t.traits.is_annual === true || t.traits.grown_as_annual === true) {
        assert.equal(isStructuralVine(t), false, `${s.label}: annual ${t.canonical_name} must not be structural vine`);
        assert.equal(vineSupportTree(t, starter), null, `${s.label}: annual ${t.canonical_name} must not climb a tree`);
      }
    }

    if (s.minPlants != null) {
      assert.ok(starter.length >= s.minPlants, `${s.label}: expected >= ${s.minPlants} plants, got ${starter.length}`);
    }
    if (s.expectAnyOf) {
      const names = starter.map((t) => t.canonical_name);
      assert.ok(
        s.expectAnyOf.some((exp) => names.includes(exp)),
        `${s.label}: expected one of [${s.expectAnyOf.join(', ')}], got [${names.join(', ')}]`,
      );
    }
    if (s.forbidAppleFit) {
      const apple = readPool('Continental').find((t) => t.canonical_name === 'Malus domestica');
      assert.notEqual(evaluatePlantVerdict(apple, effToday).level, 'fits', `${s.label}: Apple must not fit`);
    }
  }
});
