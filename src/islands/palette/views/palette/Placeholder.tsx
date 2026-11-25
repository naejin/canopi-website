/** @jsxImportSource preact */
// Unified loading shell for return visits & palette restore (Wave 5 N10):
// Matches PalettePage.astro's .ct-loading-shell verbatim (zero visual jump), delays visual shell
// by 150 ms so warm caches never flash, folds live download progress into the single status line,
// and keeps data-palette-placeholder + h2[data-view-heading] for accessibility & focus.
import { useEffect, useState } from 'preact/hooks';
import { loadProgress, slow } from '../../store.ts';
import { formatMegabytes, formatNumber } from '../../format.ts';
import { pageLang, T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';

export function Placeholder() {
  const [showShell, setShowShell] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowShell(true), 150);
    return () => clearTimeout(id);
  }, []);

  const p = loadProgress.value;
  const bytes = p && p.total > 0
    ? ` ${T('load.progress', { got: formatNumber(Math.min(p.got, p.total) / 1e6, pageLang(), 1), total: formatMegabytes(p.total / 1e6, pageLang()) })}`
    : '';
  const statusText = slow.value ? `${T('load.slow')}${bytes}` : T('palette.opening');

  return (
    <div class="ct-palette-page ct-placeholder ct-loading-shell" data-palette-placeholder="">
      <div class={`ct-loading-card${showShell ? '' : ' is-deferred'}`}>
        <span class="ct-loading-mark" aria-hidden="true">
          <Glyph name="sow" size={22} />
        </span>
        <h2 class="ct-loading-title" data-view-heading="" tabIndex={-1}>{T('palette.title')}</h2>
        <p class="status-line" role="status" aria-busy="true">{statusText}</p>
        <p class="ct-loading-sub">{T('studio.loadingSub')}</p>
        <div class="ct-loading-bar" aria-hidden="true" />
      </div>
      {showShell && (
        <div class="ct-loading-skel" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} class="ct-skel-card">
              <div class="ct-skel-line is-title" />
              <div class="ct-skel-line is-sub" />
              <div class="ct-skel-line is-wide" />
              <div class="ct-skel-pills"><span class="ct-skel-pill" /><span class="ct-skel-pill" /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
