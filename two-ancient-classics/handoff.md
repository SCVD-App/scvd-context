# Two Ancient Classics (Royal Game of Ur + Nine Men's Morris) — Baseline Capture

**⚠️ This is NOT a real session handoff.** No dedicated handoff document for this app has been written or uploaded to this repo. It shipped live sometime after the Hnefatafl handoff (16 Aug 2026) was written — that doc still describes Ur + Nine Men's Morris as upcoming work ("Target: ship the two-game bundle by end of next session"), but scvd.app already shows it live. Whatever session actually built it doesn't have a captured handoff. This file was reconstructed on 16 Aug 2026 purely from scvd.app's listing plus the planning notes in `hnefatafl/handoff.md`. If a real handoff for this build exists, it should replace this file.

---

## What's confirmed

- **Live URL:** https://scvd-app.github.io/Two-Ancient-Classics/
- **Pitch (from scvd.app):** "Ancient Games 02 & 03. Royal Game of Ur and Nine Men's Morris with hotseat and multiplayer options."
- **Series position:** Royal Game of Ur = Ancient Games 02, Nine Men's Morris = Ancient Games 03 — locked in during the Hnefatafl session, superseding an earlier plan that also included Senet (dropped from this bundle, not cancelled outright).
- **Files captured in this repo (16 Aug 2026):** `index.html`, `manifest.json`, `favicon.ico`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-source.svg` — pulled directly from the live `scvd-app/Two-Ancient-Classics` GitHub repo.

## Planned scope (per the Hnefatafl handoff — status of each item unverified against the actual shipped build)

- Real AI opponents — Ur flagged as possibly needing an expectiminimax/dice-aware approach rather than plain minimax (luck-driven); Nine Men's Morris expected to port Hnefatafl's minimax more directly (no randomness).
- Challenge mode with side-select, same pattern as Hnefatafl.
- Intro crawl via the shared `IntroCrawl` component, new copy per game.
- Share/brag card, same canvas-generated approach.
- Freemium quota: 3 free games per mode per day (Play + Challenge, 6 total), device-local midnight reset, only completed games count.
- Pro tones: same three Ancient Games colours as Hnefatafl (Sandbar Gold / Deep Channel / Chasin' Curves).
- Monetisation: same Stripe Worker pattern as Hnefatafl — **if this was built, double-check it uses the `GAME_URL` vs `ALLOWED_ORIGIN` split described in the Hnefatafl handoff's "critical lesson" section. That bug caused a real double-charge on Hnefatafl and is exactly the kind of thing that could get copy-pasted wrong again.**

## What's missing — including a genuine open question about whether checkout even works

- **`worker.js` for the bundle checkout (`BUNDLE_API_BASE = two-ancient-classics.emblen-scott.workers.dev`) — still not captured.** Not present in the public Pages repo, and Scott hasn't had a copy to paste in yet either. **Currency here is a real unknown, unlike Jumpin' Pin and Hnefatafl.**
- **Bigger flag, found while investigating the currency question (16 Aug 2026):** `index.html` itself contains two `// TODO before shipping: replace with the real deployed Worker URL` comments — one on `BUNDLE_API_BASE` (checkout), one on `ONLINE_API_BASE` (online play). That phrasing suggests these may still be placeholder addresses rather than the real production endpoints, which would mean the purchase flow itself might not be properly wired yet — a bigger problem than which currency it's set to. Worth Scott checking whether `two-ancient-classics.emblen-scott.workers.dev` is actually a deployed, working Worker before worrying about its currency setting.
- The shared online-play worker (`ancient-games-online-worker.js`, handles both Hnefatafl and Nine Men's Morris invite/move state) — ✅ now captured, see `ancient-games/online-worker.js`. This one is unrelated to payments/currency.
- Confirmation of which planned-scope items above actually shipped vs. are still open.
- The header-label fix mentioned in the Hnefatafl handoff (Ur's prototype file reportedly still said "PROTOTYPE · ANCIENT GAMES 01", Nine Men's Morris said "ANCIENT GAMES 02") — worth checking whether this got corrected to 02/03 in the live build.

## Open action

Backfill this with a real handoff describing the actual build session, current AI approach, and monetisation status — this placeholder is a stopgap, not a substitute.
