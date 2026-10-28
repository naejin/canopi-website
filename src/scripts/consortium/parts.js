// The consortium tool's words about a plant's reasons and the reader's country, as the page shows
// them: pure (no DOM, no state), taking the page's words (makeWords in words.js), so
// scripts/consortium-country.test.mjs renders them with the real locale files.
// country: the chosen code or null; source: 'guess' | 'user' | 'link' | 'saved' | null; checked: GRIIS
// has a list for the country (manifest countries[code].invasive_checked).
import { esc, capFirst } from './words.js';

// A reason's text in the page language, else in English (marked).
export function textHTML(text, W, lang) {
  if (!text) return '';
  if (text[lang]) return esc(text[lang]);
  return `<span lang="en">${esc(text.en)}</span> <span class="muted">(${esc(W.T('inEnglish'))})</span>`;
}

// A card's reason: the first region's, always with its region ("Chosen for Europe: …"), and how many
// other regions of the climate chose the plant too (M2). Every reason is regional.
export function cardReasonHTML(t, W, lang) {
  const list = t.reasons ?? [];
  if (!list.length) return '';
  const r = list[0];
  const text = W.T('reasonCard', { region: `<span class="reason-region">${esc(W.region(r.region))}</span>`, reason: textHTML(r.text, W, lang) });
  return text + (list.length > 1 ? ` <span class="muted">· ${esc(W.P('moreRegions', list.length - 1))}</span>` : '');
}

// Every reason in details, each labelled with its region and all its sources (owner, 2026-10-28).
export function reasonsHTML(t, W, lang, sources) {
  const list = t.reasons ?? [];
  if (!list.length) return '';
  const src = (r) => W.list(r.sources.map((id) => sources[id]?.label ?? id));
  return `<ul class="reasons" role="list">${list.map((r) => `<li><p>${textHTML(r.text, W, lang)}</p><p class="muted">${esc(W.T('reasonFrom', { region: W.region(r.region), sources: src(r) }))}</p></li>`).join('')}</ul>`;
}

// The words beside the country chip: where the country came from, always (a guess always says it is
// one), and, for a country GRIIS has no list for, the no-list reason beside it, never instead (m1).
export function countryWhy(W, { country, source, checked }) {
  if (!country) return [];
  const from = W.T({ guess: 'countryGuessed', link: 'countryLinked' }[source] ?? 'countryChosen');
  return checked ? [from] : [from, W.T('countryNoList')];
}

// The country line: the chip (a country, or "No country" the reader chose), else one "Add your
// country" button; the reasons beside the chip; and with no country, the one line saying the counts
// are for every country (m3). It is the only such line and button in a view.
export function countryLineParts(W, { country, source, checked, noCountry }) {
  return {
    chip: country ? W.country(country) : noCountry ? W.T('countryNone') : null,
    add: !country && !noCountry,
    why: countryWhy(W, { country, source, checked }),
    notes: country ? [] : [W.T('noCountryNote')],
  };
}

// The result's sub-line after the climate: the country the warnings use, or that it was not checked (m2).
export function warnWhere(W, { country, checked }) {
  if (!country) return '';
  return checked ? W.T('warningsFor', { country: W.country(country) }) : W.T('invStatusNotChecked', { country: W.country(country) });
}

// The print head's invasive part (m2).
export function printWhere(W, { country, checked }) {
  if (!country) return W.T('printCounts');
  return checked ? W.T('printWarnings', { country: W.country(country) }) : capFirst(W.T('invStatusNotChecked', { country: W.country(country) }), W.lang);
}

// What a card (and its print row) says about invasiveness besides the chosen country's own flag
// (invHere): nothing for a checked country, its count of countries moving to details (owner,
// 2026-10-28); "not checked in {country}" for a country GRIIS has no list for (m2); with no country,
// the soft count. A taxon nobody checked (inv null) is in the "Not checked yet" chip instead.
export function invasiveCardNote(W, { country, checked, inv }) {
  if (country && checked) return null;
  if (country) return inv == null ? null : { cls: 'unknown', text: capFirst(W.T('invStatusNotChecked', { country: W.country(country) }), W.lang) };
  return inv?.length ? { cls: 'soft', text: W.P('invCount', inv.length) } : null;
}

// The details' invasive items besides the chosen country's own warning: "Not checked in {country}"
// for a country GRIIS has no list for; the countries it is recorded invasive in; "not recorded
// invasive in any country GRIIS checked" (never "anywhere", never with "(checked)": m4); or not
// checked at all. Each is null when it does not apply.
export function invasiveDetails(W, { country, checked, inv }) {
  const name = country ? W.country(country) : '';
  return {
    notChecked: country && !checked && inv != null ? { title: W.T('invNotChecked', { country: name }), text: W.T('d.invNotChecked', { country: name }) } : null,
    list: inv?.length ? { title: W.P('d.invList', inv.length), countries: [...new Set(inv.map((x) => x.country))].map(W.country).sort((a, b) => a.localeCompare(b, W.lang)) } : null,
    none: inv && !inv.length ? { title: W.T('d.invNone'), checkedMark: false } : null,
    unknown: inv == null ? { title: W.T('unkInv'), text: W.T('d.invUnk') } : null,
  };
}
