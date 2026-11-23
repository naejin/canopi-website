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

    const SUN_CLS: Record<string, string> = {
      emergent: 'sun-full',
      high: 'sun-mostly',
      medium: 'sun-part',
      low: 'sun-shade',
    };
    const sunCls = SUN_CLS[sun] ?? 'sun-full';
    const pinColor = tone === 'danger' ? 'var(--risk-ink)' : 'var(--warn-dot)';

    return (
      <article key={item.taxon.id} class="triage-card" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
        <div class="tc-head">
          <div>
            <div class="tc-name">{nameOf(item.taxon)}</div>
            <div class="tc-latin">{item.taxon.canonical_name}</div>
          </div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:5px;">
            <span class={`sun-badge ${sunCls}`} style="font-size:11px;">{sunTierLabel(item.taxon)}</span>
            <span class={`traj-badge ${tone === 'danger' ? 'future-risk' : 'cold-start'}`}>{badgeLabel}</span>
          </div>
        </div>

        {/* Visual Thermal Comfort-Range Bar */}
        <div style="padding:8px 10px; border-radius:6px; background:var(--bg); border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; font-size:11.5px; margin-bottom:6px;">
            <span>Comfort max {Math.round(maxComfort)} °C</span>
            <span style={{ color: pinColor, fontWeight: 600 }}>
              {horizonLabel} {Math.round(hotFutureC)} °C ({margin < 0 ? `+${Math.abs(Math.round(margin))} °C over` : `${Math.round(margin)} °C margin`})
            </span>
          </div>
          <div class="gauge-track" aria-hidden="true">
            <div class="gauge-band" style={{ left: '0%', width: `${barEndPct}%` }} />
            <div class={`gauge-pin ${tone === 'danger' ? 'pin-risk' : 'pin-warn'}`} style={{ left: `${futurePinPct}%` }} />
          </div>
          <div class="gauge-scale">
            <span>18 °C</span>
            <span>30 °C</span>
            <span>44 °C</span>
          </div>
        </div>

        <div class="bp-signal-line" onClick={(e) => e.stopPropagation()}>
          <span class={`bp-pill ${tone === 'danger' ? 'breached' : 'warn'}`}>🔥 Heat dome: {maxComfort.toFixed(1)} °C</span>
          <span class="bp-pill">💧 Max dry: {maxDry}d</span>
          <FieldTip label="All 5 limits" text={item.allFiveLimits} glyph="All 5 limits ⓘ" />
        </div>

        <div class="tc-action-foot" onClick={(e) => e.stopPropagation()}>
          <div class="tc-tactic-line">
            <strong>{tone === 'danger' ? 'Field Insurance:' : 'Practical Field Care:'}</strong> {item.fieldInsurance}
          </div>

          {item.twinSwap ? (
            <div class="swap-preview-box">
              <div class="swap-preview-top">
                <span><strong>{nameOf(item.taxon)}</strong> → <strong style="color:var(--plant-green);">{nameOf(item.twinSwap)}</strong></span>
                <span class="verdict-tag v-fit" style="font-size:11px; padding:1px 6px;">Climate twin</span>
              </div>
              <div class="swap-preview-why">
                Same {sunTierLabel(item.taxon)} · thrives to {Math.round(item.twinSwap.climate?.tmaxWarm?.high ?? 37)} °C
                {item.twinSwap.traits.soil_ph ? ` & pH ${item.twinSwap.traits.soil_ph.min}–${item.twinSwap.traits.soil_ph.max}` : ''}
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
                <button type="button" class="btn btn-xs" onClick={() => doTwinSwap(item)}>⇄ Swap</button>
                <button type="button" class="btn btn-xs" onClick={() => openFieldDossier(item.twinSwap!.id, memberIds)}>Dossier</button>
              </div>
            </div>
          ) : (
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-xs" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>Dossier</button>
            </div>
          )}
        </div>
      </article>
    );
  };

  const breaksFirst = [...report.critical, ...report.watch].slice(0, 3);
  const SUN_CLS_MAP: Record<string, string> = {
    emergent: 'sun-full',
    high: 'sun-mostly',
    medium: 'sun-part',
    low: 'sun-shade',
  };

  const baseRain = sc?.today?.aridityIndex != null ? Math.round(Math.max(300, Math.min(1200, sc.today.aridityIndex * 650))) : 620;
  const rainWeights = [0.09, 0.08, 0.07, 0.08, 0.07, 0.04, 0.02, 0.03, 0.1, 0.15, 0.14, 0.13];
  const maxMonthTemp = Math.max(38, ...report.monthlyShift.map((m) => m.futureC));
  const maxMonthRain = Math.max(40, ...rainWeights.map((w) => Math.round(baseRain * w)));

  return (
    <section data-climate-2050-tab aria-label="2050 climate resilience analysis">
      {/* Section 1: v14 Serene Executive Climate Brief (verbatim .cb-hero) */}
      <div class="cb-hero">
        <div class="cb-top">
          <div class="cb-meta-line">
            <strong>{placeName}</strong>
            {sitePh != null && <><span>·</span><span>pH {sitePh.toFixed(1)}</span></>}
            <span class={report.novelClimate ? 'novel-pill' : 'match-pill'}>
              {report.novelClimate ? '⚠ Novel climate' : `${matchPct}% climate match`}
            </span>
            {!analogue && !report.novelClimate && (
              <button
                type="button"
                class="link-btn"
                style="font-size:12px; padding:1px 6px;"
                disabled={analogueState === 'loading' || !loc}
                onClick={() => void loadClimateTwin()}
              >
                {analogueState === 'loading' ? 'Checking twin…' : analogueState === 'done' ? 'No published twin yet' : 'Check Climate Twin'}
              </button>
            )}
          </div>
          <div class="cb-env-wrap">
            <span class="cb-env-lbl">Design for:</span>
            <div class="ink-seg" role="group" aria-label="Design envelope">
              <button
                type="button"
                class="ink-seg-btn"
                aria-pressed={envelope === 'typical' ? 'true' : 'false'}
                onClick={() => { designEnvelope.value = 'typical'; }}
              >
                {T('studio.climTypical')}
              </button>
              <button
                type="button"
                class="ink-seg-btn"
                aria-pressed={envelope === 'extreme10' ? 'true' : 'false'}
                onClick={() => { designEnvelope.value = 'extreme10'; }}
              >
                {T('studio.climExtreme')}
              </button>
            </div>
          </div>
        </div>

        <h2 class="cb-headline">
          By the {horizonLabel}, {placeName} feels like{' '}
          <span class="ch-twin-accent">
            {analogue ? `${analogue.name}, ${analogue.country}` : report.novelClimate ? 'a novel hot-summer regime' : 'a warmer southern analogue'}
          </span>{' '}
          today
        </h2>

        <div class="cb-verdict-grid">
          <div class="cb-verdict-col">
            <span class="cb-verdict-k">Your Palette Verdict ({envelope === 'extreme10' ? '1-in-10-yr Extreme' : `Typical ${horizonLabel}`})</span>
            <div class="cb-verdict-big">{fitCount} of {totalCount} plants thrive</div>
            <div class="resilience-bar" role="img" aria-label={`${fitCount} thrives, ${careCount} needs care, ${riskCount} at risk`}>
              {fitPct > 0 && <div class="res-seg fit" style={{ width: `${fitPct}%` }} />}
              {carePct > 0 && <div class="res-seg care" style={{ width: `${carePct}%` }} />}
              {riskPct > 0 && <div class="res-seg risk" style={{ width: `${riskPct}%` }} />}
            </div>
            <div class="res-legend">
              <button type="button" class="res-leg-btn" onClick={() => setTriageFilter('fit')}>
                <span class="res-dot" style="background:var(--plant-green);" />{fitCount} Thrives
              </button>
              <button type="button" class="res-leg-btn" onClick={() => setTriageFilter('care')}>
                <span class="res-dot" style="background:var(--warn-dot);" />{careCount} Needs care
              </button>
              <button type="button" class="res-leg-btn" onClick={() => setTriageFilter('risk')}>
                <span class="res-dot" style="background:var(--risk-ink);" />{riskCount} At risk
              </button>
            </div>
          </div>

          <div class="cb-forces-list" role="list" aria-label="Four key climate forces">
            {report.forces.map((f) => (
              <div key={f.label} class="cb-force-row" role="listitem">
                <span class="cb-force-k">{f.label}</span>
                <span class="cb-force-v"><strong>{f.today} → {f.future}</strong> · {f.delta}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="cb-opp-foot">
          <span>
            <strong>{mildWinter ? '❄ Mild-winter advantage:' : '❄ Winter window:'}</strong>{' '}
            {mildWinter
              ? `Nov–Mar stays frost-rare (${coldC.toFixed(1)} °C) — sow cool-season species in autumn to build deep roots before summer heat.`
              : `Winter floor reaches ${coldC.toFixed(1)} °C — focus on hardy bare-root stock in late autumn or early spring.`}
          </span>
          <button
            type="button"
            class="link-btn"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: 'Winter-plantable species for cool-season establishment' })}
          >
            Browse winter-plantable →
          </button>
        </div>
      </div>

      {/* Section 2: Compact 1-Row Stress Bar (verbatim .stress-bar-card) */}
      <div class="stress-bar-card" role="region" aria-label="Interactive extreme-year stress bar">
        <div class="sb-row1">
          <div class="sb-presets" role="group" aria-label="Compound climate stress presets">
            {STRESS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                class="scenario-btn"
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
          <div class="sb-actions">
            <button
              type="button"
              class="btn btn-xs"
              aria-expanded={labOpen ? 'true' : 'false'}
              onClick={() => setLabOpen((v) => !v)}
            >
              ⚙ {labOpen ? 'Hide 6 levers ▴' : T('studio.climLab')}
            </button>
          </div>
        </div>

        <div class="sr-impact-line" data-climate-impact>
          <span><strong>Live system impact:</strong> {report.impactLine}</span>
          {breaksFirst.length > 0 && (
            <span>
              <strong>Breaks first:</strong>{' '}
              {breaksFirst.map((it, idx) => (
                <span key={it.taxon.id}>
                  {idx > 0 ? ', ' : ''}
                  <button type="button" class="sr-inline-break" onClick={() => openFieldDossier(it.taxon.id, memberIds)}>
                    {nameOf(it.taxon)}
                  </button>
                </span>
              ))}
            </span>
          )}
        </div>

        {labOpen && (
          <div style="padding-top:6px; border-top:1px dashed var(--border);">
            <div class="extreme-sliders-grid">
              <div class="ext-slider-card">
                <div class="ext-slider-head"><span>Summer heatwave</span><strong>+{stress.heatDeltaC} °C</strong></div>
                <input class="tune-slider" type="range" min={0} max={6} step={0.5} value={stress.heatDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, heatDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
              </div>
              <div class="ext-slider-card">
                <div class="ext-slider-head"><span>Drought deficit</span><strong>+{stress.droughtPct}%</strong></div>
                <input class="tune-slider" type="range" min={0} max={60} step={5} value={stress.droughtPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, droughtPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
              </div>
              <div class="ext-slider-card">
                <div class="ext-slider-head"><span>Winter snap</span><strong>{stress.winterDeltaC} °C</strong></div>
                <input class="tune-slider" type="range" min={-8} max={2} step={0.5} value={stress.winterDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, winterDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
              </div>
              <div class="ext-slider-card">
                <div class="ext-slider-head"><span>False spring risk</span><strong>+{stress.falseSpringDeltaPct}%</strong></div>
                <input class="tune-slider" type="range" min={0} max={40} step={5} value={stress.falseSpringDeltaPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, falseSpringDeltaPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
              </div>
              <div class="ext-slider-card">
                <div class="ext-slider-head"><span>Drying wind</span><strong>{stress.windExposure}/3</strong></div>
                <input class="tune-slider" type="range" min={0} max={3} step={1} value={stress.windExposure} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, windExposure: Number((e.currentTarget as HTMLInputElement).value) }; }} />
              </div>
              <div class="ext-slider-card">
                <div class="ext-slider-head"><span>Heavy rain shift</span><strong>{stress.extremeRainPct >= 0 ? '+' : ''}{stress.extremeRainPct}%</strong></div>
                <input class="tune-slider" type="range" min={-30} max={40} step={5} value={stress.extremeRainPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, extremeRainPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
              </div>
            </div>
            <div style="margin-top:8px;">
              <button type="button" class="link-btn" onClick={() => { setActivePreset('baseline'); climateStress.value = { ...DEFAULT_CLIMATE_STRESS }; }}>
                ↺ Reset levers
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Triage Filter Bar + Rich Triage Cards */}
      <div class="canvas-bar" style="margin-top:16px;">
        <div class="ink-seg" role="group" aria-label="Filter triage by status">
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'all' ? 'true' : 'false'} onClick={() => setTriageFilter('all')}>
            All ({totalCount})
          </button>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'risk' ? 'true' : 'false'} onClick={() => setTriageFilter('risk')}>
            ✕ At Risk ({riskCount})
          </button>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'care' ? 'true' : 'false'} onClick={() => setTriageFilter('care')}>
            ⚠ Needs Adaptation ({careCount})
          </button>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'fit' ? 'true' : 'false'} onClick={() => setTriageFilter('fit')}>
            ✓ Thrives ({fitCount})
          </button>
        </div>
        <input
          type="search"
          class="field-input"
          style="width:220px; max-width:100%;"
          placeholder="Search plants in triage…"
          aria-label="Search plants in triage"
          value={triageQuery}
          onInput={(e) => setTriageQuery((e.currentTarget as HTMLInputElement).value)}
        />
      </div>

      {lastSwap && (
        <div class="cal-insight-bar" style="margin-bottom:12px;">
          <span>Swapped <strong>{lastSwap.fromName} → {lastSwap.toName}</strong></span>
          <button type="button" class="btn btn-xs" onClick={undoTwinSwap}>Undo</button>
        </div>
      )}

      {shownCritical.length > 0 && (
        <div class="system-section" style="border-color:var(--risk-ink);">
          <div class="sec-head">
            <div>
              <h3 style="color:var(--risk-ink);">✕ At Risk — Swap Ready ({shownCritical.length})</h3>
              <p class="sec-sub">Exceeds thermal comfort ceiling in {horizonLabel}. Swap individually or in one click with full Undo.</p>
            </div>
            {report.critical.some((it) => it.twinSwap) && (
              <button type="button" class="btn btn-xs btn-primary" onClick={swapAllAtRisk}>
                ⇄ Swap all {report.critical.length} at-risk
              </button>
            )}
          </div>
          <div class="triage-grid">
            {shownCritical.map((it) => renderTriageCard(it, 'danger'))}
          </div>
        </div>
      )}

      {shownWatch.length > 0 && (
        <div class="system-section" style="border-color:var(--warn-line);">
          <div class="sec-head">
            <div>
              <h3 style="color:var(--warn-ink);">⚠ Needs Adaptation — Practical Field Care ({shownWatch.length})</h3>
              <p class="sec-sub">Can still succeed on your land with targeted microsite care, mulch, or soil buffering.</p>
            </div>
          </div>
          <div class="triage-grid">
            {shownWatch.map((it) => renderTriageCard(it, 'warn'))}
          </div>
        </div>
      )}

      {(triageFilter === 'all' || triageFilter === 'fit') && (
        <details class="group-details" open={holdsOpen || triageFilter === 'fit'} onToggle={(e) => setHoldsOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary>
            <span style="color:var(--plant-green);">✓ Holds Strong ({shownFit.length} species thrive in {horizonLabel} climate)</span>
            <span class="nav-count">Show {shownFit.length} species ▾</span>
          </summary>
          <div class="group-inner">
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">
              {shownFit.map((it) => (
                <button
                  key={it.taxon.id}
                  type="button"
                  class="link-btn"
                  style="text-align:left; justify-content:flex-start;"
                  onClick={() => openFieldDossier(it.taxon.id, memberIds)}
                >
                  <strong>{nameOf(it.taxon)}</strong>{' '}
                  <span style="font-style:italic; color:var(--ink-muted); font-size:12px;">{it.taxon.canonical_name}</span>
                </button>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Newly Thriving Opportunities 3-Column Card Section */}
      {report.opportunities.length > 0 && (
        <div class="system-section">
          <div class="sec-head">
            <div>
              <h3>✦ Newly Thriving Opportunities in Your {horizonLabel} Climate</h3>
              <p class="sec-sub">Warm-winter &amp; drought-resilient winners not yet in your palette — click any card for its full Field Dossier.</p>
            </div>
            <button
              type="button"
              class="btn btn-xs"
              onClick={() => openPlantPool({ tab: 'all', banner: `Warm-adapted opportunities for ${horizonLabel}` })}
            >
              Explore all →
            </button>
          </div>
          <div class="opp-grid">
            {report.opportunities.slice(0, 3).map((t) => {
              const sun = sunTierOf(t);
              const cold = t.climate?.tminCold?.low ?? -4;
              const hot = t.climate?.tmaxWarm?.high ?? 37;
              return (
                <article key={t.id} class="opp-card">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
                    <strong style="font-family:var(--font-display); font-size:15.5px;">{nameOf(t)}</strong>
                    <span class={`sun-badge ${SUN_CLS_MAP[sun] ?? 'sun-full'}`} style="font-size:11px;">{sunTierLabel(t)}</span>
                  </div>
                  <p style="margin:0; font-size:12.5px; color:var(--ink-soft);">{t.canonical_name} · warm-adapted perennial companion</p>
                  <p style="margin:0; font-size:12px; color:var(--ink-muted);">
                    Honest note: Handles {Math.round(cold)} °C to {Math.round(hot)} °C
                    {t.traits.soil_ph ? ` · pH ${t.traits.soil_ph.min}–${t.traits.soil_ph.max}` : ''}.
                  </p>
                  <div style="display:flex; gap:6px; margin-top:auto;">
                    <button type="button" class="btn btn-xs" onClick={() => store.addMembers([t.id])}>+ Add</button>
                    <button type="button" class="btn btn-xs" onClick={() => openFieldDossier(t.id, [t.id, ...memberIds])}>Dossier</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 4: 12-Month Climate Shift & Stress Windows (verbatim .cshift-chart) */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>4 · 12-Month Climate Shift &amp; Stress Windows (Today vs {horizonLabel})</h2>
            <p class="sec-sub">Compare monthly afternoon highs and rainfall across your growing year, plus how many of your plants are active each month.</p>
          </div>
          <span class="why-tag">{horizonLabel} projection</span>
        </div>

        <div class="legend-row" aria-label="12-month climate shift legend">
          <span class="legend-item"><span class="legend-swatch" style="background:var(--border-strong); opacity:0.75;" />Today</span>
          <span class="legend-item"><span class="legend-swatch" style="background:var(--accent);" />{horizonLabel} (mild/warm)</span>
          <span class="legend-item"><span class="legend-swatch" style="background:var(--risk-ink);" />Peak heat (≥ 32 °C)</span>
          <span class="legend-item"><span class="legend-swatch" style="background:var(--cal-winter); opacity:0.65;" />Monthly rain (mm)</span>
          <span class="legend-item"><span class="legend-swatch" style="background:var(--winter-bg); border:1px solid var(--winter-line);" />❄ Winter rain window</span>
          <span class="legend-item"><span class="legend-swatch" style="background:var(--risk-bg); border:1px solid var(--risk-ink);" />☀ Summer stress window</span>
        </div>

        <div class="cshift-wrap">
          <div class="cshift-chart" role="list" aria-label="12-month temperature and rainfall comparison">
            {report.monthlyShift.map((m, i) => {
              const rainMm = Math.round(baseRain * rainWeights[i]);
              const isWinterWin = i <= 2 || i >= 10;
              const isSummerPeak = i === 6 || i === 7 || m.heatStress;
              const hToday = Math.max(10, Math.round((Math.max(2, m.todayC) / maxMonthTemp) * 86));
              const hFut = Math.max(10, Math.round((Math.max(2, m.futureC) / maxMonthTemp) * 86));
              const hRain = Math.max(3, Math.round((rainMm / maxMonthRain) * 20));
              const futCls = m.futureC >= 32 ? 'hot' : isWinterWin ? 'mild' : '';
              const bandCls = isSummerPeak ? 'stress-band' : isWinterWin ? 'win-band' : '';
              const tag = i === 0 ? { cls: 'win', text: '❄ Winter rain' }
                : i === 6 ? { cls: 'stress', text: '☀ Peak stress' }
                : i === 10 ? { cls: 'win', text: '❄ Sow window' } : null;
              return (
                <div key={m.month} class={`cshift-col ${bandCls}`} role="listitem">
                  {tag ? <span class={`cshift-band-tag ${tag.cls}`}>{tag.text}</span> : null}
                  <div class="cshift-temps">
                    <span>{Math.round(m.futureC)}°</span>
                    <span class="t-old">{Math.round(m.todayC)}°</span>
                  </div>
                  <div class="cshift-bars" aria-hidden="true">
                    <span class="cshift-bar today" style={{ height: `${hToday}px` }} />
                    <span class={`cshift-bar future ${futCls}`} style={{ height: `${hFut}px` }} />
                  </div>
                  <div class="cshift-rain-wrap" aria-hidden="true">
                    <span class="cshift-rain-bar" style={{ height: `${hRain}px` }} />
                  </div>
                  <div class="cshift-rain-mm">{rainMm}mm</div>
                  <div class="cshift-mo">{m.month}</div>
                  <div class="cshift-active">{activeByMonth[i]} active</div>
                </div>
              );
            })}
          </div>
        </div>

        <div class="cshift-windows-grid">
          <div class="cshift-win-card winter">
            <strong style="color:var(--winter-ink);">❄ Mild-Winter Rain Window (Nov–Mar)</strong><br />
            Use winter rain to establish roots &amp; grow cool-season crops before summer heat arrives.
          </div>
          <div class="cshift-win-card summer">
            <strong style="color:var(--risk-ink);">☀ Peak Summer Stress Window (Jul–Aug)</strong><br />
            Deep mulch, afternoon shade &amp; drought-hardy anchors protect your plot when highs reach {Math.round(hotFutureC)} °C.
          </div>
        </div>
      </div>
    </section>
  );
}
