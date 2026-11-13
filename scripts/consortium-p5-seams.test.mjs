// P5 commit 0: the shared seams the P5 streams fill (.local/consortium/v2/p5-owners.md). Each stream's
// own seams have their own file (consortium-p5-seams-s5b/c/d/e.test.mjs), so a stream edits only its
// file. This one pins what no stream changes: the marks pipeline (marks.ts, mark-providers.ts,
// store.ts markProviders), the mark context, and where the host views mount each stream's slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');

test('marks.ts plantMarks: the loaded providers concatenated in order, for one surface; none loaded, no marks', async () => {
  assert.deepEqual(core.plantMarks(taxon(), ctx(), 'chip'), [], 'no providers loaded (the site answers\' marks need a dry site or a sized room)');
  const mark = (kind, state) => ({ kind, key: `test.${kind}`, severity: 'note', ...(state ? { state } : {}) });
  const providers = [() => [mark('edge')], () => [], (t, c, surface) => (c.location && surface !== 'chip' ? [mark('native', 'native')] : [])];
  assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), 'details', providers).map((m) => [m.kind, m.state]), [['edge', undefined], ['native', 'native']]);
  assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), 'chip', providers).map((m) => m.kind), ['edge'], 'a provider keeps a mark off a surface');
  assert.deepEqual(core.markSurfaces, ['chip', 'row', 'add', 'details']);
  assert.deepEqual(core.markKinds, ['edge', 'outside', 'unknown', 'estimate', 'future', 'native', 'aridity', 'season', 'water', 'room']);
  const loaded = await core.loadMarkProviders();
  assert.deepEqual(loaded.map((p) => p.name), ['rangeMarks', 'futureMarks'], 'range (S5c), future (S5d) (native, S5e, in P5.2); the site answers\' marks are on the island path (marks.ts)');
  assert.equal(await core.loadMarkProviders(), loaded, 'loaded once');
  for (const s of core.markSurfaces) assert.deepEqual(core.plantMarks(taxon(), ctx({ location: lyon }), s, loaded), [], `the stubs mark nothing (${s})`);
  assert.equal('markProviders' in core, false, 'the providers stay out of index.ts, so out of the first run');
});

test('marks.ts needsMarkProviders: the providers load only with a site location or a climate whose plants are borrowed', () => {
  const curated = ['Tropical', 'Mediterranean', 'Temperate'];
  assert.equal(core.needsMarkProviders({ climate: null, location: null }, curated), false);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null }, curated), false, 'today\'s path loads nothing');
  assert.equal(core.needsMarkProviders({ climate: 'Subtropical', location: null }, curated), true);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: lyon }, curated), true);
  assert.equal(core.needsMarkProviders({ climate: 'Temperate', location: null, site: { light: 'unsure', soil: 'unsure', water: 'dry', room: 'unsure' } }, curated), false, 'a dry site alone: its marks are on the island path (marks.ts plantMarks)');
});

test('store: markContext follows the climate, location and scenario; the providers load when a location is set', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  assert.deepEqual(store.markContext.value, { climate: store.climate.value, location: null, scenario: 'ssp245', site: store.site.value });
  assert.deepEqual(store.markProviders.value, [], 'none on the first run');
  store.location.value = lyon;
  try {
    assert.equal(store.markContext.value.location, lyon);
    await core.loadMarkProviders();
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(store.markProviders.value.length, 2);
  } finally { store.location.value = null; }
});

