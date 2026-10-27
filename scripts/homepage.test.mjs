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
  // Keys built from a prefix in components (installer names and details, plant roles, countries, bibliography themes, climate zones).
  const dynamic = ['edition.installer.', 'download.detail.', 'design.role.', 'network.country.', 'bibliography.theme.', 'climate.'];
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

test('every climate zone has a name, a line about it and a few places in it, and no climate string names another zone', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const en = JSON.parse(read('i18n/translations/en.json'));
  const climates = [...read('data/climates.ts').match(/export const climates = \[(.*)\] as const;/)[1].matchAll(/'([a-z]+)'/g)].map(([, climate]) => climate);
  assert.deepEqual(climates, ['tropical', 'subtropical', 'mediterranean', 'arid', 'temperate', 'continental', 'boreal'], 'the Canopi app\'s seven zones');
  for (const climate of climates) {
    for (const key of [`climate.${climate}`, `climate.${climate}.about`, `climate.${climate}.places`]) assert.ok(en[key], `missing translation key: ${key}`);
  }
  const shared = ['zone', 'yours', 'chip', 'notSet', 'title', 'lede', 'none', 'none.about'];
  for (const key of Object.keys(en).filter((key) => key.startsWith('climate.'))) {
    const [zone, part] = key.slice('climate.'.length).split(/\.(.*)/);
    assert.ok(shared.includes(key.slice('climate.'.length)) || (climates.includes(zone) && [undefined, 'about', 'places'].includes(part)), `unused translation key: ${key}`);
  }
  assert.ok(!Object.keys(en).some((key) => key.startsWith('bibliography.climate')), 'climate labels live under climate.*, shared by every page');
});

