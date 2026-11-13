// The consortium page's one store (frozen seam, design check §6): every piece of state is a signal,
// and pool, matrix and flags are computed from them, so views re-render by reading, with no hand
// render loop. Views read and set these signals; only the actions a stream adds write several at once.
// Renaming or removing a signal is a seam change for the coordinator; streams may add actions and,
// inside the computed bodies, the core calls they own (matrix: S1 lib/consortium/matrix.ts; flags:
// S1 conflicts and site).
import { batch, computed, effect, signal } from '@preact/signals';
import type { ClimateZone, Flag, FlagContext, Interaction, JobId, MarkContext, MarkProvider, Matrix, PhaseOrd, PlantId, Scenario, SiteLocation, SiteLookup as CoreLookup, Stratum, Taxon } from '../../lib/consortium/index.ts';
import { buildMatrix, countryStatus, DEFAULT_SCENARIO, flagsOf, loadMarkProviders, needsMarkProviders, suggest } from '../../lib/consortium/index.ts';
import type { RangeRule } from './views/pool/pool.tsx';
import type { SiteLookup as ReaderLookup } from '../../lib/climate/index.ts';
import type { LoadFailure, PlantSource } from '../../lib/consortium/source.ts';
import { P, T, nameOf } from './strings.ts';
import { state } from './state/schema.ts';

// Where the country came from: the reader chose it, a link carried it, the page guessed it from
// the browser's language (shown as a guess, never assumed), or (P5 S5b) the site location gave it
// ("from your location"; in a link only with "include my location").
export type CountrySource = 'chosen' | 'link' | 'guess' | 'location';
export interface Country { code: string | null; source: CountrySource | null }
// Which view fills the main area once a climate is chosen (Start comes first).
export type View = 'start' | 'matrix' | 'side' | 'jobs' | 'list';
// The open dialog, if any: what it shows and for which plant (null for sheets about no one plant).
export type SheetKind = 'details' | 'swap' | 'add' | 'search' | 'paste' | 'share' | 'download';
// n: which opening this is (openSheet counts them), so a dialog's late close event closes its own
// sheet only, never one opened since (Escape closes the <dialog> at once and fires `close` a task later).
export interface Sheet { kind: SheetKind; id: PlantId | null; n: number }
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';
export interface Load { status: LoadStatus; error: LoadFailure | null }

export { DEFAULT_SITE } from './state/schema.ts';

// ---- state ----
// The consortium's fields are declared once in state/schema.ts (what each is, whether Undo, the save
// and the link hold it, who watches it); their signals are re-exported here under their names.
export type { Consortium } from './state/schema.ts';
// climate, country, site; the plant lists members (in the order added), kept (pinned: a new suggestion
// keeps them), removed (taken out: a new suggestion leaves them out), guests (from another climate's
// list, A9) and crops (the crop examples the reader ticked on Start); the stage the side view, stepper
// and print show; the view; setAside (see below).
export const { climate, country, site, crops, members, kept, removed, guests, view, stage, setAside } = state.signals;
export const sheet = signal<Sheet | null>(null);
// While Start shows (view 'start'), the signals above are the Start draft: the picked card, its
// crops and site answers (and, on the consortium's own card, its plants, which Suggest and a paste
// build on). The consortium shown before Change site is then in setAside, with its own site
// answers, country and stage; null: none. Only the
// commit actions turn the draft into the consortium (memory.ts); the save mirrors the consortium.
export const load = signal<Load>({ status: 'idle', error: null });
// P5 (commit 0 seam): where the site is. S5b writes it (device location, place search, map pick, a
// link's `o=`); S5c (range check, nearest lists), S5d (future check) and S5e (native here, soil
// likely) read it. null: no location given, the manual climate choice as before.
export const location = signal<SiteLocation | null>(null);
// The future check's scenario (S5d may expose a control); SSP2-4.5 by default (owner row).
export const scenario = signal<Scenario>(DEFAULT_SCENARIO);
// The climate reader's lookup (src/lib/climate) must stay assignable to the core's view of it.
const readerFitsCore = (l: ReaderLookup): CoreLookup => l;
void readerFitsCore;

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
// Each climate's plants as PlantSource.pool returned them, cached by climate once read.
export const pools = signal<Partial<Record<ClimateZone, Taxon[]>>>({});
// Each climate's interactions (PlantSource.interactions), read with its pool (S1).
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
// The range rule (core range.ts, owner answer 2) arrives with the pool feature chunk, loaded only once
// the site location has a climate, so it stays off the first run (decision row "Island JavaScript
// budget for P5"). The page asks it nothing without one.
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
const withRule = <T>(p: Promise<T>): Promise<T> => (siteClimate.peek() && !rangeRule.peek() && rangeLoad ? Promise.all([p, rangeLoad]).then(([x]) => x) : p);
// Whether the location gave a climate (core siteToday is non-null; inlined to keep the rule off the first run).
export const siteClimate = computed(() => !!location.value?.lookup?.climate?.periods.length);
effect(() => {
  if (!siteClimate.value || rangeLoad) return;
  rangeLoad = import('./views/pool/pool.tsx').then((m) => { rangeRule.value = m.rangeRule; }, (err: unknown) => {
    console.error(err);
    rangeBroken.value = true;
    showToast(T('range.unavailable'), null, { label: T('load.reload'), run: () => globalThis.location.reload() });
  });
});
// What suggestions and lists draw from (P5 S5c, owner answer 2): the pool without the plants outside
// their observed range at the site location (core range.ts withinRange); the pool itself without one.
// Members stay: a plant added anyway is never dropped from a list it is in.
export const fitPool = computed<Taxon[] | null>(() => {
  const p = pool.value, rule = rangeRule.value;
  return p && (rule ? rule.withinRange(p, location.value, members.value) : p);
});

