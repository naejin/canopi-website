// The .canopi writer (design check A11; stream S4 fills this file): a consortium as a Canopi design
// file, v9, phase = phases.ord, validated against the app's format in scripts/vendor/canopi-design-
// format/ (canopi 0c425fb07). A pure function of the core: no DOM, no import outside this folder.
// Exported from index.ts since commit 0, so S4 never edits index.ts.
import type { ShareState } from './types.ts';

// The app's design file format version this writer targets.
export const CANOPI_FILE_VERSION = 9;

// Filled by S4. Until then the island has no Download button, and BT-9's .canopi part is todo.
export const canopiFile: ((state: ShareState, opts: { name: string; releaseId: string }) => string) | null = null;
