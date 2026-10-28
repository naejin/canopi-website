// The consortium tool's pure rules about its own state (no DOM, no strings), so
// scripts/consortium-page.test.mjs and consortium-country.test.mjs can test them: what a share link lost, which gap rows stay,
// when the address bar may be rewritten, which data urls may be links, where a photo came from, how much of a list shows, what a
// climate change leaves of a link's notices, when a click is the tail of a double click, the
// language links' query, where the country comes from at start and the browser's country guess.

// How many plants an old link named that the climate file no longer has: the distinct ids of `p` (kept)
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

// A notice (guide plant pinned or left out, older link, restored list) speaks of the climate the page
// opened on. When the user picks another climate it goes; only a link's guide plant goes on to the
// new climate, and then the notice is worked out there (min-1).
export function afterMove({ pending }) {
  const plant = pending?.state?.plants?.[0] ?? null;
  return { notice: null, guidePlant: plant, guideId: null, ...noLinkCode };
}

// A link's unknown country code goes with its notice (Dismiss, a climate change, Start over), so the
// reader's next address bar and share link never carry it (core-fix review 3, m-3).
export const noLinkCode = Object.freeze({ unknownCountry: null, linkCode: null });
// The country after Start over or a climate change: the consortium is now the reader's, so only a
// country they chose stays (m12). One that came from someone else's link ('link', or 'saved' from a
// save of one) goes: the reader's own choice (`pref`: tab, then device), else "No country" if they
// chose it, else the browser's guess, never put in a link (core-fix review 4, m-1). Never the
// link's unknown code (m-3). own: { pref, guess, known } as for pickCountry.
export function keptCountry({ country, countrySource, noCountry }, own) {
  if (countrySource === 'user') return { country, countrySource, noCountry };
  const { country: c, countrySource: src, noCountry: none } = pickCountry({ link: null, pref: own.pref, saved: null, guess: own.guess, known: own.known });
  return { country: c, countrySource: src, noCountry: none };
}

// The second click of a double click, or a click right after the last one, lands on whatever slid
// under the pointer: it is not a new request. Keyboard presses (detail 0) always count.
export function repeatClick(detail, now, last, ms = 500) {
  if (detail === 0) return false;
  return detail > 1 || (last != null && now - last < ms);
}

// The language menu's link to this page in another language, with the tool's query (the address
// bar's `search`), so a language switch keeps the plants, the climate and a guide's preset (seam M1).
export const withQuery = (href, search) => href.split('?')[0] + (search && search !== '?' ? search : '');

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

// The facts a card, a row, the Swap and Add lists and print name as "not checked yet": toxicity,
// invasive status, spreading and the plant's jobs (`jobsOther` when another source gives some).
// Allelopathy not checked yet is told in the plant's details only (owner, 2026-10-28); a known
// allelopathic plant still carries its warning wherever warnings show.
export function uncheckedOnCard(taxon, hasJobs) {
  const w = taxon.warnings, out = [];
  if (!w.toxicity) out.push('tox');
  if (w.invasive_in == null) out.push('inv');
  if (w.weed_potential == null) out.push('spreads');
  if (taxon.functions == null) out.push(hasJobs ? 'jobsOther' : 'jobs');
  return out;
}

