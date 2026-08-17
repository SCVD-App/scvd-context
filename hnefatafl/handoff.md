# Hnefatafl — Handoff

**Status:** Live at `https://scvd-app.github.io/Hnefatafl/`. Real Stripe payments confirmed working end-to-end (after fixing a real redirect bug — see below). This was an enormous single session — AI engine, Challenge mode, full monetisation, and a suite of polish features all landed today.

**Housekeeping flag for next session's start:** `scvd-context` currently has no folders for **Jumpin' Pin** or **Hnefatafl** — both are live, shipped apps with none of today's (or Jumpin' Pin's) work captured in the context repo yet. First thing next session: create `jumpin-pin/` and `hnefatafl/` folders, commit their handoffs (this doc for Hnefatafl), `index.html`, and `worker.js` where applicable, before touching Ur/Nine Men's Morris.

---

## Ancient Games series — numbering locked in

- **Jumpin' Pin = Ancient Games 01** — retroactively branded today. Added the "ANCIENT GAMES · 01" eyebrow line to its header (same styling as the others), and updated its landing-page card/departure-board row to say so.
- **Hnefatafl = Ancient Games 04** — already baked into its intro crawl, in-game header, and landing page card before this decision was made, so it stayed fixed and everything else numbered around it.
- **Royal Game of Ur = Ancient Games 02**, **Nine Men's Morris = Ancient Games 03** — this is a *change*. The Ur prototype file currently still says "PROTOTYPE · ANCIENT GAMES 01" (collides with Jumpin' Pin now) and Nine Men's Morris says "ANCIENT GAMES 02" (collides with Ur's new number). Both need their header text corrected as part of the "jazz up" work.
- **Senet dropped from the bundle.** Locking Jumpin' Pin at 01 and Hnefatafl at 04 leaves exactly two slots (02, 03) for what was originally a three-game Ur/Nine Men's Morris/Senet bundle. Decision: keep the bundle at two genuinely substantial games (Ur + Nine Men's Morris) rather than force a third in. Senet isn't cancelled, just not part of this bundle — revisit later, possibly as its own release the way Hnefatafl was.

## Next build: Ur + Nine Men's Morris get the full Hnefatafl treatment

Confirmed scope — **build Ur first as the template, then port the same pattern to Nine Men's Morris**:
- Real AI opponent (Ur has luck/dice involved, so plain minimax may not be the right fit the way it was for Hnefatafl — worth evaluating expectiminimax or a similar dice-aware search rather than assuming Hnefatafl's exact algorithm ports directly. Nine Men's Morris has no randomness, so minimax should port more directly there.)
- Challenge mode (AI, with side-select) — same pattern as Hnefatafl
- Intro crawl (Star Wars-style, reusable `IntroCrawl` component already built in Hnefatafl — same component, new copy per game)
- Share/brag card (same canvas-generated approach, swap copy and colours)
- Freemium quota — **confirmed: same as Hnefatafl, not the original "Ur free, bundle paid" plan documented previously.** 3 free games per mode per day (Play + Challenge, 6 total), same device-local-midnight reset, same "only completed games count" rule.
- Pro tones — **same three Ancient Games colour tones as Hnefatafl** (Sandbar Gold / Deep Channel / Chasin' Curves, identical hex values, same lock-overlay + upsell-toast interaction), sitting behind the same paywall as unlimited play.
- Monetisation — same Stripe Worker pattern (per-purchase UUID token, KV pending→paid, activation cap, Resend restore with rate-limiting) — **critical: see the bug below before building this again.**

**Target: ship the two-game bundle (Ur + Nine Men's Morris) by end of next session**, if the pace holds.

## Critical lesson — don't repeat this bug

Hnefatafl's Stripe Worker originally built `success_url`/`cancel_url` from `ALLOWED_ORIGIN` (`https://scvd-app.github.io`, deliberately origin-only for CORS purposes) instead of the actual game URL (`https://scvd-app.github.io/Hnefatafl/`). Real consequence: after paying, Stripe correctly redirected to the bare SCVD org root instead of back into the game, so the polling/activation code never ran. The app never saw either payment. **Scott was charged twice (real money) tracking this down** before it was caught and fixed.

Fix pattern to replicate from the start next time: keep two separate constants —
- `ALLOWED_ORIGIN` — origin only, no path, used solely for the `Access-Control-Allow-Origin` CORS header.
- `GAME_URL` — the full path to the actual game page, used for `success_url`/`cancel_url`.

Never reuse one for the other. Test the full redirect loop with a real (test-mode) purchase before considering the integration done, not just the webhook delivery.

## Everything built in this Hnefatafl session

**Visual identity**
- Double rope-border frame around the board (two concentric "twisted rope" rings via `repeating-linear-gradient`, no image assets), with gold corner ❖ marks.
- Runic border text — Younger Futhark transliteration (16-rune Viking-age script, standard Latin correspondence table), reading "Fortune"/"Favours"/"The Brave" around the board plus "SCVD.app" on the south edge. Requires the Noto Sans Runic webfont (linked in `<head>`) — falls back to tofu boxes without it, worth knowing if testing offline.
- Board sizing formula (`FRAME_CHROME` constant) accounts for all the frame chrome so it doesn't overflow narrow phone viewports — this was a real bug (east/west borders were being silently clipped by `overflow-x: hidden`) before the fix.

**AI opponent**
- Full move generation (`allLegalMoves`), pure position simulation (`simulateMove`, reusing the same `resolveCaptures`/`checkKingCaptured` the human game path uses — the AI can never see a different ruleset than a human plays).
- Evaluation function built directly on `openCorridors`/`maxCorridorLength`/`openCornerPaths` — the same king-freedom functions already driving the berserker glow effect, not reimplemented. Weighted to match the two anchor points from the original AI-eval design doc (boxed-in start = 0, open corner-run ≈ 160) — **reconstructed from a description, not the original exact formula** — if that original doc surfaces, worth truing up.
- Attacker eval is just the mirror of defender freedom (minimise it) — the design doc's attacker-specific ideas (corridorsClosed/cornerLanesHeld/sentrySafety) were only sketched, never coded. Real next tuning pass, not a gap that was glossed over.
- Minimax with alpha-beta pruning, depth 3 (`AI_DEPTH` — the one difficulty knob, no levels yet).

**Challenge mode**
- Side selection every fresh game (Muscovites/Swedes, sword/shield icons, no verb in the label — "Play the X" reads ambiguously in Australian shorthand, fixed to just the faction name).
- Separate save-state from Play mode, own autosave key.
- "Last move" highlight (gold ring on origin + destination squares) — added after feedback that AI moves were invisible/disorienting with no indication of what changed. Also applied to Play mode for the same hotseat pass-the-phone reason.

**Intro crawl**
- `IntroCrawl` component, portable across the series — title card, then a genuine 3D perspective crawl (not a straight scroll; the tilt pivots on a "ramp" anchored to the actual screen bottom edge, not the moving text block itself — an earlier version got this wrong and the text appeared to start already-shrunk partway up the screen).
- Runic motto ("Fortune"/"Favours"/"The Brave" with translations) crossfades in as the crawl clears, then a closing SCVD.app brand card. ~40s total, skippable, auto-plays once per browser (localStorage flag) with a small replay button after.

**Freemium + monetisation**
- 3 free games per mode per day (Play + Challenge separately, 6 total), device-local midnight reset, only completed games count (Reset never penalises).
- Real Stripe Worker (`worker.js`) — checkout session creation, webhook handling (constant-time signature verification, same ECEG hardening lesson), KV-based token activation with a device cap, email-gated restore via Resend (rate-limited 1/email/5min, same ECEG lesson).
- **Currency: USD, not AUD** — standing SCVD-wide decision, already in Claude's memory now. The worker was briefly live in AUD before this was caught and corrected.
- Restore flow has two steps: request a code by email, then actually enter that code to redeem it — the second step was originally missing entirely (built the "send" half, forgot the "receive" half) until Scott's double-charge surfaced it.

**Pro tones**
- Three additional colour themes ported *exactly* from Jumpin' Pin (same names, same hex values, not approximated) — Sandbar Gold, Deep Channel, Chasin' Curves — locked behind Pro, with the same lock-overlay-on-swatch + 2.2s upsell-toast-on-locked-tap interaction as the source.

**Share/brag card**
- Canvas-generated PNG (1080×1350) styled to match the board's own visual language — double border, gold Georgia type, the same runic brand mark. Three-tier fallback: native share with file attached → native share text+link → download + copy-link.
- The actual URL is printed directly on the image itself, because several chat apps (Messenger confirmed) drop share caption text entirely once a file is attached — a caption that can vanish isn't a real link.
- Play mode shares on either side's win (hotseat, both are real people). Challenge mode only shares when the human beats the AI.

**Icon**
- Custom SVG icon (gold shield-and-sword emblem, not stacked separately but merged into one silhouette) on a teal-emerald background pulled from the game's own defender-piece colour, not an arbitrary new one. Full size set generated (favicon.ico, 192/512/180px PNGs) plus a `manifest.json` for proper "Add to Home Screen" behaviour.

**Removed:** Sandbox mode — cut entirely, slot reserved in the code (with a comment marker) for a future "Challenge a Friend to a Game" feature.

**Header:** "PROTOTYPE · ... · HOTSEAT" replaced with "ANCIENT GAMES · 04" — no longer accurate to call it a prototype or hotseat-only now that AI/Challenge/payments are real and live.

## Open items for the Ur/Nine Men's Morris build

- Ur and Nine Men's Morris header labels need correcting to 02/03 (see numbering section above).
- Decide Ur's AI approach — dice-aware search (expectiminimax-family) is probably more honest than porting Hnefatafl's plain minimax unchanged, given how much luck drives outcomes.
- `scvd-context` needs `jumpin-pin/` and `hnefatafl/` folders created and backfilled before this handoff and the live code are both actually safe (right now this document only exists in chat until it's committed).
