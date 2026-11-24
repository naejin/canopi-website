// pf commit 0W-1 (v14 spec section 4, .local/consortium/v2/ppc/pf/v14-spec-update.md): the shared
// seams the chunk-2 and chunk-3 streams build on, each tested at its lasting layer (core and store):
//   holes.ts        thinTargets, targetPosition, nextTarget, bestToAdd, holeChange, thinChange (items 1, 3);
//   verdict-line.ts thinLine, thinTitleLine, holeChangeLines, siteEditLines, hintLine, removedManyLine (item 3);
//   site-inputs.ts  siteEditsOf, sameEdits, plantsPerJobOf, the pots input (items 4, 5);
//   state.ts        the link keys f b p i d j and u= (item 5), and the longest link's length (item 13, reported);
//   store.ts        plantsPerJob, suggestedIds, untouchedSuggestion, updateToast, setSiteEdits, placeAt,
//                   removeMembers, addMembers' text function, openFigure (items 4-6, 8);
//   views/kit/more.tsx's fold (item 7, the pure part: views/kit/fold.ts), site-change stubs (item 9).
//   R1-R4 (0W-2 rules): toxicity levels, the watering rule, soil and drainage as hints, a cut link unreadable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { english, installedRelease } from './consortium-pf-env.mjs';

const core = await import('../src/lib/palette/index.ts');
const words = await import('../src/islands/palette/words.ts');
const { en, say } = await english();
const { foldOf } = await import('../src/islands/palette/views/kit/fold.ts');

// ---- holes.ts ----
const lane = (job, thin, counts = [2, 2, 2, 2, 2, 2, 2]) => ({ kind: 'job', job, counts, thin });
const hole = (id, over = {}) => {
  const [kind, which, span] = id.split(':');
  const [fromYear, toYear] = span.split('-').map(Number);
  return { id, kind, rank: 1, ...(kind === 'job' ? { job: which } : { stratum: which }), fromYear, toYear, state: 'open', ...over };
};

test('thinTargets: one Hole-shaped target per thin stretch of a job lane, keyed by job, rank 7, with have and want; light lanes give none', () => {
  const lanes = [lane('feeds_you', [{ fromYear: 15, toYear: 60, have: 1, want: 2 }]), { kind: 'light', stratum: 'low', counts: [0], thin: [{ fromYear: 0, toYear: 3, have: 0, want: 2 }] },
    lane('mulch', [{ fromYear: 3, toYear: 15, have: 1, want: 3 }, { fromYear: 25, toYear: 60, have: 2, want: 3 }])];
  const t = core.thinTargets(lanes);
  assert.deepEqual(t.map((h) => [h.id, h.kind, h.rank, h.job, h.state, h.thin]), [
    ['thin:feeds_you:15-60', 'job', 7, 'feeds_you', 'open', { have: 1, want: 2 }],
    ['thin:mulch:3-15', 'job', 7, 'mulch', 'open', { have: 1, want: 3 }],
    ['thin:mulch:25-60', 'job', 7, 'mulch', 'open', { have: 2, want: 3 }],
  ]);
  assert.ok(core.thinTargets(lanes, true).every((h) => h.state === 'pending'), 'pending while a list loads');
  assert.equal(core.thinKey('mulch'), 'thin:mulch');
});

test('nextTarget and targetPosition: the first open hole not put off, else the first thin spot whose job is not put off; "hole 1 of 2 · then 2 thin spots"', () => {
  const hs = [hole('job:ground:0-60'), hole('light:low:0-3'), hole('job:mulch:0-3', { state: 'pending' })];
  const thins = core.thinTargets([lane('feeds_you', [{ fromYear: 15, toYear: 60, have: 1, want: 2 }]), lane('mulch', [{ fromYear: 3, toYear: 15, have: 1, want: 2 }])]);
  const first = core.nextTarget(hs, thins);
  assert.deepEqual([first.target.id, first.kind, first.index, first.of, first.thinCount], ['job:ground:0-60', 'hole', 1, 2, 2]);
  const second = core.nextTarget(hs, thins, new Set(['job:ground:0-60']));
  assert.deepEqual([second.target.id, second.index, second.of], ['light:low:0-3', 2, 2]);
  const thin = core.nextTarget(hs, thins, new Set(['job:ground:0-60', 'light:low:0-3']));
  assert.deepEqual([thin.target.id, thin.kind, thin.index, thin.of], ['thin:feeds_you:15-60', 'thin', 1, 2]);
  const other = core.nextTarget(hs, thins, new Set(['job:ground:0-60', 'light:low:0-3', core.thinKey('feeds_you')]));
  assert.equal(other.target.id, 'thin:mulch:3-15', 'a thin spot is put off by its job');
  assert.equal(core.nextTarget([], []), null);
});