// The guests as plants: each with its home climate's placement and `from` set (A9), once that
// climate's pool is read.
export const guestTaxa = computed<Taxon[]>(() => {
  const out: Taxon[] = [];
  for (const [id, from] of Object.entries(guests.value)) {
    const t = from ? pools.value[from]?.find((x) => x.id === id) : undefined;
    if (t && from) out.push({ ...t, from });
  }
  return out;
});
// The guest climates whose plant list is not read yet: while any is, guests from it are missing from
// memberTaxa, the matrix and the flags, and "Suggest plants" waits (suggestMembers returns false).
export const guestsPending = computed<ClimateZone[]>(() => {
  const out: ClimateZone[] = [];
  for (const from of Object.values(guests.value)) if (from && !pools.value[from] && !out.includes(from)) out.push(from);
  return out;
});
// Members memberTaxa leaves out, never silently: `loading` while their list is read (a guest climate
// in guestsPending, or the chosen climate's pool), `unlisted` once read and not in it.
export const missingMembers = computed<{ loading: PlantId[]; unlisted: PlantId[] }>(() => {
  const own = pool.value, loading: PlantId[] = [], unlisted: PlantId[] = [];
  const found = new Set(memberTaxa.value.map((t) => t.id));
  for (const id of members.value) {
    if (found.has(id)) continue;
    const from = guests.value[id];
    if (!own || (from && !pools.value[from])) loading.push(id);
    else unlisted.push(id);
  }
  return { loading, unlisted };
});
// The members as plants, in order: the climate's own, or a guest's home record. Ids not at hand are
// left out here and listed in missingMembers (the views say so).
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
// The strata × phases matrix of the members on this site (core matrix.ts).
export const matrix = computed<Matrix | null>(() => {
  const c = climate.value, p = fitPool.value;
  if (!c || !p) return null;
  // P5 S5c: with a site location, a cell's "N fit" leaves out plants outside their observed range.
  return buildMatrix(c, p, memberTaxa.value, site.value);
});
// What the plant marks read (core marks.ts plantMarks; views/PlantMarks.tsx renders them).
// A climate the site location suggests (P5 owner answer 1; S5b writes it): its card shows checked,
// but store.climate stays unset until the reader confirms.
export const proposedClimate = signal<ClimateZone | null>(null);
// Whether that proposal came from the saved site looked up again (not the reader locating): only such
// a proposal goes when a consortium opens (memory.ts restore; seam review round 4, 2).
export const proposedFromSave = signal(false);
export const markContext = computed<MarkContext>(() => ({ climate: climate.value, location: location.value, scenario: scenario.value, site: site.value }));
// The mark providers (core mark-providers.ts, their own chunk): none until a mark can show (a site
// location, or a climate the export does not curate), then loaded once. Off the first run (decision
// row "Island JavaScript budget for P5").
export const markProviders = signal<readonly MarkProvider[]>([]);
export const wantsMarkProviders = computed(() => needsMarkProviders(markContext.value, source.value?.info().climates ?? []));
// The providers' chunk did not load (seam review 6): the range, future and estimate marks it would show
// are missing, so a notice with Reload says so wherever members show (Matrix.tsx Notices) while marks
// are wanted, with one toast; as for the range rule, the import is not tried again on this page.
const marksBroken = signal(false);
export const marksFailed = computed(() => marksBroken.value && wantsMarkProviders.value);
effect(() => {
  if (!wantsMarkProviders.value || markProviders.peek().length || marksBroken.peek()) return;
  loadMarkProviders().then((list) => { markProviders.value = list; }, (err: unknown) => {
    console.error(`Consortium: the plant marks did not load: ${(err as Error).message}`);
    if (marksBroken.peek()) return;
    marksBroken.value = true;
    showToast(T('marks.unavailable'), null, { label: T('load.reload'), run: () => globalThis.location.reload() });
  });
});
// The warnings on members: conflicts, site misfits, invasive and toxicity (core suggest.ts flagsOf).
export const flags = computed<Flag[]>(() => {
  if (!pool.value) return [];
  return flagsOf(memberTaxa.value, flagContext.value);
});

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
      load.value = { status: 'failed', error: 'damaged' };
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
  try { prev?.(); } catch (err) { console.error(`Consortium data: closing the previous database: ${(err as Error).message}`); }
  source.value = next;
  closeCurrent = next ? close : null;
}

