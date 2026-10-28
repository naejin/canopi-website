// The plant list's row layout, measured in headless Chrome with the site's own stylesheets and
// fonts: what a reader sees, not what the CSS text says. The rows are the page's real markup
// (the harness renders the installed 200-plant Temperate list), laid out at list widths from the
// side panel's narrowest to the full desktop width. Needs Google Chrome or Chromium; the test is
// skipped, and says so, on a machine without one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { device, tab } from './consortium-harness.mjs';
import * as core from '../src/lib/consortium/index.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const temperate = JSON.parse(read('public/data/consortium/temperate.json'));
const ids = temperate.taxa.map((t) => t.id);
const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find((bin) => spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0);

// A long one-word pest name (the length of the German EPPO name of Ceratitis capitata).
const LONG = 'Mittelmeerfruchtfliege';
// The narrow tier is for a list beside the side panel (840 px at most) or on a tablet; a desktop
// window of 960 px or more shows the full list at 852 px or more (868 with an overlay scrollbar).
const NARROW = [508, 560, 640, 700, 760, 825, 840, 849];
const FULL = [850, 852, 868, 905, 929, 1005, 1085, 1144, 1185];

// The list section as the page renders it, every group open, with the long name in the first chip
// of each kind of row that has one.
async function listHtml({ country, lang }) {
  const q = core.encodeState({ climate: 'temperate', country, site: { ...core.DEFAULT_SITE }, kept: ids.slice(0, 190), removed: [], members: ids, plants: [], crops: [], guests: [] }, temperate);
  const dev = device();
  if (!country) dev.store.set('canopi-country', '-'); // the reader chose "no country": no guess
  const page = await tab(dev, `${lang === 'en' ? '' : '/' + lang}/consortium/#${q}`, { data: 'real', lang }).load();
  for (const g of ['emergent', 'high', 'medium', 'low', 'none']) if (page.$(`[data-act="group"][data-v="${g}"][aria-expanded="false"]`)) await page.act('group', g);
  const chip = page.$('.lrow .warn-pest > span:last-child') ?? page.$('.lrow .warn-chip > span:last-child');
  assert.ok(chip, 'a row with a warning chip');
  chip.children.splice(0, chip.children.length, { type: 'text', data: LONG, parent: chip });
  const html = page.$('.plants-sec').outerHTML;
  assert.ok(html.includes(LONG));
  assert.equal(html.includes('lgroups no-country'), !country, country ? 'a country is set' : 'no country: the "Invasive in" column');
  return html;
}

