// The seams between the four P2 streams (hand-off branch: H1–H16, seam review X1–X8, walk-through
// W1–W9, and the reviews of the branch, F1–F7). Every test here drives the page through its real
// controls, as a reader would; the test hook only makes the after-the-matrix chunk fail or wait (F4,
// F5), which no control can. Run capped: npm run test:browser.
//
// This file: the layout seams: control sizes (W6), the toast (W7), type (W8/W9), the matrix at each width (UX3, UX5, Item 7), pop-ups and toasts in the walk-through (Walk-through 2 N1/N2) and Start's layout stability. Split from consortium-seams by owner (E1 design check A6); shared helpers in
// ./seams-helpers.mjs. Capped:
//   timeout 600 systemd-run --user --scope -q -p MemoryMax=2G -p MemorySwapMax=0 \
//     node --experimental-strip-types --disable-warning=ExperimentalWarning --test scripts/browser/consortium-seams-layout.browser.test.mjs
// (npm run test:browser runs every file in shards: scripts/browser/run.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState } from './harness.mjs';
import { h, useHarness, aria, axNodes, eachVariant, en, findAx, has, settled } from './helpers.mjs';
import { esc, done, temperate, cellIn, suggested, memberIds, addRows, controls, MATRIX_40, focused, STRINGS, STABLE, MISMATCH, stableStart, moved } from './seams-helpers.mjs';

useHarness();

test('W6: on a phone, primary controls are at least 40 px tall, inline secondary ones at least 36', async (t) => {
  const page = await suggested({ width: 390, theme: 'light' });
  const bad = [];
  const seen = new Set();
  for (let i = 0; i < 7; i++) {
    const list = await controls(page);
    for (const c of list) if (MATRIX_40.test(c.name)) { seen.add(c.name.replace(/:.*/, '')); if (c.h < 40) bad.push(`matrix stage ${i + 1}: ${c.name} ${c.w}×${c.h} (${c.cls})`); }
    bad.push(...small(list).map((s) => `matrix stage ${i + 1}: ${s}`));
    if (await has(page, aria('button', 'Later stage'), 300)) await page.locator(aria('button', 'Later stage')).click().catch(() => {});
  }
  assert.ok([...seen].some((n) => n.startsWith('What is a')) && seen.has('Add a plant'), `the matrix controls were measured (${[...seen]})`);
  await page.locator(aria('tab', 'All plants')).click();
  bad.push(...small(await controls(page)).map((s) => `All plants: ${s}`));
  await page.locator(aria('tab', 'Jobs')).click();
  bad.push(...small(await controls(page)).map((s) => `Jobs: ${s}`));
  await page.locator(aria('tab', 'All plants')).click();
  await page.locator('#ct-root [data-plant-id] button, #ct-root button[data-plant-id]').click();
  assert.ok(await findAx(page, { role: 'dialog' }), 'a plant\'s dialog');
  bad.push(...small(await controls(page, true)).map((s) => `details: ${s}`));
  assert.deepEqual(bad, []);
  await done(page);
});

test('W7: the toast never covers a control', async (t) => {
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    const remove = (await axNodes(page)).find((n) => n.role === 'button' && /^Remove /.test(n.name ?? ''));
    await page.locator(aria('button', remove.name)).click();
    assert.ok(await has(page, '.ct-toast'), 'the toast');
    // Every control of the page: at the page's end none sits under the toast, and one under it
    // mid-page comes out from under it when it takes focus (Tab).
    const covered = await page.evaluate(() => {
      const box = () => document.querySelector('.ct-toast')?.getBoundingClientRect();
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const all = [...document.querySelectorAll('#ct-root button, #ct-root input, #ct-root select, #ct-root a[href], #ct-root [role="tab"]')]
        .filter((el) => !el.closest('.ct-toast') && el.getClientRects().length);
      const name = (el) => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40);
      const out = [];
      if (!box()?.height) return ['no toast box'];
      // Measured where a scroll ends (the site scrolls smoothly).
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, document.documentElement.scrollHeight);
      for (const el of all) if (hit(el.getBoundingClientRect(), box())) out.push(`at the end: ${name(el)}`);
      window.scrollTo(0, 0);
      for (const el of all) {
        if (!hit(el.getBoundingClientRect(), box())) continue;
        el.focus();
        if (hit(el.getBoundingClientRect(), box())) out.push(`focused: ${name(el)}`);
        window.scrollTo(0, 0);
      }
      return out;
    });
    assert.deepEqual(covered, [], 'nothing under the toast');
    await done(page);
  });
});

