// The metric-matched fallback faces of src/styles/fonts.css ('Source Sans 3 Fallback', 'Literata
// Fallback'): a system font scaled and given the web font's vertical metrics, so text laid out before
// the web fonts arrive takes the room it will take after (no layout shift on a slow line). Prints the
// @font-face rules; paste them over the ones in fonts.css when a font file or the site's text changes:
//   timeout 120 systemd-run --user --scope -q -p MemoryMax=1G -p MemorySwapMax=0 node scripts/font-fallback-metrics.mjs
//
// Method (that of Next.js and Astro's font API, weighted by this site's own text): size-adjust is the
// ratio of the two fonts' average advance per em, each character weighted by how often it occurs in
// the site's strings (src/i18n/translations: the Latin-script locales for the Latin face, Russian for
// the Cyrillic one, each with the web font file of that subset); the ascent, descent and line-gap
// overrides are the web font's hhea values per em divided by size-adjust (an override applies to the
// adjusted size). Chinese, Japanese and Korean have no web font, so nothing to match.
//
// The fallbacks are Arial and Times New Roman (Windows, macOS, iOS), read here through Liberation Sans
// and Liberation Serif, which are metric-compatible with them (same advances and vertical metrics),
// as Arimo and Tinos (ChromeOS) are; Linux, CI runners included, has Liberation. Another directory:
// --liberation <dir>.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const at = process.argv.indexOf('--liberation');
const LIB = at > 0 ? process.argv[at + 1] : '/usr/share/fonts/truetype/liberation';

// The web faces' unicode-ranges (fonts.css), one per subset.
const RANGES = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
};
const LOCALES = { latin: ['en', 'fr', 'es', 'pt', 'it', 'de', 'nl'], cyrillic: ['ru'] };
const inRange = (range) => {
  const spans = range.split(',').map((r) => r.slice(2).split('-').map((h) => parseInt(h, 16)));
  return (cp) => spans.some(([a, b = a]) => cp >= a && cp <= b);
};

// The few tables read (head, hhea, hmtx, cmap), from a TrueType file or a WOFF2 one (whose tables are
// one Brotli stream; a transformed hmtx keeps its advances first, and glyf/loca are not read). No
// package: this reads only what the overrides need.
const WOFF2_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
function tablesOf(buf) {
  const tables = {};
  if (buf.toString('latin1', 0, 4) !== 'wOF2') {
    for (let i = 0, n = buf.readUInt16BE(4); i < n; i++) {
      const at = 12 + 16 * i;
      tables[buf.toString('latin1', at, at + 4)] = buf.subarray(buf.readUInt32BE(at + 8), buf.readUInt32BE(at + 8) + buf.readUInt32BE(at + 12));
    }
    return tables;
  }
  let at = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[at++]; v = v * 128 + (b & 0x7f); if (!(b & 0x80)) return v; } throw new Error('bad UIntBase128'); };
  const dir = [];
  for (let i = 0, n = buf.readUInt16BE(12); i < n; i++) {
    const flags = buf[at++];
    const tag = (flags & 0x3f) === 63 ? buf.toString('latin1', at, (at += 4)) : WOFF2_TAGS[flags & 0x3f];
    const version = flags >> 6;
    const length = base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    dir.push({ tag, length: transformed ? base128() : length });
  }
  const data = brotliDecompressSync(buf.subarray(at, at + buf.readUInt32BE(20)));
  let offset = 0;
  for (const { tag, length } of dir) { tables[tag] = data.subarray(offset, offset + length); offset += length; }
  return tables;
}
function readFont(buf) {
  const t = tablesOf(buf);
  const hMetrics = t.hhea.readUInt16BE(34);
  // A transformed hmtx (WOFF2) starts with a flags byte; its advances follow, as in a plain one where
  // each advance is followed by its left side bearing.
  const transformed = t.hmtx.length !== hMetrics * 4 + (t.maxp.readUInt16BE(4) - hMetrics) * 2;
  const advance = (g) => { const i = Math.min(g, hMetrics - 1); return transformed ? t.hmtx.readUInt16BE(1 + 2 * i) : t.hmtx.readUInt16BE(4 * i); };
  // cmap: the Unicode subtable of format 12 if there is one, else of format 4.
  const cmap = t.cmap, subtables = [];
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const platform = cmap.readUInt16BE(4 + 8 * i), encoding = cmap.readUInt16BE(6 + 8 * i), off = cmap.readUInt32BE(8 + 8 * i);
    if (platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) subtables.push({ off, format: cmap.readUInt16BE(off) });
  }
  const sub = subtables.find((s) => s.format === 12) ?? subtables.find((s) => s.format === 4);
  const glyph = (cp) => {
    const o = sub.off;
    if (sub.format === 12) {
      for (let i = 0, n = cmap.readUInt32BE(o + 12); i < n; i++) {
        const g = o + 16 + 12 * i, start = cmap.readUInt32BE(g), end = cmap.readUInt32BE(g + 4);
        if (cp >= start && cp <= end) return cmap.readUInt32BE(g + 8) + cp - start;
      }
      return 0;
    }
    const segs = cmap.readUInt16BE(o + 6) / 2, ends = o + 14, starts = ends + 2 * segs + 2, deltas = starts + 2 * segs, ranges = deltas + 2 * segs;
    for (let i = 0; i < segs; i++) {
      if (cp > cmap.readUInt16BE(ends + 2 * i)) continue;
      const start = cmap.readUInt16BE(starts + 2 * i);
      if (cp < start) return 0;
      const delta = cmap.readUInt16BE(deltas + 2 * i), range = cmap.readUInt16BE(ranges + 2 * i);
      if (!range) return (cp + delta) & 0xffff;
      const g = cmap.readUInt16BE(ranges + 2 * i + range + 2 * (cp - start));
      return g ? (g + delta) & 0xffff : 0;
    }
    return 0;
  };
  return {
    unitsPerEm: t.head.readUInt16BE(18),
    ascent: t.hhea.readInt16BE(4), descent: t.hhea.readInt16BE(6), lineGap: t.hhea.readInt16BE(8),
    // The advance of the character's glyph, or null when the font has none.
    advance: (cp) => { const g = cp > 0xffff && sub.format !== 12 ? 0 : glyph(cp); return g ? advance(g) : null; },
  };
}

