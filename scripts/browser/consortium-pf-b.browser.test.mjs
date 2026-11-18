// pf stream b, "The pictures" (v14 pf-b commit 0, 2026-11-18): the v14 boards Main, Palette, DarkMain
// and German (the head, Through the years), MainMore and PaletteMore (Jobs, Warnings, Balance, the
// foot), Many and ManyDesk (the count cells, "Years 1–3 · N of your 200 plants stand then", Jobs at 200,
// "Warnings and fit"), Kumasi (Water use), Toasts ("How to read this", the removed line) and Focus, as
// behaviour tests (.local/consortium/v2/ppc/pf/v14-spec-update.md section 2 "pf-b", F16, F29, section 6).
// Owner rules: the light words (Full sun, Mostly sun, Part shade, Shade), never high/medium/low; colour
// never alone; text at 4.5:1 in both themes; the size rule (A14: every name while the palette has 40
// plants or fewer and the group 12 or fewer, else the count cell). Every figure is re-derived through the
// engine at the board's inputs (pf-b-helpers.mjs: the 0W scenario cases), never a board number. Written
// expected-fail under pf-b in commit 0 (scripts/expect-fail.mjs failing()); every pf-b marker is gone since
// the pictures were built; the last, PFB23, went with M24 (Find takes a job and a predicate).
// Parked, neither ported nor tested: Through the year and the cooler months (PP-G), the period tabs and
// "See 2041–2070" (PP-E), Soil and its links (PP-F), Plan, Print and Share boards (PP-D).
//
// Sweep ledger (the old screen-level tests this file carries, each a case below or a line of one):
//   carries PF2 (pp-pf; the pictures name each plant with its job icon, the light words on the rows) -> PFB1
//   carries PP-B37 (pp-b2; the key "Colour and icon show each plant's main job" with the six jobs) -> PFB1
//   carries PP-B7 (pp-b2; the phone steps one time span at a time, 44 px targets, the focus stays) -> PFB2
//   carries PP-B8 (pp-b2; the table is the pictures' screen-reader form, the same plants and spans) -> PFB11
//   carries PP-B43 (pp-b2; each job in its own colour, always beside its word) -> PFB4
//   carries PP-B60 (pp-b3; F1a-B6 restored: Balance "One family: N of your M are <family>") -> PFB9
//   carries PP-B63 (pp-b3; water needs not recorded said on the line, "that is not a pass") -> PFB9, PFB10
//   carries P5-18 (s5d; Warnings "N leave(s) its climate range by 2041–2070"; its "See 2041–2070" is PP-E) -> PFB7
//   carries P5-19 (s5d; never "fine" for a plant with no future figures) -> PFB7
//   carries PP-B22 (pp-b2; the palette page fits 320 px in en, de, ru and ja; old PFB11, passing) -> PFB13
//   carries PP-B20, PP-B49, PP-B50 (pp-b2; the climate check refused: Try again in place, Reload when
//     online, focus kept, offline waits; c2's rule; old PFB9; the notice's words are the main agent's key) -> PFB18
//   moved to pf-e: PP-B9, PP-B61, PP-B61b, PP-B62, PP-B23, PP-B23b, PP-B64 (old PFB5 and PFB7, "Your plants";
//     YourPlants is pf-e's in chunk 3)
//   moved to pf-c: PP-B46 (old PFB10, the offline notice of the Loading board)
//   dropped: PP-B18 (print at a year step; the PP-D Print board replaces it), P5-19b, old PFB13's toast
//   placement (the toast shell is no stream's in chunk 2), PF2's old words ("Needs full sun").
// Kept where they are (lasting seams): PP-B29 (200-plant scale), PP-B30, PP-B31, PP-B32 in pp-b2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aria, has } from './helpers.mjs';
import { useHarness } from './helpers.mjs';
import { JOBS, LIGHT, OLD_LIGHT, control, done, focused, frames, inOrder, names, palette, pastEdge, press, says, saysNot, section, sectionBox, toastText, verdictsSettled } from './pf-helpers.mjs';
import { boardPalette, figures, fitOf, inSection, jobDoers, laneOf, scenario, standing, uncheckedOf } from './pf-b-helpers.mjs';

useHarness();

const en = JSON.parse(readFileSync(new URL('../../src/i18n/translations/en.json', import.meta.url), 'utf8'));
const STRATA = ['emergent', 'high', 'medium', 'low'];
const LEVEL = Object.fromEntries(STRATA.map((s, i) => [s, LIGHT[i]]));
const JOB_IDS = ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter'];
const JOB = Object.fromEntries(JOB_IDS.map((j, i) => [j, JOBS[i]]));
const plants = (n) => `${n} plant${n === 1 ? '' : 's'}`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ofStratum = (f, s) => f.ids.filter((id) => f.stratum[id] === s);
const buttons = async (page) => [...(await names(page, 'button'))];
// A list of names as the boards write it (kit/chart.tsx Names: commas only, "Olive, Almond, Fig"; c2
// C1); "and" only inside a sentence ("Silk oak and Napier grass sit between").
const listEn = (xs) => xs.join(', ');
const TOX = { Slight: 'Mildly toxic', Moderate: 'Toxic', Severe: 'Very toxic' };
const TOX_MARKS = { Slight: '●○○', Moderate: '●●○', Severe: '●●●' };

// A Jobs row as read at 40 plants or fewer (its lines): the head's figure, the names it counts (the
// plain list under the head) and the figure of its sentence on the plants outside their range.
const jobRowRead = async (page, job) => {
  const lines = await inSection(page, 'Jobs', (sec, w) => {
    const li = [...sec.querySelectorAll('li')].find((l) => l.querySelector('strong')?.textContent.trim() === w);
    return li ? li.innerText.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean) : null;
  }, JOB[job]);
  assert.ok(lines, `the ${JOB[job]} row`);
  // The head is one line or two (its figure wraps under the job at some widths).
  if (lines[0] === JOB[job] && /^\d+ plants?$/.test(lines[1] ?? '')) lines.splice(0, 2, `${lines[0]} ${lines[1]}`);
  const m = new RegExp(`^${esc(JOB[job])}(?: (\\d+) plants?)?$`).exec(lines[0]);
  assert.ok(m, `the ${JOB[job]} row's head (${lines.join(' / ')})`);
  const n = m[1] ? Number(m[1]) : 0;
  const o = lines.map((x) => /^(\d+) (?:more )?(?:plants? )?do(?:es)? this but/.exec(x)).find(Boolean);
  return { lines, n, names: n ? lines[1].split(', ') : [], outside: o ? Number(o[1]) : 0 };
};
// A row against its lane (c2 R1, D1), never a copy of the lane's rule: in every time span its named
// plants standing then are the lane's figure (store.lanes counts); the head's figure is its names; the
// named and those of the outside sentence are every member doing the job (jobsOf).
const rowMatchesLane = (row, lane, doers, job) => {
  const byName = new Map(doers.map((d) => [d.name, d]));
  for (const nm of row.names) assert.ok(byName.has(nm), `${job}: "${nm}" does the job (${row.lines.join(' / ')})`);
  assert.equal(row.names.length, row.n, `${job}: the head's figure counts its names`);
  lane.counts.forEach((k, c) => assert.equal(row.names.filter((nm) => byName.get(nm).stands[c]).length, k, `R1, D1: ${job} span ${c}: the named plants standing then are the lane's ${k} (${row.lines.join(" / ")})`));
  assert.equal(row.n + row.outside, doers.length, `${job}: ${row.n} counted and ${row.outside} outside are the ${doers.length} doing it`);
};

// Each text element whose contrast with what is behind it falls under 4.5:1 (the first few).
// The colour transitions (0.12 s on buttons) settled first: a colour read mid-transition is neither theme's.
const lowContrast = (page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null)));
  const rgb = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const behind = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] ?? 1) > 0.5) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  const out = [];
  for (const el of document.querySelectorAll('#ct-root *')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || el.closest('.visually-hidden, .sr-only, [hidden]')) continue;
    const a = lum(rgb(getComputedStyle(el).color)), b = lum(behind(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 4.5) out.push(`"${el.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}:1`);
    if (out.length > 4) break;
  }
  return out;
});
// The box of the first element of a role and name.
const boxAt = (page, role, name) => page.$eval(aria(role, name), (e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, right: r.right }; }).catch(() => null);
const pressed = (page, name) => page.$eval(aria('button', name), (e) => e.getAttribute('aria-pressed')).catch(() => null);

