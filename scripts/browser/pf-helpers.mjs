// Shared by the pf board specs (consortium-pf-a to -pf-f.browser.test.mjs; pf commit 0, 2026-11-17; d, e, f from 0W, 2026-11-18):
// the boards (.local/consortium/v2/f1a/mockups-v3/project/*.dc.html, owner-approved v12) read as tests.
// They check what the grower reads and does: the words on the page (the site's <main>, the tool's own
// head included), their order, the roles and names of the controls, and the state behind them through
// the test hook. Never a class name, never a source file.
//
// Every failing check says "board: …" (the word or element the board shows and the page lacks), so an
// expected-fail marker's reason is /board: / and a harness error (a timeout, a closed page) is never
// taken for the stated failure.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aria, axNodes, has, realDb } from './helpers.mjs';
import { atSite, tool } from './p5-helpers.mjs';
import { encodeLink } from '../../src/lib/consortium/state.ts';
import { TODAY_PERIOD } from '../../src/lib/consortium/source.ts';

export const BOARD = /board: /;

// Owner 2026-11-17 "Layer is light": the four light levels in reader text (emergent, high, medium, low).
export const LIGHT = ['Full sun', 'Mostly sun', 'Part shade', 'Shade'];
// The PP-B words the light words replace, and the bare strata, never in reader text.
export const OLD_LIGHT = /Needs full sun|Needs a lot of light|Grows in some shade|Grows in deep shade|\b(?:Emergent|High|Mid|Low) layer\b/;
// The job names of the boards (Main, MainMore), in their order.
export const JOBS = ['Feeds you', 'Feeds the soil', 'Makes mulch', 'Covers the ground', 'Brings helpers', 'Shelters and protects'];
// A hole title, one form everywhere (owner Q1): "Full sun: nobody in the first 3 years".
export const HOLE_TITLE = new RegExp(`^(?:${[...LIGHT, ...JOBS, 'Cooler months'].join('|')}): nobody\\b`);

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
// The page as the grower reads it: <main> (the tool's head, the island, the release line), one line.
export const pageText = (page) => page.evaluate(() => (document.querySelector('main')?.innerText ?? '').replace(/\s+/g, ' ').trim());
// The text of the open dialog, or ''.
export const dialogText = (page) => page.evaluate(() => (document.querySelector('dialog[open]')?.innerText ?? '').replace(/\s+/g, ' ').trim());

// Waits until <main> (or the open dialog with inDialog) says `words` (a string, or a RegExp).
export async function says(page, words, { timeout = 6000, inDialog = false } = {}) {
  const ok = await page.waitForFunction((w, re, d) => {
    const root = d ? document.querySelector('dialog[open]') : document.querySelector('main');
    const t = (root?.innerText ?? '').replace(/\s+/g, ' ');
    return re ? new RegExp(w, re).test(t) : t.includes(w);
  }, { timeout }, words instanceof RegExp ? words.source : words, words instanceof RegExp ? words.flags || 'u' : null, inDialog).then(() => true, () => false);
  assert.ok(ok, `board: the page does not say "${words instanceof RegExp ? words.source : words}"`);
}
export async function saysNot(page, words, why = '') {
  const t = await pageText(page);
  const hit = words instanceof RegExp ? words.test(t) : t.includes(words);
  assert.ok(!hit, `board: the page still says "${words instanceof RegExp ? (t.match(words)?.[0] ?? words.source) : words}"${why ? ` (${why})` : ''}`);
}
// The phrases appear in this order on the page.
export async function inOrder(page, phrases) {
  const t = await pageText(page);
  let at = -1;
  for (const p of phrases) {
    const i = t.indexOf(p, at + 1);
    assert.ok(i >= 0, `board: the page does not say "${p}"`);
    assert.ok(i > at, `board: "${p}" comes before the phrase above it`);
    at = i;
  }
}

// A control by role and exact accessible name (a string) or pattern (RegExp), from the accessibility tree.
export async function control(page, role, name, timeout = 4000) {
  const ok = (n) => n.role === role && (name instanceof RegExp ? name.test(n.name ?? '') : n.name === name);
  for (const until = Date.now() + timeout; ;) {
    const hit = (await axNodes(page)).find(ok);
    if (hit || Date.now() > until) {
      assert.ok(hit, `board: no ${role} "${name instanceof RegExp ? name.source : name}"`);
      return hit;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
}
// Presses the control with that role and exact name (asserted first, so a missing one is the board's failure).
export async function press(page, role, name, timeout = 4000) {
  assert.ok(await has(page, aria(role, name), timeout), `board: no ${role} "${name}"`);
  await page.locator(aria(role, name)).click();
}
// Every name of a role on the page (or in the open dialog).
export const names = async (page, role) => (await axNodes(page)).filter((n) => n.role === role).map((n) => n.name ?? '');

// Whatever passes the right edge of the window, or makes the page wider than it.
export const pastEdge = (page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth, out = [];
  for (const el of document.querySelectorAll('main button, main a, main input, main h1, main h2, main h3, main li, dialog[open] button')) {
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 0.5) out.push(`"${el.textContent.trim().slice(0, 30)}" ends at ${Math.round(r.right)} of ${vw}`);
  }
  if (document.documentElement.scrollWidth > vw) out.push(`page ${document.documentElement.scrollWidth} px wide at ${vw}`);
  return out;
});

