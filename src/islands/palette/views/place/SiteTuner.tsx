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
} from '../../../../lib/palette/index.ts';
import type { MicroAspect, MicroLandform } from '../../../../lib/climate/v07.ts';
import {
  figureLine,
  location as siteLocation,
  climate,
  siteEdits,
} from '../../store.ts';
import { T } from '../../strings.ts';
import { microclimate, setMicroclimate } from '../../state/studio.ts';
import {
  formatFreezeTag,
  formatHeatPeakTag,
  phReactionLabel,
  signedTemp1,
  siteClimateProfile,
} from '../../rules/climate-words.ts';

const ASPECTS: readonly MicroAspect[] = ['flat', 'south', 'east', 'west', 'north'];

const LANDFORMS: readonly MicroLandform[] = ['ridge', 'mid-slope', 'valley'];

const WATERINGS: readonly NonNullable<SiteEdits['watering']>[] = ['rain', 'first-years', 'all-year'];

const DRAINAGES: readonly NonNullable<SiteEdits['drainage']>[] = ['drains', 'wet'];

function slopeLabel(deg: number): string {
  if (deg <= 0) return T('studio.tuner.slopeFlat');
  if (deg <= 8) return T('studio.tuner.slopeGentle', { deg });
  if (deg <= 18) return T('studio.tuner.slopeMod', { deg });
  return T('studio.tuner.slopeSteep', { deg });
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
        <span>{T('studio.tuner.summary')}</span>
        {overrideCount > 0 && (
          <span class="tuner-summary-badge">{T('studio.tuner.activeBadge', { n: overrideCount })}</span>
        )}
      </summary>

      <div class="tuner-body" data-site-tuner>
        {/* Top Header Strip */}
        <div class="tuner-head">
          <span class="tuner-sub">
            {T('studio.tuner.sub')}
          </span>
          <div class="tuner-head-right">
            <span class={`tuner-status-pill${overrideCount > 0 ? ' is-active' : ''}`} data-tuner-status>
              {overrideCount === 0
                ? T('studio.tuner.statusBaseline')
                : T('studio.tuner.statusActive', { n: overrideCount })}
            </span>
            {overrideCount > 0 && (
              <button
                type="button"
                class="btn btn-xs"
                data-tuner-reset-all
                onClick={resetAll}
              >
                {T('studio.tuner.resetAll')}
              </button>
            )}
          </div>
        </div>

        {/* Section A — Local Climate & Soil Baseline (2x2 .tune-grid) */}
        <div class="tune-grid">
          {/* 1. Typical Winter Night */}
          <div class={`tune-box${nightsShift !== 0 ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-nights" class="tune-box-label">{T('studio.tuner.winterNight')}</label>
              {nightsShift !== 0 && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ nightsShiftC: undefined })}
                >
                  {T('studio.tuner.reset')}
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>{signedTemp1(curCold)}</span>
              <span class="tune-arrow" aria-hidden="true">→</span>
              <span class="tune-fut-cold">{T('studio.horizon.2050s')} {signedTemp1(futCold)}</span>
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
                {T('studio.tuner.freezeFoot', { freeze: profile.coldFreeze10yrC != null ? formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst) : `~${(curCold - 8.5).toFixed(1)} °C` })}
              </span>
              <span class={`tune-delta-pill${nightsShift !== 0 ? ' is-edited' : ''}`}>
                {nightsShift !== 0 ? T('studio.tuner.vsMap', { delta: fmtShift(nightsShift, '°C') }) : T('studio.tuner.mapVal', { val: signedTemp1(mapCold) })}
              </span>
            </div>
          </div>

          {/* 2. Typical Summer Afternoon */}
          <div class={`tune-box${daysShift !== 0 ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-days" class="tune-box-label">{T('studio.tuner.summerDay')}</label>
              {daysShift !== 0 && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ daysShiftC: undefined })}
                >
                  {T('studio.tuner.reset')}
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>{curHot.toFixed(1)} °C</span>
              <span class="tune-arrow" aria-hidden="true">→</span>
              <span class="tune-fut-hot">{T('studio.horizon.2050s')} {futHot.toFixed(1)} °C</span>
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
                {T('studio.tuner.peakFoot', { peak: profile.heatPeak10yrC != null ? formatHeatPeakTag(profile.heatPeak10yrC, profile.heatPeakIsEst) : `~${(curHot + 8).toFixed(1)} °C` })}
              </span>
              <span class={`tune-delta-pill${daysShift !== 0 ? ' is-edited' : ''}`}>
                {daysShift !== 0 ? T('studio.tuner.vsMap', { delta: fmtShift(daysShift, '°C') }) : T('studio.tuner.mapVal', { val: `${mapHot.toFixed(1)} °C` })}
              </span>
            </div>
          </div>

          {/* 3. Annual Rainfall */}
          <div class={`tune-box${rainShift !== 0 ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-rain" class="tune-box-label">{T('studio.tuner.rainfall')}</label>
              {rainShift !== 0 && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ rainShiftMm: undefined })}
                >
                  {T('studio.tuner.reset')}
                </button>
              )}
            </div>
            <div class="tune-box-vals">
              <span>{curRain} mm</span>
              <span class="tune-arrow" aria-hidden="true">→</span>
              <span class="tune-fut-rain">{T('studio.horizon.2050s')} {futRain} mm</span>
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
              <span>{profile.moistureRegime ?? T('studio.tuner.rainBaseline')}</span>
              <span class={`tune-delta-pill${rainShift !== 0 ? ' is-edited' : ''}`}>
                {rainShift !== 0 ? T('studio.tuner.vsMap', { delta: fmtShift(rainShift, 'mm', 0) }) : T('studio.tuner.mapVal', { val: `${mapRain} mm` })}
              </span>
            </div>
          </div>

          {/* 4. Local Soil pH */}
          <div class={`tune-box${phModified ? ' is-edited' : ''}`}>
            <div class="tune-box-head">
              <label for="ct-tune-ph" class="tune-box-label">{T('studio.tuner.soilPh')}</label>
              {phModified && (
                <button
                  type="button"
                  class="tune-reset-btn"
                  onClick={() => patchEdits({ soilPh: undefined })}
                >
                  {T('studio.tuner.reset')}
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
              <span>{curPots ? T('studio.tuner.phBypassed') : (profile.soilTexture ? T('studio.tuner.phTexture', { texture: profile.soilTexture }) : T('studio.tuner.phOverride'))}</span>
              <span class={`tune-delta-pill${phModified ? ' is-edited' : ''}`}>
                {phModified ? T('studio.tuner.vsMap', { delta: fmtShift(curPh - mapPh, 'pH') }) : T('studio.tuner.mapVal', { val: mapPh.toFixed(1) })}
              </span>
            </div>
          </div>
        </div>

        {/* Section B — Site Water, Drainage & Growing Medium (Zero <select>s!) */}
        <div class="tuner-cond-box">
          <div class="tuner-cond-row">
            <div class="fp-label">{T('studio.tuner.watering')}</div>
            <div class="chip-row" role="group" aria-label={T('studio.tuner.wateringAria')}>
              {WATERINGS.map((w) => (
                <button
                  key={w}
                  type="button"
                  class="filter-chip"
                  data-tune-watering={w}
                  aria-pressed={curWatering === w ? 'true' : 'false'}
                  onClick={() => patchEdits({ watering: w === 'rain' ? undefined : w })}
                >
                  {T(`studio.tuner.water.${w}`)}
                </button>
              ))}
            </div>
            {curWatering !== 'rain' && (
              <div class="tuner-hint">
                {curWatering === 'first-years'
                  ? T('studio.tuner.waterHintFirst')
                  : T('studio.tuner.waterHintAll')}
              </div>
            )}
          </div>

          <div class="tuner-cond-row">
            <div class="fp-label">{T('studio.tuner.drainage')}</div>
            <div class="chip-row" role="group" aria-label={T('studio.tuner.drainageAria')}>
              {DRAINAGES.map((d) => (
                <button
                  key={d}
                  type="button"
                  class="filter-chip"
                  data-tune-drainage={d}
                  aria-pressed={curDrainage === d ? 'true' : 'false'}
                  onClick={() => patchEdits({ drainage: d === 'drains' ? undefined : d })}
                >
                  {T(`studio.tuner.drain.${d}`)}
                </button>
              ))}
            </div>
            {curDrainage === 'wet' && (
              <div class="tuner-hint">
                {T('studio.tuner.drainHintWet')}
              </div>
            )}
          </div>

          <div class="tuner-cond-row">
            <div class="fp-label">{T('studio.tuner.medium')}</div>
            <div class="chip-row" role="group" aria-label={T('studio.tuner.medium')}>
              <button
                type="button"
                class="filter-chip"
                data-tune-pots="ground"
                aria-pressed={!curPots ? 'true' : 'false'}
                onClick={() => patchEdits({ pots: undefined })}
              >
                {T('studio.tuner.inGround')}
              </button>
              <button
                type="button"
                class="filter-chip"
                data-tune-pots="pots"
                aria-pressed={curPots ? 'true' : 'false'}
                onClick={() => patchEdits({ pots: true })}
              >
                {T('studio.tuner.inPots')}
              </button>
            </div>
            {curPots && (
              <div class="tuner-hint">
                {T('studio.tuner.potsHint')}
              </div>
            )}
          </div>
        </div>

        {/* Section C — Local Terrain & Microclimate (.micro-box, Zero <select>s!) */}
        <div class="micro-box">
          <div class="micro-box-head">
            <span class="fp-label" style="margin:0;">{T('studio.tuner.microTitle')}</span>
            <span class={`tuner-status-pill${profile.hasMicroShift ? ' is-active' : ''}`} data-microclimate-delta>
              {profile.hasMicroShift
                ? T('studio.tuner.microDelta', {
                    cold: fmtShift(profile.coldDeltaC, '°C'),
                    hot: fmtShift(profile.hotDeltaC, '°C'),
                    spring: fmtShift(profile.falseSpringDeltaPct, '%', 0),
                  })
                : T('studio.tuner.microBaseline')}
            </span>
          </div>

          <div class="micro-slope-row">
            <div class="tune-box-head">
              <label for="ct-micro-slope" class="tune-box-label">{T('studio.tuner.slopeAngle')}</label>
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
              <div class="fp-label">{T('studio.tuner.aspect')}</div>
              <div class="chip-row" role="group" aria-label={T('studio.tuner.aspectAria')}>
                {ASPECTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    class="filter-chip"
                    data-micro-aspect={a}
                    aria-pressed={mc.aspect === a ? 'true' : 'false'}
                    onClick={() => setMicroclimate({ aspect: a })}
                  >
                    {T(`studio.tuner.aspect.${a}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div class="fp-label">{T('studio.tuner.landform')}</div>
              <div class="chip-row" role="group" aria-label={T('studio.tuner.landformAria')}>
                {LANDFORMS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    class="filter-chip"
                    data-micro-landform={l}
                    aria-pressed={mc.landform === l ? 'true' : 'false'}
                    onClick={() => setMicroclimate({ landform: l })}
                  >
                    {T(`studio.tuner.landform.${l}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section D — Compact 1-line Collapsible Methodology Micro-Footer */}
        <details class="tuner-method">
          <summary>{T('studio.tuner.methodTitle')}</summary>
          <p>{T('studio.tuner.methodBody')}</p>
        </details>
      </div>
    </details>
  );
}
