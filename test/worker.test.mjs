// Offline tests: run the real worker with in-memory KV and a scripted Gemini/YouTube.
import test from "node:test";
import assert from "node:assert/strict";
import worker, { validateDeck, validateQuiz, parseVideoId, renderDeck } from "../dist/worker.js";

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
  assert.match(ok, /<b>1<\/b><span>Today/); assert.match(ok, /<b>1<\/b><span>This week/); assert.match(ok, /<b>1<\/b><span>Total/);
  assert.ok(ok.includes('href="https://youtu.be/dQw4w9WgXcQ"'), "YouTube link listed");
  assert.ok(ok.includes("Australia/Perth time"));
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

test("docked mini player: deck stays usable, seeks in place, Listen size, close, fallback", async (t) => {
  const { createRequire } = await import("node:module");
  let pw;
  try { pw = createRequire(import.meta.url)("playwright"); } catch { return t.skip("playwright not installed"); }
  const { decorateDeck } = await import("../dist/worker.js");
  const d = validateDeck(goodDeck()).data; d.videoId = "dQw4w9WgXcQ";
  const page = decorateDeck(renderDeck(d), d, "abcd1234", "https://x.dev", false);
  const b = await pw.chromium.launch();
  t.after(() => b.close());
  const p = await (await b.newContext({ ...pw.devices["iPhone 13"] })).newPage();
  await p.route("https://x.dev/d/abcd1234", (r) => r.fulfill({ contentType: "text/html", body: page }));
  // Stub player: records the commands it receives so we can check seeking.
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body:
    `<body style="background:#000"><script>window.cmds=[];addEventListener("message",e=>{try{const m=JSON.parse(e.data);if(m.event==="command")cmds.push(m.func+":"+(m.args||[]).join(","))}catch(x){}})</script>` }));
  await p.goto("https://x.dev/d/abcd1234");
  const frames = () => p.locator("#pv iframe").count();
  const src = () => p.locator("#pv iframe").getAttribute("src");
  const cmds = async (want) => { const f = p.frames().find((x) => x.url().includes("nocookie"));
    for (let i = 0; i < 20; i++) { const c = await f.evaluate(() => window.cmds); if (c.length >= want) return c; await p.waitForTimeout(100); }
    return f.evaluate(() => window.cmds); };
  const tappable = (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).closest(s); }, sel);

  assert.equal(await p.locator(".nav, .ov.on").count(), 0, "no tap zones, no overlay");
  await p.locator(".card.on a.ts").tap();                                   // 1:05
  assert.equal(await src(), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=65&autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=https%3A%2F%2Fx.dev");
  assert.equal(await p.textContent("#pt"), "▶ 1:05");
  const dock = await p.locator("#dock").boundingBox(), card = await p.locator(".card.on .in").boundingBox();
  assert.ok(dock.y < 20 && dock.height > 150, "docked at top: " + JSON.stringify(dock));
  assert.ok(card.y >= dock.y + dock.height, "deck shifted below the player");
  const foot = await p.locator("#bn").boundingBox();
  assert.ok(foot.y + foot.height <= p.viewportSize().height, "arrows still on screen");

  // While playing: arrows, swipe, i-buttons and Share all work; the player stays
  await p.tap("#bn"); await p.waitForTimeout(350);
  assert.equal(await p.textContent(".card.on .num"), "Point 2 of 7");
  await p.evaluate(() => { const c = document.getElementById("cards"), tt = (x) => [new Touch({ identifier: 1, target: c, clientX: x, clientY: 400 })];
    c.dispatchEvent(new TouchEvent("touchstart", { touches: tt(300), changedTouches: tt(300) })); c.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: tt(100) })); });
  await p.waitForTimeout(350);
  assert.equal(await p.textContent(".card.on .num"), "Point 3 of 7", "swipe works with player open");
  await p.locator(".card.on .ib.you").tap();
  assert.ok(await p.locator(".card.on .info.you").isVisible(), "blue i-button opens with player open");
  await p.locator(".card.on .ib").last().tap();
  assert.match(await p.textContent(".card.on .info"), /Background/);
  assert.equal(await tappable(".share"), true, "Share is tappable");
  assert.equal(await frames(), 1, "player still there");

  // Another timestamp seeks the same player (no reload)
  const before = await src();
  await p.locator(".card.on a.ts").tap();                                   // 3:05 → 185
  assert.equal(await frames(), 1); assert.equal(await src(), before, "same iframe, not reopened");
  assert.deepEqual((await cmds(2)).slice(-2), ["seekTo:185,true", "playVideo:"]);
  assert.equal(await p.textContent("#pt"), "▶ 3:05");
  assert.equal(await p.getAttribute("#po", "href"), "https://youtu.be/dQw4w9WgXcQ?t=185");

  // Listen size: slim strip, same player keeps running; expand back to Big
  await p.tap("#pl");
  const slim = await p.locator("#dock").boundingBox();
  assert.ok(slim.height >= 60 && slim.height <= 76, "listen strip height: " + slim.height);
  assert.equal(await frames(), 1, "same player while in Listen");
  assert.ok((await p.locator(".card.on .in").boundingBox()).y < card.y, "deck moves back up");
  await p.tap("#pe");
  assert.ok((await p.locator("#dock").boundingBox()).height > 150, "expanded again");

  // Watch video seeks to the start
  await p.tap("#watch");
  assert.deepEqual((await cmds(4)).slice(-2), ["seekTo:0,true", "playVideo:"]);

  // Close stops it
  await p.tap("#px");
  assert.equal(await p.isVisible("#dock"), false); assert.equal(await frames(), 0);

  // Embedding blocked → fallback button
  await p.unroute("https://www.youtube-nocookie.com/**");
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body:
    `<script>addEventListener("message",()=>parent.postMessage(JSON.stringify({event:"onError",info:150}),"*"))</script>` }));
  await p.locator(".card.on a.ts").tap();
  await p.waitForSelector("#pv .pf");
  assert.equal(await p.locator("#pv .pf a").getAttribute("href"), "https://youtu.be/dQw4w9WgXcQ?t=185");
  await b.close();
});

