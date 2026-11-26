/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderArrival (L2459) onto live SQLite + canopi-climate v0.7.0.
import { useEffect, useState } from 'preact/hooks';
import type { ClimateZone } from '../../../../lib/palette/index.ts';
import { evaluatePlantVerdict, formatCountryName, isStructuralVine, resolveEffectiveSite, vineSupportTree } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { markStart } from '../kit/start-mark.ts';
import { PlantThumb } from './GuildVisuals.tsx';
import { PlaceSearchBox } from './PlaceSearchBox.tsx';
import {
  doyToDateLabel,
  fmtNum,
  freezeText,
  heatText,
  pollinationShortWarn,
  shortSiteName,
  taxCommonName,
  toxBadgeInfo,
  verdictSymbolLabel,
} from './ns-helpers.ts';
import {
  activePool,
  currentLocale,
  effectiveOverrides,
  launchEmpty,
  launchWithStarter,
  NS_PRESETS,
  nsSiteLoading,
  openCanopiAndToast,
  pickCoordinates,
  siteAnalogueLabel,
  startNsWatchers,
  starterPreview,
  updateOverrides,
} from './ns-state.ts';

const DIRECT_CLIMATES: readonly { id: ClimateZone; presetId: string; label: string }[] = [
  { id: 'Mediterranean', presetId: 'montpellier', label: 'Mediterranean (Csa)' },
  { id: 'Temperate', presetId: 'lyon', label: 'Temperate (Cfb)' },
  { id: 'Subtropical', presetId: 'kyoto', label: 'Subtropical (Cfa)' },
  { id: 'Continental', presetId: 'briancon', label: 'Mountain / Continental (Dfb)' },
  { id: 'Tropical', presetId: 'belem', label: 'Tropical (Af)' },
];