// Keeps the chosen climate's pool and every guest list's pool read as soon as the database is open,
// so Start works while the plant list loads. Re-runs only when the source, the climate or the guests
// change (never on a pool arriving, so a failed read is not retried in a loop). Returns the disposer.
export function watchPools(): () => void {
  return effect(() => {
    if (!source.value) return;
    const c = climate.value;
    if (c) void loadPool(c);
    for (const from of new Set(Object.values(guests.value))) if (from) void loadPool(from);
  });
}

// "Suggest plants": a new suggestion around the kept plants and Main crops (which become kept),
// leaving out removed plants (core suggest.ts). Needs the climate's pool and every guest climate's
// (a kept guest must count); false, changing nothing, while any is not read (guestsPending).
export function suggestMembers(): boolean {
  const p = pool.value;
  if (!p || guestsPending.value.length) return false;
  const keep = [...new Set([...crops.value, ...kept.value])];
  const rule = rangeRule.value;
  // Nothing fits the site: no suggestion (it could only be an empty matrix); Start shows why.
  if (rule?.none(p, location.value)) return false;
  // A borrowed pool unfiltered (no site climate, or the rule's chunk failed): no suggestion, since only
  // the range filter fits it to a place (UX audit fix 1; fix review 29b709e, 2).
  if ((!siteClimate.value || !rule) && p.some((t) => t.estimate)) return false;
  const s = suggest(rule ? rule.withinRange(p, location.value, keep) : p, { ...flagContext.value, kept: keep, crops: crops.value, removed: removed.value, guests: guestTaxa.value });
  kept.value = keep;
  members.value = s.members;
  return true;
}

// ---- sheets: the one opener (H3, H7, H11, H12; seam review X1, X2) ----

// What a sheet was opened for. Add reads it: a cell or a run of cells of one layer ("+ Add" in a free
// cell, "Show them anyway" on a blocked cell or run), a job ("Find a soil feeder"), and `anyway`:
// every plant of the cell, misfits included and flagged, where "+ Add" lists only the plants that fit.
// A job's stage gap (Jobs: "Find a soil feeder for Years 15–25 → 60 years on") is a job with a run of
// stages in any layer: stratum null.
export interface CellSpan { stratum: Stratum | null; from: PhaseOrd; to: PhaseOrd }
export interface SheetFor { cell: CellSpan | null; job: JobId | null; anyway: boolean }
export const FOR_NOTHING: SheetFor = { cell: null, job: null, anyway: false };
export const sheetCell = signal<SheetFor>(FOR_NOTHING);
// Every sheet opens through here, so what the last one was opened for never leaks into the next.
let opened = 0;
export function openSheet(kind: SheetKind, id: PlantId | null = null, target: Partial<SheetFor> = {}): void {
  batch(() => { sheetCell.value = { ...FOR_NOTHING, ...target }; sheet.value = { kind, id, n: ++opened }; });
}
export const closeSheet = (): void => { sheet.value = null; };

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
  if (toastTimer) clearTimeout(toastTimer);
  const line: ToastLine = { id: toastSeq++, text, undo, action, where: sheet.peek() !== null ? 'sheet' : 'page', focus };
  toast.value = line;
  toastTimer = setTimeout(() => { if (toast.peek()?.id === line.id) toast.value = null; }, TOAST_MS);
}
export function hideToast(): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
  toast.value = null;
}

