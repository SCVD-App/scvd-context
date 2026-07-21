# Easy Come Easy Go — Session Handoff
**Date:** 3 July 2026
**Session:** Payment integrity fixes, Cloudflare Worker recovery, Murray Cresswell + Tycoon bug fixes, Family & Friends system, Mum & Dad arc, Good Deeds scorecard
**Status:** Stripe checkout confirmed working end-to-end on `eceg-proxy` (sandbox). Extensive `index.html` changes built and validated this session — **confirm these are committed/pushed before next session**, this handoff doesn't assert that on your behalf.
**Version:** v1.3

---

## 🚨 Next Session Priority List

| # | Task | Priority |
|---|------|----------|
| 1 | Delete the stray `eceg` Worker (confirmed unused, see Infrastructure section) | ⚡ DO FIRST |
| 2 | Flip ECEG Stripe to live keys once sandbox testing is fully done | 🔧 Next |
| 3 | Playtest the Family & Friends pressure system — tune the +3/-1 pressure math if it feels off | 🔧 Next |
| 4 | Playtest Mum & Dad arc — confirm emotional pacing against the vulture content | 🔧 Next |
| 5 | Decide on bearer-token sharing fix (see Known Issues — deferred, likely folds into domain-level SSO) | 🟡 Soon |
| 6 | Greg finale — buys the used car dealership, shuts Greg out again | 🟡 Soon |
| 7 | KP coin flip game, Texan moment, Murray escalation (state MP → federal → white collar prison ending) | 🟡 Soon |
| 8 | Vegas arc — Road to Ruin, Elvis wedding, Cinnamon | 🟡 Soon |
| 9 | Domain-level auth / magic link SSO across SCVD apps | 🟡 Soon |
| 10 | Save `worker.js` somewhere durable outside Cloudflare's editor — this is the second time it's nearly been lost | ⚡ DO FIRST |

---

## ✅ Session Completed

### Inbox / UX
| Item | Status |
|------|--------|
| Archived inbox messages made clickable/expandable (previously preview-only, no body, no CTA) | ✅ Done |
| Greg's manure-cleanup follow-up message rebuilt as Steve's business-buyout hook instead (references the manure drop directly: *"Mate how did you know things had gone to poop..."*) | ✅ Done |

### Payment integrity
| Item | Status |
|------|--------|
| Fixed exploit: notification-based deals (Paulson, KP, general pool) floored cash at $0 instead of allowing negative — meant any deal could be accepted "for free" regardless of cash on hand | ✅ Done |
| Cash can now legitimately go negative from notification-based deals; HUD shows real (possibly negative) figure, turns amber and pulses when negative | ✅ Done |
| Paulson's negative-balance moments now include in-character "good debt vs bad debt" coaching (line of credit, "the bank works for you now") | ✅ Done |
| Fixed `AnimatedNumber` to render negative values correctly (`-$500,000` not `$-500,000`) | ✅ Done |

