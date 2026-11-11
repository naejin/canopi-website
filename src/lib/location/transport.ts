// Copyright (C) 2026 Canopi contributors. Licensed under the GNU Affero General Public License,
// version 3 or (at your option) any later version (THIRD_PARTY_NOTICES.md).
// copied from canopi desktop/web/src/app/geocoding/transport.browser.ts at b039f14ee612c6090c91d44b9968357cbdd1d33e
// The website's geocoder fetch: place searches leave the page only through here (P5 S5b), on the
// reader's Enter, never while typing. The browser sends its default Referer (the site's origin).

import type { GeocodingTransport } from './registry.ts'

/** Web: browser `fetch`; the browser sends the page Referer that identifies the site. */
export const geocodingTransport: GeocodingTransport = async (url, signal) => {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) })
  if (!response.ok) throw new Error(`Geocoder returned HTTP ${response.status}`)
  const text = await response.text()
  return text.trim() ? JSON.parse(text) as unknown : undefined
}