test("skill template is the same as the site template", async () => {
  const { readFileSync } = await import("node:fs");
  const sk = readFileSync(new URL("../src/skill.md", import.meta.url), "utf8");
  const tpl = readFileSync(new URL("../src/template.html", import.meta.url), "utf8");
  assert.equal(sk.slice(sk.indexOf("```html\n") + 8, sk.lastIndexOf("```")).trimEnd(), tpl.trimEnd());
});

test("iPhone: long card with player open — scroll down, open i-buttons; vertical moves don't change cards", async (t) => {
  const { createRequire } = await import("node:module");
  let pw;
  try { pw = createRequire(import.meta.url)("playwright"); } catch { return t.skip("playwright not installed"); }
  const { decorateDeck } = await import("../dist/worker.js");
  const d = validateDeck(goodDeck()).data; d.videoId = "dQw4w9WgXcQ";
  const long = "This is a long sentence that keeps going so the card gets really tall on a phone. ";
  d.cards[2].summary = long.repeat(5);
  d.cards[2].buttons = [
    { you: true, title: "For your van", text: ("• " + long + "\n").repeat(5) },
    { title: "Definition", type: "Definition", text: long.repeat(3) },
    { title: "Check this", type: "Check this", text: "Last gold button text." },
  ];
  const page = decorateDeck(renderDeck(d), d, "abcd1234", "https://x.dev", false);
  const b = await pw.chromium.launch();
  t.after(() => b.close());
  const p = await (await b.newContext({ ...pw.devices["iPhone 13"] })).newPage();
  await p.route("https://x.dev/d/abcd1234", (r) => r.fulfill({ contentType: "text/html", body: page }));
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<body style=background:#000>" }));
  await p.goto("https://x.dev/d/abcd1234");
  const vh = p.viewportSize().height;
  const touch = (dx, dy) => p.evaluate(([dx, dy]) => { const c = document.getElementById("cards"), at = (x, y) => [new Touch({ identifier: 1, target: c, clientX: x, clientY: y })];
    c.dispatchEvent(new TouchEvent("touchstart", { touches: at(200, 400), changedTouches: at(200, 400) }));
    c.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: at(200 + dx, 400 + dy) })); }, [dx, dy]);
  const num = () => p.textContent(".card.on .num");

  await p.locator(".card.on a.ts").tap();                 // open player on card 1
  await p.tap("#bn"); await p.waitForTimeout(350); await p.tap("#bn"); await p.waitForTimeout(350);
  assert.equal(await num(), "Point 3 of 7");
  const dockH = (await p.locator("#dock").boundingBox()).height;

  // The long card is taller than the space left, and the page can scroll to reach it all
  const cardBox = await p.locator(".card.on .in").boundingBox();
  assert.ok(cardBox.y + cardBox.height > vh, "card is taller than the screen (test is meaningful)");
  const overflow = await p.evaluate(() => [getComputedStyle(document.documentElement).overflowY, getComputedStyle(document.body).overflowY, document.scrollingElement.scrollHeight > innerHeight]);
  assert.deepEqual(overflow, ["visible", "visible", true], "page is scrollable");

  // Vertical drags never change cards; clearly sideways ones do
  await touch(-60, -300); await touch(70, 250); await touch(0, -400);
  assert.equal(await num(), "Point 3 of 7", "vertical moves don't swipe");

  // Scroll down like a finger would and reach every i-button
  await p.mouse.wheel(0, 2000); await p.waitForTimeout(300);
  assert.ok(await p.evaluate(() => scrollY) > 100, "page scrolled");
  const dockNow = await p.locator("#dock").boundingBox();
  assert.ok(dockNow.y >= -1 && dockNow.y < 20 && Math.abs(dockNow.height - dockH) < 2, "player stays docked at the top while scrolling");
  for (const [i, expect] of [[0, /FOR YOUR VAN/i], [1, /Definition/i], [2, /Last gold button text/]]) {
    const btn = p.locator(".card.on .ib").nth(i);
    await btn.scrollIntoViewIfNeeded();
    const r = await btn.boundingBox();
    assert.ok(r.y >= dockNow.y + dockNow.height - 1 && r.y + r.height <= vh, `button ${i} visible below the player`);
    assert.equal(await p.evaluate(([x, y]) => !!document.elementFromPoint(x, y).closest(".ib"), [r.x + r.width / 2, r.y + r.height / 2]), true, `button ${i} on top`);
    await btn.tap();
    assert.match(await p.textContent(".card.on .info"), expect);
    const info = await p.locator(".card.on .info").boundingBox();
    assert.ok(info.y + 10 < vh, "opened text is on screen");
  }
  assert.equal(await p.locator("#pv iframe").count(), 1, "player still open");

  // Next card brings its top back into view below the player
  await touch(-200, 20); await p.waitForTimeout(400);
  assert.equal(await num(), "Point 4 of 7");
  const top = (await p.locator(".card.on .in").boundingBox()).y;
  const dk = await p.locator("#dock").boundingBox();
  assert.ok(top >= dk.y + dk.height && top - (dk.y + dk.height) < 120, `new card starts just below the player (header in between): card ${top}, player bottom ${dk.y + dk.height}`);
});

