# Jumpin' Pin — Baseline Capture

**⚠️ This is NOT a real session handoff.** No dedicated handoff document for Jumpin' Pin has ever been written or uploaded to this repo — this file exists purely so the folder isn't empty and the live app has *some* record here. It was reconstructed on 16 Aug 2026 from references in the Hnefatafl handoff (see `hnefatafl/handoff.md`) plus what's shown on scvd.app. If a real Jumpin' Pin handoff exists in an old chat session, it should replace this file.

---

## What's confirmed

- **Live URL:** https://scvd-app.github.io/Jumpin-Pin/
- **Pitch (from scvd.app):** "Ancient Games 01. Peg solitaire, reimagined. Novelty board shapes, golf-style scoring."
- **Series position:** Ancient Games 01 — retroactively branded during the Hnefatafl session (16 Aug 2026). The "ANCIENT GAMES · 01" eyebrow line and landing-page card were updated to match at that time.
- **Pro tones:** Sandbar Gold / Deep Channel / Chasin' Curves colour themes originated here — Hnefatafl later ported these three themes "exactly... same names, same hex values."
- **Files captured in this repo (16 Aug 2026):** `index.html`, `manifest.json`, `icon-192.png`, `icon-512.png` — pulled directly from the live `scvd-app/Jumpin-Pin` GitHub repo.

## What's missing

- **`worker.js`** — ✅ now captured (16 Aug 2026), pasted in by Scott from a previous chat. Confirms `line_items[0][price_data][currency]: "usd"` hardcoded — **Jumpin' Pin's checkout is in USD**, not AUD, per this file. One caveat: I can't independently confirm this pasted copy is byte-identical to what's actually deployed on `jumpinpin.emblen-scott.workers.dev` right now (no reason to doubt it, but unlike the Hnefatafl worker below, nothing in this file's own comments flags it as a reconstruction either — it reads as the real thing).
- Full build history, known issues, and open actions beyond monetisation — none of this has ever been documented for this app in `scvd-context`.

## Open action

Backfill this with a real handoff next time Jumpin' Pin gets touched — even a short "current state as of [date]" writeup would beat this placeholder.
