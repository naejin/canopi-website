/** @jsxImportSource preact */
// The consortium island's root (frozen seam, commit 0 of P2). It shows the load state's screens
// (design check §5) and leaves one slot per stream, in page order. Each slot is a module whose export
// is null until its stream fills it, so a stream fills its own file and never edits this one:
// - Start (S4): climate, country line, site, crops and the Suggest / build-your-own start;
// - Matrix (S2): the matrix and every other S2 view; Matrix.tsx routes the view switch itself
//   (matrix, phone grid and stepper, side view, Jobs, the plant list) from store.view;
// - Actions (S4): Share, Download for Canopi, Print (the print sheet) and the link notices (unknown
//   plants, cut lists), after the matrix;
// - Sheets: the sheets' router and the toast; views/Sheets.tsx routes store.sheet itself (the plant
//   dialog, Swap, Add, Search, Paste, each loaded on first use) and renders the toast.
import type { ComponentType } from 'preact';
import { load } from './store.ts';
import { T } from './strings.ts';
import type { LoadFailure } from '../../lib/consortium/source.ts';
import { Start } from './views/Start.tsx';
import { Matrix } from './views/Matrix.tsx';
import { Actions } from './views/Actions.tsx';
import { Sheets } from './views/Sheets.tsx';

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
  return (
    <>
      {slot(Start)}
      {status !== 'ready' ? <p class="status-line" aria-busy="true">{T('load.plants')}</p> : <>{slot(Matrix)}{slot(Actions)}</>}
      <Sheets />
    </>
  );
}
