/** @jsxImportSource preact */
// The sheets' router, in the first run (E6 design check §3 K3, A6): store.sheet → the sheet's dialog
// and frame (views/kit/sheet.tsx SheetDialog and SheetFrame, called only here) with the sheet's part
// inside, and the toast under the tool. App.tsx renders it always.
//
// Every view opens a sheet with the store's one opener, store.openSheet(kind, id, target): 'details'
// and 'swap' take a plant id; 'find' opens through store.openFind(target?) with what it was opened
// for (a hole: its job, the Hole and its test); 'paste' ("Paste a list") takes none. Nothing writes
// store.sheet directly, so what one sheet was opened for never leaks into the next. Whatever had the
// focus when a sheet opened (a chip) gets it back when the sheet closes (Escape, Close, the backdrop, a
// part that could not load); a chip that is gone by then is found again by `data-plant-id`, else the
// toast's Undo takes the focus, else the shown view's heading.
//
// Each sheet is a part loaded on first use (views/lazy.tsx later(), onFail 'closeSheet'): the plant
// dialog (views/details/Details.tsx), Swap, Find and Paste. Each is
// prefetched once the data is ready; one opened before its chunk is here opens at once in its frame
// with a loading line (the dialog with the plant's name), and one whose chunk does not come closes with
// the toast and Reload. A part draws its sheet inside the frame it is given (`Frame`: the frame bound
// to this opening's close and the sheet's toast region), so no sheet imports the store's closer or the
// toast. Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is inert,
// Escape closes).
import { effect, signal } from '@preact/signals';
import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import * as store from '../store.ts';
import { closeSheet, taxonOf, type Sheet as Opened, type SheetKind } from '../store.ts';
import type { PlantId } from '../../../lib/consortium/index.ts';
import { T } from '../strings.ts';
import { LiveLine, SheetDialog, SheetFrame, SheetWaiting, type Frame, type FrameProps } from './kit/sheet.tsx';
import { CLOSE } from './kit/icons.tsx';
import { nameOf } from './kit/names.ts';
import { deskFind, Toast } from './Toast.tsx';
import { later } from './lazy.tsx';
import { focusView } from '../focus.ts';
import { retryableImport } from '../../../lib/consortium/index.ts';

// Focus back to the opener when the last sheet closes.
let opener: HTMLElement | null = null, openerPlant: PlantId | null = null, wasOpen = false;
if (typeof document !== 'undefined') {
  effect(() => {
    const s = store.sheet.value;
    if (s && !wasOpen) {
      const a = document.activeElement;
      opener = a instanceof HTMLElement && a !== document.body ? a : null;
      openerPlant = s.id;
    }
    if (!s && wasOpen) {
      const back = opener, plant = openerPlant;
      opener = null;
      requestAnimationFrame(() => {
        // Found again only while still in the palette and shown (not a removed plant offered to add
        // back, or a control a phone's one time step hides): else the Undo, else the heading.
        const again = plant && store.members.peek().includes(plant)
          ? [...document.querySelectorAll<HTMLElement>(`#ct-root [data-plant-id="${CSS.escape(plant)}"]`)].find((el) => el.getClientRects().length) ?? null : null;
        const target = back?.isConnected ? back : again ?? document.querySelector<HTMLElement>('.ct-toast-undo');
        // The opener gone with its view (an Undo back to Place): the shown view's heading (b1a2-6).
        if (target) target.focus(); else focusView();
      });
    }
    wasOpen = !!s;
  });
}

