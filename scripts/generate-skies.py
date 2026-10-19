"""Renders the weather backgrounds in assets/weather as JPEGs.

Run with `npm run skies`. Each sky is a colour gradient, a sun or moon glow,
stars at night, and clouds made from layered noise (fractal Brownian motion)
lit from above, so their tops are bright and their bellies grey, like the
iPhone Weather app. Seeds are fixed, so the output is the same every run.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

W, H = 1000, 1600
OUT = Path(__file__).resolve().parent.parent / "assets" / "weather"


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def gradient(stops):
    """Vertical gradient through (position, colour) stops."""
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    img = np.zeros((H, 1, 3), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        t = np.clip((y - p0) / (p1 - p0), 0, 1)
        t = t * t * (3 - 2 * t)
        mask = (y >= p0) & (y <= p1)
        img = np.where(mask[..., None], hex_rgb(c0) * (1 - t[..., None]) + hex_rgb(c1) * t[..., None], img)
    return np.repeat(img, W, axis=1)


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
# Coordinates in screen heights, so features are round whatever the image size.
NX, NY = XX / H, YY / H


def value_noise(table, x, y):
    """Smooth value noise: random values on a lattice, blended with a quintic curve."""
    ix, iy = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - ix, y - iy
    ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    n = table.shape[0]
    a = table[iy % n, ix % n]
    b = table[iy % n, (ix + 1) % n]
    c = table[(iy + 1) % n, ix % n]
    d = table[(iy + 1) % n, (ix + 1) % n]
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy


def fbm_at(rng, x, y, octaves, fx, fy):
    """Fractal noise in about 0..1. Each octave is turned a little so the lattice never shows."""
    table = rng.random((256, 256)).astype(np.float32)
    total = np.zeros_like(x)
    amp, norm, freq = 1.0, 0.0, 1.0
    for _ in range(octaves):
        angle = rng.uniform(-0.35, 0.35)
        ca, sa = np.cos(angle), np.sin(angle)
        ox, oy = rng.uniform(0, 200, 2)
        rx = (x * ca - y * sa) * fx * freq + ox
        ry = (x * sa + y * ca) * fy * freq + oy
        total += value_noise(table, rx, ry) * amp
        norm += amp
        amp *= 0.5
        freq *= 2.03
    return total / norm


def fbm(rng, octaves=7, fx=2.2, fy=5.0, warp=0.35):
    """Billowy fractal noise: wider than tall, and warped by more noise so edges curl."""
    if warp:
        wx = fbm_at(rng, NX, NY, 4, 1.5, 3.0)
        wy = fbm_at(rng, NX, NY, 4, 1.5, 3.0)
        return fbm_at(rng, NX + (wx - 0.5) * warp, NY + (wy - 0.5) * warp * 0.6, octaves, fx, fy)
    return fbm_at(rng, NX, NY, octaves, fx, fy)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def _box(a, r, axis):
    """Box blur of radius r along one axis, via a running sum (edges clamped)."""
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
    hi = np.take(c, range(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, range(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a, radius):
    """Approximate Gaussian blur: three box blurs in each direction."""
    r = max(1, int(round(radius * 0.58)))
    for _ in range(3):
        a = _box(_box(a, r, 0), r, 1)
    return a


def clouds(img, rng, coverage, light, dark, opacity=1.0, scale=1.0, top_bias=0.0, octaves=6, softness=0.16, contrast=1.0, warp=0.25):
    """
    Lit clouds. coverage 0..1; top_bias puts more cloud near the top.
    contrast sets how strongly the tops catch the light: high for fair-weather
    cumulus, low for a flat grey overcast.
    """
    d = fbm(rng, octaves=octaves, fx=2.0 * scale, fy=3.2 * scale, warp=warp)
    d = (d - d.mean()) / (d.std() * 4) + 0.5  # spread to roughly 0..1 so coverage means what it says
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    d = d + top_bias * (0.5 - y)
    threshold = 1 - coverage
    alpha = smoothstep(threshold - softness / 2, threshold + softness / 2, d)
    # Light from above, judged on the cloud's broad shape: where it thickens
    # downward it faces the sky and is bright; its belly is in shadow.
    shape = blur(d, 14)
    shift = 40
    below = np.vstack([shape[shift:], np.repeat(shape[-1:], shift, axis=0)])
    lit = np.clip(0.55 + (shape - below) * 7 * contrast, 0, 1)
    # Thick cores are darker, thin edges glow.
    thickness = smoothstep(threshold, threshold + 0.4, blur(d, 6))
    lit = np.clip(lit * (1 - 0.35 * thickness * contrast) + (1 - thickness) * 0.15, 0, 1)
    lit = blur(lit, 2)
    colour = dark * (1 - lit[..., None]) + light * lit[..., None]
    a = (blur(alpha, 1.2) * opacity)[..., None]
    return img * (1 - a) + colour * a


def wisps(img, rng, colour, opacity):
    """Thin high cirrus streaks."""
    d = fbm(rng, octaves=6, fx=0.8, fy=9.0, warp=0.6)
    d = (d - d.mean()) / (d.std() * 4) + 0.5
    alpha = smoothstep(0.62, 0.85, d) * opacity
    return img * (1 - alpha[..., None]) + colour * alpha[..., None]


def glow(img, cx, cy, radius, colour, strength):
    dist = np.sqrt((XX - cx * W) ** 2 + (YY - cy * H) ** 2) / (radius * W)
    a = np.exp(-dist * dist) * strength
    return img + colour * a[..., None]


def disc(img, cx, cy, r, colour):
    dist = np.sqrt((XX - cx * W) ** 2 + (YY - cy * H) ** 2)
    a = smoothstep(r + 1.5, r - 1.5, dist)
    return img * (1 - a[..., None]) + colour * a[..., None]


def stars(img, rng, count, max_y=0.8):
    layer = np.zeros((H, W), np.float32)
    xs = rng.integers(0, W, count)
    ys = (rng.random(count) ** 1.4 * H * max_y).astype(int)
    layer[ys, xs] = rng.random(count) ** 2.5
    bright = Image.fromarray((layer * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
    layer = np.maximum(layer, np.asarray(bright, np.float32) / 255 * 3)
    return img + np.clip(layer, 0, 1)[..., None] * hex_rgb("#F2F5FF")


def fog_bands(img, rng, colour, opacity):
    d = fbm(rng, octaves=5, fx=0.7, fy=6.0, warp=0.5)
    d = (d - d.mean()) / (d.std() * 4) + 0.5
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    alpha = smoothstep(0.35, 0.75, d) * opacity * (0.4 + 0.6 * y)
    return img * (1 - alpha[..., None]) + colour * alpha[..., None]


def finish(img, rng, name):
    img = img + (rng.random((H, W, 1)) - 0.5) * 0.012  # a little grain against banding
    vignette = 1 - 0.18 * (((XX / W - 0.5) * 1.6) ** 2 + ((YY / H - 0.4) * 1.1) ** 2)
    img = np.clip(img * vignette[..., None], 0, 1)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.jpg"
    Image.fromarray((img * 255).astype(np.uint8)).save(path, quality=80, optimize=True, progressive=True)
    print(f"assets/weather/{path.name}  {path.stat().st_size // 1024} KB")


def main():
    white = hex_rgb("#FFFFFF")

    rng = np.random.default_rng(1)
    img = gradient([(0, "#1B5BB0"), (0.55, "#4B8FDB"), (1, "#A7CFF2")])
    img = glow(img, 0.82, 0.06, 0.55, hex_rgb("#FFF6DA"), 0.55)
    img = glow(img, 0.82, 0.06, 0.12, hex_rgb("#FFFFFF"), 0.9)
    img = wisps(img, rng, white, 0.35)
    finish(img, rng, "clear_day")

    rng = np.random.default_rng(2)
    img = gradient([(0, "#03081A"), (0.6, "#0C1834"), (1, "#1E3154")])
    img = stars(img, rng, 900)
    img = glow(img, 0.78, 0.1, 0.3, hex_rgb("#9FB4E0"), 0.25)
    img = disc(img, 0.78, 0.1, 34, hex_rgb("#F4F1E6"))
    finish(img, rng, "clear_night")

    rng = np.random.default_rng(3)
    img = gradient([(0, "#2164B8"), (0.6, "#5596DD"), (1, "#A9CDEE")])
    img = glow(img, 0.8, 0.05, 0.5, hex_rgb("#FFF3D6"), 0.4)
    img = clouds(img, rng, 0.4, hex_rgb("#FFFFFF"), hex_rgb("#A4B4C8"), top_bias=0.25, scale=0.9)
    finish(img, rng, "partly_day")

    rng = np.random.default_rng(4)
    img = gradient([(0, "#050B1E"), (0.6, "#0F1C38"), (1, "#22355A")])
    img = stars(img, rng, 600)
    img = clouds(img, rng, 0.38, hex_rgb("#4C5A78"), hex_rgb("#151D2E"), top_bias=0.25, scale=0.9)
    finish(img, rng, "partly_night")

    rng = np.random.default_rng(5)
    img = gradient([(0, "#5A6A7E"), (0.6, "#7F8EA1"), (1, "#A9B5C3")])
    img = clouds(img, rng, 0.8, hex_rgb("#DDE3EA"), hex_rgb("#6E7A89"), softness=0.4, contrast=0.55, octaves=5, scale=0.8)
    finish(img, rng, "cloudy_day")

    rng = np.random.default_rng(6)
    img = gradient([(0, "#0D121B"), (0.6, "#18202C"), (1, "#28313F")])
    img = clouds(img, rng, 0.8, hex_rgb("#3E4859"), hex_rgb("#141A24"), softness=0.4, contrast=0.5, octaves=5, scale=0.8)
    finish(img, rng, "cloudy_night")

    rng = np.random.default_rng(7)
    img = gradient([(0, "#3A4552"), (0.6, "#56626F"), (1, "#717D8A")])
    img = clouds(img, rng, 0.88, hex_rgb("#8E99A6"), hex_rgb("#343D48"), softness=0.45, contrast=0.45, octaves=5, scale=0.7)
    finish(img, rng, "rain_day")

    rng = np.random.default_rng(8)
    img = gradient([(0, "#0A0F16"), (0.6, "#141B25"), (1, "#212A36")])
    img = clouds(img, rng, 0.88, hex_rgb("#323B4A"), hex_rgb("#0C1118"), softness=0.45, contrast=0.45, octaves=5, scale=0.7)
    finish(img, rng, "rain_night")

    rng = np.random.default_rng(9)
    img = gradient([(0, "#171B22"), (0.6, "#262C36"), (1, "#383F4B")])
    img = clouds(img, rng, 0.92, hex_rgb("#646A7A"), hex_rgb("#121519"), softness=0.4, contrast=0.8, octaves=5, scale=0.65, warp=0.4)
    img = glow(img, 0.3, 0.35, 0.35, hex_rgb("#B9B6E8"), 0.12)
    finish(img, rng, "storm")

    rng = np.random.default_rng(10)
    img = gradient([(0, "#8796A8"), (0.6, "#AEBBC9"), (1, "#D7DFE8")])
    img = clouds(img, rng, 0.85, hex_rgb("#F2F5F8"), hex_rgb("#A2AEBC"), softness=0.45, contrast=0.4, octaves=5, scale=0.7)
    finish(img, rng, "snow_day")

    rng = np.random.default_rng(11)
    img = gradient([(0, "#1B2232"), (0.6, "#2C3749"), (1, "#45526A")])
    img = clouds(img, rng, 0.85, hex_rgb("#5A6780"), hex_rgb("#1E2533"), softness=0.45, contrast=0.4, octaves=5, scale=0.7)
    finish(img, rng, "snow_night")

    rng = np.random.default_rng(12)
    img = gradient([(0, "#8F99A4"), (0.6, "#B3BAC2"), (1, "#CCD1D6")])
    img = fog_bands(img, rng, hex_rgb("#E6E9EC"), 0.7)
    finish(img, rng, "fog_day")

    rng = np.random.default_rng(13)
    img = gradient([(0, "#22282F"), (0.6, "#343B44"), (1, "#4A525C")])
    img = fog_bands(img, rng, hex_rgb("#6D7680"), 0.6)
    finish(img, rng, "fog_night")


if __name__ == "__main__":
    main()
