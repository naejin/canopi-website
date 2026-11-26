/** @jsxImportSource preact */
// Place step entry: renders Steps, arrival notices (PlaceNotices), NorthStarArrival, and status line.
import { signal } from '@preact/signals';
import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { SiteLocation } from '../../../../lib/palette/index.ts';
import { siteEditLines } from '../../../../lib/palette/index.ts';
import { climate, location as siteLocation, memberTaxa, siteEdits, view } from '../../store.ts';
import { T } from '../../strings.ts';
import { say } from '../../words.ts';
import { linkPlace, restoring } from '../../state/persist.ts';
import { locationAtStart, notices } from '../../state/restore.ts';
import { openingArrival } from '../../state/arrival.ts';
import { answering, backToPlace, placeSaid, startOver, useLinkPlace, useOwnPlace } from '../../state/draft.ts';
import { pendingSuggest } from '../../state/suggest-wait.ts';
import { coords, nameOf, zoneName } from '../kit/names.ts';
import { Steps } from './steps.tsx';
import { NorthStarArrival } from '../north-star/NorthStarArrival.tsx';
import { openPlantPool } from '../../state/studio.ts';

function focusField(): void {
  const f = document.querySelector<HTMLInputElement>('[data-location-search]');
  f?.focus();
  f?.select();
}

const shortPlace = (l: Pick<SiteLocation, 'label' | 'source'> | null | undefined): string | null =>
  l?.label && l.source !== 'link' ? T('location.nearLower', { place: l.label.split(', ')[0] }) : null;

function placeWords(l: Pick<SiteLocation, 'label' | 'source' | 'lat' | 'lon'>, lower = false): string {
  if (l.label || l.source === 'map') return T(lower ? 'location.nearLower' : 'location.near', { place: l.label ?? coords(l.lat, l.lon) });
  return T(l.source === 'link' ? 'location.linkPlace' : lower ? 'location.hereLower' : 'location.here');
}

type Tone = 'neutral' | 'warning' | 'danger';
const ICONS: Record<string, string> = {
  check: 'M4.5 10.5l3.5 3.5 7.5-8',
  share: 'M14 6.5a2 2 0 1 0 0-.1M6 10a2 2 0 1 0 0-.1M14 13.5a2 2 0 1 0 0-.1M7.8 9l4.4-2M7.8 11l4.4 2',
  pin: 'M10 17.5s5.5-5.2 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.1 5.5 9.3 5.5 9.3ZM10 6.3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z',
  leaf: 'M4 16c0-7 4-11 12-12 0 8-4 12-11 12M4 16l6-6',
  alert: 'M10 3.5 17.5 16.5h-15ZM10 8.5v3.5M10 14.2v.1',
  clock: 'M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM10 6.5V10l2.5 1.5',
};
const icon = (name: keyof typeof ICONS) => <svg aria-hidden="true" class="ct-arrival-icon" width="18" height="18" viewBox="0 0 20 20"><path d={ICONS[name]} /></svg>;
const bold = (text: string) => text.split(/\*\*/).map((bit, i) => (i % 2 ? <strong>{bit}</strong> : bit));
type Rank = 'primary' | 'secondary' | 'quiet';
const act = (label: string, run: () => unknown, rank: Rank, attrs: Record<string, unknown> = {}) => (
  <button type="button" class={rank === 'quiet' ? 'link-button ct-link' : `button ${rank === 'primary' ? 'button-primary' : 'button-secondary'} ct-small`} onClick={() => void run()} {...attrs}>{label}</button>
);

function Notice({ id, tone = 'neutral', mark, text, children }: { id: string; tone?: Tone; mark: keyof typeof ICONS; text: string; children?: ComponentChildren }) {
  return (
    <div class={`ct-arrival is-${tone}`} data-place-notice={id}>
      <p class="ct-arrival-text">{icon(mark)}<span>{bold(text)}</span></p>
      {children && <p class="ct-arrival-acts">{children}</p>}
    </div>
  );
}

const laterPlace = signal(false);
const near = () => shortPlace(siteLocation.value);

