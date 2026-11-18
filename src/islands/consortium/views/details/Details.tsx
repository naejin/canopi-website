/** @jsxImportSource preact */
// The plant dialog (stream S3; pf-f "One plant", v14 boards Details, DarkDetails, DetailsMore,
// DetailsDesk), loaded on first use: views/Sheets.tsx, the first-run router, opens it in the sheet
// frame it passes (`Frame`) and shows the plant's name and a loading line until this chunk is here. The
// dialog's correction form (views/Correction.tsx) is its own chunk, loaded when the form first opens.
//
// One order for eyes and keys (R4): the name, the photo, the summary card (its jobs and the holes it
// fills, when it stands and its size, the Niche block, the marks), Against your place, the soil card,
// What you can do (a member), then three closed sections: What it does (with Time and size), With your
// other plants and warnings, and Names, why it is here, sources (with the correction form). From 960px
// the dialog is two columns (details.css), never reordered.
//
// Owner rows (knowledge/decisions/consortium-user-decisions.md): warn rather than remove dangerous
// information; "not checked in {country}" is said once per view and in details, never as a chip; a
// guest added from another climate's list is labelled "from the {climate} list"; pairings are
// yield-gain field trials only (no companion folklore). Data the release lacks (light span, best pH,
// moisture, root depth) is said as "after release" or the plant's single level, never guessed.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { closeSheet, openSheet, removeMember, taxonOf } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Details as PlantFacts, JobId, Labels, Locale, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { TODAY_PERIOD, borrowedFrom, candoLine, drainageLine, factAt, fills, guestOf, invasiveLines, jobsOf, keepLine, laterLossOf, locales, measureOf, pairings, periodIds, periodName, placementZone, rowBandOf, siteIdOf, sourceTitle, spanOf, sureRows, warns, yearsLine, whenLine, yearsOf } from '../../../../lib/consortium/index.ts';
import type { Factor, PlantVerdict, SureRow } from '../../../../lib/consortium/index.ts';
import { bloomNear, monthsLong } from './bloom.ts';
import { safeHref } from '../../../../lib/safe-href.js';
import { consortiumGuides, jobGuides } from '../../../../data/consortium-guides.ts';
import { Against, SoilCard, soilSayOf } from './Against.tsx';
import { AltRow, FitLine, JobIcon, jobList, MeasureGlyph, midSentence, nicheLight, RowBandLine, say, sizeShort, SWAP } from '../kit/fit.tsx';
import { shared, type Frame } from '../kit/sheet.tsx';
import { countryName, layerName, listOf, nameOf, num, phaseTerm, spanWords, zoneName } from '../kit/names.ts';
import { WARN } from '../kit/icons.tsx';
import { drafts, type CorrectionField } from '../kit/correction.ts';
import { pageData } from '../kit/page.ts';
import { later } from '../lazy.tsx';
import { retryableImport } from '../../../../lib/consortium/index.ts';
const { flagLines, unknownWords } = shared; // first-run modules (kit/sheet.tsx shared)

// The not-checked and information mark beside its words (never alone): a circled i.
const INFO = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.6" /><circle cx="8" cy="5" r="0.9" fill="currentColor" /></svg>;
// The estimate mark (board Details' "Placed as on the Tropical list: an estimate" chip): a wave.
const WAVE = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 9c2-3 4-3 6 0s4 3 6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>;
const PLUS = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>;
const CHECK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>;
const SEARCH = <svg class="ct-glyph" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5" fill="none" stroke="currentColor" stroke-width="1.6" /><path d="M12.3 12.3l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>;
const LEAF = <svg class="ct-glyph" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16c0-7 4-11 12-12 0 8-4 12-11 12ZM4 16l7-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>;

// The correction form, a sheet part: a chunk that does not come closes the dialog with the toast.
const correction = later(retryableImport(() => import('../Correction.tsx'), (m) => m.default), { onFail: 'closeSheet' });

// ---- words ----

const lang = () => pageLang();
// A language's own name ("Español", "中文"), for the names section.
const ownName = (code: string) => {
  let name = code;
  try { name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code; } catch { /* the code itself */ }
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
};
// A layer's name for a plant ("No layer yet" without one).
const layerOf = (t: Taxon): string => (t.stratum ? layerName(t.stratum.value) : T('stratum.none'));
// A text from the data in the page language, else in English (marked).
function DataText({ text }: { text: { en: string } & Partial<Record<string, string>> }) {
  const own = text[lang()];
  return own ? <>{own}</> : <span lang="en">{text.en}</span>;
}
// A data label in the page language (labels from the release), else the value, else "Not recorded".
const labelOf = (labels: Labels, field: string, v: string | null): string => (v === null ? T('details.notRecorded') : labels[field]?.[v]?.[lang() as Locale] ?? v);

// A job's filled tile (boards Details, DetailsMore): its mark on the job's colour, beside its words.
const JobTile = ({ job }: { job: JobId }) => <span class="ct-job-tile" data-job={job}><JobIcon job={job} /></span>;
// A row of a definition list (Time and size, Warnings, Sources).
const Row = ({ k, children, hook }: { k: string; children: ComponentChildren; hook?: string }) => <><dt>{k}</dt><dd data-row={hook}>{children}</dd></>;

// ---- the plant dialog ----

