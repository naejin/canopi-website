// Wave 7.3 regression tests: locale-aware numeric parsing, opened-file sanitization,
// i18n completeness across all 11 locales, and honest persistence copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeNumericInput } from '../src/islands/palette/views/north-star/ns-helpers.ts';
import { parseValidClimate, sanitizeStudioOverrides } from '../src/islands/palette/views/north-star/ns-state.ts';

test('R7: normalizeNumericInput handles group commas in en/ja and decimal commas in fr/de', () => {
  assert.equal(normalizeNumericInput('1,200', 'en', false), '1200');
  assert.equal(normalizeNumericInput('1,200', 'ja', false), '1200');
  assert.equal(normalizeNumericInput('1,200.5', 'en', true), '1200.5');
  assert.equal(normalizeNumericInput('7,5', 'fr', true), '7.5');
  assert.equal(normalizeNumericInput('1.200,5', 'de', true), '1200.5');
  assert.equal(normalizeNumericInput('1 200', 'fr', false), '1200');
  assert.equal(normalizeNumericInput('−12', 'en', false), '-12');
});

test('R9: sanitizeStudioOverrides rejects NaN/invalid enums and clamps bounds including 4150 m elevation', () => {
  const clean = sanitizeStudioOverrides({
    plotM2: 'abc',
    soilPh: Number.NaN,
    room: 'castle',
    drainage: 'lava',
    wind: 'hurricane',
    siteLight: 'disco',
    aspect: 'northwest',
    coldAir: 'space',
    elevM: 4150,
    stonesPct: 120,
    watering: 'all-year',
  });
  assert.equal(clean.plotM2, undefined);
  assert.equal(clean.soilPh, undefined);
  assert.equal(clean.room, undefined);
  assert.equal(clean.drainage, undefined);
  assert.equal(clean.wind, undefined);
  assert.equal(clean.siteLight, undefined);
  assert.equal(clean.aspect, undefined);
  assert.equal(clean.coldAir, undefined);
  assert.equal(clean.elevM, 4150);
  assert.equal(clean.stonesPct, 100);
  assert.equal(clean.watering, 'all-year');

  assert.equal(parseValidClimate('Mediterranean'), 'Mediterranean');
  assert.equal(parseValidClimate('Mars'), null);
  assert.equal(parseValidClimate(123), null);
});

test('Lead #1, #3, #5 & R1: PlanSurface, Drawers, and climate-v07 regression guards', () => {
  const plan = fs.readFileSync('src/islands/palette/views/north-star/PlanSurface.tsx', 'utf8');
  assert.ok(!plan.includes('Checkmarks save on this device'), 'false persistence copy must be removed');
  assert.ok(!plan.includes('Honest crown-area budget'), 'PlanSurface kicker must use i18n key');
  assert.ok(!plan.includes('Mobile-ready nursery pocket checklist'), 'Nursery kicker must use i18n key');

  const drawers = fs.readFileSync('src/islands/palette/views/north-star/Drawers.tsx', 'utf8');
  assert.ok(!drawers.includes('href="/contact/"'), 'Dossier correction link must be locale-aware');
  assert.ok(!drawers.includes("'Tree / Canopy'"), 'Picker habit chips must be localized');
  assert.ok(!drawers.includes("'Perennial / Herb'"), 'Picker habit chips must be localized');

  const v07 = fs.readFileSync('src/islands/palette/state/climate-v07.ts', 'utf8');
  assert.ok(v07.includes('cur.siteKey === siteKey'), 'Analogue cache must be keyed on siteKey');
});

test('Wave 7.3 i18n keys exist across all 11 locales with zero PFAF strings', () => {
  const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
  const required = [
    'consortium.ns.climateUnknown',
    'consortium.ns.site.loadError',
    'consortium.ns.arrival.noPlaces',
    'consortium.ns.arrival.searchFailed',
    'consortium.ns.board.noFilterMatch',
    'consortium.ns.board.clearFilter',
    'consortium.ns.plan.nurseryHint',
    'consortium.ns.reason.siteLight',
    'consortium.ns.reason.stonySoil',
    'consortium.ns.file.errInvalidJson',
    'consortium.ns.file.errUnsupportedVersion',
    'consortium.ns.dossier.notWellDrained',
  ];
  for (const loc of locales) {
    const data = JSON.parse(fs.readFileSync(`src/i18n/translations/${loc}.json`, 'utf8'));
    for (const k of required) {
      assert.equal(typeof data[k], 'string', `${loc}.json missing ${k}`);
      assert.ok(data[k].length > 0, `${loc}.json empty ${k}`);
      assert.ok(!/pfaf/i.test(data[k]), `${loc}.json contains forbidden PFAF in ${k}`);
    }
  }
});
