"""Compress hero paintings to web JPGs: 2400 px wide for large screens, quality 78, progressive.
Usage: python3 -I compress-heroes.py <hero dir>  (reads hero-*.png, writes hero-*.jpg beside them)"""
import sys
from pathlib import Path
from PIL import Image

folder = Path(sys.argv[1])
for png in sorted(folder.glob('hero-*.png')):
    image = Image.open(png).convert('RGB')
    if image.width > 2400:
        image = image.resize((2400, round(image.height * 2400 / image.width)), Image.LANCZOS)
    out = png.with_suffix('.jpg')
    image.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
    print(f'{out.name}: {out.stat().st_size // 1024} KB')
