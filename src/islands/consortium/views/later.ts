// Everything the page shows after the palette slot, in one chunk (role `later`, ≤ 8 KB; views/lazy.tsx
// prefetches it at the first of ct:first-view or the data ready): one request rather than several.
// (The side view, Jobs and the plant list it also held went in PP-B commit 0a'.)
export { PrintSheet } from './PrintSheet.tsx';
export { Share } from './Share.tsx';
export { FutureSlot } from './FutureSlot.tsx';
export { canopiFile, canopiFileName } from '../../../lib/consortium/index.ts';
