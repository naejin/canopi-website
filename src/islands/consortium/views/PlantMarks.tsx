/** @jsxImportSource preact */
// P5 seam (commit 0): a plant's marks from the core providers (marks.ts plantMarks: range S5c, future
// S5d, native S5e), rendered the same way on every surface: 'chip' (desktop matrix chips), 'row' (phone
// rows, side and list views; StageBar Marks), 'add' (Add rows) and 'details', so a stream adds a mark
// without touching a view; a provider may keep a mark to some surfaces. Each mark is a span with
// data-mark (its kind) and data-mark-state (its finer state, when it has one). The providers' marks wait
// for their chunk, which loads only when one can show (store.ts markProviders); the site answers' marks do not. A warning mark is
// ochre (.ct-flag), a note quiet (.ct-tag).
import type { MarkSurface, Taxon } from '../../../lib/consortium/index.ts';
import { plantMarks } from '../../../lib/consortium/index.ts';
import { markContext, markProviders } from '../store.ts';
import { localVars, T } from '../strings.ts';

export function PlantMarks({ taxon, surface }: { taxon: Taxon; surface: MarkSurface }) {
  const marks = plantMarks(taxon, markContext.value, surface, markProviders.value);
  if (marks.length === 0) return null;
  return (
    <>
      {marks.map((m) => (
        <span key={`${m.kind}:${m.key}`} class={m.severity === 'warning' ? 'ct-flag' : 'ct-tag'} data-mark={m.kind} data-mark-state={m.state} data-mark-surface={surface}>{T(m.key, localVars(m.vars))}</span>
      ))}
    </>
  );
}
