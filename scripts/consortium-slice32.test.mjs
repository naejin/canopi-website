// Deterministic unit tests for Phase 3 / Slice 3.2:
// - Studio state (state/studio.ts): designName, dirty tracking, plantingConfig <-> store.plot sync,
//   microclimate state, and .canopi v9 build/open round-trip
// - Zero native title="..." attributes in all touched Slice 3.2 components
// - Zero CSV export & zero forbidden botanical-layer jargon in new Slice 3.2 UI views
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = await import('../src/islands/palette/store.ts');
const studio = await import('../src/islands/palette/state/studio.ts');

test('state/studio.ts syncs plantingConfig with store.plot, tracks dirty state, and round-trips .canopi v9', () => {
  store.view.value = 'matrix';
  studio.markDesignClean();
  assert.equal(studio.designDirty.value, false);

  studio.setDesignName('Montpellier Field Plot');
  assert.equal(studio.designName.value, 'Montpellier Field Plot');
  assert.equal(studio.designDirty.value, true);

  studio.setPlantingConfig({ plotAreaM2: 400, areaUnit: 'm2', densityMode: 'dense', pathwaysPct: 15 });
  assert.equal(store.plot.value, 400);
  assert.equal(studio.plantingConfig.value.densityMode, 'dense');

  studio.setMicroclimate({ slopeDeg: 12, aspect: 'south', landform: 'valley' });
  assert.equal(studio.microclimate.value.slopeDeg, 12);
  assert.equal(studio.microclimate.value.landform, 'valley');

  const text = studio.buildStudioCanopiText([]);
  const opened = studio.openStudioCanopiText(text);
  assert.equal(opened.ok, true);
  assert.equal(studio.designName.value, 'Montpellier Field Plot');
  assert.equal(studio.plantingConfig.value.plotAreaM2, 400);
  assert.equal(studio.designDirty.value, false);

  const bad = studio.openStudioCanopiText('{not valid json');
  assert.equal(bad.ok, false);
});

test('Slice 3.2 touched components contain zero native title attributes, zero CSV export, and clean grower vocabulary', () => {
  const touched = [
    '../src/islands/palette/views/kit/field-tip.tsx',
    '../src/islands/palette/views/palette/StudioHeader.tsx',
    '../src/islands/palette/views/palette/PlantingPlanTab.tsx',
    '../src/islands/palette/views/palette/RequestPlantModal.tsx',
    '../src/islands/palette/views/place/SitePostcard.tsx',
    '../src/islands/palette/views/place/AreaStep.tsx',
    '../src/islands/palette/views/StageBar.tsx',
    '../src/islands/palette/views/LocationSlot.tsx',
  ];

  for (const rel of touched) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /\btitle\s*=/, `${rel} must not use native title="..." attributes`);
  }

  const newUiViews = touched.slice(0, 6);
  for (const rel of newUiViews) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /\bcsv\b/i, `${rel} must not contain CSV export`);
    assert.doesNotMatch(
      src,
      /\b(canopy|understory|ground cover|shrub layer|herbaceous|climber|strata)\b/i,
      `${rel} must not contain botanical-layer jargon in UI copy`,
    );
  }
});
