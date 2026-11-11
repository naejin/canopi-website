// Stream S2's browser tests (matrix, phone grid and stepper, side view, Jobs, plant list; review C1).
// S2 edits only this file among the browser tests. Design check §7 BT-2, BT-3, BT-4. Run capped:
// npm run test:browser (see consortium-commit0).
//
// The views are reached through S2's test hook (Matrix.tsx; stream S3's pattern): the site is built
// with PUBLIC_CT_TEST_HOOK=1, and a page opened with window.__ctViews = true gets the store, so a test
// sets the climate, the site's room, the members (a suggestion, or 120 real ids) and the view without
// stream S4's start screen. A production build has no hook. "Show them anyway" and the side view's
// key open stream S3's dialogs: those two stay todo until the streams meet.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, startHarness } from './harness.mjs';
import { aria, axNodes, eachVariant, en, findAx, has, realDb } from './helpers.mjs';

let h;
before(async () => { h = await startHarness(); });
after(async () => { await h?.close(); });

const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
const PHASES = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];
const plain = (ord) => en[`consortium.phase.${PHASES[ord]}.plain`];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OPEN = en['consortium.matrix.open'];
const fill = (key, vars) => en[`consortium.${key}`].replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// A page of the views through the test hook: climate, room, members (null: "Suggest plants") and view.
async function views(v, { data = 'fixture', lang = 'en', climate = 'Temperate', room = null, members = null, view = 'matrix' } = {}) {
  const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/`, { ...v, data });
  await page.evaluateOnNewDocument(() => { window.__ctViews = true; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await loadState(page), 'ready');
  const hooked = await page.waitForFunction(() => window.__ctViews?.store?.source.value, { timeout: 20_000 }).then(() => true, () => false);
  assert.ok(hooked, 'no S2 test hook: build the site with PUBLIC_CT_TEST_HOOK=1 npm run build');
  const set = await page.evaluate(async (o) => {
    const { store } = window.__ctViews;
    store.climate.value = o.climate;
    if (o.room) store.site.value = { ...store.site.value, room: o.room };
    if (!(await store.loadPool(o.climate))) return 'no pool';
    if (o.members) store.members.value = o.members;
    else if (!store.suggestMembers()) return 'no suggestion';
    store.view.value = o.view;
    return 'ok';
  }, { climate, room, members, view });
  assert.equal(set, 'ok');
  assert.ok(await has(page, `#ct-panel-${view === 'start' ? 'matrix' : view} > *`, 10_000), `the ${view} view`);
  return page;
}
const store = (page, fn, ...args) => page.evaluate(fn, ...args);

// The whole accessibility tree (the shared axNodes keeps "interesting" nodes only, which drops tables,
// cells and rows), and a polling search over it; an image's role reads "image" in recent Chrome.
async function allAx(page) {
  const out = [];
  const walk = (n) => { if (!n) return; out.push(n); for (const c of n.children ?? []) walk(c); };
  walk(await page.accessibility.snapshot({ interestingOnly: false }));
  return out;
}
const IMG = /^(img|image)$/;
async function find(page, { role, name }, timeout = 4000) {
  const ok = (n) => (!role || (role instanceof RegExp ? role.test(n.role) : n.role === role)) && (name === undefined || (name instanceof RegExp ? name.test(n.name ?? '') : n.name === name));
  const until = Date.now() + timeout;
  for (;;) {
    const hit = (await allAx(page)).find(ok);
    if (hit || Date.now() > until) return hit ?? null;
    await new Promise((r) => setTimeout(r, 150));
  }
}

// The accessible names of a tab panel's Tab stops, from its first focusable element until focus
// leaves it.
async function tabStops(page, panel) {
  await page.evaluate((sel) => {
    const first = document.querySelector(sel)?.querySelector('button, a[href], input, select, [tabindex="0"]');
    first?.focus();
  }, panel);
  const names = [];
  for (let i = 0; i < 400; i++) {
    const name = await page.evaluate((sel) => {
      const a = document.activeElement;
      if (!a || !a.closest(sel)) return null;
      return (a.getAttribute('aria-label') ?? a.textContent ?? '').trim();
    }, panel);
    if (name === null) break;
    names.push(name);
    await page.keyboard.press('Tab');
  }
  return names;
}

