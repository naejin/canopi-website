// pf-b's board palettes and their figures (v14 pf-b commit 0). The boards' figures are never written
// into a test: each is re-derived through the engine on the installed release, at the board's inputs
// (the 0W scenario cases of scripts/fixtures/consortium-scenarios.json: seville-board, kiambu-8,
// kiambu-8-goal-3, kiambu-200, kumasi-today). The page computes the lanes, holes, thin spots, verdicts
// and flags through the store (the engine's one path); the Warnings and fit lines come from weigh.ts
// fitGroups over the same verdicts and flags, read here in node.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tool } from './p5-helpers.mjs';
import { linkOf, verdictsSettled } from './pf-helpers.mjs';

const SCENARIOS = JSON.parse(readFileSync(new URL('../fixtures/consortium-scenarios.json', import.meta.url), 'utf8'));
export const scenario = (id) => {
  const c = SCENARIOS.cases.find((x) => x.id === id);
  assert.ok(c, `scenario case ${id}`);
  return c;
};

// The board's lookup at a scenario place (as scripts/consortium-scenarios.mjs inputsOf builds it).
const lookupOf = (name, country) => {
  const p = SCENARIOS.places[name];
  assert.ok(p, `scenario place ${name}`);
  return { lat: p.lat, lon: p.lon, climate: { cellLat: p.lat, cellLon: p.lon, distanceCells: 0, periods: p.periods }, soil: p.soil ?? null, regions: { wgsrpdL3: null, isoA2: country } };
};
const COUNTRY = { kiambu: 'KE', kumasi: 'GH', 'seville-board': 'ES', seville: 'ES' };

// A board palette: the scenario case's members of its list, from a link, at the case's place (its
// figures as the scenario file has them), the goal set, the country chosen (the invasive check).
export async function boardPalette(id, { width = 1280, lang = 'en', theme = null, ...opts } = {}) {
  const c = scenario(id);
  const hash = await linkOf(c.input.list, c.input.members.length, { ids: c.input.members });
  const page = await tool({ hash, width, lang, ...opts });
  if (theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  const n = c.input.members.length;
  assert.ok(await page.waitForFunction((k) => window.__ctTest?.store?.members.value.length === k, { timeout: 30_000 }, n).then(() => true, () => false), `the case's ${n} plants`);
  const country = COUNTRY[c.input.place] ?? null;
  await page.evaluate((loc, code, goal) => {
    const { store } = window.__ctTest;
    store.location.value = loc;
    if (code) store.country.value = { code, source: 'chosen' };
    store.setPlantsPerJob(goal);
  }, { lat: SCENARIOS.places[c.input.place].lat, lon: SCENARIOS.places[c.input.place].lon, source: 'map', label: c.input.place, lookup: lookupOf(c.input.place, country) }, country, c.input.goals?.plantsPerJob ?? 2);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  return page;
}

// The figures of the open palette, through the engine: names in palette order, the lanes (counts per
// time span, thin spots, plants not checked), the open holes, the thin spots, and each member's light.
export const figures = (page) => page.evaluate(() => {
  const s = window.__ctTest.store;
  const name = (t) => t.names?.en || t.canonical_name;
  const taxa = s.memberTaxa.value;
  return {
    ids: taxa.map((t) => t.id),
    names: Object.fromEntries(taxa.map((t) => [t.id, name(t)])),
    stratum: Object.fromEntries(taxa.map((t) => [t.id, t.stratum?.value ?? null])),
    lanes: s.lanes.value.map((l) => ({ kind: l.kind, key: l.job ?? l.stratum, counts: l.counts, thin: l.thin, unchecked: l.unchecked ?? [] })),
    holes: s.openHoles.value.map((h) => ({ id: h.id, kind: h.kind, job: h.job ?? null, stratum: h.stratum ?? null })),
    thin: s.thinSpots.value.length,
    goal: s.plantsPerJob.value,
    levels: Object.fromEntries([...(s.memberVerdicts.value ?? new Map())].map(([id, v]) => [id, v.level])),
    tox: Object.fromEntries(s.flags.value.filter((x) => x.kind === 'toxicity').map((x) => [x.id, x.level])),
    openThin: s.thinSpots.value.filter((h) => h.state === 'open').length,
  };
});

// The Warnings and fit lines (weigh.ts fitGroups) over the page's verdicts and flags. Before pf-b
// writes fitGroups, the call fails "board: …", so the expected-fail markers match.
export async function fitOf(page) {
  const weigh = await import('../../src/lib/consortium/weigh.ts');
  assert.ok(typeof weigh.fitGroups === 'function', 'board: weigh.ts fitGroups (the Warnings and fit lines)');
  const { taxa, verdicts, flags } = await page.evaluate(() => {
    const s = window.__ctTest.store;
    return { taxa: s.memberTaxa.value.map((t) => ({ id: t.id })), verdicts: [...(s.memberVerdicts.value ?? new Map())], flags: s.flags.value };
  });
  return weigh.fitGroups(taxa, new Map(verdicts), flags);
}

// The years' standing count in one time span (a member stands when it is not outside its range and
// its span holds the span): the light lanes' counts, summed.
export const standing = (f, at) => f.lanes.filter((l) => l.kind === 'light').reduce((n, l) => n + l.counts[at], 0);
// A lane by its job or light level.
export const laneOf = (f, key) => f.lanes.find((l) => l.key === key);
// The plants whose jobs are not checked (the union of the job lanes' unchecked).
export const uncheckedOf = (f) => new Set(f.lanes.filter((l) => l.kind === 'job').flatMap((l) => l.unchecked));

// The members doing each job that count toward its holes (core jobs.ts jobsOf, the engine's rule, run
// here on the page's taxa; a member outside its climate range counts for no job, as holes.ts
// laneCounts: c2 R1).
export async function jobCounts(page) {
  const { jobsOf } = await import('../../src/lib/consortium/jobs.ts');
  const taxa = await page.evaluate(() => { const s = window.__ctTest.store; return s.memberTaxa.value.filter((t) => s.memberVerdicts.value?.get(t.id)?.level !== 'outside').map((t) => ({ id: t.id, role: t.role, functions: t.functions })); });
  const out = {};
  for (const t of taxa) for (const j of jobsOf(t)) out[j] = (out[j] ?? 0) + 1;
  return out;
}

// What a grower reads inside the section a heading opens (the heading's nearest section), by element
// kind or role, never a class: `pick` runs in the page on that section and returns plain data.
const SECTION_OF = (h) => {
  const hs = [...document.querySelectorAll('main h2, main h3, main h4')];
  const el = hs.find((e) => e.textContent.replace(/\s+/g, ' ').trim().startsWith(h));
  return el ? (el.closest('section, article, aside, [role="region"]') ?? el.parentElement) : null;
};
export const inSection = (page, heading, pick, arg = null) => page.evaluate((h, f, p, a) => {
  const s = new Function(`return (${f})`)()(h);
  return s ? new Function(`return (${p})`)()(s, a) : null;
}, heading, SECTION_OF.toString(), pick.toString(), arg);