function PlaceNotices() {
  const n = notices.value;
  const guideId = n.guidePlant;
  const guide = guideId ? memberTaxa.value.find((t) => t.id === guideId) : null;
  const theirs = linkPlace.value;
  const busy = answering.value;
  const onPalette = view.value !== 'start';
  const z = climate.value;
  const mine = near();
  const opened = openingArrival();
  const linkOpen = onPalette && opened.kind === 'link' && !n.unreadable && !n.failed;
  const ownLookup = !!siteLocation.value?.lookup && siteLocation.value?.source !== 'link';
  const noPlace = linkOpen && !theirs && !laterPlace.value && !siteLocation.value?.lookup && !locationAtStart.value;
  const checkedAgainst = linkOpen && !theirs && !!mine && ownLookup;
  const givePlace = () => { backToPlace(); setTimeout(focusField, 50); };
  const values = siteEditLines(siteEdits.value).map(say).join(', ');
  const items: Arrival[] = [];
  const notice = (id: string, text: string, props: { tone?: Tone; mark: keyof typeof ICONS }, children?: ComponentChildren) =>
    items.push({ id, said: heard(text), view: <Notice id={id} text={text} {...props}>{children}</Notice> });
  if (n.unreadable) {
    notice('unreadable', T('place.unreadable'), { tone: 'danger', mark: 'alert' }, act(T('place.newPalette'), startOver, 'secondary'));
  }
  if (n.period) notice('period', T('place.period'), { tone: 'warning', mark: 'clock' });
  if (n.failed) notice('failed', T('share.failed'), { tone: 'danger', mark: 'alert' }, act(T('location.tryAgain'), () => location.reload(), 'secondary'));
  if (n.guideMissing && z) notice('guideMissing', T('start.guideMissing', { name: n.guideMissing, climate: zoneName(z) }), { tone: 'warning', mark: 'leaf' }, act(T('place.findPlant'), () => { openPlantPool({ tab: 'all' }); view.value = 'matrix'; }, 'secondary'));
  if (guide && z) {
    notice('guide', T('place.guidePlant', { name: nameOf(guide), climate: zoneName(z) }), { mark: 'leaf' }, !siteLocation.value?.lookup ? act(T('place.givePlace'), givePlace, 'primary') : undefined);
  }
  if (noPlace && z) {
    notice('noPlace', T('place.noPlace', { list: T('place.line.list', { climate: zoneName(z) }) }), { tone: 'warning', mark: 'pin' }, <>
      {act(T('place.givePlace'), givePlace, 'primary')}
      {act(T('place.later'), () => { laterPlace.value = true; }, 'quiet')}
    </>);
  }
  if (checkedAgainst) notice('checkedAgainst', T(values ? 'place.checkedAgainst' : 'place.checkedAgainstBare', { place: placeWords(siteLocation.value!, true) }), { mark: 'pin' }, act(T('place.changePlace'), backToPlace, 'quiet'));
  if (theirs) {
    notice('linkPlace', T(values ? 'place.linkPlace' : 'place.linkPlaceBare', { place: siteLocation.value ? placeWords({ ...siteLocation.value, source: 'map' }, true) : T('location.linkPlace'), values }), { mark: 'pin' }, <>
      {act(T('place.useIt'), () => useLinkPlace(), 'primary', { 'data-use-link-place': '', disabled: busy, 'aria-busy': busy ? 'true' : undefined })}
      {act(T('place.useMine'), useOwnPlace, 'secondary', { 'data-use-own-place': '', disabled: busy })}
    </>);
  }
  return (
    <>
      <Announcer items={items} />
      <div class="ct-place-notices">{items.map((x) => <Fragment key={x.id}>{x.view}</Fragment>)}</div>
    </>
  );
}

type Arrival = { id: string; said: string | null; view: ComponentChildren };
const heard = (text: string) => text.replace(/\*\*/g, '');
const SAID_MS = 7000;
function Announcer({ items }: { items: readonly Arrival[] }) {
  const heardIds = useRef(new Set<string>());
  const [said, setSaid] = useState<{ ids: readonly string[]; text: string }>({ ids: [], text: '' });
  const spoken = items.filter((x) => x.said);
  const key = spoken.map((x) => x.id).join(' ');
  useEffect(() => {
    const fresh = spoken.filter((x) => !heardIds.current.has(x.id));
    heardIds.current = new Set(spoken.map((x) => x.id));
    if (fresh.length) setSaid({ ids: fresh.map((x) => x.id), text: fresh.map((x) => x.said).join(' ') });
  }, [key]);
  useEffect(() => {
    if (!said.text) return;
    const t = setTimeout(() => setSaid({ ids: [], text: '' }), SAID_MS);
    return () => clearTimeout(t);
  }, [said]);
  const live = said.ids.every((id) => spoken.some((x) => x.id === id));
  return <p class="ct-sr" role="status">{live ? said.text : ''}</p>;
}

export function Place() {
  const waiting = pendingSuggest.value || restoring.value;
  const start = view.value === 'start';
  return (
    <>
      <Steps />
      <PlaceNotices />
      {start ? <NorthStarArrival /> : null}
      <p class="status-line ct-place-status" role="status">{start && waiting ? T('load.plants') : placeSaid.value}</p>
    </>
  );
}
