// Mockup entry: theme, language (painting only in the mockup), hero, downloads, the featured
// design and its map, the network, contact and donations.
import { initDialogs } from './dialogs.js';
import { initDownloads } from './downloads.js';
import { initDonate } from './donate.js';
import { initHeroReveal } from './hero-reveal.js';
import { createDesignCanvas } from './design-canvas.js';
import { createPlacesMap } from './places-map.js';
import { renderNetwork, initContact } from './sections.js';

const LANG_NAMES = { en: 'English', fr: 'Français', es: 'Español', pt: 'Português', it: 'Italiano', de: 'Deutsch', nl: 'Nederlands', ru: 'Русский', zh: '中文', ja: '日本語', ko: '한국어' };
const root = document.documentElement;
const params = new URLSearchParams(location.search);

// "Sarthe, France" in the page language: the country comes from Intl, the region stays as named.
export const placeName = (d, code = 'en') => `${d.region}, ${new Intl.DisplayNames([code], { type: 'region' }).of(d.country)}`;

let design = null;
let current = null;
let map = null;
const card = document.querySelector('.design-card');
const field = (name) => card.querySelector(`[data-design-${name}]`);
const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

initDialogs();
initDownloads();
initDonate();
const hero = initHeroReveal();

// ---------- language (mockup: switches the painting only) ----------

let lang = LANG_NAMES[params.get('lang')] ? params.get('lang') : 'en';
const langMenu = document.querySelector('[data-lang-menu]');
function applyLang() {
  langMenu.querySelector('[data-lang-code]').textContent = lang.toUpperCase();
  langMenu.querySelector('summary').setAttribute('aria-label', `Language: ${LANG_NAMES[lang]}`);
  for (const a of langMenu.querySelectorAll('[data-lang]')) {
    if (a.dataset.lang === lang) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  }
  document.querySelector('[data-mockup-lang]').textContent = LANG_NAMES[lang];
  hero.setPainting(lang, isDark());
  design?.setLang(lang);
  if (current) { field('place').textContent = placeName(current, lang); map.setLang(lang); }
}
langMenu.addEventListener('click', (event) => {
  const link = event.target.closest('[data-lang]');
  if (!link) return;
  event.preventDefault();
  lang = link.dataset.lang;
  history.replaceState(null, '', `?${new URLSearchParams({ ...Object.fromEntries(params), lang })}`);
  langMenu.open = false;
  langMenu.querySelector('summary').focus();
  applyLang();
});
document.addEventListener('click', (event) => { if (!langMenu.contains(event.target)) langMenu.open = false; });
langMenu.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { langMenu.open = false; langMenu.querySelector('summary').focus(); }
});

// ---------- theme ----------

const toggle = document.querySelector('[data-theme-toggle]');
function applyTheme() {
  toggle.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  hero.refresh();
  hero.setPainting(lang, isDark());
  design?.refreshTheme();
}
toggle.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('canopi-theme', root.dataset.theme); } catch {}
  applyTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) applyTheme(); });

applyLang();
applyTheme();

// ---------- featured design and map ----------

const legend = document.querySelector('[data-design-legend]');
const STRATA = [['emergent', 'Emergent'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['none', 'No stratum']];

design = createDesignCanvas({
  stage: document.querySelector('[data-design-stage]'),
  canvas: document.querySelector('[data-design-canvas]'),
  tooltip: document.querySelector('[data-plant-tooltip]'),
  hint: document.querySelector('[data-design-hint]'),
  lang,
});
const hint = document.querySelector('[data-design-hint]');
hint.textContent = matchMedia('(hover: hover)').matches ? 'Drag to explore · Ctrl + scroll to zoom' : 'Tap a plant · two fingers to explore';

map = createPlacesMap({
  lang,
  placeName,
  container: document.querySelector('[data-places-map]'),
  list: document.querySelector('[data-places-list]'),
  onSelect: (id, { from }) => select(id, { from }),
});

let designs = [];
function describe(d) {
  field('name').textContent = d.name;
  field('by').textContent = `by ${d.designer}`;
  field('place').textContent = placeName(d, lang);
  field('stats').textContent = `${d.plantCount.toLocaleString('en')} plants · ${d.speciesCount} species`;
  const project = field('project');
  project.href = d.projectUrl;
  const org = field('org');
  org.href = d.organisation.url;
  org.replaceChildren(`With ${d.organisation.name} `);
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  org.append(arrow);
  document.querySelector('[data-design-canvas]').setAttribute('aria-label', `Planting plan of ${d.name}: ${d.plantCount} plants of ${d.speciesCount} species`);

  const present = new Set(d.species.map((s) => s.stratum));
  legend.replaceChildren(...STRATA.filter(([key]) => present.has(key)).map(([key, label]) => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = d.species.find((s) => s.stratum === key).color;
    item.append(swatch, label);
    return item;
  }));
  card.classList.remove('is-swapping');
  void card.offsetWidth;
  card.classList.add('is-swapping');
}

function select(id, { from } = {}) {
  const next = designs.find((d) => d.id === id);
  if (!next) return;
  current = next;
  describe(next);
  design.show(next);
  map.setActive(id);
  if (from) {
    const stage = document.querySelector('#design');
    const box = stage.getBoundingClientRect();
    if (box.bottom < 120 || box.top > innerHeight - 120) stage.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

design.load().then((data) => {
  designs = data.designs;
  map.setDesigns(designs);
  const forced = params.get('design');
  const first = designs.find((d) => d.id === forced) ?? designs[Math.floor(Math.random() * designs.length)];
  select(first.id);
});

// ---------- network and contact ----------

renderNetwork(document.querySelector('[data-network]'));
initContact(document.querySelector('[data-contact-form]'));
