/** @jsxImportSource preact */
// The three steps above the page title (v14 boards Place, PlaceDesk, SiteKiambu, Many; pf-c, h3 M13):
// "1 Your place", "2 Your palette", "3 Planting plan", in the page head (PalettePage.astro #ct-steps),
// static so they show before the island, and never rendered again here (BC1, C14: no second render root
// over static markup). The head carries data-step: on the palette step step 1 is done, its button
// (back to Place) in place of its words, by shell.css, and step 2 is current; on Place step 2's button
// stands in place of its words once the palette has plants. The plan is PP-D's and stays words. The
// page's inline script sets data-step first (R16); a failure screen sets it back to Place (App.tsx).
import { useEffect } from 'preact/hooks';
import { members, view } from '../../store.ts';
import { leavePalette, showPalette } from '../../state/draft.ts';

// Marks the head's step: data-step for the styles, aria-current on the step's own item.
export function markStep(step: 'place' | 'palette'): void {
  const head = document.getElementById('ct-head');
  if (!head) return;
  head.dataset.step = step;
  const items = head.querySelectorAll<HTMLElement>('#ct-steps > li');
  items.forEach((li, i) => { if (i === (step === 'place' ? 0 : 1)) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
}

let bound = false;
export function Steps() {
  const onPalette = view.value !== 'start';
  const toPalette = !onPalette && members.value.length > 0;
  useEffect(() => {
    markStep(onPalette ? 'palette' : 'place');
    const head = document.getElementById('ct-head');
    const words = head?.querySelector<HTMLElement>('[data-step-words]'), button = head?.querySelector<HTMLButtonElement>('[data-step-palette]');
    const back = head?.querySelector<HTMLButtonElement>('[data-step-place]');
    if (!words || !button || !back) return;
    if (!bound) { button.addEventListener('click', showPalette); back.addEventListener('click', leavePalette); bound = true; }
    button.hidden = !toPalette;
    words.hidden = toPalette;
  }, [onPalette, toPalette]);
  return null;
}
