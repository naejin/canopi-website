/** @jsxImportSource preact */
// P5 seam (commit 0), owned by S5d (future climate): a thin shell beside the matrix (Matrix.tsx below
// the desktop table, PhoneMatrix.tsx below the phone overview), in the later chunk (views/later.ts;
// shown once prefetchLater() has loaded it). Its content, future/future.tsx, is a P5 feature chunk,
// loaded only once a site location exists (decision row "Island JavaScript budget for P5"); keep this
// file a shell.
import { location } from '../store.ts';
import { lazyPart } from './lazy.tsx';

const panel = lazyPart(() => import('./future/future.tsx').then((m) => m.FuturePanel), { quiet: true });

export function FutureSlot() {
  return location.value ? <panel.View /> : null;
}
