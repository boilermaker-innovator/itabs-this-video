---
name: itabs-this-talk
description: 'Turn a talk into an iTabs This Talk page at itabs-this-video.jgwynne7.workers.dev/talk/<speaker>: a Markdown file of the talk (title, speaker, who it's for, homework, key points, a prompt the audience can paste into their own AI, and a Check yourself list), a simple one-page site that shows the whole talk with Download the MD, Copy to my own AI and Make your own buttons, and a QR code for the last slide. Use when a speaker says "make my talk page", "iTabs this talk", "make a page for my talk", "QR code for my last slide", or wants their audience to take the talk home.'
---

# iTabs This Talk

You help a speaker turn their talk into a take-home page for their audience. The speaker usually built their slides with you, so the talk is often already in this conversation or project.

You make one folder, named after the speaker, containing:

1. **The talk as a Markdown file**: title, speaker, who it's for, your homework, key points, a "paste this into your own AI" section, and a Check yourself list.
2. **`index.html`**: one simple page that shows the whole talk, with three buttons: **Download the MD**, **Copy to my own AI**, **Make your own** (downloads this skill).
3. **A QR code** pointing at `https://itabs-this-video.jgwynne7.workers.dev/talk/<slug>`, for the talk's last slide.

The folder is sent to Jon at iTabs, who puts it live at `itabs-this-video.jgwynne7.workers.dev/talk/<slug>`.

> **Address for now:** talk pages are hosted on the iTabs This Video site, at `itabs-this-video.jgwynne7.workers.dev/talk/<slug>`. They'll move to `talk.itabs.co/<slug>` later; until then, always use the address above, including in the QR code.

**Keep it simple.** No logins, no forms, no AI on the page, no tracking, no external scripts or fonts. Plain HTML that works as static files.

**Every page keeps "Made with iTabs" and Jon's contact details** exactly as in the template. Never remove or change them.

---

## Step 1: Gather the talk

Use what's already here first: slides, outline, speaker notes, or a script in this conversation or project. If there's nothing to work from, ask the speaker to paste their slides or notes.

**Never invent content.** Every point in the MD must come from the speaker's material. You may reword for clarity and add a short plain explanation of a point, but don't add claims, numbers, tools or quotes the speaker didn't give you. If something is missing, ask.

Then confirm these with the speaker in **one short message** (fill in your best guess for each so they can just say "yes"):

| Item | Example |
|------|---------|
| Talk title (and subtitle, if any) | Make bad code fail · Quality gates for agents |
| Speaker name | Aidan Morgan |
| Organisation (optional) | Bankwest |
| Headline quote or one-liner (optional) | "Make the build say no, so you don't have to." |
| Who it's for | Anyone using an AI agent to write code |
| Your homework (the one thing to do after the talk) | Add one gate: your most-failed check, in a Stop hook and in CI. |
| Page address (slug) | `itabs-this-video.jgwynne7.workers.dev/talk/aidan` |

**Choosing the slug:** lowercase first name, letters, numbers and hyphens only (e.g. `aidan`). If the speaker shares a first name with an earlier speaker, or wants to be safe, use `first-last` (e.g. `aidan-morgan`). Tell the speaker they can open `itabs-this-video.jgwynne7.workers.dev/talk/<slug>` to check it isn't already taken **before** the QR code goes on a slide.

---

## Step 2: Write the MD file

File name: `<first>-<last>-<talk-title-in-a-few-words>.md`, all lowercase with hyphens, e.g. `aidan-morgan-make-bad-code-fail.md`.

Use this structure. Required sections are marked; drop optional sections if the talk doesn't have that content. Live example: itabs-this-video.jgwynne7.workers.dev/talk/aidan.

````markdown
# <Talk title>[: <subtitle>]

**<Speaker name>[, <Organisation>]**

*Talk notes, packaged by iTabs · itabs-this-video.jgwynne7.workers.dev/talk/<slug>*

> **Who it's for:** <who gets the most from this talk, in plain words.>        ← required

> Notes compiled from <source>, so a few details may be slightly off.        ← only if from slide photos or rough notes

---

## Your homework                       ← required

**<The one thing to do after the talk.>**

You're done when <a clear sign it's finished>.

---

## The big idea                        ← optional

**<The one-line message of the talk.>**

<One or two plain sentences on what it means.>

## Key points                          ← required

1. **<Point in a few words.>** <One or two sentences from the talk.>
2. …

