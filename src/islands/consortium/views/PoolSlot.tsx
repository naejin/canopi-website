/** @jsxImportSource preact */
// Stream S5c (a thin shell on Start, under the climate cards): what Start says about the chosen
// climate's plant list. hasList(zone): the climate has plants to suggest from: its own curated list,
// or a nearest list it borrows (core placement.ts NEAREST_LISTS) once the site location has a climate,
// since only the range rule makes a borrowed pool coherent for a real place (decision row "P5 fixes
// from the UX audit" (1)). Start then shows the crops, the site questions and Suggest, and the card
// says Ready. needsSite(zone): a borrowed climate without one; this shell says the climate needs the
// site's location, with a button to the location step, and no palette is offered. A link or a saved
// consortium on such a climate still opens with its plants, marked as estimates (core verdict-line.ts:
// the estimate term, "give your location to check it"). Without any list, the panel's "Not covered yet" notice. The panel
// (views/pool/pool.tsx, a P5 feature chunk; decision row "Island JavaScript budget for P5") loads
// for a climate that borrows its plants once the site has a climate, or when it has no list:
// which lists are borrowed, the count line (PP-B b1b: "{n} of the {m} plants on the nearest lists fit
// your place today", from the verdicts) and the "nothing fits" state. Without a location, a curated
// climate shows nothing here, as in P2 (every verdict would be "not checked"). Place's form and the
// "Your place" sheet mount it always; Place's head only for a needs-site, needs-rule or no-list reason. (store.ts
// siteClimate; the range checks come with the verdict rule, store.ts verdictRule. The rule of "can Suggest
// now" and the list a climate has: rules/suggest-block.ts.)
import { effect, untracked } from '@preact/signals';
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { hasPlants } from '../../../lib/consortium/index.ts';
import { curatedClimates, pool, poolVerdicts, rangeFailed, retryVerdict, siteClimate, verdictNeedsReload } from '../store.ts';
import * as rule from '../rules/suggest-block.ts';
import type { SuggestBlock, SuggestScene } from '../rules/suggest-block.ts';
import { climateChosen } from '../state/persist.ts';
import { dropSuggest, pendingSuggest } from '../state/suggest-wait.ts';
import { backToPlace } from '../state/draft.ts';
import { cardsAsked, focusField } from './location/shared.ts';
import { T } from '../strings.ts';
import { lazyPart } from './lazy.tsx';
import { retryableImport } from '../../../lib/consortium/index.ts';
import { page } from './kit/page.ts';
import { zoneName } from './kit/names.ts';

// While its chunk loads, with a site climate, the count line's place already says "Checking…" (the
// panel's first line, so it never appears late; PP-B b1b); a failed chunk shows the failed line with
// Reload (pre-push review 1).
const Checking = () => (siteClimate.value
  ? <p class="status-line ct-pool-count" role="status" data-pool-count="checking">{T('place.count.checking')}</p> : null);
const panel = lazyPart(retryableImport(() => import('./pool/pool.tsx'), (m) => m.PoolPanel), { loading: Checking });

// The climates with plants of their own: the store's one owner, which suggestMembers reads too.
const curated = (): ClimateZone[] => curatedClimates.value;
// Nothing fits (the chosen climate's list, at the site; rules/suggest-block.ts nothingFits).
const nothingFits = (): boolean => rule.nothingFits(pool.value, poolVerdicts.value);
// What the rule reads, from the store's signals: getters, so a view or effect calling these reads (and
// tracks) only the signals the rule reaches, and the range check over the pool runs only when asked.
const scene: SuggestScene = {
  get curated() { return curated(); },
  get siteClimate() { return siteClimate.value; },
  get rangeFailed() { return !!rangeFailed.value; },
  get nothingFits() { return nothingFits(); },
};
const needsSite = (z: ClimateZone): boolean => rule.needsSite(z, scene);
const needsRule = (z: ClimateZone): boolean => rule.needsRule(z, scene);
export const hasList = (z: ClimateZone): boolean => rule.hasList(z, scene);
// The card's pill (hand-off H-S5c-5: Start.tsx Climates reads it): Ready, Needs your location, or Not covered yet.
export const cardPill = (z: ClimateZone): { label: string; ready: boolean; site: boolean } =>
  hasList(z) ? { label: T('start.climate.ready'), ready: true, site: false } : needsSite(z) ? { label: T('range.needsSite.pill'), ready: false, site: true } : { label: T('start.climate.notYet'), ready: false, site: false };
