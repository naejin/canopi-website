/** @jsxImportSource preact */
// P5 seam (commit 0): a plant's marks from the core providers (marks.ts plantMarks: range S5c, future
// S5d, native S5e), rendered the same way in the matrix chips, phone rows, side list (StageBar Marks),
// Details and Add, so a stream adds a mark without touching a view. Nothing today: every provider is a
// stub. A warning mark is ochre (.ct-flag), a note quiet (.ct-tag); the future mark draws in ink.
import type { Taxon } from '../../../lib/consortium/index.ts';
import { plantMarks } from '../../../lib/consortium/index.ts';
import { markContext } from '../store.ts';
import { T } from '../strings.ts';

export function PlantMarks({ taxon }: { taxon: Taxon }) {
  const marks = plantMarks(taxon, markContext.value);
  if (marks.length === 0) return null;
  return (
    <>
      {marks.map((m) => (
        <span key={`${m.kind}:${m.key}`} class={m.severity === 'warning' ? 'ct-flag' : 'ct-tag'} data-mark={m.kind}>{T(m.key, m.vars)}</span>
      ))}
    </>
  );
}
