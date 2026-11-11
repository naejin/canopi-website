// src/lib/safe-href.js: only an http(s) url from the data becomes a link; any other is plain text (prepush m1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeHref } from '../src/lib/safe-href.js';

test('safeHref keeps http(s) urls and refuses every other scheme or shape', () => {
  const bad = ['javascript:alert(document.domain)', 'javascript://commons.wikimedia.org/%0aalert(document.domain)', 'JaVaScRiPt:x', ' javascript:x', 'data:text/html,x', 'vbscript:x', '//commons.wikimedia.org/x', 'commons.wikimedia.org/x', '', null, undefined, 42];
  for (const url of bad) assert.equal(safeHref(url), null, String(url));
  assert.equal(safeHref('https://pfaf.org/x?a=1&b=2'), 'https://pfaf.org/x?a=1&b=2');
  assert.equal(safeHref('http://example.org/'), 'http://example.org/');
});