// The box of the element whose own text starts with `words` (the smallest such element), or null.
export const boxOf = (page, words) => page.evaluate((w) => {
  let best = null;
  for (const el of document.querySelectorAll('main *, dialog[open] *')) {
    const t = (el.innerText ?? '').replace(/\s+/g, ' ').trim();
    if (!t.startsWith(w)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    if (!best || r.width * r.height < best.w * best.h) best = { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, right: r.right };
  }
  return best;
}, words);

// The section a heading opens (its nearest section, article, aside, region or dialog), found by the
// heading's words: its text in one line, and its box. null when no heading starts with the words.
const SECTION = (h) => {
  const hs = [...document.querySelectorAll('main h1, main h2, main h3, main h4, dialog[open] h2, dialog[open] h3, dialog[open] h4')];
  const el = hs.find((e) => e.textContent.replace(/\s+/g, ' ').trim().startsWith(h));
  return el ? (el.closest('section, article, aside, [role="region"], dialog') ?? el.parentElement) : null;
};
export const sectionText = (page, heading) => page.evaluate((h, f) => { const s = new Function(`return (${f})`)()(h); return s ? s.innerText.replace(/\s+/g, ' ').trim() : null; }, heading, SECTION.toString());
export const sectionBox = (page, heading) => page.evaluate((h, f) => { const s = new Function(`return (${f})`)()(h); if (!s) return null; const r = s.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, right: r.right, bottom: r.bottom + scrollY }; }, heading, SECTION.toString());
// Asserts a section headed by these words is on the page and gives its text.
export async function section(page, heading, timeout = 6000) {
  const ok = await page.waitForFunction((h, f) => !!new Function(`return (${f})`)()(h), { timeout }, heading, SECTION.toString()).then(() => true, () => false);
  assert.ok(ok, `board: no section headed "${heading}"`);
  return sectionText(page, heading);
}

// A page opened with these localStorage entries already on this device ({ key: string }), at path.
export async function withStorage(entries, path = '/palette/', opts = {}) {
  const { h } = await import('./helpers.mjs');
  return h.open(path, { hook: true, mapTiles: 'stub', ...opts, setup: (pg) => pg.evaluateOnNewDocument((e) => { for (const [k, v] of Object.entries(e)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); }, entries) });
}
// A saved palette as the store keeps it on this device: n plants of a climate's list.
export const savedPalette = async (climate, n, at = '2026-11-09T10:00:00.000Z') => JSON.stringify({ fragment: (await linkOf(climate, n)).slice(1), place: '', at, src: null });

// The toast's text (the live status region the toast speaks through), or ''.
export const toastText = (page) => page.evaluate(() => window.__ctTest?.store?.toast.value?.text ?? '');

// ---- palettes of the real export ----

