# iTabs This Video: make any YouTube video personal

You are helping someone turn a YouTube video into a swipeable card deck made for them. Every card has:
- **Gold i-buttons**: facts and background from the video
- **One blue i-button**: what this point means for this person, with something they can actually do

## Step 1: Get three things

**Easiest:** use this skill in Gemini and just paste the YouTube link. Gemini can watch the video.
**Other AIs:** copy the transcript from YouTube (tap the description, then "Show transcript").

Ask for anything that's missing, in one short message:
1. **The YouTube link**
2. **The transcript.** If you can't read the video yourself, ask them to paste it. Tip for them: on YouTube tap the description, then "Show transcript", or use the free YouTube Transcript Generator at vidiq.com.
3. **Who's watching?** One line about them, e.g. "I run a coffee van in Perth" or "I'm building a robot arm at home". They can also make it for someone else ("my mate Sam, a plumber"). Offer these quick picks they can tap or type: **Apprentice on a job site** · **Busy manager** · **Beginner** · **Small business owner**.
4. **What do you want from this video?** e.g. "learn the basics", "ideas for my business", "decide if it's worth trying". This decides what the blue buttons focus on. If their answer is vague ("see if it's worth it"), ask one short follow-up: "Worth it for what? A hobby, your work, your kids, a business idea?"

Optional, if they want: attach anything about them (notes, a plan, a website link) and pick a language for the deck.

Apply the video to what they want from it. Don't force a link to their job or business if the video isn't about that. A boilermaker watching a gardening video wants gardening help, not boilermaking tips.

Never make up what the video says. If you don't have the transcript, ask for it.

## Step 2: Pick the points

- 6 to 10 cards, one main idea each, in video order. The last card is "Your next step".
- For each card write:
  - **band**: 2 to 4 word visual label
  - **headline**: under 8 words
  - **summary**: 2 or 3 plain sentences about what the video says
  - **time**: timestamp if the transcript has one (leave it out if not; never guess)
- Skip sponsor segments. If the video makes claims that can't be checked, add a gold button that says so plainly.

## Step 3: Write the buttons

**Blue button (exactly one per card, always first):**
- Written for the person in Step 1, using their words and their situation
- A concrete picture or a small action ("This week, ask three customers…"), not motivation
- Short lines and bullet points, plain English
- If a point doesn't fit them, say so honestly and keep it short
- Don't invent facts about them beyond what they told you

**Gold buttons (1 or 2 per card):** a definition, background on a person or thing, or why it matters.

## Step 4: Make the deck

Fill in the template below. **Only change the DATA block.** Keep everything else exactly as it is, including the "Made with iTabs" line. Output the whole file as one HTML file so it can be previewed, saved and shared.

- `videoId` is the part after `v=` in the YouTube link (or after `youtu.be/`)
- `forWho` is who it's for, in a few words
- `youLabel` is the blue button label, e.g. "For your van", "For your class", "For Sam"
- `colors` is two hex colours for the card's gradient band. Vary them card to card.
- In button `text`, use `\n` for new lines and `•` for bullets

Then tell them in one line: swipe or tap the arrows, gold = the video, blue = for you.

## Template