test('PFB1 (pf-b Main at 1280 and 960): "Through the years" with the board\'s intro, a grid headed "Light" and the seven time spans, one row per light level ("Mostly sun 8 plants": the members planted in it), each plant a button on its bar; each empty judged place a dashed button "<level>: nobody … Find"; the key with the six jobs in order; "Further down this page: Jobs · Warnings (N)" naming only the sections that exist; never high/medium/low', async () => {
  for (const width of [1280, 960]) {
    const page = await boardPalette('seville-board', { width });
    const f = await figures(page);
    const chart = await section(page, 'Through the years');
    assert.ok(chart.includes('Who stands where as the plot grows up, by the light level each plant is planted in. A dashed place is empty: select it to see the plants that fill it.'), `board: the intro at ${width} px`);
    await inOrder(page, ['Light', 'First 90 days', 'Months 3–12', 'Years 1–3', 'Years 3–15', 'Years 15–25', 'Years 25–60', 'After 60 years']);
    const bs = await buttons(page);
    for (const s of STRATA) {
      const ids = ofStratum(f, s);
      if (!ids.length) continue;
      const counted = ids.filter((id) => f.levels[id] !== 'outside').length; // review R8: the plants that count toward the holes
      assert.ok(chart.includes(`${LEVEL[s]} ${plants(counted)}`) || chart.includes(`${LEVEL[s]}${plants(counted)}`), `board: the row head "${LEVEL[s]} ${plants(counted)}"`);
      for (const id of ids) assert.ok(bs.some((b) => b.startsWith(f.names[id])), `board: ${f.names[id]} a button on its bar`);
    }
    for (const h of f.holes.filter((x) => x.kind === 'light')) assert.ok(bs.some((b) => b.startsWith(`${LEVEL[h.stratum]}: nobody`) && b.endsWith('Find')), `board: the dashed hole of ${LEVEL[h.stratum]} with "Find"`);
    await inOrder(page, ['Colour and icon show each plant’s main job:', ...JOBS]);
    // BC5: at 960 px no time-span head breaks inside a word.
    const split = await page.evaluate(() => [...document.querySelectorAll('#ct-root .ct-grid-col')].flatMap((el) => {
      const text = el.textContent, node = el.firstChild?.nodeType === 3 ? el.firstChild : null;
      if (!node) return [];
      const out = [];
      let at = 0;
      for (const word of text.split(' ')) {
        const r = document.createRange(); r.setStart(node, at); r.setEnd(node, at + word.length);
        const lines = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
        if (lines.size > 1) out.push(word);
        at += word.length + 1;
      }
      return out;
    }));
    assert.deepEqual(split, [], `BC5: no time-span head breaks inside a word at ${width} px`);
    const w = await section(page, 'Warnings');
    const n = Number(w.match(/^Warnings (\d+)/)?.[1] ?? NaN);
    await says(page, `Further down this page: Jobs · Warnings (${n})`);
    await saysNot(page, /Further down this page: Through the year/, 'parked (PP-G): no link to a section that is not there');
    await saysNot(page, OLD_LIGHT, 'owner "Layer is light"');
    assert.ok(!bs.includes('Show as a table'), 'board: no "Show as a table" button (Q8: the table is the screen-reader form)');
    await done(page);
  }
});

test('PFB2 (pf-b Palette at 390, carried from PP-B7): "Who stands where as the plot grows up. Step through time; an empty light level is a hole."; Earlier and Later (44 px) around "Years 1–3" in the group "Time span 3 of 7"; each level lists the plants standing then, or the hole button "<level>: nobody … Find a plant"; Later steps by one, the focus stays on it', async () => {
  const page = await boardPalette('kiambu-8', { width: 390 });
  const f = await figures(page);
  const chart = await section(page, 'Through the years');
  assert.ok(chart.includes('Who stands where as the plot grows up. Step through time; an empty light level is a hole.'), 'board: the phone intro');
  await control(page, 'group', 'Time span 3 of 7');
  assert.ok(chart.includes('Years 1–3'), 'board: "Years 1–3"');
  const bs = await buttons(page);
  for (const s of STRATA) {
    const hole = f.holes.find((h) => h.kind === 'light' && h.stratum === s);
    if (laneOf(f, s).counts[2] > 0) assert.ok(chart.includes(LEVEL[s]), `board: ${LEVEL[s]} with its plants`);
    else if (hole) assert.ok(bs.some((b) => b.startsWith(`${LEVEL[s]}: nobody`) && b.endsWith('Find a plant')), `board: "${LEVEL[s]}: nobody … Find a plant"`);
  }
  for (const b of ['Earlier', 'Later']) {
    const box = await boxAt(page, 'button', b);
    assert.ok(box && box.w >= 44 && box.h >= 44, `board: "${b}" a 44 px target (${JSON.stringify(box)})`);
  }
  await press(page, 'button', 'Later');
  await control(page, 'group', 'Time span 4 of 7');
  assert.equal((await focused(page)).name, 'Later', 'board: the focus stays on "Later"');
  await done(page);
});

test('PFB3 (pf-b Many at 390 and ManyDesk at 1280, A14): past 40 plants Through the years says the board\'s intro, "Years 1–3" with "N of your 200 plants stand then" (the light lanes\' count), each level a group "Full sun: N plants" with three names and "+ M more"; it opens in place to 10 names, then all, with "Show fewer"; "The others are sown or planted in another time span…"', async () => {
  for (const width of [390, 1280]) {
    const page = await boardPalette('kiambu-200', { width });
    const f = await figures(page);
    const chart = await section(page, 'Through the years', 20_000);
    assert.ok(chart.includes('Who stands where as the plot grows up. Each light level shows how many plants stand in it and the first three names. A level opens in place to its first 10 names, then “+ more”.'), `board: the intro past 40 plants (${width} px)`);
    assert.ok(chart.includes(`${standing(f, 2)} of your 200 plants stand then`), `board: "${standing(f, 2)} of your 200 plants stand then"`);
    const bs = await buttons(page);
    for (const s of STRATA) {
      const k = laneOf(f, s).counts[2];
      if (!k) continue;
      await control(page, 'group', `${LEVEL[s]}: ${plants(k)}`);
      if (k > 12) assert.ok(bs.includes(`+ ${k - 3} more`), `board: "+ ${k - 3} more" under ${LEVEL[s]}`);
    }
    const big = STRATA.find((s) => laneOf(f, s).counts[2] > 12);
    if (big) {
      const k = laneOf(f, big).counts[2];
      await press(page, 'button', `+ ${k - 3} more`);
      assert.ok((await buttons(page)).includes('Show fewer'), 'board: "Show fewer" once open');
    }
    assert.ok(chart.includes('The others are sown or planted in another time span: annual crops stand in the first year only, long-lived trees go in from year 3.'), 'board: the others sentence');
    // c2 C2: the members outside their range standing then, a handful named inline in the board's
    // sentence, in the paragraph of the others sentence (Cashew on the board).
    const { spans } = await import('../../src/lib/consortium/years.ts');
    const taxa = await page.evaluate(() => window.__ctTest.store.memberTaxa.value.map((t) => ({ id: t.id, phases: t.phases, stratum: t.stratum })));
    const then = taxa.filter((t) => t.stratum && f.levels[t.id] === 'outside' && spans(t, 2)).map((t) => f.names[t.id]);
    if (then.length && then.length <= 3) {
      const sentence = `${then.length} more plant${then.length === 1 ? ' would stand then but is outside its' : 's would stand then but are outside their'} climate range (${listEn(then)}): not counted here, listed under “Warnings and fit”.`;
      const para = await inSection(page, 'Through the years', (sec, w) => [...sec.querySelectorAll('p')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).find((x) => x.startsWith(w)) ?? null, 'The others are sown');
      assert.ok(para && para.includes(sentence), `C2: "${sentence}" in the others paragraph ("${para}")`);
    }
    assert.deepEqual(await pastEdge(page), [], `board: nothing past the edge at ${width} px`);
    await done(page);
  }
});

