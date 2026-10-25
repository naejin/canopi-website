// scripts/built-links.mjs: how check-built-site resolves an internal link to a built file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { builtTarget, subdirectories } from './built-links.mjs';

const root = mkdtempSync(join(tmpdir(), 'built-links-'));
mkdirSync(join(root, 'guides', 'landrace-gardening'), { recursive: true });
writeFileSync(join(root, 'guides', 'landrace-gardening', 'index.html'), '<h1>x</h1>');
writeFileSync(join(root, 'guides', 'index.html'), '<h1>x</h1>');
writeFileSync(join(root, 'robots.txt'), '');

test('a page link resolves to its index.html, and a file link to the file', () => {
  assert.deepEqual(builtTarget(root, '/guides/landrace-gardening/'), { file: join(root, 'guides', 'landrace-gardening', 'index.html') });
  assert.deepEqual(builtTarget(root, '/robots.txt'), { file: join(root, 'robots.txt') });
});

test('a page link without its trailing slash is an error, even when the folder exists', () => {
  // Cloudflare redirects /guides to /guides/; every internal link should point at the final URL.
  assert.match(builtTarget(root, '/guides').error, /trailing slash/);
  assert.match(builtTarget(root, '/guides/landrace-gardening').error, /trailing slash/);
});

test('a link to nothing built is an error', () => {
  assert.match(builtTarget(root, '/guides/nothing/').error, /no built page/);
  assert.match(builtTarget(root, '/missing.txt').error, /no built page/);
});

test('the guide folders are the subdirectories only: a stray file such as .DS_Store is not a guide', () => {
  const guides = mkdtempSync(join(tmpdir(), 'guide-slugs-'));
  mkdirSync(join(guides, 'corn'));
  mkdirSync(join(guides, 'tomatoes'));
  writeFileSync(join(guides, '.DS_Store'), '');
  writeFileSync(join(guides, 'README.md'), '');
  assert.deepEqual(subdirectories(guides).sort(), ['corn', 'tomatoes']);
});
