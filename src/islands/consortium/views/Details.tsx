/** @jsxImportSource preact */
// View slot of stream S3: the plant dialog and every S3 sheet. This module routes store.sheet itself
// (details with the correction form, Swap, Add, Search, Paste, the toast), so App.tsx needs no slot
// per sheet. App.tsx renders it whenever it is set.
//
// Every view opens a sheet with the store's one opener, store.openSheet(kind, id, target): 'details'
// and 'swap' take a plant id; 'add' takes what it was opened for (a cell or run of one layer, a job,
// "Show them anyway"); 'search' (Start's "Start empty and search") and 'paste' ("Paste a list") take
// none. Nothing writes store.sheet directly, so what one sheet was opened for never leaks into the next. Whatever had the focus when a sheet opened (a chip) gets it back when the
// sheet closes (Escape, Close, the backdrop); a chip that is gone by then is found again by
// `data-plant-id`, else the toast's Undo takes the focus. removeMember, toggleKeep, swapMember and
// addMembers are the store's edits (store.ts), each with its toast and Undo.
//
// Sheets are native <dialog>s opened with showModal (focus moves in, the page behind is inert, Escape
// closes). Details and the toast ship with the island; Correction, Swap, Add, Search and Paste are
// loaded when first opened, so the island stays within its JS budget (design check §8).
//
// Owner rows (knowledge/decisions/consortium-user-decisions.md): warn rather than remove dangerous
// information; Add and Swap never ask about invasiveness, and "not checked in {country}" is said once
// per view and in details, never as a chip; a guest added from another climate's list is labelled
// "From the {climate} list"; pairings are yield-gain field trials only (no companion folklore).
import type { ComponentChildren, ComponentType } from 'preact';
import { h } from 'preact';
import { effect } from '@preact/signals';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as store from '../store.ts';
import { addMembers, closeSheet, openSheet, removeMember, sheetCell, showToast, swapMember, taxonOf, toggleKeep } from '../store.ts';
import { P, T, nameOf, pageLang } from '../strings.ts';
import type { ClimateZone, Details as PlantFacts, Flag, Labels, Locale, PlantId, Site, Taxon } from '../../../lib/consortium/index.ts';
import { fits, flagsFor, jobsOf, misfitsBeside, pairings, phaseOrd, phases } from '../../../lib/consortium/index.ts';
import { layerRows, type Words } from './layers.ts';
import { Toast } from './Toast.tsx';
import { phasePlain as plainPhase, spanWords } from './StageBar.tsx';
import { safeHref } from '../../../lib/safe-href.js';
import { consortiumGuides } from '../../../data/consortium-guides.ts';
import { testFault } from '../test-hook.ts';

// ---- words ----

const lang = () => pageLang();
// The words every view shares live in one place each (H12): a plant's name in strings.ts, the stage
// words in StageBar.tsx; the sheets take them from here. The store's edits and opener likewise.
export { addMembers, closeSheet, nameOf, openSheet, plainPhase, removeMember, sheetCell, spanWords, swapMember, taxonOf, toggleKeep };
// correction.* and climate.<zone> are site-wide keys; ConsortiumPage.astro passes them under their own
// names beside consortium.* (H13).
export const zoneName = (z: ClimateZone): string => T(`climate.${z.toLowerCase()}`);
export const listOf = (items: string[]): string => new Intl.ListFormat(lang(), { type: 'conjunction' }).format(items);
export const num = (n: number): string => new Intl.NumberFormat(lang(), { maximumFractionDigits: 1 }).format(n);
let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  try { regionNames ??= new Intl.DisplayNames([lang()], { type: 'region' }); return regionNames.of(code) ?? code; } catch { return code; }
}
export const layerName = (t: Taxon): string => T(t.stratum ? `stratum.${t.stratum.value}` : 'stratum.none');
export function spanOf(t: Taxon): [number, number] | null {
  return t.phases ? [phaseOrd(t.phases.start), phaseOrd(t.phases.end)] : null;
}
export const words = (): Words => ({ lang: lang(), T, climate: (z) => zoneName(z as ClimateZone), country: countryName, region: (r) => T(`region.${r}`), num });
// A text from the data in the page language, else in English (marked).
export function DataText({ text }: { text: { en: string } & Partial<Record<string, string>> }) {
  const own = text[lang()];
  return own ? <>{own}</> : <span lang="en">{text.en}</span>;
}