test('bestToAdd: fits only, in fillers order; a hole takes the goal, a thin spot want − have', () => {
  const t = (id) => ({ id });
  const fillers = { fits: [t('a'), t('b'), t('c'), t('d')], look: [t('x')], outside: [], unknown: [] };
  assert.deepEqual(core.bestToAdd(hole('job:ground:0-60'), fillers), ['a', 'b'], 'the default goal: 2');
  assert.deepEqual(core.bestToAdd(hole('job:ground:0-60'), fillers, { plantsPerJob: 3 }), ['a', 'b', 'c']);
  const thin = core.thinTargets([lane('mulch', [{ fromYear: 3, toYear: 15, have: 2, want: 5 }])])[0];
  assert.deepEqual(core.bestToAdd(thin, fillers, { plantsPerJob: 5 }), ['a', 'b', 'c']);
  assert.deepEqual(core.bestToAdd(hole('job:ground:0-60'), { ...fillers, fits: [] }), [], 'none fit: none');
});

test('holeChange: paired by lane and overlapping years: unchanged, narrowed, added (new or grown), closed; open is the list after', () => {
  const before = [hole('job:ground:0-60'), hole('light:low:0-3'), hole('job:mulch:3-15'), hole('job:helpers:0-3', { state: 'pending' })];
  const after = [hole('job:ground:25-60'), hole('light:low:0-3'), hole('job:feeds_you:0-3'), hole('job:helpers:0-60', { state: 'pending' })];
  const c = core.holeChange(before, after);
  assert.deepEqual(c.added.map((h) => h.id), ['job:feeds_you:0-3']);
  assert.deepEqual(c.closed.map((h) => h.id), ['job:mulch:3-15']);
  assert.deepEqual(c.narrowed.map((n) => [n.before.id, n.after.id]), [['job:ground:0-60', 'job:ground:25-60']]);
  assert.deepEqual(c.open.map((h) => h.id), ['job:ground:25-60', 'light:low:0-3', 'job:feeds_you:0-3'], 'pending holes are left out');
  const grown = core.holeChange([hole('job:ground:25-60')], [hole('job:ground:3-60')]);
  assert.deepEqual([grown.added.length, grown.narrowed.length, grown.closed.length], [1, 0, 0], 'a hole that grew counts as new');
});

test('thinChange: ended, still (the counts after) and added, paired by job and overlapping years', () => {
  const before = core.thinTargets([lane('feeds_you', [{ fromYear: 15, toYear: 60, have: 0, want: 2 }]), lane('mulch', [{ fromYear: 3, toYear: 15, have: 1, want: 2 }])]);
  const after = core.thinTargets([lane('feeds_you', [{ fromYear: 25, toYear: 60, have: 1, want: 2 }]), lane('helpers', [{ fromYear: 0, toYear: 3, have: 1, want: 2 }])]);
  const c = core.thinChange(before, after);
  assert.deepEqual(c.still, [{ job: 'feeds_you', have: 1, want: 2, fromYear: 25, toYear: 60 }]);
  assert.deepEqual(c.ended.map((h) => h.id), ['thin:mulch:3-15']);
  assert.deepEqual(c.added.map((h) => h.id), ['thin:helpers:0-3']);
});

// ---- verdict-line.ts words (English) ----
test('the toasts\' words: the Toasts board\'s bulk add, remove and thin lines, from holeChangeLines', () => {
  const c = core.holeChange([hole('job:ground:0-60'), ...Array.from({ length: 7 }, (_, i) => hole(`light:low:${i}-${i + 1}`))], [hole('job:ground:25-60'), ...Array.from({ length: 6 }, (_, i) => hole(`light:low:${i}-${i + 1}`))]);
  assert.equal(words.sayAll(core.holeChangeLines(c)), 'No new hole. Covers the ground: nobody after year 25. 7 holes left.');
  const thins = core.thinChange(core.thinTargets([lane('feeds_you', [{ fromYear: 15, toYear: 60, have: 0, want: 2 }])]), core.thinTargets([lane('feeds_you', [{ fromYear: 25, toYear: 60, have: 1, want: 2 }])]));
  assert.equal(words.sayAll(core.holeChangeLines(core.holeChange([], []), { thins })), 'No new hole. Feeds you: still 1 plant in years 25 to 60.');
  assert.equal(words.sayAll(core.holeChangeLines(core.holeChange([], []), { thins, jobs: ['mulch'] })), 'No new hole.', 'thin lines of the given jobs only');
  assert.equal(words.sayAll([core.removedManyLine(3), core.paletteSizeLine(197), ...core.holeChangeLines(core.holeChange([], []), { left: false })]), '3 plants removed. 197 plants. No new hole.');
  const opened = core.holeChange([], [hole('light:low:25-60')]);
  assert.equal(words.sayAll(core.holeChangeLines(opened)), '1 new hole: Shade: nobody after year 25. 1 hole left.');
  assert.equal(words.sayAll(core.holeChangeLines(core.holeChange([hole('light:low:25-60')], []))), 'No new hole. No hole left.');
});