// The first n plant ids placed on a climate's list (by canonical name).
export const idsOf = (climate, n, offset = 0) => realDb((db) => db.prepare('SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? ORDER BY p.canonical_name LIMIT ? OFFSET ?').all(climate, n, offset).map((r) => String(r.id)));
// n plant ids of a climate's list standing in one stratum (emergent, high, medium, low).
export const idsInStratum = (climate, stratum, n) => realDb((db) => db.prepare('SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? AND x.stratum = ? ORDER BY p.canonical_name LIMIT ?').all(climate, stratum, n).map((r) => String(r.id)));
// A link to a palette of n plants of a climate's list.
export async function linkOf(climate, n, { room = 'unsure', ids = null, origin = null } = {}) {
  const all = await realDb((db) => db.prepare('SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? ORDER BY 1').all(climate).map((r) => String(r.id)));
  const members = ids ?? await idsOf(climate, n);
  return `#${encodeLink({ climate, country: null, room, plot: null, period: TODAY_PERIOD, spot: null, soil: null, members, removed: [], guests: [] }, { [climate]: all }, { origin })}`;
}
// A palette page: n plants of the climate's list, opened from a link, at a place (a SITES key) or none.
// Board Main: Seville, the Mediterranean list, 13 plants; Palette: Kiambu, 8 plants.
export async function palette({ climate = 'Mediterranean', site = 'seville', n = 13, room = 'unsure', ids = null, ...opts } = {}) {
  if (ids) n = ids.length;
  const page = await tool({ hash: await linkOf(climate, n, { room, ids }), ...opts });
  assert.ok(await page.waitForFunction((k) => window.__ctTest?.store?.members.value.length === k, { timeout: 20_000 }, n).then(() => true, () => false), `the link's ${n} plants`);
  if (site) await atSite(page, site);
  return page;
}
// An empty palette page (every plant of a link taken out), at a place.
export async function emptyPalette(opts = {}) {
  const page = await palette({ n: 3, ...opts });
  await page.evaluate(() => { const { store } = window.__ctTest; for (const id of store.members.value.slice()) store.removeMember(id); store.hideToast(); });
  return page;
}
// Waits for the verdicts of the page's members (a fit checked, or the check failed).
export const verdictsSettled = (page, timeout = 15_000) => page.waitForFunction(() => { const s = window.__ctTest.store; return !!s.memberVerdicts.value || s.verdictFailed.value; }, { timeout }).then(() => true, () => false);

// ---- v14 pf commit 0W (item 11): the grower's values, the goal, the 200-plant palette ----

// The grower's own values, as the figures panel writes them (store.setSiteEdits; `summary` the toast's words).
export const setSiteEdits = (page, edits, summary = 'Edits set') => page.evaluate((e, s) => { window.__ctTest.store.setSiteEdits(e, s); }, edits, summary);
// The palette goal, as the Jobs control sets it ("Plants per job 1 2 3 5").
export const setPlantsPerJob = (page, n) => page.evaluate((k) => { window.__ctTest.store.setPlantsPerJob(k); }, n);
// The 200-plant Kiambu palette of the Subtropical list (scenario case kiambu-200: the board tools'
// pal.mjs rule, as ids), at Kiambu, through the hook (no control makes 200 plants in one step).
export const PALETTE_200 = JSON.parse(readFileSync(new URL('../fixtures/consortium-scenarios.json', import.meta.url), 'utf8')).cases.find((c) => c.id === 'kiambu-200').input.members;
export async function loadPalette200(opts = {}) {
  const page = await tool(opts);
  await atSite(page, 'kiambu');
  await page.evaluate(async (ids) => {
    const { store } = window.__ctTest;
    store.climate.value = 'Subtropical';
    await store.loadPool('Subtropical');
    store.members.value = ids;
    store.view.value = 'matrix';
  }, PALETTE_200);
  assert.ok(await page.waitForFunction(() => window.__ctTest?.store?.members.value.length === 200, { timeout: 20_000 }).then(() => true, () => false), 'the 200 plants');
  assert.ok(await verdictsSettled(page, 30_000), 'the 200 plants\' verdicts');
  return page;
}

// A guest plant from a climate list the palette does not use yet (its first plant by id), for the
// list-state cases: `{ zone, guest }`, or the premise fails. `skip` leaves out zones already taken.
async function unusedListGuest(page, skip = []) {
  const zone = await page.evaluate((s) => ['Tropical', 'Subtropical', 'Mediterranean', 'Temperate', 'Arid'].find((z) => !s.includes(z) && !window.__ctTest.store.pools.value[z]), skip);
  assert.ok(zone, 'the premise: a list the palette does not use');
  const guest = await realDb((db) => String(db.prepare('SELECT p.id FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = ? ORDER BY 1 LIMIT 1').get(zone).id));
  return { zone, guest };
}
// A guest list refused (PP-B21, h3 R1): a guest of an unused list joins the palette and its list read
// fails; waits until the store names it in failedMembers. Returns `{ zone, guest }`.
export async function refuseGuestList(page) {
  const { zone, guest } = await unusedListGuest(page);
  await page.evaluate((z, id) => {
    const { store } = window.__ctTest, src = store.source.value;
    const pool = src.pool.bind(src);
    src.pool = (x) => (x === z ? Promise.reject(new Error('refused (test)')) : pool(x));
    store.guests.value = { ...store.guests.value, [id]: z };
    store.members.value = [...store.members.value, id];
  }, zone, guest);
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.failedMembers.value.length > 0, { timeout: 8000 }).then(() => true, () => false), 'the premise: the list could not be read');
  await frames(page);
  return { zone, guest };
}
// A guest list held (F26, M17): a guest of an unused list joins the palette and its list read waits
// until `window.__list.release()`. Returns `{ zone, guest }` once the store says a list is loading.
export async function holdGuestList(page, skip = []) {
  const { zone, guest } = await unusedListGuest(page, skip);
  await page.evaluate((z, id) => {
    const { store } = window.__ctTest, src = store.source.value;
    const pool = src.pool.bind(src), rows = src.interactions.bind(src);
    let release; const wait = new Promise((r) => { release = r; });
    window.__list = { release };
    src.pool = (x) => (x === z ? wait.then(() => pool(x)) : pool(x));
    src.interactions = (x) => (x === z ? wait.then(() => rows(x)) : rows(x));
    store.guests.value = { ...store.guests.value, [id]: z };
    store.members.value = [...store.members.value, id];
  }, zone, guest);
  assert.ok(await page.waitForFunction((z) => window.__ctTest.store.guestsPending.value.includes(z), { timeout: 5000 }, zone).then(() => true, () => false), 'the premise: the list is being read');
  await frames(page);
  return { zone, guest };
}

