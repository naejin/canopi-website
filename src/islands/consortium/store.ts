// The consortium page's one store (frozen seam, design check §6): every piece of state is a signal,
// and pool, verdicts and flags are computed from them, so views re-render by reading, with no hand
// render loop. Views read and set these signals; only the actions a stream adds write several at once.
// Renaming or removing a signal is a seam change for the coordinator; streams may add actions and,
// inside the computed bodies, the core calls they own (flags: S1 conflicts and site).
import { batch, computed, effect, signal, untracked } from '@preact/signals';
import type { Alternative, ClimateZone, Hole, PeriodId, PhaseOrd, Flag, FlagContext, Interaction, JobId, PlantId, PlantVerdict, Scenario, Site, SiteLocation, SiteLookup as CoreLookup, SuggestRule, Taxon, TextureId as CoreTexture, VerdictContext, VerdictRule } from '../../lib/consortium/index.ts';
import { asGuest, canopyOf, countryStatus, DEFAULT_SCENARIO, fills, flagsFor, flagsOf, holes, loadSuggest, loadVerdictRule, periodIds, secondLook, siteFor, zoneOf } from '../../lib/consortium/index.ts';
import { needsRule, needsSite, nothingFits, notOutside } from './rules/suggest-block.ts';
import type { FlagScene } from './rules/site-fit.ts';
import type { SiteLookup as ReaderLookup } from '../../lib/climate/index.ts';
import type { TextureId as ReaderTexture } from '../../lib/climate/soil.ts';
import type { LoadFailure, PlantSource } from '../../lib/consortium/source.ts';
import { P, T, nameOf } from './strings.ts';
import { state } from './state/schema.ts';
import { held, markSave, undoSave } from './state/save.ts';
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
// 'place': the "Your place" sheet (views/place/Place.tsx PlaceSheet), which changes the palette's place
// in place.
export type SheetKind = 'details' | 'swap' | 'find' | 'paste' | 'place' | 'share' | 'download';
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
// climate's list, A9); the view; the stage print draws (unsaved, until PP-B18).
export const { climate, country, room, plot, spot, soil, period, members, removed, guests, view, stage } = state.signals;
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
// The signals above are the palette on Place and on the palette page alike: Place's answers and plants
// change it as they are given (owner 2026-11-15), and the save follows it while the page owns it
// (state/save.ts held).
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
// zones: each country's time zones (space-separated), worked out at build time from the same CLDR data
// the browser has (ConsortiumPage.astro), so the country guess reads them instead of asking the
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
// The plants of the chosen climate, or null until they are read.
// P5 S5c: with a site climate, also until the range rule has loaded, so nothing draws from an
// unfiltered list (a pending "Suggest plants" waits for it as for the pool). If it cannot load
// (offline after a first visit), the pool itself, unfiltered as in P2, with a notice (rangeFailed).
export const pool = computed<Taxon[] | null>(() => {
  const c = climate.value;
  const p = c ? pools.value[c] ?? null : null;
  return p && siteClimate.value && !verdictRule.value && !rangeFailed.value ? null : p;
});
// The range checks come with the verdict rule (its chunk, role `verdict`; PP-C c2 folded the range role
// into it), asked for once the site location has a climate.
// rangeFailed: its chunk failed and has not loaded since, while a location with a climate asks for
// range checks: the pool is then read unfiltered (P2), said in place (PoolSlot). Sticky until a load
// succeeds (verdictEverFailed), so a retry in flight never sends the palette back to "loading".
export const rangeFailed = computed(() => verdictEverFailed.value && !verdictRule.value && siteClimate.value);
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
// A pool read waits for the rule that judges it: the verdict rule's chunk while it loads (it holds the
// range checks; it settles, never rejects).
const withRule = <T>(p: Promise<T>): Promise<T> => {
  const waits: Promise<unknown>[] = [];
  if (!verdictRule.peek() && verdictLoad) waits.push(verdictLoad);
  return waits.length ? Promise.all([p, ...waits]).then(([x]) => x as T) : p;
};
// Whether the location gave a climate (core siteToday is non-null; inlined to keep the rule off the first run).
export const siteClimate = computed(() => !!location.value?.lookup?.climate?.periods.length);
// (Its load starts in start(), at the end of this file, once the location has a climate.)
// What suggestions and lists draw from (P5 S5c, owner answer 2): the pool without the plants judged
// outside for the page period (poolVerdicts, rules/suggest-block.ts notOutside); the pool itself without
// verdicts. Members stay: a plant added anyway is never dropped from a list it is in.
export const fitPool = computed<Taxon[] | null>(() => {
  const p = pool.value;
  return p && notOutside(p, poolVerdicts.value, members.value);
});