test('W8, W9, X4, X5: bold is 600, CJK headings keep words whole, sheet and page classes do not leak', async (t) => {
  const page = await h.open('/consortium/', { width: 1280, theme: 'light', data: 'fixture' });
  const weights = await page.$$eval('#ct-root strong, #ct-root b', (els) => [...new Set(els.map((e) => getComputedStyle(e).fontWeight))]);
  assert.ok(weights.length > 0, 'the page has bold words');
  assert.deepEqual(weights, ['600'], '<strong> and <b> at 600');
  await page.locator(aria('radio', 'Temperate')).click();
  // Start's crop search is not the Add sheet's search box (X5): no box drawn around it. It draws once
  // the card's list is read, so wait for it.
  const crop = await page.locator('#ct-root input[type="search"]').map((el) => getComputedStyle(el.parentElement).borderTopWidth).wait();
  assert.equal(crop, '0px', 'Start\'s crop search has no sheet search frame');
  await page.locator(aria('button', 'Suggest plants')).click();
  await page.locator(aria('tab', 'All plants')).click();
  await page.locator('#ct-root [data-plant-id] button, #ct-root button[data-plant-id]').click();
  assert.ok(await findAx(page, { role: 'dialog' }));
  // The plant dialog's action row is the sheet's (X4): flex, not the page's actions grid.
  const row = await page.$eval('dialog[open] .ct-actions', (el) => ({ d: getComputedStyle(el).display, m: getComputedStyle(el).marginTop }));
  assert.deepEqual(row, { d: 'flex', m: '0px' }, 'the sheet\'s action row');
  await done(page);
  for (const lang of ['ja', 'zh', 'ko']) {
    const p = await h.open(`/${lang}/consortium/`, { width: 390, theme: 'light', data: 'fixture' });
    const heads = await p.$$eval('h1, #ct-root h2', (els) => els.map((e) => { const s = getComputedStyle(e); return `${s.wordBreak}/${s.lineBreak}`; }));
    assert.ok(heads.length > 0);
    for (const s of heads) assert.match(s, /^keep-all\/|\/strict$/, `${lang}: headings keep words whole (${s})`);
    await done(p);
  }
});