test('the host views mount every stream\'s slot, and PlantMarks names its surface everywhere', () => {
  const start = view('Start.tsx');
  assert.ok(start.indexOf('<LocationSlot />') > 0 && start.indexOf('<LocationSlot />') < start.indexOf('<Climates />'), 'S5b: LocationSlot before the cards');
  assert.match(start, /\{z && <PoolSlot zone=\{z\} \/>\}\s*\{z && hasList\(z\) && \(/, 'S5c: PoolSlot and hasList decide what follows the cards');
  assert.match(start, /const pill = cardPill\(z\);/, 'S5c: the card\'s pill from PoolSlot (Ready, Needs your location, Not covered yet; hand-off H-S5c-5)');
  assert.match(start, /climate\.value \?\? pendingClimate\.value;[\s\S]*data-proposed/, 'S5b: a proposed climate shows as proposed, not checked (review round 1, 6)');
  assert.match(view('later.ts'), /export \{ FutureSlot \} from '\.\/FutureSlot\.tsx';/, 'S5d: FutureSlot in the later chunk');
  // Under the matrix's view, after Share, Print and Download, so they never move when it lands (hand-off branch).
  assert.match(view('Actions.tsx'), /later\(\(\) => import\('\.\/later\.ts'\)\.then\(\(m\) => m\.FutureSlot\), \{ idle: true \}\)/, 'idle: no download before ct:matrix');
  assert.match(view('Actions.tsx'), /<ActionsView \/>\{v === 'matrix' && <future\.View \/>\}/, 'S5d: the panel after the actions, under the matrix view');
  assert.doesNotMatch(view('Matrix.tsx') + view('PhoneMatrix.tsx'), /<FutureSlot \/>/, 'not above the actions');
  assert.match(view('Details.tsx'), /<PlantMarks taxon=\{t\} surface="details" \/>/);
  assert.equal((view('Add.tsx').match(/<PlantMarks taxon=\{t\} surface="add" \/>/g) ?? []).length, 2);
  assert.match(view('StageBar.tsx'), /<PlantMarks taxon=\{taxon\} surface=\{tight \? 'chip' : 'row'\} \/>/);
  assert.match(view('PlantMarks.tsx'), /data-mark=\{m\.kind\} data-mark-state=\{m\.state\}/);
});

// ---- E6 R2: the one site-fit vocabulary (core site-marks.ts siteFitMessages, rules/site-fit.ts) ----
test('E6 R2 site-fit: one vocabulary of misfits, unknowns and notes; the flags keep the misfits that hold beside the canopy; the site marks are its notes', async () => {
  const { siteFit, misfitsOf, unknownsOf } = await import('../src/islands/consortium/rules/site-fit.ts');
  const { siteMarks } = await import('../src/lib/consortium/site-marks.ts');
  const traits = { sun: true, semi_shade: false, full_shade: false, soil_ph: { min: 7.8, max: 8.4 }, drought_tolerance: 'Medium', moisture_use: null, well_drained: null, height_m: { max: 13.716 }, habit: 'Tree' };
  const low = taxon({ id: 'low', stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, traits });
  const site = { light: 'part', soil: 'acid', water: 'dry', room: 'small' };
  const ms = core.siteFitMessages(low, site);
  assert.deepEqual(ms.map((m) => [m.about, m.key, m.asks, m.severity, m.state ?? null]), [
    ['light', 'misfit.light.part', true, 'warning', null],
    ['soil', 'misfit.soil.acid', true, 'warning', null],
    ['water', 'water.dryMonths', false, 'note', 'dry_months'],
    ['room', 'room.tall', false, 'note', 'tall'],
  ]);
  assert.deepEqual(ms[1].vars, { min: 7.8, max: 8.4 }, 'the soil misfit names the plant\'s pH range');
  assert.deepEqual(ms[3].vars, { m: 13.7 }, 'the height to a tenth');
  assert.deepEqual(core.siteFitMessages(taxon({ traits: { ...traits, soil_ph: { min: 7.8, max: null } } }), site)[1].vars, { min: 7.8, max: '?' }, 'a missing end is "?"');
  // What the check could not decide: neither a misfit nor a note.
  const unknown = taxon({ traits: { sun: null, habit: 'Climber' } });
  const um = core.siteFitMessages(unknown, { light: 'sun', soil: 'unsure', water: 'unsure', room: 'large' });
  assert.deepEqual(unknownsOf(um).map((m) => m.key), ['misfit.unk.light', 'misfit.unk.climber']);
  assert.deepEqual(misfitsOf(um), []);
  // Beside the members: on a sunny site a lower plant under a member's canopy is not a light misfit.
  const sunny = { ...site, light: 'sun', soil: 'unsure' };
  const shy = taxon({ id: 'shy', stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, traits: { ...traits, sun: false, semi_shade: true } });
  const canopy = taxon({ id: 'tall', stratum: { value: 'emergent', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] } });
  assert.deepEqual(misfitsOf(siteFit(shy, sunny, [])).map((m) => m.key), ['misfit.light.sun'], 'alone: a light misfit');
  assert.deepEqual(misfitsOf(siteFit(shy, sunny, [canopy])), [], 'under the canopy: none');
  assert.deepEqual(siteFit(shy, sunny, [canopy]).map((m) => m.key), ['water.dryMonths', 'room.tall'], 'the notes stay');
  // The site marks are the notes of the same messages: full words in Details, "Short" elsewhere.
  const c = { ...ctx(), site };
  assert.deepEqual(siteMarks(low, c, 'details').map((m) => [m.kind, m.key, m.state]), [['water', 'water.dryMonths', 'dry_months'], ['room', 'room.tall', 'tall']]);
  assert.deepEqual(siteMarks(low, c, 'row').map((m) => m.key), ['water.dryMonthsShort', 'room.tallShort']);
  assert.deepEqual(siteMarks(low, c, 'chip'), []);
  assert.equal('vars' in siteMarks(low, c, 'row')[0], false, 'a note without vars carries none');
});
