// E6 hand-off review 4: store.taxonOf finds a plant outside the members in the chosen climate's pool,
// else in another climate's list read (a guest, "From the {list}"). While the range rule loads, the
// chosen climate's pool reads null (store.pool waits for the rule), and the plant was then found in
// pools[climate] and stamped a guest of its own climate. A plant of the chosen climate's own list is
// never a guest, borrowed placement or not, in or out of that window.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = await import('../src/islands/palette/store.ts');
const { guestOf, borrowedFrom } = await import('../src/lib/palette/index.ts');

const plant = (id, origin) => ({ id, canonical_name: id, common_name: null, ...(origin ? { origin } : {}) });

test('taxonOf: a plant of the chosen climate\'s own list is not a guest; another climate\'s plant is', () => {
  const own = plant('own-1');
  const borrowed = plant('borrowed-1', { list: 'Mediterranean', kind: 'borrowed' });
  const other = plant('other-1');
  try {
    store.pools.value = { Subtropical: [own, borrowed], Tropical: [other] };
    store.climate.value = 'Subtropical';
    store.location.value = { lat: 0, lon: 0, source: 'map', lookup: { climate: { periods: [{}] } } };
    assert.ok(store.pool.value, 'pool resolves directly');
    assert.equal(guestOf(store.taxonOf('own-1')), null, 'a curated own plant');
    assert.equal(guestOf(store.taxonOf('borrowed-1')), null, 'a borrowed own plant');
    assert.equal(borrowedFrom(store.taxonOf('borrowed-1')), 'Mediterranean', 'still an estimate');
    assert.equal(guestOf(store.taxonOf('other-1')), 'Tropical', 'another climate\'s plant is a guest');
    store.location.value = null;
    assert.deepEqual([guestOf(store.taxonOf('own-1')), guestOf(store.taxonOf('borrowed-1')), guestOf(store.taxonOf('other-1'))], [null, null, 'Tropical']);
  } finally {
    store.location.value = null;
    store.climate.value = null;
    store.pools.value = {};
  }
});

test('taxonOf: a guest resolves from its recorded list', () => {
  const inMed = plant('g-1', { list: 'Mediterranean', kind: 'borrowed' });
  const inTrop = plant('g-1');
  try {
    store.pools.value = { Subtropical: [plant('own-1')], Mediterranean: [inMed], Tropical: [inTrop] };
    store.climate.value = 'Subtropical';
    store.guests.value = { 'g-1': 'Tropical' };
    store.location.value = { lat: 0, lon: 0, source: 'map', lookup: { climate: { periods: [{}] } } };
    const g = store.taxonOf('g-1');
    assert.deepEqual({ guest: guestOf(g), borrowed: borrowedFrom(g) }, { guest: 'Tropical', borrowed: null });
    store.location.value = null;
    const h = store.taxonOf('g-1');
    assert.deepEqual({ guest: guestOf(h), borrowed: borrowedFrom(h) }, { guest: 'Tropical', borrowed: null });
  } finally {
    store.location.value = null;
    store.climate.value = null;
    store.guests.value = {};
    store.pools.value = {};
  }
});
