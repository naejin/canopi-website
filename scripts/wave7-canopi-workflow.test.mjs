// Wave 7 deterministic tests covering Reviewer's pre-registered R1–R5 checks:
// R1: save -> open round-trip (members, overrides, qty, existing, pathPct, unrecognized)
// R2: lossless Canopi app file (plants, zones, annotations, layers, timeline, budget, genus target,
//     custom stratum/phases on known plant, unknown species) + schema v9 validation
// R3: hard rule — unlinked never writes or downloads; linked open stays read-only until first Save,
//     then edits auto-save debounced to the linked handle
// R4: leave-warning dirty transitions & language-switch suppression
// R5: old .canopi version (v8) never links in place / never overwrites original
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { CANOPI_FILE_SCHEMA } from './vendor/canopi-design-format/canopi-design-format.ts';
import { validate } from './vendor/canopi-design-format/validate.mjs';

const core = await import('../src/lib/palette/index.ts');
const store = await import('../src/islands/palette/store.ts');
const saveMod = await import('../src/islands/palette/state/save.ts');
const nsFile = await import('../src/islands/palette/views/north-star/ns-file.ts');
const nsState = await import('../src/islands/palette/views/north-star/ns-state.ts');

async function bootFixtureCatalog() {
  const baseUrl = new URL('fixtures/consortium-v2/export/', import.meta.url);
  const manifestData = JSON.parse(readFileSync(new URL('manifest.json', baseUrl), 'utf8'));
  const sqliteMod = await import('../src/islands/palette/data/sqlite-source.ts');
  const loaderMod = await import('../src/islands/palette/data/load.ts');
  const dbBytes = new Uint8Array(gunzipSync(readFileSync(new URL(manifestData.files[0].file, baseUrl))));
  const { db } = await loaderMod.openBytes(dbBytes, {
    releaseId: manifestData.release_id,
    climates: manifestData.climates.map((c) => c.climate_zone),
  });
  const catalogSource = sqliteMod.createSqliteSource(db, { images: {} });
  const tempPool = await catalogSource.pool('Temperate');
  store.setSource(catalogSource);
  store.pools.value = { Temperate: tempPool };
  store.climate.value = 'Temperate';
  nsState.startNsWatchers();
  return tempPool;
}

const temperate = await bootFixtureCatalog();