// What the desktop table says in one row's cell (its text and headers), or the phone grid's button.
async function cellSays(page, stratum, phase) {
  return page.evaluate((st, p) => {
    const row = document.querySelector(`#ct-panel-matrix tr[data-stratum-row="${st}"]`);
    if (!row) return null;
    const btn = row.querySelectorAll('td button')[p];
    if (document.querySelector('#ct-overview')) return { text: btn?.getAttribute('aria-label') ?? '', headers: '' };
    const td = [...row.querySelectorAll('td')].find((c) => (c.getAttribute('headers') ?? '').split(' ').includes(`ct-col-${p}`));
    return td ? { text: td.textContent.replace(/\s+/g, ' ').trim(), headers: td.getAttribute('headers') } : null;
  }, stratum, phase);
}
const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? document.activeElement?.getAttribute('aria-label') ?? null);

test('BT-2 (S2 matrix): real Temperate gap, Room Small misfits with reasons, one Tab stop per plant with layer and phase words, phone cells ≥ 40 px and a named, announced stepper', async (t) => {
  await eachVariant(t, async (v) => {
    const desk = v.width >= 640;
    // Real: Temperate low × "First 90 days" has no plant in the list (a cell on desktop, a grid
    // button on phones); on desktop the cell's headers name its row and columns.
    const real = await views(v, { data: 'real' });
    const gap = await cellSays(real, 'low', 0);
    assert.match(gap?.text ?? '', /No plant in the list for (this cell|these cells) yet/, `the gap is Temperate low × "First 90 days": ${gap?.text}`);
    if (desk) assert.match(gap.headers, /^ct-row-3 ct-col-0( |$)/, 'the merged cell names its row and columns');
    else assert.match(gap.text, new RegExp(`^Low, ${esc(plain(0))}: `), 'the phone cell names its layer and stage');
    assert.equal(await real.evaluate(() => performance.getEntriesByName('ct:matrix', 'mark').length), 1, 'performance.mark ct:matrix once, at the first matrix paint');

    // Fixture, Room Small: every emergent plant is over 6 m, so emergent's later stages say why.
    const page = await views(v, { room: 'small' });
    const misfit = (await Promise.all([3, 4, 5, 6].map((p) => cellSays(page, 'emergent', p)))).find((c) => /No plant fits your site here/.test(c?.text ?? ''));
    assert.ok(misfit, 'a misfit cell');
    if (desk) {
      assert.match(misfit.text, /grows? taller than 6 m/, 'the reason is counted and worded');
      assert.ok(await findAx(page, { role: 'button', name: /^Show them anyway: Emergent, / }), '"Show them anyway" names its cell');
      assert.equal(await page.$$eval('#ct-panel-matrix td.cannot[aria-label]', (els) => els.length), 0, 'a blocked cell is read from its content, never a second copy');
      assert.deepEqual(await page.$$eval('table.ct-mx > colgroup', (els) => els.map((e) => e.span)), [1, 3, 3, 1], 'column groups for Placenta, Secondary, Climax');
    }

    // Tab visits each plant once; each plant's name holds its layer and phase words.
    const chips = (await axNodes(page)).filter((n) => n.role === 'button' && (n.name ?? '').endsWith(OPEN));
    assert.ok(chips.length >= 1, 'plants to visit');
    for (const c of chips) assert.match(c.name, /\. (Emergent|High|Mid|Low), .*(days|Months|Years|years)/, `${c.name}: layer and phase words`);
    const stops = await tabStops(page, '#ct-panel-matrix');
    assert.equal(new Set(stops).size, stops.length, `no Tab stop twice: ${stops.filter((s, i) => stops.indexOf(s) !== i)}`);
    for (const c of chips) assert.equal(stops.filter((s) => s === c.name).length, 1, `${c.name} is one Tab stop`);
    if (desk) {
      const ids = await page.$$eval('#ct-panel-matrix table button[aria-label$="Open details"]', (els) => els.map((e) => e.getAttribute('aria-label')));
      assert.equal(new Set(ids).size, ids.length, 'a plant is one button in the matrix, its continuing pieces are text');
    }

    if (!desk) {
      const sizes = await page.$$eval('#ct-overview td', (cells) => cells.map((c) => { const r = c.getBoundingClientRect(); return [r.width, r.height]; }));
      assert.equal(sizes.length, 28, 'a 4 × 7 overview');
      assert.ok(sizes.every(([w, hgt]) => w >= 40 && hgt >= 40), `phone cells are at least 40 px: ${JSON.stringify(sizes.slice(0, 7))}`);
      const small = await page.$$eval('.ct-explain-btn, .ct-add-cell', (els) => els.map((e) => e.getBoundingClientRect().height).filter((x) => x < 36));
      assert.deepEqual(small, [], 'popover and "+ Add" buttons are at least 36 px tall on phones');
      assert.ok(await find(page, { role: 'group', name: 'Stage' }), 'the stepper is named');
      assert.ok(await page.$('.ct-stepper [aria-live="polite"]'), 'the stepper announces through aria-live');

      // At either end the step button keeps the focus: aria-disabled and a no-op, never `disabled`.
      const earlier = '#ct-stepper .ct-stepbtn:first-child', later = '#ct-stepper .ct-stepbtn:last-child';
      assert.equal(await page.$eval(earlier, (b) => [b.disabled, b.getAttribute('aria-disabled')].join()), 'false,true', 'Earlier at the first stage');
      await page.focus(earlier);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate((sel) => document.activeElement === document.querySelector(sel), earlier), true, 'Earlier keeps the focus at the first stage');
      assert.equal(await store(page, () => window.__ctViews.store.stage.value), 0);
      await page.focus(later);
      for (let i = 0; i < 6; i++) await page.keyboard.press('Enter');
      assert.ok(await findAx(page, { name: new RegExp(esc(plain(6))) }), 'Later reaches the last stage');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate((sel) => document.activeElement === document.querySelector(sel) && document.activeElement.getAttribute('aria-disabled') === 'true', later), true, 'Later keeps the focus at the last stage');

      // "Back to overview" scrolls and focuses the grid, keeping the page's share fragment.
      await page.evaluate(() => history.replaceState(null, '', '#share-fragment'));
      await page.locator(aria('button', en['consortium.matrix.back'])).click();
      assert.equal(await page.evaluate(() => location.hash), '#share-fragment', 'the share fragment stays');
      assert.equal(await focusedId(page), 'ct-overview', 'the grid has the focus');
    }
  });
});

