/** @jsxImportSource preact */
// Step 2 Planting Area & Open .canopi Path B (Stage 1 — 1:1 port of v14 mockup-01-onboard):
// - Dark-pill Area unit (m² | ha | ft² | ac), Density (Spacious 0.7× | Balanced 1.0× | Dense syntropic 1.4×),
//   Pathways % (0% | 10% | 20% | 30%), live Net planted area readout synced to plantingConfig
// - Compact Path B dashed dropzone ("Drop a .canopi file or browse" + "Browse…")
import { convertArea, toSquareMeters, type AreaUnit, type DensityMode } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { plantingConfig, setPlantingConfig } from '../../state/studio.ts';

const UNITS: readonly { id: AreaUnit; label: string }[] = [
  { id: 'm2', label: 'm²' },
  { id: 'ha', label: 'ha' },
  { id: 'ft2', label: 'ft²' },
  { id: 'ac', label: 'ac' },
];

const DENSITIES: readonly DensityMode[] = ['spacious', 'balanced', 'dense'];

const PATHWAYS = [0, 10, 20, 30] as const;

export function AreaStep() {
  const cfg = plantingConfig.value;
  const displayArea = convertArea(cfg.plotAreaM2, cfg.areaUnit);
  const netM2 = Math.max(1, Math.round(cfg.plotAreaM2 * (1 - cfg.pathwaysPct / 100)));
  const netDisplay = convertArea(netM2, cfg.areaUnit);
  const unitLabel = cfg.areaUnit === 'm2' ? 'm²' : cfg.areaUnit === 'ft2' ? 'ft²' : cfg.areaUnit;

  return (
    <section class="ob-space-strip" data-area-step aria-label={T('studio.area.title')}>
      <div class="ob-space-controls">
        <div>
          <label class="fp-label" for="ct-area-val" style="margin-bottom:5px; display:block;">{T('studio.area.title')}</label>
          <div class="area-input-row">
            <input
              id="ct-area-val"
              type="number"
              min="1"
              step={cfg.areaUnit === 'ha' || cfg.areaUnit === 'ac' ? '0.05' : '10'}
              class="area-num-input"
              style="width:104px; padding:6px 9px; font-size:15.5px;"
              aria-label={T('studio.area.valueAria')}
              value={displayArea}
              onInput={(e) => {
                const raw = Number((e.currentTarget as HTMLInputElement).value);
                if (Number.isFinite(raw) && raw > 0) {
                  setPlantingConfig({ plotAreaM2: toSquareMeters(raw, cfg.areaUnit) });
                }
              }}
            />
            <div class="ink-seg" role="group" aria-label={T('studio.area.unitAria')}>
              {UNITS.map((u) => (
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

        <div>
          <div class="fp-label" style="margin-bottom:5px;">{T('studio.area.density')}</div>
          <div class="chip-row" role="group" aria-label={T('studio.area.densityAria')}>
            {DENSITIES.map((d) => (
              <button
                key={d}
                type="button"
                class="filter-chip"
                aria-pressed={cfg.densityMode === d ? 'true' : 'false'}
                onClick={() => setPlantingConfig({ densityMode: d })}
              >
                {T(`studio.density.${d}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div class="fp-label" style="margin-bottom:5px;">{T('studio.area.pathways')}</div>
          <div class="chip-row" role="group" aria-label={T('studio.area.pathwaysAria')}>
            {PATHWAYS.map((pct) => (
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
      </div>

      <div class="ob-net-line" data-net-area>
        <span>
          <strong>{T('studio.area.netLabel', { area: `${netDisplay} ${unitLabel}` })}</strong>{' '}
          {T('studio.area.netOf', { gross: `${displayArea} ${unitLabel}`, pct: cfg.pathwaysPct })}
        </span>
        <span style="font-size:12.5px; color:var(--ink-muted);">{T('studio.area.autoSizes')}</span>
      </div>
    </section>
  );
}
