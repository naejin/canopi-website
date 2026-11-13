// Start's draft and the reader's moves around it (stream S4; E6 S2 split it out of memory.ts): the
// climate card and the country the reader picks, Change site (the consortium set aside, a draft
// seeded from it), Back to your consortium, Start over and Start empty; and the Main crops examples.
// The consortium and the draft are two states (persist.ts): the draft never changes the consortium or
// the save.
import { batch, computed, signal } from '@preact/signals';
import type { ClimateZone, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import * as store from '../store.ts';
import { focusView } from '../focus.ts';
import { state as schema } from './schema.ts';
import { adoptPending, attempt, memory, own, siteId, writeSave, COUNTRY_STORE, NO_COUNTRY, SITE_CLIMATE } from './persist.ts';
import { notices, NO_NOTICES } from './restore.ts';
import { letGo } from './lookups.ts';

// The country picker on the country line is open.
export const pickingCountry = signal(false);

// The reader picks a climate on Start: the shared site climate is written (climate-ux; v1 setClimate).
// With a consortium set aside, the draft follows the card: the consortium's own card seeds it from
// the consortium again, another card starts it empty (its crops and plants are that card's).
export function chooseClimate(z: ClimateZone): void {
  const aside = store.view.peek() === 'start' ? own() : null;
  batch(() => {
    store.climate.value = z;
    if (aside) schema.write(schema.valuesOf(schema.lists.plants, aside.climate === z ? aside : undefined));
  });
  memory.write(SITE_CLIMATE, siteId(z));
  attempt(() => { document.documentElement.dataset.climate = siteId(z); });
}

// The reader chooses a country (null: "No country"); kept on this device, apart from the consortium.
export function chooseCountry(code: string | null): void {
  store.country.value = { code, source: 'chosen' };
  memory.write(COUNTRY_STORE, code ?? NO_COUNTRY);
  pickingCountry.value = false;
}

// Change site, Start over, Start empty: the "not read" note goes, and a link's location goes with
// its consortium (review round 2, 4), its lookup dropped (round 3, 2: no line, hold or later write).
const dropLinkLocation = () => { const link = store.location.peek()?.source === 'link'; letGo(link); if (link) store.location.value = null; };
// Change site: the consortium set aside, Start's draft seeded from it.
export function changeSite(): void {
  batch(() => {
    dropLinkLocation();
    store.setAside.value = own();
    store.view.value = 'start';
  });
}

// Start over: the consortium goes, from the store, the save and the address; the climate, the site
// and the country stay.
export function startOver(): void {
  writeSave(null);
  batch(() => {
    store.setAside.value = null;
    schema.write(schema.valuesOf(schema.lists.plants));
    store.closeSheet();
    store.view.value = 'start';
    dropLinkLocation();
    notices.value = { ...NO_NOTICES };
  });
}

// "Back to your consortium" from Start: the draft discarded, the consortium shown in its own climate
// again, whatever card was chosen since "Change site", with its own site answers, country and stage
// (F1, R2-4, R4-3); the focus goes to the view (W4).
export const canGoBack = computed(() => store.view.value === 'start' && store.setAside.value !== null);
export function backToConsortium(): void {
  const aside = own();
  batch(() => {
    if (aside) {
      // Its climate and plants (chooseClimate seeds the plants from it), then the rest of it.
      chooseClimate(aside.climate);
      schema.write(aside);
    }
    store.view.value = 'matrix';
  });
  focusView();
}

// "Start empty and search": an empty consortium and S3's search sheet.
export function startEmpty(): void {
  adoptPending();
  batch(() => {
    dropLinkLocation();
    store.members.value = [];
    store.view.value = 'matrix';
    store.openSheet('search');
  });
}

// ---- ported from v1 crops.js: the Main crops examples ----

// One-tap examples for "What do you mainly want to grow?" (owner row "Crop examples and guide 43",
// 2026-10-29): a rule, not a hand-picked list. Among the climate's food plants (role crop), ranked by
// the best known (named in the most languages), then the most edible, then by scientific name: the
// same every time. Then picked for variety: at most one plant per genus, and each round takes the best
// of a layer not yet shown, so the examples spread across the layers before a layer repeats. The
// crops already chosen are left out.
export function cropExamples(pool: readonly Taxon[], n = 4, chosen: readonly PlantId[] = []): Taxon[] {
  const known = (t: Taxon) => Object.keys(t.names).length, skip = new Set(chosen);
  const ranked = pool.filter((t) => t.role === 'crop' && !skip.has(t.id)).sort((a, b) =>
    known(b) - known(a) || (b.traits.edibility_rating ?? 0) - (a.traits.edibility_rating ?? 0) || (a.canonical_name < b.canonical_name ? -1 : a.canonical_name > b.canonical_name ? 1 : 0));
  const out: Taxon[] = [], genera = new Set<string>();
  while (out.length < n) {
    const layers = new Set<string>();
    let took = false;
    for (const t of ranked) {
      if (out.length >= n) break;
      const g = t.genus || t.canonical_name.split(' ')[0], s = t.stratum?.value ?? '';
      if (out.includes(t) || genera.has(g) || layers.has(s)) continue;
      out.push(t); genera.add(g); layers.add(s); took = true;
    }
    if (!took) break;
  }
  return out;
}

// The name a plant shows in the page language, else English, else its scientific name.
export const plantName = (t: Pick<Taxon, 'names' | 'canonical_name'>, lang: string): string =>
  t.names[lang as keyof Taxon['names']] ?? t.names.en ?? t.canonical_name;
