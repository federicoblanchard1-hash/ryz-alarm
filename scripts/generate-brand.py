"""Draws the Ryz logo, "rz", and every icon made from it.

The mark is a custom ligature cut from the wordmark's own typeface
(Instrument Serif Italic): the r's arm runs straight into the z's top
stroke, so the icon and the name are one family. The r keeps its slant and
contrast; the z loses its left hook so the join is clean.

Every icon centres the mark exactly, by its real outline, in width and
height. Seasonal icons keep the mark in the same place and size, and only
change the tile colour and add one small accessory, so Ryz is recognisable
all year.

Needs: pip install fonttools cairosvg pillow (and `npm install`, for the font).
Run from the repo root: python3 scripts/generate-brand.py

Outputs
  assets/brand/rz.svg                    the master, black on transparent, tight
  assets/brand/mark.png                  white mark, tight, for use inside the app
  assets/brand/brand-sheet.png           the logo, small sizes and seasonal icons at a glance
  assets/icon.png                        iOS / store icon, 1024, white on black
  assets/android-icon-foreground.png     adaptive icon, white mark inside the safe zone, transparent
  assets/android-icon-background.png     solid black
  assets/android-icon-monochrome.png     themed icon (Android 13+), white on transparent
  assets/splash-icon.png                 white mark on transparent, for the splash screen
  assets/favicon.png                     48 px, the bolder small-size cut
  assets/icons/<season>.png              seasonal iOS icons, 1024, opaque
  assets/icons/<season>-android.png      seasonal Android foregrounds (the tile colour is the adaptive background)
"""

import io
import math
from pathlib import Path

import cairosvg
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
BRAND = ASSETS / "brand"
ICONS = ASSETS / "icons"
FONT = ROOT / "node_modules/@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf"
SANS = ROOT / "node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf"

# ---- the mark ---------------------------------------------------------------

font = TTFont(str(FONT))
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()


def ops(ch):
    pen = RecordingPen()
    glyphs[cmap[ord(ch)]].draw(pen)
    return list(pen.value)


r = ops("r")
z = ops("z")
# The r's arm stops a little short and slides under the z's thick start, so the join has no step.
R_ARM = r[:11] + [("qCurveTo", ((246, 446), (276, 484), (302, 497))), ("lineTo", ((316, 463),))] + r[15:]
# The z loses its left hook, so its top stroke starts clean where the r's arm arrives.
Z_JOIN = z[:7] + [("qCurveTo", ((96, 455), (98, 488), (152, 516)))] + z[11:]
Z_OFFSET = 186
PARTS = [(R_ARM, 0), (Z_JOIN, Z_OFFSET)]


def replay(pen, recorded, dx):
    t = TransformPen(pen, (1, 0, 0, 1, dx, 0))
    for op, args in recorded:
        getattr(t, op)(*args)


def outline_bounds():
    b = BoundsPen(glyphs)
    for recorded, dx in PARTS:
        replay(b, recorded, dx)
    return b.bounds  # font units, y up


XMIN, YMIN, XMAX, YMAX = outline_bounds()
W, H = XMAX - XMIN, YMAX - YMIN


def mark_paths():
    out = []
    for recorded, dx in PARTS:
        pen = SVGPathPen(glyphs)
        replay(pen, recorded, dx)
        out.append(pen.getCommands())
    return out


PATHS = mark_paths()


def mark(canvas, size, fill="#000", cx=None, cy=None, bold=0.0):
    """The mark, `size` px across its longer side, centred exactly on (cx, cy) by its real outline.
    `bold` thickens it (px) for small sizes, where the hairlines would otherwise vanish."""
    cx = canvas / 2 if cx is None else cx
    cy = canvas / 2 if cy is None else cy
    s = size / max(W, H)
    tx = cx - (XMIN + W / 2) * s
    ty = cy + (YMIN + H / 2) * s  # y flips: font units point up
    stroke = f' stroke="{fill}" stroke-width="{bold / s:.2f}" stroke-linejoin="round"' if bold else ""
    paths = "".join(f'<path d="{d}"{stroke}/>' for d in PATHS)
    return f'<g fill="{fill}" transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f} {-s:.5f})">{paths}</g>'


def svg(canvas, body, bg=None):
    rect = f'<rect width="{canvas}" height="{canvas}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas} {canvas}" width="{canvas}" height="{canvas}">{rect}{body}</svg>'


def png(markup, size, path=None):
    data = cairosvg.svg2png(bytestring=markup.encode(), output_width=size, output_height=size)
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    if path:
        img.save(path)
    return img


# ---- seasonal accessories (drawn on a 1024 canvas around the centred mark) ------

