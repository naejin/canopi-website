/** @jsxImportSource preact */
// Stream S5c (a thin shell on Start, under the climate cards): what Start says about the chosen
// climate's plant list. hasList(zone): the climate has plants to suggest from: its own curated list,
// or a nearest list it borrows (core placement.ts NEAREST_LISTS) once the site location has a climate,
// since only the range rule makes a borrowed pool coherent for a real place (decision row "P5 fixes
// from the UX audit" (1)). Start then shows the crops, the site questions and Suggest, and the card
// says Ready. needsSite(zone): a borrowed climate without one; this shell says the climate needs the
// site's location, with a button to the location step, and no palette is offered. A link or a saved
// consortium on such a climate still opens with its plants, marked as estimates (range-marks.ts
// estimate.noSite). Without any list, the panel's "Not covered yet" notice. The panel
// (views/pool/pool.tsx, a P5 feature chunk; decision row "Island JavaScript budget for P5") loads
// for a climate that borrows its plants once the site has a climate, or when it has no list:
// which lists are borrowed, how many plants the site's observed climate keeps, and the "nothing
// fits" state. Without a location, a curated climate shows nothing here, as in P2. (store.ts
// siteClimate; the range rule loads with its own chunk, store.ts rangeRule. The rule of "can Suggest
// now" and the list a climate has: rules/suggest-block.ts.)
import { effect } from '@preact/signals';
import type { ClimateZone } from '../../../lib/consortium/index.ts';
import { hasPlants, zoneOf } from '../../../lib/consortium/index.ts';
import { climate, location, pool, rangeFailed, rangeRule, siteClimate } from '../store.ts';
import * as rule from '../rules/suggest-block.ts';
import type { SuggestBlock, SuggestScene } from '../rules/suggest-block.ts';
import { pendingClimate } from '../state/persist.ts';
import { backToConsortium, canGoBack } from '../state/draft.ts';
import { pendingSuggest } from '../state/suggest-wait.ts';
import { T } from '../strings.ts';
import { lazyPart } from './lazy.tsx';
import { page } from './kit/page.ts';
import { zoneName } from './kit/names.ts';

const panel = lazyPart(() => import('./pool/pool.tsx').then((m) => m.PoolPanel), { quiet: true });

const curated = (): ClimateZone[] => page().climates.flatMap((c) => zoneOf(c) ?? []);
// Nothing fits (the chosen climate's list, at the site; rules/suggest-block.ts nothingFits).
const nothingFits = (): boolean => rule.nothingFits(pool.value, location.value, rangeRule.value);
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
export const cardPill = (z: ClimateZone): { label: string; ready: boolean } =>
  hasList(z) ? { label: T('start.climate.ready'), ready: true } : { label: needsSite(z) ? T('range.needsSite.pill') : T('start.climate.notYet'), ready: false };
// The location step (S5b, LocationSlot): its first control, else its heading.
const toLocation = () => {
  const heading = document.getElementById('ct-loc-h');
  if (!heading) return;
  let target = heading.closest('section')?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? null;
  if (!target) { heading.tabIndex = -1; target = heading; }
  target.scrollIntoView({ block: 'center' });
  target.focus();
};
// The one rule for "can Suggest now" (seam review 1; rules/suggest-block.ts): why a Suggest for climate
// z would refuse, or null when it can act. Start's "Suggest plants" and the empty matrix's "Suggest a
// start" both read it, and show the reason (WhyNoSuggest) in place of a button that could only refuse;
// both call state/suggest-wait.ts requestSuggest, which waits for what is still being read.
export const suggestBlock = (z: ClimateZone): SuggestBlock | null => rule.suggestBlock(z, scene);
// A Suggest pressed while the rule loaded, for a site where nothing fits: cleared, so the reader stays
// on Start with the nothing-fits state (store.ts suggestMembers refuses it too).
// So is one for a climate that needs the site's location or the range rule (it would run unasked once
// they arrive), and one pressed for another climate than the one now chosen (fix review 29b709e, 1).
const shownZone = () => climate.value ?? pendingClimate.value;
effect(() => {
  const z = shownZone();
  if (pendingSuggest.value && (nothingFits() || (z && suggestBlock(z)))) pendingSuggest.value = false;
});
let lastZone: ClimateZone | null = null;
effect(() => {
  const z = shownZone();
  if (z !== lastZone && lastZone !== null && z !== null) pendingSuggest.value = false;
  if (z !== null) lastZone = z;
});

// The panel also says "Not covered yet" for a climate with no list at all (it never happens with the
// real export, which curates a nearest list for every climate).
// The range rule's chunk did not load (store.ts rangeFailed): say so here, the panel being that chunk.
export function PoolSlot({ zone }: { zone: ClimateZone }) {
  if (rangeFailed.value && hasPlants(zone, curated())) return <RangeUnavailable zone={zone} />;
  return needsSite(zone) ? <NeedsSite zone={zone} /> : !hasList(zone) || !curated().includes(zone) || siteClimate.value ? <panel.View zone={zone} /> : null;
}
function RangeUnavailable({ zone }: { zone: ClimateZone }) {
  return (
    <p class="ct-notice" role="status" data-range-unavailable>
      {needsRule(zone) ? T('range.unavailableBorrowed', { climate: zoneName(zone) }) : T('range.unavailable')} <button type="button" class="button button-secondary ct-small" onClick={() => globalThis.location.reload()}>{T('load.reload')}</button>
    </p>
  );
}
// Why there is no Suggest (the empty matrix; Start shows the same reasons through PoolSlot above).
export function WhyNoSuggest({ zone, block }: { zone: ClimateZone; block: SuggestBlock }) {
  return block === 'needsSite' ? <NeedsSite zone={zone} /> : block === 'needsRule' ? <RangeUnavailable zone={zone} /> : null;
}

// The needs-location line (Start, and the empty matrix's Suggest: hand-off H-S5c-6, Matrix.tsx EmptyNotice).
function NeedsSite({ zone }: { zone: ClimateZone }) {
  return (
    <p class="ct-notice" role="status" data-needs-site>
      {T('range.needsSite', { climate: zoneName(zone) })}{' '}
      <button type="button" class="button button-secondary ct-small" onClick={toLocation}>{T('range.needsSite.go')}</button>{' '}
      <a href={page().start.contact}>{T('start.uncovered.ask')}</a>
      {canGoBack.value && <> <button type="button" class="link-button ct-link" onClick={backToConsortium}>{T('start.back')}</button></>}
    </p>
  );
}
