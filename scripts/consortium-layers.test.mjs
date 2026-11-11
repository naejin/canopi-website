// Stream S3's layer value helpers (consortium v2, design check §2 port table; H13): the months of a
// layer value written as runs, scope words and the rows of a plant's layer values (views/layers.ts,
// ported from v1 layers.js; months come in order from months_from).
import test from 'node:test';
import assert from 'node:assert/strict';

const { monthRuns, monthsText, scopeText, layerRows, isEstimate } = await import('../src/islands/consortium/views/layers.ts');

// ---- months as runs ----
const W = {
  lang: 'en',
  T: (k, v) => ({ 't.allYear': 'All year', 'scope.everywhere': 'Everywhere', 'scope.latN': '{from}–{to}° N', 'scope.latS': '{from}–{to}° S', 'scope.north': 'Northern Hemisphere', 'scope.south': 'Southern Hemisphere', yes: 'Yes', no: 'No' }[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => String(v?.[n] ?? '')),
  climate: (z) => z,
  country: (c) => ({ FR: 'France' }[c] ?? c),
  region: (r) => ({ europe: 'Europe' }[r] ?? r),
  num: (n) => String(n),
};

test('months as runs: a run over the new year stays one run, single months stand alone', () => {
  assert.deepEqual(monthRuns(['Nov', 'Dec', 'Jan', 'Feb', 'Mar']), [[10, 2]]);
  assert.deepEqual(monthRuns(['Jan', 'Mar', 'Apr', 'Jun']), [[0, 0], [2, 3], [5, 5]]);
  assert.deepEqual(monthRuns([]), []);
});

test('months text: "Nov–Mar", runs joined by the site\'s list form, all twelve "All year", in the page language', () => {
  assert.equal(monthsText(['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], W), 'Nov–Mar');
  assert.equal(monthsText(['Jan', 'Mar', 'Apr', 'Jun'], W), 'Jan, Mar–Apr, and Jun');
  assert.equal(monthsText(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], W), 'All year');
  assert.equal(monthsText(['Apr', 'May'], { ...W, lang: 'fr' }), 'avr.–mai');
});

test('scope words: everywhere, a country, a latitude band with its hemisphere', () => {
  assert.equal(scopeText(null, W), 'Everywhere');
  assert.equal(scopeText({ country: 'FR' }, W), 'France');
  assert.equal(scopeText({ latitude: '-50..-35' }, W), '35–50° S');
  assert.equal(scopeText({ region: 'europe', hemisphere: 'N' }, W), 'Europe · Northern Hemisphere');
});

test('layer rows: fields in order, values with where and source, every kind but recorded is an estimate', () => {
  const values = [
    { field: 'sowing_months', months: ['Mar', 'Apr'], flag: null, climate: null, scope: null, source: 's1', kind: 'recorded' },
    { field: 'bloom_months', months: ['Nov', 'Dec', 'Jan'], flag: null, climate: null, scope: { country: 'FR' }, source: 's2', kind: 'derived' },
    { field: 'tolerates_wind', months: null, flag: true, climate: null, scope: null, source: 's1', kind: 'extracted' },
  ];
  const rows = layerRows(values, W, (id) => `Source ${id}`);
  assert.deepEqual(rows.map((r) => r.field), ['bloom_months', 'sowing_months', 'tolerates_wind']);
  assert.deepEqual(rows[0].values[0], { text: 'Nov–Jan', where: 'France · Source s2', estimate: true });
  assert.deepEqual(rows[1].values[0], { text: 'Mar–Apr', where: 'Everywhere · Source s1', estimate: false });
  assert.equal(rows[2].values[0].text, 'Yes');
  assert.ok(isEstimate({ kind: 'llm' }) && !isEstimate({ kind: 'recorded' }));
});
