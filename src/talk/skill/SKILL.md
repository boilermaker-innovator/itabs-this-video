---
name: itabs-this-talk
description: 'Turn a talk into an iTabs This Talk page at talk.itabs.co/<speaker>: a Markdown file of the talk (title, speaker, key points, take-home actions, and a prompt the audience can paste into their own AI), a simple one-page site with Download the MD, Copy to my own AI and Make your own buttons, and a QR code for the last slide. Use when a speaker says "make my talk page", "iTabs this talk", "make a page for my talk", "QR code for my last slide", or wants their audience to take the talk home.'
---

# iTabs This Talk

You help a speaker turn their talk into a take-home page for their audience. The speaker usually built their slides with you, so the talk is often already in this conversation or project.

You make one folder, named after the speaker, containing:

1. **The talk as a Markdown file**: title, speaker, key points, take-home actions, and a "paste this into your own AI" section.
2. **`index.html`**: one simple page with three buttons: **Download the MD**, **Copy to my own AI**, **Make your own** (downloads this skill).
3. **A QR code** pointing at `https://talk.itabs.co/<slug>`, for the talk's last slide.

The folder is sent to Jon at iTabs, who puts it live at `talk.itabs.co/<slug>`.

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
| Page address (slug) | `talk.itabs.co/aidan` |

**Choosing the slug:** lowercase first name, letters, numbers and hyphens only (e.g. `aidan`). If the speaker shares a first name with an earlier speaker, or wants to be safe, use `first-last` (e.g. `aidan-morgan`). Tell the speaker they can open `talk.itabs.co/<slug>` to check it isn't already taken **before** the QR code goes on a slide.

---

## Step 2: Write the MD file

File name: `<first>-<last>-<talk-title-in-a-few-words>.md`, all lowercase with hyphens, e.g. `aidan-morgan-make-bad-code-fail.md`.

Use this structure. Required sections are marked; drop optional sections if the talk doesn't have that content.

````markdown
# <Talk title>[: <subtitle>]

**<Speaker name>[, <Organisation>]**

*Talk notes, packaged by iTabs · talk.itabs.co/<slug>*

---

## The big idea                       ← optional

**<The one-line message of the talk.>**

<One or two plain sentences on what it means.>

## Key points                         ← required

1. **<Point in a few words.>** <One or two sentences from the talk.>
2. …

## <A section for the talk's main framework, checklist or example>   ← optional
<Use the speaker's own heading, e.g. "Aidan's quality gate checks". A table works well for checklists.>

## Take-home actions                  ← required

- **<The first thing to do this week.>**
- <1–4 more concrete actions from the talk.>

---

## How to apply this to your own project      ← required

Copy everything in the box below and paste it into your own AI (Claude, ChatGPT, Copilot, whatever you use).

```text
<The paste-in prompt: see below.>
```

---

*Made with iTabs · Jon · 0421 508 009 · jgwynne7@gmail.com*
````

If the speaker's material came from photos of slides or rough notes, add this under the speaker line:
`> Notes compiled from <source>, so a few details may be slightly off.`

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

Create `<slug>/index.html` from the template below. Replace each `{{…}}`:

| Placeholder | Becomes |
|-------------|---------|
| `{{TALK_TITLE}}` | Talk title, e.g. `Make bad code fail` |
| `{{TAG}}` | `iTabs This Talk`, plus ` · <subtitle or event>` if there is one |
| `{{SPEAKER}}` | Speaker name |
| `{{BYLINE}}` | `Speaker name · Organisation`, or just the speaker name |
| `{{QUOTE_LINE}}` | `<p class="quote">“<headline quote>”</p>`, or delete the whole line if there's no quote |
| `{{DESCRIPTION}}` | One sentence for link previews, e.g. `Notes from Aidan Morgan's talk 'Make bad code fail': key points, take-home actions, and a prompt to apply it to your own project.` |
| `{{MD_FILE}}` | The MD file name from Step 2 (appears twice) |
| `{{SLUG}}` | The slug (appears three times) |

