// The side view laid out in headless Chrome with the site's own stylesheets: what a reader sees, not
// what the CSS text says (scale chunk C review S3, S6, S7, V5, V6). Kept small, like
// consortium-layout.test.mjs (review N1): two real states rendered once by the harness (20 plants
// drawn, 200 plants as marks), one Chrome run for a 320 px phone and one for the desktop, each killed
// after 30 s; the folder is removed in a finally block and on SIGINT/SIGTERM. Needs Google Chrome or
// Chromium; skipped, and says so, on a machine without one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { device, tab } from './consortium-harness.mjs';
import * as core from '../src/lib/consortium/index.ts';
import * as SV from '../src/scripts/consortium/side.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const chrome = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find((bin) => spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0);
const temperate = JSON.parse(read('public/data/consortium/temperate.json'));
const ids = temperate.taxa.map((t) => t.id);
const named = (n) => temperate.taxa.find((t) => t.canonical_name === n).id;

// 20 plants over the four layers with every shape: trees, shrubs, herbs and a climber.
const TWENTY = [...new Set([
  'Betula pendula', 'Caragana arborescens', 'Juniperus communis', 'Cornus mas', 'Allium sativum', 'Allium schoenoprasum', 'Allium ursinum', 'Viola odorata', 'Malus domestica', 'Vitis vinifera',
].map(named).concat(ids))].slice(0, 20);

async function sideHtml(members, lang = 'en') {
  const q = core.encodeState({ climate: 'temperate', country: 'FR', site: { ...core.DEFAULT_SITE, room: 'field' }, kept: members, removed: [], members, plants: [], crops: [], guests: [] }, temperate);
  const page = await tab(device(), '/consortium/#' + q.toString(), { data: 'real', lang }).load();
  const html = page.$('#ct-side').outerHTML;
  assert.ok(html.length > 1000);
  return html;
}

function dumpDom(file, dir, width, onProc) {
  return new Promise((resolve, reject) => {
    const args = ['-s', 'KILL', '30', chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--renderer-process-limit=1',
      `--user-data-dir=${join(dir, 'profile')}`, '--allow-file-access-from-files', '--virtual-time-budget=5000', `--window-size=${width},900`, '--dump-dom', pathToFileURL(file).href];
    const proc = spawn('timeout', args, { stdio: ['ignore', 'pipe', 'ignore'], detached: true });
    onProc(proc);
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('error', reject);
    proc.on('close', (code) => { code === 0 ? resolve(out) : reject(new Error(`Chrome exited with ${code}`)); });
  });
}

