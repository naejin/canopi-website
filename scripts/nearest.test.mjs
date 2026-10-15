import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, nearestFirst } from '../src/lib/nearest.mjs';

const design = (id, lon, lat) => ({ id, pin: { lon, lat } });

test('distances are great-circle kilometres', () => {
  const paris = { lon: 2.35, lat: 48.86 };
  const london = { lon: -0.13, lat: 51.51 };
  assert.ok(Math.abs(distanceKm(paris, london) - 344) < 5);
  assert.equal(distanceKm(paris, paris), 0);
});

test('the finder lists designs nearest the point first and keeps the given order without one', () => {
  const designs = [design('sarthe', 0.0, 48.2), design('morbihan', -2.8, 47.7), design('brazil', -47.9, -15.8)];
  assert.deepEqual(nearestFirst(designs, { lon: -3.0, lat: 47.6 }).map((d) => d.id), ['morbihan', 'sarthe', 'brazil']);
  assert.deepEqual(nearestFirst(designs, { lon: -47, lat: -15 }).map((d) => d.id), ['brazil', 'morbihan', 'sarthe']);
  assert.deepEqual(nearestFirst(designs, null).map((d) => d.id), ['sarthe', 'morbihan', 'brazil']);
});

test('nearest first works across the antimeridian', () => {
  const designs = [design('fiji', 178.4, -18.1), design('samoa', -171.8, -13.8), design('perth', 115.9, -31.9)];
  assert.deepEqual(nearestFirst(designs, { lon: -179.9, lat: -16 }).map((d) => d.id), ['fiji', 'samoa', 'perth']);
});
