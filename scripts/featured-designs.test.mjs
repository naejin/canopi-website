// The featured designs' privacy contract (src/scripts/design-canvas.js draws this file): plant
// positions are metres from the design's centre and the only place is a pin rounded to 0.1°.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const data = JSON.parse(readFileSync(new URL('../public/data/featured-designs.json', import.meta.url), 'utf8'));
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const keys = (object) => Object.keys(object).sort();

test('the file and each design carry only the allowed fields', () => {
  assert.deepEqual(keys(data), ['designs', 'format', 'stratumColors']);
  assert.ok(data.designs.length > 0);
  for (const design of data.designs) {
    assert.deepEqual(keys(design), ['boundsM', 'country', 'designer', 'id', 'name', 'organisation', 'pin', 'plantCount', 'plants', 'projectUrl', 'region', 'species', 'speciesCount', 'zones'], design.id);
    assert.deepEqual(keys(design.organisation), ['name', 'url'], design.id);
    assert.match(design.country, /^[A-Z]{2}$/, design.id);
    assert.equal(design.plants.length, design.plantCount, design.id);
    assert.equal(design.species.length, design.speciesCount, design.id);
    for (const species of design.species) {
      assert.deepEqual(keys(species), ['color', 'common', 'habit', 'heightMaxM', 'scientific', 'stratum', 'symbol'], `${design.id}: ${species.scientific}`);
      for (const lang of Object.keys(species.common)) assert.ok(LOCALES.includes(lang), `${design.id}: ${lang}`);
    }
    for (const plant of design.plants) {
      assert.equal(plant.length, 4, design.id);
      assert.ok(plant.every((value) => typeof value === 'number'), design.id);
    }
    for (const zone of design.zones) assert.deepEqual(keys(zone), ['closed', 'points'], design.id);
  }
});

test('the pin is the only geographic value and is rounded to 0.1°', () => {
  for (const design of data.designs) {
    assert.deepEqual(keys(design.pin), ['lat', 'lon'], design.id);
    for (const value of Object.values(design.pin)) {
      assert.equal(Math.round(value * 10) / 10, value, `${design.id}: ${value}`);
    }
  }
  // No other coordinates, notes, budget, views or owner data anywhere in the file.
  const forbidden = /^(lon|lat|lng|longitude|latitude|location|notes?|budget|calendar|views?|stories|annotations|owner|author|file|path)$/i;
  const walk = (value, path) => {
    if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${path}[${index}]`));
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (!path.endsWith('.pin')) assert.ok(!forbidden.test(key), `${path}.${key}`);
        walk(child, `${path}.${key}`);
      }
    }
  };
  walk(data, '$');
});
