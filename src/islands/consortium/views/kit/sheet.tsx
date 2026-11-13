/** @jsxImportSource preact */
// The parts every sheet shares (moved from Details.tsx; E6 design check §3 K1), so the sheets loaded
// on first use (Add, Swap, Paste, Correction) import the kit and not the plant dialog's module (cycle
// C4): the sheet frame, the "Add it anyway?" ask, the stage bar of a sheet row, and "Not checked in
// {country}". Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is
// inert, Escape closes).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Taxon } from '../../../../lib/consortium/index.ts';
import { phases } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { closeSheet } from '../../store.ts';
import { T } from '../../strings.ts';
import { Toast } from '../Toast.tsx';
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
export function NotChecked() {
  const ctx = store.flagContext.value;
  if (ctx.countryStatus !== 'unchecked' || !ctx.country) return null;
  return <p class="ct-note">{T('add.notChecked', { country: countryName(ctx.country) })}</p>;
}

// A sheet: a modal <dialog>, a side sheet on desktop and full screen on phones. Escape, Close and a
// click on the backdrop close it; the element marked data-autofocus (its heading) takes the focus.
// foot: the sheet's action bar (Add, Paste). The foot sticks to the sheet's bottom and holds the
// sheet's toast above the bar, so a toast never covers the bar's button (walk-through 2 N1: Undo sat
// over "Add 1 plant" and the click undid the last add). The sheet's scroll padding follows the foot's
// height, so a control tabbed to near the end is scrolled above the foot, not under it.
export function SheetFrame({ titleId, head, foot, children, class: cls = '' }: { titleId: string; head?: ComponentChildren; foot?: ComponentChildren; children: ComponentChildren; class?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  // A click closes the sheet only when it both starts and ends on the backdrop (a text selection
  // dragged out of the sheet and released outside does not).
  const downOnBackdrop = useRef(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // Its own sheet only: the close event comes a task after Escape, maybe once another sheet opened.
    const mine = store.sheet.peek();
    const onClose = () => { if (mine && store.sheet.peek() === mine) closeSheet(); };
    d.addEventListener('close', onClose);
    const foot = d.querySelector<HTMLElement>('.ct-sheet-foot')!;
    const room = new ResizeObserver(() => { d.style.scrollPaddingBottom = `${foot.offsetHeight + 8}px`; });
    room.observe(foot);
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => { room.disconnect(); d.removeEventListener('close', onClose); if (d.open) d.close(); };
  }, []);
  return (
    <dialog ref={ref} class={`ct-sheet ${cls}`} aria-labelledby={titleId}
      onPointerDown={(e) => { downOnBackdrop.current = e.target === ref.current; }}
      onClick={(e) => { if (e.target === ref.current && downOnBackdrop.current) closeSheet(); downOnBackdrop.current = false; }}>
      <div class="ct-sheet-inner">
        <div class="ct-sheet-head">
          <div class="ct-sheet-head-main">{head}</div>
          <button type="button" class="ct-icon-button" aria-label={T('close')} onClick={closeSheet}>{CLOSE}</button>
        </div>
        <div class="ct-sheet-body">{children}</div>
        <div class="ct-sheet-foot"><Toast where="sheet" />{foot}</div>
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
