// Everything the page shows after the matrix, in one chunk (role `later`, ≤ 8 KB; views/lazy.tsx
// prefetches it at the first of ct:first-view or the data ready): one request rather than six, while
// the first run carries the matrix only.
export { SideView } from './SideView.tsx';
export { Jobs } from './Jobs.tsx';
export { PlantList } from './PlantList.tsx';
export { PrintSheet } from './PrintSheet.tsx';
export { Share } from './Share.tsx';
export { FutureSlot } from './FutureSlot.tsx';
export { canopiFile, canopiFileName } from '../../../lib/consortium/index.ts';
