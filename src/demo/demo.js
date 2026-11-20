// "Try it now" demo on the home page. No AI: all 25 decks are ready-made (src/demo/decks.js).
//   /demo/<sample>/<type>            a ready-made deck, with its share card and link-preview tags
//   /demo/<sample>/<type>/card.png   its share card (drawn by src/share/, see routes.js)
//   /demo/<sample>/notes.md          notes for the made-up samples (Aidan and Rye link to their talk pages)
import { SAMPLES, SAMPLE_ORDER, TYPES, demoDeck } from "./decks.js";
import { shareTags, demoShare } from "../share/meta.js";
import HEIGHTS_MD from "./notes/working-at-heights.md";
import WELDING_MD from "./notes/welding-basics.md";
import ELECTRICAL_MD from "./notes/electrical-safety.md";

// The end-of-deck "Upload your slides" button links to /make (set to false to show "Coming soon" instead).
export const UPLOAD_READY = true;
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
    ? '<a class="up" href="/make">Upload your slides</a>'
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

// The "Try it now" section, first on the home page: one question at a time.
// Screen 1 picks a sample, screen 2 a project type, then the ready-made deck opens.
export const DEMO_CSS = `
.try{margin:18px 0 6px;padding:18px 16px 16px;border-radius:18px;background:var(--card);border:1px solid #2563eb}
.try h2{font-size:24px;line-height:1.15;letter-spacing:-.01em;margin:0 0 6px;text-wrap:balance}
.try .tl{color:var(--muted);font-size:15px;margin:0 0 14px}
.trybar{display:flex;align-items:center;justify-content:space-between;min-height:30px;margin-bottom:6px}
.trystep{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#60a5fa}
.tryback{border:0;background:none;color:#60a5fa;font:600 14px inherit;font-family:inherit;padding:6px 2px 6px 8px;cursor:pointer}
.tryback[hidden]{display:none}
.trydots{display:flex;gap:6px;margin-bottom:12px}.trydots i{flex:1;height:4px;border-radius:2px;background:var(--raised);transition:background .3s}
.trydots i.on{background:#2563eb}
.tryview{overflow:hidden;transition:height .35s ease}
.trytrack{display:flex;align-items:flex-start;width:200%;transition:transform .35s ease}
.trytrack.s2{transform:translateX(-50%)}
.trypane{width:50%;flex:0 0 50%;padding:2px}
.trypane h3{font-size:20px;line-height:1.2;margin:0 0 12px}
.tryopts{display:flex;flex-direction:column;gap:10px}
.tryopt{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;text-align:left;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--raised);color:var(--fg);font:inherit;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
.tryopt:hover{border-color:#2563eb}
.tryopt:active{transform:scale(.98)}
.tryopt:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
.tryopt .tx{flex:1;min-width:0}
.tryopt b{display:block;font-size:12px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:.04em}
.tryopt span{display:block;font-weight:700;font-size:17px;margin-top:1px}
.tryopt small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.tryopt::after{content:"›";font-size:24px;line-height:1;color:var(--muted);flex-shrink:0}
.tryopt.picked{border-color:#2563eb;background:#13244d}
.tryopt.picked::after{content:"";width:18px;height:18px;border-radius:50%;border:2px solid #60a5fa;border-top-color:transparent;animation:tryspin .8s linear infinite}
@keyframes tryspin{to{transform:rotate(360deg)}}
.trykey{margin-top:12px;font-size:12.5px;color:var(--muted);text-align:center}.trykey i{display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 5px 0 0}
.trykey .g{background:var(--gold)}.trykey .b{background:var(--bluedot);margin-left:4px}
.or{display:flex;align-items:center;gap:10px;margin:22px 0 0;color:var(--muted);font-size:13px;font-weight:600}
.or::before,.or::after{content:"";flex:1;height:1px;background:var(--line)}
@media (min-width:700px){.tryopt{min-height:64px;padding:16px 18px}.tryopt span{font-size:18px}}
@media (prefers-reduced-motion:reduce){.tryview,.trytrack,.trydots i{transition:none}.tryopt.picked::after{animation:none}}
`;

