import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

for (const asset of ['canopi-logo.svg', 'data/featured-designs.json', 'data/plant-symbols.json']) assert.ok(existsSync(join(root, asset)), asset);
for (const gone of ['orchard-screenshot.png', 'demo-canopi-720.mp4', 'screenshot-light.png', 'network']) assert.ok(!existsSync(join(root, gone)), `${gone} is retired`);
console.log(`Verified 11 locale pages, their bibliography and contact result pages, v${version} permanent installer links, Web Edition URL, paintings, social images, contact form, network links and static assets.`);
