// Featured designs on the app's basemap (OpenFreeMap Liberty). Pins are approximate on
// purpose (rounded to ~10 km) and the zoom stops at regional scale. MapLibre loads only when
// the section approaches the viewport; the list beside the map works without it.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAX_ZOOM = 9;
const VENDOR = `/vendor/maplibre-gl-${MAPLIBRE_VERSION}`;

function loadStyles() {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${VENDOR}/maplibre-gl.css`;
    link.onload = link.onerror = resolve;
    document.head.append(link);
  });
}

export function createPlacesMap({ container, list, onSelect, lang, placeName, text }) {
  let map = null;
  let designs = [];
  let activeId = null;
  const pins = new Map();
  const items = new Map();

  function setActive(id) {
    activeId = id;
    for (const [key, pin] of pins) pin.setAttribute('aria-pressed', String(key === id));
    for (const [key, button] of items) button.setAttribute('aria-pressed', String(key === id));
  }

  function renderList() {
    list.replaceChildren();
    for (const design of designs) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'place-button';
      button.setAttribute('aria-pressed', 'false');
      const name = document.createElement('span');
      name.className = 'place-name';
      name.textContent = design.name;
      const meta = document.createElement('span');
      meta.className = 'place-meta';
      meta.textContent = text('places.meta', { place: placeName(design, lang), designer: design.designer });
      button.append(name, meta);
      button.addEventListener('click', () => onSelect(design.id, { from: 'list' }));
      li.append(button);
      list.append(li);
      items.set(design.id, button);
    }
  }

  function fit(animate) {
    const lons = designs.map((d) => d.pin.lon);
    const lats = designs.map((d) => d.pin.lat);
    const bounds = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
    const narrow = container.clientWidth < 520;
    const padding = narrow ? { top: 50, bottom: 50, left: 40, right: 40 } : { top: 80, bottom: 80, left: 90, right: 200 };
    map.fitBounds(bounds, { padding, maxZoom: 5.2, duration: animate ? 800 : 0 });
  }

  async function mount() {
    // MapLibre and its stylesheet load with the map, not with the page, from the package's own
    // modules (scripts/copy-maplibre.mjs) so the page and the worker share one chunk.
    const [maplibregl] = await Promise.all([import(/* @vite-ignore */ `${VENDOR}/maplibre-gl.mjs`), loadStyles()]);
    maplibregl.setWorkerUrl(`${VENDOR}/maplibre-gl-worker.mjs`);
    map = new maplibregl.Map({
      container,
      style: STYLE_URL,
      center: [designs[0].pin.lon, designs[0].pin.lat],
      zoom: 5,
      maxZoom: MAX_ZOOM,
      cooperativeGestures: true,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    for (const design of designs) {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'pin';
      pin.setAttribute('aria-label', `${design.name}, ${placeName(design, lang)}`);
      pin.setAttribute('aria-pressed', String(design.id === activeId));
      const label = document.createElement('span');
      label.className = 'pin-label';
      label.textContent = design.name;
      pin.append(label);
      pin.addEventListener('click', (event) => { event.stopPropagation(); onSelect(design.id, { from: 'map' }); });
      new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat([design.pin.lon, design.pin.lat]).addTo(map);
      pins.set(design.id, pin);
    }
    map.once('load', () => fit(false));
    fit(false);
  }

  return {
    setDesigns(next) {
      designs = next;
      renderList();
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        mount().catch((error) => {
          console.warn('Map unavailable', error);
          container.textContent = text('places.unavailable');
          container.classList.add('is-unavailable');
        });
      }, { rootMargin: '400px 0px' });
      observer.observe(container);
    },
    setActive,
  };
}
