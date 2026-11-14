// Where focus goes when the control that had it leaves the page (W4): never to <body>. Each helper
// waits for the render the change causes (two frames), then focuses what it finds. While a sheet is
// open the page behind it is inert, so the focus stays in the sheet: on what was found if it is in the
// sheet, else on the sheet's [data-autofocus] heading (F3). With nothing found and no sheet, the
// tool's first heading (Start's, after an Undo back to Start).
import type { PlantId } from '../../lib/consortium/index.ts';

// then: told the element focused (the Next step's Add hands the toast's way back to it).
function focusSoon(find: () => HTMLElement | null, then?: (el: HTMLElement) => void): void {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const sheet = document.querySelector<HTMLDialogElement>('dialog[open]');
    let el = find();
    if (sheet && el && !sheet.contains(el)) el = null;
    el ??= sheet ? sheet.querySelector<HTMLElement>('[data-autofocus]') : document.querySelector<HTMLElement>('#ct-root h2');
    if (!el) return;
    if (!el.matches('button, a[href], input, select, textarea, [tabindex]')) el.tabIndex = -1;
    el.focus();
    then?.(el);
  }));
}

// The shown view's heading: the matrix's caption (the phone overview table), or the view's h2.
// The page title of the step shown (the palette page's, else the first heading of the tool).
const viewHeading = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#ct-root [data-view-heading]') ?? document.querySelector<HTMLElement>('#ct-root h2');

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

// F1a seam (commit 0; A25): where focus goes when the toast leaves (dismissed, its action or Undo run,
// its timer fired). store.ts hideToast and the toast timer call it (commit 0) while the toast is still on
// the page; stream 6 (a11y1) implements it: when the focus was inside the toast, it moves to the next
// control after the render, never to <body>. The node tests call hideToast with no DOM, so it does
// nothing without a document. Today's behaviour until then: nothing moves.
// The control that raised the toast (the focus when it showed), where the focus goes back when the
// toast goes while the focus is in it (or was lost to <body>): else the page title, never <body>
// (architecture 9; A25, PP-B17).
let opener: HTMLElement | null = null;
// After an add whose control leaves as the plant joins: what find gives (within an open sheet, else the
// sheet's title), and the toast hands the focus back there, not to the removed control.
export function focusAfterAdd(find: () => HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  focusSoon(find, (el) => { opener = el; });
}
// After a Next step's Add: the Next step's title, which every state of the card shows (its next hole,
// or none left), else the page title (Focus board; slices b2 P8).
export const focusNextStep = (): void => focusAfterAdd(() => document.getElementById('ct-next-t') ?? viewHeading());
export function noteToastOpener(): void {
  if (typeof document === 'undefined') return;
  const at = document.activeElement as HTMLElement | null;
  if (at && at !== document.body && !at.closest('.ct-toast')) opener = at;
}
export function focusAfterToast(): void {
  if (typeof document === 'undefined') return;
  const at = document.activeElement;
  if (at && at !== document.body && !at.closest('.ct-toast')) return; // the grower is elsewhere: leave it
  const back = opener;
  opener = null;
  focusSoon(() => (back?.isConnected && back.getClientRects().length && !(back as HTMLButtonElement).disabled ? back : viewHeading()));
}
