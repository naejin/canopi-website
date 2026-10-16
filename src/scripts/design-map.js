// The design finder's map and list. Designs sit on the app's basemap (OpenFreeMap Liberty,
// recoloured on the page's paper) and group into clusters, so the same map serves two designs or
// hundreds; choosing a cluster zooms into it. The list beside the map shows the designs nearest
// the map centre, or nearest the visitor once they ask for their location, a page at a time. Pins are approximate on purpose
// (rounded to ~10 km) and the zoom stops at regional scale. The visitor's location is asked for
// only when they press the button, stays in this page's memory and is never stored or sent.
// MapLibre loads only when the section approaches the viewport; the list works without it.

import { distanceKm, nearestFirst } from '../lib/nearest.mjs';
import { isDark } from './chrome.js';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAX_ZOOM = 9;
const PAGE = matchMedia('(max-width: 639px)').matches ? 4 : 6;
const VENDOR = `/vendor/maplibre-gl-${MAPLIBRE_VERSION}`;
// Liberty recoloured as a survey map on the page's paper, by day and by night: land on paper,
// water in ink grey, only major roads as hairlines, no points of interest. false keeps Liberty as is.
const PAPER_MAP = true;
const PAPER = {
  light: {
    land: '#EFE9DD', grass: '#E9E3D3', wood: '#E3DCC8', urban: '#E7E0D1', water: '#CBD3D0', river: '#B7C3C0',
    road: '#DCD1BD', major: '#D0C3A9', boundary: '#A39784', label: '#4A4237', minor: '#6E6455', waterLabel: '#5E6D6A',
  },
  dark: {
    land: '#1C1A15', grass: '#1F1D17', wood: '#23211A', urban: '#24221C', water: '#12181A', river: '#1D2628',
    road: '#2F2C25', major: '#3A362D', boundary: '#6E6659', label: '#D6CEBF', minor: '#A79E8F', waterLabel: '#8C9B99',
  },
};
// Layers a quiet regional map does without.
const HIDDEN = /natural_earth|park_outline|wetland|landuse_(pitch|track|cemetery|hospital|school)|aeroway|casing|path|rail|service|minor|street|pattern|one_way|tunnel|building|poi_|highway-|shield|airport/;

function paintPaper(map) {
  const c = PAPER[isDark() ? 'dark' : 'light'];
  const set = (id, property, value) => { try { map.setPaintProperty(id, property, value); } catch {} };
  for (const { id, type } of map.getStyle().layers) {
    if (id === 'designs') continue;
    if (HIDDEN.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
    if (id === 'background') set(id, 'background-color', c.land);
    else if (id === 'park') { set(id, 'fill-color', c.grass); set(id, 'fill-outline-color', c.grass); }
    else if (id === 'landcover_wood') set(id, 'fill-color', c.wood);
    else if (id.startsWith('landcover_') || id === 'landuse_residential') set(id, 'fill-color', id === 'landuse_residential' ? c.urban : c.grass);
    else if (id === 'water') set(id, 'fill-color', c.water);
    else if (id.startsWith('waterway') && type === 'line') set(id, 'line-color', c.river);
    else if (id.startsWith('boundary')) set(id, 'line-color', c.boundary);
    else if (type === 'line') set(id, 'line-color', /motorway|trunk/.test(id) ? c.major : c.road);
    else if (type === 'symbol') {
      const water = id.startsWith('water');
      set(id, 'text-color', water ? c.waterLabel : /village|other|state/.test(id) ? c.minor : c.label);
      set(id, 'text-halo-color', c.land);
      set(id, 'text-halo-width', 1.4);
      set(id, 'text-halo-blur', 0);
    }
  }
}

// The map's credits fold behind a small "i"; a click unfolds them.
function creditsControl(note, label) {
  const element = document.createElement('div');
  element.className = 'maplibregl-ctrl map-credits';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'map-credits-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', label);
  toggle.textContent = 'i';
  const panel = document.createElement('p');
  panel.className = 'map-credits-text';
  panel.id = 'map-credits-text';
  panel.hidden = true;
  toggle.setAttribute('aria-controls', panel.id);
  const link = (href, name) => Object.assign(document.createElement('a'), { href, textContent: name, target: '_blank', rel: 'noopener' });
  panel.append(`${note} © `, link('https://www.openstreetmap.org/copyright', 'OpenStreetMap'), ' · ',
    link('https://openmaptiles.org/', 'OpenMapTiles'), ' · ', link('https://openfreemap.org/', 'OpenFreeMap'));
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
  element.append(panel, toggle);
  return { onAdd: () => element, onRemove: () => element.remove() };
}

