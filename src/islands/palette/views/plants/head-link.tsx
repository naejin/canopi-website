/** @jsxImportSource preact */
// The palette head's count (v14 pf-e E4; board Many, section 6): on the place line, "200 plants: Your
// plants" under 960 px while Your plants is in its many form (state.ts manyShown), "Your plants" a link
// to the list's heading (the focus lands there, so a keyboard or screen-reader user is in the list);
// otherwise the plain count ("8 plants"), as on the laptop (board ManyDesk: the list stands beside the
// chart). A slot for the place line (views/place/Place.tsx PlaceLine, main's): it replaces the count
// part there. Light on purpose (the store, the strings and plants/state.ts only): the place line is in
// the first run.
import { P, T } from '../../strings.ts';
import { manyShown, wide } from './state.ts';

const toList = (e: Event): void => {
  e.preventDefault();
  const h = document.getElementById('ct-plants-t');
  if (!h) return;
  h.scrollIntoView({ block: 'start' });
  h.focus({ preventScroll: true });
};

export function PlantsCount({ n }: { n: number }) {
  if (!manyShown.value || wide.value) return <span>{P('start.count', n)}</span>;
  return <span data-plants-link="">{P('many.headCount', n)} <a href="#ct-plants-t" class="ct-link" onClick={toList}>{T('many.headLink')}</a></span>;
}
