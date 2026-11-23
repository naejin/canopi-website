/** @jsxImportSource preact */
// Step 2 Planting Area & Open .canopi Path B (Stage 1 — 1:1 port of v14 mockup-01-onboard):
// - Dark-pill Area unit (m² | ha | ft² | ac), Density (Spacious 0.7× | Balanced 1.0× | Dense syntropic 1.4×),
//   Pathways % (0% | 10% | 20% | 30%), live Net planted area readout synced to plantingConfig
// - Compact Path B dashed dropzone ("Drop a .canopi file or browse" + "Browse…")
import { useRef, useState } from 'preact/hooks';
import { convertArea, toSquareMeters, type AreaUnit, type DensityMode } from '../../../../lib/consortium/index.ts';
import { openStudioCanopiText, plantingConfig, setPlantingConfig } from '../../state/studio.ts';

const UNITS: readonly { id: AreaUnit; label: string }[] = [
  { id: 'm2', label: 'm²' },
  { id: 'ha', label: 'ha' },
  { id: 'ft2', label: 'ft²' },
  { id: 'ac', label: 'ac' },
];

const DENSITIES: readonly { id: DensityMode; label: string }[] = [
  { id: 'spacious', label: 'Spacious 0.7×' },
  { id: 'balanced', label: 'Balanced 1.0×' },
  { id: 'dense', label: 'Dense 1.4×' },
];

const PATHWAYS = [0, 10, 20, 30] as const;

export function AreaStep() {
  const cfg = plantingConfig.value;
  const displayArea = convertArea(cfg.plotAreaM2, cfg.areaUnit);
  const netM2 = Math.max(1, Math.round(cfg.plotAreaM2 * (1 - cfg.pathwaysPct / 100)));
  const netDisplay = convertArea(netM2, cfg.areaUnit);
  const unitLabel = cfg.areaUnit === 'm2' ? 'm²' : cfg.areaUnit === 'ft2' ? 'ft²' : cfg.areaUnit;

  return (
    <section class="area-control-box" style="margin-top:12px;" data-area-step aria-label="Planting area">
      <div class="area-grid">
        <div class="area-field">
          <label for="ct-area-val">PLANTING AREA</label>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <input
              id="ct-area-val"
              type="number"
              min="1"
              step={cfg.areaUnit === 'ha' || cfg.areaUnit === 'ac' ? '0.05' : '10'}
              class="area-num-input"
              value={displayArea}
              onInput={(e) => {
                const raw = Number((e.currentTarget as HTMLInputElement).value);
                if (Number.isFinite(raw) && raw > 0) {
                  setPlantingConfig({ plotAreaM2: toSquareMeters(raw, cfg.areaUnit) });
                }
              }}
            />
            <div class="ink-seg" role="group" aria-label="Area unit">
              {UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  class="ink-seg-btn"
                  aria-pressed={cfg.areaUnit === u.id ? 'true' : 'false'}
                  onClick={() => setPlantingConfig({ areaUnit: u.id })}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div class="area-field">
          <label>DENSITY</label>
          <div class="ink-seg" role="group" aria-label="Planting density">
            {DENSITIES.map((d) => (
              <button
                key={d.id}
                type="button"
                class="ink-seg-btn"
                aria-pressed={cfg.densityMode === d.id ? 'true' : 'false'}
                onClick={() => setPlantingConfig({ densityMode: d.id })}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div class="area-field">
          <label>PATHWAYS %</label>
          <div class="ink-seg" role="group" aria-label="Pathways percentage">
            {PATHWAYS.map((pct) => (
              <button
                key={pct}
                type="button"
                class="ink-seg-btn"
                aria-pressed={cfg.pathwaysPct === pct ? 'true' : 'false'}
                onClick={() => setPlantingConfig({ pathwaysPct: pct })}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      <div class="area-net-line" data-net-area>
        <span>Net planted area: <strong>{netDisplay} {unitLabel}</strong> of {displayArea} {unitLabel} ({cfg.pathwaysPct}% paths &amp; access)</span>
        <span>Auto-sizes plant counts &amp; spacing in Planting Plan</span>
      </div>
    </section>
  );
}

export function OpenCanopiPathB() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const text = await file.text();
    const res = openStudioCanopiText(text);
    if (!res.ok) setError(res.error);
  };

  return (
    <div class="ob-dropzone-compact" data-open-canopi-path-b onClick={() => inputRef.current?.click()}>
      <div style="min-width:0;">
        <strong style="font-size:13.5px; color:var(--ink); display:block;">Drop a .canopi file or browse</strong>
        <span style="font-size:12px; color:var(--ink-muted);">Stays local · custom plants preserved intact</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".canopi,application/json"
        hidden
        onChange={(e) => {
          const input = e.currentTarget as HTMLInputElement;
          const file = input.files?.[0];
          input.value = '';
          void onFile(file);
        }}
      />
      <button type="button" class="btn btn-xs" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
        Browse…
      </button>
      {error && <p class="ct-muted" role="alert">{error}</p>}
    </div>
  );
}
