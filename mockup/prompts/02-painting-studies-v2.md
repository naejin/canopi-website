# Task: painting style studies for the Canopi website hero, round 2

You are generating images only. Do not write or change any code, do not create or update issues (no `bd` commands), do not commit. Use your image generation tool (gpt-image) and save every result as PNG under `mockup/assets/studies/v2/` in this repository (`/home/daylon/projects/canopi-website`).

## Why a second round

Round 1 (`mockup/assets/studies/`) failed in three ways. Avoid all three:

1. **The four styles converged** into the same "vintage tropical wallpaper" look. Each study must be unmistakably its own art tradition: someone glancing at a 300 px crop must be able to name the style.
2. **The subject was a tropical rainforest** (toucans, cacao, palms, heliconias, mountains in haze). Canopi's users design temperate European food forests and syntropic orchards. No tropical species, no palms, no toucans or parrots, no banana leaves, no jungle.
3. **Blue sky** appeared in one study. No blue anywhere (blue is reserved for water in Canopi).

## What the image is for

The hero of projectcanopi.com shows the word "Canopi", the line "Agroecological design, free and open to everyone" and two buttons, centred on warm paper (#EFE9DD). The painting sits behind them, hidden under a paper-coloured mask. The cursor leaves a soft ink-like trail that reveals the painting for half a second, so it is only ever seen in fleeting brushstroke-shaped glimpses a few hundred pixels wide. Every region must hold coherent, beautiful detail on its own; no single focal subject that needs the whole picture.

## Subject (all studies)

A temperate food forest or syntropic orchard in full season, seen at the level of the crowns or slightly below: tall emergent trees (walnut, sweet chestnut, oak, lime), fruit trees (apple, pear, plum, cherry, medlar, quince, persimmon), shrubs (hazel, elder, currant, sea buckthorn), climbing vines (grape, kiwi, hops), with leaves, blossom and ripe fruit. Light filtering through the layers. Discreet European life may appear: a robin, tits, a blackbird, bees, a butterfly. Abundant, alive, calm. No people, no buildings, no fences, no text, no signature, no frame, no watermark.

## Composition constraints (all studies)

- Wide landscape, 2.4:1 (for example 2400×1000; if the tool only offers fixed sizes, take the widest and compose for a 2.4:1 centre crop).
- The centre third is lighter and quieter (more air, lower contrast) so text stays readable over a revealed glimpse; density and detail grow toward the left, right and lower edges. The top edge can be canopy seen from below, with leaves and branches framing a pale sky of warm paper tone, never blue.
- Low to medium contrast.
- Palette tied to the site: warm paper (#EFE9DD, #FBF8F2), ink (#27231D), ochre (#9C5A16), with natural sap, olive and moss greens, russet, plum and soft gold for fruit. No blue, no neon green.
- Visible medium texture, never photographic, never 3D, no generic AI gloss.
- Original composition inspired by a tradition; do not reproduce any specific existing artwork.

## The four studies (one image each, each pushed hard into its tradition)

1. `study-1-botanical-engraving.png`: **hand-coloured copperplate engraving**, 18th-century naturalist plate (spirit of Merian, Redouté, the Pomona engravings). Visible engraved line work: hatching, cross-hatching, stippling. Restrained watercolour washes on cream paper with paper tone showing through. Fruit and leaves drawn with scientific precision, branches overlapping in layers. Ink lines dominant, colour secondary.
2. `study-2-naive-painting.png`: **naive painting in the spirit of Henri Rousseau**, flat opaque oil. Every leaf a crisp, separate, stylised shape with hard edges and no atmospheric blur. Repeated leaf patterns in many distinct greens, stacked in theatrical layers, fruit as simple bright rounds, a dreamlike stillness. Muted to the warm palette, but the flat cut-paper leaf language must be obvious.
3. `study-3-impressionist.png`: **French Impressionist plein-air oil** (spirit of Monet's and Pissarro's orchards). Broken, visible, comma-shaped brushstrokes; forms dissolve in light; no outlines at all; warm afternoon light and coloured shadows (violet-grey, never blue). The opposite of study 1: no line, only paint and light.
4. `study-4-woodblock.png`: **Japanese ukiyo-e woodblock print** (spirit of Hiroshige, Hokusai, shin-hanga). Flat planes of colour separated by thin even key-block outlines; bokashi colour gradients in the sky band; visible wood grain and paper fibre; limited palette of 6–8 printed colours; foliage as stylised clusters; strong graphic simplicity. Seen from below, branches crossing the picture plane as in a Hiroshige plum-garden print.

## Also produce

- `mockup/assets/studies/v2/contact-sheet.png`: the four side by side or 2×2 with their numbers and style names.
- `mockup/assets/studies/v2/crops.png`: for each study, two random 320×320 crops at full resolution (one from the centre third, one from an edge), labelled. This shows how each style reads in a cursor-sized glimpse.
- `mockup/assets/studies/v2/README.md`: for each study, the exact final prompt and the output size.

Before finishing, look at your own contact sheet. If two studies still look like the same style, or any shows tropical plants or blue, regenerate that study (at most twice). List the files you created.
