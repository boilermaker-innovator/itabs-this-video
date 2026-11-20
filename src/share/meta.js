// Open Graph + Twitter card tags for any page with a share card. No reader-typed words go in here.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function shareTags({ title, description, url, image, alt }) {
  const t = esc(title), d = esc(description), u = esc(url), i = esc(image), a = esc(alt);
  return `
<link rel="canonical" href="${u}">
<meta name="description" content="${d}">
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

// Video decks. "Applied to" only appears if the deck records a project type (video decks don't yet).
export const PROJECT_LABELS = { cafe: "Cafe or food", trades: "Trades", shop: "Online shop", startup: "Startup or app", other: "Other" };
export function videoShare(data, id, origin) {
  const applied = PROJECT_LABELS[data.projectType] || "";
  return {
    card: { kind: "video", kicker: "My takeaway from", title: data.videoTitle, sub: data.channel,
      pill: applied ? [{ text: "Applied to: ", tone: "soft" }, { text: applied }] : null },
    tags: {
      title: "My takeaway from " + data.videoTitle,
      description: "A video by " + data.channel + ", as a personalised iTabs deck. Tap the gold and blue i-buttons to see what it says and how it applies.",
      url: origin + "/d/" + id,
      image: origin + "/d/" + id + "/card.png",
      alt: "My takeaway from " + data.videoTitle + ", by " + data.channel + (applied ? ". Applied to: " + applied : "") + ". Made with iTabs.",
    },
  };
}

// Event pages.
export function eventShare(ev, id, origin) {
  const n = ev.talks.length;
  const count = n ? n + (n === 1 ? " talk" : " talks") : "Talks added after the night";
  const when = [ev.city, ev.date].filter(Boolean).join(" · ");
  return {
    card: { kind: "talk", kicker: "Every talk from", title: ev.name, sub: when,
      pill: [{ text: count, tone: "soft" }, { text: " · scan for take-home lessons" }] },
    tags: {
      title: "Every talk from " + ev.name,
      description: ev.intro + " " + when + ".",
      url: origin + "/event/" + id,
      image: origin + "/event/" + id + "/card.png",
      alt: "Every talk from " + ev.name + ". " + when + ". " + count + " · scan for take-home lessons. Made with iTabs.",
    },
  };
}

// "Try it now" sample decks.
import { SAMPLES, TYPES } from "../demo/decks.js";
export function demoShare(sample, type, origin) {
  const s = SAMPLES[sample], t = TYPES[type];
  const sub = s.madeUp ? "Sample · made up for this demo, not official training" : s.by;
  return {
    card: { kind: s.kind, kicker: "My takeaway from", title: s.fullTitle, sub, pill: [{ text: "Applied to: ", tone: "soft" }, { text: t.label }] },
    tags: {
      title: "My takeaway from " + s.fullTitle,
      description: (s.madeUp ? "A sample " + s.label.toLowerCase() : "A talk by " + s.by.split(",")[0]) + ", applied to " + t.forWho + ". Tap the gold and blue i-buttons to see what it says and how it applies.",
      url: origin + "/demo/" + sample + "/" + type,
      image: origin + "/demo/" + sample + "/" + type + "/card.png",
      alt: "My takeaway from " + s.fullTitle + ". " + sub + ". Applied to: " + t.label + ". Made with iTabs.",
    },
  };
}

// Decks made from someone's own slides (/m/<id>, private link). Uses only the talk's title,
// speaker and the project type picked.
export function makeShare(rec, id, origin) {
  const d = rec.deck, applied = PROJECT_LABELS[rec.type] || "My project";
  return {
    card: { kind: "talk", kicker: "My takeaway from", title: d.videoTitle, sub: d.channel,
      pill: [{ text: "Applied to: ", tone: "soft" }, { text: applied }] },
    tags: {
      title: "My takeaway from " + d.videoTitle,
      description: "A talk or lesson as a personalised iTabs deck. Tap the gold and blue i-buttons to see what it says and how it applies.",
      url: origin + "/m/" + id,
      image: origin + "/m/" + id + "/card.png",
      alt: "My takeaway from " + d.videoTitle + ". " + d.channel + ". Applied to: " + applied + ". Made with iTabs.",
    },
  };
}
