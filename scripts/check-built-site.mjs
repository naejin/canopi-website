import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { builtTarget, splitHref, subdirectories } from './built-links.mjs';

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
    const { path, hash } = splitHref(href);
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
    // Every food caution box points to the food-safety authority exactly once, at its end.
    const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const authority = escapeHtml(chrome['food.authority'] ?? '');
    for (const [box] of html.matchAll(/<aside class="guide-safety guide-food"[\s\S]*?<\/aside>/g)) {
      assert.ok(authority && box.split(authority).length === 2, `${path}: a food caution box does not name the food-safety authority exactly once`);
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

// ---------- Navigation ----------
// The header: inline links from 640px (Guides, Books, Donate, language, theme), and below 640px a Menu
// panel with every link (Guides, Books, Donate, Discord, Contact, the 11 languages). Docs shows only when
// DOCS_URL is set; Discord is never inline.
const site = readFileSync('src/data/site.ts', 'utf8');
const docsUrl = site.match(/DOCS_URL: string \| null = '([^']+)'/)?.[1];
const discordFor = (lang) => (lang === 'fr' ? 'https://discord.gg/7wq9HsBdsc' : 'https://discord.gg/k7bsyjD9b8');
const localized = (path, lang) => (lang === 'en' ? path : `/${lang}${path}`);
const guidesFor = (lang) => (guideLocales.includes(lang) ? localized('/guides/', lang) : '/guides/');
const guideFor = (slug, lang) => (guideLocales.includes(lang) ? localized(`/guides/${slug}/`, lang) : `/guides/${slug}/`);
const headerOf = (html, from) => {
  const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/)?.[0];
  assert.ok(header, `${from}: site header`);
  const panel = header.match(/<details class="nav-menu" data-nav-menu>[\s\S]*?<\/details>/)?.[0];
  assert.ok(panel, `${from}: the phone Menu panel`);
  return { header, panel, inline: header.replace(panel, '') };
};
const mainOf = (html) => html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const linkTo = (html, href) => new RegExp(`<a\\b[^>]*\\shref="${href.replace(/[.?*+^$()[\]{}|\\]/g, '\\$&')}"`).test(html);
const currentLink = (html, href) => new RegExp(`<a\\b[^>]*\\shref="${href}"[^>]*\\saria-current="page"|<a\\b[^>]*\\saria-current="page"[^>]*\\shref="${href}"`).test(html);
function checkHeader(html, lang, path, from, alternates = locales) {
  const { panel, inline } = headerOf(html, from);
  const books = localized('/bibliography/', lang);
  for (const [part, where] of [[inline, 'inline'], [panel, 'menu']]) {
    assert.ok(linkTo(part, guidesFor(lang)), `${from}: ${where} Guides link`);
    assert.ok(linkTo(part, books), `${from}: ${where} Books link`);
    assert.ok(/<button[^>]*data-open-donate/.test(part), `${from}: ${where} Donate button`);
    // The language list: the same page in each locale, else the English page.
    for (const other of locales) {
      const target = localized(path, alternates.includes(other) ? other : 'en');
      assert.ok(new RegExp(`<a\\b[^>]*\\shref="${target}"[^>]*\\slang="${other}"`).test(part), `${from}: ${where} language link ${other} → ${target}`);
    }
  }
  assert.ok(linkTo(panel, discordFor(lang)), `${from}: menu Discord link`);
  assert.ok(linkTo(panel, `${localized('/', lang)}#contact`), `${from}: menu Contact link`);
  assert.ok(!inline.includes('discord.gg'), `${from}: Discord is not inline in the header`);
  const docs = `>${JSON.parse(readFileSync(`src/i18n/translations/${lang}.json`, 'utf8'))['header.docs']}<`;
  assert.ok(!inline.includes(docs), `${from}: Docs is not inline`);
  if (docsUrl) assert.ok(linkTo(panel, docsUrl) && panel.includes(docs), `${from}: menu Docs link to ${docsUrl}`);
  else assert.ok(!panel.includes(docs), `${from}: no Docs link while DOCS_URL is unset`);
  assert.ok(/data-theme-toggle/.test(inline), `${from}: theme toggle`);
  return { inline, panel };
}
for (const lang of locales) {
  const dir = lang === 'en' ? '' : lang;
  const home = readFileSync(join(root, dir, 'index.html'), 'utf8');
  checkHeader(home, lang, '/', `${lang} home`);
  // "Start here": the three entry guides and the guides index.
  const start = home.match(/<section class="section start-here"[\s\S]*?<\/section>/)?.[0];
  assert.ok(start, `${lang}: the Start here section`);
  for (const slug of ['landrace-gardening', 'will-they-cross', 'saving-seed']) assert.ok(linkTo(start, guideFor(slug, lang)), `${lang}: Start here links to ${guideFor(slug, lang)}`);
  assert.ok(linkTo(start, guidesFor(lang)), `${lang}: Start here links to the guides index`);
  // The guides are English outside en and fr: a note says so, and the English text is marked lang="en".
  const note = start.includes('class="start-here-note"');
  if (guideLocales.includes(lang)) assert.ok(!note, `${lang}: no "in English" note where the guides are in ${lang}`);
  else assert.ok(note && /\slang="en"/.test(start), `${lang}: the "in English" note and lang="en" on the English text`);
  const bibliography = readFileSync(join(root, dir, 'bibliography', 'index.html'), 'utf8');
  const { inline, panel } = checkHeader(bibliography, lang, '/bibliography/', `${lang} bibliography`);
  for (const part of [inline, panel]) {
    assert.ok(currentLink(part, localized('/bibliography/', lang)), `${lang} bibliography: Books is aria-current="page"`);
    assert.ok(!currentLink(part, guidesFor(lang)), `${lang} bibliography: Guides is not current`);
  }
  assert.ok(linkTo(mainOf(bibliography), guidesFor(lang)), `${lang} bibliography: links to the guides`);
}
for (const lang of guideLocales) {
  const index = readFileSync(join(guidesDir(lang), 'index.html'), 'utf8');
  const pages = [[index, '/guides/', `${lang} guides index`], ...guideSlugs.map((slug) => [readFileSync(pageFor(guideFor(slug, lang)), 'utf8'), `/guides/${slug}/`, `${lang} guide ${slug}`])];
  for (const [html, path, from] of pages) {
    const { inline, panel } = checkHeader(html, lang, path, from, guideLocales);
    for (const part of [inline, panel]) {
      assert.ok(currentLink(part, guidesFor(lang)), `${from}: Guides is aria-current="page"`);
      assert.ok(!currentLink(part, localized('/bibliography/', lang)), `${from}: Books is not current`);
    }
  }
  assert.ok(linkTo(mainOf(index), localized('/bibliography/', lang)), `${lang} guides index: links to the bibliography`);
}

