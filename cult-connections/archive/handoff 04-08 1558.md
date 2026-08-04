# Cult Connections — Project Handoff

**Session:** 3 (live payment backend build, two production bug fixes, new content)
**Date:** 21 July 2026
**Status:** ✅ LIVE, playable, **full purchase flow tested end-to-end with real money and confirmed working**
**Version:** v10 — `app.js` now 1,000 lines (was 970 at start of session)

---

## 🎉 Headline: monetization is live

The Cloudflare Worker + Stripe backend that's been "scaffolded but not built" since Session 1 is now fully deployed, tested with a real live-mode purchase, and working. This was the single biggest outstanding item on the project and it's done.

---

## What happened this session, in order

### 1. Diagnosed and fixed a critical live bug: puzzles wouldn't load at all
Symptom: app loaded fine, but got stuck forever on "LOADING YOUR PUZZLE…" — confirmed via Chrome DevTools console showing:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'pop')
    at getFallback (app.js:539:19)
```

**Root cause (verified by pulling the actual live `app.js` from GitHub and running it in a Node sandbox, not just reading the code):** two separate `function shuffle(arr){...}` declarations existed in the same file — the newer one written for shuffle-bag rotation (returns a shuffled copy) and an older one used by the in-game "shuffle tiles" button (mutates in place, no return value). The later declaration in the file wins for every call site due to JS hoisting rules, so the rotation logic was silently calling the wrong function, getting `undefined` back, and crashing on `.pop()`.

**Fix:** renamed the copy-returning function to `shuffleArray`, updated its two call sites inside `getShuffleBag` and `getFallback`. Left the original `shuffle` (mutate-in-place) untouched, since the tile-shuffle button still needs it. Verified with an actual 20-puzzle simulation post-fix: no crash, correct no-repeat-until-exhausted rotation across two full bag cycles.

### 2. Recovered a broken local dev environment
GitHub Desktop had lost track of the local `Cult-Connections` folder — turned out OneDrive (which Scott was syncing `Documents\GitHub\` through) had silently corrupted/lost the folder. GitHub.com repo itself was never affected; only the local clone.

Resolved by removing the broken reference in GitHub Desktop and re-cloning to a clean, non-OneDrive path: **`C:\Dev\Cult-Connections`**. Confirmed working with all 5 files present and correctly synced as of this session's final deploy.

**Note:** this same risk still exists for `scvd-context` and any other repos still living under `Documents\GitHub\`. Worth cloning those to `C:\Dev\` too when there's a spare moment — not urgent, but the exact failure mode that nearly cost the ECEG `worker.js` file twice.

### 3. Built and deployed the full Cloudflare Worker payment backend from scratch
Full `worker.js` written and deployed to `cult-connections.emblen-scott.workers.dev`, handling:
- `POST /create-checkout` — creates a Stripe Checkout Session for one of the three tiers
- `POST /verify-token` — checks whether a purchase token is confirmed and unexpired
- `POST /webhook` — Stripe webhook handler, verifies signature, flips tokens from pending → paid

**Security design note:** each checkout generates a unique, single-purpose token *before* payment, stored as `pending` in Cloudflare KV. Only the Stripe webhook (source of truth) flips it to `paid`, with a real expiry based on tier. This was designed specifically to avoid ECEG's known bug where every buyer of a tier got an identical, shareable token — structurally impossible here since tokens are per-checkout-session, not per-tier.

**Infrastructure now live:**
- KV namespace `CC_TOKENS`, bound to the Worker
- Secrets: `STRIPE_SECRET_KEY` (live mode, `sk_live_...`), `STRIPE_WEBHOOK_SECRET`
- Plain var: `APP_URL`
- Stripe webhook endpoint registered, listening for `checkout.session.completed` only
- Three live Stripe Price IDs created and wired in:

| Tier | Price | Price ID |
|---|---|---|
| Square Eyes | $1.50 | `price_1TvbPKKyyW3v9aYU8rIFbzx3` |
| Couch Potato | $7.50 | `price_1TvbRDKyyW3v9aYUFHckF0pw` |
| Pop Culture Vulture | $10.00 | `price_1TvbS0KyyW3v9aYUkoev77zQ` |

Decision made to go straight to Stripe **live mode** rather than test mode first (deliberate choice, small dollar amounts, acceptable risk).

### 4. Ran a real end-to-end purchase test — found and fixed a genuine race condition
First live test: real $1.50 charge on Square Eyes succeeded, Stripe webhook delivered and returned 200 OK, but the app did **not** unlock. Diagnosed (not guessed) via:
- Stripe dashboard → Payments: confirmed charge succeeded
- Stripe dashboard → Webhooks → Event deliveries: confirmed 200 OK, delivered
- Cloudflare KV dashboard: found the token, confirmed `status: "paid"` with correct expiry

**Root cause:** the client only attempted `/verify-token` once, immediately on redirect. If Stripe's redirect back to the app landed even a second before the webhook finished flipping the token to `paid` in KV, that one attempt failed permanently — and the code stripped the token out of the URL regardless of success or failure, so there was no way to retry even by refreshing.

**Immediate recovery for the stuck purchase:** found the token manually in the Cloudflare KV dashboard, re-triggered redemption by revisiting `?cc_token=<token>` directly. Confirmed unlocked correctly (Square Eyes, expires 20/08/2026).

**Permanent fix:** `redeemToken()` now retries up to 5 times, 1.5 seconds apart (7.5s total window), and only strips the URL token once it has a final answer (success or genuine failure) rather than after the first attempt regardless of outcome.

### 5. Found and fixed a second bug the first fix had been silently working around
Retest via Incognito (new trial state) succeeded, but took two manual refreshes and no "confirming" message was ever visible — even though the retry logic was demonstrably working (5–8 second delay matched the retry window exactly).

**Root cause:** the toast system (`showMsg()` → `#msgArea`) only exists inside `#gameScreen`, which is hidden via CSS unless you're actively mid-puzzle. Every purchase-flow message — the "Confirming your payment…" toast, the eventual unlock toast, even the original "Unlock failed" message from bug #4 — was firing into an invisible DOM element the whole time. The end state (access banner) did correctly update once redemption succeeded; only the *transient* feedback was invisible.

