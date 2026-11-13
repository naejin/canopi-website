/** @jsxImportSource preact */
// P5 seam (commit 0), owned by S5d (future climate): a thin shell under the matrix's view, after
// Share, Print and Download (Actions.tsx: it lands after them, so they never move under the reader's
// pointer), in the later chunk (views/later.ts; shown once prefetchLater() has loaded it). Its content, future/future.tsx, is a P5 feature chunk,
// loaded only once a site location exists (decision row "Island JavaScript budget for P5"); keep this
// file a shell.
import { location } from '../store.ts';
import { lazyPart, retryable } from './lazy.tsx';

const panel = lazyPart(retryable(() => import('./future/future.tsx'), (m) => m.FuturePanel), { quiet: true });

export function FutureSlot() {
  return location.value ? <panel.View /> : null;
}
