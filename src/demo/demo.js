// "Try it now" demo on the home page. No AI: all 25 decks are ready-made (src/demo/decks.js).
//   /demo/<sample>/<type>            a ready-made deck, with its share card and link-preview tags
//   /demo/<sample>/<type>/card.png   its share card (drawn by src/share/, see routes.js)
//   /demo/<sample>/notes.md          notes for the made-up samples (Aidan and Rye link to their talk pages)
import { SAMPLES, SAMPLE_ORDER, TYPES, demoDeck } from "./decks.js";
import { shareTags, demoShare } from "../share/meta.js";
import HEIGHTS_MD from "./notes/working-at-heights.md";
import WELDING_MD from "./notes/welding-basics.md";
import ELECTRICAL_MD from "./notes/electrical-safety.md";

// Flip to true once /rnd/upload exists; until then the end-of-deck button says "Coming soon".
export const UPLOAD_READY = false;
const NOTES = {
  heights: [HEIGHTS_MD, "working-at-heights.md"],
  welding: [WELDING_MD, "welding-basics.md"],
  electrical: [ELECTRICAL_MD, "electrical-safety.md"],
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const HEADERS = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "cache-control": "public, max-age=300" };

export function demoRoute(request, url, h) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const head = request.method === "HEAD";
  let m = url.pathname.match(/^\/demo\/([a-z]+)\/notes\.md$/);
  if (m && NOTES[m[1]]) return new Response(head ? null : NOTES[m[1]][0], { headers: { ...HEADERS,
    "content-type": "text/markdown; charset=utf-8", "content-disposition": 'attachment; filename="' + NOTES[m[1]][1] + '"' } });
  m = url.pathname.match(/^\/demo\/([a-z]+)\/([a-z]+)\/?$/);
  if (!m) return null;
  const data = demoDeck(m[1], m[2]);
  if (!data) return h.html(h.messagePage("Sample not found", "Pick a sample and a project type on the home page."), 404);
  return new Response(head ? null : demoPage(data, m[1], m[2], url.origin, h), { headers: { ...HEADERS, "content-type": "text/html; charset=utf-8" } });
}

function demoPage(data, sample, type, origin, h) {
  const s = SAMPLES[sample];
  const tags = shareTags(demoShare(sample, type, origin).tags);
  const back = s.madeUp
    ? 'Sample deck · made up for this demo, not official training. <small>· <a href="' + s.notes + '" style="color:var(--gold);text-decoration:none;font-weight:600">Notes</a> · <a href="/#try" style="color:var(--gold);text-decoration:none;font-weight:600">Try another sample</a> '
    : "Sample deck. <small>· <a href=\"" + s.notes + "\" style=\"color:var(--gold);text-decoration:none;font-weight:600\">Read the talk</a> · <a href=\"/#try\" style=\"color:var(--gold);text-decoration:none;font-weight:600\">Try another sample</a> ";
  const cta = UPLOAD_READY
    ? '<a class="up" href="/rnd/upload">Upload your slides</a>'
    : '<span class="up soon" aria-disabled="true">Upload your slides · Coming soon</span>';
  const extras = `<style>
.cta{margin-top:14px;padding:14px;border-radius:12px;background:#13244d;border:1px solid #2563eb;text-align:center}
.cta p{font-size:15px;font-weight:700;margin:0 0 10px}
.cta .up{display:inline-block;padding:10px 16px;border-radius:12px;background:#2563eb;color:#fff;font-weight:700;font-size:14px;text-decoration:none}
.cta .up.soon{background:#23262d;color:#a3a8b3;cursor:default}
</style>
<script>
(function(){var GOLD=${JSON.stringify(s.goldType)};
var last=document.querySelectorAll('.card .body');if(last.length){var box=document.createElement('div');box.className='cta';
box.innerHTML='<p>Want one from your own talk?</p>'+${JSON.stringify(cta)};last[last.length-1].appendChild(box)}
var c=document.getElementById('cards');if(c)c.addEventListener('click',function(){var i=document.querySelector('.info:not([hidden]) .it');if(i&&i.textContent==='From the video')i.textContent=GOLD});
})();
</script>
`;
  return h.renderDeck(data)
    .replace(/<title>[^<]*<\/title>/, "<title>" + esc("My takeaway from " + s.fullTitle) + "</title>" + tags)
    .replace('<span><i style="background:var(--gold)"></i>From the video</span>', '<span><i style="background:var(--gold)"></i>' + esc(s.goldType) + "</span>")
    .replace("Any YouTube video, applied to you. <small>", back)
    .replace("</body>", extras + "</body>");
}

