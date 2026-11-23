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
} from '../../../../lib/consortium/index.ts';
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
  siteClimateProfile,
} from '../../rules/climate-words.ts';

type OrderSort = 'sun' | 'phase' | 'qty';
type CalActionFilter = 'all' | 'plant' | 'sow' | 'prune' | 'harvest' | 'winter';

const LAYOUT_OPTIONS: readonly { id: LayoutPattern; label: string }[] = [
  { id: 'guild', label: 'Guild Clusters' },
  { id: 'alley', label: 'Syntropic Alley Rows' },
  { id: 'grid', label: 'Orchard Grid' },
];

const UNIT_OPTIONS: readonly { id: AreaUnit; label: string; toM2: number }[] = [
  { id: 'm2', label: 'm²', toM2: 1 },
  { id: 'ha', label: 'ha', toM2: 10000 },
  { id: 'ft2', label: 'ft²', toM2: 0.092903 },
  { id: 'ac', label: 'ac', toM2: 4046.86 },
];

const DENSITY_OPTIONS: readonly { id: DensityMode; label: string; short: string }[] = [
  { id: 'spacious', label: 'Spacious 0.7×', short: 'Spacious (0.7×)' },
  { id: 'balanced', label: 'Balanced 1.0×', short: 'Balanced (1.0×)' },
  { id: 'dense', label: 'Dense syntropic 1.4×', short: 'Dense (1.4×)' },
];

const PATHWAY_OPTIONS = [0, 10, 20, 30] as const;

