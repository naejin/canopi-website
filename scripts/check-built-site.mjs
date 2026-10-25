import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { builtTarget, subdirectories } from './built-links.mjs';

const root = existsSync('dist/client') ? 'dist/client' : 'dist';
const release = readFileSync('src/data/release.ts', 'utf8');
const version = release.match(/CANOPI_VERSION = '([^']+)'/)[1];
const latestDownloadBase = 'https://github.com/opencanopi/canopi/releases/latest/download';
const downloads = [
  'canopi-windows-x64.exe',
  'canopi-windows-x64.msi',
  'canopi-macos-arm64.dmg',
  'canopi-macos-x64.dmg',
  'canopi-linux-x64.AppImage',
  'canopi-linux-x64.deb',
  'RELEASE-SHA256SUMS.txt',
];
const locales = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const assetLinks = (html) => [...html.matchAll(/(?:src|href)="(\/(?:_astro|fonts|hero|og|data|vendor)\/[^"?#]+)"/g)].map((m) => m[1]);

for (const lang of locales) {
  const dir = lang === 'en' ? '' : lang;
  const html = readFileSync(join(root, dir, 'index.html'), 'utf8');
  assert.ok(html.includes(`lang="${lang}"`), lang);
  for (const filename of downloads) {
    assert.ok(html.includes(`${latestDownloadBase}/${filename}`), `${lang}: ${filename}`);
  }
  assert.ok(html.includes('https://web.projectcanopi.com/'), `${lang}: Web Edition URL`);
  assert.ok(!/github\.com\/opencanopi\/canopi\/releases\/download\/v[^/]+\/Canopi_/.test(html), `${lang}: stale versioned installer URL`);
  assert.ok(html.includes('id="download-dialog"'), lang);
  assert.ok(html.includes('data-donate-dialog'), `${lang}: donate dialog`);
  assert.ok(html.includes('https://ecosystemrestorationcommunities.org/'), lang);
  assert.ok(html.includes('https://www.ecosystemrestorationfriends.com/'), lang);
  assert.ok(/<form[^>]*method="post"[^>]*action="\/api\/contact"/.test(html), `${lang}: contact form`);
  assert.ok(!/<video|orchard-screenshot|demo-canopi|design-proposal|screenshot-light\.png|fonts\.googleapis/.test(html), `${lang}: stale source`);
  // The painting for each theme and size, chosen by CSS from these variables.
  for (const variant of ['', '-night', '-1200', '-night-1200']) {
    const path = `/hero/hero-${lang}${variant}.jpg`;
    assert.ok(html.includes(`url(${path})`), `${lang}: painting ${path}`);
    assert.ok(existsSync(join(root, path)), `Missing painting: ${path}`);
  }
  assert.ok(html.includes(`/og/og-${lang}.jpg`), `${lang}: og:image`);
  assert.ok(existsSync(join(root, 'og', `og-${lang}.jpg`)), `${lang}: og image file`);
  const visibleMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.ok(!/\{\w+\}/.test(visibleMarkup), `${lang}: unresolved placeholder`);
  for (const path of assetLinks(html)) assert.ok(existsSync(join(root, path)), `Missing asset: ${path}`);

  // The home page previews the bibliography and links to its own page, which the footer also reaches.
  const bibliographyPath = lang === 'en' ? '/bibliography/' : `/${lang}/bibliography/`;
  assert.ok(html.includes(`href="${bibliographyPath}"`), `${lang}: link to the bibliography page`);
  const bibliography = readFileSync(join(root, dir, 'bibliography', 'index.html'), 'utf8');
  assert.ok(bibliography.includes(`lang="${lang}"`) && bibliography.includes('<h1 id="bibliography-title"'), `${lang}: bibliography page`);
  assert.ok(bibliography.includes('class="bibliography-themes"'), `${lang}: bibliography theme links`);
  assert.ok((bibliography.match(/class="book"/g) ?? []).length > (html.match(/class="book"/g) ?? []).length, `${lang}: the home page shows fewer books than the bibliography page`);
  for (const other of locales) {
    const href = `https://projectcanopi.com${other === 'en' ? '' : `/${other}`}/bibliography/`;
    assert.ok(bibliography.includes(`hreflang="${other}" href="${href}"`), `${lang}: bibliography alternate ${other}`);
  }
  for (const path of assetLinks(bibliography)) assert.ok(existsSync(join(root, path)), `Missing asset: ${path}`);

  for (const result of ['sent', 'failed']) {
    const page = readFileSync(join(root, dir, 'contact', result, 'index.html'), 'utf8');
    assert.ok(page.includes('<meta name="robots" content="noindex">'), `${lang}: ${result} page is noindex`);
    for (const path of assetLinks(page)) assert.ok(existsSync(join(root, path)), `Missing asset: ${path}`);
  }
}

// The contact address and the retired donation platform appear in no served file.
function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(html|js|mjs|css|json|xml|txt)$/.test(name)) yield path;
  }
}
for (const path of files(root)) {
  const text = readFileSync(path, 'utf8');
  assert.ok(!text.includes('contact@projectcanopi.com'), `contact address in ${path}`);
  assert.ok(!/liberapay/i.test(text), `liberapay in ${path}`);
}
assert.ok(!readFileSync(join(root, 'sitemap-0.xml'), 'utf8').includes('/contact/'), 'contact result pages stay out of the sitemap');