// The page measures each case in light, then in dark. The app marks a band dense at the width drawn
// (side.js denseAt, app.js svFit); the page does the same with the same function.
const script = `
const MIN_PITCH = ${SV.MIN_PITCH};
const denseAt = ${SV.denseAt.toString()};
function rgb(c) {
  const m = /rgba?\\(([^)]+)\\)/.exec(c) || /color\\(srgb ([^)]+)\\)/.exec(c);
  const v = m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
  return c.startsWith('color(') ? v.map((x) => x * 255) : v;
}
function lum(c) { const [r, g, b] = rgb(c).map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + 0.05) / (x + 0.05); };
function measure(theme) {
  document.documentElement.dataset.theme = theme;
  return [...document.querySelectorAll('.case')].map((box) => {
    for (const m of box.querySelectorAll('.sv-marks')) { if (denseAt(m.clientWidth, m.children.length)) m.setAttribute('data-dense', 'true'); else m.removeAttribute('data-dense'); }
    const surface = getComputedStyle(box.querySelector('.probe')).backgroundColor;
    const r = { width: parseInt(box.style.width, 10), size: box.querySelector('.sv').dataset.size, plotH: 0, svgs: 0, scale: [], bands: [], denseNote: false, numOverlap: 0, minNum: 99, keyOverlap: [] };
    // The legend: a plant's name never runs under its height ("30 m, climbing or trailing").
    for (const li of box.querySelectorAll('.pkey li')) {
      const h = li.querySelector('.pkey-h')?.getBoundingClientRect(), it = li.querySelector('.pkey-item');
      if (!h || !h.width) continue;
      for (const el of it.querySelectorAll('.pkey-n, .pkey-sci, .num')) { const e = el.getBoundingClientRect(); if (e.right > h.left + 0.5 && e.left < h.right - 0.5 && e.bottom > h.top + 0.5 && e.top < h.bottom - 0.5) r.keyOverlap.push(li.textContent.replace(/\s+/g, ' ').trim()); }
      if (it.scrollWidth > it.clientWidth + 1) r.keyOverlap.push('overflows: ' + li.textContent.replace(/\s+/g, ' ').trim());
      // A wrapped height sits in the name's column, never under the number (review Y3).
      const n = li.querySelector('.pkey-n').getBoundingClientRect(), num = li.querySelector('.num').getBoundingClientRect();
      if (h.top >= n.bottom - 0.5 && Math.abs(h.left - n.left) > 1.5) r.keyOverlap.push('wrapped at ' + (h.left - num.left) + ' px, name at ' + (n.left - num.left) + ' px: ' + li.textContent.replace(/\s+/g, ' ').trim());
    }
    // The numbers under the drawing: none overlaps another, each one readable.
    const nums = [...box.querySelectorAll('.sv-nums .num')].map((n) => n.getBoundingClientRect());
    for (const n of nums) r.minNum = Math.min(r.minNum, n.width);
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
      const a = nums[i], b = nums[j];
      if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) r.numOverlap++;
    }
    for (const svg of box.querySelectorAll('.sv-col svg')) {
      const s = svg.getBoundingClientRect(), p = svg.closest('.sv-plot').getBoundingClientRect();
      r.plotH = Math.round(p.height); r.svgs++;
      const unit = p.height / 72;
      if (Math.abs(s.height - p.height) > 0.6 || Math.abs(s.bottom - p.bottom) > 0.6 || Math.abs(s.width - 16 * unit) > 0.6) r.scale.push(svg.closest('[data-t]').dataset.t + ' ' + s.width.toFixed(1) + 'x' + s.height.toFixed(1) + ' in ' + p.height.toFixed(1));
    }
    for (const m of box.querySelectorAll('.sv-marks')) {
      const marks = [...m.children], rs = marks.map((i) => i.getBoundingClientRect());
      const b = { s: m.dataset.s, n: marks.length, dense: m.hasAttribute('data-dense'), pitch: marks.length ? m.clientWidth / marks.length : 0, minGap: 99, lowContrast: [], wideDots: 0 };
      for (let i = 1; i < rs.length; i++) b.minGap = Math.min(b.minGap, rs[i].left - rs[i - 1].right);
      marks.forEach((i, k) => {
        if (i.hasAttribute('data-u')) return;
        const c = contrast(getComputedStyle(i).backgroundColor, surface);
        if (c < 3) b.lowContrast.push(k + ':' + c.toFixed(2));
        if (i.hasAttribute('data-w') && parseFloat(getComputedStyle(i, '::before').width) >= b.pitch) b.wideDots++;
      });
      r.bands.push(b);
    }
    const note = box.querySelector('.sv-dense-note');
    r.denseNote = !!note && getComputedStyle(note).display !== 'none';
    return r;
  });
}
document.fonts.ready.then(() => {
  const out = { light: measure('light'), dark: measure('dark') };
  document.getElementById('out').textContent = JSON.stringify(out);
});`;