test('thin words: the strip\'s line and the Next step\'s title', () => {
  assert.equal(say(core.thinLine({ have: 1, fromYear: 1, toYear: 15 })), 'Thin: 1 plant only from year 1 to year 15. Add a backup.');
  const t = core.thinTargets([lane('feeds_you', [{ fromYear: 15, toYear: 60, have: 1, want: 2 }])])[0];
  assert.equal(say(core.thinTitleLine(t)), 'Feeds you: 1 plant in years 15 to 60: add a backup');
});

test('siteEditLines: each edit in words, in the panel\'s order; units from the page language', () => {
  const lines = core.siteEditLines({ nightsShiftC: -2, daysShiftC: 1.5, rainShiftMm: -100, dryMonthsShift: 2, watering: 'first-years', soilPh: 6.8, drainage: 'wet', pots: true });
  assert.deepEqual(lines.map(say), ['coldest nights 2\u202f°C colder', 'hottest days 1.5\u202f°C warmer', '100 mm less rain a year', '2 more dry months in a row', 'watering, the first years', 'soil pH 6.8', 'the ground stays wet for days after heavy rain', 'pots or brought-in soil']);
  assert.deepEqual(core.siteEditLines(core.NO_EDITS), []);
  assert.deepEqual(core.siteEditLines({ pots: false, drainage: 'drains', watering: 'all-year' }).map(say), ['watering, all year', 'the ground drains within a day after heavy rain', 'in the ground']);
});

test('hintLine: a soil pH past either end, drainage; a factor that fits or is unknown gives none', () => {
  const f = (over) => ({ factor: 'soil-ph', level: 'look', basis: 'soil-map', place: 8.1, low: 5.5, high: 6.9, ...over });
  assert.equal(say(core.hintLine(f({}))), 'More alkaline than it is recorded on (to pH 6.9)');
  assert.equal(say(core.hintLine(f({ place: 5 }))), 'More acid than it is recorded on (from pH 5.5)');
  assert.equal(say(core.hintLine(f({ factor: 'drainage', place: null }))), 'Wants free-draining soil');
  assert.equal(core.hintLine(f({ level: 'fits' })), null);
  assert.equal(core.hintLine(f({ level: 'unknown' })), null);
});

// ---- site-inputs.ts ----
test('siteEditsOf: keeps what is in range and of the right type, drops zero shifts and the answers no control writes; empty is NO_EDITS', () => {
  assert.equal(core.siteEditsOf({}), core.NO_EDITS);
  assert.equal(core.siteEditsOf(null), core.NO_EDITS);
  assert.equal(core.siteEditsOf({ nightsShiftC: 0, light: 'sun', wind: 'windy', coldAir: 'hollow' }), core.NO_EDITS);
  assert.deepEqual(core.siteEditsOf({ nightsShiftC: -2.04, daysShiftC: 99, rainShiftMm: -100.4, dryMonthsShift: 2, soilPh: 6.86, drainage: 'wet', watering: 'rain', pots: true }),
    { nightsShiftC: -2, rainShiftMm: -100, dryMonthsShift: 2, soilPh: 6.9, drainage: 'wet', watering: 'rain', pots: true });
  assert.deepEqual(core.siteEditsOf({ soilPh: 2, drainage: 'muddy', watering: 'sometimes', pots: 'yes', rainShiftMm: '100' }), core.NO_EDITS);
  assert.ok(core.sameEdits({ soilPh: 6.5, pots: true }, { pots: true, soilPh: 6.5 }));
  assert.ok(!core.sameEdits({ soilPh: 6.5 }, { soilPh: 6.6 }));
});

test('plantsPerJobOf: 1, 2, 3 or 5 (the Jobs control), else 2', () => {
  assert.deepEqual(core.PLANTS_PER_JOB, [1, 2, 3, 5]);
  assert.deepEqual([1, 2, 3, 5, '3', 4, 0, 9, null, 'x'].map(core.plantsPerJobOf), [1, 2, 3, 5, 3, 2, 2, 2, 2, 2]);
});

test('the pots input: the grower\'s answer, else the room "pots", else none', () => {
  const inputs = (room, edits = core.NO_EDITS) => core.siteInputsOf({ lookup: null, room, edits }).pots;
  assert.deepEqual(inputs('unsure'), { value: null, source: 'none' });
  assert.deepEqual(inputs('pots'), { value: true, source: 'room' });
  assert.deepEqual(inputs('pots', { pots: false }), { value: false, source: 'grower' });
  assert.deepEqual(inputs('small', { pots: true }), { value: true, source: 'grower' });
});