test("iPhone: Listen mode — slim strip with visible video, keeps playing across cards and i-buttons", async (t) => {
  const { createRequire } = await import("node:module");
  let pw;
  try { pw = createRequire(import.meta.url)("playwright"); } catch { return t.skip("playwright not installed"); }
  const { decorateDeck } = await import("../dist/worker.js");
  const d = validateDeck(goodDeck()).data; d.videoId = "dQw4w9WgXcQ";
  const page = decorateDeck(renderDeck(d), d, "abcd1234", "https://x.dev", false);
  const b = await pw.chromium.launch();
  t.after(() => b.close());
  const p = await (await b.newContext({ ...pw.devices["iPhone 13"] })).newPage();
  await p.route("https://x.dev/d/abcd1234", (r) => r.fulfill({ contentType: "text/html", body: page }));
  // Stub player: counts loads, records commands, reports time + state like YouTube does.
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body: `<body style="background:#000"><script>
    window.cmds=[];window.loads=(window.loads||0)+1;let state=1,time=65;
    addEventListener("message",e=>{try{const m=JSON.parse(e.data);if(m.event==="command"){cmds.push(m.func+":"+(m.args||[]).join(","));
      if(m.func==="pauseVideo")state=2;if(m.func==="playVideo")state=1;if(m.func==="seekTo")time=m.args[0];}}catch(x){}});
    setInterval(()=>{if(state===1)time+=1;parent.postMessage(JSON.stringify({event:"infoDelivery",info:{currentTime:time,playerState:state}}),"*")},200);
  </script>` }));
  await p.goto("https://x.dev/d/abcd1234");
  const player = () => p.frames().find((f) => f.url().includes("nocookie"));
  const cmds = async (n) => { for (let i = 0; i < 20; i++) { const c = await player().evaluate(() => window.cmds); if (c.length >= n) return c; await p.waitForTimeout(100); } return player().evaluate(() => window.cmds); };
  const swipe = () => p.evaluate(() => { const c = document.getElementById("cards"), at = (x) => [new Touch({ identifier: 1, target: c, clientX: x, clientY: 400 })];
    c.dispatchEvent(new TouchEvent("touchstart", { touches: at(300), changedTouches: at(300) })); c.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: at(80) })); });

  await p.locator(".card.on a.ts").tap();
  assert.equal(await p.locator("#pm").count(), 0, "old minimise button is gone");
  assert.ok(await p.locator("#pl").isVisible(), "🎧 button in Big mode");
  await p.tap("#pl");

  // Slim strip, ~64–72px, with the video still visible at ~110x62 (not hidden)
  const dock = await p.locator("#dock").boundingBox();
  assert.ok(dock.height >= 64 && dock.height <= 72, "strip height " + dock.height);
  const vid = await p.locator("#pv iframe").boundingBox();
  assert.ok(Math.abs(vid.width - 110) <= 1 && Math.abs(vid.height - 62) <= 1, "thumbnail size " + JSON.stringify(vid));
  assert.ok(vid.y >= 0 && vid.y + vid.height <= p.viewportSize().height, "video on screen");
  assert.equal(await p.locator("#pv iframe").evaluate((f) => getComputedStyle(f).visibility + "/" + getComputedStyle(f).display + "/" + getComputedStyle(f).opacity), "visible/block/1");
  for (const id of ["#pt", "#pp", "#pe", "#px"]) assert.ok(await p.locator(id).isVisible(), id + " visible in Listen");
  assert.equal(await p.locator("#po").isVisible(), false);
  await p.waitForTimeout(600);
  assert.match(await p.textContent("#pt"), /^🎧 1:\d\d$/, "current time shows and ticks");

  // Swipe cards and open i-buttons: size stays Listen, same player keeps running
  const t0 = await p.textContent("#pt");
  await p.tap("#bn"); await p.waitForTimeout(350); await swipe(); await p.waitForTimeout(350);
  assert.equal(await p.textContent(".card.on .num"), "Point 3 of 7");
  await p.locator(".card.on .ib.you").tap(); assert.ok(await p.locator(".card.on .info.you").isVisible());
  await p.locator(".card.on .ib").last().tap(); assert.match(await p.textContent(".card.on .info"), /Background/);
  assert.ok(await p.locator("#dock.listen").isVisible(), "still Listen size");
  assert.equal(await player().evaluate(() => window.loads), 1, "player never reloaded");
  assert.notEqual(await p.textContent("#pt"), t0, "time kept moving (still playing)");

  // Timestamp seeks without changing size
  await p.locator(".card.on a.ts").tap();
  assert.deepEqual((await cmds(2)).slice(-2), ["seekTo:185,true", "playVideo:"]);
  assert.ok(await p.locator("#dock.listen").isVisible(), "seek keeps Listen size");

  // Play / pause
  await p.tap("#pp"); assert.deepEqual((await cmds(3)).slice(-1), ["pauseVideo:"]);
  await p.waitForTimeout(500); assert.equal(await p.textContent("#pp"), "▶");
  await p.tap("#pp"); assert.deepEqual((await cmds(4)).slice(-1), ["playVideo:"]);
  await p.waitForTimeout(500); assert.equal(await p.textContent("#pp"), "⏸");

  // Expand to Big and back, still the same player
  await p.tap("#pe"); assert.ok((await p.locator("#dock").boundingBox()).height > 150);
  await p.tap("#pl"); assert.ok((await p.locator("#dock").boundingBox()).height <= 72);
  assert.equal(await player().evaluate(() => window.loads), 1);

  // Size remembered: close, open another timestamp → opens in Listen
  await p.tap("#px"); assert.equal(await p.locator("#pv iframe").count(), 0);
  await p.locator(".card.on a.ts").tap();
  assert.ok(await p.locator("#dock.listen").isVisible(), "reopens in remembered Listen size");
});