// UX audit fix 3 (decision row "P5 fixes from the UX audit"): the desktop table needs 960 px; below
// it the phone grid and stage stepper show (at 700 px the table cut 38 plant names).
test('UX3: below 960 px the matrix is the phone grid, from 960 px the desktop table; neither overflows or cuts a name', async () => {
  for (const [width, small] of [[700, true], [959, true], [960, false], [1000, false]]) {
    const page = await suggested({ width, theme: 'light' });
    assert.equal(!!(await page.$('.ct-phone #ct-stepper')), small, `${width} px: the phone grid and stepper ${small ? '' : 'not '}shown`);
    assert.equal(!!(await page.$('table.ct-mx')), !small, `${width} px: the desktop table ${small ? 'not ' : ''}shown`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${width} px: no sideways scroll`);
    if (small) {
      const cut = await page.$$eval('#ct-root .ct-phone .ct-nm', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
      assert.deepEqual(cut, [], `${width} px: no plant name cut`);
      const empty = await page.$$eval('.ct-phone .ct-stepper, .ct-phone .ct-pstratum', (els) => els.filter((e) => e.getBoundingClientRect().width < 200).length);
      assert.equal(empty, 0, `${width} px: the stepper and stage rows are laid out full width`);
    }
    await done(page);
  }
});

// Walk-through F2 (P5 seam review): at 960 px the desktop table cut real common names to a few letters
// ("Europea…"). Each start chip's name may wrap to two lines; its 10th character (or its last, if
// shorter) must be drawn inside the name's box, before any ellipsis, on the real Temperate list.
test('UX5 (walk-through F2): at 960 and 1024 px the desktop matrix shows at least the first 10 characters of every plant name', async () => {
  for (const width of [960, 1024]) {
    const page = await h.open('/consortium/', { width, theme: 'light' });
    await page.locator(aria('radio', 'Temperate')).click();
    assert.equal(await loadState(page), 'ready');
    await page.locator(aria('button', 'Suggest plants')).click();
    assert.ok(await has(page, 'table.ct-mx button.ct-pchip', 10_000), `${width} px: the desktop table`);
    const cut = await page.$$eval('table.ct-mx button.ct-pchip .ct-nm > span', (els) => els.flatMap((e) => {
      const node = e.firstChild, text = e.textContent;
      if (!node || node.nodeType !== 3) return [];
      if (e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1) return []; // drawn whole
      const r = document.createRange();
      const i = Math.min(10, text.length) - 1;
      r.setStart(node, i); r.setEnd(node, i + 1);
      const c = r.getBoundingClientRect(), box = e.getBoundingClientRect();
      // A range gives where a character is laid out, even under the ellipsis: a cut name leaves the
      // ellipsis' width at its end ("Europea…" counts 7). Its glyph box is taller than the line
      // (line-height 1.2), so the line counts by its middle.
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = getComputedStyle(e).font;
      const edge = box.right - ctx.measureText('…').width;
      return c.right <= edge + 0.5 && c.top + c.height / 2 <= box.bottom && c.width > 0 ? [] : [`${text} (${Math.round(box.width)}×${Math.round(box.height)} px)`];
    }));
    assert.deepEqual(cut, [], `${width} px: names cut before their 10th character`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${width} px: no sideways scroll`);
    await done(page);
  }
});

