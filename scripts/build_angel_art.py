"""Produce 72 distinct web portraits from the 18 generated painted originals.

The originals remain in assets/angels as PNG files. This script creates four
color and ornament treatments per painting, with a numbered gold-leaf frame.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1] / "assets" / "angels"
SIZE = (720, 1080)
PALETTES = [
    ((7, 28, 55), (220, 177, 89)),
    ((25, 46, 77), (240, 209, 137)),
    ((55, 35, 69), (216, 180, 129)),
    ((15, 63, 70), (226, 196, 120)),
]


def star(draw, x, y, radius, color):
    draw.line((x - radius, y, x + radius, y), fill=color, width=2)
    draw.line((x, y - radius, x, y + radius), fill=color, width=2)
    d = radius * 0.56
    draw.line((x - d, y - d, x + d, y + d), fill=color, width=1)
    draw.line((x - d, y + d, x + d, y - d), fill=color, width=1)


for number in range(1, 73):
    source_number = (number - 1) % 18 + 1
    variant = (number - 1) // 18
    source = ROOT / f"angel-{source_number:02d}.png"
    image = Image.open(source).convert("RGB")
    if variant % 2:
        image = ImageOps.mirror(image)
    image = ImageOps.fit(image, SIZE, method=Image.Resampling.LANCZOS, centering=(0.5, 0.46))
    image = ImageEnhance.Color(image).enhance([1.0, 0.88, 0.78, 0.90][variant])
    overlay_color, gold = PALETTES[variant]
    tint = Image.new("RGB", SIZE, overlay_color)
    image = Image.blend(image, tint, [0.0, 0.08, 0.12, 0.11][variant])
    draw = ImageDraw.Draw(image, "RGBA")
    # Paired rings and a changing star field give each print its own setting.
    draw.rectangle((14, 14, 706, 1066), outline=(*gold, 210), width=3)
    draw.rectangle((25, 25, 695, 1055), outline=(*gold, 110), width=1)
    draw.arc((83, 50, 637, 575), 189 + variant * 8, 351 + variant * 8, fill=(*gold, 150), width=2)
    draw.arc((105, 72, 615, 553), 191 + variant * 8, 349 + variant * 8, fill=(*gold, 95), width=1)
    for index in range(6):
        x = 54 + ((number * 43 + index * 127) % 611)
        y = 53 + ((number * 71 + index * 173) % 947)
        star(draw, x, y, 5 + index % 3, (*gold, 195))
    image.save(ROOT / f"angel-{number:02d}.webp", "WEBP", quality=86, method=6)

print("Created", len(list(ROOT.glob("angel-*.webp"))), "web portraits")
