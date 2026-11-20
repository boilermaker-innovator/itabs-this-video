// iTabs This Talk: events (meetups) and their talks. ONE list drives everything:
// the event page at /event/<id>, and the "More talks from this meetup" card on each talk page.
//
// To add a speaker: add one entry to the event's talks, in running order.
//   With a page:    { speaker: "Name", title: "Talk title", slug: "name" }  (slug = /talk/<slug>)
//   Without a page: { speaker: "Name", title: "Talk title" }  (title optional; shows "Slides coming soon")
// To add an event: add one entry to EVENTS, make its QR code
// (src/talk/events/<id>-qr.png, pointing at https://itabs-this-video.jgwynne7.workers.dev/event/<id>)
// and add it to EVENT_QR below.
import PERTH_QR from "./events/claude-for-everyone-perth-qr.png";
import ADELAIDE_QR from "./events/claude-in-motion-adelaide-qr.png";

export const SITE = "itabs-this-video.jgwynne7.workers.dev";

export const EVENTS = {
  "claude-for-everyone-perth": {
    name: "Claude for Everyone, Perth",
    host: "Claude Community Australia",
    venue: "Bloom, St Catherine's College",
    date: "Tuesday 17 November 2026",
    intro: "Every talk from the night, as a take-home lesson. Scan, read, and apply it to your own work.",
    talks: [
      { speaker: "Vanessa Ennis", title: "Personalised dashboards" },
      { speaker: "Vladimir Vorotilov", title: "AI and Unreal Engine for mining digital twins" },
      { speaker: "Jeroen van Dalen" },
      { speaker: "Aidan Morgan", title: "Quality gates for agents: Make bad code fail", slug: "aidan" },
      { speaker: "Rye Smith", title: "Getting found by AI: how Spruik runs SEO with Claude", slug: "rye" },
    ],
  },
  "claude-in-motion-adelaide": {
    name: "Claude in Motion, Adelaide",
    host: "Claude Community Australia",
    venue: "Venue to be announced",
    date: "Tuesday 24 November 2026, 6:00 pm",
    intro: "A night for the creative side of Claude. Every talk from the night, as a take-home lesson.",
    talks: [],   // No speakers yet: the page shows "Speakers' talks will appear here after the night."
  },
};

const EVENT_QR = { "claude-for-everyone-perth": PERTH_QR, "claude-in-motion-adelaide": ADELAIDE_QR };

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The event a talk page belongs to, or null.
export function eventForTalk(slug) {
  for (const [id, ev] of Object.entries(EVENTS)) if (ev.talks.some((t) => t.slug === slug)) return { id, ...ev };
  return null;
}

const BASE = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "cache-control": "public, max-age=300" };

// Returns a Response for an /event path, or null so the main router carries on.
export function eventRoute(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const m = url.pathname.match(/^\/event\/([a-z0-9-]+)(\/qr\.png)?\/?$/);
  if (!m || !EVENTS[m[1]]) return null;
  const head = request.method === "HEAD";
  if (m[2]) {
    if (!EVENT_QR[m[1]]) return null;
    return new Response(head ? null : EVENT_QR[m[1]], { headers: { ...BASE, "content-type": "image/png" } });
  }
  return new Response(head ? null : renderEvent(m[1]), { headers: { ...BASE, "content-type": "text/html; charset=utf-8" } });
}

export function renderEvent(id) {
  const ev = EVENTS[id];
  const address = SITE + "/event/" + id;
  const cards = !ev.talks.length
    ? '<div class="talk empty">Speakers\' talks will appear here after the night.</div>'
    : ev.talks.map((t) => {
    const inner = '<span class="who">' + esc(t.speaker) + "</span>" + (t.title ? '<span class="what">' + esc(t.title) + "</span>" : "");
    return t.slug
      ? '<a class="talk" href="/talk/' + esc(t.slug) + '">' + inner + '<span class="go">Read the talk →</span></a>'
      : '<div class="talk soon" aria-disabled="true">' + inner + '<span class="badge">Slides coming soon</span></div>';
  }).join("\n      ");
  const desc = ev.intro + " " + ev.host + " · " + ev.venue + " · " + ev.date + ".";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ev.name)} · iTabs This Talk</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(ev.name)}">
