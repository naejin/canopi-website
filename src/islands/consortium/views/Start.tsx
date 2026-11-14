/** @jsxImportSource preact */
// View slot of stream S4: Start (design check A8, §5 Loading; mockup 01-start; owner rows "Climate
// first", "v2 mockup choices"; the Main crops question went in PP-B commit 0a').
// - The optional country line comes first, so the browser's guess is seen before it is used.
// - Then the climate cards, nothing chosen (never a default climate): Ready, Needs your location (a
//   climate that borrows plants, without a location: PoolSlot cardPill), or Not covered yet with
//   "Ask for this climate". Picking one writes the shared site climate (state/draft.ts chooseClimate).
// - Then "Your site" (all four questions start at "Not sure").
// - "Suggest plants" (waits for the plant list while it loads), "Start empty and search", "Paste a list".
// Once a consortium is shown (store.view is not 'start'), Start shrinks to its head: the title with
// the count and climate, the site basis with "Change site" and "Start over", and the country line.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { ClimateZone, Site, SiteKey } from '../../../lib/consortium/index.ts';
import { countryStatus, lights, rooms, soils, waters, zoneOf } from '../../../lib/consortium/index.ts';
import { climate, country, proposedClimate, knownCountries, members, openSheet, pool, site, view } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { LocationSlot } from './LocationSlot.tsx';
import { PoolSlot, cardPill, hasList, suggestBlock } from './PoolSlot.tsx';
import { climateChosen, climateShown, restoring } from '../state/persist.ts';
import { notices } from '../state/restore.ts';
import { startMemory } from '../state/arrival.ts';
import { backToConsortium, canGoBack, changeSite, chooseClimate, chooseCountry, pickingCountry, startEmpty, startOver } from '../state/draft.ts';
import { pendingSuggest, requestSuggest } from '../state/suggest-wait.ts';
import { page } from './kit/page.ts';
import { markStart } from './kit/start-mark.ts';
import { basisLine, countryName, nameOf, zoneName } from './kit/names.ts';

// ---- words ----
const options: Record<SiteKey, readonly string[]> = { light: lights, soil: soils, water: waters, room: rooms };

// ---- the country line ----
function CountryLine() {
  const { code, source: from } = country.value;
  // The page's list until the database opens (store.knownCountries): the line is final in its first frame.
  const known = knownCountries.value;
  const status = countryStatus(code, known);
  const picking = pickingCountry.value;
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (picking) select.current?.focus(); }, [picking]);
  const sorted = [...known.keys()].map((c) => [c, countryName(c)] as const).sort((a, b) => a[1].localeCompare(b[1], pageLang()));
  const name = code ? countryName(code) : '';
  return (
    <div class="ct-country" data-ct="country">
      {code ? (
        <p class="ct-country-text">
          <span>{T('country.line')} <strong>{name}</strong> <span class="ct-muted">({T(from === 'guess' ? 'country.guessed' : from === 'link' ? 'country.linked' : from === 'location' ? 'country.fromLocation' : 'country.chosen')})</span></span>
          {status === 'unchecked' && <span class="ct-muted ct-country-note">{T('country.unchecked', { country: name })}</span>}
        </p>
      ) : (
        <p class="ct-country-text"><span>{T('country.line')}: <strong>{T('country.none')}</strong></span> <span class="ct-muted ct-country-note">{T('country.noneNote')}</span></p>
      )}
      {!picking && (
        <p class="ct-country-acts">
          {code && from === 'guess' && <button type="button" class="button button-secondary ct-small" onClick={() => chooseCountry(code)}>{T('country.use', { country: name })}</button>}
          <button type="button" class="link-button ct-link" aria-expanded="false" onClick={() => { pickingCountry.value = true; }}>{code ? T('country.change') : T('country.add')}</button>
          {code && <button type="button" class="link-button ct-link" onClick={() => chooseCountry(null)}>{T('country.none')}</button>}
        </p>
      )}
      {picking && (
        <p class="ct-country-pick">
          <label for="ct-country-select">{T('country.pick')}</label>
          <select id="ct-country-select" ref={select} value={code ?? ''} onChange={(e) => chooseCountry((e.currentTarget as HTMLSelectElement).value || null)}>
            <option value="">{T('country.none')}</option>
            {sorted.map(([c, n]) => <option value={c}>{n}</option>)}
          </select>
          <button type="button" class="link-button ct-link" onClick={() => { pickingCountry.value = false; }}>{T('country.cancel')}</button>
        </p>
      )}
    </div>
  );
}