C = 1024
MARK = 560  # the mark's longer side in every icon: 55 % of the tile
SEASON_MARK = 500  # a little smaller in seasonal icons, so the accessory has room; same centre


def at(x, y, size):
    """A point on the mark (font units), in icon pixels when the mark is `size` wide and centred."""
    s = size / max(W, H)
    return C / 2 + (x - (XMIN + W / 2)) * s, C / 2 - (y - (YMIN + H / 2)) * s


def witch_hat(x, y, ink, band, k=0.8):
    return (f'<g transform="translate({x} {y}) rotate(6) scale({k}) translate({-x} {-y})">'
            f'<path d="M{x-96} {y} L{x+104} {y} Q{x+48} {y-96} {x+120} {y-232} Q{x-16} {y-160} {x-96} {y} Z" fill="{ink}"/>'
            f'<rect x="{x-80}" y="{y-56}" width="168" height="28" fill="{band}"/>'
            f'<rect x="{x-160}" y="{y-20}" width="320" height="48" rx="24" fill="{ink}"/></g>')


def santa_hat(x, y, k=0.8):
    return (f'<g transform="translate({x} {y}) rotate(6) scale({k}) translate({-x} {-y})">'
            f'<path d="M{x-136} {y} L{x+136} {y} Q{x+104} {y-160} {x+16} {y-216} Q{x+160} {y-240} {x+208} {y-120} Q{x+80} {y-320} {x-136} {y} Z" fill="#D7263D"/>'
            f'<rect x="{x-176}" y="{y-40}" width="352" height="88" rx="44" fill="#FFFFFF"/>'
            f'<circle cx="{x+208}" cy="{y-112}" r="48" fill="#FFFFFF"/></g>')


def sparkle(x, y, rr, fill):
    return f'<path d="M{x} {y-rr} Q{x} {y} {x+rr} {y} Q{x} {y} {x} {y+rr} Q{x} {y} {x-rr} {y} Q{x} {y} {x} {y-rr} Z" fill="{fill}"/>'


def heart(x, y, s, fill):
    return (f'<path transform="translate({x} {y}) scale({s})" fill="{fill}" '
            'd="M0 12 C-4 8 -16 2 -16 -6 C-16 -12 -11 -16 -6 -16 C-3 -16 -1 -14 0 -12 C1 -14 3 -16 6 -16 C11 -16 16 -12 16 -6 C16 2 4 8 0 12 Z"/>')


def flower(x, y, rr, petal, centre):
    petals = "".join(f'<circle cx="{x + rr * math.cos(math.radians(a)):.1f}" cy="{y + rr * math.sin(math.radians(a)):.1f}" r="{rr * 0.85:.1f}" fill="{petal}"/>' for a in range(-90, 270, 72))
    return petals + f'<circle cx="{x}" cy="{y}" r="{rr * 0.7:.1f}" fill="{centre}"/>'


def snowflake(x, y, rr, fill):
    return "".join(f'<rect x="{x - rr}" y="{y - 8}" width="{2 * rr}" height="16" rx="8" fill="{fill}" transform="rotate({a} {x} {y})"/>' for a in (0, 60, 120))


R_TOP = at(146, 516, SEASON_MARK)   # the top of the r's shoulder
Z_FLICK = at(Z_OFFSET + 386, 516, SEASON_MARK)  # the z's top-right flick

# name, tile colour, mark colour, accessory behind the mark, accessory in front
SEASONS = [
    ("halloween", "#FF7A00", "#111111", "", witch_hat(R_TOP[0] + 20, R_TOP[1] - 36, "#111111", "#FF7A00")),
    ("christmas", "#14532D", "#FFFFFF", "", santa_hat(R_TOP[0] + 20, R_TOP[1] - 50)),
    ("new-year", "#000000", "#FFFFFF", "",
     sparkle(Z_FLICK[0] + 8, Z_FLICK[1] - 130, 64, "#E8C872") + sparkle(Z_FLICK[0] - 130, Z_FLICK[1] - 170, 32, "#E8C872") + sparkle(R_TOP[0] - 110, R_TOP[1] - 90, 40, "#E8C872")),
    ("valentines", "#E63950", "#FFFFFF", "", heart(Z_FLICK[0] + 8, Z_FLICK[1] - 130, 5.4, "#FFFFFF")),
    ("spring", "#F3EFE4", "#111111", "", flower(Z_FLICK[0] + 8, Z_FLICK[1] - 120, 40, "#111111", "#F3EFE4")),
    ("summer", "#FFC23C", "#111111", f'<circle cx="{Z_FLICK[0] - 24}" cy="{Z_FLICK[1] - 120}" r="110" fill="#FFFFFF"/>', ""),
    ("winter", "#0E1F3B", "#FFFFFF", '<path d="M0 928 Q160 856 336 904 Q512 952 680 888 Q856 832 1024 888 V1024 H0 Z" fill="#3A5A86"/>',
     snowflake(184, 200, 48, "#FFFFFF") + snowflake(856, 160, 36, "#FFFFFF") + snowflake(904, 416, 24, "#FFFFFF") + snowflake(120, 512, 24, "#FFFFFF")),
]


