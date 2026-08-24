# SCVD Context Repository

**Owner:** SCVD-App (Scott Emblen)  
**Purpose:** Persistent project context accessible by Claude across all chat sessions  
**Last Updated:** 24 August 2026 — `scvd-web/` folder added (the scvd.app landing page, mirrored from its own separate repo at `C:\Dev\SCVD-WEB` — see the note under Repo Structure on why only the files are copied, never that repo's `.git`)

---

## How Claude Uses This Repo

At the start of any session, say:
> "Fetch the Mic Drop context" or "Fetch the SCVD timeline"

Claude will fetch the raw file directly from GitHub — no pasting, no uploading required.

### Fetch URLs (copy these into any Claude chat)

| File | URL |
|------|-----|
| Master Timeline | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/timeline.md` |
| SCVD Infrastructure | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/scvd-infrastructure.md` |
| Mic Drop Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/mic-drop/handoff.md` |
| Mic Drop index.html | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/mic-drop/index.html` |
| Mic Drop worker.js | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/mic-drop/worker.js` |
| Chasin' Curves Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/chasin-curves/handoff.md` |
| CITT/Maverick Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/citt-maverick/handoff.md` |
| TGM Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/tgm/handoff.md` |
| Ancient Games Series Roadmap | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/ancient-games/roadmap.md` |
| Jumpin' Pin Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/jumpin-pin/handoff.md` |
| Jumpin' Pin index.html | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/jumpin-pin/index.html` |
| Two Ancient Classics Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/two-ancient-classics/handoff.md` |
| Two Ancient Classics index.html | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/two-ancient-classics/index.html` |
| Hnefatafl Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/hnefatafl/handoff.md` |
| Hnefatafl index.html | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/hnefatafl/index.html` |
| scvd.app Landing Page Handoff | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/scvd-web/handoff.md` |
| scvd.app index.html | `https://raw.githubusercontent.com/SCVD-App/scvd-context/main/scvd-web/index.html` |

---

## Session End Workflow (2 minutes in GitHub Desktop)

1. Copy current `handoff.md` → `archive/handoff_session9.md` (use session number)
2. Overwrite `handoff.md` with the new version from Claude
3. If `index.html` changed → copy old to `archive/index_v1.8.html`, overwrite current
4. If `worker.js` changed → copy old to `archive/worker_YYYYMMDD.js`, overwrite current
5. Commit message: `Session 9 — Stripe live, scvd.app email setup`
6. Push

---

## Archive Convention

| File type | Archive naming |
|-----------|---------------|
| Handoff docs | `handoff_session9.md` |
| Frontend | `index_v1.8.html` |
| Worker | `worker_20260626.js` |
| Other | `filename_YYYYMMDD.ext` |

---

## Repo Structure

```
scvd-context/
├── README.md                    ← this file
├── timeline.md                  ← 12-project master timeline
├── scvd-infrastructure.md       ← domains, workers, secrets map
├── mic-drop/
│   ├── handoff.md
│   ├── index.html
│   ├── worker.js
│   └── archive/
├── chasin-curves/
│   ├── handoff.md
│   ├── index.html
│   ├── worker.js
│   └── archive/
├── tgm/
│   ├── handoff.md
│   └── archive/
├── citt-maverick/
│   ├── handoff.md
│   ├── index.html
│   ├── worker.js
│   └── archive/
├── cult-connections/
│   ├── handoff.md
│   └── archive/
├── lottery-winner/
│   ├── handoff.md
│   └── archive/
├── great-minds/
│   ├── handoff.md
│   └── archive/
├── safe-bet/
│   ├── handoff.md
│   └── archive/
├── vent-app/
│   ├── handoff.md
│   └── archive/
├── gottago/
│   ├── handoff.md
│   └── archive/
├── volta-makashi/
│   ├── handoff.md
│   └── archive/
├── nagging-reminder/
│   ├── handoff.md
│   └── archive/
├── ancient-games/
│   └── roadmap.md           ← series-wide numbering + Pachisi/Patolli/Go research, not tied to one game
├── jumpin-pin/               ← Ancient Games 01
│   ├── handoff.md
│   ├── index.html
│   ├── manifest.json
│   ├── icon-192.png / icon-512.png
│   └── archive/
├── two-ancient-classics/     ← Ancient Games 02 (Royal Game of Ur) + 03 (Nine Men's Morris)
│   ├── handoff.md
│   ├── index.html
│   ├── manifest.json
│   ├── favicon.ico, icon-180/192/512.png, icon-source.svg
│   └── archive/
├── hnefatafl/                ← Ancient Games 04
│   ├── handoff.md
│   ├── index.html
│   ├── manifest.json
│   ├── favicon.ico, icon-180/192/512.png, icon-source.svg
│   └── archive/
└── scvd-web/                 ← the scvd.app portfolio landing page
    ├── handoff.md
    ├── index.html
    ├── CNAME                 ← GitHub Pages custom-domain file, contains "scvd.app"
    └── archive/
```

**Note on the three Ancient Games folders above:** `index.html`/`manifest.json`/icons were pulled directly from each app's live GitHub Pages repo. None of the three has a `worker.js` here yet — none of the Stripe workers (if built) live in the public Pages repos, so they couldn't be cloned automatically; paste them in manually from the Cloudflare dashboard if they exist. `jumpin-pin/handoff.md` and `two-ancient-classics/handoff.md` are placeholder "baseline capture" docs, not real session handoffs — no such document has ever been written for either app. Only `hnefatafl/handoff.md` is a genuine session handoff.

**Note on `scvd-web/`:** unlike every other folder above, this one's live source is a completely separate repo (`C:\Dev\SCVD-WEB`, its own `.git`, deployed straight to GitHub Pages for the `scvd.app` custom domain). This folder is a read-only mirror for Claude's context, kept in sync manually the same way as the others — **never copy that repo's `.git` folder in here.** Two git repos nested inside each other (one repo's `.git` sitting inside a folder that's itself tracked by `scvd-context`'s own `.git`) makes GitHub Desktop treat the inner one as an embedded repo and silently mis-track its files, so they can look committed in the file browser while never actually reaching GitHub. Copy the files, not the folder.

---

## Important Notes

- **Never store secrets here** — no API keys, no Stripe keys, no wrangler.toml content
- **wrangler.toml** stays outside the GitHub folder always
- This repo is **public** — treat it as documentation only, not credential storage
- Cloudflare Worker secrets stay in the Cloudflare dashboard