// The country at start (M1, m12): a link's own k, else the reader's choice (`pref`: a code or '-' for
// "No country", written whenever they choose, in any status, and left alone by Start over:
// memory.js), else a saved consortium's (with the source it was saved with), else the browser's guess.
// A link's country the reader chose themselves reads "chosen by you" ('user'), so their own reload or
// language switch keeps that label; only someone else's reads 'link'. With storage blocked, a
// language switch opens a new page without the tab's choice, so it reads 'link' there (the safe
// direction: memory.js). A
// link's unknown code is said (unknownCountry) and the reader's own choice is used, never the guess
// (m-5). A link's k=- (links never carry it) is read as no k (n1). Under a link with no k (a guide
// preset), a saved country reads 'saved' (n2), "from your last consortium", never "chosen by you"
// (core-fix review 3, m-2). A stale code on the device is quiet.
// `known(code)`: the manifest lists the code (upper case).
export function pickCountry({ link, pref, saved, guess, known }) {
  const out = { country: null, countrySource: null, noCountry: false, unknownCountry: null };
  const up = (c) => (typeof c === 'string' ? c.toUpperCase() : null);
  const own = up(pref) === '-' ? '-' : known(up(pref)) ? up(pref) : null;
  const mine = own === '-' ? { countrySource: 'user', noCountry: true } : own ? { country: own, countrySource: 'user' } : {};
  if (link?.country) {
    const code = up(link.country);
    if (!known(code)) return { ...out, ...mine, unknownCountry: code };
    return { ...out, country: code, countrySource: own === code ? 'user' : 'link' };
  }
  if (own) return { ...out, ...mine };
  if (saved?.country && known(up(saved.country))) return { ...out, country: up(saved.country), countrySource: saved.source === 'link' && !link ? 'link' : 'saved' };
  if (saved?.noCountry) return { ...out, countrySource: 'user', noCountry: true };
  if (guess && known(up(guess))) return { ...out, country: up(guess), countrySource: 'guess' };
  return out;
}

// The country part of the state the address bar (saved = false) and the save (saved = true) hold. A
// guess is never written; "No country" only goes to the save; a link's unknown code (linkCode, kept
// until the reader chooses) goes back into the address bar while no country is in use, so a reload
// shows what the first view showed (m-5).
export function linkCountry(S, saved) {
  const country = S.countrySource === 'guess' ? null : S.country;
  return { country: country ?? (saved || S.noCountry ? null : S.linkCode ?? null), noCountry: saved && !S.country && S.noCountry };
}

// The query of a language link: the address bar's, and nothing else. It never carries the reader's
// own country as a marker: a copied language link would hand it to whoever opens it as their own
// choice (core-fix review 3, M-1). An old link's `mine` is dropped.
export function langSearch(search) {
  const q = new URLSearchParams(search);
  q.delete('mine');
  const s = q.toString();
  return s ? '?' + s : '';
}

// The country sheet's guess card is marked as chosen only when the reader chose that country, never
// while it is only the guess, someone else's link or a restored save (m-4; core-fix review 3, m-2).
export const chosenHere = ({ guess, country, source }) => !!guess && country === guess && source === 'user';

// A print row with no warning: "None found (all checked)" only when nothing about the plant is
// unchecked; allelopathy not checked yet, or a country GRIIS has no list for, gives "None found so far".
export function printNoneKey(taxon, { country, checked }) {
  return taxon.warnings.allelopathic == null || (country && !checked) ? 'printNoneYet' : 'printNone';
}

// The sources of a plant's invasive status: its records' own, and GRIIS (the export's one source of
// invasive status) for a plant recorded invasive nowhere, so "not recorded invasive" names it too
// (m-6). None when nobody checked the plant.
export function invasiveSourceIds(inv, sources) {
  if (inv == null) return [];
  const ids = [...new Set(inv.flatMap((x) => x.sources))];
  return ids.length ? ids : sources.griis ? ['griis'] : [];
}

// The browser's country, from `codes` (the manifest's): the time zone first (the one country whose
// zones include it; `zonesOf` defaults to the runtime's CLDR data, which Firefox lacks), then the
// region of the browser's languages. Bad input is skipped. Shown as a guess, never put in a link.
const cldrZones = (c) => { const l = new Intl.Locale('und-' + c); const z = l.getTimeZones?.() ?? l.timeZones; return Array.isArray(z) ? z : []; };
export function guessCountry(codes, { zone, languages = [], zonesOf = cldrZones } = {}) {
  const set = new Set(codes.map((c) => c.toUpperCase()));
  if (zone) {
    const hits = codes.filter((c) => { try { return zonesOf(c).includes(zone); } catch { return false; } });
    if (hits.length === 1) return hits[0].toUpperCase();
  }
  for (const l of languages) {
    try { const r = new Intl.Locale(l).maximize().region; if (r && set.has(r.toUpperCase())) return r.toUpperCase(); } catch {}
  }
  return null;
}
