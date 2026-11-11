// Everything the page shows after the matrix, in one chunk (views/lazy.tsx loads it once the matrix is
// drawn): one chunk rather than six keeps the island's total under its 60 KB gzip budget, which counts
// every chunk, while the first run carries the matrix only.
export { SideView } from './SideView.tsx';
export { Jobs } from './Jobs.tsx';
export { PlantList } from './PlantList.tsx';
export { PrintSheet } from './PrintSheet.tsx';
export { Share } from './Share.tsx';
export { FutureSlot } from './FutureSlot.tsx';
export { canopiFile, canopiFileName } from '../../../lib/consortium/index.ts';
