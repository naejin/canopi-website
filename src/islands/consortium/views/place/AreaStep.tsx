/** @jsxImportSource preact */
// Step 2 Planting Area & Open .canopi Path B (Slice 3.2, v14/v15):
// - Planting Area input + unit selector (m² | ha | ft² | ac), Density (Standard | Intensive | Spacious),
//   Pathways % (0–40%), live Net Plantable Area readout synced to plantingConfig in state/studio.ts
// - Compact Path B ("Open .canopi file") placed below the primary Path A CTA
import { useRef, useState } from 'preact/hooks';
import { convertArea, toSquareMeters, type AreaUnit, type DensityMode } from '../../../../lib/consortium/index.ts';
import { openStudioCanopiText, plantingConfig, setPlantingConfig } from '../../state/studio.ts';
import { FieldTip } from '../kit/field-tip.tsx';

export function AreaStep() {
  const cfg = plantingConfig.value;
  const displayArea = convertArea(cfg.plotAreaM2, cfg.areaUnit);
  const netM2 = Math.max(1, Math.round(cfg.plotAreaM2 * (1 - cfg.pathwaysPct / 100)));
  const netDisplay = convertArea(netM2, cfg.areaUnit);
  const unitLabel = cfg.areaUnit === 'm2' ? 'm²' : cfg.areaUnit === 'ft2' ? 'ft²' : cfg.areaUnit;

  return (
    <section class="ct-area-step" data-area-step aria-labelledby="ct-area-h">
      <div class="ct-postcard-head">
        <h3 class="ct-postcard-title" id="ct-area-h">Planting area</h3>
        <FieldTip
          label="Explain planting area"
          text="Used to scale plant counts, spacing, seed weights, and mulch volume in your Planting Plan. You can change this anytime."
        />
      </div>
      <div class="ct-area-grid">
        <div class="ct-area-field">
          <label for="ct-area-val">Plot size</label>
          <div class="ct-area-inline">
            <input
              id="ct-area-val"
              type="number"
              min="1"
              step={cfg.areaUnit === 'ha' || cfg.areaUnit === 'ac' ? '0.05' : '10'}
              class="ct-area-input"
              value={displayArea}
              onInput={(e) => {
                const raw = Number((e.currentTarget as HTMLInputElement).value);
                if (Number.isFinite(raw) && raw > 0) {
                  setPlantingConfig({ plotAreaM2: toSquareMeters(raw, cfg.areaUnit) });
                }
              }}
            />
            <select
              aria-label="Area unit"
              class="ct-area-select"
              value={cfg.areaUnit}
              onChange={(e) => setPlantingConfig({ areaUnit: (e.currentTarget as HTMLSelectElement).value as AreaUnit })}
            >
              <option value="m2">m²</option>
              <option value="ha">ha</option>
              <option value="ft2">ft²</option>
              <option value="ac">ac</option>
            </select>
          </div>
        </div>

        <div class="ct-area-field">
          <label for="ct-area-density">Density</label>
          <select
            id="ct-area-density"
            class="ct-area-select"
            value={cfg.densityMode}
            onChange={(e) => setPlantingConfig({ densityMode: (e.currentTarget as HTMLSelectElement).value as DensityMode })}
          >
            <option value="balanced">Standard</option>
            <option value="dense">Intensive</option>
            <option value="spacious">Spacious</option>
          </select>
        </div>

        <div class="ct-area-field">
          <label for="ct-area-paths">Pathways ({cfg.pathwaysPct}%)</label>
          <input
            id="ct-area-paths"
            type="range"
            min="0"
            max="40"
            step="5"
            value={cfg.pathwaysPct}
            onInput={(e) => setPlantingConfig({ pathwaysPct: Number((e.currentTarget as HTMLInputElement).value) })}
          />
        </div>
      </div>

      <div class="ct-area-net" data-net-area>
        <span>Net plantable area</span>
        <strong>{netDisplay} {unitLabel}</strong>
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
    <div class="ct-path-b" data-open-canopi-path-b>
      <span>Already have a Canopi file?</span>
      <input
        ref={inputRef}
        type="file"
        accept=".canopi,application/json"
        hidden
        onChange={(e) => void onFile((e.currentTarget as HTMLInputElement).files?.[0])}
      />
      <button type="button" class="button button-secondary ct-small" onClick={() => inputRef.current?.click()}>
        Open .canopi file
      </button>
      {error && <p class="ct-path-b-err" role="alert">{error}</p>}
    </div>
  );
}
