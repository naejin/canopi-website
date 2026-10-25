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

// Punctuation that must stay on the line of the term it touches: a closing mark after it (with an
// optional no-break space, as in French « ; » or « : »), or an opening quote or bracket before it.
// Below 960px the term's first use is an inline-block button, which the browser may break around.
const after = /^[\u00a0\u202f]?[,.;:!?…)\]»”’]+(?:[\u00a0\u202f]?[»”’)])?/;
const before = /[«“‘(\[][\u00a0\u202f]?$/;

function keepWithPunctuation(node) {
  const kids = node.children;
  if (!kids) return;
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    if (!isTerm(kid)) { keepWithPunctuation(kid); continue; }
    const next = kids[i + 1];
    const prev = kids[i - 1];
    const tail = next?.type === 'text' ? next.value.match(after)?.[0] : undefined;
    const head = prev?.type === 'text' ? prev.value.match(before)?.[0] : undefined;
    if (!tail && !head) continue;
    const inner = [];
    if (head) { prev.value = prev.value.slice(0, -head.length); inner.push({ type: 'text', value: head }); }
    inner.push(kid);
    if (tail) { next.value = next.value.slice(tail.length); inner.push({ type: 'text', value: tail }); }
    kids[i] = { type: 'element', tagName: 'span', properties: { className: ['guide-term-keep'] }, children: inner };
    if (next && next.type === 'text' && next.value === '') kids.splice(i + 1, 1);
    if (prev && prev.type === 'text' && prev.value === '') { kids.splice(i - 1, 1); i--; }
  }
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
    for (const block of children) keepWithPunctuation(block);
  };
}
