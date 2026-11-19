// Stream S5c (filtered pool and nearest placements): the range rule (core range.ts, owner answer 2,
// 2026-11-11), the nearest-list placements (placement.ts and PlantSource.borrowed, owner answer 1),
// the range and estimate words (since PP-C c2 in verdict-line.ts), the Start slot (views/PoolSlot.tsx and its feature
// chunk views/pool/pool.tsx), its strings, and the pool sizes the design check measured at 14 sites
// on the real export (p5-design-check.md §C). S5c owns this file; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { ctx, lyon, placement, taxon } from './consortium-p5-fixtures.mjs';
import { locale, LOCALES } from './consortium-pf-env.mjs';

// The rule files' own helpers come from the files (index.ts names only what the views read, fix round 1 B3).
const core = { ...(await import('../src/lib/consortium/index.ts')), ...(await import('../src/lib/consortium/site.ts')), ...(await import('../src/lib/consortium/range.ts')), ...(await import('../src/lib/consortium/future.ts')) };
const { suggest } = await import('../src/lib/consortium/suggest.ts');
const { openBytes } = await import('../src/islands/consortium/data/load.ts');
const { createSqliteSource } = await import('../src/islands/consortium/data/sqlite-source.ts');

// A site whose today values are given (the climate reader's historical period first, a future one
// after), as the rules read it: the site inputs of a lookup (site-inputs.ts, no grower edit).
const lookupAt = (tminColdC, tmaxWarmC, aridityIndex = 1, tmeanColdC = 0, tmeanWarmC = 0) => ({
  lat: 0, lon: 0, soil: null, regions: { wgsrpdL3: null, isoA2: null },
  climate: { cellLat: 0, cellLon: 0, distanceCells: 0, periods: [
    { period: '1991-2020', scenario: 'historical', koppen: 'Cfb', koppenTemperatureMarginC: 0, tminColdC, tmaxWarmC, tmeanColdC, tmeanWarmC, aridityIndex },
    { period: '2071-2099', scenario: 'ssp585', koppen: 'BWh', koppenTemperatureMarginC: 0, tminColdC: tminColdC + 6, tmaxWarmC: tmaxWarmC + 8, tmeanColdC: 0, tmeanWarmC: 0, aridityIndex: 0.1 },
  ] },
});
const at = (...a) => core.siteInputsOf({ lookup: lookupAt(...a) });

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
  assert.deepEqual(core.rangeCheck(t, at(-18, 31)), { verdict: 'outside', sides: ['cold', 'hot'], beyond: ['cold'], aridity: 'unknown', coolSeason: false });
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
  const t = taxon({ climate: { ...taxon().climate, tmaxWarm: { low: 18, median: 25, high: 30.02, count: 9, basis: 'thinned_cells' } }, phases: { start: 'secondary_i', end: 'secondary_ii' } });
  const l = lookupAt(0, 30);
  l.climate.periods = [l.climate.periods[0], ...['ssp126', 'ssp245', 'ssp370', 'ssp585'].flatMap((scenario) => ['2041-2070', '2071-2099'].map((period) => ({ ...l.climate.periods[0], period, scenario, tmaxWarmC: 32.02 })))];
  assert.equal(core.futureCheck(t, core.siteInputsOf({ lookup: l }), 'ssp245')?.verdict, 'edge');
});

test('rangeFit: today\'s period only (the 1991-2020 historical slot), never a future one', () => {
  const l = lookupAt(0, 25);
  l.climate.periods.reverse();
  const s = core.siteInputsOf({ lookup: l });
  assert.equal(core.siteToday(s).scenario, 'historical');
  assert.equal(core.rangeFit(taxon(), s), 'inside');
});

