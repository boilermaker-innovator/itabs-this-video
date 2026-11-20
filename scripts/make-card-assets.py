"""Builds the assets for the share card template (src/share/assets/).

The Worker draws share cards (1200x630 PNG link previews) itself, without image libraries:
  - template-talk.png / template-video.png / template-lesson.png: the fixed parts (background, card, blue edge, "Made with iTabs", gold and blue i badges)
  - <font>.png + fonts.json: Inter letter shapes and their sizes, for the text that changes
All PNGs are written with "no filter" rows so the Worker can read them cheaply. The templates are
palette PNGs (one byte per pixel): 150 colours for the fixed parts plus 7 blend ramps for the text
and the pill. That makes the Worker's PNG a third of the size of full colour, so it is quick to save.
The look matches the talk deck cards made by scripts/make-share-images.mjs.

Run: python3 scripts/make-card-assets.py   (needs Pillow and the Inter .otf fonts)
"""
import json, os, struct, zlib
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "share", "assets")
INTER = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
W, H, S = 1200, 630, 3  # S = supersampling for smooth edges

C = dict(page=(11, 12, 15), card=(18, 20, 25), border=(34, 37, 44), stripe=(37, 99, 235), muted=(163, 168, 179),
         text=(244, 245, 247), chip=(35, 38, 45), gold=(245, 158, 11), blue=(96, 165, 250))

# Text that changes per card: (key, Inter style, px size)
FONTS = [("kicker", "SemiBold", 34), ("t66", "ExtraBold", 66), ("t56", "ExtraBold", 56), ("t48", "ExtraBold", 48),
         ("sub", "Medium", 28), ("pill", "SemiBold", 28)]
CHARS = [chr(c) for c in range(32, 127)] + [chr(c) for c in range(160, 256)] + list("‘’“”–—…•·€™✓")


def png(path, mode, img, palette=None):
    """Write a PNG whose rows all use filter 0 (none). mode "P" needs a palette (list of RGB)."""
    w, h = img.size
    ch = {"L": 1, "RGB": 3, "P": 1}[mode]
    raw = img.tobytes()
    rows = b"".join(b"\x00" + raw[y * w * ch:(y + 1) * w * ch] for y in range(h))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, {"L": 0, "RGB": 2, "P": 3}[mode], 0, 0, 0)
    plte = chunk(b"PLTE", bytes(v for c in palette for v in c)) if palette else b""
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + plte + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


LEVELS = 12
# Blend ramps: (name, foreground, background). Level j of LEVELS = background + (fg - bg) * j / LEVELS.
RAMPS = [("kicker", (96, 165, 250), "card"), ("title", (244, 245, 247), "card"), ("sub", (163, 168, 179), "card"),
         ("pillText", (244, 245, 247), (19, 36, 77)), ("pillSoft", (147, 197, 253), (19, 36, 77)),
         ("pillBorder", (37, 99, 235), "card"), ("pillFill", (19, 36, 77), (37, 99, 235))]


