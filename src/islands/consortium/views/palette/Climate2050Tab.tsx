/** @jsxImportSource preact */
// 2050 Climate Tab (Stage 1B — direct 1:1 port of v14 mockup-04-climate-full.png):
// - Section 1: Serene Executive Brief Card
// - Section 2: Compound Stress Preset Bar + Live Impact + 6-Lever Extremes Lab
// - Section 3: Rich Plant Triage Cards (thermal comfort-range bar, breaking-point pills, Field Insurance,
//              inline Climate Twin swap box) + Collapsible Holds Strong + 3-col Newly Thriving Opportunities
// - Section 4: 12-Month Climate Shift & Stress Windows (12 monthly column cards with paired Today vs 2050s
//              bars, rainfall mm bars, seasonal window tags, active plant counts + 2 bottom summary callouts)
import { useMemo, useState } from 'preact/hooks';
import type { ClimateAnalogue, AnalogueLoader } from '../../../../lib/climate/v07.ts';
import { siteClimate as climateOf, type PlantId } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import {
  climateStress,
  DEFAULT_CLIMATE_STRESS,
  designEnvelope,
  openFieldDossier,
  openPlantPool,
  studioTab,
} from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import {
  evaluateClimate2050,
  STRESS_PRESETS,
  type PlantTriageItem,
} from '../../rules/studio-analysis.ts';
import { activityMonthsOf, sunTierLabel, sunTierOf } from '../../rules/studio-filters.ts';

type TriageFilter = 'all' | 'risk' | 'care' | 'fit';

const lazyAnalogueLoader: AnalogueLoader = {
  async lookup(lat, lon, period, scenario): Promise<ClimateAnalogue | null> {
    if (typeof fetch !== 'function') return null;
    try {
      const res = await fetch(`/data/climate/analogues.json?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&p=${period}&s=${scenario}`);
      if (!res.ok) return null;
      const data = await res.json() as ClimateAnalogue | null;
      return data && typeof data.name === 'string' ? data : null;
    } catch {
      return null;
    }
  },
};

const clampPct = (v: number, lo: number, hi: number): number =>
  Math.max(2, Math.min(98, Math.round(((v - lo) / (hi - lo)) * 100)));

