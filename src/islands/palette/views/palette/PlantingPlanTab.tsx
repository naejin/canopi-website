/** @jsxImportSource preact */
// Planting Plan Tab (Stage 1B — direct 1:1 port of v14 mockup-05-plan-full.png):
// - 1 · FIELD SIZING & DESIGN READINESS Hero Card (with fit-content +10% establishment buffer button)
// - Plot Layout & Spacing Blueprint (architectural SVG: soft translucent sun-tier fills, readable plant names,
//   dashed mature-spread rings, scale bar 0/2m/4m, compass N↑, dimension labels, sun-tier legend)
// - 2 · Species Quantities, Spacing & Nursery Order (By Preferred Sun | By Planting Phase | By Quantity sort,
//   filter input, 4-tier sun budget bar, stock summary strip, −/N/+ stepper + Auto, Footprint, Key Field Windows)
// - 3 · Field Materials, Prep & Year-1 Sequence (4 hairline metrics, interactive Extreme-Year Field Insurance
//   checkbox, 2x2 grid of 4 interactive Wave checklist cards with X/3 done counter & species quantity pills)
// - 4 · 12-Month Field Action Calendar (action filter pills, single-row 12-column strip, Field Brief card,
//   and Print PDF / Save plan to .canopi footer bar)
import { useMemo, useState } from 'preact/hooks';
import {
  computeFieldMaterials,
  computePlantingPlan,
  computePlantingWaves,
  convertArea,
  type AreaUnit,
  type DensityMode,
  type LayoutPattern,
  type Stratum,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { backToPlace } from '../../state/draft.ts';
import {
  microclimate,
  openFieldDossier,
  plantingConfig,
  saveStudioCanopi,
  setPlantingConfig,
  setQuantityOverride,
  studioTab,
} from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import {
  buildPlantingActionCalendar,
  computePlotLayout,
} from '../../rules/studio-analysis.ts';
import {
  formatFreezeTag,
  formatHeatPeakTag,
  localMonthLong,
  siteClimateProfile,
} from '../../rules/climate-words.ts';
import { wasmMicro } from '../../state/climate-v07.ts';

type OrderSort = 'sun' | 'phase' | 'qty';
type CalActionFilter = 'all' | 'plant' | 'sow' | 'prune' | 'harvest' | 'winter';

const LAYOUT_IDS: readonly LayoutPattern[] = ['guild', 'alley', 'grid'];

const UNIT_OPTIONS: readonly { id: AreaUnit; label: string; toM2: number }[] = [
  { id: 'm2', label: 'm²', toM2: 1 },
  { id: 'ha', label: 'ha', toM2: 10000 },
  { id: 'ft2', label: 'ft²', toM2: 0.092903 },
  { id: 'ac', label: 'ac', toM2: 4046.86 },
];

const DENSITY_IDS: readonly DensityMode[] = ['spacious', 'balanced', 'dense'];

const PATHWAY_OPTIONS = [0, 10, 20, 30] as const;

const SUN_ORDER: Record<Stratum, number> = { emergent: 0, high: 1, medium: 2, low: 3 };

export function PlantingPlanTab() {
  const members = store.memberTaxa.value;
  const cfg = plantingConfig.value;
  const loc = store.location.value;
  const profile = siteClimateProfile(loc, store.climate.value, microclimate.value, store.siteEdits.value, wasmMicro.value);
  const coldC = profile.typicalColdNightC ?? undefined;
  const hotC = profile.typicalWarmHighC ?? undefined;

  const [activeMonth, setActiveMonth] = useState(10); // November default (matches mockup)
  const [orderSort, setOrderSort] = useState<OrderSort>('sun');
  const [orderQuery, setOrderQuery] = useState('');
  const [extremeInsurance, setExtremeInsurance] = useState(false);
  const [waveChecks, setWaveChecks] = useState<Record<string, boolean>>({ 'w1-0': true });
  const [calFilter, setCalFilter] = useState<CalActionFilter>('all');

  const plan = useMemo(
    () => computePlantingPlan(members, cfg, { coldC, hotC }),
    [members, cfg, coldC, hotC],
  );
  const materials = useMemo(() => computeFieldMaterials(plan, { coldC, hotC }), [plan, coldC, hotC]);
  const waves = useMemo(() => computePlantingWaves(plan, { coldC, hotC }), [plan, coldC, hotC]);
  const blueprint = useMemo(() => computePlotLayout(plan, cfg.layoutPattern), [plan, cfg.layoutPattern]);
  const calendar = useMemo(() => buildPlantingActionCalendar(plan, coldC), [plan, coldC]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);

  if (!members.length) {
    return (
      <section class="ct-studio-section" data-planting-plan-tab>
        <p class="ct-muted">{T('studio.plan.empty')}</p>
        <div>
          <button type="button" class="button button-secondary ct-small" onClick={() => { studioTab.value = 'palette'; }}>{T('studio.plan.returnPalette')}</button>
        </div>
      </section>
    );
  }

  const unitMeta = UNIT_OPTIONS.find((u) => u.id === cfg.areaUnit) ?? UNIT_OPTIONS[0];
  const densityShort = T(`studio.densityShort.${cfg.densityMode}`);
  const grossDisplay = convertArea(cfg.plotAreaM2, cfg.areaUnit);
  const netDisplay = convertArea(plan.netAreaM2, cfg.areaUnit);
  const activeBrief = calendar[activeMonth] ?? calendar[0];
  const placeName = loc?.label ?? T('studio.common.yourSite');

  const onAreaInput = (raw: string) => {
    const num = Number(raw);
    if (!Number.isFinite(num) || num <= 0) return;
    setPlantingConfig({ plotAreaM2: Math.max(1, Math.round(num * unitMeta.toM2)) });
  };

  // Filtered & sorted nursery order items
  const q = orderQuery.trim().toLowerCase();
  const sortedItems = useMemo(() => {
    const list = plan.items.filter((it) =>
      !q || nameOf(it.taxon).toLowerCase().includes(q) || it.taxon.canonical_name.toLowerCase().includes(q),
    );
    return [...list].sort((a, b) => {
      if (orderSort === 'qty') return b.qty - a.qty;
      if (orderSort === 'phase') return a.phase.localeCompare(b.phase) || b.qty - a.qty;
      return SUN_ORDER[a.sunBand] - SUN_ORDER[b.sunBand] || b.footprintM2 - a.footprintM2;
    });
  }, [plan.items, q, orderSort]);

  const toggleWaveTask = (key: string) => {
    setWaveChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const effectiveMulchM3 = extremeInsurance
    ? Math.round(materials.mulchM3 * 1.4 * 10) / 10
    : materials.mulchM3;

  const layoutLabel = T(`studio.plan.layout.${cfg.layoutPattern}`);

  const SUN_COLOR: Record<string, string> = {
    emergent: 'var(--sun-full)',
    high: 'var(--sun-mostly)',
    medium: 'var(--sun-part)',
    low: 'var(--sun-shade)',
  };
  const SUN_BG: Record<string, string> = {
    emergent: 'var(--sun-full-bg)',
    high: 'var(--sun-mostly-bg)',
    medium: 'var(--sun-part-bg)',
    low: 'var(--sun-shade-bg)',
  };
  const SUN_CLS: Record<string, string> = {
    emergent: 'sun-full',
    high: 'sun-mostly',
    medium: 'sun-part',
    low: 'sun-shade',
  };

  return (
    <section data-planting-plan-tab aria-label={T('studio.tab.plan')}>
      {/* 1 · FIELD SIZING & DESIGN READINESS Hero Card (verbatim .plan-hero) */}
      <div class="plan-hero">
        <div class="ch-top">
          <div class="ch-kicker-row">
            <span class="ch-kicker">{T('studio.plan.kicker1')}</span>
            <span class="ch-twin-pill">
              {placeName}{profile.ph != null ? ` · pH ${profile.ph.toFixed(1)}` : ''} · {grossDisplay} {unitMeta.label} · {densityShort}{cfg.bufferPct === 10 ? ` · ${T('studio.plan.bufferTag')}` : ''}
            </span>
          </div>
          <button type="button" class="btn btn-xs" onClick={backToPlace}>
            {T('studio.plan.editLoc')}
          </button>
        </div>

        <div>
          <h2 class="ch-headline">{T('studio.plan.headline', { area: `${grossDisplay} ${unitMeta.label}` })}</h2>
          <p class="ch-sub" style="margin-top:5px;">
            {T('studio.plan.heroSub')}
          </p>
        </div>

        <div class="plan-controls-strip" role="region" aria-label={T('studio.plan.controlsAria')}>
          <div class="plan-ctrl-group">
            <label class="fp-label" style="margin-bottom:0;" for="ct-plan-area-input">{T('studio.area.title')}</label>
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
              <input
                id="ct-plan-area-input"
                type="number"
                class="area-num-input"
                style="width:108px; padding:6px 9px; font-size:15.5px;"
                min={1}
                step="any"
                value={grossDisplay}
                onChange={(e) => onAreaInput((e.currentTarget as HTMLInputElement).value)}
              />
              <div class="ink-seg" role="group" aria-label={T('studio.area.unitAria')}>
                {UNIT_OPTIONS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    class="ink-seg-btn"
                    style="padding:5px 9px;"
                    aria-pressed={cfg.areaUnit === u.id ? 'true' : 'false'}
                    onClick={() => setPlantingConfig({ areaUnit: u.id })}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div class="plan-ctrl-group">
            <span class="fp-label" style="margin-bottom:0;">{T('studio.area.density')}</span>
            <div class="chip-row" role="group" aria-label={T('studio.area.densityAria')}>
              {DENSITY_IDS.map((d) => (
                <button
                  key={d}
                  type="button"
                  class="filter-chip"
                  aria-pressed={cfg.densityMode === d ? 'true' : 'false'}
                  onClick={() => setPlantingConfig({ densityMode: d })}
                >
                  {T(`studio.densityMult.${d}`)}
                </button>
              ))}
            </div>
          </div>

          <div class="plan-ctrl-group">
            <span class="fp-label" style="margin-bottom:0;">{T('studio.area.pathways')}</span>
            <div class="chip-row" role="group" aria-label={T('studio.area.pathwaysAria')}>
              {PATHWAY_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  class="filter-chip"
                  aria-pressed={cfg.pathwaysPct === pct ? 'true' : 'false'}
                  onClick={() => setPlantingConfig({ pathwaysPct: pct })}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div class="plan-ctrl-group">
            <span class="fp-label" style="margin-bottom:0;">{T('studio.plan.safetyMargin')}</span>
            <button
              type="button"
              class="filter-chip"
              aria-pressed={cfg.bufferPct === 10 ? 'true' : 'false'}
              onClick={() => setPlantingConfig({ bufferPct: cfg.bufferPct === 10 ? 0 : 10 })}
            >
              {cfg.bufferPct === 10 ? `✓ ${T('studio.plan.bufferBtn')}` : T('studio.plan.bufferBtn')}
            </button>
          </div>
        </div>

        <div class="plan-ledger-strip" role="region" aria-label={T('studio.plan.metricsAria')}>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.mOrder')}</span>
            <div class="lv">
              {T('studio.plan.transplants', { n: plan.totalUnits })}{plan.totalSeedGrams > 0 ? ` + ${T('studio.plan.seedGrams', { g: plan.totalSeedGrams })}` : ''}
            </div>
            <div class="ls">{T('studio.plan.speciesCount', { n: members.length })}</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.mNetArea')}</span>
            <div class="lv">{T('studio.plan.netStacked', { area: `${netDisplay} ${unitMeta.label}`, pct: plan.coveragePct })}</div>
            <div class="ls">{T('studio.plan.ofGross', { gross: `${grossDisplay} ${unitMeta.label}`, pct: cfg.pathwaysPct })}</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.mWaves')}</span>
            <div class="lv">{T('studio.plan.wavesFrost', { n: waves.length })}</div>
            <div class="ls">
              {waves[1]
                ? (waves[1].params.mild
                  ? T('studio.plan.wave.w2.kickerMild', { frost: !waves[1].params.firstAutumn || waves[1].params.firstAutumn === 'late autumn' ? T('studio.plan.frost.lateAutumn') : waves[1].params.firstAutumn })
                  : T('studio.plan.wave.w2.kickerDorm'))
                : T('studio.plan.wavesDefault')}
            </div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.mHarvest')}</span>
            <div class="lv">{T('studio.plan.harvestSpan')}</div>
            <div class="ls">{T('studio.plan.harvestSub')}</div>
          </div>
        </div>

        {plan.notes.length > 0 && (
          <div class="plan-notes-footer" role="region" aria-label={T('studio.plan.notesAria')}>
            {plan.notes.map((n, i) => {
              const label = n.kind === 'shade-timing'
                ? T('studio.plan.note.shadeLabel')
                : T('studio.plan.note.pollLabel');
              const text = n.kind === 'shade-timing'
                ? T('studio.plan.note.shadeText', {
                  plants: (n.shadeNames ?? []).join(' & '),
                  tree: n.treeName ?? '',
                })
                : (n.females ?? 0) > 0
                ? T('studio.plan.note.pollText', {
                  plant: n.speciesName ?? '',
                  males: n.males ?? 1,
                  females: n.females ?? 1,
                })
                : T('studio.plan.note.pollTextOne', {
                  plant: n.speciesName ?? '',
                  males: n.males ?? 1,
                });
              return (
                <span key={i}>
                  {i > 0 ? <span style="color:var(--border-strong); margin:0 6px;" aria-hidden="true">·</span> : ''}
                  <strong>{label}:</strong> {text}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Plot Layout & Spacing Blueprint (verbatim .system-section + .bp-wrap) */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.planBlueprint')} · {blueprint.widthM} m × {blueprint.heightM} m</h2>
            <p class="sec-sub">
              {T('studio.plan.bpSub', { layout: layoutLabel, pct: cfg.pathwaysPct })}
            </p>
          </div>
          <div class="ink-seg" role="group" aria-label={T('studio.plan.layoutAria')}>
            {LAYOUT_IDS.map((opt) => (
              <button
                key={opt}
                type="button"
                class="ink-seg-btn"
                style="padding:5px 10px; font-size:12.5px;"
                aria-pressed={cfg.layoutPattern === opt ? 'true' : 'false'}
                onClick={() => setPlantingConfig({ layoutPattern: opt })}
              >
                {T(`studio.plan.layout.${opt}`)}
              </button>
            ))}
          </div>
        </div>

        <div class="bp-wrap">
          <div class="bp-svg-frame">
            <svg
              viewBox={`0 0 ${blueprint.viewWidth} ${blueprint.viewHeight + 36}`}
              class="bp-svg"
              role="img"
              aria-label={`${T('studio.planBlueprint')} (${layoutLabel})`}
            >
              <text x={blueprint.viewWidth / 2} y="16" text-anchor="middle" fill="var(--ink-muted)" font-size="11">
                {T('studio.plan.bpWidth', { w: `${blueprint.widthM} m`, area: `${grossDisplay} ${unitMeta.label}` })}
              </text>
              <text
                x="12"
                y={blueprint.viewHeight / 2 + 12}
                text-anchor="middle"
                fill="var(--ink-muted)"
                font-size="11"
                transform={`rotate(-90 12 ${blueprint.viewHeight / 2 + 12})`}
              >
                {blueprint.heightM} m
              </text>

              <rect
                x="26"
                y="24"
                width={blueprint.viewWidth - 40}
                height={blueprint.viewHeight - 24}
                rx="6"
                fill="var(--surface)"
                stroke="var(--border-strong)"
                stroke-width="1.2"
              />

              <g transform={`translate(${blueprint.viewWidth - 36}, 44)`}>
                <circle cx="0" cy="0" r="11" fill="var(--bg)" stroke="var(--border-strong)" stroke-width="1" />
                <text x="0" y="3.5" text-anchor="middle" fill="var(--ink)" font-size="9.5" font-weight="600">N↑</text>
              </g>

              {blueprint.lanes.map((y, idx) => (
                <line key={idx} x1="34" y1={y + 10} x2={blueprint.viewWidth - 22} y2={y + 10} stroke="var(--border)" stroke-dasharray="4 4" />
              ))}

              {blueprint.nodes.map((n) => {
                const t = store.taxonOf(n.id);
                const shortName = (t ? nameOf(t) : n.label).split(' ')[0].slice(0, 12);
                const cy = Math.min(blueprint.viewHeight - 16, Math.max(46, n.y + 10));
                const cx = Math.min(blueprint.viewWidth - 34, Math.max(46, n.x));
                const outerR = Math.round(n.r * 1.48);
                const strokeCol = SUN_COLOR[n.sunBand] ?? 'var(--sun-full)';
                const fillCol = SUN_BG[n.sunBand] ?? 'var(--sun-full-bg)';
                return (
                  <g
                    key={n.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => openFieldDossier(n.id, memberIds)}
                  >
                    <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={strokeCol} stroke-dasharray="3 3" stroke-opacity="0.6" />
                    <circle cx={cx} cy={cy} r={n.r + 3} fill={fillCol} stroke={strokeCol} stroke-width="1.5" />
                    <text x={cx} y={cy + 3.5} text-anchor="middle" fill="var(--ink)" font-size="10.5" font-weight="600">{shortName}</text>
                  </g>
                );
              })}

              <g transform={`translate(36, ${blueprint.viewHeight + 16})`}>
                <line x1="0" y1="0" x2="110" y2="0" stroke="var(--ink-muted)" stroke-width="1.2" />
                <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--ink-muted)" stroke-width="1.2" />
                <line x1="55" y1="-4" x2="55" y2="4" stroke="var(--ink-muted)" stroke-width="1.2" />
                <line x1="110" y1="-4" x2="110" y2="4" stroke="var(--ink-muted)" stroke-width="1.2" />
                <text x="0" y="-7" fill="var(--ink-muted)" font-size="10">0</text>
                <text x="55" y="-7" text-anchor="middle" fill="var(--ink-muted)" font-size="10">2 m</text>
                <text x="110" y="-7" text-anchor="end" fill="var(--ink-muted)" font-size="10">4 m</text>
              </g>
              <text x={blueprint.viewWidth - 20} y={blueprint.viewHeight + 18} text-anchor="end" fill="var(--ink-muted)" font-size="10.5">
                {T('studio.plan.bpRings', { pct: cfg.pathwaysPct })}
              </text>
            </svg>
          </div>
          <div class="bp-meta-bar">
            <div class="legend-row" style="margin:0;">
              {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => (
                <span key={tier} class="legend-item">
                  <span class="win-dot" style={{ background: SUN_COLOR[tier], width: '10px', height: '10px' }} />
                  {T(`studio.sun.${tier}`)}
                </span>
              ))}
            </div>
            <span>{blueprint.widthM} m × {blueprint.heightM} m · {layoutLabel} · {densityShort}</span>
          </div>
          <div class="bp-canopi-note">
            <span>{T('studio.plan.bpCanopiNote')}</span>
          </div>
        </div>
      </div>

      {/* 2 · Species Quantities, Spacing & Nursery Order (verbatim .plan-table) */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.plan.sec2Title')}</h2>
            <p class="sec-sub">{T('studio.plan.sec2Sub')}</p>
          </div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
            <div class="ink-seg" role="group" aria-label={T('studio.plan.sortAria')}>
              <button type="button" class="ink-seg-btn" style="padding:4px 9px; font-size:12px;" aria-pressed={orderSort === 'sun' ? 'true' : 'false'} onClick={() => setOrderSort('sun')}>
                {T('studio.plan.sortSun')}
              </button>
              <button type="button" class="ink-seg-btn" style="padding:4px 9px; font-size:12px;" aria-pressed={orderSort === 'phase' ? 'true' : 'false'} onClick={() => setOrderSort('phase')}>
                {T('studio.plan.sortPhase')}
              </button>
              <button type="button" class="ink-seg-btn" style="padding:4px 9px; font-size:12px;" aria-pressed={orderSort === 'qty' ? 'true' : 'false'} onClick={() => setOrderSort('qty')}>
                {T('studio.plan.sortQty')}
              </button>
            </div>
            <input
              type="search"
              class="field-input"
              style="width:190px; max-width:100%;"
              placeholder={T('studio.plan.filterPh')}
              aria-label={T('studio.plan.filterAria')}
              value={orderQuery}
              onInput={(e) => setOrderQuery((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div class="fp-budget-box">
          <div class="fp-stack-bars">
            {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => {
              const m2 = plan.sunFootprint[tier] ?? 0;
              const pct = Math.min(100, Math.round((m2 / Math.max(1, plan.netAreaM2)) * 100));
              return (
                <div key={tier} class="fp-tier-col">
                  <div class="fp-tier-head">
                    <strong style="color:var(--ink);">{T(`studio.sun.${tier}`)}</strong>
                    <span style="color:var(--ink-soft); font-weight:600;">{m2} m² ({pct}%)</span>
                  </div>
                  <div class="fp-tier-track">
                    <div class="fp-tier-fill" style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%`, background: SUN_COLOR[tier] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div class="leadtime-ribbon" role="region" aria-label={T('studio.plan.leadAria')}>
          <span class="lt-item"><strong>{T('studio.plan.ltBareRoot', { n: plan.stockSummary.bareroot })}</strong> · {T('studio.plan.ltOrderSepOct')}</span>
          <span style="color:var(--border-strong);" aria-hidden="true">·</span>
          <span class="lt-item"><strong>{T('studio.plan.ltPots', { n: plan.stockSummary.pot })}</strong> · {T('studio.plan.ltOrderFeb')}</span>
          <span style="color:var(--border-strong);" aria-hidden="true">·</span>
          <span class="lt-item"><strong>{T('studio.plan.ltBulbs', { n: plan.stockSummary.bulb })}</strong> · {T('studio.plan.ltOrderSep')}</span>
          <span style="color:var(--border-strong);" aria-hidden="true">·</span>
          <span class="lt-item"><strong>{T('studio.plan.ltSeeds', { n: plan.stockSummary.seedPacks, g: plan.stockSummary.seedGrams })}</strong> · {T('studio.plan.ltOrderJanFeb')}</span>
        </div>

        <div class="plan-table-wrap" style="overflow-x:auto;">
          <table class="plan-table" aria-label={T('studio.plan.tableAria')}>
            <thead>
              <tr>
                <th style="min-width:175px;">{T('studio.plan.colSpecies')}</th>
                <th style="min-width:142px;">{T('studio.plan.colSpacing')}</th>
                <th style="min-width:136px;">{T('studio.plan.colQty')}</th>
                <th style="min-width:152px;">{T('studio.plan.colStock')}</th>
                <th style="min-width:98px;">{T('studio.plan.colFootprint')}</th>
                <th style="min-width:165px;">{T('studio.plan.colWindows')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.taxon.id}>
                  <td>
                    <div style="display:flex; align-items:flex-start; gap:8px;">
                      <span class="status-dot" style={{ background: SUN_COLOR[item.sunBand], marginTop: '6px' }} />
                      <div>
                        <button
                          type="button"
                          class="link-btn"
                          style="padding:0; font-family:var(--font-display); font-size:15px; font-weight:600; color:var(--ink); text-align:left;"
                          onClick={() => openFieldDossier(item.taxon.id, memberIds)}
                        >
                          {nameOf(item.taxon)}
                        </button>
                        <div style="display:flex; flex-wrap:wrap; gap:5px; align-items:center; margin-top:2px;">
                          <span class={`sun-badge ${SUN_CLS[item.sunBand]}`} style="font-size:10.5px; padding:1px 6px;">{T(`studio.sun.${item.sunBand}`)}</span>
                          <span class="why-tag" style="font-size:10.5px;">{T(`studio.stage.${item.stageId}`)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">{T('studio.plan.colSpacing')}</span>
                    <div>
                      <strong style="color:var(--ink); white-space:nowrap;">{item.spacingLabel}</strong>
                      <div style="font-size:11.5px; color:var(--ink-muted);">{T('studio.plan.inBetweenRow')}</div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">{T('studio.plan.colQty')}</span>
                    <div>
                      <div class="qty-stepper">
                        <button type="button" class="qty-step-btn" aria-label={T('studio.plan.decAria', { name: nameOf(item.taxon) })} onClick={() => setQuantityOverride(item.taxon.id, Math.max(0, item.qty - 1))}>−</button>
                        <input
                          type="number"
                          class="qty-input"
                          min={0}
                          max={9999}
                          aria-label={T('studio.plan.qtyAria', { name: nameOf(item.taxon) })}
                          value={item.qty}
                          onChange={(e) => setQuantityOverride(item.taxon.id, Number((e.currentTarget as HTMLInputElement).value))}
                        />
                        <button type="button" class="qty-step-btn" aria-label={T('studio.plan.incAria', { name: nameOf(item.taxon) })} onClick={() => setQuantityOverride(item.taxon.id, item.qty + 1)}>+</button>
                      </div>
                      <div style="display:flex; align-items:center; gap:5px; margin-top:4px;">
                        <span class={`qty-badge${item.isCustom ? ' custom' : ''}`}>{item.isCustom ? T('studio.plan.custom') : T('studio.plan.auto')}</span>
                        {item.isCustom && (
                          <button type="button" class="link-btn" style="font-size:11px; padding:0;" onClick={() => setQuantityOverride(item.taxon.id, null)}>
                            {T('studio.tuner.reset')} ({item.autoQty})
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">{T('studio.plan.colStock')}</span>
                    <div>
                      <strong style="font-size:13px; color:var(--ink); white-space:nowrap;">{T(`studio.plan.stock.${item.stockVariant}`)}{item.seedGrams > 0 ? ` · ${item.seedGrams} g` : ''}</strong>
                      <div style="font-size:11.5px; color:var(--ink-muted);">{T(`studio.plan.orderWin.${item.stockKind}`)}</div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">{T('studio.plan.colFootprint')}</span>
                    <div>
                      <div style="font-weight:600; font-size:13px; color:var(--ink); white-space:nowrap;">
                        {item.footprintM2} m² <span style="font-weight:400; color:var(--ink-muted);">({item.pctOfNet}%)</span>
                      </div>
                      <div class="fp-mini-bar">
                        <div class="fp-mini-fill" style={{ width: `${Math.min(100, item.pctOfNet)}%`, background: SUN_COLOR[item.sunBand] }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="win-pills">
                      <span class="win-pill">
                        <span class="win-dot" style="background:var(--cal-sow);" />
                        {item.isSeed ? T('studio.plan.winSow') : item.phase === 'winter' ? T('studio.plan.winPlantWin') : T('studio.plan.winPlantSpr')}
                      </span>
                      <span class="win-pill">
                        <span class="win-dot" style="background:var(--cal-harvest);" />
                        {T('studio.plan.winHarv')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 · Field Materials, Prep & Year-1 Sequence (verbatim .plan-ledger-strip + .wave-grid) */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.plan.sec3Title')}</h2>
            <p class="sec-sub">{T('studio.plan.sec3Sub', { area: `${netDisplay} ${unitMeta.label}` })}</p>
          </div>
        </div>

        <div class="plan-ledger-strip" role="region" aria-label={T('studio.plan.matAria')}>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.matMulch')}</span>
            <div class="lv">{T('studio.plan.matMulchVal', { vol: `${effectiveMulchM3} m³` })}</div>
            <div class="ls">{extremeInsurance ? T('studio.plan.matDepthExt') : T('studio.plan.matDepthStd')} · ~{materials.compostL} L {T('studio.plan.compost')}</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.matStakes')}</span>
            <div class="lv">{T('studio.plan.matStakesVal', { n: materials.stakes })}</div>
            <div class="ls">{T('studio.plan.matTagsVal', { n: materials.tags })}</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.matWater')}</span>
            <div class="lv">
              {materials.dryClimate
                ? T('studio.plan.mat.waterDry', { days: materials.waterIntervalDays })
                : T('studio.plan.mat.waterMild')}
            </div>
            <div class="ls">
              {materials.awcMmPerM
                ? T('studio.plan.mat.waterDetailMm', { awc: materials.awcDays, mm: `${materials.awcMmPerM} mm/m`, cdd: materials.cddDays })
                : T('studio.plan.mat.waterDetail', { awc: materials.awcDays, cdd: materials.cddDays })}
            </div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">{T('studio.plan.matEffort')}</span>
            <div class="lv">{T(`studio.plan.mat.effort.${materials.effortTier}`, { n: materials.effortValue })}</div>
            <div class="ls">{T('studio.plan.matEffortSub')}</div>
          </div>
        </div>

        <div style="margin:14px 0; padding:10px 14px; border-left:3px solid var(--warn-dot); background:var(--bg); border-radius:6px;" data-plan-extreme-insurance>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
            <strong style="font-size:13px;">
              {T('studio.plan.extInsTitle')}
              {profile.hasLive && profile.coldFreeze10yrC != null && profile.heatPeak10yrC != null
                ? ` (${T('studio.tuner.freezeFoot', { freeze: formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst) })} · ${T('studio.tuner.peakFoot', { peak: formatHeatPeakTag(profile.heatPeak10yrC, profile.heatPeakIsEst) })}${profile.dryStreakDays != null ? ` · ${T('studio.postcard.drySpellDays', { days: profile.dryStreakDays })}` : ''})`
                : ''}
            </strong>
            <button type="button" class="link-btn" style="font-size:12px;" onClick={() => { studioTab.value = 'climate'; }}>
              {T('studio.plan.tuneStress')}
            </button>
          </div>
          <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--ink-soft); cursor:pointer;">
            <input type="checkbox" checked={extremeInsurance} onChange={(e) => setExtremeInsurance((e.currentTarget as HTMLInputElement).checked)} />
            <span>
              <strong>{T('studio.plan.extInsCheck')}</strong> — {T('studio.plan.extInsDesc')}
            </span>
          </label>
        </div>

        {/* Engine 1 & 2: Soil-Rock (cfvo), Subsoil Chemistry & Water-Tank Wave 1 Notes */}
        {profile.hasLive && (profile.cfvoTopPct != null || profile.subsoilPh != null || profile.dryDaysReserve != null) && (
          <div class="plan-v07-grid" data-plan-v07-notes>
            <div class="plan-wave-card">
              <h4>{T('studio.v07.planSoilTitle')}</h4>
              <ul class="plan-list">
                {profile.cfvoTopPct != null && (
                  <li>
                    <strong>{T('studio.v07.planStonesLbl', { top: profile.cfvoTopPct, sub: profile.cfvoSubPct ?? profile.cfvoTopPct })}:</strong>{' '}
                    {profile.cfvoTopPct >= 20 ? T('studio.v07.planStonesHigh') : T('studio.v07.planStonesLow')}
                  </li>
                )}
                {profile.subsoilPh != null && (
                  <li>
                    <strong>{T('studio.v07.planSubsoilLbl', { ph: profile.subsoilPh.toFixed(1), clay: profile.subsoilClayPct ?? 0 })}:</strong>{' '}
                    {profile.subsoilTrap ? T('studio.v07.planSubsoilTrap') : T('studio.v07.planSubsoilClean')}
                  </li>
                )}
              </ul>
            </div>
            <div class="plan-wave-card">
              <h4>{T('studio.v07.planWave1Title')}</h4>
              <ul class="plan-list">
                {profile.dryDaysReserve != null && profile.dryStreakDays != null && (
                  <li>
                    <strong>{T('studio.v07.planTankLbl', { reserve: profile.dryDaysReserve, cdd: profile.dryStreakDays })}:</strong>{' '}
                    {(profile.droughtGapDays ?? 0) > 0
                      ? T('studio.v07.planTankGap', { gap: profile.droughtGapDays ?? 0 })
                      : T('studio.v07.planTankBuf')}
                  </li>
                )}
                {profile.lateFrostP90Label && (
                  <li>
                    <strong>{T('studio.v07.planFrostLbl')}:</strong>{' '}
                    {T('studio.v07.planFrostBody', { date: profile.lateFrostP90Label })}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div class="wave-grid">
          {waves.map((w) => {
            const p = w.params;
            const waveKicker = w.id === 'w1'
              ? T('studio.plan.wave.w1.kicker')
              : w.id === 'w2'
              ? (p.mild ? T('studio.plan.wave.w2.kickerMild', { frost: p.firstAutumn === 'late autumn' ? T('studio.plan.frost.lateAutumn') : (p.firstAutumn ?? T('studio.plan.frost.lateAutumn')) }) : T('studio.plan.wave.w2.kickerDorm'))
              : w.id === 'w3'
              ? (p.frostFree ? T('studio.plan.wave.w3.kickerFree') : T('studio.plan.wave.w3.kickerFrost', { frost: p.lastSpring === 'mid-spring' ? T('studio.plan.frost.midSpring') : (p.lastSpring ?? T('studio.plan.frost.midSpring')), pct: p.fsPct ?? 12 }))
              : T('studio.plan.wave.w4.kicker');
            const waveTitle = w.id === 'w1'
              ? T('studio.plan.wave.w1.title')
              : w.id === 'w2'
              ? (p.mild ? T('studio.plan.wave.w2.titleMild') : T('studio.plan.wave.w2.titleDorm'))
              : w.id === 'w3'
              ? T('studio.plan.wave.w3.title')
              : T('studio.plan.wave.w4.title');
            const baseTasks = w.id === 'w1'
              ? [T('studio.plan.wave.w1.t1', { area: `${p.netAreaM2 ?? plan.netAreaM2} m²`, pct: p.pathwaysPct ?? plan.pathwaysPct }), T('studio.plan.wave.w1.t2')]
              : w.id === 'w2'
              ? [T('studio.plan.wave.w2.t1', { n: p.winterCount ?? 0 }), T('studio.plan.wave.w2.t2')]
              : w.id === 'w3'
              ? [p.frostFree ? T('studio.plan.wave.w3.t1Free', { g: p.seedGrams ?? plan.totalSeedGrams }) : T('studio.plan.wave.w3.t1Frost', { frost: p.lastSpring === 'mid-spring' ? T('studio.plan.frost.midSpring') : (p.lastSpring ?? T('studio.plan.frost.midSpring')), g: p.seedGrams ?? plan.totalSeedGrams }), T('studio.plan.wave.w3.t2')]
              : [T('studio.plan.wave.w4.t1', { temp: `${p.hotC ?? 32} °C` }), T('studio.plan.wave.w4.t2')];
            const extraTask = w.id === 'w1'
              ? T('studio.plan.waveTask1', { vol: `${effectiveMulchM3} m³`, compost: `${materials.compostL} L` })
              : w.id === 'w2'
              ? T('studio.plan.waveTask2')
              : w.id === 'w3'
              ? T('studio.plan.waveTask3')
              : T('studio.plan.waveTask4');
            const allTasks = [...baseTasks, extraTask];
            const doneCount = allTasks.filter((_, idx) => waveChecks[`${w.id}-${idx}`]).length;
            const waveSpecies = plan.items.filter((it) => w.speciesIds.includes(it.taxon.id) && it.qty > 0);
            return (
              <article key={w.id} class="wave-card">
                <div class="wave-head">
                  <div>
                    <div class="wave-kicker">{waveKicker}</div>
                    <h4 class="wave-title">{waveTitle}</h4>
                  </div>
                  <span class="wave-prog">{T('studio.plan.waveDone', { done: doneCount, total: allTasks.length })}</span>
                </div>
                <ul class="wave-list">
                  {allTasks.map((task, idx) => {
                    const key = `${w.id}-${idx}`;
                    const checked = Boolean(waveChecks[key]);
                    return (
                      <li key={key}>
                        <label class={`wave-item${checked ? ' done' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleWaveTask(key)} />
                          <span>{task}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {waveSpecies.length > 0 && (
                  <div class="wave-pills">
                    {waveSpecies.map((it) => (
                      <button
                        key={it.taxon.id}
                        type="button"
                        class="wave-pill"
                        onClick={() => openFieldDossier(it.taxon.id, memberIds)}
                      >
                        <span class="win-dot" style={{ background: SUN_COLOR[it.sunBand] }} />
                        {it.qty}× {nameOf(it.taxon)}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* 4 · 12-Month Field Action Calendar */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.plan.sec4Title')}</h2>
            <p class="sec-sub">{T('studio.plan.sec4Sub', { area: `${grossDisplay} ${unitMeta.label}` })}</p>
          </div>
        </div>

        <div class="cal-focus-bar" role="group" aria-label={T('studio.plan.calFilterAria')}>
          <div class="cal-focus-pills">
            {(['all', 'plant', 'sow', 'prune', 'harvest', 'winter'] as const).map((id) => (
              <button
                key={id}
                type="button"
                class="cal-focus-btn"
                aria-pressed={calFilter === id ? 'true' : 'false'}
                onClick={() => setCalFilter(id)}
              >
                {T(`studio.plan.act.${id}`)}
              </button>
            ))}
          </div>
        </div>

        <div class="hm-grid" role="group" aria-label={T('studio.plan.calGridAria')}>
          {calendar.map((m, idx) => {
            const isPlant = idx === 1 || idx === 2 || idx === 3 || idx === 9 || idx === 10;
            const isSow = idx === 2 || idx === 3 || idx === 4 || idx === 8;
            const isPrune = idx === 0 || idx === 1 || idx === 6 || idx === 11;
            const isHarv = idx >= 4 && idx <= 9;
            const isWin = idx <= 2 || idx >= 10;
            const taskCnt = (isPlant ? 2 : 0) + (isSow ? 1 : 0) + (isPrune ? 1 : 0) + (isHarv ? 3 : 0) + (isWin ? 1 : 0);
            return (
              <button
                key={idx}
                type="button"
                class={`hm-col${isWin ? ' win' : ''}`}
                aria-pressed={activeMonth === idx ? 'true' : 'false'}
                onClick={() => setActiveMonth(idx)}
              >
                <span class="hm-m">{m.month}</span>
                <span class="hm-bars" aria-hidden="true">
                  {(calFilter === 'all' || calFilter === 'plant') && isPlant && <span class="hm-bar hb-sow" style="height:22px;" />}
                  {(calFilter === 'all' || calFilter === 'sow') && isSow && <span class="hm-bar hb-bloom" style="height:16px;" />}
                  {(calFilter === 'all' || calFilter === 'prune') && isPrune && <span class="hm-bar" style="height:14px; background:var(--ink-soft);" />}
                  {(calFilter === 'all' || calFilter === 'harvest') && isHarv && <span class="hm-bar hb-harv" style="height:26px;" />}
                  {(calFilter === 'all' || calFilter === 'winter') && isWin && <span class="hm-bar hb-win" style="height:16px;" />}
                </span>
                <span class="hm-nums">{taskCnt}</span>
              </button>
            );
          })}
        </div>

        <div class="month-brief" style="margin-top:14px;">
          <div class="mb-head">
            <div class="mb-title">{T('studio.plan.briefTitle', { month: localMonthLong(activeMonth), area: `${grossDisplay} ${unitMeta.label}` })}</div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink-muted);">
              <span class="why-tag">{T('studio.plan.estTime')}</span>
              <span>{placeName} · {layoutLabel}</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; font-size:13.5px; color:var(--ink-soft);">
            <div><strong>⚒ {activeBrief.tag}:</strong> {activeBrief.brief}</div>
            <div>
              <strong>{T('studio.plan.seasonalRhythm')}</strong>{' '}
              {plan.items.slice(0, 3).map((it) => `${it.qty}× ${nameOf(it.taxon)} (${it.spacingLabel})`).join(', ')}.
            </div>
            <div>
              <strong>{T('studio.plan.bringField')}</strong> {T('studio.plan.bringFieldItems', { stakes: materials.stakes, vol: `${Math.max(1, Math.round(effectiveMulchM3 * 0.4 * 10) / 10)} m³` })}
            </div>
            <div style="padding-top:6px; border-top:1px dashed var(--border); font-size:12.5px; color:var(--ink-muted);">
              <strong>{T('studio.plan.nextMonth')}</strong> {calendar[(activeMonth + 1) % 12]?.month}: {calendar[(activeMonth + 1) % 12]?.brief}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Print / Save Bar */}
      <div class="system-section" style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
        <p style="margin:0; font-size:13.5px; color:var(--ink-soft);">
          <strong>{T('studio.plan.readyTitle')}</strong> {T('studio.plan.readySub', { layout: layoutLabel })}
        </p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn" onClick={() => window.print()}>
            {T('studio.plan.printSheet')}
          </button>
          <button type="button" class="btn btn-primary" onClick={() => void saveStudioCanopi()}>
            {T('studio.plan.savePlan')}
          </button>
        </div>
      </div>
    </section>
  );
}