test("stats: today / this week / total counted in local time from saved decks", async () => {
  const { periodStarts, ymd } = await import("../dist/worker.js");
  // Monday 9am Perth = Monday 01:00 UTC; Sunday 11pm UTC is already Monday in Perth
  assert.deepEqual(periodStarts(new Date("2026-11-16T01:00:00Z"), "Australia/Perth"), { today: "2026-11-16", weekStart: "2026-11-16" });
  assert.deepEqual(periodStarts(new Date("2026-11-19T12:00:00Z"), "Australia/Perth"), { today: "2026-11-19", weekStart: "2026-11-16" });
  assert.equal(ymd(new Date("2026-11-15T23:30:00Z"), "Australia/Perth"), "2026-11-16");

  const e = { ...env(), STATS_PIN: "4321" };
  const now = Date.now(), iso = (msAgo) => new Date(now - msAgo).toISOString();
  const { today, weekStart } = periodStarts(new Date(now), "Australia/Perth");
  const put = (id, created) => e.DECKS.put("deck:" + id, "{}", { metadata: { created, videoId: "abcdefghijk", lang: "en", title: "T " + id } });
  const ages = [0, 3600e3, 2 * 86400e3, 6 * 86400e3, 8 * 86400e3, 40 * 86400e3];
  ages.forEach((a, i) => put("deck000" + i, iso(a)));
  const local = ages.map((a) => ymd(new Date(now - a), "Australia/Perth"));
  const expToday = local.filter((d) => d === today).length, expWeek = local.filter((d) => d >= weekStart).length;
  const html = await (await worker.fetch(new Request("https://x.dev/stats", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "CF-Connecting-IP": "1.1.1.1" }, body: "pin=4321" }), e)).text();
  assert.ok(html.includes(`<b>${expToday}</b><span>Today`), "today " + expToday);
  assert.ok(html.includes(`<b>${expWeek}</b><span>This week`), "week " + expWeek);
  assert.ok(html.includes(`<b>6</b><span>Total`));
  assert.equal((html.match(/youtu\.be\/abcdefghijk"/g) || []).length, 6);
});

const quizOf = (n = 5) => ({ questions: Array.from({ length: n }, (_, i) => ({
  q: `Question ${i + 1} about the video?`, options: [`Right ${i + 1}`, `Wrong A${i + 1}`, `Wrong B${i + 1}`, `Wrong C${i + 1}`].slice(0, i % 2 ? 3 : 4),
  answer: `Right ${i + 1}`, why: `Because the video says so (${i + 1}).`, time: `${i + 1}:30`, seconds: (i + 1) * 60 + 30 })) });

test("Study mode: prompt, 'For your test' label, quiz saved; normal decks unchanged", async () => {
  const e = env();
  geminiQueue.push({ ...goodDeck(), quiz: quizOf() });
  let r = await post(e, { ...base, study: true }); let j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.quiz, true);
  const prompt = JSON.parse(calls.filter((c) => c.url.includes(":generateContent")).at(-1).body).contents[0].parts.at(-1).text;
  assert.match(prompt, /STUDY MODE/); assert.match(prompt, /"quiz"/); assert.match(prompt, /ONLY facts actually said/);
  const saved = JSON.parse(await e.DECKS.get("deck:" + j.id));
  assert.equal(saved.study, true); assert.equal(saved.youLabel, "For your test");
  assert.ok(saved.cards.every((c) => c.buttons[0].title === "For your test"));
  assert.equal(saved.quiz.questions.length, 5);
  assert.deepEqual(saved.quiz.questions.map((q) => q.answer), [0, 0, 0, 0, 0]);
  assert.equal(e.DECKS.m.get("deck:" + j.id).o.metadata.study, true);

  // Normal deck: no study text in the prompt, no quiz saved even if the AI sends one
  geminiQueue.push({ ...goodDeck(), quiz: quizOf() });
  r = await post(e, base, "2.2.2.2"); j = await r.json();
  const p2 = JSON.parse(calls.filter((c) => c.url.includes(":generateContent")).at(-1).body).contents[0].parts.at(-1).text;
  assert.ok(!/STUDY MODE|"quiz"/.test(p2), "normal prompt unchanged");
  const s2 = JSON.parse(await e.DECKS.get("deck:" + j.id));
  assert.equal(s2.quiz, undefined); assert.equal(s2.study, undefined); assert.equal(s2.youLabel, "For your van");
});