// The plant dialog's loading frame names the plant (L2), so the reader sees the sheet open at once
// (the other sheets: kit/sheet.tsx SheetWaiting).
function DetailsWaiting({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  return (
    <Frame titleId="ct-d-title" class="ct-details">
      <div class="ct-d-name"><h2 id="ct-d-title" tabIndex={-1} data-autofocus>{t ? nameOf(t) : ''}</h2></div>
      <LiveLine text={T('details.loading')} />
    </Frame>
  );
}

const sheet = { onFail: 'closeSheet', loading: SheetWaiting } as const;
const details = later(retryableImport(() => import('./details/Details.tsx'), (m) => m.PlantDetails), { onFail: 'closeSheet', loading: DetailsWaiting });
const swap = later(retryableImport(() => import('./Swap.tsx'), (m) => m.default), sheet);
// Find and Paste: one chunk, the find role (views/find/index.ts; built-modules.mjs ROLE_ENTRIES), so
// the search module ships with them only.
const findChunk = () => import('./find/index.ts');
const find = later(retryableImport(findChunk, (m) => m.Find), { ...sheet, find: true });
const paste = later(retryableImport(findChunk, (m) => m.Paste), { ...sheet, find: true });

// One opening: one <dialog> (SheetDialog: one slide-in, one announcement), closing this sheet only
// (Escape fires `close` a task later, maybe once another sheet opened), and the frame its part draws
// in, with the sheet's toast region in its foot. A part that arrives replaces its loading frame
// inside the same dialog.
// Its ×, Escape and the backdrop close this sheet only, the top one (store.backToSheet): a sheet under it
// (Find under Details, h3 R1) shows again as it was, and the focus goes back to what opened this one
// (the Find row's name), found when it opened; the last sheet's close is the effect above.
function Opening({ s }: { s: Opened }) {
  const [onClose, Frame, opened, under] = useMemo<[() => void, Frame, Element | null, Opened | null]>(() => {
    const close = () => { if (store.sheet.peek() === s) store.backToSheet(); };
    const open = store.sheets.peek();
    return [close, (p: FrameProps) => <SheetFrame {...p} onClose={close} toast={<Toast where="sheet" of={s} />} />, document.activeElement, open[open.indexOf(s) - 1] ?? null];
  }, [s]);
  useLayoutEffect(() => () => {
    if (!under || store.sheet.peek() !== under || !(opened instanceof HTMLElement)) return;
    requestAnimationFrame(() => { if (opened.isConnected) opened.focus(); });
  }, []);
  return <SheetDialog onClose={onClose}><Part s={s} Frame={Frame} /></SheetDialog>;
}
function Part({ s, Frame }: { s: Opened; Frame: Frame }) {
  switch (s.kind) {
    case 'details': return <details.View id={s.id!} Frame={Frame} />;
    case 'swap': return <swap.View id={s.id!} Frame={Frame} />;
    case 'find': return <find.View Frame={Frame} />;
    case 'paste': return <paste.View Frame={Frame} />;
    default: return null;
  }
}

const WITH_PLANT: readonly SheetKind[] = ['details', 'swap'];
function Router() {
  const open = store.sheets.value;
  if (!open.length || store.load.value.status !== 'ready') return null;
  // One dialog per open sheet, bottom first, so each one opened stacks over the last (showModal order)
  // and the ones under stay mounted (h3 R1). Keyed by opening: every sheet opened mounts a fresh dialog
  // whose close listener knows its own sheet. At 960 px Find is the panel beside the chart (FindPanel).
  const desk = deskFind.value;
  return <>{open.filter((s) => !(WITH_PLANT.includes(s.kind) && !s.id) && !(desk && s.kind === 'find')).map((s) => <Opening key={`${s.kind}:${s.n}`} s={s} />)}</>;
}

// The ways into Find the palette page shows (PP-C c1, slices 3.2; boards Palette, Empty, FindDesk):
// "Add plants" right of the palette's title from 640 px (`head`), the phone's bottom bar with "Add
// plants" (`bar`, under 640 px; hidden while a sheet is open, the sheet's foot holding its toasts).
// Each opens Find through store.openFind(); the empty palette's "Find plants" row is NextStep's own.
// The bar's height is --ct-bar-room (find.css sets it while the bar shows; details.css reads it for
// the toast offset, the root padding and scroll-padding-bottom).
export type FindEntryPlace = 'head' | 'bar';
export function FindEntry({ where }: { where: FindEntryPlace }) {
  const open = () => store.openFind();
  if (where === 'bar') {
    return (
      <div class="ct-bar ct-find-phonebar" hidden={!!store.sheet.value}>
        <button type="button" class="button button-primary" data-find-entry="bar" onClick={open}>{T('find.title')}</button>
      </div>
    );
  }
  return <button type="button" class="button button-secondary ct-find-head" data-find-entry="head" onClick={open}>{T('find.title')}</button>;
}

// Find at 960 px and wider (board DeskStates, FindDesk; Q5): beside the chart, not a modal: a
// non-modal <dialog open> (the page stays usable; the same sheet words, Close and Done, and the same
// `dialog.ct-find` scope as the phone's sheet), placed in the palette grid by
// views/palette/FindPanelSlot.tsx and find.css. Escape closes it from inside; the focus goes back to
// the opener (the effect above). Its messages show in the page, bottom left (Toast.tsx deskFind, Q4).
// R2: a non-modal region takes the focus once, when it opens (mounted per opening: FindPanel's key),
// never on a re-render, so a page action while it is open (an Add in the Next step, a Remove) keeps
// the reader's place.
function PanelFrame({ titleId, head, foot, children, class: cls = '' }: FrameProps) {
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { inner.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(); }, []);
  return (
    <dialog open class={`ct-sheet ct-find-panel ${cls}`} aria-labelledby={titleId} data-find-panel=""
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(); } }}>
      <div class="ct-sheet-inner" ref={inner}>
        <div class="ct-sheet-head">
          <div class="ct-sheet-head-main">{head}</div>
          <button type="button" class="ct-icon-button" aria-label={T('close')} onClick={closeSheet}>{CLOSE}</button>
        </div>
        <div class="ct-sheet-body">{children}</div>
        <div class="ct-sheet-foot">{foot}</div>
      </div>
    </dialog>
  );
}
// Where the desk's panel stands (v14 pf-e F30, A22; board ManyDesk): beside the chart in the palette
// grid ('grid', FindPanelSlot), or in place of Your plants' table past 40 plants ('list', its "Add
// plants": the panel stays open while the reader adds, Done brings the table back and the focus to
// "Add plants" through the opener above). Back to 'grid' once Find closes.
export const findIn = signal<'grid' | 'list'>('grid');
export function openFindInList(): void { findIn.value = 'list'; store.openFind(); }
// Find under a plant's Details (h3 R2) is still open, so the panel keeps its place.
if (typeof document !== 'undefined') effect(() => { if (!store.findSheet.value && findIn.peek() !== 'grid') findIn.value = 'grid'; });
export function FindPanel({ where = 'grid' }: { where?: 'grid' | 'list' }) {
  const s = store.findSheet.value;
  if (!s || !deskFind.value || store.load.value.status !== 'ready' || findIn.value !== where) return null;
  return <find.View key={s.n} Frame={PanelFrame} />;
}

export function Sheets() {
  return <><Router /><Toast /></>;
}
