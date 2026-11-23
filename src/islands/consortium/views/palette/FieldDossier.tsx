/** @jsxImportSource preact */
// 1-Click Plant Field Dossier Slide-Over Drawer (Stage 1B — direct 1:1 port of v14 mockup-06-dossier.png):
// - Top nav: <- Prev | 1/N | Next -> and x Close
// - Sun emblem + serif title + Latin + sun pill
// - Full-width In your palette · Remove / + Add to palette bar
// - SECTION 1 · LIVE SITE MATCH — How It Fits Your Location:
//   verdict banner, Soil pH comfort card with floating dark marker pill ("Your soil 7.7"),
//   Winter cold & 2050s heat card with floating dark marker pills ("Night +4.0°", "2050s 31°"),
//   2-column 6-row spec ledger with status icons, Breaking Points badges,
//   60-year 6-stage lifeline, and full-width 12-month 4-track calendar!
import { useEffect, useMemo, useState } from 'preact/hooks';
import { jobsOf, siteClimate as climateOf, SUCCESSION_STAGES_6, type Details, type Locale, type Stratum, type Taxon } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { pageLang, T } from '../../strings.ts';
import { closeFieldDossier, dossierId, dossierList, microclimate, openFieldDossier, stepFieldDossier, studioTab } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import { SunIcon } from './SunIcon.tsx';
import {
  activityMonthsOf,
  buildDossierSpec,
  stageSpanOf,
  sunTierLabel,
  sunTierOf,
} from '../../rules/studio-filters.ts';
import { phReactionLabel } from '../../rules/climate-words.ts';

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

function scoreCompanion(p: Taxon, other: Taxon): { plant: Taxon; score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  const pSun = sunTierOf(p);
  const oSun = sunTierOf(other);
  const pJobs = jobsOf(p);
  const oJobs = jobsOf(other);
  if (pSun !== oSun) {
    score += 2;
    reasons.push(`Complementary sun (${sunTierLabel(other)})`);
  }
  if (pJobs.includes('feeds_soil') && oJobs.includes('feeds_you')) {
    score += 3;
    reasons.push('Feeds this harvest partner');
  } else if (oJobs.includes('feeds_soil') && pJobs.includes('feeds_you')) {
    score += 3;
    reasons.push('Fixes nitrogen nearby');
  }
  const pDeep = (p.traits.root_depth_min_cm ?? 0) >= 60;
  const oDeep = (other.traits.root_depth_min_cm ?? 0) >= 60;
  if (pDeep !== oDeep) {
    score += 2;
    reasons.push(oDeep ? 'Deep taproot partner' : 'Shallow-root neighbor');
  }
  const pSpan = stageSpanOf(p);
  const oSpan = stageSpanOf(other);
  if (oSpan.start !== pSpan.start || oSpan.end !== pSpan.end) {
    score += 1;
    reasons.push(`Adjacent succession (${oSpan.label})`);
  }
  if (oJobs.includes('helpers') && !reasons.length) {
    score += 1;
    reasons.push('Attracts pollinators');
  } else if (oJobs.includes('mulch') && !reasons.length) {
    score += 1;
    reasons.push('Produces biomass & mulch');
  } else if (oJobs.includes('ground') && !reasons.length) {
    score += 1;
    reasons.push('Living soil cover');
  } else if (oJobs.includes('shelter') && !reasons.length) {
    score += 1;
    reasons.push('Windbreak & microclimate shelter');
  }
  return { plant: other, score, reason: reasons.slice(0, 2).join(' · ') || 'Balanced guild neighbor' };
}

const SUN_EMBLEM: Record<Stratum, { glyph: string; sky: string }> = {
  emergent: { glyph: '☀', sky: '100% open sky' },
  high: { glyph: '🌤', sky: '4–6 hrs sun' },
  medium: { glyph: '◐', sky: '2–4 hrs sun' },
  low: { glyph: '●', sky: 'dappled shade' },
};

const clampPct = (v: number, lo: number, hi: number): number =>
  Math.max(4, Math.min(96, Math.round(((v - lo) / (hi - lo)) * 100)));

