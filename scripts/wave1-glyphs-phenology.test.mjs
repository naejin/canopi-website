// Unit tests for Wave 1 shared botanical glyphs & year-wrap phenology ribbon logic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GLYPH_PRIMITIVES, GLYPH_STROKE_WIDTH, GLYPH_VIEWBOX } from '../src/lib/glyphs.ts';
import {
  computeCalendarRuns,
  computeTrackCaps,
  formatWrappedMonthRanges,
  localizedMonthLabels,
} from '../src/lib/phenology.ts';

test('shared botanical glyph registry defines all 13 glyphs on the 16×16 1.4px grid', () => {
  assert.equal(GLYPH_VIEWBOX, '0 0 16 16');
  assert.equal(GLYPH_STROKE_WIDTH, 1.4);
  const expected = [
    'bloom', 'fruit', 'bloom-fruit', 'sow', 'fits', 'check', 'risk',
    'job-food', 'job-soil', 'job-helpers', 'job-mulch', 'job-ground', 'job-shelter',
  ];
  assert.deepEqual(Object.keys(GLYPH_PRIMITIVES), expected);
  for (const name of expected) {
    assert.ok(GLYPH_PRIMITIVES[name].length >= 2, `glyph ${name} has >=2 primitives`);
  }
  const tones = new Set(GLYPH_PRIMITIVES['bloom-fruit'].map((p) => p.tone));
  assert.ok(tones.has('bloom') && tones.has('fruit'), 'bloom-fruit separates bloom and fruit tones');
  assert.notDeepEqual(GLYPH_PRIMITIVES['job-food'], GLYPH_PRIMITIVES.fruit, 'job-food silhouette differs from fruit');
});

test('computeCalendarRuns merges Dec→Jan year-wrap runs with square edges and one peak glyph', () => {
  // Rosemary: Jan–May + Nov–Dec (0,1,2,3,4,10,11)
  const states = ['bloom', 'bloom', 'bloom', 'bloom', 'bloom', '', '', '', '', '', 'bloom', 'bloom'];
  const runs = computeCalendarRuns(states);
  assert.equal(runs[10].seg, 'seg-start', 'Nov opens the wrapped season with a rounded start cap');
  assert.equal(runs[11].seg, 'seg-mid', 'Dec stays square across the year boundary');
  assert.equal(runs[0].seg, 'seg-mid', 'Jan stays square across the year boundary');
  assert.equal(runs[4].seg, 'seg-end', 'May closes the wrapped season with a rounded end cap');
  const peakCount = runs.filter((r) => r.peak).length;
  assert.equal(peakCount, 1, 'wrapped Nov–May season gets exactly one peak glyph');
  assert.equal(runs[1].peak, true, 'peak sits in the middle of the 7-month Nov–May run (Feb)');
});

test('computeTrackCaps and formatWrappedMonthRanges handle wraps, singles, and full year', () => {
  const en = localizedMonthLabels('en');
  assert.equal(formatWrappedMonthRanges([0, 1, 2, 3, 4, 10, 11], en), 'Nov–May');
  assert.equal(formatWrappedMonthRanges([1, 2], en), 'Feb–Mar');
  assert.equal(formatWrappedMonthRanges([5], en), 'Jun');
  assert.equal(formatWrappedMonthRanges([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], en), 'Jan–Dec');

  // Track caps wrap Dec→Jan cleanly
  const wrapActive = [true, true, false, false, false, false, false, false, false, false, true, true];
  const caps = computeTrackCaps(wrapActive);
  assert.equal(caps[10], 'cap-l');
  assert.equal(caps[11], '', 'Dec right edge is square when Jan is active');
  assert.equal(caps[0], '', 'Jan left edge is square when Dec is active');
  assert.equal(caps[1], 'cap-r');

  // Localized Japanese short months
  const ja = localizedMonthLabels('ja');
  assert.equal(ja.length, 12);
  assert.equal(ja[0], '1月');
  assert.equal(ja[11], '12月');
});