// The seven-segment stage bar, its span filled, with the span words as its name (mockup 05).
export function Bar({ taxon, current = -1 }: { taxon: Taxon; current?: number }) {
  const s = spanOf(taxon);
  return (
    <span class="ct-bar" role="img" aria-label={spanWords(taxon)}>
      {phases.map((_, i) => <i class={`${s && s[0] <= i && i <= s[1] ? 'on' : ''}${i === current ? ' cur' : ''}`} />)}
    </span>
  );
}

const PIN = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 1.5h6l-1 4 3 3H3l3-3z M8 8.5V15" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>;
const SPROUT = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15V7" stroke="currentColor" stroke-width="1.8" /><path d="M8 8C8 4.5 5.5 2.5 2 2.5c0 3.5 2.5 5.5 6 5.5zM8 9.5c0-3 2.2-5 6-5 0 3-2.2 5-6 5z" fill="currentColor" /></svg>;
export const WARN = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /><path d="M8 6v4" stroke="currentColor" stroke-width="1.7" /><circle cx="8" cy="12" r="1" fill="currentColor" /></svg>;
const CLOSE = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>;
export const BACK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" /></svg>;

// ---- plants and their warnings ----

// The flags a plant carries: a member's from the store, any other plant's beside the members.
export function flagsOfPlant(t: Taxon): Flag[] {
  if (store.members.value.includes(t.id)) return store.flags.value.filter((f) => f.id === t.id);
  return flagsFor(t, store.memberTaxa.value, store.flagContext.value);
}

const SOIL_PH = (t: Taxon) => ({ min: t.traits.soil_ph?.min != null ? num(t.traits.soil_ph.min) : '?', max: t.traits.soil_ph?.max != null ? num(t.traits.soil_ph.max) : '?' });
// The site answers a plant misfits (beside the other members' canopy), each in words.
export function misfitWords(t: Taxon, site: Site = store.site.value): string[] {
  const fit = fits(t, site);
  const keys = misfitsBeside(t, site, store.memberTaxa.value.filter((o) => o.id !== t.id), fit);
  const out: string[] = [];
  for (const r of fit.reasons) {
    if (r.verdict !== 'misfit' || !keys.includes(r.key)) continue;
    if (r.key === 'light') out.push(T(`misfit.light.${site.light}`));
    else if (r.key === 'soil') out.push(T(`misfit.soil.${site.soil}`, SOIL_PH(t)));
    else if (r.key === 'water') out.push(T(`misfit.water.${site.water}`));
    else if (r.key === 'room' && r.kind === 'wild_height') out.push(T(`misfit.wild.${site.room}`, { m: num(r.meters), limit: num(r.limit) }));
  }
  return out;
}
// What the site check could not decide, said aloud (never a silent fit, A7).
export function unknownWords(t: Taxon, site: Site = store.site.value): string[] {
  return fits(t, site).reasons.filter((r) => r.verdict === 'unknown').map((r) =>
    r.key === 'room' ? T(r.kind === 'climber' ? 'misfit.unk.climber' : 'misfit.unk.room') : T(`misfit.unk.${r.key}`));
}

