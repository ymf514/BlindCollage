# Blind Collage / Visual Mad Libs

Pick a scene, place text prompts ("Something that makes noise"…), reveal them all at once as random Riso cut-outs, then name the picture.

Static site: HTML/CSS/JS + p5.js 2.3.4 (vendored in `vendor/`, no CDN). No backend, no accounts.

## Flow

1. **00 / BEGIN**: a small centered title with the 8 scenes right below. Click one to enter. **LIBRARY →** in the top-right corner shows pictures other people submitted (only when the archive is set up).
2. **01 / ARRANGE**: add up to 20 prompts (click, or drag from the list onto the canvas). The same prompt can be added more than once.
   - Drag to move · drag the ● handle above a selected box to rotate it freely (hold Shift to snap to 15°) · mouse wheel or corner handle to resize (keeps the aspect ratio) · Q / E rotate 10° · [ / ] layer order · Delete to remove · Esc to deselect. The same actions are also available as buttons under the canvas, for touch screens.
   - `BACKGROUND: ON/OFF`, `RANDOMIZE`, and `SCENES` (back to the gallery) change only the background. Prompt positions, sizes, angles and layers stay put.
3. **02 / REVEAL**: `REVEAL ALL` picks one image per prompt from its pool (no repeats within a round unless a pool runs out), loads only those files, then, once every image has loaded, turns the prompts into pictures one by one (bottom layer first, about 1.5–3.5 s in total). Click the picture or press Space / Enter / Esc to skip. Visitors with "reduce motion" turned on get an instant reveal. The images are contained in the box and never stretched. If loading fails, the layout is restored and the error names the file.
4. **03 / TITLE**: a **WHITE BORDER: ON / OFF** switch (白边：开 / 关) changes the cut-outs between the paper-border versions (`assets/riso/`) and the tight cut versions (`assets/riso-tight/`). The tight set only downloads when someone switches to it, and the choice is remembered in that browser. It's locked once the picture is submitted, and the choice is saved as `borders` in the layout so the library redraws it the same way (needs the latest `Code.gs` deployed).
5. **03 / TITLE (cont.)**: "What would you call this picture?" → `SAVE PNG` exports 1200×1040 (a 1200×900 artwork plus a title band; an empty title becomes "Untitled"). `START OVER` clears everything and returns to the scenes.

## Prompt categories (v2.1: 5 categories, `electricity` removed)

| id | UI copy | source |
|---|---|---|
| mouth | Something you could maybe put in your mouth | sheet 2, left of the line |
| falling | Something you don't want falling on your head | sheet 2, right of the line |
| moving | Something that moves — or looks like it might | sheet 3, left of the line |
| noise | Something that makes noise | sheet 3, right of the line |
| out_of_place | Something that really shouldn't be here | sheet 1 |

See [ASSETS.md](ASSETS.md) for every image, its tags, and the background credits.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. VS Code Live Server also works. Don't open `index.html` via `file://`, because `fetch()` of the JSON will fail.

## Project structure

```
index.html, style.css
js/assets.js    library loading + validation, random pick, image cache
js/collage.js   geometry, hit testing, rendering, PNG export (1200×900 logical space)
js/game.js      stages, state, DOM controls, reveal, title, start over
js/sketch.js    p5 canvas, scaling, pointer/wheel/keyboard/drop events
js/config.js    submitUrl for the archive (empty = off)
js/replay.js + replay.html   rebuild a PNG from a saved layout_json
apps-script/Code.gs          Google Apps Script backend (paste into the Sheet)
data/library.json   single source of truth: prompts, assets, backgrounds
assets/riso/    65 transparent PNG cut-outs from the three Riso scans
background/     8 scene photos (+ thumbs/ for the gallery)
vendor/p5.min.js
legacy/         the v1 silhouette version (not loaded)
```

## Adding an image

1. Put a transparent PNG in `assets/riso/` (around 640 px on the long side keeps files at 50–250 KB).
2. Add an entry to `assets` in `data/library.json`:
   ```json
   {"id": "rubber-duck", "file": "assets/riso/rubber-duck.png", "label": "Rubber duck", "prompts": ["noise", "moving"]}
   ```
   No code change is needed. Problems such as duplicate ids, unknown prompt ids, or empty pools are logged in the console and shown under the scene gallery.

## Adding a scene

Scenes are shown as Riso-style prints made by the author: halftone PNGs in `background/riso/<id>.png`, with 640×480 gallery thumbnails in `background/riso/thumbs/<id>.jpg`. The original photos stay in `background/` (the `photo` field in `library.json`).

If you replace a print, save it as a PNG with the same name, then recompress it losslessly. Halftone images shrink from about 5 MB to under 1 MB with every pixel unchanged, which is smaller than a JPEG. Regenerate its thumbnail as a centre 4:3 crop at 640×480 (any image editor works).

**Resize before applying the halftone.** The halftone dots are about 5.6 px apart no matter how big the image is. Resize the photo to about **1600 px wide first**, then apply the halftone, so the dots stay visible on the canvas like in the other scenes. If the halftone is applied to a 4000–5000 px photo, the dots blur away once it's scaled down to fit the canvas. That's why `chickens` and `pfizer` currently look like plain photos; their full-size files are kept in `background/riso-source/`, which the site doesn't load, so you can delete that folder before deploying. `tools/riso_background.py` (below) is an optional automatic alternative.