export function Climate2050Tab() {
  const members = store.memberTaxa.value;
  const catalog = store.fitPool.value ?? store.pool.value ?? [];
  const loc = store.location.value;
  const period = store.period.value;
  const envelope = designEnvelope.value;
  const stress = climateStress.value;

  const [labOpen, setLabOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('baseline');
  const [triageFilter, setTriageFilter] = useState<TriageFilter>('all');
  const [triageQuery, setTriageQuery] = useState('');
  const [lastSwap, setLastSwap] = useState<{ from: PlantId; to: PlantId; fromName: string; toName: string } | null>(null);
  const [analogueState, setAnalogueState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [analogue, setAnalogue] = useState<ClimateAnalogue | null>(null);

  const report = useMemo(
    () => evaluateClimate2050(members, catalog, loc, period, envelope, stress),
    [members, catalog, loc, period, envelope, stress],
  );
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  const activeByMonth = useMemo(() => {
    const counts = Array<number>(12).fill(0);
    for (const m of members) {
      const sp = activityMonthsOf(m);
      for (let i = 0; i < 12; i++) if (sp[i] !== 'dormant') counts[i]++;
    }
    return counts;
  }, [members]);

  if (!members.length) {
    return (
      <section class="ct-studio-section" data-climate-2050-tab>
        <p class="ct-muted">No species in palette yet — add plants to stress-test 2050s/2080s climate resilience.</p>
        <div><button type="button" class="ct-card-act" onClick={() => { studioTab.value = 'palette'; }}>Go to My Palette</button></div>
      </section>
    );
  }

  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const coldC = sc?.today?.tminColdC ?? 0;
  const hotTodayC = sc?.today?.tmaxWarmC ?? 29;
  const hotFutureC = Math.round((hotTodayC + (period === '2071-2099' ? 3.4 : 2.1) + (envelope === 'extreme10' ? 2.5 : 0) + stress.heatDeltaC) * 10) / 10;
  const mildWinter = coldC >= 0;
  const sitePh = loc?.lookup?.soil?.phH2o ?? store.siteEdits.value.soilPh ?? null;
  const placeName = loc?.label ?? 'your site';
  const horizonLabel = period === '2071-2099' ? '2080s' : '2050s';
  const matchPct = report.novelClimate ? null : analogue ? Math.round(analogue.matchQuality * 100) : 88;

  const totalCount = members.length;
  const fitCount = report.holdsStrong.length;
  const careCount = report.watch.length;
  const riskCount = report.critical.length;
  const fitPct = Math.round((fitCount / Math.max(1, totalCount)) * 100);
  const carePct = Math.round((careCount / Math.max(1, totalCount)) * 100);
  const riskPct = Math.max(0, 100 - fitPct - carePct);

  const q = triageQuery.trim().toLowerCase();
  const matchQ = (it: PlantTriageItem) =>
    !q || nameOf(it.taxon).toLowerCase().includes(q) || it.taxon.canonical_name.toLowerCase().includes(q);
  const shownCritical = (triageFilter === 'all' || triageFilter === 'risk') ? report.critical.filter(matchQ) : [];
  const shownWatch = (triageFilter === 'all' || triageFilter === 'care') ? report.watch.filter(matchQ) : [];
  const shownFit = (triageFilter === 'all' || triageFilter === 'fit') ? report.holdsStrong.filter(matchQ) : [];

  const doTwinSwap = (item: PlantTriageItem) => {
    if (!item.twinSwap) return;
    const fromId = item.taxon.id;
    const toId = item.twinSwap.id;
    store.removeMember(fromId);
    store.addMembers([toId]);
    setLastSwap({ from: fromId, to: toId, fromName: nameOf(item.taxon), toName: nameOf(item.twinSwap) });
  };

  const swapAllAtRisk = () => {
    const swappable = report.critical.filter((it) => it.twinSwap);
    if (!swappable.length) return;
    const first = swappable[0];
    for (const it of swappable) {
      if (!it.twinSwap) continue;
      store.removeMember(it.taxon.id);
      store.addMembers([it.twinSwap.id]);
    }
    if (first.twinSwap) {
      setLastSwap({ from: first.taxon.id, to: first.twinSwap.id, fromName: nameOf(first.taxon), toName: nameOf(first.twinSwap) });
    }
  };

  const undoTwinSwap = () => {
    if (!lastSwap) return;
    store.removeMember(lastSwap.to);
    store.addMembers([lastSwap.from]);
    setLastSwap(null);
  };

  const loadClimateTwin = async () => {
    if (!loc) return;
    setAnalogueState('loading');
    const res = await lazyAnalogueLoader.lookup(loc.lat, loc.lon, period, 'ssp245');
    setAnalogue(res);
    setAnalogueState('done');
  };

  const renderTriageCard = (item: PlantTriageItem, tone: 'danger' | 'warn') => {
    const maxComfort = item.taxon.climate?.tmaxWarm?.high ?? 34;
    const margin = Math.round((maxComfort - hotFutureC) * 10) / 10;
    const barEndPct = clampPct(maxComfort, 18, 44);
    const futurePinPct = clampPct(hotFutureC, 18, 44);
    const sun = sunTierOf(item.taxon);
    const maxDry = item.taxon.traits.drought_tolerance && /high/i.test(item.taxon.traits.drought_tolerance) ? 60 : 32;
    const badgeLabel = margin < 0 ? 'Crosses heat dome' : 'Near thermal limit';

    return (
      <article key={item.taxon.id} class={`ct-triage-card is-${tone}`}>
        <div class="ct-triage-card-head">
          <div>
            <button type="button" class="ct-sys-link ct-triage-name" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
              {nameOf(item.taxon)}
            </button>
            <div class="ct-sci ct-small-text">{item.taxon.canonical_name}</div>
          </div>
          <div class="ct-triage-badges">
            <span class="ct-gantt-sun-pill" data-sun-tier={sun}>{sunTierLabel(item.taxon)}</span>
            <span class={`ct-triage-flag is-${tone}`}>{badgeLabel}</span>
          </div>
        </div>

        {/* Visual Thermal Comfort-Range Bar */}
        <div class="ct-comfort-box">
          <div class="ct-comfort-head">
            <span>Comfort max {Math.round(maxComfort)} °C</span>
            <span class={`ct-comfort-fut is-${tone}`}>
              {horizonLabel} {Math.round(hotFutureC)} °C ({margin < 0 ? `+${Math.abs(Math.round(margin))} °C over` : `${Math.round(margin)} °C margin`})
            </span>
          </div>
          <div class="ct-comfort-rail" aria-hidden="true">
            <span class="ct-comfort-fill" data-stratum="high" style={{ width: `${barEndPct}%` }} />
            <span class={`ct-comfort-pin is-${tone}`} style={{ left: `${futurePinPct}%` }} />
          </div>
          <div class="ct-comfort-ticks">
            <span>18 °C</span>
            <span>30 °C</span>
            <span>44 °C</span>
          </div>
        </div>

        <div class="ct-bp-pills-row">
          <span class="ct-bp-chip is-heat">Heat dome: {maxComfort.toFixed(1)} °C</span>
          <span class="ct-bp-chip is-dry">Max dry: {maxDry}d</span>
          <FieldTip label="All 5 limits" text={item.allFiveLimits} glyph="All 5 limits ⓘ" />
        </div>

        <p class="ct-triage-ins">
          <strong>{tone === 'danger' ? 'Field Insurance:' : 'Practical Field Care:'}</strong> {item.fieldInsurance}
        </p>

        {item.twinSwap ? (
          <div class="ct-twin-box">
            <div class="ct-twin-top">
              <strong>{nameOf(item.taxon)} → {nameOf(item.twinSwap)}</strong>
              <span class="ct-twin-badge" data-stratum="high">Climate twin</span>
            </div>
            <p class="ct-small-text ct-muted">
              Same {sunTierLabel(item.taxon)} · thrives to {Math.round(item.twinSwap.climate?.tmaxWarm?.high ?? 37)} °C
              {item.twinSwap.traits.soil_ph ? ` & pH ${item.twinSwap.traits.soil_ph.min}–${item.twinSwap.traits.soil_ph.max}` : ''}
            </p>
            <div class="ct-twin-acts">
              <button type="button" class="ct-studio-btn" onClick={() => doTwinSwap(item)}>⇄ Swap</button>
              <button type="button" class="ct-studio-btn" onClick={() => openFieldDossier(item.twinSwap!.id, memberIds)}>Dossier</button>
            </div>
          </div>
        ) : (
          <div class="ct-twin-acts">
            <button type="button" class="ct-studio-btn" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>Dossier</button>
          </div>
        )}
      </article>
    );
  };

  const breaksFirst = [...report.critical, ...report.watch].slice(0, 3);

  // Build 12 monthly shift cards with estimated monthly rain (mm)
  const baseRain = sc?.today?.aridityIndex != null ? Math.round(Math.max(300, Math.min(1200, sc.today.aridityIndex * 650))) : 620;
  const rainWeights = [0.09, 0.08, 0.07, 0.08, 0.07, 0.04, 0.02, 0.03, 0.1, 0.15, 0.14, 0.13];
  const maxMonthTemp = Math.max(38, ...report.monthlyShift.map((m) => m.futureC));
  const maxMonthRain = Math.max(40, ...rainWeights.map((w) => Math.round(baseRain * w)));

  return (
    <section class="ct-studio-section" data-climate-2050-tab aria-label="2050 climate resilience analysis">
      {/* Section 1: v14 Serene Executive Brief Card */}
      <div class="ct-clim-brief">
        <div class="ct-clim-brief-top">
          <div class="ct-clim-loc-meta">
            <strong>{placeName}</strong>
            {sitePh != null && <span class="ct-muted">· pH {sitePh.toFixed(1)}</span>}
            <span class={`ct-clim-match-pill${report.novelClimate ? ' is-novel' : ''}`}>
              {report.novelClimate ? 'Novel climate' : `${matchPct}% climate match`}
            </span>
            {!analogue && !report.novelClimate && (
              <button
                type="button"
                class="ct-sys-link ct-small-text"
                disabled={analogueState === 'loading' || !loc}
                onClick={() => void loadClimateTwin()}
              >
                {analogueState === 'loading' ? 'Checking twin…' : analogueState === 'done' ? 'No published twin yet' : 'Check Climate Twin'}
              </button>
            )}
          </div>
          <div class="ct-clim-env-wrap">
            <span class="ct-small-text ct-muted">Design for:</span>
            <div class="ct-ink-seg" role="group" aria-label="Design envelope">
              <button
                type="button"
                class="ct-seg-btn"
                aria-pressed={envelope === 'typical' ? 'true' : 'false'}
                onClick={() => { designEnvelope.value = 'typical'; }}
              >
                {T('studio.climTypical')}
              </button>
              <button
                type="button"
                class="ct-seg-btn"
                aria-pressed={envelope === 'extreme10' ? 'true' : 'false'}
                onClick={() => { designEnvelope.value = 'extreme10'; }}
              >
                {T('studio.climExtreme')}
              </button>
            </div>
          </div>
        </div>

        <h2 class="ct-clim-headline">
          By the {horizonLabel}, {placeName} feels like{' '}
          <span class="ct-clim-twin-hl">
            {analogue ? `${analogue.name}, ${analogue.country}` : report.novelClimate ? 'a novel hot-summer regime' : 'a warmer southern analogue'}
          </span>{' '}
          today
        </h2>

        <div class="ct-clim-split">
          <div class="ct-clim-verdict-col">
            <span class="ct-eyebrow">YOUR PALETTE VERDICT ({envelope === 'extreme10' ? '1-IN-10-YR EXTREME' : `TYPICAL ${horizonLabel.toUpperCase()}`})</span>
            <div class="ct-clim-verdict-num">{fitCount} of {totalCount} plants thrive</div>
            <div class="ct-verdict-bar" role="img" aria-label={`${fitCount} thrives, ${careCount} needs care, ${riskCount} at risk`}>
              {fitPct > 0 && <span class="ct-vb-seg is-fit" data-stratum="high" style={{ width: `${fitPct}%` }} />}
              {carePct > 0 && <span class="ct-vb-seg is-care" style={{ width: `${carePct}%` }} />}
              {riskPct > 0 && <span class="ct-vb-seg is-risk" style={{ width: `${riskPct}%` }} />}
            </div>
            <div class="ct-verdict-legend">
              <span><span class="ct-hdot is-good" data-stratum="high" aria-hidden="true" /> {fitCount} Thrives</span>
              <span><span class="ct-hdot is-warn" aria-hidden="true" /> {careCount} Needs care</span>
              <span><span class="ct-hdot is-risk" aria-hidden="true" /> {riskCount} At risk</span>
            </div>
          </div>

          <div class="ct-clim-forces">
            {report.forces.map((f) => (
              <div key={f.label} class="ct-clim-force-row">
                <span class="ct-muted">{f.label}</span>
                <span>{f.today} → <strong>{f.future}</strong></span>
                <span class="ct-clim-delta">{f.delta}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="ct-clim-winter-callout">
          <p class="ct-clim-winter-copy">
            <strong>{mildWinter ? '❄ Mild-winter advantage:' : '❄ Winter window:'}</strong>{' '}
            {mildWinter
              ? `Nov–Mar stays frost-rare (${coldC.toFixed(1)} °C) — sow cool-season species in autumn to build deep roots before summer heat.`
              : `Winter floor reaches ${coldC.toFixed(1)} °C — focus on hardy bare-root stock in late autumn or early spring.`}
          </p>
          <button
            type="button"
            class="ct-sys-link ct-clim-winter-btn"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: 'Winter-plantable species for cool-season establishment' })}
          >
            Browse winter-plantable →
          </button>
        </div>
      </div>

      {/* Section 2: Compact 1-Row Compound Stress Bar + Expandable 6-Lever Extremes Lab */}
      <div class="ct-sys-block">
        <div class="ct-stress-bar">
          <div class="ct-stress-presets" role="group" aria-label="Compound climate stress presets">
            {STRESS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                class={`ct-stress-chip${activePreset === p.id ? ' is-active' : ''}`}
                aria-pressed={activePreset === p.id ? 'true' : 'false'}
                onClick={() => {
                  setActivePreset(p.id);
                  climateStress.value = { ...p.stress };
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            class="ct-studio-btn"
            aria-expanded={labOpen ? 'true' : 'false'}
            onClick={() => setLabOpen((v) => !v)}
          >
            {labOpen ? 'Hide Extremes Lab' : T('studio.climLab')}
          </button>
        </div>

        <div class="ct-impact-strip" data-climate-impact>
          <strong>Live system impact:</strong> <span>{report.impactLine}</span>
          {breaksFirst.length > 0 && (
            <span>
              {' · '}Breaks first:{' '}
              {breaksFirst.map((it, idx) => (
                <span key={it.taxon.id}>
                  {idx > 0 ? ', ' : ''}
                  <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(it.taxon.id, memberIds)}>
                    {nameOf(it.taxon)}
                  </button>
                </span>
              ))}
            </span>
          )}
        </div>

        {labOpen && (
          <div class="ct-stress-lab">
            <label class="ct-micro-field">
              <span>Summer heatwave (+{stress.heatDeltaC} °C)</span>
              <input type="range" min={0} max={6} step={0.5} value={stress.heatDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, heatDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Drought deficit (+{stress.droughtPct}%)</span>
              <input type="range" min={0} max={60} step={5} value={stress.droughtPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, droughtPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Winter snap ({stress.winterDeltaC} °C)</span>
              <input type="range" min={-8} max={2} step={0.5} value={stress.winterDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, winterDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>False spring risk (+{stress.falseSpringDeltaPct}%)</span>
              <input type="range" min={0} max={40} step={5} value={stress.falseSpringDeltaPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, falseSpringDeltaPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Drying wind exposure ({stress.windExposure}/3)</span>
              <input type="range" min={0} max={3} step={1} value={stress.windExposure} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, windExposure: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <label class="ct-micro-field">
              <span>Heavy rain shift ({stress.extremeRainPct >= 0 ? '+' : ''}{stress.extremeRainPct}%)</span>
              <input type="range" min={-30} max={40} step={5} value={stress.extremeRainPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, extremeRainPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
            </label>
            <button type="button" class="ct-card-act" onClick={() => { setActivePreset('baseline'); climateStress.value = { ...DEFAULT_CLIMATE_STRESS }; }}>
              Reset levers
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Triage Filter Bar + Rich Triage Cards */}
      <div class="ct-triage-bar">
        <div class="ct-ink-seg" role="group" aria-label="Filter triage by status">
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'all' ? 'true' : 'false'} onClick={() => setTriageFilter('all')}>
            All ({totalCount})
          </button>
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'risk' ? 'true' : 'false'} onClick={() => setTriageFilter('risk')}>
            ✗ At Risk ({riskCount})
          </button>
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'care' ? 'true' : 'false'} onClick={() => setTriageFilter('care')}>
            ⚠ Needs Adaptation ({careCount})
          </button>
          <button type="button" class="ct-seg-btn" aria-pressed={triageFilter === 'fit' ? 'true' : 'false'} onClick={() => setTriageFilter('fit')}>
            ✓ Thrives ({fitCount})
          </button>
        </div>
        <input
          type="search"
          class="ct-pal-search ct-triage-search"
          placeholder="Search plants in triage…"
          aria-label="Search plants in triage"
          value={triageQuery}
          onInput={(e) => setTriageQuery((e.currentTarget as HTMLInputElement).value)}
        />
      </div>

      {lastSwap && (
        <div class="ct-swap-undo">
          <span>Swapped {lastSwap.fromName} → {lastSwap.toName}</span>
          <button type="button" class="ct-card-act" onClick={undoTwinSwap}>Undo</button>
        </div>
      )}

      {shownCritical.length > 0 && (
        <div class="ct-triage-group-box is-danger">
          <div class="ct-sys-head">
            <div>
              <h3 class="ct-triage-box-title is-danger">✗ At Risk — Swap Ready ({shownCritical.length})</h3>
              <p class="ct-sys-sub">Exceeds thermal comfort ceiling in {horizonLabel}. Swap individually or in one click with full Undo.</p>
            </div>
            {report.critical.some((it) => it.twinSwap) && (
              <button type="button" class="button button-primary ct-small" onClick={swapAllAtRisk}>
                ⇄ Swap all {report.critical.length} at-risk
              </button>
            )}
          </div>
          <div class="ct-triage-cards-grid">
            {shownCritical.map((it) => renderTriageCard(it, 'danger'))}
          </div>
        </div>
      )}

      {shownWatch.length > 0 && (
        <div class="ct-triage-group-box is-warn">
          <div class="ct-sys-head">
            <div>
              <h3 class="ct-triage-box-title is-warn">⚠ Needs Adaptation — Practical Field Care ({shownWatch.length})</h3>
              <p class="ct-sys-sub">Can still succeed on your land with targeted microsite care, mulch, or soil buffering.</p>
            </div>
          </div>
          <div class="ct-triage-cards-grid">
            {shownWatch.map((it) => renderTriageCard(it, 'warn'))}
          </div>
        </div>
      )}

      {(triageFilter === 'all' || triageFilter === 'fit') && (
        <div class="ct-triage-group-box is-good" data-stratum="high">
          <button
            type="button"
            class="ct-triage-collapse"
            aria-expanded={holdsOpen || triageFilter === 'fit' ? 'true' : 'false'}
            onClick={() => setHoldsOpen((v) => !v)}
          >
            <span class="ct-triage-box-title is-good" data-stratum="high">
              ✓ Holds Strong ({shownFit.length} species thrive in {horizonLabel} climate)
            </span>
            <span class="ct-small-text ct-muted">
              {holdsOpen || triageFilter === 'fit' ? 'Hide ▴' : `Show ${shownFit.length} species ▾`}
            </span>
          </button>
          {(holdsOpen || triageFilter === 'fit') && (
            <ul class="ct-holds-list">
              {shownFit.map((it) => (
                <li key={it.taxon.id}>
                  <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(it.taxon.id, memberIds)}>
                    {nameOf(it.taxon)}
                  </button>
                  <span class="ct-sci"> {it.taxon.canonical_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Newly Thriving Opportunities 3-Column Card Section */}
      {report.opportunities.length > 0 && (
        <div class="ct-sys-block">
          <div class="ct-sys-head">
            <div>
              <h3 class="ct-sys-title">✦ Newly Thriving Opportunities in Your {horizonLabel} Climate</h3>
              <p class="ct-sys-sub">Warm-winter &amp; drought-resilient winners not yet in your palette — click any card for its full Field Dossier.</p>
            </div>
            <button
              type="button"
              class="ct-studio-btn"
              onClick={() => openPlantPool({ tab: 'all', banner: `Warm-adapted opportunities for ${horizonLabel}` })}
            >
              Explore all →
            </button>
          </div>
          <div class="ct-opp-grid-3">
            {report.opportunities.slice(0, 3).map((t) => {
              const sun = sunTierOf(t);
              const cold = t.climate?.tminCold?.low ?? -4;
              const hot = t.climate?.tmaxWarm?.high ?? 37;
              return (
                <article key={t.id} class="ct-opp-card-v14">
                  <div class="ct-opp-card-top">
                    <strong>{nameOf(t)}</strong>
                    <span class="ct-gantt-sun-pill" data-sun-tier={sun}>{sunTierLabel(t)}</span>
                  </div>
                  <p class="ct-small-text ct-muted">{t.canonical_name} · warm-adapted perennial companion</p>
                  <p class="ct-opp-note">
                    Honest note: Handles {Math.round(cold)} °C to {Math.round(hot)} °C
                    {t.traits.soil_ph ? ` · pH ${t.traits.soil_ph.min}–${t.traits.soil_ph.max}` : ''}.
                  </p>
                  <div class="ct-twin-acts">
                    <button type="button" class="ct-studio-btn" onClick={() => store.addMembers([t.id])}>+ Add</button>
                    <button type="button" class="ct-studio-btn" onClick={() => openFieldDossier(t.id, [t.id, ...memberIds])}>Dossier</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 4: 12-Month Climate Shift & Stress Windows (12 Monthly Column Cards) */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">4 · 12-Month Climate Shift &amp; Stress Windows (Today vs {horizonLabel})</h3>
            <p class="ct-sys-sub">Compare monthly afternoon highs and rainfall across your growing year, plus how many of your plants are active each month.</p>
          </div>
          <span class="ct-plan-meta-pill">{horizonLabel} projection</span>
        </div>

        <div class="ct-clim-legend">
          <span><i class="ct-cl-sw is-today" /> Today</span>
          <span><i class="ct-cl-sw is-fut" /> {horizonLabel} (mild/warm)</span>
          <span><i class="ct-cl-sw is-peak" /> Peak heat (≥ 32 °C)</span>
          <span><i class="ct-cl-sw is-rain" /> Monthly rain (mm)</span>
          <span><i class="ct-cl-sw is-win-bg" /> ❄ Winter rain window</span>
          <span><i class="ct-cl-sw is-sum-bg" /> ☀ Summer stress window</span>
        </div>

        <div class="ct-clim12-grid">
          {report.monthlyShift.map((m, i) => {
            const rainMm = Math.round(baseRain * rainWeights[i]);
            const isWinterWin = i <= 2 || i >= 10;
            const isSummerPeak = i === 6 || i === 7 || m.heatStress;
            const todayPct = Math.max(12, Math.round((Math.max(2, m.todayC) / maxMonthTemp) * 100));
            const futPct = Math.max(16, Math.round((Math.max(2, m.futureC) / maxMonthTemp) * 100));
            const rainPct = Math.max(12, Math.round((rainMm / maxMonthRain) * 100));
            const tag = i === 0 ? '❄ Winter rain' : i === 6 ? '☀ Peak stress' : i === 10 ? '• Sow window' : null;
            return (
              <div
                key={m.month}
                class={`ct-clim12-col${isSummerPeak ? ' is-stress' : isWinterWin ? ' is-winter' : ''}`}
              >
                <span class="ct-clim12-tag">{tag ?? '\u00a0'}</span>
                <div class="ct-clim12-temps">
                  <strong>{Math.round(m.futureC)}°</strong>
                  <span class="ct-muted">{Math.round(m.todayC)}°</span>
                </div>
                <div class="ct-clim12-bars" aria-hidden="true">
                  <span class="ct-clim12-b is-today" style={{ height: `${todayPct}%` }} />
                  <span class={`ct-clim12-b ${m.futureC >= 32 ? 'is-peak' : 'is-fut'}`} style={{ height: `${futPct}%` }} />
                </div>
                <div class="ct-clim12-rain-wrap" aria-hidden="true">
                  <span class="ct-clim12-rain" style={{ height: `${rainPct}%` }} />
                </div>
                <span class="ct-clim12-mm">{rainMm}mm</span>
                <strong class="ct-clim12-mo">{m.month}</strong>
                <span class="ct-clim12-act">{activeByMonth[i]} active</span>
              </div>
            );
          })}
        </div>

        <div class="ct-clim12-callouts">
          <div class="ct-clim12-note is-winter">
            <strong>❄ Mild-Winter Rain Window (Nov–Mar)</strong>
            <p>Use winter rain to establish roots &amp; grow cool-season crops before summer heat arrives.</p>
          </div>
          <div class="ct-clim12-note is-stress">
            <strong>☀ Peak Summer Stress Window (Jul–Aug)</strong>
            <p>Deep mulch, afternoon shade &amp; drought-hardy anchors protect your plot when highs reach {Math.round(hotFutureC)} °C.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
