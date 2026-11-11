// MapLibre with its stylesheet, as one lazy module (P5 S5b): loaded only when the reader opens the
// map (src/lib/location/maplibre.ts), so neither the library nor its CSS reaches the page before.
// The stylesheet comes as text (?inline) and goes into the document on first load: a plain CSS import
// is hoisted by Astro into a <link> on the page, 10 KB on every first run (spec P5-0d).
import css from 'maplibre-gl/dist/maplibre-gl.css?inline';

if (typeof document !== 'undefined' && !document.querySelector('style[data-maplibre-css]')) {
  const style = document.createElement('style');
  style.dataset.maplibreCss = '';
  style.textContent = css;
  document.head.appendChild(style);
}

export { Map, setWorkerUrl } from 'maplibre-gl';
