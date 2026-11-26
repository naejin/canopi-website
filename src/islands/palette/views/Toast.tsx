/** @jsxImportSource preact */
// Page-level toast region for store actions (Start over Undo, Suggest errors).
import { hideToast, holdToast, toast } from '../store.ts';
import { T } from '../strings.ts';
import { focusPlant } from '../focus.ts';

export function Toast() {
  const line = toast.value;
  const notice = !!line && !line.undo && !!line.action;
  const card = line && (
    <div
      class={notice ? 'ct-toast ct-toast-notice' : 'ct-toast'}
      key={line.id}
      onPointerEnter={() => holdToast(true)}
      onPointerLeave={() => holdToast(false)}
      onFocusIn={() => holdToast(true)}
      onFocusOut={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) holdToast(false); }}
    >
      <span class="ct-toast-text">{line.text}</span>
      {line.action && (
        <button
          type="button"
          class="button button-secondary ct-toast-action"
          aria-label={line.action.name}
          onClick={() => { const { run, keep } = line.action!; if (!keep) hideToast(); run(); }}
        >
          {line.action.label}
        </button>
      )}
      {line.undo && (
        <button
          type="button"
          class="button button-secondary ct-toast-undo"
          onClick={() => { const undo = line.undo; hideToast(); undo?.(); focusPlant(line.focus[0], line.from); }}
        >
          {T('undo')}
        </button>
      )}
      <button type="button" class="ct-icon-button ct-toast-dismiss" aria-label={T('dismiss')} onClick={hideToast}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>
      </button>
    </div>
  );
  return (
    <div class="ct-toast-region ct-toast-page">
      <div role="status" aria-live="polite">{card}</div>
    </div>
  );
}
