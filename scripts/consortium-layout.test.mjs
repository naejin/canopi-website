// The plant list's row layout, measured in headless Chrome with the site's own stylesheets and
// fonts: what a reader sees, not what the CSS text says. Kept small on purpose (review N1: a big
// page here ran `npm test` out of memory): the invented fixture's list (a handful of rows, rendered
// once), three list widths, one Chrome run that kills itself after 30 s. Its folder is removed in a
// finally block and on SIGINT/SIGTERM, which also kill Chrome. Needs Google Chrome or Chromium; the
// test is skipped, and says so, on a machine without one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { device, tab } from './consortium-harness.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find((bin) => spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0);

// A long one-word pest name (the length of the German EPPO name of Ceratitis capitata).
const LONG = 'Mittelmeerfruchtfliege';
// The narrow tier's narrowest list (beside the side panel at a 960 px window), the full list's
// narrowest (850 px: the warnings cell is narrowest there, with no country) and a wide one.
const WIDTHS = [508, 850, 1185];

// The fixture's list with no country, in German, the long name in its first pest chip.
async function listHtml() {
  const dev = device();
  dev.store.set('canopi-country', '-'); // "no country": the "Invasive in" column, the narrowest warnings cell
  const page = await tab(dev, '/de/consortium/', { siteClimate: 'temperate', lang: 'de' }).load();
  await page.act('suggest');
  await page.act('mode', 'list');
  for (const g of ['emergent', 'high', 'medium', 'low', 'none']) if (page.$(`[data-act="group"][data-v="${g}"][aria-expanded="false"]`)) await page.act('group', g);
  const rows = page.$$('.lrow');
  assert.ok(rows.length >= 3, `a few rows (${rows.length})`);
  const chip = page.$('.lrow .warn-chip > span:last-child');
  assert.ok(chip, 'a row with a warning chip');
  chip.children.splice(0, chip.children.length, { type: 'text', data: LONG, parent: chip });
  const html = page.$('.plants-sec').outerHTML;
  assert.ok(html.includes(LONG) && html.includes('lgroups no-country'));
  return html;
}

// Runs Chrome on the page; `timeout -s KILL` ends it even if this process is killed outright.
function dumpDom(file, dir, onProc) {
  return new Promise((resolve, reject) => {
    const args = ['-s', 'KILL', '30', chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--renderer-process-limit=1',
      `--user-data-dir=${join(dir, 'profile')}`, '--allow-file-access-from-files', '--virtual-time-budget=5000', '--window-size=1300,900', '--dump-dom', pathToFileURL(file).href];
    const proc = spawn('timeout', args, { stdio: ['ignore', 'pipe', 'ignore'], detached: true });
    onProc(proc);
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('error', reject);
    proc.on('close', (code) => { code === 0 ? resolve(out) : reject(new Error(`Chrome exited with ${code}`)); });
  });
}

async function measure(html, lang) {
  const dir = mkdtempSync(join(tmpdir(), 'ct-layout-'));
  let proc = null;
  const stop = () => { if (proc) try { process.kill(-proc.pid, 'SIGKILL'); } catch {} rmSync(dir, { recursive: true, force: true }); };
  const onSignal = (sig) => { stop(); process.exit(sig === 'SIGINT' ? 130 : 143); };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    const fonts = read('src/styles/fonts.css').replace(/url\('\/fonts\//g, `url('${pathToFileURL(join(root, 'public/fonts/')).href}`);
    const styles = ['tokens', 'global', 'consortium'].map((name) => `<link rel="stylesheet" href="${pathToFileURL(join(root, `src/styles/${name}.css`)).href}">`).join('');
    const cases = WIDTHS.map((width) => `<div class="case" style="width:${width}px">${html}</div>`).join('');
    const script = `document.fonts.ready.then(() => {
      const out = [...document.querySelectorAll('.case')].map((box) => {
        const r = { width: parseInt(box.style.width, 10), list: Math.round(box.querySelector('.plants-sec').getBoundingClientRect().width), rows: 0, swap: 0, stage: 0, crops: 0, over: [], chips: [], long: 0 };
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
        const vis = (el) => el && el.getBoundingClientRect().width > 0;
        for (const row of box.querySelectorAll('.lrow:not([hidden])')) {
          r.rows++;
          if (!row.querySelector('.lswap')) r.crops++;
          overflows(row);
          for (const chip of row.querySelectorAll('.warn-chip')) {
            const c = chip.getBoundingClientRect();
            for (const s of chip.children) {
              const q = s.getBoundingClientRect();
              if (s.textContent === ${JSON.stringify(LONG)} && vis(s)) r.long++;
              if (q.right > c.right + 0.5 || q.left < c.left - 0.5) r.chips.push(s.textContent + ' +' + Math.round(q.right - c.right));
            }
          }
          if (vis(row.querySelector('.lswap'))) r.swap++;
          if (vis(row.querySelector('.lstage'))) r.stage++;
        }
        return r;
      });
      document.getElementById('out').textContent = JSON.stringify(out);
    });`;
    const file = join(dir, 'list.html');
    writeFileSync(file, `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${fonts} .case { margin: 0 0 40px; }</style>${styles}<style>.ct .lrow { content-visibility: visible; }</style></head><body><main class="ct">${cases}</main><pre id="out"></pre><script>${script}</script></body></html>`);
    const dom = await dumpDom(file, dir, (p) => { proc = p; });
    const json = /<pre id="out">([^<]*)<\/pre>/.exec(dom)?.[1];
    assert.ok(json, 'the page measured its rows');
    return JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    stop();
  }
}

test('in Chrome, a long one-word pest name breaks inside its chip in the narrowest warnings cell; nothing runs past its cell or row; the full list keeps Swap and the stage words from 850 px, the narrow tier drops them', { skip: !chrome && 'no Chrome or Chromium on this machine', timeout: 60000 }, async () => {
  const results = await measure(await listHtml(), 'de');
  assert.equal(results.length, WIDTHS.length);
  for (const r of results) {
    const where = `list ${r.width} px`;
    assert.equal(r.list, r.width, where);
    assert.ok(r.rows >= 3, `${where}: rows laid out (${r.rows})`);
    assert.equal(r.long, 1, `${where}: the long name is shown`);
    assert.deepEqual(r.chips, [], `${where}: chip text stays inside its chip`);
    assert.deepEqual(r.over, [], `${where}: nothing runs past its cell or row`);
    if (r.width >= 850) {
      assert.equal(r.swap, r.rows - r.crops, `${where}: every row that is not a main crop shows Swap`);
      assert.equal(r.stage, r.rows, `${where}: every row shows its stage words`);
    } else {
      assert.equal(r.swap + r.stage, 0, `${where}: the narrow tier drops Swap and the stage words`);
    }
  }
});