export interface Line { text: string; kind: Flag['kind'] | 'soft'; asks: boolean }
// A plant's flags as lines: misfits, conflicts (high ones "serious"), invasive here, toxicity.
// Low conflicts are left to details (soft: false keeps them, for the dialog).
export function flagLines(t: Taxon, flags: Flag[], { low = false } = {}): Line[] {
  const out: Line[] = [];
  for (const f of flags) {
    if (f.kind === 'misfit') for (const w of misfitWords(t)) out.push({ text: T('details.misfit', { why: w }), kind: 'misfit', asks: true });
    else if (f.kind === 'conflict') {
      if (f.severity === 'low' && !low) continue;
      const other = f.other ? taxonOf(f.other) : null;
      const note = f.note ? (f.note[lang() as Locale] ?? f.note.en) : T(`ctype.${f.type}`);
      const serious = f.severity === 'high';
      let text = T('details.conflict', { other: other ? nameOf(other) : '?', text: note });
      if (f.agent) text += ` ${T('d.agent', { agent: f.agent })}.`;
      if (serious) text += ` (${T('details.serious')})`;
      out.push({ text, kind: f.severity === 'low' ? 'soft' : 'conflict', asks: serious });
    } else if (f.kind === 'invasive') {
      out.push({ text: T('d.invHere', { country: countryName(store.country.value.code ?? '') }), kind: 'invasive', asks: false });
    } else if (f.kind === 'toxicity' && t.warnings.toxicity) {
      out.push({ text: T('details.tox', { level: T(`tox.${t.warnings.toxicity.level}`) }), kind: 'toxicity', asks: false });
    }
  }
  return out;
}

// "Not checked in {country}": once per view (the Add and Swap sheets' top line, the dialog).
export function NotChecked() {
  const ctx = store.flagContext.value;
  if (ctx.countryStatus !== 'unchecked' || !ctx.country) return null;
  return <p class="ct-note">{T('add.notChecked', { country: countryName(ctx.country) })}</p>;
}

// Focus back to the opener when the last sheet closes.
let opener: HTMLElement | null = null, openerPlant: PlantId | null = null, wasOpen = false;
if (typeof document !== 'undefined') {
  effect(() => {
    const s = store.sheet.value;
    if (s && !wasOpen) {
      const a = document.activeElement;
      opener = a instanceof HTMLElement && a !== document.body ? a : null;
      openerPlant = s.id;
    }
    if (!s && wasOpen) {
      const back = opener, plant = openerPlant;
      opener = null;
      requestAnimationFrame(() => {
        const again = plant ? document.querySelector<HTMLElement>(`[data-plant-id="${CSS.escape(plant)}"]`) : null;
        const target = back?.isConnected ? back : again ?? document.querySelector<HTMLElement>('.ct-toast-undo');
        target?.focus();
      });
    }
    wasOpen = !!s;
  });
}

// A sheet: a modal <dialog>, a side sheet on desktop and full screen on phones. Escape, Close and a
// click on the backdrop close it; the element marked data-autofocus (its heading) takes the focus.
export function SheetFrame({ titleId, head, children, class: cls = '' }: { titleId: string; head?: ComponentChildren; children: ComponentChildren; class?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  // A click closes the sheet only when it both starts and ends on the backdrop (a text selection
  // dragged out of the sheet and released outside does not).
  const downOnBackdrop = useRef(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => { if (store.sheet.peek()) closeSheet(); };
    d.addEventListener('close', onClose);
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => { d.removeEventListener('close', onClose); if (d.open) d.close(); };
  }, []);
  return (
    <dialog ref={ref} class={`ct-sheet ${cls}`} aria-labelledby={titleId}
      onPointerDown={(e) => { downOnBackdrop.current = e.target === ref.current; }}
      onClick={(e) => { if (e.target === ref.current && downOnBackdrop.current) closeSheet(); downOnBackdrop.current = false; }}>
      <div class="ct-sheet-inner">
        <div class="ct-sheet-head">
          <div class="ct-sheet-head-main">{head}</div>
          <button type="button" class="ct-icon-button" aria-label={T('close')} onClick={closeSheet}>{CLOSE}</button>
        </div>
        <div class="ct-sheet-body">{children}</div>
        <Toast where="sheet" />
      </div>
    </dialog>
  );
}

// "Add it anyway?" / "Swap anyway?": a small alertdialog over the sheet, naming what asks.
export function Ask({ title, lines, yes, onYes, onCancel }: { title: string; lines: string[]; yes: string; onYes: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => cancel.current();
    d.addEventListener('close', onClose);
    d.showModal();
    d.querySelector<HTMLElement>('[data-cancel]')?.focus();
    return () => { d.removeEventListener('close', onClose); if (d.open) d.close(); };
  }, []);
  return (
    <dialog ref={ref} class="ct-ask" role="alertdialog" aria-labelledby="ct-ask-title" aria-describedby="ct-ask-why">
      <h3 id="ct-ask-title">{title}</h3>
      <ul id="ct-ask-why" class="ct-warnlist">{lines.map((l) => <li>{l}</li>)}</ul>
      <div class="ct-actions">
        <button type="button" class="button button-primary" onClick={onYes}>{yes}</button>
        <button type="button" class="button button-secondary" data-cancel onClick={() => ref.current?.close()}>{T('cancel')}</button>
      </div>
    </dialog>
  );
}

