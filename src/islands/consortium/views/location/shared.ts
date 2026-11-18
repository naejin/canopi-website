// What the place step's first-run shell (views/LocationSlot.tsx, views/place/Place.tsx) and its lazy
// chunk (views/location/location.tsx) share (pf-c): the climates opener, the field's focus, and the
// place in words. In the first run; it imports nothing lazy.
import { signal } from '@preact/signals';
import type { SiteLocation } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import { coords } from '../kit/names.ts';

// The laptop layout (min-width 960px, the project's desktop breakpoint): PlaceDesk and LocDesk draw some
// controls apart from the phone boards (labelled buttons under the field, the settled place row, the
// "We read" card, the country line at the end). Follows the window.
const wide = typeof matchMedia === 'function' ? matchMedia('(min-width: 960px)') : null;
export const desk = signal(!!wide?.matches);
wide?.addEventListener?.('change', (e) => { desk.value = e.matches; });

// The climate cards (board ClimateHand), one link away: their own screen, opened by the reader and
// closed by "‹ Your place" or by a choice (BC15).
export const cardsAsked = signal(false);
export function closeClimates(): void {
  cardsAsked.value = false;
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-place-climates], [data-location-search]')?.focus()));
}
export function openClimates(): void {
  cardsAsked.value = true;
  // The link leaves with the press: the focus goes to the card Tab would land on (A25: never <body>).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const card = (q: string) => document.querySelector<HTMLInputElement>(`#ct-climates ${q}`);
    (card('input:checked') ?? card('input'))?.focus();
  }));
}

// "Search again" / "Not this place? Search again": back to the field, its words selected.
export function focusField(): void {
  const f = document.querySelector<HTMLInputElement>('[data-location-search]');
  f?.focus();
  f?.select();
}

// "near Kiambu" (board Arrivals: welcome back, a shared link over yours, a guide over the save): the
// place's short name, its first part, inside a sentence; null when the place has no name.
export const shortPlace = (l: Pick<SiteLocation, 'label' | 'source'> | null | undefined): string | null =>
  l?.label && l.source !== 'link' ? T('location.nearLower', { place: l.label.split(', ')[0] }) : null;

// "Near Kiambu, Kenya", "Your location", or the link's place; lower: inside a sentence ("Still using near …").
export function placeWords(l: Pick<SiteLocation, 'label' | 'source' | 'lat' | 'lon'>, lower = false): string {
  if (l.label || l.source === 'map') return T(lower ? 'location.nearLower' : 'location.near', { place: l.label ?? coords(l.lat, l.lon) });
  return T(l.source === 'link' ? 'location.linkPlace' : lower ? 'location.hereLower' : 'location.here');
}
