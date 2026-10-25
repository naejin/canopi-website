// Field Guides: every <Item> inside a <Checklist id="…"> gets list="<checklist id>", so the item's
// checkbox id (guide-check-<slug>-<list>-<item>) stays unique on the page even when two lists reuse
// an item id. Checklist ids are unique in a guide, item ids in their list (the ticks are stored per
// list). Runs on the MDX hast, before the MDX compiler, like rehype-guide-terms.

const isElement = (node, name) => (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === name;
const idOf = (node) => node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === 'id')?.value;

export function rehypeGuideChecklists() {
  return (tree, file) => {
    if (!String(file?.path ?? '').includes('/content/guides/')) return;
    const lists = new Set();
    const visit = (node, list) => {
      if (isElement(node, 'Checklist')) {
        const id = idOf(node);
        if (typeof id !== 'string') throw new Error(`${file.path}: <Checklist> needs id="…" as a plain string`);
        if (lists.has(id)) throw new Error(`${file.path}: checklist id "${id}" is used twice`);
        lists.add(id);
        list = { id, items: new Set() };
      } else if (isElement(node, 'Item')) {
        const id = idOf(node);
        if (!list) throw new Error(`${file.path}: <Item id="${id}"> is outside a <Checklist>`);
        if (typeof id !== 'string') throw new Error(`${file.path}: <Item> needs id="…" as a plain string`);
        if (list.items.has(id)) throw new Error(`${file.path}: item id "${id}" is used twice in checklist "${list.id}"`);
        list.items.add(id);
        node.attributes.push({ type: 'mdxJsxAttribute', name: 'list', value: list.id });
      }
      for (const child of node.children ?? []) visit(child, list);
    };
    visit(tree, null);
  };
}
