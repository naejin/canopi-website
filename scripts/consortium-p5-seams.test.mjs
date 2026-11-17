// P5 commit 0: the shared seams the P5 streams fill (.local/consortium/v2/p5-owners.md). Each stream's
// own seams have their own file (consortium-p5-seams-s5b/c/d/e.test.mjs), so a stream edits only its
// file. This one pins where the host views mount each stream's slot and the one site-fit vocabulary
// (the marks pipeline it pinned went with the mark providers in PP-C c2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');

test('the host views mount every stream\'s slot, and Details opens on Against your place', () => {
  // The Place step (views/place/Place.tsx; b1a deletes Start.tsx): until b1a's merge Place.tsx re-exports Start.
  const place = view('place/Place.tsx');
  const start = place.includes("from '../Start.tsx'") ? view('Start.tsx') : place;
  assert.ok(start.indexOf('<LocationSlot />') > 0 && start.indexOf('<LocationSlot />') < start.indexOf('<Climates />'), 'S5b: LocationSlot before the cards');
  assert.match(start, /\{z && <PoolSlot zone=\{z\} \/>\}\s*\{z && hasList\(z\) && \(/, 'S5c: PoolSlot and hasList decide what follows the cards');
  assert.match(start, /const pill = cardPill\(z\);/, 'S5c: the card\'s pill from PoolSlot (Ready, Needs your location, Not covered yet; hand-off H-S5c-5)');
  assert.match(start, /climateShown\.value;[\s\S]*data-proposed/, 'S5b: a proposed climate shows as proposed, not checked (review round 1, 6)');
  assert.match(view('later.ts'), /export \{ FutureSlot \} from '\.\/FutureSlot\.tsx';/, 'S5d: FutureSlot in the later chunk');
  // In the palette slot, after Share, Print and Download, so they never move when it lands (hand-off branch).
  assert.match(view('Actions.tsx'), /later\(\(\) => laterChunk\(\)\.then\(\(m\) => m\.FutureSlot\), \{ idle: true \}\)/, 'idle: no download before ct:first-view or the data ready');
  assert.match(view('Actions.tsx'), /<ActionsView \/><future\.View \/>/, 'S5d: the panel after the actions (the matrix views above it went in PP-B commit 0a\')');
  // Details opens on "Against your place" (PP-C c2; PlantMarks went with the mark providers).
  assert.match(view('details/Details.tsx'), /<Against t=\{t\} \/>/);
});

// ---- E6 R2: the one site-fit vocabulary (core verdict-line.ts siteLines since fix round 1 B2, rules/site-fit.ts) ----
test('E6 R2 site-fit: one vocabulary of misfits, unknowns and notes; the flags keep the misfits that hold beside the canopy', async () => {
  const { siteFit, misfitsOf, unknownsOf } = await import('../src/islands/consortium/rules/site-fit.ts');
  const traits = { sun: true, semi_shade: false, full_shade: false, soil_ph: { min: 7.8, max: 8.4 }, drought_tolerance: 'Medium', moisture_use: null, well_drained: null, height_m: { max: 13.716 }, habit: 'Tree' };
  const low = taxon({ id: 'low', stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, traits });
  const site = { light: 'part', soil: 'acid', water: 'dry', room: 'small' };
  const lines = (t, st) => core.siteLines(t, st, core.fits(t, st)).map((m) => ({ ...m, key: m.line.key.slice('consortium.'.length), vars: Object.keys(m.line.vars).length ? m.line.vars : undefined }));
  const ms = lines(low, site);
  assert.deepEqual(ms.map((m) => [m.about, m.key, m.misfit, m.note ?? null]), [
    ['light', 'misfit.light.part', true, null],
    ['soil', 'misfit.soil.acid', true, null],
    ['water', 'water.dryMonths', false, 'dry_months'],
    ['room', 'room.tall', false, 'tall'],
  ]);
  assert.deepEqual(ms[1].vars, { min: 7.8, max: 8.4 }, 'the soil misfit names the plant\'s pH range');
  assert.deepEqual(ms[3].vars, { m: 13.7 }, 'the height to a tenth');
  assert.deepEqual(lines(taxon({ traits: { ...traits, soil_ph: { min: 7.8, max: null } } }), site)[1].vars, { min: 7.8, max: '?' }, 'a missing end is "?"');
  // What the check could not decide: neither a misfit nor a note.
  const unknown = taxon({ traits: { sun: null, habit: 'Climber' } });
  const um = core.siteLines(unknown, { light: 'sun', soil: 'unsure', water: 'unsure', room: 'large' }, core.fits(unknown, { light: 'sun', soil: 'unsure', water: 'unsure', room: 'large' }));
  assert.deepEqual(unknownsOf(um).map((m) => m.line.key), ['consortium.misfit.unk.light', 'consortium.misfit.unk.climber']);
  assert.deepEqual(misfitsOf(um), []);
  // Beside the members: on a sunny site a lower plant under a member's canopy is not a light misfit.
  const sunny = { ...site, light: 'sun', soil: 'unsure' };
  const shy = taxon({ id: 'shy', stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, traits: { ...traits, sun: false, semi_shade: true } });
  const canopy = taxon({ id: 'tall', stratum: { value: 'emergent', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] } });
  assert.deepEqual(misfitsOf(siteFit(shy, sunny, [])).map((m) => m.line.key), ['consortium.misfit.light.sun'], 'alone: a light misfit');
  assert.deepEqual(misfitsOf(siteFit(shy, sunny, [canopy])), [], 'under the canopy: none');
  assert.deepEqual(siteFit(shy, sunny, [canopy]).map((m) => m.line.key), ['consortium.water.dryMonths', 'consortium.room.tall'], 'the notes stay');
  assert.equal(core.siteFitMessages, undefined, 'the vocabulary left core site.ts (fix round 1 B2)');
});
