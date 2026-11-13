// What the plant dialog hands the correction form (views/Correction.tsx, loaded on first use), here so
// the form imports the kit and not the dialog's module (E6 design check: cycle C4).
import type { PlantId } from '../../../../lib/consortium/index.ts';

export interface CorrectionField { field: string; label: string; current: string; raw: unknown }
// Correction drafts by plant id, kept for the page's life: closing the dialog (Escape in the text,
// the backdrop) or an offline send never loses what the reader wrote. Correction.tsx writes them and
// drops one once it is sent.
export interface CorrectionDraft { field: string; proposed: string; note: string; email: string; consent: boolean; website: string }
export const drafts = new Map<PlantId, CorrectionDraft>();
