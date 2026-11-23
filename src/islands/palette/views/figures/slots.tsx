/** @jsxImportSource preact */
// The figures panel's two places (v14 pf commit 0W-1 item 8, chk #39): "Your place in figures" under
// the place questions (PlaceFigures; pf-c places it: phone, under the last question; laptop, full width
// under the three) and "What limits plants here" on the palette (PaletteLimits; pf-b places it). Both
// are mounted since 0W (after the Place form, at the end of Palette.tsx) so the `figures` chunk is
// built, and render nothing until pf-d. Both are
// shells: their content is views/figures/Figures.tsx, its own lazy chunk (role `figures`,
// scripts/built-modules.mjs), which pf-d fills in chunk 3. Keep this file a shell.
import { lazyPart } from '../lazy.tsx';
import { location, siteInputs } from '../../store.ts';
import { retryableImport } from '../../../../lib/palette/index.ts';

const figures = () => import('./Figures.tsx');
// While the chunk comes, nothing (the slot's reserve holds the room); if it does not come, the part
// says so in place with Reload, which asks again in place (and by itself once back online), so the
// slot is never left empty for good and its reserve ends (follow-up F1, chunk 4 C2/R2, C2/C1).
const Waiting = () => null;
const limits = lazyPart(retryableImport(figures, (m) => m.PaletteLimits), { loading: Waiting, retry: true });

// The limits card can only stand at a located place with climate figures (PaletteLimits draws nothing
// elsewhere): only there is its part asked for, so a failed chunk is said where the card would stand,
// never on a palette with no place or a climate only (fix round 1 R1, C5; PFD61).
export function PaletteLimits() {
  return location.value?.lookup && siteInputs.value.nights.value !== null ? <limits.View /> : null;
}
