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

/** One cap over the prompt and the fix when the permission was not granted before the press. */
export const PROMPT_CAP_MS = 45_000

type Position = { lat: number; lon: number } | { code: GeolocationErrorCode }
/**
 * The device's position once, or the browser's error code (2 when geolocation is not supported).
 * Website change (P5 S5b review rounds 2 to 4): the browser's own timeout does not run while its
 * permission prompt waits, so a prompt left unanswered would hold the read forever. Granted before
 * the press (`queryGeolocationPermission`): the browser's timeout, with a backstop 5 s after it.
 * Otherwise one cap, PROMPT_CAP_MS, over the prompt and the fix: a one-time Allow fires no `change`
 * event in some browsers (Firefox without Remember, Safari's Ask), so nothing tells when the prompt
 * was answered.
 */
export function currentPosition(options: PositionOptions = SITE_POSITION_OPTIONS, permission: PermissionStatus | null = null): Promise<Position> {
  if (!geolocationSupported()) return Promise.resolve({ code: 2 })
  return new Promise((resolve) => {
    const done = (r: Position) => { clearTimeout(cap); resolve(r) }
    const cap = setTimeout(() => done({ code: 3 }), permission?.state === 'granted' ? (options.timeout ?? 15_000) + 5_000 : PROMPT_CAP_MS)
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => done({ code: (e.code === 1 || e.code === 3 ? e.code : 2) as GeolocationErrorCode }),
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
