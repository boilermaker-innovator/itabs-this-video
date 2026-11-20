// Turns a notes MD (talk-notes structure) into a page with the same layout as the talk pages.
// The styles are taken straight from Aidan's talk page, so the look always matches.
import AIDAN_PAGE from "../talk/aidan/index.html";

const STYLE = (AIDAN_PAGE.match(/<style>[\s\S]*?<\/style>/) || [""])[0];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// **bold**, *italic* and `code`, after escaping.
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");

// Splits a notes MD into its parts.
export function parseNotes(md) {
  const text = String(md).replace(/\r/g, "");
  const first = text.search(/^## /m);
  const head = (first < 0 ? text : text.slice(0, first)).split("\n");
  const out = { title: "", byline: "", who: "", notes: [], sections: [] };
  for (const l of head) {
    if (/^# /.test(l) && !out.title) out.title = l.slice(2).trim();
    else if (/^\*\*[^*].*\*\*\s*$/.test(l) && !out.byline) out.byline = l.replace(/^\*\*|\*\*\s*$/g, "").trim();
    else if (/^> \*\*Who it's for:\*\*/i.test(l)) out.who = l.replace(/^> \*\*Who it's for:\*\*\s*/i, "").trim();
    else if (/^> /.test(l)) out.notes.push(l.slice(2).trim());
  }
  if (first >= 0) {
    for (const chunk of text.slice(first).split(/^## /m).filter(Boolean)) {
      const nl = chunk.indexOf("\n");
      const heading = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
      const body = (nl < 0 ? "" : chunk.slice(nl + 1)).replace(/^-{3,}\s*$/gm, "").replace(/^\*Made with iTabs.*$/gm, "").trim();
      out.sections.push({ heading, body });
    }
  }
  return out;
}

// Generic markdown blocks: paragraphs, lists, tables, "> " boxes.
function blocks(body) {
  const lines = body.split("\n"), html = [];
  let i = 0, firstPara = true;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|[\s:|-]+\|?\s*$/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())); i++; }
      if (rows.length) html.push("<table><thead><tr>" + rows[0].map((c) => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>" +
        rows.slice(1).map((r) => "<tr>" + r.map((c) => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>");
      firstPara = false; continue;
    }
    if (/^\d+\.\s/.test(l)) { const items = []; while (i < lines.length && /^\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, "")); html.push("<ol>" + items.map((x) => "<li>" + inline(x) + "</li>").join("") + "</ol>"); firstPara = false; continue; }
    if (/^[-*]\s/.test(l)) { const items = []; while (i < lines.length && /^[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^[-*]\s+(\[[ x]\]\s+)?/, "")); html.push("<ul>" + items.map((x) => "<li>" + inline(x) + "</li>").join("") + "</ul>"); firstPara = false; continue; }
    if (/^>\s?/.test(l)) { const q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, "")); html.push('<p class="box">' + inline(q.join(" ")) + "</p>"); firstPara = false; continue; }
    if (/^```/.test(l)) { i++; const code = []; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; html.push('<div class="prompt"><pre>' + esc(code.join("\n")) + "</pre></div>"); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(\||\d+\.\s|[-*]\s|>|```)/.test(lines[i])) para.push(lines[i++]);
    const p = para.join(" ");
    html.push(firstPara && /^\*\*[^*]+\*\*$/.test(p.trim()) ? '<p class="big">' + inline(p.trim().slice(2, -2)) + "</p>" : "<p>" + inline(p) + "</p>");
    firstPara = false;
  }
  return html.join("\n    ");
}

// The page. opts: { mdUrl, deckUrl, disclaimer, reportHref, tag, tags (extra <head> HTML) }
export function notesPage(md, opts) {
  const n = parseNotes(md);
  const find = (re) => n.sections.find((s) => re.test(s.heading));
  const homework = find(/^your homework/i), apply = find(/^how to apply/i), check = find(/^check yourself/i);
  const rest = n.sections.filter((s) => s !== homework && s !== apply && s !== check);
  const hw = homework ? blocks(homework.body) : "";
  const prompt = apply ? ((apply.body.match(/```[a-z]*\n([\s\S]*?)\n```/) || [])[1] || "") : "";
  const applyIntro = apply ? apply.body.replace(/```[\s\S]*?```/g, "").trim() : "";
  const checks = check ? check.body.split("\n").filter((l) => /^[-*]\s+\[[ x]\]/.test(l)).map((l) => l.replace(/^[-*]\s+\[[ x]\]\s+/, "")) : [];
  const card = (s) => '  <section class="card">\n    <h2>' + inline(s.heading) + "</h2>\n    " + blocks(s.body) + "\n  </section>";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(n.title || "Notes")} · Draft notes</title>
