// Lightweight pure-TypeScript ISO/IEC 18004 QR Code encoder (Byte mode, ECC Level L, Versions 1–10).
// Zero external dependencies and zero network calls; used by A8 Print Field Sheet to render a real
// scannable SVG QR code linking back to the interactive Plant Palette URL.

interface VersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecPerBlock: number;
  blocks: number;
  align: readonly number[];
}

// Level L specifications for Versions 1..10 (up to 271 UTF-8 bytes)
const VERSIONS: readonly VersionSpec[] = [
  { version: 1, size: 21, dataCodewords: 19, ecPerBlock: 7, blocks: 1, align: [] },
  { version: 2, size: 25, dataCodewords: 34, ecPerBlock: 10, blocks: 1, align: [6, 18] },
  { version: 3, size: 29, dataCodewords: 55, ecPerBlock: 15, blocks: 1, align: [6, 22] },
  { version: 4, size: 33, dataCodewords: 80, ecPerBlock: 20, blocks: 1, align: [6, 26] },
  { version: 5, size: 37, dataCodewords: 108, ecPerBlock: 26, blocks: 1, align: [6, 30] },
  { version: 6, size: 41, dataCodewords: 136, ecPerBlock: 18, blocks: 2, align: [6, 34] },
  { version: 7, size: 45, dataCodewords: 156, ecPerBlock: 20, blocks: 2, align: [6, 22, 38] },
  { version: 8, size: 49, dataCodewords: 194, ecPerBlock: 24, blocks: 2, align: [6, 24, 42] },
  { version: 9, size: 53, dataCodewords: 232, ecPerBlock: 30, blocks: 2, align: [6, 26, 46] },
  { version: 10, size: 57, dataCodewords: 274, ecPerBlock: 18, blocks: 4, align: [6, 28, 50] },
];

// GF(256) with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGenerator(ecCount);
  const rem = new Uint8Array(ecCount);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return rem;
}