// Owner request (coordinator, item 7): adding a plant to a cell that already has plants is one click.
// Every filled cell (desktop table; each filled layer of the phone stage view) has its own "+" named
// "Add a plant: {cell}", after the cell's plants in the keyboard order, opening Add for that cell as a
// free cell's "+ Add" does; it never cuts a plant name.
test('Item 7: a filled cell has its own "+", which opens Add for that cell, and the plant added lands there; no name is cut by it at 960 or 1280 px', async (t) => {
  const plants = await temperate();
  const byName = new Map(plants.map((p) => [p.name, p]));
  for (const width of [1280, 960]) {
    const page = await suggested({ width, theme: 'light' });
    const filled = await page.$$eval('table.ct-mx td', (tds) => tds.filter((td) => td.querySelector('.ct-pchip')).map((td) => {
      const plus = td.querySelector('[data-add-filled]');
      const chips = [...td.querySelectorAll('button')];
      return { plus: plus?.getAttribute('aria-label') ?? null, last: chips.at(-1) === plus, h: plus ? plus.getBoundingClientRect().height : 0, shown: plus ? getComputedStyle(plus).visibility === 'visible' && Number(getComputedStyle(plus).opacity) > 0.3 : false };
    }));
    assert.ok(filled.length > 0, `${width} px: filled cells`);
    for (const c of filled) {
      assert.match(c.plus ?? '', /^Add a plant: /, `${width} px: every filled cell has its "+"`);
      assert.ok(c.last, `${width} px: "+" after the cell's plants in the keyboard order`);
      assert.ok(c.h >= 24, `${width} px: a target of 24 px at least (${c.h})`);
      assert.ok(c.shown, `${width} px: shown without hover`);
    }
    const cut = () => page.$$eval('.ct-mx .ct-pchip .ct-nm > span:first-child', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    const withPlus = await cut();
    await page.addStyleTag({ content: '[data-add-filled] { display: none !important; }' });
    assert.equal(withPlus, await cut(), `${width} px: the "+" cuts no name`);
    await done(page);
  }
  await eachVariant(t, async (v) => {
    const page = await suggested(v);
    await page.locator(aria('tab', 'All plants')).click();
    assert.ok(await has(page, '.ct-views [data-plant-id]', 5000));
    const members = new Set(await memberIds(page));
    await page.locator(aria('tab', 'Layers × stages')).click();
    // A filled cell with a plant still to add (the fixture's site is "not sure": every plant fits).
    const addable = (cell) => plants.filter((p) => p.stratum === cell.stratum && p.a <= cell.to && p.b >= cell.from && !members.has(p.id)).map((p) => p.name).sort();
    let label = null;
    for (let i = 0; i < 7 && !label; i++) {
      const labels = await page.$$eval('[data-add-filled]', (bs) => bs.map((b) => b.getAttribute('aria-label')));
      label = labels.find((l) => addable(cellIn(l)).length > 0) ?? null;
      if (!label && v.width < 960) await page.locator(aria('button', 'Later stage')).click();
      else if (!label) break;
    }
    assert.ok(label, 'a filled cell with its "+" and a plant still to add');
    const cell = cellIn(label);
    await page.click(`[data-add-filled][aria-label="${label}"]`);
    assert.ok(await findAx(page, { role: 'dialog', name: new RegExp(`^Add to ${esc(en[`consortium.stratum.${cell.stratum}`])} · `) }), `"+" opens Add for ${label}`);
    const expected = addable(cell);
    assert.deepEqual((await addRows(page)).sort(), expected, `the plants of ${label}`);
    const name = await page.$eval('.ct-add .ct-sheet-body > ul.ct-rows > li:has(input[type="checkbox"]) .ct-sci', (e) => e.textContent.trim());
    await page.click('.ct-add .ct-sheet-body > ul.ct-rows > li:has(input[type="checkbox"]) input[type="checkbox"]');
    await page.locator(aria('button', 'Add 1 plant')).click();
    const id = byName.get(name).id;
    const where = v.width < 960 ? `.ct-pstratum[aria-label="${en[`consortium.stratum.${cell.stratum}`]}"] [data-plant-id="${id}"]` : `tr[data-stratum-row="${cell.stratum}"] [data-plant-id="${id}"]`;
    assert.ok(await has(page, where, 5000), `${name} lands in ${label}`);
    await done(page);
  });
});

// P5 walk-through 2, N1 (data loss since P2): the Undo toast sat over the Add sheet's "Add N plants"
// when a search left few rows, so the click undid the last add and added nothing. A toast never
// covers a control: in a sheet it sits in the sheet's foot above the action bar, never over it.
test('Walk-through 2 N1: in the Add sheet the Undo toast never covers "Add N plants" nor any other control (320, 390, 700, 960, 1280 px)', async () => {
  const plants = await temperate();
  for (const width of [320, 390, 700, 960, 1280]) {
    const page = await suggested({ width, theme: 'light' });
    const members = new Set(await memberIds(page));
    const candidates = plants.filter((p) => !members.has(p.id) && !plants.some((q) => q !== p && q.name.includes(p.name)));
    const rows = 'dialog.ct-add[open] .ct-sheet-body > ul.ct-rows > li';
    // Opens Add, searches the next candidate listed with a tick (few rows), and ticks it.
    const addOne = async () => {
      await page.click('.ct-viewbar button');
      await page.waitForSelector('dialog.ct-add[open] .ct-search input');
      while (candidates.length) {
        const p = candidates.shift();
        await page.$eval('dialog.ct-add[open] .ct-search input', (i) => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.type('dialog.ct-add[open] .ct-search input', p.name);
        const ok = await page.waitForFunction((sel, n) => { const r = [...document.querySelectorAll(sel)]; return r.length <= 3 && r.some((li) => li.querySelector('.ct-sci')?.textContent.trim() === n && li.querySelector('input[type="checkbox"]')); }, { timeout: 1500 }, rows, p.name).then(() => true, () => false);
        if (!ok) continue;
        await page.evaluate((sel, n) => [...document.querySelectorAll(sel)].find((li) => li.querySelector('.ct-sci')?.textContent.trim() === n).querySelector('input[type="checkbox"]').click(), rows, p.name);
        return p;
      }
      assert.fail(`${width} px: no plant to add`);
    };
    const a = await addOne();
    await page.click('dialog.ct-add[open] .ct-add-bar .button-primary');
    assert.ok(await has(page, '.ct-toast-page .ct-toast'), `${width} px: the first add's toast with Undo`);
    const b = await addOne();
    assert.ok(await has(page, 'dialog[open] .ct-toast .ct-toast-undo'), `${width} px: the toast moved into the sheet`);
    // Where the bar lands depends on the rows above it and the window: every window height from 480 to
    // 900 px, so the bar passes through the toast's band (Delhi at 1280 × 800 had it there).
    const covered = [];
    for (let height = 480; height <= 900; height += 20) {
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const seen = await page.evaluate(() => {
        const d = document.querySelector('dialog.ct-add[open]');
        const toast = d.querySelector('.ct-toast').getBoundingClientRect();
        const btn = d.querySelector('.ct-add-bar .button-primary');
        const r = btn.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const meets = (x, y) => x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
        const under = [...d.querySelectorAll('button, input, a[href], select, textarea')]
          .filter((el) => !el.closest('.ct-toast') && el.getClientRects().length && meets(el.getBoundingClientRect(), toast))
          .map((el) => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40));
        return { onButton: btn.contains(hit), hit: hit?.className ?? null, under };
      });
      if (!seen.onButton) covered.push(`${height}: the Add button's centre is ${seen.hit}`);
      for (const u of seen.under) covered.push(`${height}: ${u}`);
    }
    assert.deepEqual(covered, [], `${width} px: no control of the sheet under the toast, at any window height`);
    await page.setViewport({ width, height: width < 640 ? 844 : 900, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
    await page.locator('dialog.ct-add[open] .ct-add-bar .button-primary').click();
    await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
    await page.click('#ct-tab-list'); // every member (a phone stage shows only its own)
    const now = new Set(await memberIds(page));
    assert.ok(now.has(a.id) && now.has(b.id), `${width} px: both plants are in the consortium (${a.name}: ${now.has(a.id)}, ${b.name}: ${now.has(b.id)})`);
    await done(page);
  }
});

test('Walk-through 2 N2: every pop-up stays within the viewport with a 16 px gutter at 320 and 390 px in en, fr and ja', async () => {
  const GUTTER = 16;
  const within = (page, sel) => page.evaluate((s, g) => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    for (const el of document.querySelectorAll(s)) {
      if (!el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (r.left < g - 0.5 || r.right > vw - g + 0.5) out.push(`${s}: ${Math.round(r.left)}–${Math.round(r.right)} of ${vw}`);
    }
    if (document.documentElement.scrollWidth > vw) out.push(`page ${document.documentElement.scrollWidth} px wide`);
    return out;
  }, sel, GUTTER);
  for (const lang of ['en', 'fr', 'ja']) {
    const S = (k) => STRINGS[lang][`consortium.${k}`];
    for (const width of [320, 390]) {
      const at = `${lang} ${width} px`;
      const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/consortium/`, { width, data: 'fixture', mapTiles: 'stub' });
      const bad = [];
      // The climate first, and the site questions awaited: they show once the database is open and
      // the list read. Until then Start moves: the open database refines the guessed country from the
      // time zone ("Use United States" becomes "Use France" here), and the line's new height shifts
      // every control below it (46 px at en 320 and ja 390), so a click aimed before the shift misses
      // the map button. The radio is clicked in the page, which no shift can miss.
      await page.$eval('input[name="ct-climate"][value="temperate"]', (el) => el.click());
      assert.ok(await has(page, 'input[name="ct-site-light"][value="shade"]', 20_000), `${at}: the site questions (the list is read)`);
      assert.equal(await loadState(page), 'ready');
      // The map dialog (start step).
      if (await has(page, '[data-location-action="map"]', 4000)) {
        await settled(page, '[data-location-action="map"]');
        await page.click('[data-location-action="map"]');
        assert.ok(await has(page, 'dialog[data-location-map][open]', 8000), `${at}: the map dialog`);
        bad.push(...await within(page, 'dialog[data-location-map][open]'));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
      } else bad.push('no map button');
      await settled(page, 'input[name="ct-site-light"][value="shade"]');
      await page.click('input[name="ct-site-light"][value="shade"]');
      await page.locator(aria('button', S('start.suggest'))).click();
      assert.ok(await has(page, '#ct-tab-matrix', 8000), `${at}: the matrix`);
      // Each explanation, opened alone (phone matrix, then side view). Suggest moves the focus to the
      // matrix, and the page scrolls there smoothly: each tab is pressed once the page stands still.
      for (const tab of ['matrix', 'side']) {
        await settled(page, `#ct-tab-${tab}`);
        await page.click(`#ct-tab-${tab}`);
        assert.ok(await page.waitForFunction((t) => document.getElementById(`ct-tab-${t}`)?.getAttribute('aria-selected') === 'true', {}, tab).then(() => true, () => false), `${at}: the ${tab} tab is selected`);
        // The side view is in the chunk loaded after the matrix (views/lazy.tsx, later.ts): counted once drawn.
        await has(page, `#ct-panel-${tab} .ct-explain-btn`, 10_000);
        const n = await page.$$eval(`#ct-panel-${tab} .ct-explain-btn`, (bs) => bs.length);
        assert.ok(n > 0, `${at}: the ${tab} view's explanations`);
        for (let i = 0; i < n; i++) {
          await page.evaluate((t, j) => document.querySelectorAll(`#ct-panel-${t} .ct-explain-btn`)[j].click(), tab, i);
          await page.waitForSelector(`#ct-panel-${tab} .ct-pop`);
          bad.push(...(await within(page, `#ct-panel-${tab} .ct-pop`)).map((s) => `${tab} #${i}: ${s}`));
          // Its Escape listener is added after paint (useEffect): two frames, as no reader is faster.
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          await page.keyboard.press('Escape');
          assert.ok(await page.waitForFunction((t) => !document.querySelector(`#ct-panel-${t} .ct-pop`), {}, tab).then(() => true, () => false), `${at}: Escape closes ${tab} #${i}`);
        }
      }
      // "Add it anyway?": a plant that does not take full shade asks first.
      await settled(page, '#ct-tab-matrix');
      await page.click('#ct-tab-matrix');
      await settled(page, '.ct-viewbar button');
      await page.click('.ct-viewbar button');
      const ask = await page.waitForSelector('dialog.ct-add[open] li.flagged > button', { timeout: 5000 }).catch(() => null);
      if (ask) {
        await settled(page, 'dialog.ct-add[open] li.flagged > button'); // the sheet slides in (details.css ct-sheet-in)
        await ask.click();
        assert.ok(await has(page, 'dialog.ct-ask[open]'), `${at}: "Add it anyway?"`);
        bad.push(...await within(page, 'dialog.ct-ask[open]'));
      } else bad.push('no plant asks first in shade');
      assert.deepEqual(bad, [], at);
      await done(page);
    }
  }
});

test('Layout stability (N2): nothing on Start moves after its first paint when the database opens and the guessed country is refined by the time zone, at 320–1280 px in en, fr and ja', async () => {
  const bad = [];
  for (const lang of ['en', 'fr', 'ja']) {
    for (const width of [320, 390, 700, 960, 1280]) {
      const at = `${lang} ${width} px`;
      const page = await stableStart(lang, width);
      const r = await moved(page);
      assert.deepEqual(r.seen, STABLE, `${at}: every control measured`);
      // The time zone's country, not the languages' (the mismatch is real).
      assert.deepEqual(r.country, { code: MISMATCH[lang].guess, source: 'guess' }, `${at}: the time zone's guess`);
      bad.push(...r.out.map((x) => `${at}: ${x}`));
      if (r.cls > 0.01) bad.push(`${at}: CLS ${r.cls.toFixed(3)} (${r.shifts.map((e) => `${e.value.toFixed(3)} at ${e.at} ms by ${e.from}`).join('; ')})`);
      await done(page);
    }
  }
  assert.deepEqual(bad, []);
});

// Review of p5-final (low 1): an explanation placed on open is placed again when the window changes
// (a phone turned, a window narrowed), so it keeps the 16 px gutter without being reopened.
test('Walk-through 2 N2 (review): an open explanation keeps the 16 px gutter when the window narrows from 844 to 390 px', async () => {
  const page = await suggested({ width: 844, theme: 'light' });
  const n = await page.$$eval('#ct-panel-matrix .ct-explain-btn', (bs) => bs.length);
  assert.ok(n > 0, 'the phone matrix\'s explanations');
  const bad = [];
  for (let i = 0; i < n; i++) {
    await page.setViewport({ width: 844, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await page.evaluate((j) => document.querySelectorAll('#ct-panel-matrix .ct-explain-btn')[j].click(), i);
    await page.waitForSelector('#ct-panel-matrix .ct-pop');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await page.$eval('#ct-panel-matrix .ct-pop', (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, vw: document.documentElement.clientWidth }; });
    if (r.left < 15.5 || r.right > r.vw - 15.5) bad.push(`#${i}: ${Math.round(r.left)}–${Math.round(r.right)} of ${r.vw}`);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#ct-panel-matrix .ct-pop'));
  }
  assert.deepEqual(bad, [], 'within 16 px of each edge after the resize');
  await done(page);
});

// Review of p5-final (low 2): the sheet's sticky foot (toast above the action bar) covers the sheet's
// bottom, so the sheet keeps that much scroll padding: a control tabbed to near the end is shown above
// the foot, and the foot's empty area beside the toast passes clicks through.
test('Walk-through 2 N1 (review): with a toast in the Add sheet, the last controls tabbed to are fully visible above the foot and clickable (390 × 600)', async () => {
  const plants = await temperate();
  const page = await suggested({ width: 390, theme: 'light' });
  await page.click('.ct-viewbar button');
  await page.waitForSelector('dialog.ct-add[open] .ct-sheet-body > ul.ct-rows > li input[type="checkbox"]');
  await page.click('dialog.ct-add[open] .ct-sheet-body > ul.ct-rows > li input[type="checkbox"]');
  await page.click('dialog.ct-add[open] .ct-add-bar .button-primary');
  assert.ok(await has(page, '.ct-toast-page .ct-toast'), 'the add\'s toast');
  await page.click('.ct-viewbar button');
  assert.ok(await has(page, 'dialog.ct-add[open] .ct-toast'), 'the toast in the sheet');
  await page.setViewport({ width: 390, height: 600, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  assert.ok(plants.length > 3);
  const focusables = 'dialog.ct-add[open] .ct-sheet-body :is(button, input, a[href], select, textarea):not([disabled])';
  const count = await page.$$eval(focusables, (els) => els.filter((e) => e.getClientRects().length).length);
  assert.ok(count >= 4, 'controls to tab through');
  await page.evaluate((sel) => { const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length); els[els.length - 4].focus(); }, focusables);
  const bad = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const seen = await page.evaluate(() => {
      const el = document.activeElement;
      const foot = document.querySelector('dialog.ct-add[open] .ct-sheet-foot').getBoundingClientRect();
      const toast = document.querySelector('dialog.ct-add[open] .ct-toast')?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const target = el.closest('label') ?? el;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const top = toast ? Math.min(foot.top + (toast.top - foot.top), foot.top) : foot.top;
      return { name: (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40), inFoot: !!el.closest('.ct-sheet-foot'), bottom: r.bottom, top, clickable: target.contains(hit) || el.contains(hit) };
    });
    if (seen.inFoot) break; // past the body: into the toast and the bar
    if (seen.bottom > seen.top + 0.5) bad.push(`${seen.name}: bottom ${Math.round(seen.bottom)} under the foot at ${Math.round(seen.top)}`);
    if (!seen.clickable) bad.push(`${seen.name}: not clickable`);
  }
  assert.deepEqual(bad, [], 'each control tabbed to is above the foot and takes the click');
  // The foot's empty area beside the toast passes a click to what lies under it.
  const through = await page.evaluate(() => {
    const d = document.querySelector('dialog.ct-add[open]');
    const toast = d.querySelector('.ct-toast').getBoundingClientRect();
    const x = Math.max(4, toast.left - 6), y = toast.top + toast.height / 2;
    const hit = document.elementFromPoint(x, y);
    return toast.left > 10 ? !hit?.closest('.ct-sheet-foot') : true;
  });
  assert.ok(through, 'the area beside the toast is not the foot');
  await done(page);
});
