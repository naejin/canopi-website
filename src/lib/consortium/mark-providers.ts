// P5 seam (commit 0): the mark providers, in their own chunk (marks.ts loadMarkProviders imports it
// when a mark can show), in order: range (S5c), future (S5d) (P5.2 adds native, S5e); the site answers' marks are on the island path (marks.ts plantMarks). Not exported from index.ts,
// so the island's first run never holds them. A stream changes its own provider, not this list.
import type { MarkProvider } from './marks.ts';
import { rangeMarks } from './range-marks.ts';
import { futureMarks } from './future-marks.ts';

export const markProviders: readonly MarkProvider[] = [rangeMarks, futureMarks];
