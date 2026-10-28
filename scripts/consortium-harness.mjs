// A small browser for scripts/consortium-app.test.mjs: it runs the consortium tool's own wiring
// (src/scripts/consortium/app.js) on a minimal DOM, so a test clicks, types and navigates as a
// reader does, and reads what the page shows, the address bar and history (scale-a fix review F8).
// What it models: one device (localStorage, shared by the page loads of a test), a tab's history
// (entries with their state; a fragment change pushes an entry; Back to an entry of the same
// document fires hashchange; reload() and a language link open a new page load), focus, and the
// data files (scripts/fixtures/consortium/) with failures on demand. Each page load imports a fresh
// copy of app.js and of the modules it imports (so data.ts's cache is per page load, as in a
// browser). Built on parse5 (HTML), domhandler nodes and css-select (selectors).
import { register } from 'node:module';
import { inspect } from 'node:util';
import { readFileSync } from 'node:fs';
import { parseFragment } from 'parse5';
import { Element, Text, Document } from 'domhandler';
import { selectAll, selectOne, is } from 'css-select';
import render from 'dom-serializer';
import { consortiumGuides, jobGuides, explainGuide } from '../src/data/consortium-guides.ts';
import { siteClimates } from '../src/lib/consortium/index.ts';

// Every module under src/scripts/consortium/ imported from a page load's app.js carries that load's
// number, so each page load gets its own module instances.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  const run = context.parentURL && new URL(context.parentURL).searchParams.get('ctrun');
  if (run && r.url.startsWith('file:') && r.url.includes('/src/scripts/consortium/') && !r.url.includes('?')) return { ...r, url: r.url + '?ctrun=' + run };
  return r;
}`));

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const translations = (lang) => JSON.parse(read(`src/i18n/translations/${lang}.json`));

// The strings ConsortiumPage.astro hands app.js (every consortium.* key without its prefix, and the
// climate words), English where the locale has none.
function pageStrings(lang) {
  const en = translations('en'), own = translations(lang), out = {};
  for (const key of Object.keys(en)) {
    const v = own[key] ?? en[key];
    if (key.startsWith('consortium.')) out[key.slice('consortium.'.length)] = v;
    else if (/^climate\.[a-z]+(\.about|\.places)?$/.test(key)) out[key] = v;
  }
  return out;
}

// ---------- DOM ----------
const FOCUSABLE = new Set(['button', 'input', 'select', 'textarea', 'summary']);
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
function toNodes(list) {
  return list.map((n) => {
    if (n.nodeName === '#text') return new Text(n.value);
    if (n.nodeName === '#comment' || !n.tagName) return new Text('');
    const el = new Element(n.tagName, Object.fromEntries(n.attrs.map((a) => [a.name, a.value])), toNodes(n.content?.childNodes ?? n.childNodes ?? []));
    return el;
  });
}
// The tree's links are not enumerable: node:assert prints a failed value with customInspect off and
// a depth of 1000, and an element's enumerable parent/children/siblings made that print walk the
// whole circular tree, without bound (the runaway that OOM-killed the F5 test).
const hide = (o, k, value) => Object.defineProperty(o, k, { value, writable: true, enumerable: false, configurable: true });
function adopt(parent, children) {
  hide(parent, 'children', children);
  children.forEach((c, i) => { hide(c, 'parent', parent); hide(c, 'prev', children[i - 1] ?? null); hide(c, 'next', children[i + 1] ?? null); if (c.children) adopt(c, c.children); });
}
const parse = (html) => toNodes(parseFragment(html).childNodes);

class Event {
  constructor(type, init = {}) { Object.assign(this, { type, bubbles: true, defaultPrevented: false, detail: 0 }, init); }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.stopped = true; }
}
const listenersOf = (o) => { if (!Object.hasOwn(o, '_listeners')) hide(o, '_listeners', {}); return o._listeners; };
const events = {
  addEventListener(type, fn) { (listenersOf(this)[type] ??= []).push(fn); },
  removeEventListener(type, fn) { const l = listenersOf(this)[type]; if (l) l.splice(l.indexOf(fn) >>> 0, 1); },
};
let depth = 0;
function fire(target, event, path) {
  if (++depth > 20) { depth = 0; throw new Error(`${event.type}: dispatched inside its own handlers more than 20 deep (a loop?)`); }
  try { return fireOnce(target, event, path); } finally { depth = Math.max(0, depth - 1); }
}
function fireOnce(target, event, path) {
  event.target ??= target;
  for (const node of path) {
    event.currentTarget = node;
    for (const fn of [...(listenersOf(node)[event.type] ?? [])]) fn.call(node, event);
    if (event.stopped || !event.bubbles) break;
  }
  return !event.defaultPrevented;
}

function makeDocument(page) {
  const doc = new Document([]);
  const html = new Element('html', { lang: page.lang }, []);
  adopt(doc, [html]);
  const P = Element.prototype;
  // The DOM APIs app.js uses, on domhandler's own Element (css-select reads the same nodes).
  const define = (name, desc) => Object.defineProperty(P, name, { configurable: true, ...desc });
  define('id', { get() { return this.attribs.id ?? ''; } });
  define('tagName', { get() { return this.name.toUpperCase(); } });
  define('parentElement', { get() { return this.parent instanceof Element ? this.parent : null; } });
  define('innerHTML', {
    get() { return render(this.children, { decodeEntities: true }); },
    // The old children leave the page, as in a browser (a node moved back in later is not still "in" it).
    set(v) { for (const c of this.children ?? []) c.parent = null; adopt(this, parse(String(v))); },
  });
  // A patched row or group (app.js patchList, B2): the element is replaced by the parsed markup.
  define('outerHTML', {
    get() { return render([this], { decodeEntities: true }); },
    set(v) {
      const up = this.parent;
      if (!up) return;
      const kids = up.children.flatMap((c) => (c === this ? parse(String(v)) : [c]));
      adopt(up, kids); this.parent = null;
    },
  });
  define('textContent', {
    get() { const t = (n) => (n instanceof Text ? n.data : (n.children ?? []).map(t).join('')); return t(this); },
    set(v) { adopt(this, [new Text(String(v))]); },
  });
  define('dataset', {
    get() {
      const el = this;
      return new Proxy({}, {
        get: (_, k) => el.attribs['data-' + kebab(String(k))],
        set: (_, k, v) => { el.attribs['data-' + kebab(String(k))] = String(v); return true; },
        deleteProperty: (_, k) => { delete el.attribs['data-' + kebab(String(k))]; return true; },
        has: (_, k) => ('data-' + kebab(String(k))) in el.attribs,
        ownKeys: () => Object.keys(el.attribs).filter((a) => a.startsWith('data-')).map((a) => camel(a.slice(5))),
        getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true, value: el.attribs['data-' + kebab(String(k))] }),
      });
    },
  });
  for (const attr of ['hidden', 'disabled', 'open']) define(attr, { get() { return attr in this.attribs; }, set(v) { if (v) this.attribs[attr] = ''; else delete this.attribs[attr]; } });
  define('checked', { get() { return this._checked ?? 'checked' in this.attribs; }, set(v) { this._checked = !!v; } });
  define('value', {
    get() {
      if (this._value != null) return this._value;
      if (this.name === 'select') { const opts = selectAll('option', this); return (opts.find((o) => 'selected' in o.attribs) ?? opts[0])?.attribs.value ?? ''; }
      return this.attribs.value ?? '';
    },
    set(v) { this._value = String(v); },
  });
  define('style', { get() { return (this._style ??= {}); } });
  define('classList', {
    get() {
      const el = this, list = () => (el.attribs.class ?? '').split(/\s+/).filter(Boolean);
      return { contains: (c) => list().includes(c), add: (...c) => { el.attribs.class = [...new Set([...list(), ...c])].join(' '); }, remove: (...c) => { el.attribs.class = list().filter((x) => !c.includes(x)).join(' '); }, toggle: (c, on) => { const has = list().includes(c); if (on ?? !has) el.classList.add(c); else el.classList.remove(c); } };
    },
  });
  define('scrollTop', { get() { return this._scrollTop ?? 0; }, set(v) { this._scrollTop = v; } });
  define('selectionStart', { get() { return this.value.length; } });
  define('selectionEnd', { get() { return this.value.length; } });
  // A node prints as one short line in a test's own logs.
  P[inspect.custom] = function () { return `<${this.name}${Object.entries(this.attribs).slice(0, 4).map(([k, v]) => ` ${k}="${String(v).slice(0, 40)}"`).join('')}>`; };
  doc[inspect.custom] = () => '#document';
  Object.assign(P, events, {
    getAttribute(n) { return this.attribs[n] ?? null; },
    setAttribute(n, v) { this.attribs[n] = String(v); },
    removeAttribute(n) { delete this.attribs[n]; },
    hasAttribute(n) { return n in this.attribs; },
    toggleAttribute(n, on) { if (on ?? !(n in this.attribs)) this.attribs[n] = ''; else delete this.attribs[n]; },
    querySelector(sel) { return selectOne(sel, this); },
    querySelectorAll(sel) { return selectAll(sel, this); },
    matches(sel) { return is(this, sel); },
    closest(sel) { for (let n = this; n instanceof Element; n = n.parent) if (is(n, sel)) return n; return null; },
    contains(other) { for (let n = other; n; n = n.parent) if (n === this) return true; return false; },
    focus() {
      if (!page.connected(this)) return;
      const ok = (FOCUSABLE.has(this.name) && !('disabled' in this.attribs)) || (this.name === 'a' && 'href' in this.attribs) || 'tabindex' in this.attribs;
      if (ok) page.active = this;
    },
    blur() { if (page.active === this) page.active = null; },
    click() { this.dispatchEvent(new Event('click', { detail: 1 })); },
    dispatchEvent(event) { const path = []; for (let n = this; n; n = n.parent) path.push(n); path.push(page.window); return fire(this, event, path); },
    scrollIntoView() {},
    getBoundingClientRect() { return { left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 }; },
    setSelectionRange() {},
    showModal() { this.open = true; },
    close() { if (!this.open) return; this.open = false; page.later(() => this.dispatchEvent(new Event('close', { bubbles: false }))); },
    remove() { if (!this.parent) return; const kids = this.parent.children.filter((c) => c !== this); adopt(this.parent, kids); this.parent = null; },
    // Moves each node to the end of this element (the toast and the live line move into an open sheet: H5).
    append(...nodes) {
      for (const n of nodes) {
        if (n.parent?.children?.includes(n)) adopt(n.parent, n.parent.children.filter((c) => c !== n));
        adopt(this, [...this.children.filter((c) => c !== n), n]);
      }
    },
  });
  Object.assign(doc, events, {
    documentElement: html,
    getElementById(id) { return selectOne(`[id="${id}"]`, doc.children); },
    querySelector(sel) { return selectOne(sel, doc.children); },
    querySelectorAll(sel) { return selectAll(sel, doc.children); },
    dispatchEvent(event) { return fire(doc, event, [doc, page.window]); },
  });
  Object.defineProperty(doc, 'body', { get: () => selectOne('body', doc.children) });
  Object.defineProperty(doc, 'activeElement', { get: () => (page.active && page.connected(page.active) ? page.active : doc.body) });
  return { doc, html };
}

// The CSS.escape of the CSSOM spec.
function cssEscape(value) {
  const s = String(value);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i), ch = s[i];
    if (c === 0) out += '\uFFFD';
    else if ((c >= 1 && c <= 31) || c === 127 || (i === 0 && c >= 48 && c <= 57) || (i === 1 && c >= 48 && c <= 57 && s.charCodeAt(0) === 45)) out += '\\' + c.toString(16) + ' ';
    else if (i === 0 && s.length === 1 && c === 45) out += '\\' + ch;
    else if (c >= 128 || c === 45 || c === 95 || (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) out += ch;
    else out += '\\' + ch;
  }
  return out;
}

// ---------- The device and the tab ----------
// A device: localStorage (blocked: every call throws) and the data files, any of which can fail.
export function device({ blocked = false } = {}) {
  const store = new Map();
  const storage = blocked
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }
    : { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
  // onFetch(file): called as a data file is asked for (a test changes the address mid-start with it).
  return { store, storage, failing: new Set(), fetched: [], onFetch: null };
}

// A tab: its history entries ({ url, state, doc: the page load that owns it }) and the page shown.
export function tab(dev, url, opts = {}) {
  /** @type {any} */
  const t = { dev, entries: [{ url: new URL(url, 'https://projectcanopi.com'), state: null, doc: 0 }], index: 0, page: null, loads: 0 };
  t.entry = () => t.entries[t.index];
  // A new page load on the current entry (a reload, Back across documents, a language link).
  t.load = async (o = {}) => { t.page?.close(); t.page = await openPage(t, { ...opts, ...o }); return t.page; };
  // A typed or pasted address with only the fragment changed: a new entry of this document, then hashchange.
  t.goHash = async (hash) => {
    const old = t.entry(), next = new URL(old.url); next.hash = hash;
    if (next.href === old.url.href) return t.page;
    t.entries.splice(t.index + 1, Infinity, { url: next, state: null, doc: old.doc });
    t.index++;
    if (next.hash !== old.url.hash) t.page.window.dispatchEvent(new Event('hashchange', { bubbles: false }));
    await t.page.settle();
    return t.page;
  };
  // A new document in this tab (a language link, a typed address with another path or query).
  t.go = async (href) => {
    t.entries.splice(t.index + 1, Infinity, { url: new URL(href, t.entry().url), state: null, doc: ++t.loads });
    t.index++;
    return t.load();
  };
  // Back: within the document, a hashchange; across documents, a new page load.
  t.back = async () => {
    const from = t.entry(); t.index--;
    const to = t.entry();
    if (to.doc !== from.doc) return t.load();
    if (to.url.hash !== from.url.hash) t.page.window.dispatchEvent(new Event('hashchange', { bubbles: false }));
    await t.page.settle();
    return t.page;
  };
  return t;
}

let runs = 0;
const SETTLE_ROUNDS = 50;
// data: 'fixture' (the invented files) or 'real' (the installed export under public/data/consortium/,
// 200 plants per climate: the scale tests).
async function openPage(t, { lang = 'en', width = 1280, siteClimate = null, data: dataSet = 'fixture' } = {}) {
  /** @type {any} */
  const page = { lang, active: null, timers: new Map(), nextTimer: 1, reloads: 0, closed: false, clipboard: null };
  // G5: a closed page's code does nothing: its timers are never scheduled.
  page.later = (fn) => { if (page.closed) return undefined; const id = page.nextTimer++; page.timers.set(id, fn); return id; };
  const { doc, html } = makeDocument(page);
  page.document = doc;
  page.connected = (el) => { for (let n = el; n; n = n.parent) if (n === doc) return true; return false; };
  if (siteClimate) html.attribs['data-climate'] = siteClimate;
  const data = { lang, strings: pageStrings(lang), guides: {}, plantGuides: consortiumGuides, jobGuides, explainGuide, contact: '/#contact' };
  const body = `<header><details data-lang-menu><summary>Language</summary><a href="/consortium/">English</a><a href="/fr/guilde/">Français</a></details></header>
    <main id="main" class="ct"><div class="wrap ct-wrap"><div class="tool-head" id="ct-head" data-step="0" data-climates="${siteClimates.join(' ')}"></div>
    <div id="ct-app" aria-busy="true"><p class="status-line">Loading</p></div></div>
    <dialog id="ct-dialog" class="ct-drawer" aria-labelledby="ct-dlg-title" data-own-dialog></dialog>
    <div id="ct-toast" class="toast" role="status" hidden></div><div id="ct-say" class="visually-hidden" aria-live="polite"></div><div id="ct-print" class="ct-print"></div></main>
    <script type="application/json" id="ct-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  const bodyEl = new Element('body', { class: 'grain' }, parse(body));
  adopt(html, [bodyEl]);
  // The address bar and history, read live from the tab.
  const location = {
    get pathname() { return t.entry().url.pathname; },
    get search() { return t.entry().url.search; },
    get hash() { const h = t.entry().url.hash; return h === '#' ? '' : h; },
    get origin() { return t.entry().url.origin; },
    get href() { return t.entry().url.href; },
    reload() { page.reloads++; },
  };
  const history = {
    get state() { return t.entry().state == null ? null : structuredClone(t.entry().state); },
    replaceState(state, _title, url) {
      const e = t.entry();
      e.state = state == null ? null : structuredClone(state);
      if (url != null) e.url = new URL(url, e.url);
    },
  };
  page.window = { ...events };
  page.window.dispatchEvent = (event) => fire(page.window, event, [page.window]);
  const mq = (q) => ({ matches: /max-width:\s*639px/.test(q) ? width <= 639 : false, addEventListener() {}, removeEventListener() {} });
  const own = page.timers;
  const globals = {
    window: page.window, document: doc, location, history, localStorage: t.dev.storage, matchMedia: mq,
    addEventListener: (...a) => page.window.addEventListener(...a), dispatchEvent: (e) => page.window.dispatchEvent(e),
    StorageEvent: class extends Event {}, CSS: { escape: cssEscape }, print() {},
    navigator: { language: lang, languages: [lang], clipboard: { writeText: async (s) => { page.clipboard = s; } } },
    setTimeout: (fn) => page.later(fn), clearTimeout: (id) => { own.delete(id); },
    // G5: a data file asked for by a closed page, or arriving after it closed, never arrives.
    fetch: async (url) => {
      const never = () => new Promise(() => {});
      if (page.closed) return never();
      await new Promise((r) => setImmediate(r));
      if (page.closed) return never();
      const file = String(url).replace(/^\/data\/consortium\//, '');
      t.dev.fetched.push(file);
      t.dev.onFetch?.(file, t);
      if (t.dev.failing.has(file)) return { ok: false, status: 503, json: async () => null };
      return { ok: true, status: 200, json: async () => JSON.parse(read(dataSet === 'real' ? `public/data/consortium/${file}` : `scripts/fixtures/consortium/${file}`)) };
    },
  };
  page.globals = globals;
  for (const [k, v] of Object.entries(globals)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  // Runs the timers due (the page's setTimeout calls) and lets the data files arrive, until quiet.
  // Bounded: a page that keeps scheduling work (a re-render loop) fails the test, never runs forever.
  page.settle = async () => {
    for (let round = 0; round < SETTLE_ROUNDS; round++) {
      for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
      if (!page.timers.size) return;
      const due = [...page.timers]; page.timers.clear();
      for (const [, fn] of due) fn();
    }
    throw new Error(`the page still schedules work after ${SETTLE_ROUNDS} rounds (a loop?)`);
  };
  page.close = () => { page.closed = true; page.timers.clear(); };
  // What the reader sees and does.
  page.$ = (sel) => doc.querySelector(sel);
  page.$$ = (sel) => doc.querySelectorAll(sel);
  page.text = (sel = '#ct-app') => (doc.querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  page.act = async (act, v) => {
    const sel = `[data-act="${act}"]` + (v != null ? `[data-v="${cssEscape(v)}"]` : '');
    const el = doc.querySelector(sel);
    if (!el) throw new Error(`no ${sel} on the page`);
    el.focus(); el.click(); await page.settle();
    return el;
  };
  page.type = async (sel, value) => {
    const el = doc.querySelector(sel);
    el.focus(); el.value = value; el.dispatchEvent(new Event('input')); await page.settle();
  };
  page.escape = async () => { const d = doc.getElementById('ct-dialog'); if (d.dispatchEvent(new Event('cancel', { bubbles: false }))) d.close(); await page.settle(); };
  page.focused = () => doc.activeElement;
  // Events with their own init (a Shift+click: { shiftKey: true }).
  page.Event = Event;
  page.key = async (key, init = {}) => { const el = doc.activeElement; el.dispatchEvent(new Event('keydown', { key, ...init })); await page.settle(); };
  // The module's own test seam (app.js __test): the list as a full render would write it, and the cached rows.
  page.app = await import(new URL(`src/scripts/consortium/app.js?ctrun=${++runs}`, root).href);
  await page.settle();
  return page;
}
