/** @jsxImportSource preact */
// Share (stream S4; design check §5, BT-7): the #v=4 link of the shown consortium, in a field to copy by
// hand, and copied by the Copy button only (a copy outside a click is refused by Safari, and would
// copy again on every edit). Its notes: a link above 2,000 characters ("Some apps cut long
// links…", core isLongLink on the whole URL), and a browser that keeps nothing ("This browser does
// not keep your consortium; your link does."). Rendered by views/Actions.tsx.
// P5 S5b: with a site location, the "include my location" tick (off by default, owner answer 5): the
// link then carries the site's climate cell centre (`o=`, never the precise position) and a country
// from the location (`k=`); without it, neither.
import { useEffect, useRef, useState } from 'preact/hooks';
import { cellCentre, isLongLink } from '../../../lib/consortium/index.ts';
import { T } from '../strings.ts';
import { location as site } from '../store.ts';
import { currentFragment, shareUrl, shownFragment, storageWorks } from '../state/persist.ts';

export function Share({ onClose }: { onClose: () => void }) {
  const shown = shownFragment.value;
  const [withSite, setWithSite] = useState(false);
  const origin = cellCentre(site.value?.lookup ?? null);
  const fragment = withSite && origin ? currentFragment(null, { origin }) ?? shown : shown;
  const url = fragment ? shareUrl(location.href, fragment) : location.href;
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const field = useRef<HTMLInputElement>(null);
  // A new link (the consortium changed): "Link copied." no longer holds.
  useEffect(() => { setCopied(null); }, [url]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('yes');
    } catch {
      field.current?.select();
      setCopied('no');
    }
  };
  return (
    <section class="ct-share ct-panel" aria-labelledby="ct-share-h">
      <h2 class="ct-step-title" id="ct-share-h">{T('share.title')}</h2>
      <p class="ct-share-row">
        <label for="ct-share-field" class="ct-share-label">{T('share.field')}</label>
        <input id="ct-share-field" ref={field} class="ct-share-field" type="text" readOnly value={url} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} />
        <button type="button" class="button button-secondary ct-small" onClick={() => void copy()}>{T('share.copy')}</button>
      </p>
      {origin && (
        <p class="ct-share-location">
          <label><input type="checkbox" data-share-location checked={withSite} onChange={(e) => setWithSite((e.currentTarget as HTMLInputElement).checked)} /> {T('share.location')}</label>
          {' '}<span class="ct-muted ct-small-text">{T('share.locationNote')}</span>
        </p>
      )}
      <p class="ct-muted" role="status">{copied === 'yes' ? T('share.done') : copied === 'no' ? T('share.copyByHand') : ''}</p>
      {isLongLink(url) && <p class="ct-note">{T('share.long')}</p>}
      {!storageWorks.value && <p class="ct-note">{T('share.noStorage')}</p>}
      <p class="ct-muted ct-small-text">{T('share.privacy')}</p>
      <p><button type="button" class="link-button ct-link" onClick={onClose}>{T('share.close')}</button></p>
    </section>
  );
}
