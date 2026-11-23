/** @jsxImportSource preact */
// The one list fold (v14 pf commit 0W-1 item 7; the size rule, A14): every item shows while the palette
// holds NAMED_PALETTE plants or fewer and the list NAMED_GROUP items or fewer; past that, the list folds:
// closed, its count, the first `closed` items and "+ N more"; opened, the first `step` items, "+ N more"
// and "Show fewer"; then all, with "Show fewer" (the arithmetic: views/kit/fold.ts). The first item
// newly shown takes the focus, so a keyboard or screen-reader user lands on what opened; "Show fewer"
// gives the focus back to "+ N more". No other list cap: 200 plants show as 200 rows once opened. The
// thresholds are the core's size rule, for every list (no caller passes others; C7).
// `count={false}`: no count cell, where the sentence above the list already says the count.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { NAMED_GROUP, NAMED_PALETTE, moreLine } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { say } from '../../words.ts';
import { foldOf, type FoldStage } from './fold.ts';

export interface MoreListProps<I> {
  items: readonly I[];
  keyOf: (item: I) => string;
  render: (item: I) => ComponentChildren;
  paletteSize?: number; // the size rule: the palette's size
  closed?: number; // items shown closed (3)
  step?: number; // items shown once opened (10)
  count?: boolean; // the count cell while folded (default true; false where a sentence says the count)
  label?: string; // the list's name, before its count and as the list's aria-label
  group?: string; // the list's name for "+ N more" alone (several on one page must not sound alike), never drawn
  class?: string;
}

export function MoreList<I>({ items, keyOf, render, paletteSize = 0, closed = 3, step = 10, count = true, label, group, class: cls }: MoreListProps<I>) {
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
  const f = foldOf({ count: items.length, stage, paletteSize, maxPalette: NAMED_PALETTE, maxGroup: NAMED_GROUP, closed, step });
  const open = () => { if (f.next !== null) { focusNext.current = 'new'; setStage(f.next); } };
  const fewer = () => { focusNext.current = 'opener'; setStage(0); };
  return (
    <div class={`ct-more${cls ? ` ${cls}` : ''}`} data-stage={f.whole ? 'whole' : stage}>
      {count && !f.whole && stage === 0 && <span class="ct-more-count">{label ? `${label} ` : ''}{items.length}</span>}
      <ul class="ct-more-items" aria-label={label}>
        {items.slice(0, f.shown).map((item, i) => (
          <li key={keyOf(item)} ref={i === f.firstNew ? firstNew : undefined} tabIndex={i === f.firstNew ? -1 : undefined}>{render(item)}</li>
        ))}
      </ul>
      {(f.next !== null || f.fewer) && (
        <p class="ct-more-actions">
          {f.next !== null && <button type="button" class="ct-more-open" ref={opener} aria-expanded={stage > 0} aria-label={(label ?? group) ? `${say(moreLine(f.rest))}: ${label ?? group}` : undefined} onClick={open}>{say(moreLine(f.rest))}</button>}
          {f.fewer && <button type="button" class="ct-more-fewer" onClick={fewer}>{T('kit.showFewer')}</button>}
        </p>
      )}
    </div>
  );
}
