"""Draws the Ryz logo and its family system, in black and white.

The idea: every app in the family stands on the same horizon line. What
rises above the line says what the app is for. For Ryz it's the sun coming
up. The line, the stroke weight and the grid stay the same, so a future
focus, sleep or habit app reads as part of the same family at a glance.

Outputs (run from the repo root: python3 scripts/generate-brand.py):
  assets/icon.png                   iOS / store icon, 1024, white on black
  assets/android-icon-foreground.png  adaptive icon glyph (safe zone), transparent
  assets/android-icon-background.png  solid black
  assets/android-icon-monochrome.png  themed-icon glyph, white on transparent
  assets/splash-icon.png            glyph for the splash screen, transparent
  assets/favicon.png                48 px, white on black
  assets/brand/mark.png             glyph cropped tight, for use inside the app, transparent
  assets/brand/brand-sheet.png      the logo, lockup and family at a glance
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
BRAND = ASSETS / "brand"
SERIF_ITALIC = ROOT / "node_modules/@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"
SANS = ROOT / "node_modules/@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf"
SANS_MEDIUM = ROOT / "node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf"

WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)
SS = 4  # supersampling, for clean edges

# The grid, in units of a 1024 canvas.
LINE_Y, LINE_H = 636, 44  # the horizon: top edge and thickness
LINE_X0, LINE_X1 = 232, 792
GAP = 36  # between a shape and the horizon
STROKE = 44  # same weight as the horizon
SUN_R = 236  # the sun's radius; its centre sits on the gap over the horizon, so exactly half shows
CENTRE_Y = 525  # the glyphs' visual centre on the grid


def horizon(d: ImageDraw.ImageDraw, s: float, ox: float, oy: float, color):
    r = LINE_H * s / 2
    d.rounded_rectangle([ox + LINE_X0 * s, oy + LINE_Y * s, ox + LINE_X1 * s, oy + (LINE_Y + LINE_H) * s], radius=r, fill=color)


def above(img: Image.Image, s: float, ox: float, oy: float, bg):
    """Clears everything below the gap over the horizon: the shape is only ever seen above the line."""
    ImageDraw.Draw(img).rectangle([0, oy + (LINE_Y - GAP) * s, img.width, img.height], fill=bg)


def glyph(kind: str, size: int, scale: float = 1.0, fg=WHITE, bg=(0, 0, 0, 0)) -> Image.Image:
    """One family glyph on a `size` square. `scale` shrinks it about the centre (for safe zones)."""
    big = size * SS
    img = Image.new("RGBA", (big, big), bg)
    d = ImageDraw.Draw(img)
    s = big / 1024 * scale
    # Centre the 1024 grid in the canvas after scaling, then move the glyphs' visual centre to the middle.
    ox = (big - 1024 * s) / 2
    oy = (big - 1024 * s) / 2 + (512 - CENTRE_Y) * s
    cx, cy = ox + 512 * s, oy + (LINE_Y - GAP) * s

    if kind == "ryz":  # wake: the sun coming up
        r = SUN_R * s
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fg)
        above(img, s, ox, oy, bg)
    elif kind == "focus":  # concentration: one point, held above the line
        r = 96 * s
        y = oy + 470 * s  # floating: the same height as the sun's middle
        d.ellipse([cx - r, y - r, cx + r, y + r], fill=fg)
    elif kind == "rest":  # sleep: a crescent moon, floating where the focus dot sits
        r = 150 * s
        y = oy + 452 * s
        d.ellipse([cx - r, y - r, cx + r, y + r], fill=fg)
        rb = r * 0.86
        bx, by = cx + 74 * s, y - 52 * s
        d.ellipse([bx - rb, by - rb, bx + rb, by + rb], fill=bg)
    elif kind == "breathe":  # calm: the same sun, drawn as a breath of air
        r = SUN_R * s
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fg)
        ri = r - STROKE * s
        d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=bg)
        above(img, s, ox, oy, bg)
    elif kind == "habits":  # habits: three days, building up
        w = STROKE * 2 * s
        for i, h in enumerate([120, 200, 280]):
            x = cx + (i - 1) * 150 * s - w / 2
            d.rounded_rectangle([x, oy + (LINE_Y - GAP - h) * s, x + w, oy + (LINE_Y - GAP) * s], radius=w / 2, fill=fg)
    horizon(d, s, ox, oy, fg)
    return img.resize((size, size), Image.LANCZOS)


def on(color, size: int, kind="ryz", scale=1.0, fg=WHITE) -> Image.Image:
    return glyph(kind, size, scale, fg=fg, bg=color)


def text(d, xy, s, font, size, fill, anchor="la"):
    d.text(xy, s, font=ImageFont.truetype(str(font), size), fill=fill, anchor=anchor)


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def sheet():
    W, H = 2400, 1500
    img = Image.new("RGBA", (W, H), (10, 10, 10, 255))
    d = ImageDraw.Draw(img)
    grey, faint = (142, 142, 147, 255), (72, 72, 74, 255)

    text(d, (120, 110), "Ryz", SANS_MEDIUM, 44, WHITE)
    text(d, (120, 170), "Logo and family system · black and white", SANS, 30, grey)

    # The icon, big, with the iOS corner shape.
    icon = rounded(on(BLACK, 720), 160)
    border = Image.new("RGBA", (724, 724), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle([0, 0, 723, 723], radius=162, outline=faint, width=2)
    img.alpha_composite(border, (118, 278))
    img.alpha_composite(icon, (120, 280))
    text(d, (120, 1040), "App icon", SANS_MEDIUM, 28, WHITE)
    text(d, (120, 1082), "The sun coming up over the horizon line.", SANS, 26, grey)

    # Lockups: white on black and black on white.
    x0 = 960
    text(d, (x0, 280), "Lockup", SANS_MEDIUM, 28, WHITE)
    # The horizon line sits on the wordmark's baseline.
    foot = round((LINE_Y + LINE_H) / 1024 * 260)
    m = glyph("ryz", 260)
    img.alpha_composite(m, (x0 - 40, 480 - foot))
    text(d, (x0 + 220, 480), "ryz", SERIF_ITALIC, 200, WHITE, anchor="ls")
    light = Image.new("RGBA", (620, 260), WHITE)
    lm = glyph("ryz", 260, fg=BLACK, bg=(0, 0, 0, 0))
    light.alpha_composite(lm, (-30, 190 - foot))
    ImageDraw.Draw(light).text((230, 190), "ryz", font=ImageFont.truetype(str(SERIF_ITALIC), 200), fill=BLACK, anchor="ls")
    img.alpha_composite(rounded(light, 28), (x0 + 700, 330))

    # The family: same line, same weight; what rises above it names the app.
    text(d, (x0, 680), "The family", SANS_MEDIUM, 28, WHITE)
    text(d, (x0, 722), "Every app stands on the same horizon line. Ideas for future apps:", SANS, 26, grey)
    names = [("ryz", "Ryz", "wake up"), ("focus", "Focus", "concentrate"), ("rest", "Rest", "sleep"), ("breathe", "Breathe", "calm down"), ("habits", "Habits", "keep going")]
    for i, (kind, title, sub) in enumerate(names):
        x = x0 + i * 270
        tile = rounded(on(BLACK, 220, kind), 50)
        frame = Image.new("RGBA", (224, 224), (0, 0, 0, 0))
        ImageDraw.Draw(frame).rounded_rectangle([0, 0, 223, 223], radius=52, outline=faint, width=2)
        img.alpha_composite(frame, (x - 2, 788))
        img.alpha_composite(tile, (x, 790))
        text(d, (x + 110, 1050), title, SANS_MEDIUM, 28, WHITE, anchor="ma")
        text(d, (x + 110, 1090), sub, SANS, 24, grey, anchor="ma")

    # Small sizes stay readable.
    text(d, (x0, 1200), "Small sizes", SANS_MEDIUM, 28, WHITE)
    x = x0
    for sz in (120, 80, 48, 32):
        img.alpha_composite(rounded(on(BLACK, sz), int(sz * 0.22)), (x, 1250 + (120 - sz)))
        x += sz + 40
    img.alpha_composite(rounded(on(WHITE, 120, fg=BLACK), 26), (x + 40, 1250))
    return img


def main():
    BRAND.mkdir(exist_ok=True)
    on(BLACK, 1024).convert("RGB").save(ASSETS / "icon.png")
    # Android keeps the glyph inside the central 66% circle; 0.8 leaves room for any mask shape.
    glyph("ryz", 1024, 0.8).save(ASSETS / "android-icon-foreground.png")
    glyph("ryz", 1024, 0.8).save(ASSETS / "android-icon-monochrome.png")
    Image.new("RGB", (1024, 1024), (0, 0, 0)).save(ASSETS / "android-icon-background.png")
    glyph("ryz", 1024).save(ASSETS / "splash-icon.png")
    on(BLACK, 48).convert("RGB").save(ASSETS / "favicon.png")
    # Cropped to the glyph, so in the app its bottom edge is the horizon line.
    mark = glyph("ryz", 1024)
    mark.crop(mark.getbbox()).save(BRAND / "mark.png")
    sheet().convert("RGB").save(BRAND / "brand-sheet.png")
    print("done")


if __name__ == "__main__":
    main()