test('R1 & R2: lossless Canopi app v9 round-trip preserves baseDoc, custom stratum/phases, genus targets, and unrecognized species', async () => {
  nsFile.resetCanopiFileState();
  const knownKeep = temperate[0];
  const knownRemove = temperate[1];
  const knownAdd = temperate[2];

  const appDoc = {
    version: 9,
    name: 'App Orchard Map',
    description: 'Created in Canopi Desktop',
    plant_species_colors: { [knownKeep.canonical_name]: '#3a6b35' },
    layers: [{ id: 'layer-1', name: 'Base Map', visible: true, locked: false, opacity: 1, z_index: 0 }],
    plants: [
      {
        id: 'p-1',
        layer_id: 'layer-1',
        species_canonical_name: knownKeep.canonical_name,
        position: { lat: 43.61, lon: 3.88 },
        canopy_radius_m: 3.2,
      },
    ],
    zones: [{ id: 'z-1', name: 'Zone 1', zone_number: 1, polygon: [] }],
    annotations: [{ id: 'a-1', annotation_type: 'note', position: { lat: 43.61, lon: 3.88 }, text: 'Well', font_size: 14 }],
    consortiums: [
      // App user customized stratum & phases on knownKeep — must survive verbatim!
      { target: { kind: 'species', canonical_name: knownKeep.canonical_name }, stratum: 'emergent', start_phase: 2, end_phase: 6 },
      { target: { kind: 'species', canonical_name: knownRemove.canonical_name }, stratum: 'medium', start_phase: 1, end_phase: 4 },
      // Non-species genus target — must survive verbatim and be counted!
      { target: { kind: 'genus', genus: 'Quercus' }, stratum: 'high', start_phase: 3, end_phase: 6 },
      // Unrecognized species not in DB — must survive verbatim!
      { target: { kind: 'species', canonical_name: 'Pseudolotus fictivus' }, stratum: 'low', start_phase: 0, end_phase: 2 },
    ],
    groups: [{ id: 'g-1', name: 'Guild A' }],
    timeline: [{ id: 't-1', year: 2027, action: 'Mulch' }],
    budget: [{ category: 'Plants', currency: 'EUR', description: 'Trees', quantity: 5, unit_cost: 25 }],
    created_at: '2026-01-10T08:00:00.000Z',
    updated_at: '2026-01-10T08:00:00.000Z',
  };

  const res = await nsFile.openCanopiText(JSON.stringify(appDoc), { fileName: 'orchard.canopi' });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.matched, 2);
  assert.equal(res.unrecognized, 1);
  assert.equal(res.nonSpecies, 1);
  assert.equal(nsFile.nsDirty.value, false, 'freshly opened file is clean');
  assert.deepEqual(nsFile.nsUnrecognizedPlants.value.map((p) => p.canonical_name), ['Pseudolotus fictivus']);
  assert.equal(nsFile.nsNonSpeciesEntries.value.length, 1);

  // Add 1 species, remove 1 species, adjust overrides/qty/pathPct
  nsState.addPlantToPalette(knownAdd.id);
  nsState.removePlantFromPalette(knownRemove.id);
  nsState.updateOverrides({ watering: 'all-year', soilPh: 6.4 });
  nsState.stepQty(knownKeep.id, 2, 1);
  nsState.setPathPct(30);
  assert.equal(nsFile.nsDirty.value, true, 'edits mark palette dirty');

  const savedText = nsFile.buildCurrentCanopiText();
  const savedDoc = JSON.parse(savedText);

  // All app-owned top-level keys remain deep-equal
  for (const key of ['name', 'description', 'plant_species_colors', 'layers', 'plants', 'zones', 'annotations', 'groups', 'timeline', 'budget', 'created_at']) {
    assert.deepEqual(savedDoc[key], appDoc[key], `top-level key ${key} preserved deep-equal`);
  }

  // Consortiums: knownKeep keeps exact app stratum/phases; genus target survives; unknown survives; knownRemove dropped; knownAdd appended
  assert.equal(savedDoc.consortiums.length, 4);
  assert.deepEqual(savedDoc.consortiums[0], appDoc.consortiums[0], 'knownKeep keeps its own stratum/phases verbatim');
  assert.deepEqual(savedDoc.consortiums[1], appDoc.consortiums[2], 'genus target survives verbatim');
  assert.deepEqual(savedDoc.consortiums[2], appDoc.consortiums[3], 'unrecognized species survives verbatim');
  assert.equal(savedDoc.consortiums[3].target.canonical_name, knownAdd.canonical_name, 'added species appended');

  // Re-open the saved file (R1 full round-trip)
  const res2 = await nsFile.openCanopiText(savedText, { fileName: 'orchard.canopi' });
  assert.equal(res2.ok, true);
  assert.deepEqual(store.members.value, [knownKeep.id, knownAdd.id]);
  assert.equal(nsState.effectiveOverrides.value.watering, 'all-year');
  assert.equal(nsState.effectiveOverrides.value.soilPh, 6.4);
  assert.equal(nsState.nsPathPct.value, 30);
  assert.equal(nsState.nsQtyById.value[knownKeep.id], 3);
  assert.deepEqual(nsFile.nsUnrecognizedPlants.value.map((p) => p.canonical_name), ['Pseudolotus fictivus']);
  assert.equal(nsFile.nsDirty.value, false);

  // Schema check on a clean studio-created v9 file
  nsFile.resetCanopiFileState();
  store.members.value = [knownKeep.id, knownAdd.id];
  const freshDoc = JSON.parse(nsFile.buildCurrentCanopiText());
  assert.deepEqual(validate(CANOPI_FILE_SCHEMA, freshDoc), [], 'fresh studio .canopi passes CANOPI_FILE_SCHEMA v9');
});

