// Offline tests: run the real worker with in-memory KV and a scripted Gemini/YouTube.
import test from "node:test";
import assert from "node:assert/strict";
import worker, { validateDeck, parseVideoId, renderDeck } from "../dist/worker.js";

function memKV() {
  const m = new Map();
  return { m, async get(k) { return m.has(k) ? m.get(k).v : null; }, async put(k, v, o = {}) { m.set(k, { v, o }); },
    async list({ prefix = "" } = {}) { return { keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: m.get(name).o.metadata })), list_complete: true }; } };
}
const card = (i, extra = {}) => ({
  band: `Point ${i}`, colors: "#1e3a8a,#38bdf8", time: `${i}:05`, seconds: i * 60 + 5,
  headline: "A short headline here", summary: "One sentence. Two sentences.",
  buttons: [{ you: true, title: "For your van", text: "• Do this\n• Then that" }, { title: "Definition", type: "Definition", text: "Background." }],
  ...extra,
});
const goodDeck = (n = 7) => ({ videoTitle: "T", channel: "C", videoId: "x", durationSeconds: 600, forWho: "a coffee van owner in Perth", youLabel: "For your van", cards: Array.from({ length: n }, (_, i) => card(i + 1)) });

// Scripted fetch: queue of Gemini replies; YouTube oEmbed + watch page canned.
let geminiQueue = [], calls = [], ytSeconds = 600, ytStatus = 200;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  calls.push({ url, body: init.body });
  if (url.includes("/oembed")) return ytStatus === 200 ? Response.json({ title: "Real Title", author_name: "Real Channel" }) : new Response("", { status: ytStatus });
  if (url.includes("youtube.com/watch")) return new Response(`..."lengthSeconds":"${ytSeconds}"...`);
  if (url.endsWith("/v1beta/models?pageSize=1000")) return Response.json({ models: [
    { name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-9-flash-preview", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.8-flash-lite", supportedGenerationMethods: ["generateContent"] },
  ] });
  if (url.includes(":generateContent")) {
    const next = geminiQueue.shift();
    if (!next) throw new Error("unexpected Gemini call");
    if (next.status) return new Response(next.text || "{}", { status: next.status });
    return Response.json({ candidates: [{ content: { parts: [{ text: typeof next === "string" ? next : JSON.stringify(next) }] } }] });
  }
  throw new Error("unexpected fetch " + url);
};

const env = () => ({ GEMINI_API_KEY: "k", GEMINI_MODEL: "auto", DECKS: memKV() });
const post = (e, body, ip = "1.2.3.4") => worker.fetch(new Request("https://x.dev/api/make", {
  method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) }), e);
const base = { url: "https://youtu.be/dQw4w9WgXcQ?si=abc", about: "I run a coffee van in Perth", lang: "en" };
test.beforeEach(() => { geminiQueue = []; calls = []; ytSeconds = 600; ytStatus = 200; });

