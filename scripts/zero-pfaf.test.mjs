// Hard Operator rule guard: zero mentions of PFAF / Plants For A Future anywhere in user-facing
// translations, /data-sources/ credits, or verdict/citation display helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSourceCredits, shownCredits } from '../src/lib/source-credits.js';
import { sourceTitle, sourceLine, disputeLine } from '../src/lib/palette/verdict-line.ts';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const FORBIDDEN = /pfaf|plants for a future/i;

test('zero-PFAF guard: all 11 locale files have 0 occurrences in keys and values', () => {
  const dir = join(ROOT, 'src', 'i18n', 'translations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 11, 'expected 11 locale translation files');
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8');
    assert.doesNotMatch(raw, FORBIDDEN, `${f} must not contain PFAF or Plants For A Future`);
  }
});

test('zero-PFAF guard: /data-sources/ shownCredits excludes PFAF rows', () => {
  const creditsPath = join(ROOT, 'src', 'data', 'source_credits.tsv');
  if (!existsSync(creditsPath)) return;
  const { used, held } = shownCredits(parseSourceCredits(readFileSync(creditsPath, 'utf8')));
  for (const row of [...used, ...held]) {
    assert.doesNotMatch(`${row.source} ${row.name} ${row.credit} ${row.url}`, FORBIDDEN, `shownCredits leaked ${row.source}`);
  }
});

test('zero-PFAF guard: verdict-line sourceTitle, sourceLine, and disputeLine never emit PFAF', () => {
  assert.doesNotMatch(sourceTitle('pfaf', 'Plants For A Future (pfaf.org)'), FORBIDDEN);
  const sl = sourceLine({ field: 'frost_tender', source: 'pfaf', scope: 'GB', kind: 'recorded' });
  assert.ok(sl);
  assert.doesNotMatch(JSON.stringify(sl), FORBIDDEN);
  const dl = disputeLine({ field: 'toxicity', kind: 'queue', value: null, unit: null, derived: false, scope: null, source: 'pfaf' }, null);
  assert.doesNotMatch(JSON.stringify(dl), FORBIDDEN);
});
