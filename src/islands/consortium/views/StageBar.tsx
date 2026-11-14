/** @jsxImportSource preact */
// The words and marks the kept views share (Add's job title, the future panel's Details opener,
// print's side drawing key), kept in this leaf module so the views never import each other in a
// cycle (the shared words and glyphs are in views/kit/names.ts and kit/icons.tsx). The stage bar, the
// popovers and the matrix views that read the rest went in PP-B commit 0a'; the file goes when its
// last readers move (Add in PP-C, the future panel in PP-E, print in b2/d2).
import { computed } from '@preact/signals';
import type { Taxon } from '../../../lib/consortium/index.ts';
import { guestOf } from '../../../lib/consortium/index.ts';
import { flags, openSheet } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { PlantMarks } from './PlantMarks.tsx';
import { warningCounts } from './kit/phase.ts';
import { collatorFor, listName, nameOf, stageRun, type Order } from './kit/names.ts';
import { WarnIcon } from './kit/icons.tsx';

// ---- words ----
// "Find a soil feeder", or for a job's stage gap "Find a soil feeder for Years 15–25 → 60 years on":
// the Add sheet's title when opened for a job.
export const jobFind = (job: string, run?: { from: number; to: number } | null): string =>
  run ? T('job.findFor', { find: T(`job.${job}.find`), stages: stageRun(run.from, run.to) }) : T(`job.${job}.find`);

// Plants by their shown name, with the page language's one collator (kit/names.ts collatorFor).
export const byName: Order = (a, b) => collatorFor(pageLang()).compare(nameOf(a), nameOf(b));

// Warnings per member, as the marks count them (no low conflicts).
const warnings = computed(() => warningCounts(flags.value));

// A plant's marks (print's side drawing key): the guest's list, the warning count with its words, the
// plant marks.
export function Marks({ taxon }: { taxon: Taxon }) {
  const w = warnings.value.get(taxon.id) ?? 0, guest = guestOf(taxon);
  return (
    <>
      {guest && <span class="ct-tag">{T('matrix.from', { list: listName(guest) })}</span>}
      {w > 0 && <span class="ct-flag" title={P('matrix.warnings', w)}><WarnIcon /><span aria-hidden="true">{w}</span><span class="visually-hidden">{P('matrix.warnings', w)}</span></span>}
      <PlantMarks taxon={taxon} surface="row" />
    </>
  );
}

// ---- sheets ----
export const openDetails = (id: string): void => openSheet('details', id);
