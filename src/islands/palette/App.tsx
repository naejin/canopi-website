/** @jsxImportSource preact */
// The consortium island's root (frozen seam, commit 0 of P2). It shows the load state's screens
// (design check §5) and leaves one slot per stream, in page order. Each slot is a module whose export
// is null until its stream fills it, so a stream fills its own file and never edits this one:
// - Place (views/place/Place.tsx; Start until b1a rewrites it): climate, country line, site and the
//   Suggest / build-your-own start;
// - Actions (S4): Share, Download for Canopi, Print (the print sheet), the link notices (unknown
//   plants, cut lists) and the future panel: the palette page's foot (Palette.tsx `foot`, placed where
//   the boards draw it);
// - Sheets: the sheets' router and the toast; views/Sheets.tsx routes store.sheet itself (the plant
//   dialog, Swap, Add, Search, Paste, each loaded on first use) and renders the toast.
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { computed } from '@preact/signals';
import { load, loadProgress, offline, opening, slow, step, view } from './store.ts';
import { pageLang, T } from './strings.ts';
import { formatMegabytes, formatNumber } from './format.ts';
import type { LoadFailure } from '../../lib/palette/source.ts';
import { retryableImport } from '../../lib/palette/index.ts';
import { Place } from './views/place/Place.tsx';
import { markStep } from './views/place/steps.tsx';
import { Actions } from './views/Actions.tsx';
import { Sheets } from './views/Sheets.tsx';
import { lazyPart } from './views/lazy.tsx';
import { Placeholder } from './views/palette/Placeholder.tsx';

// The palette page, its own chunk (role `palette`): if it does not load, Place stays usable and the
// failed line's Reload fetches it again in place (`?retry=n`; PP-B24).
export const PalettePage = lazyPart(retryableImport(() => import('./views/palette/Palette.tsx'), (m) => m.Palette), { retry: true, page: true, loading: Placeholder });
// Kept in the first run: modules the sheets, the later views and the future panel share, which no
// first-run module imports since the matrix went (PP-B commit 0a'), so no part pays for them on first
// use and no sheet imports a lazy chunk statically (check-built-site's K3 rule). The rows and the list
// fold Find and the palette share are kept here too (astro.config.mjs FIRST_RUN_KIT builds them
// untreeshaken, since they have no side effect of their own).
import './views/StageBar.tsx';
import './views/rows.tsx';
import './views/kit/more.tsx';

export interface AppProps {
  // The page's guide (the noscript link's address), linked as "Read the guides" on the screens where
  // the tool cannot run in this browser (board Loading: Old browser, WebAssembly blocked).
  guide: { url: string; lang: string } | null;
  onRetry: () => void;
}

// The §5 screen of each failure (board Loading): its text key, its button, and whether it links the
// guides (the tool cannot run in this browser, the guides can).
const screens: Record<LoadFailure, { text: string; action: 'retry' | 'reload' | null; guides?: true }> = {
  'too-old': { text: 'load.tooOld', action: null, guides: true },
  'wasm-blocked': { text: 'load.wasmBlocked', action: 'retry', guides: true },
  'wasm-fetch': { text: 'load.toolFailed', action: 'reload' },
  fetch: { text: 'load.fetch', action: 'retry' },
  damaged: { text: 'load.damaged', action: 'retry' },
  stale: { text: 'load.stale', action: 'reload' },
  schema: { text: 'load.stale', action: 'reload' },
};

const slot = (View: ComponentType | null) => (View ? <View /> : null);

// App reads only what changes the screens (perf-6): the offline line, the loading line and the
// restoring switch read their own signals in small parts, so going offline, "Still loading" or the
// return visit's end never re-renders the palette page.
const restoring = computed(() => opening.value && step.value !== 'palette');
const ready = computed(() => load.value.status === 'ready');
function OfflineLine() {
  return <p class="ct-offline" role="status">{offline.value ? T('load.offline') : ''}</p>;
}
// The database still loading: one status line on the page from the start, its words switching to
// "Still loading" after the threshold, so the change is announced (bugs-12). Board Loading (pf-c): the
// Place step works meanwhile, and the line says so ("You can already give your place."). The line goes on the page
// empty and takes its words after the first paint (an effect), so a screen reader hears them: the
// first render comes before the plants are read (PP-B3, A25; the test build hid it while its render
// waited for the hook and the database was often ready by then, PP-B exit).
function LoadingLine() {
  const busy = !ready.value;
  const [placed, setPlaced] = useState(false);
  useEffect(() => setPlaced(true), []);
  // "You can already give your place." only beside the Place form, never while a palette restores (R15).
  const canGive = view.value === 'start' && !opening.value;
  const p = loadProgress.value;
  // Board Loading: "Still loading: the connection is slow. Keep going; your answers are kept. 0.8 of 1.4 MB."
  const bytes = p && p.total > 0 ? ` ${T('load.progress', { got: formatNumber(Math.min(p.got, p.total) / 1e6, pageLang(), 1), total: formatMegabytes(p.total / 1e6, pageLang()) })}` : '';
  return <p class="status-line" role="status" aria-busy={busy ? 'true' : undefined}>{busy && placed ? (slow.value ? `${T('load.slow')}${bytes}` : canGive ? `${T('load.plants')} ${T('load.canGive')}` : T('load.plants')) : ''}</p>;
}
function PlaceOrPlaceholder() {
  return restoring.value ? <Placeholder /> : slot(Place);
}

// The failure screens say their own words (board Loading), with no added guide sentence (BC22), and
// "Read the guides" where the board draws it (C2). "Try again" is a secondary button, as Loading draws
// it on every screen; "Reload" after an update stays the primary one. A failure ends the page's opening: the head the
// inline script marked as the palette step before the island ran goes back to the Place step, with its
// steps and lede (R6: the pre-paint hint is confirmed or undone on every outcome).
function Failed({ error, guide, onRetry }: AppProps & { error: LoadFailure }) {
  const screen = screens[error];
  useEffect(() => markStep('place'), []);
  return (
    <div class="callout ct-load-failed" role="alert" data-load-error={error}>
      <p>{T(screen.text)}</p>
      {(screen.action || (screen.guides && guide)) && (
        <p class="ct-load-acts">
          {screen.action === 'retry' && <button type="button" class="button button-secondary" onClick={onRetry}>{T('load.retry')}</button>}
          {/* Reload keeps the address, so the link state is kept. */}
          {screen.action === 'reload' && <button type="button" class="button button-primary" onClick={() => location.reload()}>{T('load.reload')}</button>}
          {/* Alone, a secondary button; beside "Try again", a text link (board Loading, C2 of fix round 3). */}
          {screen.guides && guide && <a class={screen.action ? 'text-link' : 'button button-secondary'} href={guide.url} hreflang={guide.lang !== document.documentElement.lang ? guide.lang : undefined}>{T('palette.place.readGuides')}</a>}
        </p>
      )}
    </div>
  );
}

export function App({ guide, onRetry }: AppProps) {
  const { status, error } = load.value;
  if (status === 'failed' && error) return <Failed error={error} guide={guide} onRetry={onRetry} />;
  // A return visit restoring shows the palette's placeholder, never the Place form (P2), and so does
  // the palette page until the plants are read and its chunk is in.
  const onPalette = step.value === 'palette';
  return (
    <>
      <OfflineLine />
      <PlaceOrPlaceholder />
      {onPalette && status !== 'ready' && <Placeholder />}
      <LoadingLine />
      {status === 'ready' && (
        <>
          {onPalette && <PalettePage.View foot={<Actions />} />}
        </>
      )}
      <Sheets />
    </>
  );
}