// What the palette suggests and swaps from (Next step, Swap): the pool, or nothing while it is a
// borrowed list not fitted to a place (no location, or no range rule: rules/suggest-block.ts, as
// suggestMembers refuses; fix round 1, b1a2-2). Place, the "Your place" sheet and the palette's head
// say why (views/PoolSlot.tsx).
export const offerPool = computed<Taxon[] | null>(() => {
  const p = pool.value, z = climate.value;
  if (!p || !z) return p;
  const scene = { curated: curatedClimates.value, siteClimate: siteClimate.value, rangeFailed: rangeFailed.value, nothingFits: false };
  return needsSite(z, scene) || needsRule(z, scene) ? [] : p;
});

// ---- the verdict seams (PP-B commit 0; plant-palette-architecture 4) ----
// The verdict rule (core verdict.ts) arrives with its own chunk (role `verdict`, core verdict-load.ts
// loadVerdictRule), off the first run, asked for once the site location has a climate (start(), with
// the range rule; b2 decides the final trigger). Its bodies are b2's: until then every plant is "not
// checked". verdictFailed: its chunk did not load (b2 says it).
export const verdictRule = signal<VerdictRule | null>(null);
export const verdictFailed = signal(false);
const verdictEverFailed = signal(false);
let verdictLoad: Promise<void> | null = null;
// Its load always settles, so a pool read waiting for it (withRule) never fails with it.
// Also called by the palette page once it shows (its fit lines and holes read the rule; without a
// location every plant is "not checked"), and by main.ts beside the database download on a return
// visit or a link (perf: the chunk is there when the page mounts): an action, not a start() effect.
// A failed load is not kept: the next call tries again (retryVerdict; core verdict-load.ts fetches the
// chunk again under ?retry=n). verdictFailed says the current load failed: a new load clears it as it
// starts (b1bg-1: a return visit's fetchAhead refused offline, then start()'s effect asks again once a
// site climate arrives; meanwhile the count line checks and the waiting Suggest waits). Never once only
// a reload can work (verdictNeedsReload): every caller, the mount-time ones included, then asks nothing.
// The automatic asks (the location's climate, the palette page, the prefetch) load it; only the
// reader's Try again (or the browser back online) counts as a retry (A8: an automatic second ask
// after a failure is not one, so it never turns Try again into Reload).
export function wantVerdict(): void {
  loadVerdict(false);
}
function loadVerdict(retry: boolean): void {
  if (verdictLoad || verdictNeedsReload.peek()) return;
  verdictFailed.value = false;
  verdictLoad = loadVerdictRule().then((rule) => { verdictRule.value = rule; verdictEverFailed.value = false; }, (err: unknown) => {
    console.error(`Consortium: the verdict rule did not load: ${(err as Error).message}`);
    verdictLoad = null;
    batch(() => {
      verdictFailed.value = true;
      verdictEverFailed.value = true;
      // A retry that fails while the browser says it is online will not load in place (A8).
      if (retry && globalThis.navigator?.onLine !== false) verdictNeedsReload.value = true;
    });
  });
}
// The palette page's Try again (online) and the browser back online: the verdict chunk asked again,
// in place, never a page reload (architecture 9).
export const retryVerdict = (): void => loadVerdict(true);
// Never a retry that cannot work (pre-push fix 4): the verdict chunk statically imports shared chunks,
// and Chromium keeps a failed import of one for the page's life (retry-import.ts), so a retry under a
// fresh URL may not load. The simple rule (fix round 1 A8): a retry that fails while the browser is
// online needs a reload; offline, the online listener retries. Then wantVerdict asks for nothing and
// the views offer Reload (load.reload) in place of Try again.
export const verdictNeedsReload = signal(false);
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
// The verdict at a plant's own later period (the rule's judgedPeriod for the last period: its own
// years) when the page shows an earlier one, else null: what that period changes is worded from it
// (core againstLines and rowLines), so Details, the rows and print say the same. The members' are
// computed once per change (grouped by period), any other plant's on demand (Details).
const LAST = periodIds[periodIds.length - 1];
function laterVerdicts(rule: VerdictRule, taxa: readonly Taxon[], now: Map<PlantId, PlantVerdict>): Map<PlantId, PlantVerdict> {
  const byPeriod = new Map<PeriodId, Taxon[]>();
  for (const t of taxa) {
    const own = rule.judgedPeriod(t, LAST), v = now.get(t.id);
    if (v && own !== v.judged) byPeriod.set(own, [...(byPeriod.get(own) ?? []), t]);
  }
  const out = new Map<PlantId, PlantVerdict>();
  for (const [p, ts] of byPeriod) for (const [id, lv] of rule.verdicts(ts, { ...verdictContext.value, period: p })) out.set(id, lv);
  return out;
}
const memberLaterVerdicts = computed<Map<PlantId, PlantVerdict> | null>(() => {
  const rule = verdictRule.value, now = memberVerdicts.value;
  return rule && now ? laterVerdicts(rule, memberTaxa.value, now) : null;
});
export function laterVerdictOf(t: Taxon, v: PlantVerdict | null | undefined): PlantVerdict | null {
  const rule = verdictRule.value;
  if (!rule || !v) return null;
  if (memberVerdicts.value?.get(t.id) === v) return memberLaterVerdicts.value?.get(t.id) ?? null;
  return laterVerdicts(rule, [t], new Map([[t.id, v]])).get(t.id) ?? null;
}
// A plant's verdicts at each period of its own years, today first, in order (the keep line: today's
// level, and the first later period it is outside); empty until the rule is here.
export function periodVerdictsOf(t: Taxon): PlantVerdict[] {
  const rule = verdictRule.value;
  if (!rule) return [];
  const own = periodIds.indexOf(rule.judgedPeriod(t, LAST));
  return periodIds.slice(0, own + 1).map((p) => rule.verdicts([t], { ...verdictContext.value, period: p }).get(t.id)).filter((v): v is PlantVerdict => !!v);
}
// The pool's verdicts, guests' lists included once read (b1b's count, Find, the holes' fillers).
export const poolVerdicts = computed<Map<PlantId, PlantVerdict> | null>(() => {
  const rule = verdictRule.value, p = pool.value;
  return rule && p ? rule.verdicts([...p, ...guestTaxa.value], verdictContext.value) : null;
});
// One plant's verdict for the page period (Details: Against and the desk's soil line read this one
// lookup): from the members' or the pool's maps when it is there, else computed for this plant alone
// (a plant opened from a link or a guest list); null until the rule is here.
export function verdictOf(t: Taxon): PlantVerdict | null {
  const rule = verdictRule.value;
  if (!rule) return null;
  return memberVerdicts.value?.get(t.id) ?? poolVerdicts.value?.get(t.id) ?? rule.verdicts([t], verdictContext.value).get(t.id) ?? null;
}
// The chosen climate's list (its own, or the nearest lists it borrows), guests left out: the plants
// that fit or need a second look for the page's period (levels kept apart so the line can split them
// later), and those not checked (no climate figures for the period, or no range recorded: 'unknown',
// never counted as fitting), of how many; null until the verdicts are here. Place's count line reads it
// (views/pool/pool.tsx, b1b: "{n} of the {m} plants on the nearest lists fit your place today"; never
// "0 of m", rules/suggest-block.ts countKind). A borrowed list keeps every plant whose climate range
// includes the site (owner, 2026-11-14). Kiambu: 305 of 515.
export const countFits = computed<{ fits: number; look: number; unknown: number; of: number } | null>(() => {
  const v = poolVerdicts.value, p = pool.value;
  if (!v || !p) return null;
  let fits = 0, look = 0, unknown = 0;
  for (const t of p) { const x = v.get(t.id)?.level; if (x === 'fits') fits++; else if (x === 'look') look++; else if (x !== 'outside') unknown++; }
  return { fits, look, unknown, of: p.length };
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
  const verdicts = poolVerdicts.value;
  const away = new Set(offer.filter((x) => verdicts?.get(x.id)?.level === 'outside').map((x) => x.id));
  const opts = { ...flagContext.value, removed: removed.value, verdicts };
  const out = offer.filter((x) => away.has(x.id));
  return { fit: algo.alternatives(id, memberTaxa.value, offer.filter((x) => !away.has(x.id)), opts), outside: out.length ? algo.alternatives(id, memberTaxa.value, out, opts) : [] };
}
// A climate the site location suggests (P5 owner answer 1; S5b writes it): its card shows checked,
// but store.climate stays unset until the reader confirms.
export const proposedClimate = signal<ClimateZone | null>(null);
// Whether that proposal came from the saved site looked up again (not the reader locating): only such
// a proposal goes when a consortium opens (state/restore.ts restore; seam review round 4, 2).
export const proposedFromSave = signal(false);
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
export const holesPending = computed(() => guestsPending.value.length > 0 || missingMembers.value.loading.length > 0 || failedMembers.value.length > 0);
export const paletteHoles = computed<Hole[]>(() => holes({ members: memberTaxa.value, verdicts: memberVerdicts.value, pending: holesPending.value }));
// The holes open now, in rank order (not judged and pending ones left out).
export const openHoles = computed<Hole[]>(() => paletteHoles.value.filter((h) => h.state === 'open'));
// How many open holes a plant fills (core holes.ts fills): Find's best first and its "fills N holes".
export function holeFillCount(t: Taxon): number {
  let n = 0;
  for (const h of openHoles.value) if (fills(h, t)) n++;
  return n;
}

// Whether the verdicts are settled (pf hand-off): the rule is here, or its chunk failed (the page says
// so, VerdictNotice). Until then the Next step says "Checking your plants…" and Find hides the filters
// that read verdicts. Without a location the rule still loads (wantVerdict; openFind asks for it), so
// it turns true and every plant reads "not checked".
export const verdictsReady = computed(() => !!verdictRule.value || verdictFailed.value);

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
    if (failedOther.peek().includes(c)) failedOther.value = failedOther.peek().filter((x) => x !== c);
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
      // The chosen climate's list is the tool's own: its failure screen. A guest's list: the palette
      // names it as missing and its plants "not checked" (PP-B21). Any other list (Find, Paste): said
      // where it was asked for (failedOther), the tool goes on (pf hand-off).
      if (c === climate.peek()) load.value = { status: 'failed', error: 'damaged' };
      else if (Object.values(guests.peek()).includes(c)) failedPools.value = [...failedPools.peek().filter((x) => x !== c), c];
      else failedOther.value = [...failedOther.peek().filter((x) => x !== c), c];
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

// Whether a suggestion needs the verdicts first: a site climate (suggestMembers; state/suggest-wait.ts
// waits for them and ends the wait when their chunk is refused). The range checks come in the same
// chunk since PP-C c2, so a refused chunk is one state: Suggest refuses with a toast, never P2's
// unfiltered suggestion (P5-14e's, from when the range rule had its own chunk).
export const waitsForVerdicts = (): boolean => siteClimate.value;
// "Suggest plants": a suggestion built around every plant already in the palette (the members are
// its seed; inventory C6), leaving out removed plants (core suggest.ts). Needs the climate's pool and
// every guest climate's (a guest must count), and with a site climate the verdicts; false, changing
// nothing, while any is not read (guestsPending, verdictRule).
export function suggestMembers(): boolean {
  const p = pool.value;
  if (!p || guestsPending.value.length) return false;
  const seed = members.value;
  const rule = verdictRule.value;
  // Nothing fits the site: no suggestion (it could only be an empty palette); Start shows why.
  if (nothingFits(p, poolVerdicts.value)) return false;
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
  // With a site climate, the verdicts too (F1a-P7, PP-B b1b): the gain counts the open holes a plant
  // fills, and a member outside its range for the period fills none. Suggest waits for the verdict
  // chunk, and a refused one ends the wait with a toast (state/suggest-wait.ts). Without a site climate
  // every verdict is "not checked": nothing to wait for.
  const verdicts = poolVerdicts.value;
  if (waitsForVerdicts() && !verdicts) return false;
  const s = algo.suggest(notOutside(p, verdicts, seed), { ...flagContext.value, seed, removed: removed.value, guests: guestTaxa.value, verdicts });
  // A suggestion placed is a plant change: the page owns the save from here (state/save.ts), and it
  // offers its own Undo, as Add, Remove and Swap do, taken just before it is placed (fix round 4, s-1,
  // s-2: every caller gets it, and no effect can drop it). A wait ends on any plant change, so this is
  // the palette the press saw, with only the place answers given during the wait kept.
  const before = snapshot();
  batch(() => { members.value = s.members; held.value = false; });
  offerUndo(P('place.suggested', s.members.length), before);
  return true;
}

// ---- sheets: the one opener (H3, H7, H11, H12; seam review X1, X2) ----

// What Find was opened for (PP-C, slices 3.2): nothing ("Add plants", "Find plants", Place's "Add a
// plant by name"), or a hole (the Next step's "See all", a hole's Find): its job, the hole itself,
// whose words title the sheet (board FillHole), and `fits`, the hole's own test (core holes.ts fills),
// handed by the palette page so the sheet chunks never import holes.ts, a module only the palette
// chunk has (E6-5d: sheets import first-run modules). Find lists every plant, site misfits included
// and flagged (inform, don't block; owner 2026-11-14).
export interface SheetFor { job: JobId | null; hole: Hole | null; fits: ((t: Taxon) => boolean) | null }
export const FOR_NOTHING: SheetFor = { job: null, hole: null, fits: null };
export const sheetTarget = signal<SheetFor>(FOR_NOTHING);

// ---- browser history (coordinator row 2026-11-14, "Sheets and browser history", inventory K7) ----
// A sheet (full screen on a phone) and the step from Your place to Your palette each push one history
// entry with the same address, so the phone's Back closes the sheet, every edit made in it kept, or
// returns to Place; a second Back leaves the page. The address writer (state/persist.ts writeAddress)
// keeps writing the palette's link onto the entry on top. main.ts listens: on a move back or forward
// (historyMoved) it closes the sheet or goes back to Place, then rewrites the entry it landed on with
// the current link, so the hashchange that follows lands on the address the page last wrote and is
// ignored (main.ts), and an entry under a sheet never brings back the palette as it was.
// Each entry the page pushes records the page's entries up to it in its own history.state (`pp`, e.g.
// ['palette', 'sheet']), so a Back or Forward reads where it landed from the entry itself: no counting,
// no Navigation API, and a reload keeps it (persist.ts writeAddress keeps `pp`). A Forward onto an entry
// the page left does nothing: the sheet stays closed, Back takes the reader on (owner 2026-11-14:
// simplify; no refused Forward).
// Each entry also carries its start (`st`): new for each link opened in the tab (forgetEntries),
// inherited by the entries the page pushes on it, kept by every rewrite and read back after a reload.
// A move onto an entry of another start (`away`) leaves that link: nothing is rewritten, and the
// hashchange that follows reopens the entry landed on as its own address (main.ts adoptEntry; fix
// round 2, C).
type Entry = 'sheet' | 'palette';
const ppOf = (s: unknown): Entry[] => {
  const pp = (s as { pp?: unknown } | null)?.pp;
  return Array.isArray(pp) ? pp.filter((k): k is Entry => k === 'sheet' || k === 'palette') : [];
};
const stOf = (s: unknown): string | null => {
  const v = (s as { st?: unknown } | null)?.st;
  return typeof v === 'string' && v ? v : null;
};
const newStart = (): string => Math.random().toString(36).slice(2, 10);
let shown: Entry[] = []; // read from the entry shown when watchSteps starts (after a reload: its pp)
let st = ''; // the start of the entry shown ('' until watchSteps reads it)
// The start persist.ts writeAddress stamps on every entry it writes.
export const startId = (): string => st;
function pushEntry(kind: Entry): void {
  const pp = [...shown, kind];
  try { history.pushState({ ...(history.state ?? {}), pp, ...(st ? { st } : {}) }, '', globalThis.location.href); } catch { return; }
  shown = pp;
}
const onEntry = (kind: Entry): boolean => shown[shown.length - 1] === kind;
// Leaves the entry `kind` pushed and every entry above it in one move (the move then closes the sheet
// or shows Place): false when the page has no such entry. `leaving` remembers the page asked for it,
// so a sheet opened again before it lands (Swap's "Back to" Details) is not closed by it.
let leaving: Entry | null = null;
export function leaveEntry(kind: Entry): boolean {
  const i = shown.lastIndexOf(kind);
  if (i < 0 || (kind === 'sheet' && i !== shown.length - 1)) return false;
  try { history.go(i - shown.length); leaving = kind; return true; } catch { return false; }
}
// A Back or Forward (popstate) onto `state`: what main.ts does, `place` (back past the palette step:
// Your place shows), then the rewrite of the entry landed on with the current link (`force`: even with
// no palette of the page's own, except after an Undo back to Place, which wrote the address it wants).
// `away`: the entry landed on is another start's: nothing is rewritten, so the hashchange that follows
// opens the entry landed on as its own address (main.ts).
// An entry with a palette (`ct`) and no start is one the code before start ids wrote (every `ct` the
// page writes now has one, watchSteps starting before the first write): another start too (r3-4).
export function historyMoved(state: unknown): { place: boolean; force: boolean; away: boolean } {
  const asked = leaving, was = shown, now = ppOf(state), landed = stOf(state);
  const away = landed !== null ? landed !== st : typeof (state as { ct?: unknown } | null)?.ct === 'string';
  leaving = null;
  shown = now;
  if (landed) st = landed;
  if (away) return { place: false, force: false, away };
  if (asked !== 'sheet' && sheet.peek() && !now.includes('sheet')) sheet.value = null;
  const place = !paletteWaits && was.includes('palette') && !now.includes('palette') && step.peek() === 'palette';
  return { place, force: !(asked === 'palette' && step.peek() === 'place'), away };
}
// After a move and the rewrite: the entries asked for while the page's own Back was on its way (a push
// then would race the traversal): the palette step (an action that closes a sheet, then opens the
// palette), then a sheet opened again.
let paletteWaits = false;
export function pushWaiting(): void {
  if (paletteWaits && step.peek() === 'palette' && !shown.includes('palette')) pushEntry('palette');
  paletteWaits = false;
  if (sheet.peek() && !onEntry('sheet') && SHEET_KINDS.includes(sheet.peek()!.kind)) pushEntry('sheet');
}
// A link opened in the tab: its entry is a new start (state/arrival.ts restores it).
export function forgetEntries(): void { shown = []; leaving = null; paletteWaits = false; st = newStart(); }
// A hashchange onto an entry the page wrote itself (its own address, landed on by a move off a link):
// its entries and its start are the entry's own.
export function adoptEntry(state: unknown): void { shown = ppOf(state); st = stOf(state) ?? newStart(); leaving = null; paletteWaits = false; }
// A return visit or a link opens on the palette page by itself: that first step is not the reader's
// and pushes nothing (main.ts sets it; the step's effect in start() reads it once).
let arrivalStep = false;
export function arrivalOpensPalette(on: boolean): void { arrivalStep = on; }
// A refused arrival (an older, newer, unreadable or cut link or save; one whose list did not load)
// shows Place with its notice at once, never the placeholder until the plants are read (pre-push fix
// 2): restore.ts ends the opening from its refuse path, and the arrival's step is no longer coming.
export function endOpening(): void { opening.value = false; arrivalStep = false; }
// The reader's step from Your place to Your palette pushes one history entry, so Back returns to
// Place (coordinator row 2026-11-14); a return visit's or a link's own opening does not. The way back
// made outside history (an Undo to Place, Start over) leaves that entry, as "Your place" does. Started
// by main.ts beside watchPools (the page's history, not one of start()'s effects). Returns the disposer.
export function watchSteps(): () => void {
  try { shown = ppOf(history.state); st = stOf(history.state) ?? newStart(); } catch { /* no history: nothing pushed */ }
  let was = step.peek();
  return effect(() => {
    const now = step.value;
    if (was === 'place' && now === 'palette') {
      if (arrivalStep) arrivalStep = false;
      else if (leaving) paletteWaits = true; // after the Back on its way (pushWaiting)
      else untracked(() => pushEntry('palette'));
    } else if (was === 'palette' && now === 'place') {
      paletteWaits = false;
      // A sheet open over the palette (an Undo pressed in its foot) closes in the same update: its
      // entry goes with the palette's (fix round 1, b1a2-6).
      if (sheet.peek()) sheet.value = null;
      if (!leaving) untracked(() => leaveEntry('palette')); // false once a move back already left it
    }
    was = now;
  });
}

// Every sheet opens through here, so what the last one was opened for never leaks into the next.
// Share and Download are not sheets (no entry).
const SHEET_KINDS: readonly SheetKind[] = ['details', 'swap', 'find', 'paste', 'place'];
let opened = 0;
export function openSheet(kind: SheetKind, id: PlantId | null = null, target: Partial<SheetFor> = {}): void {
  if (SHEET_KINDS.includes(kind) && !onEntry('sheet')) pushEntry('sheet');
  batch(() => { sheetTarget.value = { ...FOR_NOTHING, ...target }; sheet.value = { kind, id, n: ++opened }; });
}
// Find (PP-C c1; boards Find, FillHole): the one route into it, from "Add plants", "Find plants",
// "See all N plants", a hole's Find and Place's "Add a plant by name"; a hole's opener passes the
// SheetFor (views/palette/NextStep.tsx openFillers), the others nothing.
// It asks for the verdict rule too (pf hand-off): opened from Place before the palette page ever
// showed, Find would otherwise wait for verdicts that nobody asked for (verdictsReady).
export const openFind = (target: SheetFor = FOR_NOTHING): void => { wantVerdict(); openSheet('find', null, target); };
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
// focus: the plants Undo brings back; the first one's control takes the focus after Undo (W4), in
// `from`, the region of the control that raised the toast, when it is still there (focus.ts focusPlant).
export interface ToastLine { id: number; text: string; undo: (() => void) | null; action: ToastAction | null; where: ToastWhere; focus: PlantId[]; from: Element | null }
export const toast = signal<ToastLine | null>(null);
const TOAST_MS = 12_000; // long enough to reach Undo with a keyboard or a screen reader
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 1;
export function showToast(text: string, undo: (() => void) | null = null, action: ToastAction | null = null, focus: PlantId[] = []): void {
  const from = noteToastOpener();
  const line: ToastLine = { id: toastSeq++, text, undo, action, where: sheet.peek() !== null ? 'sheet' : 'page', focus, from };
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

// Undo's snapshot: the fields state/schema.ts marks `undo` (the view: Undo of a list pasted on Place
// goes back to Place), the plant lists, and the save as it was with the held flag (state/save.ts
// markSave), so an Undo back to a held page puts the reader's save back exactly (F2, R2-1).
export const snapshot = () => ({ ...state.snapshot(), save: markSave() });
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
  showToast(text, () => { undoAfter = null; undoSave(before.save, () => state.restore(before)); }, action, focus);
}
// (The effect that ends the offer starts in start(), at the end of this file.)

// Remove (details, the plant list): its cells are free again (the gap stays), it is left out of a new
// suggestion, and Undo brings back the consortium as it was.
export function removeMember(id: PlantId): void {
  const before = snapshot(), name = nameById(id);
  batch(() => {
    held.value = false;
    members.value = without(before.members, [id]);
    removed.value = [...without(before.removed, [id]), id];
    if (before.guests[id]) { const g = { ...before.guests }; delete g[id]; guests.value = g; }
  });
  offerUndo(T('details.removed', { name }), before, null, [id]);
}
// Swap: the new plant takes the old one's place in the order; the old one is left out of a new
// suggestion.
export function swapMember(oldId: PlantId, newId: PlantId): void {
  const before = snapshot(), a = nameById(oldId), b = nameById(newId);
  batch(() => {
    held.value = false;
    members.value = before.members.map((x) => (x === oldId ? newId : x)).filter((x, i, all) => all.indexOf(x) === i);
    removed.value = [...without(before.removed, [newId, oldId]), oldId];
    if (before.guests[oldId]) { const g = { ...before.guests }; delete g[oldId]; guests.value = g; }
  });
  offerUndo(T('swapped', { a, b }), before, null, [oldId]);
}
// Add: plants chosen by hand join (a new suggestion is built around them). from: guests, each with
// the climate whose list it comes from ("Add anyway", A9). warned: plants added that carry a misfit or
// a serious conflict ("Add all" from a paste, 2026-10-28 "Scale build" row): the toast says "n added
// with a warning" with Show (the first one's details).
// On Place, an add (search or paste) leaves the view alone and is saved at once (owner 2026-11-15).
// Each of the three is a plant change: the page owns the save from here (state/save.ts).
// text: the toast's own words (the Next step names the plant it added), else paste.added's count;
// the warned count follows either.
export function addMembers(ids: PlantId[], from: Partial<Record<PlantId, ClimateZone>> = {}, { warned = [], text: said }: { warned?: PlantId[]; text?: string } = {}): void {
  const before = snapshot();
  const fresh = ids.filter((id, i) => ids.indexOf(id) === i && !before.members.includes(id));
  if (!fresh.length) return;
  batch(() => {
    held.value = false;
    members.value = [...before.members, ...fresh];
    removed.value = without(before.removed, fresh);
    // The guests change only when a guest joins (a new object would rebuild every guest's record).
    // (On Place the grower stays there, each plant listed under "What grows there already": b1a review
    // r1 conformance-2; "Show my palette" opens the palette.)
    if (fresh.some((id) => from[id])) {
      const g = { ...before.guests };
      for (const id of fresh) if (from[id]) g[id] = from[id];
      guests.value = g;
    }
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
  // The verdict rule's chunk (the range checks with it), asked for once the location has a climate.
  effect(() => {
    if (siteClimate.value) wantVerdict();
  });
  // Offline (architecture 9): the page says so; what is loaded still works.
  if (typeof navigator !== 'undefined' && typeof addEventListener === 'function') {
    offline.value = navigator.onLine === false;
    // Back online, a verdict chunk refused meanwhile is asked for again in place, here, so no view
    // needs a listener of its own for it (b1bc-8a).
    // Not when no retry can work (verdictNeedsReload): the views offer Reload then.
    addEventListener('online', () => { offline.value = false; if (verdictFailed.peek() && !verdictNeedsReload.peek()) retryVerdict(); });
    addEventListener('offline', () => { offline.value = true; });
  }
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