test('BT-2 (S2 matrix): a collapsed cell (more than 5 tracks) lists its starters first, each plant one Tab stop', async (t) => {
  await eachVariant(t, async (v) => {
    if (v.width < 640) return; // the phone grid has no tracks
    // Every Temperate plant of the medium layer: far more than five tracks.
    const page = await views(v, { data: 'real' });
    await store(page, () => { const { store: s } = window.__ctViews; s.members.value = s.pool.value.filter((x) => x.stratum?.value === 'medium').map((x) => x.id); });
    assert.ok(await has(page, '.ct-cell-count', 5000), 'the medium row is collapsed');
    const order = await page.$$eval('tr[data-stratum-row="medium"] td', (tds) => tds.map((td) => [...td.querySelectorAll('.ct-pchip')].map((c) => c.tagName)));
    for (const chips of order) {
      const firstSpan = chips.indexOf('SPAN');
      assert.ok(firstSpan === -1 || !chips.slice(firstSpan).includes('BUTTON'), `starters (buttons) before continuing plants: ${chips}`);
    }
    const ids = await page.$$eval('#ct-panel-matrix table button[data-plant-id]', (els) => els.map((e) => e.dataset.plantId));
    assert.equal(new Set(ids).size, ids.length, 'no plant has two buttons');
  });
});

