// The consortium page's one store (frozen seam, design check §6): every piece of state is a signal,
// and pool, verdicts and flags are computed from them, so views re-render by reading, with no hand
// render loop. Views read and set these signals; only the actions a stream adds write several at once.
// Renaming or removing a signal is a seam change for the coordinator; streams may add actions and,
// inside the computed bodies, the core calls they own (flags: S1 conflicts and site).
import { batch, computed, effect, signal, untracked } from '@preact/signals';
import type { Alternative, ClimateZone, Hole, HoleChange, LaneCount, Line, PaletteGoals, PhaseOrd, Flag, FlagContext, Interaction, PlantId, Scenario, Site, SiteEdits, SiteInputs, SiteLocation, SiteLookup as CoreLookup, SuggestRule, Taxon, TextureId as CoreTexture, ThinChange } from '../../lib/palette/index.ts';
import { asGuest, countryStatus, DEFAULT_SCENARIO, fills, flagsFor, flagsOf, hasClimate, holeChange, holeChangeLines, holes, laneCounts, loadSuggest, NO_EDITS, paletteGoalsOf, paletteSizeLine, plantsPerJobOf, removedManyLine, secondLook, siteEditsOf, siteInputsOf, siteOf, SIZE_LIMIT, snapOrigin, thinChange, thinTargets, zoneOf } from '../../lib/palette/index.ts';
import { needsSite } from './rules/suggest-block.ts';
import type { SiteLookup as ReaderLookup } from '../../lib/climate/index.ts';
import type { TextureId as ReaderTexture } from '../../lib/climate/soil.ts';
import type { LoadFailure, PlantSource } from '../../lib/palette/source.ts';
import { P, T, nameOf } from './strings.ts';
import { sayAll } from './words.ts';
import { state } from './state/schema.ts';
import { focusAfterToast, noteToastOpener } from './focus.ts';

export type CountrySource = 'chosen' | 'link' | 'guess' | 'location';
export interface Country { code: string | null; source: CountrySource | null }
export type View = 'start' | 'matrix';
export type Step = 'place' | 'palette';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface Load { status: LoadStatus; error: LoadFailure | null }

// ---- state ----
// The consortium's fields are declared once in state/schema.ts (what each is, whether Undo, the save
// and the link hold it, who watches it); their signals are re-exported here under their names.
// climate, country; the place (PP-B commit 0, plant-palette-architecture 3.6): room, plot (m²) and the
// period shown; the plant lists members (in the order added; a new suggestion is built
// around them), removed (taken out: a new suggestion leaves them out) and guests (from another
// climate's list, A9); the view; the stage print draws (unsaved, until PP-B18).
// siteEdits, plantsPerJob (v14 pf commit 0W): the grower's own values and the palette's goal, saved;
// suggestedIds: the plants the last "Suggest plants" placed, until any plant or goal change.
export const { climate, country, room, plot, period, members, removed, guests, siteEdits, plantsPerJob, suggestedIds, view, stage } = state.signals;
export const step = computed<Step>(() => (view.value === 'start' ? 'place' : 'palette'));
// The time step Through the years shows (PhaseOrd; unsaved, not in Undo): the phone's stepper and
// print's side drawing read it (PP-B18; replaces the deprecated `stage`). Opens on years 1-3.
export const yearStep = signal<PhaseOrd>(2);
// The page's shell states (architecture 9): the database still loading after 5 s (main.ts sets it
// from data/load.ts's slow callback), and a return visit restoring (main.ts; App shows the palette
// placeholder, never the Place form, P2).
export const slow = signal(false);
// The database's bytes received and its size while it loads (M28: board Loading "0.8 of 1.4 MB"), in
// tenths of a MB steps, so the line changes at most once per step; null before the first byte.
export const loadProgress = signal<{ got: number; total: number } | null>(null);
export const opening = signal(false);
// The holes put off with "Not now" (this page only, never saved).
export const notNow = signal<ReadonlySet<string>>(new Set());
export const load = signal<Load>({ status: 'idle', error: null });
// P5 (commit 0 seam): where the site is. S5b writes it (device location, place search, map pick, a
// link's `o=`); S5c (range check, nearest lists), S5d (future check) and S5e (native here, soil
// likely) read it. null: no location given, the manual climate choice as before.
export const location = signal<SiteLocation | null>(null);
// The future check's scenario (S5d may expose a control); SSP2-4.5 by default (owner row).
export const scenario = signal<Scenario>(DEFAULT_SCENARIO);
// The climate reader's lookup (src/lib/climate) must stay assignable to the core's view of it, and
// the core's texture classes equal the reader's (types.ts textureIds; plant-palette-architecture 3.1).
const readerFitsCore = (l: ReaderLookup): CoreLookup => l;
void readerFitsCore;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const texturesAgree: Same<CoreTexture, ReaderTexture> = true;
void texturesAgree;

