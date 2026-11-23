/** @jsxImportSource preact */
// Planting Plan Tab Preview (Slice 3.2, expanded interactively in Slice 3.4).
// Uses the pure agronomic engine from src/lib/consortium/planting-plan.ts.
import { useMemo } from 'preact/hooks';
import {
  computeFieldMaterials,
  computePlantingPlan,
  computePlantingWaves,
  convertArea,
  siteClimate as climateOf,
} from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { plantingConfig, studioTab } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';

export function PlantingPlanTab() {
  const members = store.memberTaxa.value;
  const cfg = plantingConfig.value;
  const loc = store.location.value;
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const coldC = sc?.today?.tminColdC;

  const plan = useMemo(
    () => computePlantingPlan(members, cfg, { coldC }),
    [members, cfg, coldC],
  );
  const materials = useMemo(() => computeFieldMaterials(plan), [plan]);
  const waves = useMemo(() => computePlantingWaves(plan, { coldC }), [plan, coldC]);
  const unitLabel = cfg.areaUnit === 'm2' ? 'm²' : cfg.areaUnit === 'ft2' ? 'ft²' : cfg.areaUnit;

  if (!members.length) {
    return (
      <section class="ct-plan-preview" data-planting-plan-tab>
        <p class="ct-muted">Add species in My Palette to compute quantities, seed weights, materials, and planting waves.</p>
        <p>
          <button type="button" class="button button-secondary ct-small" onClick={() => { studioTab.value = 'palette'; }}>
            Back to My Palette
          </button>
        </p>
      </section>
    );
  }

  return (
    <section class="ct-plan-preview" data-planting-plan-tab aria-label="Planting plan summary">
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
          <span class="ct-plan-kpi-label">Mulch (10 cm)</span>
          <span class="ct-plan-kpi-val">{materials.mulchM3} m³</span>
        </div>
      </div>

      <div class="ct-plan-table-wrap">
        <table class="ct-plan-table">
          <thead>
            <tr>
              <th>Species</th>
              <th>Stock</th>
              <th>Spacing</th>
              <th>Qty</th>
              <th>Window</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => (
              <tr key={item.taxon.id}>
                <td><strong>{nameOf(item.taxon)}</strong> <span class="ct-sci">{item.taxon.canonical_name}</span></td>
                <td>{item.stockLabel}{item.seedGrams > 0 ? ` (${item.seedGrams} g)` : ''}</td>
                <td>{item.spacingM} m</td>
                <td>{item.qty}</td>
                <td>{item.stageLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="ct-plan-waves">
        {waves.map((w) => (
          <div key={w.id} class="ct-plan-wave">
            <strong>{w.title}</strong>
            <span class="ct-muted ct-small-text">{w.kicker}</span>
            <span class="ct-small-text">{w.tasks.join(' · ')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