export const done = async (...pages) => { for (const p of pages) await p.browserContext().close().catch(() => {}); };
export const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
export const focused = (page) => page.evaluate(() => { const a = document.activeElement; return { body: !a || a === document.body, inTool: !!a?.closest('#ct-root, dialog[open]'), name: (a?.getAttribute('aria-label') ?? a?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60) }; });
export { norm };

// ---- pf-a (chunk 2): a scenario case's palette, and the Next step's figures from the engine ----

const SCENARIOS = JSON.parse(readFileSync(new URL('../fixtures/consortium-scenarios.json', import.meta.url), 'utf8')).cases;
// A scenario case's palette (its list and members) at a SITES place, through the hook as loadPalette200
// does (Kiambu borrows the Subtropical list: the place proposes Temperate, the case says Subtropical).
export async function loadCase(id, { site = 'kiambu', goal = null, ...opts } = {}) {
  const c = SCENARIOS.find((x) => x.id === id);
  assert.ok(c, `scenario case ${id}`);
  const page = await tool(opts);
  if (site) await atSite(page, site);
  await page.evaluate(async (list, ids, g) => {
    const { store } = window.__ctTest;
    store.climate.value = list;
    await store.loadPool(list);
    store.members.value = ids;
    if (g) store.setPlantsPerJob(g);
    store.view.value = 'matrix';
  }, c.input.list, c.input.members, goal ?? c.input.goals?.plantsPerJob ?? null);
  assert.ok(await page.waitForFunction((k) => window.__ctTest?.store?.members.value.length === k, { timeout: 20_000 }, c.input.members.length).then(() => true, () => false), `the case's ${c.input.members.length} plants`);
  assert.ok(await verdictsSettled(page, 30_000), 'the verdicts');
  return page;
}

