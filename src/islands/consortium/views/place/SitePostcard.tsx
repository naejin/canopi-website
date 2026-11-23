/** @jsxImportSource preact */
// Step 1 Site & Climate Postcard (Slice 3.2, v14/v15 editorial design):
// - 3 hairline editorial rows: Winter & Frost, Summer & Rain, Soil & Subsoil (with .field-tip explanations)
// - Quiet 1-line Mild-Winter / frost-free footer when applicable
// - Collapsible interactive Microclimate Sliders (Slope °, Aspect, Landform) wired to adjustMicroclimate()
// - ODbL 1.0 attribution (COPERNICUS/DEM/GLO30_2024_1 + MERIT/Hydro/v1_0_1)
import { siteClimate as climateOf } from '../../../../lib/consortium/index.ts';
import { adjustMicroclimate, type MicroAspect, type MicroLandform } from '../../../../lib/climate/v07.ts';
import { location as siteLocation, climate } from '../../store.ts';
import { pageLang } from '../../strings.ts';
import { formatTemp } from '../../format.ts';
import { zoneName } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import { microclimate, setMicroclimate } from '../../state/studio.ts';

const ASPECT_LABELS: readonly { id: MicroAspect; label: string }[] = [
  { id: 'flat', label: 'Level / flat' },
  { id: 'south', label: 'South-facing' },
  { id: 'east', label: 'East-facing' },
  { id: 'west', label: 'West-facing' },
  { id: 'north', label: 'North-facing' },
];

const LANDFORM_LABELS: readonly { id: MicroLandform; label: string }[] = [
  { id: 'mid-slope', label: 'Mid-slope / level' },
  { id: 'ridge', label: 'Ridge / exposed crest' },
  { id: 'valley', label: 'Valley / frost hollow' },
];

export function SitePostcard() {
  const loc = siteLocation.value;
  const z = climate.value;
  if (!loc?.lookup || !z) return null;
  const sc = climateOf(loc.lookup);
  if (!sc.today) return null;

  const lang = pageLang();
  const mc = microclimate.value;
  const adj = adjustMicroclimate(
    { coldC: sc.today.tminColdC, hotC: sc.today.tmaxWarmC, lat: loc.lat },
    { slopeDeg: mc.slopeDeg, aspect: mc.aspect, landform: mc.landform },
  );

  const mildWinter = adj.adjustedColdC >= 0;
  const ph = loc.lookup.soil?.phH2o;
  const tex = loc.lookup.soil?.texture;
  const aridity = sc.today.aridityIndex;
  const hasMicroShift = adj.coldDeltaC !== 0 || adj.hotDeltaC !== 0 || adj.falseSpringDeltaPct !== 0;

  return (
    <section class="ct-postcard" data-site-postcard aria-label="Site climate summary">
      <div class="ct-postcard-head">
        <h3 class="ct-postcard-title">{zoneName(z)}</h3>
        <span class="ct-postcard-koppen">Köppen {sc.koppen}</span>
      </div>

      <ul class="ct-postcard-rows">
        <li class="ct-postcard-row">
          <span class="ct-postcard-label">
            Winter &amp; Frost
            <FieldTip
              label="Explain Winter and Frost"
              text="Coldest-month average low adjusted for your slope and landform. Used to check winter hardiness and frost-window timing."
            />
          </span>
          <span class="ct-postcard-val">
            {formatTemp(adj.adjustedColdC, lang)} coldest low · {mildWinter ? 'Mild winter' : 'Hard frosts'}
          </span>
        </li>
        <li class="ct-postcard-row">
          <span class="ct-postcard-label">
            Summer &amp; Rain
            <FieldTip
              label="Explain Summer and Rain"
              text="Warmest-month average high and aridity balance. Higher aridity means more rain relative to summer evaporation."
            />
          </span>
          <span class="ct-postcard-val">
            {formatTemp(adj.adjustedHotC, lang)} warmest high{aridity != null ? ` · Aridity ${aridity.toFixed(2)}` : ''}
          </span>
        </li>
        <li class="ct-postcard-row">
          <span class="ct-postcard-label">
            Soil &amp; Subsoil
            <FieldTip
              label="Explain Soil and Subsoil"
              text="Regional baseline soil pH and texture from soil grids. Always verify with a local spade and pH test on your plot."
            />
          </span>
          <span class="ct-postcard-val">
            {ph != null ? `pH ${ph.toFixed(1)}` : 'pH unrecorded'}
            {tex ? ` · ${tex}` : ''}
          </span>
        </li>
      </ul>

      {mildWinter && (
        <p class="ct-postcard-foot" data-mild-winter-note>
          Mild-winter site — frost-free or light-frost window; low-chill temperate trees perform best.
        </p>
      )}

      <details class="ct-micro" data-microclimate>
        <summary>Microclimate adjustment (slope, aspect, landform)</summary>
        <div class="ct-micro-grid">
          <div class="ct-micro-field">
            <div class="ct-micro-field-head">
              <label for="ct-micro-slope">Slope</label>
              <span>{mc.slopeDeg}°</span>
            </div>
            <input
              id="ct-micro-slope"
              type="range"
              min="0"
              max="35"
              step="1"
              value={mc.slopeDeg}
              onInput={(e) => setMicroclimate({ slopeDeg: Number((e.currentTarget as HTMLInputElement).value) })}
            />
          </div>
          <div class="ct-micro-field">
            <label for="ct-micro-aspect">Aspect</label>
            <select
              id="ct-micro-aspect"
              value={mc.aspect}
              onChange={(e) => setMicroclimate({ aspect: (e.currentTarget as HTMLSelectElement).value as MicroAspect })}
            >
              {ASPECT_LABELS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div class="ct-micro-field">
            <label for="ct-micro-landform">Landform</label>
            <select
              id="ct-micro-landform"
              value={mc.landform}
              onChange={(e) => setMicroclimate({ landform: (e.currentTarget as HTMLSelectElement).value as MicroLandform })}
            >
              {LANDFORM_LABELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
        </div>
        {hasMicroShift && (
          <p class="ct-micro-delta" data-microclimate-delta>
            Microclimate shift: {adj.coldDeltaC >= 0 ? '+' : ''}{adj.coldDeltaC}°C winter low · {adj.hotDeltaC >= 0 ? '+' : ''}{adj.hotDeltaC}°C summer high · {adj.falseSpringDeltaPct >= 0 ? '+' : ''}{adj.falseSpringDeltaPct}% false-spring risk
          </p>
        )}
      </details>

      <p class="ct-postcard-attr">
        Terrain &amp; hydrology attribution (ODbL 1.0): COPERNICUS/DEM/GLO30_2024_1 · MERIT/Hydro/v1_0_1
      </p>
    </section>
  );
}