// Browser-test builds only: makes the next sheet chunk fail to load (the page preloads every chunk,
// so the network cannot make it fail).
// A sheet module loaded on first use.
type SheetModule = { default: ComponentType<Record<string, unknown>> };
const loaded = new Map<() => Promise<SheetModule>, ComponentType<Record<string, unknown>>>();
function Lazy({ load, props = {} }: { load: () => Promise<SheetModule>; props?: Record<string, unknown> }) {
  const [View, setView] = useState<ComponentType<Record<string, unknown>> | null>(() => loaded.get(load) ?? null);
  useEffect(() => {
    if (View) return;
    let live = true;
    const fail = import.meta.env.PUBLIC_CT_TEST_HOOK === '1' && testFault.sheets;
    (fail ? Promise.reject(new Error('test: sheet chunk blocked')) : load()).then((m) => { loaded.set(load, m.default); if (live) setView(() => m.default); })
      .catch((err: unknown) => {
        console.error(`Consortium: a sheet did not load: ${(err as Error).message}`);
        if (!live) return;
        closeSheet();
        showToast(T('details.loadFailed'), null, { label: T('details.reload'), run: () => location.reload() });
      });
    return () => { live = false; };
  }, [load]);
  return View ? h(View, props) : null;
}
const loadSwap = () => import('./Swap.tsx') as Promise<SheetModule>;
const loadAdd = () => import('./Add.tsx') as Promise<SheetModule>;
const loadPaste = () => import('./Paste.tsx') as Promise<SheetModule>;
const loadCorrection = () => import('./Correction.tsx') as unknown as Promise<SheetModule>;

// ---- the plant dialog ----

let labelsFor: { lang: string; labels: Promise<Labels> } | null = null;
function labelsOf(): Promise<Labels> | null {
  const src = store.source.value;
  if (!src) return null;
  if (labelsFor?.lang !== lang()) labelsFor = { lang: lang(), labels: src.labels(lang() as Locale).catch(() => ({})) };
  return labelsFor.labels;
}

export interface CorrectionField { field: string; label: string; current: string; raw: unknown }
// Correction drafts by plant id, kept for the page's life: closing the dialog (Escape in the text,
// the backdrop) or an offline send never loses what the reader wrote. Correction.tsx writes them and
// drops one once it is sent.
export interface CorrectionDraft { field: string; proposed: string; note: string; email: string; consent: boolean; website: string }
export const drafts = new Map<PlantId, CorrectionDraft>();
interface Trait { field: string; label: string; text: string; raw: unknown }

