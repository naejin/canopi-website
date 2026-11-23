// P5 commit 0: the shared seams the P5 streams fill (.local/consortium/v2/p5-owners.md). Each stream's
// own seams have their own file (consortium-p5-seams-s5b/c/d/e.test.mjs), so a stream edits only its
// file. This one pins the one site-fit vocabulary (the marks pipeline it pinned went with the mark
// providers in PP-C c2; where the host views mounted each slot, a source read of the PP-B Place and
// Actions, went in pf commit 0: the boards replace those screens, consortium-pf-c.browser.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/palette/index.ts');

// ---- E6 R2: the one site-fit vocabulary (core verdict-line.ts siteLines since fix round 1 B2, rules/site-fit.ts) ----
test('E6 R2 site-fit: one vocabulary of misfits, unknowns and notes; the flags keep the misfits that hold beside the canopy', async () => {
  const { siteFit, misfitsOf, unknownsOf } = await import('../src/islands/palette/rules/site-fit.ts');
  const traits = { sun: true, semi_shade: false, full_shade: false, soil_ph: { min: 7.8, max: 8.4 }, drought_tolerance: 'Medium', moisture_use: null, well_drained: null, height_m: { max: 13.716 }, habit: 'Tree' };
  const low = taxon({ id: 'low', stratum: { value: 'low', sources: [] }, phases: { start: 'placenta_i', end: 'climax', sources: [] }, traits });
  const site = { light: 'part', soil: 'acid', water: 'dry', room: 'small' };
  const lines = (t, st) => core.siteLines(t, st, core.fits(t, st)).map((m) => ({ ...m, key: m.line.key.slice('consortium.'.length), vars: Object.keys(m.line.vars).length ? m.line.vars : undefined }));
  const ms = lines(low, site);
  assert.deepEqual(ms.map((m) => [m.about, m.key, m.misfit, m.note ?? null]), [
    ['light', 'misfit.light.part', true, null],
    ['soil', 'misfit.soil.acid', true, null],
    ['room', 'room.tall', false, 'tall'],
  ]);
  assert.deepEqual(ms[1].vars, { min: 7.8, max: 8.4 }, 'the soil misfit names the plant\'s pH range');
  assert.deepEqual(ms[2].vars, { m: 13.7 }, 'the height to a tenth');
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
  assert.deepEqual(siteFit(shy, sunny, [canopy]).map((m) => m.line.key), ['consortium.room.tall'], 'the note stays');
  assert.equal(core.siteFitMessages, undefined, 'the vocabulary left core site.ts (fix round 1 B2)');
});
