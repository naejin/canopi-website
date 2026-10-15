// The hero painting, revealed by the cursor. A canvas in the page colour covers the painting;
// moving the pointer drops "ink dots" along its path, each carving a soft, irregular hole that
// grows and closes again within about a second and a half, like a brushstroke drying back into paper.
// The loop runs only while dots are alive, so a resting pointer costs nothing.
// Touch never paints while a finger drags, since that drag scrolls the page: the painting rests
// faint, the welcome stroke still plays and a tap on the hero (not on its links or buttons)
// blooms a reveal there. Behind the title, tagline and buttons every reveal opens only half
// way, so the text stays readable over the boldest painting. Reduced motion gets the painting
// faint and still. Which painting
// shows (locale, day or night, size) is decided by CSS from the hero's variables.

const STEP_PX = 12;            // distance between dots along the pointer path
const MAX_DOTS = 400;
const LIFETIME_MS = 1400;
const START_RADIUS = 8;
const END_RADIUS = 180;        // each dot's final radius varies between ~55% and 100% of this
const SIZE_VARIATION = 0.45;
const TAP_DOTS = 7;            // a tap blooms a small cluster, about 200 px across
const TAP_SPREAD = 46;
const TEXT_REVEAL = 0.5;       // how far a reveal opens behind the hero's text
const TEXT_FEATHER = 28;       // soft edge, in px, around the text block

