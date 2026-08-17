# Two Ancient Classics (Royal Game of Ur + Nine Men's Morris) — Baseline Capture

**⚠️ Still not a real session handoff for the original build.** No dedicated handoff document for the initial Two Ancient Classics build has ever been written or uploaded to this repo — that session predates this repo's tracking. This file was reconstructed on 16 Aug 2026 from scvd.app's listing and the Hnefatafl handoff, then updated the same week once a real production incident surfaced and got investigated end-to-end (see "Checkout outage" below). If a real handoff for the original build session exists, it should still replace the top section of this file.

---

## What's confirmed

- **Live URL:** https://scvd-app.github.io/Two-Ancient-Classics/
- **Pitch (from scvd.app):** "Ancient Games 02 & 03. Royal Game of Ur and Nine Men's Morris with hotseat and multiplayer options."
- **Series position:** Royal Game of Ur = Ancient Games 02, Nine Men's Morris = Ancient Games 03 — locked in during the Hnefatafl session, superseding an earlier plan that also included Senet (dropped from this bundle, not cancelled outright).
- **Files captured in this repo:** `index.html`, `manifest.json`, `favicon.ico`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-source.svg`, and — as of 17 Aug 2026 — the real `worker.js`.
- **Pricing: $2.00 USD, confirmed.** `worker.js` line 91 hardcodes `"line_items[0][price_data][currency]": "usd"` — same pattern as Jumpin' Pin and Hnefatafl. The bundle unlocks *both* games (Ur + Nine Men's Morris) for the one $2 charge, not $2 each.
- **Worker architecture:** deliberately its own Cloudflare Worker service (`two-ancient-classics`), separate from the shared `ancient-games-online` Worker that handles invite/move state for Hnefatafl (and is meant to be extended for Ur + NMM online play) — payments and gameplay-state are kept with no shared code, no shared KV, by design.
- **Routes:** `/checkout/create`, `/checkout/activate`, `/webhook`, `/restore/request`, `/restore/confirm`.
- **Bindings the code expects, matching what's actually configured live:** secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`; plaintext vars `ALLOWED_ORIGIN`, `GAME_URL`; KV namespaces `BUNDLE_EMAILS`, `BUNDLE_RESTORE`.
- **Header comments in `worker.js` explicitly reference the Hnefatafl lesson:** conflating `GAME_URL` and `ALLOWED_ORIGIN` "already cost two real charges" on Hnefatafl (the 12 Aug double-charge) — this file was written with that lesson already baked in, and does keep the two values separate.

## Checkout outage — found, diagnosed, and RESOLVED (16–17 Aug 2026)

**What happened:** the live `two-ancient-classics` Cloudflare Worker was found to have the *wrong code deployed* — literally the `ancient-games-online` game-logic Worker (invite/move routes for Hnefatafl + Nine Men's Morris), not the payments Worker. Every checkout click was hitting a 404. All the correct secrets and KV bindings were still configured and untouched; only the code itself was wrong.

**How it's believed to have happened:** a real purchase and Pro activation *did* succeed on this Worker roughly 3 days before the outage was found (confirmed via a live-mode $2 Stripe charge, a successful `checkout.session.completed` webhook delivery, and Scott's own Pro status). Chat history from around that time shows a session fixing a *client-side* bug — `index.html`'s `BUNDLE_API_BASE` constant was still pointing at a placeholder Worker URL — and once wired to the real `two-ancient-classics.emblen-scott.workers.dev` address, checkout worked end-to-end on a live key. That same session then moved straight into "add online play for the bundle, two games in one." The working theory — not yet 100% confirmed, but consistent with the Cloudflare version history — is that the online-play work for Ur/NMM was deployed to the `two-ancient-classics` service by mistake instead of the intended `ancient-games-online` service, overwriting the working checkout code. Cloudflare version history shows an intermediate version (`1aab2fff`, "Add secret: STRIPE_WEBHOOK_SECRET") that still carries the default Workers scaffold, then a later "Manually deployed" version that matches the game-logic code found live — consistent with this sequence, though the exact version boundary hasn't been pinned down with certainty.

**Recovery:** the genuine `worker.js` (this file) was recovered from Claude chat history rather than from Cloudflare version rollback, reviewed line-by-line, confirmed to be complete correct Stripe checkout code with the right currency/routes/bindings, then redeployed to the live `two-ancient-classics` Worker (version `46593bfe`) on 17 Aug 2026.

**Verified fixed, live, same day:** clicking through the app's own purchase button produced a genuine Stripe Checkout session — `checkout.stripe.com/c/pay/cs_live_...`, "Two Ancient Classics — Pro Unlock", **US$2.00**, Scott's real saved card via Link. End-to-end real-money confirmation, not a test-mode simulation. Checkout is fully restored.

**Still open (not blocking, just the next real work item):**
- Online play for Royal Game of Ur + Nine Men's Morris should be built into the *shared* `ancient-games-online` Worker (extending its existing Hnefatafl invite/move logic), not into `two-ancient-classics` — this is the specific mistake that caused the outage in the first place, so it's worth deliberately checking which Worker service is selected before deploying that work.
- The root-cause theory above (wrong-service deploy during the online-play work) is plausible and consistent with the evidence but was never confirmed with 100% certainty — worth a quick sanity check next time Cloudflare version history is being reviewed for other reasons, purely for the record.

## Planned scope (per the Hnefatafl handoff — status of each item still not fully verified against the live build)

- Real AI opponents — Ur flagged as possibly needing an expectiminimax/dice-aware approach rather than plain minimax (luck-driven); Nine Men's Morris expected to port Hnefatafl's minimax more directly (no randomness).
- Challenge mode with side-select, same pattern as Hnefatafl.
- Intro crawl via the shared `IntroCrawl` component, new copy per game.
- Share/brag card, same canvas-generated approach.
- Freemium quota: 3 free games per mode per day (Play + Challenge, 6 total), device-local midnight reset, only completed games count.
- Pro tones: same three Ancient Games colours as Hnefatafl (Sandbar Gold / Deep Channel / Chasin' Curves).
- Online play for both games — confirmed still outstanding as of 17 Aug 2026 (see outage section above); this was the very next item queued right after checkout was confirmed working.
- Home-screen button icons for the bundle — flagged as an open question in chat history: how to represent "2 games in one" visually. A tentative idea floated was two ancient pillars forming a Roman numeral II, not yet built.

## What's still missing

- The shared online-play worker (`ancient-games-online-worker.js`, handles both Hnefatafl and Nine Men's Morris invite/move state) — ✅ captured, see `ancient-games/online-worker.js`. Still needs Ur + full NMM online support added.
- Confirmation of which planned-scope items above actually shipped vs. are still open.
- The header-label fix mentioned in the Hnefatafl handoff (Ur's prototype file reportedly still said "PROTOTYPE · ANCIENT GAMES 01", Nine Men's Morris said "ANCIENT GAMES 02") — worth checking whether this got corrected to 02/03 in the live build.
- A real handoff for the original build session (AI approach, freemium implementation, full build notes) — still doesn't exist anywhere.

## Open action

1. ~~Redeploy the recovered `worker.js` to the live Cloudflare Worker and verify checkout works.~~ ✅ Done and verified live, 17 Aug 2026.
2. Build online play for Ur + NMM into `ancient-games-online`, not `two-ancient-classics`.
3. Backfill a real handoff for the original build session if one is ever located.
