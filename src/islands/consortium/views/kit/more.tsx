/** @jsxImportSource preact */
// The one list fold (v14 pf commit 0W-1 item 7; the size rule, A14): every item shows while the palette
// holds `maxPalette` plants or fewer and the list `maxGroup` items or fewer; past that, the list folds:
// closed, its count, the first `closed` items and "+ N more"; opened, the first `step` items, "+ N more"
// and "Show fewer"; then all, with "Show fewer" (the arithmetic: views/kit/fold.ts). The first item
// newly shown takes the focus, so a keyboard or screen-reader user lands on what opened; "Show fewer"
// gives the focus back to "+ N more". No other list cap: 200 plants show as 200 rows once opened. The
// thresholds come as props (the size rule's numbers live with their callers: pf-a's groups, pf-b's
// count cells, pf-e's lists).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { moreLine } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import { say } from '../../words.ts';
import { foldOf, type FoldStage } from './fold.ts';

export interface MoreListProps<I> {
  items: readonly I[];
  keyOf: (item: I) => string;
  render: (item: I) => ComponentChildren;
  // The size rule: the palette's size, and the folds' thresholds (defaults: 40 plants, 12 items).
  paletteSize?: number;
  maxPalette?: number;
  maxGroup?: number;
  closed?: number; // items shown closed (3)
  step?: number; // items shown once opened (10)
  label?: string; // the list's name, before its count and as the list's aria-label
  class?: string;
}

export function MoreList<I>({ items, keyOf, render, paletteSize = 0, maxPalette = 40, maxGroup = 12, closed = 3, step = 10, label, class: cls }: MoreListProps<I>) {
  const [stage, setStage] = useState<FoldStage>(0);
  const firstNew = useRef<HTMLLIElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'new' | 'opener' | null>(null);
  useEffect(() => {
    const at = focusNext.current;
    focusNext.current = null;
    if (at === 'new') firstNew.current?.focus();
    else if (at === 'opener') opener.current?.focus();
  }, [stage]);
  const f = foldOf({ count: items.length, stage, paletteSize, maxPalette, maxGroup, closed, step });
  const open = () => { if (f.next !== null) { focusNext.current = 'new'; setStage(f.next); } };
  const fewer = () => { focusNext.current = 'opener'; setStage(0); };
  return (
    <div class={`ct-more${cls ? ` ${cls}` : ''}`} data-stage={f.whole ? 'whole' : stage}>
      {!f.whole && stage === 0 && <span class="ct-more-count">{label ? `${label} ` : ''}{items.length}</span>}
      <ul class="ct-more-items" aria-label={label}>
        {items.slice(0, f.shown).map((item, i) => (
          <li key={keyOf(item)} ref={i === f.firstNew ? firstNew : undefined} tabIndex={i === f.firstNew ? -1 : undefined}>{render(item)}</li>
        ))}
      </ul>
      {(f.next !== null || f.fewer) && (
        <p class="ct-more-actions">
          {f.next !== null && <button type="button" class="ct-more-open" ref={opener} aria-expanded={stage > 0} onClick={open}>{say(moreLine(f.rest))}</button>}
          {f.fewer && <button type="button" class="ct-more-fewer" onClick={fewer}>{T('kit.showFewer')}</button>}
        </p>
      )}
    </div>
  );
}
