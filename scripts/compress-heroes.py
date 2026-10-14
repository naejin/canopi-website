"""Compress the hero paintings for the web.

Reads hero-{lang}.png and hero-{lang}-night.png from <originals dir> (kept out of git) and writes
progressive JPGs to <out dir>: 2400 px wide at quality 78, and a 1200 px variant (-1200) for
narrower screens. Usage: python3 -I scripts/compress-heroes.py <originals dir> public/hero
"""
import sys
from pathlib import Path
from PIL import Image

source, target = Path(sys.argv[1]), Path(sys.argv[2])
target.mkdir(parents=True, exist_ok=True)
for png in sorted(source.glob('hero-*.png')):
    image = Image.open(png).convert('RGB')
    for width, suffix, quality in [(2400, '', 78), (1200, '-1200', 70)]:
        sized = image if image.width <= width else image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
        out = target / f'{png.stem}{suffix}.jpg'
        sized.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
        print(f'{out.name}: {out.stat().st_size // 1024} KB')