// ---- link v5: the edits, the goal, u= ----
const { encodeLink, decodeLink } = core;
const PLANTS = Array.from({ length: 200 }, (_, i) => `0000${String(i).padStart(4, '0')}-f1c7-4000-8000-${String(i).padStart(12, '0')}`);
const share = (over = {}) => ({ climate: 'Temperate', country: 'KE', room: 'small', plot: null, period: '1991-2020', spot: null, soil: null, members: PLANTS.slice(0, 3), removed: [], guests: [], siteEdits: null, plantsPerJob: 2, ...over });
const EDITS = { nightsShiftC: -2, daysShiftC: 1.5, rainShiftMm: -100, dryMonthsShift: 2, soilPh: 6.8, drainage: 'wet', watering: 'first-years', pots: true };

test('link: the edits travel with the place only (f b p i d, listed in u=), j only when not 2; read back exactly', () => {
  const known = { Temperate: PLANTS };
  const pub = encodeLink(share({ siteEdits: EDITS, plantsPerJob: 3 }), known);
  assert.doesNotMatch(pub, /[&]f=|&b=|&u=/, 'without the tick, no edit');
  assert.match(pub, /&j=3/);
  assert.equal(decodeLink(pub, known).state.siteEdits, null);
  const link = encodeLink(share({ siteEdits: EDITS, plantsPerJob: 3 }), known, { place: true, origin: { lat: -1.17, lon: 36.83 } });
  assert.match(link, /&f=-20\.15\.-100\.2&b=68&p=1&i=first&d=wet&u=f,b,p,i,d&e=1$/);
  const back = decodeLink(link, known);
  assert.deepEqual(back.state.siteEdits, EDITS);
  assert.equal(back.state.plantsPerJob, 3);
  assert.equal(back.notice.newer, false, 'every key in u= is known');
  assert.doesNotMatch(encodeLink(share(), known, { place: true }), /&j=|&u=|&f=/, 'the default goal and no edit write nothing');
  assert.match(encodeLink(share({ siteEdits: { soilPh: 5.5 } }), known, { place: true }), /&b=55&u=b&e=1$/);
});

test('link: an edit out of range, a malformed f or b, or a p other than 1 or 0 is dropped; the rest is read', () => {
  const known = { Temperate: PLANTS };
  const base = encodeLink(share(), known, { place: true }).replace(/&e=1$/, '');
  const read = (tail) => decodeLink(`${base}${tail}&e=1`, known).state.siteEdits;
  assert.deepEqual(read('&f=..-100&b=68'), { rainShiftMm: -100, soilPh: 6.8 });
  assert.equal(read('&f=1.2.3.4.1.6'), null, 'six segments: f dropped whole (the 5th is the temperature link, M1)');
  assert.equal(read('&f=a.b'), null);
  assert.equal(read('&b=6.8'), null);
  assert.equal(read('&b=200'), null, 'pH 20 is out of range');
  assert.equal(read('&p=2'), null);
  assert.deepEqual(read('&p=0'), { pots: false }, 'p=0: the grower\'s "In the ground" answer (pre-push saves-3)');
  assert.deepEqual(read('&i=rain&d=muddy'), { watering: 'rain' }, 'i is the watering, d the drainage');
});

// Item 13 (chk #33): the longest link (200 ids, every place key, j=5, the full u=), reported against
// LONG_LINK. A size is never a failure (owner 2026-11-16, no hard limits).
test('link length: the longest link with 200 plants and every place key (reported, never failed)', () => {
  const known = { Temperate: PLANTS };
  const link = encodeLink(share({ members: PLANTS, siteEdits: EDITS, plantsPerJob: 5 }), known, { place: true, origin: { lat: -1.17, lon: 36.83 } });
  assert.match(link, /&j=5/);
  assert.match(link, /&u=f,b,p,i,d&e=1$/);
  console.log(`# the longest link: ${link.length} characters (200 tokens of 6, every place key; LONG_LINK ${core.LONG_LINK})`);
  assert.ok(link.length > 0);
});

// ---- the list fold (views/kit/fold.ts, read by views/kit/more.tsx MoreList) ----
test('MoreList\'s fold: whole within the size rule; past it, the count and 3, then 10, then all; "+ N more" and "Show fewer"; the first new item takes the focus', () => {
  const at = (n, stage, paletteSize = 200) => foldOf({ count: n, stage, paletteSize, maxPalette: 40, maxGroup: 12, closed: 3, step: 10 });
  assert.deepEqual(at(12, 0, 40), { whole: true, shown: 12, rest: 0, firstNew: -1, next: null, fewer: false });
  assert.deepEqual(at(5, 0, 200), { whole: false, shown: 3, rest: 2, firstNew: -1, next: 2, fewer: false }, 'past 40 plants every group folds');
  assert.deepEqual(at(13, 0, 40), { whole: false, shown: 3, rest: 10, firstNew: -1, next: 1, fewer: false }, 'a group past 12 folds');
  assert.deepEqual(at(50, 0), { whole: false, shown: 3, rest: 47, firstNew: -1, next: 1, fewer: false });
  assert.deepEqual(at(50, 1), { whole: false, shown: 10, rest: 40, firstNew: 3, next: 2, fewer: true });
  assert.deepEqual(at(50, 2), { whole: false, shown: 50, rest: 0, firstNew: 10, next: null, fewer: true });
  assert.deepEqual(at(13, 1, 40), { whole: false, shown: 10, rest: 3, firstNew: 3, next: 2, fewer: true });
  assert.deepEqual(at(13, 2, 40), { whole: false, shown: 13, rest: 0, firstNew: 10, next: null, fewer: true });
  assert.equal(say(core.moreLine(47)), '+ 47 more');
});