test("parses YouTube links", () => {
  assert.equal(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "dQw4w9WgXcQ");
  assert.equal(parseVideoId("youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(parseVideoId("https://m.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(parseVideoId("https://vimeo.com/123"), null);
});

test("happy path: makes, saves and serves a deck", async () => {
  const e = env();
  geminiQueue.push(goodDeck());
  const r = await post(e, base); const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.match(j.path, /^\/d\/[A-Za-z0-9]{8}$/);
  const g = calls.find((c) => c.url.includes(":generateContent"));
  assert.ok(g.url.includes("/models/gemini-3.8-flash:generateContent"), "picks newest stable flash: " + g.url);
  const sent = JSON.parse(g.body);
  assert.equal(sent.contents[0].parts[0].fileData.fileUri, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(sent.generationConfig.responseMimeType, "application/json");
  const page = await worker.fetch(new Request("https://x.dev" + j.path), e);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.ok(html.includes('"videoTitle": "Real Title"') && html.includes('"videoId": "dQw4w9WgXcQ"'));
  assert.ok(html.includes("Any YouTube video, applied to you."));
});

test("invalid JSON is retried once, with the errors sent back", async () => {
  const e = env();
  const bad = goodDeck(); bad.cards[2].buttons.reverse();
  geminiQueue.push("not json at all", goodDeck());
  let r = await post(e, base); assert.equal(r.status, 200); assert.equal((await r.json()).attempts, 2);
  geminiQueue.push(bad, bad);
  r = await post(e, base, "9.9.9.9"); assert.equal(r.status, 502);
  const second = JSON.parse(calls.filter((c) => c.url.includes(":generateContent")).at(-1).body);
  assert.match(second.contents[0].parts.at(-1).text, /must be first/);
});

test("unreadable video asks for transcript; transcript retry works", async () => {
  const e = env();
  geminiQueue.push({ status: 400, text: '{"error":{"message":"Cannot fetch content from the provided URL."}}' });
  let r = await post(e, base); let j = await r.json();
  assert.equal(j.needTranscript, true);
  geminiQueue.push(goodDeck());
  r = await post(e, { ...base, transcript: "0:00 hello ".repeat(40) }); j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  const sent = JSON.parse(calls.filter((c) => c.url.includes(":generateContent")).at(-1).body);
  assert.equal(sent.contents[0].parts.length, 1);
  assert.match(sent.contents[0].parts[0].text, /<transcript>/);
});

test("rejects videos over 60 minutes before calling Gemini", async () => {
  ytSeconds = 3700;
  const r = await post(env(), base); const j = await r.json();
  assert.equal(r.status, 400); assert.match(j.error, /under 60 minutes/);
  assert.ok(!calls.some((c) => c.url.includes(":generateContent")));
});

test("3 decks per hour per visitor, 50 per day total", async () => {
  const e = env();
  for (let i = 0; i < 3; i++) { geminiQueue.push(goodDeck()); assert.equal((await post(e, base)).status, 200); }
  const r = await post(e, base); assert.equal(r.status, 429); assert.match((await r.json()).error, /3 iTabs an hour/);
  geminiQueue.push(goodDeck()); assert.equal((await post(e, base, "5.5.5.5")).status, 200, "other visitors still allowed");
  const day = new Date().toISOString().slice(0, 10);
  await e.DECKS.put(`n:decks:${day}`, "50");
  const r2 = await post(e, base, "6.6.6.6"); assert.equal(r2.status, 429); assert.match((await r2.json()).error, /today's limit/);
});

test("input checks give clear errors", async () => {
  const e = env();
  assert.match((await (await post(e, { ...base, url: "https://vimeo.com/1" })).json()).error, /YouTube link/);
  assert.match((await (await post(e, { ...base, about: "x".repeat(301) })).json()).error, /300/);
  assert.match((await (await post(e, { ...base, about: "" })).json()).error, /who's watching/);
  ytStatus = 404;
  assert.match((await (await post(e, base)).json()).error, /couldn't find that video/);
});

test("validator rejects unsafe colours/seconds and wrong card counts", () => {
  const d = goodDeck(); d.cards[0].colors = "red;}</style><script>"; d.cards[1].seconds = "1);alert(1";
  const v = validateDeck(d); assert.equal(v.ok, false); assert.ok(v.errors.some((x) => /colors/.test(x)));
  const d2 = goodDeck(); d2.cards[1].seconds = "1);alert(1"; const v2 = validateDeck(d2); assert.equal(v2.ok, true); assert.equal(v2.data.cards[1].seconds, 125);
  assert.equal(validateDeck(goodDeck(5)).ok, false); assert.equal(validateDeck(goodDeck(11)).ok, false);
});

test("injected data can't break out of the script tag", () => {
  const v = validateDeck(goodDeck()).data; v.cards[0].summary = "</script><script>alert(1)</script> ";
  const html = renderDeck(v);
  assert.equal(html.split("</script>").length, 2);
  assert.ok(html.includes("/* ===== ONLY EDIT THIS DATA BLOCK ===== */") && html.includes("/* ===== END DATA BLOCK ===== */"));
});

test("unknown deck and unknown page show friendly pages", async () => {
  const r = await worker.fetch(new Request("https://x.dev/d/nope1234"), env());
  assert.equal(r.status, 404); assert.match(await r.text(), /Deck not found/);
  const r2 = await worker.fetch(new Request("https://x.dev/"), env());
  assert.match(await r2.text(), /Make my iTabs/);
});

const get = (e, path, init) => worker.fetch(new Request("https://x.dev" + path, init), e);

test("deck page has link preview tags, Share, feedback and Make your own", async () => {
  const e = env(); geminiQueue.push(goodDeck());
  const { path } = await (await post(e, base)).json();
  const html = await (await get(e, path)).text();
  assert.match(html, /<meta property="og:title" content="Real Title">/);
  assert.match(html, /<meta property="og:description" content="Personalised for a coffee van owner in Perth · Any YouTube video, applied to you">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/img\.youtube\.com\/vi\/dQw4w9WgXcQ\/hqdefault\.jpg">/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, new RegExp(`og:url" content="https://x.dev${path}"`));
  assert.ok(html.includes("navigator.share") && html.includes("Was this useful?") && html.includes("Make your own"));
  assert.ok(html.trimEnd().endsWith("</body></html>"));
});

test("preview tags escape quotes in titles", async () => {
  const e = env(); geminiQueue.push({ ...goodDeck(), videoTitle: 'He said "hi" <b>' });
  ytStatus = 500;
  const { path } = await (await post(e, base)).json();
  const html = await (await get(e, path)).text();
  assert.ok(html.includes('content="He said &quot;hi&quot; &lt;b&gt;"'));
});

test("home page has preview tags, mode toggle and the skill", async () => {
  const html = await (await get(env(), "/")).text();
  assert.match(html, /og:image" content="https:\/\/x\.dev\/og\.png"/);
  const line = "Paste a link, say who&#39;s watching, and get swipeable cards made for you — ready to share with your team or a mate.";
  for (const n of ['name="description"', 'property="og:description"', 'name="twitter:description"']) assert.ok(html.includes(`<meta ${n} content="${line}">`), n);
  assert.ok(html.includes("For someone else") && html.includes("Download skill") && html.includes("Copy skill"));
  assert.ok(!html.includes("/*SKILL*/null") && !html.includes("<!--PREVIEW-->"));
  assert.equal(html.split("</script>").length, 2, "skill text can't break the page script");
  const png = await get(env(), "/og.png");
  assert.equal(png.headers.get("content-type"), "image/png");
  assert.ok((await png.arrayBuffer()).byteLength > 10000);
});

test("skill downloads as markdown with the right filename", async () => {
  const r = await get(env(), "/skill.md");
  assert.equal(r.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.match(r.headers.get("content-disposition"), /filename="itabs-this-video-skill\.md"/);
  assert.match(await r.text(), /^# iTabs This Video: make any YouTube video personal/);
});

test("'for someone else' mode changes the prompt", async () => {
  const e = env(); geminiQueue.push(goodDeck());
  await post(e, { ...base, about: "my mate Kristian, building a robot arm", mode: "other" });
  const p = JSON.parse(calls.find((c) => c.url.includes(":generateContent")).body).contents[0].parts.at(-1).text;
  assert.match(p, /This deck is a gift/); assert.match(p, /For <Name>/); assert.match(p, /Kristian, building a robot arm/);
});

test("feedback is saved per deck and in totals, bad input rejected", async () => {
  const e = env(); geminiQueue.push(goodDeck());
  const { id } = await (await post(e, base)).json();
  const fb = (b) => worker.fetch(new Request("https://x.dev/api/feedback", { method: "POST", headers: { "CF-Connecting-IP": "7.7.7.7" }, body: JSON.stringify(b) }), e);
  assert.equal((await fb({ id, q: "useful", a: "up" })).status, 200);
  assert.equal((await fb({ id, q: "did", a: "yes" })).status, 200);
  assert.equal((await fb({ id, q: "useful", a: "maybe" })).status, 400);
  assert.equal((await fb({ id: "nope1234", q: "useful", a: "up" })).status, 404);
  assert.deepEqual(JSON.parse(await e.DECKS.get("fb:" + id)), { up: 1, yes: 1 });
  assert.deepEqual(JSON.parse(await e.DECKS.get("stats:fb")), { up: 1, yes: 1 });
});

test("stats page needs the PIN and shows the numbers", async () => {
  const e = { ...env(), STATS_PIN: "4321" }; geminiQueue.push(goodDeck());
  const { id } = await (await post(e, base)).json();
  await e.DECKS.put("stats:fb", JSON.stringify({ up: 3, down: 1, yes: 2 }));
  const form = (pin) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "CF-Connecting-IP": "8.8.8.8" }, body: "pin=" + pin });
  assert.match(await (await get(e, "/stats")).text(), /type="password"/);
  const bad = await get(e, "/stats", form("0000")); assert.equal(bad.status, 401);
  const ok = await (await get(e, "/stats", form("4321"))).text();
  assert.match(ok, /<b>1<\/b><span>Decks today/); assert.match(ok, /<b>1<\/b><span>Decks total/);
  assert.match(ok, /<b>3<\/b><span>👍/); assert.match(ok, /<b>1<\/b><span>👎/); assert.match(ok, /<b>2<\/b><span>Did something/);
  assert.ok(ok.includes(`/d/${id}`));
  for (let i = 0; i < 5; i++) await get(e, "/stats", form("1111"));
  assert.equal((await get(e, "/stats", form("4321"))).status, 429, "locks out after 5 wrong tries");
  assert.equal((await get(env(), "/stats")).status, 503, "off when no STATS_PIN");
});

test("featured example deck: shown when FEATURED_DECK is a real deck, hidden otherwise", async () => {
  const e = env(); geminiQueue.push(goodDeck());
  const { id } = await (await post(e, base)).json();
  const home = async (v) => (await get({ ...e, FEATURED_DECK: v }, "/")).text();
  for (const v of [id, ` https://itabs-this-video.x.workers.dev/d/${id} `, `/d/${id}?x=1`]) {
    const h = await home(v);
    assert.ok(h.includes(`<iframe src="/d/${id}?embed"`), "shown for " + v);
    assert.ok(h.includes("Gold = from the video · ") && h.includes("Blue = for you"));
  }
  for (const v of [undefined, "", "   ", "nope1234", "<script>"]) assert.ok(!(await home(v)).includes("<iframe"), "hidden for " + v);
  assert.ok((await home("")).includes("Paste a link") && (await home("")).includes("Get your iTabs"));
  const emb = await (await get(e, `/d/${id}?embed`)).text();
  assert.ok(!emb.includes("Was this useful?") && !emb.includes("navigator.share"), "embed has no feedback/share");
  assert.ok((await (await get(e, `/d/${id}`)).text()).includes("Was this useful?"));
});

test("served skill is the official file, byte for byte", async () => {
  const { readFileSync } = await import("node:fs");
  const t = await (await get(env(), "/skill.md")).text();
  assert.equal(t, readFileSync(new URL("../src/skill.md", import.meta.url), "utf8"));
  assert.ok(t.indexOf("**Easiest:** use this skill in Gemini") > t.indexOf("## Step 1: Get three things"));
});

test("timestamp links use youtu.be/<id>?t=<whole seconds>", async (t) => {
  const { createRequire } = await import("node:module");
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)("playwright")); } catch { return t.skip("playwright not installed"); }
  const { decorateDeck } = await import("../dist/worker.js");
  const d = validateDeck(goodDeck()).data;
  d.videoId = "dQw4w9WgXcQ"; d.cards[0].seconds = 75.6; d.cards[1].seconds = 125;
  const b = await chromium.launch();
  for (const embed of [false, true]) {
    const p = await b.newPage();
    await p.setContent(decorateDeck(renderDeck(d), d, "abcd1234", "https://x.dev", embed));
    const hrefs = await p.$$eval("a.ts", (as) => as.map((a) => a.getAttribute("href")));
    assert.equal(hrefs.length, 7);
    assert.equal(hrefs[0], "https://youtu.be/dQw4w9WgXcQ?t=76");
    assert.equal(hrefs[1], "https://youtu.be/dQw4w9WgXcQ?t=125");
    assert.ok(hrefs.every((h) => /^https:\/\/youtu\.be\/dQw4w9WgXcQ\?t=\d+$/.test(h)), hrefs.join(" "));
  }
  await b.close();
});

test("main page: quick-pick chips fill the box and progress messages rotate", async (t) => {
  const { createRequire } = await import("node:module");
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)("playwright")); } catch { return t.skip("playwright not installed"); }
  const html = await (await get(env(), "/")).text();
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route("**/api/make", () => {});                      // never answers: stay on the loading screen
  await p.route("https://x.dev/", (r) => r.fulfill({ contentType: "text/html", body: html }));
  await p.goto("https://x.dev/");
  await p.click("text=Busy manager");
  assert.equal(await p.inputValue("#about"), "Busy manager");
  await p.fill("#about", "Busy manager of a café"); assert.equal(await p.inputValue("#about"), "Busy manager of a café", "still editable");
  await p.click("text=Small business owner"); assert.equal(await p.inputValue("#about"), "Small business owner");
  await p.fill("#url", "https://youtu.be/dQw4w9WgXcQ"); await p.click("#go");
  const seen = new Set();
  for (let i = 0; i < 30 && seen.size < 4; i++) { seen.add(await p.textContent("#msg")); await p.waitForTimeout(500); }
  await b.close();
  for (const m of ["Pulling the transcript…", "Finding the key moments…", "Making your gold cards…", "Tailoring blue cards for you…"]) assert.ok(seen.has(m), m);
});

