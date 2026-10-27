// The consortium tool's pure rules about its own state (no DOM, no strings), so
// scripts/consortium-page.test.mjs can test them: what a share link lost, which gap rows stay,
// when the address bar may be rewritten, where a photo came from, and how much of a list shows.

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

// The site a photo's source page is on, by name, for its credit line.
const HOSTS = [['commons.wikimedia.org', 'Wikimedia Commons'], ['wikimedia.org', 'Wikimedia Commons'], ['inaturalist.org', 'iNaturalist']];
export function photoSource(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  const hit = HOSTS.find(([h]) => host === h || host.endsWith('.' + h));
  return hit ? hit[1] : host.replace(/^www\./, '');
}

// A long list shown in steps: the first `step` items, then `step` more each time.
export function shown(list, count) {
  return { items: list.slice(0, count), more: Math.max(0, list.length - count) };
}
