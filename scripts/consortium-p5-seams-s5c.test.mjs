// Stream S5c (filtered pool and nearest placements): the range rule (core range.ts, owner answer 2,
// 2026-11-11), the nearest-list placements (placement.ts and PlantSource.borrowed, owner answer 1),
// the range and estimate marks (range-marks.ts), the Start slot (views/PoolSlot.tsx and its feature
// chunk views/pool/pool.tsx), its strings, and the pool sizes the design check measured at 14 sites
// on the real export (p5-design-check.md §C). S5c owns this file; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ctx, lyon, placement, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const { rangeMarks } = await import('../src/lib/consortium/range-marks.ts');
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');

// A site whose today values are given (the climate reader's historical period first, a future one after).
const at = (tminColdC, tmaxWarmC, aridityIndex = 1) => ({
  lat: 0, lon: 0, source: 'map',
  lookup: {
    lat: 0, lon: 0, soil: null, regions: { wgsrpdL3: null, isoA2: null },
    climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: [
      { period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC, tmaxWarmC, tmeanColdC: 0, tmeanWarmC: 0, aridityIndex },
      { period: '2071-2099', scenario: 'ssp585', koppen: 'BWh', koppenTemperatureMarginC: 0, tminColdC: tminColdC + 6, tmaxWarmC: tmaxWarmC + 8, tmeanColdC: 0, tmeanWarmC: 0, aridityIndex: 0.1 },
    ] },
  },
});

// ---- the range rule: the fixture plant is recorded with coldest month -15…2.5 °C, warmest month 18…30 °C ----

test('rangeFit: coldest month on both sides and warmest month on the hot side, "edge" within 2 °C beyond Q05/Q95, "outside" beyond', () => {
  const t = taxon();
  assert.equal(core.RANGE_MARGIN_C, 2);
  assert.equal(core.rangeFit(t, at(0, 25)), 'inside');
  assert.equal(core.rangeFit(t, at(-15, 30)), 'inside', 'on the percentiles is inside');
  assert.equal(core.rangeFit(t, at(-16, 25)), 'edge', 'colder than recorded, within the margin');
  assert.equal(core.rangeFit(t, at(-17, 25)), 'edge', 'exactly 2 °C beyond is still the edge');
  assert.equal(core.rangeFit(t, at(-17.1, 25)), 'outside');
  assert.equal(core.rangeFit(t, at(4, 25)), 'edge', 'milder winters than recorded');
  assert.equal(core.rangeFit(t, at(4.6, 25)), 'outside', 'too mild a winter is outside too (both sides)');
  assert.equal(core.rangeFit(t, at(0, 31.5)), 'edge', 'hotter summers than recorded');
  assert.equal(core.rangeFit(t, at(0, 32.1)), 'outside');
  assert.equal(core.rangeFit(t, at(0, 5)), 'inside', 'a cool summer is never checked (hot side only)');
  assert.deepEqual(core.rangeCheck(t, at(-16, 31)).sides, ['cold', 'hot']);
  assert.deepEqual(core.rangeCheck(t, at(-18, 31)), { verdict: 'outside', sides: ['cold', 'hot'], beyond: ['cold'], aridity: 'unknown' });
});

test('rangeCheck: an annual skips the winter-cold check on both sides, the summer heat still applies (owner, "Annuals skip the winter-cold check")', () => {
  // Harbin-like values: coldest-month minimum -24 °C, warmest-month maximum 29 °C.
  const harbin = at(-24, 29);
  const marks = (t, site, surface) => rangeMarks(t, ctx({ location: site }), surface).map((m) => [m.kind, m.key, m.severity]);
  const warmRange = { ...taxon().climate, tminCold: { low: -2, median: 5, high: 12, count: 90, basis: 'observed_cells' }, tmaxWarm: { low: 20, median: 27, high: 31, count: 90, basis: 'observed_cells' } };
  const annual = taxon({ traits: { is_annual: true }, climate: warmRange });
  assert.deepEqual(core.rangeCheck(annual, harbin), { verdict: 'inside', sides: [], beyond: [], aridity: 'unknown' }, 'cold: passes, no cold side');
  assert.equal(core.rangeFit(taxon({ traits: { is_annual: false }, climate: warmRange }), harbin), 'outside', 'a perennial with the same range is still left out');
  const mild = at(18, 29);
  assert.equal(core.rangeCheck(annual, mild).sides.includes('mild'), false, 'nor the mild-winter side');
  const hot = taxon({ traits: { is_annual: true }, climate: { ...warmRange, tmaxWarm: { ...warmRange.tmaxWarm, high: 25 } } });
  assert.equal(core.rangeFit(hot, harbin), 'outside', 'heat: 29 °C against 25 still fails');
  assert.deepEqual(core.withinRange([annual], harbin), [annual], 'kept in the filtered pool');
  assert.deepEqual(marks(annual, harbin, 'row'), [['unknown', 'range.annual', 'note']], 'its row says it grows in the warm season');
  assert.deepEqual(marks(annual, harbin, 'chip'), [], 'not on chips');
});

