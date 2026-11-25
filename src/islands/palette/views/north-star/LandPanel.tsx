/** @jsxImportSource preact */
// Persistent collapsible "Your land" sidebar (mobile collapsible sheet) + "Tune site" controls.
// Explicitly marks "(Today)" on the Water tank row under future scenarios (v7.3 P2 nit fix).
import type { InputWind, PaletteReport, Watering } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { fmtNum, freezeText, heatText, roomOptions } from './ns-helpers.ts';
import {
  handlePlotM2Input,
  nsLandOpen,
  nsOverrides,
  nsTuneOpen,
  resetOverrides,
  setRoomChoice,
  updateOverrides,
} from './ns-state.ts';

const WATERING_OPTS: readonly { id: Watering; label: () => string }[] = [
  { id: 'rain', label: () => T('ns.water.rain') },
  { id: 'first-years', label: () => T('ns.water.firstYears') },
  { id: 'all-year', label: () => T('ns.water.allYear') },
];

const WIND_OPTS: readonly { id: InputWind; label: () => string }[] = [
  { id: 'sheltered', label: () => T('ns.wind.sheltered') },
  { id: 'windy', label: () => T('ns.wind.open') },
  { id: 'sea', label: () => T('ns.wind.exposed') },
];

const ROOM_OPTS = roomOptions(false);

