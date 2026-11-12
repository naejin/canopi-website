// P5 seam (commit 0): the mark providers, in their own chunk (marks.ts loadMarkProviders imports it
// when a mark can show), in order: range (S5c), future (S5d), native (S5e), site answers (site-marks.ts). Not exported from index.ts,
// so the island's first run never holds them. A stream changes its own provider, not this list.
import type { MarkProvider } from './marks.ts';
import { rangeMarks } from './range-marks.ts';
import { futureMarks } from './future-marks.ts';
import { nativeMarks } from './native-marks.ts';
import { siteMarks } from './site-marks.ts';

export const markProviders: readonly MarkProvider[] = [rangeMarks, futureMarks, nativeMarks, siteMarks];