// ---- site-change stubs (item 9) ----
test('site-change: typed stubs exported from the core index (pf-d writes them)', () => {
  assert.deepEqual(core.siteChange({}, {}), core.NO_SITE_CHANGE);
  assert.deepEqual(core.lineCounts([], {}), core.NO_LINE_COUNTS);
  assert.deepEqual(core.siteChangeLines(core.NO_SITE_CHANGE, core.NO_EDITS), []);
});

// ---- the store, on the installed export (a Kiambu palette of the Subtropical list) ----
const { index, scenarios, store, state, real } = await installedRelease();
const placeOf = (name, lat, lon) => {
  const p = scenarios.places[name];
  return { lat: lat ?? p.lat, lon: lon ?? p.lon, source: 'search', label: name, lookup: { lat: p.lat, lon: p.lon, soil: p.soil, regions: { wgsrpdL3: null, isoA2: null }, climate: { cellLat: lat ?? p.lat, cellLon: lon ?? p.lon, distanceCells: 0, periods: p.periods } } };
};
const K8 = scenarios.cases.find((c) => c.id === 'kiambu-8').input.members;
const K200 = scenarios.cases.find((c) => c.id === 'kiambu-200').input.members;
store.start();
async function kiambu(members = K8) {
  store.hideToast();
  store.setSource(real);
  state.signals.climate.value = 'Subtropical';
  store.pools.value = { Subtropical: await real.pool('Subtropical') };
  store.location.value = placeOf('kiambu');
  store.verdictRule.value = await core.loadVerdictRule();
  state.signals.members.value = [...members];
  state.signals.removed.value = [];
  state.signals.siteEdits.value = core.NO_EDITS;
  state.signals.plantsPerJob.value = 2;
  state.signals.suggestedIds.value = [];
}

test('store: the goal recounts the thin spots at once; untouchedSuggestion holds until any add, remove or goal change', async () => {
  await kiambu();
  const thin2 = store.thinSpots.value.map((h) => h.id);
  assert.ok(thin2.length > 0, 'kiambu-8 has thin targets at plantsPerJob = 2');
  store.setPlantsPerJob(3);
  assert.equal(store.plantsPerJob.value, 3);
  const thin3 = store.thinSpots.value.map((h) => h.id);
  assert.ok(thin3.length >= thin2.length, 'raising plantsPerJob to 3 recounts thin spots at once');
  assert.notDeepEqual(thin3, thin2, 'goal 3 yields distinct thin spots from goal 2');
  store.setPlantsPerJob(4);
  assert.equal(store.plantsPerJob.value, 2, 'a goal off the control reads 2');
  state.signals.suggestedIds.value = [...K8];
  assert.equal(store.untouchedSuggestion.value, true);
  store.setPlantsPerJob(5);
  assert.equal(store.untouchedSuggestion.value, false, 'a goal change touches it');
  state.signals.suggestedIds.value = [...K8];
  store.removeMember(K8[0]);
  assert.equal(store.untouchedSuggestion.value, false, 'a remove touches it');
  store.hideToast();
});

test('store: removeMembers takes one snapshot and one Undo, puts the plants back in their order, and says the Toasts board\'s words', async () => {
  await kiambu(K200);
  const before = store.members.value.slice();
  const gone = [before[3], before[150], before[7], 'not-a-member'];
  store.removeMembers(gone);
  assert.equal(store.members.value.length, 197);
  // M44: then each new thin spot ("Feeds the soil: now only 1 plant in years 25 to 60.").
  assert.match(store.toast.value.text, /^3 plants removed\. 197 plants\. (?:No new hole\.|\d+ new holes?: .+?\.)(?: [^.]+: now only \d+ plants? in years \d+ to \d+\.)*$/);
  assert.ok(store.toast.value.undo, 'Undo offered');
  store.toast.value.undo();
  store.hideToast();
  assert.deepEqual(store.members.value, before, 'Undo restores the plants in their order');
  store.removeMembers(['not-a-member']);
  assert.equal(store.toast.value, null, 'none in the palette: nothing');
  store.removeMembers([before[0], before[1]]);
  assert.ok(store.toast.value.undo);
  state.signals.members.value = state.signals.members.value.slice(1);
  assert.equal(store.toast.value, null, 'another change ends the Undo offer');
});