test('passes: the one comparison of the range rule (range.ts), in hundredths of a degree, used by today\'s check and the future one', () => {
  assert.equal(core.passes(7.8, 7.8, 'above'), 'inside', 'on the bound');
  assert.equal(core.passes(9.8, 7.8, 'above'), 'edge', 'exactly the margin above, though 9.8 - 7.8 is a hair over 2 in floats');
  assert.equal(core.passes(9.81, 7.8, 'above'), 'beyond');
  assert.equal(core.passes(5.8, 7.8, 'below'), 'edge');
  assert.equal(core.passes(5.79, 7.8, 'below'), 'beyond');
  assert.equal(core.passes(8, 7.8, 'below'), 'inside');
  assert.equal('rangeSides' in core, false, 'the sides are a type, not a value export');
  // future.ts takes the same rule: a slot 2 °C above Q95 in decimal terms (32.02 > 30.02 + 2 in floats) is the edge, not outside.
  const t = taxon({ climate: { ...taxon().climate, tmaxWarm: { low: 18, median: 25, high: 30.02, count: 9, basis: 'observed_cells' } }, phases: { start: 'secondary_i', end: 'secondary_ii' } });
  const site = at(0, 30);
  site.lookup.climate.periods = [site.lookup.climate.periods[0], ...['ssp126', 'ssp245', 'ssp370', 'ssp585'].flatMap((scenario) => ['2041-2070', '2071-2099'].map((period) => ({ ...site.lookup.climate.periods[0], period, scenario, tmaxWarmC: 32.02 })))];
  assert.equal(core.futureCheck(t, site, 'ssp245')?.verdict, 'edge');
});

test('rangeFit: today\'s period only (the 1991-2020 historical slot), never a future one', () => {
  const s = at(0, 25);
  s.lookup.climate.periods.reverse();
  assert.equal(core.siteToday(s).scenario, 'historical');
  assert.equal(core.rangeFit(taxon(), s), 'inside');
});

test('rangeFit: no range is "unknown", never filtered; no site climate checks nothing', () => {
  assert.equal(core.rangeFit(taxon({ climate: null }), at(-40, 45)), 'unknown');
  assert.equal(core.rangeFit(taxon({ climate: { ...taxon().climate, tminCold: null, tmaxWarm: null } }), at(-40, 45)), 'unknown');
  assert.equal(core.rangeFit(taxon(), null), 'unknown');
  assert.equal(core.rangeCheck(taxon(), null), null);
  assert.equal(core.rangeCheck(taxon(), { ...lyon, lookup: null }), null, 'lookup loading or failed');
  assert.equal(core.rangeCheck(taxon(), { ...lyon, lookup: { ...lyon.lookup, climate: null } }), null, 'open sea');
  assert.deepEqual(core.rangeVerdicts, ['inside', 'edge', 'outside', 'unknown']);
});

test('rangeCheck: aridity is a mark only (drier, wetter, not checked on ice), never the verdict', () => {
  const arid = { low: 0.5, median: 1, high: 2, count: 200, basis: 'observed_cells' };
  const t = taxon({ climate: { ...taxon().climate, aridity: arid } });
  assert.deepEqual(core.rangeCheck(t, at(0, 25, 0.1)), { verdict: 'inside', sides: [], beyond: [], aridity: 'drier' });
  assert.equal(core.rangeCheck(t, at(0, 25, 3)).aridity, 'wetter');
  assert.equal(core.rangeCheck(t, at(0, 25, 1)).aridity, 'inside');
  assert.equal(core.rangeCheck(t, at(0, 25, null)).aridity, 'not-checked');
  assert.equal(core.rangeCheck(taxon(), at(0, 25, 1)).aridity, 'unknown', 'no aridity recorded');
});