let labelsFor: { lang: string; labels: Promise<Labels> } | null = null;
function labelsOf(): Promise<Labels> | null {
  const src = store.source.value;
  if (!src) return null;
  if (labelsFor?.lang !== lang()) labelsFor = { lang: lang(), labels: src.labels(lang() as Locale).catch(() => ({})) };
  return labelsFor.labels;
}

// The fields the correction form offers, each with what the dialog shows now.
function correctionFields(t: Taxon, labels: Labels): CorrectionField[] {
  const tr = t.traits, unknown = T('details.notRecorded');
  const water = factAt('water_need', t, store.siteInputs.value, TODAY_PERIOD);
  const drought = water?.drought ?? null, moisture = water?.moisture ?? null;
  const light = [tr.sun && T('details.sun'), tr.semi_shade && T('details.semiShade'), tr.full_shade && T('details.shade')].filter((x): x is string => !!x);
  const ph = tr.soil_ph && (tr.soil_ph.min !== null || tr.soil_ph.max !== null) ? `${tr.soil_ph.min !== null ? num(tr.soil_ph.min) : '?'}–${tr.soil_ph.max !== null ? num(tr.soil_ph.max) : '?'}` : '';
  const zone = tr.hardiness_zone && tr.hardiness_zone.min !== null ? T('details.zoneV', { a: num(tr.hardiness_zone.min), b: num(tr.hardiness_zone.max ?? tr.hardiness_zone.min) }) : '';
  const shown = (s: string) => (s === unknown ? '' : s);
  return [
    { field: 'height_m', label: T('t.height'), current: tr.height_m?.max != null ? T('details.heightV', { m: num(tr.height_m.max) }) : '', raw: tr.height_m },
    { field: 'width_max_m', label: T('t.width'), current: tr.width_max_m != null ? T('meters', { v: num(tr.width_max_m) }) : '', raw: tr.width_max_m },
    { field: 'sun', label: T('t.light'), current: light.length ? listOf(light) : '', raw: { sun: tr.sun, semi_shade: tr.semi_shade, full_shade: tr.full_shade } },
    { field: 'soil_ph', label: T('t.ph'), current: ph, raw: tr.soil_ph },
    { field: 'drought_tolerance', label: T('t.drought'), current: shown(labelOf(labels, 'drought_tolerance', drought)), raw: drought },
    { field: 'moisture_use', label: T('t.moisture'), current: shown(labelOf(labels, 'moisture_use', moisture)), raw: moisture },
    { field: 'habit', label: T('t.habit'), current: shown(labelOf(labels, 'habit', tr.habit)), raw: tr.habit },
    { field: 'deciduous_evergreen', label: T('t.leaf'), current: shown(labelOf(labels, 'deciduous_evergreen', tr.deciduous_evergreen)), raw: tr.deciduous_evergreen },
    { field: 'hardiness_zone', label: T('details.hardiness'), current: zone, raw: tr.hardiness_zone },
    { field: 'stratum', label: T('correction.fieldLayer'), current: t.stratum ? layerOf(t) : '', raw: t.stratum?.value ?? null },
    { field: 'phases', label: T('correction.fieldTiming'), current: t.phases ? spanWords(t) : '', raw: t.phases ? { start: t.phases.start, end: t.phases.end } : null },
    { field: `names.${lang()}`, label: T('correction.fieldName'), current: t.names[lang() as Locale] ?? '', raw: t.names[lang() as Locale] ?? null },
  ];
}

// The invasive lines of the dialog (schema 4.3, core invasiveLines): in the reader's country one line
// per source with the areas it names, or "not checked" / "not recorded" there, said once, here; then
// where else it is recorded. Each carries its source (data-invasive-scope).
interface Soft { text: string; scope?: string }
function invasiveSoft(t: Taxon, facts: PlantFacts | null): Soft[] {
  const list = facts?.invasiveIn ?? t.warnings.invasive_in;
  const { country, countryStatus } = store.flagContext.value;
  const code = country?.toUpperCase() ?? null;
  const here: Soft[] = invasiveLines({ invasiveIn: list, invasiveAreas: facts?.invasiveAreas ?? null }, { country: code, checked: countryStatus === 'checked' })
    .map((l) => ({ text: say(l), scope: typeof l.vars.sourceId === 'string' ? l.vars.sourceId : undefined }));
  if (list === null) return here.length ? here : [{ text: T('d.invUnk') }];
  const elsewhere = [...new Set(list.filter((r) => r.country !== code).map((r) => r.country))];
  if (elsewhere.length) here.push({ text: P('details.invElse', elsewhere.length, { list: listOf([...elsewhere.slice(0, 8).map(countryName), ...(elsewhere.length > 8 ? [P('details.nMore', elsewhere.length - 8)] : [])]) }) });
  else if (!list.length && !code) here.push({ text: T('d.invNone') });
  return here;
}