// The site inputs (core site-inputs.ts, owner 2026-11-18): every site input the engine reads, merged
// from the location's lookup (the climate grid, the soil map) and the grower's edits, with the room.
// The one place the store hands site data to the rules: verdictContext, the flags and the views read
// this, never the lookup or a stored answer. siteEdits (a field of state/schema.ts): the grower's edits
// (shifts, a soil test, answers), written by the figures panel (pf-d) through setSiteEdits below,
// saved in the save's private place and in a link only with "Include my place".
export const siteInputs = computed<SiteInputs>(() => siteInputsOf({ lookup: location.value?.lookup ?? null, room: room.value, edits: siteEdits.value }));
// site.ts fits()'s Site, from the inputs (core place.ts siteOf): the flags, print's basis line and the
// site-fit words read it.
export const site = computed<Site>(() => siteOf(siteInputs.value));
// The size of the starting palette Suggest places for this room (site.ts SIZE_LIMIT; the Empty card says it).
export const suggestionSize = computed(() => SIZE_LIMIT[room.value]);

// ---- data (set once the database is open; S1's load fills them) ----
export const source = signal<PlantSource | null>(null);
// The known countries (code → whether GRIIS checked it): the page's list (#ct-data `countries`, set by
// main.ts before the first render) until the database is open, then the database's (the same export).
// So the guessed country and its "not checked" note are final in the first frame (N2 layout shift).
type Countries = ReadonlyMap<string, { invasiveChecked: boolean }>;
const pageCountries = signal<Countries>(new Map());
// zones: each country's time zones (space-separated), worked out at build time from the same CLDR data
// the browser has (PalettePage.astro), so the country guess reads them instead of asking the
// browser for every country's (about 0.5 s of main thread; Firefox has none: state/arrival.ts).
let pageZones: Record<string, string> = {};
export const zonesOfCountry = (c: string): string[] | null => (pageZones[c] ? pageZones[c].split(' ') : null);
export function setPageCountries(c?: { checked: string; unchecked: string; zones?: Record<string, string> }): void {
  const m = new Map<string, { invasiveChecked: boolean }>();
  if (c) for (const k of ['checked', 'unchecked'] as const) for (const x of c[k].split(' ')) if (x) m.set(x, { invasiveChecked: k < 'u' });
  pageCountries.value = m;
  pageZones = c?.zones ?? {};
}
export const knownCountries = computed<Countries>(() => source.value?.countries() ?? pageCountries.value);
// The climates with plants of their own (the export's curated climates; E6 hand-off E: their one
// owner): the open database's list, else the one the page names (main.ts setPageClimates; site ids),
// so Start can show its cards before the database opens. The loader refuses a database whose list
// differs from the page's (data/load.ts), so the two never disagree once both are here. Start's pill
// and Suggest (views/PoolSlot.tsx), the pool panel, Add, Paste, the mark providers and suggestMembers
// all read this.
const pageClimates = signal<ClimateZone[]>([]);
export function setPageClimates(ids: readonly string[]): void {
  pageClimates.value = ids.flatMap((c) => zoneOf(c) ?? []);
}
export const curatedClimates = computed<ClimateZone[]>(() => source.value?.info().climates ?? pageClimates.value);
// Each climate's plants as PlantSource.pool returned them, cached by climate once read.
export const pools = signal<Partial<Record<ClimateZone, Taxon[]>>>({});
// Each climate's interactions (PlantSource.interactions), read with its pool (S1).
// The guest climates whose list could not be read (PP-B21; read again with Retry, setSource).
export const failedPools = signal<ClimateZone[]>([]);
// The other lists (neither the chosen climate's nor a guest's: Find's rows from other lists, Paste's
// plants of another list) whose read failed (pf hand-off): said where they were asked for, with Try
// again (loadPool asks again and takes the list off here while it reads); never the tool's failure
// screen, never the palette's missing-list notice.
export const failedOther = signal<ClimateZone[]>([]);
export const interactionSets = signal<Partial<Record<ClimateZone, Interaction[]>>>({});

// ---- computed ----
export const pool = computed<Taxon[] | null>(() => {
  const c = climate.value;
  return c ? pools.value[c] ?? null : null;
});
export const suggestRule = signal<SuggestRule | null>(null);
export const suggestFailed = signal(false);
let suggestLoad: Promise<void> | null = null;
export function wantSuggest(): void {
  if (suggestRule.peek() || suggestLoad) return;
  suggestFailed.value = false;
  suggestLoad = loadSuggest().then((r) => { suggestRule.value = r; }, (err: unknown) => {
    suggestLoad = null;
    console.error(`Consortium: the suggestion did not load: ${(err as Error).message}`);
    suggestFailed.value = true;
  });
}
export const siteClimate = computed(() => hasClimate(siteInputs.value));

