/** @jsxImportSource preact */
// View slot of stream S4, in the palette slot (App.tsx renders it once the plant list is ready; the
// matrix it followed went in PP-B commit 0a', and b2 hosts it under the palette page): the link
// notices (§5: plants of a link no longer in the list, a cut link, a pasted link that changed
// nothing), then Share, Print and "Download for Canopi", the Share panel and the print sheet (hidden
// on screen), then the future panel. Nothing here while Start is shown.
import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { climate, memberTaxa, source, view } from '../store.ts';
import { P, T } from '../strings.ts';
import { notices } from '../state/restore.ts';
import { zoneName } from './kit/names.ts';
import { later, laterModule, prefetchLater } from './lazy.tsx';
import { laterChunk } from './later-chunk.ts';

// Share, the print sheet and the .canopi writer load after the first view (views/lazy.tsx); the print
// sheet is in the page as soon as it has loaded, so the browser's own Print menu prints it too.
// All through the later chunk's one loader (views/later-chunk.ts): one retry state for every part.
const share = later(() => laterChunk().then((m) => m.Share));
const print = later(() => laterChunk().then((m) => m.PrintSheet), { quiet: true });
const writer = laterModule(laterChunk);
// S5d's future panel (views/FutureSlot.tsx), after this section: it lands
// once the later chunk and its own feature chunk have loaded, ~150 ms after Suggest, so above the
// actions it pushed Share, Print and Download down under the reader's pointer (hand-off, found tracing
// P5-13d). Idle: shown once prefetchLater() has loaded the later chunk, never a download before the
// first view is marked drawn (§8 timing).
const future = later(() => laterChunk().then((m) => m.FutureSlot), { idle: true });

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
  // A retry that fetched another file than the later chunk (lazy.tsx retryable): said, not thrown.
  if (typeof canopiFile !== 'function') { failed(new Error('the .canopi writer is not in the module that loaded')); return; }
  const zone = zoneName(climate.peek());
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

// performance.mark('ct:first-view') once per page, when the consortium is first on screen (the
// palette slot; moved here from Matrix.tsx in PP-B commit 0a' until b2 marks the palette page): the
// timing script waits for it (design check A7), and the later chunk is prefetched then. Rendered inside
// the slot, so its effect runs after the browser painted it.
let marked = false;
function FirstPaint() {
  useEffect(() => {
    if (marked || typeof performance === 'undefined') return;
    marked = true;
    performance.mark('ct:first-view');
    prefetchLater();
  }, []);
  return null;
}

export function Actions() {
  return view.value === 'start' ? null : <><FirstPaint /><ActionsView /><future.View /></>;
}