test('R3: hard rule — unlinked never writes; linked stays read-only until first Save, then edits auto-save', async () => {
  nsFile.resetCanopiFileState();
  store.view.value = 'matrix';
  store.members.value = [temperate[0].id];

  // Unlinked: 30 edits -> 0 writes
  for (let i = 0; i < 30; i++) nsFile.markNsDirty();
  assert.equal(nsFile.nsFileLinked.value, false);
  assert.equal(nsFile.nsFileWriteGranted.value, false);
  assert.equal(nsFile.nsDirty.value, true);

  // Linked via openCanopiText with a mock handle
  let writeCount = 0;
  let permRequests = 0;
  const mockHandle = {
    name: 'linked.canopi',
    async requestPermission() {
      permRequests++;
      return 'granted';
    },
    async createWritable() {
      return {
        async write() { writeCount++; },
        async close() {},
      };
    },
  };
  const validText = core.canopiFile([temperate[0]], { name: 'Linked', description: null, at: '2026-11-26T00:00:00Z' });
  const openRes = await nsFile.openCanopiText(validText, { fileName: 'linked.canopi', handle: mockHandle });
  assert.equal(openRes.ok, true);
  assert.equal(nsFile.nsFileLinked.value, true);
  assert.equal(nsFile.nsFileWriteGranted.value, false, 'read-only until first Save');

  // Edits before first Save must NOT write
  nsFile.markNsDirty();
  assert.equal(writeCount, 0, 'no write before first explicit Save');

  // First explicit Save asks write permission and writes
  const saved = await nsFile.saveCanopiFile();
  assert.equal(saved, true);
  assert.equal(permRequests, 1);
  assert.equal(writeCount, 1);
  assert.equal(nsFile.nsFileWriteGranted.value, true);
  assert.equal(nsFile.nsDirty.value, false);

  // Subsequent edit triggers debounced auto-save
  nsFile.markNsDirty();
  assert.equal(nsFile.nsDirty.value, true);
  await new Promise((r) => setTimeout(r, 1350));
  assert.equal(writeCount, 2, 'subsequent edit auto-saved to linked handle');
  assert.equal(nsFile.nsDirty.value, false);
});

test('R4 & R5: language-switch suppression works cleanly and v8 files are never linked for in-place overwrite', async () => {
  assert.equal(saveMod.isLeaveWarningSuppressed(), false);
  saveMod.suppressLeaveWarning();
  assert.equal(saveMod.isLeaveWarningSuppressed(), true);

  let writeCalls = 0;
  const v8Handle = {
    name: 'old-v8.canopi',
    async createWritable() {
      writeCalls++;
      return { async write() {}, async close() {} };
    },
  };
  const v8Doc = {
    version: 8,
    name: 'Old v8 Design',
    description: null,
    consortiums: [{ target: { kind: 'species', canonical_name: temperate[0].canonical_name }, stratum: 'high', start_phase: 1, end_phase: 5 }],
  };
  const res = await nsFile.openCanopiText(JSON.stringify(v8Doc), { fileName: 'old-v8.canopi', handle: v8Handle });
  assert.equal(res.ok, true);
  assert.equal(nsFile.nsFileLinked.value, false, 'v8 file must NOT be linked for in-place overwrite');
  assert.equal(nsFile.nsOpenedVersion.value, 8, 'v8 version tracked for honest older-file status');
  nsFile.markNsDirty();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(writeCalls, 0, 'v8 handle is never written to');
});

