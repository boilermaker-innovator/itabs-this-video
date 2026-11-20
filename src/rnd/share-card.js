// R&D: shareable talk decks with a 1200x630 preview card. Everything lives under /rnd/share-card,
// so the live talk pages, event pages, talk decks and video side are untouched.
//   /rnd/share-card                  the test page
//   /rnd/share-card/example          a fixed example deck from Rye's notes (no AI cost)
//   /rnd/share-card/d/<id>           a share-ready view of a real deck made on Rye's talk page
//   /rnd/share-card/img/rye-<type>.png  the preview images (made by scripts/make-share-images.mjs)
// h = helpers from worker.js (renderDeck, html, messagePage).
import IMG_CAFE from "./share/rye-cafe.png";
import IMG_TRADES from "./share/rye-trades.png";
import IMG_SHOP from "./share/rye-shop.png";
import IMG_STARTUP from "./share/rye-startup.png";
import IMG_OTHER from "./share/rye-other.png";

const IMAGES = { cafe: IMG_CAFE, trades: IMG_TRADES, shop: IMG_SHOP, startup: IMG_STARTUP, other: IMG_OTHER };
const TYPES = {
  cafe: { label: "Cafe or food", phrase: "a cafe or food business" },
  trades: { label: "Trades", phrase: "a trades business" },
  shop: { label: "Online shop", phrase: "an online shop" },
  startup: { label: "Startup or app", phrase: "a startup or app" },
  other: { label: "Other", phrase: "my own project" },
};
const RYE = { slug: "rye", speaker: "Rye Smith", title: "Getting found by AI: how Spruik runs SEO with Claude" };
const BASE = "/rnd/share-card";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// A fixed example deck for "Online shop", built only from Rye's notes for the gold buttons.
// Blue buttons are general first steps for an online shop (no facts about any real reader).
const card = (band, colors, headline, summary, you, gold, type = "From the talk") => ({
  band, colors, time: "", seconds: 0, headline, summary,
  buttons: [{ you: true, title: "For your shop", text: you }, { title: type, type, text: gold }],
});
export const EXAMPLE = {
  videoTitle: RYE.title, channel: "Rye Smith, Spruik", videoId: "", lang: "en", talk: "rye",
  forWho: "an online shop owner", youLabel: "For your shop",
  cards: [
    card("AI is the new shopfront", "#1e3a8a,#2563eb", "If AI can't read you, you're invisible",
      "People now ask AI assistants where to buy, who to call and what to use. If AI can read you and trusts you, it names you.",
      "• Ask ChatGPT where to buy what you sell, and see who it names\n• Write down whether your shop comes up",
      "If it can't, you're invisible, however good your Google ranking is."),
    card("ChatGPT can beat Google", "#065f46,#10b981", "More signups from ChatGPT than Google",
      "For Manager 11, ChatGPT sent more signups than Google search, with zero ad spend.",
      "• Check where your sales come from (your shop platform's reports usually show this)\n• Look for visits from chatgpt.com or Perplexity",
      "Manager 11 signups since launch, to 4 November 2026: ChatGPT 1,361, Google search 1,061. Zero ad spend."),
    card("Ask every month", "#7c2d12,#f97316", "Track the same buying questions",
      "Track the same questions your customers ask AI, and see whether you're named.",
      "• Write 3 questions a customer would ask before buying from you\n• Ask them again on the same day each month",
      "Ask the buying questions every month."),
    card("Check the tool", "#831843,#ec4899", "Tools can be wrong",
      "Check a tool's numbers against Google's own data before trusting them.",
      "• If an app tells you your ranking, check it in Google Search Console too",
      "On 5 November 2026, SEMrush said a page ranked #1. Google's own data said 9 to 11. A live check said #7."),
    card("Fix, don't just report", "#134e4a,#14b8a6", "Find it and fix it the same day",
      "Claude finds the problem and ships the fix the same day.",
      "• Pick the one product page customers ask about most\n• Ask Claude what would make it easier for AI to read, and fix that today",
      "The FAT Agent audits the site and Claude ships the fix that day."),
    card("Your next step", "#1e3a8a,#60a5fa", "Ask three questions this week",
      "Rye's homework: ask ChatGPT, Perplexity and Google AI three questions your customers would ask.",
      "• Ask your 3 questions in ChatGPT, Perplexity and Google AI\n• Note if your shop is named, cited or first\n• Ask again next month and compare",
      "Check whether your business is named, cited, or first."),
  ],
};

