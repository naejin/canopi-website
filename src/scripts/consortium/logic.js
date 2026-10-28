// The consortium tool's pure rules about its own state (no DOM, no strings), so
// scripts/consortium-page.test.mjs can test them: what a share link lost, which gap rows stay,
// when the address bar may be rewritten, which data urls may be links, where a photo came from, how much of a list shows, what a
// place change leaves of a link's notices, when a click is the tail of a double click, the language
// links' query, the place a guide preset borrows from the saved consortium, and why a Northern American
// country is not covered.

// How many plants an old link named that the cell no longer has: the distinct ids of `p` (kept)
// and `a` (members) that matched no taxon or several. A kept plant is in both lists, so it counts
// once; removed plants (`x`) are not plants the link named.
export function droppedPlants(dropped) {
  const lost = dropped.filter((d) => (d.key === 'p' || d.key === 'a') && (d.reason === 'unknown' || d.reason === 'ambiguous'));
  return new Set(lost.map((d) => d.value)).size;
}

// The "a place is free since you removed …" rows once plants are added: each added plant takes
// the row of its own layer first; then rows beyond the places still free go, oldest first, so a
// row never claims a place that is not free.
export function trimGaps(gaps, addedStrata, free) {
  let out = [...gaps];
  for (const s of addedStrata) {
    const i = out.findIndex((g) => g.stratum === s);
    if (i >= 0) out.splice(i, 1);
  }
  while (out.length > Math.max(0, free)) out.shift();
  return out;
}

// The address bar and the saved consortium describe what is shown, so they are left alone on the
// loading and error screens: the link that led there stays whole for a reload (M2).
export const mayPersist = (state) => state.status !== 'loading' && state.status !== 'error' && state.status !== 'boot';

// A url from the data as a link target: an absolute http or https url, else null, so the page shows
// the text without a link (prepush m1: the installer refuses other schemes; this is the second wall).
export function safeHref(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try { return ['http:', 'https:'].includes(new URL(url).protocol) ? url : null; } catch { return null; }
}

// The site a photo's source page is on, by name, for its credit line: decided by the parsed url's
// host, and null for a url that is not http(s) (javascript://commons.wikimedia.org/… has that host too).
const HOSTS = [['commons.wikimedia.org', 'Wikimedia Commons'], ['wikimedia.org', 'Wikimedia Commons'], ['inaturalist.org', 'iNaturalist']];
export function photoSource(url) {
  if (!safeHref(url)) return null;
  const host = new URL(url).hostname.toLowerCase();
  const hit = HOSTS.find(([h]) => host === h || host.endsWith('.' + h));
  return hit ? hit[1] : host.replace(/^www\./, '');
}

// A long list shown in steps: the first `count` items, how many are left, and how many the next
// step of `step` reveals (the "Show # more" number, min-4).
export function shown(list, count, step = Infinity) {
  const more = Math.max(0, list.length - count);
  return { items: list.slice(0, count), more, next: Math.min(step, more) };
}

// The plant list a link carries (its `a`): the members of a result, an empty list for a consortium
// the user emptied, and none for a no-match, so a reload works the no-match out again (min-2).
export const linkMembers = (status, members) => (status === 'ready' ? members : null);

// A notice (guide plant pinned or left out, older link, restored list) speaks of the place the page
// opened on. When the user picks another place or climate it goes; only a link still waiting for its
// cell takes its guide plant on to the new place, and then the notice is worked out there (min-1).
export function afterMove({ pending }) {
  const plant = pending?.state?.plants?.[0] ?? null;
  return { notice: null, guidePlant: plant, guideId: null };
}

// The second click of a double click, or a click right after the last one, lands on whatever slid
// under the pointer: it is not a new request. Keyboard presses (detail 0) always count.
export function repeatClick(detail, now, last, ms = 500) {
  if (detail === 0) return false;
  return detail > 1 || (last != null && now - last < ms);
}

// The language menu's link to this page in another language, with the tool's query (the address
// bar's `search`), so a language switch keeps the plants, the place and a guide's preset (seam M1).
export const withQuery = (href, search) => href.split('?')[0] + (search && search !== '?' ? search : '');