function traitsOf(t: Taxon, labels: Labels): Trait[] {
  const tr = t.traits, unknown = T('unknown');
  const label = (field: string, v: string | null) => (v === null ? unknown : labels[field]?.[v]?.[lang() as Locale] ?? v);
  const light = [tr.sun && T('details.sun'), tr.semi_shade && T('details.semiShade'), tr.full_shade && T('details.shade')].filter((x): x is string => !!x);
  const ph = tr.soil_ph && (tr.soil_ph.min !== null || tr.soil_ph.max !== null) ? `${tr.soil_ph.min !== null ? num(tr.soil_ph.min) : '?'}–${tr.soil_ph.max !== null ? num(tr.soil_ph.max) : '?'}` : unknown;
  const height = tr.height_m?.max != null ? T('details.heightV', { m: num(tr.height_m.max) }) : T('details.heightNR');
  const zone = tr.hardiness_zone && tr.hardiness_zone.min !== null ? T('details.zoneV', { a: num(tr.hardiness_zone.min), b: num(tr.hardiness_zone.max ?? tr.hardiness_zone.min) }) : unknown;
  return [
    { field: 'height_m', label: T('t.height'), text: height, raw: tr.height_m },
    { field: 'width_max_m', label: T('t.width'), text: tr.width_max_m != null ? T('meters', { v: num(tr.width_max_m) }) : unknown, raw: tr.width_max_m },
    { field: 'sun', label: T('t.light'), text: light.length ? listOf(light) : unknown, raw: { sun: tr.sun, semi_shade: tr.semi_shade, full_shade: tr.full_shade } },
    { field: 'soil_ph', label: T('t.ph'), text: ph, raw: tr.soil_ph },
    { field: 'drought_tolerance', label: T('t.drought'), text: label('drought_tolerance', tr.drought_tolerance), raw: tr.drought_tolerance },
    { field: 'moisture_use', label: T('t.moisture'), text: label('moisture_use', tr.moisture_use), raw: tr.moisture_use },
    { field: 'habit', label: T('t.habit'), text: label('habit', tr.habit), raw: tr.habit },
    { field: 'deciduous_evergreen', label: T('t.leaf'), text: label('deciduous_evergreen', tr.deciduous_evergreen), raw: tr.deciduous_evergreen },
    { field: 'hardiness_zone', label: T('details.hardiness'), text: zone, raw: tr.hardiness_zone },
  ];
}

// The invasive lines of the dialog that are not flags (soft): where it is recorded invasive, or that
// the reader's country was not checked ("not checked in {country}", once, here).
function invasiveSoft(t: Taxon): string[] {
  const list = t.warnings.invasive_in;
  if (list === null) return [T('d.invUnk')];
  const { country, countryStatus } = store.flagContext.value;
  const code = country?.toUpperCase() ?? null;
  const elsewhere = list.filter((r) => r.country !== code).map((r) => r.country);
  const out: string[] = [];
  if (countryStatus === 'unchecked' && code) out.push(T('details.invNotChecked', { country: countryName(code) }));
  if (countryStatus === 'checked' && code && !list.some((r) => r.country === code)) out.push(T('details.invNotHere', { country: countryName(code) }));
  if (elsewhere.length) out.push(P('details.invElse', elsewhere.length, { list: listOf(elsewhere.slice(0, 8).map(countryName)) + (elsewhere.length > 8 ? '…' : '') }));
  else if (!list.length && !(countryStatus === 'checked' && code)) out.push(T('d.invNone'));
  return out;
}

// Guide titles in the guide's language (en or fr), from #ct-data `guideTitles` (slug → title), which
// ConsortiumPage.astro writes; the title carries the guide's language. A slug the page did not pass
// (none should: check-built-site) shows as words, marked English.
let guideTitles: Record<string, string> | null = null;
function guideTitleOf(slug: string): { title: string; lang: string | null } {
  if (guideTitles === null) {
    try { guideTitles = (JSON.parse(document.getElementById('ct-data')?.textContent ?? '{}') as { guideTitles?: Record<string, string> }).guideTitles ?? {}; } catch { guideTitles = {}; }
  }
  const own = guideTitles[slug];
  return own ? { title: own, lang: lang() === 'fr' ? 'fr' : 'en' } : { title: slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), lang: 'en' };
}
function guideLinks(t: Taxon): { url: string; title: string; titleLang: string | null; hreflang: string | null }[] {
  const own = lang() === 'fr' ? 'fr' : 'en';
  return (consortiumGuides[t.canonical_name] ?? []).map((slug) => {
    const { title, lang: titleLang } = guideTitleOf(slug);
    return { url: own === 'fr' ? `/fr/guides/${slug}/` : `/guides/${slug}/`, title, titleLang: titleLang !== lang() ? titleLang : null, hreflang: own !== lang() ? own : null };
  });
}

function SourceItem({ id, facts }: { id: string; facts: PlantFacts | null }) {
  const s = facts?.sources[id];
  if (!s) return <>{id}</>;
  const href = safeHref(s.url);
  return href ? <a class="text-link" href={href} rel="noopener">{s.label}</a> : <>{s.label}</>;
}

