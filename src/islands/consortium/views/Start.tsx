/** @jsxImportSource preact */
// View slot of stream S4: Start (design check A8, §5 Loading; mockup 01-start; owner rows "Climate
// first", "Main crops first", "Crop examples and guide 43", "v2 mockup choices").
// - The optional country line comes first, so the browser's guess is seen before it is used.
// - Then the climate cards, nothing chosen (never a default climate): Ready, Needs your location (a
//   climate that borrows plants, without a location: PoolSlot cardPill), or Not covered yet with
//   "Ask for this climate". Picking one writes the shared site climate (memory.chooseClimate).
// - Then "What do you mainly want to grow?" (up to three of the climate's food plants; examples by
//   rule, memory.cropExamples) and "Your site" (all four questions start at "Not sure").
// - "Suggest plants" (waits for the plant list while it loads), "Start empty and search", "Paste a list".
// Once a consortium is shown (store.view is not 'start'), Start shrinks to its head: the title with
// the count and climate, the site basis with "Change site" and "Start over", and the country line.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ClimateZone, PlantId, Site, SiteKey, Taxon } from '../../../lib/consortium/index.ts';
import { countryStatus, lights, MAX_CROPS, rooms, soils, waters } from '../../../lib/consortium/index.ts';
import { climate, country, crops, proposedClimate, kept, knownCountries, members, openSheet, pool, site, view } from '../store.ts';
import { P, T, pageLang } from '../strings.ts';
import { LocationSlot } from './LocationSlot.tsx';
import { PoolSlot, cardPill, hasList, suggestBlock } from './PoolSlot.tsx';
import {
  backToConsortium, canGoBack, changeSite, chooseClimate, chooseCountry, cropExamples, notices, pendingClimate, pendingSuggest, pickingCountry, plantName, requestSuggest, restoring, startEmpty, startMemory, startOver, zoneOf,
} from '../memory.ts';

// ---- page data (ConsortiumPage.astro #ct-data) ----
export interface StartData { zones: { id: string; label: string; places: string }[]; contact: string; site: string }
let pageData: { start: StartData; climates: string[] } | null = null;
export function page(): { start: StartData; climates: string[] } {
  if (!pageData) {
    try {
      const d = JSON.parse(document.getElementById('ct-data')?.textContent ?? '{}') as Partial<{ start: StartData; climates: string[] }>;
      pageData = { start: d.start ?? { zones: [], contact: '/', site: location.href }, climates: d.climates ?? [] };
    } catch {
      pageData = { start: { zones: [], contact: '/', site: '' }, climates: [] };
    }
  }
  return pageData;
}
export const zoneLabel = (z: ClimateZone | null): string => (z ? page().start.zones.find((x) => x.id === z.toLowerCase())?.label ?? z : '');

// ---- words ----
let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  try { regionNames ??= new Intl.DisplayNames([pageLang(), 'en'], { type: 'region' }); return regionNames.of(code) ?? code; } catch { return code; }
}
const options: Record<SiteKey, readonly string[]> = { light: lights, soil: soils, water: waters, room: rooms };
// "light: not sure · acid soil · …": what the matrix is based on.
export const basisLine = (s: Site): string => (['light', 'soil', 'water', 'room'] as SiteKey[]).map((k) => T(`site.basis.${k}.${s[k]}`)).join(' · ');

