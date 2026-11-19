// iTabs This Talk: static talk pages served under /talk. Kept separate from the video code.
import AIDAN_PAGE from "./aidan/index.html";
import AIDAN_MD from "./aidan/aidan-morgan-make-bad-code-fail.md";
import AIDAN_QR from "./aidan/qr-talk-itabs-aidan.png";
import TALK_SKILL from "./skill/SKILL.md";

const BASE = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "cache-control": "public, max-age=300" };
const md = (body, filename) => ({ body, headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": 'attachment; filename="' + filename + '"' } });

const FILES = {
  "/talk/aidan": { body: AIDAN_PAGE, headers: { "content-type": "text/html; charset=utf-8" } },
  "/talk/aidan/aidan-morgan-make-bad-code-fail.md": md(AIDAN_MD, "aidan-morgan-make-bad-code-fail.md"),
  "/talk/aidan/qr-talk-itabs-aidan.png": { body: AIDAN_QR, headers: { "content-type": "image/png" } },
  "/talk/skill": md(TALK_SKILL, "SKILL.md"),
};

// Returns a Response for a /talk path, or null so the main router carries on.
export function talkRoute(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const f = FILES[path];
  if (!f) return null;
  return new Response(request.method === "HEAD" ? null : f.body, { headers: { ...BASE, ...f.headers } });
}