def palette_template(rgb):
    """150-colour version of the fixed parts, plus the blend ramps, as one shared palette."""
    q = rgb.quantize(colors=150, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = [tuple(q.getpalette()[i * 3:i * 3 + 3]) for i in range(150)]
    # Make sure the card colour is exact: the Worker draws text only over it.
    card = min(range(150), key=lambda i: sum((a - b) ** 2 for a, b in zip(pal[i], C["card"])))
    pal[card] = C["card"]
    ramps = {}
    for name, fg, bg in RAMPS:
        bg = C[bg] if isinstance(bg, str) else bg
        ramps[name] = len(pal)
        pal += [tuple(round(b + (f - b) * j / LEVELS) for f, b in zip(fg, bg)) for j in range(1, LEVELS + 1)]
    return q, pal, {"card": card, "levels": LEVELS, "ramps": ramps}


def font(style, px): return ImageFont.truetype(INTER.format(style), px)


def template(chip_labels):
    big = Image.new("RGB", (W * S, H * S), C["page"])
    d = ImageDraw.Draw(big)
    box = (24 * S, 24 * S, (W - 24) * S - 1, (H - 24) * S - 1)
    d.rounded_rectangle(box, radius=28 * S, fill=C["border"])
    d.rounded_rectangle((26 * S, 26 * S, (W - 26) * S - 1, (H - 26) * S - 1), radius=26 * S, fill=C["card"])
    # Blue edge: a 14px strip down the left, following the card's rounded corners.
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(box, radius=28 * S, fill=255)
    strip = Image.new("L", big.size, 0)
    ImageDraw.Draw(strip).rectangle((24 * S, 24 * S, 38 * S - 1, (H - 24) * S - 1), fill=255)
    big.paste(Image.new("RGB", big.size, C["stripe"]), (0, 0), _and(mask, strip))
    # Footer: "Made with iTabs" on the left, the gold and blue i badges on the right.
    y_mid = (H - 56 - 28) * S  # centre of the 56px-high badges, 56px above the bottom edge
    f_med, f_xb, f_chip = font("Medium", 28 * S), font("ExtraBold", 28 * S), font("SemiBold", 24 * S)
    x = 96 * S
    d.text((x, y_mid), "Made with ", font=f_med, fill=C["muted"], anchor="lm")
    d.text((x + d.textlength("Made with ", font=f_med), y_mid), "iTabs", font=f_xb, fill=C["text"], anchor="lm")
    f_i = font("ExtraBoldItalic", 23 * S)
    right = (W - 72) * S
    chips = [(chip_labels[0], C["gold"]), (chip_labels[1], C["blue"])]
    widths = [(12 + 36 + 12) * S + d.textlength(t, font=f_chip) + 22 * S for t, _ in chips]
    x = right - sum(widths) - 14 * S
    for (label, col), w in zip(chips, widths):
        d.rounded_rectangle((x, y_mid - 28 * S, x + w, y_mid + 28 * S), radius=28 * S, fill=C["chip"])
        cx = x + (12 + 18) * S
        d.ellipse((cx - 18 * S, y_mid - 18 * S, cx + 18 * S, y_mid + 18 * S), fill=col)
        d.text((cx, y_mid + 1 * S), "i", font=f_i, fill=(0, 0, 0), anchor="mm")
        d.text((x + (12 + 36 + 12) * S, y_mid), label, font=f_chip, fill=C["text"], anchor="lm")
        x += w + 14 * S
    return big.resize((W, H), Image.LANCZOS)


def _and(a, b):
    from PIL import ImageChops
    return ImageChops.multiply(a, b)


def atlas(style, px):
    f = font(style, px)
    ascent, descent = f.getmetrics()
    glyphs, imgs = {}, []
    for ch in CHARS:
        if ch != " " and f.getmask(ch).getbbox() is None:
            continue  # the font has no shape for this character
        l, t, r, b = f.getbbox(ch, anchor="ls")  # relative to the baseline
        adv = f.getlength(ch)
        w, h = max(0, r - l), max(0, b - t)
        g = Image.new("L", (max(w, 1), max(h, 1)), 0)
        if w and h:
            ImageDraw.Draw(g).text((-l, -t), ch, font=f, fill=255, anchor="ls")
        imgs.append((ch, g, w, h, l, t, adv))
    # Pack into rows of a 1024px-wide sheet.
    x = y = row_h = 0
    places = []
    for ch, g, w, h, l, t, adv in imgs:
        if x + w > 1024:
            x, y, row_h = 0, y + row_h + 1, 0
        places.append((x, y)); x += w + 1; row_h = max(row_h, h)
    sheet = Image.new("L", (1024, y + row_h + 1), 0)
    for (ch, g, w, h, l, t, adv), (gx, gy) in zip(imgs, places):
        if w and h: sheet.paste(g, (gx, gy))
        glyphs[str(ord(ch))] = [gx, gy, w, h, l, t, round(adv, 2)]
    return sheet, {"size": px, "ascent": ascent, "descent": descent, "glyphs": glyphs}


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    info = {}
    for name, labels in [("talk", ("From the talk", "For my project")), ("video", ("From the video", "For me")),
                         ("lesson", ("From the lesson", "For my project"))]:
        q, pal, info[name] = palette_template(template(labels))
        png(os.path.join(OUT, "template-%s.png" % name), "P", q, pal)
    if os.path.exists(os.path.join(OUT, "template.png")): os.remove(os.path.join(OUT, "template.png"))
    meta = {}
    for key, style, px in FONTS:
        sheet, m = atlas(style, px)
        png(os.path.join(OUT, key + ".png"), "L", sheet)
        meta[key] = m
    meta["_templates"] = info
    with open(os.path.join(OUT, "fonts.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    for n in sorted(os.listdir(OUT)):
        print(n, os.path.getsize(os.path.join(OUT, n)) // 1024, "KB")