${opts.tags || ""}
${STYLE}
<style>
  .disc { font-size:14px; } .disc a { color:#60a5fa; font-weight:600; }
  .beta { display:inline-block; margin-left:6px; padding:1px 8px; border-radius:99px; background:#13244d; border:1px solid #2563eb; color:#93c5fd; font-size:11px; letter-spacing:.04em; vertical-align:2px; }
  .card code { font-size:.92em; }
</style>
</head>
<body>
<main>
  <section class="card">
    <div class="tag">${esc(opts.tag || "Draft notes")} <span class="beta">BETA</span></div>
    <h1>${inline(n.title || "Untitled talk")}</h1>
    ${n.byline ? '<div class="by">' + inline(n.byline) + "</div>" : ""}
    ${n.who ? "<p class=\"box\"><strong>Who it's for:</strong> " + inline(n.who) + "</p>" : ""}
    ${n.notes.map((x) => '<p class="note">' + inline(x) + "</p>").join("\n    ")}
  </section>

  <section class="card disc"><p class="box">${esc(opts.disclaimer)} <a href="${esc(opts.reportHref)}">Report this page</a></p></section>

  <section class="buttons">
    <a class="btn primary" href="${esc(opts.mdUrl)}" download>Download the MD<small>These notes as one file</small></a>
    <button class="btn" id="copyBtn" type="button">Copy to my own AI<small>Copies the notes, paste into Claude, ChatGPT or similar</small></button>
    <a class="btn" href="${esc(opts.deckUrl)}">Back to my iTabs deck<small>The gold and blue cards</small></a>
  </section>
${homework ? `
  <section class="card homework">
    <div class="tag">Your homework</div>
    ${hw}
  </section>
` : ""}
${rest.map(card).join("\n\n")}
${apply ? `
  <section class="card">
    <h2>${inline(apply.heading)}</h2>
    ${applyIntro ? "<p>" + inline(applyIntro) + "</p>" : ""}
    <div class="prompt">
      <pre id="promptText">${esc(prompt)}</pre>
      <button class="btn" id="promptCopy" type="button">Copy this prompt</button>
    </div>
  </section>
` : ""}
${checks.length ? `
  <section class="card">
    <h2>Check yourself</h2>
    <ul class="checks" id="checks">
      ${checks.map((x) => '<li><button class="check" type="button" role="checkbox" aria-checked="false"><span class="tick">✓</span>' + inline(x) + "</button></li>").join("\n      ")}
    </ul>
    <p class="progress" id="progress">0 of ${checks.length} done</p>
  </section>
` : ""}
  <footer>
    <strong>Made with iTabs</strong><br>
    <a href="/make">Make one from your own slides</a> · <a href="/">Home</a>
  </footer>
</main>
<script>
(function(){
  function copyText(t,ok,bad){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(t).then(ok,function(){fb()})}else fb();
    function fb(){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();var r=false;try{r=document.execCommand('copy')}catch(e){}a.remove();r?ok():bad()}}
  function flash(btn,html){var old=btn.innerHTML;btn.innerHTML=html;btn.classList.add('done');setTimeout(function(){btn.innerHTML=old;btn.classList.remove('done')},2200)}
  var cb=document.getElementById('copyBtn');cb.addEventListener('click',function(){fetch(${JSON.stringify(opts.mdUrl)}).then(function(r){return r.text()}).then(function(t){copyText(t,function(){flash(cb,'Copied!<small>Now paste it into your AI</small>')},function(){flash(cb,'Couldn\\'t copy<small>Use Download the MD instead</small>')})})});
  var pc=document.getElementById('promptCopy');if(pc)pc.addEventListener('click',function(){copyText(document.getElementById('promptText').textContent,function(){flash(pc,'Copied! Now paste it into your AI')},function(){flash(pc,'Couldn\\'t copy. Press and hold the text instead')})});
  var KEY=${JSON.stringify("itabs-make-" + (opts.key || "notes"))},c=document.querySelectorAll('#checks .check'),pr=document.getElementById('progress');if(!c.length)return;
  var saved=[];try{saved=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){}
  function up(){var s=[],n=0;for(var i=0;i<c.length;i++){var on=c[i].getAttribute('aria-checked')==='true';s.push(on);if(on)n++}
    pr.textContent=n===c.length?'All done. Nice work!':n+' of '+c.length+' done';pr.classList.toggle('all',n===c.length);try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
  for(var i=0;i<c.length;i++){if(saved[i]===true)c[i].setAttribute('aria-checked','true');c[i].addEventListener('click',function(){this.setAttribute('aria-checked',this.getAttribute('aria-checked')==='true'?'false':'true');up()})}
  up();
})();
</script>
</body>
</html>`;
}
