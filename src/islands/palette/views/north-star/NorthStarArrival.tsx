/** @jsxImportSource preact */
// Screen 0 — 1-Move Arrival (1:1 port of approved Prototype v7.3).
// Live Nominatim place search, browser GPS, 6 global presets, Room pills,
// 3-signal Land Brief, 2050s SSP2-4.5 Shift Line, and Photo-rich Starter Preview.
import { useEffect, useRef, useState } from 'preact/hooks';
import { resolveEffectiveSite } from '../../../../lib/palette/index.ts';
import { createPlaceSearchController, type PlaceSearchController, type PlaceSearchResult } from '../../../../lib/location/place-search.ts';
import { defaultGeocoderConfig } from '../../../../lib/location/registry.ts';
import { geocodingTransport } from '../../../../lib/location/transport.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { fmtC, fmtNum, freezeText, jobLabel, photoUrlOf, roomOptions, taxCommonName } from './ns-helpers.ts';
import {
  effectiveOverrides,
  launchEmpty,
  launchWithStarter,
  NS_PRESETS,
  nsSiteLoading,
  pickCoordinates,
  setRoomChoice,
  starterPreview,
  startNsWatchers,
} from './ns-state.ts';

const ROOMS = roomOptions(true);

export function NorthStarArrival() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<readonly PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const searchCtrlRef = useRef<PlaceSearchController | null>(null);

  useEffect(() => {
    startNsWatchers();
    // Auto-select Montpellier on first visit if no location or climate is chosen yet
    if (!store.location.peek() && !store.climate.peek()) {
      const first = NS_PRESETS[0];
      void pickCoordinates(first.lat, first.lon, first.label, first.zone, first.country);
    }
    return () => { searchCtrlRef.current?.dispose(); };
  }, []);

  async function onSearchSubmit(e: Event) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setGeoErr(null);
    try {
      if (!searchCtrlRef.current) {
        searchCtrlRef.current = createPlaceSearchController({
          transport: geocodingTransport,
          config: defaultGeocoderConfig(),
          limit: 5,
        });
      }
      await searchCtrlRef.current.search(q);
      setHits(searchCtrlRef.current.results.value.slice(0, 5));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  function onUseGps() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoErr(T('ns.arrival.geoUnavailable'));
      return;
    }
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(3));
        const lon = Number(pos.coords.longitude.toFixed(3));
        void pickCoordinates(lat, lon, `${lat}, ${lon}`);
      },
      () => setGeoErr(T('ns.arrival.geoDenied')),
      { timeout: 8000 },
    );
  }

  const loc = store.location.value;
  const lookup = loc?.lookup ?? null;
  const ov = effectiveOverrides.value;
  const effToday = resolveEffectiveSite(lookup, 'today', ov);
  const eff2050 = resolveEffectiveSite(lookup, 'y2050', ov);
  const starter = starterPreview.value;
  const currentRoom = store.room.value ?? 'unsure';
  const hasSaved = store.members.value.length > 0;
  const loading = nsSiteLoading.value;

  const shiftTemp = effToday.tmeanWarmC !== null && eff2050.tmeanWarmC !== null
    ? fmtNum(eff2050.tmeanWarmC - effToday.tmeanWarmC, 1)
    : null;

  return (
    <div class="arrival-wrap">
      {hasSaved && (
        <div class="return-banner" role="region" aria-label={T('ns.arrival.returning')}>
          <div>
            <strong>{T('ns.arrival.returning')}</strong>{' '}
            <span>{T('ns.arrival.returningCount', { n: store.members.value.length })}</span>
          </div>
          <button type="button" class="btn-primary" onClick={() => { store.view.value = 'matrix'; }}>
            {T('ns.arrival.resume')}
          </button>
        </div>
      )}

      <header class="arrival-head">
        <span class="eyebrow">{T('ns.arrival.eyebrow')}</span>
        <h1 class="arrival-title">{T('ns.arrival.title')}</h1>
        <p class="arrival-lede">{T('ns.arrival.lede')}</p>
      </header>

      <section class="place-card" aria-label={T('ns.arrival.placeCardAria')}>
        <form class="place-bar" onSubmit={onSearchSubmit}>
          <input
            type="search"
            class="place-input"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={T('ns.arrival.searchPlaceholder')}
            aria-label={T('ns.arrival.searchPlaceholder')}
          />
          <button type="submit" class="btn-secondary" disabled={searching}>
            {searching ? T('ns.searching') : T('ns.search')}
          </button>
          <button type="button" class="btn-secondary" onClick={onUseGps}>
            {T('ns.arrival.useGps')}
          </button>
        </form>

        {geoErr && <p class="ns-err" role="alert">{geoErr}</p>}

        {hits.length > 0 && (
          <ul class="place-hits" role="listbox" aria-label={T('ns.arrival.resultsAria')}>
            {hits.map((h) => (
              <li key={`${h.lat},${h.lon}`}>
                <button
                  type="button"
                  class="place-hit-btn"
                  onClick={() => {
                    setHits([]);
                    setQuery(h.label);
                    void pickCoordinates(h.lat, h.lon, h.label);
                  }}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div class="preset-row" role="group" aria-label={T('ns.arrival.presetsAria')}>
          {NS_PRESETS.map((p) => {
            const active = loc?.label === p.label;
            return (
              <button
                key={p.id}
                type="button"
                class="site-pill-sm"
                aria-pressed={active ? 'true' : 'false'}
                onClick={() => void pickCoordinates(p.lat, p.lon, p.label, p.zone, p.country)}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div class="room-row" role="group" aria-label={T('ns.arrival.roomAria')}>
          <span class="room-label">{T('ns.arrival.roomLabel')}</span>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              class="site-pill-sm"
              aria-pressed={currentRoom === r.id ? 'true' : 'false'}
              onClick={() => setRoomChoice(r.id)}
            >
              {r.label()}
            </button>
          ))}
        </div>

        {/* 3-Signal Land Brief + 2050s SSP2-4.5 Shift Line */}
        <div class="land-brief" aria-busy={loading ? 'true' : undefined}>
          <div class="brief-cell">
            <span class="brief-k">{T('ns.brief.climate')}</span>
            <strong class="brief-v">
              {loc?.label ?? T('ns.arrival.pickPlace')}
              {effToday.koppen ? ` · ${effToday.koppen}` : ''}
            </strong>
            <span class="brief-sub">
              {effToday.usdaZone ? `USDA ${effToday.usdaZone}` : store.climate.value ?? ''}
            </span>
          </div>
          <div class="brief-cell">
            <span class="brief-k">{T('ns.brief.freeze')}</span>
            <strong class="brief-v">{freezeText(effToday)}</strong>
            <span class="brief-sub">
              {T('ns.brief.heatShort')}: {effToday.heat10C !== null ? fmtC(effToday.heat10C) : T('ns.unknown')}
            </span>
          </div>
          <div class="brief-cell">
            <span class="brief-k">{T('ns.brief.soilWater')}</span>
            <strong class="brief-v">
              {effToday.soilPh !== null ? `pH ${fmtNum(effToday.soilPh, 1)}` : T('ns.unknown')}
              {effToday.tankDays !== null ? ` · ${effToday.tankDays} ${T('ns.unit.dayShort')}` : ''}
            </strong>
            <span class="brief-sub">
              {effToday.precipMm !== null ? `${effToday.precipMm} ${T('ns.unit.mmYear')}` : T('ns.unknown')}
            </span>
          </div>
        </div>

        {shiftTemp !== null && (
          <p class="shift-line">
            <strong>{T('ns.brief.shift2050')}:</strong>{' '}
            {T('ns.brief.shiftDetail', {
              warmDelta: `${shiftTemp} °C`,
              freeze50: freezeText(eff2050),
            })}
          </p>
        )}
      </section>

      {/* Photo-Rich Starter Preview */}
      <section class="starter-card" aria-label={T('ns.arrival.starterAria')}>
        <div class="starter-head">
          <div>
            <h2 class="starter-title">{T('ns.arrival.starterTitle', { n: starter.length })}</h2>
            <p class="starter-sub">{T('ns.arrival.starterSub')}</p>
          </div>
          <div class="starter-acts">
            <button type="button" class="btn-primary" disabled={!starter.length} onClick={launchWithStarter}>
              {T('ns.arrival.startCta')}
            </button>
            <button type="button" class="btn-secondary" onClick={launchEmpty}>
              {T('ns.arrival.scratchCta')}
            </button>
          </div>
        </div>

        <div class="starter-strip">
          {starter.map((t) => {
            const img = photoUrlOf(t);
            return (
              <div key={t.id} class="starter-chip">
                {img ? (
                  <img src={img} alt={taxCommonName(t)} class="starter-thumb" loading="lazy" width="44" height="44" />
                ) : (
                  <span class="starter-thumb starter-thumb-ph" aria-hidden="true">{t.canonical_name.slice(0, 2)}</span>
                )}
                <div class="starter-chip-txt">
                  <strong>{taxCommonName(t)}</strong>
                  <span>{t.canonical_name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {!starter.length && (
          <p class="ns-muted">{T('ns.loadingPlants')}</p>
        )}
      </section>

      {/* Subtle job legend */}
      <p class="ns-muted" style={{ textAlign: 'center', fontSize: '12px' }}>
        {jobLabel('feeds_you')} · {jobLabel('feeds_soil')} · {jobLabel('helpers')} · {jobLabel('mulch')} · {jobLabel('ground')} · {jobLabel('shelter')}
      </p>
    </div>
  );
}
