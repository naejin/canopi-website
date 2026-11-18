/** @jsxImportSource preact */
// The three steps above the page title (v14 boards Place, PlaceDesk, SiteKiambu; pf-c): "1 Your place",
// "2 Your palette", "3 Planting plan", in the page head (ConsortiumPage.astro #ct-steps), static so they
// show before the island, and never rendered again here (BC1, C14: no second render root over static
// markup). On Place, step 2's button stands in place of its words once the palette has plants; the
// plan is PP-D's and stays words. The head carries data-step ("palette" on the palette step: the steps
// and the lede give way to the palette's own head, shell.css); the page's inline script sets it first
// (R16).
import { useEffect } from 'preact/hooks';
import { members, view } from '../../store.ts';
import { showPalette } from '../../state/draft.ts';

let bound = false;
export function Steps() {
  const onPalette = view.value !== 'start';
  const toPalette = members.value.length > 0;
  useEffect(() => {
    const head = document.getElementById('ct-head');
    if (head) head.dataset.step = onPalette ? 'palette' : 'place';
    const words = head?.querySelector<HTMLElement>('[data-step-words]'), button = head?.querySelector<HTMLButtonElement>('[data-step-palette]');
    if (!words || !button) return;
    if (!bound) { button.addEventListener('click', showPalette); bound = true; }
    button.hidden = !toPalette;
    words.hidden = toPalette;
  }, [onPalette, toPalette]);
  return null;
}