for (const asset of ['canopi-logo.svg', 'data/featured-designs.json', 'data/plant-symbols.json']) assert.ok(existsSync(join(root, asset)), asset);
for (const gone of ['orchard-screenshot.png', 'demo-canopi-720.mp4', 'screenshot-light.png', 'network']) assert.ok(!existsSync(join(root, gone)), `${gone} is retired`);
// The consortium tool: one page per locale (French at /fr/guilde/), its alternates, and the installed plant data.
const consortiumPath = (lang) => (lang === 'en' ? '/consortium/' : lang === 'fr' ? '/fr/guilde/' : `/${lang}/consortium/`);
for (const lang of locales) {
  const path = consortiumPath(lang);
  const html = readFileSync(join(root, path, 'index.html'), 'utf8');
  const title = JSON.parse(readFileSync(`src/i18n/translations/${lang}.json`, 'utf8'))['consortium.title'];
  assert.ok(html.includes(`lang="${lang}"`), `${path}: lang`);
  assert.ok(html.includes(`<title>${title}`), `${path}: title ${title}`);
  assert.ok(html.includes('id="ct-app"') && html.includes('id="ct-data"'), `${path}: tool`);
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`).sort();
  assert.deepEqual(alternates, [...locales.map((l) => `${l} https://projectcanopi.com${consortiumPath(l)}`), 'x-default https://projectcanopi.com/consortium/'].sort(), `${path}: hreflang`);
}
assert.ok(!existsSync(join(root, 'fr', 'consortium')), 'no /fr/consortium/: French is /fr/guilde/');
const consortiumData = join(root, 'data', 'consortium');
const consortiumManifest = JSON.parse(readFileSync(join(consortiumData, 'manifest.json'), 'utf8'));
assert.ok(/^[0-9a-f]{64}$/.test(consortiumManifest.canopi_db_sha256) && !/^0+$/.test(consortiumManifest.canopi_db_sha256), 'consortium: canopi_db_sha256 is a real digest');
assert.ok(consortiumManifest.cells.length > 0, 'consortium: cells');
for (const cell of consortiumManifest.cells) assert.ok(existsSync(join(consortiumData, cell.file)), `consortium: ${cell.file}`);
assert.ok(existsSync(join(consortiumData, 'labels.json')), 'consortium: labels.json');

console.log(`Verified 11 locale pages, their bibliography and contact result pages, ${guideSlugs.length} field guide${guideSlugs.length === 1 ? "" : "s"} in en and fr, v${version} permanent installer links, Web Edition URL, paintings, social images, contact form, network links, static assets and the consortium tool in ${locales.length} locales.`);