test('PFB4 (pf-b MainMore Jobs at 1280 and PaletteMore at 390, carried from PP-B43): the goal sentence "You want 2 plants for each job (Plants per job: 2): N holes come first, then M thin spots…", the legend, the control "Plants per job" 1 2 3 5 (44 px, "2" pressed), each job "<job> N plants" with its names, each thin spot "Thin: 1 plant only from year a to year b. Add a backup." with no button, each job hole "<job>: nobody … Find a plant"', async () => {
  for (const [id, width] of [['seville-board', 1280], ['kiambu-8', 390]]) {
    const page = await boardPalette(id, { width });
    const f = await figures(page);
    const jobs = await section(page, 'Jobs');
    const holes = f.holes.length, thin = f.thin;
    const tail = f.openThin > 0 ? `, then ${f.openThin} thin spot${f.openThin === 1 ? '' : 's'}: a job held by 1 plant over one stretch of years.` : '.'; // review R6: no "then 0 thin spots"
    assert.ok(jobs.includes(`What your plants do for the plot, and for how long. You want 2 plants for each job (Plants per job: 2): ${holes} hole${holes === 1 ? '' : 's'} come${holes === 1 ? 's' : ''} first${tail}`), `board: the goal sentence (${holes} holes, ${thin} thin; ${width} px): "${jobs.slice(0, 220)}"`);
    if (!f.openThin) assert.ok(!jobs.includes('then 0 thin spots'), 'R6: never "then 0 thin spots"');
    assert.ok(jobs.includes('2 or more plants · 1 plant between year 1 and year 60: thin · nobody: a hole'), 'board: the legend');
    await control(page, 'group', 'Plants per job');
    for (const n of ['1', '2', '3', '5']) {
      const b = await boxAt(page, 'button', n);
      assert.ok(b && b.w >= 44 && b.h >= 44, `board: "${n}" a 44 px button`);
    }
    assert.equal(await pressed(page, '2'), 'true', 'board: "2" pressed');
    const bs = await buttons(page);
    const doers = await jobDoers(page);
    const bold = await inSection(page, 'Jobs', (sec) => [...sec.querySelectorAll('strong, b')].map((e) => e.textContent.trim()));
    for (const l of f.lanes.filter((x) => x.kind === 'job')) {
      rowMatchesLane(await jobRowRead(page, l.key), l, doers[l.key] ?? [], l.key);
      assert.ok(!jobs.includes(`${JOB[l.key]} 0 plants`), `BC24: no "${JOB[l.key]} 0 plants"`);
      for (const t of l.thin) assert.ok(jobs.includes(`Thin: ${plants(t.have)} only from year ${t.fromYear} to year ${t.toYear}. Add a backup.`), `board: the thin line of ${JOB[l.key]} (${t.fromYear}–${t.toYear})`);
    }
    if (f.lanes.some((l) => l.kind === 'job' && l.thin.length)) assert.ok(bold.includes('Thin:'), `BC24: "Thin:" bold (${bold.join(' | ')})`);
    for (const h of f.holes.filter((x) => x.kind === 'job')) assert.ok(bs.some((b) => b.startsWith(`${JOB[h.job]}: nobody`) && b.endsWith('Find a plant')), `board: the hole button of ${JOB[h.job]}`);
    assert.ok(!bs.some((b) => /backup|Find a backup/i.test(b)), 'A20: a thin row has no button');
    await saysNot(page, '1 plant: nobody else does this', 'the old one-plant line is gone');
    await done(page);
  }
});

test('PFB5 (pf-b F16, the goal changed): pressing "3" under "Plants per job" presses it, and the goal sentence says "You want 3 plants for each job (Plants per job: 3)" with the thin spots the engine counts at a goal of 3 (scenario kiambu-8-goal-3)', async () => {
  const page = await boardPalette('kiambu-8', { width: 1280 });
  await section(page, 'Jobs');
  await press(page, 'button', '3');
  assert.equal(await pressed(page, '3'), 'true', 'board: "3" pressed');
  assert.equal(await pressed(page, '2'), 'false', 'board: "2" no longer pressed');
  await frames(page);
  const f = await figures(page);
  assert.equal(f.goal, 3, 'the store\'s goal');
  const want = await boardPalette('kiambu-8-goal-3');
  const g = await figures(want);
  await done(want);
  assert.equal(f.thin, g.thin, 'the engine\'s thin spots at a goal of 3');
  const jobs = await section(page, 'Jobs');
  assert.ok(jobs.includes(`You want 3 plants for each job (Plants per job: 3): ${f.holes.length} holes come first, then ${f.thin} thin spot${f.thin === 1 ? '' : 's'}`), `board: the goal sentence at 3 ("${jobs.slice(0, 200)}")`);
  await done(page);
});

test('PFB6 (pf-b Many and ManyDesk Jobs at 200): "How many of your plants do each job. Each line opens to its first 10 plants, then “+ more”.", the goal explanation, each job a 44 px button "<job> N plants" (" · a hole" when it has one) opening its names and the hole sentence; the foot "Jobs not checked yet: N plants…" (the job lanes\' unchecked)', async () => {
  const page = await boardPalette('kiambu-200', { width: 1280 });
  const f = await figures(page);
  const jobs = await section(page, 'Jobs', 20_000);
  assert.ok(jobs.includes('How many of your plants do each job. Each line opens to its first 10 plants, then “+ more”.'), 'board: the intro at 200');
  assert.ok(jobs.includes('At least this many plants for each job, in every time span from year 1 to year 60. Two means one can fail. Fewer is “thin”, a next step after the holes. There is no upper limit: past 2 a job only says how many. Light levels have no such number: an empty one is a hole.'), 'board: the goal explanation');
  const bs = await buttons(page);
  for (const j of JOB_IDS) {
    const hole = f.holes.some((h) => h.kind === 'job' && h.job === j);
    const b = bs.find((x) => new RegExp(`^${esc(JOB[j])} ?\\d+ plants?${hole ? ' · a hole' : '$'}`).test(x));
    assert.ok(b, `board: the row button of ${JOB[j]}${hole ? ' · a hole' : ''}`);
    const box = await boxAt(page, 'button', b);
    assert.ok(box && box.h >= 44, `board: ${JOB[j]} a 44 px row`);
  }
  const holeJob = f.holes.find((h) => h.kind === 'job');
  if (holeJob) {
    const b = (await buttons(page)).find((x) => x.startsWith(JOB[holeJob.job]) && x.endsWith('· a hole'));
    await press(page, 'button', b);
    assert.equal(await page.$eval(aria('button', b), (e) => e.getAttribute('aria-expanded')), 'true', 'board: the row opens');
    await says(page, new RegExp(`Nobody (?:known )?.*: a hole, number \\d+ of ${f.holes.length}`));
  }
  const n = uncheckedOf(f).size;
  if (n) assert.ok(jobs.includes(`A plant counts under every job it does. Jobs not checked yet: ${plants(n)}, counted under no job but “Feeds you”`), `board: "Jobs not checked yet: ${plants(n)}"`);
  await done(page);
});

test('PFB7 (pf-b MainMore Warnings, 40 plants or fewer, carried from P5-18 and P5-19): "Warnings N" (N its groups), "Very toxic" and "Toxic" naming the plants the engine flags Severe and Moderate (store.flags), "Mildly toxic" with its plants; the leave-their-range line in words; never "fine"; no "Tick these"', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  const f = await figures(page);
  // The small card names every member the engine marks at a toxicity level (store.flags), whatever its
  // fit: an outside plant that is Severe is "Very toxic" too.
  const tox = await page.evaluate(() => {
    const s = window.__ctTest.store, fl = s.flags.value;
    const of = (level) => s.memberTaxa.value.filter((t) => fl.some((x) => x.id === t.id && x.kind === 'toxicity' && x.level === level)).map((t) => t.id);
    return { severe: of('Severe'), moderate: of('Moderate'), slight: of('Slight') };
  });
  const w = await section(page, 'Warnings');
  assert.match(w, /^Warnings \d+/, 'board: "Warnings N"');
  const groups = await page.evaluate(() => [...document.querySelectorAll('.ct-warnings h4')].length);
  assert.equal(Number(w.match(/^Warnings (\d+)/)[1]), groups, 'board: N is its groups');
  const say = (head, ids) => { if (ids.length) assert.ok(w.includes(`${head}${listEn(ids.map((id) => f.names[id]))}`) || w.includes(`${head} ${listEn(ids.map((id) => f.names[id]))}`), `board: "${head}" ${listEn(ids.map((id) => f.names[id]))}`); };
  say('Very toxic', tox.severe);
  say('Toxic', tox.moderate);
  say('Mildly toxic', tox.slight);
  if (/climate range by 2041–2070/.test(w)) assert.match(w, /\d+ leaves? (?:its|their) climate range by 2041–2070/, 'board: "1 leaves its climate range by 2041–2070"');
  assert.doesNotMatch(w, /\bfine\b/i, 'board: never "fine"');
  assert.ok(!(await buttons(page)).some((b) => b.startsWith('Tick these')), 'A15: no "Tick these" (pf-e)');
  await done(page);
});

