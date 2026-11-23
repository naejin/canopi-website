/** @jsxImportSource preact */
// Full Grower-Grade Planting Plan Tab (Slice 3.4, v14/v15 — lazy-loaded on first open):
// - Unified 4-Column Hairline Metrics Strip + merged Agronomy Notes footer (shade-timing & pollination alerts)
// - Interactive Pure-SVG Plot Layout & Spacing Blueprint (Guild Clusters | Syntropic Alley Rows | Orchard Grid
//   + automatic repeatable 10x10 m module view at large scale)
// - Nursery Order & Spacing Ledger (+10% buffer toggle, inline quantity overrides persisted in .canopi v9,
//   Nursery Lead-Time Ribbon, Swiss-editorial table on desktop + Field Order Cards on mobile <= 639px)
// - Unified 4-Column Hairline Materials Ledger + quiet inline Extreme-Year Field Insurance + 4 Planting Waves
// - 12-Month Field Action Calendar + Weekend Briefs
import { useMemo, useState } from 'preact/hooks';
import {
  computeFieldMaterials,
  computePlantingPlan,
  computePlantingWaves,
  convertArea,
  siteClimate as climateOf,
  type LayoutPattern,
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
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
  const unitLabel = cfg.areaUnit === 'm2' ? 'm²' : cfg.areaUnit === 'ft2' ? 'ft²' : cfg.areaUnit;

  if (!members.length) {
    return (
      <section class="ct-studio-section" data-planting-plan-tab>
        <p class="ct-muted">Add species first to generate nursery counts, spacing blueprint, materials, and planting waves.</p>
        <button type="button" class="button button-secondary ct-small" onClick={() => { studioTab.value = 'palette'; }}>Return to My Palette</button>
      </section>
    );
  }

  const activeBrief = calendar[activeMonth] ?? calendar[0];

  return (
    <section class="ct-studio-section" data-planting-plan-tab aria-label="Planting plan">
      {/* 1. Unified 4-Column Hairline Metrics Strip + merged Agronomy Notes footer */}
      <div class="ct-plan-ledger-card">
        <div class="ct-plan-kpis">
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Net plantable area</span>
            <span class="ct-plan-kpi-val">{convertArea(plan.netAreaM2, cfg.areaUnit)} {unitLabel}</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Total plants &amp; starts</span>
            <span class="ct-plan-kpi-val">{plan.totalUnits}</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Direct-sow seed</span>
            <span class="ct-plan-kpi-val">{plan.totalSeedGrams} g</span>
          </div>
          <div class="ct-plan-kpi">
            <span class="ct-plan-kpi-label">Stacked coverage</span>
            <span class="ct-plan-kpi-val">{plan.coveragePct}%</span>
          </div>
        </div>
        {plan.notes.length > 0 && (
          <div class="ct-plan-notes-foot">
            {plan.notes.map((n, i) => (
              <p key={i} class="ct-plan-note">
                <strong>{n.label}:</strong> {n.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 2. Interactive Pure-SVG Plot Layout & Spacing Blueprint */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">Plot Layout &amp; Spacing Blueprint</h3>
            <span class="ct-small-text ct-muted">{blueprint.moduleLabel}</span>
          </div>
          <div class="ct-seg-switch" role="group" aria-label="Layout pattern">
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
                <circle cx={n.x} cy={n.y} r={n.r} />
                <text x={n.x} y={n.y + 3} text-anchor="middle">{n.label.slice(0, 6)}</text>
              </g>
            ))}
          </svg>
        </figure>
      </div>

      {/* 3. Nursery Order & Spacing Ledger */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <div>
            <h3 class="ct-sys-title">Nursery Order &amp; Spacing Ledger</h3>
            <span class="ct-small-text ct-muted">
              Lead times: Bare-root Sep–Oct ({plan.stockSummary.bareroot}) · Bulbs Sep ({plan.stockSummary.bulb}) · Pots Feb ({plan.stockSummary.pot}) · Seeds Jan–Feb ({plan.stockSummary.seedPacks})
            </span>
          </div>
          <button
            type="button"
            class={`ct-stress-chip${cfg.bufferPct === 10 ? ' is-active' : ''}`}
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

      {/* 4. Unified 4-Column Hairline Materials Ledger + Extreme-Year Insurance + 4 Waves */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">Field Materials &amp; 4 Frost-Anchored Waves</h3>
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
          <strong>Extreme-year field insurance:</strong> {materials.wateringDetail} Keep a 10 cm living or wood-chip mulch collar clear of woody stems during Year 1–2 heat domes and late frosts.
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

      {/* 5. 12-Month Field Action Calendar + Weekend Briefs */}
      <div class="ct-sys-block">
        <div class="ct-sys-head">
          <h3 class="ct-sys-title">12-Month Field Action Calendar</h3>
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