def seasonal_icon(name, bg, ink, behind, front):
    return svg(C, behind + mark(C, SEASON_MARK, ink) + front, bg=bg)


def seasonal_android(name, bg, ink, behind, front):
    """Android draws the tile colour itself, so the foreground is transparent; everything sits in the
    safe zone (the inner 66 %), so it is shrunk about the centre."""
    k = 0.72
    return svg(C, f'<g transform="translate({C/2} {C/2}) scale({k}) translate({-C/2} {-C/2})">{behind}{mark(C, SEASON_MARK, ink)}{front}</g>')


# ---- write everything ---------------------------------------------------------

def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)

    # Master: black, tight around the outline.
    tight = 1000
    (BRAND / "rz.svg").write_text(svg(tight, mark(tight, tight)) + "\n")
    png(svg(1024, mark(1024, 1000, "#FFFFFF")), 512, BRAND / "mark.png")

    png(svg(C, mark(C, MARK, "#FFFFFF"), bg="#000000"), 1024, ASSETS / "icon.png")
    png(svg(C, mark(C, 420, "#FFFFFF")), 1024, ASSETS / "android-icon-foreground.png")
    png(svg(C, "", bg="#000000"), 1024, ASSETS / "android-icon-background.png")
    png(svg(C, mark(C, 420, "#FFFFFF", bold=10)), 1024, ASSETS / "android-icon-monochrome.png")
    png(svg(C, mark(C, 860, "#FFFFFF")), 1024, ASSETS / "splash-icon.png")
    # The small cut: a little heavier, and larger in its square, so the hairlines survive at 48 px.
    png(svg(48, mark(48, 34, "#FFFFFF", bold=1.6), bg="#000000"), 48, ASSETS / "favicon.png")

    for season in SEASONS:
        png(seasonal_icon(*season), 1024, ICONS / f"{season[0]}.png")
        png(seasonal_android(*season), 1024, ICONS / f"{season[0]}-android.png")

    sheet()
    print("wrote the logo, app icons, splash, favicon and", len(SEASONS), "seasonal icons")


def sheet():
    """One image: the mark, the lockup, small sizes and the seasonal icons."""
    w, h = 2400, 1500
    img = Image.new("RGB", (w, h), (10, 10, 10))
    d = ImageDraw.Draw(img)
    title = ImageFont.truetype(str(SANS), 52)
    label = ImageFont.truetype(str(SANS), 30)
    d.text((120, 100), "Ryz", fill="white", font=title)
    d.text((120, 170), "rz · a ligature cut from the wordmark's own italic", fill=(150, 150, 150), font=label)

    def tile(markup, size, x, y):
        im = png(markup, size)
        m = Image.new("L", (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.225), fill=255)
        img.paste(im, (x, y), m)

    tile(svg(C, mark(C, MARK, "#FFFFFF"), bg="#000000"), 720, 120, 280)
    d.rounded_rectangle((120, 280, 840, 1000), radius=int(720 * 0.225), outline=(60, 60, 60), width=2)
    d.text((120, 1040), "App icon", fill="white", font=label)

    x = 980
    for size in (180, 120, 60, 40, 29):
        small = svg(C, mark(C, MARK, "#FFFFFF", bold=0 if size >= 60 else 1024 / size * 0.9), bg="#000000")
        tile(small, size, x, 280 + (180 - size))
        x += size + 40
    d.text((980, 500), "Small sizes", fill="white", font=label)

    names = ["Everyday", "Halloween", "Christmas", "New Year", "Valentine's", "Spring", "Summer", "Winter"]
    markups = [svg(C, mark(C, MARK, "#FFFFFF"), bg="#000000")] + [seasonal_icon(*s) for s in SEASONS]
    d.text((980, 620), "Seasonal icons", fill="white", font=label)
    for i, (n, m) in enumerate(zip(names, markups)):
        cx, cy = 980 + (i % 4) * 330, 680 + (i // 4) * 380
        tile(m, 260, cx, cy)
        tw = d.textlength(n, font=label)
        d.text((cx + (260 - tw) / 2, cy + 280), n, fill=(200, 200, 200), font=label)
    img.save(BRAND / "brand-sheet.png")


if __name__ == "__main__":
    main()