export function initHeroReveal() {
  const hero = document.querySelector('.hero');
  const painting = hero.querySelector('.hero-painting');
  const canvas = hero.querySelector('.hero-mask');
  const ctx = canvas.getContext('2d');
  // Brush marks are drawn into `holes`, scaled down behind the text by `weight`, then cut
  // out of the mask, so the resting mask (faint on touch) is never darkened.
  const holes = document.createElement('canvas');
  const hctx = holes.getContext('2d');
  const weight = document.createElement('canvas');
  const text = hero.querySelectorAll('.hero-title, .hero-tagline, .hero-actions, .hero-meta');
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let width = 0;
  let height = 0;
  let maskColour = '#EFE9DD';
  let last = null;
  let running = false;
  const dots = [];

  let restingOpacity = 0.22;      // how much painting shows through on touch, from the theme
  const isStatic = () => reducedMotion.matches;
  const isTouch = () => !canHover.matches;

  function paintMask() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = isTouch() ? 1 - restingOpacity : 1;
    ctx.fillStyle = maskColour;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  function resize() {
    hero.classList.toggle('is-static', isStatic());
    if (isStatic()) return;
    const box = hero.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = box.width;
    height = box.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    holes.width = weight.width = canvas.width;
    holes.height = weight.height = canvas.height;
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintWeight(box, dpr);
    paintMask();
  }

  // Full strength everywhere except a feathered block behind the text, at TEXT_REVEAL.
  function paintWeight(box, dpr) {
    const w = weight.getContext('2d');
    w.setTransform(dpr, 0, 0, dpr, 0, 0);
    w.globalCompositeOperation = 'source-over';
    w.fillStyle = '#000';
    w.fillRect(0, 0, width, height);
    const rects = [...text].filter((el) => el.offsetParent).map((el) => el.getBoundingClientRect());
    if (!rects.length) return;
    const left = Math.min(...rects.map((r) => r.left)) - box.left - 12;
    const top = Math.min(...rects.map((r) => r.top)) - box.top - 8;
    const right = Math.max(...rects.map((r) => r.right)) - box.left + 12;
    const bottom = Math.max(...rects.map((r) => r.bottom)) - box.top + 8;
    // The block is drawn far off canvas and only its blurred shadow lands here: a soft edge in
    // every browser, without canvas filters.
    const away = width + height + 4 * TEXT_FEATHER;
    w.globalCompositeOperation = 'destination-out';
    w.shadowColor = `rgba(0,0,0,${1 - TEXT_REVEAL})`;
    w.shadowBlur = TEXT_FEATHER * dpr;
    w.shadowOffsetX = away * dpr;
    w.fillRect(left - away, top, right - left, bottom - top);
    w.shadowColor = 'transparent';
  }

  function addDot(x, y) {
    if (dots.length >= MAX_DOTS) dots.shift();
    dots.push({
      x, y,
      born: performance.now(),
      phase: Math.random() * Math.PI * 2,
      radius: END_RADIUS * (1 - SIZE_VARIATION + Math.random() * SIZE_VARIATION),
    });
  }

  function addDotsTo(x, y) {
    if (!last) addDot(x, y);
    else {
      const dx = x - last.x;
      const dy = y - last.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / STEP_PX));
      for (let i = 1; i <= steps; i += 1) addDot(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
    }
    last = { x, y };
  }

  // One brush mark: a soft radial hole inside an outline whose radius wobbles with three sines.
  function carve(dot, radius, alpha) {
    const gradient = hctx.createRadialGradient(dot.x, dot.y, radius * 0.2, dot.x, dot.y, radius);
    gradient.addColorStop(0, `rgba(0,0,0,${0.95 * alpha})`);
    gradient.addColorStop(0.55, `rgba(0,0,0,${0.85 * alpha})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    hctx.fillStyle = gradient;
    hctx.beginPath();
    for (let i = 0; i <= 36; i += 1) {
      const angle = (i / 36) * Math.PI * 2;
      const wobble = 0.78 + 0.13 * Math.sin(angle * 3 + dot.phase) + 0.08 * Math.sin(angle * 7 + dot.phase * 2.3) + 0.04 * Math.sin(angle * 13 + dot.phase * 0.6);
      const x = dot.x + Math.cos(angle) * radius * wobble;
      const y = dot.y + Math.sin(angle) * radius * wobble;
      if (i === 0) hctx.moveTo(x, y);
      else hctx.lineTo(x, y);
    }
    hctx.closePath();
    hctx.fill();
  }

  function frame() {
    const now = performance.now();
    hctx.globalCompositeOperation = 'source-over';
    hctx.clearRect(0, 0, width, height);
    for (let i = dots.length - 1; i >= 0; i -= 1) {
      const t = (now - dots[i].born) / LIFETIME_MS;
      if (t >= 1) { dots.splice(i, 1); continue; }
      const grow = 1 - (1 - t) ** 3;
      carve(dots[i], START_RADIUS + (dots[i].radius - START_RADIUS) * grow, 1 - t * t);
    }
    hctx.globalCompositeOperation = 'destination-in';
    hctx.setTransform(1, 0, 0, 1, 0, 0);
    hctx.drawImage(weight, 0, 0);
    hctx.setTransform(ctx.getTransform());
    paintMask();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(holes, 0, 0);
    ctx.setTransform(hctx.getTransform());
    if (dots.length) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function pointer(event) {
    if (isStatic() || isTouch()) return;
    const box = hero.getBoundingClientRect();
    addDotsTo(event.clientX - box.left, event.clientY - box.top);
    start();
  }

  hero.addEventListener('pointerenter', (event) => { last = null; pointer(event); });
  hero.addEventListener('pointermove', pointer);
  hero.addEventListener('pointerleave', () => { last = null; });
  hero.addEventListener('click', (event) => {
    if (isStatic() || !isTouch() || event.target.closest('a, button, input, select, textarea, summary, [role="button"]')) return;
    const box = hero.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    for (let i = 0; i < TAP_DOTS; i += 1) {
      const angle = (i / TAP_DOTS) * Math.PI * 2 + Math.random();
      const distance = i === 0 ? 0 : TAP_SPREAD * (0.5 + Math.random() * 0.5);
      last = null;
      addDotsTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
    }
    last = null;
    start();
  });
  new ResizeObserver(resize).observe(hero);
  canHover.addEventListener('change', resize);
  reducedMotion.addEventListener('change', resize);

  // Called when the theme changes.
  function refresh() {
    const styles = getComputedStyle(document.documentElement);
    maskColour = styles.getPropertyValue('--bg').trim() || maskColour;
    restingOpacity = Number.parseFloat(styles.getPropertyValue('--painting-opacity-static')) || restingOpacity;
    if (!isStatic()) paintMask();
  }

  // One slow welcome stroke under the title shows that the painting is there to be found.
  // It is skipped if the visitor's pointer gets there first.
  let touched = false;
  hero.addEventListener('pointermove', () => { touched = true; }, { once: true });
  function welcomeStroke() {
    if (isStatic() || touched || scrollY > height / 2) return;
    const started = performance.now();
    const duration = 1500;
    last = null;
    const step = (now) => {
      if (touched) { last = null; return; }
      const t = Math.min(1, (now - started) / duration);
      const e = 1 - (1 - t) ** 2;
      const x = width * (0.22 + 0.56 * e);
      const y = height * (0.5 - 0.1 * Math.sin(e * Math.PI));
      addDotsTo(x, y);
      start();
      if (t < 1) requestAnimationFrame(step);
      else last = null;
    };
    requestAnimationFrame(step);
  }

  resize();
  document.fonts?.ready.then(resize);
  refresh();
  setTimeout(welcomeStroke, 700);
  return { refresh };
}