const SUN_ORDER: Record<Stratum, number> = { emergent: 0, high: 1, medium: 2, low: 3 };
const SUN_LABELS: Record<Stratum, string> = {
  emergent: 'Full sun',
  high: 'Mostly sun',
  medium: 'Part shade',
  low: 'Shade',
};

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function PlantingPlanTab() {
  const members = store.memberTaxa.value;
  const cfg = plantingConfig.value;
  const loc = store.location.value;
  const profile = siteClimateProfile(loc, store.climate.value, microclimate.value, store.siteEdits.value);
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
        <p class="ct-muted">Add species first to generate nursery counts, spacing blueprint, materials, and planting waves.</p>
        <div>
          <button type="button" class="button button-secondary ct-small" onClick={() => { studioTab.value = 'palette'; }}>Return to My Palette</button>
        </div>
      </section>
    );
  }

  const unitMeta = UNIT_OPTIONS.find((u) => u.id === cfg.areaUnit) ?? UNIT_OPTIONS[0];
  const densityMeta = DENSITY_OPTIONS.find((d) => d.id === cfg.densityMode) ?? DENSITY_OPTIONS[1];
  const grossDisplay = convertArea(cfg.plotAreaM2, cfg.areaUnit);
  const netDisplay = convertArea(plan.netAreaM2, cfg.areaUnit);
  const activeBrief = calendar[activeMonth] ?? calendar[0];
  const placeName = loc?.label ?? 'Your site';

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

  const layoutLabel = LAYOUT_OPTIONS.find((o) => o.id === cfg.layoutPattern)?.label ?? 'Guild Clusters';

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
    <section data-planting-plan-tab aria-label="Planting plan">
      {/* 1 · FIELD SIZING & DESIGN READINESS Hero Card (verbatim .plan-hero) */}
      <div class="plan-hero">
        <div class="ch-top">
          <div class="ch-kicker-row">
            <span class="ch-kicker">1 · Field Sizing &amp; Design Readiness</span>
            <span class="ch-twin-pill">
              {placeName}{profile.ph != null ? ` · pH ${profile.ph.toFixed(1)}` : ''} · {grossDisplay} {unitMeta.label} · {densityMeta.short}{cfg.bufferPct === 10 ? ' · +10% buffer' : ''}
            </span>
          </div>
          <button type="button" class="btn btn-xs" onClick={backToPlace}>
            Edit location &amp; soil →
          </button>
        </div>

        <div>
          <h2 class="ch-headline">Actionable Planting Plan for your {grossDisplay} {unitMeta.label} plot</h2>
          <p class="ch-sub" style="margin-top:5px;">
            Realistic guild quantities, scaled layout blueprint, nursery lead times, field materials, and month-by-month actions — live-synced with your Location and <code>.canopi</code> file.
          </p>
        </div>

        <div class="plan-controls-strip" role="region" aria-label="Inline plot sizing controls">
          <div class="plan-ctrl-group">
            <label class="fp-label" style="margin-bottom:0;" for="ct-plan-area-input">Planting area</label>
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
              <div class="ink-seg" role="group" aria-label="Area unit">
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
            <span class="fp-label" style="margin-bottom:0;">Density</span>
            <div class="chip-row" role="group" aria-label="Planting density">
              {DENSITY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  class="filter-chip"
                  aria-pressed={cfg.densityMode === d.id ? 'true' : 'false'}
                  onClick={() => setPlantingConfig({ densityMode: d.id })}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div class="plan-ctrl-group">
            <span class="fp-label" style="margin-bottom:0;">Pathways %</span>
            <div class="chip-row" role="group" aria-label="Pathway allowance">
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
            <span class="fp-label" style="margin-bottom:0;">Safety margin</span>
            <button
              type="button"
              class="filter-chip"
              aria-pressed={cfg.bufferPct === 10 ? 'true' : 'false'}
              onClick={() => setPlantingConfig({ bufferPct: cfg.bufferPct === 10 ? 0 : 10 })}
            >
              {cfg.bufferPct === 10 ? '✓ +10% establishment buffer' : '+10% establishment buffer'}
            </button>
          </div>
        </div>

        <div class="plan-ledger-strip" role="region" aria-label="Plot summary metrics">
          <div class="plan-ledger-col">
            <span class="lk">Plants &amp; Seed Order</span>
            <div class="lv">
              {plan.totalUnits} transplants{plan.totalSeedGrams > 0 ? ` + ${plan.totalSeedGrams} g seed` : ''}
            </div>
            <div class="ls">{members.length} species</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">Net Planted Area</span>
            <div class="lv">{netDisplay} {unitMeta.label} net · {plan.coveragePct}% stacked</div>
            <div class="ls">Of {grossDisplay} {unitMeta.label} gross · {cfg.pathwaysPct}% paths</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">Planting Waves</span>
            <div class="lv">{waves.length} waves · Frost-anchored</div>
            <div class="ls">{waves[1]?.kicker ?? 'Autumn/Winter root-in'}</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">Harvest Horizon</span>
            <div class="lv">3 mo → Yr 5+</div>
            <div class="ls">First harvest: Placenta 1 · Mature yield: Yr 4–7</div>
          </div>
        </div>

        {plan.notes.length > 0 && (
          <div class="plan-notes-footer" role="region" aria-label="Agronomic notes">
            {plan.notes.map((n, i) => (
              <span key={i}>
                {i > 0 ? <span style="color:var(--border-strong); margin:0 6px;" aria-hidden="true">·</span> : ''}
                <strong>{n.label}:</strong> {n.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Plot Layout & Spacing Blueprint (verbatim .system-section + .bp-wrap) */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>{T('studio.planBlueprint')} · {blueprint.widthM} m × {blueprint.heightM} m</h2>
            <p class="sec-sub">
              Scaled <strong>{layoutLabel}</strong> preview with dashed mature-spread rings and {cfg.pathwaysPct}% access paths. Click any circle for its Field Dossier.
            </p>
          </div>
          <div class="ink-seg" role="group" aria-label="Layout pattern">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                class="ink-seg-btn"
                style="padding:5px 10px; font-size:12.5px;"
                aria-pressed={cfg.layoutPattern === opt.id ? 'true' : 'false'}
                onClick={() => setPlantingConfig({ layoutPattern: opt.id })}
              >
                {opt.label}
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
              aria-label={`Planting layout blueprint (${layoutLabel})`}
            >
              <text x={blueprint.viewWidth / 2} y="16" text-anchor="middle" fill="var(--ink-muted)" font-size="11">
                {blueprint.widthM} m width · {grossDisplay} {unitMeta.label} gross
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
                Dashed rings = mature spread · {cfg.pathwaysPct}% access paths
              </text>
            </svg>
          </div>
          <div class="bp-meta-bar">
            <div class="legend-row" style="margin:0;">
              {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => (
                <span key={tier} class="legend-item">
                  <span class="win-dot" style={{ background: SUN_COLOR[tier], width: '10px', height: '10px' }} />
                  {SUN_LABELS[tier]}
                </span>
              ))}
            </div>
            <span>{blueprint.widthM} m × {blueprint.heightM} m · {layoutLabel} · {densityMeta.short}</span>
          </div>
          <div class="bp-canopi-note">
            <span>↳ Exports exact area, layout pattern, spacing &amp; species counts into your <code>.canopi</code> file so you can place and refine every plant on the Canopi Desktop map.</span>
          </div>
        </div>
      </div>

      {/* 2 · Species Quantities, Spacing & Nursery Order (verbatim .plan-table) */}
      <div class="system-section">
        <div class="sec-head">
          <div>
            <h2>2 · Species Quantities, Spacing &amp; Nursery Order</h2>
            <p class="sec-sub">
              Adjust any quantity directly — blueprint, materials, waves, monthly briefs, and your <code>.canopi</code> file update live. Click any species to open its Field Dossier.
            </p>
          </div>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
            <div class="ink-seg" role="group" aria-label="Sort species order">
              <button type="button" class="ink-seg-btn" style="padding:4px 9px; font-size:12px;" aria-pressed={orderSort === 'sun' ? 'true' : 'false'} onClick={() => setOrderSort('sun')}>
                By Preferred Sun
              </button>
              <button type="button" class="ink-seg-btn" style="padding:4px 9px; font-size:12px;" aria-pressed={orderSort === 'phase' ? 'true' : 'false'} onClick={() => setOrderSort('phase')}>
                By Planting Phase
              </button>
              <button type="button" class="ink-seg-btn" style="padding:4px 9px; font-size:12px;" aria-pressed={orderSort === 'qty' ? 'true' : 'false'} onClick={() => setOrderSort('qty')}>
                By Quantity
              </button>
            </div>
            <input
              type="search"
              class="field-input"
              style="width:190px; max-width:100%;"
              placeholder="Filter species…"
              aria-label="Filter nursery order species"
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
                    <strong style="color:var(--ink);">{SUN_LABELS[tier]}</strong>
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

        <div class="leadtime-ribbon" role="region" aria-label="Nursery order lead-time summary">
          <span class="lt-item"><strong>{plan.stockSummary.bareroot}× Bare-root trees</strong> · order Sep–Oct</span>
          <span style="color:var(--border-strong);" aria-hidden="true">·</span>
          <span class="lt-item"><strong>{plan.stockSummary.pot}× Potted starts</strong> · order Feb</span>
          <span style="color:var(--border-strong);" aria-hidden="true">·</span>
          <span class="lt-item"><strong>{plan.stockSummary.bulb}× Bulbs / divisions</strong> · order Sep</span>
          <span style="color:var(--border-strong);" aria-hidden="true">·</span>
          <span class="lt-item"><strong>{plan.stockSummary.seedPacks}× Seed pack ({plan.stockSummary.seedGrams} g)</strong> · order Jan–Feb</span>
        </div>

        <div class="plan-table-wrap" style="overflow-x:auto;">
          <table class="plan-table" aria-label="Species quantities, spacing and nursery format">
            <thead>
              <tr>
                <th style="min-width:175px;">Species &amp; Succession</th>
                <th style="min-width:142px;">Spacing &amp; Prep</th>
                <th style="min-width:136px;">Quantity</th>
                <th style="min-width:152px;">Stock Format</th>
                <th style="min-width:98px;">Footprint</th>
                <th style="min-width:165px;">Key Field Windows</th>
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
                          <span class={`sun-badge ${SUN_CLS[item.sunBand]}`} style="font-size:10.5px; padding:1px 6px;">{SUN_LABELS[item.sunBand]}</span>
                          <span class="why-tag" style="font-size:10.5px;">{item.stageLabel}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">Spacing &amp; prep</span>
                    <div>
                      <strong style="color:var(--ink); white-space:nowrap;">{item.spacingLabel}</strong>
                      <div style="font-size:11.5px; color:var(--ink-muted);">in-row × between-row</div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">Quantity</span>
                    <div>
                      <div class="qty-stepper">
                        <button type="button" class="qty-step-btn" aria-label={`Decrease ${nameOf(item.taxon)}`} onClick={() => setQuantityOverride(item.taxon.id, Math.max(0, item.qty - 1))}>−</button>
                        <input
                          type="number"
                          class="qty-input"
                          min={0}
                          max={9999}
                          aria-label={`Quantity for ${nameOf(item.taxon)}`}
                          value={item.qty}
                          onChange={(e) => setQuantityOverride(item.taxon.id, Number((e.currentTarget as HTMLInputElement).value))}
                        />
                        <button type="button" class="qty-step-btn" aria-label={`Increase ${nameOf(item.taxon)}`} onClick={() => setQuantityOverride(item.taxon.id, item.qty + 1)}>+</button>
                      </div>
                      <div style="display:flex; align-items:center; gap:5px; margin-top:4px;">
                        <span class={`qty-badge${item.isCustom ? ' custom' : ''}`}>{item.isCustom ? 'Custom' : 'Auto'}</span>
                        {item.isCustom && (
                          <button type="button" class="link-btn" style="font-size:11px; padding:0;" onClick={() => setQuantityOverride(item.taxon.id, null)}>
                            Reset ({item.autoQty})
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">Stock format</span>
                    <div>
                      <strong style="font-size:13px; color:var(--ink); white-space:nowrap;">{item.stockLabel}{item.seedGrams > 0 ? ` · ${item.seedGrams} g pack` : ''}</strong>
                      <div style="font-size:11.5px; color:var(--ink-muted);">{item.orderWindow}</div>
                    </div>
                  </td>
                  <td class="mob-kv">
                    <span class="mob-field-lbl">Footprint</span>
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
                        {item.isSeed ? 'Sow Apr–May' : item.phase === 'winter' ? 'Plant Nov–Feb' : 'Plant Mar–Oct'}
                      </span>
                      <span class="win-pill">
                        <span class="win-dot" style="background:var(--cal-harvest);" />
                        Harvest Jul–Oct
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
            <h2>3 · Field Materials, Prep &amp; Year-1 Sequence</h2>
            <p class="sec-sub">Live-calculated materials and labor for your {netDisplay} {unitMeta.label} net planted area, followed by 4 chronological field waves.</p>
          </div>
        </div>

        <div class="plan-ledger-strip" role="region" aria-label="Field materials, prep and labor calculator">
          <div class="plan-ledger-col">
            <span class="lk">Mulch &amp; Compost</span>
            <div class="lv">{effectiveMulchM3} m³ woodchip / straw</div>
            <div class="ls">{extremeInsurance ? '14 cm deep (+4 cm cap)' : '10 cm depth'} · ~{materials.compostL} L compost</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">Stakes &amp; Labels</span>
            <div class="lv">{materials.stakes}× tree stakes &amp; rings</div>
            <div class="ls">+ {materials.tags}× weatherproof species tags</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">Year-1 Watering</span>
            <div class="lv">{materials.wateringCadence}</div>
            <div class="ls">{materials.wateringDetail}</div>
          </div>
          <div class="plan-ledger-col">
            <span class="lk">Est. Effort</span>
            <div class="lv">{materials.effortLabel}</div>
            <div class="ls">Layout staking, bare-root planting &amp; mulching</div>
          </div>
        </div>

        <div style="margin:14px 0; padding:10px 14px; border-left:3px solid var(--warn-dot); background:var(--bg); border-radius:6px;" data-plan-extreme-insurance>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
            <strong style="font-size:13px;">
              ⚡ Extreme-Year Field Insurance
              {profile.hasLive && profile.coldFreeze10yrC != null && profile.heatPeak10yrC != null
                ? ` (1-in-10-yr freeze ${formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst)} · heat peak ${formatHeatPeakTag(profile.heatPeak10yrC, profile.heatPeakIsEst)}${profile.dryStreakDays != null ? ` · ~${profile.dryStreakDays}d dry spell` : ''})`
                : ' (Site v0.7.0 Tail Prep)'}
            </strong>
            <button type="button" class="link-btn" style="font-size:12px;" onClick={() => { studioTab.value = 'climate'; }}>
              Tune in Stress Lab →
            </button>
          </div>
          <label style="display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--ink-soft); cursor:pointer;">
            <input type="checkbox" checked={extremeInsurance} onChange={(e) => setExtremeInsurance((e.currentTarget as HTMLInputElement).checked)} />
            <span>
              <strong>Extra +4 cm woodchip mulch cap &amp; shade cloth</strong> — protects roots during peak summer heat domes &amp; extended dry streaks.
            </span>
          </label>
        </div>

        <div class="wave-grid">
          {waves.map((w) => {
            const extraTask = w.id === 'w1'
              ? `Stage ${effectiveMulchM3} m³ woodchip mulch & ~${materials.compostL} L planting compost.`
              : w.id === 'w2'
              ? 'Water in deeply after planting so soil settles cleanly around bare roots.'
              : w.id === 'w3'
              ? 'Label direct-sown rows and mulch pathways to suppress spring weeds.'
              : 'Monitor young tree moisture every 7–10 days during dry spells.';
            const allTasks = [...w.tasks, extraTask];
            const doneCount = allTasks.filter((_, idx) => waveChecks[`${w.id}-${idx}`]).length;
            const waveSpecies = plan.items.filter((it) => w.speciesIds.includes(it.taxon.id) && it.qty > 0);
            return (
              <article key={w.id} class="wave-card">
                <div class="wave-head">
                  <div>
                    <div class="wave-kicker">{w.kicker}</div>
                    <h4 class="wave-title">{w.title}</h4>
                  </div>
                  <span class="wave-prog">{doneCount}/{allTasks.length} done</span>
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
            <h2>4 · 12-Month Field Action Calendar</h2>
            <p class="sec-sub">Filter by concrete field action and click any month to read your weekend <strong>Field Brief</strong> for your {grossDisplay} {unitMeta.label} plot.</p>
          </div>
        </div>

        <div class="cal-focus-bar" role="group" aria-label="Filter calendar by action">
          <div class="cal-focus-pills">
            {([
              ['all', 'All actions'],
              ['plant', '⚒ Plant out'],
              ['sow', '● Direct sow'],
              ['prune', '✂ Prune & mulch'],
              ['harvest', '✦ Harvest'],
              ['winter', '❄ Winter-grow'],
            ] as const).map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                class="cal-focus-btn"
                aria-pressed={calFilter === id ? 'true' : 'false'}
                onClick={() => setCalFilter(id)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div class="hm-grid" role="group" aria-label="12-month field calendar">
          {calendar.map((m, idx) => {
            const isPlant = idx === 1 || idx === 2 || idx === 3 || idx === 9 || idx === 10;
            const isSow = idx === 2 || idx === 3 || idx === 4 || idx === 8;
            const isPrune = idx === 0 || idx === 1 || idx === 6 || idx === 11;
            const isHarv = idx >= 4 && idx <= 9;
            const isWin = idx <= 2 || idx >= 10;
            const taskCnt = (isPlant ? 2 : 0) + (isSow ? 1 : 0) + (isPrune ? 1 : 0) + (isHarv ? 3 : 0) + (isWin ? 1 : 0);
            return (
              <button
                key={m.month}
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
            <div class="mb-title">Field Brief for {MONTH_LONG[activeMonth]} (on your {grossDisplay} {unitMeta.label} plot)</div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink-muted);">
              <span class="why-tag">Est. field time: ~4–5 hrs</span>
              <span>{placeName} · {layoutLabel}</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; font-size:13.5px; color:var(--ink-soft);">
            <div><strong>⚒ {activeBrief.tag}:</strong> {activeBrief.brief}</div>
            <div>
              <strong>❄ Seasonal rhythm:</strong>{' '}
              {plan.items.slice(0, 3).map((it) => `${it.qty}× ${nameOf(it.taxon)} (${it.spacingLabel})`).join(', ')}.
            </div>
            <div>
              <strong>Bring to the field:</strong> Spade, {materials.stakes}× tree stakes &amp; ties, {Math.max(1, Math.round(effectiveMulchM3 * 0.4 * 10) / 10)} m³ mulch, root-soaking bucket.
            </div>
            <div style="padding-top:6px; border-top:1px dashed var(--border); font-size:12.5px; color:var(--ink-muted);">
              <strong>Next-month heads-up:</strong> {calendar[(activeMonth + 1) % 12]?.month}: {calendar[(activeMonth + 1) % 12]?.brief}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Print / Save Bar */}
      <div class="system-section" style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
        <p style="margin:0; font-size:13.5px; color:var(--ink-soft);">
          <strong>Ready for the nursery or Canopi Desktop?</strong> Save your plot area, {layoutLabel} layout, spacing, and quantities into your <code>.canopi</code> file.
        </p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn" onClick={() => window.print()}>
            Print Field &amp; Nursery Sheet (PDF)
          </button>
          <button type="button" class="btn btn-primary" onClick={() => void saveStudioCanopi()}>
            Save plan to .canopi
          </button>
        </div>
      </div>
    </section>
  );
}
