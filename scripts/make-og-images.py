"""Social preview images: each locale's day painting, 1200 x 630, with the Canopi logo and wordmark
on a parchment label, plus the 180 x 180 apple-touch-icon.

The label stays inside the central 630 x 630 square, so apps that crop the preview to a square
thumbnail (WhatsApp, iMessage) still show the whole lockup.

Usage: python3 scripts/make-og-images.py   (reads public/hero/ and public/canopi-logo.svg,
writes public/og/ and public/apple-touch-icon.png; needs Inkscape to render the logo)
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LANGS = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru']
SIZE = (1200, 630)
PAPER = (239, 233, 221)   # --bg
INK = (39, 35, 29)        # --text
RULE = tuple(round(p + (i - p) * 0.3) for p, i in zip(PAPER, INK))  # ink at 30% on paper
LOGO = 124
GAP = 24
FONT_SIZE = 102
PAD = (42, 34)
RADIUS = 26
INSET = 9


def cover(image, size):
    scale = max(size[0] / image.width, size[1] / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (image.width - size[0]) // 2
    top = (image.height - size[1]) // 2
    return image.crop((left, top, left + size[0], top + size[1]))


def render_logo(size):
    with tempfile.TemporaryDirectory() as tmp:
        png = Path(tmp) / 'logo.png'
        subprocess.run(['inkscape', str(ROOT / 'public' / 'canopi-logo.svg'), '-w', str(size), '-o', str(png)],
                       check=True, capture_output=True)
        return Image.open(png).convert('RGBA')


def lockup(logo, font):
    """The logo and the wordmark side by side on a rounded parchment label (RGBA)."""
    left, _, right, _ = font.getbbox('Canopi', anchor='ls')
    text_w = right - left
    width = PAD[0] * 2 + LOGO + GAP + text_w
    height = PAD[1] * 2 + LOGO
    label = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(label)
    draw.rounded_rectangle([0, 0, width - 1, height - 1], RADIUS, fill=PAPER + (255,))
    # An inset hairline, like a specimen label in a field notebook.
    draw.rounded_rectangle([INSET, INSET, width - 1 - INSET, height - 1 - INSET], RADIUS - INSET,
                           outline=RULE, width=2)
    label.alpha_composite(logo, (PAD[0], PAD[1]))
    # The baseline sits so the x-height is centred on the logo.
    x_height = -font.getbbox('x', anchor='ls')[1]
    baseline = PAD[1] + LOGO // 2 + x_height // 2
    ImageDraw.Draw(label).text((PAD[0] + LOGO + GAP - left, baseline), 'Canopi', font=font, fill=INK, anchor='ls')
    return label


def main():
    out = ROOT / 'public' / 'og'
    out.mkdir(exist_ok=True)
    font = ImageFont.truetype(str(ROOT / 'public' / 'fonts' / 'literata-latin-600-normal.woff2'), FONT_SIZE)
    logo = render_logo(LOGO)
    label = lockup(logo, font)
    assert label.width <= SIZE[1], f'label {label.width}px is wider than the square crop'
    x = (SIZE[0] - label.width) // 2
    y = (SIZE[1] - label.height) // 2

    # A soft shadow lifts the label off the painting.
    shadow = Image.new('L', SIZE, 0)
    ImageDraw.Draw(shadow).rounded_rectangle([x, y + 8, x + label.width, y + label.height + 8], RADIUS, fill=110)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))

    for lang in LANGS:
        painting = cover(Image.open(ROOT / 'public' / 'hero' / f'hero-{lang}.jpg').convert('RGB'), SIZE)
        image = Image.composite(Image.new('RGB', SIZE, INK), painting, shadow).convert('RGBA')
        image.alpha_composite(label, (x, y))
        image.convert('RGB').save(out / f'og-{lang}.jpg', quality=76, optimize=True, progressive=True)
        size = (out / f'og-{lang}.jpg').stat().st_size // 1024
        # WhatsApp drops the large preview above about 300 KB.
        assert size <= 250, f'og-{lang}.jpg is {size} KB'
        print(f'og-{lang}.jpg', size, 'KB')

    # iOS shows the touch icon in link previews and on the home screen; it fills transparency with
    # black, so the logo sits on parchment.
    icon = Image.new('RGBA', (180, 180), PAPER + (255,))
    small = render_logo(144)
    icon.alpha_composite(small, (18, 18))
    icon.convert('RGB').save(ROOT / 'public' / 'apple-touch-icon.png', optimize=True)
    print('apple-touch-icon.png')


if __name__ == '__main__':
    main()
