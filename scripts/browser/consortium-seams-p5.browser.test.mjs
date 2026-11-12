// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9, and the reviews of the branch, F1–F7). Every test here drives the page through its real
// controls, as a reader would; the test hook only makes the after-the-matrix chunk fail or wait (F4,
// F5), which no control can. Run capped: npm run test:browser.
//
// This file: the seams P5 added: Jobs and its stage gaps (UX4), late sheet close events (Item 8). Split from consortium-seams by owner (E1 design check A6); shared helpers in
// ./seams-helpers.mjs. Capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-seams-p5.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { useHarness, aria, axNodes, behaviour, en, findAx, has } from './helpers.mjs';
import { PHASES, done, temperate, suggested, memberIds, addRows } from './seams-helpers.mjs';

useHarness();

// UX audit fix 4: the headline counts the jobs done at every stage (it said "6 of 6 jobs are done"
// above a job missing from three stages), and each run of stages where a job is missing gets its own
// "Find…", which opens Add for that job and those stages. The suggestion is unchanged.
test('UX4: Jobs counts the jobs that cover every stage; each stage gap has a "Find…" that opens Add for that job and those stages', async (t) => {
  const plants = await temperate();
  const plain = (i) => en[`consortium.phase.${PHASES[i]}.plain`];
  const jobs = ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter'];
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'Jobs')).click();
    await page.waitForSelector('.ct-jobs-note', { timeout: 5000 });
    // Jobs lists every member that does a job (the phone matrix shows one stage at a time); a member
    // doing none changes no count and is in no job's Add.
    const members = new Set(await memberIds(page));
    const doers = (job) => plants.filter((p) => members.has(p.id) && p.jobs.has(job));
    // The stages each job is done in, from the data (each member covers its span).
    const runs = Object.fromEntries(jobs.map((job) => {
      const on = PHASES.map((_, i) => doers(job).some((p) => p.a <= i && i <= p.b));
      const out = [];
      for (let i = 0; i < 7; i++) if (!on[i]) { if (out.length && out.at(-1).to === i - 1) out.at(-1).to = i; else out.push({ from: i, to: i }); }
      return [job, out];
    }));
    const covered = jobs.filter((job) => runs[job].length === 0).length;
    const note = await page.$eval('.ct-jobs-note', (x) => x.textContent.trim());
    assert.match(note, new RegExp(`^${covered} of 6 jobs covers? every stage\\.$`), 'the headline counts the jobs at every stage');
    const gapped = jobs.filter((job) => doers(job).length && runs[job].length);
    assert.ok(gapped.length > 0, 'the suggestion leaves a job missing from some stages');
    const names = (await axNodes(page)).filter((n) => n.role === 'button').map((n) => n.name);
    const label = (job, r) => en['consortium.job.findFor'].replace('{find}', en[`consortium.job.${job}.find`]).replace('{stages}', r.from === r.to ? plain(r.from) : `${plain(r.from)} → ${plain(r.to)}`);
    for (const job of gapped) for (const r of runs[job]) assert.ok(names.includes(label(job, r)), `"${label(job, r)}"`);
    // The longest gap's "Find…": Add named for it, with the plants that do the job in one of those stages.
    const [job, r] = gapped.flatMap((j) => runs[j].map((x) => [j, x])).sort((a, b) => (b[1].to - b[1].from) - (a[1].to - a[1].from))[0];
    await page.locator(aria('button', label(job, r))).click();
    assert.ok(await findAx(page, { role: 'dialog', name: label(job, r) }), `Add is named "${label(job, r)}"`);
    const expected = plants.filter((p) => p.jobs.has(job) && p.a <= r.to && p.b >= r.from && !members.has(p.id)).map((p) => p.name).sort();
    assert.deepEqual((await addRows(page)).sort(), expected, `the plants that do "${job}" in ${label(job, r)}`);
    await done(page);
  }, { phone: true });
});

// Item 8 (ho-misc's flake trace): Escape closes a sheet's <dialog> at once and fires its close event a
// task later; a sheet opened in between (another plant, "+") must survive that late event.
test('Item 8: a sheet\'s late close event never closes the next sheet, opened in the same task', async (t) => {
  // The open dialog's name, once the page has had a few tasks to deliver the close event.
  const openName = (page) => page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 50));
    const d = document.querySelector('dialog.ct-sheet[open]');
    return d ? document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim() ?? '' : null;
  });
  await behaviour(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    const ids = await memberIds(page);
    assert.ok(ids.length >= 2, 'two plants to open');
    await page.locator(`#ct-root [data-plant-id="${ids[0]}"] button, #ct-root button[data-plant-id="${ids[0]}"]`).click();
    await page.waitForSelector('dialog.ct-sheet[open]', { timeout: 8000 });
    const second = await page.evaluate((id) => {
      const b = document.querySelector(`#ct-root [data-plant-id="${CSS.escape(id)}"] button, #ct-root button[data-plant-id="${CSS.escape(id)}"]`);
      document.querySelector('dialog.ct-sheet[open]').close(); // what Escape does
      b.click();
      return b.closest('[data-plant-id]').querySelector('.ct-sci')?.textContent.trim() ?? b.textContent.trim();
    }, ids[1]);
    const name = await openName(page);
    assert.ok(name !== null, 'Details → another plant: the second plant\'s sheet stays open');
    assert.ok(name.includes(second) || second.includes(name), `the second plant's sheet ("${name}", "${second}")`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('dialog.ct-sheet[open]').length), 1);

    // Details → Add: a filled cell's "+" opened as the plant's sheet closes.
    await page.locator('dialog.ct-sheet[open] .ct-sheet-head .ct-icon-button').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await page.locator(aria('tab', 'Layers × stages')).click();
    await page.click('#ct-root [data-plant-id] button, #ct-root button[data-plant-id]');
    await page.waitForSelector('dialog.ct-sheet[open]', { timeout: 8000 });
    await page.evaluate(() => {
      const plus = document.querySelector('#ct-root [data-add-filled]');
      document.querySelector('dialog.ct-sheet[open]').close();
      plus.click();
    });
    assert.match((await openName(page)) ?? '(none)', /^Add to /, 'Details → "+": Add stays open');
    await done(page);
  });
});
