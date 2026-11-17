/** @jsxImportSource preact */
// The sheets' router, in the first run (E6 design check §3 K3, A6): store.sheet → the sheet's dialog
// and frame (views/kit/sheet.tsx SheetDialog and SheetFrame, called only here) with the sheet's part
// inside, and the toast under the tool. App.tsx renders it always.
//
// Every view opens a sheet with the store's one opener, store.openSheet(kind, id, target): 'details'
// and 'swap' take a plant id; 'find' opens through store.openFind(target?) with what it was opened
// for (a hole: its job, the Hole and its test); 'paste' ("Paste a list") and 'place' (the "Your
// place" sheet, "Change your place" in the palette's head) take none. Nothing writes
// store.sheet directly, so what one sheet was opened for never leaks into the next. Whatever had the
// focus when a sheet opened (a chip) gets it back when the sheet closes (Escape, Close, the backdrop, a
// part that could not load); a chip that is gone by then is found again by `data-plant-id`, else the
// toast's Undo takes the focus, else the shown view's heading.
//
// Each sheet but "Your place" is a part loaded on first use (views/lazy.tsx later(), onFail
// 'closeSheet'): the plant dialog (views/details/Details.tsx), Swap, Find and Paste. "Your
// place" is Place's own parts (views/place/Place.tsx PlaceSheet), in the first run with Place. Each is
// prefetched once the data is ready; one opened before its chunk is here opens at once in its frame
// with a loading line (the dialog with the plant's name), and one whose chunk does not come closes with
// the toast and Reload. A part draws its sheet inside the frame it is given (`Frame`: the frame bound
// to this opening's close and the sheet's toast region), so no sheet imports the store's closer or the
// toast. Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is inert,
// Escape closes).
import { effect } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import * as store from '../store.ts';
import { closeSheet, taxonOf, type Sheet as Opened, type SheetKind } from '../store.ts';
import type { PlantId } from '../../../lib/consortium/index.ts';
import { T } from '../strings.ts';
import { LiveLine, SheetDialog, SheetFrame, SheetWaiting, type Frame, type FrameProps } from './kit/sheet.tsx';
import { nameOf } from './kit/names.ts';
import { Toast } from './Toast.tsx';
import { later } from './lazy.tsx';
import { focusView } from '../focus.ts';
import { PlaceSheet } from './place/Place.tsx';
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
// Paste is in the find role (built-modules.mjs ROLE_ENTRIES; c1 moves it into views/find/).
const paste = later(retryableImport(() => import('./Paste.tsx'), (m) => m.default), { ...sheet, find: true });

// One opening: one <dialog> (SheetDialog: one slide-in, one announcement), closing this sheet only
// (Escape fires `close` a task later, maybe once another sheet opened), and the frame its part draws
// in, with the sheet's toast region in its foot. A part that arrives replaces its loading frame
// inside the same dialog.
function Opening({ s }: { s: Opened }) {
  const [onClose, Frame] = useMemo<[() => void, Frame]>(() => {
    const close = () => { if (store.sheet.peek() === s) closeSheet(); };
    return [close, (p: FrameProps) => <SheetFrame {...p} onClose={close} toast={<Toast where="sheet" />} />];
  }, [s]);
  return <SheetDialog onClose={onClose}><Part s={s} Frame={Frame} /></SheetDialog>;
}
function Part({ s, Frame }: { s: Opened; Frame: Frame }) {
  switch (s.kind) {
    case 'details': return <details.View id={s.id!} Frame={Frame} />;
    case 'swap': return <swap.View id={s.id!} Frame={Frame} />;
    // PP-C commit 0 deleted the Add sheet; until c1's Find (views/find/) lands, Find opens the Paste
    // sheet, the other way to add plants by name, so no opener leads to an empty modal.
    case 'find': return <paste.View Frame={Frame} />;
    case 'paste': return <paste.View Frame={Frame} />;
    case 'place': return <PlaceSheet Frame={Frame} />;
    default: return null;
  }
}

const SHEETS: readonly SheetKind[] = ['details', 'swap', 'find', 'paste', 'place'];
const WITH_PLANT: readonly SheetKind[] = ['details', 'swap'];
function Router() {
  const s = store.sheet.value;
  if (!s || store.load.value.status !== 'ready') return null;
  // Keyed by opening: every sheet opened (details → Swap, one plant → another) mounts a fresh dialog
  // whose close listener knows its own sheet.
  if (!SHEETS.includes(s.kind) || (WITH_PLANT.includes(s.kind) && !s.id)) return null; // share and download are not sheets
  return <Opening key={`${s.kind}:${s.n}`} s={s} />;
}

// The ways into Find the palette page shows (PP-C commit 0, slices 3.2; boards Palette, Empty,
// FindDesk): "Add plants" right of the palette's title at 1280 (`head`), the phone's bottom bar with
// "Add plants" (`bar`; hidden while a sheet is open) and the empty palette's first row, "Find plants"
// (`empty`). Mount points the palette page renders; c1 (which owns this file and views/find/) fills
// them, each opening Find through store.openFind(), so the palette page's files never change for
// them. Empty until then. The bar's height is --ct-bar-room (details.css).
export type FindEntryPlace = 'head' | 'bar' | 'empty';
export function FindEntry(_: { where: FindEntryPlace }) {
  return null;
}

export function Sheets() {
  return <><Router /><Toast /></>;
}
