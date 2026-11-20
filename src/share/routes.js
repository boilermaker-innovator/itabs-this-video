// /d/<id>/card.png and /event/<id>/card.png: share card images. Each one is drawn once, then kept
// in KV (keyed by its exact text, so a changed title or event gets a fresh card).
import { renderCard } from "./card.js";
import { videoShare, eventShare } from "./meta.js";
import { EVENTS } from "../talk/events.js";

async function key(spec) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(spec)));
  return "card:v1:" + [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function cardRoute(request, url, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  let spec = null, m;
  if ((m = url.pathname.match(/^\/d\/([A-Za-z0-9]{6,16})\/card\.png$/))) {
    const raw = env.DECKS && await env.DECKS.get("deck:" + m[1]);
    if (!raw) return new Response("Not found", { status: 404 });
    spec = videoShare(JSON.parse(raw), m[1], url.origin).card;
  } else if ((m = url.pathname.match(/^\/event\/([a-z0-9-]+)\/card\.png$/))) {
    if (!EVENTS[m[1]]) return new Response("Not found", { status: 404 });
    spec = eventShare(EVENTS[m[1]], m[1], url.origin).card;
  } else return null;

  const k = await key(spec);
  let png = env.DECKS ? await env.DECKS.get(k, "arrayBuffer") : null;
  if (!png) {
    png = await renderCard(spec);
    if (env.DECKS) await env.DECKS.put(k, png, { expirationTtl: 90 * 86400 });
  }
  return new Response(request.method === "HEAD" ? null : png, { headers: {
    "content-type": "image/png", "cache-control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