test("Study mode: a missing or broken quiz is dropped, deck still saved", async () => {
  const bad = [
    undefined,
    quizOf(4),                                                                     // only 4 questions
    { questions: quizOf().questions.map((q, i) => (i === 2 ? { ...q, answer: "Not an option" } : q)) },
    { questions: quizOf().questions.map((q, i) => (i === 1 ? { ...q, options: ["Only", "Two"] } : q)) },
    { questions: quizOf().questions.map((q, i) => (i === 4 ? { ...q, why: "" } : q)) },
  ];
  for (const [n, quiz] of bad.entries()) {
    const e = env(); geminiQueue.push({ ...goodDeck(), quiz });
    const j = await (await post(e, { ...base, study: true }, "3.3.3." + n)).json();
    assert.ok(j.path, "deck saved"); assert.equal(j.quiz, false);
    const saved = JSON.parse(await e.DECKS.get("deck:" + j.id));
    assert.equal(saved.quiz, undefined); assert.equal(saved.study, true);
  }
  assert.equal(validateQuiz({ questions: quizOf().questions.map((q) => ({ ...q, answer: 2 })) }).ok, true, "numeric answer index accepted");
});

test("stats: Study mode decks are counted and labelled", async () => {
  const e = { ...env(), STATS_PIN: "4321" };
  geminiQueue.push({ ...goodDeck(), quiz: quizOf() }); await post(e, { ...base, study: true });
  geminiQueue.push(goodDeck()); await post(e, base, "4.4.4.4");
  const html = await (await worker.fetch(new Request("https://x.dev/stats", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "pin=4321" }), e)).text();
  assert.match(html, /📚 1 Study mode/); assert.equal((html.match(/📚 Study \+ quiz/g) || []).length, 1);
});

