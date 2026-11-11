/** @jsxImportSource preact */
// Share (stream S4; design check §5, BT-7): the #v=4 link of the shown consortium, copied at once and
// shown in a field to copy by hand. Its notes: a link above 2,000 characters ("Some apps cut long
// links…", core isLongLink on the whole URL), and a browser that keeps nothing ("This browser does
// not keep your consortium; your link does."). Rendered by views/Actions.tsx.
import { useEffect, useRef, useState } from 'preact/hooks';
import { isLongLink } from '../../../lib/consortium/index.ts';
import { T } from '../strings.ts';
import { currentFragment, shareUrl, storageWorks } from '../memory.ts';

export function Share({ onClose }: { onClose: () => void }) {
  const fragment = currentFragment();
  const url = fragment ? shareUrl(location.href, fragment) : location.href;
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const field = useRef<HTMLInputElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('yes');
    } catch {
      field.current?.select();
      setCopied('no');
    }
  };
  useEffect(() => { void copy(); }, [url]);
  return (
    <section class="ct-share ct-panel" aria-labelledby="ct-share-h">
      <h2 class="ct-step-title" id="ct-share-h">{T('share.title')}</h2>
      <p class="ct-share-row">
        <label for="ct-share-field" class="ct-share-label">{T('share.field')}</label>
        <input id="ct-share-field" ref={field} class="ct-share-field" type="text" readOnly value={url} onFocus={(e) => (e.currentTarget as HTMLInputElement).select()} />
        <button type="button" class="button button-secondary ct-small" onClick={() => void copy()}>{T('share.copy')}</button>
      </p>
      <p class="ct-muted" role="status">{copied === 'yes' ? T('share.done') : copied === 'no' ? T('share.copyByHand') : ''}</p>
      {isLongLink(url) && <p class="ct-note">{T('share.long')}</p>}
      {!storageWorks.value && <p class="ct-note">{T('share.noStorage')}</p>}
      <p class="ct-muted ct-small-text">{T('share.privacy')}</p>
      <p><button type="button" class="link-button ct-link" onClick={onClose}>{T('share.close')}</button></p>
    </section>
  );
}