test('PFB8 (pf-b Many and ManyDesk "Warnings and fit", F29, A13, R1): "Your 200 plants in N lines that add up.", the closed lines "Fits your place", "Needs a second look", "Outside its climate range", "Not checked" with the engine\'s counts (a line at 0 hidden); "Needs a second look" opens to its reasons; "Toxic or very toxic" to "Very toxic, N: …" and "Toxic, M: …"; "R reasons on the L plants: S carry two."; "Mildly toxic N" its own line, "…K of the N are on the line “Fits your place”"', async () => {
  const page = await boardPalette('kiambu-200', { width: 1280 });
  const g = await fitOf(page);
  const w = await section(page, 'Warnings and fit', 20_000);
  const lines = [['Fits your place', g.fits], ['Needs a second look', g.look], ['Outside its climate range', g.outside], ['Not checked', g.unknown]];
  const shown = lines.filter(([, ids]) => ids.length);
  assert.ok(w.includes(`Your 200 plants in ${shown.length} lines that add up.`), `board: "Your 200 plants in ${shown.length} lines that add up."`);
  let bs = await buttons(page);
  for (const [head, ids] of lines) {
    const b = bs.find((x) => x === `${head} ${ids.length}` || x === `${head}${ids.length}`);
    if (ids.length) {
      assert.ok(b, `board: the line "${head} ${ids.length}"`);
      assert.equal(await page.$eval(aria('button', b), (e) => e.getAttribute('aria-expanded')), 'false', `board: "${head}" starts closed`);
    } else assert.ok(!bs.some((x) => x.startsWith(head)), `A13: "${head}" at 0 is hidden`);
  }
  if (g.look.length) {
    await press(page, 'button', bs.find((x) => x.startsWith('Needs a second look')));
    bs = await buttons(page);
    const edge = g.reasons.edge.length, tox = g.reasons.severe.length + g.reasons.moderate.length, inv = g.reasons.invasive.length;
    if (edge) assert.ok(bs.some((x) => x.replace(/ /g, '') === `Neartheedgeoftheirclimaterange${edge}`), `board: "Near the edge of their climate range ${edge}"`);
    if (inv) assert.ok(bs.some((x) => x.replace(/ /g, '') === `RecordedinvasiveinKenya${inv}`), `board: "Recorded invasive in Kenya ${inv}"`);
    if (tox) {
      const b = bs.find((x) => x.startsWith('Toxic or very toxic'));
      assert.ok(b && b.endsWith(String(tox)), `board: "Toxic or very toxic ${tox}"`);
      await press(page, 'button', b);
      if (g.reasons.severe.length) await says(page, `Very toxic, ${g.reasons.severe.length}: `);
      if (g.reasons.moderate.length) await says(page, `Toxic, ${g.reasons.moderate.length}: `);
    }
    if (g.several) await says(page, `${g.reasonCount} reason${g.reasonCount === 1 ? '' : 's'} on the ${g.look.length} plant${g.look.length === 1 ? '' : 's'}: ${g.several} carr${g.several === 1 ? 'ies' : 'y'} two.`);
    else await saysNot(page, /\d+ reasons? on the \d+ plants?: 0 carry two/, 'R7: no note when no plant carries two reasons');
    if (g.outsideToxic.length === 1) await says(page, ', outside its climate range, is toxic too and is counted on that line.');
  }
  if (g.mild.length) {
    const b = (await buttons(page)).find((x) => x.replace(/ /g, '') === `Mildlytoxic${g.mild.length}`);
    assert.ok(b, `board: "Mildly toxic ${g.mild.length}" its own line`);
    // BC14: the sentence under the closed line, with common foods named.
    await says(page, 'Mildly toxic is a mark on the plant, not a second look');
    await says(page, `${g.mildFits} of the ${g.mild.length} ${g.mildFits === 1 ? 'is' : 'are'} on the line “Fits your place”.`);
    assert.equal(await page.$eval(aria('button', b), (e) => e.getAttribute('aria-expanded')), 'false', 'BC14: said while the line is closed');
  }
  assert.ok(!(await buttons(page)).some((x) => x.startsWith('Tick these')), 'A15: no "Tick these" (pf-e)');
  await done(page);
});

test('PFB9 (pf-b MainMore Balance, carried from PP-B60 and PP-B63): "Balance things to weigh, not holes"; a family line in the board\'s words; at a place with a dry summer "Water needs: …" (Seville, Csa); "Soil: N hints on pH" (N the members whose verdict carries a pH hint) naming them', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  const f = await figures(page);
  const hinted = await page.evaluate(() => { const s = window.__ctTest.store; return s.memberTaxa.value.filter((t) => s.memberVerdicts.value?.get(t.id)?.factors.some((x) => x.factor === 'soil-ph' && x.level !== 'fits' && x.level !== 'unknown')).map((t) => t.id); });
  const b = await section(page, 'Balance');
  assert.ok(b.startsWith('Balance things to weigh, not holes'), `board: the heading ("${b.slice(0, 60)}")`);
  assert.match(b, /One family: \d+ of your 13 are (?:legumes|[A-Z][a-z]+aceae)/, 'board: "One family: 4 of your 13 are legumes"');
  // The board's line is "Water needs: all 12 recorded take a dry summer"; the figures are the engine's,
  // so where a member needs regular water the line says the mix ("Water needs differ: …").
  assert.match(b, /Water needs: /, 'board: "Water needs…" at a place with a dry summer');
  assert.doesNotMatch(b, /Water needs differ|Water them apart|Water need not recorded for/, 'BC17: the board\'s mixed form, never the old "differ" wording');
  if (/thirsty plants? among \d+ recorded/.test(b)) assert.match(b, /Recorded for \d+ of 13\./, 'BC17: "Recorded for N of M."');
  if (/not recorded/.test(b)) assert.match(b, /\d+ not recorded(?: \([^)]+\): that is not a pass\.|: )/, 'BC17: the plants not recorded named');
  await saysNot(page, 'How much water the sources record each plant as using.', 'no "Water use" card at a place with a dry summer');
  if (hinted.length) assert.ok(b.includes(`Soil: ${hinted.length} hint${hinted.length === 1 ? '' : 's'} on pH${listEn(hinted.map((id) => f.names[id]))}`) || b.includes(`Soil: ${hinted.length} hint${hinted.length === 1 ? '' : 's'} on pH ${listEn(hinted.map((id) => f.names[id]))}`), `board: "Soil: ${hinted.length} hints on pH" with the names`);
  // BC16 (the family line's Find action) is held until Find takes a job without a hole: PFB23.
  await done(page);
});

test('PFB10 (pf-b Kumasi Water use, carried from PP-B63): at a place without a dry summer the card "Water use" says "How much water the sources record each plant as using. No check uses dry months: they are a reading of your place.", then the recorded groups by name, then "N not recorded: …. That is not a pass."', async () => {
  const page = await boardPalette('kumasi-today', { width: 1280 });
  const w = await section(page, 'Water use');
  assert.ok(w.includes('How much water the sources record each plant as using. No check uses dry months: they are a reading of your place.'), 'board: the Water use sentence');
  assert.match(w, /Recorded as using a lot of water: |A medium amount: |Little: /, 'board: a recorded group');
  if (/not recorded/.test(w)) assert.match(w, /\d+ not recorded: .+\. That is not a pass\./, 'board: "N not recorded: …. That is not a pass."');
  const bold = await inSection(page, 'Water use', (sec) => [...sec.querySelectorAll('strong, b')].map((e) => e.textContent.trim()));
  assert.ok(bold.some((x) => /^(Recorded as using a lot of water:|A medium amount:|Little:)$/.test(x)), `BC18: the group labels bold (${bold.join(' | ')})`);
  await saysNot(page, /Water needs: /, 'no "Water needs" line where the summer is not dry');
  // Round 2 R6: on a borrowed list the heading reads "Water use estimate", a word apart.
  await page.evaluate(() => { const s = window.__ctTest.store, c = s.climate.value; s.pools.value = { ...s.pools.value, [c]: s.pools.value[c].map((t) => ({ ...t, origin: { list: c, kind: 'borrowed' } })) }; });
  assert.ok(await has(page, aria('heading', 'Water use estimate'), 6000), 'R6: the heading "Water use estimate"');
  await done(page);
});

test('PFB11 (pf-b Toasts "How to read this", Q8, A18, carried from PP-B8): under the picture\'s title a closed "How to read this" opens to the board\'s paragraphs (the light levels, the dashed hole, "Your place in figures"); the table stays in the page as the screen-reader form, every member once with its light words; no "Show as a table"', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  const f = await figures(page);
  await section(page, 'Through the years');
  assert.equal(await page.$eval(aria('button', 'How to read this'), (e) => e.getAttribute('aria-expanded')).catch(() => null), 'false', 'board: "How to read this" starts closed');
  await press(page, 'button', 'How to read this');
  await says(page, 'Each row is a light level: Full sun at the top, then Mostly sun, Part shade, and Shade at the bottom.');
  await says(page, 'A dashed place is a hole: nobody stands there then.');
  await says(page, '“Your place in figures” lists everything the checks use and where each value comes from');
  // C4, BC19: the Toasts board's three other paragraphs, and the link under the Jobs title too.
  await says(page, en['consortium.palette.readJobs']);
  await says(page, 'A row with no toxicity mark has not been checked, or nothing was recorded.');
  await says(page, en['consortium.palette.readSyntropic']);
  assert.equal((await buttons(page)).filter((b) => b === 'How to read this').length, 2, 'BC19: "How to read this" under each picture\'s title, Jobs too');
  assert.ok((await inSection(page, 'Jobs', (sec) => [...sec.querySelectorAll('button')].some((b) => b.textContent.trim() === 'How to read this'))), 'BC19: one in Jobs');
  // BC19: a small panel under its button that pushes nothing down: the intro under it stays put.
  const boxes = await page.$eval(aria('button', 'How to read this'), (btn, intro) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const p = [...document.querySelectorAll('main p')].find((e) => e.textContent.includes(intro));
    const r = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
    return { btn: r(btn), panel: r(panel), intro: r(p) };
  }, en['consortium.palette.yearsIntro']);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval(aria('button', 'How to read this'), (e) => e.getAttribute('aria-expanded')), 'false', 'Escape closes the panel');
  const introClosed = await page.evaluate((intro) => [...document.querySelectorAll('main p')].find((e) => e.textContent.includes(intro)).getBoundingClientRect().top, en['consortium.palette.yearsIntro']);
  assert.ok(boxes.panel.top >= boxes.btn.bottom - 1, `BC19: the panel under its button (${JSON.stringify(boxes)})`);
  assert.ok(Math.abs(boxes.intro.top - introClosed) < 1, `BC19: the open panel pushes nothing down (intro at ${boxes.intro.top} open, ${introClosed} closed)`);
  assert.ok(boxes.panel.bottom > boxes.intro.top, 'BC19: the panel lies over the page, as on the board');
  const table = await page.$$eval('#ct-root table', (ts) => ts.map((t) => t.textContent.replace(/\s+/g, ' ')).join(' '));
  for (const id of f.ids) if (f.stratum[id]) assert.ok(table.includes(f.names[id]), `board: ${f.names[id]} in the table`);
  assert.ok(LIGHT.some((w) => table.includes(w)), 'board: the table in the light words');
  assert.doesNotMatch(table, OLD_LIGHT);
  assert.ok(!(await buttons(page)).includes('Show as a table'), 'Q8: no "Show as a table"');
  await done(page);
});