test("iPhone: Study deck quiz — answer all 5, swipe away and back, quiz timestamp, score, try again", async (t) => {
  const { createRequire } = await import("node:module");
  let pw;
  try { pw = createRequire(import.meta.url)("playwright"); } catch { return t.skip("playwright not installed"); }
  const { decorateDeck } = await import("../dist/worker.js");
  const e = env(); geminiQueue.push({ ...goodDeck(), quiz: quizOf() });
  const { id } = await (await post(e, { ...base, study: true })).json();
  const html = await (await get(e, `/d/${id}`)).text();
  const plain = validateDeck(goodDeck()).data; plain.videoId = "dQw4w9WgXcQ";
  const normalHtml = decorateDeck(renderDeck(plain), plain, "norm0001", "https://x.dev", false);
  const b = await pw.chromium.launch();
  t.after(() => b.close());
  const p = await (await b.newContext({ ...pw.devices["iPhone 13"] })).newPage();
  const errors = []; p.on("pageerror", (x) => errors.push(x.message));
  await p.route("https://x.dev/d/*", (r) => r.fulfill({ contentType: "text/html", body: r.request().url().endsWith("norm0001") ? normalHtml : html }));
  await p.route("https://www.youtube-nocookie.com/**", (r) => r.fulfill({ contentType: "text/html", body: "<body style=background:#000>" }));
  await p.route("https://x.dev/api/feedback", (r) => r.fulfill({ contentType: "application/json", body: "{}" }));

  // Normal deck: no quiz card
  await p.goto("https://x.dev/d/norm0001");
  assert.equal(await p.locator(".card.quiz").count(), 0); assert.equal(await p.locator(".seg").count(), 7);

  await p.goto(`https://x.dev/d/${id}`);
  assert.equal(await p.locator(".seg").count(), 8, "7 cards + quiz");
  for (let i = 0; i < 7; i++) { await p.tap("#bn"); await p.waitForTimeout(320); }
  assert.ok(await p.locator(".card.quiz.on").isVisible(), "quiz is after the last content card");
  const quiz = p.locator(".card.quiz");
  assert.match(await quiz.textContent(), /AI-made quiz\. Check with your official course material\./);
  // feedback comes after the quiz (below it, in the same last card)
  const qb = await quiz.locator(".qbox").boundingBox(), fb = await quiz.locator(".fb").boundingBox();
  assert.ok(fb.y > qb.y, "👍/👎 feedback sits after the quiz");

  // Q1 right, Q2 wrong, then swipe back to a content card and return mid-quiz
  const answer = async (right) => {
    const opts = quiz.locator(".qa");
    const texts = await opts.allTextContents();
    const k = texts.findIndex((x) => (right ? /Right/ : /Wrong/).test(x));
    await opts.nth(k).tap();
    const fbText = await quiz.locator(".qr").textContent();
    assert.match(fbText, right ? /^✓ Right!/ : /^✗ Not quite\. Answer: Right \d\./);
    assert.match(fbText, /Because the video says so/);
    assert.equal(await quiz.locator(".qa:not([disabled])").count(), 0, "answer locked");
  };
  await answer(true);
  assert.equal(await quiz.locator(".qa.right").count(), 1);
  await quiz.locator(".qnext").tap();
  await answer(false);
  assert.equal(await quiz.locator(".qa.wrong").count(), 1); assert.equal(await quiz.locator(".qa.right").count(), 1, "shows the right one too");

  await p.tap("#bp"); await p.waitForTimeout(350); await p.tap("#bp"); await p.waitForTimeout(350);
  assert.equal(await p.textContent(".card.on .num"), "Point 6 of 7");
  await p.tap("#bn"); await p.waitForTimeout(350); await p.tap("#bn"); await p.waitForTimeout(350);
  assert.match(await quiz.locator(".qn").textContent(), /Question 2 of 5/, "still on question 2");
  assert.match(await quiz.locator(".qr").textContent(), /Not quite/, "answer kept after swiping away and back");
  assert.deepEqual(await quiz.locator(".qdots button").evaluateAll((bs) => bs.map((b) => b.className.replace(" cur", ""))), ["ok", "no", "", "", ""]);

  // Quiz timestamp plays that part in the docked player
  await quiz.locator(".qnext").tap();
  assert.equal(await quiz.locator(".qts").textContent(), "▶ 3:30");
  await quiz.locator(".qts").tap();
  assert.match(await p.locator("#pv iframe").getAttribute("src"), /start=210&/);
  assert.ok(await p.locator(".card.quiz.on").isVisible(), "still on the quiz");

  await answer(true); await quiz.locator(".qnext").tap();
  await answer(true); await quiz.locator(".qnext").tap();
  await answer(false);
  assert.equal(await quiz.locator(".qnext").textContent(), "See my score");
  await quiz.locator(".qnext").tap();
  assert.equal(await quiz.locator(".qscore b").textContent(), "3 out of 5");

  // Try again resets everything
  await quiz.locator(".qagain").tap();
  assert.match(await quiz.locator(".qn").textContent(), /Question 1 of 5/);
  assert.equal(await quiz.locator(".qr").count(), 0);
  assert.equal(await quiz.locator(".qdots .ok, .qdots .no").count(), 0);

  // Shuffled: the right answer isn't always in the same place
  const positions = new Set();
  for (let i = 0; i < 6; i++) {
    await p.reload();
    const texts = await p.locator(".card.quiz .qa").allTextContents();
    positions.add(texts.findIndex((x) => /Right/.test(x)));
  }
  assert.ok(positions.size > 1, "answer position varies: " + [...positions]);
  assert.deepEqual(errors, []);
});