// Search folding: lower case, Latin/Greek/Cyrillic marks stripped (S1's A6 fold, kept small here so
// the start view does not pull the data adapter into the island chunk).
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/([\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}])\p{M}+/gu, '$1').normalize('NFC');
function cropSearch(list: readonly Taxon[], q: string, lang: string, skip: ReadonlySet<PlantId>, max = 8): Taxon[] {
  const f = fold(q.trim());
  if (!f) return [];
  const rank = (t: Taxon) => {
    let best = 9;
    for (const n of [plantName(t, lang), t.names.en ?? '', t.canonical_name]) {
      const x = fold(n);
      const at = x.indexOf(f);
      if (at === 0) best = Math.min(best, 0);
      else if (at > 0 && /[\s\-'’(]/.test(x[at - 1])) best = Math.min(best, 1);
    }
    return best;
  };
  return list.filter((t) => t.role === 'crop' && !skip.has(t.id)).map((t) => [t, rank(t)] as const).filter(([, r]) => r < 9)
    .sort((a, b) => a[1] - b[1] || plantName(a[0], lang).localeCompare(plantName(b[0], lang), lang)).slice(0, max).map(([t]) => t);
}

// ---- the country line ----
export function CountryLine() {
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
  // A link's climate shows at once while it loads (memory.pendingClimate). A location's suggestion
  // (store.proposedClimate, S5b) shows as proposed, not checked: a click on its card confirms it, as
  // the result line's "Use" button does (owner answer 1; review round 1, 6).
  const chosen = climate.value ?? pendingClimate.value;
  const proposed = chosen ? null : proposedClimate.value;
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

// ---- Main crops ----
function Crops({ zone }: { zone: ClimateZone }) {
  const list = pool.value;
  const lang = pageLang();
  const chosen = crops.value;
  const [q, setQ] = useState('');
  const examples = useMemo(() => (list ? cropExamples(list) : []), [list]);
  const byId = useMemo(() => new Map((list ?? []).map((t) => [t.id, t])), [list]);
  const full = chosen.length >= MAX_CROPS;
  const toggle = (id: PlantId) => {
    if (chosen.includes(id)) {
      crops.value = chosen.filter((x) => x !== id);
      kept.value = kept.value.filter((x) => x !== id);
    } else if (!full) {
      crops.value = [...chosen, id];
    }
  };
  const shown = [...chosen.map((id) => byId.get(id)).filter((t): t is Taxon => !!t), ...examples.filter((t) => !chosen.includes(t.id))];
  const hits = list ? cropSearch(list, q, lang, new Set(chosen)) : [];
  return (
    <section class="ct-step ct-panel" aria-labelledby="ct-crops-h">
      <h2 class="ct-step-title" id="ct-crops-h">{T('crops.question')}</h2>
      <p class="ct-muted ct-step-lede">{T('crops.intro', { max: MAX_CROPS, climate: zoneLabel(zone) })}</p>
      {!list ? <p class="status-line" aria-busy="true">{T('load.plants')}</p> : (
        <>
          <div class="ct-chips" role="group" aria-label={T('crops.forExample')}>
            <span class="ct-muted ct-chips-label">{T('crops.forExample')}</span>
            {shown.map((t) => (
              <button type="button" class="ct-chip" aria-pressed={chosen.includes(t.id) ? 'true' : 'false'} disabled={!chosen.includes(t.id) && full} onClick={() => toggle(t.id)}>
                {plantName(t, lang)} <i class="ct-sci">{t.canonical_name}</i>
              </button>
            ))}
          </div>
          <p class="ct-muted ct-crops-count" aria-live="polite">{full ? T('crops.limit', { max: MAX_CROPS }) : P('crops.count', chosen.length, { max: MAX_CROPS })}</p>
          <div class="ct-crop-search">
            <input type="search" value={q} aria-label={T('crops.search', { climate: zoneLabel(zone) })} placeholder={T('crops.search', { climate: zoneLabel(zone) })} disabled={full} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
          </div>
          {q.trim() && (
            hits.length ? (
              <ul class="ct-hits" aria-label={T('crops.results')}>
                {hits.map((t) => <li><button type="button" class="ct-hit" onClick={() => { toggle(t.id); setQ(''); }}>{plantName(t, lang)} <i class="ct-sci">{t.canonical_name}</i></button></li>)}
              </ul>
            ) : <p class="ct-muted" role="status">{T('crops.noHit', { q: q.trim(), climate: zoneLabel(zone) })}</p>
          )}
        </>
      )}
    </section>
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
      {n.guideMissing && <p class="ct-notice" role="status">{T('start.guideMissing', { name: n.guideMissing, climate: zoneLabel(climate.value) })}</p>}
      {t && <p class="ct-muted" role="status">{T('start.guideKept', { name: plantName(t, pageLang()) })}</p>}
    </>
  );
}

function Head() {
  const n = members.value.length;
  return (
    <div class="ct-result-head">
      <h2 class="ct-result-title">{T('start.yours')} <span class="ct-muted ct-result-sub">{P('start.count', n)} · {zoneLabel(climate.value)}</span></h2>
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
  const z = climate.value ?? pendingClimate.value;
  const waiting = pendingSuggest.value || restoring.value;
  return (
    <div class="ct-start">
      <CountryLine />
      <StartNotices />
      <LocationSlot />
      <Climates />
      {z && <PoolSlot zone={z} />}
      {z && hasList(z) && (
        <>
          <Crops zone={z} />
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
