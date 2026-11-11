/** @jsxImportSource preact */
// View slot of stream S4, after the matrix (App.tsx renders it once the plant list is ready): the
// link notices (§5: plants of a link no longer in the list, a cut link, a pasted link that changed
// nothing), then Share, Print and
// "Download for Canopi", the Share panel and the print sheet (hidden on screen). Nothing here while
// Start is shown.
import { useState } from 'preact/hooks';
import { canopiFile, canopiFileName } from '../../../lib/consortium/index.ts';
import { climate, memberTaxa, source, view } from '../store.ts';
import { P, T } from '../strings.ts';
import { notices } from '../memory.ts';
import { Share } from './Share.tsx';
import { PrintSheet } from './PrintSheet.tsx';
import { zoneLabel } from './Start.tsx';

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

function download(): void {
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

function ActionsView() {
  const [sharing, setSharing] = useState(false);
  return (
    <section class="ct-actions" aria-label={T('page.actions')}>
      <LinkNotices />
      <div class="ct-action-row">
        <button type="button" class="button button-secondary ct-small" aria-expanded={sharing ? 'true' : 'false'} onClick={() => setSharing(!sharing)}>{T('share.button')}</button>
        <button type="button" class="button button-secondary ct-small" onClick={() => window.print()}>{T('print.button')}</button>
        <button type="button" class="button button-secondary ct-small" onClick={download}>{T('download.button')}</button>
      </div>
      <p class="ct-muted ct-small-text">{T('download.note')}</p>
      {sharing && <Share onClose={() => setSharing(false)} />}
      <PrintSheet />
    </section>
  );
}

export function Actions() {
  return view.value === 'start' ? null : <ActionsView />;
}
