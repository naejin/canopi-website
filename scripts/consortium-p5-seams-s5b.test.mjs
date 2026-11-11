// P5 commit 0, stream S5b's seams (store.location and proposedClimate, views/LocationSlot.tsx): stubs that keep today's behaviour until S5b lands.
// S5b owns this file and replaces each stub test with its rules' tests; no other stream edits it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ctx, lyon, placement, taxon } from './consortium-p5-fixtures.mjs';

const core = await import('../src/lib/consortium/index.ts');
const view = (f) => readFileSync(new URL(`../src/islands/consortium/views/${f}`, import.meta.url), 'utf8');
void ctx; void lyon; void placement; void taxon; void view;

test('store.location and store.proposedClimate (S5b writes) start empty; views/LocationSlot.tsx renders nothing', async () => {
  const store = await import('../src/islands/consortium/store.ts');
  assert.equal(store.location.value, null);
  assert.equal(store.proposedClimate.value, null);
  assert.match(view('LocationSlot.tsx'), /return null;/);
});