test('rangeFit: no range is "unknown", never filtered; no site climate checks nothing', () => {
  assert.equal(core.rangeFit(taxon({ climate: null }), at(-40, 45)), 'unknown');
  assert.equal(core.rangeFit(taxon({ climate: { ...taxon().climate, tminCold: null, tmaxWarm: null } }), at(-40, 45)), 'unknown');
  assert.equal(core.rangeFit(taxon(), null), 'unknown');
  assert.equal(core.rangeCheck(taxon(), null), null);
  assert.equal(core.rangeCheck(taxon(), core.NO_INPUTS), null, 'lookup loading or failed');
  assert.equal(core.rangeCheck(taxon(), core.siteInputsOf({ lookup: { ...lyon.lookup, climate: null } })), null, 'open sea');
  assert.deepEqual(core.rangeVerdicts, ['inside', 'edge', 'outside', 'unknown']);
});

test('rangeCheck: aridity is a mark only (drier, wetter, not checked on ice), never the verdict', () => {
  const arid = { low: 0.5, median: 1, high: 2, count: 200, basis: 'thinned_cells' };
  const t = taxon({ climate: { ...taxon().climate, aridity: arid } });
  assert.deepEqual(core.rangeCheck(t, at(0, 25, 0.1)), { verdict: 'inside', sides: [], beyond: [], aridity: 'drier', coolSeason: false });
  assert.equal(core.rangeCheck(t, at(0, 25, 3)).aridity, 'wetter');
  assert.equal(core.rangeCheck(t, at(0, 25, 1)).aridity, 'inside');
  assert.equal(core.rangeCheck(t, at(0, 25, null)).aridity, 'not-checked');
  assert.equal(core.rangeCheck(taxon(), at(0, 25, 1)).aridity, 'unknown', 'no aridity recorded');
});

test('withinRange: leaves out only the plants outside, never a kept one; the same list when nothing is checked', () => {
  const pool = [taxon({ id: 'a' }), taxon({ id: 'b', climate: null }), taxon({ id: 'c', climate: { ...taxon().climate, tminCold: { low: 5, median: 9, high: 15, count: 9, basis: 'thinned_cells' } } })];
  assert.equal(core.withinRange(pool, null), pool);
  assert.equal(core.withinRange(pool, core.NO_INPUTS), pool);
  assert.deepEqual(core.withinRange(pool, at(0, 25)).map((t) => t.id), ['a', 'b']);
  assert.deepEqual(core.withinRange(pool, at(0, 25), ['c']).map((t) => t.id), ['a', 'b', 'c'], 'a kept plant stays, outside or not');
});

// ---- "can Suggest now" (E6 R2, rules/suggest-block.ts): the rule views/PoolSlot.tsx and the store read ----