function PlantDetails({ id }: { id: PlantId }) {
  const t = taxonOf(id);
  const zone = t?.from ?? store.climate.value;
  const [facts, setFacts] = useState<PlantFacts | null>(null);
  const [labels, setLabels] = useState<Labels>({});
  // A plant with a draft (closed by Escape or the backdrop) opens with its form and text back.
  const [correcting, setCorrecting] = useState(() => drafts.has(id));
  const openButton = useRef<HTMLButtonElement>(null);
  const reopened = useRef(false);
  const byReader = useRef(false); // opened with the button (focus the form), not brought back with a draft
  useEffect(() => { if (!correcting && reopened.current) openButton.current?.focus(); reopened.current = correcting; }, [correcting]);
  useEffect(() => {
    const src = store.source.value;
    setFacts(null);
    setCorrecting(drafts.has(id));
    byReader.current = false;
    if (!src || !zone) return;
    let live = true;
    src.details(id, zone, lang() as Locale).then((d) => { if (live) setFacts(d); })
      .catch((err: unknown) => console.error(`Consortium details ${id}: ${(err as Error).message}`));
    labelsOf()?.then((l) => { if (live) setLabels(l); });
    return () => { live = false; };
  }, [id, zone]);
  if (!t || !zone) return null;

  const member = store.members.value.includes(id);
  const kept = store.kept.value.includes(id);
  const crop = store.crops.value.includes(id);
  const flags = flagsOfPlant(t);
  const lines = flagLines(t, flags, { low: true });
  const soft = [
    ...unknownWords(t),
    ...invasiveSoft(t),
    ...(t.warnings.toxicity === null ? [T('d.toxUnk')] : t.warnings.toxicity.level === 'Slight' ? [T('details.tox', { level: T('tox.Slight') })] : []),
    T(t.warnings.allelopathic === true ? 'd.allelo' : t.warnings.allelopathic === false ? 'd.alleloNone' : 'd.alleloUnk'),
    ...(t.warnings.weed_potential === true ? [T('d.spreads')] : []),
  ];
  const others = store.memberTaxa.value.filter((o) => o.id !== id);
  const pairs = pairings(t, others, store.flagContext.value.interactions);
  const jobs = jobsOf(t);
  const traits = traitsOf(t, labels);
  const sourceLabel = (sid: string) => facts?.sources[sid]?.label ?? sid;
  const rows = facts ? layerRows(facts.layerValues, words(), sourceLabel) : [];
  const elsewhere = facts ? Object.entries(facts.placements).filter(([z, p]) => z !== zone && p) : [];
  const guides = guideLinks(t);
  const image = facts?.image ?? t.image;
  const photoHref = image ? safeHref(image.source_page_url) : null;
  const release = store.source.value?.info().releaseId ?? '';
  const s = spanOf(t);
  const fields: CorrectionField[] = [
    ...traits.map((x) => ({ field: x.field, label: x.label, current: x.text === T('unknown') ? '' : x.text, raw: x.raw })),
    { field: 'stratum', label: T('correction.fieldLayer'), current: t.stratum ? layerName(t) : '', raw: t.stratum?.value ?? null },
    { field: 'phases', label: T('correction.fieldTiming'), current: t.phases ? spanWords(t) : '', raw: t.phases ? { start: t.phases.start, end: t.phases.end } : null },
    { field: `names.${lang()}`, label: T('correction.fieldName'), current: t.names[lang() as Locale] ?? '', raw: t.names[lang() as Locale] ?? null },
  ];

  return (
    <SheetFrame titleId="ct-d-title" class="ct-details" head={<span class="ct-muted">{layerName(t)}{s ? ` · ${plainPhase(s[0])}` : ''}</span>}>
      {image && (
        <figure class="ct-photo">
          <img src={image.url} alt={T('details.photoAlt', { name: nameOf(t) })} loading="lazy" decoding="async" width={480} height={360} />
          <figcaption>
            {T('details.photo', { credit: [image.credit, image.licence].filter(Boolean).join(' · ') })}
            {photoHref && <> · <a class="text-link" href={photoHref} rel="noopener">{T('details.photoSource')}</a></>}
          </figcaption>
        </figure>
      )}
      <div class="ct-d-name">
        <h2 id="ct-d-title" tabIndex={-1} data-autofocus>{nameOf(t)}</h2>
        <p><i class="ct-sci">{t.canonical_name}</i>{t.family && <span class="ct-muted"> · {t.family}</span>}</p>
        <p class="ct-marks">
          {crop && <span class="ct-tag">{SPROUT}{T('mainCrop')}</span>}
          {!crop && kept && <span class="ct-tag">{PIN}{T('keptTag')}</span>}
          {t.from && <span class="ct-tag ct-tag-guest">{T('details.fromList', { climate: zoneName(t.from) })}</span>}
          {lines.filter((l) => l.kind !== 'soft').length > 0 && <span class="ct-flag">{WARN}{P('details.warnCount', lines.filter((l) => l.kind !== 'soft').length)}</span>}
        </p>
      </div>

      <section class="ct-place" aria-labelledby="ct-d-place">
        <h3 id="ct-d-place">{T('details.placedFor', { climate: zoneName(zone) })}</h3>
        <p><strong>{layerName(t)}</strong>{t.stratum && <> · {T(`stratum.${t.stratum.value}.needs`)}</>}</p>
        <Bar taxon={t} />
        <p>{spanWords(t)}</p>
        {t.from && <p class="ct-muted">{T('details.fromListNote')}</p>}
      </section>

      {member && (
        <div class="ct-actions">
          {crop
            ? <span class="ct-tag ct-tag-large">{SPROUT}{T('details.cropNoSwap')}</span>
            : <>
                <button type="button" class="button button-secondary" aria-pressed={kept} onClick={() => toggleKeep(id)}>{PIN}{T('details.keep')}</button>
                <button type="button" class="button button-secondary" onClick={() => openSheet('swap', id)}>{T('details.swap')}</button>
              </>}
          <button type="button" class="button button-secondary" onClick={() => { closeSheet(); removeMember(id); }}>{T('details.remove')}</button>
        </div>
      )}

      <section aria-labelledby="ct-d-why">
        <h3 id="ct-d-why">{T('why')}</h3>
        {!facts ? <p class="ct-muted" aria-busy="true">{T('details.loading')}</p>
          : facts.reasons.length ? (
            <ul class="ct-reasons">
              {facts.reasons.map((r) => (
                <li>
                  <p><DataText text={r.text} /></p>
                  <p class="ct-muted">{T('details.reasonFrom', { region: T(`region.${r.region}`) })} <SourceItem id={r.source} facts={facts} /></p>
                </li>
              ))}
            </ul>
          ) : <p class="ct-muted">{T('noSource')}</p>}
      </section>

      <section aria-labelledby="ct-d-jobs">
        <h3 id="ct-d-jobs">{T('jobsHeading')}</h3>
        {jobs.length ? <ul class="ct-chips">{jobs.map((j) => <li>{T(`job.${j}`)}</li>)}</ul> : <p class="ct-muted">{T('d.jobsUnk')}</p>}
      </section>

      <section aria-labelledby="ct-d-warn">
        <h3 id="ct-d-warn">{T('withWarning')}</h3>
        <ul class="ct-warnlist">
          {lines.map((l) => <li class={l.kind === 'soft' ? 'soft' : ''}>{l.text}</li>)}
          {soft.map((x) => <li class="soft">{x}</li>)}
        </ul>
        <p class="ct-muted ct-small">{T('d.liab')}</p>
      </section>

      <section aria-labelledby="ct-d-pairs">
        <h3 id="ct-d-pairs">{T('details.pairings')}</h3>
        {pairs.length
          ? <ul class="ct-oklist">{pairs.map((p) => <li>{T('details.pairing', { other: nameOf(p.other) })}</li>)}</ul>
          : <p class="ct-muted">{T('details.noPairing')}</p>}
      </section>

      <section aria-labelledby="ct-d-traits">
        <h3 id="ct-d-traits">{T('traits')}</h3>
        <dl class="ct-traits">{traits.map((x) => <><dt>{x.label}</dt><dd>{x.text}</dd></>)}</dl>
      </section>

      {rows.length > 0 && (
        <section aria-labelledby="ct-d-layers">
          <h3 id="ct-d-layers">{T('details.layerValues')}</h3>
          <dl class="ct-traits">
            {rows.map((r) => (
              <>
                <dt>{r.label}</dt>
                <dd>{r.values.map((v) => <div>{v.text} <span class="ct-muted ct-small">· {v.where}</span>{v.estimate && <span class="ct-est">{T('est.word')}</span>}</div>)}</dd>
              </>
            ))}
          </dl>
          {rows.some((r) => r.values.some((v) => v.estimate)) && <p class="ct-muted ct-small"><span class="ct-est">{T('est.word')}</span> {T('est.legend')}</p>}
        </section>
      )}

      {elsewhere.length > 0 && (
        <section aria-labelledby="ct-d-else">
          <h3 id="ct-d-else">{T('details.otherClimates')}</h3>
          <ul class="ct-plain">
            {elsewhere.map(([z, p]) => (
              <li>{T('details.otherPlacement', {
                climate: zoneName(z as ClimateZone),
                layer: p!.stratum ? T(`stratum.${p!.stratum}`) : T('stratum.none'),
                span: p!.start && p!.end ? (p!.start === p!.end ? plainPhase(phaseOrd(p!.start)) : `${plainPhase(phaseOrd(p!.start))} → ${plainPhase(phaseOrd(p!.end))}`) : T('timingUnknown'),
              })}</li>
            ))}
          </ul>
        </section>
      )}

      {guides.length > 0 && (
        <section aria-labelledby="ct-d-guides">
          <h3 id="ct-d-guides">{T('details.guides')}</h3>
          <ul class="ct-plain">{guides.map((g) => <li><a class="text-link" href={g.url} hreflang={g.hreflang ?? undefined} lang={g.titleLang ?? undefined}>{g.title}</a></li>)}</ul>
        </section>
      )}

      <section aria-labelledby="ct-d-sources">
        <h3 id="ct-d-sources">{T('sources')}</h3>
        {facts && Object.keys(facts.sources).length
          ? <ul class="ct-sources">{Object.keys(facts.sources).map((sid) => <li><SourceItem id={sid} facts={facts} /></li>)}</ul>
          : <p class="ct-muted">{facts ? T('noSource') : T('details.loading')}</p>}
      </section>

      {release && (
        <section class="ct-correct" aria-labelledby="ct-corr-title">
          <h3 id="ct-corr-title">{T('correction.title')}</h3>
          {correcting
            ? <Lazy load={loadCorrection} props={{ fields, plantId: id, plantName: t.canonical_name, plantLabel: nameOf(t), release, climate: zone, climateLabel: zoneName(zone), onCancel: () => setCorrecting(false), focusFirst: byReader.current }} />
            : <>
                <p class="ct-muted">{T('correction.lede')}</p>
                <p><button type="button" class="button button-secondary" ref={openButton} aria-expanded="false" onClick={() => { byReader.current = true; setCorrecting(true); }}>{T('correction.open')}</button></p>
              </>}
        </section>
      )}
      <p class="ct-muted ct-small">{T('release', { id: release })}</p>
    </SheetFrame>
  );
}

function Router() {
  const s = store.sheet.value;
  if (!s || store.load.value.status !== 'ready') return null;
  switch (s.kind) {
    // Keyed by kind: going from one sheet to another (details → Swap) mounts a fresh dialog.
    case 'details': return s.id ? <PlantDetails key="details" id={s.id} /> : null;
    case 'swap': return s.id ? <Lazy key="swap" load={loadSwap} props={{ id: s.id }} /> : null;
    case 'add': return <Lazy key="add" load={loadAdd} props={{ mode: 'add' }} />;
    case 'search': return <Lazy key="search" load={loadAdd} props={{ mode: 'search' }} />;
    case 'paste': return <Lazy key="paste" load={loadPaste} />;
    default: return null; // share and download are stream S4's
  }
}

function S3Views() {
  return <><Router /><Toast /></>;
}

export const Details: ComponentType | null = S3Views;