// Full deduplicated plant catalog across ALL loaded curated climates (never restricted to one climate label).
// Prefers the user's current climate placement when a species appears in multiple lists, and tags
// cross-climate species with their home climate via asGuest so addMembers/details/verdicts stay seamless.
export const allCatalog = computed<Taxon[]>(() => {
  const byId = new Map<PlantId, Taxon>();
  const c = climate.value;
  const map = pools.value;
  if (c && map[c]) {
    for (const t of map[c]!) byId.set(t.id, t);
  }
  const order: ClimateZone[] = [...curatedClimates.value];
  for (const k of Object.keys(map) as ClimateZone[]) {
    if (!order.includes(k)) order.push(k);
  }
  for (const z of order) {
    if (z === c) continue;
    const list = map[z];
    if (!list) continue;
    for (const t of list) {
      if (!byId.has(t.id)) byId.set(t.id, asGuest(t, z));
    }
  }
  return [...byId.values()];
});

// Loads every curated climate pool into `pools` so full-DB search and cross-climate recommendations
// see the entire SQLite catalog (~761+ species).
export async function loadAllPools(): Promise<void> {
  const src = source.peek();
  if (!src) return;
  await Promise.all(src.info().climates.map((z) => loadPool(z)));
}

export const offerPool = computed<Taxon[] | null>(() => {
  const p = pool.value, z = climate.value;
  if (!p || !z) return p;
  const scene = { curated: curatedClimates.value, siteClimate: siteClimate.value, rangeFailed: false, nothingFits: false };
  return needsSite(z, scene) ? [] : p;
});

// Whether the browser is offline (navigator.onLine and its events, wired in start(); App shows the line).
export const offline = signal(false);

// The guests as plants: each with its home climate's placement and a guest origin (A9; ADR-6
// asGuest), once that climate's pool is read.
export const guestTaxa = computed<Taxon[]>(() => {
  const out: Taxon[] = [];
  // A guest the chosen climate's own list also holds is drawn from that list (memberTaxa), so it is not
  // counted twice (a plant kept when the climate changed: state/draft.ts chooseClimate).
  const own = new Set((pool.value ?? []).map((t) => t.id));
  for (const [id, from] of Object.entries(guests.value)) {
    const t = from && !own.has(id) ? pools.value[from]?.find((x) => x.id === id) : undefined;
    if (t && from) out.push(asGuest(t, from));
  }
  return out;
});
// The guest climates whose plant list is not read yet: while any is, guests from it are missing from
// memberTaxa and the flags, and "Suggest plants" waits (suggestMembers returns false).
export const guestsPending = computed<ClimateZone[]>(() => {
  const out: ClimateZone[] = [];
  for (const from of Object.values(guests.value)) if (from && !pools.value[from] && !failedPools.value.includes(from) && !out.includes(from)) out.push(from);
  return out;
});
// Members memberTaxa leaves out, never silently: `loading` while their list is read (a guest climate
// in guestsPending, or the chosen climate's pool), `unlisted` once read and not in it; a guest whose list failed is in failedMembers.
export const missingMembers = computed<{ loading: PlantId[]; unlisted: PlantId[] }>(() => {
  const own = pool.value, loading: PlantId[] = [], unlisted: PlantId[] = [];
  const found = new Set(memberTaxa.value.map((t) => t.id));
  for (const id of members.value) {
    if (found.has(id)) continue;
    const from = guests.value[id];
    if (from && failedPools.value.includes(from)) continue;
    if (!own || (from && !pools.value[from])) loading.push(id);
    else unlisted.push(id);
  }
  return { loading, unlisted };
});
// Members whose guest list could not be read (failedPools): missing, not checked (PP-B21; additive).
export const failedMembers = computed<PlantId[]>(() => members.value.filter((id) => { const from = guests.value[id]; return !!from && failedPools.value.includes(from); }));
// The members as plants, in order: the climate's own, or a guest's home record. Ids not at hand are
// left out here and listed in missingMembers (b2's palette page says so, PP-B21).
export const memberTaxa = computed<Taxon[]>(() => {
  const own = pool.value;
  if (!own) return [];
  const byId = new Map<PlantId, Taxon>(own.map((t) => [t.id, t]));
  for (const g of guestTaxa.value) if (!byId.has(g.id)) byId.set(g.id, g);
  return members.value.flatMap((id) => byId.get(id) ?? []);
});
// What the flags read: the site, the climate's interactions and the chosen country with its
// countryStatus ('none', 'checked' or 'unchecked': no country is not "not checked").
export const flagContext = computed<FlagContext>(() => {
  const code = country.value.code;
  return {
    site: site.value,
    interactions: (climate.value && interactionSets.value[climate.value]) || [],
    country: code,
    countryStatus: countryStatus(code, knownCountries.value),
  };
});
// The plants that could take a member's place (core suggest.ts alternatives through the suggestion's
// chunk, store.suggestRule): those in range for the page period, then apart those outside it, ranked
// on the page period's verdicts as Suggest reads them (b1br-5). null until the chunk and the list are
// here. Swap lists them; Details shows the first ones inline ("What you can do", board DetailsDesk).
export function alternativesFor(id: PlantId): { fit: Alternative[]; outside: Alternative[] } | null {
  const algo = suggestRule.value, offer = offerPool.value;
  if (!algo || !offer) return null;
  const opts = { ...flagContext.value, removed: removed.value, verdicts: null };
  return { fit: algo.alternatives(id, memberTaxa.value, offer, opts), outside: [] };
}
// The warnings on members: conflicts, site misfits, invasive and toxicity (core conflicts.ts flagsOf).
export const flags = computed<Flag[]>(() => {
  if (!pool.value) return [];
  return flagsOf(memberTaxa.value, flagContext.value);
});