// How often each character of the subset occurs in the site's strings (markup and placeholders out).
const frequencies = (subset) => {
  const has = inRange(RANGES[subset]);
  const counts = new Map();
  for (const lang of LOCALES[subset]) {
    const strings = Object.values(JSON.parse(readFileSync(join(ROOT, 'src', 'i18n', 'translations', `${lang}.json`), 'utf8')));
    for (const c of strings.join(' ').replace(/<[^>]+>|\{[^}]*\}/g, '')) {
      const cp = c.codePointAt(0);
      if (has(cp)) counts.set(cp, (counts.get(cp) ?? 0) + 1);
    }
  }
  return counts;
};

const FACES = [
  { family: 'Source Sans 3 Fallback', weight: 400, style: 'normal', web: 'source-sans-3-{subset}-400-normal', fallback: 'LiberationSans-Regular', local: ['Arial', 'ArialMT', 'Liberation Sans', 'LiberationSans', 'Arimo'] },
  { family: 'Source Sans 3 Fallback', weight: 400, style: 'italic', web: 'source-sans-3-{subset}-400-italic', fallback: 'LiberationSans-Italic', local: ['Arial Italic', 'Arial-ItalicMT', 'Liberation Sans Italic', 'LiberationSans-Italic', 'Arimo Italic'] },
  { family: 'Source Sans 3 Fallback', weight: 600, style: 'normal', web: 'source-sans-3-{subset}-600-normal', fallback: 'LiberationSans-Bold', local: ['Arial Bold', 'Arial-BoldMT', 'Liberation Sans Bold', 'LiberationSans-Bold', 'Arimo Bold'] },
  { family: 'Literata Fallback', weight: 400, style: 'normal', web: 'literata-{subset}-400-normal', fallback: 'LiberationSerif-Regular', local: ['Times New Roman', 'TimesNewRomanPSMT', 'Liberation Serif', 'LiberationSerif', 'Tinos'] },
  { family: 'Literata Fallback', weight: 600, style: 'normal', web: 'literata-{subset}-600-normal', fallback: 'LiberationSerif-Bold', local: ['Times New Roman Bold', 'TimesNewRomanPS-BoldMT', 'Liberation Serif Bold', 'LiberationSerif-Bold', 'Tinos Bold'] },
];

const pct = (n) => `${(n * 100).toFixed(2)}%`;
const fallbacks = new Map();
for (const subset of ['latin', 'cyrillic']) {
  const counts = frequencies(subset);
  for (const face of FACES) {
    const web = readFont(readFileSync(join(ROOT, 'public', 'fonts', `${face.web.replace('{subset}', subset)}.woff2`)));
    if (!fallbacks.has(face.fallback)) fallbacks.set(face.fallback, readFont(readFileSync(join(LIB, `${face.fallback}.ttf`))));
    const fb = fallbacks.get(face.fallback);
    // Characters both fonts draw (a character the web subset lacks is drawn by the next font anyway).
    let w = 0, f = 0;
    for (const [cp, n] of counts) {
      const a = web.advance(cp), b = fb.advance(cp);
      if (a === null || b === null) continue;
      w += (a / web.unitsPerEm) * n;
      f += (b / fb.unitsPerEm) * n;
    }
    const size = w / f;
    const per = (v) => pct(Math.abs(v) / web.unitsPerEm / size);
    const src = face.local.map((n) => `local('${n}')`).join(', ');
    console.log(`@font-face { font-family: '${face.family}'; font-weight: ${face.weight}; font-style: ${face.style}; src: ${src}; size-adjust: ${pct(size)}; ascent-override: ${per(web.ascent)}; descent-override: ${per(web.descent)}; line-gap-override: ${per(web.lineGap)}; unicode-range: ${RANGES[subset]}; }`);
  }
}