test('Review round 1 fixes: malformed target preserved, language-switch baseDoc/relink survival, pickCoordinates dirty, localized errors', async () => {
  // 1. Malformed consortiums target entry is preserved verbatim
  nsFile.resetCanopiFileState();
  const malformedEntry = { target: { strange: 42 }, stratum: 'medium', start_phase: 1, end_phase: 5 };
  const docWithMalformed = {
    version: 9,
    name: 'Malformed Entry Test',
    description: null,
    plant_species_colors: {},
    layers: [{ id: 'l1' }],
    plants: [{ id: 'p1', species_canonical_name: temperate[0].canonical_name }],
    zones: [{ id: 'z1' }],
    annotations: [],
    consortiums: [
      { target: { kind: 'species', canonical_name: temperate[0].canonical_name }, stratum: 'high', start_phase: 2, end_phase: 6 },
      malformedEntry,
    ],
    groups: [],
    timeline: [],
    budget: [],
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
  const parsed = core.parseCanopiFile(JSON.stringify(docWithMalformed));
  const out = JSON.parse(core.canopiFile([temperate[0]], {
    name: parsed.name,
    description: parsed.description,
    at: '2026-11-26T00:00:00Z',
    baseDoc: parsed.baseDoc,
    preservedEntries: parsed.rawConsortiums,
  }));
  assert.ok(out.consortiums.some((c) => c.target?.strange === 42), 'malformed target entry survives verbatim');

  // 2. Language-switch session hydration preserves baseDoc + rawConsortiums + flags relinkNeeded when IDB unavailable
  await nsFile.openCanopiText(JSON.stringify(docWithMalformed), { fileName: 'app.canopi', handle: { name: 'app.canopi', async createWritable() { return { async write() {}, async close() {} }; } } });
  const snap = nsFile.getFileSessionState();
  assert.equal(snap.wasLinked, true);
  assert.deepEqual(snap.baseDoc?.zones, [{ id: 'z1' }]);
  nsFile.resetCanopiFileState();
  nsFile.hydrateFileSession({
    fileName: 'app.canopi',
    dirty: false,
    baseDoc: snap.baseDoc,
    preservedEntries: snap.preservedEntries,
    wasLinked: snap.wasLinked,
  });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(nsFile.nsFileRelinkNeeded.value, true, 'signals relinkNeeded when handle cannot be restored');
  store.members.value = [temperate[0].id];
  const rebuilt = JSON.parse(nsFile.buildCurrentCanopiText());
  assert.deepEqual(rebuilt.zones, [{ id: 'z1' }], 'baseDoc zones survive language switch');
  assert.deepEqual(rebuilt.layers, [{ id: 'l1' }], 'baseDoc layers survive language switch');
  assert.ok(rebuilt.consortiums.some((c) => c.target?.strange === 42), 'preservedEntries survive language switch');
  assert.equal(rebuilt.customPlants, undefined, 'does not emit duplicate top-level customPlants for plain preserved entries');

  // 3. pickCoordinates marks dirty in Studio when user changes place
  store.view.value = 'matrix';
  nsFile.nsDirty.value = false;
  await nsState.pickCoordinates(43.61, 3.88, 'Montpellier, France', 'Mediterranean', 'FR');
  assert.equal(nsFile.nsDirty.value, true, 'user Change place marks dirty');

  // 4. Denied write permission sets localized error status (never crashes or leaves raw error)
  const deniedHandle = {
    name: 'denied.canopi',
    async requestPermission() { return 'denied'; },
    async createWritable() { throw new Error('should not reach'); },
  };
  await nsFile.openCanopiText(JSON.stringify(docWithMalformed), { fileName: 'denied.canopi', handle: deniedHandle });
  const saved = await nsFile.saveCanopiFile();
  assert.equal(saved, false);
  assert.equal(nsFile.nsFileStatus.value.kind, 'error');
  assert.ok(nsFile.nsFileStatus.value.reason.length > 0);
});

test('Wave 7.1: startMemory removes leftover legacy palette localStorage keys once on load while keeping site preferences', async () => {
  const storeMap = new Map([
    ['canopi-consortium', '{"fragment":"v=5&c=temperate&a=&e=1","at":"2026-11-26T00:00:00Z","src":"chosen"}'],
    ['canopi-place', 'm=small&z=120'],
    ['canopi-ns-existing', '["ficus_carica"]'],
    ['canopi-ns-checked', '["ficus_carica"]'],
    ['canopi-country', 'FR'],
    ['canopi-climate', 'mediterranean'],
    ['canopi-location', '{"lat":43.61,"lon":3.88,"source":"search"}'],
    ['canopi-theme', 'dark'],
  ]);
  const readKeys = [];
  const origLocal = globalThis.localStorage;
  const origWindow = globalThis.window;
  const origLocation = globalThis.location;
  const origHistory = globalThis.history;
  globalThis.localStorage = {
    getItem: (k) => { readKeys.push(k); return storeMap.get(k) ?? null; },
    setItem: (k, v) => { storeMap.set(k, String(v)); },
    removeItem: (k) => { storeMap.delete(k); },
  };
  globalThis.location = { origin: 'https://projectcanopi.test', pathname: '/palette/', search: '', hash: '', href: 'https://projectcanopi.test/palette/' };
  globalThis.history = { state: null, replaceState() {} };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  try {
    const { LEGACY_PALETTE_KEYS } = await import('../src/islands/palette/state/save.ts');
    const { startMemory } = await import('../src/islands/palette/state/arrival.ts');
    startMemory();
    for (const k of LEGACY_PALETTE_KEYS) {
      assert.equal(storeMap.has(k), false, `legacy key ${k} removed on load`);
      assert.equal(readKeys.includes(k), false, `legacy key ${k} is never read`);
    }
    assert.equal(storeMap.get('canopi-country'), 'FR', 'canopi-country kept');
    assert.equal(storeMap.get('canopi-climate'), 'mediterranean', 'canopi-climate kept');
    assert.ok(storeMap.has('canopi-location'), 'canopi-location kept');
    assert.equal(storeMap.get('canopi-theme'), 'dark', 'canopi-theme kept');
  } finally {
    globalThis.localStorage = origLocal;
    if (origWindow === undefined) delete globalThis.window; else globalThis.window = origWindow;
    if (origLocation === undefined) delete globalThis.location; else globalThis.location = origLocation;
    if (origHistory === undefined) delete globalThis.history; else globalThis.history = origHistory;
  }
});