// Guide titles in the guide's language (en or fr), from #ct-data `guideTitles` (slug → title).
function guideTitleOf(slug: string): { title: string; lang: string | null } {
  const own = pageData()?.guideTitles?.[slug];
  return own ? { title: own, lang: lang() === 'fr' ? 'fr' : 'en' } : { title: slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), lang: 'en' };
}
function guideLinks(t: Taxon, main: JobId | null): { url: string; title: string; titleLang: string | null; hreflang: string | null }[] {
  const own = lang() === 'fr' ? 'fr' : 'en';
  const slugs = consortiumGuides[t.canonical_name] ?? [];
  // No guide of its own: the guides on its main job, named by the job (fix round 1 BC17).
  if (!slugs.length && main) return [{ url: own === 'fr' ? `/fr/guides/${jobGuides[main]}/` : `/guides/${jobGuides[main]}/`, title: T(`details.jobGuide.${main}`), titleLang: null, hreflang: own !== lang() ? own : null }];
  return slugs.map((slug) => {
    const { title, lang: titleLang } = guideTitleOf(slug);
    return { url: own === 'fr' ? `/fr/guides/${slug}/` : `/guides/${slug}/`, title, titleLang: titleLang !== lang() ? titleLang : null, hreflang: own !== lang() ? own : null };
  });
}

// A source's title with a trailing working date written in words (board DetailsMore: "Canopi sample
// review, 27 October 2026", not "(2026-10-27)").
// English dates day first, as the board and the site's other dates ("27 October 2026", en-GB).
function longDates(label: string): string {
  return label.replace(/\s*\((\d{4})-(\d{2})-(\d{2})\)/g, (_, y: string, m: string, d: string) => {
    try { return `, ${new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : lang(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(+y, +m - 1, +d))}`; } catch { return ` (${y}-${m}-${d})`; }
  });
}
function SourceItem({ id, facts }: { id: string; facts: PlantFacts | null }) {
  const s = facts?.sources[id];
  if (!s) return <>{id}</>;
  const href = safeHref(s.url), label = longDates(sourceTitle(id, s.label));
  return href ? <a class="text-link" href={href} rel="noopener">{label}</a> : <>{label}</>;
}

// The summary's first sentence (boards Details, DetailsDesk). A candidate that fills open holes of the
// palette names its main job here (the job of the first hole it fills, else its first job), the light
// level when it fills a light hole too, and how many holes it fills (core holes.ts fills on the
// palette's open holes); then its other jobs. A member says its jobs and years, then "In your palette.".
// Its main job here, one source for the summary and What it does (fix round 1 BC14): a member's first
// job; a candidate's the job of the first open hole it fills, else its first job.
function mainJobOf(t: Taxon, jobs: readonly JobId[], member: boolean): JobId | null {
  if (!jobs.length) return null;
  if (member) return jobs[0];
  const hole = store.openHoles.value.find((h) => h.kind === 'job' && h.job && fills(h, t));
  return (hole?.job as JobId | undefined) ?? jobs[0];
}
function SummaryLine({ t, jobs, member }: { t: Taxon; jobs: JobId[]; member: boolean }) {
  if (!jobs.length) return <p class="ct-muted">{T('d.jobsUnk')}</p>;
  const tiles = (list: readonly JobId[]) => <span class="ct-d-main-icons">{list.map((j) => <JobTile job={j} />)}</span>;
  const y = yearsOf(t);
  if (member) {
    const icons = tiles(jobs);
    const head = jobList(jobs);
    return (
      <p class="ct-d-main" data-summary-main>{icons}<span><strong>{head.charAt(0).toLocaleUpperCase(lang()) + head.slice(1)}</strong>{y ? <>, {say(whenLine(y.from, y.to))}</> : ''}. {T('details.inPaletteSentence')}</span></p>
    );
  }
  const filled = store.openHoles.value.filter((h) => fills(h, t));
  const main: JobId = mainJobOf(t, jobs, false) ?? jobs[0];
  const rest = jobs.filter((j) => j !== main);
  const lightHole = filled.find((h) => h.kind === 'light');
  // Board Details: the tiles of the jobs whose holes it fills, its main job first (its main job alone when it fills none).
  const icons = tiles([main, ...filled.flatMap((h) => (h.kind === 'job' && h.job && h.job !== main && jobs.includes(h.job as JobId) ? [h.job as JobId] : []))].filter((j, i, a) => a.indexOf(j) === i));
  const mainWords = lightHole && t.stratum ? T('details.andPlantedIn', { job: T(`job.${main}`), level: midSentence(T(`palette.light_${t.stratum.value}`)) }) : T(`job.${main}`);
  return (
    <p class="ct-d-main" data-summary-main data-fills={filled.length}>{icons}
      <span>
        <strong>{filled.length ? P('details.fillsHoles', filled.length, { what: mainWords }) : `${mainWords}.`}</strong>
        {rest.length > 0 && <> {T('details.alsoJobs', { list: jobList(rest, 'narrow') })}</>}
      </span>
    </p>
  );
}

// "Sources and how sure we are" (board DetailsMore; core sureRows): label and value rows, each value
// starting with a capital as the board writes them ("Estimate, from PFAF").
const capital = (x: string): string => x.charAt(0).toLocaleUpperCase(lang()) + x.slice(1);
// Its accessible name, "Sources": each row names where one fact comes from.
function SureTable({ rows }: { rows: readonly SureRow[] }) {
  return <div role="group" aria-label={T('sources')}><dl class="ct-traits" data-sure-rows>{rows.map((r) => <><dt>{say(r.label)}</dt><dd data-sure-fact={r.about} data-dispute={r.dispute} data-audience={r.audience}>{capital(say(r.value))}</dd></>)}</dl></div>;
}

