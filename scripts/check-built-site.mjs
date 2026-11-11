import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { builtTarget, splitHref, subdirectories } from './built-links.mjs';
import { tryListProblem, verifyInstall, INDEX_PATH } from './install-consortium.mjs';
import { consortiumPath } from '../src/i18n/consortium-path.js';
import { parseTryReferences, TRY_CITATION, TRY_DOI } from '../src/lib/try-references.js';
import { parseSourceCredits, shownCredits } from '../src/lib/source-credits.js';
import { createHash } from 'node:crypto';
import { safeHref } from '../src/lib/safe-href.js';
import { gzipSync } from 'node:zlib';
import { isSqliteGlue, moduleGraph } from './built-modules.mjs';

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
// The TRY list: the file the build read, checked against its meta, and the meta against the entry of
// the export that is installed (the list's one owner).
const tryMeta = JSON.parse(readFileSync('src/data/try_references.meta.json', 'utf8'));
const tryBytes = readFileSync('src/data/try_references.tsv');
assert.equal(tryListProblem(tryBytes, tryMeta), null, 'try_references.tsv matches its meta');
// The installer's index (src/data/consortium-index.json, design check A4): what the build read of the
// installed export. It is never served.
const consortiumIndex = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
assert.deepEqual(tryMeta, consortiumIndex.try_references, 'try_references.meta.json is the installed index entry');
const tryRows = parseTryReferences(tryBytes.toString('utf8'), tryMeta);
// The source credits: in src/data/ exactly when the installed export lists them, and its bytes.
assert.match(consortiumIndex.release_id ?? '', /^r-[0-9a-f]{16}$/, 'the installed index names its data release');
const creditsPath = 'src/data/source_credits.tsv';
assert.equal(existsSync(creditsPath), consortiumIndex.source_credits !== undefined, 'source_credits.tsv is in src/data/ exactly when the installed export lists it');
const credits = existsSync(creditsPath) ? shownCredits(parseSourceCredits(readFileSync(creditsPath, 'utf8'))) : { used: [], held: [] };
if (existsSync(creditsPath)) assert.equal(createHash('sha256').update(readFileSync(creditsPath)).digest('hex'), consortiumIndex.source_credits.sha256, 'source_credits.tsv is the installed export\'s');
const creditRows = [...credits.used, ...credits.held];
// A rendered field back to its text: the tags go, and the entities Astro writes become characters once.
const plainText = (html) => html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[name]);
const assetLinks = (html) => [...html.matchAll(/(?:src|href)="(\/(?:_astro|fonts|hero|home|og|data)\/[^"?#]+)"/g)].map((m) => m[1]);

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

  // /data-sources/: the TRY citation and every source row, each as delivered, in every locale.
  const dataSourcesPath = lang === 'en' ? '/data-sources/' : `/${lang}/data-sources/`;
  const footerOf = (page) => page.slice(page.indexOf('<footer'));
  assert.ok(footerOf(html).includes(`href="${dataSourcesPath}"`), `${lang}: footer link to the data sources page`);
  const dataSources = readFileSync(join(root, dir, 'data-sources', 'index.html'), 'utf8');
  assert.ok(dataSources.includes(`<html lang="${lang}"`) && dataSources.includes('<h1 id="data-sources-title"'), `${lang}: data sources page`);
  assert.ok(footerOf(dataSources).includes(`href="${dataSourcesPath}"`), `${lang}: data sources page footer link`);
  assert.ok(dataSources.includes(`${TRY_CITATION} <a href="${TRY_DOI}" rel="noopener">${TRY_DOI}</a>`), `${lang}: TRY citation with its DOI link`);
  const trySection = dataSources.match(/<section class="try"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.ok(trySection.includes(TRY_CITATION), `${lang}: the TRY section`);
  assert.ok(!trySection.includes('CC BY'), `${lang}: no CC BY claim for TRY`);
  // The credits: every used and held source, never an internal one.
  const creditNames = [...dataSources.matchAll(/<li class="credit-row">\s*<span class="credit-name"[^>]*>(.*?)<\/span>/g)].map((m) => plainText(m[1]));
  assert.deepEqual(creditNames, creditRows.map((row) => row.name), `${lang}: the used and held sources, in order`);
  assert.equal((dataSources.match(/class="credit-row"/g) ?? []).length, creditRows.length, `${lang}: one credit row per used or held source`);
  for (const other of locales) {
    const href = `https://projectcanopi.com${other === 'en' ? '' : `/${other}`}/data-sources/`;
    assert.ok(dataSources.includes(`hreflang="${other}" href="${href}"`), `${lang}: data sources alternate ${other}`);
  }
  const rendered = [...dataSources.matchAll(/<li class="try-row"><span class="try-dataset">(.*?)<\/span><span class="try-custodian">(.*?)<\/span><span class="try-reference">(.*?)<\/span><\/li>/g)];
  assert.equal((dataSources.match(/class="try-row"/g) ?? []).length, tryRows.length, `${lang}: rendered data source rows`);
  assert.equal(rendered.length, tryRows.length, `${lang}: rendered data source rows, each in three fields`);
  rendered.forEach((match, index) => {
    const row = tryRows[index];
    assert.deepEqual(match.slice(1).map(plainText), [row.dataset, row.custodian, row.reference], `${lang}: data source row ${index + 1}`);
    for (const [, href] of match[3].matchAll(/<a href="([^"]*)"/g)) assert.ok(safeHref(plainText(href)), `${lang}: data source link ${href}`);
  });
  for (const path of assetLinks(dataSources)) assert.ok(existsSync(join(root, path)), `Missing asset: ${path}`);

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
const consortiumNames = new Map(consortiumIndex.climates.map((zone) => [zone.toLowerCase(), new Set(consortiumIndex.names[zone])]));
const mainOf = (html) => html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
const linkTo = (html, href) => new RegExp(`<a\\b[^>]*\\shref="${href.replace(/[.?*+^$()[\]{}|\\]/g, '\\$&')}"`).test(html);
const currentLink = (html, href) => new RegExp(`<a\\b[^>]*\\shref="${href}"[^>]*\\saria-current="page"|<a\\b[^>]*\\saria-current="page"[^>]*\\shref="${href}"`).test(html);
// path: the page's path in every locale ('/bibliography/').
function checkHeader(html, lang, path, from, alternates = locales) {
  const pathIn = (l) => localized(path, l);
  const { panel, inline } = headerOf(html, from);
  const books = localized('/bibliography/', lang);
  for (const [part, where] of [[inline, 'inline'], [panel, 'menu']]) {
    assert.ok(linkTo(part, guidesFor(lang)), `${from}: ${where} Guides link`);
    assert.ok(linkTo(part, books), `${from}: ${where} Books link`);
    assert.ok(/<button[^>]*data-open-donate/.test(part), `${from}: ${where} Donate button`);
    assert.ok(linkTo(part, consortiumPath(lang)), `${from}: ${where} consortium tool link`);
    // The language list: the same page in each locale, else the English page.
    for (const other of locales) {
      const target = pathIn(alternates.includes(other) ? other : 'en');
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
  // The hero: its proof line and what each edition is for.
  assert.ok(/class="hero-proof"/.test(home) && /class="hero-editions"/.test(home), `${lang}: the hero's proof line and editions note`);
  // What the app does: captures in this language, one per theme, and no sign of the old map.
  const what = home.match(/<section class="section what"[\s\S]*?<\/section>/)?.[0];
  assert.ok(what, `${lang}: the What you can do section`);
  for (const name of ['map', 'map-phone', 'catalog', 'calendar']) for (const theme of ['light', 'dark']) {
    const path = `/home/${lang}/${name}-${theme}.webp`;
    assert.ok(what.includes(path) && existsSync(join(root, path)), `${lang}: ${path}`);
  }
  assert.ok(!home.includes('data-finder-map') && !existsSync(join(root, 'vendor')), `${lang}: the design map is gone`);
  // The list of designs: its slot and the string the script needs.
  assert.ok(/data-design-list/.test(home) && home.includes('design.choiceMeta'), `${lang}: the design list and its string`);
  // Ways in: the entry guides, the guides index and the consortium tool.
  const learn = home.match(/<section class="section learn"[\s\S]*?<\/section>/)?.[0];
  assert.ok(learn, `${lang}: the Learn and try section`);
  for (const slug of ['food-forest', 'living-soil', 'landrace-gardening']) assert.ok(linkTo(learn, guideFor(slug, lang)), `${lang}: the section links to ${guideFor(slug, lang)}`);
  assert.ok(linkTo(learn, guidesFor(lang)), `${lang}: the section links to the guides index`);
  assert.ok(linkTo(learn, consortiumPath(lang)), `${lang}: the section links to ${consortiumPath(lang)}`);
  assert.ok(home.indexOf('class="section what"') < home.indexOf('class="section featured"') && home.indexOf('class="section featured"') < home.indexOf('class="section learn"'), `${lang}: the sections keep their order`);
  assert.ok(linkTo(home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '', consortiumPath(lang)), `${lang}: the footer links to the consortium tool`);
  // The guides are English outside en and fr: a note says so, and the English text is marked lang="en".
  const note = learn.includes(`>${JSON.parse(readFileSync(`src/i18n/translations/${lang}.json`, 'utf8'))['start.inEnglish']}<`);
  if (guideLocales.includes(lang)) assert.ok(!note, `${lang}: no "in English" note where the guides are in ${lang}`);
  else assert.ok(note && /\slang="en"/.test(learn), `${lang}: the "in English" note and lang="en" on the English text`);
  const bibliography = readFileSync(join(root, dir, 'bibliography', 'index.html'), 'utf8');
  const { inline, panel } = checkHeader(bibliography, lang, '/bibliography/', `${lang} bibliography`);
  for (const part of [inline, panel]) {
    assert.ok(currentLink(part, localized('/bibliography/', lang)), `${lang} bibliography: Books is aria-current="page"`);
    assert.ok(!currentLink(part, guidesFor(lang)), `${lang} bibliography: Guides is not current`);
  }
  assert.ok(linkTo(mainOf(bibliography), guidesFor(lang)), `${lang} bibliography: links to the guides`);
  assert.ok(linkTo(mainOf(bibliography), consortiumPath(lang)), `${lang} bibliography: mentions the consortium tool`);
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
  assert.ok(linkTo(mainOf(index), consortiumPath(lang)), `${lang} guides index: mentions the consortium tool`);
  // Guide presets open the tool with a plant placed in the climate they name.
  let presets = 0;
  for (const [html, , from] of pages) {
    for (const [, href] of mainOf(html).matchAll(/<a\b[^>]*\shref="([^"]*\?[^"]*plant=[^"]*)"/g)) {
      const { path: hrefPath, query } = splitHref(href);
      assert.equal(hrefPath, consortiumPath(lang), `${from}: preset link goes to the tool`);
      const params = new URLSearchParams(query), climate = params.get('climate');
      assert.ok(consortiumNames.has(climate), `${from}: preset climate ${climate} is a beta climate`);
      assert.ok(consortiumNames.get(climate).has(params.get('plant')), `${from}: ${params.get('plant')} is placed in ${climate}`);
      presets++;
    }
  }
  assert.ok(presets > 0, `${lang}: guides carry consortium preset links`);
}

for (const asset of ['canopi-logo.svg', 'data/featured-designs.json', 'data/plant-symbols.json']) assert.ok(existsSync(join(root, asset)), asset);
for (const gone of ['orchard-screenshot.png', 'demo-canopi-720.mp4', 'screenshot-light.png', 'network']) assert.ok(!existsSync(join(root, gone)), `${gone} is retired`);
// The consortium tool: one page per locale (/consortium/ in every language, French included), its alternates, and the installed plant data.
for (const lang of locales) {
  const path = consortiumPath(lang);
  const html = readFileSync(join(root, path, 'index.html'), 'utf8');
  const words = JSON.parse(readFileSync(`src/i18n/translations/${lang}.json`, 'utf8'));
  const title = words['consortium.title'];
  assert.ok(html.includes(`lang="${lang}"`), `${path}: lang`);
  // The data release under the tool, and the same id and database handed to the island (#ct-data).
  const releaseLine = words['consortium.release'].replace('{id}', consortiumIndex.release_id);
  assert.ok(html.includes(`<p class="tool-release">${releaseLine}</p>`), `${path}: the release line names ${consortiumIndex.release_id}`);
  assert.ok(html.includes(`<title>${title}`), `${path}: title ${title}`);
  assert.ok(html.includes('id="ct-root"') && html.includes('id="ct-data"'), `${path}: tool`);
  const pageData = JSON.parse(html.match(/<script type="application\/json" id="ct-data">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
  assert.equal(pageData?.releaseId, consortiumIndex.release_id, `${path}: the island gets the release id`);
  assert.deepEqual(pageData?.db, { url: consortiumIndex.files[0].url, sha256: consortiumIndex.files[0].sha256, bytes: consortiumIndex.files[0].bytes, rawSha256: consortiumIndex.files[0].raw_sha256, rawBytes: consortiumIndex.files[0].raw_bytes }, `${path}: the island gets the installed database`);
  assert.deepEqual(pageData?.climates, consortiumIndex.climates.map((c) => c.toLowerCase()), `${path}: the island gets the installed climates`);
  // P6: with JavaScript off the page still names itself and links a guide; the loading line is there to replace.
  assert.ok(/<noscript>[\s\S]*?<a [^>]*href="[^"]*\/guides\/[^"]+"[\s\S]*?<\/noscript>/.test(html), `${path}: noscript links a guide`);
  assert.ok(html.includes(`<p class="tool-lede">`) && html.includes('aria-busy="true"'), `${path}: lede and loading line`);
  assert.ok(currentLink(html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '', path), `${path}: the header marks the tool as the current page`);
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`).sort();
  assert.deepEqual(alternates, [...locales.map((l) => `${l} https://projectcanopi.com${consortiumPath(l)}`), 'x-default https://projectcanopi.com/consortium/'].sort(), `${path}: hreflang`);
  // prepush m3: its own links (the language menu, the noscript guide link, the contact anchor) lead to
  // built pages and ids; a language link to a redirect (/fr/consortium/) fails here.
  checkHeader(html, lang, '/consortium/', path);
  checkLinks(html, path);
  for (const asset of assetLinks(html)) assert.ok(existsSync(join(root, asset)), `${path}: missing asset ${asset}`);
}
// Owner, 2026-10-29: French is /fr/consortium/ too; /fr/guilde/ was never published, so nothing builds it
// and no built page links to it.
assert.ok(!existsSync(join(root, 'fr', 'guilde')), 'no /fr/guilde/: French is /fr/consortium/');
{
  const stack = [root], linking = [];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { if (p !== join(root, 'app')) stack.push(p); } else if (e.name.endsWith('.html') && /\/(?:fr\/)?guilde\b/.test(readFileSync(p, 'utf8'))) linking.push(p.slice(root.length));
    }
  }
  assert.deepEqual(linking, [], 'no built page links to /fr/guilde/');
}
// prepush m2: the installed plant data as served, by the installer's own checks against the index:
// format 4, each database byte for byte by its sha256, gzip, the size limits, every photo of the index
// present and nothing else; a real canopi_db_sha256 (never the fixture's zeros); no v1 file left.
assert.notEqual(consortiumIndex.canopi_db_sha256, '0'.repeat(64), 'consortium: a real install, never the fixture');
const consortiumInstall = verifyInstall(join(root, 'data', 'consortium'), consortiumIndex);
assert.ok(consortiumInstall.databases > 0 && consortiumInstall.images > 0, 'consortium: database and photos');
for (const gone of ['manifest.json', 'labels.json', 'SHA256SUMS', 'tropical.json', 'temperate.json', 'mediterranean.json', 'consortium-index.json']) assert.ok(!existsSync(join(root, 'data', 'consortium', gone)), `consortium: ${gone} is not served`);

// Review B4: the build ships exactly one sqlite wasm, and neither helper of sqlite-wasm's browser
// build (the Worker #1 script, the OPFS proxy) that astro.config.mjs keeps Vite from emitting.
{
  const assets = readdirSync(join(root, '_astro'));
  const wasm = assets.filter((f) => f.endsWith('.wasm'));
  assert.equal(wasm.length, 1, `one wasm in the build: ${wasm.join(', ') || 'none'}`);
  assert.match(wasm[0], /^sqlite3\.[\w-]+\.wasm$/, 'the one wasm is sqlite3');
  const helpers = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (join(dir, e.name) !== join(root, 'app')) stack.push(join(dir, e.name)); } else if (/sqlite3-worker1|opfs-async-proxy/.test(e.name)) helpers.push(join(dir, e.name).slice(root.length));
    }
  }
  assert.deepEqual(helpers, [], 'no sqlite-wasm worker or OPFS proxy file is shipped');
}
// Design check §8 and A2 (review C8): the island's JavaScript, followed through the import graph of
// the built page (module scripts, modulepreload links, static, dynamic and preload-helper imports),
// without the chunk holding the sqlite-wasm glue, stays under 60 KB gzip -9. Every locale page
// preloads the database (as=fetch, crossorigin, so the island's fetch reuses it) and modulepreloads
// the island's chunks, the glue included, so they arrive beside the page script.
const ISLAND_BUDGET = 60 * 1024;
let islandBytes = 0;
for (const lang of locales) {
  const path = `${consortiumPath(lang)}index.html`;
  const html = readFileSync(join(root, path), 'utf8');
  const graph = moduleGraph(root, html);
  const glue = [...graph].filter(([, m]) => isSqliteGlue(m.code)).map(([p]) => p);
  assert.equal(glue.length, 1, `${path}: one chunk holds the sqlite-wasm glue (${glue.join(', ')})`);
  const total = [...graph].filter(([p]) => !glue.includes(p)).reduce((n, [, m]) => n + gzipSync(m.code, { level: 9 }).length, 0);
  assert.ok(total < ISLAND_BUDGET, `${path}: island JS is ${(total / 1024).toFixed(1)} KB gzip, the budget is 60 KB`);
  islandBytes = total;
  const preloads = [...html.matchAll(/<link\b[^>]*\brel="(preload|modulepreload)"[^>]*>/g)].map(([tag, rel]) => ({ rel, tag, href: tag.match(/\bhref="([^"]+)"/)?.[1] }));
  const db = preloads.find((l) => l.href === consortiumIndex.files[0].url);
  assert.ok(db && db.rel === 'preload' && /\bas="fetch"/.test(db.tag) && /\bcrossorigin\b/.test(db.tag), `${path}: <link rel="preload" as="fetch" crossorigin> for the database`);
  const modules = new Set(preloads.filter((l) => l.rel === 'modulepreload').map((l) => l.href));
  for (const p of graph.keys()) if (!html.includes(`src="${p}"`)) assert.ok(modules.has(p), `${path}: modulepreload ${p}`);
}
console.log(`Consortium island JS: ${(islandBytes / 1024).toFixed(1)} KB gzip (budget 60 KB, sqlite glue excluded).`);

console.log(`Verified 11 locale pages, their bibliography, data sources (${creditRows.length} credited sources, ${tryRows.length} TRY rows each) and contact result pages, ${guideSlugs.length} field guide${guideSlugs.length === 1 ? "" : "s"} in en and fr, v${version} permanent installer links, Web Edition URL, paintings, social images, contact form, network links, static assets and the consortium tool in ${locales.length} locales.`);
