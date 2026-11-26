/** @jsxImportSource preact */
// Wave 7 "Your land" left slide-over drawer:
// - Default closed so Design Board gets full 1200px desktop width & starts above the fold on 390px mobile
// - Inline "Change place" reusing shared PlaceSearchBox (zero demo city pills cluttering user's land)
// - 2x2 Site Snapshot cards (always localized "Unknown" when missing)
// - Always-visible 3-way segmented controls for Watering ('rain' | 'first-years' | 'all-year'), Space/Room + plot m², Sun, Wind
// - Organized Soil & Microclimate fine-tune sections with "Reset all edits (N)"
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type {
  InputWind,
  PaletteReport,
  ReportDrainage,
  Room,
  SiteAspect,
  SiteColdAir,
  SiteLightChoice,
  Watering,
} from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { drainageChoiceLabel, soilTextureLabel } from '../../rules/soil-labels.ts';
import { NumericField } from './NumericField.tsx';
import { PlaceSearchBox } from './PlaceSearchBox.tsx';
import { fmtNum, freezeText, heatText, roomOptions } from './ns-helpers.ts';
import {
  effectiveOverrides,
  nsDrawer,
  nsLandOpen,
  nsOverrides,
  resetAllSiteOverrides,
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

function parseOptionalNum(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function phPlainLabel(ph: number | null): string {
  if (ph == null) return '';
  if (ph < 5.6) return T('ns.land.phAcidic');
  if (ph < 6.6) return T('ns.land.phSlightlyAcidic');
  if (ph <= 7.4) return T('ns.land.phNeutral');
  return T('ns.land.phAlkaline');
}

export function LandPanel({ rep, returnFocusTo }: { rep: PaletteReport; returnFocusTo?: HTMLElement | null }) {
  const [changePlaceOpen, setChangePlaceOpen] = useState(false);
  const [soilOpen, setSoilOpen] = useState(false);
  const [microOpen, setMicroOpen] = useState(false);
  const [resetSeq, setResetSeq] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const ov = effectiveOverrides.value;
  const rawOv = nsOverrides.value;
  const loc = store.location.value;
  const locKey = loc ? `${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}` : '';
  const fieldResetKey = `${locKey}|${resetSeq}`;
  const bumpReset = () => setResetSeq((s) => s + 1);
  const eff = rep.eff;
  const basePh = loc?.lookup?.soil?.phH2o ?? null;
  const baseTexture = loc?.lookup?.soil?.texture ?? null;
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
  const siteLabel = loc?.label ?? store.climate.value ?? T('ns.land.title');
  const climateParts = [
    eff.koppen || store.climate.value || null,
    eff.usdaZone ? `USDA ${eff.usdaZone}` : null,
    eff.precipMm != null ? `${Math.round(eff.precipMm)} ${T('ns.unit.mmYear')}` : null,
  ].filter(Boolean);

  function closePanel() {
    nsLandOpen.value = false;
    returnFocusTo?.focus?.();
  }

  useLayoutEffect(() => {
    const closeBtn = panelRef.current?.querySelector<HTMLElement>('.land-close-btn');
    closeBtn?.focus?.();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const soilValueParts = [
    eff.soilPh != null ? `pH ${fmtNum(eff.soilPh)}` : null,
    ov.drainage ? drainageChoiceLabel(ov.drainage) : (baseTexture ? soilTextureLabel(baseTexture) : null),
    eff.stonesPct != null ? T('ns.land.rockPct', { n: Math.round(eff.stonesPct) }) : null,
  ].filter(Boolean);

  return (
    <>
      <div class="land-panel-backdrop" onClick={closePanel} aria-hidden="true" />
      <div
        ref={panelRef}
        class="land-panel"
        role="dialog"
        aria-modal="true"
        aria-label={T('ns.land.title')}
      >
        <div class="land-drawer-head">
          <div class="land-head-main">
            <p class="pulse-kicker">{T('ns.land.title')}</p>
            <h2>{siteLabel}</h2>
            <p class="small muted tnum">
              {climateParts.length ? climateParts.join(' · ') : T('ns.unknown')}
              {elevEdited ? ` ${T('ns.land.gridCellTag')}` : ''}
            </p>
          </div>
          <div class="land-head-acts">
            <button
              type="button"
              class="btn-ghost btn-sm"
              aria-expanded={changePlaceOpen ? 'true' : 'false'}
              onClick={() => setChangePlaceOpen((v) => !v)}
            >
              {T('ns.land.changePlace')}
            </button>
            <button
              type="button"
              class="btn-ghost btn-sm land-close-btn"
              aria-label={T('ns.hide')}
              onClick={closePanel}
            >
              ×
            </button>
          </div>
        </div>

        <div class="land-drawer-body">
          {changePlaceOpen && (
            <div class="land-change-box">
              <PlaceSearchBox
                inputId="land-place-search"
                compact
                onPicked={() => setChangePlaceOpen(false)}
              />
              <button
                type="button"
                class="link-button small tap-link"
                onClick={() => {
                  nsLandOpen.value = false;
                  store.view.value = 'start';
                }}
              >
                {T('ns.land.openArrival')} →
              </button>
            </div>
          )}

          {/* 2x2 At-a-glance site snapshot (always localized Unknown when missing) */}
          <div class="land-snapshot-grid">
            <div class="land-snap-card">
              <span class="land-snap-k">{T('ns.land.freeze10')}</span>
              <strong class="land-snap-v tnum">{freezeText(eff)}</strong>
            </div>
            <div class="land-snap-card">
              <span class="land-snap-k">{T('ns.land.heat10')}</span>
              <strong class="land-snap-v tnum">{heatText(eff)}</strong>
            </div>
            <div class="land-snap-card">
              <span class="land-snap-k">{T('ns.land.soilPh')}</span>
              <strong class="land-snap-v tnum">
                {soilValueParts.length ? soilValueParts.join(' · ') : T('ns.unknown')}
              </strong>
            </div>
            <div class="land-snap-card">
              <span class="land-snap-k">{T('ns.land.waterTank')}</span>
              <strong class="land-snap-v tnum">
                {eff.tankDays != null && eff.cddDays != null
                  ? T('ns.arrival.waterTankSub', { tank: eff.tankDays, cdd: eff.cddDays, d: dShort })
                  : T('ns.unknown')}
              </strong>
            </div>
          </div>

          {highRelief && terrain && (
            <div class="land-alert">
              <strong>{T('ns.land.gridElev', { m: `${terrain.elevM?.toLocaleString() ?? '—'} m` })}</strong>
              <span>{T('ns.land.mixedTerrain', { m: `${terrain.reliefM ?? 0} m` })}</span>
            </div>
          )}

          {/* Always-visible everyday choices: Watering, Space + Plot m², Sun, Wind */}
          <section class="land-section" aria-label={T('ns.land.everydayHead')}>
            <h3 class="land-section-title">{T('ns.land.everydayHead')}</h3>

            <div class="tuner-group">
              <span class="tuner-label">{T('ns.tune.watering')}</span>
              <div class="seg seg-full" role="group" aria-label={T('ns.tune.watering')}>
                {([
                  ['rain', T('ns.water.rainShort')],
                  ['first-years', T('ns.water.firstYears')],
                  ['all-year', T('ns.water.allYear')],
                ] as readonly [Watering, string][]).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={eff.watering === val ? 'true' : 'false'}
                    onClick={() => updateOverrides({ watering: val })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div class="tuner-group">
              <span class="tuner-label">{T('ns.arrival.roomLabel')}</span>
              <div class="seg seg-full" role="group" aria-label={T('ns.arrival.roomLabel')}>
                {roomOptions().map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={eff.room === r.id ? 'true' : 'false'}
                    onClick={() => setRoomChoice(r.id as Room)}
                  >
                    {r.label()}
                  </button>
                ))}
              </div>
            </div>

            <div class="tuner-group">
              <label class="tuner-label" for="land-plot-m2">{T('ns.land.plot')} (m²)</label>
              <NumericField
                id="land-plot-m2"
                value={eff.plotM2}
                min={20}
                max={50000}
                inputMode="numeric"
                unit="m²"
                resetKey={fieldResetKey}
                onCommit={(n) => { if (n != null) updateOverrides({ plotM2: n }); }}
              />
            </div>

            <div class="tuner-group">
              <div class="tuner-label">
                <span>{T('ns.land.siteLight')}</span>
                {lightEdited && <EditResetBadge onReset={() => updateOverrides({ siteLight: null })} />}
              </div>
              <div class="seg seg-full" role="group" aria-label={T('ns.land.siteLight')}>
                {([
                  ['full_sun', T('ns.land.siteLightFull')],
                  ['part_shade', T('ns.land.siteLightPart')],
                  ['shade', T('ns.land.siteLightShade')],
                ] as readonly [SiteLightChoice, string][]).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={eff.siteLight === val ? 'true' : 'false'}
                    onClick={() => updateOverrides({ siteLight: val === 'full_sun' ? null : val })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div class="tuner-group">
              <div class="tuner-label">
                <span>{T('ns.tune.wind')}</span>
                {windEdited && <EditResetBadge onReset={() => updateOverrides({ wind: null })} />}
              </div>
              <div class="seg seg-full" role="group" aria-label={T('ns.tune.wind')}>
                {([
                  ['sheltered', T('ns.wind.sheltered')],
                  ['moderate', T('ns.land.windModerate')],
                  ['windy', T('ns.wind.exposed')],
                ] as readonly [string, string][]).map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={windValue === val ? 'true' : 'false'}
                    onClick={() => updateOverrides({ wind: val === 'moderate' ? null : (val as InputWind) })}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Fine-tune Soil & Microclimate */}
          <section class="land-section" aria-label={T('ns.land.tuneSite')}>
            <div class="land-section-head">
              <h3 class="land-section-title">
                {T('ns.land.tuneSite')}{editCount > 0 ? ` (${T('ns.land.edited', { n: editCount })})` : ''}
              </h3>
              {editCount > 0 && (
                <button
                  type="button"
                  class="edit-reset"
                  onClick={() => {
                    resetAllSiteOverrides();
                    bumpReset();
                  }}
                >
                  {T('ns.land.resetAll')}
                </button>
              )}
            </div>

            <details
              class="tune-details"
              open={soilOpen}
              onToggle={(e) => setSoilOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary>
                <span>{T('ns.land.soilDrainHead')}</span>
                <span aria-hidden="true">{soilOpen ? '▾' : '▸'}</span>
              </summary>
              <div class="tune-body">
                <div class="tuner-group">
                  <div class="tuner-label">
                    <label for="ph-input">
                      {T('ns.land.soilPh')}: {eff.soilPh != null ? `${fmtNum(eff.soilPh)} (${phPlainLabel(eff.soilPh)})` : T('ns.unknown')}
                    </label>
                    {phEdited && <EditResetBadge onReset={() => updateOverrides({ soilPh: null })} />}
                  </div>
                  <input
                    id="ph-input"
                    type="range"
                    min="4.5"
                    max="8.8"
                    step="0.1"
                    value={eff.soilPh ?? 6.8}
                    onInput={(e) => { const n = parseOptionalNum((e.target as HTMLInputElement).value); if (n !== null) updateOverrides({ soilPh: n }); }}
                    onChange={(e) => { const n = parseOptionalNum((e.target as HTMLInputElement).value); if (n !== null) updateOverrides({ soilPh: n }); }}
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
                      updateOverrides({ drainage: v ? (v as ReportDrainage) : null });
                    }}
                  >
                    <option value="sandy">{T('ns.land.drainSandy')}</option>
                    <option value="">{T('ns.land.drainDefault', { tex: soilTextureLabel(baseTexture) })}</option>
                    <option value="clay">{T('ns.land.drainClay')}</option>
                    <option value="wet">{T('ns.land.drainWet')}</option>
                  </select>
                </div>

                <div class="tuner-group">
                  <div class="tuner-label">
                    <label for="stones-input">
                      {T('ns.land.rockiness')}: {eff.stonesPct != null ? `${Math.round(eff.stonesPct)}%` : T('ns.unknown')}
                    </label>
                    {stonesEdited && <EditResetBadge onReset={() => updateOverrides({ stonesPct: null })} />}
                  </div>
                  <input
                    id="stones-input"
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={eff.stonesPct ?? 0}
                    onInput={(e) => { const n = parseOptionalNum((e.target as HTMLInputElement).value); if (n !== null) updateOverrides({ stonesPct: n }); }}
                    onChange={(e) => { const n = parseOptionalNum((e.target as HTMLInputElement).value); if (n !== null) updateOverrides({ stonesPct: n }); }}
                  />
                </div>
              </div>
            </details>

            <details
              class="tune-details"
              open={microOpen}
              onToggle={(e) => setMicroOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary>
                <span>{T('ns.land.extremesHead')}</span>
                <span aria-hidden="true">{microOpen ? '▾' : '▸'}</span>
              </summary>
              <div class="tune-body">
                <div class="tuner-group">
                  <div class="tuner-label">
                    <label for="elev-input">{T('ns.land.plotElev')}</label>
                    {elevEdited && (
                      <EditResetBadge
                        label={T('ns.land.yourEditEst', { delta: fmtSignedDeltaC(eff.elevDeltaC) })}
                        onReset={() => { updateOverrides({ elevM: null }); bumpReset(); }}
                      />
                    )}
                  </div>
                  <NumericField
                    id="elev-input"
                    value={eff.elevEff != null ? Math.round(eff.elevEff) : null}
                    min={0}
                    max={4000}
                    optional
                    isEdited={elevEdited}
                    inputMode="numeric"
                    unit="m"
                    resetKey={fieldResetKey}
                    onCommit={(n) => updateOverrides({ elevM: n })}
                  />
                </div>

                <div class="tuner-group">
                  <div class="tuner-label">
                    <label for="slope-input">{T('ns.land.slope')}</label>
                    {slopeEdited && <EditResetBadge onReset={() => { updateOverrides({ slopeDeg: null }); bumpReset(); }} />}
                  </div>
                  <NumericField
                    id="slope-input"
                    value={eff.slopeDeg != null ? Math.round(eff.slopeDeg) : null}
                    min={0}
                    max={45}
                    optional
                    isEdited={slopeEdited}
                    inputMode="numeric"
                    unit="°"
                    resetKey={fieldResetKey}
                    onCommit={(n) => updateOverrides({ slopeDeg: n })}
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
                  <div class="tuner-label">
                    <label for="freeze-input">{T('ns.land.freeze10Input')}</label>
                    {freezeEdited && <EditResetBadge onReset={() => { updateOverrides({ freeze10: null }); bumpReset(); }} />}
                  </div>
                  <NumericField
                    id="freeze-input"
                    value={eff.freeze10C}
                    min={-40}
                    max={20}
                    allowDecimal
                    allowNegative
                    optional
                    isEdited={freezeEdited}
                    unit="°C"
                    resetKey={fieldResetKey}
                    onCommit={(n) => updateOverrides({ freeze10: n })}
                  />
                </div>

                <div class="tuner-group">
                  <div class="tuner-label">
                    <label for="heat-input">{T('ns.land.heat10Input')}</label>
                    {heatEdited && <EditResetBadge onReset={() => { updateOverrides({ heat10: null }); bumpReset(); }} />}
                  </div>
                  <NumericField
                    id="heat-input"
                    value={eff.heat10C}
                    min={15}
                    max={55}
                    allowDecimal
                    optional
                    isEdited={heatEdited}
                    inputMode="decimal"
                    unit="°C"
                    resetKey={fieldResetKey}
                    onCommit={(n) => updateOverrides({ heat10: n })}
                  />
                </div>

                <div class="tuner-group">
                  <div class="tuner-label">
                    <label for="cdd-input">{T('ns.land.cddInput')}</label>
                    {cddEdited && <EditResetBadge onReset={() => { updateOverrides({ cddDays: null }); bumpReset(); }} />}
                  </div>
                  <NumericField
                    id="cdd-input"
                    value={eff.cddDays}
                    min={5}
                    max={150}
                    optional
                    isEdited={cddEdited}
                    inputMode="numeric"
                    unit={dShort}
                    resetKey={fieldResetKey}
                    onCommit={(n) => updateOverrides({ cddDays: n })}
                  />
                </div>
              </div>
            </details>
          </section>
        </div>

        <div class="land-drawer-foot">
          <button
            class="btn-ghost"
            type="button"
            onClick={() => {
              nsLandOpen.value = false;
              nsDrawer.value = { kind: 'atlas', tab: 'climate' };
            }}
          >
            {T('ns.why')} {T('ns.atlas.title')} →
          </button>
          <button class="btn-primary" type="button" onClick={closePanel}>
            {T('ns.land.done')}
          </button>
        </div>
      </div>
    </>
  );
}
