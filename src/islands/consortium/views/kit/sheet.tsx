/** @jsxImportSource preact */
// The parts every sheet shares (moved from Details.tsx; E6 design check §3 K1), so the sheets loaded
// on first use (Swap, Paste, Correction; Find from PP-C c1) import the kit and not the plant dialog's module (cycle
// C4): the sheet frame, the stage bar of a sheet row, and "Not checked in
// {country}". Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is
// inert, Escape closes). A leaf (E6 design check L5): what closes a sheet and its toast region come
// in as props from views/Sheets.tsx, the only caller of SheetDialog and SheetFrame, which hands each
// sheet part its frame.
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Taxon } from '../../../../lib/consortium/index.ts';
import { phases, spanOf } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import { CLOSE } from './icons.tsx';
import { countryName, spanWords } from './names.ts';
// The modules every sheet chunk shares, imported through here so they ship in the first run (review
// 2, E6-5d): a sheet chunk's retry (core retry-import.ts) mends the chunk itself only, and a shared
// chunk whose first fetch failed would stay failed for the page's life (Chromium's module map), and
// every sheet with it. So a sheet chunk imports first-run modules only, already loaded. An object, not
// re-exports: Rollup places a module by the code that reaches it, and a re-export or a bare import
// leaves it in a chunk of its own (1.2 KB gzip moved to the first run). Object.freeze keeps every
// property (Rollup drops the properties of a plain object literal that no module reads, and the sheets
// read these from their modules, not from here), so check-built-site's K3 rule finds no sheet chunk
// importing them. The search (data/search.ts and core fold.ts) is not here: Find and Paste are one
// chunk (views/find/, PP-C c1), the only readers of it, so it ships with them and never in the first
// run (design check c1 6.2).
import { flagLines, unknownWords } from './flags.ts';
// The fit line (kit/fit.tsx), read by the sheets and the palette page (inform, don't block; owner 2026-11-14).
import { FitLine } from './fit.tsx';
export const shared = Object.freeze({ flagLines, unknownWords, FitLine });

export { BACK, WARN } from './icons.tsx';

// The seven-segment stage bar, its span filled, with the span words as its name (mockup 05).
// run: the stages a sheet was opened for (a run of cells), marked `cur` (X2).
export function Bar({ taxon, run = null }: { taxon: Taxon; run?: { from: number; to: number } | null }) {
  const s = spanOf(taxon);
  return (
    <span class="ct-bar" role="img" aria-label={spanWords(taxon)}>
      {phases.map((_, i) => <i class={`${s && s.from <= i && i <= s.to ? 'on' : ''}${run && run.from <= i && i <= run.to ? ' cur' : ''}`} />)}
    </span>
  );
}

// "Not checked in {country}": once per view (the Find and Swap sheets' top line, the dialog).
// ctx: the store's flag context (store.flagContext).
export function NotChecked({ ctx }: { ctx: { country?: string | null; countryStatus?: string } }) {
  if (ctx.countryStatus !== 'unchecked' || !ctx.country) return null;
  return <p class="ct-note">{T('find.notChecked', { country: countryName(ctx.country) })}</p>;
}

// A sheet: a modal <dialog>, a side sheet on desktop and full screen on phones, opened once per
// opening (SheetDialog), with the part's frame inside (SheetFrame). A part that arrives after its
// loading frame replaces only the frame, so the sheet slides in once and is announced once. Escape,
// Close and a click on the backdrop close it (onClose); the element marked data-autofocus (its
// heading) takes the focus. foot: the sheet's action bar (Add, Paste). The foot sticks to the sheet's
// bottom and holds the sheet's toast region (toast) above the bar, so a toast never covers the bar's
// button (walk-through 2 N1: Undo sat over "Add 1 plant" and the click undid the last add). The
// sheet's scroll padding follows the foot's height, so a control tabbed to near the end is scrolled
// above the foot, not under it.
export function SheetDialog({ onClose, children }: { onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  // A click closes the sheet only when it both starts and ends on the backdrop (a text selection
  // dragged out of the sheet and released outside does not).
  const downOnBackdrop = useRef(false);
  // The frame inside opens it (SheetFrame): a dialog with no frame yet stays closed, never an empty
  // modal (a part with nothing to draw draws no frame).
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => close.current();
    d.addEventListener('close', closed);
    return () => { d.removeEventListener('close', closed); if (d.open) d.close(); };
  }, []);
  return (
    <dialog ref={ref} class="ct-sheet"
      onPointerDown={(e) => { downOnBackdrop.current = e.target === ref.current; }}
      onClick={(e) => { if (e.target === ref.current && downOnBackdrop.current) close.current(); downOnBackdrop.current = false; }}>
      {children}
    </dialog>
  );
}

// A sheet whose part is not ready to draw (its chunk, or the pool while the range rule loads): its
// frame with a loading line (a status) that names it, so an open sheet always has a name and Close.
export function SheetWaiting({ Frame }: { Frame: Frame }) {
  return (
    <Frame titleId="ct-sheet-wait">
      <LiveLine id="ct-sheet-wait" text={T('details.loading')} focus />
    </Frame>
  );
}
// A status line put on the page empty and given its words just after (A2): a live region inserted with
// its message is not announced by every screen reader.
export function LiveLine({ text, id, focus = false }: { text: string; id?: string; focus?: boolean }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(true); }, []);
  return <p id={id} class="status-line" role="status" tabIndex={focus ? -1 : undefined} data-autofocus={focus ? '' : undefined}>{shown ? text : ''}</p>;
}
export interface FrameProps { titleId: string; head?: ComponentChildren; foot?: ComponentChildren; children: ComponentChildren; class?: string }
// The frame a sheet part draws in: SheetFrame bound to its opening's close and toast (views/Sheets.tsx).
export type Frame = ComponentType<FrameProps>;
export function SheetFrame({ titleId, head, foot, children, class: cls = '', onClose, toast }: FrameProps & { onClose: () => void; toast: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const d = ref.current?.closest('dialog');
    const foot = ref.current?.querySelector<HTMLElement>('.ct-sheet-foot');
    if (!d || !foot) return;
    // The dialog takes this frame's name and class (its CSS scope, e.g. .ct-add) while it shows it.
    const own = cls.split(' ').filter(Boolean);
    d.setAttribute('aria-labelledby', titleId);
    d.classList.add(...own);
    const room = new ResizeObserver(() => { d.style.scrollPaddingBottom = `${foot.offsetHeight + 8}px`; });
    room.observe(foot);
    // Opened before the browser paints, named first; a frame replacing the loading frame in the open
    // dialog takes the focus too.
    if (!d.open) d.showModal();
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      room.disconnect();
      d.classList.remove(...own);
      // A part that stops drawing (no frame replaces this one) leaves no empty modal: the sheet closes.
      queueMicrotask(() => { if (d.open && !d.querySelector('.ct-sheet-inner')) d.close(); });
    };
  }, []);
  return (
    <div class="ct-sheet-inner" ref={ref}>
      <div class="ct-sheet-head">
        <div class="ct-sheet-head-main">{head}</div>
        <button type="button" class="ct-icon-button" aria-label={T('close')} onClick={onClose}>{CLOSE}</button>
      </div>
      <div class="ct-sheet-body">{children}</div>
      <div class="ct-sheet-foot">{toast}{foot}</div>
    </div>
  );
}
