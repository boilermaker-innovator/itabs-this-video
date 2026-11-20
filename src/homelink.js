// Small "‹ Home" link for the top of /video, /events, event pages and talk pages.
export const HOME_LINK_CSS = ".homelink{display:inline-block;margin:0 0 10px;padding:4px 0;color:#60a5fa;font:600 14px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Inter,Roboto,sans-serif;text-decoration:none}.homelink:hover{text-decoration:underline}";
export const HOME_LINK = '<a class="homelink" href="/">‹ Home</a>';

// Adds the link at the top of a page's first <main> (or right after <body>) and its style to <head>.
export function withHomeLink(html) {
  if (html.includes('class="homelink"')) return html;
  const at = html.includes("<main>") ? "<main>" : "<body>";
  return html.replace("</head>", "<style>" + HOME_LINK_CSS + "</style></head>").replace(at, at + "\n  " + HOME_LINK);
}
