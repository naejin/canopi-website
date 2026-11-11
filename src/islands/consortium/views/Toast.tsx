/** @jsxImportSource preact */
// The toast under the tool (stream S3): one short line after Remove, Swap or Add, with Undo when the
// change can be taken back (mockup 05 `removed`: "… removed. Its cells are free again. · Undo"; the
// gap stays), and at most one more action ("Show", "Reload"). The live regions are always in the page,
// so a new line is announced: one in the page, one inside every open sheet (a modal <dialog> makes the
// page behind it inert, so a line shown while a sheet is open, as after Paste's "Add anyway", is shown
// and heard in the sheet). A line is announced once, by the region it first shows in: moved into a
// sheet or back out, it is shown outside that region's live part, so it is not read again. A toast goes away by itself after a while, on Dismiss, or on its action.
// Details.tsx renders both regions and calls showToast.
import { signal } from '@preact/signals';
import * as store from '../store.ts';
import { T } from '../strings.ts';

export interface ToastAction { label: string; run: () => void }
type Where = 'page' | 'sheet';
export interface ToastLine { id: number; text: string; undo: (() => void) | null; action: ToastAction | null; where: Where }
export const toast = signal<ToastLine | null>(null);

const SHOWN_MS = 12_000; // long enough to reach Undo with a keyboard or a screen reader
let timer: ReturnType<typeof setTimeout> | null = null;
let next = 1;

export function showToast(text: string, undo: (() => void) | null = null, action: ToastAction | null = null): void {
  if (timer) clearTimeout(timer);
  const line = { id: next++, text, undo, action, where: (store.sheet.peek() !== null ? 'sheet' : 'page') as Where };
  toast.value = line;
  timer = setTimeout(() => { if (toast.peek()?.id === line.id) toast.value = null; }, SHOWN_MS);
}
export function hideToast(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  toast.value = null;
}

// where: 'page' (shown while no sheet is open) or 'sheet' (inside the open sheet).
export function Toast({ where = 'page' }: { where?: Where }) {
  const here = (store.sheet.value !== null) === (where === 'sheet');
  const line = here ? toast.value : null;
  const card = line && (
        <div class="ct-toast" key={line.id}>
          <span class="ct-toast-text">{line.text}</span>
          {line.undo && (
            <button type="button" class="button button-secondary ct-toast-undo" onClick={() => { const undo = line.undo; hideToast(); undo?.(); }}>{T('undo')}</button>
          )}
          {line.action && (
            <button type="button" class="button button-secondary ct-toast-undo" onClick={() => { const run = line.action!.run; hideToast(); run(); }}>{line.action.label}</button>
          )}
          <button type="button" class="ct-icon-button" aria-label={T('dismiss')} onClick={hideToast}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>
          </button>
        </div>
  );
  const heard = line?.where === where;
  return (
    <div class={`ct-toast-region ct-toast-${where}`}>
      <div role="status" aria-live="polite">{heard && card}</div>
      {!heard && card}
    </div>
  );
}
