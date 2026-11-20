// The home page (/) and the events list (/events). The YouTube video tool lives at /video,
// unchanged; deck links (/d/...) are untouched.
import { demoSection, DEMO_CSS } from "./demo/demo.js";
import { EVENTS } from "./talk/events.js";
import { shareTags } from "./share/meta.js";
import { HOME_LINK, HOME_LINK_CSS } from "./homelink.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


const BASE_CSS = `
:root{--bg:#0b0c0f;--card:#16181d;--raised:#23262d;--line:#2e323a;--fg:#f4f5f7;--muted:#a3a8b3;--gold:#f59e0b;--bluedot:#60a5fa;color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5;min-height:100vh;min-height:100dvh}
.wrap{max-width:460px;margin:0 auto;padding:28px 16px calc(24px + env(safe-area-inset-bottom,0px))}
.brand{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--muted);letter-spacing:.02em}
.brand i{width:22px;height:22px;border-radius:50%;background:var(--gold);color:#000;display:grid;place-items:center;font:italic 700 13px Georgia,serif}
.foot{margin-top:28px;text-align:center;font-size:12.5px;color:var(--muted)}
${HOME_LINK_CSS}
`;

function page({ title, tags, css, body }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>${tags}
<style>${BASE_CSS}${css}</style></head>
<body><div class="wrap">
${body}
 <p class="foot">Made with <b>iTabs</b> · itabs.co</p>
</div></body></html>`;
}

export function renderLanding(origin) {
  const tags = shareTags({
    title: "iTabs: take-home lessons from any talk, lesson or video",
    description: "Pick a sample, pick your project, and see your own iTabs in seconds. Or make one from any YouTube video.",
    url: origin + "/", image: origin + "/og.png", alt: "iTabs",
  });
  const css = DEMO_CSS + `
.go2{display:flex;flex-direction:column;gap:10px;margin-top:22px}
.big{display:flex;align-items:center;gap:14px;min-height:72px;padding:16px 18px;border-radius:16px;text-decoration:none;color:var(--fg);background:var(--card);border:1px solid var(--line);transition:border-color .15s,transform .1s}
.big:hover{border-color:#2563eb}.big:active{transform:scale(.98)}
.big .tx{flex:1;min-width:0}.big b{display:block;font-size:18px;line-height:1.25}.big small{display:block;font-size:13.5px;color:var(--muted);margin-top:2px}
.big::after{content:"›";font-size:26px;line-height:1;color:var(--muted)}
.big.main{background:#2563eb;border-color:#2563eb;color:#fff}.big.main small{color:rgba(255,255,255,.85)}.big.main::after{color:#fff}
.big:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
@media (min-width:700px){.big{min-height:80px}.big b{font-size:19px}}
`;
  // The demo section ends with an "Or use any YouTube video" divider meant for the old page; drop it here.
  const demo = demoSection().replace(/\n <p class="or">[^<]*<\/p>\n?$/, "\n");
  return page({ title: "iTabs", tags, css, body: `
 <div class="brand"><i>i</i>iTabs</div>
${demo}
 <nav class="go2" aria-label="More iTabs">
  <a class="big main" href="/video"><span class="tx"><b>Make one from a YouTube video</b><small>Paste a link, say who's watching, get cards made for you</small></span></a>
  <a class="big" href="/events"><span class="tx"><b>Talks and events</b><small>Take-home lessons from every talk on the night</small></span></a>
 </nav>` });
}

// Events, newest first (by each event's "iso" date).
export function renderEvents(origin) {
  const list = Object.entries(EVENTS).sort((a, b) => String(b[1].iso || "").localeCompare(String(a[1].iso || "")));
  const cards = list.map(([id, ev]) => {
    const n = ev.talks.length, linked = ev.talks.filter((t) => t.slug).length;
    const count = n ? n + (n === 1 ? " talk" : " talks") + (linked ? " · " + linked + " to read" : "") : "Talks added after the night";
    return `  <a class="ev" href="/event/${esc(id)}"><span class="tx"><b>${esc(ev.name)}</b><small>${esc([ev.city, ev.date].filter(Boolean).join(" · "))}</small><em>${esc(count)}</em></span></a>`;
  }).join("\n");
  const tags = shareTags({
    title: "iTabs talks and events",
    description: "Every talk from the night, as a take-home lesson.",
    url: origin + "/events", image: origin + "/og.png", alt: "iTabs talks and events",
  });
  const css = `
h1{font-size:28px;line-height:1.15;letter-spacing:-.01em;margin:16px 0 6px}
.lead{color:var(--muted);font-size:15px;margin-bottom:18px}
.evs{display:flex;flex-direction:column;gap:10px}
.ev{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:16px;background:var(--card);border:1px solid var(--line);color:var(--fg);text-decoration:none;transition:border-color .15s,transform .1s}
.ev:hover{border-color:#2563eb}.ev:active{transform:scale(.98)}.ev:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.ev .tx{flex:1;min-width:0}.ev b{display:block;font-size:18px;line-height:1.25}.ev small{display:block;color:var(--muted);font-size:14px;margin-top:2px}
.ev em{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:99px;background:#13244d;border:1px solid #2563eb;color:#93c5fd;font-style:normal;font-size:12.5px;font-weight:600}
.ev::after{content:"›";font-size:26px;line-height:1;color:var(--muted)}
.add{display:block;margin-top:18px;text-align:center;color:#60a5fa;font-weight:600;font-size:14px;text-decoration:none}
`;
  return page({ title: "Talks and events · iTabs", tags, css, body: `
 ${HOME_LINK}
 <div class="brand"><i>i</i>iTabs This Talk</div>
 <h1>Talks and events</h1>
 <p class="lead">Every talk from the night, as a take-home lesson.</p>
 <div class="evs">
${cards}
 </div>
 <a class="add" href="/talk/skill" download>Giving a talk? Get the skill to make your page</a>` });
}
