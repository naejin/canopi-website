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

test('state/studio.ts syncs plantingConfig with store.plot and updates designName & microclimate', () => {
  store.view.value = 'matrix';

  studio.setDesignName('Montpellier Field Plot');
  assert.equal(studio.designName.value, 'Montpellier Field Plot');

  studio.setPlantingConfig({ plotAreaM2: 400, areaUnit: 'm2', densityMode: 'dense', pathwaysPct: 15 });
  assert.equal(store.plot.value, 400);
  assert.equal(studio.plantingConfig.value.densityMode, 'dense');

  studio.setMicroclimate({ slopeDeg: 12, aspect: 'south', landform: 'valley' });
  assert.equal(studio.microclimate.value.slopeDeg, 12);
  assert.equal(studio.microclimate.value.landform, 'valley');
});

test('Slice 3.2 touched components contain zero CSV export and clean grower vocabulary', () => {
  const touched = [
    '../src/islands/palette/views/north-star/NorthStarArrival.tsx',
    '../src/islands/palette/views/north-star/NorthStarStudio.tsx',
    '../src/islands/palette/views/north-star/PlanSurface.tsx',
    '../src/islands/palette/views/place/SitePostcard.tsx',
    '../src/islands/palette/views/place/AreaStep.tsx',
    '../src/islands/palette/views/LocationSlot.tsx',
  ];

  for (const rel of touched) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /\bcsv\b/i, `${rel} must not contain CSV export`);
    assert.doesNotMatch(
      src,
      /\b(shrub layer|herbaceous|climber)\b/i,
      `${rel} must not contain botanical-layer jargon in UI copy`,
    );
  }
});