Change nothing else. HTML-escape any `&`, `<` or `>` in the text you insert, and don't put double quotes inside `{{DESCRIPTION}}`.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{TALK_TITLE}} · {{SPEAKER}}</title>
<meta name="description" content="{{DESCRIPTION}}">
<style>
  :root { --bg:#050508; --card:#111118; --line:rgba(255,255,255,.1); --text:#f4f4f7; --muted:#a0a0b0; --accent:#6c5ce7; --ok:#2ecc71; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text); font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif; min-height:100vh; display:flex; justify-content:center; padding:24px 16px; }
  main { width:100%; max-width:430px; display:flex; flex-direction:column; gap:20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:24px 20px; }
  .tag { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); }
  h1 { font-size:30px; line-height:1.15; margin:8px 0 6px; }
  .by { color:var(--muted); }
  .quote { margin-top:14px; font-size:18px; font-weight:600; }
  .lead { margin-top:14px; color:var(--muted); font-size:15px; }
  .buttons { display:flex; flex-direction:column; gap:10px; }
  .btn { display:block; width:100%; padding:16px; border-radius:14px; border:1px solid var(--line); background:rgba(255,255,255,.06); color:var(--text); font:inherit; font-weight:700; text-align:center; text-decoration:none; cursor:pointer; }
  .btn small { display:block; font-weight:400; font-size:13px; color:var(--muted); margin-top:2px; }
  .btn.primary { background:var(--accent); border-color:var(--accent); }
  .btn.primary small { color:rgba(255,255,255,.8); }
  .btn:active { transform:scale(.98); }
  .btn.done { border-color:var(--ok); }
  .qr { text-align:center; }
  .qr img { width:160px; height:160px; background:#fff; border-radius:12px; padding:6px; }
  .qr p { font-size:13px; color:var(--muted); margin-top:6px; }
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
    {{QUOTE_LINE}}
    <p class="lead">The key points, take-home actions, and a ready-to-paste prompt so your own AI can help you apply them to your project.</p>
  </section>

  <section class="buttons">
    <a class="btn primary" href="{{MD_FILE}}" download>Download the MD<small>The talk notes as one file</small></a>
    <button class="btn" id="copyBtn" type="button">Copy to my own AI<small>Copies the notes, paste into Claude, ChatGPT or similar</small></button>
    <a class="btn" href="/skill/SKILL.md" download>Make your own<small>Get the iTabs This Talk skill and make a page for your talk</small></a>
  </section>

  <section class="qr">
    <img src="qr-talk-itabs-{{SLUG}}.svg" alt="QR code for talk.itabs.co/{{SLUG}}">
    <p>talk.itabs.co/{{SLUG}}</p>
  </section>

  <footer>
    <strong>Made with iTabs</strong><br>
    Jon · <a href="tel:0421508009">0421 508 009</a> · <a href="https://wa.me/61421508009">WhatsApp</a><br>
    <a href="mailto:jgwynne7@gmail.com">jgwynne7@gmail.com</a>
  </footer>
</main>
<script>
  var copyBtn = document.getElementById('copyBtn');
  var copyLabel = copyBtn.innerHTML;
  function flash(html, ok) {
    copyBtn.innerHTML = html;
    copyBtn.classList.toggle('done', ok);
    setTimeout(function () { copyBtn.innerHTML = copyLabel; copyBtn.classList.remove('done'); }, 2500);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  copyBtn.addEventListener('click', function () {
    fetch('{{MD_FILE}}')
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (text) {
        var done = function () { flash('Copied!<small>Now paste it into your AI</small>', true); };
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text) ? done() : flash('Couldn\'t copy<small>Use Download the MD instead</small>', false); });
        }
        fallbackCopy(text) ? done() : flash('Couldn\'t copy<small>Use Download the MD instead</small>', false);
      })
      .catch(function () { flash('Couldn\'t load the notes<small>Try Download the MD</small>', false); });
  });
</script>
</body>
</html>
```

The **Make your own** button links to `/skill/SKILL.md`, the shared copy of this skill on talk.itabs.co. Keep that link as it is: it only works once the page is live on talk.itabs.co, not when previewing the file locally.

---

## Step 4: Make the QR code

Point it at `https://talk.itabs.co/<slug>` (with `https://`). Save two files in the folder:

- `qr-talk-itabs-<slug>.svg`: used by the page, and sharp at any size.
- `qr-talk-itabs-<slug>.png`: large, for dropping onto the last slide.

If you can run Python:

```python
# pip install segno
import segno
url = "https://talk.itabs.co/<slug>"
q = segno.make(url, error="m")
q.save("<slug>/qr-talk-itabs-<slug>.svg", scale=10, border=4)
q.save("<slug>/qr-talk-itabs-<slug>.png", scale=20, border=4)
```

If you can, check it: decode the PNG (e.g. `cv2.QRCodeDetector().detectAndDecode`) and confirm it reads back the exact URL.

If you can't run code, tell the speaker to make the QR code in any free QR generator using that exact URL, saved as both files above.

**For the last slide:** the QR code on a white background, as large as the slide allows (at least a quarter of the slide's height), with the address written underneath in plain text: `talk.itabs.co/<slug>`. Suggested line: "Take this talk home: scan for the notes and a prompt for your own AI."

---

## Step 5: Hand it over

The finished folder:

```
<slug>/
  index.html
  <first>-<last>-<talk>.md
  qr-talk-itabs-<slug>.svg
  qr-talk-itabs-<slug>.png
```

Give the speaker the folder (as a zip if you can make one), the PNG for their last slide, and the MD to read over. Then tell them:

1. **Read the MD and fix anything that's off.** It's what their audience will take home.
2. **Send the folder to Jon at iTabs** to put it live: WhatsApp or call 0421 508 009, or email jgwynne7@gmail.com.
3. **Before presenting**, scan the QR code on a phone and check the page opens.

If you're working inside the itabs-this-talk repo itself, put the folder at the repo root next to `aidan/`, and add the talk to the table in `README.md` and the list in the root `index.html`.

---

## Checklist before you finish

- [ ] Every point in the MD comes from the speaker's material; nothing invented.
- [ ] MD has title, speaker, key points, take-home actions, and the paste-in prompt.
- [ ] Page made from the template, with every `{{…}}` replaced and nothing else changed.
- [ ] "Made with iTabs" and Jon's contact details are on the page and at the end of the MD.
- [ ] The QR code reads `https://talk.itabs.co/<slug>`, and the page shows the same slug.
- [ ] The speaker knows to send the folder to Jon and to test the QR code before the talk.

---

*iTabs This Talk skill · talk.itabs.co · Made with iTabs · Jon · 0421 508 009 · jgwynne7@gmail.com*
