/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderLandPanel (L2613).
import type { Drainage, InputWind, PaletteReport, ReportHorizonId, Room, Watering } from '../../../../lib/palette/index.ts';
import { REPORT_SCENARIOS } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { fmtNum, freezeText, heatText, roomOptions, scenarioLabel } from './ns-helpers.ts';
import {
  effectiveOverrides,
  NS_PRESETS,
  nsDrawer,
  nsLandOpen,
  nsOverrides,
  nsScenario,
  nsTuneOpen,
  pickCoordinates,
  setRoomChoice,
  updateOverrides,
} from './ns-state.ts';

export function LandPanel({ rep }: { rep: PaletteReport }) {
  const tuneOpen = nsTuneOpen.value;
  const ov = effectiveOverrides.value;
  const rawOv = nsOverrides.value;
  const loc = store.location.value;
  const eff = rep.eff;
  const basePh = loc?.lookup?.soil?.phH2o ?? null;
  const baseTexture = loc?.lookup?.soil?.texture ?? 'loam';
  const baseStones = loc?.lookup?.v07?.soilPlus?.cfvo0_30 ?? null;
  const terrain = loc?.lookup?.v07?.terrain ?? null;

  const phEdited = rawOv.soilPh != null && rawOv.soilPh !== basePh;
  const drainEdited = rawOv.drainage != null;
  const stonesEdited = rawOv.stonesPct != null && rawOv.stonesPct !== baseStones;
  const waterEdited = rawOv.watering != null && rawOv.watering !== 'rain';
  const windEdited = rawOv.wind != null && rawOv.wind !== 'sheltered';
  const editCount = [phEdited, drainEdited, stonesEdited, waterEdited, windEdited].filter(Boolean).length;
  const highRelief = terrain != null && terrain.reliefM != null && terrain.reliefM > 300;

  return (
    <aside class="land-panel" aria-label={T('ns.land.title')}>
      <div class="land-head">
        <h2>{T('ns.land.title')}</h2>
        <button class="link-button small" type="button" onClick={() => { nsLandOpen.value = false; }}>
          {T('ns.hide')}
        </button>
      </div>

      <div class="site-switch-row" aria-label={T('ns.arrival.presetsAria')}>
        {NS_PRESETS.map((m) => (
          <button
            key={m.id}
            type="button"
            class="site-pill-sm"
            aria-pressed={loc?.label === m.label ? 'true' : 'false'}
            onClick={() => void pickCoordinates(m.lat, m.lon, m.label, m.zone, m.country)}
          >
            {m.label.split(',')[0]}
          </button>
        ))}
      </div>

      <div class="land-kv">
        <div class="land-row">
          <span>Climate</span>
          <strong>
            {eff.koppen || store.climate.value || T('ns.unknown')}
            {eff.usdaZone ? ` · USDA ${eff.usdaZone}` : ''}
            {eff.precipMm != null ? ` · ${Math.round(eff.precipMm)} ${T('ns.unit.mmYear')}` : ''}
          </strong>
        </div>
        <div class="land-row">
          <span>{T('ns.land.freeze10')}</span>
          <strong>{freezeText(eff)}</strong>
        </div>
        <div class="land-row">
          <span>{T('ns.land.heat10')}</span>
          <strong>{heatText(eff)}</strong>
        </div>
        <div class="land-row">
          <span>{T('ns.land.waterTank')}</span>
          <strong>
            {eff.tankDays != null && eff.cddDays != null
              ? `Soil holds ~${eff.tankDays} d · dry spell ~${eff.cddDays} d`
              : T('ns.unknown')}
          </strong>
        </div>
        <div class="land-row">
          <span>{T('ns.land.soilPh')}</span>
          <strong>
            pH {fmtNum(eff.soilPh)} · {ov.drainage ?? baseTexture}
            {eff.stonesPct != null ? ` · ${Math.round(eff.stonesPct)}% rock` : ''}
          </strong>
        </div>
      </div>

      {highRelief && terrain && (
        <div class="land-alert">
          <strong>Grid cell average {terrain.elevM?.toLocaleString() ?? '—'} m</strong>
          <span>Mixed terrain in this grid cell ({terrain.reliefM} m relief).</span>
        </div>
      )}

      <div class="tuner-group">
        <label class="tuner-label" for="land-scenario">{T('ns.bar.scenarioAria')}</label>
        <select
          id="land-scenario"
          class="tuner-select"
          value={nsScenario.value}
          onChange={(e) => { nsScenario.value = (e.target as HTMLSelectElement).value as ReportHorizonId; }}
        >
          {REPORT_SCENARIOS.map((sc) => (
            <option key={sc.id} value={sc.id}>{scenarioLabel(sc.id)}</option>
          ))}
        </select>
      </div>

      <details
        class="tune-details"
        open={tuneOpen}
        onToggle={(e) => { nsTuneOpen.value = (e.currentTarget as HTMLDetailsElement).open; }}
      >
        <summary>
          <span>{T('ns.land.tuneSite')}{editCount > 0 ? ` (${editCount} edited)` : ''}</span>
          <span aria-hidden="true">{tuneOpen ? '▾' : '▸'}</span>
        </summary>
        <div class="tune-body">
          <div class="tune-subhead">Soil &amp; drainage</div>
          <div class="tuner-group">
            <div class="tuner-label">
              <label for="ph-input">{T('ns.land.soilPh')}: {fmtNum(eff.soilPh)}</label>
              {phEdited && (
                <span class="edit-badge">
                  Your edit ·{' '}
                  <button type="button" class="edit-reset" onClick={() => updateOverrides({ soilPh: null })}>
                    {T('ns.tune.reset')}
                  </button>
                </span>
              )}
            </div>
            <input
              id="ph-input"
              type="range"
              min="4.5"
              max="8.8"
              step="0.1"
              value={eff.soilPh ?? 6.8}
              onInput={(e) => updateOverrides({ soilPh: Number((e.target as HTMLInputElement).value) })}
            />
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="drain-select">{'Drainage'}</label>
              {drainEdited && (
                <span class="edit-badge">
                  Your edit ·{' '}
                  <button type="button" class="edit-reset" onClick={() => updateOverrides({ drainage: null })}>
                    {T('ns.tune.reset')}
                  </button>
                </span>
              )}
            </div>
            <select
              id="drain-select"
              class="tuner-select"
              value={ov.drainage ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                updateOverrides({ drainage: v ? (v as Drainage) : null });
              }}
            >
              <option value="">Loam / site default ({baseTexture})</option>
              <option value="sandy">{'Free-draining / sandy'}</option>
              <option value="loam">{'Balanced loam'}</option>
              <option value="clay">{'Slow / heavy clay'}</option>
              <option value="wet">{'Stays wet / waterlogged'}</option>
            </select>
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="stones-input">Rockiness (% stones): {eff.stonesPct != null ? `${Math.round(eff.stonesPct)}%` : '0%'}</label>
              {stonesEdited && (
                <span class="edit-badge">
                  Your edit ·{' '}
                  <button type="button" class="edit-reset" onClick={() => updateOverrides({ stonesPct: null })}>
                    {T('ns.tune.reset')}
                  </button>
                </span>
              )}
            </div>
            <input
              id="stones-input"
              type="range"
              min="0"
              max="60"
              step="5"
              value={eff.stonesPct ?? 0}
              onInput={(e) => updateOverrides({ stonesPct: Number((e.target as HTMLInputElement).value) })}
            />
          </div>

          <div class="tune-subhead">Watering &amp; wind</div>
          <div class="tuner-group">
            <label class="tuner-label" for="water-select">{T('ns.tune.watering')}</label>
            <select
              id="water-select"
              class="tuner-select"
              value={eff.watering}
              onChange={(e) => updateOverrides({ watering: (e.target as HTMLSelectElement).value as Watering })}
            >
              <option value="rain">{T('ns.water.rain')}</option>
              <option value="first_years">{T('ns.water.firstYears')}</option>
              <option value="dry_spells">{T('ns.water.allYear')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <label class="tuner-label" for="wind-select">{T('ns.tune.wind')}</label>
            <select
              id="wind-select"
              class="tuner-select"
              value={ov.wind ?? 'sheltered'}
              onChange={(e) => updateOverrides({ wind: (e.target as HTMLSelectElement).value as InputWind })}
            >
              <option value="sheltered">{T('ns.wind.sheltered')}</option>
              <option value="windy">{T('ns.wind.exposed')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <label class="tuner-label" for="room-select">{T('ns.arrival.roomLabel')}</label>
            <select
              id="room-select"
              class="tuner-select"
              value={eff.room}
              onChange={(e) => setRoomChoice((e.target as HTMLSelectElement).value as Room)}
            >
              {roomOptions(true).map((r) => (
                <option key={r.id} value={r.id}>{r.label()}</option>
              ))}
            </select>
          </div>
        </div>
      </details>

      <button
        class="btn-ghost"
        type="button"
        onClick={() => { nsDrawer.value = { kind: 'atlas', tab: 'climate' }; }}
      >
        {T('ns.why')} {T('ns.atlas.title')} →
      </button>
    </aside>
  );
}