async function run(cases, windowWidth) {
  const dir = mkdtempSync(join(tmpdir(), 'ct-side-'));
  let proc = null;
  const stop = () => { if (proc) try { process.kill(-proc.pid, 'SIGKILL'); } catch {} rmSync(dir, { recursive: true, force: true }); };
  const onSignal = (sig) => { stop(); process.exit(sig === 'SIGINT' ? 130 : 143); };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  try {
    const fonts = read('src/styles/fonts.css').replace(/url\('\/fonts\//g, `url('${pathToFileURL(join(root, 'public/fonts/')).href}`);
    const styles = ['tokens', 'global', 'consortium'].map((name) => `<link rel="stylesheet" href="${pathToFileURL(join(root, `src/styles/${name}.css`)).href}">`).join('');
    const body = cases.map(([width, html]) => `<div class="case" style="width:${width}px"><i class="probe" style="display:block;height:1px;background:var(--surface)"></i>${html}</div>`).join('');
    const file = join(dir, 'side.html');
    writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${fonts} body { margin: 0; } .case { margin: 0 0 40px; }</style>${styles}</head><body><main class="ct">${body}</main><pre id="out"></pre><script>${script}</script></body></html>`);
    const dom = await dumpDom(file, dir, windowWidth, (p) => { proc = p; });
    const json = /<pre id="out">([^<]*)<\/pre>/.exec(dom)?.[1];
    assert.ok(json, 'the page measured the side view');
    return JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    stop();
  }
}

test('in Chrome, the side view is true to scale and readable at 320 px and on the desktop, in light and dark', { skip: !chrome && 'no Chrome or Chromium on this machine', timeout: 90000 }, async () => {
  const draw = await sideHtml(TWENTY), marks = await sideHtml(ids), drawFr = await sideHtml(TWENTY, 'fr');
  // A 320 px phone (16 px page gutters), then the desktop: the drawing beside the side panel and the
  // marks at full width.
  const results = [...await run([[288, draw], [288, marks], [288, drawFr]], 320).then((r) => [r]), await run([[825, draw], [1185, marks], [825, drawFr]], 1300)];
  for (const out of results) for (const theme of ['light', 'dark']) for (const r of out[theme]) {
    const where = `${r.size} at ${r.width} px, ${theme}`;
    if (r.size === 'draw') {
      assert.equal(r.svgs, 20, where);
      // S3: every plant on the band's own scale, so its top meets the 1, 5 and 20 m lines.
      assert.deepEqual(r.scale, [], `${where}: each drawing is the plot's height, on the ground, not shrunk to its column`);
      // V5: on a phone 4 m and 15 m clearly differ.
      if (r.width < 640) assert.ok(r.plotH >= 84 && r.plotH <= 96, `${where}: plot ${r.plotH} px`);
      // V5: 20 numbers that never overlap, each at least 19 px.
      assert.equal(r.numOverlap, 0, `${where}: numbers apart`);
      assert.ok(r.minNum >= 19, `${where}: numbers ${r.minNum} px`);
      assert.deepEqual(r.keyOverlap, [], `${where}: legend names clear of their heights`);
      continue;
    }
    assert.equal(r.bands.reduce((a, b) => a + b.n, 0), 200, where);
    for (const b of r.bands) {
      const at = `${where}, ${b.s}`;
      // S6: every mark reads against the surface.
      assert.deepEqual(b.lowContrast, [], `${at}: every mark 3:1 or more against the surface`);
      // V6: alternate shades only when the marks are too narrow for a gap.
      assert.equal(b.dense, b.pitch < SV.MIN_PITCH, `${at}: dense at a ${b.pitch.toFixed(1)} px pitch`);
      if (!b.dense && b.n > 1) assert.ok(b.minGap >= 0.9, `${at}: a 1 px gap between marks (${b.minGap})`);
      // S7: a warning dot never wider than the mark pitch.
      assert.equal(b.wideDots, 0, `${at}: dots narrower than the pitch`);
    }
    assert.equal(r.denseNote, r.bands.some((b) => b.dense), `${where}: the caption explains the shades exactly when a band is dense`);
  }
  // The phone draws the 107 Mid marks dense; the desktop separates them.
  assert.equal(results[0].light[1].bands.find((b) => b.s === 'medium').dense, true);
  assert.equal(results[1].light[1].bands.find((b) => b.s === 'medium').dense, false);
});