test('withinRange: leaves out only the plants outside, never a kept one; the same list when nothing is checked', () => {
  const pool = [taxon({ id: 'a' }), taxon({ id: 'b', climate: null }), taxon({ id: 'c', climate: { ...taxon().climate, tminCold: { low: 5, median: 9, high: 15, count: 9, basis: 'observed_cells' } } })];
  assert.equal(core.withinRange(pool, null), pool);
  assert.equal(core.withinRange(pool, { ...lyon, lookup: null }), pool);
  assert.deepEqual(core.withinRange(pool, at(0, 25)).map((t) => t.id), ['a', 'b']);
  assert.deepEqual(core.withinRange(pool, at(0, 25), ['c']).map((t) => t.id), ['a', 'b', 'c'], 'a kept plant stays, outside or not');
});

// ---- nearest placements ----

test('placeFor: a curated climate uses its own placement; an uncovered one borrows the first of its nearest lists, marked estimate', () => {
  const placements = { Temperate: placement('high', 'secondary_i', 'secondary_iii'), Mediterranean: placement('medium', 'secondary_i', 'secondary_iii'), Tropical: placement('low', 'placenta_i', 'placenta_iii') };
  assert.deepEqual(core.placeFor(placements, 'Temperate'), { zone: 'Temperate', placement: placements.Temperate, estimate: false });
  assert.deepEqual(core.placeFor(placements, 'Subtropical'), { zone: 'Mediterranean', placement: placements.Mediterranean, estimate: true });
  assert.deepEqual(core.placeFor({ Tropical: placements.Tropical, Temperate: placements.Temperate }, 'Arid'), { zone: 'Tropical', placement: placements.Tropical, estimate: true });
  assert.deepEqual(core.placeFor(placements, 'Continental'), { zone: 'Temperate', placement: placements.Temperate, estimate: true });
  assert.deepEqual(core.placeFor({ Mediterranean: placements.Mediterranean }, 'Boreal'), { zone: 'Mediterranean', placement: placements.Mediterranean, estimate: true });
  assert.equal(core.placeFor({ Tropical: placements.Tropical }, 'Boreal'), null, 'Boreal never borrows from the Tropical list');
  assert.equal(core.placeFor({ Tropical: placements.Tropical }, 'Temperate'), null, 'a curated climate never borrows');
  // P5 engineering choices row (2026-11-11).
  assert.deepEqual(core.NEAREST_LISTS.Subtropical, ['Mediterranean', 'Tropical', 'Temperate']);
  assert.deepEqual(core.NEAREST_LISTS.Arid, ['Mediterranean', 'Tropical', 'Temperate']);
  assert.deepEqual(core.NEAREST_LISTS.Continental, ['Temperate', 'Mediterranean']);
  assert.deepEqual(core.NEAREST_LISTS.Boreal, ['Temperate', 'Mediterranean']);
  for (const z of ['Tropical', 'Mediterranean', 'Temperate']) assert.deepEqual(core.NEAREST_LISTS[z], [z]);
  const curated = ['Tropical', 'Mediterranean', 'Temperate'];
  for (const z of core.climateZones) assert.equal(core.hasPlants(z, curated), true, z);
  assert.equal(core.hasPlants('Boreal', ['Tropical']), false);
  assert.equal(core.hasPlants('Arid', ['Tropical']), true);
});

