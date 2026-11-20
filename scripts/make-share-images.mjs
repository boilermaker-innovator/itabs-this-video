// R&D: draws the 1200x630 share preview images for /rnd/share-card (one per project type).
// Facebook and LinkedIn need a real PNG/JPG, and a Worker can't draw PNGs without extra
// libraries, so the images are drawn here ahead of time. They only depend on the talk and the
// project type (nothing personal), so 5 images per talk cover every deck.
// Flat colours (no gradients) keep each PNG small without any extra compression step.
// Run: node scripts/make-share-images.mjs   (needs Playwright + Chromium, and the Inter font)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const TALKS = {
  rye: { speaker: "Rye Smith", title: "Getting found by AI: how Spruik runs SEO with Claude" },
};
const TYPES = { cafe: "Cafe or food", trades: "Trades", shop: "Online shop", startup: "Startup or app", other: "Other" };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const page = (t, type) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#0b0c0f;font-family:Inter,sans-serif;color:#f4f5f7}
.wrap{position:relative;width:1200px;height:630px;padding:64px 72px 56px 96px;display:flex;flex-direction:column}
.wrap:before{content:"";position:absolute;inset:24px;border:2px solid #22252c;border-radius:28px;background:#121419}
.wrap:after{content:"";position:absolute;left:24px;top:24px;bottom:24px;width:14px;border-radius:28px 0 0 28px;background:#2563eb}
.wrap>*{position:relative}
.who{font-size:34px;font-weight:600;color:#60a5fa;letter-spacing:-.2px}
h1{margin-top:18px;font-size:66px;line-height:1.08;font-weight:800;letter-spacing:-1.5px;max-width:1010px}
.pill{align-self:flex-start;margin-top:30px;padding:12px 24px;border-radius:999px;background:#13244d;border:2px solid #2563eb;font-size:28px;font-weight:600}
.pill b{color:#93c5fd;font-weight:600}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center}
.brand{font-size:28px;color:#a3a8b3;font-weight:500}.brand b{color:#f4f5f7;font-weight:800}
.ibs{display:flex;gap:14px}
.ib{display:flex;align-items:center;gap:12px;background:#23262d;padding:10px 22px 10px 12px;border-radius:999px;font-size:24px;font-weight:600}
.ib span{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font:italic 700 23px Georgia,serif;color:#000}
.g span{background:#f59e0b}.b span{background:#60a5fa}
</style></head><body><div class="wrap">
<div class="who">My takeaway from ${esc(t.speaker)}'s talk</div>
<h1>${esc(t.title)}</h1>
<div class="pill"><b>Applied to:</b> ${esc(type)}</div>
<div class="foot"><div class="brand">Made with <b>iTabs</b></div>
<div class="ibs"><div class="ib g"><span>i</span>From the talk</div><div class="ib b"><span>i</span>For my project</div></div></div>
</div></body></html>`;

const out = new URL("../src/rnd/share/", import.meta.url);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const [slug, t] of Object.entries(TALKS)) {
  for (const [key, label] of Object.entries(TYPES)) {
    await p.setContent(page(t, label));
    await p.evaluate(() => document.fonts.ready);
    const file = new URL(`${slug}-${key}.png`, out);
    await p.screenshot({ path: file.pathname, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log("Wrote", file.pathname.split("/src/")[1]);
  }
}
await b.close();