test('the climate badge marks each of the seven zones as the reader\'s, and the head script knows them', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const css = read('styles/global.css');
  for (const climate of ['tropical', 'subtropical', 'mediterranean', 'arid', 'temperate', 'continental', 'boreal']) {
    assert.ok(css.includes(`:root[data-climate="${climate}"] .climate-badge[data-zone="${climate}"]`), `global.css fills the ${climate} badge`);
    assert.ok(css.includes(`:root[data-climate="${climate}"] [data-zone="${climate}"] .climate-badge-yours`), `global.css names the ${climate} badge as the reader's`);
  }
  assert.match(read('layouts/Base.astro'), /localStorage\.getItem\('canopi-climate'\)[\s\S]*?JSON\.stringify\(climates\)/, 'Base.astro sets data-climate before the first paint, from the shared list');
  assert.match(read('scripts/climate.js'), /localStorage\.setItem\(key, zone\)/, 'climate.js keeps the choice');
  assert.match(read('scripts/climate.js'), /const key = 'canopi-climate'/, 'one storage key');
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

// The rules inside each width @media block: [selector, declarations].
function widthRules(css) {
  const rules = [];
  for (const match of css.matchAll(/@media[^{]*width[^{]*\{/g)) {
    let depth = 1, i = match.index + match[0].length;
    const from = i;
    while (depth && i < css.length) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0, i++;
    const block = css.slice(from, i - 1).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selector, body] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) rules.push([selector.trim(), body]);
  }
  return rules;
}

test('no header item is hidden by width except the one inline/Menu swap, and width queries use 639/960', () => {
  // Every stylesheet and every component's scoped <style>.
  const files = [
    ...readdirSync(new URL('../src/styles/', import.meta.url)).filter((name) => name.endsWith('.css')).map((name) => `styles/${name}`),
    ...readdirSync(new URL('../src/components/', import.meta.url), { recursive: true }).filter((name) => name.endsWith('.astro')).map((name) => `components/${name}`),
  ];
  // Every class the header's markup uses (its links, the language menu, the Menu panel), except the page-wide .wrap.
  const header = readFileSync(new URL('../src/components/Header.astro', import.meta.url), 'utf8');
  const classes = [...new Set([...header.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].filter((name) => name !== 'wrap');
  const headerItem = new RegExp(`\\.(?:${classes.join('|')})(?![\\w-])`);
  // 1200px picks the hero painting's file size (which image downloads), not a layout breakpoint.
  const allowed = new Set(['639px', '640px', '959px', '960px', '1200px']);
  let swaps = 0;
  for (const file of files) {
    const css = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    for (const [, width] of css.matchAll(/\((?:max|min)-width:\s*([\d.]+px)\)/g)) assert.ok(allowed.has(width), `${file}: width query ${width}`);
    for (const [selector, body] of widthRules(css)) {
      if (!/display:\s*none/.test(body) || !headerItem.test(selector)) continue;
      // The one swap: below 640px the inline links give way to the Menu (hidden by default from 640px).
      assert.equal(selector, '.nav-inline', `${file}: "${selector}" hides a header item by width`);
      swaps++;
    }
  }
  assert.equal(swaps, 1, 'global.css swaps the inline links for the Menu below 640px');
});

test('the menus chrome.js closes are the ones the header renders', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const header = read('components/Header.astro');
  const chrome = read('scripts/chrome.js');
  for (const attribute of ['data-lang-menu', 'data-nav-menu']) {
    assert.ok(chrome.includes(`[${attribute}]`), `chrome.js handles [${attribute}]`);
    assert.match(header, new RegExp(`<details[^>]*\\s${attribute}[\\s>]`), `Header.astro renders <details ${attribute}>`);
  }
});

test('the consortium tool has its entry points: a header item and a Menu line, a footer link, a home section after Start here, and the Learn mentions', () => {
  const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const root = new URL('../src/i18n/translations/', import.meta.url);
  const keys = ['nav.consortium', 'nav.consortium.menu', 'footer.consortium', 'learn.consortium.link',
    'home.consortium.title', 'home.consortium.beta', 'home.consortium.lede', 'home.consortium.note', 'home.consortium.action'];
  for (const file of readdirSync(root).filter((name) => name.endsWith('.json'))) {
    const strings = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    for (const key of keys) assert.ok(strings[key]?.trim(), `${file}: ${key}`);
    // The header item is one short word, measured at 640px; the Menu line carries the full name.
    assert.ok(!/\s/.test(strings['nav.consortium']) && [...strings['nav.consortium']].length <= 12, `${file}: nav.consortium is one short word`);
  }
  // The owner's term: "Guilde" in French, "Consortium" (or its own spelling of it) elsewhere.
  const fr = JSON.parse(readFileSync(new URL('fr.json', root), 'utf8'));
  assert.equal(fr['nav.consortium'], 'Guilde');
  assert.equal(JSON.parse(readFileSync(new URL('en.json', root), 'utf8'))['nav.consortium'], 'Consortium');
  // Every way in leads to consortiumPath(lang), the tool's per-locale address.
  const header = read('components/Header.astro');
  assert.match(header, /<div class="nav-inline">[\s\S]*?href=\{consortium\}[^>]*>\{t\('nav\.consortium', lang\)\}<\/a>[\s\S]*?<\/div>/, 'the inline header links name the tool');
  assert.match(header, /<ul class="nav-panel-links"[\s\S]*?href=\{consortium\}[^>]*>\{t\('nav\.consortium\.menu', lang\)\}<\/a>[\s\S]*?<\/ul>/, 'the phone Menu names the tool');
  assert.match(header, /const consortium = consortiumPath\(lang\)/);
  assert.match(header, /current\?: [^;]*'consortium'/, 'the tool page can mark its header item as current');
  // The 640–959px spacing that fits the row is a global style: a scoped one would stamp data-astro-cid
  // on the header markup that check-built-site.mjs reads.
  assert.doesNotMatch(header, /<style(?![^>]*is:global)/, 'Header.astro styles are global');
  assert.match(header, /@media \(min-width: 640px\) and \(max-width: 959px\)/, 'Header.astro tightens the inline row between 640 and 959px');
  assert.match(read('components/Footer.astro'), /href=\{consortiumPath\(lang\)\}>\{t\('footer\.consortium', lang\)\}/);
  assert.match(read('components/ConsortiumSection.astro'), /href=\{consortiumPath\(lang\)\}/);
  assert.match(read('components/Bibliography.astro'), /\{full && <p class="bibliography-guides"><a href=\{consortiumPath\(lang\)\}>\{t\('learn\.consortium\.link', lang\)\}/);
  assert.match(read('components/guides/GuidesIndex.astro'), /href=\{consortiumPath\(lang\)\}>\{t\('learn\.consortium\.link', lang\)\}/);
  // The home section comes right after Start here.
  const home = read('components/Home.astro');
  assert.match(home, /<StartHere lang=\{lang\} \/>\s*<ConsortiumSection lang=\{lang\} \/>/);
  // No photos and no strata colours in the section: the tool's drawing keeps those.
  const section = read('components/ConsortiumSection.astro');
  assert.ok(!/<img|<picture|background-image|--leaf|#[0-9a-f]{3,6}\b/i.test(section), 'ConsortiumSection draws no plant and no green');
});

test('the consortium keys sit with their families, apart from the tool page\'s consortium.* keys at the end', () => {
  const root = new URL('../src/i18n/translations/', import.meta.url);
  for (const file of readdirSync(root).filter((name) => name.endsWith('.json'))) {
    const keys = Object.keys(JSON.parse(readFileSync(new URL(file, root), 'utf8')));
    const at = (key) => keys.indexOf(key);
    assert.equal(at('nav.consortium'), at('header.menu') + 1, `${file}: nav.consortium follows the header keys`);
    assert.equal(at('footer.consortium'), at('footer.top') + 1, `${file}: footer.consortium follows the footer keys`);
    assert.equal(at('learn.consortium.link'), at('bibliography.guides') + 1, `${file}: learn.consortium.link follows bibliography.guides`);
    assert.equal(at('home.consortium.action') + 1, at('start.title'), `${file}: home.consortium.* comes before start.title`);
  }
});
