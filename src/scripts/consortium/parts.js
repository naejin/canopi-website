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
// one; only the reader's own pick says "chosen by you", a restored save says "from your last
// consortium": core-fix review 3, m-2), and, for a country GRIIS has no list for, the no-list reason beside it, never instead (m1).
export function countryWhy(W, { country, source, checked }) {
  if (!country) return [];
  const from = W.T({ guess: 'countryGuessed', link: 'countryLinked', saved: 'countrySaved' }[source] ?? 'countryChosen');
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

// The live announcement after the reader chooses a country: "Warnings now for {country}" only for a
// country GRIIS has a list for; otherwise that its invasive status is not checked there (m-1).
export function countryAnnouncement(W, { country, checked }) {
  if (!country) return W.T('warningsNone');
  // The locale's own full stop (。 in zh and ja), taken from its "Warnings now" sentence (n3).
  const stop = W.T('warningsNow', { country: '' }).slice(-1);
  return checked ? W.T('warningsNow', { country: W.country(country) }) : capFirst(W.T('invStatusNotChecked', { country: W.country(country) }), W.lang) + stop;
}

const countriesOf = (inv) => [...new Set(inv.map((x) => x.country))];

// What a card (and its print row) says about invasiveness besides the chosen country's own flag
// (invHere): nothing once a country is chosen (owner, 2026-10-28: a card shows only that country's
// warning, and the counts move to details). For a country GRIIS has no list for, "not checked in
// {country}" is the same for every plant, so it is said once per view (the country line, the result's
// sub-line, the print head) and in details, never as a chip ahead of a plant's own warnings
// (coordinator, m-2). With no country, the soft count of distinct countries (n3). A taxon nobody
// checked (inv null) is in the "Not checked yet" chip instead.
export function invasiveCardNote(W, { country, inv }) {
  if (country) return null;
  const n = inv ? countriesOf(inv).length : 0;
  return n ? { cls: 'soft', text: W.P('invCount', n) } : null;
}

// The details' invasive items besides the chosen country's own warning: "Not checked in {country}"
// for a country GRIIS has no list for; the countries it is recorded invasive in; "not recorded
// invasive in any country checked by the global register (GRIIS)" (never "anywhere", never with
// "(checked)": m4; GRIIS is then in the plant's sources: logic.js invasiveSourceIds, m-6); or not
// checked at all. Each is null when it does not apply.
export function invasiveDetails(W, { country, checked, inv }) {
  const name = country ? W.country(country) : '';
  const list = inv?.length ? countriesOf(inv) : [];
  return {
    notChecked: country && !checked && inv != null ? { title: W.T('invNotChecked', { country: name }), text: W.T('d.invNotChecked', { country: name }) } : null,
    list: list.length ? { title: W.P('d.invList', list.length), countries: list.map(W.country).sort((a, b) => a.localeCompare(b, W.lang)) } : null,
    none: inv && !inv.length ? { title: W.T('d.invNone'), checkedMark: false } : null,
    unknown: inv == null ? { title: W.T('unkInv'), text: W.T('d.invUnk') } : null,
  };
}
