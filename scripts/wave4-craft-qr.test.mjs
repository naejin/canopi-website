import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeQrSvg } from '../src/lib/qr-svg.ts';
import { cardSkillOf, DOMAIN_TO_VIGNETTE, GUIDE_VIGNETTES } from '../src/lib/guide-vignettes.ts';
import { boardToneForTheme, spineTitleOf } from '../src/data/bibliography-boards.ts';
import { PLANT_SOURCE_GIVES, TOOL_SOURCE_GIVES } from '../src/data/source-ledger-descriptions.ts';

// Independent ISO/IEC 18004 ECC Level L QR decoder (Versions 1..40) for round-trip verification.
// Checks finder patterns, timing patterns, dark module, format BCH, version BCH (v7+),
// alignment pattern layout, unmasking, deinterleaving, Reed-Solomon syndromes === 0, and UTF-8 Byte payload.
const EC_L = [
  [7, 1], [10, 1], [15, 1], [20, 1], [26, 1],
  [18, 2], [20, 2], [24, 2], [30, 2], [18, 4],
  [20, 4], [24, 4], [26, 4], [30, 4], [22, 6],
  [24, 6], [28, 6], [30, 6], [28, 7], [28, 8],
  [28, 8], [28, 9], [30, 9], [30, 10], [26, 12],
  [28, 12], [30, 12], [30, 13], [30, 14], [30, 15],
  [30, 16], [30, 17], [30, 18], [30, 19], [30, 19],
  [30, 20], [30, 21], [30, 22], [30, 24], [30, 25],
];
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
const bchFmt = (d) => {
  let r = d;
  for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >> 9) * 0x537);
  return ((d << 10) | r) ^ 0x5412;
};
const bchVer = (v) => {
  let r = v;
  for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >> 11) * 0x1f25);
  return (v << 12) | r;
};
const alignPos = (v) => {
  if (v === 1) return [];
  const k = Math.floor(v / 7) + 2;
  const last = v * 4 + 10;
  if (k === 2) return [6, last];
  const step = v === 32 ? 26 : Math.ceil((last - 6) / (k - 1) / 2) * 2;
  const arr = [6];
  for (let p = last; arr.length < k; p -= step) arr.splice(1, 0, p);
  return arr;
};

