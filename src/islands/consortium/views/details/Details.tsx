/** @jsxImportSource preact */
// The plant dialog (stream S3), loaded on first use: views/Sheets.tsx, the first-run router, opens it
// in the sheet frame it passes (`Frame`) and shows the plant's name and a loading line until this
// chunk is here (E6 design check A6, L2). The dialog's correction form (views/Correction.tsx) is its
// own chunk, loaded when the form first opens. What the sheets share (the stage bar, the warnings in
// words, the shared words) is in views/kit/; layers.ts and src/data/consortium-guides.ts are read only
// here, so they come with this chunk.
//
// Owner rows (knowledge/decisions/consortium-user-decisions.md): warn rather than remove dangerous
// information; "not checked in {country}" is said once per view and in details, never as a chip; a
// guest added from another climate's list is labelled "From the {climate} list"; pairings are
// yield-gain field trials only (no companion folklore).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { closeSheet, openSheet, removeMember, taxonOf } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Details as PlantFacts, Labels, Locale, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { TODAY_PERIOD, borrowedFrom, borrowedLine, datasetLines, factAt, factLines, shippedOf, frostLine, guestOf, invasiveLines, jobsOf, pairings, phaseOrd, placementZone, rangeSourceNames, restLine, siteIdOf, spanOf, sureLines, warns } from '../../../../lib/consortium/index.ts';
import type { Line } from '../../../../lib/consortium/index.ts';
import { layerRows, type Words } from '../layers.ts';
import { safeHref } from '../../../../lib/safe-href.js';
import { consortiumGuides } from '../../../../data/consortium-guides.ts';
import { Against } from './Against.tsx';
import { FitLine, JobIcon, say } from '../kit/fit.tsx';
import { doesWords, sizeWords } from '../StageBar.tsx';
import { Bar, shared, type Frame } from '../kit/sheet.tsx';
import { countryName, layerName, listOf, nameOf, num, phasePlain, spanWords, zoneName } from '../kit/names.ts';
import { WARN } from '../kit/icons.tsx';
import { drafts, type CorrectionField } from '../kit/correction.ts';
import { pageData } from '../kit/page.ts';
import { later } from '../lazy.tsx';
import { retryableImport } from '../../../../lib/consortium/index.ts';
const { flagLines, unknownWords } = shared; // first-run modules (kit/sheet.tsx shared)

// The correction form, a sheet part: a chunk that does not come closes the dialog with the toast.
const correction = later(retryableImport(() => import('../Correction.tsx'), (m) => m.default), { onFail: 'closeSheet' });

// ---- words ----

const lang = () => pageLang();
// A language's own name ("Español", "中文"), for the names section.
const ownName = (code: string) => { try { return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code; } catch { return code; } };
// A layer's name for a plant ("No layer yet" without one).
const layerOf = (t: Taxon): string => (t.stratum ? layerName(t.stratum.value) : T('stratum.none'));
const words = (): Words => ({ lang: lang(), T, climate: (z) => zoneName(z as ClimateZone), country: countryName, region: (r) => T(`region.${r}`), num });
// A text from the data in the page language, else in English (marked).
function DataText({ text }: { text: { en: string } & Partial<Record<string, string>> }) {
  const own = text[lang()];
  return own ? <>{own}</> : <span lang="en">{text.en}</span>;
}

// ---- the plant dialog ----

let labelsFor: { lang: string; labels: Promise<Labels> } | null = null;
function labelsOf(): Promise<Labels> | null {
  const src = store.source.value;
  if (!src) return null;
  if (labelsFor?.lang !== lang()) labelsFor = { lang: lang(), labels: src.labels(lang() as Locale).catch(() => ({})) };
  return labelsFor.labels;
}

interface Trait { field: string; label: string; text: string; raw: unknown }

function traitsOf(t: Taxon, labels: Labels): Trait[] {
  const tr = t.traits, unknown = T('unknown');
  // Water need is a site- and period-dependent fact (ADR-6): read through factAt, today's value.
  const water = factAt('water_need', t, store.location.value?.lookup ?? null, TODAY_PERIOD);
  const drought = water?.drought ?? null, moisture = water?.moisture ?? null;
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
    { field: 'drought_tolerance', label: T('t.drought'), text: label('drought_tolerance', drought), raw: drought },
    { field: 'moisture_use', label: T('t.moisture'), text: label('moisture_use', moisture), raw: moisture },
    { field: 'habit', label: T('t.habit'), text: label('habit', tr.habit), raw: tr.habit },
    { field: 'deciduous_evergreen', label: T('t.leaf'), text: label('deciduous_evergreen', tr.deciduous_evergreen), raw: tr.deciduous_evergreen },
    { field: 'hardiness_zone', label: T('details.hardiness'), text: zone, raw: tr.hardiness_zone },
  ];
}

