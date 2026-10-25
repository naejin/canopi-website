import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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

test('every English key is used by a page or a script, and every script string reaches the page', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  // Every file under the folder, subfolders included (src/components/guides/…).
  const dir = (path) => readdirSync(new URL(`../src/${path}`, import.meta.url), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'));
  const en = JSON.parse(read('i18n/translations/en.json'));
  const source = [...dir('components'), ...dir('scripts'), read('layouts/Base.astro'), read('data/network.ts')].join('\n');
  // Keys built from a prefix in components (installer names and details, plant roles, countries, bibliography themes and climates).
  const dynamic = ['edition.installer.', 'download.detail.', 'design.role.', 'network.country.', 'bibliography.theme.', 'bibliography.climate.'];
  for (const key of Object.keys(en)) {
    const used = source.includes(`'${key}'`) || dynamic.some((prefix) => key.startsWith(prefix));
    assert.ok(used, `unused translation key: ${key}`);
  }
  // Strings the scripts show come from the page data that Home.astro and PageData.astro write.
  const pageKeys = read('components/Home.astro') + read('components/PageData.astro');
  for (const script of dir('scripts')) {
    for (const [, key] of script.matchAll(/\btext\('([\w.]+)'/g)) assert.ok(pageKeys.includes(`'${key}'`), `script string missing from page data: ${key}`);
  }
});

test('every bibliography theme has a translated label, and every theme label names a theme', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const en = JSON.parse(read('i18n/translations/en.json'));
  // The slug rule of src/data/bibliography.ts.
  const slugs = [...read('data/bibliography.md').matchAll(/^## (.+)$/gm)].map(([, heading]) =>
    heading.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  for (const slug of slugs) assert.ok(en[`bibliography.theme.${slug}`], `missing translation key: bibliography.theme.${slug}`);
  for (const key of Object.keys(en).filter((key) => key.startsWith('bibliography.theme.'))) {
    assert.ok(slugs.includes(key.slice('bibliography.theme.'.length)), `unused translation key: ${key}`);
  }
});

test('every bibliography climate has a translated label, and every climate label names a climate', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const en = JSON.parse(read('i18n/translations/en.json'));
  const climates = [...read('data/bibliography.ts').match(/export const climates = \[(.*)\];/)[1].matchAll(/'([a-z]+)'/g)].map(([, climate]) => climate);
  assert.ok(climates.length);
  for (const climate of climates) assert.ok(en[`bibliography.climate.${climate}`], `missing translation key: bibliography.climate.${climate}`);
  for (const key of Object.keys(en).filter((key) => key.startsWith('bibliography.climate.'))) {
    assert.ok(climates.includes(key.slice('bibliography.climate.'.length)), `unused translation key: ${key}`);
  }
});

test('the header labels exist in every locale: Books (the bibliography) and the phone Menu', () => {
  const root = new URL('../src/i18n/translations/', import.meta.url);
  for (const file of readdirSync(root).filter((name) => name.endsWith('.json'))) {
    const strings = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    for (const key of ['header.books', 'header.menu']) assert.ok(strings[key]?.trim(), `${file}: ${key}`);
  }
  for (const lang of ['en', 'fr']) {
    const guides = JSON.parse(readFileSync(new URL(`../src/i18n/guides/${lang}.json`, import.meta.url), 'utf8'));
    assert.ok(guides['section.books']?.trim(), `guides/${lang}.json: section.books`);
  }
});

test('no nav item is hidden by width, and every width query uses the 639/960 breakpoints', () => {
  // Every stylesheet and every component's scoped <style>.
  const files = [
    ...readdirSync(new URL('../src/styles/', import.meta.url)).filter((name) => name.endsWith('.css')).map((name) => `styles/${name}`),
    ...readdirSync(new URL('../src/components/', import.meta.url), { recursive: true }).filter((name) => name.endsWith('.astro')).map((name) => `components/${name}`),
  ];
  // 1200px picks the hero painting's file size (which image downloads), not a layout breakpoint.
  const allowed = new Set(['639px', '640px', '959px', '960px', '1200px']);
  for (const file of files) {
    const css = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.ok(!/\.nav-(?:guides|discord)\b/.test(css), `${file}: a width-hidden nav item class`);
    for (const [, width] of css.matchAll(/\((?:max|min)-width:\s*([\d.]+px)\)/g)) assert.ok(allowed.has(width), `${file}: width query ${width}`);
  }
  const global = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  // The one swap: below 640px the Menu panel, from 640px the inline links.
  assert.match(global, /\.nav-menu\b/, 'global.css styles the phone menu');
  assert.match(global, /\.nav-inline\b/, 'global.css styles the inline links');
});

test('the header has the phone menu, Books, and chrome.js closes both menus', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const header = read('components/Header.astro');
  assert.match(header, /current\?: 'guides' \| 'books'/);
  assert.match(header, /<details class="nav-menu" data-nav-menu>/);
  assert.match(header, /t\('header\.menu', lang\)/);
  assert.match(header, /t\('header\.books', lang\)/);
  assert.match(read('components/BibliographyPage.astro'), /current="books"/);
  const chrome = read('scripts/chrome.js');
  assert.match(chrome, /\[data-nav-menu\]/);
  assert.match(chrome, /\[data-lang-menu\]/);
});
