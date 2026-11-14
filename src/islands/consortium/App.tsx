/** @jsxImportSource preact */
// The consortium island's root (frozen seam, commit 0 of P2). It shows the load state's screens
// (design check §5) and leaves one slot per stream, in page order. Each slot is a module whose export
// is null until its stream fills it, so a stream fills its own file and never edits this one:
// - Place (views/place/Place.tsx; Start until b1a rewrites it): climate, country line, site and the
//   Suggest / build-your-own start;
// - Actions (S4): Share, Download for Canopi, Print (the print sheet), the link notices (unknown
//   plants, cut lists) and the future panel, in the palette slot (the matrix and its views were
//   deleted in PP-B commit 0a', owner "Delete first"; b2 builds the palette page into the slot and
//   hosts Actions under it);
// - Sheets: the sheets' router and the toast; views/Sheets.tsx routes store.sheet itself (the plant
//   dialog, Swap, Add, Search, Paste, each loaded on first use) and renders the toast.
import type { ComponentType } from 'preact';
import { load, offline, opening, slow, step } from './store.ts';
import { T } from './strings.ts';
import type { LoadFailure } from '../../lib/consortium/source.ts';
import { Place } from './views/place/Place.tsx';
import { Actions } from './views/Actions.tsx';
import { Sheets } from './views/Sheets.tsx';
import { lazyPart, retryable } from './views/lazy.tsx';
import { Placeholder } from './views/palette/Placeholder.tsx';

// The palette page, its own chunk (role `palette`): if it does not load, Place stays usable and the
// failed line's Reload fetches it again in place (`?retry=n`; PP-B24).
const PalettePage = lazyPart(retryable(() => import('./views/palette/Palette.tsx'), (m) => m.Palette), { retry: true, page: true, loading: Placeholder });
// Kept in the first run: modules the sheets, the later views and the future panel share, which no
// first-run module imports since the matrix went (PP-B commit 0a'), so no part pays for them on first
// use and no sheet imports a lazy chunk statically (check-built-site's K3 rule).
import './views/PlantMarks.tsx';
import './views/StageBar.tsx';

export interface AppProps {
  // The noscript guide link, reused under the failure screens.
  guide: { url: string; lang: string } | null;
  onRetry: () => void;
}

// The §5 screen of each failure: its text key and its button (none: only the guide link helps).
const screens: Record<LoadFailure, { text: string; action: 'retry' | 'reload' | null }> = {
  'too-old': { text: 'load.tooOld', action: null },
  'wasm-blocked': { text: 'load.wasmBlocked', action: null },
  'wasm-fetch': { text: 'load.toolFailed', action: 'reload' },
  fetch: { text: 'load.fetch', action: 'retry' },
  damaged: { text: 'load.damaged', action: 'retry' },
  stale: { text: 'load.stale', action: 'reload' },
  schema: { text: 'load.stale', action: 'reload' },
};

const slot = (View: ComponentType | null) => (View ? <View /> : null);

export function App({ guide, onRetry }: AppProps) {
  const { status, error } = load.value;
  if (status === 'failed' && error) {
    const screen = screens[error];
    return (
      <div class="callout ct-load-failed" role="alert" data-load-error={error}>
        <p>{T(screen.text)}</p>
        {screen.action === 'retry' && <p><button type="button" class="button button-primary" onClick={onRetry}>{T('load.retry')}</button></p>}
        {/* Reload keeps the address, so the link state is kept. */}
        {screen.action === 'reload' && <p><button type="button" class="button button-primary" onClick={() => location.reload()}>{T('load.reload')}</button></p>}
        {guide && <p>{T('load.guides')} <a class="text-link" href={guide.url} hreflang={guide.lang}>{T('noscript.link')}</a></p>}
      </div>
    );
  }
  // A return visit restoring shows the palette's placeholder, never the Place form (P2), and so does
  // the palette page until the plants are read and its chunk is in.
  const onPalette = step.value === 'palette', restoring = opening.value && !onPalette;
  const loadingLine = status !== 'ready' && <p class="status-line" aria-busy="true">{T(slow.value ? 'load.slow' : 'load.plants')}</p>;
  return (
    <>
      <p class="ct-offline" role="status">{offline.value ? T('load.offline') : ''}</p>
      {restoring ? <Placeholder /> : slot(Place)}
      {onPalette && status !== 'ready' && <Placeholder />}
      {loadingLine}
      {status === 'ready' && (
        <>
          {onPalette && <PalettePage.View />}
          {slot(Actions)}
        </>
      )}
      <Sheets />
    </>
  );
}
