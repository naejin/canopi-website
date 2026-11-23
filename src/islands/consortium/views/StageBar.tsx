/** @jsxImportSource preact */
// The marks the views share that read the store, kept in this leaf module so the views never import
// each other in a cycle: the future panel's Details opener (future.tsx), the plant order and print's
// side drawing key (SideView.tsx Marks, byName), and a verdict's short row form (RowNotes: Your plants,
// Swap, print and the side view's key, through Marks). Store-free words are in views/kit/ (names.ts,
// fit.tsx doesWords, icons.tsx). The stage bar, the popovers and the matrix views went in
// PP-B commit 0a'.
import { computed } from '@preact/signals';
import type { PlantVerdict, Taxon } from '../../../lib/consortium/index.ts';
import { guestOf, periodName, rowLines, scenarioName } from '../../../lib/consortium/index.ts';
import { flags, laterVerdictOf, memberVerdicts, openSheet, scenario } from '../store.ts';
import { FitLine, say } from './kit/fit.tsx';
import { P, T, pageLang } from '../strings.ts';
import { warningCounts } from './kit/phase.ts';
import { collatorFor, listName, nameOf, type Order } from './kit/names.ts';
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

// A plant's marks (print's side drawing key): the guest's list, the warning count with its words, and
// its verdict in short form (fit line and core rowLines, as on its row), outside said on paper too.
export function Marks({ taxon }: { taxon: Taxon }) {
  const w = warnings.value.get(taxon.id) ?? 0, guest = guestOf(taxon);
  const v = memberVerdicts.value?.get(taxon.id);
  return (
    <>
      {v && <span class="ct-line"><FitLine v={v} /><RowNotes t={taxon} v={v} /></span>}
      {guest && <span class="ct-tag">{T('matrix.from', { list: listName(guest) })}</span>}
      {w > 0 && <span class="ct-flag"><WarnIcon /><span aria-hidden="true">{w}</span><span class="visually-hidden">{P('matrix.warnings', w)}</span></span>}
    </>
  );
}

// ---- sheets ----
export const openDetails = (id: string): void => openSheet('details', id);
