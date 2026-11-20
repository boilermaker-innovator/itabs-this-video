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
