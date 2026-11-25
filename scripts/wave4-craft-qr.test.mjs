import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeQrSvg } from '../src/lib/qr-svg.ts';
import { cardSkillOf, DOMAIN_TO_VIGNETTE, GUIDE_VIGNETTES } from '../src/lib/guide-vignettes.ts';
import { boardToneForTheme, spineTitleOf } from '../src/data/bibliography-boards.ts';
import { PLANT_SOURCE_GIVES, TOOL_SOURCE_GIVES } from '../src/data/source-ledger-descriptions.ts';

test('encodeQrSvg produces valid SVG paths for short and long palette URLs', () => {
  const shortQr = encodeQrSvg('https://projectcanopi.com/palette/', 2);
  assert.equal(shortQr.version, 3);
  assert.equal(shortQr.size, 29);
  assert.equal(shortQr.viewBoxSize, 33);
  assert.ok(shortQr.pathD.startsWith('M2,2h7v1h-7z'), 'top-left finder pattern starts at (2,2)');

  const longUrl = 'https://projectcanopi.com/palette/?p=prunus-persica,quercus-pubescens,medicago-sativa,allium-cepa,ruta-graveolens,satureja-montana,onobrychis-viciifolia,cyclamen-hederifolium&o=43.60,3.88&k=FR';
  const longQr = encodeQrSvg(longUrl, 2);
  assert.ok(longQr.version >= 6 && longQr.version <= 10, `expected v6..v10, got v${longQr.version}`);
  assert.equal(longQr.viewBoxSize, longQr.size + 4);
  assert.ok(longQr.pathD.length > 500);
});

test('B2 guide vignettes cover all 7 domains and normalize skill tiers', () => {
  const domains = ['seeds', 'crops', 'soil', 'perennials', 'seasons', 'pests', 'kitchen'];
  for (const d of domains) {
    const kind = DOMAIN_TO_VIGNETTE[d];
    assert.ok(GUIDE_VIGNETTES[kind]?.length >= 4, `missing vignette primitives for ${d}`);
  }
  assert.equal(cardSkillOf('cooking-dry-beans', [], 'en'), 'Beginner');
  assert.equal(cardSkillOf('cooking-dry-beans', [], 'fr'), 'Débutant');
  assert.equal(cardSkillOf('nixtamalization', [], 'en'), 'Advanced');
  assert.equal(cardSkillOf('nixtamalization', [], 'fr'), 'Avancé');
  assert.equal(cardSkillOf('compost-tea', [{ label: 'Skill', value: 'Experienced' }], 'en'), 'Advanced');
});

test('B3 bibliography board tones never use green (plant-data only) and trim long titles', () => {
  const allowed = new Set(['ochre', 'umber', 'clay', 'slate']);
  for (const theme of ['agroecology', 'seeds', 'soil', 'indigenous-knowledge', 'forests', 'biodiversity', 'plants', 'water', 'growing-structures']) {
    assert.ok(allowed.has(boardToneForTheme(theme)), `unexpected board tone for ${theme}`);
  }
  assert.equal(spineTitleOf('foret-primaire', 'Pour une forêt primaire en Europe de l’Ouest'), 'Pour une forêt primaire');
  assert.equal(spineTitleOf(undefined, 'Collaborer avec les bactéries et autres micro-organismes'), 'Collaborer avec les bactéries');
});

test('B4 source ledger descriptions cover all 52 plant sources and all 20 tool sources', () => {
  assert.equal(Object.keys(PLANT_SOURCE_GIVES).length, 52);
  assert.equal(Object.keys(TOOL_SOURCE_GIVES).length, 20);
  assert.ok(TOOL_SOURCE_GIVES.soilgrids.includes('pH'));
  assert.ok(TOOL_SOURCE_GIVES.wgsrpd.includes('native'));
});