// Lays the section out once per width and returns, per width, what runs past its box.
function measure(sections, lang) {
  const dir = mkdtempSync(join(tmpdir(), 'ct-layout-'));
  try {
    const fonts = read('src/styles/fonts.css').replace(/url\('\/fonts\//g, `url('${pathToFileURL(join(root, 'public/fonts/')).href}`);
    const styles = ['tokens', 'global', 'consortium'].map((name) => `<link rel="stylesheet" href="${pathToFileURL(join(root, `src/styles/${name}.css`)).href}">`).join('');
    const cases = sections.map(({ html, width }, i) => `<div class="case" data-i="${i}" style="width:${width}px">${html}</div>`).join('');
    const script = `document.fonts.ready.then(() => {
      const out = [...document.querySelectorAll('.case')].map((box) => {
        const r = { width: Number(box.style.width.replace('px', '')), list: Math.round(box.querySelector('.plants-sec').getBoundingClientRect().width), rows: 0, swap: 0, stage: 0, crops: 0, over: [], chips: [] };
        // A cell whose text or child runs past it, or past its row (the column heads too).
        const overflows = (row) => {
          const rr = row.getBoundingClientRect();
          const cells = [...row.children].flatMap((c) => c.classList.contains('selwrap') ? [...c.children] : [c]).filter((c) => c.getBoundingClientRect().width > 0);
          for (const cell of cells) {
            const cr = cell.getBoundingClientRect();
            const name = (row.classList.contains('lcols') ? 'head ' : '') + (cell.className || cell.tagName) + ' "' + cell.textContent.trim().slice(0, 30) + '"';
            if (cell.scrollWidth > cell.clientWidth + 1 || cr.right > rr.right + 0.5) { r.over.push(name + ' +' + (cell.scrollWidth - cell.clientWidth)); continue; }
            for (const d of cell.querySelectorAll('*')) {
              const q = d.getBoundingClientRect();
              if (q.width && (q.right > cr.right + 0.5 || q.right > rr.right + 0.5)) { r.over.push(name + ' > ' + (d.className?.baseVal ?? d.className) + ' +' + Math.round(q.right - Math.min(cr.right, rr.right))); break; }
            }
          }
        };
        for (const head of box.querySelectorAll('.lcols')) overflows(head);
        for (const row of box.querySelectorAll('.lrow:not([hidden])')) {
          r.rows++;
          if (!row.querySelector('.lswap')) r.crops++;
          overflows(row);
          for (const chip of row.querySelectorAll('.warn-chip')) {
            const c = chip.getBoundingClientRect();
            for (const s of chip.children) { const q = s.getBoundingClientRect(); if (q.right > c.right + 0.5 || q.left < c.left - 0.5) r.chips.push(s.textContent + ' +' + Math.round(q.right - c.right)); }
          }
          const vis = (el) => el && el.getBoundingClientRect().width > 0;
          if (vis(row.querySelector('.lswap'))) r.swap++;
          if (vis(row.querySelector('.lstage'))) r.stage++;
        }
        r.over = [...new Set(r.over)].slice(0, 5); r.chips = [...new Set(r.chips)].slice(0, 5);
        return r;
      });
      document.getElementById('out').textContent = JSON.stringify(out);
    });`;
    const file = join(dir, 'list.html');
    writeFileSync(file, `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${fonts} .case { margin: 0 0 40px; }</style>${styles}<style>.ct .lrow { content-visibility: visible; }</style></head><body><main class="ct">${cases}</main><pre id="out"></pre><script>${script}</script></body></html>`);
    const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${join(dir, 'profile')}`, '--allow-file-access-from-files', '--virtual-time-budget=15000', '--window-size=1400,900', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120000, stdio: ['ignore', 'pipe', 'ignore'] });
    const json = /<pre id="out">([^<]*)<\/pre>/.exec(dom)?.[1];
    assert.ok(json, 'the page measured its rows');
    return JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('in Chrome, the list rows fit every list width: no text past its cell or chip (a long one-word pest name breaks inside its chip); the full list keeps Swap and the stage words from 850 px, the narrow tier drops them', { skip: !chrome && 'no Chrome or Chromium on this machine' }, async () => {
  const views = [{ country: null, lang: 'de' }, { country: 'FR', lang: 'de' }, { country: null, lang: 'ru' }, { country: null, lang: 'fr' }, { country: 'FR', lang: 'nl' }, { country: 'FR', lang: 'en' }];
  for (const view of views) {
    const html = await listHtml(view);
    const results = measure([...NARROW, ...FULL].map((width) => ({ html, width })), view.lang);
    for (const r of results) {
      const where = `${view.lang} ${view.country ?? 'no country'}, list ${r.width} px`;
      assert.equal(r.list, r.width, where);
      assert.ok(r.rows >= 190, `${where}: the rows were laid out (${r.rows})`);
      assert.deepEqual(r.chips, [], `${where}: chip text stays inside its chip`);
      assert.deepEqual(r.over, [], `${where}: nothing runs past its cell or row`);
      if (r.width >= 850) {
        assert.equal(r.swap, r.rows - r.crops, `${where}: every row that is not a main crop shows Swap`);
        assert.equal(r.stage, r.rows, `${where}: every row shows its stage words`);
      } else {
        assert.equal(r.swap + r.stage, 0, `${where}: the narrow tier drops Swap and the stage words`);
      }
    }
  }
});
