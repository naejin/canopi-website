// Wave 7.2 unit & static regression tests:
// - soilTextureLabel formats all 12 USDA textureIds across all 11 locales with zero underscores
// - null / empty texture returns localized ns.unknown (never fake 'loam')
// - non-USDA fallback replaces underscores with spaces
// - drainageChoiceLabel formats sandy / clay / wet across all 11 locales
// - static guard: no raw 'loam' fallback in Arrival/Drawers/PlanSurface and all 7 numeric inputs use NumericField
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { textureIds } from '../src/lib/palette/index.ts';
import { drainageChoiceLabel, soilTextureLabel } from '../src/islands/palette/rules/soil-labels.ts';

const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];

function translatorFor(locale) {
  const raw = JSON.parse(readFileSync(new URL(`../src/i18n/translations/${locale}.json`, import.meta.url), 'utf8'));
  return (key) => raw[`consortium.${key}`] ?? key;
}

test('soilTextureLabel formats all 12 USDA textureIds in all 11 locales with zero underscores', () => {
  for (const loc of LOCALES) {
    const t = translatorFor(loc);
    for (const id of textureIds) {
      const label = soilTextureLabel(id, t);
      assert.ok(label.length > 0, `${loc}:${id} non-empty`);
      assert.ok(!label.includes('_'), `${loc}:${id} must not contain underscore (got "${label}")`);
      assert.ok(!label.startsWith('details.texture.'), `${loc}:${id} must resolve translation key`);
    }
  }
  assert.equal(soilTextureLabel('silty_clay_loam', translatorFor('en')), 'silty clay loam');
  assert.equal(soilTextureLabel('silty_clay_loam', translatorFor('fr')), 'limon argilo-silteux');
  assert.equal(soilTextureLabel('silty_clay_loam', translatorFor('de')), 'schluffig-toniger Lehm');
  assert.notEqual(soilTextureLabel('silty_clay_loam', translatorFor('ru')), 'silty_clay_loam');
});

test('soilTextureLabel returns localized ns.unknown for null/empty and space-falls-back for non-USDA values', () => {
  for (const loc of LOCALES) {
    const t = translatorFor(loc);
    assert.equal(soilTextureLabel(null, t), t('ns.unknown'), `${loc}: null -> ns.unknown`);
    assert.equal(soilTextureLabel(undefined, t), t('ns.unknown'), `${loc}: undefined -> ns.unknown`);
    assert.equal(soilTextureLabel('   ', t), t('ns.unknown'), `${loc}: blank -> ns.unknown`);
  }
  assert.equal(soilTextureLabel('peaty_muck_loam', translatorFor('en')), 'peaty muck loam');
});

test('drainageChoiceLabel formats sandy/clay/wet across all 11 locales', () => {
  for (const loc of LOCALES) {
    const t = translatorFor(loc);
    for (const d of ['sandy', 'clay', 'wet']) {
      const label = drainageChoiceLabel(d, t);
      assert.ok(label.length > 0, `${loc}:${d} non-empty`);
      assert.notEqual(label, d, `${loc}:${d} must not return raw enum`);
      assert.ok(!label.startsWith('ns.land.'), `${loc}:${d} must resolve translation key`);
    }
  }
});

test('no fake loam fallback in North Star views and all 7 numeric inputs use NumericField', () => {
  const arrival = readFileSync(new URL('../src/islands/palette/views/north-star/NorthStarArrival.tsx', import.meta.url), 'utf8');
  const drawers = readFileSync(new URL('../src/islands/palette/views/north-star/Drawers.tsx', import.meta.url), 'utf8');
  const plan = readFileSync(new URL('../src/islands/palette/views/north-star/PlanSurface.tsx', import.meta.url), 'utf8');
  const land = readFileSync(new URL('../src/islands/palette/views/north-star/LandPanel.tsx', import.meta.url), 'utf8');

  for (const [name, src] of [['NorthStarArrival', arrival], ['Drawers', drawers], ['PlanSurface', plan]]) {
    assert.ok(!src.includes("?? 'loam'"), `${name} must not fall back to fake 'loam'`);
  }
  assert.ok(!land.includes('type="number"'), 'LandPanel must use NumericField instead of type="number"');
  assert.ok(!plan.includes('type="number"'), 'PlanSurface must use NumericField instead of type="number"');
  for (const id of ['land-plot-m2', 'elev-input', 'slope-input', 'freeze-input', 'heat-input', 'cdd-input']) {
    assert.ok(land.includes(`id="${id}"`), `LandPanel includes NumericField ${id}`);
  }
  assert.ok(plan.includes('id="plot-m2"'), 'PlanSurface includes NumericField plot-m2');
});
