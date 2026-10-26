// The reader's climate zone (knowledge/decisions/climate-ux.md): chosen in the climate dialog, kept in
// localStorage as "canopi-climate" and on <html data-climate> (Base.astro sets it before the first
// paint), and the same on every page. A choice reorders and marks; it never hides. Badges of the
// reader's zone are filled in by CSS; in each run of guide blocks for different climates, the reader's
// block comes first and opens, and the others close but stay on the page. When no block of a run is
// for the reader's zone, a note says so and every block stays open.
import { openDialog } from './dialogs.js';
import { isClimate } from '../data/climates.ts';

const root = document.documentElement;
const key = 'canopi-climate';

// Each run of adjacent guide blocks, in the order the guide wrote them, and the node that follows it.
const runs = [];
for (const block of document.querySelectorAll('[data-climate-block]')) {
  const previous = block.previousElementSibling;
  if (previous?.matches('[data-climate-block]')) runs.at(-1).blocks.push(block);
  else runs.push({ blocks: [block] });
}
for (const run of runs) run.after = run.blocks.at(-1).nextSibling;

const zonesOf = (block) => block.dataset.zones.split(' ');

function arrange(zone, label) {
  for (const note of document.querySelectorAll('[data-climate-note]')) note.remove();
  for (const { blocks, after } of runs) {
    const parent = blocks[0].parentNode;
    const yours = zone ? blocks.filter((block) => zonesOf(block).includes(zone)) : [];
    for (const block of [...yours, ...blocks.filter((block) => !yours.includes(block))]) parent.insertBefore(block, after);
    for (const block of blocks) {
      block.open = !yours.length || yours.includes(block);
      block.toggleAttribute('data-yours', yours.includes(block));
    }
    if (zone && !yours.length && label) {
      const note = document.createElement('p');
      note.className = 'guide-climate-missing';
      note.dataset.climateNote = '';
      note.textContent = blocks[0].dataset.missing.replace('{zone}', label.toLocaleLowerCase(root.lang));
      parent.insertBefore(note, blocks[0]);
    }
  }
}

function apply(zone) {
  if (zone) root.dataset.climate = zone;
  else delete root.dataset.climate;
  const choices = [...document.querySelectorAll('[data-climate-choice]')];
  for (const choice of choices) choice.setAttribute('aria-pressed', String(choice.dataset.climateChoice === zone));
  const label = choices.find((choice) => zone && choice.dataset.climateChoice === zone)?.querySelector('strong').textContent;
  for (const current of document.querySelectorAll('[data-climate-current]')) current.textContent = label ?? current.dataset.notSet;
  arrange(zone, label);
}

export function initClimate() {
  const picker = document.querySelector('[data-climate-picker]');
  const dialog = document.querySelector('[data-climate-dialog]');
  if (picker && dialog) {
    picker.hidden = false;
    picker.querySelector('[data-open-climate]').addEventListener('click', (event) => openDialog(dialog, event.currentTarget));
    dialog.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-climate-choice]');
      if (!choice) return;
      const zone = choice.dataset.climateChoice;
      try {
        if (zone) localStorage.setItem(key, zone);
        else localStorage.removeItem(key);
      } catch {}
      apply(zone);
      dialog.close();
    });
  }
  // Another tab changed the climate.
  addEventListener('storage', (event) => {
    if (event.key === key) apply(event.newValue && isClimate(event.newValue) ? event.newValue : '');
  });
  // A printed guide carries every climate's blocks.
  addEventListener('beforeprint', () => { for (const { blocks } of runs) for (const block of blocks) block.open = true; });
  addEventListener('afterprint', () => apply(root.dataset.climate ?? ''));
  apply(root.dataset.climate ?? '');
}