test("in-deck player: badge opens at that second, switches, closes, Watch video, fallback; no tap zones", async (t) => {
  const { createRequire } = await import("node:module");
  let pw;
  try { pw = createRequire(import.meta.url)("playwright"); } catch { return t.skip("playwright not installed"); }
  const { decorateDeck } = await import("../dist/worker.js");
  const d = validateDeck(goodDeck()).data; d.videoId = "dQw4w9WgXcQ";
  const page = decorateDeck(renderDeck(d), d, "abcd1234", "https://x.dev", false);
  const b = await pw.chromium.launch();
  const p = await (await b.newContext({ ...pw.devices["iPhone 13"] })).newPage();
  let blockEmbed = false;
  await p.route("https://x.dev/d/abcd1234", (r) => r.fulfill({ contentType: "text/html", body: page }));
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body:
    `<body style="background:#000;color:#fff">stub player<script>addEventListener("message",e=>{if(${"BLOCK"})parent.postMessage(JSON.stringify({event:"onError",info:150}),"*")})</script>`
      .replace("BLOCK", String(blockEmbed)) }));
  await p.goto("https://x.dev/d/abcd1234");
  const src = () => p.$eval("#pv iframe", (f) => f.src).catch(() => null);

  assert.equal(await p.$$eval(".nav", (n) => n.length), 0, "no invisible tap zones");
  const box = await p.locator(".card.on a.ts").boundingBox();
  assert.equal(await p.evaluate(([x, y]) => document.elementFromPoint(x, y).closest("a.ts") !== null, [box.x + box.width / 2, box.y + box.height / 2]), true, "badge is tappable");
  const ib = await p.locator(".card.on .ib").last().boundingBox();
  assert.equal(await p.evaluate(([x, y]) => !!document.elementFromPoint(x, y).closest(".ib"), [ib.x + ib.width / 2, ib.y + ib.height / 2]), true, "i-button is tappable");

  await p.locator(".card.on a.ts").tap();                         // card 1 = 1:05 → 65s
  assert.ok(await p.isVisible("#ov.on"));
  assert.equal(await src(), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=65&autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=https%3A%2F%2Fx.dev");
  assert.equal(await p.textContent("#pt"), "▶ 1:05");
  assert.equal(p.url(), "https://x.dev/d/abcd1234", "stayed in the deck");
  await p.tap("#px");
  assert.equal(await p.isVisible("#ov.on"), false); assert.equal(await src(), null, "closing removes the player (stops video)");

  await p.tap("#bn"); await p.waitForTimeout(350);
  await p.locator(".card.on a.ts").tap();                         // card 2 = 2:05 → 125s
  assert.match(await src(), /start=125&/);
  await p.tap("#px");
  await p.tap("#watch");
  assert.match(await src(), /\/embed\/dQw4w9WgXcQ\?start=0&autoplay=1&playsinline=1&rel=0/);
  assert.equal(await p.textContent("#pt"), "▶ From the start");
  await p.tap("#px");

  // swipe still works
  await p.evaluate(() => { const c = document.getElementById("cards"), tt = (x) => [new Touch({ identifier: 1, target: c, clientX: x, clientY: 300 })];
    c.dispatchEvent(new TouchEvent("touchstart", { touches: tt(300), changedTouches: tt(300) })); c.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: tt(100) })); });
  await p.waitForTimeout(350);
  assert.equal(await p.textContent(".card.on .num"), "Point 3 of 7");

  // embedding disabled → friendly fallback link to youtu.be at that second
  blockEmbed = true;
  await p.unroute("https://www.youtube-nocookie.com/**");
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body:
    `<script>addEventListener("message",()=>parent.postMessage(JSON.stringify({event:"onError",info:150}),"*"))</script>` }));
  await p.locator(".card.on a.ts").tap();                         // 3:05 → 185s
  await p.waitForSelector("#pv .pf");
  assert.equal(await p.$eval("#pv .pf a", (a) => a.href), "https://youtu.be/dQw4w9WgXcQ?t=185");
  assert.equal(await p.$eval("#pv .pf a", (a) => a.target), "_blank");
  await b.close();
});

test("skill template is the same as the site template", async () => {
  const { readFileSync } = await import("node:fs");
  const sk = readFileSync(new URL("../src/skill.md", import.meta.url), "utf8");
  const tpl = readFileSync(new URL("../src/template.html", import.meta.url), "utf8");
  assert.equal(sk.slice(sk.indexOf("```html\n") + 8, sk.lastIndexOf("```")).trimEnd(), tpl.trimEnd());
});