// The flags a plant carries (Add, Swap, Paste, Details): a member's from the flags above, any other
// plant's beside the members.
export function flagsOfPlant(t: Taxon): Flag[] {
  if (members.value.includes(t.id)) return flags.value.filter((f) => f.id === t.id);
  return flagsFor(t, memberTaxa.value, flagContext.value);
}
// Whether a plant needs a second look (pf hand-off, owner answer Q2 2026-11-17): the one rule of the
// Next step, Find and every add, over its flags (core conflicts.ts secondLook: a site misfit, a serious
// conflict, recorded as invasive in the chosen country, toxic). No country chosen raises no invasive
// flag, so it is no second look: invasiveCountries gives the soft count instead.
export const warnedPlant = (t: Taxon): boolean => secondLook(flagsOfPlant(t));
// The soft chip "Recorded invasive in N countries" (board Country; consortium.palette.invasiveCountries):
// the countries a plant is recorded invasive in while no country is chosen, else 0 (the chosen country's
// record is a flag, worded by flagLines).
export function invasiveCountries(t: Taxon): number {
  if (flagContext.value.countryStatus !== 'none') return 0;
  return new Set((t.warnings.invasive_in ?? []).map((r) => r.country)).size;
}

// ---- holes (pf hand-off; plant-palette-architecture 3.3) ----
// The palette's holes for the page period (core holes.ts), computed once per member, verdict or list
// change, so the palette page (pictures, Next step) and Find (best first, "fills N holes", "lacks N")
// read one list. Pending while a member's list is read or could not be read: every hole is 'pending'
// then, never a false hole (its plants may fill one, PP-B21).
// Whether a member's list is still being read: the counts and figures (the Jobs rows, Through the
// years' counts, Things to weigh) wait, whatever has failed, so no partial count shows (F26; c4 R1).
export const listsLoading = computed(() => guestsPending.value.length > 0 || missingMembers.value.loading.length > 0);
// The members' lists in one state for the holes answer (c4 T3: the Next step and the Jobs intro):
// 'failed' while a guest list could not be read (first: its plants stay not checked whatever else
// loads, so the wording gives one answer), 'loading' while a list is read, else 'ready'. Counts read
// listsLoading instead.
export type ListsState = 'ready' | 'loading' | 'failed';
export const listsState = computed<ListsState>(() => (failedMembers.value.length ? 'failed'
  : listsLoading.value ? 'loading' : 'ready'));
export const holesPending = computed(() => listsState.value !== 'ready');
export const paletteHoles = computed<Hole[]>(() => holes({ members: memberTaxa.value, verdicts: null, pending: holesPending.value }));
export const openHoles = computed<Hole[]>(() => paletteHoles.value.filter((h) => h.state === 'open'));
export const paletteGoals = computed<PaletteGoals>(() => paletteGoalsOf({ plantsPerJob: plantsPerJob.value }));
export const lanes = computed<LaneCount[]>(() => laneCounts({ members: memberTaxa.value, verdicts: null, pending: holesPending.value }, paletteGoals.value));
export const thinSpots = computed<Hole[]>(() => thinTargets(lanes.value, holesPending.value));
export function setPlantsPerJob(n: number): void {
  batch(() => { plantsPerJob.value = plantsPerJobOf(n); suggestedIds.value = []; });
}
export const untouchedSuggestion = computed(() => {
  const s = suggestedIds.value, m = members.value;
  return s.length > 0 && s.length === m.length && s.every((id) => m.includes(id));
});

export function holeFillCount(t: Taxon): number {
  let n = 0;
  for (const h of openHoles.value) if (fills(h, t)) n++;
  return n;
}

// ---- actions (S1) ----

