/** @jsxImportSource preact */
// View slot of stream S4, after the matrix (App.tsx renders it once the plant list is ready): the
// link notices (§5: plants of a link no longer in the list, a cut link, a pasted link that changed
// nothing), then Share, Print and
// "Download for Canopi", the Share panel and the print sheet (hidden on screen). Nothing here while
// Start is shown.
import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { climate, memberTaxa, source, view } from '../store.ts';
import { P, T } from '../strings.ts';
import { notices } from '../memory.ts';
import { zoneLabel } from './Start.tsx';
import { later, laterModule } from './lazy.tsx';

// Share, the print sheet and the .canopi writer load after the matrix (views/lazy.tsx); the print
// sheet is in the page as soon as it has loaded, so the browser's own Print menu prints it too.
const share = later(() => import('./later.ts').then((m) => m.Share));
const print = later(() => import('./later.ts').then((m) => m.PrintSheet), { quiet: true });
const writer = laterModule(() => import('./later.ts'));

function LinkNotices() {
  const n = notices.value;
  if (!n.unknownCount && !n.cut && !n.pasted) return null;
  return (
    <div class="ct-notice" role="status">
      {n.pasted && <p>{T(`share.pasted.${n.pasted}`)}</p>}
      {n.unknownCount > 0 && <p>{P('share.unknown', n.unknownCount)}</p>}
      {n.cut && <p>{T('share.cut')}</p>}
      <p><button type="button" class="link-button ct-link" onClick={() => { notices.value = { ...notices.peek(), unknownCount: 0, cut: false, pasted: null }; }}>{T('share.close')}</button></p>
    </div>
  );
}

// Print or Download when the chunk they need did not load: said here, with Reload (F4).
const partFailed = signal(false);
const failed = (err: unknown): void => { console.error(`Consortium: a part did not load: ${(err as Error).message}`); partFailed.value = true; };

async function download(): Promise<void> {
  let mod: Awaited<ReturnType<typeof writer>>;
  try { mod = await writer(); } catch (err) { failed(err); return; }
  const { canopiFile, canopiFileName } = mod;
  const zone = zoneLabel(climate.peek());
  const name = T('download.name', { climate: zone });
  const text = canopiFile(memberTaxa.peek(), {
    name,
    description: T('download.description', { climate: zone, id: source.peek()?.info().releaseId ?? '' }),
    at: new Date().toISOString(),
  });
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = canopiFileName(name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Print: the sheet first (already there once prefetched), then the browser's dialog after it renders.
// One at a time: a second press while the sheet loads does nothing.
let printing = false;
async function printNow(): Promise<void> {
  if (print.ready()) { window.print(); return; }
  if (printing) return;
  printing = true;
  try {
    await print.load();
    requestAnimationFrame(() => requestAnimationFrame(() => { printing = false; window.print(); }));
  } catch (err) {
    printing = false;
    failed(err);
  }
}

function ActionsView() {
  const [sharing, setSharing] = useState(false);
  return (
    <section class="ct-page-actions" aria-label={T('page.actions')}>
      <LinkNotices />
      <div class="ct-action-row">
        <button type="button" class="button button-secondary ct-small" aria-expanded={sharing ? 'true' : 'false'} onClick={() => setSharing(!sharing)}>{T('share.button')}</button>
        <button type="button" class="button button-secondary ct-small" onClick={() => void printNow()}>{T('print.button')}</button>
        <button type="button" class="button button-secondary ct-small" onClick={() => void download()}>{T('download.button')}</button>
      </div>
      {partFailed.value && <p class="ct-notice" role="alert">{T('details.loadFailed')} <button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('details.reload')}</button></p>}
      <p class="ct-muted ct-small-text">{T('download.note')}</p>
      {sharing && <share.View onClose={() => setSharing(false)} />}
      <print.View />
    </section>
  );
}

export function Actions() {
  return view.value === 'start' ? null : <ActionsView />;
}
