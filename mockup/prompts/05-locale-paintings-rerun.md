# Task: regenerate six hero paintings whose art tradition did not come through

Images only. Do not change code, do not run `bd`, do not commit. Use your image generation tool. Overwrite the files in `mockup/assets/hero/` of `/home/daylon/projects/canopi-website`, after moving the previous version to `mockup/assets/hero/previous/` (same file name).

Read `mockup/prompts/03-locale-paintings.md` first: its purpose, shared constraints and table still apply (2.4:1, quiet light centre third, warm palette, never blue, no people/buildings/text).

## What went wrong

`mockup/assets/hero/contact-sheet.png`: the zh, ja, ko and de paintings succeeded; each is unmistakably its tradition. But en, fr, nl, ru and it converged into one look, a highly detailed golden "vintage oil illustration" with fine leaves everywhere, and pt is a vintage poster rather than Tarsila. The generator drifts toward that look whenever a Western tradition is named. Fight it explicitly: describe the **physical technique** (what the tool, stroke and surface look like), not just artist names, and **forbid fine detailed leaf-by-leaf rendering** where the tradition doesn't have it. Use `mockup/assets/hero/hero-zh.png`, `hero-ja.png` and `hero-ko.png` as references for how strongly a tradition must read (attach them as reference images if your tool supports it; never copy their content).

## The six paintings and their technique

- `hero-fr.png` (French Impressionism, bocage syntropic orchard: walnut, chestnut, apple, medlar, quince, vines): thick separate dabs and commas of unmixed colour placed side by side, visible canvas weave between strokes; no outlines, no drawn leaves, no fine detail anywhere, forms only suggested by colour patches; high-key light, lilac and ochre shadows; like a plein-air canvas painted in one afternoon. If a 320 px crop shows an individual drawn leaf, it failed.
- `hero-it.png` (Macchiaioli, olive, chestnut, fig, vine pergola, lemon, pomegranate): flat broad patches (macchie) of light and shadow with crisp edges, very simplified masses, strong white-gold sun and deep cool shade, small panel format feel, almost no texture inside each patch. Centre third must be an open sunlit space (pale dusty ground or sky), not foliage.
- `hero-en.png` (English watercolour, orchard and woodland edge: apple, pear, oak, hawthorn blossom, elder, honeysuckle): transparent wet-in-wet washes that bleed into each other, blooms and backruns, large areas of untouched white paper, few loose pencil marks; foliage as soft wash shapes, not individual leaves; airy, unfinished-sketch quality like Constable's and Cotman's watercolour studies.
- `hero-nl.png` (Dutch Golden Age, food forest: walnut, alder, hazel, willow, chestnut, berry shrubs): dark brown-green underpainting with glazed highlights, dramatic chiaroscuro, a towering cloudy cream sky occupying the upper centre, heavy old varnish warmth, craquelure visible; foliage as dark masses with lit edges (Ruisdael), with one Rachel Ruysch-like cluster of fruit and blossom at an edge.
- `hero-ru.png` (Russian realism, birch, rowan with red berries, linden, old dacha apples, currants, raspberries): Levitan's lyrical late-afternoon mood rather than illustration detail: broad confident oil brushwork, silvery white birch trunks with black marks, soft atmospheric depth, muted silver-green and gold, a pale luminous sky.
- `hero-pt.png` (Brazilian modernism / Tarsila do Amaral, syntropic agroforest: cacao, banana, ingá, juçara palm, pruned eucalyptus): geometric simplified volumes (rounded cones and cylinders for trees, tubular trunks), smooth flat matte colour without brushstroke texture or fine detail, soft gradients only to model volume, pinks, ochres and greens of the 1920s Antropofagia palette, no sun disc, surreal calm order.

## Also produce

Update `mockup/assets/hero/contact-sheet.png` (all 11) and `crops.png`, and append the new final prompts to `mockup/assets/hero/README.md`. Review your sheet before finishing: regenerate (at most twice) any of the six that a viewer could still mistake for "detailed vintage oil illustration", or that has a busy centre. List what you changed.
