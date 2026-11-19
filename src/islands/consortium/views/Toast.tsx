/** @jsxImportSource preact */
// The toast under the tool (stream S3): one short line after Remove, Swap or Add, with Undo when the
// change can be taken back (mockup 05 `removed`: "… removed. Its cells are free again. · Undo"; the
// gap stays), and at most one more action ("Show", "Reload"). The live regions are always in the page,
// so a new line is announced: one in the page, one inside every open sheet (a modal <dialog> makes the
// page behind it inert, so a line shown while a sheet is open, as after Paste's "Add anyway", is shown
// and heard in the sheet). A line is announced once, by the region it first shows in: moved into a
// sheet or back out, it is shown outside that region's live part, so it is not read again. A toast goes away by itself after a while, on Dismiss, or on its action.
// views/Sheets.tsx renders both regions; the store's edits call showToast (store.ts).
// A notice (a line with an action and no Undo: a part that could not load, with Reload) sits in the
// page's flow at the end of the tool, never over the page (b1a UI hand-off; details.css); it goes as
// any line does.
import { computed, signal } from '@preact/signals';
import * as store from '../store.ts';
import { hideToast, holdToast, toast, type ToastWhere as Where } from '../store.ts';
import { T } from '../strings.ts';
import { focusPlant } from '../focus.ts';

// At 960 px and wider Find is a panel beside the chart, not a modal sheet (board DeskStates, Q5): the
// page stays usable, so its lines show in the page's region, bottom left (Q4), never in the panel.
const wideQuery = typeof matchMedia === 'function' ? matchMedia('(min-width: 960px)') : null;
const wide = signal(!!wideQuery?.matches);
wideQuery?.addEventListener('change', (e) => { wide.value = e.matches; });
// Find stays the panel while a plant's Details is stacked over it (h3 R1, R2).
export const deskFind = computed(() => wide.value && !!store.findSheet.value && store.step.value === 'palette');

// where: 'page' (shown while no modal sheet is on top) or 'sheet' (inside the top sheet, `of`: each
// stacked sheet has a region, and only the top one shows the line).
export function Toast({ where = 'page', of = null }: { where?: Where; of?: store.Sheet | null }) {
  const top = store.sheet.value;
  const desk = deskFind.value && top?.kind === 'find';
  const here = where === 'sheet' ? top !== null && !desk && top === of : top === null || desk;
  const line = here ? toast.value : null;
  const notice = !!line && !line.undo && !!line.action;
  const card = line && (
        <div class={notice ? 'ct-toast ct-toast-notice' : 'ct-toast'} key={line.id} onPointerEnter={() => holdToast(true)} onPointerLeave={() => holdToast(false)}
          onFocusIn={() => holdToast(true)} onFocusOut={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) holdToast(false); }}>
          <span class="ct-toast-text">{line.text}</span>
          {/* Board Toasts: the action (Show), then Undo. Undo alone has the class ct-toast-undo, which the
              focus moves look for (h3 R5); the action's own name starts with its word (WCAG 2.5.3). */}
          {line.action && (
            <button type="button" class="button button-secondary ct-toast-action" aria-label={line.action.name} onClick={() => { const { run, keep } = line.action!; if (!keep) hideToast(); run(); }}>{line.action.label}</button>
          )}
          {line.undo && (
            <button type="button" class="button button-secondary ct-toast-undo" onClick={() => { const undo = line.undo; hideToast(); undo?.(); focusPlant(line.focus[0], line.from); }}>{T('undo')}</button>
          )}
          {/* BC28 (boards Toasts, DeskStates): the card shows its line and Undo only; Dismiss is for the
              keyboard, shown only while it has the focus (details.css), as the line goes by itself. */}
          <button type="button" class="ct-icon-button ct-toast-dismiss" aria-label={T('dismiss')} onClick={hideToast}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>
          </button>
        </div>
  );
  const heard = line?.where === where || (desk && where === 'page');
  return (
    <div class={`ct-toast-region ct-toast-${where}`}>
      <div role="status" aria-live="polite">{heard && card}</div>
      {!heard && card}
    </div>
  );
}