test("form: Study mode switch changes the example and is sent with the request", async (t) => {
  const { createRequire } = await import("node:module");
  let pw;
  try { pw = createRequire(import.meta.url)("playwright"); } catch { return t.skip("playwright not installed"); }
  const html = await (await get(env(), "/")).text();
  const b = await pw.chromium.launch(); t.after(() => b.close());
  const p = await (await b.newContext({ ...pw.devices["iPhone 13"] })).newPage();
  let sent = null;
  await p.route("https://x.dev/", (r) => r.fulfill({ contentType: "text/html", body: html }));
  await p.route("**/api/make", (r) => { sent = JSON.parse(r.request().postData()); r.fulfill({ contentType: "application/json", body: '{"id":"x","path":"/d/x"}' }); });
  await p.goto("https://x.dev/");
  assert.equal(await p.isChecked("#study"), false, "off by default");
  assert.match(await p.textContent(".study"), /Study mode \(for tests and exams\)/);
  await p.tap(".study");
  assert.equal(await p.getAttribute("#about", "placeholder"), "e.g. Studying for my forklift ticket");
  await p.tap("#mOther");
  assert.match(await p.getAttribute("#about", "placeholder"), /apprentice.*forklift ticket/);
  await p.tap("#mMe");
  assert.equal(await p.getAttribute("#about", "placeholder"), "e.g. Studying for my forklift ticket");
  await p.fill("#url", "https://youtu.be/dQw4w9WgXcQ"); await p.fill("#about", "Studying for my forklift ticket");
  await p.tap("#go"); await p.waitForSelector("#done:not([hidden])");
  assert.equal(sent.study, true); assert.equal(sent.mode, "me");
});