test('E6 R2 suggest-block: noList, needsSite, needsRule, nothingFits in that order; hasList; nothingFits and notOutside from the verdicts (PP-C c2); the old pool counts gone (PP-B b1b)', async () => {
  const rules = await import('../src/islands/consortium/rules/suggest-block.ts');
  const rule = await core.loadVerdictRule();
  assert.equal('withinRange' in rule, false, 'the islands read verdicts, never the range checks (PP-C c2, one verdict)');
  const scene = (over = {}) => ({ curated: ['Mediterranean', 'Temperate'], siteClimate: false, rangeFailed: false, nothingFits: false, ...over });
  // Boreal borrows Temperate (NEAREST_LISTS); Tropical's nearest lists are not curated here.
  const borrowed = 'Boreal', none = 'Tropical';
  assert.ok(core.hasPlants(borrowed, scene().curated) && !core.hasPlants(none, scene().curated), 'fixture climates');
  assert.equal(rules.suggestBlock(none, scene({ siteClimate: true, rangeFailed: true, nothingFits: true })), 'noList');
  assert.equal(rules.suggestBlock(borrowed, scene({ rangeFailed: true, nothingFits: true })), 'needsSite');
  assert.equal(rules.suggestBlock(borrowed, scene({ siteClimate: true, rangeFailed: true, nothingFits: true })), 'needsRule');
  assert.equal(rules.suggestBlock(borrowed, scene({ siteClimate: true, nothingFits: true })), 'nothingFits');
  assert.equal(rules.suggestBlock(borrowed, scene({ siteClimate: true })), null);
  assert.equal(rules.suggestBlock('Temperate', scene({ rangeFailed: true })), null, 'a curated climate needs neither the location nor the rule');
  assert.deepEqual(['Temperate', borrowed, none].map((z) => rules.hasList(z, scene())), [true, false, false]);
  assert.deepEqual(['Temperate', borrowed, none].map((z) => rules.hasList(z, scene({ siteClimate: true }))), [true, true, false]);
  assert.equal(rules.needsSite(borrowed, scene()), true);
  assert.equal(rules.needsRule(borrowed, scene({ siteClimate: true, rangeFailed: true })), true);
  // nothingFits: a list with plants, every one judged outside (the page period's verdicts, as
  // store.poolVerdicts), once the rule is in.
  const pool = [taxon({ id: 'a' }), taxon({ id: 'c', climate: { ...taxon().climate, tminCold: { low: 5, median: 9, high: 15, count: 9, basis: 'thinned_cells' } } })];
  const judged = (site, list = pool) => rule.verdicts(list, { inputs: site ?? core.NO_INPUTS, period: '1991-2020', scenario: 'ssp245' });
  assert.equal(rules.nothingFits(pool, judged(at(-30, 25))), true, 'colder than every plant');
  assert.equal(rules.nothingFits(pool, null), false, 'not before the verdicts arrive');
  assert.equal(rules.nothingFits(pool, judged(at(0, 25))), false);
  assert.equal(rules.nothingFits([], judged(at(-30, 25))), false, 'an empty list is not "nothing fits"');
  assert.equal(rules.nothingFits(pool, judged(null)), false, 'no site climate: nothing is checked');
  // notOutside: the list less the plants judged outside, never a kept one; the same list when none goes.
  const three = [...pool.slice(0, 1), taxon({ id: 'b', climate: null }), pool[1]];
  assert.deepEqual(rules.notOutside(three, judged(at(0, 25), three)).map((t) => t.id), ['a', 'b']);
  assert.deepEqual(rules.notOutside(three, judged(at(0, 25), three), ['c']).map((t) => t.id), ['a', 'b', 'c'], 'a kept plant stays, outside or not');
  assert.equal(rules.notOutside(three, null), three, 'no verdicts: the same list');
  assert.equal(rules.notOutside(three, judged(null, three)), three, 'no site climate: the same list');
  // PP-B b1b: Place's count line reads the verdicts (store.countFits); the range-verdict counts went.
  assert.equal('poolCounts' in rules, false);
});

// ---- nearest placements ----

