# SCVD Context Repository

**Owner:** SCVD-App (Scott Emblen)  
**Purpose:** Persistent project context accessible by Claude across all chat sessions  
**Last Updated:** 26 June 2026 — Session 9

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
└── nagging-reminder/
    ├── handoff.md
    └── archive/
```

---

## Important Notes

- **Never store secrets here** — no API keys, no Stripe keys, no wrangler.toml content
- **wrangler.toml** stays outside the GitHub folder always
- This repo is **public** — treat it as documentation only, not credential storage
- Cloudflare Worker secrets stay in the Cloudflare dashboard
