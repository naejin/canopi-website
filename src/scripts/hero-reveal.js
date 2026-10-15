// The hero painting, revealed by the cursor. A canvas in the page colour covers the painting;
// moving the pointer drops "ink dots" along its path, each carving a soft, irregular hole that
// grows and closes again within about a second and a half, like a brushstroke drying back into paper.
// The loop runs only while dots are alive, so a resting pointer costs nothing.
// Touch never paints while a finger drags, since that drag scrolls the page: the painting rests
// faint, the welcome stroke still plays and a tap on the hero (not on its links or buttons)
// blooms a reveal there. Reduced motion gets the painting faint and still. Which painting
// shows (locale, day or night, size) is decided by CSS from the hero's variables.

const STEP_PX = 12;            // distance between dots along the pointer path
const MAX_DOTS = 400;
const LIFETIME_MS = 1400;
const START_RADIUS = 8;
const END_RADIUS = 180;        // each dot's final radius varies between ~55% and 100% of this
const SIZE_VARIATION = 0.45;
const TAP_DOTS = 7;            // a tap blooms a small cluster, about 200 px across
const TAP_SPREAD = 46;

export function initHeroReveal() {
  const hero = document.querySelector('.hero');
  const painting = hero.querySelector('.hero-painting');
  const canvas = hero.querySelector('.hero-mask');
  const ctx = canvas.getContext('2d');
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
    paintMask();
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
    const gradient = ctx.createRadialGradient(dot.x, dot.y, radius * 0.2, dot.x, dot.y, radius);
    gradient.addColorStop(0, `rgba(0,0,0,${0.95 * alpha})`);
    gradient.addColorStop(0.55, `rgba(0,0,0,${0.85 * alpha})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i <= 36; i += 1) {
      const angle = (i / 36) * Math.PI * 2;
      const wobble = 0.78 + 0.13 * Math.sin(angle * 3 + dot.phase) + 0.08 * Math.sin(angle * 7 + dot.phase * 2.3) + 0.04 * Math.sin(angle * 13 + dot.phase * 0.6);
      const x = dot.x + Math.cos(angle) * radius * wobble;
      const y = dot.y + Math.sin(angle) * radius * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function frame() {
    const now = performance.now();
    paintMask();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = dots.length - 1; i >= 0; i -= 1) {
      const t = (now - dots[i].born) / LIFETIME_MS;
      if (t >= 1) { dots.splice(i, 1); continue; }
      const grow = 1 - (1 - t) ** 3;
      carve(dots[i], START_RADIUS + (dots[i].radius - START_RADIUS) * grow, 1 - t * t);
    }
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
  refresh();
  setTimeout(welcomeStroke, 700);
  return { refresh };
}
