# Night versions of the 11 hero paintings

Do not run `bd` or any beads/issue command. Do not touch git. Work only inside `mockup/assets/hero/`.

For each locale in en, fr, de, nl, it, es, pt, ru, zh, ja, ko:

1. Use the image generation tool in **edit mode with `mockup/assets/hero/hero-{lang}.png` as the reference image**.
2. Save the result as `mockup/assets/hero/hero-{lang}-night.png`, same size and aspect (about 2.4:1) as the day image.

Edit brief (same for all, keep each painting's own tradition and medium):

> The same painting, same composition, same trees and same medium and brushwork, repainted as a warm moonlit night in the same artistic tradition. Keep every tree, crop and contour where it is. Deep warm umber-black shadows close to #161510, foliage in dark olive and bronze, highlights as soft moonlight in pale cream and muted gold (#E3A04C at most), a few warm points of light from fruit or flowers catching the moon. The centre third stays the quietest and darkest area, low contrast, so light text can sit on it. Never blue or cyan: night is warm umber, olive, bronze and cream, not blue. No moon disc in the centre third (a moon is allowed near an edge if the tradition supports it). No people, buildings, lamps, text, signatures, frames or watermarks.

The reference image keeps the composition aligned, which matters: the site cross-fades day and night in the same frame.

When all 11 exist, build `mockup/assets/hero/contact-sheet-night.png` like `contact-sheet.png` (3 columns, labels "EN · English watercolour" etc. as in the day sheet), and append a short "Night versions" section to `mockup/assets/hero/README.md` naming the prompt used. Report any locale that failed.
