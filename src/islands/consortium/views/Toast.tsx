/** @jsxImportSource preact */
// The toast under the tool (stream S3): one short line after Remove, Swap or Add, with Undo when the
// change can be taken back (mockup 05 `removed`: "… removed. Its cells are free again. · Undo"; the
// gap stays). The live region is always in the page, so a new line is announced; a toast goes away by
// itself after a while, on Dismiss, or on Undo. Details.tsx renders it and calls showToast.
import { signal } from '@preact/signals';
import { T } from '../strings.ts';

export interface ToastLine { id: number; text: string; undo: (() => void) | null }
export const toast = signal<ToastLine | null>(null);

const SHOWN_MS = 12_000; // long enough to reach Undo with a keyboard or a screen reader
let timer: ReturnType<typeof setTimeout> | null = null;
let next = 1;

export function showToast(text: string, undo: (() => void) | null = null): void {
  if (timer) clearTimeout(timer);
  const line = { id: next++, text, undo };
  toast.value = line;
  timer = setTimeout(() => { if (toast.peek()?.id === line.id) toast.value = null; }, SHOWN_MS);
}
export function hideToast(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  toast.value = null;
}

export function Toast() {
  const line = toast.value;
  return (
    <div class="ct-toast-region" role="status" aria-live="polite">
      {line && (
        <div class="ct-toast" key={line.id}>
          <span class="ct-toast-text">{line.text}</span>
          {line.undo && (
            <button type="button" class="button button-secondary ct-toast-undo" onClick={() => { const undo = line.undo; hideToast(); undo?.(); }}>{T('undo')}</button>
          )}
          <button type="button" class="ct-icon-button" aria-label={T('dismiss')} onClick={hideToast}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