// The invasive lines of the dialog (schema 4.3, core invasiveLines): in the reader's country one line
// per source with the areas it names (an atlas names, a regulation lists, GRIIS records), or "not
// checked" / "not recorded" there (invasive_checked: a source assessed invasiveness there), said once,
// here; then where else it is recorded. Each carries its source (data-invasive-scope).
interface Soft { text: string; scope?: string }
function invasiveSoft(t: Taxon, facts: PlantFacts | null): Soft[] {
  const list = facts?.invasiveIn ?? t.warnings.invasive_in;
  const { country, countryStatus } = store.flagContext.value;
  const code = country?.toUpperCase() ?? null;
  const here: Soft[] = invasiveLines({ invasiveIn: list, invasiveAreas: facts?.invasiveAreas ?? null }, { country: code, checked: countryStatus === 'checked' })
    .map((l) => ({ text: say(l), scope: typeof l.vars.sourceId === 'string' ? l.vars.sourceId : undefined }));
  if (list === null) return here.length ? here : [{ text: T('d.invUnk') }];
  const elsewhere = [...new Set(list.filter((r) => r.country !== code).map((r) => r.country))];
  if (elsewhere.length) here.push({ text: P('details.invElse', elsewhere.length, { list: listOf(elsewhere.slice(0, 8).map(countryName)) + (elsewhere.length > 8 ? '…' : '') }) });
  else if (!list.length && !code) here.push({ text: T('d.invNone') });
  return here;
}

// One fact line with the hook of what it is about: a dispute's field, an audience, a corrected trait.
function FactItem({ l }: { l: Line }) {
  const k = l.key, about = typeof l.vars.field === 'string' ? l.vars.field : undefined;
  return (
    <li data-dispute={k.includes('.dispute') ? about : undefined} data-audience={typeof l.vars.who === 'string' ? l.vars.who : undefined} data-trait-source={k.includes('.source') ? about : undefined}>
      {say(l)}
    </li>
  );
}

