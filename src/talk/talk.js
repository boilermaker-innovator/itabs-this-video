// iTabs This Talk: static talk pages served under /talk. Kept separate from the video code.
import AIDAN_PAGE from "./aidan/index.html";
import AIDAN_MD from "./aidan/aidan-morgan-make-bad-code-fail.md";
import AIDAN_QR from "./aidan/qr-talk-itabs-aidan.png";
import RYE_PAGE from "./rye/index.html";
import RYE_MD from "./rye/rye-smith-getting-found-by-ai.md";
import RYE_QR from "./rye/qr-talk-itabs-rye.png";
import TALK_SKILL from "./skill/SKILL.md";

const BASE = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "cache-control": "public, max-age=300" };
const md = (body, filename) => ({ body, headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": 'attachment; filename="' + filename + '"' } });

// Talks from the same meetup. Each talk page gets a "More talks from this meetup"
// card listing the others. To add a talk: add one line here (slug, speaker, title)
// and register its page, MD and QR in FILES below with talk: "<slug>" on the page.
const MEETUP_TALKS = [
  { slug: "aidan", speaker: "Aidan Morgan", title: "Quality gates for agents: Make bad code fail" },
  { slug: "rye", speaker: "Rye Smith", title: "Getting found by AI: how Spruik runs SEO with Claude" },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const page = (body, talk) => ({ body, talk, headers: { "content-type": "text/html; charset=utf-8" } });

// Adds the "More talks from this meetup" card just above the page footer.
export function withMoreTalks(html, slug) {
  const others = MEETUP_TALKS.filter((t) => t.slug !== slug);
  if (!others.length || !html.includes("<footer>")) return html;
  const links = others.map((t) =>
    '<a class="more-talk" href="/talk/' + esc(t.slug) + '"><span class="more-speaker">' + esc(t.speaker) + '</span><span class="more-title">' + esc(t.title) + "</span></a>").join("\n    ");
  const card = '<section class="card more-talks">\n    <h2>More talks from this meetup</h2>\n    ' + links + "\n  </section>\n\n  ";
  const css = "<style>.more-talks{display:flex;flex-direction:column;gap:10px}.more-talks h2{margin-bottom:2px}" +
    ".more-talk{display:block;padding:14px 16px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--text);text-decoration:none}" +
    ".more-talk:active{transform:scale(.98)}.more-speaker{display:block;font-size:13px;font-weight:700;color:var(--accent-soft,#a29bfe)}" +
    ".more-title{display:block;font-weight:600;margin-top:2px}.more-title::after{content:\" →\";color:var(--muted)}</style>\n";
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
  const body = f.talk ? withMoreTalks(f.body, f.talk) : f.body;
  return new Response(request.method === "HEAD" ? null : body, { headers: { ...BASE, ...f.headers } });
}