export function demoSection() {
  const samples = SAMPLE_ORDER.map((k) => {
    const s = SAMPLES[k];
    const who = s.madeUp ? "Sample · made up for this demo, not official training" : s.by.split(",")[0];
    return '<button type="button" class="tryopt" data-sample="' + k + '"><span class="tx"><b>' + esc(s.label) + "</b><span>" + esc(s.title) + "</span><small>" + esc(who) + "</small></span></button>";
  }).join("\n     ");
  const types = Object.entries(TYPES).map(([k, t]) =>
    '<button type="button" class="tryopt" data-type="' + k + '"><span class="tx"><span>' + esc(t.label) + "</span></span></button>").join("\n     ");
  return `
 <section class="try" id="try" aria-labelledby="tryh">
  <h2 id="tryh">Turn any talk or lesson into a take-home lesson.</h2>
  <p class="tl">Pick a sample, pick your project, and see your own iTabs in seconds.</p>
  <div class="trybar"><span class="trystep" id="trystep" aria-live="polite">Step 1 of 2</span><button type="button" class="tryback" id="tryback" hidden>‹ Back</button></div>
  <div class="trydots" aria-hidden="true"><i class="on"></i><i></i></div>
  <div class="tryview" id="tryview">
   <div class="trytrack" id="trytrack">
    <div class="trypane" id="trypane1" role="group" aria-labelledby="tryq1">
     <h3 id="tryq1">What do you want to try?</h3>
     <div class="tryopts">
     ${samples}
     </div>
    </div>
    <div class="trypane" id="trypane2" role="group" aria-labelledby="tryq2" inert aria-hidden="true">
     <h3 id="tryq2">What's your project about?</h3>
     <div class="tryopts">
     ${types}
     </div>
    </div>
   </div>
  </div>
  <p class="trykey"><i class="g"></i>Gold = from the talk · <i class="b"></i>Blue = for your project</p>
 </section>
 <script>
 (function(){var sample='',busy=false,$=function(id){return document.getElementById(id)};
 var view=$('tryview'),track=$('trytrack'),p1=$('trypane1'),p2=$('trypane2'),step=$('trystep'),back=$('tryback'),dots=document.querySelectorAll('.trydots i');
 function fit(){view.style.height=(track.classList.contains('s2')?p2:p1).offsetHeight+'px'}
 function show(n){var two=n===2;track.classList.toggle('s2',two);back.hidden=!two;step.textContent='Step '+n+' of 2';
  dots[1].classList.toggle('on',two);p1.inert=two;p2.inert=!two;p1.setAttribute('aria-hidden',two?'true':'false');p2.setAttribute('aria-hidden',two?'false':'true');fit();
  var first=(two?p2:p1).querySelector('.tryopt');if(first&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#try'))first.focus({preventScroll:true})}
 function reset(){busy=false;var p=document.querySelectorAll('.tryopt.picked');for(var i=0;i<p.length;i++)p[i].classList.remove('picked');show(1)}
 var s=document.querySelectorAll('[data-sample]');for(var i=0;i<s.length;i++)s[i].addEventListener('click',function(){if(busy)return;sample=this.getAttribute('data-sample');show(2)});
 var t=document.querySelectorAll('[data-type]');for(var j=0;j<t.length;j++)t[j].addEventListener('click',function(){if(busy||!sample)return;busy=true;this.classList.add('picked');step.textContent='Opening your sample…';location.href='/demo/'+sample+'/'+this.getAttribute('data-type')});
 back.addEventListener('click',function(){if(!busy)show(1)});
 window.addEventListener('resize',fit);window.addEventListener('pageshow',function(e){if(e.persisted)reset()});
 fit();
 })();
 </script>
 <p class="or">Or use any YouTube video</p>
`;
}