const reading = new Map<ClimateZone, Promise<Taxon[] | null>>();
export function loadPool(c: ClimateZone): Promise<Taxon[] | null> {
  const src = source.peek();
  if (!src) return Promise.resolve(null);
  const have = pools.peek()[c];
  if (have) return Promise.resolve(have);
  let p = reading.get(c);
  if (!p) {
    if (failedOther.peek().includes(c)) failedOther.value = failedOther.peek().filter((x) => x !== c);
    p = Promise.all([src.pool(c), src.interactions(c)]).then(([plants, rows]) => {
      if (source.peek() !== src) return null;
      batch(() => {
        pools.value = { ...pools.peek(), [c]: plants };
        interactionSets.value = { ...interactionSets.peek(), [c]: rows };
        if (failedPools.peek().includes(c)) failedPools.value = failedPools.peek().filter((x) => x !== c);
      });
      return plants;
    }).catch((err: unknown) => {
      if (source.peek() !== src) return null;
      reading.delete(c);
      console.error(`Consortium data ${src.info().releaseId}: ${c}: ${(err as Error).message}`);
      if (c === climate.peek()) load.value = { status: 'failed', error: 'damaged' };
      else if (Object.values(guests.peek()).includes(c)) failedPools.value = [...failedPools.peek().filter((x) => x !== c), c];
      else failedOther.value = [...failedOther.peek().filter((x) => x !== c), c];
      return null;
    });
    reading.set(c, p);
  }
  return p;
}
// The palette's missing-list notice's "Try again" (board: PFA10, E6): each guest list that failed is read
// again; one that answers leaves failedPools, so its notice and "not checked" go. The read is local
// (the opened database), so a list that fails again is damage a re-read cannot mend (h2 R8): the
// notice then offers Reload, which fetches the database again. listRetry: 'busy' while it re-reads,
// 'failed' once a retry failed again (until a list read clears failedPools).
export const listRetry = signal<'idle' | 'busy' | 'failed'>('idle');
export async function retryFailedLists(): Promise<void> {
  if (listRetry.peek() === 'busy') return;
  listRetry.value = 'busy';
  await Promise.all(failedPools.peek().map((c) => loadPool(c)));
  listRetry.value = failedPools.peek().length ? 'failed' : 'idle';
}

// Sets the open database's PlantSource, closing the one before it first (Retry opens a new
// database; the old one is never left open). null closes the current one and leaves none.
let closeCurrent: (() => void) | null = null;
export function setSource(next: PlantSource | null, close: (() => void) | null = null): void {
  const prev = closeCurrent;
  closeCurrent = null;
  source.value = null;
  reading.clear();
  failedPools.value = [];
  failedOther.value = [];
  try { prev?.(); } catch (err) { console.error(`Consortium data: closing the previous database: ${(err as Error).message}`); }
  source.value = next;
  closeCurrent = next ? close : null;
  // The suggestion's chunk, once a database is open (main.ts sets the source as the data turns ready;
  // nothing lazy before it, L5).
  if (next) wantSuggest();
}

// Keeps the chosen climate's pool and every guest list's pool read as soon as the database is open,
// so Start works while the plant list loads. Re-runs only when the source, the climate or the guests
// change (never on a pool arriving, so a failed read is not retried in a loop); a failed list no guest
// comes from leaves failedPools here. Returns the disposer.
export function watchPools(): () => void {
  return effect(() => {
    if (!source.value) return;
    const c = climate.value;
    const used = new Set(Object.values(guests.value));
    // A failed guest list no member comes from any more (its last plant removed or swapped) is no
    // longer missing: off failedPools, so its notice and "not checked" go, and read afresh if a plant
    // of it comes back (Undo; review r2 empty-2).
    const failed = failedPools.peek(), gone = failed.filter((z) => !used.has(z));
    if (gone.length) { for (const z of gone) reading.delete(z); failedPools.value = failed.filter((z) => used.has(z)); }
    if (c) void loadPool(c);
    for (const from of used) if (from) void loadPool(from);
  });
}

export function suggestMembers(note: { text: string; action: ToastAction | null } | null = null): boolean {
  const p = pool.value;
  if (!p || guestsPending.value.length) return false;
  const seed = members.value;
  const scene = { curated: curatedClimates.peek(), siteClimate: siteClimate.value, rangeFailed: false, nothingFits: false };
  if (needsSite(climate.value!, scene)) return false;
  const algo = suggestRule.value;
  if (!algo) return false;
  const s = algo.suggest(p, { ...flagContext.value, seed, removed: removed.value, guests: guestTaxa.value, verdicts: null });
  const before = snapshot();
  batch(() => {
    members.value = s.members;
    suggestedIds.value = [...s.members];
  });
  offerUndo(note ? `${P('place.suggested', s.members.length)} ${note.text}` : P('place.suggested', s.members.length), before, note?.action ?? null);
  return true;
}