function loadStyles() {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${VENDOR}/maplibre-gl.css`;
    link.onload = link.onerror = resolve;
    document.head.append(link);
  });
}

export function createDesignFinder({ container, list, more, hint, locate, status, onSelect, lang, placeName, text }) {
  let map = null;
  let maplibre = null;
  let styled = false;             // the paper colours are applied, so theme changes repaint them
  let designs = [];
  let activeId = null;
  let centre = null;              // the map centre, once the map is up
  let visitor = null;             // the visitor's location, once they share it
  let shown = PAGE;
  const markers = new Map();
  const kilometres = new Intl.NumberFormat(lang, { style: 'unit', unit: 'kilometer', maximumFractionDigits: 0 });

  function setActive(id) {
    activeId = id;
    for (const button of container.querySelectorAll('.pin')) button.setAttribute('aria-pressed', String(button.dataset.id === id));
    for (const button of list.querySelectorAll('.place-button')) button.setAttribute('aria-pressed', String(button.dataset.id === id));
  }

  function renderList() {
    const ordered = nearestFirst(designs, visitor ?? centre);
    const focused = list.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    list.replaceChildren(...ordered.slice(0, shown).map((design) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'place-button';
      button.dataset.id = design.id;
      button.setAttribute('aria-pressed', String(design.id === activeId));
      const name = document.createElement('span');
      name.className = 'place-name';
      name.textContent = design.name;
      const meta = document.createElement('span');
      meta.className = 'place-meta';
      meta.textContent = text('finder.meta', { place: placeName(design), designer: design.designer });
      button.append(name, meta);
      if (visitor) {
        const distance = document.createElement('span');
        distance.className = 'place-distance';
        distance.textContent = kilometres.format(Math.max(1, distanceKm(visitor, design.pin)));
        button.append(distance);
      }
      button.addEventListener('click', () => {
        onSelect(design.id, { from: 'list' });
        map?.easeTo({ center: [design.pin.lon, design.pin.lat], zoom: Math.max(map.getZoom(), 6) });
      });
      li.append(button);
      return li;
    }));
    if (focused) list.querySelector(`[data-id="${CSS.escape(focused)}"]`)?.focus();
    more.hidden = ordered.length <= shown;
  }

  function fitAll(animate) {
    const lons = designs.map((d) => d.pin.lon);
    const lats = designs.map((d) => d.pin.lat);
    // Pin labels sit right of their pins, so the right edge keeps room for one.
    const right = Math.min(170, container.clientWidth * 0.4);
    map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: { top: 60, bottom: 60, left: 60, right }, maxZoom: 5.2, duration: animate ? 800 : 0 });
  }

  function dismissHint() { hint.classList.add('is-gone'); }

  function pinFor(feature) {
    const design = designs.find((d) => d.id === feature.properties.id);
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pin';
    pin.dataset.id = design.id;
    pin.setAttribute('aria-label', `${design.name}, ${placeName(design)}`);
    pin.setAttribute('aria-pressed', String(design.id === activeId));
    const label = document.createElement('span');
    label.className = 'pin-label';
    label.textContent = design.name;
    pin.append(label);
    pin.addEventListener('click', (event) => { event.stopPropagation(); dismissHint(); onSelect(design.id, { from: 'map' }); });
    return pin;
  }

  function clusterFor(feature) {
    const count = feature.properties.point_count;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cluster';
    button.style.setProperty('--size', `${Math.min(56, 30 + Math.log2(count) * 5)}px`);
    button.textContent = new Intl.NumberFormat(lang).format(count);
    button.setAttribute('aria-label', text('finder.cluster', { count }));
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      dismissHint();
      const zoom = await map.getSource('designs').getClusterExpansionZoom(feature.properties.cluster_id);
      map.easeTo({ center: feature.geometry.coordinates, zoom: Math.min(zoom, MAX_ZOOM) });
    });
    return button;
  }

  // Clusters and pins are HTML buttons, so they take focus and keyboard like the list does.
  function updateMarkers() {
    if (!map.isSourceLoaded('designs')) return;
    const seen = new Set();
    for (const feature of map.querySourceFeatures('designs')) {
      const clustered = feature.properties.cluster;
      const key = clustered ? `cluster-${feature.properties.cluster_id}` : feature.properties.id;
      if (seen.has(key)) continue;
      seen.add(key);
      if (markers.has(key)) continue;
      const element = clustered ? clusterFor(feature) : pinFor(feature);
      markers.set(key, new maplibre.Marker({ element, anchor: 'center' }).setLngLat(feature.geometry.coordinates).addTo(map));
    }
    for (const [key, marker] of markers) {
      if (!seen.has(key)) { marker.remove(); markers.delete(key); }
    }
  }

  async function mount() {
    // MapLibre and its stylesheet load with the map, not with the page, from the package's own
    // modules (scripts/copy-maplibre.mjs) so the page and the worker share one chunk.
    const [module] = await Promise.all([import(/* @vite-ignore */ `${VENDOR}/maplibre-gl.mjs`), loadStyles()]);
    maplibre = module;
    maplibre.setWorkerUrl(`${VENDOR}/maplibre-gl-worker.mjs`);
    map = new maplibre.Map({
      container,
      style: STYLE_URL,
      center: [designs[0].pin.lon, designs[0].pin.lat],
      zoom: 5,
      maxZoom: MAX_ZOOM,
      cooperativeGestures: true,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(creditsControl(text('finder.note'), text('finder.credits')), 'bottom-right');
    // Recoloured as soon as the style is in, before its first tiles draw, so Liberty never flashes.
    map.once('style.load', () => {
      styled = PAPER_MAP;
      if (styled) paintPaper(map);
    });
    map.once('load', () => {
      map.addSource('designs', {
        type: 'geojson',
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: MAX_ZOOM - 1,
        data: {
          type: 'FeatureCollection',
          features: designs.map((d) => ({ type: 'Feature', properties: { id: d.id }, geometry: { type: 'Point', coordinates: [d.pin.lon, d.pin.lat] } })),
        },
      });
      // MapLibre loads a source's tiles only for its layers; this invisible one lets the HTML
      // markers read the clusters.
      map.addLayer({ id: 'designs', type: 'circle', source: 'designs', paint: { 'circle-radius': 0, 'circle-opacity': 0 } });
      map.on('render', updateMarkers);
      fitAll(false);
    });
    map.on('dragstart', dismissHint);
    map.on('moveend', () => {
      const { lng, lat } = map.getCenter();
      centre = { lon: lng, lat };
      if (!visitor) { shown = PAGE; renderList(); }
    });
    fitAll(false);
  }

  function showVisitor() {
    const nearest = nearestFirst(designs, visitor)[0];
    status.textContent = text('finder.located', { name: nearest.name, distance: kilometres.format(Math.max(1, distanceKm(visitor, nearest.pin))) });
    shown = PAGE;
    renderList();
    onSelect(nearest.id, { from: 'locate' });
    if (!map) return;
    const here = document.createElement('span');
    here.className = 'visitor-dot';
    new maplibre.Marker({ element: here }).setLngLat([visitor.lon, visitor.lat]).addTo(map);
    map.fitBounds([[Math.min(visitor.lon, nearest.pin.lon), Math.min(visitor.lat, nearest.pin.lat)], [Math.max(visitor.lon, nearest.pin.lon), Math.max(visitor.lat, nearest.pin.lat)]],
      { padding: 70, maxZoom: 7, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900 });
  }

  if (!('geolocation' in navigator)) locate.hidden = true;
  locate.addEventListener('click', () => {
    locate.disabled = true;
    status.textContent = text('finder.locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { locate.disabled = false; visitor = { lon: coords.longitude, lat: coords.latitude }; dismissHint(); showVisitor(); },
      () => { locate.disabled = false; status.textContent = text('finder.locateFailed'); },
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 15000 },
    );
  });
  more.addEventListener('click', () => { shown += PAGE; renderList(); });

  return {
    setDesigns(next) {
      designs = next;
      renderList();
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        mount().catch((error) => {
          console.warn('Map unavailable', error);
          container.replaceChildren(text('finder.unavailable'));
          container.classList.add('is-unavailable');
        });
      }, { rootMargin: '400px 0px' });
      observer.observe(container);
    },
    setActive,
    // isStyleLoaded() stays false while tiles load, so the load handler's flag decides.
    refreshTheme() { if (styled) paintPaper(map); },
  };
}