test('PFB12 (pf-b DarkMain): in the dark theme the same words and order as Main ("Through the years", the key, "Jobs"), and every text at 4.5:1 against what is behind it, at 1280 and 390 px', async () => {
  for (const [id, width] of [['seville-board', 1280], ['kiambu-8', 390]]) {
    const page = await boardPalette(id, { width, theme: 'dark' });
    await section(page, 'Through the years');
    if (width === 1280) await inOrder(page, ['Through the years', 'Colour and icon show each plant’s main job:', 'Jobs', 'Balance things to weigh, not holes']);
    else await says(page, 'Step through time; an empty light level is a hole.');
    assert.deepEqual(await lowContrast(page), [], `board: dark text at 4.5:1 (${width} px)`);
    await done(page);
  }
});

test('PFB13 (pf-b German, and 320 px, carried from PP-B22 and old PFB11): in German "Pflanzenpalette", "Nächster Schritt", "Hinzufügen", "Später", "Ändern", "Lücke 1 von N", "Alle N Pflanzen ansehen", Jobs "Aufgaben" with "Du willst 2 Pflanzen je Aufgabe (Pflanzen je Aufgabe: 2)" and the legend; long words never pass the right edge at 390 and 320 px, nor in ru and ja at 320', async () => {
  const de = await boardPalette('seville-board', { lang: 'de', width: 390 });
  for (const w of ['Pflanzenpalette', 'Nächster Schritt', 'Hinzufügen', 'Später', 'Ändern']) await says(de, w);
  await says(de, /Lücke 1 von \d+/);
  await says(de, /Alle \d+ Pflanzen ansehen/);
  await section(de, 'Aufgaben');
  await says(de, 'Du willst 2 Pflanzen je Aufgabe (Pflanzen je Aufgabe: 2)');
  await says(de, '2 oder mehr Pflanzen · 1 Pflanze zwischen Jahr 1 und Jahr 60: dünn besetzt · niemand: eine Lücke');
  assert.deepEqual(await pastEdge(de), [], 'board: German at 390 px');
  await done(de);
  for (const lang of ['de', 'ru', 'ja', 'en']) {
    const page = await boardPalette('seville-board', { lang, width: 320 });
    assert.deepEqual(await pastEdge(page), [], `board: ${lang} at 320 px`);
    await done(page);
  }
});

test('PFB14 (pf-b MainMore foot, S9; DeskStates panel, C3, R4, R5): below the pictures "Your palette is saved on this device." with "Copy link", "Print" and "Download for Canopi"; "Copy link" a disclosure opening the panel under it with the link, "Copy" and "Include my place", at 1280 and 390; closing it puts the focus back on "Copy link"', async () => {
  for (const width of [1280, 390]) {
    const page = await boardPalette('seville-board', { width });
    await says(page, 'Your palette is saved on this device.');
    const all = [...(await buttons(page)), ...(await names(page, 'link'))];
    for (const b of ['Copy link', 'Print', 'Download for Canopi']) assert.ok(all.includes(b), `board: "${b}"`);
    const foot = await page.evaluate(() => { const e = [...document.querySelectorAll('#ct-root p, #ct-root div')].find((x) => x.textContent.trim().startsWith('Your palette is saved on this device.')); const r = e?.getBoundingClientRect(); return r ? r.top + scrollY : null; });
    const chart = await sectionBox(page, 'Through the years');
    assert.ok(foot && chart && foot > chart.y, 'board: the foot below the pictures');
    assert.equal(await page.$eval(aria('button', 'Copy link'), (e) => e.getAttribute('aria-expanded')), 'false', 'C3: "Copy link" a closed disclosure');
    await press(page, 'button', 'Copy link');
    await page.waitForSelector('#ct-share-panel input[data-share-location]', { timeout: 20_000 });
    assert.equal(await page.$eval(aria('button', 'Copy link'), (e) => e.getAttribute('aria-expanded')), 'true', 'R5: the button stays, expanded');
    await says(page, en['consortium.share.location']);
    assert.ok((await buttons(page)).includes('Copy'), 'C3: the panel\'s "Copy"');
    const link = await page.$eval('#ct-share-panel input:not([type="checkbox"]), #ct-share-panel textarea', (e) => e.value);
    assert.match(link, /#/, 'R4: the link built from the palette shown');
    await press(page, 'button', 'Close');
    assert.equal((await focused(page)).name, 'Copy link', 'R5: the focus back on "Copy link"');
    await done(page);
  }
});

test('PFB15 (pf-b Toasts, the removed line): removing a plant says "<plant> removed. Its holes are open again."', async () => {
  const page = await boardPalette('kiambu-8', { width: 1280 });
  const f = await figures(page);
  const id = f.ids[0];
  await page.evaluate((x) => window.__ctTest.store.removeMember(x), id);
  assert.ok(await page.waitForFunction(() => !!window.__ctTest.store.toast.value, { timeout: 4000 }).then(() => true, () => false), 'a toast');
  assert.ok((await toastText(page)).startsWith(`${f.names[id]} removed. Its holes are open again.`), `board: "${f.names[id]} removed. Its holes are open again." ("${await toastText(page)}")`);
  await done(page);
});

// Passes from commit 0 (shell.css gives every control of the tool the ring); pf-b keeps it passing as
// the pictures' controls change.
test('PFB16 (pf-b Focus): every control of the pictures, Jobs, Warnings, Balance and the foot shows a 2 px focus ring 2 px away when tabbed to, and the tab order follows the screen order', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  await section(page, 'Through the years');
  await page.evaluate(() => { const h = [...document.querySelectorAll('#ct-root h2, #ct-root h3')].find((e) => e.textContent.trim().startsWith('Through the years')); h.setAttribute('tabindex', '-1'); h.focus(); });
  const seen = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || !a.closest('#ct-root')) return null;
      const c = getComputedStyle(a), r = a.getBoundingClientRect();
      window.__pfbOrder = [...(window.__pfbOrder ?? []), a];
      const prev = window.__pfbOrder.at(-2);
      return { name: (a.getAttribute('aria-label') ?? a.textContent).trim().slice(0, 40), outline: c.outlineStyle, width: c.outlineWidth, offset: c.outlineOffset, after: !prev || !!(prev.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING), visible: r.width > 0 };
    });
    if (!s) break;
    seen.push(s);
  }
  assert.ok(seen.length >= 10, `board: the palette's controls take the focus (${seen.length})`);
  for (const s of seen.filter((x) => x.visible)) {
    assert.equal(s.outline, 'solid', `board: a ring on "${s.name}"`);
    assert.equal(s.width, '2px', `board: 2 px ring on "${s.name}"`);
    assert.equal(s.offset, '2px', `board: 2 px away on "${s.name}"`);
  }
  for (const s of seen) assert.ok(s.after, `board: "${s.name}" comes after the one before it`);
  await done(page);
});

