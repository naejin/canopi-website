# Task: four painting style studies for the Canopi website hero

You are generating images only. Do not write or change any code. Use your image generation tool (gpt-image) and save every result as PNG under `mockup/assets/studies/` in this repository (`/home/daylon/projects/canopi-website`).

## What the image is for

Canopi is a free, open-source agroecological design app (food forests, syntropic orchards, gardens). The new website hero shows the word "Canopi", the tagline "Agroecological design, free and open to everyone" and two buttons (Download, Open in browser), centred on a warm paper background (#EFE9DD).

Behind that hero sits a painting of a forest canopy. It is hidden under a paper-coloured mask; the visitor's cursor leaves a soft, ink-like trail that briefly reveals the painting and fades back within half a second. So the painting is only ever seen in fleeting brushstroke-shaped glimpses, a few hundred pixels wide. It must reward those glimpses: rich, coherent detail everywhere, no single focal subject that only makes sense when seen whole.

## Subject

A living forest canopy seen from slightly below or level with the crowns: layered strata of a food forest / agroforest, from tall emergent trees through fruit trees and shrubs to climbers and leaves, with light filtering through. It should feel abundant, alive and calm; the beauty of nature, not wilderness drama. Fruit, blossom, birds or insects may appear discreetly. No people, no buildings, no text, no signature, no frame, no watermark.

## Composition constraints (all four studies)

- Wide format, landscape, about 2.4:1 (for example 2400×1000; if the tool only offers fixed sizes, use the widest one and keep the composition valid for a 2.4:1 centre crop).
- The centre third (where the title and buttons sit) is lighter and quieter: lower contrast, more air and light, so text stays readable over a revealed glimpse. Detail and density grow toward the left, right and lower edges.
- Low to medium contrast overall; it sits behind text.
- Palette harmonised with the site: warm paper (#EFE9DD, #FBF8F2), ink (#27231D), ochre accent (#9C5A16), plus natural foliage greens, sap and olive greens, soft golds. Avoid saturated blues (blue is reserved for water in Canopi) and avoid neon greens.
- Painted look with visible medium texture (brush, wash, engraving lines or woodblock grain depending on the style), never photographic, never 3D render, never generic AI gloss.
- Inspired by the style of real-world art traditions, but an original composition; do not reproduce any specific existing artwork.

## The four studies (one image each)

1. `study-1-botanical-engraving.png`: 18th–19th-century naturalist plate style: fine ink linework and cross-hatching with light watercolour wash, like hand-coloured botanical engravings. Most aligned with the "field notebook" feel of the app.
2. `study-2-naive-jungle.png`: in the spirit of Henri Rousseau's naive jungle paintings: layered, flat-ish leaves of many shapes, dense and dreamlike, but toned down to the warm palette and kept calm in the centre.
3. `study-3-impressionist-light.png`: Impressionist dappled light through leaves (spirit of Monet, Sisley, Pissarro): broken brushstrokes, light and air, warm afternoon sun.
4. `study-4-woodblock.png`: Japanese woodblock print (spirit of Hiroshige, Hokusai): flat layered foliage planes, soft bokashi gradients, visible wood grain, restrained outlines.

## Also produce

- `mockup/assets/studies/contact-sheet.png`: the four studies side by side or 2×2 with their numbers, for quick comparison. You may compose it with a short script (Python/Pillow or ImageMagick) if available; skip it if not.
- `mockup/assets/studies/README.md`: for each study, the exact final prompt you used and the output size.

When done, list the files you created. Do not commit.
