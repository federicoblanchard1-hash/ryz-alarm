"""Draws the Ryz logo, "rz", and every icon made from it.

The mark is a custom ligature cut from the wordmark's own typeface
(Instrument Serif Italic): the r's arm runs straight into the z's top
stroke, so the icon and the name are one family. The r keeps its slant and
contrast; the z loses its left hook so the join is clean.

Every icon centres the mark exactly, by its real outline, in width and
height. Seasonal icons keep the mark in the same place and size, and only
change the tile colour and add one small accessory, so Ryz is recognisable
all year. A few plain styles (Light, Gold, Sunrise) can be used any time.

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
# The top of the r's arm rises and levels out exactly where the z's top stroke starts,
# so the two read as one stroke.
R_ARM = r[:11] + [("qCurveTo", ((246, 446), (282, 502), (318, 516), (338, 516))), ("lineTo", ((330, 474),))] + r[15:]
# The z loses its left hook. Underneath, its stroke bends up into the arm with a curve
# that meets the arm's underside at a tangent, so the joint has no notch.
Z_JOIN = z[:6] + [
    ("qCurveTo", ((230, 406), (183, 427), (163, 437))),
    ("qCurveTo", ((109, 464), (82, 422))),
    ("lineTo", ((114, 470),)),
    ("lineTo", ((152, 516),)),
] + z[11:]
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


def maple_leaf(x, y, k, rot, fill):
    pts = "0 -100 14 -62 38 -72 30 -30 70 -46 60 -20 92 -8 52 18 60 40 18 30 6 60 5 104 -5 104 -6 60 -18 30 -60 40 -52 18 -92 -8 -60 -20 -70 -46 -30 -30 -38 -72 -14 -62"
    return (f'<polygon points="{pts}" fill="{fill}" stroke="{fill}" stroke-width="10" stroke-linejoin="round" '
            f'transform="translate({x} {y}) rotate({rot}) scale({k})"/>')


def shamrock(x, y, k, fill):
    # three hearts with their points meeting in the middle, and a curling stem
    hearts = "".join(f'<g transform="rotate({a})"><path transform="translate(0 -13)" d="M0 12 C-4 8 -16 2 -16 -6 C-16 -12 -11 -16 -6 -16 C-3 -16 -1 -14 0 -12 C1 -14 3 -16 6 -16 C11 -16 16 -12 16 -6 C16 2 4 8 0 12 Z"/></g>'
                     for a in (0, 120, 240))
    stem = '<path d="M0 0 Q4 20 16 30" fill="none" stroke-width="4" stroke-linecap="round"/>'
    return f'<g transform="translate({x} {y}) scale({k})" fill="{fill}" stroke="{fill}">{hearts}{stem}</g>'


def egg(x, y, k, shell, band):
    shape = "M0 -100 C55 -100 80 -10 80 30 C80 80 45 105 0 105 C-45 105 -80 80 -80 30 C-80 -10 -55 -100 0 -100 Z"
    zig = "M-90 10 " + " ".join(f"L{-90 + 20 * i} {10 + (-18 if i % 2 else 0)}" for i in range(1, 10))
    dots = "".join(f'<circle cx="{cx}" cy="{cy}" r="9" fill="{band}"/>' for cx, cy in ((-30, -40), (0, -62), (30, -40), (-30, 62), (30, 62), (0, 82)))
    return (f'<g transform="translate({x} {y}) rotate(14) scale({k})"><clipPath id="egg"><path d="{shape}"/></clipPath>'
            f'<path d="{shape}" fill="{shell}"/><g clip-path="url(#egg)"><path d="{zig}" fill="none" stroke="{band}" stroke-width="12" stroke-linejoin="round"/>'
            f'<path d="{zig}" transform="translate(0 28)" fill="none" stroke="{band}" stroke-width="12" stroke-linejoin="round"/>{dots}</g></g>')


def lantern(x, y, k, body, rib):
    return (f'<g transform="translate({x} {y}) scale({k})">'
            f'<line x1="0" y1="-130" x2="0" y2="-80" stroke="{body}" stroke-width="6"/>'
            f'<rect x="-36" y="-84" width="72" height="20" rx="6" fill="{body}"/>'
            f'<ellipse cx="0" cy="0" rx="84" ry="68" fill="{body}"/>'
            f'<ellipse cx="0" cy="0" rx="42" ry="68" fill="none" stroke="{rib}" stroke-width="6"/>'
            f'<line x1="0" y1="-68" x2="0" y2="68" stroke="{rib}" stroke-width="6"/>'
            f'<rect x="-36" y="64" width="72" height="20" rx="6" fill="{body}"/>'
            f'<path d="M-14 84 L-18 140 M0 84 L0 146 M14 84 L18 140" stroke="{body}" stroke-width="7" stroke-linecap="round"/></g>')


def rainbow(x, y, r, w):
    colours = ("#E40303", "#FF8C00", "#FFED00", "#008026", "#24408E", "#732982")
    return "".join(f'<path d="M{x - (r - i * w)} {y} A{r - i * w} {r - i * w} 0 0 1 {x + r - i * w} {y}" fill="none" stroke="{c}" stroke-width="{w + 0.5}"/>'
                   for i, c in enumerate(colours))


# in the mark's own units, so the r and the z share one sweep of light
GOLD = (f'<defs><linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="{XMIN}" y1="{YMAX}" x2="{XMAX}" y2="{YMIN}">'
        '<stop offset="0" stop-color="#F7E7A1"/><stop offset="0.5" stop-color="#D9B14A"/><stop offset="1" stop-color="#A67C2A"/></linearGradient></defs>')
DAWN = ('<defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#2B1F5C"/><stop offset="0.55" stop-color="#D9507A"/><stop offset="1" stop-color="#FFB36B"/></linearGradient></defs>')


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
    ("autumn", "#9A3412", "#FFF4E6", "",
     maple_leaf(Z_FLICK[0] + 4, Z_FLICK[1] - 140, 0.95, 18, "#F59E0B") + maple_leaf(R_TOP[0] - 120, R_TOP[1] - 70, 0.42, -32, "#FCD34D")
     + maple_leaf(860, 830, 0.36, 40, "#F59E0B")),
    ("lunar-new-year", "#B91C1C", "#F6D27A", "", lantern(Z_FLICK[0] + 4, Z_FLICK[1] - 150, 0.9, "#F6D27A", "#B91C1C")),
    ("st-patricks", "#15803D", "#FFFFFF", "", shamrock(Z_FLICK[0] + 6, Z_FLICK[1] - 128, 3.6, "#FFFFFF")),
    ("easter", "#CFE8F3", "#111111", "", egg(Z_FLICK[0] + 8, Z_FLICK[1] - 140, 0.95, "#F7B9C8", "#FFFFFF")),
    ("pride", "#000000", "#FFFFFF", "", rainbow(Z_FLICK[0] - 4, Z_FLICK[1] - 52, 120, 17)),
    # styles: any time of year
    ("light", "#F4F3EF", "#000000", "", ""),
    ("gold", "#000000", "url(#gold)", GOLD, ""),
    ("sunrise", "url(#dawn)", "#FFFFFF", DAWN, ""),
]


TITLES = {
    "halloween": "Halloween", "christmas": "Christmas", "new-year": "New Year", "valentines": "Valentine's",
    "spring": "Spring", "summer": "Summer", "winter": "Winter", "autumn": "Autumn", "lunar-new-year": "Lunar New Year",
    "st-patricks": "St Patrick's", "easter": "Easter", "pride": "Pride", "light": "Light", "gold": "Gold", "sunrise": "Sunrise",
}


def seasonal_icon(name, bg, ink, behind, front):
    return svg(C, behind + mark(C, SEASON_MARK, ink) + front, bg=bg)


def seasonal_android(name, bg, ink, behind, front):
    """Android draws the tile colour itself, so the foreground is transparent; everything sits in the
    safe zone (the inner 66 %), so it is shrunk about the centre."""
    k = 0.72
    # A gradient tile can't be an adaptive background colour, so it goes edge to edge in the foreground.
    sky = f'<rect width="{C}" height="{C}" fill="{bg}"/>' if bg.startswith("url(") else ""
    return svg(C, f'{sky}<g transform="translate({C/2} {C/2}) scale({k}) translate({-C/2} {-C/2})">{behind}{mark(C, SEASON_MARK, ink)}{front}</g>')


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
    print("wrote the logo, app icons, splash, favicon and", len(SEASONS), "seasonal icons and styles")


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

    names = ["Everyday"] + [TITLES[sn[0]] for sn in SEASONS]
    markups = [svg(C, mark(C, MARK, "#FFFFFF"), bg="#000000")] + [seasonal_icon(*sn) for sn in SEASONS]
    d.text((980, 620), "Seasonal icons and styles", fill="white", font=label)
    small_label = ImageFont.truetype(str(SANS), 22)
    for i, (n, m) in enumerate(zip(names, markups)):
        cx, cy = 980 + (i % 6) * 228, 680 + (i // 6) * 262
        tile(m, 190, cx, cy)
        tw = d.textlength(n, font=small_label)
        d.text((cx + (190 - tw) / 2, cy + 200), n, fill=(200, 200, 200), font=small_label)
    img.save(BRAND / "brand-sheet.png")


if __name__ == "__main__":
    main()
