/** @jsxImportSource preact */
// Planting Plan Tab (Slice VP-2 — direct 1:1 port of v14 mockup-05-plan.png):
// - 1 · FIELD SIZING & DESIGN READINESS Hero Card (eyebrow + pill + Edit location & soil ->,
//   display heading + subtitle, warm inset controls box for Area/Unit/Density/Pathways/+10% buffer,
//   unified 4-column hairline metrics strip + merged Shade-timing & Pollination notes footer)
// - Plot Layout & Spacing Blueprint (dark-pill Guild Clusters | Syntropic Alley Rows | Orchard Grid,
//   dashed mature-spread outer rings, non-clipping 2-letter initials, clickable legend)
// - Swiss-editorial Nursery Order Table (desktop) & Field Order Cards (mobile <= 639px)
// - Materials Ledger + Extreme-Year Insurance + 4 Frost-Anchored Waves + 12-Month Action Calendar
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
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { backToPlace } from '../../state/draft.ts';
import {
  openFieldDossier,
  plantingConfig,
  setPlantingConfig,
  setQuantityOverride,
  studioTab,
} from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import {
  buildPlantingActionCalendar,
  computePlotLayout,
} from '../../rules/studio-analysis.ts';

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

export function PlantingPlanTab() {
  const members = store.memberTaxa.value;
  const cfg = plantingConfig.value;
  const loc = store.location.value;
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const coldC = sc?.today?.tminColdC;
  const [activeMonth, setActiveMonth] = useState(2);

  const plan = useMemo(
    () => computePlantingPlan(members, cfg, { coldC }),
    [members, cfg, coldC],
  );
  const materials = useMemo(() => computeFieldMaterials(plan), [plan]);
  const waves = useMemo(() => computePlantingWaves(plan, { coldC }), [plan, coldC]);
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
          <button
            type="button"
            class="ct-studio-btn"
            onClick={backToPlace}
          >
            Edit location &amp; soil →
          </button>
        </div>

        <div class="ct-plan-hero-head">
          <h2 class="ct-plan-title">Actionable Planting Plan for your {grossDisplay} {unitMeta.label} plot</h2>
          <p class="ct-sys-sub">
            Realistic guild quantities, scaled layout blueprint, nursery lead times, field materials, and month-by-month actions — live-synced with your Location and .canopi file.
          </p>
        </div>

        {/* Warm Inset Controls Box */}
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

          <div class="ct-plan-ctrl-group">
            <span class="ct-eyebrow">SAFETY MARGIN</span>
            <button
              type="button"
              class={`ct-plan-pill-btn${cfg.bufferPct === 10 ? ' is-active' : ''}`}
              aria-pressed={cfg.bufferPct === 10 ? 'true' : 'false'}
              onClick={() => setPlantingConfig({ bufferPct: cfg.bufferPct === 10 ? 0 : 10 })}
            >
              +10% establishment buffer
            </button>
          </div>
        </div>

        {/* Unified 4-Column Hairline Metrics Strip */}
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
            <span class="ct-plan-kpi-sub">{waves[0]?.kicker ?? 'Autumn/Winter root-in'}</span>
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

      {/* 2 · Plot Layout & Spacing Blueprint */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">
              {T('studio.planBlueprint')} · {blueprint.widthM} m × {blueprint.heightM} m
            </h3>
            <p class="ct-sys-sub">
              {blueprint.moduleLabel} with dashed mature-spread rings and {cfg.pathwaysPct}% access paths. Click any species in the legend for its Field Dossier.
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
            viewBox={`0 0 ${blueprint.viewWidth} ${blueprint.viewHeight}`}
            class="ct-blueprint-svg"
            role="img"
            aria-label={`Planting layout blueprint (${cfg.layoutPattern})`}
          >
            <rect class="ct-bp-frame" x="14" y="14" width={blueprint.viewWidth - 28} height={blueprint.viewHeight - 28} rx="8" />
            {blueprint.lanes.map((y, idx) => (
              <line key={idx} class="ct-bp-lane" x1="24" y1={y} x2={blueprint.viewWidth - 24} y2={y} />
            ))}
            {blueprint.nodes.map((n) => (
              <g key={n.id} class="ct-bp-node" data-stratum={n.sunBand}>
                <circle class="ct-bp-spread-ring" cx={n.x} cy={n.y} r={Math.round(n.r * 1.38)} />
                <circle cx={n.x} cy={n.y} r={n.r} />
                <text class="ct-bp-abbr" x={n.x} y={n.y + 3.5} text-anchor="middle">{n.initials}</text>
              </g>
            ))}
          </svg>
          <figcaption class="ct-bp-legend">
            {blueprint.nodes.map((n) => {
              const t = store.taxonOf(n.id);
              return (
                <button key={n.id} type="button" class="ct-bp-leg-item" onClick={() => openFieldDossier(n.id, memberIds)}>
                  <span class="ct-bp-dot" data-stratum={n.sunBand}>{n.initials}</span>
                  <span>{t ? nameOf(t) : n.label}</span>
                </button>
              );
            })}
          </figcaption>
        </figure>
      </div>

      {/* 3 · Nursery Order & Spacing Ledger */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">{T('studio.planOrder')}</h3>
            <span class="ct-small-text ct-muted">
              Lead times: Bare-root Sep–Oct ({plan.stockSummary.bareroot}) · Bulbs Sep ({plan.stockSummary.bulb}) · Pots Feb ({plan.stockSummary.pot}) · Seeds Jan–Feb ({plan.stockSummary.seedPacks})
            </span>
          </div>
          <button
            type="button"
            class={`ct-plan-pill-btn${cfg.bufferPct === 10 ? ' is-active' : ''}`}
            aria-pressed={cfg.bufferPct === 10 ? 'true' : 'false'}
            onClick={() => setPlantingConfig({ bufferPct: cfg.bufferPct === 10 ? 0 : 10 })}
          >
            +10% establishment buffer
          </button>
        </div>

        {/* Desktop Swiss-editorial table */}
        <div class="ct-plan-table-wrap ct-plan-desktop">
          <table class="ct-plan-table">
            <thead>
              <tr>
                <th>Species</th>
                <th>Stock &amp; lead time</th>
                <th>Spacing</th>
                <th>Qty (editable)</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.taxon.id}>
                  <td>
                    <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
                      <strong>{nameOf(item.taxon)}</strong>
                    </button>{' '}
                    <span class="ct-sci">{item.taxon.canonical_name}</span>
                  </td>
                  <td>
                    {item.stockLabel}{item.seedGrams > 0 ? ` (${item.seedGrams} g)` : ''}
                    <span class="ct-muted"> · {item.orderWindow}</span>
                  </td>
                  <td>{item.spacingLabel}</td>
                  <td>
                    <div class="ct-qty-edit">
                      <input
                        type="number"
                        class="ct-qty-input"
                        min={0}
                        max={9999}
                        aria-label={`Quantity for ${nameOf(item.taxon)}`}
                        value={item.qty}
                        onChange={(e) => setQuantityOverride(item.taxon.id, Number((e.currentTarget as HTMLInputElement).value))}
                      />
                      {item.isCustom && (
                        <button type="button" class="ct-qty-reset" onClick={() => setQuantityOverride(item.taxon.id, null)}>
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                  <td>{item.stageLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Field Order Cards (<= 639px) */}
        <div class="ct-plan-mobile">
          {plan.items.map((item) => (
            <article key={item.taxon.id} class="ct-order-card">
              <div class="ct-order-card-head">
                <button type="button" class="ct-sys-link" onClick={() => openFieldDossier(item.taxon.id, memberIds)}>
                  <strong>{nameOf(item.taxon)}</strong>
                </button>
                <span class="ct-small-text ct-muted">{item.spacingLabel}</span>
              </div>
              <div class="ct-small-text ct-muted">
                {item.stockLabel}{item.seedGrams > 0 ? ` (${item.seedGrams} g)` : ''} · {item.orderWindow}
              </div>
              <div class="ct-qty-edit">
                <label class="ct-small-text">
                  Qty{' '}
                  <input
                    type="number"
                    class="ct-qty-input"
                    min={0}
                    max={9999}
                    value={item.qty}
                    onChange={(e) => setQuantityOverride(item.taxon.id, Number((e.currentTarget as HTMLInputElement).value))}
                  />
                </label>
                {item.isCustom && (
                  <button type="button" class="ct-qty-reset" onClick={() => setQuantityOverride(item.taxon.id, null)}>
                    Reset
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 4 · Unified 4-Column Hairline Materials Ledger + Extreme-Year Insurance + 4 Waves */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">{T('studio.planMaterials')}</h3>
          <span class="ct-small-text ct-muted">Estimated effort: {materials.effortLabel} (~{materials.effortHours} h)</span>
        </div>

        <div class="ct-plan-kpis">
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Wood-chip mulch (10 cm)</span>
            <span class="ct-plan-kpi-val">{materials.mulchM3} m³</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Finished compost</span>
            <span class="ct-plan-kpi-val">{materials.compostL} L</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Tree stakes &amp; tags</span>
            <span class="ct-plan-kpi-val">{materials.stakes} / {materials.tags}</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Establishment watering</span>
            <span class="ct-plan-kpi-val ct-plan-kpi-sm">{materials.wateringCadence}</span>
          </div>
        </div>

        <p class="ct-plan-insurance">
          <strong>Extreme-year field insurance:</strong> {materials.wateringDetail}. Keep a 10 cm living or wood-chip mulch collar clear of woody stems during Year 1–2 heat domes and late frosts.
        </p>

        <div class="ct-plan-waves">
          {waves.map((w) => (
            <div key={w.id} class="ct-plan-wave">
              <strong>{w.title}</strong>
              <span class="ct-muted ct-small-text">{w.kicker}</span>
              <span class="ct-small-text">{w.tasks.join(' · ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5 · 12-Month Field Action Calendar + Weekend Briefs */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">{T('studio.planCalendar')}</h3>
          <span class="ct-small-text ct-muted">Select any month for its weekend brief</span>
        </div>

        <div class="ct-cal-grid" role="group" aria-label="12-month field calendar">
          {calendar.map((m, idx) => (
            <button
              key={m.month}
              type="button"
              class={`ct-cal-cell${activeMonth === idx ? ' is-selected' : ''}`}
              aria-pressed={activeMonth === idx ? 'true' : 'false'}
              onClick={() => setActiveMonth(idx)}
            >
              <strong>{m.month}</strong>
              <span>{m.tag}</span>
            </button>
          ))}
        </div>

        <div class="ct-year-brief">
          <strong>{activeBrief.month} Weekend Brief ({activeBrief.tag})</strong>
          <span>{activeBrief.brief}</span>
        </div>
      </div>
    </section>
  );
}
