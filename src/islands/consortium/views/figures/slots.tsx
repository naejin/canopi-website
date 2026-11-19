/** @jsxImportSource preact */
// The figures panel's two places (v14 pf commit 0W-1 item 8, chk #39): "Your place in figures" under
// the place questions (PlaceFigures; pf-c places it: phone, under the last question; laptop, full width
// under the three) and "What limits plants here" on the palette (PaletteLimits; pf-b places it). Both
// are mounted since 0W (after the Place form, at the end of Palette.tsx) so the `figures` chunk is
// built, and render nothing until pf-d. Both are
// shells: their content is views/figures/Figures.tsx, its own lazy chunk (role `figures`,
// scripts/built-modules.mjs), which pf-d fills in chunk 3. Keep this file a shell.
import { lazyPart } from '../lazy.tsx';
import { climate, load, location } from '../../store.ts';
import { locationAtStart } from '../../state/restore.ts';
import { retryableImport } from '../../../../lib/consortium/index.ts';

const figures = () => import('./Figures.tsx');
const placePart = lazyPart(retryableImport(figures, (m) => m.PlaceFigures), { quiet: true });
const limits = lazyPart(retryableImport(figures, (m) => m.PaletteLimits), { quiet: true });

// Asked for only once the data is ready: nothing lazy is fetched before it (L5, E6-2). Drawn only
// once there is a place to say figures for, a location or a chosen climate (F5: with a climate and no
// location its soil and water lines can still be set): on Start before either, the panel would only
// arrive after the first paint and push the page down (gate red R16, N2 layout stability).
// The slot stands as soon as the panel is due (a place, a climate, or a kept location still looked
// up) and stays empty while the data, the place and the panel's chunk come; an empty slot keeps the
// island a screen tall (base.css), so what follows (the release line, the footer) never moves on screen
// when the panel lands (PFD49; fix round 1 R5: only while it waits, never on a short state).
export function PlaceFigures() {
  const place = location.value || climate.value;
  if (!place && !locationAtStart.value) return null;
  return <div class="fg-slot">{place && load.value.status === 'ready' && <placePart.View />}</div>;
}
export function PaletteLimits() {
  return <limits.View />;
}