test('PFB17 (pf-b section 6 neighbours, the goal control): at 1280 px "Plants per job" sits right of the Jobs title, on its line; at 320 px under the intro, nothing past the edge; the legend under the control', async () => {
  for (const width of [1280, 320]) {
    const page = await boardPalette('seville-board', { width });
    await section(page, 'Jobs');
    const pos = await page.evaluate(() => {
      const h = [...document.querySelectorAll('#ct-root h2, #ct-root h3')].find((e) => e.textContent.trim().startsWith('Jobs'));
      const g = document.querySelector('#ct-root [role="group"][aria-label="Plants per job"]');
      const legend = [...document.querySelectorAll('#ct-root p, #ct-root div')].find((e) => e.textContent.trim().startsWith('2 or more plants'));
      const intro = [...document.querySelectorAll('#ct-root p')].find((e) => e.textContent.includes('You want 2 plants for each job'));
      const b = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, right: r.right, bottom: r.bottom }; };
      return { h: b(h), g: b(g), legend: b(legend), intro: b(intro) };
    });
    assert.ok(pos.h && pos.g, 'board: the Jobs title and the control');
    if (width === 1280) assert.ok(pos.g.x > pos.h.right && Math.abs(pos.g.y - pos.h.y) < 40, `board: the control right of the title (${JSON.stringify(pos)})`);
    else assert.ok(pos.intro && pos.g.y >= pos.intro.bottom - 1, `board: the control under the intro on a phone (${JSON.stringify(pos)})`);
    assert.ok(pos.legend && pos.legend.y >= pos.g.bottom - 1, 'board: the legend under the control');
    // BC2: the four 44 px buttons in one row at every width.
    const ys = await page.$$eval('[role="group"][aria-label="Plants per job"] button', (es) => es.map((e) => Math.round(e.getBoundingClientRect().top)));
    assert.equal(new Set(ys).size, 1, `BC2: 1 2 3 5 in one row at ${width} px (${ys})`);
    assert.deepEqual(await pastEdge(page), [], `board: nothing past the edge at ${width} px`);
    await done(page);
  }
});

// The climate check refused (carried from PP-B20, PP-B49, PP-B50; c2's rule): the notice's words are the
// keys consortium.palette.verdictFailed and consortium.load.retry (not pf-b's; the board's wording, "The
// climate check is not available right now…" with "Try again", is a hand-off), read from en.json.
test('PFB18 (pf-b the climate check notice, carried from old PFB9): refused, the page says the notice with its retry button in place; a retry that fails online offers "Reload"; the focus never falls to <body>; offline no Reload, and once back online it asks again (then Reload, the check still refused)', async () => {
  const notice = en['consortium.palette.verdictFailed'].split(':')[0], retry = en['consortium.load.retry'];
  const page = await palette({ block: { verdict: 404 } });
  assert.ok(await page.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the climate check refused');
  await says(page, notice);
  const members = await page.evaluate(() => window.__ctTest.store.members.value.length);
  await press(page, 'button', retry);
  assert.ok(await has(page, aria('button', 'Reload'), 8000), 'a retry that fails online offers "Reload"');
  await frames(page);
  assert.ok(!(await focused(page)).body, 'the focus stays in the tool');
  assert.equal(await page.evaluate(() => window.__ctTest.store.members.value.length), members, 'the plants stay');
  await done(page);
  const off = await palette({ block: { verdict: 'offline' } });
  assert.ok(await off.waitForFunction(() => window.__ctTest.store.verdictFailed.value, { timeout: 10_000 }).then(() => true, () => false), 'the climate check failed offline');
  await off.setOfflineMode(true);
  await frames(off);
  assert.equal(await off.$(aria('button', 'Reload')), null, 'no Reload while offline');
  await off.setOfflineMode(false);
  // Back online it asks again (store.ts 'online'); the check still refused, that retry failed online, so Reload.
  assert.ok(await has(off, aria('button', 'Reload'), 8000), 'back online it asks again; failed online, it offers Reload');
  await done(off);
});

test('PFB19 (pf-b fix round 1, BC1, C5; c2 H1): every toxic plant carries its toxicity mark with its words, an img labelled and titled "Toxic", "Mildly toxic" or "Very toxic", the level word in its button\'s name, and the word seen beside the triangle where there is room (never the colour alone): on the bars at 1280 (seville-board) and the chips at 390 (kiambu-8)', async () => {
  for (const [id, width] of [['seville-board', 1280], ['kiambu-8', 390]]) {
    const page = await boardPalette(id, { width });
    const f = await figures(page);
    await section(page, 'Through the years');
    const marks = await page.$$eval('#ct-years button[data-plant-id]', (bs) => bs.map((b) => ({ id: b.dataset.plantId, label: b.getAttribute('aria-label'), img: b.querySelector('svg[role="img"]')?.getAttribute('aria-label') ?? null, title: b.querySelector('svg[role="img"] title')?.textContent ?? null, text: b.innerText.replace(/\s+/g, ' ').trim(), width: b.getBoundingClientRect().width })));
    assert.ok(marks.length > 0, `the plant buttons at ${width} px`);
    for (const m of marks) {
      const level = f.tox[m.id];
      if (level) {
        assert.equal(m.img, TOX[level], `${f.names[m.id]}: the "${TOX[level]}" mark`);
        assert.equal(m.title, TOX[level], `${f.names[m.id]}: the mark's title "${TOX[level]}" (c2 H1)`);
        assert.ok(m.label.includes(TOX[level]), `${f.names[m.id]}: "${TOX[level]}" in its name ("${m.label}")`);
        // c2 H1: never the colour alone: the level word shown beside the triangle where there is room,
        // on every chip of the phone's time span and on a bar of 16rem or more.
        if (width === 390 || m.width >= 256) assert.ok(m.text.includes(TOX[level]), `H1: "${TOX[level]}" seen on ${f.names[m.id]} ("${m.text}", ${Math.round(m.width)} px)`);
        // c2 B1 (fix C1): a bar too narrow for the word shows its level as a three-dot meter apart from the
        // triangle, seen without hovering ("●○○" Mildly toxic, "●●○" Toxic, "●●●" Very toxic); never a
        // "!", which the triangle draws already (C1); no bar title (C2).
        if (width === 1280) {
          const seen = m.text.includes(TOX[level]) ? TOX[level] : (/([●○]{3})$/.exec(m.text)?.[1] ?? '');
          assert.ok(seen === TOX[level] || seen === TOX_MARKS[level], `B1: the level of ${f.names[m.id]} seen on its ${Math.round(m.width)} px bar ("${m.text}"; ${TOX[level]}: "${TOX_MARKS[level]}")`);
          assert.ok(!/!/.test(m.text), `C1: no "!" mark on ${f.names[m.id]} beside the triangle ("${m.text}")`);
        }
      } else assert.equal(m.img, null, `${f.names[m.id]}: no toxicity mark`);
    }
    if (width === 1280) {
      assert.ok(marks.some((m) => f.tox[m.id] && m.width >= 256), 'H1: seville-board has a long toxic bar');
      assert.ok(marks.some((m) => f.tox[m.id] && m.width < 256), 'B1: seville-board has a toxic bar too narrow for the word (1 to 2 spans)');
      await press(page, 'button', 'How to read this');
      await says(page, 'the dots after the triangle say the toxicity level: ●○○ Mildly toxic, ●●○ Toxic, ●●● Very toxic.');
      await page.keyboard.press('Escape');
    }
    assert.ok(marks.some((m) => f.tox[m.id]), `${id}: a toxic member shown`);
    // BC21: the header steps on one line, the done step a check, "›" between them.
    const steps = await page.$$eval('nav[aria-label="Steps"] li', (ls) => ls.map((l) => ({ top: Math.round(l.getBoundingClientRect().top), text: l.innerText.replace(/\s+/g, ' ').trim() })));
    assert.equal(new Set(steps.map((x) => x.top)).size, 1, `BC21: the steps on one line at ${width} px`);
    assert.equal(steps[0].text, '\u2713 Your place', 'BC21: the done step a check');
    // Round 2 R5: the done step says its place and that it is done, as the later steps say theirs.
    assert.ok(await has(page, aria('button', '1 Your place, done'), 2000), 'R5: "1 Your place, done"');
    await done(page);
  }
});

test('PFB20 (pf-b fix round 1, C1, BC6; round 2 R2, C2): in a palette of 40 plants or fewer, a light level of more than 12 plants that count shows its count cell (three names and "+ N more"), never every bar; the head\'s figure and the cell count the same plants, those outside their climate range left out of both, each of those still a button that says so; the head is the board\'s bare "Full sun N plants"; the key lists the six jobs', async () => {
  const page = await boardPalette('kiambu-200', { width: 1280 });
  const f = await figures(page);
  const out = (id) => f.levels[id] === 'outside';
  const byLevel = STRATA.map((s) => ofStratum(f, s));
  const big = byLevel.findIndex((ids) => ids.filter((id) => !out(id)).length >= 13);
  assert.ok(big >= 0, 'kiambu-200 has a light level of 13 or more plants in range');
  // 12 that count and one outside its range in that level (the review's scenario: folded on 13 drawn
  // plants while the head says 12), then the other levels, 34 plants in all.
  const outsider = byLevel[big].find(out) ?? byLevel.flatMap((ids) => ids).find(out);
  const twelve = byLevel[big].filter((id) => !out(id)).slice(0, 12);
  const others = byLevel.flatMap((ids, i) => (i === big ? [] : ids.filter((id) => !out(id)).slice(0, 5)));
  const small = [...twelve, ...(outsider ? [outsider] : []), ...others].slice(0, 34);
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, small);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  await frames(page);
  const rowOf = (key) => page.$eval(`#ct-years [data-lane="${key}"]`, (r) => ({
    text: r.innerText.replace(/\s+/g, ' ').trim(),
    plants: [...r.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent.trim()),
    items: r.querySelectorAll('li').length,
  }));
  const level = LEVEL[STRATA[big]];
  let row = await rowOf(STRATA[big]);
  const head = Number(new RegExp(`^${esc(level)} (\\d+) plants?`).exec(row.text)?.[1]);
  assert.ok(head <= 12, `R2: the head counts the plants in range (${row.text.slice(0, 60)})`);
  assert.ok(!row.plants.some((b) => /^\+ \d+ more$/.test(b)), `R2: 12 plants that count are every bar, never folded on the plant outside its range (${row.text.slice(0, 80)})`);
  assert.doesNotMatch(row.text.slice(0, 40), /outside/, 'C2: the board\'s bare head, no "· 1 outside its climate range"');
  if (outsider && f.stratum[outsider] === STRATA[big]) assert.ok(row.plants.some((b) => b.startsWith(f.names[outsider]) && /outside its climate range/i.test(b)), `R2: ${f.names[outsider]} a button saying it is outside its climate range`);
  // 13 that count: the count cell, its count the head's figure.
  const thirteen = byLevel[big].filter((id) => !out(id)).slice(0, 13);
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, [...thirteen, ...(outsider ? [outsider] : []), ...others].slice(0, 34));
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  await frames(page);
  row = await rowOf(STRATA[big]);
  const n = Number(new RegExp(`^${esc(level)} (\\d+) plants?`).exec(row.text)?.[1]);
  const more = Number(row.plants.map((b) => /^\+ (\d+) more$/.exec(b)?.[1]).find(Boolean));
  assert.ok(more > 0, `C1: "+ N more" in the level's count cell (${row.text.slice(0, 80)})`);
  assert.equal(row.items + more, n, `R2: the cell lists the head's ${n} plants (${row.items} shown + ${more} more)`);
  const named = row.plants.filter((b) => thirteen.some((id) => b.startsWith(f.names[id]))).length;
  assert.equal(named, row.items, 'C1: no bar for a plant of the folded level, only its name in the cell');
  if (outsider && f.stratum[outsider] === STRATA[big]) assert.ok(row.plants.some((b) => b.startsWith(f.names[outsider]) && /outside its climate range/i.test(b)), `R2: ${f.names[outsider]} listed apart, saying it is outside its climate range`);
  await inOrder(page, ['Colour and icon show each plant’s main job:', ...JOBS]);
  await done(page);
});