```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>iTabs | Personalised video</title>
<style>
:root{--bg:#0b0c0f;--card:#16181d;--raised:#23262d;--fg:#f4f5f7;--muted:#a3a8b3;--gold:#f59e0b;--blue:#1e3a8a;--bluedot:#60a5fa;color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{scroll-padding-top:var(--ph,0px)}html,body{min-height:100%}
body{background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
.wrap{max-width:440px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;padding:0 12px}
.prog{display:flex;gap:4px;padding:8px 0 4px}.seg{flex:1;height:3px;border-radius:2px;background:#ffffff38}.seg.on{background:var(--fg)}
.head{padding:4px 0 2px}.ch{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch span{font-weight:400;color:var(--muted)}.vt{display:none}
.for{font-size:12px;color:var(--bluedot);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.key{display:flex;gap:12px;font-size:11px;color:var(--muted);padding:4px 0 6px}.key i{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:5px;vertical-align:-1px}
.cards{flex:0 1 auto;position:relative;overflow:hidden;min-height:0;display:grid;align-items:start}
.card{grid-area:1/1;display:flex;flex-direction:column;opacity:0;transform:translateX(100%);transition:.3s;pointer-events:none;position:absolute;top:0;left:0;right:0}
.card.on{opacity:1;transform:none;pointer-events:auto;position:relative}.card.prev{transform:translateX(-100%)}
.in{display:flex;flex-direction:column;background:var(--card);border-radius:16px;overflow:hidden}
.band{height:42px;display:flex;align-items:center;padding:0 14px;position:relative;flex-shrink:0}
.band b{font-size:15px;line-height:1.1;color:#fff;max-width:72%;text-shadow:0 2px 10px #0006}
.ts{position:absolute;top:50%;transform:translateY(-50%);right:12px;background:#000a;color:#fff;font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;text-decoration:none}
.body{padding:12px 14px 14px;display:flex;flex-direction:column}
.num{font-size:10.5px;color:var(--bluedot);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
h2{font-size:19px;line-height:1.2;margin-bottom:6px}.sum{font-size:14.5px;color:var(--muted)}
.btns{display:flex;flex-wrap:wrap;gap:6px;padding-top:12px}
.ib{display:inline-flex;align-items:center;gap:7px;background:var(--raised);border:0;padding:6px 12px 6px 7px;border-radius:18px;font:500 13px inherit;font-family:inherit;color:var(--fg);cursor:pointer;position:relative;z-index:5}
.ib span{width:19px;height:19px;border-radius:50%;background:var(--gold);color:#000;display:grid;place-items:center;font:italic 700 12px Georgia,serif}
.ib.you{background:var(--blue)}.ib.you span{background:var(--bluedot)}
.info{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--raised);border-left:3px solid var(--gold);font-size:14px;color:var(--fg);white-space:pre-line}
.info.you{border-left-color:var(--bluedot);background:#1e3a8a66}
.info .it{display:block;font-weight:700;font-size:13px;margin-bottom:4px;color:var(--gold);text-transform:uppercase;letter-spacing:.05em}
.info.you .it{color:var(--bluedot)}
.ib.act{outline:2px solid var(--fg);outline-offset:1px}
.foot{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0 4px}
.watch{background:#e11d1d;color:#fff;padding:7px 14px;border-radius:18px;text-decoration:none;font-weight:600;font-size:13px}
.arr button{width:36px;height:36px;border-radius:50%;border:0;background:var(--raised);color:var(--fg);font-size:18px;margin-left:6px}
.tag{text-align:center;font-weight:600;font-size:12px;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))}.tag small{font-weight:400;font-size:11.5px;color:var(--muted)}
.ov{position:fixed;inset:0;background:#000c;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:.2s;z-index:20}.ov.on{opacity:1;pointer-events:auto}
.modal{background:var(--card);width:100%;max-width:440px;max-height:78vh;border-radius:22px 22px 0 0;display:flex;flex-direction:column}
.mh{padding:16px 18px;border-bottom:1px solid var(--raised);display:flex;justify-content:space-between;align-items:center;gap:10px}
.badge{font-size:10.5px;padding:3px 8px;border-radius:4px;text-transform:uppercase;font-weight:700;background:var(--gold);color:#000;margin-left:8px}.badge.you{background:var(--bluedot);color:#0b1a3d}
.mx{width:32px;height:32px;border-radius:50%;border:0;background:var(--raised);color:var(--fg);font-size:20px}
.mb{padding:16px 18px 24px;overflow-y:auto;color:var(--muted);font-size:15.5px;white-space:pre-line}
.dock{flex-shrink:0;margin-top:8px;background:var(--card);border-radius:14px;overflow:hidden;position:sticky;top:0;z-index:10;margin-bottom:4px;box-shadow:0 -12px 0 var(--bg),-12px 0 0 var(--bg),12px 0 0 var(--bg)}
.dh{display:flex;align-items:center;gap:6px;height:36px;padding:0 4px 0 12px;font-size:13px}
.dt{color:var(--fg);font-weight:600;font-size:13px;white-space:nowrap;margin-right:auto;font-variant-numeric:tabular-nums}
.dh a{color:var(--muted);font-size:12px;text-decoration:none;white-space:nowrap}
.db{width:30px;height:30px;border-radius:50%;border:0;background:var(--raised);color:var(--fg);font-size:14px;line-height:1;cursor:pointer;flex-shrink:0}
.pv{position:relative;width:100%;max-width:calc(30vh * 16 / 9);margin:0 auto;aspect-ratio:16/9;background:#000}.pv iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.dock .ls{display:none}
.dock.listen{display:flex;align-items:center;gap:8px;height:70px;padding:4px}
.dock.listen .pv{order:-1;flex-shrink:0;width:110px;height:62px;max-width:none;margin:0;aspect-ratio:auto;border-radius:9px;overflow:hidden}
.dock.listen .dh{flex:1;min-width:0;height:auto;padding:0}.dock.listen .bg{display:none}.dock.listen .ls{display:inline-block}
.pf{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:12px;text-align:center;color:var(--muted);font-size:14px}
.yt{background:#e11d1d;color:#fff;padding:8px 14px;border-radius:18px;text-decoration:none;font-weight:600;font-size:13px}
</style></head><body>
<div class="wrap">
 <div class="dock" id="dock" hidden><div class="dh"><span class="dt" id="pt">▶ Video</span><a class="bg" id="po" target="_blank" rel="noopener">Open in YouTube ↗</a><button class="db ls" id="pp" aria-label="Pause">⏸</button><button class="db bg" id="pl" aria-label="Listen mode (small player)">🎧</button><button class="db ls" id="pe" aria-label="Expand video">⤢</button><button class="db" id="px" aria-label="Close video">✕</button></div><div class="pv" id="pv"></div></div>
 <div class="prog" id="prog"></div>
 <div class="head"><div class="ch" id="ch"></div><div class="vt" id="vt"></div><div class="for" id="for"></div></div>
 <div class="key"><span><i style="background:var(--gold)"></i>From the video</span><span><i style="background:var(--bluedot)"></i>For you</span></div>
 <div class="cards" id="cards"></div>
 <div class="foot"><a class="watch" id="watch" target="_blank" rel="noopener">▶ Watch video</a><div class="arr"><button id="bp" aria-label="Back">‹</button><button id="bn" aria-label="Next">›</button></div></div>
 <div class="tag">Any YouTube video, applied to you. <small>· Made with <b>iTabs</b> · itabs.co</small></div>
</div>
<script>
/* ===== ONLY EDIT THIS DATA BLOCK ===== */
const DATA = {
  videoTitle: "Video title",
  channel: "Channel name",
  videoId: "",            // the part after v= in the YouTube link, or "" if unknown
  forWho: "a coffee van owner in Perth",
  youLabel: "For you",    // label on the blue buttons, e.g. "For your van"
  cards: [
    { band: "Short visual label", colors: "#1e3a8a,#38bdf8", time: "1:15", seconds: 75,
      headline: "Punchy headline, under 8 words",
      summary: "Two or three plain sentences about this point from the video.",
      buttons: [
        { you: true, title: "For you", text: "What this means for them, with a concrete action.\n• Bullet\n• Bullet" },
        { title: "Definition", type: "Definition", text: "Background from the video." }
      ] }
  ]
};
/* ===== END DATA BLOCK ===== */
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
$('ch').textContent=DATA.channel;const sp=document.createElement('span');sp.textContent=' · '+DATA.videoTitle;$('ch').appendChild(sp);$('for').textContent=DATA.forWho?'Personalised for '+DATA.forWho:'';
document.title='iTabs | '+DATA.videoTitle;
const yt=DATA.videoId?'https://www.youtube.com/watch?v='+DATA.videoId:'';if(yt)$('watch').href=yt;else $('watch').hidden=true;
const short=s=>'https://youtu.be/'+encodeURIComponent(DATA.videoId)+'?t='+s;
const secs=c=>{let s=Number(c.seconds);if(!(s>0)&&c.time&&/^\d+(:\d{1,2}){1,2}$/.test(c.time))s=c.time.split(':').reduce((a,x)=>a*60+(+x),0);return Number.isFinite(s)&&s>=0?Math.round(s):null};
let cur=0;const N=DATA.cards.length;
DATA.cards.forEach((c,i)=>{const s=document.createElement('div');s.className='seg';$('prog').appendChild(s);
 const el=document.createElement('div');el.className='card';
 const sec=secs(c);
 const t=c.time?(yt&&sec!=null?`<a class="ts" target="_blank" rel="noopener" data-s="${sec}" href="${short(sec)}">▶ ${esc(c.time)}</a>`:`<span class="ts">${esc(c.time)}</span>`):'';
 el.innerHTML=`<div class="in"><div class="band" style="background:linear-gradient(135deg,${c.colors||'#1e3a8a,#38bdf8'})"><b>${esc(c.band)}</b>${t}</div><div class="body"><div class="num">Point ${i+1} of ${N}</div><h2>${esc(c.headline)}</h2><p class="sum">${esc(c.summary)}</p><div class="btns">${(c.buttons||[]).map((b,j)=>`<button class="ib${b.you?' you':''}" data-i="${i}" data-j="${j}"><span>i</span>${esc(b.title||(b.you?DATA.youLabel:'Info'))}</button>`).join('')}</div><div class="info" hidden></div></div></div>`;
 $('cards').appendChild(el);});
function show(i){document.querySelectorAll('.card').forEach((c,k)=>{c.classList.toggle('on',k===i);c.classList.toggle('prev',k<i)});document.querySelectorAll('.seg').forEach((s,k)=>s.classList.toggle('on',k<=i));cur=i;
 const top=$('cards').getBoundingClientRect().top,d=$('dock'),min=d&&!d.hidden?d.getBoundingClientRect().bottom+8:0;if(top<min)window.scrollBy(0,top-min)}
const go=d=>{const n=cur+d;if(n>=0&&n<N)show(n)};
$('bp').onclick=()=>go(-1);$('bn').onclick=()=>go(1);
$('cards').addEventListener('click',e=>{const b=e.target.closest('.ib');if(!b)return;const card=b.closest('.card'),box=card.querySelector('.info'),x=DATA.cards[b.dataset.i].buttons[b.dataset.j];
 const was=b.classList.contains('act');card.querySelectorAll('.ib').forEach(z=>z.classList.remove('act'));
 if(was){box.hidden=true;return}
 b.classList.add('act');box.className='info'+(x.you?' you':'');box.innerHTML='<span class="it"></span>';box.firstChild.textContent=x.you?DATA.youLabel:(x.type||'From the video');box.appendChild(document.createTextNode(x.text));box.hidden=false;box.scrollIntoView({block:'nearest',behavior:'smooth'})});
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1);});
let x0=0,y0=0;$('cards').addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});$('cards').addEventListener('touchend',e=>{const t=e.changedTouches[0],d=x0-t.clientX,dy=y0-t.clientY;if(Math.abs(d)>50&&Math.abs(d)>Math.abs(dy)*1.5)go(d>0?1:-1)});
/* Docked mini player: youtube-nocookie embed above the deck; the deck stays usable. */
const fmt=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
let pfr=null,pst=0,pmode='big',playing=true;
const fit=()=>document.documentElement.style.setProperty('--ph',$('dock').hidden?'0px':($('dock').offsetHeight+20)+'px');
const label=(s,live)=>{$('pt').textContent=($('dock').classList.contains('listen')?'🎧 ':'▶ ')+(live||s?fmt(s):'From the start')};
const setPlaying=v=>{playing=v;$('pp').textContent=v?'⏸':'▶';$('pp').setAttribute('aria-label',v?'Pause':'Play')};
function setMode(m){pmode=m;$('dock').classList.toggle('listen',m==='listen');label(pst);fit()}
function fail(s){$('dock').classList.remove('listen');$('pv').innerHTML='<div class="pf">This video can\'t play here.<a class="yt" target="_blank" rel="noopener">▶ Open in YouTube</a></div>';$('pv').querySelector('a').href=short(s);pfr=null;label(s);fit()}
function cmd(func,args){try{pfr.contentWindow.postMessage(JSON.stringify({event:'command',func,args:args||[]}),'*')}catch(e){}}
function play(s){if(!DATA.videoId)return;s=Math.max(0,Math.round(s||0));pst=s;
 const d=$('dock');d.hidden=false;setPlaying(true);
 $('po').href=short(s);setMode(pmode);label(s);
 if(pfr){cmd('seekTo',[s,true]);cmd('playVideo');fit();return}
 if(location.protocol==='file:'){fail(s);fit();return}
 const f=document.createElement('iframe');f.title='YouTube video';f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;
 f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(DATA.videoId)+'?start='+s+'&autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin='+encodeURIComponent(location.origin);
 f.onload=()=>{try{f.contentWindow.postMessage(JSON.stringify({event:'listening',id:1,channel:'widget'}),'*')}catch(e){}};
 $('pv').innerHTML='';$('pv').appendChild(f);pfr=f;fit()}
function playPause(){if(!pfr)return;cmd(playing?'pauseVideo':'playVideo');setPlaying(!playing)}
function stop(){$('dock').hidden=true;$('pv').innerHTML='';pfr=null;fit()}
window.addEventListener('message',e=>{if(!pfr||e.source!==pfr.contentWindow)return;let d=e.data;try{if(typeof d==='string')d=JSON.parse(d)}catch(x){return}
 if(!d)return;if(d.event==='onError')fail(pst);
 if(d.event==='infoDelivery'&&d.info){if(typeof d.info.currentTime==='number'){pst=Math.round(d.info.currentTime);label(pst,true);$('po').href=short(pst)}
  if(d.info.playerState===1)setPlaying(true);else if(d.info.playerState===2||d.info.playerState===0)setPlaying(false)}});
$('px').onclick=stop;$('pp').onclick=playPause;$('pl').onclick=()=>setMode('listen');$('pe').onclick=()=>setMode('big');
window.addEventListener('resize',fit);
$('cards').addEventListener('click',e=>{const a=e.target.closest('a.ts');if(!a)return;e.preventDefault();play(+a.dataset.s)});
$('watch').addEventListener('click',e=>{if(!DATA.videoId)return;e.preventDefault();play(0)});
show(0);
</script></body></html>

```
