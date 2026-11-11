/** @jsxImportSource preact */
// The stage bar (owner row "Scale, owner answers" 2026-10-28: phone rows show it, with an accessible
// name) and the words and marks every stream S2 view shares, kept in this leaf module so the views
// never import each other in a cycle:
// - stage words: plain time first, the app's term beside it ("Years 1–3 · Placenta 3", owner row
//   "Phases" 2026-10-27); a span reads "Years 3–15 → 60 years on · Secondary 1 – Climax";
// - a plant's name, its marks (Main crop is a sprout, Kept a pin, never colour alone; a warning
//   triangle with its count; "From the Tropical list" for a guest) and its full accessible name;
// - the "What is a layer?" / "What are these stages?" popovers;
// - openDetails / openSwap / openAdd: the sheets, through the store's one opener (store.openSheet),
//   which also says what Add was opened for (a cell or run, a job, "Show them anyway").
import { computed } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClimateZone, PhaseOrd, Stratum, Taxon } from '../../../lib/consortium/index.ts';
import { phases } from '../../../lib/consortium/index.ts';
import { crops, flags, kept, openSheet, type SheetFor } from '../store.ts';
import { P, T, nameOf, pageLang } from '../strings.ts';
import { PlantMarks } from './PlantMarks.tsx';
import { PHASE_ORDS, collatorFor, spanOf, warningCounts, type Order } from './tracks.ts';

// ---- words ----
export const phasePlain = (p: number): string => T(`phase.${phases[p]}.plain`);
export const phaseTerm = (p: number): string => T(`phase.${phases[p]}.term`);
export const phaseWords = (p: number): string => `${phasePlain(p)} · ${phaseTerm(p)}`;
export const layerName = (s: Stratum): string => T(`stratum.${s}`);
export const listName = (c: ClimateZone): string => T(`list.${c.toLowerCase()}`);
export const cellName = (s: Stratum, from: number, to: number = from): string =>
  T('matrix.cell', { layer: layerName(s), stage: from === to ? phasePlain(from) : `${phasePlain(from)} → ${phasePlain(to)}` });

export { nameOf };

// Plants by their shown name, with the page language's one collator (tracks.ts collatorFor).
export const byName: Order = (a, b) => collatorFor(pageLang()).compare(nameOf(a), nameOf(b));

// "Years 3–15 → 60 years on · Secondary 1 – Climax", or one stage's words.
export function spanWords(t: Taxon): string {
  const s = spanOf(t);
  if (!s) return T('timingUnknown');
  return s.from === s.to ? phaseWords(s.from) : `${phasePlain(s.from)} → ${phasePlain(s.to)} · ${phaseTerm(s.from)} – ${phaseTerm(s.to)}`;
}

// Warnings per member, as chips count them (no low conflicts).
export const warnings = computed(() => warningCounts(flags.value));

// The full name of a plant's chip or row: "European chestnut, Castanea sativa. High, Years 3–15 →
// 60 years on · Secondary 1 – Climax. Main crop. 1 warning. Open details".
export function plantLabel(t: Taxon): string {
  const parts = [`${nameOf(t)}, ${t.canonical_name}.`];
  parts.push(`${t.stratum ? layerName(t.stratum.value) : T('matrix.noLayer')}, ${spanWords(t)}.`);
  if (crops.value.includes(t.id)) parts.push(`${T('matrix.mainCrop')}.`);
  else if (kept.value.includes(t.id)) parts.push(`${T('matrix.kept')}.`);
  if (t.from) parts.push(`${T('matrix.from', { list: listName(t.from) })}.`);
  const w = warnings.value.get(t.id) ?? 0;
  if (w) parts.push(`${P('matrix.warnings', w)}.`);
  parts.push(T('matrix.open'));
  return parts.join(' ');
}

