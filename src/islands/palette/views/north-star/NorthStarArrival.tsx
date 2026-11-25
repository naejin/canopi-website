/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html renderArrival (L2459) onto live SQLite + canopi-climate v0.7.0.
import { useEffect, useState } from 'preact/hooks';
import type { ClimateZone } from '../../../../lib/palette/index.ts';
import { evaluatePlantVerdict, resolveEffectiveSite } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { findPlaces, placeName } from '../../state/location.ts';
import { T } from '../../strings.ts';
import { markStart } from '../kit/start-mark.ts';
import { PlantThumb } from './GuildVisuals.tsx';
import {
  fmtNum,
  freezeText,
  heatText,
  shortSiteName,
  taxCommonName,
  verdictSymbolLabel,
} from './ns-helpers.ts';
import {
  currentLocale,
  effectiveOverrides,
  launchEmpty,
  launchWithStarter,
  NS_PRESETS,
  nsSiteLoading,
  pickCoordinates,
  starterPreview,
} from './ns-state.ts';

interface PlaceHit {
  label: string;
  lat: number;
  lon: number;
}

const DIRECT_CLIMATES: readonly { id: ClimateZone; presetId: string; label: string }[] = [
  { id: 'Mediterranean', presetId: 'montpellier', label: 'Mediterranean (Csa)' },
  { id: 'Temperate', presetId: 'lyon', label: 'Temperate (Cfb)' },
  { id: 'Subtropical', presetId: 'kyoto', label: 'Subtropical (Cfa)' },
  { id: 'Continental', presetId: 'briancon', label: 'Mountain / Continental (Dfb)' },
  { id: 'Tropical', presetId: 'belem', label: 'Tropical (Af)' },
];

