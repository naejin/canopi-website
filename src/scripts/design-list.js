// The list under the featured design: one button per design, a page at a time.

const PAGE = matchMedia('(max-width: 639px)').matches ? 4 : 6;

export function createDesignList({ list, more, onSelect, placeName, text }) {
  let designs = [];
  let activeId = null;
  let shown = PAGE;

  function render() {
    const focused = list.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    list.replaceChildren(...designs.slice(0, shown).map((design) => {
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
      meta.textContent = text('design.choiceMeta', { place: placeName(design), designer: design.designer });
      button.append(name, meta);
      button.addEventListener('click', () => onSelect(design.id, { from: 'list' }));
      li.append(button);
      return li;
    }));
    if (focused) list.querySelector(`[data-id="${CSS.escape(focused)}"]`)?.focus();
    more.hidden = designs.length <= shown;
  }

  more.addEventListener('click', () => { shown += PAGE; render(); });

  return {
    setDesigns(next) { designs = next; render(); },
    setActive(id) {
      activeId = id;
      for (const button of list.querySelectorAll('.place-button')) button.setAttribute('aria-pressed', String(button.dataset.id === id));
    },
  };
}
