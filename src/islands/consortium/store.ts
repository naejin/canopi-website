// The consortium page's one store (frozen seam, design check §6): every piece of state is a signal,
// and pool, verdicts and flags are computed from them, so views re-render by reading, with no hand
// render loop. Views read and set these signals; only the actions a stream adds write several at once.
// Renaming or removing a signal is a seam change for the coordinator; streams may add actions and,
// inside the computed bodies, the core calls they own (flags: S1 conflicts and site).
import { batch, computed, effect, signal, untracked } from '@preact/signals';
import type { CellSpan, ClimateZone, Hole, PhaseOrd, Flag, FlagContext, Interaction, JobId, MarkContext, MarkProvider, PlantId, PlantVerdict, RangeRule, Scenario, Site, SiteLocation, SiteLookup as CoreLookup, SuggestRule, Taxon, TextureId as CoreTexture, VerdictContext, VerdictRule } from '../../lib/consortium/index.ts';
import { asGuest, canopyOf, countryStatus, DEFAULT_SCENARIO, flagsFor, flagsOf, loadMarkProviders, loadRangeRule, loadSuggest, loadVerdictRule, needsMarkProviders, siteFor, zoneOf } from '../../lib/consortium/index.ts';
import { needsRule, needsSite, nothingFits } from './rules/suggest-block.ts';
import type { FlagScene } from './rules/site-fit.ts';
import type { SiteLookup as ReaderLookup } from '../../lib/climate/index.ts';
import type { TextureId as ReaderTexture } from '../../lib/climate/soil.ts';
import type { LoadFailure, PlantSource } from '../../lib/consortium/source.ts';
import { P, T, nameOf } from './strings.ts';
import { state } from './state/schema.ts';
import { focusAfterToast, noteToastOpener } from './focus.ts';

// Where the country came from: the reader chose it, a link carried it, the page guessed it from
// the browser's language (shown as a guess, never assumed), or (P5 S5b) the site location gave it
// ("from your location"; in a link only with "include my location").
export type CountrySource = 'chosen' | 'link' | 'guess' | 'location';
export interface Country { code: string | null; source: CountrySource | null }
// Which view fills the main area once a climate is chosen (Start comes first). 'matrix' names the
// empty palette slot since PP-B commit 0a' deleted the old screens (its writers: state/draft.ts,
// restore.ts, suggest-wait.ts, addMembers below); b2 replaces the type with 'place' | 'palette' | 'plan'.
export type View = 'start' | 'matrix';
// The header step the page is on (Your place, Your palette; PP-B P1; the Planting plan step comes with
// its page). Read from `view` until its writers (state/draft.ts, restore.ts, suggest-wait.ts) take the
// step values: 'start' is the place, 'matrix' the palette page (b2, additive seam).
export type Step = 'place' | 'palette';
// The open dialog, if any: what it shows and for which plant (null for sheets about no one plant).
export type SheetKind = 'details' | 'swap' | 'add' | 'search' | 'paste' | 'share' | 'download';
// n: which opening this is (openSheet counts them), so a dialog's late close event closes its own
// sheet only, never one opened since (Escape closes the <dialog> at once and fires `close` a task later).
export interface Sheet { kind: SheetKind; id: PlantId | null; n: number }
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface Load { status: LoadStatus; error: LoadFailure | null }

// ---- state ----
// The consortium's fields are declared once in state/schema.ts (what each is, whether Undo, the save
// and the link hold it, who watches it); their signals are re-exported here under their names.
// climate, country; the place (PP-B commit 0, plant-palette-architecture 3.6): room, plot (m²), spot,
// soil and the period shown; the plant lists members (in the order added; a new suggestion is built
// around them), removed (taken out: a new suggestion leaves them out) and guests (from another
// climate's list, A9); the view; setAside; the stage print draws (unsaved, until PP-B18).
export const { climate, country, room, plot, spot, soil, period, members, removed, guests, view, stage, setAside } = state.signals;
export const step = computed<Step>(() => (view.value === 'start' ? 'place' : 'palette'));
// The time step Through the years shows (PhaseOrd; unsaved, not in Undo): the phone's stepper and
// print's side drawing read it (PP-B18; replaces the deprecated `stage`). Opens on years 1-3.
export const yearStep = signal<PhaseOrd>(2);
// The page's shell states (architecture 9): the database still loading after 5 s (main.ts sets it
// from data/load.ts's slow callback), and a return visit restoring (main.ts; App shows the palette
// placeholder, never the Place form, P2).
export const slow = signal(false);
export const opening = signal(false);
// The holes put off with "Not now" (this page only, never saved).
export const notNow = signal<ReadonlySet<string>>(new Set());
export const sheet = signal<Sheet | null>(null);
// While Start shows (view 'start'), the signals above are the Start draft: the picked card, its
// site answers (and, on the consortium's own card, its plants, which Suggest and a paste
// build on). The consortium shown before Change site is then in setAside, with its own site
// answers and country; null: none. Only the
// commit actions turn the draft into the consortium (state/draft.ts); the save mirrors the consortium.
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