// A closed section that says what it holds (board DetailsMore). A component of its own (fix round 1
// BC1): declared inside the dialog it was a new component on every render, so each re-render (a click
// on "Tell us the name you use") remounted every section closed.
function More({ k, title, hint, children }: { k: string; title: string; hint?: string; children: ComponentChildren }) {
  return (
    <details class="ct-more" data-more={k}>
      <summary><h3 id={`ct-d-${k}`}>{title}{hint && <span class="ct-muted"> {hint}</span>}</h3></summary>
      <section aria-labelledby={`ct-d-${k}`}>{children}</section>
    </details>
  );
}

// The syntropic line (board DetailsMore) and "What these words mean", which shows how the palette's
// words map to syntropic farming's (the palette's own explanation, palette.readSyntropic).
function Syntropic({ role, text }: { role: string; text: (role: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p class="ct-small" data-syntropic>{text(role)} <button type="button" class="ct-link-button" aria-expanded={open} onClick={() => setOpen(!open)}>{T('details.syntropicMeans')}</button></p>
      {open && <p class="ct-small ct-muted" data-syntropic-means>{T('palette.readSyntropic')}</p>}
    </>
  );
}

// The Niche block (v13/v14 boards): Light live (the span, today the single level, and "found mostly in"
// once the release has it); Soil pH's recorded range live with "best pH" after release; Moisture and
// Root depth after release; Flowers from the bloom months near the place, or "no months recorded".
function Niche({ t, facts, zone, desk }: { t: Taxon; facts: PlantFacts | null; zone: ClimateZone; desk: boolean }) {
  const after = <span class="ct-after" data-after-release>{T('details.afterRelease')}</span>;
  const r = t.traits.soil_ph;
  // The desk's say on soil (fix round 1 R3): the soil card's own judgement (soilSayOf: the value it
  // judged, your test or the map, or pots), placed here because the desk shows no soil card.
  const soil = desk ? soilSayOf(t, facts?.traitSources ?? null) : null;
  // The bloom rows whose scope holds the place, as one span (fix round 1 BC2: never another hemisphere's months).
  const loc = store.location.value;
  const bloom = bloomNear(facts?.layerValues ?? [], { lat: loc?.lat ?? null, country: store.flagContext.value.country ?? null, zone });
  return (
    <div class="ct-niche" data-niche>
      <h4>{T('details.niche')}</h4>
      <p class="ct-small ct-muted">{T('details.nicheLede')}</p>
      <ul>
        <li data-niche-row="light"><strong>{T('details.nicheLight')}</strong> {nicheLight(t)}</li>
        <li data-niche-row="ph"><strong>{T('details.nichePh')}</strong> {r && r.min !== null && r.max !== null
          ? <>{T('details.phGrows', { min: num(r.min), max: num(r.max) })}{soil?.niche && <> {soil.niche}</>} · {T('details.bestPh')} {after}{soil?.near && <> <span class="ct-muted">{soil.near}</span></>}</>
          : T('details.notCheckedYet')}
          {desk && <> · <button type="button" class="ct-link-button" data-set-ph onClick={() => store.openFigure('soilPh')}>{T('details.setOwnPh')}</button></>}</li>
        <li data-niche-row="moisture"><strong>{T('details.nicheMoisture')}</strong> {after}</li>
        <li data-niche-row="root"><strong>{T('details.nicheRoot')}</strong> {after}</li>
        <li data-niche-row="flowers"><strong>{T('details.nicheFlowers')}</strong> {bloom ? monthsLong(bloom.months, lang(), T('t.allYear')) : T('details.flowersNone')}{bloom?.estimate && <> <span class="ct-est">{T('est.word')}</span></>}</li>
      </ul>
      {/* Months worked out by a rule (dated photos, a text): the row's one "estimate" tag, and its legend in words. */}
      {bloom?.estimate && <p class="ct-muted ct-small" data-est-legend>{capital(T('est.word'))}: {T('est.legend')}</p>}
    </div>
  );
}

// The desk layout (min-width 960px, the project's desktop breakpoint).
const DESK = '(min-width: 960px)';
function useDesk(): boolean {
  const [desk, setDesk] = useState(() => typeof matchMedia === 'function' && matchMedia(DESK).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia(DESK), on = () => setDesk(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return desk;
}

export function PlantDetails({ id, Frame }: { id: PlantId; Frame: Frame }) {
  const t = taxonOf(id);
  // The list the plant was placed from (a borrowed placement's curated list, a guest's list, else the
  // climate): only curated lists have reasons and climate months, so the sheet reads and names that list.
  const zone = t ? placementZone(t, store.climate.value) : null;
  const guest = t && guestOf(t), borrowed = t && borrowedFrom(t);
  const [facts, setFacts] = useState<PlantFacts | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // Try again: the details query asked once more
  const [labels, setLabels] = useState<Labels>({});
  // A plant with a draft (closed by Escape or the backdrop) opens with its form and text back.
  const [correcting, setCorrecting] = useState(() => drafts.has(id));
  const openButton = useRef<HTMLButtonElement>(null);
  const desk = useDesk();
  const reopened = useRef(false);
  const byReader = useRef(false); // opened with the button (focus the form), not brought back with a draft
  useEffect(() => { if (!correcting && reopened.current) openButton.current?.focus(); reopened.current = correcting; }, [correcting]);
  useEffect(() => {
    const src = store.source.value;
    setFacts(null);
    setFailed(false);
    if (attempt === 0) setCorrecting(drafts.has(id));
    byReader.current = false;
    if (!src || !zone) return;
    let live = true;
    src.details(id, zone, lang() as Locale).then((d) => { if (live) setFacts(d); })
      .catch((err: unknown) => { console.error(`Consortium details ${id}: ${(err as Error).message}`); if (live) setFailed(true); });
    labelsOf()?.then((l) => { if (live) setLabels(l); });
    return () => { live = false; };
  }, [id, zone, attempt]);
  // Not in the lists the page reads (removed while open, an id the release does not list, a guest
  // whose list failed): the frame with its title and Close, never a blank dialog (3.2).
  if (!t || !zone) {
    return (
      <Frame titleId="ct-d-title" class="ct-details">
        <div class="ct-d-name" data-gone>
          <h2 id="ct-d-title" tabIndex={-1} data-autofocus>{T('details.gone')}</h2>
          <p class="ct-muted">{T('details.goneBody')}</p>
        </div>
      </Frame>
    );
  }

  const member = store.members.value.includes(id);
  const flags = store.flagsOfPlant(t), scene = store.flagScene.value;
  const lines = flagLines(t, flags, scene, { low: true });
  const invasive = invasiveSoft(t, facts);
  const scoped = invasive.filter((x) => x.scope);
  // A conflict is about the other plant: its full words under With your other plants and warnings, its
  // few words in the summary's pill; the warnings list holds the plant's own.
  const conflicts = lines.filter((l) => l.kind === 'conflict' || l.kind === 'soft');
  const warnLines = lines.filter((l) => l.kind !== 'conflict' && l.kind !== 'soft' && l.kind !== 'invasive');
  const others = store.memberTaxa.value.filter((o) => o.id !== id);
  const pairs = pairings(t, others, store.flagContext.value.interactions);
  const conflictCount = conflicts.filter((l) => l.kind === 'conflict').length;
  const allelo = t.warnings.allelopathic;
  const notAllChecked = t.warnings.toxicity === null || t.warnings.allelopathic === null || (facts?.invasiveIn ?? t.warnings.invasive_in) === null;
  const jobs = jobsOf(t);
  // Its main job first in What it does, as the summary names it (fix round 1 BC14).
  const main = mainJobOf(t, jobs, member);
  const jobsMainFirst = main ? [main, ...jobs.filter((j) => j !== main)] : jobs;
  const placedIn = facts ? (Object.entries(facts.placements) as [ClimateZone, unknown][]).filter(([, p]) => p).map(([z]) => z) : [];
  const guides = guideLinks(t, main);
  const image = facts?.image ?? t.image;
  const photoHref = image ? safeHref(image.source_page_url) : null;
  const release = store.source.value?.info().releaseId ?? '';
  const s = spanOf(t), y = yearsOf(t);
  const names = (Object.entries(t.names) as [Locale, string][]).filter(([, n]) => n);
  // The list it is placed from, said once (C8): a guest's list, a borrowed placement's (one of the
  // nearest lists), else the list of the climate; Correction sends the same.
  const here = store.climate.value;
  const listLine = guest ? T('details.fromList', { climate: zoneName(guest) })
    : borrowed ? T('details.listNearest', { list: T(`list.${borrowed.toLowerCase()}`) })
    : T('details.onList', { climate: zoneName(zone) });
  const climateLabel = here && here !== zone ? T('details.climatePlaced', { climate: zoneName(here), list: zoneName(zone) }) : zoneName(zone);
  // A member's later periods (core keepLine, the period-edge chip, What you can do): the first later
  // period it needs a second look or is outside (laterLossOf), and the measure that limits it then.
  const [now = null, ...laters] = member ? store.periodVerdictsOf(t) : [];
  const loss = laterLossOf(laters);
  const lossFactor: Factor | null = (loss ?? now)?.limiting?.factor ?? null;
  const lossMeasure = lossFactor ? measureOf(lossFactor) : null;
  const keep = keepLine(now, laters, new Date().getFullYear());
  // What you can do (board DetailsDesk; fix round 1 BC4, C9): the two closest alternatives that hold by the
  // later period (the verdict rule's holdsBy, as Swap's hold filter), each in the board's words (core
  // candoLine: same years, what it does not do, what it adds, "holds in 2041–2070") in Swap's row frame
  // (kit/fit.tsx AltRow), and how far it is recorded on the measure that limits this member.
  const rule = store.verdictRule.value, ctx = store.verdictContext.value;
  const holdPeriod = periodIds[1];
  const alts = member && rule ? (store.alternativesFor(id)?.fit ?? []).filter((a) => { const x = taxonOf(a.id); return !!x && rule.holdsBy(x, ctx, holdPeriod); }).slice(0, 2) : [];
  const bandOf = (x: Taxon) => {
    const v: PlantVerdict | null = store.poolVerdicts.value?.get(x.id) ?? store.verdictOf(x);
    return v ? rowBandOf(v, store.laterVerdictOf(x, v), periodName, lossFactor) : null;
  };
  // What the summary's chips name: each warning in short words (K17), the toxicity not checked, the estimate.
  const chips = lines.filter((l) => l.kind !== 'soft');
  const missingNames = locales.length - names.length;
  const listSources = [...new Set((facts?.reasons ?? []).map((r) => longDates(sourceTitle(r.source, facts?.sources[r.source]?.label ?? r.source))))];
  const code = store.flagContext.value.country?.toUpperCase() ?? null;
  // "Tell us the name you use": the correction opened on this page language's name.
  const tellName = () => {
    if (!drafts.has(id)) drafts.set(id, { field: `names.${lang()}`, proposed: '', note: '', email: '', consent: false, website: '' });
    byReader.current = true;
    setCorrecting(true);
    requestAnimationFrame(() => document.getElementById('ct-corr-field')?.focus());
  };
  const add = () => store.addMembers([id], guest ? { [id]: guest } : {}, { warned: warns(flags) ? [id] : [], text: T('palette.added', { name: nameOf(t) }) });
  const findOne = () => openSheet('swap', id);
  const remove = () => { closeSheet(); removeMember(id); };
  const sizeText = sizeShort(t);
  const standsWords = y ? midSentence(say(yearsLine(y.from, y.to))) : null;
  const niche = <Niche t={t} facts={facts} zone={zone} desk={desk} />;
  const toxUnk = t.warnings.toxicity === null;
  const siteUnknown = unknownWords(t, scene.site);
  const spreads = t.warnings.weed_potential;

  return (
    <Frame titleId="ct-d-title" class="ct-details"
      foot={member
        // Phones: the member's two actions stay at hand; the desk has them in What you can do.
        ? <div class="ct-add-bar ct-d-foot ct-d-foot-member"><button type="button" class="button button-secondary" onClick={findOne}>{SEARCH}{T('details.findHolds')}</button><button type="button" class="ct-link-button" onClick={remove}>{T('details.remove')}</button></div>
        : <div class="ct-add-bar ct-d-foot"><button type="button" class="button button-primary" data-add onClick={add}>{PLUS}{T('details.addToPalette')}</button></div>}>
      <div class="ct-d-name">
        <h2 id="ct-d-title" tabIndex={-1} data-autofocus>{nameOf(t)}</h2>
        <p><i class="ct-sci">{t.canonical_name}</i> · <span data-from-list={guest ?? borrowed ?? zone}>{listLine}</span>{member && <span> · {T('details.inPalette')}</span>}</p>
      </div>
      <div class="ct-d-body">
        <figure class="ct-photo">
          {image
            ? <img src={image.url} alt={T('details.photoAlt', { name: nameOf(t) })} loading="lazy" decoding="async" width={480} height={160} />
            : <div class="ct-photo-none" role="img" aria-label={T('details.photoAlt', { name: nameOf(t) })}>{LEAF} {T('details.photoAlt', { name: nameOf(t) })}</div>}
          {image && (
            <figcaption>
              {T('details.photo', { credit: [image.credit, image.licence].filter(Boolean).join(' · ') })}
              {photoHref && <> · <a class="text-link" href={photoHref} rel="noopener">{T('details.photoSource')}</a></>}
            </figcaption>
          )}
        </figure>
        <section class="ct-d-summary" aria-label={T('jobsHeading')} data-summary>
          <SummaryLine t={t} jobs={jobs} member={member} />
          <p class="ct-d-sub">{member
            ? <>{t.stratum && <><span class="ct-d-light" aria-hidden="true" />{T('palette.plantedIn', { level: layerName(t.stratum.value) === T('stratum.none') ? T('palette.light_none') : T(`palette.light_${t.stratum.value}`) })} · </>}{sizeText}</>
            : <>{standsWords ? T('details.stands', { span: standsWords }) : T('timingUnknown')} · {sizeText}</>}</p>
          {!member && niche}
          <ul class="ct-marks">
            {/* A member near the edge of its range, or outside it, in a later period (board DetailsDesk; fix round 1 BC10). */}
            {loss && <li class="ct-flag" data-level="warning" data-chip="period-edge">{lossMeasure ? <MeasureGlyph m={lossMeasure} /> : WARN}{T(loss.level === 'outside' ? 'details.chipOutsideBy' : 'details.chipEdgeBy', { period: periodName(loss.judged) })}</li>}
            {chips.map((l) => <li class="ct-flag" data-level={l.level ?? 'warning'} data-chip={l.kind}>{WARN}{l.chip ?? l.text}</li>)}
            {toxUnk && <li class="ct-tag" data-conf="not-checked">{INFO}{T('details.toxUnkChip')}</li>}
            {(borrowed || guest) && <li class="ct-tag" data-conf="estimate" data-estimate-chip>{WAVE}{T('details.estimateChip', { list: T(`list.${(guest ?? borrowed)!.toLowerCase()}`) })}</li>}
          </ul>
          {/* What the site check could not decide (room, light, soil, water), said once and in both layouts (fix round 1 R5: never a silent fit). */}
          {siteUnknown.length > 0 && <ul class="ct-d-unknown" data-site-unknown>{siteUnknown.map((w) => <li class="ct-muted ct-small">{INFO} {w}</li>)}</ul>}
        </section>
        <Against t={t} disputes={facts?.disputes ?? []} traitSources={facts?.traitSources ?? null} subject={member ? nameOf(t) : null} gbifRecords={facts?.gbifRecords ?? null} />
        {/* The desk says the soil on the Niche row (board DetailsDesk; R3: one judgement, soilSayOf). */}
        {!desk && <SoilCard t={t} traitSources={facts?.traitSources ?? null} />}
        {member && (
          <section class="ct-d-cando" aria-labelledby="ct-d-cando" data-cando>
            <h3 id="ct-d-cando">{T('details.canDo')}</h3>
            {alts.length > 0 && (
              <ul class="ct-rows">
                {alts.map((a) => {
                  const x = taxonOf(a.id);
                  if (!x) return null;
                  const warn = flagLines(x, a.flags, scene);
                  const band = bandOf(x);
                  // Board DetailsDesk: "Feeds you in the same years, brings no helpers; holds in 2041–2070" (core candoLine).
                  const does = capital(say(candoLine(jobs, y, jobsOf(x), yearsOf(x), periodName(holdPeriod))));
                  return (
                    <AltRow key={a.id} t={x} name={nameOf(x)} flagged={a.flags.length > 0} does={<span class="ct-d-cando-does">{CHECK} {does}</span>}
                      actions={<button type="button" class="button button-secondary" aria-label={T('swap.for', { name: nameOf(x) })} onClick={() => { closeSheet(); store.swapMember(id, x.id); }}>{SWAP}{T('details.swap')}</button>}>
                      <span class="ct-line">{band ? <RowBandLine b={band} /> : <FitLine v={store.poolVerdicts.value?.get(x.id) ?? null} />}</span>
                      {warn.length > 0 && <span class="ct-line ct-flag-line" data-swap-warn>{WARN} {warn.map((l) => l.text).join(' · ')}</span>}
                    </AltRow>
                  );
                })}
              </ul>
            )}
            <div class="ct-actions ct-d-cando-actions">
              <button type="button" class="button button-secondary" onClick={findOne}>{SEARCH}{T('details.findHolds')}</button>
              <button type="button" class="ct-link-button" onClick={remove}>{T('details.remove')}</button>
            </div>
            {keep && <p class="ct-muted ct-small" data-keep>{say(keep)}</p>}
          </section>
        )}
        {member && niche}
        <div class="ct-d-more">
          {/* A failed details query is said above the closed sections, where it is seen, with Try again (3.3). */}
          {failed && (
            <div data-details-failed>
              <p>{T('details.failed')}</p>
              <p><button type="button" class="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>{T('details.tryAgain')}</button></p>
            </div>
          )}
          <More k="jobs" title={T('details.secJobs')} hint={jobs.length ? P('details.secJobsCount', jobs.length) : undefined}>
            {jobs.length
              ? <ul class="ct-d-jobtiles">{jobsMainFirst.map((j) => <li data-job-tile={j}><JobTile job={j} /><div><strong>{T(`job.${j}`)}{j === main && jobs.length > 1 && <span> · {T('details.mainHere')}</span>}</strong><p>{T(`details.jobDesc.${j}`)}</p></div></li>)}</ul>
              : <p class="ct-muted">{T('d.jobsUnk')}</p>}
            {/* Board DetailsMore: its syntropic role (a crop when it feeds you, else a support plant), stratum and stages, and what the words mean. */}
            {t.stratum && s && <Syntropic role={T(jobs.includes('feeds_you') ? 'details.syntropicCrop' : 'details.syntropicSupport')} text={(role) => T('details.syntropic', { role, stratum: midSentence(layerOf(t)), from: phaseTerm(s.from), to: phaseTerm(s.to) })} />}
            <h4>{T('details.timeSize')}</h4>
            <dl class="ct-traits" aria-label={T('traits')}>
              <Row k={T('details.plantedInLabel')}>{t.stratum ? T(`palette.light_${t.stratum.value}`) : T('palette.light_none')}</Row>
              <Row k={T('details.whenStands')}>{y ? T('details.standsNote', { span: say(whenLine(y.from, y.to)).replace(/^./, (c) => c.toLocaleUpperCase(lang())) }) : T('timingUnknown')}</Row>
              <Row k={T('details.sizeLabel')}>{T('details.sizeFull', { size: sizeText })}</Row>
              <Row k={T('details.life')}>{labelOf(labels, 'lifespan', t.traits.lifespan)}</Row>
              <Row k={T('details.leaves')}>{labelOf(labels, 'deciduous_evergreen', t.traits.deciduous_evergreen)}</Row>
              {/* The soil card's words (core drainageLine: the release's well_drained, or the hint the grower's wet ground raises). */}
              <Row k={T('details.drainage')}>{say(drainageLine(t, store.verdictOf(t)))}</Row>
              <Row k={T('details.wind')}>{(() => { const w = (facts?.layerValues ?? []).find((x) => x.field === 'tolerates_wind'); return w ? T(w.flag ? 'details.windYes' : 'details.windNo') : T('details.notRecorded'); })()}</Row>
              <Row k={T('details.rootPartners')}>{labelOf(labels, 'mycorrhizal_type', t.traits.mycorrhizal_type)}</Row>
            </dl>
          </More>
          {/* The desk leaves this section out (board DetailsDesk; fix round 1 BC12): the summary's chips carry the conflict and the toxicity there. */}
          {!desk && (
            <More k="pairs" title={T('details.secOthersWarn')} hint={[conflictCount ? P('details.conflictCount', conflictCount) : T('details.noConflict'), ...(notAllChecked ? [T('details.notAllChecked')] : [])].join(' · ')}>
              {conflicts.length > 0 && <ul class="ct-warnlist">{conflicts.map((l) => <li class={l.kind === 'soft' ? 'soft' : ''} data-conflict>{l.text}</li>)}</ul>}
              {!conflicts.length && !pairs.length && <p class="ct-d-ok">{CHECK} {P('details.noConflictWith', others.length)}</p>}
              {pairs.length > 0 && <ul class="ct-oklist">{pairs.map((p) => <li>{T('details.pairing', { other: nameOf(p.other) })}</li>)}</ul>}
              {conflicts.length > 0 && !pairs.length && <p class="ct-muted">{T('details.noPairing')}</p>}
              <p class={allelo === true ? '' : 'ct-muted'} data-allelo>{allelo === true ? WARN : INFO} {T(allelo === true ? 'd.allelo' : allelo === false ? 'd.alleloNone' : 'd.alleloUnk')}</p>
              <h4>{T('details.secWarnings')}{notAllChecked && <span class="ct-muted"> {T('details.notAllChecked')}</span>}</h4>
              <dl class="ct-traits" data-warnings>
                <Row k={T('details.toxicity')} hook="toxicity">{toxUnk ? T('d.toxUnk') : warnLines.filter((l) => l.kind === 'toxicity').map((l) => l.text).join(' ') || T('details.toxNone')}</Row>
                <Row k={T('details.invasive')} hook="invasive">{invasive.map((x) => <span class="ct-line" data-invasive-scope={x.scope}>{x.text}</span>)}</Row>
                <Row k={T('details.spreads')} hook="spreads">{spreads === true ? T('d.spreads') : T('details.notRecorded')}</Row>
                {warnLines.filter((l) => l.kind !== 'toxicity').map((l) => <Row k={T('details.secWarnings')} hook={l.kind}><span data-level={l.level}>{l.text}</span></Row>)}
              </dl>
              <p class="ct-muted ct-small">{T('d.liab')}</p>
            </More>
          )}
          <More k="names" title={T('details.secNamesWhy')} hint={names.length ? P('details.secNamesCount', names.length) : undefined}>
            <dl class="ct-traits">
              {names.map(([l, n]) => <><dt lang={l}>{ownName(l)}</dt><dd lang={l}>{n}</dd></>)}
              <dt>{T('details.scientific')}</dt><dd><i class="ct-sci">{t.canonical_name}</i></dd>
            </dl>
            {release && missingNames > 0 && <p class="ct-muted ct-small" data-names-missing>{P('details.namesMissing', missingNames)} <button type="button" class="ct-link-button" data-tell-name onClick={tellName}>{T('details.tellName')}</button></p>}
            <h4>{T('why')}</h4>
            {!facts ? <p class="ct-muted" aria-busy="true">{T('details.loading')}</p>
              : facts.reasons.length ? (
                <ul class="ct-reasons">
                  {facts.reasons.map((r) => (
                    <li>
                      <p>“<DataText text={r.text} />”</p>
                      <p class="ct-muted ct-small">{T('details.reasonFrom', { region: T(`region.${r.region}`) })} <SourceItem id={r.source} facts={facts} />.</p>
                    </li>
                  ))}
                </ul>
              ) : <p class="ct-muted">{T('noSource')}</p>}
            {/* Board DetailsMore: a borrowed placement is an estimate here, kept because its range includes the place. */}
            {borrowed && <p class="ct-small" data-why-borrowed={siteIdOf(borrowed)}>{T('details.whyEstimate', { list: zoneName(borrowed) })}</p>}
            {!borrowed && t.origin && <p class="ct-muted ct-small">{T('details.fromListNote')}</p>}
            <div data-sure>
              <h4>{T('details.secSources')}</h4>
              {failed
                ? <p class="ct-muted">{T('details.failed')}</p>
                : !facts ? <p class="ct-muted" aria-busy="true">{T('details.loading')}</p>
                : <SureTable rows={sureRows(t, {
                    list: zoneName(zone), estimate: !!(borrowed || guest), listSources, disputes: facts.disputes ?? [], release, gbifRecords: facts.gbifRecords,
                    traitSources: facts.traitSources, audiences: facts.audiences, frost: facts.frost,
                    invasive: code && scoped.length ? { country: code, sources: [...new Set(scoped.map((x) => x.scope!))] } : null,
                  })} />}
              <p class="ct-small" data-sure-legend><strong>{T('details.sureLegendHead')}</strong> {T('details.sureLegend')}</p>
            </div>
          </More>
          {/* Board DetailsMore: the lists it is on, under the sections; then the correction and the guides. */}
          {placedIn.length > 0 && (
            <p class="ct-small" data-other-climates>{INFO} <strong>{T('details.otherClimates')}:</strong> {placedIn.length === 1 ? T('details.otherOnly', { list: zoneName(placedIn[0]) }) : T('details.otherLists', { lists: listOf(placedIn.map(zoneName)) })} {T('details.otherNoList')}</p>
          )}
          <div class="ct-d-endlinks">
            {release && !correcting && <button type="button" class="button button-secondary" ref={openButton} aria-expanded="false" onClick={() => { byReader.current = true; setCorrecting(true); }}>{T('correction.open')}</button>}
            {guides.map((g) => <a class="text-link" href={g.url} hreflang={g.hreflang ?? undefined} lang={g.titleLang ?? undefined}>{g.title}</a>)}
          </div>
          {release && correcting && (
            <section class="ct-correct" aria-labelledby="ct-corr-title">
              <h3 id="ct-corr-title">{T('correction.title')}</h3>
              <correction.View drafts={drafts} fields={correctionFields(t, labels)} plantId={id} plantName={t.canonical_name} plantLabel={nameOf(t)} release={release} climate={zone} climateLabel={climateLabel} onCancel={() => setCorrecting(false)} focusFirst={byReader.current} />
            </section>
          )}
        </div>
      </div>
    </Frame>
  );
}
