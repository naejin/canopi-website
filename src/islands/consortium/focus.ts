// Where focus goes when the control that had it leaves the page (W4): never to <body>. Each helper
// waits for the render the change causes (two frames), then focuses what it finds. While a sheet is
// open the page behind it is inert, so the focus stays in the sheet: on what was found if it is in the
// sheet, else on the sheet's [data-autofocus] heading (F3). With nothing found and no sheet, the
// tool's first heading (Start's, after an Undo back to Start).
import type { PlantId } from '../../lib/consortium/index.ts';

function focusSoon(find: () => HTMLElement | null): void {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const sheet = document.querySelector<HTMLDialogElement>('dialog[open]');
    let el = find();
    if (sheet && el && !sheet.contains(el)) el = null;
    el ??= sheet ? sheet.querySelector<HTMLElement>('[data-autofocus]') : document.querySelector<HTMLElement>('#ct-root h2');
    if (!el) return;
    if (!el.matches('button, a[href], input, select, textarea, [tabindex]')) el.tabIndex = -1;
    el.focus();
  }));
}

// The shown view's heading: the matrix's caption (the phone overview table), or the view's h2.
const viewHeading = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#ct-root .ct-tabpanel:not([hidden]) :is(caption, table#ct-overview, h2)');

// After "Suggest plants" (or anything that opens the views from Start).
export const focusView = (): void => focusSoon(viewHeading);

// After Undo: the restored plant's own control (its chip, its row's name), else the view's heading.
export function focusPlant(id: PlantId | undefined): void {
  focusSoon(() => {
    const at = id === undefined ? null : [...document.querySelectorAll<HTMLElement>('#ct-root [data-plant-id]')]
      .find((el) => el.dataset.plantId === String(id) && !el.closest('dialog') && el.getClientRects().length);
    const own = at && (at.matches('button, a[href]') ? at : at.querySelector<HTMLElement>('button, a[href]'));
    return own ?? viewHeading();
  });
}
