// Squash guide: one fruit per squash species, side view in a 120 × 80 box, drawn with the plant tokens
// (shared guide classes: guide-fruit = leaf, guide-c6 = tan seed tone, guide-c4 = red-orange).
// pepo: an acorn squash with ribs; moschata: a butternut with its long neck; maxima: a flattened
// buttercup with its button. Used by SquashSpecies and SquashCrossFlow.
export type Species = 'pepo' | 'moschata' | 'maxima';

export interface FruitShape { body: string; cls: string; lines: string[]; stem: string; extra?: string }

export const fruits: Record<Species, FruitShape> = {
  pepo: {
    body: 'M60 18C82 16 98 30 97 47C96 63 78 74 60 77C42 74 24 63 23 47C22 30 38 16 60 18Z',
    cls: 'guide-fruit',
    lines: ['M60 19C56 38 56 58 60 76', 'M48 20C40 36 40 58 50 74', 'M72 20C80 36 80 58 70 74', 'M36 25C28 38 28 56 38 69', 'M84 25C92 38 92 56 82 69'],
    stem: 'M60 19L58 7L66 6L66 18',
  },
  moschata: {
    body: 'M10 34C10 28 15 26 24 27L60 29C70 20 103 18 109 40C114 62 84 70 64 56L24 54C15 55 10 50 10 44Z',
    cls: 'guide-c6',
    lines: ['M66 31C76 38 76 50 68 56'],
    stem: 'M10 38L3 37L3 43L10 42',
  },
  maxima: {
    body: 'M60 22C88 20 110 32 110 50C110 66 88 73 60 73C32 73 10 66 10 50C10 32 32 20 60 22Z',
    cls: 'guide-c4',
    lines: ['M60 23C54 40 54 58 60 72', 'M38 25C28 40 28 58 38 70', 'M82 25C92 40 92 58 82 70'],
    stem: 'M57 23L55 11L64 10L63 22',
    extra: 'M48 70C48 64 54 61 60 61C66 61 72 64 72 70',
  },
};