// A guide preset names a plant and a climate but no place: the place saved on this device, if any,
// is reused, so a returning gardener goes straight to the result (seam m4). A link with its own
// place, or no guide plant, keeps what it says.
export function presetPlace(preset, saved) {
  if (!preset?.plants?.length || preset.region || preset.country || !saved?.region) return null;
  return { country: saved.country ?? null, region: saved.region };
}

// "Not covered yet" for a country of Northern America in a climate whose only list is Central and
// South America and the Caribbean (Tropical, in the beta): a reader in Yucatán reads "Central
// America" and expects Mexico in it, but the data's regions put Mexico in Northern America (N3).
export function coverageHint(manifest, climate, country) {
  const regions = country ? manifest.country_regions[country] ?? [] : [];
  if (!regions.includes('northern_america') || regions.includes('southern_america')) return null;
  const has = (r) => manifest.cells.some((c) => c.climate_zone.toLowerCase() === climate && c.region === r);
  return has('southern_america') && !has('northern_america') ? { region: 'southern_america', north: 'northern_america' } : null;
}

// The member a Swap replaces: the Swap list's own, and the same from a plant's details opened from
// that list, so those details offer "Use this instead" and never only Add (prepush m4). null for
// details opened from a plant row or from Add.
export function swapTarget(sheet) {
  if (sheet?.type === 'swap') return sheet.id;
  return sheet?.type === 'details' && sheet.back?.type === 'swap' ? sheet.back.id : null;
}

// "No match": the one looser answer a site question offers (part shade, "not sure", the next room
// size), or null when the answer is already that one, so a button never offers the current value
// (prepush L2).
const LOOSER = { light: () => 'part', soil: () => 'unsure', water: () => 'unsure', room: (v) => ({ small: 'large', large: 'field' })[v] ?? null };
export function relaxTo(key, site) {
  const to = LOOSER[key]?.(site[key]) ?? null;
  return to === site[key] ? null : to;
}

// A licence as the data writes it ("CC BY 3.0 us", "cc-by", "CC0", "Public domain"), as a proper
// name with the version and jurisdiction the data gives (never one it does not), and the URL of its
// deed when that is known: a Creative Commons licence with its version, or CC0 (there is one). A
// licence without a version ("cc-by", from iNaturalist) gets no deed: which one is not known.
// publicDomain: the page says "Public domain" in its own language. Other names are kept as given.
const CC0_DEED = 'https://creativecommons.org/publicdomain/zero/1.0/';
const CC_CODES = ['by', 'by-sa', 'by-nd', 'by-nc', 'by-nc-sa', 'by-nc-nd'], CC_VERSIONS = ['1.0', '2.0', '2.5', '3.0', '4.0'];
export function licenceOf(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  if (/^public[\s-]+domain$/i.test(text)) return { name: 'Public domain', url: null, publicDomain: true };
  const zero = /^cc[\s-]*0(?:[\s-]+(1\.0))?$/i.exec(text);
  if (zero) return { name: zero[1] ? `CC0 ${zero[1]}` : 'CC0', url: CC0_DEED, publicDomain: false };
  const m = /^cc[\s-]+(by(?:[\s-]+(?:nc|sa|nd)){0,2})(?:[\s-]+(\d\.\d))?(?:[\s-]+([a-z]{2}))?$/i.exec(text);
  if (!m) return { name: text, url: null, publicDomain: false };
  const code = m[1].toLowerCase().split(/[\s-]+/).join('-'), version = m[2] ?? null, place = m[3]?.toLowerCase() ?? null;
  // Only the six real licences, their real versions, and country ports (which ended with 4.0) get a name and a deed.
  const real = CC_CODES.includes(code) && (!version || CC_VERSIONS.includes(version)) && !(place && (!version || version === '4.0'));
  if (!real) return { name: text, url: null, publicDomain: false };
  const name = ['CC', code.toUpperCase(), version, place?.toUpperCase()].filter(Boolean).join(' ');
  return { name, url: version ? `https://creativecommons.org/licenses/${code}/${version}/${place ? place + '/' : ''}` : null, publicDomain: false };
}