function bchFormatBits(mask: number): number {
  // ECC Level L = 01 (bits 4..3), mask = 0..7 (bits 2..0)
  const data = (0b01 << 3) | (mask & 7);
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if (rem & (1 << (i + 10))) rem ^= 0x537 << i;
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersionBits(version: number): number {
  let rem = version << 12;
  for (let i = 5; i >= 0; i--) {
    if (rem & (1 << (i + 12))) rem ^= 0x1f25 << i;
  }
  return (version << 12) | rem;
}

function encodeBytes(input: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(input);
  const out: number[] = [];
  for (let i = 0; i < input.length; i++) out.push(input.charCodeAt(i) & 0xff);
  return new Uint8Array(out);
}

export interface QrMatrix {
  version: number;
  size: number;
  quiet: number;
  viewBoxSize: number;
  pathD: string;
}

/** Encode a UTF-8 string (e.g. palette URL) into a scannable SVG QR code path. */
export function encodeQrSvg(text: string, quiet = 2): QrMatrix {
  const rawBytes = encodeBytes(text);
  // Pick smallest version that fits (truncating ultra-long URLs safely to Version 10 capacity)
  let spec = VERSIONS[VERSIONS.length - 1];
  for (const v of VERSIONS) {
    const countBits = v.version < 10 ? 8 : 16;
    const capBytes = Math.floor((v.dataCodewords * 8 - 4 - countBits) / 8);
    if (rawBytes.length <= capBytes) {
      spec = v;
      break;
    }
  }
  const countBits = spec.version < 10 ? 8 : 16;
  const maxBytes = Math.floor((spec.dataCodewords * 8 - 4 - countBits) / 8);
  const bytes = rawBytes.length > maxBytes ? rawBytes.slice(0, maxBytes) : rawBytes;

  // Build bit stream: Mode 0100 (Byte), length, bytes, terminator, pad bytes
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, countBits);
  for (const b of bytes) pushBits(b, 8);
  const totalDataBits = spec.dataCodewords * 8;
  pushBits(0, Math.min(4, totalDataBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const dataCW = new Uint8Array(spec.dataCodewords);
  for (let i = 0; i < bits.length / 8; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i * 8 + j];
    dataCW[i] = v;
  }
  for (let i = bits.length / 8, p = 0; i < spec.dataCodewords; i++, p++) {
    dataCW[i] = p % 2 === 0 ? 0xec : 0x11;
  }

  // Split into blocks and interleave data + RS error-correction codewords
  const shortLen = Math.floor(spec.dataCodewords / spec.blocks);
  const longBlocks = spec.dataCodewords % spec.blocks;
  const shortBlocks = spec.blocks - longBlocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let b = 0; b < spec.blocks; b++) {
    const len = b < shortBlocks ? shortLen : shortLen + 1;
    const slice = dataCW.slice(offset, offset + len);
    offset += len;
    dataBlocks.push(slice);
    ecBlocks.push(rsRemainder(slice, spec.ecPerBlock));
  }
  const finalCW: number[] = [];
  const maxBlockLen = shortLen + (longBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxBlockLen; i++) {
    for (const blk of dataBlocks) if (i < blk.length) finalCW.push(blk[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const ec of ecBlocks) finalCW.push(ec[i]);
  }

  // Build function-pattern grid
  const n = spec.size;
  const mods: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  const isFunc: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    mods[r][c] = dark ? 1 : 0;
    isFunc[r][c] = true;
  };

  // Finder patterns + separators
  const placeFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= n || c >= n) continue;
        const inSep = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        const dark = !inSep && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(r, c, dark);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  for (const r of spec.align) {
    for (const c of spec.align) {
      if (isFunc[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunc(r + dr, c + dc, dark);
        }
      }
    }
  }

  // Reserve format info + dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = n - 8; i < n; i++) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(n - 8, 8, true);

  // Version info (versions >= 7)
  if (spec.version >= 7) {
    const vbits = bchVersionBits(spec.version);
    for (let i = 0; i < 18; i++) {
      const dark = ((vbits >> i) & 1) === 1;
      const r = Math.floor(i / 3);
      const c = n - 11 + (i % 3);
      setFunc(r, c, dark);
      setFunc(c, r, dark);
    }
  }

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = finalCW.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (isFunc[r][c]) continue;
        let dark = false;
        if (bitIdx < totalBits) {
          dark = ((finalCW[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx++;
        }
        mods[r][c] = dark ? 1 : 0;
      }
    }
  }

  // Apply mask 0 (simple, reliable, fast) and write format info
  const mask = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!isFunc[r][c] && (r + c) % 2 === 0) mods[r][c] ^= 1;
    }
  }
  const fbits = bchFormatBits(mask);
  const fCoords1: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  const fCoords2: [number, number][] = [
    [n - 1, 8], [n - 2, 8], [n - 3, 8], [n - 4, 8], [n - 5, 8], [n - 6, 8], [n - 7, 8],
    [8, n - 8], [8, n - 7], [8, n - 6], [8, n - 5], [8, n - 4], [8, n - 3], [8, n - 2], [8, n - 1],
  ];
  for (let i = 0; i < 15; i++) {
    const bit = (fbits >> (14 - i)) & 1;
    mods[fCoords1[i][0]][fCoords1[i][1]] = bit;
    mods[fCoords2[i][0]][fCoords2[i][1]] = bit;
  }

  // Compact SVG path: horizontal run-length rectangles
  const segs: string[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (mods[r][c] === 0) { c++; continue; }
      const start = c;
      while (c < n && mods[r][c] === 1) c++;
      segs.push(`M${start + quiet},${r + quiet}h${c - start}v1h-${c - start}z`);
    }
  }

  return {
    version: spec.version,
    size: n,
    quiet,
    viewBoxSize: n + quiet * 2,
    pathD: segs.join(''),
  };
}
