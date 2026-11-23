/** @jsxImportSource preact */
// Field-Notebook Site Tuning Studio (Stage 1J):
// Replaces legacy unstyled <PlaceFigures /> inside SitePostcard's <details data-microclimate>
// with tactile 2x2 climate/soil sliders, pill-based water/drainage/medium selectors,
// microclimate terrain controls (zero native <select>s), and a compact methodology footer.
import { useEffect, useRef } from 'preact/hooks';
import {
  NO_EDITS,
  siteEditsOf,
  type SiteEdits,
} from '../../../../lib/consortium/index.ts';
import type { MicroAspect, MicroLandform } from '../../../../lib/climate/v07.ts';
import {
  figureLine,
  location as siteLocation,
  climate,
  siteEdits,
} from '../../store.ts';
import { microclimate, setMicroclimate } from '../../state/studio.ts';
import {
  formatFreezeTag,
  formatHeatPeakTag,
  phReactionLabel,
  signedTemp1,
  siteClimateProfile,
} from '../../rules/climate-words.ts';

const ASPECTS: readonly { id: MicroAspect; label: string }[] = [
  { id: 'flat', label: 'Flat' },
  { id: 'south', label: 'South' },
  { id: 'east', label: 'East' },
  { id: 'west', label: 'West' },
  { id: 'north', label: 'North' },
];

const LANDFORMS: readonly { id: MicroLandform; label: string }[] = [
  { id: 'ridge', label: 'Ridge' },
  { id: 'mid-slope', label: 'Mid-slope' },
  { id: 'valley', label: 'Valley frost pocket' },
];

const WATERINGS: readonly { id: NonNullable<SiteEdits['watering']>; label: string }[] = [
  { id: 'rain', label: 'Rain only' },
  { id: 'first-years', label: 'First 2 years' },
  { id: 'all-year', label: 'All year' },
];

const DRAINAGES: readonly { id: NonNullable<SiteEdits['drainage']>; label: string }[] = [
  { id: 'drains', label: 'Drains within a day' },
  { id: 'wet', label: 'Stays wet for days' },
];

function slopeLabel(deg: number): string {
  if (deg <= 0) return '0° flat';
  if (deg <= 8) return `${deg}° gentle`;
  if (deg <= 18) return `${deg}° moderate`;
  return `${deg}° steep`;
}

function fmtShift(val: number, unit: string, decimals = 1): string {
  const s = decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
  return `${val > 0 ? '+' : ''}${s} ${unit}`;
}

// Module-level tracker so unmounting SiteTuner during a location lookup still detects a place switch
let lastLoadedLocKey: string | null = null;

