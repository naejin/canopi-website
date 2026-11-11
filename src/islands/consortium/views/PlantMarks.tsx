/** @jsxImportSource preact */
// P5 seam (commit 0): a plant's marks from the core providers (marks.ts plantMarks: range S5c, future
// S5d, native S5e), rendered the same way on every surface: 'chip' (desktop matrix chips), 'row' (phone
// rows, side and list views; StageBar Marks), 'add' (Add rows) and 'details', so a stream adds a mark
// without touching a view; a provider may keep a mark to some surfaces. Each mark is a span with
// data-mark (its kind) and data-mark-state (its finer state, when it has one). Nothing until the
// providers load, which they do only when a mark can show (store.ts markProviders). A warning mark is
// ochre (.ct-flag), a note quiet (.ct-tag).
import type { MarkSurface, Taxon } from '../../../lib/consortium/index.ts';
import { plantMarks } from '../../../lib/consortium/index.ts';
import { markContext, markProviders, rangeRule } from '../store.ts';
import { T } from '../strings.ts';

export function PlantMarks({ taxon, surface }: { taxon: Taxon; surface: MarkSurface }) {
  const providers = markProviders.value;
  if (providers.length === 0) return null;
  const marks = plantMarks(taxon, markContext.value, surface, providers);
  if (marks.length === 0) return null;
  // Numbers in a mark (°C values, only with a site climate) in the page language: the range rule's
  // chunk formats them (store.ts rangeRule), so that code stays off the first run.
  const local = rangeRule.value?.local;
  return (
    <>
      {marks.map((m) => (
        <span key={`${m.kind}:${m.key}`} class={m.severity === 'warning' ? 'ct-flag' : 'ct-tag'} data-mark={m.kind} data-mark-state={m.state} data-mark-surface={surface}>{T(m.key, local ? local(m.vars) : m.vars)}</span>
      ))}
    </>
  );
}