// The Next step's figures, computed through the engine (core holes.ts nextTarget, fillers, bestToAdd;
// the board-figures rule: never a board number) on the page's own state: the palette's holes and thin
// spots, the plants on its lists with their verdicts, holding to 2071–2099 and warned (store.warnedPlant).
// untouched: an untouched suggestion shows no thin-spot card (A19), so thin spots are no target then.
const core = await import('../../src/lib/consortium/holes.ts');
const { periodIds } = await import('../../src/lib/consortium/types.ts');
// The engine's inputs read off the page's own state (shared by engineLead and holeCounts).
async function engineInputs(page) {
  return page.evaluate((last) => {
    const st = window.__ctTest.store;
    const members = st.memberTaxa.value, ids = new Set(members.map((t) => t.id));
    const pool = (st.offerPool.value ?? []).filter((t) => !ids.has(t.id));
    const rule = st.verdictRule.value, ctx = st.verdictContext.value;
    return {
      holes: st.paletteHoles.value, thins: st.thinSpots.value, putOff: [...st.notNow.value], members, pool,
      pv: [...(st.poolVerdicts.value ?? new Map())], holds: rule ? pool.map((t) => [t.id, rule.holdsBy(t, ctx, last)]) : [],
      warned: pool.filter((t) => st.warnedPlant(t)).map((t) => t.id), goal: st.plantsPerJob.value, untouched: st.untouchedSuggestion.value,
    };
  }, periodIds[periodIds.length - 1]);
}
// Per open hole, what the engine's fillers() puts in each group (core holes.ts, the installed release):
// the count every hole row says (the Next step's, Other holes', Find's), BC25.
export async function holeCounts(page) {
  const s = await engineInputs(page);
  const open = s.holes.filter((h) => h.state === 'open');
  return open.map((h) => {
    const f = core.fillers(h, s.pool.filter((t) => core.fills(h, t)), new Map(s.pv), new Map(s.holds), new Set(s.warned), s.members, open);
    return { id: h.id, fits: f.fits.length, look: f.look.length, unknown: f.unknown.length };
  });
}
export async function engineLead(page) {
  const s = await engineInputs(page);
  const open = s.holes.filter((h) => h.state === 'open'), thins = s.thins.filter((h) => h.state === 'open');
  // C5: the Next step's ranking reads whether plants that fit fill a hole (a cooler-months food hole leads then).
  const pv = new Map(s.pv);
  const hasFits = (h) => s.pool.some((t) => core.fills(h, t) && pv.get(t.id)?.level === 'fits' && !s.warned.includes(t.id));
  const lead = core.nextTarget(s.holes, s.untouched ? [] : s.thins, new Set(s.putOff), hasFits);
  if (!lead) return { lead: null, open, thins, untouched: s.untouched };
  const f = core.fillers(lead.target, s.pool, new Map(s.pv), new Map(s.holds), new Set(s.warned), s.members, open);
  const sci = (list) => list.map((t) => t.canonical_name);
  const best = core.bestToAdd(lead.target, f, { plantsPerJob: s.goal });
  return {
    lead, open, thins, untouched: s.untouched, goal: s.goal,
    fits: sci(f.fits), look: sci(f.look), outside: sci(f.outside), unknown: sci(f.unknown),
    best: best.map((id) => f.fits.find((t) => t.id === id).canonical_name),
    all: f.fits.length + f.look.length + f.outside.length + f.unknown.length,
    // BC3: "See all N plants" counts what Find lists first: the fits, the second looks, the unchecked.
    seeAll: f.fits.length + f.look.length + f.unknown.length,
    // BC11, PFA-B1: the second looks whose limiting measure is a range side within the margin (their chip
    // "Near the edge of its range"); any other second look names its own cause.
    lookEdge: sci(f.look.filter((t) => pv.get(t.id)?.level === 'look' && pv.get(t.id)?.limiting?.confidence?.term === 'edge')),
  };
}
// The text of the Next step's card, one line (its heading "Next step" opens it), or ''.
export const nextText = async (page) => (await sectionText(page, 'Next step')) ?? '';

// Opens every MoreList fold in scope ('dialog[open]' or the Next step card): presses "+ N more" until
// none is left, so each group lists all its plants (the size rule, A14).
export async function openMore(page, scope = 'dialog[open]') {
  await frames(page); // the render the last action asked for
  for (let i = 0; i < 40; i++) {
    const hit = await page.evaluate((sc) => {
      const b = [...document.querySelectorAll(`${sc} button`)].find((x) => /^\+ [\d,]+ more$/.test(x.textContent.trim()));
      if (b) b.click();
      return !!b;
    }, scope);
    if (!hit) return;
    await frames(page);
  }
}
// Plants with no climate range recorded (the release's 'not-recorded' case, PFA-B2/B6): the verdict
// rule wrapped so these plants read 'unknown' ("not checked") and never hold, the rest unchanged.
export const notRecorded = (page, ids) => page.evaluate((list) => {
  const st = window.__ctTest.store, rule = st.verdictRule.value, set = new Set(list);
  st.verdictRule.value = {
    ...rule,
    verdicts: (taxa, ctx) => {
      const m = rule.verdicts(taxa, ctx);
      for (const id of set) { const v = m.get(id); if (v) m.set(id, { ...v, level: 'unknown', limiting: null, factors: [], notes: [], range: 'not-recorded' }); }
      return m;
    },
    holdsBy: (t, c, p) => !set.has(t.id) && rule.holdsBy(t, c, p),
  };
}, ids);
// The plants on the lists (not in the palette) that fill a hole and need a second look for their range
// alone (level look, no warning): core fills on the page's own pool and verdicts. Marked not recorded,
// they turn "not checked"; a warned plant would stay a second look (PFA-G1, core fillerGroup).
export async function lookFillers(page, holeId) {
  const s = await page.evaluate((id) => {
    const st = window.__ctTest.store, ids = new Set(st.members.value);
    const pool = (st.offerPool.value ?? []).filter((t) => !ids.has(t.id));
    return { hole: st.openHoles.value.find((h) => h.id === id), pool, pv: [...(st.poolVerdicts.value ?? new Map())], warned: pool.filter((t) => st.warnedPlant(t)).map((t) => t.id) };
  }, holeId);
  const pv = new Map(s.pv), warned = new Set(s.warned);
  return s.pool.filter((t) => core.fills(s.hole, t) && pv.get(t.id)?.level === 'look' && !warned.has(t.id)).map((t) => t.id);
}