// The old site answers (site.ts fits()'s Site), derived from the place (place.ts siteFor), never
// stored: its readers (Add, the flags, rules/site-fit.ts) read `site.value`; Start's
// three questions write it, each answer into the place (light → spot.light, water → spot.water, a
// soil word → an own answer, "not sure" → the soil map, room → room). Removed in PP-C with its readers.
const siteNow = computed<Site>(() => siteFor({ room: room.value, plotM2: plot.value, spot: spot.value, soil: soil.value }, location.value?.lookup ?? null));
function writeSite(next: Site): void {
  batch(() => {
    room.value = next.room;
    spot.value = { ...spot.peek(), light: next.light, water: next.water };
    const now = soil.peek(), word = now.from === 'own' && now.ph === null && now.texture === null ? now.word : null;
    if (next.soil !== (word ?? 'unsure')) soil.value = next.soil === 'unsure' ? { from: 'map' } : { from: 'own', ph: null, word: next.soil, texture: null };
  });
}
export const site = {
  get value(): Site { return siteNow.value; },
  set value(next: Site) { writeSite(next); },
  peek: (): Site => siteNow.peek(),
};

// ---- data (set once the database is open; S1's load fills them) ----
export const source = signal<PlantSource | null>(null);
// The known countries (code → whether GRIIS checked it): the page's list (#ct-data `countries`, set by
// main.ts before the first render) until the database is open, then the database's (the same export).
// So the guessed country and its "not checked" note are final in the first frame (N2 layout shift).
type Countries = ReadonlyMap<string, { invasiveChecked: boolean }>;
const pageCountries = signal<Countries>(new Map());
export function setPageCountries(c?: { checked: string; unchecked: string }): void {
  const m = new Map<string, { invasiveChecked: boolean }>();
  if (c) for (const k of ['checked', 'unchecked'] as const) for (const x of c[k].split(' ')) if (x) m.set(x, { invasiveChecked: k < 'u' });
  pageCountries.value = m;
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
export const interactionSets = signal<Partial<Record<ClimateZone, Interaction[]>>>({});

// ---- computed ----
// The plants of the chosen climate, or null until they are read.
// P5 S5c: with a site climate, also until the range rule has loaded, so nothing draws from an
// unfiltered list (a pending "Suggest plants" waits for it as for the pool). If it cannot load
// (offline after a first visit), the pool itself, unfiltered as in P2, with a notice (rangeFailed).
export const pool = computed<Taxon[] | null>(() => {
  const c = climate.value;
  const p = c ? pools.value[c] ?? null : null;
  return p && siteClimate.value && !rangeRule.value && !rangeFailed.value ? null : p;
});
// The range rule (core range.ts, owner answer 2) arrives with its own chunk (core marks.ts
// loadRangeRule), loaded only once the site location has a climate, so it stays off the first run
// (decision row "Island JavaScript budget for P5"). The page asks it nothing without one.
export const rangeRule = signal<RangeRule | null>(null);
// The rule's chunk did not load (rangeBroken, once per page: a browser remembers a failed module URL,
// so the import is never tried again and Reload is the only retry, one toast for the failure).
// rangeFailed: range checks are off (P2's unfiltered pool) while a location with a climate asks for
// them; with no location (Forget, Start over) the page is plain P2 and says nothing of it.
const rangeBroken = signal(false);
export const rangeFailed = computed(() => rangeBroken.value && siteClimate.value);
// The rule's load in flight (settled once rangeRule or rangeBroken is set): loadPool waits for it, so a
// caller that awaited the pool finds it readable.
let rangeLoad: Promise<void> | null = null;
// The suggestion and the Swap list (core suggest.ts, design check A11): their own chunk (core
// loadSuggest), off the first run, asked for once a database is open (setSource, as the data turns
// ready) and again by a Suggest press or an opened Swap while it is missing (state/suggest-wait.ts
// requestSuggest, views/Swap.tsx). The plant lists never wait for it: a Suggest pressed before it
// arrives waits for it, and Swap shows its loading line, 10 s at most. suggestFailed: the last try did
// not load (offline, or a deploy since the page loaded); the waiting Suggest ends with a toast and
// Reload (L8), Swap says it in place with Reload, and the next press or Swap
// imports it again (a retry clears it while it runs; Chrome answers a failed module from its module
// map without a request, so there the retry fails at once and Reload is the way back).
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
// A pool read waits for the rules that judge it: the range rule while it loads for a site climate,
// and the verdict rule's chunk while it loads (PP-B commit 0; both settle, never reject).
const withRule = <T>(p: Promise<T>): Promise<T> => {
  const waits: Promise<unknown>[] = [];
  if (siteClimate.peek() && !rangeRule.peek() && rangeLoad) waits.push(rangeLoad);
  if (!verdictRule.peek() && verdictLoad) waits.push(verdictLoad);
  return waits.length ? Promise.all([p, ...waits]).then(([x]) => x as T) : p;
};
// Whether the location gave a climate (core siteToday is non-null; inlined to keep the rule off the first run).
export const siteClimate = computed(() => !!location.value?.lookup?.climate?.periods.length);
// (Its load starts in start(), at the end of this file, once the location has a climate.)
// One toast, with Reload, for the P5 chunks that did not load: the range rule's chunk is also a static
// import of the mark providers' chunk, so one missing file (offline, or a deploy since the page loaded)
// fails both; PoolSlot still says the range rule's.
let chunkToasted = false;
function chunkToast(key: string): void {
  if (chunkToasted) return;
  chunkToasted = true;
  showToast(T(key), null, { label: T('load.reload'), run: () => globalThis.location.reload() });
}
// What suggestions and lists draw from (P5 S5c, owner answer 2): the pool without the plants outside
// their observed range at the site location (core range.ts withinRange); the pool itself without one.
// Members stay: a plant added anyway is never dropped from a list it is in. Add and Swap read it until
// PP-C rebuilds them on verdicts.
export const fitPool = computed<Taxon[] | null>(() => {
  const p = pool.value, rule = rangeRule.value;
  return p && (rule ? rule.withinRange(p, location.value, members.value) : p);
});

// ---- the verdict seams (PP-B commit 0; plant-palette-architecture 4) ----
// The verdict rule (core verdict.ts) arrives with its own chunk (role `verdict`, core verdict-load.ts
// loadVerdictRule), off the first run, asked for once the site location has a climate (start(), with
// the range rule; b2 decides the final trigger). Its bodies are b2's: until then every plant is "not
// checked". verdictFailed: its chunk did not load (b2 says it).
export const verdictRule = signal<VerdictRule | null>(null);
export const verdictFailed = signal(false);
let verdictLoad: Promise<void> | null = null;
// Its load always settles, so a pool read waiting for it (withRule) never fails with it.
// Also called by the palette page once it shows (its fit lines and holes read the rule; without a
// location every plant is "not checked"), and by main.ts beside the database download on a return
// visit or a link (perf: the chunk is there when the page mounts): an action, not a start() effect.
// A failed load is not kept: the next call tries again (retryVerdict; core verdict-load.ts fetches the
// chunk again under ?retry=n).
export function wantVerdict(): void {
  if (verdictLoad) return;
  verdictLoad = loadVerdictRule().then((rule) => { verdictRule.value = rule; }, (err: unknown) => {
    console.error(`Consortium: the verdict rule did not load: ${(err as Error).message}`);
    verdictLoad = null;
    verdictFailed.value = true;
  });
}
// The palette page's Try again (online) and the browser back online: the verdict chunk asked again,
// in place, never a page reload (architecture 9).
export function retryVerdict(): void {
  if (verdictLoad || verdictRule.peek()) return;
  verdictFailed.value = false;
  wantVerdict();
}
// What every verdict reads: the palette's place, the location's lookup, the period shown, the
// scenario, and the members' canopy (shade relief, 3.2).
// The canopy kept by value: most adds leave it as it was, and a new array would recompute every
// verdict and everything keyed on them (holes, fillers, both pictures) on each add.
let lastCanopy: ReturnType<typeof canopyOf> | null = null;
const canopy = computed(() => {
  const next = canopyOf(memberTaxa.value), prev = lastCanopy;
  if (prev && prev.length === next.length && prev.every((x, i) => x === next[i])) return prev;
  return (lastCanopy = next);
});
export const verdictContext = computed<VerdictContext>(() => ({
  place: { room: room.value, plotM2: plot.value, spot: spot.value, soil: soil.value },
  lookup: location.value?.lookup ?? null,
  period: period.value,
  scenario: scenario.value,
  canopy: canopy.value,
}));
export const memberVerdicts = computed<Map<PlantId, PlantVerdict> | null>(() => {
  const rule = verdictRule.value;
  return rule ? rule.verdicts(memberTaxa.value, verdictContext.value) : null;
});
// The pool's verdicts, guests' lists included once read (b1b's count, Find, the holes' fillers).
export const poolVerdicts = computed<Map<PlantId, PlantVerdict> | null>(() => {
  const rule = verdictRule.value, p = pool.value;
  return rule && p ? rule.verdicts([...p, ...guestTaxa.value], verdictContext.value) : null;
});
// The pool plants, guests included, that fit or need a second look for the page's period (levels kept
// apart so the line can split them later); null until the verdicts are here. b2 writes its rule
// (a borrowed list keeps every plant whose climate range includes the site); b1b reads it.
/** @public seam for b1b, which drops the tag. */
export const countFits = computed<{ fits: number; look: number; of: number } | null>(() => {
  const v = poolVerdicts.value;
  if (!v) return null;
  let fits = 0, look = 0;
  for (const x of v.values()) { if (x.level === 'fits') fits++; else if (x.level === 'look') look++; }
  return { fits, look, of: v.size };
});
// Whether the browser is offline (navigator.onLine and its events, wired in start(); App shows the line).
export const offline = signal(false);

// The guests as plants: each with its home climate's placement and a guest origin (A9; ADR-6
// asGuest), once that climate's pool is read.
export const guestTaxa = computed<Taxon[]>(() => {
  const out: Taxon[] = [];
  for (const [id, from] of Object.entries(guests.value)) {
    const t = from ? pools.value[from]?.find((x) => x.id === id) : undefined;
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
// What the plant marks read (core marks.ts plantMarks; views/PlantMarks.tsx renders them).
// A climate the site location suggests (P5 owner answer 1; S5b writes it): its card shows checked,
// but store.climate stays unset until the reader confirms.
export const proposedClimate = signal<ClimateZone | null>(null);
// Whether that proposal came from the saved site looked up again (not the reader locating): only such
// a proposal goes when a consortium opens (state/restore.ts restore; seam review round 4, 2).
export const proposedFromSave = signal(false);
export const markContext = computed<MarkContext>(() => ({ climate: climate.value, location: location.value, scenario: scenario.value, site: site.value }));
// The mark providers (core mark-providers.ts, their own chunk): none until a mark can show (a site
// location, or a climate the export does not curate), then loaded once. Off the first run (decision
// row "Island JavaScript budget for P5").
export const markProviders = signal<readonly MarkProvider[]>([]);
export const wantsMarkProviders = computed(() => needsMarkProviders(markContext.value, curatedClimates.value));
// The providers' chunk did not load (seam review 6): the range, future and estimate marks it would show
// are missing, said by one toast with Reload; as for the range rule, the import is not tried again on
// this page. (The notice that stayed under the members, inventory L3, went with Matrix.tsx in PP-B
// commit 0a'; PP-C c2 brings it back.)
const marksBroken = signal(false);
// (Their load starts in start(), at the end of this file, once a mark can show.)
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
// What the flags' words read (views/kit/flags.ts flagLines; rules/site-fit.ts FlagScene).
export const flagScene = computed<FlagScene>(() => ({ site: site.value, members: memberTaxa.value, country: country.value.code, taxonOf }));

// ---- actions (S1) ----

// Reads a climate's pool and interactions once (later calls share the first read). A read that
// fails after the database opened is damage: the §5 screen, never a partial matrix; a later call
// tries again. Signals are read with peek(), so an effect calling this does not re-run per load.
const reading = new Map<ClimateZone, Promise<Taxon[] | null>>();
export function loadPool(c: ClimateZone): Promise<Taxon[] | null> {
  const src = source.peek();
  if (!src) return Promise.resolve(null);
  const have = pools.peek()[c];
  if (have) return withRule(Promise.resolve(have));
  let p = reading.get(c);
  if (!p) {
    // A read of a source replaced meanwhile (Retry) neither writes nor fails the new load.
    p = Promise.all([src.pool(c), src.interactions(c)]).then(([plants, rows]) => {
      if (source.peek() !== src) return null;
      pools.value = { ...pools.peek(), [c]: plants };
      interactionSets.value = { ...interactionSets.peek(), [c]: rows };
      return plants;
    }).catch((err: unknown) => {
      if (source.peek() !== src) return null;
      reading.delete(c);
      console.error(`Consortium data ${src.info().releaseId}: ${c}: ${(err as Error).message}`);
      // A guest's list only: the palette names it as missing and its plants "not checked" (PP-B21);
      // the chosen climate's list is the tool's own: its failure screen.
      if (c !== climate.peek() && Object.values(guests.peek()).includes(c)) failedPools.value = [...failedPools.peek().filter((x) => x !== c), c];
      else load.value = { status: 'failed', error: 'damaged' };
      return null;
    });
    reading.set(c, p);
  }
  return withRule(p);
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

// "Suggest plants": a suggestion built around every plant already in the palette (the members are
// its seed; inventory C6), leaving out removed plants (core suggest.ts). Needs the climate's pool and
// every guest climate's (a guest must count); false, changing nothing, while any is not read
// (guestsPending).
export function suggestMembers(): boolean {
  const p = pool.value;
  if (!p || guestsPending.value.length) return false;
  const seed = members.value;
  const rule = rangeRule.value;
  // Nothing fits the site: no suggestion (it could only be an empty palette); Start shows why.
  if (nothingFits(p, location.value, rule)) return false;
  // A borrowed pool unfiltered (no site climate, or the rule's chunk failed): no suggestion, since only
  // the range filter fits it to a place (UX audit fix 1; fix review 29b709e, 2). The rule Start reads
  // (rules/suggest-block.ts), over the curated climates Start reads (curatedClimates); with a pool and
  // a site climate, a missing rule is a failed one (store.pool waits for it otherwise).
  const scene = { curated: curatedClimates.peek(), siteClimate: siteClimate.value, rangeFailed: !rule, nothingFits: false };
  if (needsSite(climate.value!, scene) || needsRule(climate.value!, scene)) return false;
  // The suggestion's chunk (suggestRule) not here: Suggest waits for it, or says it failed
  // (state/suggest-wait.ts).
  const algo = suggestRule.value;
  if (!algo) return false;
  const s = algo.suggest(rule ? rule.withinRange(p, location.value, seed) : p, { ...flagContext.value, seed, removed: removed.value, guests: guestTaxa.value });
  members.value = s.members;
  return true;
}

// ---- sheets: the one opener (H3, H7, H11, H12; seam review X1, X2) ----

// What a sheet was opened for. Add reads it: a light level over a run of time steps (a light hole), a
// job (a job hole: a run of time steps in any layer, stratum null). (CellSpan is core's, types.ts: Add's preset carries it too, F1a A22.)
export type { CellSpan };
// hole: the hole Add was opened for (the Next step, a hole button), whose words title the sheet.
// Add lists every plant of the cell, run or job, site misfits included and flagged (inform, don't
// block; owner 2026-11-14): nothing hides a plant, so nothing needs "Show them anyway".
// `fits`: the hole's own test (core holes.ts fills), handed by the palette page so the sheet chunks
// never import holes.ts, a module only the palette chunk has (E6-5d: sheets import first-run modules).
export interface SheetFor { cell: CellSpan | null; job: JobId | null; hole: Hole | null; fits: ((t: Taxon) => boolean) | null }
export const FOR_NOTHING: SheetFor = { cell: null, job: null, hole: null, fits: null };
export const sheetCell = signal<SheetFor>(FOR_NOTHING);

// ---- browser history (coordinator row 2026-11-14, "Sheets and browser history", inventory K7) ----
// A sheet (full screen on a phone) and the step from Your place to Your palette each push one history
// entry with the same address, so the phone's Back closes the sheet, every edit made in it kept, or
// returns to Place; a second Back leaves the page. The address writer (state/persist.ts writeAddress)
// keeps writing the palette's link onto the entry on top. main.ts listens: on a move back or forward
// across these entries (historyMoved) it closes the sheet or goes back to Place, then rewrites the
// entry it landed on with the current link before the hashchange that follows, so an entry under a
// sheet never brings back the palette as it was before the edits.
// The model (review r2 hist-1): `known` holds the page's entries at or below the one shown, never
// more. A move back drops the entries above it (they are Forward's only); a Forward onto one of them
// (told by its Navigation API key) is refused, back to the entry shown, so Forward never shows a stale
// sheet or palette step. Every change from the palette to Place leaves the palette step's entry
// (and any sheet's above it) in one move: "Your place" (leaveEntry('palette')), and a change made
// outside history (an Undo back to Place; watchSteps).
// Positions are the Navigation API's entry index where the browser has it, else this page's own
// count (every move then read as a Back, or as the move the page asked for).
type Entry = 'sheet' | 'palette';
type Nav = { currentEntry?: { index: number; key?: string } | null };
const navEntry = (): { index: number; key?: string } | null => {
  try { const e = (globalThis as { navigation?: Nav }).navigation?.currentEntry; return e && typeof e.index === 'number' && e.index >= 0 ? e : null; } catch { return null; }
};
const navIndex = (): number | null => navEntry()?.index ?? null;
let pos = 0, base: number | null = null;
const known: { kind: Entry; at: number; key: string | null }[] = [];
const dropped = new Set<string>(); // keys of the page's entries a move back left (Forward's only)
const here = (): number => navIndex() ?? pos;
const lastOf = (kind: Entry) => { for (let i = known.length - 1; i >= 0; i--) if (known[i].kind === kind) return known[i]; return null; };
function pushEntry(kind: Entry): void {
  if (typeof history === 'undefined' || typeof globalThis.location === 'undefined') return;
  const before = here();
  try {
    // The entry under it gets a state too (an empty one when the page wrote none yet), so a move back
    // onto it is told from a link opened in the tab, whose new entry has none (main.ts popstate).
    if (history.state == null) history.replaceState({}, '', globalThis.location.href);
    history.pushState({ ...(history.state ?? {}), sheet: kind }, '', globalThis.location.href);
  } catch { return; }
  pos = before + 1;
  const at = here();
  if (base === null || before < base) { base = before; known.length = 0; }
  while (known.length && known[known.length - 1].at >= at) known.pop(); // the push cut the entries ahead
  dropped.clear(); // and every entry ahead with them
  known.push({ kind, at, key: navEntry()?.key ?? null });
}
// Whether the entry shown is one this page pushed for `kind`.
const onEntry = (kind: Entry): boolean => { const e = lastOf(kind); return !!e && known[known.length - 1] === e && e.at === here(); };
// Leaves the entry `kind` pushed (the move then closes the sheet or shows Place): false when it is not
// the page's. A sheet: its entry, shown (history.back()). The palette step: back to the entry under it,
// past any sheet's above it, in one move. `leaving` remembers the page asked for that move, so a sheet
// opened again before it lands (Swap's "Back to" Details) is not closed by it; `aim` is where it lands
// (this page's count, without the Navigation API).
let leaving: Entry | null = null, aim: number | null = null;
export function leaveEntry(kind: Entry): boolean {
  const now = here(), e = lastOf(kind);
  if (kind === 'sheet' ? !onEntry('sheet') : !e || known[known.length - 1].at !== now) return false;
  const by = kind === 'sheet' ? -1 : e!.at - 1 - now;
  try { history.go(by); leaving = kind; aim = now + by; return true; } catch { return false; }
}
// A Back or Forward (popstate): null when it is not a move across this page's entries (a link of an
// earlier visit: the hashchange opens it), or the page's own move back from a refused Forward; else
// what main.ts does:
// `place` (back past the palette step: Your place shows), then the rewrite of the entry landed on with
// the current link, then pushWaiting. An open sheet the move left closes here (not one opened again
// after the page's own Back). The entries above the one landed on leave `known`.
// `force`: main.ts rewrites the landed entry with the current link even with no palette of the page's
// own (writeAddress(true): Place after Back keeps the palette's link), except after the page left the
// palette step's entry for a change made outside history (an Undo back to Place): that change wrote
// the address it wants (state/persist.ts), so the entry takes it as it is.
let bouncing = false;
export function historyMoved(): { place: boolean; force: boolean } | null {
  const asked = leaving, aimed = aim;
  leaving = null;
  aim = null;
  if (bouncing) { bouncing = false; return null; }
  if (base === null) return null;
  const was = pos;
  const now = navIndex() ?? aimed ?? Math.max(base, pos - 1);
  const top = known.length ? known[known.length - 1].at : base;
  if (now > top) {
    const key = navEntry()?.key;
    // Refused: back to the entry shown; main.ts rewrites this one with the current link first, so
    // the hashchange that follows never opens the older palette it held.
    if (key && dropped.has(key)) { try { history.go(was - now); bouncing = true; } catch { /* stays */ } return { place: false, force: true }; }
    forgetEntries();
    return null;
  }
  pos = now;
  if (now < base) { forgetEntries(); return null; }
  const s = lastOf('sheet'), p = lastOf('palette');
  const below = !s || now < s.at;
  if (asked !== 'sheet' && sheet.peek() && below) sheet.value = null;
  const place = !paletteWaits && !!p && now < p.at && step.peek() === 'palette';
  while (known.length && known[known.length - 1].at > now) { const k = known.pop()!.key; if (k) dropped.add(k); }
  return { place, force: !(asked === 'palette' && step.peek() === 'place') };
}
// After a move and the rewrite: the entries asked for while the page's own Back was on its way (a
// push then would race the traversal): the palette step (Paste's Add closes the sheet, then the
// palette opens), then a sheet opened again.
let paletteWaits = false;
export function pushWaiting(): void {
  if (bouncing) return; // a refused Forward: the move back to the entry shown comes first
  if (paletteWaits && step.peek() === 'palette' && !onEntry('palette')) pushEntry('palette');
  paletteWaits = false;
  if (sheet.peek() && !onEntry('sheet') && SHEET_KINDS.includes(sheet.peek()!.kind)) pushEntry('sheet');
}
// A link opened in the tab (a new entry this page did not push): the entries above are another
// palette's history now; Back from it is the hashchange's (state/arrival.ts).
export function forgetEntries(): void { base = null; known.length = 0; dropped.clear(); leaving = null; aim = null; paletteWaits = false; bouncing = false; }
// A return visit or a link opens on the palette page by itself: that first step is not the reader's
// and pushes nothing (main.ts sets it; the step's effect in start() reads it once).
let arrivalStep = false;
export function arrivalOpensPalette(on: boolean): void { arrivalStep = on; }
// The reader's step from Your place to Your palette pushes one history entry, so Back returns to
// Place (coordinator row 2026-11-14); a return visit's or a link's own opening does not. The way back
// made outside history (an Undo to Place, Start over) leaves that entry, as "Your place" does. Started
// by main.ts beside watchPools (the page's history, not one of start()'s effects). Returns the disposer.
export function watchSteps(): () => void {
  let was = step.peek();
  return effect(() => {
    const now = step.value;
    if (was === 'place' && now === 'palette') {
      if (arrivalStep) arrivalStep = false;
      else if (leaving) paletteWaits = true; // after the Back on its way (pushWaiting)
      else untracked(() => pushEntry('palette'));
    } else if (was === 'palette' && now === 'place') {
      paletteWaits = false;
      if (!leaving) untracked(() => leaveEntry('palette')); // false once a move back already left it
    }
    was = now;
  });
}

// Every sheet opens through here, so what the last one was opened for never leaks into the next.
// Share and Download are not sheets (no entry).
const SHEET_KINDS: readonly SheetKind[] = ['details', 'swap', 'add', 'search', 'paste'];
let opened = 0;
export function openSheet(kind: SheetKind, id: PlantId | null = null, target: Partial<SheetFor> = {}): void {
  if (SHEET_KINDS.includes(kind) && !onEntry('sheet')) pushEntry('sheet');
  batch(() => { sheetCell.value = { ...FOR_NOTHING, ...target }; sheet.value = { kind, id, n: ++opened }; });
}
// Close (its button, Escape, the backdrop, an action that ends it): the sheet goes at once, and its
// history entry with history.back() (main.ts then rewrites the entry under it with the current link).
export const closeSheet = (): void => {
  const had = sheet.peek() !== null;
  sheet.value = null;
  if (had) leaveEntry('sheet');
};

// ---- the toast (one short line under the tool, with Undo when the change can be taken back) ----

export interface ToastAction { label: string; run: () => void }
export type ToastWhere = 'page' | 'sheet';
// focus: the plants Undo brings back; the first one's control takes the focus after Undo (W4).
export interface ToastLine { id: number; text: string; undo: (() => void) | null; action: ToastAction | null; where: ToastWhere; focus: PlantId[] }
export const toast = signal<ToastLine | null>(null);
const TOAST_MS = 12_000; // long enough to reach Undo with a keyboard or a screen reader
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 1;
export function showToast(text: string, undo: (() => void) | null = null, action: ToastAction | null = null, focus: PlantId[] = []): void {
  noteToastOpener();
  const line: ToastLine = { id: toastSeq++, text, undo, action, where: sheet.peek() !== null ? 'sheet' : 'page', focus };
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
  if (held) { if (toastTimer) clearTimeout(toastTimer); toastTimer = null; } else armToast(line.id);
}
// Every path that takes the toast away (Dismiss, Undo, its action, the timer above) tells focus.ts
// first, while the toast is still on the page (F1a commit 0 seam, A25; stream 6 implements it).
export function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
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

// The view and the consortium set aside too: Undo of a list pasted on Start goes back to Start's
// draft, with the consortium it replaced, so the save mirrors that one again (F2, R2-1).
// (The Snapshot holds the fields state/schema.ts marks `undo`, and the plant lists.)
type Snapshot = ReturnType<typeof state.snapshot>;
const without = (list: PlantId[], ids: PlantId[]) => list.filter((x) => !ids.includes(x));

// Undo puts back the snapshot taken before the action, so it is offered only while nothing else has
// changed the consortium (another edit, a new suggestion, another climate): any change hides the toast.
// The fields whose change ends the offer (endsUndo or plants in state/schema.ts): the plant lists and
// the climate.
const SNAP_KEYS = state.lists.endsUndo;
let undoAfter: ReturnType<typeof state.peek<(typeof SNAP_KEYS)[number]>> | null = null;
// (Place's moves, in state/draft.ts and state/suggest-wait.ts, offer their Undo through it too.)
export function offerUndo(text: string, before: Snapshot, action: ToastAction | null = null, focus: PlantId[] = []): void {
  undoAfter = state.peek(SNAP_KEYS);
  showToast(text, () => { undoAfter = null; state.restore(before); }, action, focus);
}
// (The effect that ends the offer starts in start(), at the end of this file.)

// Remove (details, the plant list): its cells are free again (the gap stays), it is left out of a new
// suggestion, and Undo brings back the consortium as it was.
export function removeMember(id: PlantId): void {
  const before = state.snapshot(), name = nameById(id);
  batch(() => {
    members.value = without(before.members, [id]);
    removed.value = [...without(before.removed, [id]), id];
    if (before.guests[id]) { const g = { ...before.guests }; delete g[id]; guests.value = g; }
  });
  offerUndo(T('details.removed', { name }), before, null, [id]);
}
// Swap: the new plant takes the old one's place in the order; the old one is left out of a new
// suggestion.
export function swapMember(oldId: PlantId, newId: PlantId): void {
  const before = state.snapshot(), a = nameById(oldId), b = nameById(newId);
  batch(() => {
    members.value = before.members.map((x) => (x === oldId ? newId : x)).filter((x, i, all) => all.indexOf(x) === i);
    removed.value = [...without(before.removed, [newId, oldId]), oldId];
    if (before.guests[oldId]) { const g = { ...before.guests }; delete g[oldId]; guests.value = g; }
  });
  offerUndo(T('swapped', { a, b }), before, null, [oldId]);
}
// Add: plants chosen by hand join (a new suggestion is built around them). from: guests, each with
// the climate whose list it comes from ("Add anyway", A9). warned: plants added without being asked
// about a misfit or a serious conflict ("Add all" from a paste, 2026-10-28 "Scale build" row): the
// toast says "n added with a warning" with Show (the first one's details).
// On Start, a paste builds on the draft and opens it as the consortium (a commit, like Suggest).
// text: the toast's own words (the Next step names the plant it added), else paste.added's count;
// the warned count follows either.
export function addMembers(ids: PlantId[], from: Partial<Record<PlantId, ClimateZone>> = {}, { warned = [], text: said }: { warned?: PlantId[]; text?: string } = {}): void {
  const before = state.snapshot();
  const fresh = ids.filter((id, i) => ids.indexOf(id) === i && !before.members.includes(id));
  if (!fresh.length) return;
  batch(() => {
    members.value = [...before.members, ...fresh];
    removed.value = without(before.removed, fresh);
    // The guests change only when a guest joins (a new object would rebuild every guest's record).
    if (fresh.some((id) => from[id])) {
      const g = { ...before.guests };
      for (const id of fresh) if (from[id]) g[id] = from[id];
      guests.value = g;
    }
    // A list pasted on Start opens its consortium (the palette slot: Share, Print, the address; X3).
    if (view.peek() === 'start') view.value = 'matrix';
  });
  const flagged = warned.filter((id) => fresh.includes(id));
  const text = (said ?? P('paste.added', fresh.length)) + (flagged.length ? ` ${P('paste.addedWarn', flagged.length)}` : '');
  offerUndo(text, before, flagged.length ? { label: T('paste.show'), run: () => openSheet('details', flagged[0]) } : null);
}

// ---- start (E6 S3): nothing runs because this module was imported ----

// The store's own effects, started by main.ts before the first render, in the order they ran when
// they were module-level; a node test imports the store with none running
// (scripts/consortium-start.test.mjs). A second call does nothing (each effect would run twice).
let started = false;
export function start(): void {
  if (started) return;
  started = true;
  // The range rule's chunk, loaded once the location has a climate (rangeRule, rangeBroken).
  effect(() => {
    if (!siteClimate.value || rangeLoad) return;
    rangeLoad = loadRangeRule().then((rule) => { rangeRule.value = rule; }, (err: unknown) => {
      console.error(err);
      rangeBroken.value = true;
      chunkToast('range.unavailable');
    });
    wantVerdict();
  });
  // Offline (architecture 9): the page says so; what is loaded still works.
  if (typeof navigator !== 'undefined' && typeof addEventListener === 'function') {
    offline.value = navigator.onLine === false;
    addEventListener('online', () => { offline.value = false; });
    addEventListener('offline', () => { offline.value = true; });
  }
  // The mark providers' chunk, loaded once a mark can show (markProviders, marksBroken).
  effect(() => {
    if (!wantsMarkProviders.value || markProviders.peek().length || marksBroken.peek()) return;
    loadMarkProviders().then((list) => { markProviders.value = list; }, (err: unknown) => {
      console.error(`Consortium: the plant marks did not load: ${(err as Error).message}`);
      if (marksBroken.peek()) return;
      marksBroken.value = true;
      chunkToast('marks.unavailable');
    });
  });
  // The Undo offer ends on any other change of the plant lists or the climate (offerUndo).
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