export function NorthStarArrival() {
  markStart();
  const [openErr, setOpenErr] = useState<string | null>(null);
  const [mapPickOpen, setMapPickOpen] = useState(false);
  const [climatePickOpen, setClimatePickOpen] = useState(false);

  const loc = store.location.value;
  const zone = store.climate.value;
  const ov = effectiveOverrides.value;
  const loading = nsSiteLoading.value;
  const starter = starterPreview.value;
  const analogue = siteAnalogueLabel.value;

  // Start session watchers (restoring any session site from language switch / reload),
  // otherwise auto-load default Montpellier site on clean first arrival.
  useEffect(() => {
    startNsWatchers();
    if (!store.location.value && !nsSiteLoading.value) {
      const def = NS_PRESETS[0];
      void pickCoordinates(def.lat, def.lon, def.label, def.zone, def.country);
    }
  }, []);

  const effToday = resolveEffectiveSite(loc?.lookup ?? null, 'today', ov);
  const eff2050 = resolveEffectiveSite(loc?.lookup ?? null, 'y2050', ov);
  const starterVerdicts = new Map(starter.map((p) => [p.id, evaluatePlantVerdict(p, effToday)]));
  const starterThrives = starter.filter((p) => starterVerdicts.get(p.id)?.level === 'fits').length;
  const allFit = starter.length > 0 && starterThrives === starter.length;

  const siteLabel = loc?.label ?? NS_PRESETS[0].label;
  const shortName = shortSiteName(siteLabel);
  const texture = loc?.lookup?.soil?.texture ?? 'loam';
  const dryMoT = effToday.dryMonths;
  const dryMo50 = eff2050.dryMonths;
  const frostCal = loc?.lookup?.v07?.frostCalendar ?? null;
  const springP90Date = doyToDateLabel(frostCal?.lastSpringP90Doy);
  const poolReady = store.load.value.status === 'ready' && activePool.value.length > 0;
  const isHydrating = !loc?.lookup || loading || !poolReady;
  const noStarter = !isHydrating && starter.length === 0;
  const countryCode = effToday.country;
  const countryChecked = !!countryCode && store.source.value?.countries().get(countryCode)?.invasiveChecked === true;
  const countryInvasiveUnchecked = !isHydrating && !!countryCode
    && store.source.value?.countries().get(countryCode)?.invasiveChecked === false;
  const countryName = countryCode ? formatCountryName(countryCode, currentLocale()) : null;
  const isRegularWatering = effToday.watering === 'all-year';
  const assumingSmall = !store.room.value || store.room.value === 'unsure';

  async function onOpenCanopiFile() {
    setOpenErr(null);
    const res = await openCanopiAndToast();
    if (res && !res.ok) setOpenErr(res.error);
  }

  const renderPresetChip = (p: (typeof NS_PRESETS)[number], fullLabel: boolean, onPicked?: () => void) => (
    <button
      key={p.id}
      type="button"
      class="sample-chip"
      aria-pressed={loc?.label === p.label ? 'true' : 'false'}
      onClick={() => {
        onPicked?.();
        void pickCoordinates(p.lat, p.lon, p.label, p.zone, p.country);
      }}
    >
      {fullLabel ? p.label : p.label.split(',')[0]}
    </button>
  );

  return (
    <div class="wrap arrival-wrap">
      <p class="arrival-eyebrow">{T('ns.arrival.eyebrow')}</p>
      <h1 class="arrival-h1">{T('ns.arrival.title')}</h1>
      <p class="arrival-lede">{T('ns.arrival.lede')}</p>

      <div class="place-bar">
        <PlaceSearchBox
          inputId="place-search"
          extraActions={
            <>
              <button
                type="button"
                class="btn-ghost"
                aria-expanded={mapPickOpen ? 'true' : 'false'}
                onClick={() => {
                  setMapPickOpen(!mapPickOpen);
                  if (!mapPickOpen) setClimatePickOpen(false);
                }}
              >
                {T('ns.arrival.pickMap')}
              </button>
              <button
                type="button"
                class="link-button small tap-link"
                onClick={() => {
                  setClimatePickOpen(!climatePickOpen);
                  if (!climatePickOpen) setMapPickOpen(false);
                }}
              >
                {T('ns.arrival.noLocClimate')}
              </button>
            </>
          }
        />

        {mapPickOpen && (
          <div class="land-alert" style={{ background: 'var(--bg)', borderColor: 'var(--border-strong)' }}>
            <strong>{T('ns.arrival.pickMapTitle')}</strong>
            <div class="sample-strip" style={{ margin: 0 }}>
              {NS_PRESETS.map((p) => renderPresetChip(p, true, () => setMapPickOpen(false)))}
            </div>
          </div>
        )}

        {climatePickOpen && (
          <div class="land-alert" style={{ background: 'var(--bg)', borderColor: 'var(--border-strong)' }}>
            <strong>{T('ns.arrival.pickClimateTitle')}</strong>
            <div class="sample-strip" style={{ margin: 0 }}>
              {DIRECT_CLIMATES.map((dc) => {
                const pr = NS_PRESETS.find((x) => x.id === dc.presetId)!;
                const active = zone === dc.id;
                return (
                  <button
                    key={dc.id}
                    type="button"
                    class="sample-chip"
                    aria-pressed={active ? 'true' : 'false'}
                    onClick={() => {
                      setClimatePickOpen(false);
                      void pickCoordinates(pr.lat, pr.lon, pr.label, pr.zone, pr.country);
                    }}
                  >
                    {dc.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div class="sample-strip" aria-label={T('ns.arrival.presetsAria')}>
        <span class="small muted">{T('ns.arrival.tryPlace')}</span>
        {NS_PRESETS.map((p) => renderPresetChip(p, false))}
      </div>

      <section class="arrival-card" aria-label={T('ns.arrival.placeCardAria')} aria-busy={isHydrating ? 'true' : undefined}>
        <div>
          <p class="pulse-kicker">
            {isHydrating ? (
              <span class="ns-skel ns-skel-kicker" aria-hidden="true" />
            ) : (
              <>
                {effToday.koppen || zone || '—'} → {eff2050.koppen || effToday.koppen || '—'} (2050s)
                {effToday.usdaZone ? ` · USDA ${effToday.usdaZone}` : ''}
              </>
            )}
          </p>
          <h2 style={{ fontSize: '26px', marginTop: '4px' }}>
            {isHydrating ? siteLabel : siteLabel}
          </h2>
          <p class="muted" style={{ marginTop: '6px' }}>
            {isHydrating ? (
              <span class="ns-skel ns-skel-sub" aria-hidden="true" />
            ) : noStarter ? (
              !isRegularWatering && (((effToday.koppen ?? '').toUpperCase().startsWith('B')) || (effToday.precipMm !== null && effToday.precipMm < 250))
                ? T('ns.arrival.tooDryRainFed', { toggle: T('ns.arrival.waterRegularly') })
                : T('ns.arrival.noStarter')
            ) : (
              <>
                {allFit
                  ? T('ns.arrival.allFit', { ph: fmtNum(effToday.soilPh) })
                  : T('ns.arrival.someFit', { ok: starterThrives, total: starter.length })}
                {assumingSmall ? ` · ${T('ns.arrival.assumingSmall')}` : ''}
                {' · '}
                {isRegularWatering ? T('ns.arrival.waterRegularly') : T('ns.arrival.rainFed')}
              </>
            )}
          </p>
          {!isHydrating && !isRegularWatering && !noStarter && (effToday.koppen ?? '').toUpperCase().startsWith('BW') && (
            <p class="arrival-desert-note small muted">{T('ns.arrival.desertEstablishNote')}</p>
          )}
          {!isHydrating && (
            <div class="arrival-water-row">
              <button
                type="button"
                class="sample-chip"
                aria-pressed={isRegularWatering ? 'true' : 'false'}
                onClick={() => updateOverrides({ watering: isRegularWatering ? 'rain' : 'all-year' })}
              >
                {T('ns.arrival.waterRegularly')}
              </button>
            </div>
          )}
        </div>

        <div class="arrival-shift-line">
          {isHydrating ? (
            <span class="ns-skel ns-skel-line" aria-hidden="true" />
          ) : (
            <>
              <strong>{T('ns.brief.shift2050')}:</strong>{' '}
              {T('ns.land.freeze10')} {freezeText(effToday)} → {freezeText(eff2050)} ·{' '}
              {T('ns.land.heat10')} {heatText(effToday)} → {heatText(eff2050)}
              {dryMoT != null && dryMo50 != null ? ` · ${T('ns.arrival.dryMonths', { a: dryMoT, b: dryMo50 })}` : ''}
              {analogue ? <> · <strong>{T('ns.arrival.resembles', { place: analogue })}</strong></> : null}
            </>
          )}
        </div>

        <div class="arrival-metrics">
          <div class="metric-box">
            <div class="metric-k">{T('ns.arrival.coldCard')}</div>
            <div class="metric-v">
              {isHydrating ? <span class="ns-skel ns-skel-val" aria-hidden="true" /> : freezeText(effToday)}
            </div>
            <div class="metric-sub">
              {isHydrating ? (
                <span class="ns-skel ns-skel-meta" aria-hidden="true" />
              ) : frostCal?.frostFree ? (
                T('ns.arrival.frostFreeDays', { n: 365 })
              ) : springP90Date ? (
                T('ns.arrival.lateSpringFrost', { date: springP90Date })
              ) : frostCal?.frostFreeDays != null ? (
                T('ns.arrival.frostFreeDays', { n: frostCal.frostFreeDays })
              ) : (
                T('ns.unknown')
              )}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-k">{T('ns.arrival.heatCard')}</div>
            <div class="metric-v">
              {isHydrating ? <span class="ns-skel ns-skel-val" aria-hidden="true" /> : heatText(effToday)}
            </div>
            <div class="metric-sub">
              {isHydrating ? (
                <span class="ns-skel ns-skel-meta" aria-hidden="true" />
              ) : effToday.tmaxWarmC != null ? (
                T('ns.arrival.heatAvgMax', { t: `${fmtNum(effToday.tmaxWarmC)} °C` })
              ) : (
                T('ns.unknown')
              )}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-k">{T('ns.arrival.soilWaterCard')}</div>
            <div class="metric-v">
              {isHydrating ? <span class="ns-skel ns-skel-val" aria-hidden="true" /> : <>pH {fmtNum(effToday.soilPh)} · {texture}</>}
            </div>
            <div class="metric-sub">
              {isHydrating ? (
                <span class="ns-skel ns-skel-meta" aria-hidden="true" />
              ) : effToday.tankDays != null && effToday.cddDays != null ? (
                T('ns.arrival.waterTankSub', { tank: effToday.tankDays, cdd: effToday.cddDays, d: T('ns.days') })
              ) : (
                T('ns.unknown')
              )}
            </div>
          </div>
        </div>

        <div class="starter-preview">
          {isHydrating ? (
            Array.from({ length: 8 }, (_, i) => (
              <div key={`skel-${i}`} class="starter-mini is-skel" aria-hidden="true">
                <span class="ns-skel ns-skel-thumb" />
                <div class="starter-mini-txt">
                  <span class="ns-skel ns-skel-name" />
                  <span class="ns-skel ns-skel-bot" />
                </div>
              </div>
            ))
          ) : noStarter ? (
            <p class="small muted" style={{ gridColumn: '1 / -1', margin: '4px 0' }}>{T('ns.arrival.noStarter')}</p>
          ) : (
            starter.map((p) => {
              const v = starterVerdicts.get(p.id);
              const isVine = isStructuralVine(p);
              const support = isVine ? vineSupportTree(p, starter) : null;
              const climbNote = isVine
                ? (support ? T('ns.vine.climbsTree', { tree: taxCommonName(support) }) : T('ns.vine.needsTrellis'))
                : null;
              const pollWarn = pollinationShortWarn(p);
              const invasiveHere = countryChecked && !!countryCode && !!countryName
                && (p.warnings.invasive_in?.some((r) => r.country === countryCode) ?? false);
              const invNote = invasiveHere && countryName ? T('ns.arrival.invasiveIn', { country: countryName }) : null;
              const tox = toxBadgeInfo(p);
              const hasAnyNote = Boolean(invNote || tox || pollWarn || climbNote);
              return (
                <div key={p.id} class="starter-mini">
                  <PlantThumb taxon={p} size={44} />
                  <div class="starter-mini-txt">
                    <div class="starter-mini-name">{taxCommonName(p)}</div>
                    <div class="starter-mini-bot">
                      {invNote && <div>⚠ {invNote}</div>}
                      {tox && <div>{tox.text}</div>}
                      {pollWarn && <div>{pollWarn}</div>}
                      {climbNote && <div>{climbNote}</div>}
                      {!hasAnyNote && (v ? verdictSymbolLabel(v.level) : p.canonical_name)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {countryInvasiveUnchecked && countryName && (
          <p class="small muted">{T('ns.arrival.invasiveUnknown', { country: countryName })}</p>
        )}

        <div class="place-actions">
          {!noStarter && (
            <button
              type="button"
              class="btn-primary"
              disabled={isHydrating}
              onClick={launchWithStarter}
            >
              {isHydrating
                ? T('ns.arrival.preparing')
                : (shortName ? T('ns.arrival.openPalette', { place: shortName }) : T('ns.arrival.startCta'))}
            </button>
          )}
          <button type="button" class={noStarter ? 'btn-primary' : 'btn-ghost'} onClick={launchEmpty}>
            {T('ns.arrival.scratchCta')}
          </button>
          <button type="button" class="btn-ghost" onClick={() => void onOpenCanopiFile()}>
            {T('ns.file.openCanopi')}
          </button>
        </div>
        {openErr && <p class="ns-err" role="alert">{openErr}</p>}
      </section>
    </div>
  );
}