test('placeFor: a curated climate uses its own placement; an uncovered one borrows the first of its nearest lists (a zone other than its own)', () => {
  const placements = { Temperate: placement('high', 'secondary_i', 'secondary_iii'), Mediterranean: placement('medium', 'secondary_i', 'secondary_iii'), Tropical: placement('low', 'placenta_i', 'placenta_iii') };
  assert.deepEqual(core.placeFor(placements, 'Temperate'), { zone: 'Temperate', placement: placements.Temperate });
  assert.deepEqual(core.placeFor(placements, 'Subtropical'), { zone: 'Mediterranean', placement: placements.Mediterranean });
  assert.deepEqual(core.placeFor({ Tropical: placements.Tropical, Temperate: placements.Temperate }, 'Arid'), { zone: 'Tropical', placement: placements.Tropical });
  assert.deepEqual(core.placeFor(placements, 'Continental'), { zone: 'Temperate', placement: placements.Temperate });
  assert.deepEqual(core.placeFor({ Mediterranean: placements.Mediterranean }, 'Boreal'), { zone: 'Mediterranean', placement: placements.Mediterranean });
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

test('PlantSource.borrowed (sqlite-source.ts): every plant of the nearest lists once, placed as in the first list that has it, with a borrowed origin naming that list', async () => {
  const asked = [];
  const real = fixture.borrowed;
  fixture.borrowed = (zone, order) => { asked.push([zone, order]); return real(zone, order); };
  const sub = await fixture.pool('Subtropical');
  assert.deepEqual(asked, [['Subtropical', core.NEAREST_LISTS.Subtropical]], 'pool() of an uncovered climate asks borrowed()');
  fixture.borrowed = real;
  const own = Object.fromEntries(await Promise.all(['Tropical', 'Mediterranean', 'Temperate'].map(async (z) => [z, await fixture.pool(z)])));
  const all = new Set(Object.values(own).flat().map((t) => t.id));
  assert.equal(sub.length, all.size, 'every plant of the three lists, once');
  assert.ok(sub.every((t) => t.origin?.kind === 'borrowed' && t.origin.list), 'each one an estimate (a borrowed origin), with the list it comes from');
  const names = sub.map((t) => t.canonical_name);
  assert.deepEqual(names, [...names].sort(), 'by name, as a curated pool');
  const placements = await fixture.placements(sub.map((t) => t.id));
  for (const t of sub) {
    const want = core.placeFor(placements.get(t.id), 'Subtropical');
    assert.equal(t.origin.list, want.zone, t.canonical_name);
    assert.equal(t.stratum?.value ?? null, want.placement.stratum, t.canonical_name);
    assert.equal(t.phases?.start ?? null, want.placement.start, t.canonical_name);
  }
  const byName = (list, n) => list.find((t) => t.canonical_name === n);
  assert.equal(byName(sub, 'Castanea sativa').origin.list, 'Mediterranean', 'Mediterranean before Temperate');
  assert.equal(byName(sub, 'Zingiber officinale').origin.list, 'Mediterranean', 'Mediterranean before Tropical');
  assert.equal(byName(sub, 'Tropaeolum majus').origin.list, 'Tropical', 'Tropical before Temperate');
  const cont = await fixture.pool('Continental');
  assert.equal(byName(cont, 'Castanea sativa').origin.list, 'Temperate', 'Continental: Temperate first');
  assert.equal(byName(cont, 'Carica papaya'), undefined, 'Continental never borrows a Tropical-only plant');
  assert.equal(await fixture.pool('Subtropical'), sub, 'read once and kept: the same objects');
  assert.equal('origin' in byName(own.Temperate, 'Castanea sativa'), false, 'the curated pool itself is not touched');
  assert.equal(await fixture.borrowed('Boreal', []).then((l) => l.length), 0, 'no curated list in the order: nothing');
});

// E6 hand-off D (live 087d2b7 kept both `from` and `placedFrom`): a guest picked from an uncurated
// climate's list (a borrowed placement) keeps its guest label, so every view (Details, the matrix,
// the phone rows, the chip's name: guestOf) says "From the {list}" as the print sheet does, while its
// placement still comes from the curated list it was borrowed from (borrowedFrom, placementZone).
test('asGuest: a guest from a borrowed list is labelled with the list it was picked in, its placement unchanged', () => {
  const borrowed = { origin: { list: 'Mediterranean', kind: 'borrowed' } };
  const g = core.asGuest(borrowed, 'Subtropical');
  assert.equal(core.guestOf(g), 'Subtropical', 'labelled "From the Subtropical list"');
  assert.equal(core.borrowedFrom(g), 'Mediterranean', 'still an estimate from the Mediterranean placement');
  assert.equal(core.placementZone(g, 'Temperate'), 'Mediterranean', 'placed from the curated list');
  assert.deepEqual(borrowed, { origin: { list: 'Mediterranean', kind: 'borrowed' } }, 'the list\'s own record stays unstamped');
  const own = core.asGuest({}, 'Tropical');
  assert.deepEqual({ guest: core.guestOf(own), borrowed: core.borrowedFrom(own), zone: core.placementZone(own, 'Temperate') }, { guest: 'Tropical', borrowed: null, zone: 'Tropical' }, 'a guest from a curated list');
  assert.equal(core.guestOf(borrowed), null, 'a borrowed plant of the climate\'s own pool is no guest');
});

test('placementZone: the details query reads the list a plant was placed from (borrowed, then guest, then the climate)', async () => {
  assert.equal(core.placementZone({ origin: { list: 'Mediterranean', kind: 'borrowed' } }, 'Subtropical'), 'Mediterranean', 'a borrowed placement');
  assert.equal(core.placementZone(core.asGuest({ origin: { list: 'Tropical', kind: 'borrowed' } }, 'Subtropical'), 'Temperate'), 'Tropical', 'a guest from a borrowed list');
  assert.equal(core.placementZone(core.asGuest({}, 'Tropical'), 'Temperate'), 'Tropical', 'a guest');
  assert.equal(core.placementZone({}, 'Temperate'), 'Temperate', 'its own placement');
  assert.equal(core.placementZone({}, null), null);
  // On the fixture: a Subtropical plant has no reasons or climate months of its own; its source list has.
  const t = (await fixture.pool('Subtropical')).find((x) => x.canonical_name === 'Castanea sativa');
  const own = await fixture.details(t.id, 'Subtropical', 'en');
  assert.equal(own.reasons.length, 0, 'no curated reasons for a borrowed climate');
  const zone = core.placementZone(t, 'Subtropical');
  const d = await fixture.details(t.id, zone, 'en');
  assert.equal(zone, 'Mediterranean');
  assert.ok(d.reasons.length > 0, 'the source list’s reasons');
  assert.ok(d.layerValues.length >= own.layerValues.length);
});

// ---- strings ----

test('strings: every S5c key sits in its block, in all 11 locales, with the same placeholders and plural forms', () => {
  const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
  const blockOf = (l) => {
    const keys = Object.keys(JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8')));
    return keys.slice(keys.indexOf('consortium.block.s5c') + 1, keys.indexOf('consortium.block.s5d'));
  };
  const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
  const mine = blockOf('en');
  // What the code reads: pool.tsx, PoolSlot and Weigh keys (PP-B b1b: range.pool.count is the borrowed
  // count line; the mark keys, range.disputed and range.unavailable went with the mark providers in PP-C c2; estimate.from{Zone} went in pf-f, the chip reads details.estimateChip).
  const used = ['range.pool.count', 'range.pool.caveat', 'range.pool.aridityNotChecked', 'range.empty.title', 'range.empty.body', 'range.empty.search', 'range.unavailableBorrowed', 'range.needsSite', 'range.needsSite.go', 'range.needsSite.pill', 'estimate.short', 'estimate.borrowed'];
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
    assert.match(strings['consortium.range.pool.count'], /\{total\}/, `${l}: the count line names how many plants the nearest lists hold`);
  }
  // The sides' words moved to verdict-line (consortium.line.*; PP-C c2), Q05 and Q95 kept.
  assert.match(en['consortium.line.withinCold'], /mostly recorded down to \{tempBound\}/, 'Q05: "mostly recorded down to"');
  assert.match(en['consortium.line.pastMild'], /mostly recorded up to \{tempBound\}/, 'Q95: "mostly recorded up to"; within the mild side nothing is said (no chill claim; c2 fix round 2 K5)');
  assert.match(en['consortium.line.pastHot'], /mostly recorded up to \{tempBound\}/);
  assert.match(en['consortium.range.pool.caveat'], /cultivation included/);
  assert.match(en['consortium.range.pool.caveat'], /not been reviewed/);
  assert.match(en['consortium.range.pool.count'], /^one: # of the \{total\} plants on the nearest lists fits your place today\. \| other: # of the \{total\} plants on the nearest lists fit your place today\.$/, 'the count line\'s words (PP-B b1b)');
});

// [Köppen, zone, coldest-month min, warmest-month max, aridity index, coldest- and warmest-month means]
// (canopi-climate 0.2.0 lookup, historical slot).
const SITES = {
  lyon: ['Cfa', 'Subtropical', 0.1, 26.6, 1.1, 4.3, 22.4],
  dakar: ['BSh', 'Arid', 20.0, 28.6, 0.32, 21.6, 28.0],
  lima: ['BWh', 'Arid', 14.9, 24.9, 0.03, 17.9, 23.4],
  hanoi: ['Cwa', 'Subtropical', 13.4, 32.5, 1.28, 16.9, 29.6],
  montreal: ['Dfa', 'Continental', -13.5, 25.9, 1.61, -8.6, 22.0],
  nairobi: ['Aw', 'Tropical', 12.3, 26.5, 1.02, 17.6, 21.1],
  perth: ['Csa', 'Mediterranean', 9.8, 30.3, 0.82, 13.8, 24.7],
  seville: ['Csa', 'Mediterranean', 5.8, 34.8, 0.58, 11.0, 27.8],
  oslo: ['Dfb', 'Continental', -7.6, 21.1, 1.55, -3.3, 17.4],
  manaus: ['Af', 'Tropical', 24.0, 31.2, 1.3, 26.7, 28.3],
  phoenix: ['BWh', 'Arid', 5.2, 41.6, 0.14, 12.6, 35.0],
  brisbane: ['Cfa', 'Subtropical', 10.8, 28.2, 1.07, 15.1, 25.3],
  yakutsk: ['Dfc', 'Boreal', -39.8, 24.7, 0.48, -37.6, 19.8],
  chicago: ['Dfa', 'Continental', -6.2, 27.8, 1.3, -3.6, 23.7],
};
// Plants kept (not outside) from the climate's pool, own or borrowed, with annuals exempt from the
// winter-cold check (owner, "Annuals skip the winter-cold check"; before it: Lyon 339, Montreal 100,
// Oslo 224, Yakutsk 0, the design check's counts). Yakutsk keeps its 59 annuals and nothing else.
// Decision row "Climate ranges fixed before the P5 push": annuals beyond their heat range are kept, for
// the cool season (Phoenix +67, Seville +16, Hanoi +8, Dakar +2, Lyon, Brisbane and Chicago +1; before:
// Phoenix 13, Seville 101), and the mild-winter side applies only below CHILL_CEILING_C (Manaus +15,
// Dakar +10; before: Manaus 183, Dakar 247).
// Schema 3 export r-01102782139409b5 (thinned cells, the warmest-month heat limit at Q99, the year's
// warmth as a perennial's "too cool" limit, the chill ceiling at 18 °C; on r-e0b162087a79eecf:
// lyon 349, dakar 259, lima 253, hanoi 252, montreal 145, nairobi 182, perth 131, seville 117, oslo 238,
// manaus 198, phoenix 80, brisbane 290, yakutsk 59, chicago 239). Nairobi loses its too-cool tropical
// trees (cacao, coconut); the hot sites keep more under the heat limit.
// Export r-b958a4239cc68f73 (the same rows on r-60ea417b5a15c3aa) (grown_as_annual crops are annuals; annuals' summer warmth; a disputed (weak)
// row is a bound as any other, coordinator decision 2026-11-12; with the weak cap it was dakar 313,
// lima 320, hanoi 330, montreal 191, perth 182, oslo 237, brisbane 367, yakutsk 85, chicago 256; on
// r-01102782139409b5: lyon 349, dakar 263, lima 273, hanoi 286, montreal 177, nairobi 163, perth 176,
// seville 198, oslo 236, manaus 199, phoenix 134, brisbane 333, yakutsk 59, chicago 255).
// The same counts with the summer side limited to heat-demanding annuals (coordinator decision 2026-11-12).
// r-f3c6dd8b3c4391be (D2d: hardiness, frost-tender and annual flags refreshed) keeps 1–4 fewer at seven
// sites (r-60ea417b5a15c3aa: dakar 274, lima 282, hanoi 293, montreal 182, phoenix 150, brisbane 336, yakutsk 72).
// r-b7fb536f9cfd0700 (canopi-data D9a: Arid curated, 226 plants, 515 → 673): the three Arid sites read
// their own list, no longer the 515 borrowed from Mediterranean, Tropical and Temperate (on
// r-fcf4307ffd1549b3: dakar 270, lima 278, phoenix 147); every other site's count is unchanged.
// r-415fcc60773473a4 (canopi-data Q1): Lyon 360 → 359, Tithonia diversifolia is a perennial shrub now
// (curator correction c377, is_annual false), so the annuals' winter-cold exemption no longer keeps it.
// r-bcc417fd89a3147c (schema 4.5, Q5.4): Dakar 87 → 92, Lima 116 → 121, Phoenix 130 → 135: the Arid list's
// 9 new shade placements (8 new plants and Hedera helix) add 5 kept plants at each of the three.
const KEPT = { lyon: 359, dakar: 92, lima: 121, hanoi: 289, montreal: 181, nairobi: 164, perth: 176, seville: 198, oslo: 236, manaus: 199, phoenix: 135, brisbane: 334, yakutsk: 68, chicago: 255 };

const index = JSON.parse(readFileSync(new URL('../src/data/consortium-index.json', import.meta.url), 'utf8'));
const real = await sourceOf(new URL(`../public${index.files[0].url}`, import.meta.url), { releaseId: index.release_id, climates: index.climates });

test('real export: the pool each site keeps, and a suggestion from it never holds a plant outside its range, a site misfit or a serious conflict', async () => {
  const got = {};
  for (const [name, [koppen, zone, tmin, tmax, ai, tcold, twarm]] of Object.entries(SITES)) {
    const site = at(tmin, tmax, ai, tcold, twarm);
    site.periods[0].koppen = koppen;
    const pool = await real.pool(zone);
    assert.equal(pool.length > 0, true, `${name}: ${zone} has plants`);
    assert.equal(pool.every((t) => (t.origin?.kind === 'borrowed') === !index.climates.includes(zone)), true, `${name}: borrowed plants are estimates, own ones not`);
    const kept = core.withinRange(pool, site);
    got[name] = kept.length;
    const ctxt = { site: { light: 'unsure', soil: 'unsure', water: 'unsure', room: 'unsure' }, interactions: await real.interactions(zone), country: null, countryStatus: 'none' };
    const s = suggest(kept, ctxt);
    const members = s.members.map((id) => kept.find((t) => t.id === id));
    assert.equal(members.every((t) => t && core.rangeFit(t, site) !== 'outside'), true, `${name}: no suggested plant outside its range`);
    assert.equal(core.flagsOf(members, ctxt).some((f) => f.kind === 'conflict' && f.severity === 'high'), false, `${name}: no serious conflict`);
    assert.ok(s.members.length > 0, `${name}: a suggestion`);
    if (name === 'yakutsk') assert.deepEqual(kept.filter((t) => !core.isAnnual(t)).map((t) => t.canonical_name), [], 'Yakutsk keeps annuals only (a weak row never softens the verdict)');
  }
  assert.deepEqual(got, KEPT, 'the plants each site keeps');
});

test('PlantSource.interactions: a borrowed climate reads the rows of the curated lists it borrows from, and only those', async () => {
  const zones = async (src, z) => new Set((await src.interactions(z)).map((i) => i.climate_zone));
  assert.deepEqual([...await zones(fixture, 'Subtropical')].sort(), [null, 'Temperate', 'Tropical'].sort(), 'Subtropical: the general rows and those of Temperate and Tropical');
  assert.deepEqual([...await zones(fixture, 'Continental')].sort(), [null, 'Temperate'].sort(), 'Continental never reads a Tropical row');
  assert.deepEqual([...await zones(fixture, 'Temperate')].sort(), [null, 'Temperate'].sort(), 'a curated climate: its own rows, as in P2');
  // Arid is curated since r-b7fb536f9cfd0700 (D9a); Subtropical still borrows Mediterranean first.
  assert.ok((await zones(real, 'Subtropical')).has('Mediterranean'), 'real export: a Subtropical pool sees a Mediterranean-specific row');
  assert.equal((await zones(real, 'Arid')).has('Mediterranean'), false, 'real export: the curated Arid list reads its own rows, as in P2');
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
  const rows = await real.interactions('Subtropical');
  const all = core.conflicts(pool, rows).map((c) => `${c.a.id} ${c.b.id} ${c.type} ${c.agent ?? ''}`);
  assert.equal(new Set(all).size, all.length, 'conflicts(): each pair and kind once');
});

// ---- PP-B b1b fix round 1: the count line's words and states ----


test('PP-B b1b count line states (b1br-1): never "0 of m": none fit is "none", none known to fit with some not checked is "unchecked"', async () => {
  const { countKind } = await import('../src/islands/consortium/rules/suggest-block.ts');
  assert.equal(countKind({ fits: 3, look: 0, unknown: 0, of: 9 }), 'count');
  assert.equal(countKind({ fits: 0, look: 1, unknown: 8, of: 9 }), 'count');
  assert.equal(countKind({ fits: 0, look: 0, unknown: 0, of: 9 }), 'none', 'all outside: none fit');
  assert.equal(countKind({ fits: 0, look: 0, unknown: 9, of: 9 }), 'unchecked', 'no slot for the period: not checked');
  assert.equal(countKind({ fits: 0, look: 0, unknown: 2, of: 9 }), 'unchecked');
});

test('PP-B b1b count line words (b1bc-4, -5, -8b, -10): the list phrase as {list}; fr, es, pt name the period as a period; load.retry reused; the left-out sentence', () => {
  for (const l of LOCALES) {
    const d = locale(l);
    for (const k of ['own', 'ownLater']) {
      assert.match(d[`consortium.place.count.${k}`], /\{list\}/, `${l} ${k}: the list phrase (consortium.list.*)`);
      assert.doesNotMatch(d[`consortium.place.count.${k}`], /\{climate\}/, `${l} ${k}: no bare climate name after a word for "list"`);
    }
    for (const k of ['none', 'noneLater', 'unchecked', 'left']) assert.ok(d[`consortium.place.count.${k}`], `${l}: place.count.${k}`);
    for (const k of ['borrowedLater', 'ownLater', 'noneLater']) assert.match(d[`consortium.place.count.${k}`], /\{period\}/, `${l} ${k}`);
    assert.equal(d['consortium.place.count.retry'], undefined, `${l}: Try again is load.retry`);
  }
  const later = { fr: 'sur la période {period}', es: 'en el periodo {period}', pt: 'no período {period}' };
  for (const [l, phrase] of Object.entries(later)) {
    for (const k of ['borrowedLater', 'ownLater', 'noneLater']) assert.ok(locale(l)[`consortium.place.count.${k}`].includes(phrase), `${l} ${k}: "${phrase}"`);
  }
  assert.ok(!locale('fr')['consortium.place.count.own'].includes('de la liste {list}'));
});

// (b1bc-8a's back-online retry is a behavioural browser case now: consortium-pp-b1.browser.test.mjs, b1bf-8.)

test('PP-B b1b count line words, fix round 2 (b1bf-1, -4, -5): the search sentence makes no exclusion claim; none and unchecked name the list; unchecked blames no period', () => {
  const en = locale('en');
  assert.doesNotMatch(en['consortium.place.count.left'], /left out|others/i, 'no claim about what Suggest leaves out');
  assert.match(en['consortium.place.count.left'], /search/i);
  assert.match(en['consortium.place.count.left'], /warning/i);
  for (const l of LOCALES) {
    const d = locale(l);
    for (const k of ['noneOwn', 'noneOwnLater', 'uncheckedOwn']) assert.match(d[`consortium.place.count.${k}`] ?? '', /\{list\}/, `${l} ${k}: the list phrase`);
    for (const k of ['unchecked', 'uncheckedOwn']) assert.doesNotMatch(d[`consortium.place.count.${k}`] ?? '', /\{period\}/, `${l} ${k}`);
  }
  assert.doesNotMatch(en['consortium.place.count.unchecked'], /period/, 'en unchecked: no "this period" (no range recorded is a cause too)');
  const ru = locale('ru')['consortium.place.count.unchecked'];
  const forms = Object.fromEntries(ru.split(' | ').map((f) => f.split(/: (.*)/s).slice(0, 2)));
  assert.match(forms.one, /# растение/); assert.match(forms.few, /# растения/); assert.match(forms.many, /# растений/);
  assert.match(ru, /Ни об одном из \{total\} растений/);
  assert.match(locale('nl')['consortium.place.count.unchecked'], /dat die/);
});
