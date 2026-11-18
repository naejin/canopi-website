/** @jsxImportSource preact */
// The three steps above the page title (v14 boards Place, PlaceDesk, SiteKiambu; pf-c): "1 Your place",
// "2 Your palette", "3 Planting plan", in the page head (ConsortiumPage.astro #ct-steps, static so they
// show before the island). On Place, step 1 is current and step 2 goes to the palette once it has
// plants; the plan is PP-D's and stays words. On the palette step the head carries data-step="palette":
// the steps and the lede give way to the palette's own head (shell.css).
import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { members, view } from '../../store.ts';
import { T } from '../../strings.ts';
import { showPalette } from '../../state/draft.ts';

function List({ toPalette }: { toPalette: boolean }) {
  return (
    <>
      <li aria-current="step"><span class="ct-steps-n">1</span> {T('palette.stepPlace')}</li>
      <li>{toPalette
        ? <button type="button" class="link-button ct-link" onClick={showPalette}><span class="ct-steps-n">2</span> {T('palette.stepPalette')}</button>
        : <><span class="ct-steps-n">2</span> {T('palette.stepPalette')}</>}</li>
      <li><span class="ct-steps-n">3</span> {T('palette.stepPlan')}</li>
    </>
  );
}

export function Steps() {
  const onPalette = view.value !== 'start';
  const toPalette = members.value.length > 0;
  useEffect(() => {
    const head = document.getElementById('ct-head'), box = document.getElementById('ct-steps');
    if (head) head.dataset.step = onPalette ? 'palette' : 'place';
    if (!box || onPalette) return;
    // The static items go once; render then owns the list.
    if (!box.dataset.live) { box.replaceChildren(); box.dataset.live = ''; }
    render(<List toPalette={toPalette} />, box);
  }, [onPalette, toPalette]);
  return null;
}