// ---- browser history (step between Your place and Your palette) ----
type Entry = 'palette';
const ppOf = (s: unknown): Entry[] => {
  const pp = (s as { pp?: unknown } | null)?.pp;
  return Array.isArray(pp) ? pp.filter((k): k is Entry => k === 'palette') : [];
};
const stOf = (s: unknown): string | null => {
  const v = (s as { st?: unknown } | null)?.st;
  return typeof v === 'string' && v ? v : null;
};
const newStart = (): string => Math.random().toString(36).slice(2, 10);
let shown: Entry[] = [];
let st = '';
export const startId = (): string => st;
function pushEntry(kind: Entry): boolean {
  const pp = [...shown, kind];
  try { history.pushState({ ...(history.state ?? {}), pp, ...(st ? { st } : {}) }, '', globalThis.location.href); } catch { return false; }
  shown = pp;
  return true;
}
let leaving: Entry | null = null;
export function leaveEntry(kind: Entry): boolean {
  const i = shown.lastIndexOf(kind);
  if (i < 0) return false;
  try { history.go(i - shown.length); leaving = kind; return true; } catch { return false; }
}
export function historyMoved(state: unknown): { place: boolean; force: boolean; away: boolean } {
  const asked = leaving, was = shown, now = ppOf(state), landed = stOf(state);
  const away = landed !== null ? landed !== st : typeof (state as { ct?: unknown } | null)?.ct === 'string';
  leaving = null;
  shown = now;
  if (landed) st = landed;
  if (away) return { place: false, force: false, away };
  const place = !paletteWaits && was.includes('palette') && !now.includes('palette') && step.peek() === 'palette';
  return { place, force: !(asked === 'palette' && step.peek() === 'place'), away };
}
let paletteWaits = false;
export function pushWaiting(): void {
  if (paletteWaits && step.peek() === 'palette' && !shown.includes('palette')) pushEntry('palette');
  paletteWaits = false;
}
export function forgetEntries(): void { shown = []; leaving = null; paletteWaits = false; st = newStart(); }
export function adoptEntry(state: unknown): void { shown = ppOf(state); st = stOf(state) ?? newStart(); leaving = null; paletteWaits = false; }
let arrivalStep = false;
export function arrivalOpensPalette(on: boolean): void { arrivalStep = on; }
export function endOpening(): void { opening.value = false; arrivalStep = false; }
export function watchSteps(): () => void {
  try { shown = ppOf(history.state); st = stOf(history.state) ?? newStart(); } catch { /* no history */ }
  let was = step.peek();
  return effect(() => {
    const now = step.value;
    if (was === 'place' && now === 'palette') {
      if (arrivalStep) arrivalStep = false;
      else if (leaving) paletteWaits = true;
      else untracked(() => pushEntry('palette'));
    } else if (was === 'palette' && now === 'place') {
      paletteWaits = false;
      if (!leaving) untracked(() => leaveEntry('palette'));
    }
    was = now;
  });
}

// ---- the toast (one short line under the tool, with Undo when the change can be taken back) ----

// keep: the action leaves the toast up (a summary's Retry keeps its Undo, v14 F6). name: its accessible
// name when the word alone does not say what it does, starting with the word (WCAG 2.4.6, 2.5.3).
export interface ToastAction { label: string; run: () => void; keep?: boolean; name?: string }
export type ToastWhere = 'page' | 'sheet';
// focus: the plants Undo brings back; the first one's control takes the focus after Undo (W4), in
// `from`, the region of the control that raised the toast, when it is still there (focus.ts focusPlant).
export interface ToastLine { id: number; text: string; undo: (() => void) | null; action: ToastAction | null; where: ToastWhere; focus: PlantId[]; from: Element | null }
export const toast = signal<ToastLine | null>(null);
const TOAST_MS = 12_000; // long enough to reach Undo with a keyboard or a screen reader
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastHeld = false;
let toastSeq = 1;
export function showToast(text: string, undo: (() => void) | null = null, action: ToastAction | null = null, focus: PlantId[] = []): void {
  const from = noteToastOpener();
  const line: ToastLine = { id: toastSeq++, text, undo, action, where: 'page', focus, from };
  toast.value = line;
  armToast(line.id);
}
function armToast(id: number): void {
  if (toastTimer) clearTimeout(toastTimer);
  // The browser-test build lets a test shorten it (window.__ctTimeouts.toast), as data/load.ts's stall.
  const ms = typeof __CT_TEST_HOOK__ !== 'undefined' && __CT_TEST_HOOK__ ? Number((globalThis as { __ctTimeouts?: { toast?: number } }).__ctTimeouts?.toast) || TOAST_MS : TOAST_MS;
  toastTimer = setTimeout(() => { if (toast.peek()?.id === id) { focusAfterToast(); toast.value = null; } }, ms);
}
// The toast waits while the pointer is on it or the focus is in it, and runs its full time again
// after (architecture 9; PP-B17).
export function holdToast(held: boolean): void {
  const line = toast.peek();
  if (!line) return;
  toastHeld = held;
  if (held) { if (toastTimer) clearTimeout(toastTimer); toastTimer = null; } else armToast(line.id);
}
// A later text on the same toast (v14 0W, chk #2): the change summary arrives after "Counting…", or
// the checks fail with Retry; its Undo and its place stay, and it runs its full time again (unless the
// pointer or the focus holds it). false: that toast is gone (replaced, dismissed, timed out).
export function updateToast(id: number, text: string, action: ToastAction | null = null): boolean {
  const line = toast.peek();
  if (!line || line.id !== id) return false;
  toast.value = { ...line, text, action };
  if (!toastHeld) armToast(id);
  return true;
}
// Every path that takes the toast away (Dismiss, Undo, its action, the timer above) tells focus.ts
// first, while the toast is still on the page (F1a commit 0 seam, A25; stream 6 implements it).
export function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  toastHeld = false;
  focusAfterToast();
  toast.value = null;
}

