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
import { useEffect, useRef, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { closeSheet, openSheet, removeMember, taxonOf, toggleKeep } from '../../store.ts';
import { P, T, pageLang } from '../../strings.ts';
import type { ClimateZone, Details as PlantFacts, Labels, Locale, PlantId, Taxon } from '../../../../lib/consortium/index.ts';
import { jobsOf, pairings, phaseOrd, placementZone } from '../../../../lib/consortium/index.ts';
import { layerRows, type Words } from '../layers.ts';
import { spanOf } from '../kit/span.ts';
import { safeHref } from '../../../../lib/safe-href.js';
import { consortiumGuides } from '../../../../data/consortium-guides.ts';
import { PlantMarks } from '../PlantMarks.tsx';
import { Bar, shared, type Frame } from '../kit/sheet.tsx';
import { countryName, layerName, listOf, nameOf, num, phasePlain, spanWords, zoneName } from '../kit/names.ts';
import { PIN, SPROUT, WARN } from '../kit/icons.tsx';
import { drafts, type CorrectionField } from '../kit/correction.ts';
import { pageData } from '../kit/page.ts';
import { later, retryable } from '../lazy.tsx';
const { flagLines, unknownWords } = shared; // first-run modules (kit/sheet.tsx shared)

// The correction form, a sheet part: a chunk that does not come closes the dialog with the toast.
const correction = later(retryable(() => import('../Correction.tsx'), (m) => m.default), { onFail: 'closeSheet' });

// ---- words ----

const lang = () => pageLang();
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
  const flags = store.flagsOfPlant(t), scene = store.flagScene.value;
  const lines = flagLines(t, flags, scene, { low: true });
  const soft = [
    ...unknownWords(t, scene.site),
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
    { field: 'stratum', label: T('correction.fieldLayer'), current: t.stratum ? layerOf(t) : '', raw: t.stratum?.value ?? null },
    { field: 'phases', label: T('correction.fieldTiming'), current: t.phases ? spanWords(t) : '', raw: t.phases ? { start: t.phases.start, end: t.phases.end } : null },
    { field: `names.${lang()}`, label: T('correction.fieldName'), current: t.names[lang() as Locale] ?? '', raw: t.names[lang() as Locale] ?? null },
  ];

  return (
    <Frame titleId="ct-d-title" class="ct-details" head={<span class="ct-muted">{layerOf(t)}{s ? ` · ${phasePlain(s.from)}` : ''}</span>}>
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
          <PlantMarks taxon={t} surface="details" />
        </p>
      </div>

      <section class="ct-place" aria-labelledby="ct-d-place">
        <h3 id="ct-d-place">{T('details.placedFor', { climate: zoneName(zone) })}</h3>
        <p><strong>{layerOf(t)}</strong>{t.stratum && <> · {T(`stratum.${t.stratum.value}.needs`)}</>}</p>
        <Bar taxon={t} />
        <p>{spanWords(t)}</p>
        {(t.from || t.placedFrom) && <p class="ct-muted">{T('details.fromListNote')}</p>}
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
        {t.placedFrom && <p class="ct-muted" data-why-borrowed={t.placedFrom.toLowerCase()}>{T(`estimate.from${t.placedFrom}`)}</p>}
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
                span: p!.start && p!.end ? (p!.start === p!.end ? phasePlain(phaseOrd(p!.start)) : `${phasePlain(phaseOrd(p!.start))} → ${phasePlain(phaseOrd(p!.end))}`) : T('timingUnknown'),
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
            ? <correction.View drafts={drafts} fields={fields} plantId={id} plantName={t.canonical_name} plantLabel={nameOf(t)} release={release} climate={zone} climateLabel={zoneName(zone)} onCancel={() => setCorrecting(false)} focusFirst={byReader.current} />
            : <>
                <p class="ct-muted">{T('correction.lede')}</p>
                <p><button type="button" class="button button-secondary" ref={openButton} aria-expanded="false" onClick={() => { byReader.current = true; setCorrecting(true); }}>{T('correction.open')}</button></p>
              </>}
        </section>
      )}
      <p class="ct-muted ct-small">{T('release', { id: release })}</p>
    </Frame>
  );
}