test('PFB21 (pf-b fix round 1, C2, R6): on an untouched suggestion the Jobs rows say no thin spot ("Add a backup." hidden, the count in the goal sentence kept); at a goal of 1 the goal sentence says "You want 1 plant for each job (Plants per job: 1)"', async () => {
  const page = await boardPalette('kiambu-8', { width: 1280 });
  const f = await figures(page);
  await page.evaluate(() => { const s = window.__ctTest.store; s.suggestedIds.value = [...s.members.value]; });
  await frames(page);
  const jobs = await section(page, 'Jobs');
  assert.ok(!jobs.includes('Add a backup.'), 'C2: no thin sentence on an untouched suggestion');
  if (f.openThin) assert.ok(jobs.includes(`then ${f.openThin} thin spot`), 'C2: the head count kept');
  await press(page, 'button', '1');
  await frames(page);
  await says(page, 'You want 1 plant for each job (Plants per job: 1)');
  await done(page);
});

test('PFB22 (pf-b fix round 1, BC3, R2, BC12): past 40 plants no paragraph of Balance or Water lists more than 12 names; the long groups fold to a count cell with "+ N more"; folded names in alphabetical order', async () => {
  const page = await boardPalette('kiambu-200', { width: 390 });
  await section(page, 'Jobs', 20_000);
  const read = (sec) => ({
    paras: [...sec.querySelectorAll('p')].map((p) => p.textContent),
    // A count cell: a list with "+ N more" right after it (its own fold's actions).
    cells: [...sec.querySelectorAll('ul')].filter((u) => [...(u.parentElement?.querySelectorAll(':scope > p > button') ?? [])].some((b) => /^\+ \d+ more$/.test(b.textContent.trim()))).map((u) => [...u.querySelectorAll(':scope > li')].map((l) => l.textContent.trim())),
  });
  const parts = [await inSection(page, 'Balance', read), await inSection(page, 'Water use', read)].filter(Boolean);
  for (const p of parts.flatMap((x) => x.paras)) assert.ok((p.match(/, /g) ?? []).length < 12, `R2: no paragraph naming every plant ("${p.slice(0, 80)}…")`);
  const cells = parts.flatMap((x) => x.cells);
  assert.ok(cells.length > 0, 'BC3: the count cells in Balance');
  const order = new Intl.Collator('en');
  for (const c of cells) assert.deepEqual(c, [...c].sort(order.compare), `BC12: alphabetical (${c.join(', ')})`);
  await done(page);
});

// M24: Find takes a job and a predicate without a hole (store.ts SheetFor fits + title).
test('PFB23 (pf-b round 2 R1, C1; c2 C3; M24): board MainMore\'s Balance offers "Find a soil feeder of another family" under the legume line, and it opens Find under that title listing only plants that feed the soil and are not of that family (never an unfiltered list)', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  const b = await section(page, 'Balance');
  const fam = /One family: \d+ of your \d+ are legumes/.test(b) ? 'Fabaceae' : null;
  assert.ok(fam, `seville-board has the legume line (${b.slice(0, 80)})`);
  assert.ok((await buttons(page)).includes('Find a soil feeder of another family'), 'board: "Find a soil feeder of another family" under the legume line');
  await press(page, 'button', 'Find a soil feeder of another family');
  assert.ok(await page.waitForFunction(() => document.querySelectorAll('dialog[open] [data-find-row][data-plant-id]').length > 0, { timeout: 15_000 }).then(() => true, () => false), 'Find lists plants');
  assert.equal(await page.evaluate(() => document.querySelector('dialog[open] h2')?.textContent.trim()), 'Find a soil feeder of another family', 'Find says what it lists');
  const listed = await page.evaluate(() => {
    const s = window.__ctTest.store, byId = new Map((s.pool.value ?? []).map((t) => [t.id, t]));
    return [...document.querySelectorAll('dialog[open] [data-find-row][data-plant-id]')].map((li) => { const t = byId.get(li.dataset.plantId); return { name: t?.names?.en || t?.canonical_name, family: t?.family, fixer: !!t?.functions?.some((x) => x.function === 'nitrogen_fixer') }; });
  });
  for (const t of listed) assert.ok(t.fixer && t.family !== fam, `R1: ${t.name} feeds the soil and is not a legume (${t.family})`);
  await done(page);
});

test('PFB24 (pf-b c2 R1, C1, D1): a Jobs row counts and names the plants its strip counts (the lane\'s figures, span by span); those outside their climate range are named apart ("2 more do this but are outside their climate range (Cashew, Coconut): not counted here."), past 40 plants (the row button\'s figure, the open row) and at 40 or fewer (the names in the board\'s plain list)', async () => {
  const page = await boardPalette('kiambu-200', { width: 1280 });
  const f = await figures(page);
  const out = (lv) => (id) => lv[id] === 'outside';
  const doers = await jobDoers(page);
  // Past 40: each row button's figure holds its lane's figure in every span, and with the plants named
  // apart in the open row it makes every member doing the job.
  for (const j of JOB_IDS) {
    const all = doers[j] ?? [], lane = laneOf(f, j);
    const label = (await buttons(page)).find((x) => x.startsWith(`${JOB[j]} `) || x === JOB[j]);
    const m = new RegExp(`^${esc(JOB[j])} ?(\\d+) plants?(?: · a hole)?$`).exec(label ?? '');
    assert.ok(m, `R1: the ${JOB[j]} row button (${label})`);
    const n = Number(m[1]);
    assert.ok(lane.counts.every((k) => k <= n), `R1, D1: ${JOB[j]} ${plants(n)} holds its lane's figures (${lane.counts.join(' ')})`);
    if (n === all.length) continue;
    await press(page, 'button', label);
    await says(page, `${all.length - n} more ${all.length - n === 1 ? 'does this but is' : 'do this but are'} outside`);
    await press(page, 'button', label);
  }
  const outFood = (doers.feeds_you ?? []).map((d) => d.id).filter(out(f.levels));
  assert.ok(outFood.length >= 2, 'kiambu-200: plants that feed you outside their range');
  // 40 or fewer: kiambu-8 and two of those; Feeds you counts and names the others, the two apart.
  const two = outFood.slice(0, 2);
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, [...scenario('kiambu-8').input.members, ...two]);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  await frames(page);
  const g = await figures(page);
  const small = await jobDoers(page);
  const row = await jobRowRead(page, 'feeds_you');
  rowMatchesLane(row, laneOf(g, 'feeds_you'), small.feeds_you, 'feeds_you');
  const jobs = await section(page, 'Jobs');
  assert.ok(row.n > 0 && jobs.includes(`Feeds you ${plants(row.n)}`), `R1: "Feeds you ${plants(row.n)}" (${jobs.slice(0, 400)})`);
  assert.ok(jobs.includes(listEn(row.names)), `C1: the names in the board's plain list ("${listEn(row.names)}")`);
  for (const id of two) assert.ok(!row.names.includes(g.names[id]), `R1: ${g.names[id]}, outside its range, not counted`);
  const outNames = two.map((id) => g.names[id]);
  assert.ok(jobs.includes(`2 more do this but are outside their climate range (${listEn(outNames)}): not counted here.`), `R1: the plants outside their range named apart (${jobs.slice(0, 700)})`);
  await done(page);
});