test('BT-2 (S2 matrix): the view tabs fit a 390 px phone in every language', async () => {
  for (const lang of LOCALES) {
    const page = await views({ width: 390, theme: 'light' }, { lang });
    const over = await page.$eval('.ct-tabs', (el) => ({ scroll: el.scrollWidth - el.clientWidth, out: [...el.children].filter((b) => b.getBoundingClientRect().right > innerWidth + 0.5).map((b) => b.textContent) }));
    assert.deepEqual(over, { scroll: 0, out: [] }, `${lang}: no tab overflows`);
    if (lang === 'de') assert.ok(await page.$eval('#ct-tab-matrix', (b) => b.textContent === 'Schichten × Stadien'), 'de: "Schichten × Stadien"');
    await page.close();
  }
});

test('BT-2 (S2 matrix): "Show them anyway" opens Add with the cell\'s plants', { todo: 'S2: the button sets addRequest and opens sheet add; the Add dialog is S3\'s' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await views(v, { room: 'small' });
    if (v.width < 640) for (let i = 0; i < 3; i++) await page.locator(aria('button', 'Later stage')).click();
    const btn = await findAx(page, { role: 'button', name: /^Show them anyway/ });
    await page.locator(aria('button', btn.name)).click();
    assert.ok(await findAx(page, { role: 'dialog', name: /^Add/ }), '"Show them anyway" opens Add');
  });
});

test('BT-3 (S2 side view): the chosen stage, a drawing with role=img and names, "Layer is light, not height"', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await views(v, { view: 'side' });
    if (v.width < 640) {
      await page.locator(aria('button', 'Later stage')).click();
      await page.locator(aria('button', 'Later stage')).click();
    } else {
      await page.locator(aria('button', `${plain(2)} · ${en['consortium.phase.placenta_iii.term']}`)).click();
    }
    assert.ok(await findAx(page, { role: 'heading', name: new RegExp(`^Side view: ${esc(plain(2))}`) }), 'the chosen stage is shown');
    const img = await find(page, { role: IMG, name: /^Side view: / });
    assert.ok(img && /Emergent: .*High: .*Mid: .*Low: /.test(img.name), `the drawing has role=img and names its plants by layer: ${img?.name}`);
    assert.ok(await findAx(page, { name: /Layer is light, not height/ }), '"Layer is light, not height"');
    const keys = (await axNodes(page)).filter((n) => n.role === 'button' && n.name && img.name.includes(n.name) && n.name.length > 2);
    assert.ok(keys.length >= 1, 'the key repeats the drawing\'s names as buttons');
    assert.ok(await page.$$eval('.ct-sv-key .ct-dim', (els) => els.some((e) => /up to [\d.]+ m in the wild/.test(e.textContent))), 'heights read "up to N m in the wild"');
  });
});