export async function rndRoute(request, url, env, h) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const head = request.method === "HEAD";
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const out = (body, type, extra = {}) => new Response(head ? null : body, { headers: {
    "content-type": type, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", ...extra } });

  let m = p.match(/^\/rnd\/share-card\/img\/rye-([a-z]+)\.png$/);
  if (m) return IMAGES[m[1]] ? out(IMAGES[m[1]], "image/png", { "cache-control": "public, max-age=86400" }) : null;
  if (p === BASE) return out(testPage(url.origin), "text/html; charset=utf-8", { "cache-control": "public, max-age=300" });
  if (p === BASE + "/example") return out(sharedDeck(EXAMPLE, "shop", url.origin + BASE + "/example", h), "text/html; charset=utf-8", { "cache-control": "public, max-age=300" });

  m = p.match(/^\/rnd\/share-card\/d\/([A-Za-z0-9]{6,16})$/);
  if (!m) return null;
  let raw = null, meta = null;
  if (env.DECKS) {
    if (env.DECKS.getWithMetadata) { const r = await env.DECKS.getWithMetadata("talkdeck:" + m[1]); raw = r.value; meta = r.metadata; }
    else raw = await env.DECKS.get("talkdeck:" + m[1]);
  }
  const data = raw && JSON.parse(raw);
  if (!data) return h.html(h.messagePage("Deck not found", "This iTabs link doesn't exist or has expired."), 404);
  if (data.talk !== "rye") return h.html(h.messagePage("Not in this test yet", "The share card test only covers Rye Smith's talk for now."), 404);
  const type = meta && TYPES[meta.type] ? meta.type : "other";
  return out(sharedDeck(data, type, url.origin + BASE + "/d/" + m[1], h), "text/html; charset=utf-8", { "cache-control": "public, max-age=300" });
}

export function shareMeta(data, type, deckUrl, origin) {
  const speaker = String(data.channel || RYE.speaker).split(",")[0].trim();
  const title = "My takeaway from " + speaker + "'s talk";
  const t = TYPES[type] || TYPES.other;
  const description = data.videoTitle + ", applied to " + t.phrase + ". Tap the gold and blue i-buttons to see what " + speaker.split(" ")[0] + " said and how it applies.";
  const image = origin + BASE + "/img/rye-" + (TYPES[type] ? type : "other") + ".png";
  const alt = title + ": " + data.videoTitle + ". Applied to: " + t.label + ". Made with iTabs.";
  return { title, description, image, alt, url: deckUrl };
}

function metaTags(m) {
  const t = esc(m.title), d = esc(m.description), i = esc(m.image), u = esc(m.url), a = esc(m.alt);
  return `<title>${t}</title>
<link rel="canonical" href="${u}">
<meta name="description" content="${d}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:site_name" content="iTabs">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${i}">
<meta property="og:image:secure_url" content="${i}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${a}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">
<meta name="twitter:image:alt" content="${a}">`;
}

function sharedDeck(data, type, deckUrl, h) {
  const m = shareMeta(data, type, deckUrl, new URL(deckUrl).origin);
  const share = `<style>
.foot>.l{display:flex;align-items:center;gap:8px}
.sharebtn{background:#2563eb;color:#fff;border:0;padding:8px 16px;border-radius:18px;font:700 14px inherit;font-family:inherit;cursor:pointer}
.sharebtn:active{transform:scale(.97)}
.sh-ov{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}
.sh-ov[hidden]{display:none}
.sh{width:100%;max-width:460px;background:var(--card);border-radius:20px 20px 0 0;padding:18px 18px 26px;border-top:1px solid #2a2d35}
.sh h3{font-size:17px;margin:0 0 4px}.sh p{color:var(--muted);font-size:13px;margin:0 0 14px}
.sh a,.sh button{display:flex;align-items:center;gap:12px;width:100%;margin-top:8px;padding:14px 16px;border-radius:14px;border:0;background:var(--raised);color:var(--fg);font:600 15px inherit;font-family:inherit;text-decoration:none;cursor:pointer;text-align:left}
.sh .ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font:800 15px inherit;font-family:inherit;color:#fff;flex-shrink:0}
.sh .fb{background:#1877f2}.sh .li{background:#0a66c2}.sh .cp{background:#2563eb}
.sh .x{justify-content:center;background:transparent;color:var(--muted);margin-top:4px}
</style>
<div class="sh-ov" id="shov" hidden><div class="sh" role="dialog" aria-modal="true" aria-labelledby="shh">
<h3 id="shh">Share my deck</h3><p>${esc(m.title)} · applied to ${esc((TYPES[type] || TYPES.other).label)}</p>
<a id="shfb" target="_blank" rel="noopener"><span class="ic fb">f</span>Share on Facebook</a>
<a id="shli" target="_blank" rel="noopener"><span class="ic li">in</span>Share on LinkedIn</a>
<button type="button" id="shcp"><span class="ic cp">⧉</span><span id="shcpt">Copy link</span></button>
<button type="button" class="x" id="shx">Close</button>
</div></div>
<script>
(function(){var U=${JSON.stringify(deckUrl)},e=encodeURIComponent(U),ov=document.getElementById('shov');
document.getElementById('shfb').href='https://www.facebook.com/sharer/sharer.php?u='+e;
document.getElementById('shli').href='https://www.linkedin.com/sharing/share-offsite/?url='+e;
var w=document.getElementById('watch'),f=w&&w.parentNode;if(f){var l=document.createElement('div');l.className='l';f.insertBefore(l,w);l.appendChild(w);
var b=document.createElement('button');b.type='button';b.className='sharebtn';b.textContent='↗ Share my deck';l.appendChild(b);b.onclick=function(){ov.hidden=false}}
document.getElementById('shx').onclick=function(){ov.hidden=true};ov.onclick=function(ev){if(ev.target===ov)ov.hidden=true};
document.getElementById('shcp').onclick=function(){var t=document.getElementById('shcpt');function ok(){t.textContent='Link copied ✓';setTimeout(function(){t.textContent='Copy link'},1800)}
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(U).then(ok,fb)}else fb();
 function fb(){var a=document.createElement('textarea');a.value=U;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(x){t.textContent=U}a.remove()}};
var c=document.getElementById('cards');if(c)c.addEventListener('click',function(){var i=document.querySelector('.info:not([hidden]) .it');if(i&&i.textContent==='From the video')i.textContent='From the talk'});
})();
</script>
`;
  return h.renderDeck(data)
    .replace(/<title>[^<]*<\/title>/, metaTags(m))
    .replace('<span><i style="background:var(--gold)"></i>From the video</span>', '<span><i style="background:var(--gold)"></i>From the talk</span>')
    .replace("Any YouTube video, applied to you. <small>", 'A talk, applied to my project. <small>· <a href="/talk/rye" style="color:var(--gold);text-decoration:none;font-weight:600">Read the talk</a> ')
    .replace("</body>", share + "</body>");
}

function testPage(origin) {
  const ex = origin + BASE + "/example";
  const exMeta = shareMeta(EXAMPLE, "shop", ex, origin);
  const chips = Object.entries(TYPES).map(([k, t]) =>
    '<button type="button" class="chip" data-type="' + k + '" aria-pressed="' + (k === "shop") + '">' + esc(t.label) + "</button>").join("");
  const rows = [["og:title", exMeta.title], ["og:description", exMeta.description], ["og:image", exMeta.image + " (1200×630 PNG)"], ["og:url", exMeta.url], ["twitter:card", "summary_large_image"]]
    .map(([k, v]) => "<tr><th>" + esc(k) + "</th><td>" + esc(v) + "</td></tr>").join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>R&amp;D: share card · iTabs</title>
<style>
  :root { --bg:#050508; --card:#111118; --line:rgba(255,255,255,.1); --text:#f4f4f7; --muted:#a0a0b0; --accent:#2563eb; --accent-soft:#60a5fa; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; display:flex; justify-content:center; padding:24px 16px; }
  main { width:100%; max-width:640px; display:flex; flex-direction:column; gap:20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:22px 20px; }
  .tag { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent-soft); }
  h1 { font-size:28px; line-height:1.15; margin:8px 0 8px; } h2 { font-size:19px; margin-bottom:10px; }
  p + p, p + ol, ol + p { margin-top:10px; } .muted { color:var(--muted); font-size:15px; }
  ol { padding-left:20px; } li + li { margin-top:6px; }
  .preview { display:block; width:100%; height:auto; aspect-ratio:1200/630; border-radius:12px; border:1px solid var(--line); background:#0b0c0f; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
  .chip { padding:8px 14px; border-radius:99px; border:1px solid var(--line); background:rgba(255,255,255,.06); color:var(--text); font:inherit; font-size:14px; font-weight:600; cursor:pointer; }
  .chip[aria-pressed="true"] { background:var(--accent); border-color:var(--accent); }
  .btn { display:block; width:100%; margin-top:12px; padding:14px; border-radius:14px; border:1px solid var(--accent); background:var(--accent); color:#fff; font:inherit; font-weight:700; text-align:center; text-decoration:none; cursor:pointer; }
  .btn.ghost { background:rgba(255,255,255,.06); border-color:var(--line); }
  input { width:100%; margin-top:10px; padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:#0a0a10; color:var(--text); font:inherit; font-size:16px; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:6px; } th, td { text-align:left; padding:7px 6px; border-bottom:1px solid var(--line); vertical-align:top; overflow-wrap:anywhere; }
  th { color:var(--muted); font-weight:600; white-space:nowrap; } a { color:var(--accent-soft); }
  .msg { margin-top:8px; font-size:14px; color:#ff8a8a; } .msg:empty { display:none; }
  footer { text-align:center; font-size:13px; color:var(--muted); padding-bottom:12px; }
</style>
</head>
<body>
<main>
  <section class="card">
    <div class="tag">R&amp;D test · not live</div>
    <h1>Share card for talk decks</h1>
    <p class="muted">Testing a shareable deck: a 1200×630 preview card for Facebook and LinkedIn, and a link that opens the deck with working gold and blue i-buttons. Example: Rye Smith's talk.</p>
  </section>

  <section class="card">
    <h2>The preview image</h2>
    <img class="preview" id="pv" src="${BASE}/img/rye-shop.png" alt="${esc(exMeta.alt)}" width="1200" height="630">
    <div class="chips" id="chips">${chips}</div>
    <p class="muted" style="margin-top:10px">One image per project type. The reader's own words aren't on it, so nothing personal is shared.</p>
  </section>

  <section class="card">
    <h2>Try the example deck</h2>
    <p class="muted">An example deck from Rye's notes, for an online shop. Tap the i-buttons, then <b>Share my deck</b>.</p>
    <a class="btn" href="${BASE}/example">Open the example deck</a>
  </section>

  <section class="card">
    <h2>Try it with a real deck</h2>
    <p class="muted">Make a deck on <a href="/talk/rye">Rye's talk page</a> (Apply this talk to my project), then paste its link here to see the share-ready version.</p>
    <input id="paste" type="url" placeholder="${esc(origin)}/talk/rye/d/…" autocomplete="off">
    <button type="button" class="btn ghost" id="go">Open share-ready version</button>
    <p class="msg" id="msg"></p>
  </section>

  <section class="card">
    <h2>What a shared link sends</h2>
    <table>${rows}</table>
    <p class="muted" style="margin-top:12px">Check the preview in the official tools (both need you to be logged in):</p>
    <a class="btn ghost" target="_blank" rel="noopener" href="https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(ex)}">Facebook Sharing Debugger</a>
    <a class="btn ghost" target="_blank" rel="noopener" href="https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(ex)}">LinkedIn Post Inspector</a>
  </section>

  <footer>Made with iTabs · R&amp;D</footer>
</main>
<script>
(function(){var c=document.querySelectorAll('.chip'),pv=document.getElementById('pv');
for(var i=0;i<c.length;i++)c[i].addEventListener('click',function(){for(var j=0;j<c.length;j++)c[j].setAttribute('aria-pressed',c[j]===this?'true':'false');pv.src='${BASE}/img/rye-'+this.getAttribute('data-type')+'.png'});
document.getElementById('go').addEventListener('click',function(){var v=document.getElementById('paste').value,m=v.match(/\\/talk\\/rye\\/d\\/([A-Za-z0-9]{6,16})/)||v.match(/^\\s*([A-Za-z0-9]{6,16})\\s*$/);
 if(!m){document.getElementById('msg').textContent='Paste a deck link from Rye\\'s talk page, like /talk/rye/d/AbC123xy.';return}
 location.href='${BASE}/d/'+m[1]});
})();
</script>
</body>
</html>`;
}