// ---- edits (Remove, Swap, Add), each undoable ----

// A plant as the consortium has it (a member; a guest with its recorded list's placement), else the
// climate's list, else another climate's list already read (a guest of it). The climate's own list read (pools) counts as
// its own even while store.pool waits for the range rule: such a plant is never a guest (review 4).
export function taxonOf(id: PlantId): Taxon | null {
  const m = memberTaxa.value.find((t) => t.id === id);
  if (m) return m;
  // A guest from the list it was added from (guests[id]), never the first other list holding it.
  const g = guestTaxa.value.find((t) => t.id === id);
  if (g) return g;
  const c = climate.value;
  const own = c ? pools.value[c]?.find((t) => t.id === id) : undefined;
  if (own) return own;
  for (const [zone, list] of Object.entries(pools.value)) {
    const t = zone === c ? undefined : list?.find((x) => x.id === id);
    if (t) return asGuest(t, zone as ClimateZone);
  }
  return null;
}
const nameById = (id: PlantId) => { const t = taxonOf(id); return t ? nameOf(t) : id; };

// Undo's snapshot: the fields state/schema.ts marks `undo`.
export const snapshot = () => state.snapshot();
type Snapshot = ReturnType<typeof snapshot>;
const without = (list: PlantId[], ids: PlantId[]) => list.filter((x) => !ids.includes(x));

// Undo puts back the snapshot taken before the action, so it is offered only while nothing else has
// changed the consortium (another edit, a new suggestion, another climate): any change hides the toast.
// The fields whose change ends the offer (endsUndo or plants in state/schema.ts): the plant lists and
// the climate.
const SNAP_KEYS = state.lists.endsUndo;
let undoAfter: ReturnType<typeof state.peek<(typeof SNAP_KEYS)[number]>> | null = null;
// (Place's moves, in state/draft.ts, and suggestMembers offer their Undo through it too.)
export function offerUndo(text: string, before: Snapshot, action: ToastAction | null = null, focus: PlantId[] = []): void {
  undoAfter = state.peek(SNAP_KEYS);
  showToast(text, () => { undoAfter = null; state.restore(before); }, action, focus);
}
// (The effect that ends the offer starts in start(), at the end of this file.)

// Remove (details, the plant list): its cells are free again (the gap stays), it is left out of a new
// suggestion, and Undo brings back the consortium as it was.
export function removeMember(id: PlantId): void {
  const before = snapshot(), name = nameById(id);
  batch(() => {
    suggestedIds.value = [];
    members.value = without(before.members, [id]);
    removed.value = [...without(before.removed, [id]), id];
    if (before.guests[id]) { const g = { ...before.guests }; delete g[id]; guests.value = g; }
  });
  offerUndo(T('details.removed', { name }), before, null, [id]);
}
// Find's row "Undo" right after an add (M22): the plant only goes back out. It is not left out of the
// next suggestion (no `removed`), its guest home goes, and the toast says the add was taken back, with
// its own Undo (the plant added again).
export function takeBackAdd(id: PlantId): void {
  const before = snapshot();
  if (!before.members.includes(id)) return;
  batch(() => {
    suggestedIds.value = [];
    members.value = without(before.members, [id]);
    if (before.guests[id]) { const g = { ...before.guests }; delete g[id]; guests.value = g; }
  });
  offerUndo(T('find.tookBack', { name: nameById(id) }), before, null, [id]);
}
// Swap: the new plant takes the old one's place in the order; the old one is left out of a new
// suggestion.
export function swapMember(oldId: PlantId, newId: PlantId): void {
  const before = snapshot(), a = nameById(oldId), b = nameById(newId);
  batch(() => {
    suggestedIds.value = [];
    members.value = before.members.map((x) => (x === oldId ? newId : x)).filter((x, i, all) => all.indexOf(x) === i);
    removed.value = [...without(before.removed, [newId, oldId]), oldId];
    if (before.guests[oldId]) { const g = { ...before.guests }; delete g[oldId]; guests.value = g; }
  });
  offerUndo(T('swapped', { a, b }), before, null, [oldId]);
}
export interface AddResult { added: PlantId[]; size: number; holeChange: HoleChange; thinChange: ThinChange }
export function addMembers(ids: PlantId[], from: Partial<Record<PlantId, ClimateZone>> = {}, { warned = [], text: said }: { warned?: PlantId[]; text?: string | ((r: AddResult) => string) } = {}): void {
  const before = snapshot();
  const fresh = ids.filter((id, i) => ids.indexOf(id) === i && !before.members.includes(id));
  if (!fresh.length) return;
  const was = typeof said === 'function' ? { holes: paletteHoles.peek(), thins: thinSpots.peek() } : null;
  batch(() => {
    suggestedIds.value = [];
    members.value = [...before.members, ...fresh];
    removed.value = without(before.removed, fresh);
    // The guests change only when a guest joins (a new object would rebuild every guest's record).
    // (On Place the grower stays there, each plant listed under "What grows there already": b1a review
    // r1 conformance-2; "Show my palette" opens the palette.)
    // Auto-resolve home climate for cross-climate plants added from full-DB search/recommendations
    // so memberTaxa, details, verdicts, and persistence work seamlessly without callers passing `from`.
    const c = climate.peek();
    const ownIds = new Set((c ? pools.peek()[c] : undefined)?.map((x) => x.id) ?? []);
    const resolvedFrom: Partial<Record<PlantId, ClimateZone>> = { ...from };
    for (const id of fresh) {
      if (!resolvedFrom[id] && !ownIds.has(id) && !before.guests[id]) {
        for (const [z, list] of Object.entries(pools.peek())) {
          if (z !== c && list?.some((x) => x.id === id)) {
            resolvedFrom[id] = z as ClimateZone;
            break;
          }
        }
      }
    }
    if (fresh.some((id) => resolvedFrom[id])) {
      const g = { ...before.guests };
      for (const id of fresh) if (resolvedFrom[id]) g[id] = resolvedFrom[id];
      guests.value = g;
    }
  });
  const text = typeof said === 'function' && was
    ? said({ added: fresh, size: members.peek().length, holeChange: holeChange(was.holes, paletteHoles.peek()), thinChange: thinChange(was.thins, thinSpots.peek()) })
    : typeof said === 'string' ? said : P('paste.added', fresh.length);
  void warned;
  offerUndo(text, before, null);
}