<meta property="og:description" content="${esc(desc)}">
<style>
  :root { --bg:#050508; --card:#111118; --line:rgba(255,255,255,.1); --text:#f4f4f7; --muted:#a0a0b0; --accent:#2563eb; --accent-soft:#60a5fa; --ok:#2ecc71; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; min-height:100vh; display:flex; flex-direction:column; align-items:center; gap:20px; padding:24px 16px; }
  main { width:100%; max-width:430px; display:flex; flex-direction:column; gap:20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:24px 20px; }
  .tag { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
  h1 { font-size:30px; line-height:1.15; margin:8px 0 10px; }
  .meta { color:var(--muted); font-size:15px; }
  .meta span { display:block; }
  .lead { margin-top:14px; font-size:17px; font-weight:600; }
  h2 { font-size:21px; line-height:1.25; margin-bottom:12px; }
  .talks { display:flex; flex-direction:column; gap:10px; }
  .empty { padding:22px 16px; text-align:center; color:var(--muted); font-size:16px; }
  .talk { display:block; padding:16px; border-radius:14px; border:1px solid var(--line); background:rgba(255,255,255,.04); color:var(--text); text-decoration:none; }
  a.talk { border-color:rgba(37,99,235,.6); }
  a.talk:active { transform:scale(.98); }
  .who { display:block; font-size:13px; font-weight:700; color:var(--accent-soft); }
  .what { display:block; font-size:17px; font-weight:600; margin-top:2px; }
  .go { display:inline-block; margin-top:8px; font-size:14px; font-weight:700; color:var(--accent-soft); }
  .soon { opacity:.6; cursor:default; }
  .soon .who { color:var(--muted); }
  .badge { display:inline-block; margin-top:8px; padding:3px 10px; border-radius:99px; border:1px solid var(--line); font-size:12px; font-weight:600; color:var(--muted); }
  .qr { width:100%; max-width:720px; text-align:center; }
  .qr img { display:block; margin:0 auto; width:min(92vw, 70vh, 640px); height:auto; aspect-ratio:1; background:#fff; border-radius:20px; padding:12px; image-rendering:pixelated; }
  .qr .scan { margin-top:14px; font-size:clamp(18px, 3vw, 30px); font-weight:700; }
  .qr .addr { margin-top:4px; font-size:clamp(14px, 2.2vw, 22px); color:var(--muted); overflow-wrap:anywhere; }
  .btn { display:block; width:100%; padding:16px; border-radius:14px; border:1px solid var(--accent); background:var(--accent); color:#fff; font:inherit; font-weight:700; text-align:center; text-decoration:none; }
  .btn small { display:block; font-weight:400; font-size:13px; color:rgba(255,255,255,.8); margin-top:2px; }
  .btn:active { transform:scale(.98); }
  footer { text-align:center; font-size:13px; color:var(--muted); line-height:1.8; padding-bottom:12px; }
  footer a { color:inherit; }
</style>
</head>
<body>
<main>
  <section class="card">
    <div class="tag">iTabs This Talk · Event</div>
    <h1>${esc(ev.name)}</h1>
    <p class="meta"><span>${esc(ev.host)}</span><span>${esc(ev.venue)}</span><span>${esc(ev.date)}</span></p>
    <p class="lead">${esc(ev.intro)}</p>
  </section>

  <section class="card">
    <h2>The talks</h2>
    <div class="talks">
      ${cards}
    </div>
  </section>
</main>

<section class="qr">
  <img src="/event/${esc(id)}/qr.png" alt="QR code for ${esc(address)}">
  <p class="scan">Scan for every talk from the night</p>
  <p class="addr">${esc(address)}</p>
</section>

<main>
  <a class="btn" href="/talk/skill" download>Add your talk<small>Get the iTabs This Talk skill and make a page for your talk</small></a>

  <footer>Made with iTabs · Jon · <a href="tel:0421508009">0421 508 009</a> · <a href="mailto:jgwynne7@gmail.com">jgwynne7@gmail.com</a></footer>
</main>
</body>
</html>`;
}