## <The talk's main framework, checklist or example>   ← optional
<Use the speaker's own heading, e.g. "Aidan's quality gate checks". A table works well for checklists.>

> **What "<term>" means:** <A plain explanation of a term the audience may not know.>   ← optional, anywhere in the notes

## <Any other section from the talk>  ← optional

---

## How to apply this to your own project      ← required

Copy everything in the box below and paste it into your own AI (Claude, ChatGPT, Copilot, whatever you use).

```text
<The paste-in prompt: see below.>
```

---

## Check yourself                     ← required

- [ ] <3–5 short ticks that show the homework is done>

---

*Made with iTabs · Jon · 0421 508 009 · jgwynne7@gmail.com*
````

**Your homework and Check yourself** come from the talk's call to action. If the talk ends without one, suggest a homework built only from its key points, and have the speaker confirm it before you use it. Check yourself turns the homework into 3–5 things the reader can tick off, each starting with "I" or describing what's now true (e.g. "I made it fail on purpose once and saw it block").

### The paste-in prompt

This is the most useful part of the page. Someone who wasn't at the talk pastes it into their own AI and gets help applying the talk to *their* project. It must stand alone, so restate the talk's ideas inside it. Shape:

1. One line: "I watched <speaker>'s talk "<title>". The idea: <big idea in plain words>."
2. The talk's key points or rules, briefly, numbered.
3. Any warning or limit the speaker gave.
4. "Help me apply this to my own project, one step at a time:" then numbered steps:
   - First, ask me about my project (the details that matter for this talk's topic).
   - Check what I already have against the talk's points.
   - Pick the one change with the biggest payoff for the least effort, and give me the exact steps.
   - Help me check it worked.
   - Then suggest the next step, and stop.
5. "Keep explanations short and plain. Ask before assuming anything about my setup."

Keep it inside a ```` ```text ```` block so it copies cleanly. No backticks inside the prompt.

---

## Step 3: Make the page

The page shows the whole talk: a "Who it's for" box at the top, the three buttons, a highlighted homework card, every section of the notes as its own card, the prompt in a box with its own Copy button, and a tappable Check yourself list (ticks are remembered on the reader's device only; nothing is sent anywhere).

Create `<slug>/index.html` from the template below. Replace each `{{…}}`:

| Placeholder | Becomes |
|-------------|---------|
| `{{TALK_TITLE}}` | Talk title, e.g. `Make bad code fail` |
| `{{TAG}}` | `iTabs This Talk`, plus ` · <subtitle or event>` if there is one |
| `{{SPEAKER}}` | Speaker name |
| `{{BYLINE}}` | `Speaker name · Organisation`, or just the speaker name |
| `{{DESCRIPTION}}` | One sentence for link previews, e.g. `Notes from Aidan Morgan's talk 'Make bad code fail': your homework, key points, and a prompt to apply it to your own project.` |
| `{{WHO_FOR}}` | The "Who it's for" text from the MD, without the label |
| `{{QUOTE_LINE}}` | `<p class="quote">“<headline quote>”</p>`, or delete the whole line if there's no quote |
| `{{LEAD}}` | One sentence on what's on the page, e.g. `Your homework, the key points, and a ready-to-paste prompt so your own AI can help you apply them to your project.` |
| `{{NOTE_LINE}}` | `<p class="note">Notes compiled from <source>, so a few details may be slightly off.</p>`, or delete the whole line |
| `{{MD_FILE}}` | The MD file name from Step 2 (appears twice) |
| `{{HOMEWORK}}` | The bold homework line from the MD |
| `{{HOMEWORK_DONE_LINE}}` | `<p>You're done when …</p>`, or delete the whole line |
| `{{NOTES_CARDS}}` | Every MD section between Your homework and How to apply, as cards: see below |
| `{{PROMPT}}` | The paste-in prompt, exactly as in the MD, with `&`, `<` and `>` escaped. Keep its line breaks. |
| `{{CHECK_ITEMS}}` | One line per Check yourself item: see below |
| `{{CHECK_COUNT}}` | How many Check yourself items there are |
| `{{SLUG}}` | The slug (appears several times) |

Change nothing else. HTML-escape any `&`, `<` or `>` in the text you insert, turn `**bold**` into `<strong>bold</strong>`, and don't put double quotes inside `{{DESCRIPTION}}`.

**`{{NOTES_CARDS}}`:** one `<section class="card">` per MD section, in the MD's order, using only these pieces:

| In the MD | On the page |
|-----------|-------------|
| `## Heading` | `<section class="card">` then `<h2>Heading</h2>` … `</section>` |
| A bold one-liner right under the heading | `<p class="big">…</p>` |
| A paragraph | `<p>…</p>` |
| A numbered list | `<ol><li>…</li></ol>` |
| A bulleted list | `<ul><li>…</li></ul>` |
| A table | `<table><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td></tr></tbody></table>` |
| A `> **What "…" means:** …` box | `<p class="box"><strong>What "…" means:</strong> …</p>` |
| Two contrasting short paragraphs (before/after, bad/good) | `<div class="debt"><div>…</div><div>…</div></div>` |

For example, a big idea section becomes:

```html
  <section class="card">
    <h2>The big idea</h2>
    <p class="big">Make the build say no, so you don't have to.</p>
    <p>When an AI agent writes code, don't rely on asking it nicely …</p>
  </section>
```

**`{{CHECK_ITEMS}}`:** one line per item:

```html
      <li><button class="check" type="button" role="checkbox" aria-checked="false"><span class="tick">✓</span>I picked my most-failed check</button></li>
```

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TALK_TITLE}} · {{SPEAKER}}</title>
<meta name="description" content="{{DESCRIPTION}}">
<style>
  :root { --bg:#050508; --card:#111118; --line:rgba(255,255,255,.1); --text:#f4f4f7; --muted:#a0a0b0; --accent:#6c5ce7; --accent-soft:#a29bfe; --ok:#2ecc71; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; min-height:100vh; display:flex; justify-content:center; padding:24px 16px; }
  main { width:100%; max-width:430px; display:flex; flex-direction:column; gap:20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:24px 20px; }
  .tag { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
  h1 { font-size:30px; line-height:1.15; margin:8px 0 6px; }
  .by { color:var(--muted); }
  .quote { margin-top:14px; font-size:18px; font-weight:600; }
  .lead { margin-top:14px; color:var(--muted); font-size:15px; }
  .box { margin-top:14px; padding:12px 14px; border-radius:12px; background:rgba(108,92,231,.14); border-left:3px solid var(--accent); font-size:15px; }
  .box strong { color:var(--accent-soft); }
  .note { margin-top:12px; font-size:13px; color:var(--muted); }
  .buttons { display:flex; flex-direction:column; gap:10px; }
  .btn { display:block; width:100%; padding:16px; border-radius:14px; border:1px solid var(--line); background:rgba(255,255,255,.06); color:var(--text); font:inherit; font-weight:700; text-align:center; text-decoration:none; cursor:pointer; }
  .btn small { display:block; font-weight:400; font-size:13px; color:var(--muted); margin-top:2px; }
  .btn.primary { background:var(--accent); border-color:var(--accent); }
  .btn.primary small { color:rgba(255,255,255,.8); }
  .btn:active { transform:scale(.98); }
  .btn.done { border-color:var(--ok); }
  /* Talk content */
  .card h2 { font-size:21px; line-height:1.25; margin-bottom:12px; }
  .card h2 + .big { margin-top:0; }
  .card p + p, .card p + ul, .card ul + p, .card table + p, .card p + table, .card .box + p, .card ul + .box { margin-top:12px; }
  .big { font-size:18px; font-weight:700; }
  .homework { border-color:var(--accent); }
  .homework .tag { margin-bottom:6px; }
  ol, ul { padding-left:20px; }
  li + li { margin-top:8px; }
  table { width:100%; border-collapse:collapse; font-size:15px; }
  th, td { text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:700; }
  td:first-child { font-weight:700; white-space:nowrap; }
  .debt { display:flex; flex-direction:column; gap:10px; }
  .debt div { padding:12px 14px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid var(--line); font-size:15px; }
  .prompt { margin-top:12px; background:#0a0a10; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
  .prompt pre { margin:0; padding:14px; max-height:340px; overflow:auto; white-space:pre-wrap; overflow-wrap:anywhere; font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; color:#d8d8e2; }
  .prompt .btn { border:0; border-top:1px solid var(--line); border-radius:0; background:var(--accent); }
  .prompt .btn.done { background:#1f7a46; }
  .checks { list-style:none; padding:0; display:flex; flex-direction:column; gap:8px; }
  .checks li + li { margin-top:0; }
  .check { display:flex; align-items:center; gap:12px; width:100%; padding:14px; border-radius:12px; border:1px solid var(--line); background:rgba(255,255,255,.04); color:var(--text); font:inherit; font-size:15px; text-align:left; cursor:pointer; }
  .check .tick { flex:none; width:24px; height:24px; border-radius:7px; border:2px solid var(--muted); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:transparent; }
  .check[aria-checked="true"] { border-color:var(--ok); }
  .check[aria-checked="true"] .tick { background:var(--ok); border-color:var(--ok); color:#06210f; }
  .progress { margin-top:12px; font-size:14px; color:var(--muted); text-align:center; }
  .progress.all { color:var(--ok); font-weight:700; }
  .qr { text-align:center; }
  .qr img { width:160px; height:160px; background:#fff; border-radius:12px; padding:6px; }
  .qr p { overflow-wrap:anywhere; font-size:13px; color:var(--muted); margin-top:6px; }
  footer { text-align:center; font-size:13px; color:var(--muted); line-height:1.8; padding-bottom:12px; }
  footer strong { color:var(--text); }
  footer a { color:inherit; }
</style>
</head>
<body>
<main>
  <section class="card">
    <div class="tag">{{TAG}}</div>
    <h1>{{TALK_TITLE}}</h1>
    <div class="by">{{BYLINE}}</div>
    <p class="box"><strong>Who it's for:</strong> {{WHO_FOR}}</p>
    {{QUOTE_LINE}}
    <p class="lead">{{LEAD}}</p>
    {{NOTE_LINE}}
  </section>

  <section class="buttons">
    <a class="btn primary" href="/talk/{{SLUG}}/{{MD_FILE}}" download>Download the MD<small>The talk notes as one file</small></a>
    <button class="btn" id="copyBtn" type="button">Copy to my own AI<small>Copies the notes, paste into Claude, ChatGPT or similar</small></button>
    <a class="btn" href="/talk/skill" download>Make your own<small>Get the iTabs This Talk skill and make a page for your talk</small></a>
  </section>

  <section class="card homework">
    <div class="tag">Your homework</div>
    <p class="big">{{HOMEWORK}}</p>
    {{HOMEWORK_DONE_LINE}}
  </section>

  {{NOTES_CARDS}}

  <section class="card">
    <h2>How to apply this to your own project</h2>
    <p>Copy everything in the box below and paste it into your own AI (Claude, ChatGPT, Copilot, whatever you use).</p>
    <div class="prompt">
      <pre id="promptText">{{PROMPT}}</pre>
      <button class="btn" id="promptCopy" type="button">Copy this prompt</button>
    </div>
  </section>

  <section class="card">
    <h2>Check yourself</h2>
    <ul class="checks" id="checks">
      {{CHECK_ITEMS}}
    </ul>
    <p class="progress" id="progress">0 of {{CHECK_COUNT}} done</p>
  </section>

  <section class="qr">
    <img src="/talk/{{SLUG}}/qr-talk-itabs-{{SLUG}}.png" alt="QR code for itabs-this-video.jgwynne7.workers.dev/talk/{{SLUG}}">
    <p>itabs-this-video.jgwynne7.workers.dev/talk/{{SLUG}}</p>
  </section>

  <footer>
    <strong>Made with iTabs</strong><br>
    Jon · <a href="tel:0421508009">0421 508 009</a> · <a href="https://wa.me/61421508009">WhatsApp</a><br>
    <a href="mailto:jgwynne7@gmail.com">jgwynne7@gmail.com</a>
  </footer>
</main>
<script>
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function copyText(text, done, fail) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text) ? done() : fail(); });
      return;
    }
    fallbackCopy(text) ? done() : fail();
  }
  function flasher(btn) {
    var label = btn.innerHTML;
    return function (html, ok) {
      btn.innerHTML = html;
      btn.classList.toggle('done', ok);
      setTimeout(function () { btn.innerHTML = label; btn.classList.remove('done'); }, 2500);
    };
  }

  // Copy the whole notes file
  var copyBtn = document.getElementById('copyBtn');
  var flashCopy = flasher(copyBtn);
  copyBtn.addEventListener('click', function () {
    fetch('/talk/{{SLUG}}/{{MD_FILE}}')
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (text) {
        copyText(text, function () { flashCopy('Copied!<small>Now paste it into your AI</small>', true); },
          function () { flashCopy('Couldn\'t copy<small>Use Download the MD instead</small>', false); });
      })
      .catch(function () { flashCopy('Couldn\'t load the notes<small>Try Download the MD</small>', false); });
  });

  // Copy just the prompt
  var promptBtn = document.getElementById('promptCopy');
  var flashPrompt = flasher(promptBtn);
  promptBtn.addEventListener('click', function () {
    copyText(document.getElementById('promptText').textContent,
      function () { flashPrompt('Copied! Now paste it into your AI', true); },
      function () { flashPrompt('Couldn\'t copy. Press and hold the text instead', false); });
  });

  // Check yourself: tap to tick, remembered on this device only
  var KEY = 'itabs-talk-{{SLUG}}-checks';
  var checks = document.querySelectorAll('#checks .check');
  var progress = document.getElementById('progress');
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  function update() {
    var state = [], n = 0;
    for (var i = 0; i < checks.length; i++) {
      var on = checks[i].getAttribute('aria-checked') === 'true';
      state.push(on); if (on) n++;
    }
    progress.textContent = n === checks.length ? 'All done. Nice work!' : n + ' of ' + checks.length + ' done';
    progress.classList.toggle('all', n === checks.length);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  for (var i = 0; i < checks.length; i++) {
    if (saved[i] === true) checks[i].setAttribute('aria-checked', 'true');
    checks[i].addEventListener('click', function () {
      this.setAttribute('aria-checked', this.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      update();
    });
  }
  update();
</script>
</body>
</html>
```

All links on the page start with `/talk/`, so they only work once the page is live on the iTabs This Video site, not when previewing the file locally. The **Make your own** button links to `/talk/skill`, the shared copy of this skill. Keep these links as they are.

---

## Step 4: Make the QR code

Point it at `https://itabs-this-video.jgwynne7.workers.dev/talk/<slug>` (with `https://`). Save it in the folder as `qr-talk-itabs-<slug>.png`, large enough for the last slide. The page shows the same file.

If you can run Python:

```python
# pip install segno
import segno
url = "https://itabs-this-video.jgwynne7.workers.dev/talk/<slug>"
q = segno.make(url, error="m")
q.save("<slug>/qr-talk-itabs-<slug>.png", scale=20, border=4)
```

If you can, check it: decode the PNG (e.g. `cv2.QRCodeDetector().detectAndDecode`) and confirm it reads back the exact URL.

If you can't run code, tell the speaker to make the QR code in any free QR generator using that exact URL, saved as `qr-talk-itabs-<slug>.png`.

**For the last slide:** the QR code on a white background, as large as the slide allows (at least a quarter of the slide's height), with the address written underneath in plain text: `itabs-this-video.jgwynne7.workers.dev/talk/<slug>`. Suggested line: "Take this talk home: scan for the notes and a prompt for your own AI."

---

## Step 5: Hand it over

The finished folder:

```
<slug>/
  index.html
  <first>-<last>-<talk>.md
  qr-talk-itabs-<slug>.png
```

Give the speaker the folder (as a zip if you can make one), the PNG for their last slide, and the MD to read over. Then tell them:

1. **Read the MD and fix anything that's off.** It's what their audience will take home.
2. **Send the folder to Jon at iTabs** to put it live: WhatsApp or call 0421 508 009, or email jgwynne7@gmail.com.
3. **Before presenting**, scan the QR code on a phone and check the page opens.

If you're working inside the itabs-this-video repo itself (Jon's job when a folder arrives), put the folder at `src/talk/<slug>/` next to `aidan/`. Add its page, MD and QR to `FILES` in `src/talk/talk.js`, copying the three `aidan` lines. Then run `npm test` and push to `main`.

---

## Checklist before you finish

- [ ] Every point in the MD comes from the speaker's material; nothing invented.
- [ ] MD has title, speaker, who it's for, your homework, key points, the paste-in prompt, and Check yourself.
- [ ] Page made from the template, with every `{{…}}` replaced and nothing else changed.
- [ ] The page shows every section of the MD, and the prompt on the page matches the MD exactly.
- [ ] "Made with iTabs" and Jon's contact details are on the page and at the end of the MD.
- [ ] The QR code reads `https://itabs-this-video.jgwynne7.workers.dev/talk/<slug>`, and the page shows the same address.
- [ ] The speaker knows to send the folder to Jon and to test the QR code before the talk.

---

*iTabs This Talk skill · itabs-this-video.jgwynne7.workers.dev/talk · Made with iTabs · Jon · 0421 508 009 · jgwynne7@gmail.com*