test('store: addMembers\' text function sees what the add did to the holes and thin spots, after the state changed', async () => {
  await kiambu();
  const pool = store.pools.value.Subtropical;
  const lead = core.nextTarget(store.paletteHoles.value, store.thinSpots.value);
  const filler = pool.find((t) => !K8.includes(t.id) && core.fills(lead.target, t));
  let seen = null;
  store.addMembers([filler.id, K8[0]], {}, { text: (r) => { seen = { ...r, members: store.members.value.length }; return words.sayAll([{ key: 'consortium.line.paletteSize', vars: {}, count: r.size }, ...core.holeChangeLines(r.holeChange, { thins: r.thinChange })]); } });
  assert.deepEqual(seen.added, [filler.id], 'members already in are left out');
  assert.equal(seen.size, 9);
  assert.equal(seen.members, 9, 'called after the state changed');
  assert.ok(!seen.holeChange.open.some((h) => h.id === lead.target.id) || lead.target.thin, 'the hole it filled is no longer open');
  assert.match(store.toast.value.text, /^9 plants\. /);
  store.hideToast();
});

test('store: updateToast changes the words of the same toast, keeps its Undo; a gone toast is not brought back', async () => {
  await kiambu();
  store.removeMember(K8[1]);
  const { id, undo } = store.toast.value;
  assert.equal(store.updateToast(id, 'Later words', { label: 'Retry', run: () => {}, keep: true }), true);
  assert.equal(store.toast.value.text, 'Later words');
  assert.equal(store.toast.value.undo, undo, 'Undo kept');
  assert.equal(store.toast.value.action.keep, true);
  store.hideToast();
  assert.equal(store.updateToast(id, 'Too late'), false);
  assert.equal(store.toast.value, null);
});

test('store: setSiteEdits writes the edits made safe, says "Counting…" until the checks settle, then the summary, with Undo throughout', async () => {
  await kiambu();
  const was = store.verdictRule.value;
  store.verdictRule.value = null;
  let calls = 0;
  store.setSiteEdits({ nightsShiftC: -2, light: 'sun' }, ({ ready }) => { calls++; return ready ? { text: 'Summary' } : 'pending'; });
  assert.deepEqual(store.siteEdits.value, { nightsShiftC: -2 }, 'made safe (no light answer)');
  assert.equal(store.toast.value.text, 'Counting…');
  assert.ok(store.toast.value.undo);
  store.verdictFailed.value = true;
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(store.toast.value.text, 'Summary', 'ready (failed counts as settled for the summary function)');
  store.verdictFailed.value = false;
  store.verdictRule.value = null;
  store.setSiteEdits({ soilPh: 6.8 }, () => 'pending');
  store.verdictFailed.value = true;
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(store.toast.value.text, 'Checks could not run.');
  assert.equal(store.toast.value.action.keep, true, 'Retry keeps the toast and its Undo');
  store.toast.value.undo();
  assert.deepEqual(store.siteEdits.value, { nightsShiftC: -2 }, 'Undo puts the edits back');
  store.verdictFailed.value = false;
  store.verdictRule.value = was;
  store.setSiteEdits({ watering: 'rain' }, 'Plain words');
  assert.equal(store.toast.value.text, 'Plain words');
  assert.ok(calls >= 2);
  store.hideToast();
});

test('store: a new place in another cell clears the edits (said once); the same cell and a first place keep them', async () => {
  await kiambu();
  store.location.value = null;
  state.signals.siteEdits.value = { nightsShiftC: -2 };
  store.placeAt(placeOf('kiambu'));
  assert.deepEqual([store.siteEdits.value, store.editsCleared.value], [{ nightsShiftC: -2 }, false], 'a first place keeps them');
  store.placeAt(placeOf('kiambu', -1.17, 36.84));
  assert.deepEqual(store.siteEdits.value, { nightsShiftC: -2 }, 'the same cell keeps them');
  store.placeAt(placeOf('lyon'));
  assert.deepEqual([store.siteEdits.value, store.editsCleared.value], [core.NO_EDITS, true], 'another cell clears them');
});

test('store: openFigure goes to the Place step with that line', async () => {
  await kiambu();
  state.signals.view.value = 'matrix';
  store.openFigure('soilPh');
  assert.deepEqual([store.figureLine.value, store.view.value], ['soilPh', 'start']);
});

// 200 plants stay fast (owner: timings are reported, never failed).
test('store: the 200-plant Kiambu palette\'s holes, lanes and thin spots (timed, reported)', async () => {
  await kiambu(K200);
  const t0 = performance.now();
  const n = [store.paletteHoles.value.length, store.lanes.value.length, store.thinSpots.value.length];
  const t1 = performance.now();
  store.removeMembers([K200[10], K200[20], K200[30]]);
  const t2 = performance.now();
  console.log(`# 200 plants: holes, lanes and thin spots ${(t1 - t0).toFixed(1)} ms; removeMembers(3) with its toast ${(t2 - t1).toFixed(1)} ms`);
  assert.ok(n[1] > 0);
  store.hideToast();
});

