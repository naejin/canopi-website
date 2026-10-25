// Field Guides: the first <Term id="…"> of each id in a guide gets its glossary note, placed as a
// <TermNote id="…"> just before the top-level block that holds the term. At ≥960px the note floats
// into the margin level with that block; below, it sits in the reading flow (guides.css).
// Later uses of the same id render as plain words. Runs on the MDX hast, before the MDX compiler.

const isTerm = (node) => (node.type === 'mdxJsxTextElement' || node.type === 'mdxJsxFlowElement') && node.name === 'Term';
const idOf = (node) => node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === 'id')?.value;

function walk(node, visit) {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

export function rehypeGuideTerms() {
  return (tree, file) => {
    // Only guides use <Term>; other MDX passes through untouched.
    if (!String(file?.path ?? '').includes('/content/guides/')) return;
    const seen = new Set();
    const children = [];
    for (const block of tree.children) {
      const notes = [];
      walk(block, (node) => {
        if (!isTerm(node)) return;
        const id = idOf(node);
        if (typeof id !== 'string') throw new Error(`${file.path}: <Term> needs id="…" as a plain string`);
        if (seen.has(id)) return;
        seen.add(id);
        node.attributes.push({ type: 'mdxJsxAttribute', name: 'first', value: null });
        notes.push(id);
      });
      for (const id of notes) {
        children.push({ type: 'mdxJsxFlowElement', name: 'TermNote', attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }], children: [] });
      }
      children.push(block);
    }
    tree.children = children;
  };
}
