import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPersonGeometry,
  buildSilhouetteGeometry,
  classifyHabitSilhouette,
  computeCanopyLightBands,
  HABIT_SILHOUETTE_KINDS,
  wrapElevationLabel,
} from '../src/lib/botanical-silhouettes.ts';

test('classifyHabitSilhouette maps all 8 botanical habit forms', () => {
  assert.equal(classifyHabitSilhouette('Deciduous tree', 8, 6), 'round_tree');
  assert.equal(classifyHabitSilhouette('Evergreen tree', 12, 2.4), 'columnar_tree');
  assert.equal(classifyHabitSilhouette('Conifer', 15, 5), 'columnar_tree');
  assert.equal(classifyHabitSilhouette('Deciduous tree', 14, 14), 'spreading_tree');
  assert.equal(classifyHabitSilhouette('Spreading tree', 7, null), 'spreading_tree');
  assert.equal(classifyHabitSilhouette('Deciduous shrub', 2, 1.8), 'shrub');
  assert.equal(classifyHabitSilhouette('Perennial herb', 1, 0.8), 'herb');
  assert.equal(classifyHabitSilhouette('Tufted grass', 1.2, 0.9), 'grass');
  assert.equal(classifyHabitSilhouette('Woody climber', 5, 2), 'vine');
  assert.equal(classifyHabitSilhouette('Groundcover', 0.25, 0.6), 'groundcover');
});

test('buildSilhouetteGeometry produces crown and optional soil-line root hint for all 8 forms', () => {
  for (const kind of HABIT_SILHOUETTE_KINDS) {
    const withRoots = buildSilhouetteGeometry(kind, 100, 120, 60, 40, true);
    assert.ok(withRoots.crownD && withRoots.crownD.startsWith('M'), `${kind} has crown path`);
    assert.ok(withRoots.rootHintD && withRoots.rootHintD.startsWith('M'), `${kind} has root hint`);
    const noRoots = buildSilhouetteGeometry(kind, 100, 120, 60, 40, false);
    assert.equal(noRoots.rootHintD, null, `${kind} omits root hint when disabled`);
  }
});

test('buildPersonGeometry returns compact bar below 10 px and full silhouette at >= 10 px', () => {
  const small = buildPersonGeometry(40, 120, 6);
  assert.equal(small.compact, true);
  assert.ok(small.line);

  const normal = buildPersonGeometry(40, 120, 28);
  assert.equal(normal.compact, false);
  assert.ok(normal.head && normal.torsoD && normal.leftLeg && normal.rightLeg);
});

test('wrapElevationLabel never truncates and keeps CJK <= 9 chars intact', () => {
  assert.deepEqual(wrapElevationLabel('イタリアイトスギ'), ['イタリアイトスギ']);
  assert.deepEqual(wrapElevationLabel('ヨーロッパグリ'), ['ヨーロッパグリ']);
  assert.deepEqual(wrapElevationLabel('Blackcurrant'), ['Blackcurrant']);
  assert.deepEqual(wrapElevationLabel('Sweet Chestnut'), ['Sweet', 'Chestnut']);
  assert.deepEqual(wrapElevationLabel('White Clover'), ['White Clover']);
  const longJa = wrapElevationLabel('とても長い日本の植物名です');
  assert.equal(longJa.length, 2);
  assert.equal(longJa.join(''), 'とても長い日本の植物名です');
});

test('computeCanopyLightBands derives shade only beneath tree crowns and returns single sun band without trees', () => {
  const noTrees = computeCanopyLightBands(
    [
      { kind: 'groundcover', heightM: 0.3, cx: 180, plantW: 24 },
      { kind: 'shrub', heightM: 1.8, cx: 280, plantW: 36 },
    ],
    88,
    760,
  );
  assert.equal(noTrees.hasTreeCanopy, false);

  const withTrees = computeCanopyLightBands(
    [
      { kind: 'groundcover', heightM: 0.3, cx: 180, plantW: 24 },
      { kind: 'shrub', heightM: 1.8, cx: 340, plantW: 36 },
      { kind: 'columnar_tree', heightM: 11.5, cx: 560, plantW: 24 },
      { kind: 'spreading_tree', heightM: 14.0, cx: 680, plantW: 90 },
    ],
    88,
    760,
  );
  assert.equal(withTrees.hasTreeCanopy, true);
  assert.ok(withTrees.shadeLeftX > 500, 'open groundcover at x=180 is not shaded');
  assert.ok(withTrees.canopyBaseM > withTrees.shrubTopM);
});
