// E6 hand-off review 4: store.taxonOf finds a plant outside the members in the chosen climate's pool,
// else in another climate's list read (a guest, "From the {list}"). While the range rule loads, the
// chosen climate's pool reads null (store.pool waits for the rule), and the plant was then found in
// pools[climate] and stamped a guest of its own climate. A plant of the chosen climate's own list is
// never a guest, borrowed placement or not, in or out of that window.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = await import('../src/islands/consortium/store.ts');
const { guestOf, borrowedFrom } = await import('../src/lib/consortium/index.ts');

const plant = (id, origin) => ({ id, canonical_name: id, common_name: null, ...(origin ? { origin } : {}) });

test('taxonOf: a plant of the chosen climate\'s own list is not a guest while the range rule loads', () => {
  const own = plant('own-1');
  const borrowed = plant('borrowed-1', { list: 'Mediterranean', kind: 'borrowed' });
  const other = plant('other-1');
  try {
    store.pools.value = { Subtropical: [own, borrowed], Tropical: [other] };
    store.climate.value = 'Subtropical';
    // A site with a climate and no range rule yet: store.pool is null meanwhile.
    store.location.value = { lat: 0, lon: 0, source: 'map', lookup: { climate: { periods: [{}] } } };
    assert.equal(store.pool.value, null, 'the window: the pool waits for the range rule');
    assert.equal(guestOf(store.taxonOf('own-1')), null, 'a curated own plant');
    assert.equal(guestOf(store.taxonOf('borrowed-1')), null, 'a borrowed own plant');
    assert.equal(borrowedFrom(store.taxonOf('borrowed-1')), 'Mediterranean', 'still an estimate');
    assert.equal(guestOf(store.taxonOf('other-1')), 'Tropical', 'another climate\'s plant is a guest');
    store.location.value = null;
    assert.ok(store.pool.value, 'out of the window');
    assert.deepEqual([guestOf(store.taxonOf('own-1')), guestOf(store.taxonOf('borrowed-1')), guestOf(store.taxonOf('other-1'))], [null, null, 'Tropical']);
  } finally {
    store.location.value = null;
    store.climate.value = null;
    store.pools.value = {};
  }
});
