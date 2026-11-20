// iTabs This Talk: static talk pages served under /talk. Kept separate from the video code.
import AIDAN_PAGE from "./aidan/index.html";
import AIDAN_MD from "./aidan/aidan-morgan-make-bad-code-fail.md";
import AIDAN_QR from "./aidan/qr-talk-itabs-aidan.png";
import RYE_PAGE from "./rye/index.html";
import RYE_MD from "./rye/rye-smith-getting-found-by-ai.md";
import RYE_QR from "./rye/qr-talk-itabs-rye.png";
import TALK_SKILL from "./skill/SKILL.md";
import { eventForTalk, esc } from "./events.js";
import { withApplyBox } from "./apply.js";

const BASE = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "cache-control": "public, max-age=300" };
const md = (body, filename) => ({ body, headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": 'attachment; filename="' + filename + '"' } });

// Each talk page gets a "More talks from this meetup" card, built from its event's
// talks in events.js (the one list for events and talks). Register a talk's page, MD
// and QR in FILES below with talk: "<slug>" on the page.

const page = (body, talk) => ({ body, talk, headers: { "content-type": "text/html; charset=utf-8" } });

// Adds the "More talks from this meetup" card just above the page footer.
export function withMoreTalks(html, slug) {
  const ev = eventForTalk(slug);
  if (!ev || !html.includes("<footer>")) return html;
  const others = ev.talks.filter((t) => t.slug && t.slug !== slug);
  const links = others.map((t) =>
    '<a class="more-talk" href="/talk/' + esc(t.slug) + '"><span class="more-speaker">' + esc(t.speaker) + '</span><span class="more-title">' + esc(t.title) + "</span></a>").join("\n    ");
  const whole = '<a class="more-all" href="/event/' + esc(ev.id) + '">See the whole night →<small>' + esc(ev.name) + "</small></a>";
  const card = '<section class="card more-talks">\n    <h2>More talks from this meetup</h2>\n    ' + (links ? links + "\n    " : "") + whole + "\n  </section>\n\n  ";
  const css = "<style>.more-talks{display:flex;flex-direction:column;gap:10px}.more-talks h2{margin-bottom:2px}" +
    ".more-talk{display:block;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--text);text-decoration:none}" +
    ".more-talk:active{transform:scale(.98)}.more-speaker{display:block;font-size:13px;font-weight:700;color:var(--accent-soft,#60a5fa)}" +
    ".more-title{display:block;font-weight:600;margin-top:2px}.more-title::after{content:\" →\";color:var(--muted)}" +
    ".more-all{display:block;padding:14px 16px;border-radius:12px;background:var(--accent);color:#fff;font-weight:700;text-align:center;text-decoration:none}" +
    ".more-all small{display:block;font-weight:400;font-size:13px;color:rgba(255,255,255,.8);margin-top:2px}.more-all:active{transform:scale(.98)}</style>\n";
  return html.replace("</head>", css + "</head>").replace("<footer>", card + "<footer>");
}

const FILES = {
  "/talk/aidan": page(AIDAN_PAGE, "aidan"),
  "/talk/aidan/aidan-morgan-make-bad-code-fail.md": md(AIDAN_MD, "aidan-morgan-make-bad-code-fail.md"),
  "/talk/aidan/qr-talk-itabs-aidan.png": { body: AIDAN_QR, headers: { "content-type": "image/png" } },
  "/talk/rye": page(RYE_PAGE, "rye"),
  "/talk/rye/rye-smith-getting-found-by-ai.md": md(RYE_MD, "rye-smith-getting-found-by-ai.md"),
  "/talk/rye/qr-talk-itabs-rye.png": { body: RYE_QR, headers: { "content-type": "image/png" } },
  "/talk/skill": md(TALK_SKILL, "SKILL.md"),
};

// Returns a Response for a /talk path, or null so the main router carries on.
export function talkRoute(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const f = FILES[path];
  if (!f) return null;
  const body = f.talk ? withApplyBox(withMoreTalks(f.body, f.talk), f.talk) : f.body;
  return new Response(request.method === "HEAD" ? null : body, { headers: { ...BASE, ...f.headers } });
}

// A talk's notes MD (the file Download and Copy give people), or null. Used by the AI deck maker.
export function talkNotes(slug) {
  const prefix = "/talk/" + slug + "/";
  for (const [path, f] of Object.entries(FILES)) if (path.startsWith(prefix) && path.endsWith(".md")) return f.body;
  return null;
}
