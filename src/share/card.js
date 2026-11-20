// iTabs share card template: draws 1200x630 PNG link-preview cards in the Worker, with no
// image libraries. The fixed parts (background, blue edge, "Made with iTabs", gold and blue i
// badges) and the Inter letter shapes are made ahead of time by scripts/make-card-assets.py.
// Here we only place the changing text and save the PNG, using the platform's own compression.
// Cards are palette PNGs (one byte per pixel): the fixed parts use 150 colours, and text edges use
// ready-made blend shades (ramps), which keeps saving the PNG quick enough for a Worker.
// Same look as the talk deck cards (scripts/make-share-images.mjs).
//
// renderCard({ kind, kicker, title, sub, pill }) -> PNG bytes
//   kind:   "talk" (badges "From the talk" / "For my project"), "lesson" ("From the lesson" / "For my project")
//           or "video" ("From the video" / "For me")
//   kicker: small blue line, e.g. "My takeaway from"
//   title:  the big white text (shrinks to fit, up to 3 lines)
//   sub:    optional grey line, e.g. the channel name, or "Perth · Tuesday 17 November 2026"
//   pill:   optional label, as parts: [{ text: "Applied to: ", tone: "soft" }, { text: "Online shop" }]
// Never pass anything the reader typed: cards are public.
import TEMPLATE_TALK from "./assets/template-talk.png";
import TEMPLATE_VIDEO from "./assets/template-video.png";
import TEMPLATE_LESSON from "./assets/template-lesson.png";
import KICKER from "./assets/kicker.png";
import T66 from "./assets/t66.png";
import T56 from "./assets/t56.png";
import T48 from "./assets/t48.png";
import SUB from "./assets/sub.png";
import PILL from "./assets/pill.png";
import FONTS from "./assets/fonts.json";

const W = 1200, H = 630, X0 = 96, MAX_W = 1032, TOP = 64, BOTTOM = 500;
const TPL = FONTS._templates, LEVELS = 12;
// Which blend ramp each text style uses (see scripts/make-card-assets.py).
const RAMP = { kicker: "kicker", title: "title", sub: "sub", text: "pillText", soft: "pillSoft" };
const SHEETS = { kicker: KICKER, t66: T66, t56: T56, t48: T48, sub: SUB, pill: PILL };
const TEMPLATES = { talk: TEMPLATE_TALK, video: TEMPLATE_VIDEO, lesson: TEMPLATE_LESSON };

const bytes = (x) => (x instanceof Uint8Array ? x : new Uint8Array(x));
async function pipe(u8, stream) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer()); }

// Reads our own PNGs (every row written with filter 0) into raw pixels.
const decoded = new Map();
async function readPng(key, src) {
  if (decoded.has(key)) return decoded.get(key);
  const b = bytes(src), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let p = 8, w = 0, h = 0, ch = 0, plte = null; const idat = [];
  while (p < b.length) {
    const len = dv.getUint32(p), type = String.fromCharCode(...b.subarray(p + 4, p + 8));
    if (type === "IHDR") { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); ch = { 0: 1, 2: 3, 3: 1 }[b[p + 17]]; }
    if (type === "PLTE") plte = b.slice(p + 8, p + 8 + len);
    if (type === "IDAT") idat.push(b.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = await pipe(concat(idat), new DecompressionStream("deflate"));
  const stride = 1 + w * ch, px = new Uint8Array(w * h * ch);
  for (let y = 0; y < h; y++) px.set(raw.subarray(y * stride + 1, (y + 1) * stride), y * w * ch);
  const img = { w, h, ch, px, plte };
  decoded.set(key, img);
  return img;
}
function concat(parts) { const out = new Uint8Array(parts.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of parts) { out.set(x, o); o += x.length; } return out; }

// Keeps only characters we have shapes for (accents are folded, emoji and other scripts dropped).
export function cleanText(s, font = "t66", keepEdges = false) {
  const g = FONTS[font].glyphs;
  let out = "";
  for (const c of String(s || "").replace(/\s+/g, " ")) {
    if (g[c.codePointAt(0)]) out += c;
    else { const base = c.normalize("NFD").replace(/[̀-ͯ]/g, ""); if (base && [...base].every((x) => g[x.codePointAt(0)])) out += base; }
  }
  out = out.replace(/\s+/g, " ");
  return keepEdges ? out : out.trim();
}
const width = (font, s) => { let w = 0; for (const c of s) { const g = FONTS[font].glyphs[c.codePointAt(0)]; if (g) w += g[6]; } return w; };

function wrap(font, text, maxLines) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const next = line ? line + " " + words[i] : words[i];
    if (width(font, next) <= MAX_W || !line) { line = next; continue; }
    lines.push(line); line = words[i];
    if (lines.length === maxLines) return { lines: ellipsis(font, lines), cut: true };
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) return { lines: ellipsis(font, lines.slice(0, maxLines)), cut: true };
  // A single very long word: shorten that line.
  if (lines.some((l) => width(font, l) > MAX_W)) return { lines: lines.map((l) => (width(font, l) > MAX_W ? ellipsis(font, [l])[0] : l)), cut: true };
  return { lines, cut: false };
}
function ellipsis(font, lines) {
  const last = lines.length - 1;
  let s = lines[last];
  while (s && width(font, s + "…") > MAX_W) s = s.slice(0, -1);
  lines[last] = s.replace(/[\s,.:;–—-]+$/, "") + "…";
  return lines;
}