**Fix:** switched all purchase-flow messaging to `showGruberToast()`, which appends directly to `document.body` and is visible regardless of active screen. Also changed it to re-display on every retry attempt (not just the first) so it stays visible continuously through the whole confirmation window instead of disappearing after 1.5 seconds.

### 6. New content: Kath & Kim puzzle added, fully source-verified
New puzzle **"LOOK AT MOIYE"** added to the `scott` bank (now 9 puzzles, up from 8). Every item checked against real sources (Wikiquote, Wikipedia, TV Tonight's Aussie catchphrase poll, IMDb) before shipping — one item ("Mandy Patinkin" as a sarcastic nickname Kath uses for a neighbour) couldn't be independently verified online and was accepted on Scott's direct show knowledge, same precedent as the Session 2 Jack Butler / Slash corrections.

| Category | Items |
|---|---|
| Kath & Kim'isms | FOXY MORON · CONNUBIALS · PACIFICALLY ENTAILS · HUNK OF SPUNK |
| Fountain Lakes Ensemble | PRUE AND TRUDE · GARY POOLE · THE BOLTON SISTERS · MANDY PATINKIN |
| Running Catchphrases | LOOK AT MOIYE · NOICE DIFFERENT UNUSUAL · STUNNED MULLET · EFFLUENT |
| What They Call Themselves | STUPID GIRL · HORN BAG · HIGH MAINTENANCE · SECOND BEST FRIEND |

---

## Content backlog — updated

Carried over from Session 2, still not built as real puzzles: Viral Challenges & Crazes, Famous Internet Catchphrases, Viral Animal Stars, Disney, Pixar, Action Movie Stars, Disney Princesses, US Presidents (historical only), Men Who Walked on the Moon, Movies by decade.

**New this session:**
- **Second Kath & Kim puzzle** — Cujo and Epponee-Rae confirmed as legitimate content (both were added to the show's actual title sequence from Series 3 onward, credited alongside the five main cast). Needs 2 more items to complete that category, plus 3 more categories for a full puzzle.

---

## 🧹 Known content issue (not urgent, flagged for next cleanup pass)

The **"ROBERT JOHNSON SONGS"** category (CROSS ROAD BLUES / SWEET HOME CHICAGO / LOVE IN VAIN / HELLHOUND ON MY TRAIL) exists as an exact duplicate across two different puzzles — "BLUES, FILM & STRINGS" and "GUITAR HEROES & THE BLUES" — same label, same four items. Looks like a copy-paste leftover from whenever Guitar Heroes was built. Doesn't break anything functionally, but two different puzzles can show the player an identical category. Worth deduplicating in a future content pass.

(The `NEO` appearing in both "Keanu Reeves Film Roles" and "Matrix Characters," and `SLASH` appearing in three separate puzzles, are both legitimate — different puzzles referencing the same real fact, not accidental duplication.)

---

## 🏗️ Infrastructure state (all current as of this session)

| Item | Status |
|---|---|
| Local dev clone | `C:\Dev\Cult-Connections` — clean, outside OneDrive |
| `scvd-context` local clone | ⚠️ Still under `Documents\GitHub\` — same OneDrive risk, not yet moved |
| Cloudflare Worker | Deployed, live, all bindings/secrets set |
| Stripe | Live mode, 3 Price IDs active, webhook registered and confirmed working |
| Shuffle-bag rotation | Fixed and verified working across multiple bag cycles |
| Purchase → unlock flow | Fixed and verified working end-to-end with real payment |

---

## Known Limitations (carried forward + updated)

| Issue | Notes |
|-------|-------|
| Trial clock is client-side only | Resettable by clearing site data/reinstalling — acceptable at current stage |
| Robert Johnson Songs category duplicated | See cleanup note above — not urgent |
| `scvd-context` still under OneDrive-synced path | Same corruption risk as Cult-Connections had — should be moved to `C:\Dev\` |
| Sport/Fashion/movie/viral/Disney/Pixar/Presidents/Moonwalkers content | All still backlog ideas, not built as playable puzzles |
| Second Kath & Kim puzzle | Cujo/Epponee-Rae confirmed as content, needs more items + categories to complete |

---

## Open Actions (priority order for next session)

| # | Task |
|---|------|
| 1 | Move `scvd-context` local clone to `C:\Dev\scvd-context`, same reasoning as Cult-Connections |
| 2 | Deduplicate the Robert Johnson Songs category across the two puzzles that share it |
| 3 | Build out the second Kath & Kim puzzle around Cujo/Epponee-Rae — needs 2 more ensemble items + 3 more categories |
| 4 | Continue converting backlog content — Moonwalkers still the most ready (fully sourced, perfectly bounded at 12 people / 3 puzzle variations) |
| 5 | Get Steve (Ireland) testing for UK/Ireland cultural fit — app has now been stable through a full live-payment cycle |
| 6 | Consider a small monitoring habit — periodically check Cloudflare Worker logs / Stripe webhook delivery history, since this is now real infrastructure handling real money |

---

## 🏗️ Infrastructure note (carried forward, still true)

The original `Cult-Connections` GitHub repo was deleted and rebuilt from scratch during Session 1 due to an unrecoverable stuck GitHub Pages deployment lock. The current repo has clean history starting from that rebuild. `scvd-context/cult-connections/` remains the durable source of truth for all files — this handoff should be pushed there to close out the session.
