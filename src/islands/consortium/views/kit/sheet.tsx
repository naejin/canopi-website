/** @jsxImportSource preact */
// The parts every sheet shares (moved from Details.tsx; E6 design check §3 K1), so the sheets loaded
// on first use (Add, Swap, Paste, Correction) import the kit and not the plant dialog's module (cycle
// C4): the sheet frame, the "Add it anyway?" ask, the stage bar of a sheet row, and "Not checked in
// {country}". Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is
// inert, Escape closes). A leaf (E6 design check L5): what closes a sheet and its toast region come
// in as props from views/Sheets.tsx, SheetFrame's only caller, which hands each sheet part its frame.
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { Taxon } from '../../../../lib/consortium/index.ts';
import { phases } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import { spanOf } from './span.ts';
import { CLOSE } from './icons.tsx';
import { countryName, spanWords } from './names.ts';

export { BACK, WARN } from './icons.tsx';

// The seven-segment stage bar, its span filled, with the span words as its name (mockup 05).
// run: the stages Add was opened for (a cell or a run of cells), marked `cur` (X2).
export function Bar({ taxon, run = null }: { taxon: Taxon; run?: { from: number; to: number } | null }) {
  const s = spanOf(taxon);
  return (
    <span class="ct-bar" role="img" aria-label={spanWords(taxon)}>
      {phases.map((_, i) => <i class={`${s && s.from <= i && i <= s.to ? 'on' : ''}${run && run.from <= i && i <= run.to ? ' cur' : ''}`} />)}
    </span>
  );
}

// "Not checked in {country}": once per view (the Add and Swap sheets' top line, the dialog).
// ctx: the store's flag context (store.flagContext).
export function NotChecked({ ctx }: { ctx: { country?: string | null; countryStatus?: string } }) {
  if (ctx.countryStatus !== 'unchecked' || !ctx.country) return null;
  return <p class="ct-note">{T('add.notChecked', { country: countryName(ctx.country) })}</p>;
}

// A sheet: a modal <dialog>, a side sheet on desktop and full screen on phones. Escape, Close and a
// click on the backdrop close it (onClose); the element marked data-autofocus (its heading) takes the
// focus. foot: the sheet's action bar (Add, Paste). The foot sticks to the sheet's bottom and holds the
// sheet's toast region (toast) above the bar, so a toast never covers the bar's button (walk-through 2
// N1: Undo sat over "Add 1 plant" and the click undid the last add). The sheet's scroll padding
// follows the foot's height, so a control tabbed to near the end is scrolled above the foot, not under it.
export interface FrameProps { titleId: string; head?: ComponentChildren; foot?: ComponentChildren; children: ComponentChildren; class?: string }
// The frame a sheet part draws in: SheetFrame bound to its opening's close and toast (views/Sheets.tsx).
export type Frame = ComponentType<FrameProps>;
export function SheetFrame({ titleId, head, foot, children, class: cls = '', onClose, toast }: FrameProps & { onClose: () => void; toast: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  // A click closes the sheet only when it both starts and ends on the backdrop (a text selection
  // dragged out of the sheet and released outside does not).
  const downOnBackdrop = useRef(false);
  // Opened before the browser paints: when a sheet's part arrives, its frame replaces the loading
  // frame in the same paint, so the page never shows without the sheet in between.
  useLayoutEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => close.current();
    d.addEventListener('close', closed);
    const foot = d.querySelector<HTMLElement>('.ct-sheet-foot')!;
    const room = new ResizeObserver(() => { d.style.scrollPaddingBottom = `${foot.offsetHeight + 8}px`; });
    room.observe(foot);
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => { room.disconnect(); d.removeEventListener('close', closed); if (d.open) d.close(); };
  }, []);
  return (
    <dialog ref={ref} class={`ct-sheet ${cls}`} aria-labelledby={titleId}
      onPointerDown={(e) => { downOnBackdrop.current = e.target === ref.current; }}
      onClick={(e) => { if (e.target === ref.current && downOnBackdrop.current) close.current(); downOnBackdrop.current = false; }}>
      <div class="ct-sheet-inner">
        <div class="ct-sheet-head">
          <div class="ct-sheet-head-main">{head}</div>
          <button type="button" class="ct-icon-button" aria-label={T('close')} onClick={() => close.current()}>{CLOSE}</button>
        </div>
        <div class="ct-sheet-body">{children}</div>
        <div class="ct-sheet-foot">{toast}{foot}</div>
      </div>
    </dialog>
  );
}

// "Add it anyway?" / "Swap anyway?": a small alertdialog over the sheet, naming what asks.
export function Ask({ title, lines, yes, onYes, onCancel }: { title: string; lines: string[]; yes: string; onYes: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => cancel.current();
    d.addEventListener('close', onClose);
    d.showModal();
    d.querySelector<HTMLElement>('[data-cancel]')?.focus();
    return () => { d.removeEventListener('close', onClose); if (d.open) d.close(); };
  }, []);
  return (
    <dialog ref={ref} class="ct-ask" role="alertdialog" aria-labelledby="ct-ask-title" aria-describedby="ct-ask-why">
      <h3 id="ct-ask-title">{title}</h3>
      <ul id="ct-ask-why" class="ct-warnlist">{lines.map((l) => <li>{l}</li>)}</ul>
      <div class="ct-actions">
        <button type="button" class="button button-primary" onClick={onYes}>{yes}</button>
        <button type="button" class="button button-secondary" data-cancel onClick={() => ref.current?.close()}>{T('cancel')}</button>
      </div>
    </dialog>
  );
}