// ---- the climate cards ----
function Climates() {
  // The one shown climate (state/persist.ts climateShown): the chosen one, else a link's while it loads,
  // else a location's suggestion (store.proposedClimate, S5b), shown as proposed, not checked: a click
  // on its card confirms it, as the result line's "Use" button does (owner answer 1; review round 1, 6).
  const shown = climateShown.value;
  const chosen = climateChosen.value;
  const proposed = shown.proposed ? shown.zone : null;
  // With a card proposed and none checked (review round 2, 5): Tab lands on the proposed card (the
  // others leave the tab order), and the arrows move the focus without checking a card; Space, Enter
  // or a click confirms one.
  const choose = (z: ClimateZone) => { proposedClimate.value = null; chooseClimate(z); };
  const keys = (e: KeyboardEvent) => {
    if (!proposed) return;
    const r = e.currentTarget as HTMLInputElement;
    if (e.key === 'Enter') { e.preventDefault(); r.click(); return; }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const all = [...r.closest('fieldset')!.querySelectorAll<HTMLInputElement>('input')];
    all[(all.indexOf(r) + (/[RD]/.test(e.key[5]) ? 1 : all.length - 1)) % all.length].focus();
  };
  return (
    <fieldset class="ct-step ct-climates">
      <legend class="ct-step-title">{T('start.climate.title')}</legend>
      <p class="ct-muted ct-step-lede">{T('start.climate.lede')}</p>
      <div class="ct-cards">
        {page().start.zones.map(({ id, label, places }) => {
          const z = zoneOf(id)!;
          // Ready, Needs your location (a borrowed climate without one), or Not covered yet (PoolSlot).
          const pill = cardPill(z);
          return (
            <label class={`ct-card${chosen === z ? ' is-chosen' : proposed === z ? ' is-proposed' : ''}`} data-proposed={proposed === z ? '' : undefined}>
              <input type="radio" name="ct-climate" value={id} checked={chosen === z} aria-labelledby={`ct-cl-${id}`} aria-describedby={`ct-cl-${id}-d`} tabIndex={proposed && proposed !== z ? -1 : undefined} onKeyDown={keys} onChange={() => choose(z)} />
              <span class="ct-card-name" id={`ct-cl-${id}`}>{label}</span>
              <span id={`ct-cl-${id}-d`} class="ct-card-desc">
                {proposed === z && <span class="ct-card-proposed">{T('location.proposed')}</span>}
                <span class={`ct-pill${pill.ready ? ' is-ready' : ''}`}>{pill.label}</span>
                <span class="ct-card-places">{places}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ---- Your site ----
function SiteQuestions() {
  const s = site.value;
  const set = (k: SiteKey, v: string) => { site.value = { ...site.value, [k]: v } as Site; };
  return (
    <section class="ct-step ct-panel" aria-labelledby="ct-site-h">
      <h2 class="ct-step-title" id="ct-site-h">{T('site.title')}</h2>
      <p class="ct-muted ct-step-lede">{T('site.intro')}</p>
      <div class="ct-site-grid">
        {(['light', 'soil', 'water', 'room'] as SiteKey[]).map((k) => (
          <fieldset class="ct-seg">
            <legend>{T(`site.q.${k}`)}</legend>
            <div class="ct-seg-row">
              {options[k].map((v) => (
                <label class={s[k] === v ? 'is-on' : ''}>
                  <input type="radio" name={`ct-site-${k}`} value={v} checked={s[k] === v} onChange={() => set(k, v)} />
                  <span>{T(`site.a.${k}.${v}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <p class="ct-muted ct-small-text">{T('site.roomHint')}</p>
    </section>
  );
}

function StartNotices() {
  const n = notices.value;
  const t = n.guideKept && pool.value?.find((x) => x.id === n.guideKept);
  return (
    <>
      {n.outdated && <p class="ct-notice" role="status">{T('share.outdated')}</p>}
      {n.cut && <p class="ct-notice" role="status">{T('share.cut')}</p>}
      {n.failed && <p class="ct-notice" role="status">{T('share.failed')}</p>}
      {n.oldSave && <p class="ct-notice" role="status">{T('start.oldSave')}</p>}
      {n.guideMissing && <p class="ct-notice" role="status">{T('start.guideMissing', { name: n.guideMissing, climate: zoneName(climate.value) })}</p>}
      {t && <p class="ct-muted" role="status">{T('start.guideKept', { name: nameOf(t) })}</p>}
    </>
  );
}

// Head and the guide notice name store.climate, not climateShown: a consortium (and a guide preset's
// notice) shows only under a chosen climate, where the two are the same.
function Head() {
  const n = members.value.length;
  return (
    <div class="ct-result-head">
      <h2 class="ct-result-title">{T('start.yours')} <span class="ct-muted ct-result-sub">{P('start.count', n)} · {zoneName(climate.value)}</span></h2>
      <p class="ct-basis">
        <span>{basisLine(site.value)}</span>
        <button type="button" class="link-button ct-link" onClick={changeSite}>{T('start.changeSite')}</button>
        <button type="button" class="link-button ct-link" onClick={startOver}>{T('start.over')}</button>
      </p>
      <LocationSlot compact />
      <CountryLine />
    </div>
  );
}

function StartView() {
  const z = climateChosen.value;
  const waiting = pendingSuggest.value || restoring.value;
  // The ct:start timing mark (F1a commit 0 seam, perf1), told on every render of the form; perf1 marks
  // once per page, after the paint. A plain call, not an effect: the empty seam costs the first run nothing.
  markStart();
  return (
    <div class="ct-start">
      <CountryLine />
      <StartNotices />
      <LocationSlot />
      <Climates />
      {z && <PoolSlot zone={z} />}
      {z && hasList(z) && (
        <>
          <SiteQuestions />
          <div class="ct-cta">
            {/* One rule for "can Suggest now" (PoolSlot suggestBlock): here only nothing-fits can block it, PoolSlot saying why. */}
            {!suggestBlock(z) && <button type="button" class="button button-primary" aria-busy={waiting ? 'true' : undefined} onClick={requestSuggest}>{T('start.suggest')}</button>}
            {canGoBack.value && <button type="button" class="button button-secondary" onClick={backToConsortium}>{T('start.back')}</button>}
            <button type="button" class="button button-secondary" onClick={startEmpty}>{T('start.empty')}</button>
            <button type="button" class="link-button ct-link" onClick={() => openSheet('paste')}>{T('start.paste')}</button>
          </div>
          {waiting && <p class="status-line" role="status">{T('load.plants')}</p>}
          <p class="ct-muted ct-small-text">{T('page.hypothesis')}</p>
        </>
      )}
    </div>
  );
}

export function Start() {
  // Before the first paint (a layout effect): the country guess, the stored climate and a link's
  // pending climate are drawn in the first frame, not swapped in after it (N2 layout shift).
  useLayoutEffect(() => { startMemory(); }, []);
  return view.value === 'start' ? <StartView /> : <Head />;
}