function decodeQrSvg(qr) {
  const n = qr.size;
  const q = qr.quiet;
  const ver = (n - 17) / 4;
  assert.equal(ver, qr.version);
  const M = Array.from({ length: n }, () => new Uint8Array(n));
  for (const m of qr.pathD.matchAll(/M(\d+),(\d+)h(\d+)v1h-\d+z/g)) {
    const x = Number(m[1]) - q;
    const y = Number(m[2]) - q;
    const w = Number(m[3]);
    for (let k = 0; k < w; k++) M[y][x + k] = 1;
  }
  const F = Array.from({ length: n }, () => new Uint8Array(n));
  const mark = (x0, y0, w, h) => {
    for (let y = Math.max(0, y0); y < Math.min(n, y0 + h); y++) {
      for (let x = Math.max(0, x0); x < Math.min(n, x0 + w); x++) F[y][x] = 1;
    }
  };
  mark(0, 0, 9, 9);
  mark(n - 8, 0, 8, 9);
  mark(0, n - 8, 9, 8);
  for (let i = 0; i < n; i++) { F[6][i] = 1; F[i][6] = 1; }
  const al = alignPos(ver);
  for (let i = 0; i < al.length; i++) {
    for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      mark(al[j] - 2, al[i] - 2, 5, 5);
    }
  }
  if (ver >= 7) { mark(n - 11, 0, 3, 6); mark(0, n - 11, 6, 3); }

  // Verify finders, timing, dark module
  const finderOk = (x0, y0) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        const exp = d === 0 || d === 1 || d === 3 ? 1 : 0;
        if (M[y0 + dy][x0 + dx] !== exp) return false;
      }
    }
    return true;
  };
  assert.ok(finderOk(0, 0) && finderOk(n - 7, 0) && finderOk(0, n - 7), `v${ver}: finder pattern`);
  for (let i = 8; i < n - 8; i++) assert.equal(M[6][i], i % 2 === 0 ? 1 : 0, `v${ver}: timing`);
  assert.equal(M[n - 8][8], 1, `v${ver}: dark module`);

  // Verify both format info copies
  const g = (x, y) => M[y][x];
  let bits1 = 0;
  for (let i = 0; i < 6; i++) bits1 |= g(8, i) << i;
  bits1 |= g(8, 7) << 6;
  bits1 |= g(8, 8) << 7;
  bits1 |= g(7, 8) << 8;
  for (let i = 9; i < 15; i++) bits1 |= g(14 - i, 8) << i;
  let bits2 = 0;
  for (let i = 0; i < 8; i++) bits2 |= g(n - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) bits2 |= g(8, n - 15 + i) << i;
  assert.equal(bits1, bits2, `v${ver}: format copies match`);
  let fmt = -1;
  for (let d = 0; d < 32; d++) if (bchFmt(d) === bits1) fmt = d;
  assert.ok(fmt >= 0, `v${ver}: valid format BCH`);
  assert.equal(fmt >> 3, 1, `v${ver}: ECC L`);
  const mask = fmt & 7;
  assert.equal(mask, 0);

  // Verify version info for v7+
  if (ver >= 7) {
    const vb = bchVer(ver);
    for (let i = 0; i < 18; i++) {
      const bit = (vb >> i) & 1;
      const a = n - 11 + (i % 3);
      const b = Math.floor(i / 3);
      assert.equal(g(a, b), bit, `v${ver}: version info copy 1`);
      assert.equal(g(b, a), bit, `v${ver}: version info copy 2`);
    }
  }

  // Unmask & read codewords
  const out = [];
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const up = ((right + 1) & 2) === 0;
    for (let vert = 0; vert < n; vert++) {
      const y = up ? n - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (!F[y][x]) out.push(M[y][x] ^ ((x + y) % 2 === 0 ? 1 : 0));
      }
    }
  }
  const total = Math.floor(out.length / 8);
  const cw = [];
  for (let i = 0; i < total; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | out[i * 8 + j];
    cw.push(v);
  }
  const [ec, nb] = EC_L[ver - 1];
  const shortLen = Math.floor(total / nb);
  const nLong = total % nb;
  const nShort = nb - nLong;
  const dl = Array.from({ length: nb }, (_, b) => (b < nShort ? shortLen - ec : shortLen - ec + 1));
  const blocks = Array.from({ length: nb }, () => []);
  let k = 0;
  for (let i = 0; i < Math.max(...dl); i++) {
    for (let b = 0; b < nb; b++) if (i < dl[b]) blocks[b].push(cw[k++]);
  }
  for (let i = 0; i < ec; i++) {
    for (let b = 0; b < nb; b++) blocks[b].push(cw[k++]);
  }
  for (const blk of blocks) {
    for (let i = 0; i < ec; i++) {
      let s = 0;
      for (const c of blk) s = gfMul(s, EXP[i]) ^ c;
      assert.equal(s, 0, `v${ver}: RS syndrome nonzero`);
    }
  }
  const data = blocks.flatMap((blk, b) => blk.slice(0, dl[b]));
  const bs = data.map((c) => c.toString(2).padStart(8, '0')).join('');
  assert.equal(bs.slice(0, 4), '0100', `v${ver}: byte mode`);
  const cb = ver < 10 ? 8 : 16;
  const len = parseInt(bs.slice(4, 4 + cb), 2);
  const p = 4 + cb;
  const raw = new Uint8Array(len);
  for (let i = 0; i < len; i++) raw[i] = parseInt(bs.slice(p + i * 8, p + (i + 1) * 8), 2);
  return new TextDecoder().decode(raw);
}

test('encodeQrSvg round-trip decodes cleanly across v1, v6, v7, v10, and 200-species palette URLs, and never truncates', () => {
  const cases = [
    { label: 'v1 short', url: 'https://canopi.co', minV: 1, maxV: 1 },
    { label: 'v6 8-species', url: 'https://projectcanopi.com/palette/#v=5&c=mediterranean&m=unsure&a=zOijZcegreoFV5A-zormEEQ7yWs5mnBUgZUbdtVjoWL6Rhai&e=1', minV: 6, maxV: 6 },
    { label: 'v7 15-species', url: 'https://projectcanopi.com/palette/#v=5&c=mediterranean&a=' + 'aB3dEf'.repeat(16), minV: 7, maxV: 7 },
    { label: 'v10 35-species', url: 'https://projectcanopi.com/palette/#v=5&c=mediterranean&a=' + 'aB3dEf'.repeat(35), minV: 10, maxV: 10 },
    { label: '200-species link (~1250 bytes)', url: 'https://projectcanopi.com/palette/#v=5&c=mediterranean&a=' + 'aB3dEf'.repeat(200), minV: 20, maxV: 30 },
  ];
  for (const tc of cases) {
    const qr = encodeQrSvg(tc.url, 2);
    assert.ok(qr !== null, `${tc.label}: encoded`);
    assert.ok(qr.version >= tc.minV && qr.version <= tc.maxV, `${tc.label}: expected v${tc.minV}..v${tc.maxV}, got v${qr.version}`);
    assert.equal(qr.viewBoxSize, qr.size + 4);
    assert.equal(decodeQrSvg(qr), tc.url, `${tc.label}: independent round-trip decode matches exact URL`);
  }
  assert.equal(encodeQrSvg('x'.repeat(3000), 2), null, 'returns null instead of truncating URLs beyond v40 capacity');
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
