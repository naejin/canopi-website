/** @jsxImportSource preact */
// The figures panel's two places (v14 pf commit 0W-1 item 8, chk #39): "Your place in figures" under
// the place questions (PlaceFigures; pf-c places it: phone, under the last question; laptop, full width
// under the three) and "What limits plants here" on the palette (PaletteLimits; pf-b places it). Both
// are mounted since 0W (after the Place form, at the end of Palette.tsx) so the `figures` chunk is
// built, and render nothing until pf-d. Both are
// shells: their content is views/figures/Figures.tsx, its own lazy chunk (role `figures`,
// scripts/built-modules.mjs), which pf-d fills in chunk 3. Keep this file a shell.
import { lazyPart } from '../lazy.tsx';
import { retryableImport } from '../../../../lib/consortium/index.ts';

const figures = () => import('./Figures.tsx');
const place = lazyPart(retryableImport(figures, (m) => m.PlaceFigures), { quiet: true });
const limits = lazyPart(retryableImport(figures, (m) => m.PaletteLimits), { quiet: true });

export function PlaceFigures() {
  return <place.View />;
}
export function PaletteLimits() {
  return <limits.View />;
}
