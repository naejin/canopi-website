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
let map = null;
initDownloads();
const hero = initHeroReveal();
initChrome({ onThemeChange: () => { hero.refresh(); design?.refreshTheme(); map?.refreshTheme(); } });

// ---------- featured design and map ----------

const caption = document.querySelector('.design-caption');
const field = (name) => caption.querySelector(`[data-design-${name}]`);
const canvas = document.querySelector('[data-design-canvas]');
const legend = document.querySelector('[data-design-legend]');
// Each plant shows its role (what it gives or does) by the app's 2.0 symbol and colour for that
// role; the legend lists the roles the design uses, in this order.
const ROLES = ['apple', 'berry', 'nut', 'pod', 'carrot', 'chili', 'medicinal', 'bee', 'timber', 'biomass'];
const number = new Intl.NumberFormat(lang);
let symbolArt = {};

design = createDesignCanvas({
  stage: document.querySelector('[data-design-stage]'),
  canvas,
  tooltip: document.querySelector('[data-plant-tooltip]'),
  hint: document.querySelector('[data-design-hint]'),
  lang,
});
document.querySelector('[data-design-hint]').textContent = text(matchMedia('(hover: hover)').matches ? 'design.hintPointer' : 'design.hintTouch');

map = createDesignFinder({
  lang,
  placeName,
  text,
  container: document.querySelector('[data-finder-map]'),
  list: document.querySelector('[data-finder-list]'),
  more: document.querySelector('[data-list-more]'),
  hint: document.querySelector('[data-map-hint]'),
  locate: document.querySelector('[data-locate]'),
  status: document.querySelector('[data-locate-status]'),
  onSelect: (id, { from }) => select(id, { from }),
});

function roleIcon(symbol, colour) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '-1 -1 2 2');
  svg.setAttribute('class', 'legend-symbol');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', symbolArt[symbol].compact.body);
  path.setAttribute('fill', colour);
  svg.append(path);
  return svg;
}

let designs = [];
function describe(d) {
  const counts = { plants: number.format(d.plantCount), species: number.format(d.speciesCount) };
  field('name').textContent = d.name;
  field('meta').textContent = [placeName(d), text('design.by', { designer: d.designer }), text('design.stats', counts)].join(' · ');
  field('project').href = d.projectUrl;
  const org = field('org');
  org.href = d.organisation.url;
  org.replaceChildren(`${text('design.org', { org: d.organisation.name })} `);
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  org.append(arrow);
  canvas.setAttribute('aria-label', text('design.canvasLabel', { name: d.name, ...counts }));

  const colours = new Map(d.species.map((s) => [s.symbol, s.color]));
  legend.replaceChildren(...ROLES.filter((role) => colours.has(role) && symbolArt[role]).map((role) => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    item.append(roleIcon(role, colours.get(role)), text(`design.role.${role}`));
    return item;
  }));
  for (const element of [caption, legend]) element.classList.remove('is-swapping');
  void caption.offsetWidth;
  for (const element of [caption, legend]) element.classList.add('is-swapping');
}

function select(id, { from } = {}) {
  const next = designs.find((d) => d.id === id);
  if (!next) return;
  describe(next);
  design.show(next);
  map.setActive(id);
  if (from) {
    const stage = document.querySelector('.design-stage');
    const box = stage.getBoundingClientRect();
    if (box.bottom < 120 || box.top > innerHeight - 120) stage.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

design.load().then((data) => {
  designs = data.designs;
  symbolArt = data.symbolArt;
  map.setDesigns(designs);
  // ?design=<id> shows one design, for links and reviews; otherwise one at random.
  const first = designs.find((d) => d.id === params.get('design')) ?? designs[Math.floor(Math.random() * designs.length)];
  select(first.id);
});

// ---------- contact ----------

initContact(document.querySelector('[data-contact-form]'));
