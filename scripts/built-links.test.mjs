// scripts/built-links.mjs: how check-built-site resolves an internal link to a built file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtTarget, splitHref, subdirectories } from './built-links.mjs';

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

test('an href is read as the browser reads it: entities decoded, then path, query and hash apart', () => {
  assert.deepEqual(splitHref('/palette/?plant=Zea%20mays&#38;climate=tropical'), { path: '/palette/', query: 'plant=Zea%20mays&climate=tropical', hash: '' });
  assert.deepEqual(splitHref('/fr/palette/?plant=Olea&amp;climate=mediterranean#result'), { path: '/fr/palette/', query: 'plant=Olea&climate=mediterranean', hash: 'result' });
  assert.deepEqual(splitHref('/guides/x/#a-b'), { path: '/guides/x/', query: '', hash: 'a-b' });
  assert.deepEqual(splitHref('#top'), { path: '', query: '', hash: 'top' });
  assert.deepEqual(splitHref('/a/&#x26;b/'), { path: '/a/&b/', query: '', hash: '' });
});

// PP-B commit 0b (plant-palette-architecture 8.4): the tool moved from /consortium/ to /palette/, the old
// paths answering with a 301 (public/_redirects). No URL string in the source names the old path: an href
// value, a string literal or template starting /consortium or /<lang>/consortium, a markdown link target.
// Import paths, src/*/consortium/ folders, /data/consortium/ files and prose in comments are not URLs;
// _redirects may name the old path as a source, never as a target.
test('no URL string in src/ or public/_redirects names the old /consortium/ path', () => {
  const repo = fileURLToPath(new URL('..', import.meta.url));
  const files = readdirSync(join(repo, 'src'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(?:astro|ts|tsx|js|mjs|mdx|md|json)$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));
  assert.ok(files.length > 100, 'the scan reads the source tree');
  const lang = '(?:fr|es|pt|it|zh|de|ja|ko|nl|ru)';
  const url = new RegExp(`(?:["'\`(=]|\\})/(?:${lang}/)?consortium(?=[/"'\`)?#]|$)`, 'm');
  const found = [];
  for (const file of files) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => { if (url.test(line)) found.push(`${relative(repo, file)}:${i + 1}: ${line.trim().slice(0, 120)}`); });
  }
  for (const [i, line] of readFileSync(join(repo, 'public', '_redirects'), 'utf8').split('\n').entries()) {
    const [, to] = line.trim().split(/\s+/);
    if (!line.trim().startsWith('#') && to && /\/consortium(?:\/|$)/.test(to)) found.push(`public/_redirects:${i + 1}: ${line.trim()}`);
  }
  assert.deepEqual(found, [], 'old /consortium/ URLs left (use consortiumPath(lang), /palette/ or /<lang>/palette/)');
  // The rule itself: what counts as a URL string and what does not.
  for (const yes of ["href='/consortium/'", 'h.open(`/fr/consortium/?plant=x`)', '[tool](/consortium/)', "x = '/consortium'", '${base}/consortium/']) assert.ok(url.test(yes), yes);
  for (const no of ["import x from '../islands/palette/App'", "'/data/consortium/a.sqlite.gz'", "new URL('../src/lib/palette/', u)", '// the old /consortium/ paths', "'src/styles/palette/x.css'"]) assert.ok(!url.test(no), no);
});