### Cloudflare Worker recovery (see Infrastructure section below for full story)
| Item | Status |
|------|--------|
| Diagnosed `checkout failed` error — surfaced actual worker error message client-side instead of generic text | ✅ Done |
| Discovered TWO Cloudflare Workers exist: `eceg` (unused, dead-end) and `eceg-proxy` (the real one, called by the live app) | ✅ Done |
| Recovered original `worker.js` from a local downloads-folder backup | ✅ Done |
| Fixed token-generation bug: tokens were deterministic (`tier`+`days` only), meaning every buyer of the same tier got an identical, shareable token, and KV records silently overwrote each other cross-customer | ✅ Done |
| Fix: added a random nonce into the signed token payload — every purchase now gets a unique token and its own KV record | ✅ Done |
| Corrected `worker.js` deployed to `eceg-proxy` | ✅ Done |
| All 7 secrets re-added to `eceg-proxy` (had gone missing — Version History shows they were added 3 days ago but the live version's Bindings tab showed only `ECEG_KV`; likely explanation is a rollback to a pre-secrets version, not a Cloudflare-side incident) | ✅ Done |
| `HMAC_SECRET` regenerated fresh (old one wasn't saved) | ✅ Done |
| Correct Stripe Price ID sourced from Product Catalogue (was initially about to use a Product ID `prod_...` by mistake — caught before deploying) | ✅ Done |
| End-to-end test purchase confirmed working: Stripe checkout → payment → webhook → token email → activation in-app | ✅ Done |

### Game logic fixes
| Item | Status |
|------|--------|
| Fixed Murray Cresswell arc: water/precinct/port contracts could each be accepted infinitely (off-by-one gating meant a contract's offer never locked after being signed) — was stacking passive income unrealistically | ✅ Done |
| Fixed "Go all the way — Aim for $100M Tycoon" button appearing dead — a win-condition check was re-firing on the same transition and bouncing players straight back to the City Mogul screen | ✅ Done |

### New content — Family & Friends system
| Item | Status |
|------|--------|
| Existing "Family & Social" notification pool (Mum, Uncle Barry, Cousin Damo, Old school mate, Sister, Dad, Work colleague) tagged by `circle: "family"` / `circle: "friend"` | ✅ Done |
| Gossip-pressure propagation system: accepting a request raises same-circle pressure (weights that circle's notifications up to 4x more likely to fire); declining raises the *other* circle's pressure (word gets around) | ✅ Done |
| Pressure capped at 9, decays by 1 every game-week so it can't lock at maximum permanently | ✅ Done |
| Two new pressure-gated escalation characters: **Uncle Ray** (will-chaser, unlocks at family pressure ≥3) and **Robbo** (dodgy investment pitch, unlocks at friend pressure ≥3) | ✅ Done |
| New root-menu entry **"📵 Everyone wants a piece"** — lets the player proactively resolve any currently-available family/friend request instead of only waiting for random pop-ups (fills the week 2–4 lull between hitting initial target and Paulson/Murray opportunities appearing) | ✅ Done |
| Rebranded **"🎁 Be generous"** → **"💼 Minimise the tax bill"** — same content (family gifts, parents' mortgage, charity foundation, mate's house), reframed as smart wealth structuring rather than altruism, so aggressive-playstyle players don't skip it on principle | ✅ Done |
| Added **"🕊️ Fund anti-pigeon spikes for every statue downtown"** ($210k) as a witty low-stakes civic vanity project in the tax menu | ✅ Done |

### New content — Mum & Dad arc
| Item | Status |
|------|--------|
| Guaranteed trigger, day 2 (deliberately same beat as Greg's first text — contrast between being chased for a shift and genuine, no-strings congratulations) | ✅ Done |
| Mum & Dad are the only characters in the game who don't want anything and don't advise how the money should be spent — just relief and an open door | ✅ Done |
| Three-way response choice: (1) "Thanks Mum and Dad" — free, get on with your day; (2) send a hamper with flowers — $350; (3) "Do something nice" → sub-menu: Mercedes for Mum ($95k) / Harley for Dad ($35k) / both ($130k) | ✅ Done |
| All outcomes logged to `gameState.givens` and legacy score | ✅ Done |

### New content — scorecard
| Item | Status |
|------|--------|
| **Good Deeds** section added to end-game scorecard, parallel to Assets Acquired, green-tinted, pulls from `gameState.givens` | ✅ Done |
| Only renders if the player actually gave something — no empty box | ✅ Done |

---

## 🏗️ Infrastructure — Cloudflare Worker situation (important, read before next session)

There are **two separate Cloudflare Workers** on this account:

| Worker | Status | Notes |
|--------|--------|-------|
| `eceg-proxy` | ✅ **The real one.** `index.html`'s `WORKER_URL` points here. This is what the live app actually calls. | Now has the corrected `worker.js` (nonce fix) and all 7 secrets. Confirmed working end-to-end. |
| `eceg` | ❌ Dead end. Not called by the app anywhere. Got worked on by mistake early in this session before the mix-up was caught. | **Safe to delete** — do this once you're confident `eceg-proxy` is fully solid. Deleting it does not touch `ECEG_KV` (KV namespaces are independent of the Workers that bind them). |

**How the confusion happened:** the "Hello World" boilerplate discovered early in the session was actually deployed to `eceg`, not `eceg-proxy`. Time was spent rebuilding a worker from scratch against `eceg` before the mismatch was caught by checking the actual deployed URL against `WORKER_URL` in `index.html`. The real original `worker.js` was still intact on `eceg-proxy` the whole time — it just had its secrets missing (see below) and a pre-existing token-collision bug.

**Why the secrets vanished from `eceg-proxy`:** unconfirmed, but the most likely explanation given Cloudflare's per-version binding model — a rollback to an earlier deployed version (one from before secrets were added) would produce exactly this symptom: Version History shows the "Add secret" events happened, but the live version doesn't carry them. Not confirmed as the actual cause, just the most plausible mechanism.

**`worker.js` location:** per the existing rule, this file is never committed to the `Easy-Come-Easy-Go` GitHub repo. It currently lives only in the Cloudflare dashboard editor and (per this session) a local backup in `C:\Users\ampli\Downloads\EASY COME EASY GO\`. This is the second time in this file's life it's nearly been lost — worth a more durable backup location (a private gist, a separate non-public repo, anywhere outside a Downloads folder).

---

## App Overview

| Item | Detail |
|------|--------|
| Live URL | https://scvd-app.github.io/Easy-Come-Easy-Go/ |
| Repo | github.com/SCVD-App/Easy-Come-Easy-Go |
| Stack | Vanilla React 18 CDN, single-file `index.html`, no build tools |
| Worker (real) | `eceg-proxy.emblen-scott.workers.dev` |
| Worker (stray, pending deletion) | `eceg.<subdomain>.workers.dev` |
| KV | `ECEG_KV` |
| Stripe | Sandbox (test keys) — flip to live after full end-to-end retest |
| Email | noreply@scvd.app via Resend |

---

## Token System (as currently implemented on `eceg-proxy`)

Format: `eceg_[tier]_[days]_[nonce]_[hmac32]`

- `nonce` — random 8-byte hex string, unique per purchase (this session's fix)
- `hmac32` — HMAC-SHA256 signature over `eceg_[tier]_[days]_[nonce]`, truncated to 32 hex chars, using `HMAC_SECRET`
- Validated by recomputing the signature and checking presence/expiry in `ECEG_KV`
- Failure reasons returned: `invalid_token` (bad signature), `token_not_found` (well-formed but never issued), `expired`

**Known limitation (deferred, not fixed this session):** a token is still a bearer credential — nothing ties it to the original purchaser's device or identity beyond the email it was sent to. If shared (forwarded, screenshotted, leaked), it works for whoever holds it until expiry. The nonce fix solved the *cross-customer collision* bug (identical tokens per tier) but not sharing between individuals. Scott's plan: this likely gets addressed properly once domain-level SSO across SCVD apps is built, rather than patched piecemeal here.

---

## Game State — new fields this session

```javascript
familyPressure: 0, friendPressure: 0,       // gossip-propagation pressure per circle, 0-9, decays 1/week
familyAskCount: 0, friendAskCount: 0,       // lifetime count of accepted requests per circle
familyFriendSeen: [],                       // ids of resolved family/friend requests, excludes them from the clutter menu
```

`gameState.givens` (pre-existing field) now also receives: `"anti-pigeon statue spikes"`, `"mum's mercedes"`, `"dad's harley"`, `"mum and dad hamper"`.

---

## Known Issues / Watch List

| Issue | Notes |
|-------|-------|
| Bearer-token sharing | See Token System section above — deferred, likely folds into SSO work |
| Family/Friends pressure math untested in real play | +3 per accept/decline, -1/week decay, capped at 9 — numbers are a first pass, not tuned against actual playtesting |
| Stripe still on sandbox | Flip to live after a few more clean end-to-end tests |
| `eceg` Worker still exists | Safe to delete, not yet done as of this handoff |
| Wealth chart needs 2+ months of play to render | By design — carried over from previous handoff |
| KP arc only fires for Pro users after $5M | Intentional gating — carried over from previous handoff |

---

## File Locations

| File | Location |
|------|----------|
| `index.html` | SCVD-App/Easy-Come-Easy-Go repo root |
| `manifest.json` | repo root |
| `icon-192.png` / `icon-512.png` | repo root |
| `worker.js` | Cloudflare `eceg-proxy` editor + `C:\Users\ampli\Downloads\EASY COME EASY GO\` (never in GitHub repo — see Infrastructure section re: backup durability) |
| `wrangler.toml` | `C:\Users\ampli\Downloads\EASY COME EASY GO\` |

---

## Session History

| Session | Key Work |
|---------|----------|
| 1 (28 Jun 2026) | Full migration, scoring, tombstone, coin flip, passive glow, Fun Stuff, notification queue, inbox, Greg/Steve arc, politico fix, Tycoon fixes, HUD fix, share + invite |
| 2 (29 Jun 2026) | Stripe paywall, worker deployment, KV binding, Pro modal, global leaderboard, HUD two-row, home button fix, Fleming F65, Tycoon navigation, Your World tycoon assets, net worth history, wealth chart, Paulson milestones, KP arc, inbox redesign, splash screen |
| 3 (3 Jul 2026) | Inbox click fix, manure→Steve rework, negative-cash/good-debt system, Cloudflare Worker recovery (eceg vs eceg-proxy, token nonce fix, secrets restored), Murray Cresswell stacking fix, Tycoon button fix, Family & Friends pressure system, Mum & Dad arc, Good Deeds scorecard, pigeon statue gag |