test('BT-3 (S2 side view): 8, 20 and 30 plants keep the scale: plants at full plot height, on the lines, at 390 and 1280', async (t) => {
  // The plants of the stage most Temperate plants grow in, from the real list.
  await eachVariant(t, async (v) => {
    const page = await views(v, { data: 'real', view: 'side' });
    const stage = await store(page, () => {
      const { store: s } = window.__ctViews, ph = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'];
      const n = [0, 1, 2, 3, 4, 5, 6].map((p) => s.pool.value.filter((x) => x.stratum && x.phases && ph.indexOf(x.phases.start) <= p && p <= ph.indexOf(x.phases.end)).length);
      const best = n.indexOf(Math.max(...n));
      s.stage.value = best;
      return { best, n: n[best] };
    });
    assert.ok(stage.n >= 30, `a stage with 30 plants (${JSON.stringify(stage)})`);
    for (const count of [8, 20, 30]) {
      await store(page, (k) => {
        const { store: s } = window.__ctViews, ph = ['placenta_i', 'placenta_ii', 'placenta_iii', 'secondary_i', 'secondary_ii', 'secondary_iii', 'climax'], p = s.stage.value;
        s.members.value = s.pool.value.filter((x) => x.stratum && x.phases && ph.indexOf(x.phases.start) <= p && p <= ph.indexOf(x.phases.end)).slice(0, k).map((x) => x.id);
      }, count);
      await page.waitForFunction((k) => document.querySelectorAll('.ct-sv-key li').length === k, { timeout: 5000 }, count);
      const g = await page.evaluate(() => {
        const svg = document.querySelector('.ct-sv-svg'), box = svg.getBoundingClientRect();
        const plants = [...svg.querySelectorAll('svg.ct-sv-plant > g')].map((el) => {
          const m = el.getScreenCTM(), r = el.getBoundingClientRect();
          return { scale: m.d, ground: m.f + 72 * m.d, x: m.e, frac: Number(el.dataset.frac), shape: el.dataset.shape, top: r.top };
        });
        const marks = [...svg.querySelectorAll('rect.ct-sv-mark')].map((el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width }; });
        const lines = [...svg.querySelectorAll('.ct-sv-line')].map((el) => el.getBoundingClientRect().top);
        const nums = [...document.querySelectorAll('.ct-sv-nums span')].map((el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; });
        return { top: box.top, bottom: box.bottom, height: box.height, plants, marks, lines, nums };
      });
      const frac = (m) => Math.log(m / 0.05) / Math.log(60 / 0.05);
      [1, 5, 20].forEach((m, i) => assert.ok(Math.abs(g.lines[i] - (g.top + (1 - frac(m)) * g.height)) <= 1.5, `${count}: the ${m} m line sits on the scale`));
      if (count <= 20) {
        assert.equal(g.plants.length, count, `${count} silhouettes`);
        for (const p of g.plants) {
          assert.ok(Math.abs(p.scale - g.height / 72) <= 0.01 * (g.height / 72), `${count}: a plant is drawn at the plot's full height (scale ${p.scale}, plot ${g.height})`);
          assert.ok(Math.abs(p.ground - g.bottom) <= 1, `${count}: a plant stands on the ground`);
          if (p.shape === 'tree' || p.shape === 'shrub') assert.ok(Math.abs(p.top - (g.top + (1 - p.frac) * g.height)) <= 2.5, `${count}: a ${p.shape} tops out at its height on the lines' scale`);
        }
        g.plants.forEach((p, i) => assert.ok(Math.abs(p.x - g.nums[i]) <= 1.5, `${count}: number ${i + 1} under its plant`));
      } else {
        assert.equal(g.marks.length, count, `${count} marks`);
        for (const r of g.marks) assert.ok(Math.abs(r.bottom - g.bottom) <= 1 && r.top >= g.top - 1, `${count}: a mark stands on the ground within the plot`);
      }
    }
  });
});

test('BT-3 (S2 side view): a name in the key opens its details', { todo: 'S2: the key sets sheet details; the Details dialog is S3\'s' }, async (t) => {
  await eachVariant(t, async (v) => {
    const page = await views(v, { view: 'side' });
    const img = await find(page, { role: IMG, name: /^Side view: / });
    const key = (await axNodes(page)).find((n) => n.role === 'button' && n.name && img.name.includes(n.name) && n.name.length > 2);
    await page.locator(aria('button', key.name)).click();
    assert.ok(await findAx(page, { role: 'dialog' }), 'the key opens details');
  });
});