1. Put the photo in `background/`.
2. Make the Riso version (your own, or the automatic one: needs Python with numpy, scipy and pillow):
   ```bash
   python3 tools/riso_background.py background/new.jpg background/riso/new.jpg background/riso/thumbs/new.jpg
   ```
3. Add `{"id", "label", "label_zh", "file": "background/riso/new.jpg", "photo": "background/new.jpg", "thumb": "background/riso/thumbs/new.jpg", "credit", "url"}` to `backgrounds`.

How the effect works: the photo is split by tone into the same three inks as the printed cut-outs. Blue (#2348AC) carries shadows and structure, red (#D73E32) carries warm tones, and yellow (#F0E230) adds a light warm fill. Each ink gets a soft grain that is strongest in the midtones, a few ink dropouts and slightly uneven pressure. The layers are offset by 2–3 px (misregistration) and overprinted (multiply) on an off-white paper texture. To go back to plain photos, point each `file`/`thumb` back at `background/` and `background/thumbs/`.

## Languages (EN / 中文)

The `EN / 中文` toggle is in the top-right corner. English is the default; the choice is remembered in the visitor's browser, and `?lang=zh` in the URL opens the Chinese version directly.

- Interface text lives in [`js/i18n.js`](js/i18n.js) (`STRINGS.en` / `STRINGS.zh`). Prompt and scene names use `label_zh` in `data/library.json`.
- Chinese uses **Noto Serif SC** (Light 300; ExtraLight 200 for the heading) from Google Fonts, which only downloads the characters a page uses. Latin text stays Courier New. If Google Fonts is unreachable, the system Song typeface is used instead.
- Each submission records `lang` (`en` / `zh`) in its layout JSON, once the latest `Code.gs` is deployed as a new version.
- The non-commercial notice at the bottom of the page is the `disclaimer` string in both languages.

## Saving submissions + library (Google Sheet + Drive, no database)

It's off by default. Once you set it up, the title screen gets a **SUBMIT TO ARCHIVE** button with a one-line notice (which says the picture will appear in the public library), and the home page gets **LIBRARY →**. Each submission stores:

- **Google Drive**: the final PNG, in a private folder named "Blind Collage Submissions".
- **Google Sheet**: one row with time, submission id, title, scene, the "prompt → image" pairs, the full `layout_json`, and a link to the PNG.

No name, email, IP or browser info is collected. Each round has one id, so a retried request is never stored twice. After submitting, the title is locked so the sheet and the PNG stay in sync.

One-time setup, about 5 minutes, in your own Google account:

1. Create a new Google Sheet (any name). Then choose **Extensions → Apps Script**.
2. Delete the sample code and paste in everything from [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. Pick the function **`setup`** in the toolbar and click **Run**. Approve the permission prompt (it asks for Sheets + Drive, for your own files). This creates the `Submissions` tab and the Drive folder.
4. Click **Deploy → New deployment → type: Web app**.
   - *Execute as*: **Me**
   - *Who has access*: **Anyone** (this lets the public site post; it does not make your sheet or folder public)
   - Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Paste that URL into `submitUrl` in [`js/config.js`](js/config.js). Reload the site.
6. If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → Version: New version**, so the URL stays the same.

Quick check: opening the `/exec` URL in a browser should show `{"ok":true,"service":"blind-collage-archive"}`, and `/exec?action=list` should show `{"ok":true,"items":[…]}`.

**The library** asks the script for the newest 300 layouts (`?action=list`) and redraws them in the browser from the site's own assets. The Drive PNGs stay private; only titles, dates and layouts are public. To remove a picture from the library, type anything (e.g. `x`) in its **hide** column in the sheet. Nothing gets deleted. Note: the library draws old submissions with the current cut-outs, so if an image file is changed later (as when the orientations were fixed), older pictures in the library change with it. The Drive PNG keeps the original.

**Rebuilding a picture from the sheet:** open `replay.html`, paste a `layout_json` cell, then RENDER / SAVE PNG. Because the assets are fixed, the layout alone is enough to redraw the picture. This works even if a Drive PNG is deleted, as long as you don't rename or remove asset ids.

Limits: anyone with the URL could post junk rows. The script rejects anything that isn't a valid layout plus a real PNG (max 8 MB, max 10 pieces), but it isn't authenticated, because a static site can't keep a secret. Each PNG is about 2–3 MB, so 15 GB of free Drive space holds roughly 5,000 submissions.

## Updating the live site

Scripts and the stylesheet are linked with `?v=…` in `index.html` / `replay.html`. Change that version string whenever you edit JS/CSS, so returning visitors don't keep an old cached copy.

## Deploy to GitHub Pages

Push this folder as the repo root → Settings → Pages → Deploy from a branch → `main` / root. All paths are relative, so the site works under `https://<user>.github.io/<repo>/`. (Not deployed or pushed yet.)

## Licensing to check before going public

- Backgrounds come from Wikimedia Commons (CC0 / public domain / CC BY / CC BY-SA). Credits are shown under each scene in the gallery and listed in ASSETS.md. CC BY-SA (living room) asks that adaptations be shared alike, so swap it out if that's a problem.
- Several Riso cut-outs reproduce third-party characters and brands (Mona Lisa is public domain; Miku, No-Face, Nyan Cat, Om Nom, Doritos, Kodak, Jack Daniel's etc. are not). That is usually fine for a class project, but worth a look before a public launch.
