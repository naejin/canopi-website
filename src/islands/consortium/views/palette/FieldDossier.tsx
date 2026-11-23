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
import { siteClimate as climateOf, SUCCESSION_STAGES_6, type Details, type Locale, type Stratum } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { pageLang, T } from '../../strings.ts';
import { closeFieldDossier, dossierId, dossierList, openFieldDossier, stepFieldDossier, studioTab } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import {
  activityMonthsOf,
  buildDossierSpec,
  sunTierLabel,
  sunTierOf,
} from '../../rules/studio-filters.ts';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

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
  const spec = useMemo(
    () => (taxon ? buildDossierSpec(taxon, details, loc) : null),
    [taxon, details, loc],
  );
  const spark = useMemo(
    () => (taxon ? activityMonthsOf(taxon, details) : []),
    [taxon, details],
  );

  if (!id || !taxon || !spec) return null;

  const inPalette = store.members.value.includes(taxon.id);
  const peers = store.memberTaxa.value.filter((m) => m.id !== taxon.id).slice(0, 5);
  const canStep = list.length > 1;
  const curIdx = list.indexOf(taxon.id);
  const sun = sunTierOf(taxon);
  const emblem = SUN_EMBLEM[sun];
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const placeName = loc?.label ?? 'your site';
  const sitePh = spec.phTrack.sitePh;
  const siteColdC = spec.tempTrack.siteColdC;
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
  const tColdPct = siteColdC != null ? clampPct(siteColdC, -20, 44) : null;
  const tHotPct = siteHot2050 != null ? clampPct(siteHot2050, -20, 44) : null;

  const isAnnual = taxon.traits.is_annual === true || taxon.traits.grown_as_annual === true;
  const isEvergreen = Boolean(taxon.traits.deciduous_evergreen && /evergreen/i.test(taxon.traits.deciduous_evergreen));

  return (
    <div
      class="ct-dossier-backdrop"
      data-field-dossier
      onClick={(e) => { if (e.target === e.currentTarget) closeFieldDossier(); }}
    >
      <div class="ct-dossier" role="dialog" aria-modal="true" aria-labelledby="ct-dossier-title">
        {/* Top Prev/Next + Close Bar */}
        <div class="ct-dossier-topbar">
          <div class="ct-dossier-step-group">
            {canStep && (
              <>
                <button type="button" class="ct-dossier-btn" onClick={() => stepFieldDossier(-1)}>{T('studio.prev')}</button>
                {curIdx >= 0 && <span class="ct-dossier-pos">{curIdx + 1} / {list.length}</span>}
                <button type="button" class="ct-dossier-btn" onClick={() => stepFieldDossier(1)}>{T('studio.next')}</button>
              </>
            )}
          </div>
          <button type="button" class="ct-dossier-btn" aria-label={T('studio.close')} onClick={closeFieldDossier}>
            × {T('studio.close')}
          </button>
        </div>

        {/* Sun Emblem + Serif Title + Latin + Sun Pill */}
        <div class="ct-dossier-hero">
          <span class="ct-dossier-emblem" data-sun-tier={sun} aria-hidden="true">{emblem.glyph}</span>
          <div>
            <h2 id="ct-dossier-title" class="ct-dossier-title">{nameOf(taxon)}</h2>
            <p class="ct-sci ct-dossier-latin">{taxon.canonical_name}</p>
            <span class="ct-gantt-sun-pill" data-sun-tier={sun}>
              {sunTierLabel(taxon)} · {emblem.sky}
            </span>
          </div>
        </div>

        {/* Full-Width In Palette / Add Bar */}
        <button
          type="button"
          class={`ct-dossier-toggle-bar${inPalette ? ' is-in' : ''}`}
          onClick={() => (inPalette ? store.removeMember(taxon.id) : store.addMembers([taxon.id]))}
        >
          {inPalette ? '✓ In your palette · Remove' : '+ Add to palette'}
        </button>

        {/* SECTION 1 · LIVE SITE MATCH */}
        <div class="ct-dossier-section">
          <span class="ct-eyebrow">SECTION 1 · LIVE SITE MATCH</span>
          <h3 class="ct-dossier-h3">How It Fits Your Location</h3>

          {/* Verdict Banner */}
          <div
            class={`ct-dossier-verdict is-${verdictTone}`}
            data-stratum={verdictTone === 'good' ? 'high' : undefined}
          >
            <strong>
              {verdictTone === 'good'
                ? `✓ Thrives in ${placeName} · Holds strong in the 2050s`
                : verdictTone === 'warn'
                ? `⚠ Needs microsite care in ${placeName}`
                : `✗ Exceeds hard climate limit in ${placeName}`}
            </strong>
            <p class="ct-small-text">
              {placeName} (2050s):{' '}
              {sitePh != null ? `pH ${sitePh.toFixed(1)} · ` : ''}
              {siteColdC != null ? `${siteColdC >= 0 ? '+' : ''}${siteColdC.toFixed(1)} °C nights · ` : ''}
              {siteHot2050 != null ? `${Math.round(siteHot2050)} °C highs` : 'climate loaded'}
              {sc?.koppen ? ` · Köppen ${sc.koppen}` : ''}
            </p>
            <button
              type="button"
              class="ct-sys-link ct-small-text"
              onClick={() => { closeFieldDossier(); studioTab.value = 'climate'; }}
            >
              Tune sliders ↗
            </button>
          </div>

          {/* Soil pH Comfort Range Card with Floating Dark Marker Pill */}
          <div class="ct-range-card">
            <div class="ct-range-head">
              <strong>Soil pH comfort</strong>
              <span class={`ct-range-status${phFits ? ' is-good' : ' is-warn'}`} data-stratum={phFits ? 'high' : undefined}>
                Plant: pH {spec.phTrack.min.toFixed(1)}–{spec.phTrack.max.toFixed(1)}
                {sitePh != null ? (phFits ? ` · ✓ Fits your pH ${sitePh.toFixed(1)}` : ` · Outside pH ${sitePh.toFixed(1)}`) : ''}
              </span>
            </div>
            <div class="ct-range-stage">
              {phSitePct != null && (
                <span class="ct-range-pill" style={{ left: `${phSitePct}%` }}>
                  Your soil {sitePh!.toFixed(1)}
                </span>
              )}
              <div class="ct-range-rail">
                <span
                  class="ct-range-fill"
                  data-stratum="high"
                  style={{ left: `${phBarLeft}%`, width: `${Math.max(8, phBarRight - phBarLeft)}%` }}
                />
                {phSitePct != null && <span class="ct-range-dot" style={{ left: `${phSitePct}%` }} />}
              </div>
              <div class="ct-range-ticks">
                <span>Acidic (4.0)</span>
                <span>Neutral (7.0)</span>
                <span>Alkaline (9.0)</span>
              </div>
            </div>
          </div>

          {/* Winter Cold & 2050s Heat Range Card with 2 Floating Dark Marker Pills */}
          <div class="ct-range-card">
            <div class="ct-range-head">
              <strong>Winter cold &amp; 2050s heat</strong>
              <span class="ct-range-status is-good" data-stratum="high">
                Hardy to {Math.round(spec.tempTrack.minC)} °C · Heat limit {Math.round(spec.tempTrack.maxC)} °C
              </span>
            </div>
            <div class="ct-range-stage">
              {tColdPct != null && (
                <span class="ct-range-pill is-cold" style={{ left: `${tColdPct}%` }}>
                  Night {siteColdC! >= 0 ? '+' : ''}{siteColdC!.toFixed(1)}°
                </span>
              )}
              {tHotPct != null && (
                <span class="ct-range-pill is-hot" style={{ left: `${tHotPct}%` }}>
                  2050s {Math.round(siteHot2050!)}°
                </span>
              )}
              <div class="ct-range-rail">
                <span
                  class="ct-range-fill"
                  data-stratum="high"
                  style={{ left: `${tBarLeft}%`, width: `${Math.max(10, tBarRight - tBarLeft)}%` }}
                />
                {tColdPct != null && <span class="ct-range-dot is-cold" style={{ left: `${tColdPct}%` }} />}
                {tHotPct != null && <span class="ct-range-dot is-hot" style={{ left: `${tHotPct}%` }} />}
              </div>
              <div class="ct-range-ticks">
                <span>-20 °C</span>
                <span>0 °C frost</span>
                <span>+20 °C</span>
                <span>+44 °C</span>
              </div>
            </div>
          </div>

          {/* 2-Column 6-Row Hairline Spec Ledger with Status Icons */}
          <ul class="ct-ledger-v14">
            {spec.ledger.map((row) => (
              <li key={row.label} class="ct-ledger-v14-cell">
                <div class="ct-ledger-v14-top">
                  <span class="ct-eyebrow">{row.label}</span>
                  <FieldTip label={`Explain ${row.label}`} text={row.tip} />
                </div>
                <strong class="ct-ledger-v14-val">✓ {row.value}</strong>
              </li>
            ))}
          </ul>

          {/* Breaking Points & Field Insurance */}
          <div class="ct-range-card" data-dossier-breaking-points>
            <div class="ct-range-head">
              <span class="ct-eyebrow">BREAKING POINTS &amp; FIELD INSURANCE</span>
              <span class="ct-small-text ct-muted">{spec.breakingPoints.length} limit{spec.breakingPoints.length === 1 ? '' : 's'} hit</span>
            </div>
            <div class="ct-bp-pills-row">
              <span class="ct-bp-chip is-heat">Heat dome: {Math.round(spec.tempTrack.maxC)} °C</span>
              <span class="ct-bp-chip is-dry">Cold floor: {Math.round(spec.tempTrack.minC)} °C</span>
              {spec.breakingPoints.map((bp, i) => (
                <span key={i} class={`ct-bp-chip ${bp.severity === 'danger' ? 'is-heat' : 'is-dry'}`}>
                  {bp.title}
                </span>
              ))}
            </div>
          </div>

          {/* 60-Year 6-Stage Succession Lifeline */}
          <div class="ct-range-card">
            <div class="ct-range-head">
              <strong>60-year succession lifeline</strong>
              <span class="ct-small-text ct-muted">{spec.lifeline.label}</span>
            </div>
            <div class="ct-lifeline">
              {SUCCESSION_STAGES_6.map((s, idx) => (
                <div
                  key={s.id}
                  class={`ct-lifeline-cell${idx >= spec.lifeline.start && idx <= spec.lifeline.end ? ' is-on' : ''}`}
                  data-stratum={idx >= spec.lifeline.start && idx <= spec.lifeline.end ? 'high' : undefined}
                >
                  <div>{s.name}</div>
                  <div>{s.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Full-Width 12-Month 4-Track Calendar (fixes squished 30px bar!) */}
          <div class="ct-range-card">
            <div class="ct-cal12-head">
              <strong>12-month seasonal activity</strong>
              {spec.photoperiodInfo && (
                <span class="ct-cal12-badge" data-photoperiod-badge>
                  Site-adjusted · photoperiod ({spec.photoperiodInfo.winterH.toFixed(1)}–{spec.photoperiodInfo.summerH.toFixed(1)} h)
                </span>
              )}
            </div>
            <div class="ct-dossier-cal12" role="img" aria-label="12-month seasonal activity calendar">
              {MONTH_SHORT.map((mo, m) => {
                const lvl = spark[m] ?? 'dormant';
                const showW = (isEvergreen || (!isAnnual && lvl !== 'dormant')) && (m <= 1 || m >= 10);
                const showS = isAnnual ? (m === 2 || m === 3 || m === 4) : (m === 2 || m === 10);
                const showB = lvl !== 'dormant' && m >= 3 && m <= 7;
                const showH = lvl === 'peak' || (lvl === 'active' && m >= 7 && m <= 9);
                return (
                  <div key={mo} class="ct-dcal-col">
                    <span class="ct-dcal-mo">{mo}</span>
                    <div class="ct-gantt-tracks" aria-hidden="true">
                      <span class={`ct-gt-bar${showW ? ' is-w' : ''}`} />
                      <span class={`ct-gt-dot${showS ? ' is-s' : ''}`} />
                      <span class={`ct-gt-bar${showB ? ' is-b' : ''}`} />
                      <span class={`ct-gt-bar${showH ? ' is-h' : ''}`} data-stratum={showH ? 'high' : undefined} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Companion Synergy Links */}
          {peers.length > 0 && (
            <div class="ct-range-card">
              <strong>Companion synergy in your palette</strong>
              <div class="ct-synergy">
                {peers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    class="ct-studio-btn"
                    onClick={() => openFieldDossier(p.id, store.members.peek())}
                  >
                    {nameOf(p)} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
