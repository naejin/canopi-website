// The featured design, drawn as Canopi 2.0 draws plants and zones, on the page background.
// Data: /data/featured-designs.json (metres, x east, y south) and /data/plant-symbols.json (the
// app's 33 symbols as SVG paths in -1..1 units). The view opens on the whole plan and, once
// the section is in view, eases into the planted heart where the symbols are legible.
//
// One deliberate difference from the app: the app caps a plant symbol near 13 px, so its
// detailed artwork never shows at this density. Here a symbol grows with zoom, always staying
// within its spacing to the nearest plant, so zooming in reveals the full symbols.

const DETAIL_DIAMETER_PX = 16;      // the app's switch from compact to detailed artwork
const DOT_RADIUS_PX = 3.6;          // below this the app draws a plain dot
const SPACING_SHARE = 0.42;         // a symbol fills at most 42% of the distance to its neighbour
const MAX_RADIUS_PX = 18;
const MIN_RADIUS_PX = 1.1;
const HIT_SLOP_PX = 8;
const MIN_PPM = 4;
const MAX_PPM = 170;
const INTRO_DELAY_MS = 500;
const INTRO_MS = 1600;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function luminance(hex) {
  const channels = hex.replace('#', '').match(/../g).map((v) => parseInt(v, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function createDesignCanvas({ stage, canvas, tooltip, hint, lang }) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let symbols = null;
  let design = null;
  let grid = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  const view = { x: 0, y: 0, ppm: 20 };
  let hovered = -1;
  let frameRequested = false;
  let animation = null;
  let introPending = false;
  let theme = {};

  // ---------- data ----------

  function buildSymbols(json) {
    const out = {};
    for (const [id, art] of Object.entries(json.symbols)) {
      out[id] = {
        compact: { body: new Path2D(art.compact.body), cutouts: art.compact.cutouts ? new Path2D(art.compact.cutouts) : null },
        detailed: { body: new Path2D(art.detailed.body), cutouts: art.detailed.cutouts ? new Path2D(art.detailed.cutouts) : null },
      };
    }
    return out;
  }

  function buildGrid(plants) {
    const cells = new Map();
    plants.forEach(([x, y], index) => {
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(index);
    });
    return cells;
  }

  function median(values) {
    const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0.5;
  }

  // ---------- geometry ----------

  const toScreen = (x, y) => [(x - view.x) * view.ppm + width / 2, (y - view.y) * view.ppm + height / 2];
  const toWorld = (sx, sy) => [(sx - width / 2) / view.ppm + view.x, (sy - height / 2) / view.ppm + view.y];

  function radiusFor(plant) {
    const spacing = plant[3] ?? 1;
    return Math.max(MIN_RADIUS_PX, Math.min(MAX_RADIUS_PX, spacing * view.ppm * SPACING_SHARE));
  }

  function fitView() {
    const [x0, y0, x1, y1] = design.boundsM;
    const ppm = Math.min(width / ((x1 - x0) * 1.12), height / ((y1 - y0) * 1.12));
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, ppm: Math.max(MIN_PPM, ppm) };
  }

  // The planted heart: the spot with the most plants within 4 m, at the zoom where a typical
  // plant's symbol is about 5 px in radius (compact artwork legible, beds still readable).
  function detailView() {
    let best = design.plants[0];
    let bestCount = -1;
    for (let i = 0; i < design.plants.length; i += 3) {
      const [x, y] = design.plants[i];
      let count = 0;
      for (let gx = Math.floor(x) - 4; gx <= Math.floor(x) + 4; gx += 1) {
        for (let gy = Math.floor(y) - 4; gy <= Math.floor(y) + 4; gy += 1) {
          for (const j of grid.get(`${gx},${gy}`) ?? []) {
            const p = design.plants[j];
            if ((p[0] - x) ** 2 + (p[1] - y) ** 2 <= 16) count += 1;
          }
        }
      }
      if (count > bestCount) { bestCount = count; best = design.plants[i]; }
    }
    const ppm = Math.min(MAX_PPM, 5 / (SPACING_SHARE * design.medianSpacing));
    // Recentre on the plants inside that view so a planted edge does not leave the stage half empty.
    let [cx, cy] = best;
    const hw = width / 2 / ppm;
    const hh = height / 2 / ppm;
    for (let pass = 0; pass < 3; pass += 1) {
      let sx = 0; let sy = 0; let n = 0;
      for (const [x, y] of design.plants) {
        if (Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh) { sx += x; sy += y; n += 1; }
      }
      if (n) { cx = sx / n; cy = sy / n; }
    }
    return { x: cx, y: cy, ppm };
  }

  function clampView() {
    view.ppm = Math.min(MAX_PPM, Math.max(MIN_PPM, view.ppm));
    const [x0, y0, x1, y1] = design.boundsM;
    view.x = Math.min(x1, Math.max(x0, view.x));
    view.y = Math.min(y1, Math.max(y0, view.y));
  }

  // ---------- drawing ----------

  function readTheme() {
    const bg = css('--bg');
    theme = { bg, ink: css('--text'), zone: css('--text-muted') };
    if (!design) return;
    for (const species of design.species) {
      species.edge = contrast(species.color, bg) < 3 ? theme.ink : bg;
    }
  }

  function requestDraw() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => { frameRequested = false; draw(); });
  }

  function draw() {
    if (!design || !symbols || !width) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Zones: a quiet outline. With no imagery behind the plan, the app's cream stroke and dark
    // casing read as a double line, so the showcase keeps only a soft ink line.
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = theme.zone;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = Math.max(1, Math.min(1.75, view.ppm / 30));
    for (const zone of design.zones) {
      ctx.beginPath();
      zone.points.forEach(([x, y], i) => {
        const [sx, sy] = toScreen(x, y);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      });
      if (zone.closed) ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Plants: dots when small (batched by colour), symbols when large enough.
    const margin = MAX_RADIUS_PX + 2;
    const dotsByColour = new Map();
    const symbolPlants = [];
    design.plants.forEach((plant, index) => {
      const [sx, sy] = toScreen(plant[0], plant[1]);
      if (sx < -margin || sy < -margin || sx > width + margin || sy > height + margin) return;
      const radius = radiusFor(plant);
      if (radius < DOT_RADIUS_PX) {
        const colour = design.species[plant[2]].color;
        if (!dotsByColour.has(colour)) dotsByColour.set(colour, []);
        dotsByColour.get(colour).push(sx, sy, radius);
      } else {
        symbolPlants.push([index, sx, sy, radius]);
      }
    });
    for (const [colour, list] of dotsByColour) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (let i = 0; i < list.length; i += 3) {
        ctx.moveTo(list[i] + list[i + 2], list[i + 1]);
        ctx.arc(list[i], list[i + 1], list[i + 2], 0, Math.PI * 2);
      }
      ctx.fill();
    }
    for (const [index, sx, sy, radius] of symbolPlants) {
      const plant = design.plants[index];
      const species = design.species[plant[2]];
      const set = symbols[species.symbol] ?? symbols.round;
      const art = radius * 2 >= DETAIL_DIAMETER_PX ? set.detailed : set.compact;
      const halo = radius * 2 < 10 ? 0.5 : 0.7;
      ctx.setTransform(dpr * radius, 0, 0, dpr * radius, dpr * sx, dpr * sy);
      ctx.lineWidth = (halo * 2) / radius;
      ctx.strokeStyle = species.edge;
      ctx.stroke(art.body);
      ctx.fillStyle = species.color;
      ctx.fill(art.body);
      if (art.cutouts) { ctx.fillStyle = species.edge; ctx.fill(art.cutouts); }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The hover ring, as in the app: a pale casing under a translucent ochre stroke.
    if (hovered >= 0) {
      const plant = design.plants[hovered];
      const [sx, sy] = toScreen(plant[0], plant[1]);
      const ring = Math.max(8, radiusFor(plant) + 3);
      ctx.beginPath();
      ctx.arc(sx, sy, ring, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFF8EC';
      ctx.stroke();
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(156, 90, 22, 0.62)';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- view animation ----------

  function animateTo(target, duration = 600) {
    if (reducedMotion.matches || duration === 0) {
      Object.assign(view, target);
      clampView();
      requestDraw();
      return;
    }
    const from = { ...view };
    const started = performance.now();
    animation = { cancelled: false };
    const token = animation;
    const step = (now) => {
      if (token.cancelled) return;
      const t = Math.min(1, (now - started) / duration);
      const e = easeInOut(t);
      // Zoom moves in log space so it feels even.
      view.ppm = Math.exp(Math.log(from.ppm) + (Math.log(target.ppm) - Math.log(from.ppm)) * e);
      view.x = from.x + (target.x - from.x) * e;
      view.y = from.y + (target.y - from.y) * e;
      draw();
      if (t < 1) requestAnimationFrame(step);
      else animation = null;
    };
    requestAnimationFrame(step);
  }
  const stopAnimation = () => { if (animation) animation.cancelled = true; animation = null; introPending = false; };

  function zoomAt(factor, sx = width / 2, sy = height / 2, duration = 260) {
    const [wx, wy] = toWorld(sx, sy);
    const ppm = Math.min(MAX_PPM, Math.max(MIN_PPM, view.ppm * factor));
    // Keep the world point under (sx, sy) fixed.
    const x = wx - (sx - width / 2) / ppm;
    const y = wy - (sy - height / 2) / ppm;
    animateTo({ x, y, ppm }, duration);
  }

  // ---------- hover and tooltip ----------

  function plantAt(sx, sy) {
    const [wx, wy] = toWorld(sx, sy);
    const reach = Math.max(MAX_RADIUS_PX, HIT_SLOP_PX) / view.ppm;
    let best = -1;
    let bestDistance = Infinity;
    for (let gx = Math.floor(wx - reach); gx <= Math.floor(wx + reach); gx += 1) {
      for (let gy = Math.floor(wy - reach); gy <= Math.floor(wy + reach); gy += 1) {
        for (const index of grid.get(`${gx},${gy}`) ?? []) {
          const plant = design.plants[index];
          const distance = Math.hypot(plant[0] - wx, plant[1] - wy) * view.ppm;
          if (distance <= Math.max(radiusFor(plant), HIT_SLOP_PX) && distance < bestDistance) {
            best = index;
            bestDistance = distance;
          }
        }
      }
    }
    return best;
  }

  function showTooltip(index, sx, sy) {
    if (index < 0) { tooltip.hidden = true; return; }
    const species = design.species[design.plants[index][2]];
    const common = species.common?.[lang] ?? species.common?.en;
    tooltip.replaceChildren();
    if (common) {
      const line = document.createElement('span');
      line.className = 'common';
      line.textContent = common;
      tooltip.append(line);
    }
    const sci = document.createElement('span');
    sci.className = 'scientific';
    sci.textContent = species.scientific;
    tooltip.append(sci);
    tooltip.hidden = false;
    const box = tooltip.getBoundingClientRect();
    let left = sx + 12;
    let top = sy + 12;
    if (left + box.width > width - 4) left = sx - 12 - box.width;
    if (top + box.height > height - 4) top = sy - 12 - box.height;
    tooltip.style.transform = `translate(${Math.max(4, left)}px, ${Math.max(4, top)}px)`;
  }

  function setHovered(index, sx, sy) {
    if (index !== hovered) { hovered = index; requestDraw(); }
    showTooltip(index, sx, sy);
  }

  // ---------- input ----------

  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let hintGone = false;
  function dismissHint() {
    if (hintGone) return;
    hintGone = true;
    hint?.classList.add('is-gone');
  }

  const local = (event) => {
    const box = canvas.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };

  stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    stopAnimation();
    pointers.set(event.pointerId, local(event));
    if (event.pointerType === 'mouse' && event.button === 0) {
      const [sx, sy] = local(event);
      drag = { sx, sy, x: view.x, y: view.y, moved: false };
      stage.setPointerCapture(event.pointerId);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(a[0] - b[0], a[1] - b[1]), centre: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], view: { ...view } };
      setHovered(-1);
    }
  });

  stage.addEventListener('pointermove', (event) => {
    const [sx, sy] = local(event);
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, [sx, sy]);
    if (drag) {
      if (Math.hypot(sx - drag.sx, sy - drag.sy) > 3) { drag.moved = true; stage.classList.add('is-dragging'); dismissHint(); }
      view.x = drag.x - (sx - drag.sx) / view.ppm;
      view.y = drag.y - (sy - drag.sy) / view.ppm;
      clampView();
      setHovered(-1);
      requestDraw();
      return;
    }
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const centre = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const ppm = Math.min(MAX_PPM, Math.max(MIN_PPM, pinch.view.ppm * (distance / pinch.distance)));
      const wx = (pinch.centre[0] - width / 2) / pinch.view.ppm + pinch.view.x;
      const wy = (pinch.centre[1] - height / 2) / pinch.view.ppm + pinch.view.y;
      view.ppm = ppm;
      view.x = wx - (centre[0] - width / 2) / ppm;
      view.y = wy - (centre[1] - height / 2) / ppm;
      clampView();
      dismissHint();
      requestDraw();
      return;
    }
    if (event.pointerType === 'mouse') setHovered(plantAt(sx, sy), sx, sy);
  });

  const endPointer = (event) => {
    const [sx, sy] = local(event);
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag) {
      stage.classList.remove('is-dragging');
      drag = null;
    } else if (event.pointerType !== 'mouse' && event.type === 'pointerup' && pointers.size === 0) {
      // A tap names the plant under the finger.
      setHovered(plantAt(sx, sy), sx, sy);
    }
  };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse' && !drag) setHovered(-1); });

  // The page keeps the wheel; Ctrl or a trackpad pinch (which sends ctrlKey) zooms the plan.
  stage.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    stopAnimation();
    dismissHint();
    const [sx, sy] = local(event);
    zoomAt(Math.exp(-event.deltaY * 0.0022), sx, sy, 0);
  }, { passive: false });

  stage.addEventListener('dblclick', (event) => {
    const [sx, sy] = local(event);
    stopAnimation();
    dismissHint();
    zoomAt(2, sx, sy, 380);
  });

  for (const button of stage.querySelectorAll('[data-zoom]')) {
    button.addEventListener('click', () => {
      stopAnimation();
      dismissHint();
      const kind = button.dataset.zoom;
      if (kind === 'in') zoomAt(1.8);
      else if (kind === 'out') zoomAt(1 / 1.8);
      else animateTo(fitView(), 700);
    });
  }

  // ---------- size, theme, intro ----------

  function resize() {
    const box = stage.getBoundingClientRect();
    const keepFit = design && !width;
    width = box.width;
    height = box.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (keepFit) Object.assign(view, fitView());
    requestDraw();
  }
  new ResizeObserver(resize).observe(stage);

  // When the stage first comes into view, glide from the whole plan into its planted heart.
  const intro = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting) || !introPending) return;
    introPending = false;
    setTimeout(() => { if (design && !animation && !drag) animateTo(detailView(), INTRO_MS); }, INTRO_DELAY_MS);
  }, { threshold: 0.55 });
  intro.observe(stage);

  return {
    async load() {
      const [designs, symbolJson] = await Promise.all([
        fetch('/data/featured-designs.json').then((r) => r.json()),
        fetch('/data/plant-symbols.json').then((r) => r.json()),
      ]);
      symbols = buildSymbols(symbolJson);
      return designs;
    },
    show(next, { animate = true } = {}) {
      stopAnimation();
      design = next;
      design.medianSpacing ??= median(design.plants.map((p) => p[3]));
      grid = buildGrid(design.plants);
      hovered = -1;
      tooltip.hidden = true;
      readTheme();
      resize();
      Object.assign(view, fitView());
      draw();
      if (!animate) return;
      // On first show the intro waits for the section to be seen; later swaps glide at once.
      const box = stage.getBoundingClientRect();
      const visible = box.top < innerHeight * 0.75 && box.bottom > innerHeight * 0.25;
      if (visible) setTimeout(() => animateTo(detailView(), INTRO_MS), 350);
      else introPending = true;
    },
    refreshTheme() { readTheme(); requestDraw(); },
  };
}
