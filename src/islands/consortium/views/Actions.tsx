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
import { later, laterModule, LoadFailed } from './lazy.tsx';
import { laterChunk } from './later-chunk.ts';

// Share, the print sheet and the .canopi writer load after the first view (views/lazy.tsx), all through
// the later chunk's one loader (views/later-chunk.ts): one retry state for every part. The print sheet
// (idle: never a download of its own) is in the page only while printing: Print, the browser's own
// Print menu (beforeprint) or print media (review r1 perf-4: a hidden 200-row sheet re-rendered on
// every add); once the chunk is in, mounting it is synchronous, before the print layout.
const share = later(() => laterChunk().then((m) => m.Share));
const print = later(() => laterChunk().then((m) => m.PrintSheet), { idle: true });
const printing = signal(false);
const printMedia = (): boolean => typeof matchMedia === 'function' && matchMedia('print').matches;
function PrintHost() {
  useEffect(() => {
    const on = () => { printing.value = true; };
    const off = () => { printing.value = printMedia(); };
    const media = typeof matchMedia === 'function' ? matchMedia('print') : null;
    const change = (e: MediaQueryListEvent) => (e.matches ? on() : off());
    addEventListener('beforeprint', on);
    addEventListener('afterprint', off);
    media?.addEventListener('change', change);
    if (printMedia()) on();
    return () => { removeEventListener('beforeprint', on); removeEventListener('afterprint', off); media?.removeEventListener('change', change); };
  }, []);
  return printing.value ? <print.View /> : null;
}
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

// Print or Download when the chunk they need did not load: said here with lazy.tsx's LoadFailed
// (F4): Reload online; offline "Needs a connection", never a reload (review r2 offline-1), and the
// line goes once back online, so the next press tries the chunk again.
const partFailed = signal(false);
const clearFailed = (): void => { partFailed.value = false; };
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

// Print: the sheet first (already there once prefetched), mounted, then the browser's dialog after it
// renders. One at a time: a second press while the sheet loads does nothing.
let asking = false;
async function printNow(): Promise<void> {
  if (asking) return;
  asking = true;
  try {
    if (!print.ready()) await print.load();
    printing.value = true;
    requestAnimationFrame(() => requestAnimationFrame(() => { asking = false; window.print(); }));
  } catch (err) {
    asking = false;
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
      {partFailed.value && <LoadFailed retry={clearFailed} />}
      <p class="ct-muted ct-small-text">{T('download.note')}</p>
      {sharing && <share.View onClose={() => setSharing(false)} />}
      <PrintHost />
    </section>
  );
}

// (ct:first-view is the palette page's: views/palette/Palette.tsx, once its Next step shows.)
export function Actions() {
  return view.value === 'start' ? null : <><ActionsView /><future.View /></>;
}
