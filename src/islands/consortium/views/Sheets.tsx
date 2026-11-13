/** @jsxImportSource preact */
// The sheets' router, in the first run (E6 design check §3 K3, A6): store.sheet → the sheet frame
// (views/kit/sheet.tsx SheetFrame, called only here) with the sheet's part inside, and the toast under
// the tool. App.tsx renders it always.
//
// Every view opens a sheet with the store's one opener, store.openSheet(kind, id, target): 'details'
// and 'swap' take a plant id; 'add' takes what it was opened for (a cell or run of one layer, a job,
// "Show them anyway"); 'search' (Start's "Start empty and search") and 'paste' ("Paste a list") take
// none. Nothing writes store.sheet directly, so what one sheet was opened for never leaks into the
// next. Whatever had the focus when a sheet opened (a chip) gets it back when the sheet closes
// (Escape, Close, the backdrop, a part that could not load); a chip that is gone by then is found
// again by `data-plant-id`, else the toast's Undo takes the focus.
//
// Each sheet is a part loaded on first use (views/lazy.tsx later(), onFail 'closeSheet'): the plant
// dialog (views/details/Details.tsx), Swap, Add (also Search) and Paste. Each is prefetched once the
// data is ready; one opened before its chunk is here opens at once in its frame with a loading line
// (the dialog with the plant's name), and one whose chunk does not come closes with the toast and
// Reload. A part draws its sheet inside the frame it is given (`Frame`: the frame bound to this
// opening's close and the sheet's toast region), so no sheet imports the store's closer or the toast.
// Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is inert,
// Escape closes).
import { effect } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import * as store from '../store.ts';
import { closeSheet, taxonOf, type Sheet as Opened } from '../store.ts';
import type { PlantId } from '../../../lib/consortium/index.ts';
import { T } from '../strings.ts';
import { SheetFrame, type Frame, type FrameProps } from './kit/sheet.tsx';
import { nameOf } from './kit/names.ts';
import { Toast } from './Toast.tsx';
import { later } from './lazy.tsx';

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
        const again = plant ? document.querySelector<HTMLElement>(`[data-plant-id="${CSS.escape(plant)}"]`) : null;
        const target = back?.isConnected ? back : again ?? document.querySelector<HTMLElement>('.ct-toast-undo');
        target?.focus();
      });
    }
    wasOpen = !!s;
  });
}

// A sheet whose part is still loading: its frame with a loading line (a status), the plant's name
// for the dialog (L2), so the reader sees the sheet open at once.
function Waiting({ Frame }: { Frame: Frame }) {
  return (
    <Frame titleId="ct-sheet-wait">
      <p id="ct-sheet-wait" class="status-line" role="status" tabIndex={-1} data-autofocus>{T('details.loading')}</p>
    </Frame>
  );
}
function DetailsWaiting({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  return (
    <Frame titleId="ct-d-title" class="ct-details">
      <div class="ct-d-name"><h2 id="ct-d-title" tabIndex={-1} data-autofocus>{t ? nameOf(t) : ''}</h2></div>
      <p class="status-line" role="status">{T('details.loading')}</p>
    </Frame>
  );
}

const sheet = { onFail: 'closeSheet', loading: Waiting } as const;
const details = later(() => import('./details/Details.tsx').then((m) => m.PlantDetails), { onFail: 'closeSheet', loading: DetailsWaiting });
const swap = later(() => import('./Swap.tsx').then((m) => m.default), sheet);
const add = later(() => import('./Add.tsx').then((m) => m.default), sheet);
const paste = later(() => import('./Paste.tsx').then((m) => m.default), sheet);

// One opening: its frame closes this sheet only (Escape fires `close` a task later, maybe once
// another sheet opened), with the sheet's toast region in its foot.
function Opening({ s }: { s: Opened }) {
  const Frame = useMemo<Frame>(() => {
    const onClose = () => { if (store.sheet.peek() === s) closeSheet(); };
    return (p: FrameProps) => <SheetFrame {...p} onClose={onClose} toast={<Toast where="sheet" />} />;
  }, [s]);
  switch (s.kind) {
    case 'details': return s.id ? <details.View id={s.id} Frame={Frame} /> : null;
    case 'swap': return s.id ? <swap.View id={s.id} Frame={Frame} /> : null;
    case 'add': return <add.View mode="add" Frame={Frame} />;
    case 'search': return <add.View mode="search" Frame={Frame} />;
    case 'paste': return <paste.View Frame={Frame} />;
    default: return null; // share and download are not sheets
  }
}

function Router() {
  const s = store.sheet.value;
  if (!s || store.load.value.status !== 'ready') return null;
  // Keyed by opening: every sheet opened (details → Swap, one plant → another) mounts a fresh dialog
  // whose close listener knows its own sheet.
  return <Opening key={`${s.kind}:${s.n}`} s={s} />;
}

export function Sheets() {
  return <><Router /><Toast /></>;
}