export function LandPanel({ rep }: { rep: PaletteReport }) {
  const eff = rep.eff;
  const open = nsLandOpen.value;
  const tuneOpen = nsTuneOpen.value;
  const ov = nsOverrides.value;
  const placeLabel = store.location.value?.label ?? store.climate.value ?? T('ns.land.yourSite');
  const isFuture = eff.horizon !== 'today';
  const hasOverrides = Object.keys(ov).length > 0;

  return (
    <aside class="land-panel" aria-label={T('ns.land.title')}>
      <div class="land-head">
        <div>
          <span class="land-kicker">{T('ns.land.title')}</span>
          <h2 class="land-place">{placeLabel}</h2>
          <p class="land-meta">
            {eff.koppen || store.climate.value || '—'}
            {eff.usdaZone ? ` · USDA ${eff.usdaZone}` : ''}
            {eff.lat !== null && eff.lon !== null ? ` · ${fmtNum(eff.lat, 1)}°, ${fmtNum(eff.lon, 1)}°` : ''}
          </p>
        </div>
        <div class="land-head-acts">
          <button
            type="button"
            class="land-toggle-btn"
            aria-expanded={open ? 'true' : 'false'}
            onClick={() => { nsLandOpen.value = !open; }}
          >
            {open ? T('ns.hide') : T('ns.show')}
          </button>
        </div>
      </div>

      {open && (
        <div class="land-body">
          <dl class="land-dl">
            <div class="land-row">
              <dt>{T('ns.land.freeze10')}</dt>
              <dd>{freezeText(eff)}</dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.land.heat10')}</dt>
              <dd>{heatText(eff)}</dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.land.soilPh')}</dt>
              <dd>
                {eff.soilPh !== null ? `pH ${fmtNum(eff.soilPh, 1)}` : T('ns.unknown')}
                {eff.subsoilPh !== null && eff.soilPh !== null && Math.abs(eff.subsoilPh - eff.soilPh) >= 0.8
                  ? ` (${T('ns.land.subsoil')} ${fmtNum(eff.subsoilPh, 1)})`
                  : ''}
              </dd>
            </div>
            <div class="land-row">
              <dt>
                {T('ns.land.waterTank')}
                {isFuture ? ` (${T('ns.today')})` : ''}
              </dt>
              <dd>
                {eff.tankDays !== null ? `${eff.tankDays} ${T('ns.days')}` : T('ns.unknown')}
                {eff.cddDays !== null ? ` / ${eff.cddDays} ${T('ns.unit.dayShort')} ${T('ns.land.drySpell')}` : ''}
              </dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.land.rain')}</dt>
              <dd>{eff.precipMm !== null ? `${eff.precipMm} ${T('ns.unit.mmYear')}` : T('ns.unknown')}</dd>
            </div>
            <div class="land-row">
              <dt>{T('ns.land.plot')}</dt>
              <dd>{eff.plotM2} m² ({eff.netPlotM2} m² {T('ns.land.net')})</dd>
            </div>
          </dl>

          <div class="land-actions">
            <button
              type="button"
              class="btn-secondary"
              aria-expanded={tuneOpen ? 'true' : 'false'}
              onClick={() => { nsTuneOpen.value = !tuneOpen; }}
            >
              {tuneOpen ? T('ns.land.closeTune') : T('ns.land.tuneSite')}
            </button>
            <button
              type="button"
              class="link-btn"
              onClick={() => { store.view.value = 'start'; }}
            >
              {T('ns.land.changePlace')}
            </button>
          </div>

          {tuneOpen && (
            <div class="tune-box" role="region" aria-label={T('ns.land.tuneSite')}>
              <label class="tune-field">
                <span>{T('ns.land.soilPh')}: <strong>{eff.soilPh !== null ? fmtNum(eff.soilPh, 1) : '6.5'}</strong></span>
                <input
                  type="range"
                  min="4.0"
                  max="9.0"
                  step="0.1"
                  value={eff.soilPh ?? 6.5}
                  onInput={(e) => updateOverrides({ soilPh: Number((e.target as HTMLInputElement).value) })}
                />
              </label>

              <div class="tune-field">
                <span>{T('ns.tune.watering')}</span>
                <div class="pill-group">
                  {WATERING_OPTS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      class="site-pill-sm"
                      aria-pressed={eff.watering === w.id ? 'true' : 'false'}
                      onClick={() => updateOverrides({ watering: w.id })}
                    >
                      {w.label()}
                    </button>
                  ))}
                </div>
              </div>

              <div class="tune-field">
                <span>{T('ns.tune.wind')}</span>
                <div class="pill-group">
                  {WIND_OPTS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      class="site-pill-sm"
                      aria-pressed={eff.wind === w.id ? 'true' : 'false'}
                      onClick={() => updateOverrides({ wind: w.id })}
                    >
                      {w.label()}
                    </button>
                  ))}
                </div>
              </div>

              <label class="tune-field">
                <span>{T('ns.tune.coldShift')}: <strong>{fmtNum(ov.nightsShiftC ?? 0, 0)} °C</strong></span>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="1"
                  value={ov.nightsShiftC ?? 0}
                  onInput={(e) => updateOverrides({ nightsShiftC: Number((e.target as HTMLInputElement).value) })}
                />
              </label>

              <label class="tune-field">
                <span>{T('ns.tune.heatShift')}: <strong>{fmtNum(ov.daysShiftC ?? 0, 0)} °C</strong></span>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="1"
                  value={ov.daysShiftC ?? 0}
                  onInput={(e) => updateOverrides({ daysShiftC: Number((e.target as HTMLInputElement).value) })}
                />
              </label>

              <div class="tune-field">
                <span>{T('ns.arrival.roomLabel')}</span>
                <div class="pill-group">
                  {ROOM_OPTS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      class="site-pill-sm"
                      aria-pressed={eff.room === r.id ? 'true' : 'false'}
                      onClick={() => setRoomChoice(r.id)}
                    >
                      {r.label()}
                    </button>
                  ))}
                </div>
              </div>

              <label class="tune-field">
                <span>{T('ns.land.plot')} (m²)</span>
                <input
                  type="number"
                  min="4"
                  max="100000"
                  value={eff.plotM2}
                  onInput={handlePlotM2Input}
                />
              </label>

              {hasOverrides && (
                <button type="button" class="link-btn" onClick={resetOverrides}>
                  {T('ns.tune.reset')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