// ---- glyphs (aria-hidden; the text beside or the hidden label carries the meaning) ----
export const WarnIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.6 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /><path d="M8 6v4" stroke="currentColor" stroke-width="1.7" /><circle cx="8" cy="12" r="1" fill="currentColor" /></svg>
);
export const PinIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 1.5h6l-1 4 3 3H3l3-3z M8 8.5V15" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>
);
export const SproutIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 15V7" stroke="currentColor" stroke-width="1.8" /><path d="M8 8C8 4.5 5.5 2.5 2 2.5c0 3.5 2.5 5.5 6 5.5zM8 9.5c0-3 2.2-5 6-5 0 3-2.2 5-6 5z" fill="currentColor" /></svg>
);
export const ChevronIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg class="ct-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d={dir === 'left' ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} fill="none" stroke="currentColor" stroke-width="1.8" /></svg>
);

// A plant's marks. tight (matrix chips): glyphs with hidden words; else the Main crop tag in words.
export function Marks({ taxon, tight = false }: { taxon: Taxon; tight?: boolean }) {
  const isCrop = crops.value.includes(taxon.id), isKept = !isCrop && kept.value.includes(taxon.id);
  const w = warnings.value.get(taxon.id) ?? 0;
  return (
    <>
      {isCrop && (tight
        ? <span class="ct-glyph" title={T('matrix.mainCrop')}><SproutIcon /><span class="visually-hidden">{T('matrix.mainCrop')}</span></span>
        : <span class="ct-tag ct-tag-crop"><SproutIcon />{T('matrix.mainCrop')}</span>)}
      {isKept && <span class="ct-glyph" title={T('matrix.kept')}><PinIcon /><span class="visually-hidden">{T('matrix.kept')}</span></span>}
      {taxon.from && !tight && <span class="ct-tag">{T('matrix.from', { list: listName(taxon.from) })}</span>}
      {w > 0 && <span class="ct-flag" title={P('matrix.warnings', w)}><WarnIcon /><span aria-hidden="true">{w}</span><span class="visually-hidden">{P('matrix.warnings', w)}</span></span>}
      <PlantMarks taxon={taxon} surface={tight ? 'chip' : 'row'} />
    </>
  );
}

// ---- the stage bar ----
// Seven segments, the plant's span filled, the current stage outlined; its name is the span's words.
export function StageBar({ taxon, current = null }: { taxon: Taxon; current?: PhaseOrd | null }) {
  const s = spanOf(taxon);
  return (
    <span class="ct-stagebar" role="img" aria-label={spanWords(taxon)}>
      {PHASE_ORDS.map((p) => <i key={p} class={`${s && s.from <= p && p <= s.to ? 'on' : ''}${p === current ? ' cur' : ''}`} />)}
    </span>
  );
}
// A strip of seven segments from booleans (the Jobs table: the stages where someone does the job).
export function StageStrip({ on, label }: { on: boolean[]; label: string }) {
  return (
    <span class="ct-stagebar ct-stagestrip" role="img" aria-label={label}>
      {on.map((x, p) => <i key={p} class={x ? 'on' : ''} />)}
    </span>
  );
}

// ---- sheets ----
export const openAdd = (target: Partial<SheetFor> = {}): void => openSheet('add', null, target);
export const openDetails = (id: string): void => openSheet('details', id);
export const openSwap = (id: string): void => openSheet('swap', id);

// ---- popovers ----
let popoverSeq = 0;
// "What is a layer?" / "What are these stages?": a button with aria-expanded and aria-controls; the
// text closes on Escape, on the button again or on a click outside.
export function Explain({ kind }: { kind: 'layer' | 'stage' }) {
  const [open, setOpen] = useState(false);
  const [id] = useState(() => `ct-pop-${kind}-${++popoverSeq}`);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('click', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('click', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const k = kind === 'layer' ? 'Layer' : 'Stage';
  return (
    <span class="ct-explain" ref={ref}>
      <button type="button" class="ct-explain-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{T(`matrix.what${k}`)}</button>
      {open && (
        <span class="ct-pop" id={id} role="note">
          <strong class="ct-pop-title">{T(`matrix.${kind}Title`)}</strong>
          <span>{T(`matrix.${kind}Body`)}</span>
        </span>
      )}
    </span>
  );
}