// ---- 0W-2 R1: Mildly toxic (Slight) is not a second look; the chip stays (the flag and its level) ----
test('R1: a toxicity flag carries its level; Slight alone is no second look, Moderate and Severe are', () => {
  const tox = (level) => [{ id: 'p', kind: 'toxicity', level }];
  assert.equal(core.secondLook(tox('Slight')), false);
  assert.equal(core.secondLook(tox('Moderate')), true);
  assert.equal(core.secondLook(tox('Severe')), true);
  assert.equal(core.secondLook([...tox('Slight'), { id: 'p', kind: 'misfit' }]), true, 'a misfit beside it still is');
  const plant = (level) => ({ id: 'p', canonical_name: 'P', stratum: null, warnings: { toxicity: { level } }, jobs: [] });
  const site = core.siteOf(core.siteInputsOf({ lookup: null, room: 'unsure', edits: core.NO_EDITS }));
  const flags = core.flagsFor(plant('Slight'), [], { site, interactions: [], country: null });
  assert.deepEqual(flags.filter((f) => f.kind === 'toxicity'), [{ id: 'p', kind: 'toxicity', level: 'Slight' }], 'the chip\'s flag stays');
});

// ---- 0W-2 R2: watering sets the dryness note; the dry-months path is gone ----
const S = await import('./consortium-scenarios.mjs');
const { verdict } = await import('../src/lib/palette/verdict.ts');
test('R2: rain or no answer says drier, first-years the same note in "water it the first years" words, all-year none; the fit never moves', async () => {
  const file = JSON.parse(readFileSync(new URL('./fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));
  const c = file.cases.find((x) => x.id === 'mendoza-board-rain');
  const pool = await S.pool(c.input.list);
  const by = new Map(pool.map((t) => [t.id, t]));
  const drierId = Object.keys(c.output.notes).find((id) => c.output.notes[id].includes('drier'));
  const taxon = by.get(drierId);
  const at = (watering) => {
    const inputs = S.inputsOf({ ...c.input, edits: { ...c.input.edits, watering } }, file.places);
    return verdict(taxon, { inputs, period: c.input.period, scenario: 'ssp245' });
  };
  const [none, rain, first, all] = [undefined, 'rain', 'first-years', 'all-year'].map(at);
  assert.ok(rain.notes.includes('drier') && none.notes.includes('drier'), 'rain or no answer: drier');
  assert.ok(first.notes.includes('drier') && first.watered === 'first-years', 'first years: the same note, its words');
  assert.equal(rain.watered, undefined);
  assert.ok(!all.notes.includes('drier') && !all.notes.includes('drier-later'), 'all year: none');
  assert.deepEqual([none, rain, first, all].map((v) => v.level), Array(4).fill(rain.level), 'the fit never moves');
  const W = { period: (p) => p, scenario: 'SSP2-4.5', heightM: null };
  const keys = (v) => [core.fitLine(v).key, ...core.againstLines(v, null, W).map((e) => e.line.key), ...core.rowLines(v, null, W).map((e) => e.line.key)].join(' ');
  assert.match(keys(first), /First\b/);
  assert.doesNotMatch(keys(rain), /First\b/);
  assert.doesNotMatch(keys(all), /(Drier|Dry|DrierBy)(First)?\b/, 'no watering advice');
  assert.match(keys(all), /pastDrierWatered/, 'the measure stays, without advice');
  assert.doesNotMatch(en['consortium.line.pastDrierWatered'], /water/i);
  for (const k of ['pastDrierFirst', 'noteDrierFirst', 'noteDrierByFirst', 'rowDrierFirst', 'rowDrierByFirst', 'fitsDryFirst', 'fitsToDryFirst']) assert.match(en[`consortium.line.${k}`], /first years/, k);
  for (const gone of ['consortium.water.dryMonths', 'consortium.line.noteDryMonths', 'consortium.line.rowDryMonths']) assert.equal(en[gone], undefined, gone);
  const medium = { ...taxon, traits: { ...taxon.traits, drought_tolerance: 'Medium' } };
  assert.ok(core.fits(medium, { light: 'unsure', soil: 'unsure', water: 'dry', room: 'unsure' }).reasons.every((r) => !('note' in r)), 'no dry-months note');
});

// ---- 0W-2 R3: soil and drainage are hints ----
test('R3: setsLevel is false for soil-ph and drainage (and the wet check), dry keeps its wet side; a map pH gives a soil-ph hint that says which way; nearKm for a neighbour fill', () => {
  const f = (factor, extra = {}) => ({ factor, level: 'look', basis: 'spot', place: null, low: null, high: null, ...extra });
  assert.equal(core.setsLevel(f('soil-ph', { basis: 'soil-map' })), false);
  assert.equal(core.setsLevel(f('soil-ph', { basis: 'soil-test' })), false);
  assert.equal(core.setsLevel(f('drainage')), false);
  assert.equal(core.setsLevel(f('water')), false, 'the wet check is the drainage answer\'s');
  assert.equal(core.setsLevel(f('light')), true);
  assert.equal(core.setsLevel(f('dry', { basis: 'range', place: 3, low: 0.5, high: 2 })), true, 'wetter than recorded still asks');
  assert.equal(core.setsLevel(f('dry', { basis: 'range', place: 0.2, low: 0.5, high: 2 })), false);
  const lookup = (soil) => ({ lat: 0, lon: 0, climate: null, soil, regions: { wgsrpdL3: null, isoA2: null } });
  const measured = core.siteInputsOf({ lookup: lookup({ phH2o: 8.1, texture: 'clay', filled: false, fillDistanceCells: 0, distanceCells: 0 }) });
  assert.deepEqual(measured.soilPh, { value: 8.1, source: 'map', map: 8.1 });
  const filled = core.siteInputsOf({ lookup: lookup({ phH2o: 7.2, texture: null, filled: true, fillDistanceCells: 2, distanceCells: 0 }) });
  assert.deepEqual(filled.soilPh, { value: 7.2, source: 'map', map: 7.2, nearKm: 11 });
  assert.equal(core.siteOf(measured).water, 'unsure', 'the map texture (clay) gives no hint until the grower answers wet');
  const plant = { id: 'p', canonical_name: 'P', stratum: null, climate: null, warnings: {}, jobs: [], traits: { soil_ph: { min: 5, max: 6.5 } } };
  const v = verdict(plant, { inputs: measured, period: '1991-2020', scenario: 'ssp245' });
  const soil = v.factors.find((x) => x.factor === 'soil-ph');
  assert.deepEqual([soil.level, soil.basis, soil.place, soil.low, soil.high], ['look', 'soil-map', 8.1, 5, 6.5]);
  assert.notEqual(v.level, 'look', 'never the level');
  assert.deepEqual(core.hintLine(soil), { key: 'consortium.line.hintAlkaline', vars: { ph: 6.5 } });
  assert.deepEqual(core.flagsFor(plant, [], { site: core.siteOf(measured), interactions: [], country: null }), [], 'no misfit flag, no second look');
  const potted = core.siteInputsOf({ lookup: lookup({ phH2o: 8.1, texture: 'clay', filled: false, fillDistanceCells: 0, distanceCells: 0 }), edits: { pots: true } });
  assert.equal(verdict(plant, { inputs: potted, period: '1991-2020', scenario: 'ssp245' }).factors.some((x) => x.factor === 'soil-ph' && x.level !== 'unknown'), false, 'pots: no soil hint');
});

test('R4: a link without e=1 is unreadable and restores nothing (cut is the reason only); l w q r h s are no keys', () => {
  const NONE = { unknownCount: 0, cut: false, newer: false, unreadable: false, period: false };
  const ok = core.decodeLink('v=5&c=temperate&m=small&a=&k=FR&b=60&e=1', {}, null);
  assert.deepEqual([ok.state.climate, ok.state.room, ok.notice], ['Temperate', 'small', NONE]);
  for (const cut of ['v=5&c=temperate&m=small&a=&k=FR&b=60', 'v=5&c=temperate&m=small']) {
    const d = core.decodeLink(cut, {}, null);
    assert.deepEqual(d.notice, { ...NONE, cut: true, unreadable: true }, cut);
    assert.deepEqual([d.state.climate, d.state.room, d.state.country, d.state.siteEdits ?? null, d.state.members], [null, 'unsure', null, null, []], `${cut}: nothing restored`);
  }
  // The old spot and soil keys: dropped from LINK_KEYS and PLACE_KEYS, so the codec ignores them and they bring no place.
  for (const k of ['l', 'w', 'q', 'r', 'h', 's']) {
    assert.equal(core.LINK_KEYS.includes(k), false, k);
    assert.equal(core.PLACE_KEYS.includes(k), false, k);
  }
  assert.deepEqual(['k', 'o'].map((k) => core.PLACE_KEYS.includes(k)), [true, true], 'k and o stay');
  const old = 'v=5&c=temperate&m=small&a=&l=shade&w=wet&q=windy&r=clay&h=valley&s=own.acid.-&e=1';
  const d = core.decodeLink(old, {}, null);
  assert.deepEqual(d.notice, NONE);
  assert.equal(core.bringsPlace(old, d), false);
  assert.deepEqual(Object.keys(d.state).filter((k) => k === 'spot' || k === 'soil'), []);
});
