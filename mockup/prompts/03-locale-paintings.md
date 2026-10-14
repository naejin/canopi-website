# Task: one hero painting per website language (light theme)

You are generating images only. Do not write or change any code, do not create or update issues (no `bd` commands), do not commit. Use your image generation tool (gpt-image). Save results as PNG under `mockup/assets/hero/` in `/home/daylon/projects/canopi-website`.

## What the image is for

projectcanopi.com is the website of Canopi, a free, open-source app for designing food forests, syntropic orchards and agroecological gardens. It exists in 11 languages. Each language version shows its own hero painting: a canopy that belongs to the places where that language is spoken, painted in an art tradition from the same culture.

The hero shows the word "Canopi", the line "Agroecological design, free and open to everyone" and two buttons, centred on warm paper (#EFE9DD). The painting sits behind them, hidden under a paper-coloured mask; the visitor's cursor leaves a soft ink-like trail that reveals the painting for half a second. The painting is only ever seen in fleeting brushstroke-shaped glimpses a few hundred pixels wide, so every region must hold coherent, beautiful detail on its own, with no single focal subject that needs the whole picture. On phones the mask is off and the whole painting shows faintly behind the text.

Lessons from earlier rounds (`mockup/assets/studies/` and `studies/v2/`): styles converged into one "vintage wallpaper" look, and blue skies crept in. Each painting below must be unmistakably its own tradition, recognisable from a 300 px crop.

## Shared constraints (all 11)

- Wide landscape, 2.4:1 (for example 2400×1000; if the tool only offers fixed sizes, take the widest and compose for a 2.4:1 centre crop).
- Subject: a cultivated, abundant, living canopy (food forest, orchard, agroforest, terraced or managed woodland) seen at crown level or slightly below. Calm, generous, alive: the beauty of nature tended by people, without showing people, buildings, fences, vehicles, text, signatures, seals, frames or watermarks.
- The centre third is lighter and quieter (more air, lower contrast) so text stays readable over a revealed glimpse; density and detail grow toward the left, right and lower edges.
- Low to medium contrast.
- Palette harmonised with the site: warm paper (#EFE9DD, #FBF8F2), ink (#27231D), ochre (#9C5A16) and the tradition's own greens, earths and fruit colours. Skies are warm paper, cream, pale gold or haze, **never blue**. No saturated blue anywhere (blue is reserved for water in Canopi), no neon green.
- Visible medium texture of the tradition (brush, wash, engraving, print grain, silk, canvas). Never photographic, never 3D, no generic AI gloss.
- Inspired by the tradition and the named artists; an original composition, not a reproduction of any existing artwork.

## The 11 paintings

| File | Language | Canopy | Tradition |
|---|---|---|---|
| `hero-en.png` | English | English orchard meeting a woodland edge: old apple and pear trees, oak, hawthorn in blossom, elder, hedgerow climbers (honeysuckle, dog rose) | English watercolour (Constable's sketches, Samuel Palmer's luminous orchards): transparent washes, paper showing through, soft wet edges |
| `hero-fr.png` | French | Bocage syntropic orchard: walnut, sweet chestnut, apple, medlar, quince, vines on the trees | French Impressionism (Monet, Pissarro, Sisley orchards): broken comma brushstrokes, no outlines, light dissolving forms, coloured violet-grey shadows |
| `hero-de.png` | German | Streuobstwiese: tall old meadow-orchard trees (apple, pear, cherry, walnut) with a beech and oak edge | German Renaissance and Romantic graphic art (Dürer's nature studies, Friedrich's quiet light): precise pen and brown ink, fine hatching, sepia washes |
| `hero-nl.png` | Dutch | Dutch food forest: walnut, alder, hazel, willow, sweet chestnut, berry shrubs, a hint of a ditch's reeds (no visible water surface) | Dutch Golden Age landscape and flower painting (Ruisdael, Hobbema, Rachel Ruysch): layered glazes, dense precise foliage, warm golden light, dark rich greens |
| `hero-it.png` | Italian | Mediterranean polyculture: olive, sweet chestnut, fig, vine pergola, lemon and pomegranate | Macchiaioli (Fattori, Lega, Signorini): flat sunlit patches of colour (macchie), strong warm light, simple masses |
| `hero-es.png` | Spanish | Latin American agroforest: shade-grown coffee and cacao under ingá and avocado, maize and beans of a milpa at the edges, bananas sparingly | Joaquín Sorolla's luminous brushwork crossed with Mexican muralism's (Diego Rivera's) generous rounded forms: bright warm light, bold sculpted leaves |
| `hero-pt.png` | Portuguese | Brazilian syntropic agroforest (as on Ernst Götsch's farm in Bahia): cacao, banana, ingá, juçara palm, eucalyptus pruned for biomass, layered strata | Brazilian modernism (Tarsila do Amaral): simplified rounded volumes, smooth matte surfaces, gentle colour, dreamlike order |
| `hero-ru.png` | Russian | Birch, rowan with red berries, linden, old dacha apple trees, currants and raspberry under them | Russian realist landscape (Ivan Shishkin, Isaac Levitan): meticulous trees, airy depth, soft northern light, oil on canvas |
| `hero-zh.png` | Chinese | Tea terraces under persimmon trees, bamboo groves, old pines, loquat and plum | Chinese gongbi and literati ink on silk (Song dynasty bird-and-flower and landscape): fine even ink lines, mineral greens and ochres, ink-wash mist, silk texture |
| `hero-ja.png` | Japanese | Satoyama: persimmon with fruit, maple, Japanese cedar, ume plum, chestnut, layered hills of managed woodland | Ukiyo-e and shin-hanga woodblock (Hiroshige, Hasui Kawase): thin key-block outlines, flat colour planes, bokashi gradients, wood grain, 6–8 printed colours |
| `hero-ko.png` | Korean | Persimmon with orange fruit, Korean red pine, chestnut, jujube, magnolia, on a hillside | Korean minhwa folk painting and Joseon true-view landscape (Jeong Seon): bold friendly outlines, flat mineral colours, decorative pine and fruit, hanji paper texture |

## Also produce

- `mockup/assets/hero/contact-sheet.png`: all 11 in a grid, each labelled with its locale code and tradition.
- `mockup/assets/hero/crops.png`: for each painting, two 320×320 full-resolution crops (centre third and edge), labelled with the locale code.
- `mockup/assets/hero/README.md`: per painting, the exact final prompt and the output size.

Before finishing, review your own contact sheet. Regenerate (at most twice each) any painting that shows blue sky or blue water, people, buildings or text; that could be mistaken for another painting's tradition; or that has a busy, high-contrast centre. List the files you created.
