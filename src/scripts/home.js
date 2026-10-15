// Home page entry: the shared chrome (./chrome.js), hero, downloads, the featured design and its map,
// contact and donations. Strings come from the page (./page-data.js), never from this code.
import { initChrome } from './chrome.js';
import { initDownloads } from './downloads.js';
import { initHeroReveal } from './hero-reveal.js';
import { createDesignCanvas } from './design-canvas.js';
import { createDesignFinder } from './design-map.js';
import { initContact } from './contact.js';
import { lang, text } from './page-data.js';

const params = new URLSearchParams(location.search);

// "Sarthe, France" in the page language: the country comes from Intl, the region stays as named.
const placeName = (d) => `${d.region}, ${new Intl.DisplayNames([lang], { type: 'region' }).of(d.country)}`;

let design = null;
initDownloads();
const hero = initHeroReveal();
initChrome({ onThemeChange: () => { hero.refresh(); design?.refreshTheme(); } });

// ---------- featured design and map ----------

const card = document.querySelector('.design-card');
const field = (name) => card.querySelector(`[data-design-${name}]`);
const canvas = document.querySelector('[data-design-canvas]');
const legend = document.querySelector('[data-design-legend]');
const STRATA = ['emergent', 'high', 'medium', 'low', 'none'];
const number = new Intl.NumberFormat(lang);

design = createDesignCanvas({
  stage: document.querySelector('[data-design-stage]'),
  canvas,
  tooltip: document.querySelector('[data-plant-tooltip]'),
  hint: document.querySelector('[data-design-hint]'),
  lang,
});
document.querySelector('[data-design-hint]').textContent = text(matchMedia('(hover: hover)').matches ? 'design.hintPointer' : 'design.hintTouch');

const map = createDesignFinder({
  lang,
  placeName,
  text,
  container: document.querySelector('[data-finder-map]'),
  list: document.querySelector('[data-finder-list]'),
  more: document.querySelector('[data-list-more]'),
  listTitle: document.querySelector('[data-list-title]'),
  hint: document.querySelector('[data-map-hint]'),
  locate: document.querySelector('[data-locate]'),
  status: document.querySelector('[data-locate-status]'),
  onSelect: (id, { from }) => select(id, { from }),
});

let designs = [];
function describe(d) {
  const counts = { plants: number.format(d.plantCount), species: number.format(d.speciesCount) };
  field('name').textContent = d.name;
  field('by').textContent = text('design.by', { designer: d.designer });
  field('place').textContent = placeName(d);
  field('stats').textContent = text('design.stats', counts);
  field('project').href = d.projectUrl;
  const org = field('org');
  org.href = d.organisation.url;
  org.replaceChildren(`${text('design.org', { org: d.organisation.name })} `);
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  org.append(arrow);
  canvas.setAttribute('aria-label', text('design.canvasLabel', { name: d.name, ...counts }));

  const present = new Set(d.species.map((s) => s.stratum));
  legend.replaceChildren(...STRATA.filter((key) => present.has(key)).map((key) => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = d.species.find((s) => s.stratum === key).color;
    item.append(swatch, text(`design.stratum.${key}`));
    return item;
  }));
  card.classList.remove('is-swapping');
  void card.offsetWidth;
  card.classList.add('is-swapping');
}

function select(id, { from } = {}) {
  const next = designs.find((d) => d.id === id);
  if (!next) return;
  describe(next);
  design.show(next);
  map.setActive(id);
  if (from) {
    const stage = document.querySelector('.finder-selected');
    const box = stage.getBoundingClientRect();
    if (box.bottom < 120 || box.top > innerHeight - 120) stage.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

design.load().then((data) => {
  designs = data.designs;
  map.setDesigns(designs);
  // ?design=<id> shows one design, for links and reviews; otherwise one at random.
  const first = designs.find((d) => d.id === params.get('design')) ?? designs[Math.floor(Math.random() * designs.length)];
  select(first.id);
});

// ---------- contact ----------

initContact(document.querySelector('[data-contact-form]'));
