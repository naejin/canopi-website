/** @jsxImportSource preact */
// A return visit (a save or a link restoring): the palette page's frame while the plants are read,
// never the Place form (P2). In the first run, so it stays a few lines.
import { T } from '../../strings.ts';

export function Placeholder() {
  return (
    <div class="ct-palette-page ct-placeholder" data-palette-placeholder="">
      <h2 data-view-heading="" tabIndex={-1}>{T('palette.title')}</h2>
      <p class="status-line" aria-busy="true">{T('palette.opening')}</p>
    </div>
  );
}