// ---------- Field Guides ----------
// English at /guides/, French at /fr/guides/, no other locale (knowledge/decisions/field-guides-architecture.md).
const guideLocales = ['en', 'fr'];
const guidesDir = (lang) => join(root, lang === 'en' ? '' : lang, 'guides');
const guideSlugs = subdirectories(join('src', 'content', 'guides'));
assert.ok(guideSlugs.length, 'at least one guide');
for (const lang of locales.filter((l) => !guideLocales.includes(l))) assert.ok(!existsSync(guidesDir(lang)), `no /${lang}/guides/`);

// A built page for an internal link (scripts/built-links.mjs): /a/b/ → a/b/index.html, /a.txt → a.txt,
// and a slash-less /a/b is an error; #ids must exist on the target.
const pageFor = (pathname) => {
  const { file, error } = builtTarget(root, pathname);
  assert.ok(file, error);
  return file;
};
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
function checkLinks(html, from) {
  for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;
    const [path, hash] = href.split('#');
    if (path && !path.startsWith('/')) assert.fail(`${from}: link to ${href} is relative; use a path from the site root`);
    const target = path ? builtTarget(root, path) : null;
    if (target) assert.ok(target.file, `${from}: ${target.error}`);
    if (hash) assert.ok(ids(target ? readFileSync(target.file, 'utf8') : html).has(decodeURIComponent(hash)), `${from}: link to ${href} has no #${hash}`);
    assert.ok(!new RegExp(`^/(?:${locales.filter((l) => !guideLocales.includes(l)).join('|')})/guides/`).test(path), `${from}: link to ${href}, a guide locale that does not exist`);
  }
}
const scriptsOf = (html) => [...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]).sort();
const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*type="application\/(?:ld\+)?json")(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).sort();