test('PFB26 (pf-b c2 B3): a job held only by plants outside their climate range: its head has no figure and the sentence never says "more" (Mango feeds you but is outside its range: "1 plant does this but is outside its climate range (Mango): not counted here."), beside the job\'s hole button', async () => {
  const page = await boardPalette('kiambu-200', { width: 1280 });
  const f = await figures(page);
  const food = (await jobDoers(page)).feeds_you.map((d) => d.id);
  const one = food.find((id) => f.levels[id] === 'outside');
  assert.ok(one, 'kiambu-200: a plant that feeds you outside its range');
  // kiambu-8 without its food plants, and that one.
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, [...scenario('kiambu-8').input.members, one]);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  const keep = (await jobDoers(page)).feeds_you.map((d) => d.id).filter((id) => id !== one);
  await page.evaluate((ids) => { const s = window.__ctTest.store; s.members.value = s.members.value.filter((id) => !ids.includes(id)); }, keep);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  await frames(page);
  const g = await figures(page);
  const row = await jobRowRead(page, 'feeds_you');
  assert.equal(row.n, 0, `the head has no figure (${row.lines.join(' / ')})`);
  const jobs = await section(page, 'Jobs');
  assert.ok(jobs.includes(`1 plant does this but is outside its climate range (${g.names[one]}): not counted here.`), `B3: no "more" beside no figure (${row.lines.join(' / ')})`);
  assert.ok(!/\bmore does this\b/.test(jobs.slice(jobs.indexOf('Feeds you'), jobs.indexOf('Feeds the soil'))), 'B3: never "more" in a row with no counted plant');
  assert.ok((await buttons(page)).some((b) => b.startsWith('Feeds you: nobody')), 'the job\'s hole button beside it');
  // Past 40 (F2): kiambu-200 without its food plants in range. The row button reads "Feeds you · a hole"
  // (never "0 plants"), and the open row names the plants outside their range without "more".
  await page.evaluate((ids) => { window.__ctTest.store.members.value = ids; }, scenario('kiambu-200').input.members);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  const lv = (await figures(page)).levels;
  const inRange = (await jobDoers(page)).feeds_you.map((d) => d.id).filter((id) => lv[id] !== 'outside');
  await page.evaluate((ids) => { const s = window.__ctTest.store; s.members.value = s.members.value.filter((id) => !ids.includes(id)); }, inRange);
  assert.ok(await verdictsSettled(page, 40_000), 'the verdicts');
  await frames(page);
  const big = await figures(page);
  const outside = (await jobDoers(page)).feeds_you.map((d) => d.id);
  assert.ok(Object.keys(big.levels).length > 40 && outside.length > 0, `past 40, plants that feed you outside their range (${outside.length})`);
  const label = (await buttons(page)).find((x) => x.startsWith('Feeds you') && !x.startsWith('Feeds you:'));
  assert.equal(label, 'Feeds you · a hole', 'F2: past 40 the row button has no figure when no plant counts');
  await press(page, 'button', label);
  const open = (await section(page, 'Jobs'));
  const n = outside.length;
  assert.ok(open.includes(`${n === 1 ? '1 plant does this but is outside its' : `${n} plants do this but are outside their`} climate range`), `F2: the open row names them apart (${open.slice(open.indexOf('Feeds you'), open.indexOf('Feeds you') + 300)})`);
  assert.ok(!/\bmore (does|do) this\b/.test(open.slice(open.indexOf('Feeds you'), open.indexOf('Feeds the soil'))), 'F2: never "more" past 40 either');
  await done(page);
});

test('PFB27 (pf-b c2 B2, D2): at 1280 a mouse that focuses no button (Safari, Firefox on macOS): "How to read this" opened by a click that leaves the focus on the page still closes on a click outside, and on Escape', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  await section(page, 'Jobs');
  const ids = await page.evaluate(() => [...document.querySelectorAll('#ct-root button[aria-controls]')].filter((b) => b.textContent.trim() === 'How to read this').map((b) => b.getAttribute('aria-controls')));
  assert.equal(ids.length, 2, 'two "How to read this"');
  const toggle = `button[aria-controls="${ids[1]}"]`;
  // A click that focuses nothing: the button activated, the focus left on the page.
  const openNoFocus = async () => {
    await page.evaluate(() => document.activeElement?.blur());
    await page.evaluate((sel) => document.querySelector(sel).click(), toggle);
    await frames(page);
    assert.equal(await page.evaluate((sel) => document.querySelector(sel).getAttribute('aria-expanded'), toggle), 'true', 'open');
    assert.equal(await page.evaluate((sel) => document.querySelector(sel).closest('div')?.contains(document.activeElement), toggle), false, 'the focus is not inside');
  };
  const isOpen = async () => { await frames(page); return page.evaluate((sel, id) => document.querySelector(sel).getAttribute('aria-expanded') === 'true' || !!document.getElementById(id)?.checkVisibility(), toggle, ids[1]); };
  await openNoFocus();
  // A click on empty page space, then on the goal button "2" under where the panel lay.
  await page.mouse.click(5, 300);
  assert.equal(await isOpen(), false, 'B2, D2: a click outside closes it');
  await openNoFocus();
  await page.keyboard.press('Escape');
  assert.equal(await isOpen(), false, 'B2: Escape closes it');
  await done(page);
});

test('PFB25 (pf-b c2 R2): at 1280 "How to read this" lies over the page, so it closes when the focus leaves it (Tab to "Plants per job" leaves the focused button seen, not under the panel) and on a click outside; one open at a time; Escape closes the panel holding the focus, the focus back on its button; an Escape elsewhere moves no focus', async () => {
  const page = await boardPalette('seville-board', { width: 1280 });
  await section(page, 'Jobs');
  const reads = [];
  for (const t of await page.$$('#ct-root button[aria-controls]')) if ((await t.evaluate((e) => e.textContent.trim())) === 'How to read this') reads.push(t);
  assert.equal(reads.length, 2, 'two "How to read this"');
  const [years, jobs] = reads;
  const expanded = (h) => h.evaluate((e) => e.getAttribute('aria-expanded'));
  // (1) Jobs open, Tab: the panel closes; the focused control is seen.
  await jobs.click();
  assert.equal(await expanded(jobs), 'true');
  await page.keyboard.press('Tab');
  await frames(page);
  assert.equal(await expanded(jobs), 'false', 'R2: Tab out of the panel closes it');
  const seen = await page.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { name: a.textContent.trim(), seen: !!at && (at === a || a.contains(at)) }; });
  assert.ok(seen.seen, `R2: "${seen.name}" is not under the panel`);
  // A click on its words keeps it open; a click outside closes it.
  await jobs.click();
  const body = await jobs.evaluate((e) => e.getAttribute('aria-controls'));
  await page.click(`[id="${body}"] p`);
  await frames(page);
  assert.equal(await expanded(jobs), 'true', 'a click on its words keeps it open');
  await page.mouse.click(5, 300);
  await frames(page);
  assert.equal(await expanded(jobs), 'false', 'R2: a click outside closes it');
  // (2) Years open, then Jobs: one open at a time; Escape closes it, the focus on its button.
  await years.click();
  await jobs.click();
  await frames(page);
  assert.equal(await expanded(years), 'false', 'R2: opening the other panel closes the first');
  await page.keyboard.press('Escape');
  await frames(page);
  assert.equal(await expanded(jobs), 'false', 'Escape closes the panel');
  assert.equal(await page.evaluate((e) => document.activeElement === e, jobs), true, 'the focus back on its button');
  // Years open, the focus moved into the grid: the panel closed; an Escape there moves no focus.
  await years.click();
  await page.evaluate(() => document.querySelector('#ct-years button[data-plant-id]').focus());
  await frames(page);
  assert.equal(await expanded(years), 'false', 'R2: the focus left the panel, so it closed');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => !!document.activeElement?.matches('#ct-years button[data-plant-id]')), true, 'R2: the focus stays where the grower is');
  await done(page);
});
