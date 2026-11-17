/** @jsxImportSource preact */
// The words and marks the kept views share (the future panel's Details opener and plant order,
// print's side drawing key, a verdict's short row form for Your plants, print and the side view), kept in this leaf module so the views never import each other in a
// cycle (the shared words and glyphs are in views/kit/names.ts and kit/icons.tsx). The stage bar, the
// popovers and the matrix views that read the rest went in PP-B commit 0a'; the file goes when its
// last readers move (the future panel in PP-E, print in b2/d2; Add's job title went with Add in
// PP-C commit 0).
import { computed } from '@preact/signals';
import type { PlantVerdict, Taxon } from '../../../lib/consortium/index.ts';
import { guestOf, periodName, rowLines, scenarioName, sizeLine } from '../../../lib/consortium/index.ts';
import { formatLength } from '../format.ts';
import { flags, laterVerdictOf, memberVerdicts, openSheet, scenario } from '../store.ts';
import { FitLine, say } from './kit/fit.tsx';
import { P, T, pageLang } from '../strings.ts';
import { warningCounts } from './kit/phase.ts';
import { collatorFor, listName, listOf, nameOf, type Order } from './kit/names.ts';
import { WarnIcon } from './kit/icons.tsx';

// Plants by their shown name, with the page language's one collator (kit/names.ts collatorFor).
export const byName: Order = (a, b) => collatorFor(pageLang()).compare(nameOf(a), nameOf(b));

// Warnings per member, as the marks count them (no low conflicts).
const warnings = computed(() => warningCounts(flags.value));

// A plant's verdict in short form after its fit line (core rowLines): the later loss, the watering,
// season, room and few-records notes, then the confidence terms its "Against your place" says, so
// Your plants, print and the side view's key carry what Details says (A16). Each a word with its
// data-note, data-later or data-conf hook (never colour alone).
export function RowNotes({ t, v }: { t: Taxon; v: PlantVerdict | null | undefined }) {
  if (!v) return null;
  const later = laterVerdictOf(t, v);
  const words = { period: periodName, scenario: scenarioName(scenario.value), heightM: t.traits.height_m?.max ?? null };
  return <>{rowLines(v, later, words).map((e) => <> <span class={e.conf ? 'ct-term' : 'ct-row-note'} data-conf={e.conf} data-note={e.note} data-later={e.later ? '' : undefined}>{say(e.line)}</span></>)}</>;
}

// How many of the member's jobs a candidate does, naming the ones it does not (board Swap).
export function doesWords(memberJobs: readonly string[], shared: readonly string[]): string {
  const missing = memberJobs.filter((j) => !shared.includes(j)).map((j) => T(`job.${j}`));
  if (!memberJobs.length || !missing.length) return T('swap.doesAll');
  if (missing.length === memberJobs.length) return T('swap.doesNone', { missing: listOf(missing) });
  return T('swap.doesSome', { n: shared.length, m: memberJobs.length, missing: listOf(missing) });
}

// A plant's size in words, its measures through format.ts (Your plants, Swap, Details).
export function sizeWords(t: Taxon): string {
  const l = sizeLine(t), name = l.key.slice('consortium.plants.'.length);
  return T(`plants.${name}`, Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, formatLength(Number(v), pageLang())])));
}

// A plant's marks (print's side drawing key): the guest's list, the warning count with its words, and
// its verdict in short form (fit line and core rowLines, as on its row), outside said on paper too.
export function Marks({ taxon }: { taxon: Taxon }) {
  const w = warnings.value.get(taxon.id) ?? 0, guest = guestOf(taxon);
  const v = memberVerdicts.value?.get(taxon.id);
  return (
    <>
      {v && <span class="ct-line"><FitLine v={v} /><RowNotes t={taxon} v={v} /></span>}
      {guest && <span class="ct-tag">{T('matrix.from', { list: listName(guest) })}</span>}
      {w > 0 && <span class="ct-flag" title={P('matrix.warnings', w)}><WarnIcon /><span aria-hidden="true">{w}</span><span class="visually-hidden">{P('matrix.warnings', w)}</span></span>}
    </>
  );
}

// ---- sheets ----
export const openDetails = (id: string): void => openSheet('details', id);
