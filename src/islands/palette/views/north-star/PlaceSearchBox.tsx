/** @jsxImportSource preact */
// Shared Nominatim + GPS place search box used by both Arrival and Your Land (Wave 7 Point 9: one place search).
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { findPlaces, placeName } from '../../state/location.ts';
import { T } from '../../strings.ts';
import { pickCoordinates } from './ns-state.ts';

interface PlaceHit {
  label: string;
  lat: number;
  lon: number;
}

export function PlaceSearchBox({
  inputId,
  compact = false,
  onPicked,
  extraActions,
}: {
  inputId: string;
  compact?: boolean;
  onPicked?: () => void;
  extraActions?: ComponentChildren;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  async function onSearchSubmit(e: Event) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    try {
      const { results } = await findPlaces(q);
      setHits(results.slice(0, 6).map((h) => ({ label: placeName(h), lat: h.lat, lon: h.lon })));
      if (!results.length) setSearchErr(T('ns.unknown'));
    } catch {
      setSearchErr(T('ns.arrival.geoDenied'));
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
        onPicked?.();
        void pickCoordinates(latitude, longitude, `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
      },
      () => setSearchErr(T('ns.arrival.geoDenied')),
      { timeout: 10_000 },
    );
  }

  return (
    <div class={compact ? 'place-search-compact' : undefined}>
      <form class="place-bar-row" onSubmit={onSearchSubmit}>
        <div class="place-input-wrap">
          <label class="sr-only" for={inputId}>{T('ns.arrival.placeCardAria')}</label>
          <input
            id={inputId}
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
                      onPicked?.();
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
          {extraActions}
        </div>
      </form>
      {searchErr && <p class="ns-err" role="alert">{searchErr}</p>}
    </div>
  );
}
