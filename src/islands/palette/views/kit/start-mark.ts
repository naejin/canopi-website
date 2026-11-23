// The Place form's timing mark (A24, S2): views/place/Place.tsx (Start.tsx until b1a's merge) calls markStart() on every render of the form;
// performance.mark('ct:start') is set once per page, in the frame after the form first paints. The
// timing script reads it beside ct:first-view (markFirstView: views/palette/Palette.tsx, once the
// palette page shows its Next step).
let marked = false;
export function markStart(): void {
  if (marked || typeof performance === 'undefined') return;
  marked = true;
  // After the frame that shows the form (S2: once, never on a later render).
  requestAnimationFrame(() => performance.mark('ct:start'));
}

// performance.mark('ct:first-view') once per page, when the palette is first on screen with its Next
// step (design check A7: the timing script waits for it). Called from an effect, after that commit.
let first = false;
export function markFirstView(): boolean {
  if (first || typeof performance === 'undefined') return false;
  first = true;
  performance.mark('ct:first-view');
  return true;
}
