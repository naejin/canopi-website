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
import { h, useHarness, aria, axNodes, layoutVariants, en, findAx, has, settled } from './helpers.mjs';
import { everyPlant, esc, done, temperate, cellIn, suggested, memberIds, addRows, controls, small, focused, openFind, STRINGS, STABLE, MISMATCH, stableStart, moved } from './seams-helpers.mjs';
import { openCards } from './location-fixtures.mjs';

useHarness();

test('W6: on a phone, primary controls are at least 40 px tall, inline secondary ones at least 36', async (t) => {
  // Retargeted by PP-B b2 onto the palette page: its steps, the Next step, each time step of Through
  // the years (Earlier / Later), the jobs, the actions, then a plant's dialog (the matrix went in 0a').
  const page = await suggested({ width: 390, theme: 'light' });
  const bad = [];
  const seen = new Set();
  const later = aria('button', en['consortium.palette.later']);
  for (let i = 0; i < 6; i++) {
    const list = await controls(page);
    for (const c of list) seen.add(c.cls.includes('ct-chip') ? 'chip' : c.name);
    bad.push(...small(list).map((s) => `time step ${i + 1}: ${s}`));
    if (await page.$eval('.ct-years', (el) => !!el.querySelector('button[disabled]') && i > 0).catch(() => false)) break;
    if (await has(page, later, 300)) await page.locator(later).click().catch(() => {});
  }
  assert.ok(seen.has('chip') && seen.has(en['consortium.palette.later']) && seen.has(en['consortium.palette.readTitle']), `the palette page's controls were measured (${[...seen].slice(0, 12)})`);
  // Centred first: puppeteer clicks a control in view where it is, and at the window's foot the phone's
  // bottom bar ("Add plants", fixed, PP-C c1) lies over it, as over any page content scrolled there.
  await page.$eval('#ct-root .ct-chart button[data-plant-id]', (b) => b.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.locator('#ct-root .ct-chart button[data-plant-id]').click();
  assert.ok(await findAx(page, { role: 'dialog' }), 'a plant\'s dialog');
  bad.push(...small(await controls(page, true)).map((s) => `details: ${s}`));
  assert.deepEqual(bad, []);
  await done(page);
});

test('W7: the toast never covers a control', async (t) => {
  await layoutVariants(t, async (v) => {
    const page = await suggested(v);
    // A plant removed from its dialog (the palette page's pictures open it; All plants went in 0a').
    await page.locator('#ct-root .ct-chart button[data-plant-id]').click();
    await page.locator('dialog[open] ' + aria('button', 'Remove')).click();
    await page.waitForFunction(() => !document.querySelector('dialog[open], dialog.ct-sheet'));
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

test('W8, W9, X4: bold is 600, CJK headings keep words whole, sheet and page classes do not leak', async (t) => {
  const page = await h.open('/palette/', { width: 1280, theme: 'light', data: 'fixture' });
  // The island drawn first (the test build renders after its hook's chunk arrives).
  assert.equal(await loadState(page), 'ready');
  const weights = await page.$$eval('#ct-root strong, #ct-root b', (els) => [...new Set(els.map((e) => getComputedStyle(e).fontWeight))]);
  assert.ok(weights.length > 0, 'the page has bold words');
  assert.deepEqual(weights, ['600'], '<strong> and <b> at 600');
  await openCards(page);
  await page.locator(aria('radio', 'Temperate')).click();
  // (X5, Start's crop search without the sheet's search frame, went with that search in PP-B commit 0a'.)
  await page.locator('[data-place-suggest]').click();
  await page.locator('#ct-root .ct-chart button[data-plant-id]').click();
  assert.ok(await findAx(page, { role: 'dialog' }));
  // The plant dialog's action row is the sheet's (X4): flex, not the page's actions grid.
  const row = await page.$eval('dialog[open] .ct-actions', (el) => ({ d: getComputedStyle(el).display, m: getComputedStyle(el).marginTop }));
  assert.deepEqual(row, { d: 'flex', m: '0px' }, 'the sheet\'s action row');
  await done(page);
  for (const lang of ['ja', 'zh', 'ko']) {
    const p = await h.open(`/${lang}/palette/`, { width: 390, theme: 'light', data: 'fixture' });
    const heads = await p.$$eval('h1, #ct-root h2', (els) => els.map((e) => { const s = getComputedStyle(e); return `${s.wordBreak}/${s.lineBreak}`; }));
    assert.ok(heads.length > 0);
    for (const s of heads) assert.match(s, /^keep-all\/|\/strict$/, `${lang}: headings keep words whole (${s})`);
    await done(p);
  }
});

// P5 walk-through 2, N1 (data loss since P2): the Undo toast sat over the Add sheet's "Add N plants"
// when a search left few rows, so the click undid the last add and added nothing. A toast never
// covers a control. Written against v14 Find (boards AddMany, DeskStates): each row's own Add adds at
// once; below 960 px Find is a sheet and the toast sits in its foot, in the flow under the rows; at
// 960 px and wider Find is a panel beside the picture and the toast is the page's, bottom left, never
// in the panel.
const ROWS = 'dialog.ct-find[open] [data-find-row]';
// Searches the next candidate listed with its Add button (few rows) and presses it; the row says Added.
async function addByRow(page, candidates, at) {
  while (candidates.length) {
    const p = candidates.shift();
    await page.$eval('dialog.ct-find[open] [data-find-search]', (i) => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.type('dialog.ct-find[open] [data-find-search]', p.name);
    const ok = await page.waitForFunction((sel, id) => { const r = [...document.querySelectorAll(sel)]; return r.length <= 3 && r.some((li) => li.dataset.plantId === id && li.querySelector('button[data-find-add]')); }, { timeout: 1500 }, ROWS, p.id).then(() => true, () => false);
    if (!ok) continue;
    await page.evaluate((sel, id) => [...document.querySelectorAll(sel)].find((li) => li.dataset.plantId === id).querySelector('button[data-find-add]').click(), ROWS, p.id);
    assert.ok(await has(page, `${ROWS}[data-plant-id="${p.id}"] [data-plant-done]`, 4000), `${at}: ${p.name} says Added`);
    return p;
  }
  return assert.fail(`${at}: no plant to add`);
}
// Every plant of the palette (the pictures and Your plants fold past 12, so not read from the page).
const paletteIds = (page) => page.evaluate(() => [...window.__ctTest.store.members.value]);
const openFindSheet = async (page) => {
  await openFind(page); // the store's opener (the palette page's "Add plants" when drawn)
  // Find is a lazy chunk: its first open can pass the 4 s default under a loaded machine.
  assert.ok(await has(page, 'dialog.ct-find[open] [data-find-search]', 15_000), 'no Find sheet (dialog.ct-find)');
};

test('Walk-through 2 N1: in Find the Undo toast never covers a control of Find (320, 390, 700, 960, 1280 px); below 960 px it is in the sheet, at 960 px and wider bottom left in the page, outside the panel', async () => {
  const plants = await temperate();
  for (const width of [320, 390, 700, 960, 1280]) {
    const page = await suggested({ width, theme: 'light', hook: true });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    const members = new Set(await paletteIds(page));
    const candidates = plants.filter((p) => !members.has(p.id) && !plants.some((q) => q !== p && q.name.includes(p.name)));
    await openFindSheet(page);
    const a = await addByRow(page, candidates, `${width} px`);
    const b = await addByRow(page, candidates, `${width} px`);
    const desk = width >= 960;
    const TOAST = desk ? '.ct-toast-page .ct-toast' : 'dialog.ct-find[open] .ct-toast';
    assert.ok(await has(page, `${TOAST} .ct-toast-undo`), `${width} px: the add's toast with Undo ${desk ? 'in the page' : 'in the sheet'}`);
    if (desk) {
      const where = await page.evaluate(() => {
        const t = document.querySelector('.ct-toast-page .ct-toast'), d = document.querySelector('dialog.ct-find[open]');
        const r = t.getBoundingClientRect(), p = d.getBoundingClientRect();
        return { inPanel: d.contains(t), left: r.left < innerWidth / 2, overPanel: r.right > p.left && r.left < p.right && r.bottom > p.top && r.top < p.bottom };
      });
      assert.deepEqual(where, { inPanel: false, left: true, overPanel: false }, `${width} px: the toast bottom left, outside the panel`);
    }
    // Where the rows land depends on the window: every window height from 480 to 900 px.
    const covered = [];
    for (let height = 480; height <= 900; height += 20) {
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 640, hasTouch: width < 640 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const under = await page.evaluate((sel) => {
        const d = document.querySelector('dialog.ct-find[open]');
        const t = document.querySelector(sel);
        if (!t) return ['no toast'];
        const toast = t.getBoundingClientRect();
        const meets = (x, y) => x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
        // The part of a control the reader sees: its box clipped by every scrolling box around it.
        const seen = (el) => {
          const r = el.getBoundingClientRect();
          let top = r.top, bottom = r.bottom, left = r.left, right = r.right;
          for (let p = el.parentElement; p && p !== d.parentElement; p = p.parentElement) {
            if (getComputedStyle(p).overflowY === 'visible') continue;
            const c = p.getBoundingClientRect();
            top = Math.max(top, c.top); bottom = Math.min(bottom, c.bottom); left = Math.max(left, c.left); right = Math.min(right, c.right);
          }
          return { top, bottom, left, right };
        };
        return [...d.querySelectorAll('button, input, a[href], select, textarea')]
          .filter((el) => { if (el.closest('.ct-toast') || !el.getClientRects().length) return false; const v = seen(el); return v.top < v.bottom && v.left < v.right && meets(v, toast); })
          .map((el) => (el.getAttribute('aria-label') || el.textContent).trim().slice(0, 40));
      }, TOAST);
      for (const u of under) covered.push(`${height}: ${u}`);
    }
    assert.deepEqual(covered, [], `${width} px: no control of Find under the toast, at any window height`);
    const now = new Set(await paletteIds(page));
    assert.ok(now.has(a.id) && now.has(b.id), `${width} px: both plants are in the consortium (${a.name}: ${now.has(a.id)}, ${b.name}: ${now.has(b.id)})`);
    await done(page);
  }
});

test('Walk-through 2 N2: every pop-up stays within the viewport with a 16 px gutter at 320 and 390 px in en, fr and ja; the map is a full-screen sheet (board LocMap)', async () => {
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
      const page = await h.open(`${lang === 'en' ? '' : `/${lang}`}/palette/`, { width, data: 'fixture', mapTiles: 'stub' });
      const bad = [];
      // Start drawn first (the test build renders after its hook's chunk arrives).
      assert.ok(await has(page, 'input[name="ct-climate"][value="temperate"]', 20_000), `${at}: Start is drawn`);
      // The climate first, and the room question awaited: it shows once the database is open and
      // the list read. Until then Start moves: the open database refines the guessed country from the
      // time zone ("Use United States" becomes "Use France" here), and the line's new height shifts
      // every control below it (46 px at en 320 and ja 390), so a click aimed before the shift misses
      // the map button. The radio is clicked in the page, which no shift can miss.
      await page.$eval('input[name="ct-climate"][value="temperate"]', (el) => el.click());
      assert.ok(await has(page, 'input[name="ct-site-room"][value="large"]', 20_000), `${at}: the room question (the list is read)`);
      assert.equal(await loadState(page), 'ready');
      // The map dialog (start step).
      if (await has(page, '[data-location-action="map"]', 4000)) {
        await settled(page, '[data-location-action="map"]');
        await page.click('[data-location-action="map"]');
        assert.ok(await has(page, 'dialog[data-location-map][open]', 8000), `${at}: the map dialog`);
        // Board LocMap (v14): on a phone the map is a full-screen sheet, edge to edge, nothing wider.
        bad.push(...await page.$eval('dialog[data-location-map][open]', (d) => {
          const r = d.getBoundingClientRect(), vw = document.documentElement.clientWidth;
          return [...(Math.abs(r.left) > 0.5 || Math.abs(r.right - vw) > 0.5 ? [`map sheet ${Math.round(r.left)}–${Math.round(r.right)} of ${vw}, not full-screen`] : []),
            ...(d.scrollWidth > d.clientWidth + 0.5 ? [`map sheet ${d.scrollWidth} px wide in ${d.clientWidth}`] : [])];
        }));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 });
      } else bad.push('no map button');
      // Clicked in the page too: at 320 px the room choice can sit under Place's sticky foot (its
      // "Start from a small suggested palette"), which a click by position would press instead.
      await page.$eval('input[name="ct-site-room"][value="large"]', (el) => el.click());
      await page.locator(aria('button', S('start.suggest'))).click();
      // The palette page (the matrix's and the side view's explanations went in PP-B commit 0a'): it
      // and the plant dialog stay within the gutter, nothing wider than the window.
      assert.ok(await has(page, '.ct-palette-page:not([data-palette-placeholder]) h2[data-view-heading]', 8000), `${at}: the palette page`);
      bad.push(...await within(page, '.ct-palette-page'));
      await settled(page, '#ct-root .ct-chart button[data-plant-id]');
      // The suggestion's toast can cover the chart's first plant at 320 px (h3 M28): dismissed, and the
      // plant pressed in the page, centred, which no overlay can take.
      await page.$eval('.ct-toast-dismiss', (b) => b.click()).catch(() => {});
      await page.$eval('#ct-root .ct-chart button[data-plant-id]', (b) => { b.scrollIntoView({ block: 'center' }); b.click(); });
      assert.ok(await has(page, 'dialog[open]', 8000), `${at}: a plant's dialog`);
      bad.push(...(await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && d.scrollWidth > d.clientWidth + 0.5 ? [`dialog ${d.scrollWidth} px wide in ${d.clientWidth}`] : []; })));
      await page.keyboard.press('Escape');
      // ("Add it anyway?" went: inform, don't block; owner decision 2026-11-14.)
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

// Late web fonts (E6 font; CI failed N2 above with "en 320 px: CLS 0.085 at 111 ms by header-nav"): on
// a slow line Source Sans 3 and Literata arrive after the first paint, and the swap from the fallback
// stack (the metric-matched 'Source Sans 3 Fallback' and 'Literata Fallback' faces, fonts.css) must
// not move the page. Every /fonts/*.woff2 request of the browser is held FONT_HOLD_MS before it goes on
// (CDP Fetch on the browser target, so both loads of stableStart are held), so the swap comes after the
// island has drawn Start too, the hardest case; the check runs once every held font is through and laid
// out, and asserts the first paint came before any font.
// The budget is LATE_CLS, not N2's 0.01: a matched fallback keeps each string within about 1% of its
// width, not to the pixel, so a paragraph whose last word sits at the edge can still gain or lose a
// line (at en 320 px Start's lede: 0.0102); a header that wraps, as on CI (0.085), is far over it.
// N2's box check, as sizes (sized): no control on Start may resize when the fonts swap. The place search
// keeps its box to the pixel: it took its width from the font's average character width (size=20, no CSS
// width), which no fallback face matches (206 px before Source Sans 3, 179 px after), so the rows after
// it moved; its width is now set in em (.ct-location-search, base.css; E6 S2). A button's width follows
// its own label, which the matched fallback keeps within about 1.5% (fr: 158 -> 160 px), so buttons get
// that much; every height holds to the pixel. A control whose top did not move keeps its left within
// the same 2% (a label before it on its line may grow by that much). Vertical moves are left to
// LATE_CLS: one line of reflow above a control (en 320 px: the lede) moves it down without resizing it.
const LABEL_SLACK = 0.02;
const sized = (page) => page.evaluate((sels, slack) => {
  const out = [];
  for (const sel of sels) {
    const el = document.querySelector(sel), a = window.__stable.first[sel];
    if (!el || !a) continue;
    const r = el.getBoundingClientRect(), x = r.left + scrollX, y = r.top + scrollY;
    const wSlack = el.matches('button') ? Math.max(1, a.w * slack) : 1;
    if (Math.abs(r.width - a.w) > wSlack || Math.abs(r.height - a.h) > 1) out.push(`${sel}: size ${Math.round(a.w)}×${Math.round(a.h)} → ${Math.round(r.width)}×${Math.round(r.height)}`);
    if (Math.abs(y - a.y) <= 1 && Math.abs(x - a.x) > Math.max(1, a.x * slack)) out.push(`${sel}: left ${Math.round(a.x)} → ${Math.round(x)} on the same line`);
  }
  return out;
}, STABLE, LABEL_SLACK);
const FONT_HOLD_MS = 800;
const LATE_CLS = 0.015;
async function holdFonts() {
  const session = await h.browser.target().createCDPSession();
  const timers = new Set();
  let held = 0;
  session.on('Fetch.requestPaused', ({ requestId }) => {
    held += 1;
    const timer = setTimeout(() => {
      timers.delete(timer);
      session.send('Fetch.continueRequest', { requestId }).catch(() => {}); // its page may be gone (the first load)
    }, FONT_HOLD_MS);
    timers.add(timer);
  });
  await session.send('Fetch.enable', { patterns: [{ urlPattern: '*/fonts/*.woff2', requestStage: 'Request' }] });
  return {
    // Resolves once at least one font was held and none is still held.
    through: async () => { while (held === 0 || timers.size) await new Promise((r) => setTimeout(r, 50)); },
    stop: async () => { await session.send('Fetch.disable').catch(() => {}); await session.detach().catch(() => {}); },
  };
}

test('Layout stability (N2, late fonts): when the web fonts arrive after the first paint, no control on Start resizes and Start and the header shift no more than one line of reflow (CLS 0.015), at 320–1280 px in en, fr and ja', { timeout: 240_000 }, async () => {
  const hold = await holdFonts();
  const bad = [];
  try {
    for (const lang of ['en', 'fr', 'ja']) {
      for (const width of [320, 390, 700, 960, 1280]) {
        const at = `${lang} ${width} px`;
        const page = await stableStart(lang, width);
        await hold.through();
        const late = await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).then(() => {
          const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
          const fonts = performance.getEntriesByType('resource').filter((e) => /\/fonts\/[^/]+\.woff2$/.test(e.name)).map((e) => e.responseEnd);
          return { fcp, firstFont: fonts.length ? Math.min(...fonts) : null, used: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`) };
        }));
        assert.ok(late.fcp !== null && late.firstFont !== null && late.fcp < late.firstFont, `${at}: the first paint (${late.fcp} ms) came before the first font (${late.firstFont} ms)`);
        assert.ok(late.used.some((f) => f.startsWith('"Source Sans 3"') || f.startsWith('Source Sans 3')), `${at}: Source Sans 3 loaded (${late.used})`);
        const r = await moved(page);
        assert.deepEqual(r.seen, STABLE, `${at}: every control measured`);
        bad.push(...(await sized(page)).map((x) => `${at}: ${x}`));
        if (r.cls > LATE_CLS) bad.push(`${at}: CLS ${r.cls.toFixed(3)} (${r.shifts.map((e) => `${e.value.toFixed(3)} at ${e.at} ms by ${e.from}`).join('; ')})`);
        await done(page);
      }
    }
  } finally { await hold.stop(); }
  assert.deepEqual(bad, []);
});

// (Review of p5-final low 1, an open explanation placed again when the window narrows, went with the
// matrix's and the side view's explanations in PP-B commit 0a'; nothing on the palette page pops up.)

// Review of p5-final (low 2): the sheet's sticky foot (toast above the action bar) covers the sheet's
// bottom, so the sheet keeps that much scroll padding: a control tabbed to near the end is shown above
// the foot, and the foot's empty area beside the toast passes clicks through.
// PP-C commit 0: as N1, written against Find.
test('Walk-through 2 N1 (review): with a toast in Find, the last controls tabbed to are fully visible above the foot and clickable (390 × 600); owner c1: Find replaces the Add sheet', async () => {
  const plants = await temperate();
  const page = await suggested({ width: 390, theme: 'light', hook: true });
  await openFindSheet(page);
  const members = new Set(await paletteIds(page));
  await addByRow(page, plants.filter((p) => !members.has(p.id) && !plants.some((q) => q !== p && q.name.includes(p.name))), '390 px');
  assert.ok(await has(page, 'dialog.ct-find[open] .ct-toast'), 'the toast in the sheet');
  await page.$eval('dialog.ct-find[open] [data-find-search]', (i) => { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await everyPlant(page); // every plant listed: controls to tab through
  await page.setViewport({ width: 390, height: 600, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  assert.ok(plants.length > 3);
  const focusables = 'dialog.ct-find[open] .ct-sheet-body :is(button, input, a[href], select, textarea):not([disabled])';
  const count = await page.$$eval(focusables, (els) => els.filter((e) => e.getClientRects().length).length);
  assert.ok(count >= 4, 'controls to tab through');
  await page.evaluate((sel) => { const els = [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length); els[els.length - 4].focus(); }, focusables);
  const bad = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const seen = await page.evaluate(() => {
      const el = document.activeElement;
      const foot = document.querySelector('dialog.ct-find[open] .ct-sheet-foot').getBoundingClientRect();
      const toast = document.querySelector('dialog.ct-find[open] .ct-toast')?.getBoundingClientRect();
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
    const d = document.querySelector('dialog.ct-find[open]');
    const toast = d.querySelector('.ct-toast').getBoundingClientRect();
    const x = Math.max(4, toast.left - 6), y = toast.top + toast.height / 2;
    const hit = document.elementFromPoint(x, y);
    return toast.left > 10 ? !hit?.closest('.ct-sheet-foot') : true;
  });
  assert.ok(through, 'the area beside the toast is not the foot');
  await done(page);
});
