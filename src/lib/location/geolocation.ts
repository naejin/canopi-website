// Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero General Public License,
// version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// copied from canopi desktop/web/src/app/my-location/geolocation.ts at b039f14ee612c6090c91d44b9968357cbdd1d33e
// (geolocationSupported, queryGeolocationPermission). Changes for the website (P5 S5b, design check
// §B): the app's watch is replaced by one read (`currentPosition`, low accuracy, a fix up to 10 minutes
// old reused), since "Use my location" asks once for a site, never follows the device.
// The browser half of GeoLibre's geolocation. Adapted from GeoLibre apps/geolibre-desktop/src/lib/geolocation.ts (the
// `navigator.geolocation` branch) at commit e9df9e2. The permission read follows GeoLibre's
// rule in packages/map/src/map-controller.ts (no Permissions API, or a query that throws, reads as unknown).
// Copyright (c) 2026 Qiusheng Wu. MIT License; see THIRD_PARTY_NOTICES.md.

/** The browser's error codes: 1 permission denied, 2 position unavailable, 3 timeout. */
export type GeolocationErrorCode = 1 | 2 | 3

/** One read, as a site needs it: low accuracy, a fix up to 10 minutes old, 15 s at most. */
export const SITE_POSITION_OPTIONS: PositionOptions = { enableHighAccuracy: false, maximumAge: 600_000, timeout: 15_000 }

/** Offered only where the browser can answer: a secure context with `navigator.geolocation` (module-private; the shell checks the same inline). */
function geolocationSupported(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true
    && typeof navigator !== 'undefined' && Boolean(navigator.geolocation)
}

/** The device's position once, or the browser's error code (2 when geolocation is not supported). */
export function currentPosition(options: PositionOptions = SITE_POSITION_OPTIONS): Promise<{ lat: number; lon: number } | { code: GeolocationErrorCode }> {
  if (!geolocationSupported()) return Promise.resolve({ code: 2 })
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => resolve({ code: (e.code === 1 || e.code === 3 ? e.code : 2) as GeolocationErrorCode }),
      options,
    )
  })
}

/** The geolocation permission's live status, or null when the browser cannot say (no Permissions API, or it throws). */
export async function queryGeolocationPermission(): Promise<PermissionStatus | null> {
  try {
    return await navigator.permissions?.query({ name: 'geolocation' }) ?? null
  } catch {
    return null
  }
}