// Several plants removed at once (v14 0W-1 item 6; pf-e's ticks): one snapshot and one Undo, which puts
// them back in their order; the toast says how many, the palette after it and what it did to the holes
// and the thin spots ("3 plants removed. 197 plants. No new hole. Feeds the soil: now only 1 plant in
// years 25 to 60."; M44: the new thin spots only, not every one still thin). Ids not in the palette
// are left out; none: nothing.
export function removeMembers(ids: readonly PlantId[]): void {
  const before = snapshot();
  const gone = before.members.filter((id) => ids.includes(id));
  if (!gone.length) return;
  const was = paletteHoles.peek(), wasThins = thinSpots.peek();
  batch(() => {
    suggestedIds.value = [];
    members.value = without(before.members, gone);
    removed.value = [...without(before.removed, gone), ...gone];
    if (gone.some((id) => before.guests[id])) { const g = { ...before.guests }; for (const id of gone) delete g[id]; guests.value = g; }
  });
  const lines: Line[] = [removedManyLine(gone.length), paletteSizeLine(members.peek().length), ...holeChangeLines(holeChange(was, paletteHoles.peek()), { left: false, thins: { ...thinChange(wasThins, thinSpots.peek()), still: [] } })];
  offerUndo(sayAll(lines), before, null, gone);
}

// ---- the grower's own values (v14 0W-1 item 5; the figures panel, pf-d, writes them) ----

export function setSiteEdits(next: SiteEdits, summary: string): void {
  const before = snapshot();
  siteEdits.value = siteEditsOf(next);
  offerUndo(summary, before);
}
export const cellKey = (c: { cellLat: number; cellLon: number } | null | undefined): string | null => (c ? `${c.cellLat.toFixed(2)},${c.cellLon.toFixed(2)}` : null);
const cellOf = (l: SiteLocation | null): string | null => {
  if (!l) return null;
  if (l.lookup?.climate) return cellKey(l.lookup.climate);
  const at = snapOrigin({ lat: l.lat, lon: l.lon });
  return at ? cellKey({ cellLat: at.lat, cellLon: at.lon }) : null;
};
export const editsCleared = signal(false);
export function placeAt(loc: SiteLocation): void {
  const was = cellOf(location.peek()), now = cellOf(loc);
  batch(() => {
    const cleared = was !== null && now !== was && siteEdits.peek() !== NO_EDITS;
    if (cleared) siteEdits.value = NO_EDITS;
    editsCleared.value = cleared;
    location.value = loc;
  });
}

// ---- start (E6 S3): nothing runs because this module was imported ----
let started = false;
export function start(): void {
  if (started) return;
  started = true;
  if (typeof navigator !== 'undefined' && typeof addEventListener === 'function') {
    offline.value = navigator.onLine === false;
    addEventListener('online', () => { offline.value = false; });
    addEventListener('offline', () => { offline.value = true; });
  }
  effect(() => {
    const now = state.track(SNAP_KEYS);
    const after = undoAfter;
    if (!after) return;
    if (SNAP_KEYS.some((k) => now[k] !== after[k])) {
      undoAfter = null;
      if (toast.peek()?.undo) hideToast();
    }
  });
}
