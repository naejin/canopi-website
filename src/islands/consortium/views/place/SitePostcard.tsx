/** @jsxImportSource preact */
// Step 1 Site & Climate Postcard (Stage 1 — 1:1 port of v14 mockup-01-onboard):
// - Thick ink left-bordered .ct-postcard with place header + compact country/climate tag
// - 3 hairline editorial rows: WINTER & FROST, SUMMER & RAIN, SOIL & SUBSOIL
// - Mild-winter advantage line when applicable
// - Collapsible "Tune canopi-climate readings & microclimate (live updates)" hosting sliders + PlaceFigures
// - ODbL 1.0 + canopi-data Schema 4.9 attribution footer
import type { ComponentChildren } from 'preact';
import { siteClimate as climateOf } from '../../../../lib/consortium/index.ts';
import { adjustMicroclimate, type MicroAspect, type MicroLandform } from '../../../../lib/climate/v07.ts';
import { location as siteLocation, climate, country } from '../../store.ts';
import { pageLang } from '../../strings.ts';
import { formatTemp } from '../../format.ts';
import { countryName, zoneName } from '../kit/names.ts';
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

export function SitePostcard({ children }: { children?: ComponentChildren }) {
  const loc = siteLocation.value;
  const z = climate.value;
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const lang = pageLang();
  const mc = microclimate.value;
  const cCode = country.value.code;
  const cLabel = cCode ? `${countryName(cCode)} invasive list active` : 'No invasive list active';

  const hasLive = Boolean(loc?.lookup && sc?.today);
  const adj = hasLive && loc && sc?.today
    ? adjustMicroclimate(
        { coldC: sc.today.tminColdC, hotC: sc.today.tmaxWarmC, lat: loc.lat },
        { slopeDeg: mc.slopeDeg, aspect: mc.aspect, landform: mc.landform },
      )
    : null;

  const mildWinter = adj ? adj.adjustedColdC >= 0 : (z === 'Mediterranean' || z === 'Subtropical' || z === 'Tropical');
  const ph = loc?.lookup?.soil?.phH2o ?? null;
  const tex = loc?.lookup?.soil?.texture ?? null;
  const aridity = sc?.today?.aridityIndex ?? null;
  const hasMicroShift = Boolean(adj && (adj.coldDeltaC !== 0 || adj.hotDeltaC !== 0 || adj.falseSpringDeltaPct !== 0));

  const title = loc?.label || (z ? `${zoneName(z)} climate` : 'Select a town or sample plot');
  const summary = hasLive && sc
    ? `${z ? zoneName(z) : 'Local'} climate (Köppen ${sc.koppen}) read on-device from your 11 km climate & soil grid${ph != null ? ` (soil pH ${ph.toFixed(1)})` : ''}.`
    : z
      ? `Using the ${zoneName(z)} regional climate baseline. Search a town or click a sample plot above for local soil pH and 2050s warming.`
      : 'Pick a sample plot above or enter your town/coordinates to read local frost lows, summer peaks, and soil pH from on-device tiles.';

  return (
    <section class="postcard" data-site-postcard aria-label="Site climate summary">
      <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
        <strong class="ct-postcard-title" style="font-family:var(--font-display); font-size:18px;">{title}</strong>
        <span style="font-size:12.5px; color:var(--ink-muted);">From canopi-climate v0.7.0 · {cLabel}</span>
      </div>
      <p style="margin:0; font-size:14.5px; color:var(--ink-soft);">{summary}</p>

      <div class="ob-forces-list">
        <div class="ob-force-row">
          <span class="ob-fk">WINTER &amp; FROST</span>
          <span class="ob-fv">
            {adj
              ? `${formatTemp(adj.adjustedColdC, lang)} coldest low · ${mildWinter ? 'Mild winter' : 'Hard frosts'}`
              : z
                ? `${zoneName(z)} baseline · ${mildWinter ? 'Mild winter' : 'Seasonal frosts'}`
                : 'Awaiting location — pick a sample plot or search'}
          </span>
        </div>
        <div class="ob-force-row">
          <span class="ob-fk">SUMMER &amp; RAIN</span>
          <span class="ob-fv">
            {adj
              ? `${formatTemp(adj.adjustedHotC, lang)} warmest high${aridity != null ? ` · Aridity ${aridity.toFixed(2)}` : ''}`
              : 'Read automatically from local climate tiles'}
          </span>
        </div>
        <div class="ob-force-row">
          <span class="ob-fk">SOIL &amp; SUBSOIL</span>
          <span class="ob-fv">
            {ph != null
              ? `Topsoil pH ${ph.toFixed(1)}${tex ? ` · ${tex}` : ''}`
              : 'Baseline soil grid · editable below'}
          </span>
        </div>
      </div>

      {mildWinter && (
        <div class="ob-mild-line" data-mild-winter-note>
          <strong>❄ Mild-winter advantage:</strong> Nov–Mar stays frost-rare — sow cool-season species in autumn to build deep roots on winter rain.
        </div>
      )}

      <details style="font-size:13.5px; color:var(--ink-soft); border-top:1px dashed var(--border-strong); padding-top:8px; margin-top:10px;" data-microclimate>
        <summary style="cursor:pointer; font-weight:600; color:var(--ink);">Tune canopi-climate readings &amp; microclimate (live updates)</summary>
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
        {hasMicroShift && adj && (
          <p class="ct-micro-delta" data-microclimate-delta>
            Microclimate shift: {adj.coldDeltaC >= 0 ? '+' : ''}{adj.coldDeltaC}°C winter low · {adj.hotDeltaC >= 0 ? '+' : ''}{adj.hotDeltaC}°C summer high · {adj.falseSpringDeltaPct >= 0 ? '+' : ''}{adj.falseSpringDeltaPct}% false-spring risk
          </p>
        )}
        {children}
      </details>

      <div class="attr-footer">
        Climate &amp; terrain: <strong>canopi-climate v0.7.0</strong> (COPERNICUS/DEM/GLO30 &amp; MERIT/Hydro, ODbL 1.0) · Plant data: <strong>canopi-data Schema 4.9</strong>
      </div>
    </section>
  );
}
