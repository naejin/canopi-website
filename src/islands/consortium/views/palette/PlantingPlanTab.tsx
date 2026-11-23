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
  siteClimate as climateOf,
  type AreaUnit,
  type DensityMode,
  type LayoutPattern,
  type Stratum,
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { backToPlace } from '../../state/draft.ts';
import {
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
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const coldC = sc?.today?.tminColdC;
  const hotC = sc?.today?.tmaxWarmC;

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

  return (
    <section class="ct-studio-section" data-planting-plan-tab aria-label="Planting plan">
      {/* 1 · FIELD SIZING & DESIGN READINESS Hero Card */}
      <div class="ct-plan-ledger-card ct-plan-hero">
        <div class="ct-plan-hero-top">
          <div class="ct-plan-hero-eyebrow">
            <span class="ct-eyebrow">1 · FIELD SIZING &amp; DESIGN READINESS</span>
            <span class="ct-plan-meta-pill">
              {placeName} · {grossDisplay} {unitMeta.label} · {densityMeta.short}
            </span>
          </div>
          <button type="button" class="ct-studio-btn" onClick={backToPlace}>
            Edit location &amp; soil →
          </button>
        </div>

        <div class="ct-plan-hero-head">
          <h2 class="ct-plan-title">Actionable Planting Plan for your {grossDisplay} {unitMeta.label} plot</h2>
          <p class="ct-sys-sub">
            Realistic guild quantities, scaled layout blueprint, nursery lead times, field materials, and month-by-month actions — live-synced with your Location and .canopi file.
          </p>
        </div>

        <div class="ct-plan-controls">
          <div class="ct-plan-ctrl-group">
            <label class="ct-eyebrow" for="ct-plan-area-input">PLANTING AREA</label>
            <div class="ct-plan-area-row">
              <input
                id="ct-plan-area-input"
                type="number"
                class="ct-area-input"
                min={1}
                step="any"
                value={grossDisplay}
                onChange={(e) => onAreaInput((e.currentTarget as HTMLInputElement).value)}
              />
              <div class="ct-ink-seg" role="group" aria-label="Area unit">
                {UNIT_OPTIONS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    class="ct-seg-btn"
                    aria-pressed={cfg.areaUnit === u.id ? 'true' : 'false'}
                    onClick={() => setPlantingConfig({ areaUnit: u.id })}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div class="ct-plan-ctrl-group">
            <span class="ct-eyebrow">DENSITY</span>
            <div class="ct-plan-chip-row" role="group" aria-label="Planting density">
              {DENSITY_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  class={`ct-plan-pill-btn${cfg.densityMode === d.id ? ' is-active' : ''}`}
                  aria-pressed={cfg.densityMode === d.id ? 'true' : 'false'}
                  onClick={() => setPlantingConfig({ densityMode: d.id })}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div class="ct-plan-ctrl-group">
            <span class="ct-eyebrow">PATHWAYS %</span>
            <div class="ct-plan-chip-row" role="group" aria-label="Pathway allowance">
              {PATHWAY_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  class={`ct-plan-pill-btn${cfg.pathwaysPct === pct ? ' is-active' : ''}`}
                  aria-pressed={cfg.pathwaysPct === pct ? 'true' : 'false'}
                  onClick={() => setPlantingConfig({ pathwaysPct: pct })}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div class="ct-plan-ctrl-group ct-plan-safety-group">
            <span class="ct-eyebrow">SAFETY MARGIN</span>
            <button
              type="button"
              class={`ct-plan-pill-btn ct-plan-buffer-btn${cfg.bufferPct === 10 ? ' is-active' : ''}`}
              aria-pressed={cfg.bufferPct === 10 ? 'true' : 'false'}
              onClick={() => setPlantingConfig({ bufferPct: cfg.bufferPct === 10 ? 0 : 10 })}
            >
              +10% establishment buffer
            </button>
          </div>
        </div>

        <div class="ct-plan-kpis">
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">PLANTS &amp; SEED ORDER</span>
            <span class="ct-plan-kpi-val">
              {plan.totalUnits} transplants{plan.totalSeedGrams > 0 ? ` + ${plan.totalSeedGrams} g seed` : ''}
            </span>
            <span class="ct-plan-kpi-sub">{members.length} species</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">NET PLANTED AREA</span>
            <span class="ct-plan-kpi-val">{netDisplay} {unitMeta.label} net · {plan.coveragePct}% stacked</span>
            <span class="ct-plan-kpi-sub">Of {grossDisplay} {unitMeta.label} gross · {cfg.pathwaysPct}% paths</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">PLANTING WAVES</span>
            <span class="ct-plan-kpi-val">{waves.length} waves · Frost-anchored</span>
            <span class="ct-plan-kpi-sub">{waves[1]?.kicker ?? 'Autumn/Winter root-in'}</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">HARVEST HORIZON</span>
            <span class="ct-plan-kpi-val">3 mo → Yr 5+</span>
            <span class="ct-plan-kpi-sub">First harvest: Placenta 1 · Mature yield: Yr 4–7</span>
          </div>
        </div>

        {plan.notes.length > 0 && (
          <div class="ct-plan-notes-foot">
            <p class="ct-plan-note">
              {plan.notes.map((n, i) => (
                <span key={i}>
                  {i > 0 ? ' · ' : ''}
                  <strong>{n.label}:</strong> {n.text}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {/* Plot Layout & Spacing Blueprint (v14 architectural SVG) */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">
              {T('studio.planBlueprint')} · {blueprint.widthM} m × {blueprint.heightM} m
            </h3>
            <p class="ct-sys-sub">
              Scaled {layoutLabel} preview with dashed mature-spread rings and {cfg.pathwaysPct}% access paths. Click any circle for its Field Dossier.
            </p>
          </div>
          <div class="ct-ink-seg" role="group" aria-label="Layout pattern">
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                class="ct-seg-btn"
                aria-pressed={cfg.layoutPattern === opt.id ? 'true' : 'false'}
                onClick={() => setPlantingConfig({ layoutPattern: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <figure class="ct-blueprint-wrap">
          <svg
            viewBox={`0 0 ${blueprint.viewWidth} ${blueprint.viewHeight + 36}`}
            class="ct-blueprint-svg"
            role="img"
            aria-label={`Planting layout blueprint (${layoutLabel})`}
          >
            {/* Dimension labels */}
            <text class="ct-bp-dim" x={blueprint.viewWidth / 2} y="16" text-anchor="middle">
              {blueprint.widthM} m width · {grossDisplay} {unitMeta.label} gross
            </text>
            <text
              class="ct-bp-dim"
              x="12"
              y={blueprint.viewHeight / 2 + 12}
              text-anchor="middle"
              transform={`rotate(-90 12 ${blueprint.viewHeight / 2 + 12})`}
            >
              {blueprint.heightM} m
            </text>

            {/* Outer architectural frame */}
            <rect
              class="ct-bp-frame"
              x="26"
              y="24"
              width={blueprint.viewWidth - 40}
              height={blueprint.viewHeight - 24}
              rx="6"
            />

            {/* Compass N↑ */}
            <g transform={`translate(${blueprint.viewWidth - 36}, 44)`}>
              <circle class="ct-bp-compass" cx="0" cy="0" r="11" />
              <text class="ct-bp-compass-txt" x="0" y="3.5" text-anchor="middle">N↑</text>
            </g>

            {/* Alley lanes if alley mode */}
            {blueprint.lanes.map((y, idx) => (
              <line key={idx} class="ct-bp-lane" x1="34" y1={y + 10} x2={blueprint.viewWidth - 22} y2={y + 10} />
            ))}

            {/* Translucent sun-tier canopies + dashed mature spread rings + readable plant names */}
            {blueprint.nodes.map((n) => {
              const t = store.taxonOf(n.id);
              const shortName = (t ? nameOf(t) : n.label).split(' ')[0].slice(0, 12);
              const cy = Math.min(blueprint.viewHeight - 16, Math.max(46, n.y + 10));
              const cx = Math.min(blueprint.viewWidth - 34, Math.max(46, n.x));
              const outerR = Math.round(n.r * 1.48);
              return (
                <g
                  key={n.id}
                  class="ct-bp-canopy"
                  data-sun-tier={n.sunBand}
                  style={{ cursor: 'pointer' }}
                  onClick={() => openFieldDossier(n.id, memberIds)}
                >
                  <circle class="ct-bp-spread-ring" cx={cx} cy={cy} r={outerR} />
                  <circle class="ct-bp-fill-circle" cx={cx} cy={cy} r={n.r + 3} />
                  <text class="ct-bp-plant-lbl" x={cx} y={cy + 3.5} text-anchor="middle">{shortName}</text>
                </g>
              );
            })}

            {/* Scale bar 0 — 2m — 4m */}
            <g transform={`translate(36, ${blueprint.viewHeight + 16})`}>
              <line class="ct-bp-scale-line" x1="0" y1="0" x2="110" y2="0" />
              <line class="ct-bp-scale-line" x1="0" y1="-4" x2="0" y2="4" />
              <line class="ct-bp-scale-line" x1="55" y1="-4" x2="55" y2="4" />
              <line class="ct-bp-scale-line" x1="110" y1="-4" x2="110" y2="4" />
              <text class="ct-bp-dim" x="0" y="-7">0</text>
              <text class="ct-bp-dim" x="55" y="-7" text-anchor="middle">2 m</text>
              <text class="ct-bp-dim" x="110" y="-7" text-anchor="end">4 m</text>
            </g>
            <text class="ct-bp-dim" x={blueprint.viewWidth - 20} y={blueprint.viewHeight + 18} text-anchor="end">
              Dashed rings = mature spread · {cfg.pathwaysPct}% access paths
            </text>
          </svg>

          <figcaption class="ct-bp-footer-bar">
            <div class="ct-bp-sun-key">
              {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => (
                <span key={tier} class="ct-bp-sun-item">
                  <i class="ct-bp-sun-dot" data-sun-tier={tier} /> {SUN_LABELS[tier]}
                </span>
              ))}
            </div>
            <span class="ct-small-text ct-muted">{blueprint.widthM} m × {blueprint.heightM} m · {layoutLabel} · {densityMeta.short}</span>
          </figcaption>
          <p class="ct-small-text ct-muted ct-bp-export-note">
            ↳ Exports exact area, layout pattern, spacing &amp; species counts into your <code>.canopi</code> file so you can place and refine every plant on the Canopi Desktop map.
          </p>
        </figure>
      </div>

      {/* 2 · Species Quantities, Spacing & Nursery Order (1:1 v14) */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">2 · Species Quantities, Spacing &amp; Nursery Order</h3>
            <p class="ct-sys-sub">
              Adjust any quantity directly — blueprint, materials, waves, monthly briefs, and your <code>.canopi</code> file update live. Click any species to open its Field Dossier.
            </p>
          </div>
          <div class="ct-order-tools">
            <div class="ct-ink-seg" role="group" aria-label="Sort species order">
              <button type="button" class="ct-seg-btn" aria-pressed={orderSort === 'sun' ? 'true' : 'false'} onClick={() => setOrderSort('sun')}>
                By Preferred Sun
              </button>
              <button type="button" class="ct-seg-btn" aria-pressed={orderSort === 'phase' ? 'true' : 'false'} onClick={() => setOrderSort('phase')}>
                By Planting Phase
              </button>
              <button type="button" class="ct-seg-btn" aria-pressed={orderSort === 'qty' ? 'true' : 'false'} onClick={() => setOrderSort('qty')}>
                By Quantity
              </button>
            </div>
            <input
              type="search"
              class="ct-pal-search ct-order-search"
              placeholder="Filter species…"
              aria-label="Filter nursery order species"
              value={orderQuery}
              onInput={(e) => setOrderQuery((e.currentTarget as HTMLInputElement).value)}
            />
          </div>
        </div>

        {/* 4-Tier Sun Budget Bar */}
        <div class="ct-sun-budget-grid">
          {(['emergent', 'high', 'medium', 'low'] as const).map((tier) => {
            const m2 = plan.sunFootprint[tier] ?? 0;
            const pct = Math.min(100, Math.round((m2 / Math.max(1, plan.netAreaM2)) * 100));
            return (
              <div key={tier} class="ct-sun-budget-col">
                <div class="ct-sun-budget-top">
                  <strong>{SUN_LABELS[tier]}</strong>
                  <span class="ct-muted">{m2} m² ({pct}%)</span>
                </div>
                <span class="ct-mx-bar-track">
                  <span class="ct-mx-bar-fill" data-sun-tier={tier} style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }} />
                </span>
              </div>
            );
          })}
        </div>

        {/* Stock Summary Strip */}
        <div class="ct-stock-strip">
          <span><strong>{plan.stockSummary.bareroot}× Bare-root trees</strong> · order Sep–Oct</span>
          <span><strong>{plan.stockSummary.pot}× Potted starts</strong> · order Feb</span>
          <span><strong>{plan.stockSummary.bulb}× Bulbs / divisions</strong> · order Sep</span>
          <span><strong>{plan.stockSummary.seedPacks}× Seed pack ({plan.stockSummary.seedGrams} g)</strong> · order Jan–Feb</span>
        </div>

        {/* Desktop Swiss-editorial Nursery Order Table */}
        <div class="ct-plan-table-wrap ct-plan-desktop">
          <table class="ct-plan-table">
            <thead>
              <tr>
                <th>SPECIES &amp; SUCCESSION</th>
                <th>SPACING &amp; PREP</th>
                <th>QUANTITY</th>
                <th>STOCK FORMAT</th>
                <th>FOOTPRINT</th>
                <th>KEY FIELD WINDOWS</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.taxon.id}>
                  <td>
                    <div class="ct-order-sp-cell">
                      <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
                        <strong>{nameOf(item.taxon)}</strong>
                      </button>
                      <div class="ct-order-sp-tags">
                        <span class="ct-gantt-sun-pill" data-sun-tier={item.sunBand}>{SUN_LABELS[item.sunBand]}</span>
                        <span class="ct-order-stage-pill">{item.stageLabel}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{item.spacingLabel}</strong>
                    <div class="ct-small-text ct-muted">in-row × between-row</div>
                  </td>
                  <td>
                    <div class="ct-stepper">
                      <button
                        type="button"
                        class="ct-step-btn"
                        aria-label={`Decrease ${nameOf(item.taxon)}`}
                        onClick={() => setQuantityOverride(item.taxon.id, Math.max(0, item.qty - 1))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        class="ct-qty-input"
                        min={0}
                        max={9999}
                        aria-label={`Quantity for ${nameOf(item.taxon)}`}
                        value={item.qty}
                        onChange={(e) => setQuantityOverride(item.taxon.id, Number((e.currentTarget as HTMLInputElement).value))}
                      />
                      <button
                        type="button"
                        class="ct-step-btn"
                        aria-label={`Increase ${nameOf(item.taxon)}`}
                        onClick={() => setQuantityOverride(item.taxon.id, item.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    {item.isCustom ? (
                      <button type="button" class="ct-qty-reset" onClick={() => setQuantityOverride(item.taxon.id, null)}>
                        Auto ({item.autoQty})
                      </button>
                    ) : (
                      <span class="ct-auto-tag">Auto</span>
                    )}
                  </td>
                  <td>
                    <strong>{item.stockLabel}{item.seedGrams > 0 ? ` · ${item.seedGrams} g pack` : ''}</strong>
                    <div class="ct-small-text ct-muted">{item.orderWindow}</div>
                  </td>
                  <td>
                    <strong>{item.footprintM2} m²</strong> <span class="ct-muted">({item.pctOfNet}%)</span>
                  </td>
                  <td>
                    <div class="ct-window-badges">
                      <span class="ct-win-pill is-plant">
                        {item.isSeed ? '• Sow Apr–May' : item.phase === 'winter' ? '• Plant Nov–Feb' : '• Plant Mar–Oct'}
                      </span>
                      <span class="ct-win-pill is-harv" data-stratum="high">✦ Harvest Jul–Oct</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Field Order Cards (<= 639px) */}
        <div class="ct-plan-mobile">
          {sortedItems.map((item) => (
            <article key={item.taxon.id} class="ct-order-card">
              <div class="ct-order-card-head">
                <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
                  <strong>{nameOf(item.taxon)}</strong>
                </button>
                <span class="ct-small-text ct-muted">{item.spacingLabel}</span>
              </div>
              <div class="ct-small-text ct-muted">
                {item.stockLabel}{item.seedGrams > 0 ? ` (${item.seedGrams} g)` : ''} · {item.orderWindow} · {item.footprintM2} m²
              </div>
              <div class="ct-stepper">
                <button type="button" class="ct-step-btn" onClick={() => setQuantityOverride(item.taxon.id, Math.max(0, item.qty - 1))}>−</button>
                <input
                  type="number"
                  class="ct-qty-input"
                  min={0}
                  max={9999}
                  value={item.qty}
                  onChange={(e) => setQuantityOverride(item.taxon.id, Number((e.currentTarget as HTMLInputElement).value))}
                />
                <button type="button" class="ct-step-btn" onClick={() => setQuantityOverride(item.taxon.id, item.qty + 1)}>+</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 3 · Field Materials, Prep & Year-1 Sequence (1:1 v14) */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">3 · Field Materials, Prep &amp; Year-1 Sequence</h3>
            <p class="ct-sys-sub">Live-calculated materials and labor for your {netDisplay} {unitMeta.label} net planted area, followed by 4 chronological field waves.</p>
          </div>
        </div>

        <div class="ct-plan-kpis">
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">MULCH &amp; COMPOST</span>
            <span class="ct-plan-kpi-val">{effectiveMulchM3} m³ woodchip / straw</span>
            <span class="ct-plan-kpi-sub">{extremeInsurance ? '14 cm deep (+4 cm cap)' : '10 cm depth'} · ~{materials.compostL} L compost</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">STAKES &amp; LABELS</span>
            <span class="ct-plan-kpi-val">{materials.stakes}× tree stakes &amp; rings</span>
            <span class="ct-plan-kpi-sub">+ {materials.tags}× weatherproof species tags</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">YEAR-1 WATERING</span>
            <span class="ct-plan-kpi-val ct-plan-kpi-sm">{materials.wateringCadence}</span>
            <span class="ct-plan-kpi-sub">{materials.wateringDetail}</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">EST. EFFORT</span>
            <span class="ct-plan-kpi-val">{materials.effortLabel}</span>
            <span class="ct-plan-kpi-sub">Layout staking, bare-root planting &amp; mulching</span>
          </div>
        </div>

        {/* Interactive Extreme-Year Field Insurance Box */}
        <div class="ct-insurance-box">
          <div class="ct-insurance-top">
            <strong>⚡ Extreme-Year Field Insurance (Site v0.7.0 Tail Prep)</strong>
            <button type="button" class="ct-sys-link ct-small-text" onClick={() => { studioTab.value = 'climate'; }}>
              Tune in Stress Lab →
            </button>
          </div>
          <label class="ct-insurance-check">
            <input
              type="checkbox"
              checked={extremeInsurance}
              onChange={(e) => setExtremeInsurance((e.currentTarget as HTMLInputElement).checked)}
            />
            <span>
              <strong>Extra +4 cm woodchip mulch cap &amp; shade cloth</strong> — protects roots during peak summer heat domes &amp; extended dry streaks.
            </span>
          </label>
        </div>

        {/* 2x2 Grid of 4 Interactive Wave Checklist Cards */}
        <div class="ct-plan-waves-2x2">
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
              <article key={w.id} class="ct-wave-card">
                <div class="ct-wave-head">
                  <div>
                    <span class="ct-eyebrow">{w.kicker}</span>
                    <h4 class="ct-wave-title">{w.title}</h4>
                  </div>
                  <span class="ct-wave-progress">{doneCount}/{allTasks.length} done</span>
                </div>
                <ul class="ct-wave-tasks">
                  {allTasks.map((task, idx) => {
                    const key = `${w.id}-${idx}`;
                    const checked = Boolean(waveChecks[key]);
                    return (
                      <li key={key}>
                        <label class={`ct-wave-task${checked ? ' is-done' : ''}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleWaveTask(key)} />
                          <span>{task}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {waveSpecies.length > 0 && (
                  <div class="ct-wave-pills">
                    {waveSpecies.map((it) => (
                      <button
                        key={it.taxon.id}
                        type="button"
                        class="ct-wave-sp-pill"
                        onClick={() => openFieldDossier(it.taxon.id, memberIds)}
                      >
                        <i class="ct-bp-sun-dot" data-sun-tier={it.sunBand} />
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

      {/* 4 · 12-Month Field Action Calendar (Single-Row 12-Col Strip + Rich Field Brief + Bottom Bar) */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">4 · 12-Month Field Action Calendar</h3>
            <p class="ct-sys-sub">Filter by concrete field action and click any month to read your weekend <strong>Field Brief</strong> for your {grossDisplay} {unitMeta.label} plot.</p>
          </div>
        </div>

        <div class="ct-yr-focus-row" role="group" aria-label="Filter calendar by action">
          {([
            ['all', 'All actions'],
            ['plant', '⚒ Plant out'],
            ['sow', '• Direct sow'],
            ['prune', '✂ Prune & mulch'],
            ['harvest', '✦ Harvest'],
            ['winter', '❄ Winter-grow'],
          ] as const).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              class={`ct-plan-pill-btn${calFilter === id ? ' is-active' : ''}`}
              aria-pressed={calFilter === id ? 'true' : 'false'}
              onClick={() => setCalFilter(id)}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Single-Row 12-Column Visual Bar Strip */}
        <div class="ct-cal12-strip" role="group" aria-label="12-month field calendar">
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
                class={`ct-cal12-col${activeMonth === idx ? ' is-selected' : ''}`}
                aria-pressed={activeMonth === idx ? 'true' : 'false'}
                onClick={() => setActiveMonth(idx)}
              >
                <strong>{m.month}</strong>
                <span class="ct-cal12-bars" aria-hidden="true">
                  {(calFilter === 'all' || calFilter === 'plant') && isPlant && <i class="ct-c12-bar is-plant" />}
                  {(calFilter === 'all' || calFilter === 'sow') && isSow && <i class="ct-c12-bar is-sow" />}
                  {(calFilter === 'all' || calFilter === 'prune') && isPrune && <i class="ct-c12-bar is-prune" />}
                  {(calFilter === 'all' || calFilter === 'harvest') && isHarv && <i class="ct-c12-bar is-harv" data-stratum="high" />}
                  {(calFilter === 'all' || calFilter === 'winter') && isWin && <i class="ct-c12-bar is-win" />}
                </span>
                <span class="ct-cal12-cnt">{taskCnt}</span>
              </button>
            );
          })}
        </div>

        {/* Rich Field Brief Card */}
        <div class="ct-field-brief-card">
          <div class="ct-field-brief-head">
            <h4>Field Brief for {MONTH_LONG[activeMonth]} (on your {grossDisplay} {unitMeta.label} plot)</h4>
            <div class="ct-field-brief-meta">
              <span class="ct-plan-meta-pill">Est. field time: ~4–5 hrs</span>
              <span class="ct-small-text ct-muted">{placeName} · {layoutLabel}</span>
            </div>
          </div>
          <div class="ct-field-brief-rows">
            <div class="ct-fb-row">
              <strong>⚒ {activeBrief.tag}:</strong> {activeBrief.brief}
            </div>
            <div class="ct-fb-row">
              <strong>❄ Seasonal rhythm:</strong>{' '}
              {plan.items.slice(0, 3).map((it) => `${it.qty}× ${nameOf(it.taxon)} (${it.spacingLabel})`).join(', ')}.
            </div>
            <div class="ct-fb-row">
              <strong>Bring to the field:</strong> Spade, {materials.stakes}× tree stakes &amp; ties, {Math.max(1, Math.round(effectiveMulchM3 * 0.4 * 10) / 10)} m³ mulch, root-soaking bucket.
            </div>
            <div class="ct-fb-row is-next">
              <strong>Next-month heads-up:</strong> {calendar[(activeMonth + 1) % 12]?.month}: {calendar[(activeMonth + 1) % 12]?.brief}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Print / Save Bar */}
      <div class="ct-plan-bottom-bar">
        <p class="ct-small-text">
          <strong>Ready for the nursery or Canopi Desktop?</strong> Save your plot area, {layoutLabel} layout, spacing, and quantities into your <code>.canopi</code> file.
        </p>
        <div class="ct-plan-bottom-acts">
          <button type="button" class="ct-studio-btn" onClick={() => window.print()}>
            Print Field &amp; Nursery Sheet (PDF)
          </button>
          <button
            type="button"
            class="button button-primary ct-small"
            onClick={() => void saveStudioCanopi()}
          >
            Save plan to .canopi
          </button>
        </div>
      </div>
    </section>
  );
}
