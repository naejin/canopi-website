/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderLandPanel (L2613-2802) with all 14 Tune Site controls.
import type {
  Drainage,
  InputWind,
  PaletteReport,
  ReportHorizonId,
  Room,
  SiteAspect,
  SiteColdAir,
  SiteLightChoice,
  Watering,
} from '../../../../lib/palette/index.ts';
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

function EditResetBadge({ label, onReset }: { label?: string; onReset: () => void }) {
  return (
    <span class="edit-badge">
      {label ?? T('ns.land.yourEdit')} ·{' '}
      <button type="button" class="edit-reset" onClick={onReset}>
        {T('ns.tune.reset')}
      </button>
    </span>
  );
}

function fmtSignedDeltaC(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${fmtNum(delta)} °C`;
}

export function LandPanel({ rep }: { rep: PaletteReport }) {
  const tuneOpen = nsTuneOpen.value;
  const ov = effectiveOverrides.value;
  const rawOv = nsOverrides.value;
  const loc = store.location.value;
  const eff = rep.eff;
  const basePh = loc?.lookup?.soil?.phH2o ?? null;
  const baseTexture = loc?.lookup?.soil?.texture ?? 'loam';
  const baseStones = loc?.lookup?.v07?.soilPlus?.cfvo0_30 ?? null;
  const baseCdd = loc?.lookup?.v07?.waterBalance?.cddDays ?? null;
  const terrain = loc?.lookup?.v07?.terrain ?? null;

  const phEdited = rawOv.soilPh != null && rawOv.soilPh !== basePh;
  const drainEdited = rawOv.drainage != null;
  const stonesEdited = rawOv.stonesPct != null && rawOv.stonesPct !== baseStones;
  const freezeEdited = rawOv.freeze10 != null;
  const heatEdited = rawOv.heat10 != null;
  const cddEdited = rawOv.cddDays != null && rawOv.cddDays !== baseCdd;
  const windEdited = rawOv.wind != null && rawOv.wind !== 'moderate';
  const lightEdited = rawOv.siteLight != null && rawOv.siteLight !== 'full_sun';
  const elevEdited = rawOv.elevM != null && rawOv.elevM !== eff.elevBase;
  const slopeEdited = rawOv.slopeDeg != null && rawOv.slopeDeg !== (terrain?.slopeDeg ?? null);
  const aspectEdited = rawOv.aspect != null && rawOv.aspect !== 'neutral';
  const coldEdited = rawOv.coldAir != null && rawOv.coldAir !== 'normal';

  const editCount = [
    phEdited,
    drainEdited,
    stonesEdited,
    freezeEdited,
    heatEdited,
    cddEdited,
    windEdited,
    lightEdited,
    elevEdited,
    slopeEdited,
    aspectEdited,
    coldEdited,
  ].filter(Boolean).length;

  const highRelief = terrain != null && terrain.reliefM != null && terrain.reliefM > 300;
  const dShort = T('ns.unit.dayShort');
  const windValue = rawOv.wind ?? 'moderate';

  return (
    <aside class="land-panel" aria-label={T('ns.land.title')}>
      <div class="land-head">
        <h2>{T('ns.land.title')}</h2>
        <button class="link-button small tap-link" type="button" onClick={() => { nsLandOpen.value = false; }}>
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
          <span>{T('ns.land.climate')}</span>
          <strong>
            {eff.koppen || store.climate.value || T('ns.unknown')}
            {eff.usdaZone ? ` · USDA ${eff.usdaZone}` : ''}
            {eff.precipMm != null ? ` · ${Math.round(eff.precipMm)} ${T('ns.unit.mmYear')}` : ''}
            {elevEdited ? ` ${T('ns.land.gridCellTag')}` : ''}
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
              ? T('ns.arrival.waterTankSub', { tank: eff.tankDays, cdd: eff.cddDays, d: dShort })
              : T('ns.unknown')}
          </strong>
        </div>
        <div class="land-row">
          <span>{T('ns.land.soilPh')}</span>
          <strong>
            pH {fmtNum(eff.soilPh)} · {ov.drainage ?? baseTexture}
            {eff.stonesPct != null ? ` · ${T('ns.land.rockPct', { n: Math.round(eff.stonesPct) })}` : ''}
          </strong>
        </div>
      </div>

      {highRelief && terrain && (
        <div class="land-alert">
          <strong>{T('ns.land.gridElev', { m: `${terrain.elevM?.toLocaleString() ?? '—'} m` })}</strong>
          <span>{T('ns.land.mixedTerrain', { m: `${terrain.reliefM ?? 0} m` })}</span>
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
          <span>{T('ns.land.tuneSite')}{editCount > 0 ? ` (${T('ns.land.edited', { n: editCount })})` : ''}</span>
          <span aria-hidden="true">{tuneOpen ? '▾' : '▸'}</span>
        </summary>
        <div class="tune-body">
          {/* 1. Soil & drainage */}
          <div class="tune-subhead">{T('ns.land.soilDrainHead')}</div>
          <div class="tuner-group">
            <div class="tuner-label">
              <label for="ph-input">{T('ns.land.soilPh')}: {fmtNum(eff.soilPh)}</label>
              {phEdited && <EditResetBadge onReset={() => updateOverrides({ soilPh: null })} />}
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
              <label for="drain-select">{T('ns.land.drainage')}</label>
              {drainEdited && <EditResetBadge onReset={() => updateOverrides({ drainage: null })} />}
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
              <option value="sandy">{T('ns.land.drainSandy')}</option>
              <option value="">{T('ns.land.drainDefault', { tex: baseTexture })}</option>
              <option value="clay">{T('ns.land.drainClay')}</option>
              <option value="wet">{T('ns.land.drainWet')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="stones-input">{T('ns.land.rockiness')}: {eff.stonesPct != null ? `${Math.round(eff.stonesPct)}%` : '0%'}</label>
              {stonesEdited && <EditResetBadge onReset={() => updateOverrides({ stonesPct: null })} />}
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

          {/* 2. Extreme temperatures */}
          <div class="tune-subhead">{T('ns.land.extremesHead')}</div>
          <div class="tuner-group">
            <div class="tuner-label">
              <label for="freeze-input">{T('ns.land.freeze10Input')}</label>
              {freezeEdited && <EditResetBadge onReset={() => updateOverrides({ freeze10: null })} />}
            </div>
            <input
              id="freeze-input"
              class="tuner-input"
              type="number"
              step="0.5"
              min="-40"
              max="20"
              value={eff.freeze10C ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateOverrides({ freeze10: v === '' ? null : Number(v) });
              }}
            />
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="heat-input">{T('ns.land.heat10Input')}</label>
              {heatEdited && <EditResetBadge onReset={() => updateOverrides({ heat10: null })} />}
            </div>
            <input
              id="heat-input"
              class="tuner-input"
              type="number"
              step="0.5"
              min="15"
              max="55"
              value={eff.heat10C ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateOverrides({ heat10: v === '' ? null : Number(v) });
              }}
            />
          </div>

          {/* 3. Watering & dry spell */}
          <div class="tune-subhead">{T('ns.land.waterDryHead')}</div>
          <div class="tuner-group">
            <label class="tuner-label" for="water-select">{T('ns.tune.watering')}</label>
            <select
              id="water-select"
              class="tuner-select"
              value={eff.watering}
              onChange={(e) => updateOverrides({ watering: (e.target as HTMLSelectElement).value as Watering })}
            >
              <option value="rain">{T('ns.water.rain')}</option>
              <option value="first-years">{T('ns.water.firstYears')}</option>
              <option value="dry-spells">{T('ns.water.allYear')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="cdd-input">{T('ns.land.cddInput')}</label>
              {cddEdited && <EditResetBadge onReset={() => updateOverrides({ cddDays: null })} />}
            </div>
            <input
              id="cdd-input"
              class="tuner-input"
              type="number"
              step="5"
              min="5"
              max="150"
              value={eff.cddDays ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateOverrides({ cddDays: v === '' ? null : Number(v) });
              }}
            />
          </div>

          {/* 4. Wind, light & terrain */}
          <div class="tune-subhead">{T('ns.land.windLightTerrainHead')}</div>
          <div class="tuner-group">
            <div class="tuner-label">
              <label for="wind-select">{T('ns.tune.wind')}</label>
              {windEdited && <EditResetBadge onReset={() => updateOverrides({ wind: null })} />}
            </div>
            <select
              id="wind-select"
              class="tuner-select"
              value={windValue}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                updateOverrides({ wind: v === 'moderate' ? null : (v as InputWind) });
              }}
            >
              <option value="sheltered">{T('ns.wind.sheltered')}</option>
              <option value="moderate">{T('ns.land.windModerate')}</option>
              <option value="windy">{T('ns.wind.exposed')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="light-select">{T('ns.land.siteLight')}</label>
              {lightEdited && <EditResetBadge onReset={() => updateOverrides({ siteLight: null })} />}
            </div>
            <select
              id="light-select"
              class="tuner-select"
              value={eff.siteLight}
              onChange={(e) => updateOverrides({ siteLight: (e.target as HTMLSelectElement).value as SiteLightChoice })}
            >
              <option value="full_sun">{T('ns.land.siteLightFull')}</option>
              <option value="part_shade">{T('ns.land.siteLightPart')}</option>
              <option value="shade">{T('ns.land.siteLightShade')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="elev-input">{T('ns.land.plotElev')}</label>
              {elevEdited && (
                <EditResetBadge
                  label={T('ns.land.yourEditEst', { delta: fmtSignedDeltaC(eff.elevDeltaC) })}
                  onReset={() => updateOverrides({ elevM: null })}
                />
              )}
            </div>
            <input
              id="elev-input"
              class="tuner-input"
              type="number"
              step="25"
              min="0"
              max="4000"
              value={eff.elevEff != null ? Math.round(eff.elevEff) : ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateOverrides({ elevM: v === '' ? null : Number(v) });
              }}
            />
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="slope-input">{T('ns.land.slope')}</label>
              {slopeEdited && <EditResetBadge onReset={() => updateOverrides({ slopeDeg: null })} />}
            </div>
            <input
              id="slope-input"
              class="tuner-input"
              type="number"
              step="1"
              min="0"
              max="45"
              value={eff.slopeDeg != null ? Math.round(eff.slopeDeg) : ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                updateOverrides({ slopeDeg: v === '' ? null : Number(v) });
              }}
            />
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="aspect-select">{T('ns.land.aspect')}</label>
              {aspectEdited && (
                <EditResetBadge
                  label={T('ns.land.yourEditEst', { delta: fmtSignedDeltaC(eff.aspectDeltaC) })}
                  onReset={() => updateOverrides({ aspect: null })}
                />
              )}
            </div>
            <select
              id="aspect-select"
              class="tuner-select"
              value={eff.aspect}
              onChange={(e) => updateOverrides({ aspect: (e.target as HTMLSelectElement).value as SiteAspect })}
            >
              <option value="neutral">{T('ns.land.aspectNeutral')}</option>
              <option value="south">{T('ns.land.aspectSouth')}</option>
              <option value="north">{T('ns.land.aspectNorth')}</option>
            </select>
          </div>

          <div class="tuner-group">
            <div class="tuner-label">
              <label for="cold-air-select">{T('ns.land.coldAir')}</label>
              {coldEdited && (
                <EditResetBadge
                  label={T('ns.land.yourEditEst', { delta: fmtSignedDeltaC(eff.hollowDeltaC) })}
                  onReset={() => updateOverrides({ coldAir: null })}
                />
              )}
            </div>
            <select
              id="cold-air-select"
              class="tuner-select"
              value={eff.coldAir}
              onChange={(e) => updateOverrides({ coldAir: (e.target as HTMLSelectElement).value as SiteColdAir })}
            >
              <option value="normal">{T('ns.land.coldAirNormal')}</option>
              <option value="hollow">{T('ns.land.coldAirHollow')}</option>
              <option value="higher">{T('ns.land.coldAirHigher')}</option>
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
              {roomOptions().map((r) => (
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