export function FieldDossier() {
  const id = dossierId.value;
  const list = dossierList.value;
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    if (!id) { setDetails(null); return; }
    let gone = false;
    setDetails(null);
    const src = store.source.peek();
    const z = store.climate.peek();
    if (src && z) {
      void src.details(id, z, pageLang() as Locale).then((d) => { if (!gone) setDetails(d); }).catch(() => {});
    }
    return () => { gone = true; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeFieldDossier(); return; }
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (e.key === 'ArrowLeft') stepFieldDossier(-1);
      else if (e.key === 'ArrowRight') stepFieldDossier(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id]);

  const taxon = id ? store.taxonOf(id) : null;
  const loc = store.location.value;
  const mc = microclimate.value;
  const edits = store.siteEdits.value;
  const spec = useMemo(
    () => (taxon ? buildDossierSpec(taxon, details, loc, mc, edits) : null),
    [taxon, details, loc, mc, edits],
  );
  const spark = useMemo(
    () => (taxon ? activityMonthsOf(taxon, details) : []),
    [taxon, details],
  );

  if (!id || !taxon || !spec) return null;

  const inPalette = store.members.value.includes(taxon.id);
  const memberSet = new Set(store.members.value);
  const inPalComps = store.memberTaxa.value
    .filter((m) => m.id !== taxon.id)
    .map((m) => scoreCompanion(taxon, m))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const poolComps = (store.fitPool.value ?? store.pool.value ?? [])
    .filter((c) => !memberSet.has(c.id) && c.id !== taxon.id)
    .map((c) => scoreCompanion(taxon, c))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const canStep = list.length > 1;
  const curIdx = list.indexOf(taxon.id);
  const sun = sunTierOf(taxon);
  const emblem = SUN_EMBLEM[sun];
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const placeName = loc?.label ?? 'your site';
  const sitePh = spec.phTrack.sitePh;
  const siteFreezeC = spec.tempTrack.siteFreezeC;
  const warmMonth = spec.tempTrack.warmMonth;
  const siteHot2050 = spec.tempTrack.siteHotC != null ? Math.round((spec.tempTrack.siteHotC + 2.1) * 10) / 10 : null;
  const phFits = sitePh == null || (sitePh >= spec.phTrack.min - 0.2 && sitePh <= spec.phTrack.max + 0.2);
  const hasDanger = spec.breakingPoints.some((b) => b.severity === 'danger');
  const hasWarn = spec.breakingPoints.length > 0;
  const verdictTone = hasDanger ? 'danger' : hasWarn ? 'warn' : 'good';

  const phBarLeft = clampPct(spec.phTrack.min, 4.0, 9.0);
  const phBarRight = clampPct(spec.phTrack.max, 4.0, 9.0);
  const phSitePct = sitePh != null ? clampPct(sitePh, 4.0, 9.0) : null;

  const tBarLeft = clampPct(spec.tempTrack.minC, -20, 44);
  const tBarRight = clampPct(spec.tempTrack.maxC, -20, 44);
  const tColdPct = siteFreezeC != null ? clampPct(siteFreezeC, -20, 44) : null;
  const tHotPct = siteHot2050 != null ? clampPct(siteHot2050, -20, 44) : null;

  const isAnnual = taxon.traits.is_annual === true || taxon.traits.grown_as_annual === true;
  const isEvergreen = Boolean(taxon.traits.deciduous_evergreen && /evergreen/i.test(taxon.traits.deciduous_evergreen));

  const SUN_CLS: Record<Stratum, string> = {
    emergent: 'sun-full',
    high: 'sun-mostly',
    medium: 'sun-part',
    low: 'sun-shade',
  };
  const sunCls = SUN_CLS[sun];
  const fitBannerCls = verdictTone === 'danger' ? 'is-risk' : verdictTone === 'warn' ? 'is-care' : 'is-fit';
  const phPinCls = phFits ? 'pin-ok' : 'pin-warn';

  return (
    <div
      class="dossier-backdrop open"
      data-field-dossier
      onClick={(e) => { if (e.target === e.currentTarget) closeFieldDossier(); }}
    >
      <div class="dossier-drawer" role="dialog" aria-modal="true" aria-labelledby="ct-dossier-title">
        {/* Sticky Top Header (verbatim .dossier-sticky-head) */}
        <div class="dossier-sticky-head">
          <div class="dossier-nav-bar">
            <div class="dossier-pager">
              {canStep && (
                <>
                  <button type="button" class="btn btn-xs" onClick={() => stepFieldDossier(-1)}>{T('studio.prev')}</button>
                  {curIdx >= 0 && <span class="dossier-page-pos">{curIdx + 1} / {list.length}</span>}
                  <button type="button" class="btn btn-xs" onClick={() => stepFieldDossier(1)}>{T('studio.next')}</button>
                </>
              )}
            </div>
            <button type="button" class="btn btn-xs" aria-label={T('studio.close')} onClick={closeFieldDossier}>
              ✕ {T('studio.close')}
            </button>
          </div>

          <div class="dossier-id-row">
            <div class="dossier-id-left">
              <span class={`dossier-emblem ${sunCls}`} aria-hidden="true">
                <SunIcon tier={sun} size={24} />
              </span>
              <div style="min-width:0;">
                <h2 id="ct-dossier-title" class="dossier-title">{nameOf(taxon)}</h2>
                <div class="dossier-latin">{taxon.canonical_name}</div>
                <div class="dossier-id-badges">
                  <span class={`sun-badge ${sunCls}`}>
                    {sunTierLabel(taxon)} · {emblem.sky}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="dossier-cta-row">
            <button
              type="button"
              class={inPalette ? 'btn' : 'btn btn-primary'}
              style="flex:1;"
              onClick={() => (inPalette ? store.removeMember(taxon.id) : store.addMembers([taxon.id]))}
            >
              {inPalette ? '✓ In your palette · Remove' : '+ Add to my palette'}
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Body (verbatim .dossier-body) */}
        <div class="dossier-body">
          <section class="d-section" aria-label="How it fits your location">
            <div>
              <div class="d-sec-kicker">Section 1 · Live site match</div>
              <h3 class="d-sec-title">How It Fits Your Location</h3>
            </div>

            <div class={`fit-banner ${fitBannerCls}`}>
              <div class="fit-banner-top">
                <span class="fit-banner-headline">
                  {verdictTone === 'good'
                    ? `✓ Thrives in ${placeName} · Holds strong in the 2050s`
                    : verdictTone === 'warn'
                    ? `⚠ Needs microsite care in ${placeName}`
                    : `✗ Exceeds hard climate limit in ${placeName}`}
                </span>
              </div>
              <div class="fit-banner-meta">
                {placeName} (2050s):{' '}
                {sitePh != null ? `pH ${sitePh.toFixed(1)} (${phReactionLabel(sitePh)}) · ` : ''}
                {siteFreezeC != null ? `1-in-10-yr freeze ~${siteFreezeC.toFixed(1)} °C · ` : ''}
                {siteHot2050 != null ? `${warmMonth} avg ${Math.round(siteHot2050)} °C` : 'climate loaded'}
                {sc?.koppen ? ` · Köppen ${sc.koppen}` : ''}
                <button
                  type="button"
                  class="link-btn"
                  style="padding:1px 6px; font-size:12px; margin-left:4px;"
                  onClick={() => { closeFieldDossier(); studioTab.value = 'climate'; }}
                >
                  Tune sliders ↗
                </button>
              </div>
            </div>

            {/* Soil pH Range Gauge (verbatim .gauge-card) */}
            <div class="gauge-card">
              <div class="gauge-head">
                <strong>Soil pH comfort</strong>
                <span style={{ color: phFits ? 'var(--plant-green)' : 'var(--warn-ink)', fontWeight: 600 }}>
                  Plant: pH {spec.phTrack.min.toFixed(1)}–{spec.phTrack.max.toFixed(1)}
                  {sitePh != null ? (phFits ? ` · ✓ Fits your pH ${sitePh.toFixed(1)}` : ` · ⚠ Outside your pH ${sitePh.toFixed(1)}`) : ''}
                </span>
              </div>
              <div class="gauge-track-wrap">
                {phSitePct != null && (
                  <span class={`gauge-pin-lbl ${phPinCls}`} style={{ left: `${Math.max(12, Math.min(88, phSitePct))}%` }}>
                    Your soil {sitePh!.toFixed(1)}
                  </span>
                )}
                <div class="gauge-track">
                  <div class="gauge-band" style={{ left: `${phBarLeft}%`, width: `${Math.max(8, phBarRight - phBarLeft)}%` }} />
                  {phSitePct != null && <div class={`gauge-pin ${phPinCls}`} style={{ left: `${phSitePct}%` }} />}
                </div>
              </div>
              <div class="gauge-scale">
                <span>Acidic (4.0)</span>
                <span>Neutral (7.0)</span>
                <span>Alkaline (9.0)</span>
              </div>
            </div>

            {/* Winter Cold & 2050s Heat Gauge (verbatim .gauge-card) */}
            <div class="gauge-card">
              <div class="gauge-head">
                <strong>Winter cold &amp; 2050s heat</strong>
                <span style="color:var(--plant-green); font-weight:600;">
                  Hard-freeze limit {Math.round(spec.tempTrack.minC)} °C · Heat-dome limit {Math.round(spec.tempTrack.maxC)} °C
                </span>
              </div>
              <div class="gauge-track-wrap">
                {tColdPct != null && (
                  <span class="gauge-pin-lbl pin-cold" style={{ left: `${Math.max(16, Math.min(84, tColdPct))}%` }}>
                    1-in-10-yr freeze {siteFreezeC! >= 0 ? '+' : ''}{siteFreezeC!.toFixed(1)}°
                  </span>
                )}
                {tHotPct != null && (
                  <span class="gauge-pin-lbl pin-ok" style={{ left: `${Math.max(16, Math.min(84, tHotPct))}%` }}>
                    2050s {warmMonth} avg {Math.round(siteHot2050!)}°
                  </span>
                )}
                <div class="gauge-track">
                  <div class="gauge-band" style={{ left: `${tBarLeft}%`, width: `${Math.max(10, tBarRight - tBarLeft)}%` }} />
                  {tColdPct != null && <div class="gauge-pin pin-cold" style={{ left: `${tColdPct}%` }} />}
                  {tHotPct != null && <div class="gauge-pin pin-ok" style={{ left: `${tHotPct}%` }} />}
                </div>
              </div>
              <div class="gauge-scale">
                <span>-20 °C</span>
                <span>0 °C frost</span>
                <span>+20 °C</span>
                <span>+44 °C</span>
              </div>
            </div>

            {/* 2-Column 6-Row Hairline Spec Ledger (verbatim .d-spec-ledger) */}
            <div class="d-spec-ledger" role="list" aria-label="Site fit specification ledger">
              {spec.ledger.map((row) => (
                <div key={row.label} class="d-spec-row" role="listitem">
                  <span class="d-spec-k" style="display:inline-flex; align-items:center; gap:5px;">
                    {row.label}
                    <FieldTip label={`Explain ${row.label}`} text={row.tip} />
                  </span>
                  <span class="d-spec-v" style="color:var(--plant-green);">✓ {row.value}</span>
                </div>
              ))}
            </div>

            {/* Breaking Points & Field Insurance */}
            <div class="gauge-card" data-dossier-breaking-points>
              <div class="gauge-head">
                <strong style="font-size:11.5px; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-muted);">Breaking points &amp; field insurance</strong>
                <span style="font-size:12px; color:var(--ink-muted);">{spec.breakingPoints.length} limit{spec.breakingPoints.length === 1 ? '' : 's'} hit</span>
              </div>
              <div class="bp-signal-line">
                <span class="bp-pill">🔥 Heat-dome limit: {Math.round(spec.tempTrack.maxC)} °C</span>
                <span class="bp-pill">❄ Hard-freeze limit: {Math.round(spec.tempTrack.minC)} °C</span>
                <span class="bp-pill">💧 Max dry spell: {spec.maxDryDays}d</span>
                {spec.breakingPoints.map((bp, i) => (
                  <span key={i} class={`bp-pill ${bp.severity === 'danger' ? 'breached' : 'warn'}`}>
                    {bp.title}
                  </span>
                ))}
              </div>
            </div>

            {/* 60-Year 6-Stage Succession Lifeline */}
            <div class="gauge-card">
              <div class="gauge-head">
                <strong>60-year succession lifeline</strong>
                <span style="font-size:12px; color:var(--ink-muted);">{spec.lifeline.label}</span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(6, minmax(0, 1fr)); gap:4px;">
                {SUCCESSION_STAGES_6.map((s, idx) => {
                  const active = idx >= spec.lifeline.start && idx <= spec.lifeline.end;
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '6px',
                        border: `1px solid ${active ? 'var(--plant-green)' : 'var(--border)'}`,
                        background: active ? 'var(--plant-green-bg)' : 'var(--bg)',
                        color: active ? 'var(--plant-green)' : 'var(--ink-muted)',
                        textAlign: 'center',
                        fontSize: '10.5px',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <div>{s.name}</div>
                      <div>{s.time}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3 · 12-Month Rhythm (verbatim 13-col .d-cal-grid: Activity + J..D) */}
            <section class="d-section" aria-label="Your year with this plant">
              <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-end; gap:8px;">
                <div>
                  <div class="d-sec-kicker">Section 3 · 12-month rhythm</div>
                  <h3 class="d-sec-title">Your Year With This Plant</h3>
                </div>
                {spec.photoperiodInfo && (
                  <span class="prov-badge" data-photoperiod-badge>
                    Photoperiod {spec.photoperiodInfo.winterH.toFixed(1)}–{spec.photoperiodInfo.summerH.toFixed(1)} h
                  </span>
                )}
              </div>

              <table class="d-cal-grid" data-dossier-calendar>
                <thead>
                  <tr>
                    <th>Activity</th>
                    {MONTH_LETTERS.map((m, i) => (
                      <th key={i} class={i <= 2 || i >= 10 ? 'win' : undefined}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    {
                      label: 'Winter-grow',
                      cls: 'on-win',
                      on: (m: number) => (isEvergreen || (!isAnnual && (spark[m] ?? 'dormant') !== 'dormant')) && (m <= 1 || m >= 10),
                    },
                    {
                      label: 'Sow / plant',
                      cls: 'on-sow',
                      on: (m: number) => (isAnnual ? (m === 2 || m === 3 || m === 4) : (m === 2 || m === 10)),
                    },
                    {
                      label: 'Bloom',
                      cls: 'on-bloom',
                      on: (m: number) => (spark[m] ?? 'dormant') !== 'dormant' && m >= 3 && m <= 7,
                    },
                    {
                      label: 'Harvest',
                      cls: 'on-harv',
                      on: (m: number) => (spark[m] ?? 'dormant') === 'peak' || ((spark[m] ?? 'dormant') === 'active' && m >= 7 && m <= 9),
                    },
                  ] as const).map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {MONTH_LETTERS.map((_, i) => (
                        <td key={i} class={i <= 2 || i >= 10 ? 'win' : undefined}>
                          <div class="d-cal-cell-wrap">
                            {row.on(i) && <div class={`d-cal-cell ${row.cls}`} />}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Section 4 · Guild Synergy (verbatim mockup .comp-list / .comp-row) */}
            {(inPalComps.length > 0 || poolComps.length > 0) && (
              <section class="d-section" aria-label="Companion synergy">
                <div>
                  <div class="d-sec-kicker">Section 4 · Guild synergy</div>
                  <h3 class="d-sec-title">Works Well With in Your Palette</h3>
                </div>

                {inPalComps.length > 0 && (
                  <div>
                    <div class="fp-label">Already in your palette</div>
                    <div class="comp-list">
                      {inPalComps.map((c) => {
                        const cSun = SUN_CLS[sunTierOf(c.plant)];
                        return (
                          <div
                            key={c.plant.id}
                            class="comp-row"
                            role="button"
                            tabIndex={0}
                            onClick={() => openFieldDossier(c.plant.id, store.members.peek())}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFieldDossier(c.plant.id, store.members.peek()); } }}
                          >
                            <div style="min-width:0;">
                              <strong style="font-size:14px;">{nameOf(c.plant)}</strong>
                              <span class={`sun-badge ${cSun}`} style="font-size:10.5px; padding:1px 6px; margin-left:4px;">
                                {sunTierLabel(c.plant)}
                              </span>
                              <div style="font-size:12px; color:var(--ink-soft); margin-top:2px;">{c.reason}</div>
                            </div>
                            <span style="font-size:12.5px; font-weight:600; color:var(--ink-muted); white-space:nowrap;">Open →</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {poolComps.length > 0 && (
                  <div>
                    <div class="fp-label">Good companions to add</div>
                    <div class="comp-list">
                      {poolComps.map((c) => {
                        const cSun = SUN_CLS[sunTierOf(c.plant)];
                        return (
                          <div
                            key={c.plant.id}
                            class="comp-row"
                            role="button"
                            tabIndex={0}
                            onClick={() => openFieldDossier(c.plant.id, list)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFieldDossier(c.plant.id, list); } }}
                          >
                            <div style="min-width:0;">
                              <strong style="font-size:14px;">{nameOf(c.plant)}</strong>
                              <span class={`sun-badge ${cSun}`} style="font-size:10.5px; padding:1px 6px; margin-left:4px;">
                                {sunTierLabel(c.plant)}
                              </span>
                              <div style="font-size:12px; color:var(--ink-soft); margin-top:2px;">{c.reason}</div>
                            </div>
                            <button
                              type="button"
                              class="btn btn-xs"
                              onClick={(e) => { e.stopPropagation(); store.addMembers([c.plant.id]); }}
                            >
                              + Add
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