async function sourceOf(file, expected) {
  const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(file))), expected);
  return createSqliteSource(opened.db, { images: {} });
}
const fixtureDir = new URL('fixtures/consortium-v2/export/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureDir), 'utf8'));
const fixture = await sourceOf(new URL(manifest.files[0].file, fixtureDir), { releaseId: manifest.release_id, climates: manifest.climates.map((c) => c.climate_zone) });

test('PlantSource.borrowed (sqlite-source.ts): every plant of the nearest lists once, placed as in the first list that has it, estimate and placedFrom set', async () => {
  const asked = [];
  const real = fixture.borrowed;
  fixture.borrowed = (zone, order) => { asked.push([zone, order]); return real(zone, order); };
  const sub = await fixture.pool('Subtropical');
  assert.deepEqual(asked, [['Subtropical', core.NEAREST_LISTS.Subtropical]], 'pool() of an uncovered climate asks borrowed()');
  fixture.borrowed = real;
  const own = Object.fromEntries(await Promise.all(['Tropical', 'Mediterranean', 'Temperate'].map(async (z) => [z, await fixture.pool(z)])));
  const all = new Set(Object.values(own).flat().map((t) => t.id));
  assert.equal(sub.length, all.size, 'every plant of the three lists, once');
  assert.ok(sub.every((t) => t.estimate === true && t.placedFrom), 'each one an estimate, with the list it comes from');
  const names = sub.map((t) => t.canonical_name);
  assert.deepEqual(names, [...names].sort(), 'by name, as a curated pool');
  const placements = await fixture.placements(sub.map((t) => t.id));
  for (const t of sub) {
    const want = core.placeFor(placements.get(t.id), 'Subtropical');
    assert.equal(t.placedFrom, want.zone, t.canonical_name);
    assert.equal(t.stratum?.value ?? null, want.placement.stratum, t.canonical_name);
    assert.equal(t.phases?.start ?? null, want.placement.start, t.canonical_name);
  }
  const byName = (list, n) => list.find((t) => t.canonical_name === n);
  assert.equal(byName(sub, 'Castanea sativa').placedFrom, 'Mediterranean', 'Mediterranean before Temperate');
  assert.equal(byName(sub, 'Zingiber officinale').placedFrom, 'Mediterranean', 'Mediterranean before Tropical');
  assert.equal(byName(sub, 'Tropaeolum majus').placedFrom, 'Tropical', 'Tropical before Temperate');
  const cont = await fixture.pool('Continental');
  assert.equal(byName(cont, 'Castanea sativa').placedFrom, 'Temperate', 'Continental: Temperate first');
  assert.equal(byName(cont, 'Carica papaya'), undefined, 'Continental never borrows a Tropical-only plant');
  assert.equal(await fixture.pool('Subtropical'), sub, 'read once and kept: the same objects');
  assert.equal(byName(own.Temperate, 'Castanea sativa').estimate, undefined, 'the curated pool itself is not touched');
  assert.equal(await fixture.borrowed('Boreal', []).then((l) => l.length), 0, 'no curated list in the order: nothing');
});

// ---- marks ----

test('rangeMarks: edge, outside and unknown with a site climate; estimate on a borrowed placement, with or without a location', () => {
  const marks = (t, site, surface) => rangeMarks(t, ctx({ location: site }), surface).map((m) => [m.kind, m.key, m.severity]);
  assert.deepEqual(marks(taxon(), null, 'row'), [], 'no location: no range mark (P2 unchanged)');
  assert.deepEqual(marks(taxon(), at(0, 25), 'row'), [], 'inside: no mark');
  assert.deepEqual(marks(taxon(), at(-16, 25), 'chip'), [['edge', 'range.edgeShort', 'note']]);
  assert.deepEqual(marks(taxon(), at(-16, 25), 'row'), [['edge', 'range.edge', 'note']]);
  assert.deepEqual(marks(taxon(), at(-20, 25), 'add'), [['outside', 'range.outside', 'warning']]);
  assert.deepEqual(marks(taxon(), at(-20, 25), 'chip'), [['outside', 'range.outsideShort', 'warning']]);
  assert.deepEqual(marks(taxon({ climate: null }), at(0, 25), 'add'), [['unknown', 'range.unknown', 'note']]);
  assert.deepEqual(marks(taxon({ climate: null }), at(0, 25), 'chip'), [['unknown', 'range.unknownShort', 'note']], 'chips get the short word');
  const details = rangeMarks(taxon(), ctx({ location: at(-20, 31) }), 'details');
  assert.deepEqual(details.map((m) => [m.kind, m.key]), [['outside', 'range.outsideDetails'], ['outside', 'range.side.cold'], ['edge', 'range.side.hot']]);
  assert.deepEqual(details[1].vars, { site: -20, bound: -15 });
  assert.deepEqual(details[2].vars, { site: 31, bound: 30 });
  // The values a Details line shows are those the verdict compared: a bound of 7.84 against 5.8 is
  // outside (2.04 beyond) and the line says 7.84, never a rounded 7.8 that reads as within 2 °C.
  const fine = taxon({ climate: { ...taxon().climate, tminCold: { low: 7.84, median: 9, high: 12, count: 9, basis: 'observed_cells' } } });
  const line = rangeMarks(fine, ctx({ location: at(5.8, 25) }), 'details').find((m) => m.key === 'range.side.cold');
  assert.equal(line.kind, 'outside');
  assert.deepEqual(line.vars, { site: 5.8, bound: 7.84 });
  const arid = taxon({ climate: { ...taxon().climate, aridity: { low: 0.5, median: 1, high: 2, count: 9, basis: 'observed_cells' } } });
  assert.deepEqual(marks(arid, at(0, 25, 0.1), 'row'), [['aridity', 'range.drier', 'note']], 'aridity: a mark only, of its own kind, so "N near the edge" and the edge marks agree');
  assert.deepEqual(marks(arid, at(0, 25, 0.1), 'chip'), [], 'not on the tight chips');
  assert.deepEqual(marks(arid, at(0, 25, null), 'details'), [['unknown', 'range.aridityNotChecked', 'note']], 'ice: not checked');
  const borrowed = taxon({ placedFrom: 'Mediterranean', estimate: true });
  assert.deepEqual(marks(borrowed, null, 'chip'), [['estimate', 'estimate.short', 'note']]);
  assert.deepEqual(marks(borrowed, null, 'row'), [['estimate', 'estimate.fromMediterranean', 'note'], ['estimate', 'estimate.noSite', 'note']], 'without a location: give one to check it (UX audit fix 1)');
  assert.deepEqual(marks(borrowed, null, 'details'), [['estimate', 'estimate.fromMediterranean', 'note'], ['estimate', 'estimate.noSite', 'note']]);
  assert.deepEqual(marks(borrowed, at(-16, 25), 'chip'), [['edge', 'range.edgeShort', 'note'], ['estimate', 'estimate.short', 'note']]);
  assert.equal('rangeMarks' in core, false, 'not exported from index.ts, so out of the first run');
});

test('strings: every S5c key sits in its block, in all 11 locales, with the same placeholders and plural forms', () => {
  const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
  const blockOf = (l) => {
    const keys = Object.keys(JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8')));
    return keys.slice(keys.indexOf('consortium.block.s5c') + 1, keys.indexOf('consortium.block.s5d'));
  };
  const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
  const mine = blockOf('en');
  // What the code reads: range-marks.ts and pool.tsx keys.
  const used = ['range.edge', 'range.edgeShort', 'range.edgeDetails', 'range.outside', 'range.outsideShort', 'range.outsideDetails', 'range.unknown', 'range.unknownShort', 'range.drier', 'range.wetter', 'range.aridityNotChecked',
    'range.side.cold', 'range.side.mild', 'range.side.hot', 'range.pool.count', 'range.pool.edge', 'range.pool.left', 'range.pool.caveat', 'range.pool.aridityNotChecked',
    'range.empty.title', 'range.empty.body', 'range.empty.search', 'range.unavailable', 'range.unavailableBorrowed', 'range.needsSite', 'range.needsSite.go', 'range.needsSite.pill', 'range.annual', 'estimate.short', 'estimate.fromMediterranean', 'estimate.fromTropical', 'estimate.fromTemperate', 'estimate.borrowed', 'estimate.noSite'];
  assert.deepEqual(mine, used.map((k) => `consortium.${k}`));
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().filter((x, i, a) => a.indexOf(x) === i);
  for (const l of locales) {
    const strings = JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'));
    assert.deepEqual(blockOf(l), mine, l);
    for (const k of mine) {
      assert.deepEqual(holes(strings[k]), holes(en[k]), `${l} ${k}`);
      if (/^(one|other):/.test(en[k])) {
        // The forms the locale's existing plural strings use (P falls back to other).
        const forms = (s) => s.split(' | ').map((p) => p.split(':')[0]).sort();
        assert.deepEqual(forms(strings[k]), forms(strings['consortium.paste.addAll']), `${l} ${k} plural forms`);
      }
    }
  }
  for (const l of locales) {
    const strings = JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'));
    for (const k of mine) assert.doesNotMatch(strings[k], /\b2\s?°C/, `${l} ${k}: the margin comes from {margin} (RANGE_MARGIN_C)`);
    assert.match(strings['consortium.range.pool.count'], /\{margin\}/, `${l}: the count names the margin`);
  }
  assert.match(en['consortium.range.side.cold'], /mostly recorded down to \{bound\}/, 'Q05: "mostly recorded down to"');
  assert.match(en['consortium.range.side.mild'], /mostly recorded up to \{bound\}/, 'Q95: "mostly recorded up to"');
  assert.match(en['consortium.range.side.hot'], /mostly recorded up to \{bound\}/);
  assert.match(en['consortium.range.pool.caveat'], /cultivation included/);
  assert.match(en['consortium.range.pool.caveat'], /not been reviewed/);
});

const SITES = {
  lyon: ['Cfa', 'Subtropical', 0.1, 26.6, 1.1],
  dakar: ['BSh', 'Arid', 20.0, 28.6, 0.32],
  lima: ['BWh', 'Arid', 14.9, 24.9, 0.03],
  hanoi: ['Cwa', 'Subtropical', 13.4, 32.5, 1.28],
  montreal: ['Dfa', 'Continental', -13.5, 25.9, 1.61],
  nairobi: ['Aw', 'Tropical', 12.3, 26.5, 1.02],
  perth: ['Csa', 'Mediterranean', 9.8, 30.3, 0.82],
  seville: ['Csa', 'Mediterranean', 5.8, 34.8, 0.58],
  oslo: ['Dfb', 'Continental', -7.6, 21.1, 1.55],
  manaus: ['Af', 'Tropical', 24.0, 31.2, 1.3],
  phoenix: ['BWh', 'Arid', 5.2, 41.6, 0.14],
  brisbane: ['Cfa', 'Subtropical', 10.8, 28.2, 1.07],
  yakutsk: ['Dfc', 'Boreal', -39.8, 24.7, 0.48],
  chicago: ['Dfa', 'Continental', -6.2, 27.8, 1.3],
};
// Plants kept (not outside) from the climate's pool, own or borrowed, with annuals exempt from the
// winter-cold check (owner, "Annuals skip the winter-cold check"; before it: Lyon 339, Montreal 100,
// Oslo 224, Yakutsk 0, the design check's counts). Yakutsk keeps its 59 annuals and nothing else.
const KEPT = { lyon: 348, dakar: 247, lima: 253, hanoi: 244, montreal: 145, nairobi: 182, perth: 131, seville: 101, oslo: 238, manaus: 183, phoenix: 13, brisbane: 289, yakutsk: 59, chicago: 238 };

const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const real = await sourceOf(new URL(`../public${index.files[0].url}`, import.meta.url), { releaseId: index.release_id, climates: index.climates });

test('real export: the pool each site keeps, and a suggestion from it never holds a plant outside its range, a site misfit or a serious conflict', async () => {
  for (const [name, [koppen, zone, tmin, tmax, ai]] of Object.entries(SITES)) {
    const site = at(tmin, tmax, ai);
    site.lookup.climate.periods[0].koppen = koppen;
    const pool = await real.pool(zone);
    assert.equal(pool.length > 0, true, `${name}: ${zone} has plants`);
    assert.equal(pool.every((t) => !!t.estimate === !index.climates.includes(zone)), true, `${name}: borrowed plants are estimates, own ones not`);
    const kept = core.withinRange(pool, site);
    assert.equal(kept.length, KEPT[name], `${name} (${koppen} → ${zone})`);
    const ctxt = { site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' }, interactions: await real.interactions(zone), country: null, countryStatus: 'none' };
    const s = core.suggest(kept, ctxt);
    const members = s.members.map((id) => kept.find((t) => t.id === id));
    assert.equal(members.every((t) => t && core.rangeFit(t, site) !== 'outside'), true, `${name}: no suggested plant outside its range`);
    assert.equal(core.flagsOf(members, ctxt).some((f) => f.kind === 'conflict' && f.severity === 'high'), false, `${name}: no serious conflict`);
    assert.ok(s.members.length > 0, `${name}: a suggestion`);
    if (name === 'yakutsk') assert.equal(members.every((t) => t.traits.is_annual === true), true, 'Yakutsk: annuals only (they skip the winter-cold check)');
  }
});

test('PlantSource.interactions: a borrowed climate reads the rows of the curated lists it borrows from, and only those', async () => {
  const zones = async (src, z) => new Set((await src.interactions(z)).map((i) => i.climate_zone));
  assert.deepEqual([...await zones(fixture, 'Subtropical')].sort(), [null, 'Temperate', 'Tropical'].sort(), 'Subtropical: the general rows and those of Temperate and Tropical');
  assert.deepEqual([...await zones(fixture, 'Continental')].sort(), [null, 'Temperate'].sort(), 'Continental never reads a Tropical row');
  assert.deepEqual([...await zones(fixture, 'Temperate')].sort(), [null, 'Temperate'].sort(), 'a curated climate: its own rows, as in P2');
  assert.ok((await zones(real, 'Arid')).has('Mediterranean'), 'real export: an Arid pool sees a Mediterranean-specific row');
  assert.equal((await zones(real, 'Boreal')).has('Tropical'), false, 'real export: Boreal sees no Tropical row');
});

test('PlantSource.interactions: duplicate rows keep the highest severity, then list order, so a conflict warning never gets milder (fix review 231bead, 3)', async () => {
  const opened = await openBytes(new Uint8Array(gunzipSync(readFileSync(new URL(`../public${index.files[0].url}`, import.meta.url)))), { releaseId: index.release_id, climates: index.climates });
  // The export has no such key today: a wrapped db adds, for one Subtropical row, a milder general copy
  // (read first by list order) and a stronger copy from the last list of the order.
  const db = new Proxy(opened.db, { get(o, k) {
    if (k !== 'selectObjects') return typeof o[k] === 'function' ? o[k].bind(o) : o[k];
    return (sql, params) => {
      const rows = o.selectObjects(sql, params);
      if (!/^SELECT \* FROM interactions/.test(sql)) return rows;
      const r = rows.find((x) => x.climate_zone === 'Tropical');
      return r ? [...rows, { ...r, interaction: -1, climate_zone: null, severity: 'low' }, { ...r, interaction: -2, climate_zone: 'Temperate', severity: 'high' }] : rows;
    };
  } });
  const src = createSqliteSource(db, { images: {} });
  const plain = (await real.interactions('Subtropical')).find((x) => x.climate_zone === 'Tropical');
  assert.ok(plain, 'a Tropical row to copy');
  const key = (x) => [x.subject.name, x.object.name, x.type, x.agent ?? ''].join('|');
  const got = (await src.interactions('Subtropical')).filter((x) => key(x) === key(plain));
  assert.deepEqual(got.map((x) => [x.climate_zone, x.severity]), [['Temperate', 'high']], 'the high row wins over the general and the earlier lists');
});

test('PlantSource.interactions: a borrowed climate keeps one row per (subject, object, type, agent): the general row first, then the first list in NEAREST_LISTS order', async () => {
  const pv = (rows) => rows.filter((r) => r.subject.name === 'Phaseolus vulgaris' && r.object.name === 'Zea mays' && r.type === 'intercropped_yield_gain');
  assert.deepEqual(pv(await real.interactions('Subtropical')).map((r) => r.climate_zone), ['Tropical'], 'Subtropical: Mediterranean, Tropical, Temperate → the Tropical row only');
  assert.deepEqual(pv(await real.interactions('Continental')).map((r) => r.climate_zone), ['Temperate'], 'Continental: Temperate first');
  assert.deepEqual(pv(await real.interactions('Temperate')).map((r) => r.climate_zone), ['Temperate'], 'a curated climate: its own row');
  const key = (r) => [r.subject.rank, r.subject.name, r.object.rank, r.object.name, r.type, r.agent ?? ''].join('|');
  for (const z of ['Subtropical', 'Arid', 'Continental', 'Boreal']) {
    const keys = (await real.interactions(z)).map(key);
    assert.equal(new Set(keys).size, keys.length, `${z}: no duplicate rows`);
  }
  // conflicts() and pairings() then see each pair once.
  const pool = await real.pool('Subtropical');
  const bean = pool.find((t) => t.canonical_name === 'Phaseolus vulgaris'), maize = pool.find((t) => t.canonical_name === 'Zea mays');
  assert.ok(bean && maize, 'both in the Subtropical pool');
  assert.equal(core.pairings(bean, [maize], await real.interactions('Subtropical')).length, 1, 'one yield-gain pairing');
  const rows = await real.interactions('Arid');
  const all = core.conflicts(pool, rows).map((c) => `${c.a.id} ${c.b.id} ${c.type} ${c.agent ?? ''}`);
  assert.equal(new Set(all).size, all.length, 'conflicts(): each pair and kind once');
});
