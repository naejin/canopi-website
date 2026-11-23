// Where focus goes when the control that had it leaves the page (W4): never to <body>. Each helper
// waits for the render the change causes (two frames), then focuses what it finds. While a sheet is
// open the page behind it is inert, so the focus stays in the sheet: on what was found if it is in the
// sheet, else on the sheet's [data-autofocus] heading (F3). With nothing found and no sheet, the
// tool's first heading (Start's, after an Undo back to Start).
import type { PlantId } from '../../lib/palette/index.ts';

// The top sheet: the last open dialog (views/Sheets.tsx renders them bottom first), the only one not inert.
const topSheet = (): HTMLDialogElement | null => [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].pop() ?? null;
// Focuses el (within an open sheet, else the sheet's [data-autofocus] heading; with nothing, the
// tool's first heading); returns what took the focus.
function land(found: HTMLElement | null): HTMLElement | null {
  const sheet = topSheet();
  let el = found;
  if (sheet && el && !sheet.contains(el)) el = null;
  el ??= sheet ? sheet.querySelector<HTMLElement>('[data-autofocus]') : document.querySelector<HTMLElement>('#ct-root h2');
  if (!el) return null;
  if (!el.matches('button, a[href], input, select, textarea, [tabindex]')) el.tabIndex = -1;
  el.focus({ preventScroll: true });
  return el;
}
// then: told the element focused (the Next step's Add hands the toast's way back to it).
// soon: explicit landings still to come; the safety net leaves the focus to them (one move, not two:
// each focus() may scroll the page).
let soon = 0;
export function focusSoon(find: () => HTMLElement | null, then?: (el: HTMLElement) => void): void {
  soon++;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    soon--;
    const el = land(find());
    if (el) then?.(el);
  }));
}

// ---- the safety net (pre-push fix 6) ----
// A control that removes itself or its region ("Show N outside", "Not now" on the last hole, a
// Retry whose notice goes) must never leave the focus on <body>. The explicit helpers below still win:
// they land two frames after the render, after this net. A region: the nearest section (or element
// marked data-focus-region) around the control; the focus lands on its heading while it survives,
// else on the shown view's heading (within an open sheet, its own heading). Started once by main.ts.
const REGION = 'section, [data-focus-region]';
let lastFocused: HTMLElement | null = null;
let lastRegion: HTMLElement | null = null;
const headingOf = (region: HTMLElement): HTMLElement | null => region.querySelector<HTMLElement>('h2, h3');
export function watchFocus(root: HTMLElement): void {
  root.addEventListener('focusin', (e) => {
    lastFocused = e.target instanceof HTMLElement ? e.target : null;
    lastRegion = lastFocused?.parentElement?.closest<HTMLElement>(REGION) ?? null;
  });
  new MutationObserver(() => {
    if (!lastFocused || lastFocused.isConnected) return;
    const at = document.activeElement;
    const region = lastRegion?.isConnected ? lastRegion : null;
    lastFocused = null;
    if ((at && at !== document.body) || soon > 0) return; // the focus went somewhere already, or will
    land((region && headingOf(region)) ?? viewHeading());
  }).observe(root, { childList: true, subtree: true });
}

// The shown view's heading: the matrix's caption (the phone overview table), or the view's h2.
// The page title of the step shown (the palette page's, else the first heading of the tool).
const viewHeading = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#ct-root [data-view-heading]') ?? document.querySelector<HTMLElement>('#ct-root h2');

// After "Suggest plants" (or anything that opens the views from Start). The palette page's chunk may
// still be loading: its placeholder's heading takes the focus, and the page's own heading takes it over
// once it replaces the placeholder, if the focus went with the placeholder (a slow load: never <body>).
export const focusView = (): void => focusSoon(viewHeading, (el) => {
  const root = document.getElementById('ct-root');
  if (!root || !el.closest('[data-palette-placeholder]')) return;
  const watch = new MutationObserver(() => {
    if (el.isConnected) return;
    watch.disconnect();
    clearTimeout(cap);
    if (document.activeElement === document.body || !document.activeElement) focusView();
  });
  const cap = setTimeout(() => watch.disconnect(), 30_000);
  watch.observe(root, { childList: true, subtree: true });
});

// After Undo: the restored plant's own control (its chip, its row's name), else the view's heading.
// from: the region the change came from (toastRegion, noted when its toast showed): the plant's control
// there wins over the first in DOM order, so an Undo after a remove in Your plants lands on its row,
// not on the Years chart's chip (pre-push fix 6, C).
export function focusPlant(id: PlantId | undefined, from: Element | null = null): void {
  focusSoon(() => {
    const all = id === undefined ? [] : [...document.querySelectorAll<HTMLElement>('#ct-root [data-plant-id]')]
      .filter((el) => el.dataset.plantId === String(id) && !el.closest('dialog') && el.getClientRects().length);
    const at = (from?.isConnected ? all.find((el) => from.contains(el)) : undefined) ?? all[0];
    const own = at && (at.matches('button, a[href]') ? at : at.querySelector<HTMLElement>('button, a[href]'));
    return own ?? viewHeading();
  });
}

// After Start over (the palette head's or the "Your place" sheet's): its button leaves with the
// palette, so the toast's Undo takes the focus, else Place's heading (pre-push fix 6, B).
export const focusAfterStartOver = (): void => {
  if (typeof document === 'undefined') return;
  focusSoon(() => document.querySelector<HTMLElement>('.ct-toast-page .ct-toast-undo') ?? viewHeading());
};

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
// Returns the region of the control that raised the toast (focusPlant's `from`), null for none.
export function noteToastOpener(): Element | null {
  if (typeof document === 'undefined') return null;
  const at = document.activeElement as HTMLElement | null;
  if (!at || at === document.body || at.closest('.ct-toast')) return null;
  opener = at;
  return at.parentElement?.closest(REGION) ?? null;
}
export function focusAfterToast(): void {
  if (typeof document === 'undefined') return;
  const at = document.activeElement;
  if (at && at !== document.body && !at.closest('.ct-toast')) return; // the grower is elsewhere: leave it
  const back = opener;
  opener = null;
  focusSoon(() => (back?.isConnected && back.getClientRects().length && !(back as HTMLButtonElement).disabled ? back : viewHeading()));
}

// A toast's Show for the plant whose Details is on top (store.addMembers; c4 R2): its first warning
// chip in the summary comes on screen and takes the focus, so a screen reader hears it; with none, the
// summary.
export function focusWarning(): void {
  if (typeof document === 'undefined') return;
  focusSoon(() => { const d = topSheet(); return d?.querySelector<HTMLElement>('[data-summary] .ct-flag') ?? d?.querySelector<HTMLElement>('[data-summary]') ?? null; });
}
