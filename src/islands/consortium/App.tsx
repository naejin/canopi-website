/** @jsxImportSource preact */
// The consortium island's root (frozen seam, commit 0 of P2). It shows the load state's screens
// (design check §5) and leaves one slot per stream, in page order. Each slot is a module whose export
// is null until its stream fills it, so a stream fills its own file and never edits this one:
// - Place (views/place/Place.tsx; Start until b1a rewrites it): climate, country line, site, crops
//   and the Suggest / build-your-own start;
// - Matrix (S2): the matrix and every other S2 view; Matrix.tsx routes the view switch itself
//   (matrix, phone grid and stepper, side view, Jobs, the plant list) from store.view;
// - Actions (S4): Share, Download for Canopi, Print (the print sheet) and the link notices (unknown
//   plants, cut lists), after the matrix;
//   Matrix and Actions are off the first run since PP-B commit 0 (role `matrix`, ADR-2), loaded
//   through lazyPart as soon as the island mounts, until b3 deletes the matrix;
// - Sheets: the sheets' router and the toast; views/Sheets.tsx routes store.sheet itself (the plant
//   dialog, Swap, Add, Search, Paste, each loaded on first use) and renders the toast.
import type { ComponentType } from 'preact';
import { load } from './store.ts';
import { T } from './strings.ts';
import type { LoadFailure } from '../../lib/consortium/source.ts';
import { Place } from './views/place/Place.tsx';
import { Sheets } from './views/Sheets.tsx';
import { lazyPart, retryable } from './views/lazy.tsx';
// Kept in the first run while the matrix is a lazy part (PP-B commit 0): the modules the matrix shares
// with the plant dialog, the later views and the future panel stay where they were before, so no part
// pays for them on first use and no sheet imports a lazy chunk statically (check-built-site's K3 rule).
// b3 removes these lines with the matrix. views/tracks.ts cannot be held this way (it has no side
// effect, so Rollup does not follow a bare import of it): the matrix and the later views share it as
// its own chunk, which the later part pays on first use until b3 deletes tracks.ts.
import './views/PlantMarks.tsx';
import './views/StageBar.tsx';
import './views/StageStepper.tsx';
import './views/later-chunk.ts';

// The matrix and its actions, each its own chunk of role `matrix` (scripts/built-modules.mjs), fetched
// once when the island first renders (the database download is under way by then) and shown once
// both the data and the chunk are here; nothing shows while it loads, and a failed chunk says so in
// place with Reload (lazy.tsx LoadFailed), the next render fetching it again as ?retry=n.
const Nothing = () => null;
const matrixPart = lazyPart(retryable(() => import('./views/Matrix.tsx'), (m) => m.Matrix ?? Nothing), { loading: Nothing });
const actionsPart = lazyPart(retryable(() => import('./views/Actions.tsx'), (m) => m.Actions ?? Nothing), { loading: Nothing });
let fetched = false;
const fetchMatrix = () => {
  if (fetched) return;
  fetched = true;
  for (const part of [matrixPart, actionsPart]) part.prefetch().catch(() => {});
};

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
  fetchMatrix();
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
  return (
    <>
      {slot(Place)}
      {status !== 'ready' ? <p class="status-line" aria-busy="true">{T('load.plants')}</p> : <><matrixPart.View /><actionsPart.View /></>}
      <Sheets />
    </>
  );
}