test('BT-4 (S2 jobs and list): a 6-row Jobs table whose gaps name their stages; 120 real plants listed once each under their start cell; jump, filters and Remove', async (t) => {
  // 120 real Temperate plants with their start cell, from the database.
  const rows120 = await realDb((db) => db.prepare("SELECT p.id, p.canonical_name, x.stratum, x.phase_start FROM placements x JOIN plants p USING (plant) WHERE x.climate_zone = 'Temperate' AND x.stratum IS NOT NULL ORDER BY p.canonical_name LIMIT 120").all());
  assert.equal(rows120.length, 120);
  const ids = rows120.map((r) => r.id);
  const heading = Object.fromEntries(rows120.map((r) => [r.id, fill('list.group', { layer: en[`consortium.stratum.${r.stratum}`], stage: plain(r.phase_start) })]));
  await eachVariant(t, async (v) => {
    const page = await views(v, { view: 'jobs' });
    assert.ok(await find(page, { role: 'table', name: 'Who does what' }), 'the Jobs table');
    assert.equal((await allAx(page)).filter((n) => n.role === 'rowheader').length, 6, 'six jobs');
    assert.ok(await find(page, { role: 'cell', name: /No one does it in: .*(days|Months|Years|years)/ }), 'a gap names its stages');

    const real = await views(v, { data: 'real', members: ids, view: 'list' });
    const named = async () => (await allAx(real)).filter((n) => n.role === 'row' && n.name).map((n) => n.name);
    const rows = await named();
    for (const r of rows120) assert.equal(rows.filter((x) => x.endsWith(`, ${r.canonical_name}`)).length, 1, `${r.canonical_name} is listed once`);
    const under = await real.$$eval('tr[data-plant-id]', (trs) => trs.map((tr) => [tr.dataset.plantId, tr.closest('.ct-lgroup').querySelector('h3').firstChild.textContent.trim()]));
    assert.equal(under.length, 120);
    for (const [id, head] of under) assert.equal(head, heading[id], `${id} sits under its start cell`);

    // A count in "Where plants start" scrolls to its group and focuses its heading, keeping the
    // share fragment.
    await real.evaluate(() => history.replaceState(null, '', '#share-fragment'));
    const jump = await real.$eval('.ct-jump td.filled button', (b) => { b.click(); return b.getAttribute('aria-label'); });
    const focused = await real.evaluate(() => ({ id: document.activeElement?.id ?? '', text: document.activeElement?.firstChild?.textContent?.trim() ?? '' }));
    assert.match(focused.id, /^ct-g-.*-h$/, 'the group heading has the focus');
    assert.ok(jump.startsWith(focused.text), `the heading of "${jump}"`);
    assert.equal(await real.evaluate(() => location.hash), '#share-fragment', 'the share fragment stays');

    await real.locator(aria('checkbox', 'With a warning')).click();
    const after = await named();
    const warned = rows120.filter((r) => after.some((x) => x.endsWith(`, ${r.canonical_name}`))).length;
    assert.ok(warned > 0 && warned < 120, `the warning filter keeps the plants with a warning (${warned})`);
    assert.ok(await has(real, '.ct-list-shown'), 'the count shown');
    await real.locator(aria('checkbox', 'With a warning')).click();

    // Layer, Stage and Job filters; a jump cell whose group is filtered out is disabled.
    await real.select('#ct-list-layer', 'low');
    assert.ok(await real.$$eval('tr[data-plant-id]', (trs) => trs.length > 0 && trs.every((tr) => tr.closest('.ct-lgroup').id.startsWith('ct-g-low-'))), 'Layer: low only');
    assert.ok(await real.$$eval('.ct-jump tbody tr', (trs) => trs.slice(0, 3).every((tr) => [...tr.querySelectorAll('button')].every((b) => b.disabled))), 'the other layers\' jump cells are disabled');
    await real.select('#ct-list-layer', '');
    await real.select('#ct-list-stage', '0');
    const inStage0 = rows120.filter((r) => r.phase_start === 0).length;
    assert.ok((await real.$$eval('tr[data-plant-id]', (trs) => trs.length)) >= inStage0, 'Stage: every plant growing in it');
    await real.select('#ct-list-stage', '');
    await real.select('#ct-list-job', 'feeds_soil');
    const job = en['consortium.job.feeds_soil'];
    assert.ok(await real.$$eval('tr[data-plant-id] .ct-ljobs', (tds, j) => tds.length > 0 && tds.every((td) => td.textContent.includes(j)), job), 'Job: the soil feeders only');
    await real.select('#ct-list-job', '');

    // Remove takes the plant out of the consortium and moves the focus to the next row.
    const [first, second] = await real.$$eval('tr[data-plant-id]', (trs) => trs.slice(0, 2).map((tr) => tr.dataset.plantId));
    await real.$eval(`tr[data-plant-id="${first}"] .ct-lact button:last-child`, (b) => b.click());
    await real.waitForFunction((id) => !document.querySelector(`tr[data-plant-id="${id}"]`), { timeout: 3000 }, first);
    assert.equal(await store(real, (id) => window.__ctViews.store.members.value.includes(id) || !window.__ctViews.store.removed.value.includes(id), first), false, 'out of the members, into removed');
    await real.waitForFunction((id) => document.activeElement?.closest('tr')?.dataset.plantId === id, { timeout: 3000 }, second);
  });
});