test("talk: Aidan's page, MD, QR and the talk skill are served under /talk", async () => {
  const page = await get(env(), "/talk/aidan");
  assert.equal(page.status, 200); assert.match(page.headers.get("content-type"), /text\/html/);
  const html = await page.text();
  assert.match(html, /Make bad code fail/); assert.match(html, /Who it's for:/); assert.match(html, /Your homework[\s\S]*The big idea/); assert.match(html, /What "exit 2" means/); assert.match(html, /id="promptCopy"/); assert.equal((html.match(/role="checkbox"/g) || []).length, 4); assert.match(html, /Made with iTabs/); assert.match(html, /0421 508 009/);
  assert.match(html, /href="\/talk\/aidan\/aidan-morgan-make-bad-code-fail\.md"/);
  assert.match(html, /fetch\('\/talk\/aidan\/aidan-morgan-make-bad-code-fail\.md'\)/);
  assert.match(html, /href="\/talk\/skill" download/);
  assert.match(html, /src="\/talk\/aidan\/qr-talk-itabs-aidan\.png"/);
  assert.doesNotMatch(html, /talk\.itabs\.co/);
  assert.equal((await get(env(), "/talk/aidan/")).status, 200, "trailing slash works too");
  const md = await get(env(), "/talk/aidan/aidan-morgan-make-bad-code-fail.md");
  assert.equal(md.status, 200); assert.match(md.headers.get("content-disposition"), /attachment/);
  const mdText = await md.text();
  assert.match(mdText, /^# Quality gates for agents/);
  assert.match(mdText, /Who it's for:\*\* anyone using an AI agent/);
  assert.match(mdText, /## Your homework[\s\S]*## The big idea[\s\S]*What "exit 2" means[\s\S]*## Check yourself/);
  const qr = await get(env(), "/talk/aidan/qr-talk-itabs-aidan.png");
  assert.equal(qr.headers.get("content-type"), "image/png");
  assert.deepEqual([...new Uint8Array(await qr.arrayBuffer()).slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  const skill = await get(env(), "/talk/skill");
  assert.match(skill.headers.get("content-disposition"), /filename="SKILL\.md"/);
  const skillText = await skill.text();
  assert.match(skillText, /^---\nname: itabs-this-talk/);
  assert.match(skillText, /\{\{NOTES_CARDS\}\}[\s\S]*id="promptCopy"[\s\S]*\{\{CHECK_ITEMS\}\}/, "skill has the full-notes template");
  assert.match(skillText, /url = "https:\/\/itabs-this-video\.jgwynne7\.workers\.dev\/talk\/<slug>"/, "skill points speakers at the Worker");
  assert.match(skillText, /src="\/talk\/\{\{SLUG\}\}\/qr-talk-itabs-\{\{SLUG\}\}\.png"/);
  assert.equal((await get(env(), "/talk/nobody")).status, 404);
  assert.equal((await get(env(), "/skill.md")).headers.get("content-disposition"), 'attachment; filename="itabs-this-video-skill.md"', "video skill unchanged");
});

test("talk: Rye's page, MD and QR are served under /talk/rye", async () => {
  const page = await get(env(), "/talk/rye");
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Getting found by AI/); assert.match(html, /Made with iTabs/); assert.match(html, /0421 508 009/);
  assert.match(html, /Your homework[\s\S]*The big idea[\s\S]*Where the signups came from[\s\S]*Real numbers[\s\S]*How to apply this to your own business[\s\S]*Check yourself/);
  assert.equal((html.match(/<table class="nums">/g) || []).length, 2);
  const tables = html.match(/<table class="nums">[\s\S]*?<\/table>/g);
  assert.deepEqual(tables.map((x) => (x.match(/<tr><td>/g) || []).length), [6, 6], "each table has only its own rows");
  assert.match(tables[0], /App Store<\/td><td>192/); assert.doesNotMatch(tables[0], /Cost per lead/);
  assert.match(html, /<td>ChatGPT<\/td><td>1,361<\/td>/); assert.match(html, /<td>Buying questions where Google's AI names them<\/td><td>13 of 15<\/td>/);
  assert.match(html, /class="cta">Want this done for your business\? Spruik/);
  assert.match(html, /href="\/talk\/rye\/rye-smith-getting-found-by-ai\.md"/); assert.match(html, /src="\/talk\/rye\/qr-talk-itabs-rye\.png"/);
  assert.match(html, /'itabs-talk-rye-checks'/);
  assert.doesNotMatch(html, /\{\{/);
  const md = await get(env(), "/talk/rye/rye-smith-getting-found-by-ai.md");
  assert.match(md.headers.get("content-disposition"), /attachment/);
  assert.match(await md.text(), /^# Getting found by AI: how Spruik runs SEO with Claude\n/);
  assert.equal((await get(env(), "/talk/rye/qr-talk-itabs-rye.png")).headers.get("content-type"), "image/png");
});

test("talk: each meetup talk links to the others, above the footer", async () => {
  for (const [slug, other, speaker, title] of [["aidan", "rye", "Rye Smith", "Getting found by AI: how Spruik runs SEO with Claude"], ["rye", "aidan", "Aidan Morgan", "Quality gates for agents: Make bad code fail"]]) {
    const html = await (await get(env(), "/talk/" + slug)).text();
    const card = html.match(/<section class="card more-talks">[\s\S]*?<\/section>/);
    assert.ok(card, slug + " has the card");
    assert.match(card[0], /More talks from this meetup/);
    assert.match(card[0], new RegExp('href="/talk/' + other + '"'));
    assert.ok(card[0].includes(speaker) && card[0].includes(title), slug + " shows speaker and title");
    assert.doesNotMatch(card[0], new RegExp('href="/talk/' + slug + '"'), "doesn't link to itself");
    assert.ok(html.indexOf("more-talks\">") < html.indexOf("<footer>"), "card is above the footer");
    assert.equal((html.match(/more-talks/g) || []).length, 3, "card and its style added once");
  }
  const md = await (await get(env(), "/talk/rye/rye-smith-getting-found-by-ai.md")).text();
  assert.doesNotMatch(md, /More talks/, "MD files stay exactly as written");
});