// The location step (S5b, LocationSlot): its first control, else its heading.
// From the palette page or the climate cards (no location step on screen): back to Place, then its
// field (C3; the "Your place" sheet went with v13).
const toLocation = () => {
  const heading = document.getElementById('ct-loc-h');
  if (!heading) { cardsAsked.value = false; backToPlace(); requestAnimationFrame(() => requestAnimationFrame(focusField)); return; }
  let target = heading.closest('section')?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? null;
  if (!target) { heading.tabIndex = -1; target = heading; }
  target.scrollIntoView({ block: 'center' });
  target.focus();
};
// The one rule for "can Suggest now" (seam review 1; rules/suggest-block.ts): why a Suggest for climate
// z would refuse, or null when it can act. Start's "Suggest plants" reads it and shows the reason (the
// panel below) in place of a button that could only refuse; it calls state/suggest-wait.ts
// requestSuggest, which waits for what is still being read. (The empty matrix's "Suggest a start" and
// its WhyNoSuggest went in PP-B commit 0a'; b1a retargets them onto Place.)
export const suggestBlock = (z: ClimateZone): SuggestBlock | null => rule.suggestBlock(z, scene);
// A Suggest pressed while the rule loaded, for a site where nothing fits: cleared, so the reader stays
// on Start with the nothing-fits state (store.ts suggestMembers refuses it too).
// So is one for a climate that needs the site's location or the range rule (it would run unasked once
// they arrive), and one pressed for another climate than the one now chosen (fix review 29b709e, 1).
effect(() => {
  const z = climateChosen.value;
  if (pendingSuggest.value && (nothingFits() || (z && suggestBlock(z)))) untracked(dropSuggest);
});
let lastZone: ClimateZone | null = null;
effect(() => {
  const z = climateChosen.value;
  if (z !== lastZone && lastZone !== null && z !== null) untracked(dropSuggest);
  if (z !== null) lastZone = z;
});

// The panel also says "Not covered yet" for a climate with no list at all (it never happens with the
// real export, which curates a nearest list for every climate).
// A borrowed climate whose verdict chunk (the range checks with it) did not load (store.ts rangeFailed,
// rules/suggest-block.ts needsRule): say so here, in place of the panel, since only the range checks fit
// a borrowed list to a place. A curated climate keeps its panel, whose count line says "Could not
// check" with Retry (PP-B b1b; one failure state since PP-C c2 folded the range role into the verdict
// chunk); the panel's own chunk failing shows its failed line (lazy.tsx LoadFailed).
// head: the palette page's head (Place.tsx Head), which keeps the needs lines only (amendment 3): the
// needs-location and range-unavailable lines, and "Not covered yet" for a climate with no list; never
// the count line, which Place's form and the "Your place" sheet show. A guard, not a path any state
// reaches today: Head mounts this only for a needs-site, needs-rule (range rule failed) or no-list
// reason, each answered above before the panel (so no browser case can tell it apart; review b1bf-2).
export function PoolSlot({ zone, head = false }: { zone: ClimateZone; head?: boolean }) {
  if (needsRule(zone)) return <RangeUnavailable zone={zone} />;
  if (needsSite(zone)) return <NeedsSite zone={zone} />;
  if (head) return hasPlants(zone, curated()) ? null : <panel.View zone={zone} />;
  return !hasList(zone) || !curated().includes(zone) || siteClimate.value ? <panel.View zone={zone} /> : null;
}
// Try again in place; Reload, with words that say it, only when only a reload can work (A6,
// architecture 9).
function RangeUnavailable({ zone }: { zone: ClimateZone }) {
  const climate = zoneName(zone);
  return (
    <p class="ct-notice" role="status" data-range-unavailable>
      {verdictNeedsReload.value
        ? <>{T('range.unavailableBorrowed', { climate })} <button type="button" class="button button-secondary ct-small" onClick={() => globalThis.location.reload()}>{T('load.reload')}</button></>
        : <>{T('d.rangeUnavailable', { climate })} <button type="button" class="button button-secondary ct-small" onClick={() => retryVerdict()}>{T('details.tryAgain')}</button></>}
    </p>
  );
}
// The needs-location line (Start; hand-off H-S5c-6).
function NeedsSite({ zone }: { zone: ClimateZone }) {
  return (
    <p class="ct-notice" role="status" data-needs-site>
      {T('range.needsSite', { climate: zoneName(zone) })}{' '}
      <button type="button" class="button button-secondary ct-small" onClick={toLocation}>{T('range.needsSite.go')}</button>{' '}
      <a href={page().start.contact}>{T('start.uncovered.ask')}</a>
    </p>
  );
}