// Puts shade "level" (1..12) of a ramp at a pixel, keeping the stronger shade where letters overlap.
function shade(img, x, y, ramp, level) {
  if (x < 0 || y < 0 || x >= W || y >= H || level <= 0) return;
  const i = y * W + x, cur = img[i] - ramp;
  if (cur >= 0 && cur < LEVELS && cur + 1 >= level) return;
  img[i] = ramp + Math.min(LEVELS, level) - 1;
}

async function drawText(img, ramps, font, text, x, lineTop, lineH, style) {
  const ramp = ramps[RAMP[style]];
  const m = FONTS[font], sheet = await readPng(font, SHEETS[font]);
  const baseline = Math.round(lineTop + (lineH - (m.ascent + m.descent)) / 2 + m.ascent);
  let pen = x;
  for (const c of text) {
    const g = m.glyphs[c.codePointAt(0)];
    if (!g) continue;
    const [gx, gy, gw, gh, l, t, adv] = g;
    const ox = Math.round(pen + l), oy = baseline + t;
    for (let yy = 0; yy < gh; yy++) {
      const row = (gy + yy) * sheet.w + gx;
      for (let xx = 0; xx < gw; xx++) { const a = sheet.px[row + xx]; if (a) shade(img, ox + xx, oy + yy, ramp, Math.round(a * LEVELS / 255)); }
    }
    pen += adv;
  }
  return pen;
}

// Rounded rectangle with smooth edges: fill plus a border (drawn over the plain card colour).
function pillShape(img, ramps, x, y, w, h, border) {
  const r = h / 2;
  for (let yy = Math.floor(y) - 1; yy <= Math.ceil(y + h) + 1; yy++) {
    for (let xx = Math.floor(x) - 1; xx <= Math.ceil(x + w) + 1; xx++) {
      const px = xx + 0.5, py = yy + 0.5;
      const dx = Math.max(x + r - px, 0, px - (x + w - r)), dy = Math.max(y + r - py, 0, py - (y + h - r));
      const d = Math.hypot(dx, dy) - r;                         // < 0 inside the outer edge
      const outer = Math.min(1, Math.max(0, 0.5 - d));
      if (!outer) continue;
      const inner = Math.min(1, Math.max(0, 0.5 - (d + border)));
      const i = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (inner > 0) img[i] = ramps.pillFill + Math.max(1, Math.round(inner * LEVELS)) - 1;    // fill over border
      else img[i] = ramps.pillBorder + Math.max(1, Math.round(outer * LEVELS)) - 1;          // border over card
    }
  }
}

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
  dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8); dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
async function encodePng(img, plte) {
  const stride = 1 + W, raw = new Uint8Array(H * stride);
  for (let y = 0; y < H; y++) raw.set(img.subarray(y * W, (y + 1) * W), y * stride + 1);
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H); ihdr.set([8, 3, 0, 0, 0], 8);
  return concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("PLTE", plte),
    chunk("IDAT", await pipe(raw, new CompressionStream("deflate"))), chunk("IEND", new Uint8Array(0))]);
}

export async function renderCard({ kind = "talk", kicker = "", title = "", sub = "", pill = null }) {
  kind = TEMPLATES[kind] ? kind : "talk";
  const base = await readPng("tpl-" + kind, TEMPLATES[kind]), ramps = TPL[kind].ramps;
  const img = base.px.slice();                    // a fresh copy of the background (palette indexes)
  const k = cleanText(kicker, "kicker"), s = cleanText(sub, "sub");
  const parts = (pill || []).map((p) => ({ ...p, text: cleanText(p.text, "pill", true) })).filter((p) => p.text.trim());
  const t = cleanText(title, "t66") || "iTabs";
  const below = (s ? 16 + 34 : 0) + (parts.length ? 26 + 62 : 0);
  // Biggest title size that fits; long titles shrink and, at the smallest size, get "…".
  let pick;
  for (const [font, size, maxLines] of [["t66", 66, 2], ["t56", 56, 3], ["t48", 48, 3]]) {
    const lh = Math.round(size * 1.08), w = wrap(font, t, maxLines);
    const room = Math.floor((BOTTOM - (TOP + 41 + 18) - below) / lh);
    if (!w.cut && w.lines.length <= room) { pick = { font, lh, lines: w.lines }; break; }
    if (font === "t48") pick = { font, lh, lines: wrap(font, t, Math.max(1, Math.min(maxLines, room))).lines };
  }
  let y = TOP;
  if (k) await drawText(img, ramps, "kicker", k, X0, y, 41, "kicker");
  y += 41 + 18;
  for (const line of pick.lines) { await drawText(img, ramps, pick.font, line, X0, y, pick.lh, "title"); y += pick.lh; }
  if (s) { y += 16; await drawText(img, ramps, "sub", s, X0, y, 34, "sub"); y += 34; }
  if (parts.length) {
    y += 26;
    const textW = parts.reduce((n, p) => n + width("pill", p.text), 0);
    pillShape(img, ramps, X0, y, Math.min(MAX_W, textW + 48 + 4), 62, 2);
    let x = X0 + 26;
    for (const p of parts) x = await drawText(img, ramps, "pill", p.text, x, y + 14, 34, p.tone === "soft" ? "soft" : "text");
  }
  return encodePng(img, base.plte);
}