// ---- edits (Remove, Keep, Swap, Add), each undoable ----

// A plant as the consortium has it (a guest with its home placement), else the climate's list, else
// another climate's list already read.
export function taxonOf(id: PlantId): Taxon | null {
  const m = memberTaxa.value.find((t) => t.id === id);
  if (m) return m;
  const own = pool.value?.find((t) => t.id === id);
  if (own) return own;
  for (const [zone, list] of Object.entries(pools.value)) {
    const t = list?.find((x) => x.id === id);
    if (t) return { ...t, from: zone as ClimateZone };
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
// changed the consortium (a pin, a new suggestion, another climate): any change hides the toast.
// The fields whose change ends the offer (endsUndo or plants in state/schema.ts): the plant lists and
// the climate.
const SNAP_KEYS = state.lists.endsUndo;
let undoAfter: ReturnType<typeof state.peek<(typeof SNAP_KEYS)[number]>> | null = null;
function offerUndo(text: string, before: Snapshot, action: ToastAction | null = null, focus: PlantId[] = []): void {
  undoAfter = state.peek(SNAP_KEYS);
  showToast(text, () => { undoAfter = null; state.restore(before); }, action, focus);
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

// Remove (details, the plant list): its cells are free again (the gap stays), it is left out of a new
// suggestion, and Undo brings back the consortium as it was.
export function removeMember(id: PlantId): void {
  const before = state.snapshot(), name = nameById(id);
  batch(() => {
    members.value = without(before.members, [id]);
    kept.value = without(before.kept, [id]);
    crops.value = without(before.crops, [id]);
    removed.value = [...without(before.removed, [id]), id];
    if (before.guests[id]) { const g = { ...before.guests }; delete g[id]; guests.value = g; }
  });
  offerUndo(T('details.removed', { name }), before, null, [id]);
}
export function toggleKeep(id: PlantId): void {
  const k = kept.peek();
  kept.value = k.includes(id) ? without(k, [id]) : [...k, id];
}
// Swap: the new plant takes the old one's place in the order (and its pin); the old one is left out
// of a new suggestion. A main crop is never swapped from the dialog (owner row).
export function swapMember(oldId: PlantId, newId: PlantId): void {
  const before = state.snapshot(), a = nameById(oldId), b = nameById(newId);
  batch(() => {
    members.value = before.members.map((x) => (x === oldId ? newId : x)).filter((x, i, all) => all.indexOf(x) === i);
    if (before.kept.includes(oldId)) kept.value = before.kept.map((x) => (x === oldId ? newId : x));
    removed.value = [...without(before.removed, [newId, oldId]), oldId];
    if (before.guests[oldId]) { const g = { ...before.guests }; delete g[oldId]; guests.value = g; }
  });
  offerUndo(T('swapped', { a, b }), before, null, [oldId]);
}
// Add: plants chosen by hand join and are kept (a new suggestion keeps them). from: guests, each with
// the climate whose list it comes from ("Add anyway", A9). warned: plants added without being asked
// about a misfit or a serious conflict ("Add all" from a paste, 2026-10-28 "Scale build" row): the
// toast says "n added with a warning" with Show (the first one's details).
// On Start, a paste builds on the draft and opens it as the consortium (a commit, like Suggest).
export function addMembers(ids: PlantId[], from: Partial<Record<PlantId, ClimateZone>> = {}, { warned = [] }: { warned?: PlantId[] } = {}): void {
  const before = state.snapshot();
  const fresh = ids.filter((id, i) => ids.indexOf(id) === i && !before.members.includes(id));
  if (!fresh.length) return;
  batch(() => {
    members.value = [...before.members, ...fresh];
    kept.value = [...before.kept, ...fresh.filter((id) => !before.kept.includes(id))];
    removed.value = without(before.removed, fresh);
    const g = { ...before.guests };
    for (const id of fresh) if (from[id]) g[id] = from[id];
    guests.value = g;
    // A list pasted on Start opens its consortium (Share, Print, the address; X3).
    if (view.peek() === 'start') view.value = 'matrix';
  });
  const flagged = warned.filter((id) => fresh.includes(id));
  const text = P('paste.added', fresh.length) + (flagged.length ? ` ${P('paste.addedWarn', flagged.length)}` : '');
  offerUndo(text, before, flagged.length ? { label: T('paste.show'), run: () => openSheet('details', flagged[0]) } : null);
}
