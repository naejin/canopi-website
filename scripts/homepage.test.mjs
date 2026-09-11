import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { detectInstaller, isMacDesktop } from '../src/lib/installer.mjs';

test('Mac chip chooser excludes iOS user agents that mention Mac OS X', () => {
  assert.equal(isMacDesktop('iPhone; CPU iPhone OS 18_0 like Mac OS X'), false);
  assert.equal(isMacDesktop('iPad; CPU OS 18_0 like Mac OS X'), false);
  assert.equal(isMacDesktop('Macintosh; Intel Mac OS X', '', 5), false);
  assert.equal(isMacDesktop('Macintosh; Intel Mac OS X', '', 0), true);
});

test('recommend only compatible installers and keep uncertain devices in the chooser', () => {
  const cases = [
    ['Windows NT 10.0; Win64; x64', 'Windows', 'x86', 0, '64', 'windows'],
    ['Windows NT 10.0', 'Windows', 'arm', 0, '64', null],
    ['Windows NT 10.0', 'Windows', 'x86', 0, '32', null],
    ['Macintosh; Intel Mac OS X', 'macOS', 'arm', 0, '64', 'mac-arm'],
    ['Macintosh; Intel Mac OS X', 'macOS', 'x86', 0, '64', 'mac-intel'],
    ['Macintosh; Intel Mac OS X', '', '', 0, '', null],
    ['Macintosh; Intel Mac OS X', '', '', 5, '', null],
    ['Linux x86_64', '', '', 0, '', 'linux'],
    ['Linux aarch64', 'Linux', 'arm', 0, '64', null],
    ['Linux i686', '', '', 0, '', null],
    ['Linux', 'Linux', 'x86', 0, '32', null],
    ['Android; Linux x86_64', '', '', 0, '', null],
    ['CrOS x86_64', '', '', 0, '', null],
    ['iPhone', '', '', 0, '', null],
    ['Unknown', '', '', 0, '', null],
  ];
  for (const [ua, platform, arch, touch, bits, expected] of cases) {
    assert.equal(detectInstaller(ua, platform, arch, touch, bits), expected, `${ua} / ${arch} / ${bits}`);
  }
});

test('every locale supplies the same keys and preserves interpolation placeholders', () => {
  const root = new URL('../src/i18n/translations/', import.meta.url);
  const en = JSON.parse(readFileSync(new URL('en.json', root), 'utf8'));
  const keys = Object.keys(en).sort();
  const placeholders = text => (text.match(/\{\w+\}/g) || []).sort();
  const files = readdirSync(root).filter(file => file.endsWith('.json'));
  assert.equal(files.length, 11);
  for (const file of files) {
    const translated = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    assert.deepEqual(Object.keys(translated).sort(), keys, file);
    for (const key of keys) {
      assert.ok(translated[key].trim(), `${file}: ${key}`);
      assert.deepEqual(placeholders(translated[key]), placeholders(en[key]), `${file}: ${key}`);
    }
  }
});