// The "Try it now" section, first on the home page.
export const DEMO_CSS = `
.try{margin:18px 0 6px;padding:18px 16px;border-radius:18px;background:var(--card);border:1px solid #2563eb}
.try h2{font-size:24px;line-height:1.15;letter-spacing:-.01em;margin:0 0 6px;text-wrap:balance}
.try .tl{color:var(--muted);font-size:15px;margin:0 0 12px}
.try .step{display:block;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#60a5fa;margin:14px 0 8px}
.samples{display:flex;flex-direction:column;gap:8px}
.sample{display:block;width:100%;text-align:left;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--raised);color:var(--fg);font:inherit;cursor:pointer}
.sample b{display:block;font-size:12px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:.04em}
.sample span{display:block;font-weight:700;font-size:16px;margin-top:2px}
.sample small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.sample[aria-checked="true"]{border-color:#2563eb;background:#13244d;box-shadow:0 0 0 1px #2563eb inset}
.ptypes{display:flex;flex-wrap:wrap;gap:8px}
.ptype{padding:9px 14px;border-radius:99px;border:1px solid var(--line);background:var(--raised);color:var(--fg);font:600 14px inherit;font-family:inherit;cursor:pointer}
.ptype[aria-checked="true"]{background:#2563eb;border-color:#2563eb;color:#fff}
.trygo{display:block;width:100%;margin-top:16px;padding:15px;border:0;border-radius:14px;background:#2563eb;color:#fff;font:700 17px inherit;font-family:inherit;cursor:pointer}
.trygo:active{transform:scale(.98)}
.trymsg{margin-top:8px;font-size:14px;font-weight:600;color:#fca5a5;text-align:center}.trymsg:empty{display:none}
.trykey{margin-top:10px;font-size:12.5px;color:var(--muted);text-align:center}.trykey i{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 5px 0 0}
.trykey .g{background:var(--gold)}.trykey .b{background:var(--bluedot);margin-left:4px}
.or{display:flex;align-items:center;gap:10px;margin:22px 0 0;color:var(--muted);font-size:13px;font-weight:600}
.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}
`;

export function demoSection() {
  const samples = SAMPLE_ORDER.map((k) => {
    const s = SAMPLES[k];
    const who = s.madeUp ? "Sample · made up for this demo, not official training" : s.by.split(",")[0];
    return '<button type="button" class="sample" role="radio" aria-checked="false" data-k="' + k + '"><b>' + esc(s.label) + "</b><span>" + esc(s.title) + "</span><small>" + esc(who) + "</small></button>";
  }).join("\n   ");
  const types = Object.entries(TYPES).map(([k, t]) =>
    '<button type="button" class="ptype" role="radio" aria-checked="false" data-k="' + k + '">' + esc(t.label) + "</button>").join("");
  return `
 <section class="try" id="try" aria-labelledby="tryh">
  <h2 id="tryh">Turn any talk or lesson into a take-home lesson.</h2>
  <p class="tl">Pick a sample, pick your project, and see your own iTabs in seconds.</p>
  <span class="step" id="s1">Step 1 · Pick a sample</span>
  <div class="samples" role="radiogroup" aria-labelledby="s1">
   ${samples}
  </div>
  <span class="step" id="s2">Step 2 · Pick your project</span>
  <div class="ptypes" role="radiogroup" aria-labelledby="s2">${types}</div>
  <button type="button" class="trygo" id="trygo">Make my sample</button>
  <p class="trymsg" id="trymsg" role="status" aria-live="polite"></p>
  <p class="trykey"><i class="g"></i>Gold = from the talk · <i class="b"></i>Blue = for your project</p>
 </section>
 <script>
 (function(){var pick={sample:'',type:''};
 function group(sel,key){var b=document.querySelectorAll(sel);for(var i=0;i<b.length;i++)b[i].addEventListener('click',function(){pick[key]=this.getAttribute('data-k');for(var j=0;j<b.length;j++)b[j].setAttribute('aria-checked',b[j]===this?'true':'false');document.getElementById('trymsg').textContent=''})}
 group('.sample','sample');group('.ptype','type');
 document.getElementById('trygo').addEventListener('click',function(){var m=document.getElementById('trymsg');
  if(!pick.sample){m.textContent='Pick a sample first.';return}if(!pick.type){m.textContent='Pick your project type.';return}
  location.href='/demo/'+pick.sample+'/'+pick.type});
 })();
 </script>
 <p class="or">Or use any YouTube video</p>
`;
}