export function SiteTuner() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const loc = siteLocation.value;
  const z = climate.value;
  const mc = microclimate.value;
  const edits = siteEdits.value;
  const profile = siteClimateProfile(loc, z, mc, edits);

  // Reset site overrides & microclimate cleanly when switching to a different location (e.g. Montpellier -> Lyon)
  const locKey = loc ? `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}` : null;
  useEffect(() => {
    if (lastLoadedLocKey !== null && locKey !== null && lastLoadedLocKey !== locKey) {
      siteEdits.value = NO_EDITS;
      setMicroclimate({ slopeDeg: 0, aspect: 'flat', landform: 'mid-slope' });
    }
    if (locKey !== null) lastLoadedLocKey = locKey;
  }, [locKey]);

  // Honor store.openFigure('soilPh' | 'nights' | 'days' | 'rain' | ...)
  const targetLine = figureLine.value;
  useEffect(() => {
    if (!targetLine) return;
    if (detailsRef.current) detailsRef.current.open = true;
    const focusMap: Record<string, string> = {
      nights: 'ct-tune-nights',
      days: 'ct-tune-days',
      rain: 'ct-tune-rain',
      soilPh: 'ct-tune-ph',
    };
    const inputId = focusMap[targetLine];
    if (inputId && typeof document !== 'undefined') {
      queueMicrotask(() => document.getElementById(inputId)?.focus());
    }
    figureLine.value = null;
  }, [targetLine]);

  // Baseline map values & SSP2-4.5 2050s projections
  const periods = loc?.lookup?.climate?.periods ?? [];
  const pToday = periods.find((p) => p.period === '1991-2020') ?? periods[0] ?? null;
  const p2050 = periods.find((p) => p.period === '2041-2070' && p.scenario === 'ssp245')
    ?? periods.find((p) => p.period === '2041-2070')
    ?? null;

  const mapCold = pToday?.tminColdC ?? 2.0;
  const mapHot = pToday?.tmaxWarmC ?? 27.0;
  const mapRain = Math.round(pToday?.precipMm ?? 650);
  const mapPh = loc?.lookup?.soil?.phH2o != null ? Math.round(loc.lookup.soil.phH2o * 10) / 10 : 7.0;

  const coldDelta2050 = p2050 ? (p2050.tminColdC - mapCold) : 1.3;
  const hotDelta2050 = p2050 ? (p2050.tmaxWarmC - mapHot) : 2.1;
  const rainDelta2050 = p2050?.precipMm != null && pToday?.precipMm != null
    ? Math.round(p2050.precipMm - pToday.precipMm)
    : -45;

  const nightsShift = edits.nightsShiftC ?? 0;
  const daysShift = edits.daysShiftC ?? 0;
  const rainShift = edits.rainShiftMm ?? 0;
  const curPh = edits.soilPh ?? mapPh;
  const phModified = edits.soilPh != null && Math.abs(edits.soilPh - mapPh) >= 0.05;

  const curCold = Math.round((mapCold + nightsShift + profile.coldDeltaC) * 10) / 10;
  const futCold = Math.round((curCold + coldDelta2050) * 10) / 10;
  const curHot = Math.round((mapHot + daysShift + profile.hotDeltaC) * 10) / 10;
  const futHot = Math.round((curHot + hotDelta2050) * 10) / 10;
  const curRain = Math.max(0, Math.round(mapRain + rainShift));
  const futRain = Math.max(0, Math.round(curRain + rainDelta2050));

  const curWatering = edits.watering ?? 'rain';
  const curDrainage = edits.drainage ?? 'drains';
  const curPots = edits.pots === true;

  const isMicroModified = mc.slopeDeg !== 0 || mc.aspect !== 'flat' || mc.landform !== 'mid-slope';
  const overrideCount =
    (nightsShift !== 0 ? 1 : 0)
    + (daysShift !== 0 ? 1 : 0)
    + (rainShift !== 0 ? 1 : 0)
    + (phModified ? 1 : 0)
    + (curWatering !== 'rain' ? 1 : 0)
    + (curDrainage !== 'drains' ? 1 : 0)
    + (curPots ? 1 : 0)
    + (isMicroModified ? 1 : 0);

  // Direct reactive write for buttery-smooth slider dragging without toast spam
  const patchEdits = (patch: Partial<SiteEdits>) => {
    const merged: Record<string, unknown> = { ...siteEdits.peek(), ...patch };
    for (const k of Object.keys(merged)) {
      if (merged[k] === undefined) delete merged[k];
    }
    siteEdits.value = siteEditsOf(merged);
  };

  const resetAll = () => {
    siteEdits.value = NO_EDITS;
    setMicroclimate({ slopeDeg: 0, aspect: 'flat', landform: 'mid-slope' });
  };

  return (
    <details ref={detailsRef} class="tuner-details" data-microclimate>
      <summary class="tuner-summary">
        <span>Tune canopi-climate readings &amp; microclimate (live updates)</span>
        {overrideCount > 0 && (
          <span class="tuner-summary-badge">{overrideCount} active</span>
        )}
      </summary>

      <div class="tuner-body" data-site-tuner>
        {/* Top Header Strip */}
        <div class="tuner-head">
          <span class="tuner-sub">
            Overrides apply live across My Palette, Living System, 2050 Climate &amp; Dossier.
          </span>
          <div class="tuner-head-right">
            <span class={`tuner-status-pill${overrideCount > 0 ? ' is-active' : ''}`} data-tuner-status>
              {overrideCount === 0
                ? 'Map baseline · 0 overrides'
                : `${overrideCount} custom ${overrideCount === 1 ? 'override' : 'overrides'} active`}
            </span>
            {overrideCount > 0 && (
              <button
                type="button"
                class="btn btn-xs"
                data-tuner-reset-all
                onClick={resetAll}
              >
                Reset all to map baseline
              </button>
            )}
          </div>
        </div>

        {/* Section A — Local Climate & Soil Baseline (2x2 .tune-grid) */}
        <div class="tune-grid">
          {/* 1. Typical Winter Night */}
          <div class={`tune-box${nightsShift !== 0 ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-nights" class="tune-box-label">Typical Winter Night</label>
              {nightsShift !== 0 && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ nightsShiftC: undefined })}
                >
                  Reset
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>{signedTemp1(curCold)}</span>
              <span class="tune-arrow" aria-hidden="true">→</span>
              <span class="tune-fut-cold">2050s {signedTemp1(futCold)}</span>
            </div>
            <input
              id="ct-tune-nights"
              class="tune-slider"
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={nightsShift}
              onInput={(e) => {
                const v = Number((e.currentTarget as HTMLInputElement).value);
                patchEdits({ nightsShiftC: v === 0 ? undefined : v });
              }}
            />
            <div class="tune-box-foot">
              <span>
                1-in-10-yr freeze {profile.coldFreeze10yrC != null ? formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst) : `~${(curCold - 8.5).toFixed(1)} °C`}
              </span>
              <span class={`tune-delta-pill${nightsShift !== 0 ? ' is-edited' : ''}`}>
                {nightsShift !== 0 ? `${fmtShift(nightsShift, '°C')} vs map` : `Map: ${signedTemp1(mapCold)}`}
              </span>
            </div>
          </div>

          {/* 2. Typical Summer Afternoon */}
          <div class={`tune-box${daysShift !== 0 ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-days" class="tune-box-label">Typical Summer Afternoon</label>
              {daysShift !== 0 && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ daysShiftC: undefined })}
                >
                  Reset
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>{curHot.toFixed(1)} °C</span>
              <span class="tune-arrow" aria-hidden="true">→</span>
              <span class="tune-fut-hot">2050s {futHot.toFixed(1)} °C</span>
            </div>
            <input
              id="ct-tune-days"
              class="tune-slider"
              type="range"
              min="-6"
              max="8"
              step="0.5"
              value={daysShift}
              onInput={(e) => {
                const v = Number((e.currentTarget as HTMLInputElement).value);
                patchEdits({ daysShiftC: v === 0 ? undefined : v });
              }}
            />
            <div class="tune-box-foot">
              <span>
                1-in-10-yr peak {profile.heatPeak10yrC != null ? formatHeatPeakTag(profile.heatPeak10yrC, profile.heatPeakIsEst) : `~${(curHot + 8).toFixed(1)} °C`}
              </span>
              <span class={`tune-delta-pill${daysShift !== 0 ? ' is-edited' : ''}`}>
                {daysShift !== 0 ? `${fmtShift(daysShift, '°C')} vs map` : `Map: ${mapHot.toFixed(1)} °C`}
              </span>
            </div>
          </div>

          {/* 3. Annual Rainfall */}
          <div class={`tune-box${rainShift !== 0 ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-rain" class="tune-box-label">Annual Rainfall</label>
              {rainShift !== 0 && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ rainShiftMm: undefined })}
                >
                  Reset
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>{curRain} mm</span>
              <span class="tune-arrow" aria-hidden="true">→</span>
              <span class="tune-fut-rain">2050s {futRain} mm</span>
            </div>
            <input
              id="ct-tune-rain"
              class="tune-slider"
              type="range"
              min="-400"
              max="500"
              step="25"
              value={rainShift}
              onInput={(e) => {
                const v = Number((e.currentTarget as HTMLInputElement).value);
                patchEdits({ rainShiftMm: v === 0 ? undefined : v });
              }}
            />
            <div class="tune-box-foot">
              <span>{profile.moistureRegime ?? 'Baseline rainfall'}</span>
              <span class={`tune-delta-pill${rainShift !== 0 ? ' is-edited' : ''}`}>
                {rainShift !== 0 ? `${fmtShift(rainShift, 'mm', 0)} vs map` : `Map: ${mapRain} mm`}
              </span>
            </div>
          </div>

          {/* 4. Local Soil pH */}
          <div class={`tune-box${phModified ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-ph" class="tune-box-label">Local Soil pH</label>
              {phModified && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ soilPh: undefined })}
                >
                  Reset
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>pH {curPh.toFixed(1)}</span>
              <span class="tune-ph-react">({phReactionLabel(curPh)})</span>
            </div>
            <input
              id="ct-tune-ph"
              class="tune-slider"
              type="range"
              min="4.0"
              max="9.0"
              step="0.1"
              value={curPh}
              onInput={(e) => {
                const v = Math.round(Number((e.currentTarget as HTMLInputElement).value) * 10) / 10;
                patchEdits({ soilPh: Math.abs(v - mapPh) < 0.05 ? undefined : v });
              }}
            />
            <div class="tune-box-foot">
              <span>{curPots ? 'Bypassed in pots / raised beds' : (profile.soilTexture ? `Topsoil · ${profile.soilTexture}` : 'Topsoil pH test override')}</span>
              <span class={`tune-delta-pill${phModified ? ' is-edited' : ''}`}>
                {phModified ? `${fmtShift(curPh - mapPh, 'pH')} vs map` : `Map: ${mapPh.toFixed(1)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Section B — Site Water, Drainage & Growing Medium (Zero <select>s!) */}
        <div class="tuner-cond-box">
          <div class="tuner-cond-row">
            <div class="fp-label">Watering</div>
            <div class="chip-row" role="group" aria-label="Watering regime">
              {WATERINGS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  class="filter-chip"
                  data-tune-watering={w.id}
                  aria-pressed={curWatering === w.id ? 'true' : 'false'}
                  onClick={() => patchEdits({ watering: w.id === 'rain' ? undefined : w.id })}
                >
                  {w.label}
                </button>
              ))}
            </div>
            {curWatering !== 'rain' && (
              <div class="tuner-hint">
                {curWatering === 'first-years'
                  ? 'Counts on establishment watering for the first 2 summers, then rain-fed.'
                  : 'Assumes supplemental summer irrigation for drought-sensitive species.'}
              </div>
            )}
          </div>

          <div class="tuner-cond-row">
            <div class="fp-label">Drainage (after heavy rain)</div>
            <div class="chip-row" role="group" aria-label="Soil drainage">
              {DRAINAGES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  class="filter-chip"
                  data-tune-drainage={d.id}
                  aria-pressed={curDrainage === d.id ? 'true' : 'false'}
                  onClick={() => patchEdits({ drainage: d.id === 'drains' ? undefined : d.id })}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {curDrainage === 'wet' && (
              <div class="tuner-hint">
                Flags species sensitive to winter waterlogging and poor root aeration.
              </div>
            )}
          </div>

          <div class="tuner-cond-row">
            <div class="fp-label">Growing medium</div>
            <div class="chip-row" role="group" aria-label="Growing medium">
              <button
                type="button"
                class="filter-chip"
                data-tune-pots="ground"
                aria-pressed={!curPots ? 'true' : 'false'}
                onClick={() => patchEdits({ pots: undefined })}
              >
                In the ground
              </button>
              <button
                type="button"
                class="filter-chip"
                data-tune-pots="pots"
                aria-pressed={curPots ? 'true' : 'false'}
                onClick={() => patchEdits({ pots: true })}
              >
                Pots / raised beds
              </button>
            </div>
            {curPots && (
              <div class="tuner-hint">
                Pots / raised beds bypasses the local soil pH map and favors compact roots.
              </div>
            )}
          </div>
        </div>

        {/* Section C — Local Terrain & Microclimate (.micro-box, Zero <select>s!) */}
        <div class="micro-box">
          <div class="micro-box-head">
            <span class="fp-label" style="margin:0;">Local terrain &amp; microclimate</span>
            <span class={`tuner-status-pill${profile.hasMicroShift ? ' is-active' : ''}`} data-microclimate-delta>
              {profile.hasMicroShift
                ? `${fmtShift(profile.coldDeltaC, '°C')} winter night · ${fmtShift(profile.hotDeltaC, '°C')} summer peak · ${fmtShift(profile.falseSpringDeltaPct, '%', 0)} false-spring risk`
                : 'Flat mid-slope · baseline tile readings'}
            </span>
          </div>

          <div class="micro-slope-row">
            <div class="tune-box-head">
              <label for="ct-micro-slope" class="tune-box-label">Slope angle</label>
              <span class="micro-slope-val">{slopeLabel(mc.slopeDeg)}</span>
            </div>
            <input
              id="ct-micro-slope"
              class="tune-slider"
              type="range"
              min="0"
              max="35"
              step="1"
              value={mc.slopeDeg}
              onInput={(e) => setMicroclimate({ slopeDeg: Number((e.currentTarget as HTMLInputElement).value) })}
            />
          </div>

          <div class="micro-pills-grid">
            <div>
              <div class="fp-label">Aspect</div>
              <div class="chip-row" role="group" aria-label="Slope aspect">
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    class="filter-chip"
                    data-micro-aspect={a.id}
                    aria-pressed={mc.aspect === a.id ? 'true' : 'false'}
                    onClick={() => setMicroclimate({ aspect: a.id })}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div class="fp-label">Landform</div>
              <div class="chip-row" role="group" aria-label="Site landform">
                {LANDFORMS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    class="filter-chip"
                    data-micro-landform={l.id}
                    aria-pressed={mc.landform === l.id ? 'true' : 'false'}
                    onClick={() => setMicroclimate({ landform: l.id })}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section D — Compact 1-line Collapsible Methodology Micro-Footer */}
        <details class="tuner-method">
          <summary>Methodology &amp; what isn&apos;t modelled</summary>
          <p>
            Climate baselines come from on-device 11 km SSP2-4.5 tiles (1991–2020 today vs 2041–2070 projection) paired with COPERNICUS/DEM/GLO30 terrain and topsoil pH grids. Local wind corridors, day-length cultivar tuning, browsing wildlife, pests, and wildfire risk are not modelled automatically — use your own field observations alongside these readings.
          </p>
        </details>
      </div>
    </details>
  );
}
