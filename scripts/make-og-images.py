"""Social preview images: each locale's day painting, 1200 x 630, with the Canopi wordmark.

Usage: python3 scripts/make-og-images.py   (reads public/hero/, writes public/og/)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LANGS = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru']
SIZE = (1200, 630)
PAPER = (239, 233, 221)   # --bg
INK = (39, 35, 29)        # --text


def cover(image, size):
    scale = max(size[0] / image.width, size[1] / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (image.width - size[0]) // 2
    top = (image.height - size[1]) // 2
    return image.crop((left, top, left + size[0], top + size[1]))


def main():
    out = ROOT / 'public' / 'og'
    out.mkdir(exist_ok=True)
    font = ImageFont.truetype(str(ROOT / 'public' / 'fonts' / 'literata-latin-600-normal.woff2'), 132)
    for lang in LANGS:
        painting = cover(Image.open(ROOT / 'public' / 'hero' / f'hero-{lang}.jpg').convert('RGB'), SIZE)
        # A paper band behind the wordmark keeps it legible on any painting.
        band = Image.new('L', SIZE, 0)
        draw = ImageDraw.Draw(band)
        for y in range(SIZE[1]):
            distance = abs(y - SIZE[1] / 2) / (SIZE[1] / 2)
            draw.line([(0, y), (SIZE[0], y)], fill=round(205 * max(0.0, 1 - distance * 1.6) ** 0.8))
        image = Image.composite(Image.new('RGB', SIZE, PAPER), painting, band)
        draw = ImageDraw.Draw(image)
        draw.text((SIZE[0] / 2, SIZE[1] / 2), 'Canopi', font=font, fill=INK, anchor='mm')
        image.save(out / f'og-{lang}.jpg', quality=82, optimize=True, progressive=True)
        print(f'og-{lang}.jpg', (out / f'og-{lang}.jpg').stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
