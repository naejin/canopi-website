import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = existsSync('dist/client') ? 'dist/client' : 'dist';
const release = readFileSync('src/data/release.ts', 'utf8');
const version = release.match(/CANOPI_VERSION = '([^']+)'/)[1];
const suffixes = ['x64-setup.exe', 'x64_en-US.msi', 'aarch64.dmg', 'x64.dmg', 'amd64.AppImage', 'amd64.deb'];
for (const lang of ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru']) {
  const html = readFileSync(join(root, lang === 'en' ? '' : lang, 'index.html'), 'utf8');
  assert.ok(html.includes(`lang="${lang}"`), lang);
  for (const suffix of suffixes) {
    assert.ok(html.includes(`https://github.com/naejin/canopi/releases/download/v${version}/Canopi_${version}_${suffix}`), `${lang}: ${suffix}`);
  }
  assert.ok(html.includes('id="download-dialog"'), lang);
  assert.ok(html.includes('poster="/orchard-screenshot.png"'), lang);
  assert.ok(html.includes('https://ecosystemrestorationcommunities.org/'), lang);
  assert.ok(html.includes('https://www.ecosystemrestorationfriends.com/'), lang);
  assert.ok(!/design-proposal|screenshot-light\.png|fonts\.googleapis/.test(html), `${lang}: stale source`);
  const visibleMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.ok(!/\{(?:platform|instruction)\}/.test(visibleMarkup), `${lang}: unresolved placeholder`);
  for (const [, path] of html.matchAll(/(?:src|href)="(\/(?:_astro|fonts)\/[^"?#]+)"/g)) {
    assert.ok(existsSync(join(root, path)), `Missing asset: ${path}`);
  }
}
for (const asset of ['orchard-screenshot.png', 'demo-canopi-720.mp4', 'canopi-logo.svg']) assert.ok(existsSync(join(root, asset)), asset);
assert.ok(!existsSync(join(root, 'screenshot-light.png')));
assert.ok(!existsSync(join(root, 'network')));
console.log(`Verified 11 locale pages, v${version} installers, new network links and static assets.`);
