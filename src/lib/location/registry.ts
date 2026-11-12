// Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero General Public License,
// version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// copied from canopi desktop/web/src/app/geocoding/registry.ts at b039f14ee612c6090c91d44b9968357cbdd1d33e
// Changes for the website (P5 S5b, design check §B): the `email` parameter is dropped (the site never
// sends the reader's or anyone's email), the request carries `accept-language` (the page language),
// the Pelias provider (never selected, with its api.geocode.earth endpoint and key) is dropped, and the
// app's semicolon-free style is kept as copied.
/*
 * Geocoding provider registry adapted from GeoLibre
 * packages/core/src/geocoding.ts at commit e9df9e2 (forward geocoding only:
 * the provider interface, the Nominatim provider, URL building and pacing). Copyright (c) 2026 Qiusheng Wu. MIT License; see THIRD_PARTY_NOTICES.md.
 */

const DEFAULT_FORWARD_GEOCODE_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
/** Host whose public usage policy (1 request per second) must be respected. */
export const NOMINATIM_PUBLIC_HOST = 'nominatim.openstreetmap.org'
/** Nominatim's public policy is 1 request/second; 1.1 s leaves margin. */
export const NOMINATIM_MIN_INTERVAL_MS = 1100
export const NOMINATIM_ATTRIBUTION = 'Search by Nominatim · © OpenStreetMap contributors'

export type GeocodingProviderId = 'nominatim'
const DEFAULT_GEOCODING_PROVIDER_ID: GeocodingProviderId = 'nominatim'

export interface GeocoderConfig {
  readonly providerId: GeocodingProviderId
  readonly forwardEndpoint: string
  /** Preferred language of the place names (`accept-language`): the page language. */
  readonly language?: string
}

/** A normalized forward-geocoding match. */
export interface GeocodeMatch {
  readonly lat: number
  readonly lon: number
  readonly displayName: string
  /** The provider's own confidence scale, or null when it reports none. */
  readonly score: number | null
}

/** Pure request building and response normalizing; the transport does the fetch. */
export interface GeocodingProvider {
  readonly id: GeocodingProviderId
  readonly label: string
  /** Credit shown with results. */
  readonly attribution: string
  readonly defaultForwardEndpoint: string
  buildForwardUrl(config: GeocoderConfig, query: string, options: { limit?: number }): string
  parseForward(data: unknown): GeocodeMatch[]
}

/** Performs one GET and returns the parsed JSON body (undefined for an empty body). */
export type GeocodingTransport = (url: string, signal: AbortSignal | undefined) => Promise<unknown>

interface NominatimForwardResult {
  readonly lat: string
  readonly lon: string
  readonly display_name?: string
  readonly importance?: number | string
}

function coerceScore(value: number | string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Build a Nominatim forward-geocoding URL (jsonv2). */
function buildForwardGeocodeUrl(
  endpoint: string,
  query: string,
  options: { language?: string; limit?: number } = {},
): string {
  const url = new URL(endpoint)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', String(options.limit ?? 1))
  if (options.language) url.searchParams.set('accept-language', options.language)
  return url.toString()
}

function nominatimForwardResultToMatch(result: NominatimForwardResult): GeocodeMatch | null {
  const lat = Number(result.lat)
  const lon = Number(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { lat, lon, displayName: result.display_name ?? '', score: coerceScore(result.importance) }
}

const nominatimProvider: GeocodingProvider = {
  id: 'nominatim',
  label: 'Nominatim (OpenStreetMap)',
  attribution: NOMINATIM_ATTRIBUTION,
  defaultForwardEndpoint: DEFAULT_FORWARD_GEOCODE_ENDPOINT,
  buildForwardUrl: (config, query, options) =>
    buildForwardGeocodeUrl(config.forwardEndpoint, query, {
      ...(config.language ? { language: config.language } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    }),
  parseForward: (data) =>
    Array.isArray(data)
      ? (data as NominatimForwardResult[])
          .map(nominatimForwardResultToMatch)
          .filter((match): match is GeocodeMatch => match !== null)
      : [],
}

/** Selectable providers: Nominatim only. */
const GEOCODING_PROVIDERS: readonly GeocodingProvider[] = [nominatimProvider]

export function getGeocodingProvider(id: GeocodingProviderId | null | undefined): GeocodingProvider {
  return GEOCODING_PROVIDERS.find((provider) => provider.id === id) ?? nominatimProvider
}

export function defaultGeocoderConfig(): GeocoderConfig {
  return { providerId: DEFAULT_GEOCODING_PROVIDER_ID, forwardEndpoint: DEFAULT_FORWARD_GEOCODE_ENDPOINT }
}

/** Whether requests to `endpoint` fall under Nominatim's public usage policy. */
function shouldThrottle(endpoint: string): boolean {
  try {
    return new URL(endpoint).hostname === NOMINATIM_PUBLIC_HOST
  } catch {
    return true
  }
}

/** Minimum spacing between requests for `endpoint`. */
export function geocoderMinIntervalMs(endpoint: string): number {
  return shouldThrottle(endpoint) ? NOMINATIM_MIN_INTERVAL_MS : 0
}

/**
 * Milliseconds to wait before the next request so consecutive requests start
 * at least `intervalMs` apart, measured from the previous start.
 */
export function nextDelayMs(lastStartedAt: number | null, now: number, intervalMs: number): number {
  if (lastStartedAt === null) return 0
  return Math.max(0, intervalMs - (now - lastStartedAt))
}

/** Forward-geocode one query through the configured provider and transport. */
export async function geocodeForward(
  query: string,
  transport: GeocodingTransport,
  options: { signal?: AbortSignal; config?: GeocoderConfig; limit?: number } = {},
): Promise<GeocodeMatch[]> {
  const config = options.config ?? defaultGeocoderConfig()
  const provider = getGeocodingProvider(config.providerId)
  const url = provider.buildForwardUrl(config, query, { ...(options.limit ? { limit: options.limit } : {}) })
  return provider.parseForward(await transport(url, options.signal))
}
