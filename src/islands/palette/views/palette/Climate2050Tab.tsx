/** @jsxImportSource preact */
// 2050 Climate Tab (Stage 1B — direct 1:1 port of v14 mockup-04-climate-full.png):
// - Section 1: Serene Executive Brief Card
// - Section 2: Compound Stress Preset Bar + Live Impact + 6-Lever Extremes Lab
// - Section 3: Rich Plant Triage Cards (thermal comfort-range bar, breaking-point pills, Field Insurance,
//              inline Climate Twin swap box) + Collapsible Holds Strong + 3-col Newly Thriving Opportunities
// - Section 4: 12-Month Climate Shift & Stress Windows (12 monthly column cards with paired Today vs 2050s
//              bars, rainfall mm bars, seasonal window tags, active plant counts + 2 bottom summary callouts)
import { useEffect, useMemo, useState } from 'preact/hooks';
import { siteClimate as climateOf, type PlantId } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import {
  climateStress,
  DEFAULT_CLIMATE_STRESS,
  designEnvelope,
  microclimate,
  openFieldDossier,
  openPlantPool,
  studioTab,
} from '../../state/studio.ts';
import {
  analogueStatus,
  loadSiteAnalogues,
  loadSiteMonthly,
  siteAnalogue,
  syncWasmTrajectories,
  wasmMicro,
  wasmTrajectories,
} from '../../state/climate-v07.ts';
import { countryName, nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import {
  evaluateClimate2050,
  STRESS_PRESETS,
  type PlantTriageItem,
} from '../../rules/studio-analysis.ts';
import { activityMonthsOf, sunTierLabel, sunTierOf } from '../../rules/studio-filters.ts';
import { formatFreezeTag, signedTemp1, siteClimateProfile } from '../../rules/climate-words.ts';

type TriageFilter = 'all' | 'risk' | 'care' | 'fit';

const clampPct = (v: number, lo: number, hi: number): number =>
  Math.max(2, Math.min(98, Math.round(((v - lo) / (hi - lo)) * 100)));

export function Climate2050Tab() {
  const members = store.memberTaxa.value;
  const catalog = store.allCatalog.value.length ? store.allCatalog.value : (store.fitPool.value ?? store.pool.value ?? []);
  const loc = store.location.value;
  const period = store.period.value;
  const envelope = designEnvelope.value;
  const stress = climateStress.value;
  const mc = microclimate.value;
  const edits = store.siteEdits.value;

  const [labOpen, setLabOpen] = useState(false);
  const [holdsOpen, setHoldsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('baseline');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(6);
  const [triageFilter, setTriageFilter] = useState<TriageFilter>('all');
  const [triageQuery, setTriageQuery] = useState('');
  const [lastSwap, setLastSwap] = useState<{ from: PlantId; to: PlantId; fromName: string; toName: string } | null>(null);

  const targetHorizon: '2041-2070' | '2071-2099' = period === '2071-2099' ? '2071-2099' : '2041-2070';
  const locKey = loc ? `${loc.lat.toFixed(3)},${loc.lon.toFixed(3)}` : '';
  const liveAnalogue = siteAnalogue.value;
  const liveAnalogueStatus = analogueStatus.value;
  const liveTrajs = wasmTrajectories.value;

  // Tier 2B on-demand monthly curves + analogues.bin + Rust WASM evaluateTrajectory()
  useEffect(() => {
    if (!loc?.lookup?.climate) return;
    void loadSiteMonthly(loc);
    void loadSiteAnalogues(loc, targetHorizon);
  }, [locKey, targetHorizon]);

  useEffect(() => {
    if (!loc?.lookup?.climate || !members.length) return;
    void syncWasmTrajectories(members, loc, stress.winterDeltaC, stress.heatDeltaC);
  }, [locKey, members, stress.winterDeltaC, stress.heatDeltaC]);

  const analogueNovel = liveAnalogue?.result.novel_climate ?? null;
  const report = useMemo(
    () => evaluateClimate2050(members, catalog, loc, period, envelope, stress, mc, edits, liveTrajs, analogueNovel),
    [members, catalog, loc, period, envelope, stress, mc, edits, liveTrajs, analogueNovel],
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
        <p class="ct-muted">{T('studio.clim.empty')}</p>
        <div><button type="button" class="ct-card-act" onClick={() => { studioTab.value = 'palette'; }}>{T('studio.clim.goPalette')}</button></div>
      </section>
    );
  }

  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const profile = siteClimateProfile(loc, store.climate.value, mc, edits, wasmMicro.value);
  const coldC = profile.typicalColdNightC ?? 0;
  const hotTodayC = profile.typicalWarmHighC ?? 29;
  const hotFutureC = Math.round((hotTodayC + (period === '2071-2099' ? 3.4 : 2.1) + (envelope === 'extreme10' ? 2.5 : 0) + stress.heatDeltaC) * 10) / 10;
  const sitePh = profile.ph;
  const freezeTodayTag = profile.coldFreeze10yrC != null
    ? formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst)
    : `~${(coldC - 8.5).toFixed(1)} °C`;
  const placeName = loc?.label ?? T('studio.common.yourSite');
  const horizonLabel = period === '2071-2099' ? T('studio.horizon.2080s') : T('studio.horizon.2050s');
  const bestMatch = liveAnalogue?.result.matches[0] ?? null;
  const bestSigma = liveAnalogue?.result.best_sigma ?? bestMatch?.sigma ?? null;
  const matchPct = report.novelClimate
    ? null
    : bestSigma != null
      ? Math.max(55, Math.min(99, Math.round(100 - bestSigma * 18)))
      : 88;
  const bestTwinLabel = bestMatch
    ? `${bestMatch.iso_a2 ? countryName(bestMatch.iso_a2) : bestMatch.koppen} (${bestMatch.lat.toFixed(1)}°, ${bestMatch.lon.toFixed(1)}° · ${bestMatch.koppen})`
    : null;

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
    await loadSiteAnalogues(loc, targetHorizon);
  };

  const renderTriageCard = (item: PlantTriageItem, tone: 'danger' | 'warn') => {
    const maxComfort = item.taxon.climate?.tmaxWarm?.high ?? 34;
    const margin = Math.round((maxComfort - hotFutureC) * 10) / 10;
    const barEndPct = clampPct(maxComfort, 18, 44);
    const futurePinPct = clampPct(hotFutureC, 18, 44);
    const sun = sunTierOf(item.taxon);
    const maxDry = item.taxon.traits.drought_tolerance && /high/i.test(item.taxon.traits.drought_tolerance) ? 60 : 32;
    const badgeLabel = item.code === 'ColdEstablishmentBarrier'
      ? T('studio.v07.trajCold')
      : item.code === 'FutureMaturityRisk'
        ? T('studio.v07.trajFuture')
        : item.code === 'NovelClimate'
          ? T('studio.v07.trajNovel')
          : margin < 0
            ? T('studio.clim.crossesHeat')
            : T('studio.clim.nearLimit');

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
            <span>{T('studio.clim.comfortMax', { temp: `${Math.round(maxComfort)} °C` })}</span>
            <span style={{ color: pinColor, fontWeight: 600 }}>
              {horizonLabel} {Math.round(hotFutureC)} °C ({margin < 0 ? T('studio.clim.overBy', { diff: `+${Math.abs(Math.round(margin))} °C` }) : T('studio.clim.marginOf', { diff: `${Math.round(margin)} °C` })})
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
          <span class={`bp-pill ${tone === 'danger' ? 'breached' : 'warn'}`}>{T('studio.dossier.pillHeat', { temp: `${maxComfort.toFixed(1)} °C` })}</span>
          <span class="bp-pill">{T('studio.dossier.pillDry', { days: maxDry })}</span>
          <FieldTip label={T('studio.clim.allFive')} text={item.allFiveLimits} glyph={`${T('studio.clim.allFive')} ⓘ`} />
        </div>

        <div class="tc-action-foot" onClick={(e) => e.stopPropagation()}>
          <div class="tc-tactic-line">
            <strong>{tone === 'danger' ? T('studio.clim.fieldIns') : T('studio.clim.fieldCare')}</strong> {item.fieldInsurance}
          </div>

          {item.twinSwap ? (
            <div class="swap-preview-box">
              <div class="swap-preview-top">
                <span><strong>{nameOf(item.taxon)}</strong> → <strong style="color:var(--plant-green);">{nameOf(item.twinSwap)}</strong></span>
                <span class="verdict-tag v-fit" style="font-size:11px; padding:1px 6px;">{T('studio.clim.twinBadge')}</span>
              </div>
              <div class="swap-preview-why">
                {T('studio.clim.twinWhy', { sun: sunTierLabel(item.taxon), temp: `${Math.round(item.twinSwap.climate?.tmaxWarm?.high ?? 37)} °C` })}
                {item.twinSwap.traits.soil_ph ? ` & pH ${item.twinSwap.traits.soil_ph.min}–${item.twinSwap.traits.soil_ph.max}` : ''}
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:2px;">
                <button type="button" class="btn btn-xs" onClick={() => doTwinSwap(item)}>{T('studio.cards.swap')}</button>
                <button type="button" class="btn btn-xs" onClick={() => openFieldDossier(item.twinSwap!.id, memberIds)}>{T('studio.dossierShort')}</button>
              </div>
            </div>
          ) : (
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-xs" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>{T('studio.dossierShort')}</button>
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

  const v07Mo = loc?.lookup?.v07?.monthly ?? null;
  const baseRain = sc?.today?.aridityIndex != null ? Math.round(Math.max(300, Math.min(1200, sc.today.aridityIndex * 650))) : 620;
  const rainWeights = [0.09, 0.08, 0.07, 0.08, 0.07, 0.04, 0.02, 0.03, 0.1, 0.15, 0.14, 0.13];
  const monthRainToday = v07Mo ? [...v07Mo.precipTodayMm] : rainWeights.map((w) => Math.round(baseRain * w));
  const monthRainFuture = v07Mo
    ? v07Mo.precip2050Mm.map((mm, i) => {
        const isWarmDry = i >= 4 && i <= 8;
        const droughtFactor = isWarmDry ? Math.max(0.2, 1 - stress.droughtPct / 100) : Math.max(0.45, 1 - (stress.droughtPct * 0.4) / 100);
        const rainShift = isWarmDry ? 1 : Math.max(0.5, 1 + stress.extremeRainPct / 100);
        return Math.max(2, Math.round(mm * droughtFactor * rainShift));
      })
    : rainWeights.map((w, i) => {
        const isWarmDry = i >= 4 && i <= 8;
        const droughtFactor = isWarmDry ? Math.max(0.2, 1 - stress.droughtPct / 100) : Math.max(0.45, 1 - (stress.droughtPct * 0.4) / 100);
        const rainShift = isWarmDry ? 1 : Math.max(0.5, 1 + stress.extremeRainPct / 100);
        return Math.max(2, Math.round(baseRain * w * droughtFactor * rainShift));
      });
  const maxMonthTemp = Math.max(38, ...report.monthlyShift.map((m) => m.futureC));
  const maxMonthRain = Math.max(40, ...monthRainToday, ...monthRainFuture);

  const activeScenarioTags: string[] = [];
  if (envelope === 'extreme10') activeScenarioTags.push(T('studio.climExtreme'));
  if (stress.heatDeltaC > 0) activeScenarioTags.push(`+${stress.heatDeltaC}°C`);
  if (stress.droughtPct > 0) activeScenarioTags.push(`-${stress.droughtPct}%`);
  if (stress.winterDeltaC < 0) activeScenarioTags.push(`${stress.winterDeltaC}°C`);
  if (stress.falseSpringDeltaPct > 0) activeScenarioTags.push(`+${stress.falseSpringDeltaPct}%`);
  if (stress.windExposure > 0) activeScenarioTags.push(`${stress.windExposure}/3`);
  if (stress.extremeRainPct !== 0) activeScenarioTags.push(`${stress.extremeRainPct > 0 ? '+' : ''}${stress.extremeRainPct}%`);
  const scenarioBadge = activeScenarioTags.length
    ? `${horizonLabel} · ${activeScenarioTags.slice(0, 2).join(' · ')}`
    : T('studio.clim.projBadge', { horizon: horizonLabel });
  const simWinterFloorC = Math.round((coldC + stress.winterDeltaC - (envelope === 'extreme10' ? 3.5 : 0)) * 10) / 10;

  const selectedMonthInfo = selectedMonth != null ? (() => {
    const m = report.monthlyShift[selectedMonth];
    const rToday = monthRainToday[selectedMonth];
    const rFut = monthRainFuture[selectedMonth];
    const isWinterWin = selectedMonth <= 2 || selectedMonth >= 10;
    const isSpring = selectedMonth >= 2 && selectedMonth <= 4;
    const isHeat = m.futureC >= 32 || selectedMonth === 6 || selectedMonth === 7;
    const stressedInMonth = members.filter((t) => {
      const limHot = t.climate?.tmaxWarm?.high ?? 34;
      const limCold = t.climate?.tminCold?.low ?? -6;
      return (isHeat && m.futureC > limHot) || (isWinterWin && simWinterFloorC < limCold);
    });
    const takeaway = isHeat
      ? T('studio.clim.tkHeat', { temp: `${Math.round(m.futureC)} °C`, rain: `${rFut} mm` })
      : isSpring && stress.falseSpringDeltaPct > 0
      ? T('studio.clim.tkSpring', { pct: stress.falseSpringDeltaPct })
      : isWinterWin && simWinterFloorC >= 3.5
      ? T('studio.clim.tkWinMild', { rain: `${rFut} mm` })
      : isWinterWin && simWinterFloorC >= 0
      ? T('studio.clim.tkWinCool', { rain: `${rFut} mm`, night: signedTemp1(simWinterFloorC) })
      : isWinterWin
      ? T('studio.clim.tkWinDorm', { night: signedTemp1(simWinterFloorC) })
      : T('studio.clim.tkTrans', { temp: `${Math.round(m.futureC)} °C`, rain: `${rFut} mm` });
    return { m, rToday, rFut, stressedCount: stressedInMonth.length, stressedNames: stressedInMonth.slice(0, 3).map((t) => nameOf(t)), takeaway };
  })() : null;

  return (
    <section data-climate-2050-tab aria-label={T('studio.clim.aria')}>
      {/* Section 1: v14 Serene Executive Climate Brief (verbatim .cb-hero) */}
      <div class="cb-hero">
        <div class="cb-top">
          <div class="cb-meta-line">
            <strong>{placeName}</strong>
            {sitePh != null && <><span>·</span><span>pH {sitePh.toFixed(1)} ({profile.phReaction})</span></>}
            <span class={report.novelClimate ? 'novel-pill' : 'match-pill'}>
              {report.novelClimate ? T('studio.clim.novelPill') : T('studio.clim.matchPill', { pct: matchPct ?? 88 })}
            </span>
            {!bestTwinLabel && !report.novelClimate && (
              <button
                type="button"
                class="link-btn"
                style="font-size:12px; padding:1px 6px;"
                disabled={liveAnalogueStatus === 'loading' || !loc}
                onClick={() => void loadClimateTwin()}
              >
                {liveAnalogueStatus === 'loading' ? T('studio.clim.checkingTwin') : liveAnalogueStatus === 'unavailable' ? T('studio.clim.noTwin') : T('studio.clim.checkTwin')}
              </button>
            )}
          </div>
          <div class="cb-env-wrap">
            <span class="cb-env-lbl">{T('studio.clim.designFor')}</span>
            <div class="ink-seg" role="group" aria-label={T('studio.clim.envAria')}>
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
          {T('studio.clim.headline', {
            horizon: horizonLabel,
            place: placeName,
            twin: bestTwinLabel ?? (report.novelClimate ? T('studio.clim.novelRegime') : T('studio.clim.warmerAnalogue')),
          })}
        </h2>

        {/* Engine 4: Real in-browser analogues.bin Climate Twin Card */}
        {(liveAnalogue || report.novelClimate) && (
          <div class={`analogue-card${report.novelClimate ? ' is-novel' : ''}`} data-climate-analogue-card>
            <div>
              <div class="sc-inline" style="margin-bottom:4px;">
                {report.novelClimate ? (
                  <>
                    <span class="pill is-warn">⚠ {T('studio.v07.novelBadge', { sigma: bestSigma != null ? `${bestSigma.toFixed(2)}σ` : '> 2.0σ' })}</span>
                    <strong>{T('studio.v07.novelHead')}</strong>
                  </>
                ) : (
                  <>
                    <span class="pill is-green">✓ {T('studio.clim.matchPill', { pct: matchPct ?? 88 })}</span>
                    <strong>{horizonLabel} SSP2-4.5 → {bestTwinLabel}</strong>
                  </>
                )}
              </div>
              <div style="font-size:13px; color:var(--ink-soft);">
                {report.novelClimate
                  ? T('studio.v07.novelDesc')
                  : bestMatch
                    ? T('studio.v07.analogueDesc', { km: `${Math.round(bestMatch.distance_km)} km`, koppen: bestMatch.koppen })
                    : ''}
              </div>
            </div>
            <div class="analogue-stats">
              {bestSigma != null && <span>{T('studio.v07.analogueDist')} <strong>{bestSigma.toFixed(2)}σ</strong></span>}
              <span>{T('studio.v07.analogueIndex')} <strong>analogues.bin</strong></span>
              {liveAnalogue && <span>{T('studio.v07.analogueQuery')} <strong>{liveAnalogue.queryMs} ms</strong></span>}
            </div>
          </div>
        )}

        {/* Engine 4: 4-Tile Fishman Chill & v0.7.0 Extremes Strip */}
        {profile.hasLive && (
          <div class="metrics-strip" data-v07-metrics-strip>
            <div class="metric-tile">
              <div class="metric-tile-lbl">{T('studio.v07.tileChill')}</div>
              <div class="metric-tile-val">
                {profile.chillTodayCP != null
                  ? `${profile.chillTodayCP} → ${profile.chill2050CP ?? '—'} → ${profile.chill2080CP ?? '—'} CP`
                  : '—'}
              </div>
              <div class="metric-tile-sub">
                {profile.chill2050CP != null && profile.chill2050CP < 45
                  ? T('studio.v07.chillLowAdvice')
                  : T('studio.v07.chillFullAdvice')}
              </div>
            </div>
            <div class="metric-tile">
              <div class="metric-tile-lbl">{T('studio.v07.tileHeat')}</div>
              <div class="metric-tile-val">
                {profile.heatPeak10yrC != null
                  ? `${profile.heatPeak10yrC.toFixed(1)} → ${(loc?.lookup?.v07?.extremesTail?.heatDome10yr2050C ?? (profile.heatPeak10yrC + 2.4)).toFixed(1)} °C`
                  : `${hotTodayC.toFixed(1)} → ${hotFutureC.toFixed(1)} °C`}
              </div>
              <div class="metric-tile-sub">
                {profile.heatDays35 != null
                  ? T('studio.v07.heatDays35', { n: profile.heatDays35.toFixed(1) })
                  : T('studio.clim.forcePeak')}
              </div>
            </div>
            <div class="metric-tile">
              <div class="metric-tile-lbl">{T('studio.v07.tileWater')}</div>
              <div class="metric-tile-val">
                {profile.cwdP90Mm != null ? `CWD ${profile.cwdP90Mm} mm` : `${profile.dryStreakDays ?? '—'} d`}
              </div>
              <div class="metric-tile-sub">
                {profile.vpdSummerKpa != null
                  ? `VPD ${profile.vpdSummerKpa.toFixed(2)} kPa · ${profile.dryStreakDays ?? '—'}d`
                  : T('studio.clim.forceDry')}
              </div>
            </div>
            <div class="metric-tile">
              <div class="metric-tile-lbl">{T('studio.v07.tileFreeze')}</div>
              <div class="metric-tile-val">
                {profile.coldFreeze10yrC != null
                  ? `${profile.coldFreeze10yrC.toFixed(1)} → ${(loc?.lookup?.v07?.extremesTail?.coldTail10yr2050C ?? (profile.coldFreeze10yrC + 1.8)).toFixed(1)} °C`
                  : freezeTodayTag}
              </div>
              <div class="metric-tile-sub">
                {profile.falseSpringPct != null ? `${T('studio.postcard.falseSpring', { pct: profile.falseSpringPct })}` : profile.winterClass}
                {profile.lastSpringFrostLabel ? ` · ${profile.lastSpringFrostLabel}` : ''}
              </div>
            </div>
          </div>
        )}

        <div class="cb-verdict-grid">
          <div class="cb-verdict-col">
            <span class="cb-verdict-k">{T('studio.clim.verdictK', { mode: envelope === 'extreme10' ? T('studio.climExtreme') : T('studio.clim.typicalH', { horizon: horizonLabel }) })}</span>
            <div class="cb-verdict-big">{T('studio.clim.verdictBig', { fit: fitCount, total: totalCount })}</div>
            <div class="resilience-bar" role="img" aria-label={`${fitCount} ${T('studio.status.fit')}, ${careCount} ${T('studio.status.care')}, ${riskCount} ${T('studio.status.risk')}`}>
              {fitPct > 0 && <div class="res-seg fit" style={{ width: `${fitPct}%` }} />}
              {carePct > 0 && <div class="res-seg care" style={{ width: `${carePct}%` }} />}
              {riskPct > 0 && <div class="res-seg risk" style={{ width: `${riskPct}%` }} />}
            </div>
            <div class="res-legend">
              <button type="button" class="res-leg-btn" onClick={() => setTriageFilter('fit')}>
                <span class="res-dot" style="background:var(--plant-green);" />{fitCount} {T('studio.status.fit')}
              </button>
              <button type="button" class="res-leg-btn" onClick={() => setTriageFilter('care')}>
                <span class="res-dot" style="background:var(--warn-dot);" />{careCount} {T('studio.status.care')}
              </button>
              <button type="button" class="res-leg-btn" onClick={() => setTriageFilter('risk')}>
                <span class="res-dot" style="background:var(--risk-ink);" />{riskCount} {T('studio.status.risk')}
              </button>
            </div>
          </div>

          <div class="cb-forces-list" role="list" aria-label={T('studio.clim.forcesAria')}>
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
            {profile.winterTier === 'mild' ? (
              <>
                <strong>{T('studio.winter.mildHead')}</strong>{' '}
                {T('studio.winter.mildBody', { season: profile.winterSeason, month: profile.coldMonth, night: signedTemp1(coldC) })}
              </>
            ) : profile.winterTier === 'cool' ? (
              <>
                <strong>{T('studio.winter.coolHead')}</strong>{' '}
                {T('studio.winter.coolBody', { freeze: freezeTodayTag })}
              </>
            ) : (
              <>
                <strong>{T('studio.winter.dormantHead')}</strong>{' '}
                {T('studio.winter.dormantBody', { month: profile.coldMonth, night: signedTemp1(coldC) })}
              </>
            )}
          </span>
          <button
            type="button"
            class="link-btn"
            onClick={() => openPlantPool({ tab: 'all', intent: 'winter', banner: T('studio.sys.browseWinterBanner') })}
          >
            {T('studio.clim.browseWinterArrow')}
          </button>
        </div>
        {/* Unified Interactive Stress Presets + Extremes Lab (6 levers) inside the same .cb-hero frame */}
        <div style="border-top:1px solid var(--border); margin-top:14px; padding-top:14px;" role="region" aria-label={T('studio.clim.stressBarAria')}>
          <div class="sb-row1">
            <div class="sb-presets" role="group" aria-label={T('studio.clim.presetsAria')}>
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
                  {T(`studio.preset.${p.id}`)}
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
                ⚙ {labOpen ? T('studio.clim.hideLevers') : T('studio.climLab')}
              </button>
            </div>
          </div>

          <div class="sr-impact-line" style="margin-top:8px;" data-climate-impact>
            <span><strong>{T('studio.clim.liveImpact')}</strong> {report.impactLine}</span>
            {breaksFirst.length > 0 && (
              <span>
                <strong>{T('studio.clim.breaksFirst')}</strong>{' '}
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
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border);">
              <div class="extreme-sliders-grid">
                <div class="ext-slider-card">
                  <div class="ext-slider-head"><span>{T('studio.clim.levHeat')}</span><strong>+{stress.heatDeltaC} °C</strong></div>
                  <input class="tune-slider" type="range" min={0} max={6} step={0.5} value={stress.heatDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, heatDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
                </div>
                <div class="ext-slider-card">
                  <div class="ext-slider-head"><span>{T('studio.clim.levDrought')}</span><strong>+{stress.droughtPct}%</strong></div>
                  <input class="tune-slider" type="range" min={0} max={60} step={5} value={stress.droughtPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, droughtPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
                </div>
                <div class="ext-slider-card">
                  <div class="ext-slider-head"><span>{T('studio.clim.levWinter')}</span><strong>{stress.winterDeltaC} °C</strong></div>
                  <input class="tune-slider" type="range" min={-8} max={2} step={0.5} value={stress.winterDeltaC} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, winterDeltaC: Number((e.currentTarget as HTMLInputElement).value) }; }} />
                </div>
                <div class="ext-slider-card">
                  <div class="ext-slider-head"><span>{T('studio.clim.levSpring')}</span><strong>+{stress.falseSpringDeltaPct}%</strong></div>
                  <input class="tune-slider" type="range" min={0} max={40} step={5} value={stress.falseSpringDeltaPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, falseSpringDeltaPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
                </div>
                <div class="ext-slider-card">
                  <div class="ext-slider-head"><span>{T('studio.clim.levWind')}</span><strong>{stress.windExposure}/3</strong></div>
                  <input class="tune-slider" type="range" min={0} max={3} step={1} value={stress.windExposure} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, windExposure: Number((e.currentTarget as HTMLInputElement).value) }; }} />
                </div>
                <div class="ext-slider-card">
                  <div class="ext-slider-head"><span>{T('studio.clim.levRain')}</span><strong>{stress.extremeRainPct >= 0 ? '+' : ''}{stress.extremeRainPct}%</strong></div>
                  <input class="tune-slider" type="range" min={-30} max={40} step={5} value={stress.extremeRainPct} onInput={(e) => { setActivePreset('custom'); climateStress.value = { ...stress, extremeRainPct: Number((e.currentTarget as HTMLInputElement).value) }; }} />
                </div>
              </div>
              <div style="margin-top:8px;">
                <button type="button" class="link-btn" onClick={() => { setActivePreset('baseline'); climateStress.value = { ...DEFAULT_CLIMATE_STRESS }; }}>
                  {T('studio.clim.resetLevers')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live 12-Month Climate Shift & Stress Windows directly inside the same .cb-hero Simulation Frame */}
        <div style="border-top:1px solid var(--border); margin-top:14px; padding-top:14px;" data-climate-shift-studio>
          <div class="sec-head" style="margin-bottom:8px;">
            <div>
              <h3 style="margin:0; font-size:17px;">{T('studio.clim.shiftTitle', { horizon: horizonLabel })}</h3>
              <p class="sec-sub" style="margin:2px 0 0;">{T('studio.clim.shiftSub', { horizon: horizonLabel })}</p>
            </div>
            <span class={`why-tag${activeScenarioTags.length ? ' is-live' : ''}`} data-climate-scenario-badge>{scenarioBadge}</span>
          </div>

          <div class="legend-row" aria-label={T('studio.clim.shiftLegAria')}>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--border-strong); opacity:0.75;" />{T('studio.horizon.today')}</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--accent);" />{T('studio.clim.legHorizon', { horizon: horizonLabel })}</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--risk-ink);" />{T('studio.clim.legPeakHeat')}</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--cal-winter); opacity:0.65;" />{T('studio.clim.legRain')}</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--winter-bg); border:1px solid var(--winter-line);" />{T('studio.clim.legWinWin')}</span>
            <span class="legend-item"><span class="legend-swatch" style="background:var(--risk-bg); border:1px solid var(--risk-ink);" />{T('studio.clim.legSumWin')}</span>
          </div>

          {/* Clickable 12-Month Walter-Lieth SVG Climate Curve (Today vs Future + Rain + Gaussen Dry & Frost) */}
          {(() => {
            const W = 860, H = 220, padL = 44, padR = 44, padT = 18, padB = 34;
            const plotW = W - padL - padR, plotH = H - padT - padB;
            const colW = plotW / 12;
            const allT = [...report.monthlyShift.map((m) => m.todayC), ...report.monthlyShift.map((m) => m.futureC)];
            const minT = Math.min(-5, Math.floor(Math.min(...allT) / 5) * 5);
            const maxT = Math.max(32, Math.ceil(Math.max(...allT) / 5) * 5);
            const maxR = Math.max(120, Math.ceil(Math.max(...monthRainFuture) / 20) * 20);
            const yTemp = (t: number) => padT + plotH - ((t - minT) / Math.max(1, maxT - minT)) * plotH;
            const yRain = (r: number) => padT + plotH - (Math.min(r, maxR) / maxR) * plotH;
            const xMid = (i: number) => padL + i * colW + colW / 2;
            const ptsToday = report.monthlyShift.map((m, i) => `${xMid(i).toFixed(1)},${yTemp(m.todayC).toFixed(1)}`).join(' ');
            const ptsFut = report.monthlyShift.map((m, i) => `${xMid(i).toFixed(1)},${yTemp(m.futureC).toFixed(1)}`).join(' ');
            const selIdx = selectedMonth ?? 6;
            const selM = report.monthlyShift[selIdx];
            const isSelDry = v07Mo ? Boolean(v07Mo.dryMonths[selIdx]) : Boolean(selM?.dryStress);
            const isSelFrost = v07Mo ? Boolean(v07Mo.frostMonths[selIdx]) : (selIdx <= 2 || selIdx >= 10);

            return (
              <div class="wl-wrap" data-walter-lieth>
                <div class="wl-head">
                  <h4>{T('studio.v07.wlTitle', { horizon: horizonLabel })}</h4>
                  <div class="wl-legend">
                    <span class="wl-leg-item"><span class="wl-sw is-today" />{T('studio.v07.wlToday')}</span>
                    <span class="wl-leg-item"><span class="wl-sw is-2050" />{T('studio.v07.wlFuture', { horizon: horizonLabel })}</span>
                    <span class="wl-leg-item"><span class="wl-sw is-rain" />{T('studio.v07.wlRain')}</span>
                    <span class="wl-leg-item"><span class="wl-sw is-dry" />{T('studio.v07.wlDry')}</span>
                    <span class="wl-leg-item"><span class="wl-sw is-frost" />{T('studio.v07.wlFrost')}</span>
                  </div>
                </div>
                <div class="wl-svg-box">
                  <svg class="wl-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T('studio.v07.wlTitle', { horizon: horizonLabel })}>
                    {[0, 10, 20, 30].filter((t) => t >= minT && t <= maxT).map((t) => {
                      const y = yTemp(t);
                      return (
                        <g key={t}>
                          <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--rule-hairline)" stroke-width="1" />
                          <text x={padL - 8} y={y + 4} text-anchor="end" font-size="11" fill="var(--ink-muted)">{t}°</text>
                        </g>
                      );
                    })}
                    {[0, Math.round(maxR / 2), maxR].map((r) => {
                      const y = yRain(r);
                      return (
                        <text key={r} x={W - padR + 8} y={y + 4} text-anchor="start" font-size="11" fill="var(--cal-winter)">{r}mm</text>
                      );
                    })}
                    {report.monthlyShift.map((m, i) => {
                      const x = padL + i * colW;
                      const isDry = v07Mo ? Boolean(v07Mo.dryMonths[i]) : m.dryStress;
                      const isFrost = v07Mo ? Boolean(v07Mo.frostMonths[i]) : (i <= 2 || i >= 10);
                      const ry = yRain(monthRainFuture[i]);
                      const rh = Math.max(2, padT + plotH - ry);
                      const bw = colW * 0.44;
                      return (
                        <g key={i}>
                          {isDry ? (
                            <rect x={x} y={padT} width={colW} height={plotH} fill="var(--warn-bg)" />
                          ) : isFrost ? (
                            <rect x={x} y={padT} width={colW} height={plotH} fill="var(--winter-bg)" />
                          ) : null}
                          <rect x={x + (colW - bw) / 2} y={ry} width={bw} height={rh} rx="2.5" fill="var(--cal-winter)" opacity="0.42" />
                        </g>
                      );
                    })}
                    <polyline fill="none" stroke="var(--ink-muted)" stroke-width="2" stroke-dasharray="4 3" points={ptsToday} />
                    <polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points={ptsFut} />
                    {report.monthlyShift.map((m, i) => {
                      const cx = xMid(i);
                      const cy = yTemp(m.futureC);
                      const isSel = i === selIdx;
                      return (
                        <g key={i}>
                          <circle cx={cx} cy={cy} r={isSel ? 5 : 3.2} fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5" />
                          <text x={cx} y={H - 12} text-anchor="middle" font-size="12" font-weight={isSel ? '600' : '400'} fill={isSel ? 'var(--accent-ink)' : 'var(--ink-soft)'}>{m.month}</text>
                          <rect
                            class={`wl-month-hit${isSel ? ' is-selected' : ''}`}
                            x={padL + i * colW}
                            y={padT}
                            width={colW}
                            height={plotH + 26}
                            onClick={() => setSelectedMonth(i)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
                {selM && (
                  <div class="wl-brief" data-wl-brief>
                    <div class="sc-inline">
                      <strong>{T('studio.clim.monthBriefTitle', { month: selM.month })}:</strong>
                      <span>{T('studio.horizon.today')} {selM.todayC} °C → {horizonLabel} <strong>{selM.futureC} °C</strong></span>
                      <span>·</span>
                      <span>{T('studio.v07.wlRainShort')} <strong>{monthRainFuture[selIdx]} mm</strong></span>
                      <span>·</span>
                      <span>{T('studio.clim.activeCount', { n: activeByMonth[selIdx] })}</span>
                      <span class={`pill ${isSelDry ? 'is-warn' : isSelFrost ? 'is-winter' : 'is-green'}`}>
                        {isSelDry ? T('studio.v07.wlDry') : isSelFrost ? T('studio.v07.wlFrost') : T('studio.v07.wlActiveWin')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div class="cshift-wrap">
            <div class="cshift-chart" role="group" aria-label={T('studio.clim.shiftChartAria')}>
              {report.monthlyShift.map((m, i) => {
                const rainMm = monthRainFuture[i];
                const isWinterWin = i <= 2 || i >= 10;
                const isSummerPeak = i === 6 || i === 7 || m.heatStress;
                const hToday = Math.max(10, Math.round((Math.max(2, m.todayC) / maxMonthTemp) * 86));
                const hFut = Math.max(10, Math.round((Math.max(2, m.futureC) / maxMonthTemp) * 86));
                const hRain = Math.max(3, Math.round((rainMm / maxMonthRain) * 20));
                const futCls = m.futureC >= 32 ? 'hot' : isWinterWin ? 'mild' : '';
                const bandCls = isSummerPeak ? 'stress-band' : isWinterWin ? 'win-band' : '';
                const tag = i === 0 ? { cls: 'win', text: T('studio.clim.tagWinRain') }
                  : i === 6 ? { cls: 'stress', text: T('studio.clim.tagPeakStress') }
                  : i === 10 ? { cls: 'win', text: T('studio.clim.tagSowWin') } : null;
                return (
                  <button
                    key={i}
                    type="button"
                    class={`cshift-col ${bandCls}`}
                    aria-pressed={selectedMonth === i ? 'true' : 'false'}
                    onClick={() => setSelectedMonth((cur) => (cur === i ? null : i))}
                  >
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
                    <div class="cshift-active">{T('studio.clim.activeCount', { n: activeByMonth[i] })}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMonthInfo && selectedMonth != null && (
            <div class="month-brief" style="margin-top:10px;" data-climate-month-brief role="region" aria-label={T('studio.clim.monthBriefTitle', { month: selectedMonthInfo.m.month })}>
              <div class="mb-head">
                <div>
                  <div class="mb-title">
                    {T('studio.clim.monthBriefTitle', { month: selectedMonthInfo.m.month })} · {Math.round(selectedMonthInfo.m.todayC)}° → {Math.round(selectedMonthInfo.m.futureC)}°C · {selectedMonthInfo.rToday} → {selectedMonthInfo.rFut} mm
                  </div>
                  <div style="font-size:12.5px; color:var(--ink-soft); margin-top:2px;">
                    <strong>{activeByMonth[selectedMonth]}</strong> {T('studio.clim.activeSpecies')} ·{' '}
                    <strong style={{ color: selectedMonthInfo.stressedCount > 0 ? 'var(--risk-ink)' : 'var(--plant-green)' }}>
                      {T('studio.clim.stressedCount', { n: selectedMonthInfo.stressedCount })}
                    </strong>
                    {selectedMonthInfo.stressedNames.length > 0 ? ` (${selectedMonthInfo.stressedNames.join(', ')})` : ''} · {selectedMonthInfo.takeaway}
                  </div>
                </div>
                <button type="button" class="btn btn-xs" onClick={() => setSelectedMonth(null)}>✕ {T('studio.close')}</button>
              </div>
            </div>
          )}

          <div class="cshift-windows-grid">
            <div class="cshift-win-card winter">
              <strong style="color:var(--winter-ink);">
                {simWinterFloorC >= 3.5
                  ? T('studio.clim.winCardMild', { season: profile.winterSeason })
                  : simWinterFloorC >= 0
                    ? T('studio.clim.winCardCool', { season: profile.winterSeason })
                    : T('studio.clim.winCardDorm', { night: signedTemp1(simWinterFloorC) })}
              </strong><br />
              {simWinterFloorC >= 3.5
                ? T('studio.clim.winCardMildBody')
                : simWinterFloorC >= 0
                  ? T('studio.clim.winCardCoolBody')
                  : T('studio.clim.winCardDormBody', { freeze: freezeTodayTag })}
            </div>
            <div class="cshift-win-card summer">
              <strong style="color:var(--risk-ink);">{T('studio.clim.sumCardHead')}</strong><br />
              {T('studio.clim.sumCardBody', { temp: `${Math.round(hotFutureC)} °C` })}
              {stress.droughtPct > 0 ? ` (${T('studio.clim.sumCardDrought', { pct: stress.droughtPct })})` : ''}.
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Triage Filter Bar + Rich Triage Cards */}
      <div class="canvas-bar" style="margin-top:16px;">
        <div class="ink-seg" role="group" aria-label={T('studio.clim.triageAria')}>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'all' ? 'true' : 'false'} onClick={() => setTriageFilter('all')}>
            {T('studio.clim.triageAll', { n: totalCount })}
          </button>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'risk' ? 'true' : 'false'} onClick={() => setTriageFilter('risk')}>
            ✕ {T('studio.status.risk')} ({riskCount})
          </button>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'care' ? 'true' : 'false'} onClick={() => setTriageFilter('care')}>
            ⚠ {T('studio.status.care')} ({careCount})
          </button>
          <button type="button" class="ink-seg-btn" aria-pressed={triageFilter === 'fit' ? 'true' : 'false'} onClick={() => setTriageFilter('fit')}>
            ✓ {T('studio.status.fit')} ({fitCount})
          </button>
        </div>
        <input
          type="search"
          class="field-input"
          style="width:220px; max-width:100%;"
          placeholder={T('studio.clim.triageSearchPh')}
          aria-label={T('studio.clim.triageSearchAria')}
          value={triageQuery}
          onInput={(e) => setTriageQuery((e.currentTarget as HTMLInputElement).value)}
        />
      </div>

      {lastSwap && (
        <div class="cal-insight-bar" style="margin-bottom:12px;">
          <span>{T('studio.clim.swapped', { from: lastSwap.fromName, to: lastSwap.toName })}</span>
          <button type="button" class="btn btn-xs" onClick={undoTwinSwap}>{T('studio.clim.undo')}</button>
        </div>
      )}

      {shownCritical.length > 0 && (
        <div class="system-section" style="border-color:var(--risk-ink);">
          <div class="sec-head">
            <div>
              <h3 style="color:var(--risk-ink);">{T('studio.clim.riskTitle', { n: shownCritical.length })}</h3>
              <p class="sec-sub">{T('studio.clim.riskSub', { horizon: horizonLabel })}</p>
            </div>
            {report.critical.some((it) => it.twinSwap) && (
              <button type="button" class="btn btn-xs btn-primary" onClick={swapAllAtRisk}>
                {T('studio.clim.swapAll', { n: report.critical.length })}
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
              <h3 style="color:var(--warn-ink);">{T('studio.clim.careTitle', { n: shownWatch.length })}</h3>
              <p class="sec-sub">{T('studio.clim.careSub')}</p>
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
            <span style="color:var(--plant-green);">{T('studio.clim.holdsTitle', { n: shownFit.length, horizon: horizonLabel })}</span>
            <span class="nav-count">{T('studio.clim.showSpecies', { n: shownFit.length })}</span>
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
              <h3>{T('studio.clim.oppTitle', { horizon: horizonLabel })}</h3>
              <p class="sec-sub">{T('studio.clim.oppSub')}</p>
            </div>
            <button
              type="button"
              class="btn btn-xs"
              onClick={() => openPlantPool({ tab: 'all', banner: T('studio.clim.oppTitle', { horizon: horizonLabel }) })}
            >
              {T('studio.clim.exploreAll')}
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
                  <p style="margin:0; font-size:12.5px; color:var(--ink-soft);">{t.canonical_name} · {T('studio.clim.warmCompanion')}</p>
                  <p style="margin:0; font-size:12px; color:var(--ink-muted);">
                    {T('studio.clim.honestNote', { min: `${Math.round(cold)} °C`, max: `${Math.round(hot)} °C` })}
                    {t.traits.soil_ph ? ` · pH ${t.traits.soil_ph.min}–${t.traits.soil_ph.max}` : ''}.
                  </p>
                  <div style="display:flex; gap:6px; margin-top:auto;">
                    <button type="button" class="btn btn-xs" onClick={() => store.addMembers([t.id])}>{T('studio.add')}</button>
                    <button type="button" class="btn btn-xs" onClick={() => openFieldDossier(t.id, [t.id, ...memberIds])}>{T('studio.dossierShort')}</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}
