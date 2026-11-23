// The list fold's arithmetic (views/kit/more.tsx MoreList, v14 pf commit 0W-1 item 7; the size rule,
// A14): a list shows whole while the palette holds maxPalette plants or fewer and the list maxGroup items
// or fewer. Past that it folds: stage 0 shows the first `closed` items, stage 1 the first `step`,
// stage 2 all. firstNew: the index of the first item a stage newly shows (it takes the focus; -1: none);
// next: the stage "+ N more" opens (null: none left); fewer: whether "Show fewer" shows.
export type FoldStage = 0 | 1 | 2;
export interface FoldInput { count: number; stage: FoldStage; paletteSize: number; maxPalette: number; maxGroup: number; closed: number; step: number }
export interface Fold { whole: boolean; shown: number; rest: number; firstNew: number; next: FoldStage | null; fewer: boolean }

export function foldOf({ count, stage, paletteSize, maxPalette, maxGroup, closed, step }: FoldInput): Fold {
  if (paletteSize <= maxPalette && count <= maxGroup) return { whole: true, shown: count, rest: 0, firstNew: -1, next: null, fewer: false };
  const limit = [closed, step, count][stage];
  const shown = Math.min(limit, count);
  const rest = count - shown;
  const firstNew = stage === 0 ? -1 : Math.min([0, closed, step][stage], count);
  const next: FoldStage | null = rest === 0 ? null : stage === 0 && count > step ? 1 : 2;
  return { whole: false, shown, rest, firstNew, next, fewer: stage > 0 };
}