export function NorthStarArrival() {
  markStart();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [climatePickOpen, setClimatePickOpen] = useState(false);

  const loc = store.location.value;
  const zone = store.climate.value;
  const ov = effectiveOverrides.value;
  const loading = nsSiteLoading.value;
  const starter = starterPreview.value;

  // Auto-load default Montpellier site on clean first arrival so live climate & 8-plant starter appear immediately
  useEffect(() => {
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

  async function onSearchSubmit(e: Event) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    try {
      const { results } = await findPlaces(q);
      setHits(results.slice(0, 6).map((h) => ({ label: placeName(h), lat: h.lat, lon: h.lon })));
      if (!results.length) setSearchErr('No matching place found.');
    } catch {
      setSearchErr('Could not search places right now.');
    } finally {
      setSearching(false);
    }
  }

  function onUseMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setSearchErr(T('ns.arrival.geoUnavailable'));
      return;
    }
    setSearchErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        void pickCoordinates(latitude, longitude, `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
      },
      () => setSearchErr(T('ns.arrival.geoDenied')),
      { timeout: 10_000 },
    );
  }

  return (
    <div class="wrap arrival-wrap">
      <p class="arrival-eyebrow">{T('ns.arrival.eyebrow')}</p>
      <h1 class="arrival-h1">{T('ns.arrival.title')}</h1>
      <p class="arrival-lede">{T('ns.arrival.lede')}</p>

      <div class="place-bar">
        <form class="place-bar-row" onSubmit={onSearchSubmit}>
          <div class="place-input-wrap">
            <label class="sr-only" for="place-search">{T('ns.arrival.placeCardAria')}</label>
            <input
              id="place-search"
              class="place-input"
              type="search"
              value={query}
              placeholder={T('ns.arrival.searchPlaceholder')}
              autocomplete="off"
              onInput={(e) => {
                setQuery((e.target as HTMLInputElement).value);
                if (hits.length) setHits([]);
              }}
            />
            {hits.length > 0 && (
              <ul class="place-suggest" role="listbox">
                {hits.map((h) => (
                  <li key={`${h.lat},${h.lon}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setHits([]);
                        setQuery(h.label);
                        void pickCoordinates(h.lat, h.lon, h.label);
                      }}
                    >
                      <strong>{h.label}</strong>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="place-actions">
            <button type="submit" class="btn-ghost" disabled={searching || !query.trim()}>
              {searching ? '…' : T('ns.search')}
            </button>
            <button type="button" class="btn-ghost" onClick={onUseMyLocation}>
              {T('ns.arrival.useGps')}
            </button>
            <button
              type="button"
              class="link-button small tap-link"
              onClick={() => setClimatePickOpen(!climatePickOpen)}
            >
              No location? Pick a climate
            </button>
          </div>
        </form>

        {searchErr && <p class="ns-err" role="alert">{searchErr}</p>}

        {climatePickOpen && (
          <div class="land-alert" style={{ background: 'var(--bg)', borderColor: 'var(--border-strong)' }}>
            <strong>Pick a climate directly</strong>
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
        <span class="small muted">Try a place:</span>
        {NS_PRESETS.map((p) => {
          const active = loc?.label === p.label;
          return (
            <button
              key={p.id}
              type="button"
              class="sample-chip"
              aria-pressed={active ? 'true' : 'false'}
              onClick={() => void pickCoordinates(p.lat, p.lon, p.label, p.zone, p.country)}
            >
              {p.label.split(',')[0]}
            </button>
          );
        })}
      </div>

      <section class="arrival-card" aria-label="Site preview">
        <div>
          <p class="pulse-kicker">
            {effToday.koppen || zone || '—'} → {eff2050.koppen || effToday.koppen || '—'} (2050s)
            {effToday.usdaZone ? ` · USDA ${effToday.usdaZone}` : ''}
          </p>
          <h2 style={{ fontSize: '26px', marginTop: '4px' }}>
            {loading ? T('ns.loadingPlants') : siteLabel}
          </h2>
          <p class="muted" style={{ marginTop: '6px' }}>
            {allFit
              ? `Every starter plant fits your pH ${fmtNum(effToday.soilPh)} soil and climate.`
              : `${starterThrives} of ${starter.length} starter plants thrive rain-fed.`}
          </p>
        </div>

        <div class="arrival-shift-line">
          <strong>{T('ns.brief.shift2050')}:</strong>{' '}
          {T('ns.land.freeze10')} {freezeText(effToday)} → {freezeText(eff2050)} ·{' '}
          {T('ns.land.heat10')} {heatText(effToday)} → {heatText(eff2050)}
          {dryMoT != null && dryMo50 != null ? ` · dry months ${dryMoT} → ${dryMo50}/yr` : ''}
        </div>

        <div class="arrival-metrics">
          <div class="metric-box">
            <div class="metric-k">{T('ns.land.freeze10')}</div>
            <div class="metric-v">{freezeText(effToday)}</div>
            <div class="metric-sub">
              {effToday.tminColdC != null ? `Coldest month avg min ${fmtNum(effToday.tminColdC)} °C` : T('ns.unknown')}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-k">{T('ns.land.heat10')}</div>
            <div class="metric-v">{heatText(effToday)}</div>
            <div class="metric-sub">
              {effToday.tmaxWarmC != null ? `Warmest month avg max ${fmtNum(effToday.tmaxWarmC)} °C` : T('ns.unknown')}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-k">{T('ns.land.soilPh')} &amp; {T('ns.land.waterTank')}</div>
            <div class="metric-v">pH {fmtNum(effToday.soilPh)} · {texture}</div>
            <div class="metric-sub">
              {effToday.tankDays != null && effToday.cddDays != null
                ? `Soil holds ~${effToday.tankDays} ${T('ns.days')} · longest dry spell ~${effToday.cddDays} ${T('ns.days')}`
                : T('ns.unknown')}
            </div>
          </div>
        </div>

        <div class="starter-preview">
          {starter.map((p) => {
            const v = starterVerdicts.get(p.id);
            return (
              <div key={p.id} class="starter-mini">
                <PlantThumb taxon={p} size={44} />
                <div class="starter-mini-txt">
                  <div class="starter-mini-name">{taxCommonName(p)}</div>
                  <div class="starter-mini-bot">{v ? verdictSymbolLabel(v.level) : p.canonical_name}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div class="place-actions">
          <button
            type="button"
            class="btn-primary"
            disabled={loading || starter.length === 0}
            onClick={launchWithStarter}
          >
            {shortName ? `Open my ${shortName} palette →` : T('ns.arrival.startCta')}
          </button>
          <button type="button" class="btn-ghost" onClick={launchEmpty}>
            {T('ns.arrival.scratchCta')}
          </button>
        </div>
      </section>
    </div>
  );
}