// Guide titles in the guide's language (en or fr), from #ct-data `guideTitles` (slug → title), which
// ConsortiumPage.astro writes; the title carries the guide's language. A slug the page did not pass
// (none should: check-built-site) shows as words, marked English.
function guideTitleOf(slug: string): { title: string; lang: string | null } {
  const own = pageData()?.guideTitles?.[slug];
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
  // The invasive status said once (C9): the per-source lines when the country has them, else the flag's.
  const warnLines = lines.filter((l) => l.kind !== 'invasive' || !scoped.length);
  const unknownSoft = [
    ...unknownWords(t, scene.site),
    ...invasive.filter((x) => !x.scope).map((x) => x.text),
    ...(t.warnings.toxicity === null ? [T('d.toxUnk')] : []), // a recorded level is a flag line (kit/flags.ts), Slight too
  ];
  const soft = [
    ...unknownSoft,
    T(t.warnings.allelopathic === true ? 'd.allelo' : t.warnings.allelopathic === false ? 'd.alleloNone' : 'd.alleloUnk'),
    ...(t.warnings.weed_potential === true ? [T('d.spreads')] : []),
  ];
  const notAllChecked = t.warnings.toxicity === null || t.warnings.allelopathic === null || (facts?.invasiveIn ?? t.warnings.invasive_in) === null;
  const hard = warnLines.filter((l) => l.kind !== 'soft');
  const others = store.memberTaxa.value.filter((o) => o.id !== id);
  const pairs = pairings(t, others, store.flagContext.value.interactions);
  const conflictCount = warnLines.filter((l) => l.kind === 'conflict').length;
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
  const names = (Object.entries(t.names) as [Locale, string][]).filter(([, n]) => n);
  // The list it is placed from, said once (C8): a guest's list, a borrowed placement's estimate, else
  // the list of the climate; Correction sends the same ("Subtropical, placed as on the Tropical list").
  const here = store.climate.value;
  const listLine = guest ? T('details.fromList', { climate: zoneName(guest) }) : borrowed ? say(borrowedLine(borrowed)) : T('details.onList', { climate: zoneName(zone) });
  const climateLabel = here && here !== zone ? T('details.climatePlaced', { climate: zoneName(here), list: zoneName(zone) }) : zoneName(zone);
  const alts = member ? store.alternativesFor(id)?.fit.slice(0, 2) ?? [] : [];
  const add = () => store.addMembers([id], guest ? { [id]: guest } : {}, { warned: warns(flags) ? [id] : [], text: T('palette.added', { name: nameOf(t) }) });
  const fields: CorrectionField[] = [
    ...traits.map((x) => ({ field: x.field, label: x.label, current: x.text === T('unknown') ? '' : x.text, raw: x.raw })),
    { field: 'stratum', label: T('correction.fieldLayer'), current: t.stratum ? layerOf(t) : '', raw: t.stratum?.value ?? null },
    { field: 'phases', label: T('correction.fieldTiming'), current: t.phases ? spanWords(t) : '', raw: t.phases ? { start: t.phases.start, end: t.phases.end } : null },
    { field: `names.${lang()}`, label: T('correction.fieldName'), current: t.names[lang() as Locale] ?? '', raw: t.names[lang() as Locale] ?? null },
  ];
  // A closed section says what it holds (B8, board DetailsMore); Against stays open, outside them.
  const More = ({ k, title, hint, children }: { k: string; title: string; hint?: string; children: ComponentChildren }) => (
    <details class="ct-more" data-more={k}>
      <summary><h3 id={`ct-d-${k}`}>{title}{hint && <span class="ct-muted"> {hint}</span>}</h3></summary>
      <section aria-labelledby={`ct-d-${k}`}>{children}</section>
    </details>
  );

  return (
    <Frame titleId="ct-d-title" class="ct-details" head={<span class="ct-muted">{layerOf(t)}{s ? ` · ${phasePlain(s.from)}` : ''}</span>}
      foot={member ? undefined : <div class="ct-add-bar ct-d-foot"><button type="button" class="button button-primary" data-add onClick={add}>{T('details.addToPalette')}</button></div>}>
      <div class="ct-d-name">
        <h2 id="ct-d-title" tabIndex={-1} data-autofocus>{nameOf(t)}</h2>
        <p><i class="ct-sci">{t.canonical_name}</i> · <span data-from-list={guest ?? borrowed ?? zone} data-conf={borrowed ? 'estimate' : undefined}>{listLine}</span>{member && <span class="ct-muted"> · {T('details.inPalette')}</span>}</p>
      </div>
      <div class="ct-d-body">
        <div class="ct-d-left">
          {image && (
            <figure class="ct-photo">
              <img src={image.url} alt={T('details.photoAlt', { name: nameOf(t) })} loading="lazy" decoding="async" width={480} height={160} />
              <figcaption>
                {T('details.photo', { credit: [image.credit, image.licence].filter(Boolean).join(' · ') })}
                {photoHref && <> · <a class="text-link" href={photoHref} rel="noopener">{T('details.photoSource')}</a></>}
              </figcaption>
            </figure>
          )}
          <section class="ct-d-summary" aria-label={T('jobsHeading')} data-summary>
            {jobs.length ? <ul class="ct-d-jobs">{jobs.map((j) => <li><JobIcon job={j} /> {T(`job.${j}`)}</li>)}</ul> : <p class="ct-muted">{T('d.jobsUnk')}</p>}
            <p>{spanWords(t)} · {sizeWords(t)}</p>
            <p class="ct-marks">
              {t.warnings.toxicity && t.warnings.toxicity.level !== 'None' && <span class="ct-flag" data-tox={t.warnings.toxicity.level}>{WARN}{T(`tox.${t.warnings.toxicity.level}`)}</span>}
              {t.warnings.toxicity === null && <span class="ct-tag" data-conf="not-checked">{T('details.toxUnkChip')}</span>}
              {hard.length > 0 && <span class="ct-flag">{WARN}{P('details.warnCount', hard.length)}</span>}
            </p>
          </section>
          {member && (
            <section class="ct-d-cando" aria-labelledby="ct-d-cando" data-cando>
              <h3 id="ct-d-cando">{T('details.canDo')}</h3>
              {alts.length > 0 && (
                <ul class="ct-rows">
                  {alts.map((a) => {
                    const x = taxonOf(a.id);
                    return x && (
                      <li data-swap-row>
                        <div class="ct-row-main"><strong>{nameOf(x)}</strong> <i class="ct-sci">{x.canonical_name}</i></div>
                        <button type="button" class="button button-secondary" aria-label={T('swap.for', { name: nameOf(x) })} onClick={() => { closeSheet(); store.swapMember(id, x.id); }}>{T('details.swap')}</button>
                        <div class="ct-row-why"><span>{doesWords(jobs, a.sharedJobs)}</span> <span class="ct-line"><FitLine v={store.poolVerdicts.value?.get(x.id) ?? null} /></span></div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div class="ct-actions">
                <button type="button" class="button button-secondary" onClick={() => openSheet('swap', id)}>{T('details.findHolds')}</button>
                <button type="button" class="ct-link-button" onClick={() => { closeSheet(); removeMember(id); }}>{T('details.remove')}</button>
              </div>
            </section>
          )}
        </div>
        <div class="ct-d-right">
          <Against t={t} disputes={facts?.disputes ?? []} />
        </div>
        <div class="ct-d-more">
          {/* A failed details query is said above the closed sections, where it is seen, with Try again (3.3). */}
          {failed && (
            <div data-details-failed>
              <p>{T('details.failed')}</p>
              <p><button type="button" class="button button-secondary" onClick={() => setAttempt((n) => n + 1)}>{T('details.tryAgain')}</button></p>
            </div>
          )}
          <More k="jobs" title={T('details.secJobs')} hint={jobs.length ? P('details.secJobsCount', jobs.length) : undefined}>
            {jobs.length ? <ul class="ct-chips">{jobs.map((j) => <li>{T(`job.${j}`)}</li>)}</ul> : <p class="ct-muted">{T('d.jobsUnk')}</p>}
          </More>
          <More k="light" title={T('details.secLight')}>
            <p class="ct-muted" id="ct-d-place">{T('details.placedFor', { climate: zoneName(zone) })}</p>
            <p><strong>{layerOf(t)}</strong>{t.stratum && <> · {T(`stratum.${t.stratum.value}.needs`)}</>}</p>
            <Bar taxon={t} />
            <p>{spanWords(t)}</p>
            <h4>{T('traits')}</h4>
            <dl class="ct-traits">{traits.map((x) => <><dt>{x.label}</dt><dd>{x.text}</dd></>)}</dl>
            {rows.length > 0 && (
              <>
                <h4>{T('details.layerValues')}</h4>
                <dl class="ct-traits">
                  {rows.map((r) => (
                    <>
                      <dt>{r.label}</dt>
                      <dd>{r.values.map((v) => <div>{v.text} <span class="ct-muted ct-small">· {v.where}</span>{v.estimate && <span class="ct-est">{T('est.word')}</span>}</div>)}</dd>
                    </>
                  ))}
                </dl>
                {rows.some((r) => r.values.some((v) => v.estimate)) && <p class="ct-muted ct-small"><span class="ct-est">{T('est.word')}</span> {T('est.legend')}</p>}
              </>
            )}
            {elsewhere.length > 0 && (
              <>
                <h4>{T('details.otherClimates')}</h4>
                <ul class="ct-plain">
                  {elsewhere.map(([z, p]) => (
                    <li>{T('details.otherPlacement', {
                      climate: zoneName(z as ClimateZone),
                      layer: p!.stratum ? T(`stratum.${p!.stratum}`) : T('stratum.none'),
                      span: p!.start && p!.end ? (p!.start === p!.end ? phasePlain(phaseOrd(p!.start)) : `${phasePlain(phaseOrd(p!.start))} → ${phasePlain(phaseOrd(p!.end))}`) : T('timingUnknown'),
                    })}</li>
                  ))}
                </ul>
              </>
            )}
          </More>
          <More k="pairs" title={T('details.secOthers')} hint={conflictCount ? P('details.conflictCount', conflictCount) : T('details.noConflict')}>
            {pairs.length
              ? <ul class="ct-oklist">{pairs.map((p) => <li>{T('details.pairing', { other: nameOf(p.other) })}</li>)}</ul>
              : <p class="ct-muted">{T('details.noPairing')}</p>}
          </More>
          <More k="warn" title={T('details.secWarnings')} hint={notAllChecked ? T('details.notAllChecked') : hard.length ? P('details.warnCount', hard.length) : undefined}>
            <ul class="ct-warnlist">
              {warnLines.map((l) => <li class={l.kind === 'soft' ? 'soft' : ''} data-level={l.level}>{l.text}</li>)}
              {scoped.map((x) => <li class="soft" data-invasive-scope={x.scope}>{x.text}</li>)}
              {soft.map((x) => <li class="soft">{x}</li>)}
            </ul>
            <p class="ct-muted ct-small">{T('d.liab')}</p>
          </More>
          {names.length > 0 && (
            <More k="names" title={T('details.secNames')} hint={P('details.secNamesCount', names.length)}>
              <dl class="ct-traits">
                {names.map(([l, n]) => <><dt lang={l}>{ownName(l)}</dt><dd lang={l}>{n}</dd></>)}
                <dt>{T('details.scientific')}</dt><dd><i class="ct-sci">{t.canonical_name}</i></dd>
              </dl>
            </More>
          )}
          <More k="why" title={T('why')}>
            {borrowed && <p class="ct-muted" data-why-borrowed={siteIdOf(borrowed)}>{T(`estimate.from${borrowed}`)}</p>}
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
            {t.origin && <p class="ct-muted">{T('details.fromListNote')}</p>}
            {guides.length > 0 && (
              <>
                <h4>{T('details.guides')}</h4>
                <ul class="ct-plain">{guides.map((g) => <li><a class="text-link" href={g.url} hreflang={g.hreflang ?? undefined} lang={g.titleLang ?? undefined}>{g.title}</a></li>)}</ul>
              </>
            )}
          </More>
          <More k="sure" title={T('details.secSources')}>
            <div data-sure>
              <h4>{T('details.sure')}</h4>
              {failed
                ? <p class="ct-muted">{T('details.failed')}</p>
                : !facts ? <p class="ct-muted" aria-busy="true">{T('details.loading')}</p>
                : <ul class="ct-plain ct-facts">
                    {sureLines(t, { list: zoneName(zone), estimate: !!borrowed, disputeShown: (facts.disputes ?? []).some((d) => d.field === 'tmin_cold.low' || d.field === 'tmean_year.low'), release }).map((l) => <li data-sure-fact>{say(l)}</li>)}
                    {factLines({ disputes: facts.disputes, audiences: facts.audiences, traitSources: facts.traitSources, shipped: shippedOf(t) }).map((l) => <FactItem l={l} />)}
                    {[frostLine(facts.frost, facts.frost !== null), restLine(facts.frost)].filter((l): l is Line => !!l).map((l) => <li data-frost>{say(l)}</li>)}
                    {datasetLines(store.source.value?.info() ?? { rangesReview: null }).map((l) => <li class="ct-muted">{say(l)}</li>)}
                  </ul>}
            </div>
            <h4>{T('sources')}</h4>
            {(() => {
              const own = facts ? Object.keys(facts.sources) : [];
              const labels = new Set(own.map(sourceLabel));
              const range = rangeSourceNames(t).filter((n) => !labels.has(n));
              return own.length || range.length
                ? <ul class="ct-sources">{own.map((sid) => <li><SourceItem id={sid} facts={facts} /></li>)}{range.map((n) => <li data-range-source>{n}</li>)}</ul>
                : <p class="ct-muted">{facts ? T('noSource') : T('details.loading')}</p>;
            })()}
          </More>
          {release && (
            <section class="ct-correct" aria-labelledby="ct-corr-title">
              <h3 id="ct-corr-title">{T('correction.title')}</h3>
              {correcting
                ? <correction.View drafts={drafts} fields={fields} plantId={id} plantName={t.canonical_name} plantLabel={nameOf(t)} release={release} climate={zone} climateLabel={climateLabel} onCancel={() => setCorrecting(false)} focusFirst={byReader.current} />
                : <>
                    <p class="ct-muted">{T('correction.lede')}</p>
                    <p><button type="button" class="button button-secondary" ref={openButton} aria-expanded="false" onClick={() => { byReader.current = true; setCorrecting(true); }}>{T('correction.open')}</button></p>
                  </>}
            </section>
          )}
        </div>
      </div>
    </Frame>
  );
}
