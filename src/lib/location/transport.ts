// Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero General Public License,
// version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// copied from canopi desktop/web/src/app/geocoding/transport.browser.ts at b039f14ee612c6090c91d44b9968357cbdd1d33e
// The website's geocoder fetch: place searches leave the page only through here (P5 S5b), on the
// reader's Enter, never while typing. The browser sends its default Referer (the site's origin).

import type { GeocodingTransport } from './registry.ts'

/** Web: browser `fetch`; the browser sends the page Referer that identifies the site. */
// Website change (P5 S5b review round 2, 3): a request unanswered in 15 s is aborted (a failed search,
// "offline"), so a stalled geocoder never holds the step.
export const GEOCODER_TIMEOUT_MS = 15_000
export const geocodingTransport: GeocodingTransport = async (url, signal) => {
  const limit = new AbortController()
  const timer = setTimeout(() => limit.abort(), GEOCODER_TIMEOUT_MS)
  signal?.addEventListener('abort', () => limit.abort(), { once: true })
  if (signal?.aborted) limit.abort()
  try {
    return await read(url, limit.signal)
  } catch (err) {
    // Aborted by the limit, not the caller: an error, so the search reports it (an AbortError is
    // taken as a newer search replacing this one).
    if (limit.signal.aborted && !signal?.aborted) throw new Error(`Geocoder: no answer in ${GEOCODER_TIMEOUT_MS / 1000} s`)
    throw err
  } finally { clearTimeout(timer) }
}
async function read(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  if (!response.ok) throw new Error(`Geocoder returned HTTP ${response.status}`)
  const text = await response.text()
  return text.trim() ? JSON.parse(text) as unknown : undefined
}