for (const lang of guideLocales) {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  const index = readFileSync(join(guidesDir(lang), 'index.html'), 'utf8');
  assert.ok(index.includes(`lang="${lang}"`) && /<h1\b/.test(index), `${lang}: guides index`);
  checkLinks(index, `${lang} guides index`);
  for (const slug of guideSlugs) {
    const path = `${prefix}/guides/${slug}/`;
    const html = readFileSync(pageFor(path), 'utf8');
    assert.ok(index.includes(`href="${path}"`), `${lang}: the index lists ${slug}`);
    // hreflang: exactly en, fr and x-default.
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`).sort();
    assert.deepEqual(alternates, [
      `en https://projectcanopi.com/guides/${slug}/`,
      `fr https://projectcanopi.com/fr/guides/${slug}/`,
      `x-default https://projectcanopi.com/guides/${slug}/`,
    ], `${path}: hreflang`);
    assert.ok(html.includes('<meta property="og:type" content="article">'), `${path}: og:type article`);
    assert.ok(!html.includes('"SoftwareApplication"'), `${path}: no SoftwareApplication JSON-LD`);
    assert.ok(html.includes('"@type":"Article"'), `${path}: Article JSON-LD`);
    // The JSON-LD cites the same edition the page shows under "Go deeper" (the French one on /fr/).
    const article = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((d) => d['@type'] === 'Article');
    for (const book of article.citation) {
      const shown = book.name.split(/\s*(?::\s+|：\s*)/)[0];
      assert.ok(html.includes(`>${shown}<`), `${path}: JSON-LD cites "${book.name}", not the edition the page shows`);
    }
    // Every id on the page is unique (checkboxes, glossary notes, headings).
    const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const twice = allIds.find((id, i) => allIds.indexOf(id) !== i);
    assert.ok(!twice, `${path}: id "${twice}" is used twice`);
    assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(html), `${path}: outside fonts`);
    assert.ok(/<h1\b/.test(html) && html.includes('class="guide-glance"'), `${path}: title and glance`);
    assert.ok(html.includes(`href="/bibliography/#`) || html.includes(`href="/fr/bibliography/#`), `${path}: cites a bibliography entry`);
    for (const asset of assetLinks(html)) assert.ok(existsSync(join(root, asset)), `Missing asset: ${asset}`);
    checkLinks(html, path);
    // A guide without an interactive component ships no script beyond the site chrome the index page has.
    if (!html.includes('data-guide-interactive')) {
      assert.deepEqual(scriptsOf(html), scriptsOf(index), `${path}: diagram-only guide ships extra scripts`);
      assert.deepEqual(inlineScripts(html), inlineScripts(index), `${path}: diagram-only guide ships extra inline scripts`);
    }
    // Diagrams carry text only in <text> and <title>: a stray "0" from a falsy number in JSX shows up here.
    for (const [svg] of html.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) {
      const stray = svg.replace(/<(text|title|desc)\b[\s\S]*?<\/\1>/g, '').match(/>\s*([^<\s][^<]*?)\s*</);
      assert.ok(!stray, `${path}: stray text "${stray?.[1]}" inside an SVG diagram`);
    }
    // A glossary term's first use is a button (shown below 960px) described by its definition text, not by
    // the whole popover with its Close button; beside it, the same word as plain text (shown at >=960px,
    // where the button is display: none, so no engine can focus it or open the margin note as a popover).
    for (const [button, id] of html.matchAll(/<button[^>]*class="guide-term guide-term-control"[^>]*popovertarget="guide-note-([^"]+)"[^>]*>/g)) {
      assert.ok(button.includes(`aria-describedby="guide-note-${id}-def"`), `${path}: term "${id}" is not described by its definition text`);
      assert.ok(html.includes(`id="guide-note-${id}-def"`), `${path}: term "${id}" has no definition text element`);
      assert.match(html, new RegExp(`</button><span class="guide-term guide-term-word" hidden>`), `${path}: term "${id}" has no plain-word twin`);
    }
    assert.ok(!/<button[^>]*class="guide-term"/.test(html), `${path}: a glossary term button without its plain-word twin`);
    // Crop tables: every cell names its column (phones show label/value rows, no sideways scroll), and
    // the "in Lofthouse's experience" note names only columns the table shows.
    const chrome = JSON.parse(readFileSync(new URL(`../src/i18n/guides/${lang}.json`, import.meta.url), 'utf8'));
    for (const [table] of html.matchAll(/<table class="guide-table guide-crop-table"[\s\S]*?<\/table>/g)) {
      const heads = [...table.match(/<thead[\s\S]*?<\/thead>/)[0].matchAll(/<th\b[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
      assert.ok(!/<td(?![^>]*\sdata-label=")/.test(table), `${path}: a crop table cell without data-label`);
      const note = table.match(/<span class="guide-table-note">([^<]*)<\/span>/)?.[1] ?? '';
      for (const key of ['crop.crossing', 'crop.ease', 'crop.hybrids']) {
        const head = chrome[key];
        if (note.toLowerCase().includes(head.toLowerCase())) assert.ok(heads.includes(head), `${path}: the crop table note names "${head}", a column it does not show`);
      }
    }
    // Every glossary term note and step is rendered server-side (readable without JavaScript).
    assert.ok(!/<(?:Term|Note|Checklist)\b/.test(html), `${path}: unrendered MDX component`);
  }
}

// The bibliography links each cited book to its guides: English and French guides, else the English one.
for (const lang of locales) {
  const bibliography = readFileSync(join(root, lang === 'en' ? '' : lang, 'bibliography', 'index.html'), 'utf8');
  const prefix = lang === 'fr' ? '/fr' : '';
  assert.ok(bibliography.includes(`href="${prefix}/guides/landrace-gardening/"`), `${lang}: the bibliography links Landrace Gardening to its guide`);
  assert.ok(bibliography.includes('id="landrace-gardening"'), `${lang}: the bibliography has an anchor per book id`);
  checkLinks(bibliography, `${lang} bibliography`);
}
// The header and the footer reach the guides on every locale's home page.
for (const lang of locales) {
  const html = readFileSync(join(root, lang === 'en' ? '' : lang, 'index.html'), 'utf8');
  const href = lang === 'fr' ? '/fr/guides/' : '/guides/';
  assert.ok((html.match(new RegExp(`href="${href}"`, 'g')) ?? []).length >= 2, `${lang}: header and footer link to ${href}`);
}

for (const asset of ['canopi-logo.svg', 'data/featured-designs.json', 'data/plant-symbols.json']) assert.ok(existsSync(join(root, asset)), asset);
for (const gone of ['orchard-screenshot.png', 'demo-canopi-720.mp4', 'screenshot-light.png', 'network']) assert.ok(!existsSync(join(root, gone)), `${gone} is retired`);
console.log(`Verified 11 locale pages, their bibliography and contact result pages, ${guideSlugs.length} field guide${guideSlugs.length === 1 ? "" : "s"} in en and fr, v${version} permanent installer links, Web Edition URL, paintings, social images, contact form, network links and static assets.`);
