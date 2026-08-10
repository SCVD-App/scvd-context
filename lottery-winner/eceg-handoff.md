# ECEG (Easy Come, Easy Go) — Handoff

**Status:** LIVE — real Stripe payments, listed on scvd.app
**Formerly:** Lottery Winner (renamed during/after a data crash mid-development; this is why no context-repo record existed until now)
**Repo:** SCVD-App/Easy-Come-Easy-Go
**Live:** https://scvd-app.github.io/Easy-Come-Easy-Go/
**Worker:** eceg-proxy.emblen-scott.workers.dev

---

## What this is

A windfall life-simulator — land a big win, then decide whether to invest it, blow it, or lose it to a loan shark and a political fixer with an agenda. Has a Murray Cresswell political-donation arc (see open item below) and a global leaderboard.

## Monetisation

Time-limited tiered access, not perpetual — closer to Mic Drop's model than Cult Connections' or Jumpin' Pin's:

| Tier | Price | Duration |
|---|---|---|
| Taster | $1.50 | 1 month |
| Savvy Investor | $7.50 | 6 months |
| The Tycoon | $10.00 | 12 months |

**Token scheme:** `eceg_[tier]_[days]_[nonce]_[hmac32]` — HMAC-signed like Mic Drop, but unlike Mic Drop each token includes an 8-byte random nonce, so every purchase gets a genuinely unique token (Mic Drop's tokens are identical across all buyers of the same plan). This means ECEG is a much better retrofit candidate for a per-token activation cap than Mic Drop is, if that's ever wanted — the Jumpin' Pin pattern would map on cleanly.

**Worker routes:** `/checkout`, `/webhook`, `/validate`, `/resend-token`, `GET+POST /leaderboard`

## This session — recovery and two fixes

Worker source was lost in the crash and had never been backed up to `scvd-context` (the Lottery Winner → ECEG rename meant it fell through the README's session-end archive step). Scott provided the live worker.js directly; scanned clean for hardcoded secrets (all via `env.X`) before being committed here.

Two hardening fixes applied to the recovered code, reviewed and approved before making them:

1. **`/resend-token` rate-limited** — 1 request per email per 5 minutes (`resend_rl:` KV key). Previously unlimited; a legitimate customer needs this at most a couple of times, so unlimited resends only added inbox-spam risk against paying customers.
2. **Webhook signature check now constant-time** — was a plain `===` comparison; now uses the same XOR-loop `timingSafeEqual` pattern as Mic Drop, Cult Connections, and Jumpin' Pin.

No other logic changed — tiers, token format, KV keys, email templates all exactly as recovered.

## Known open items (carried over, not addressed this session)

- **Murray Cresswell political-donation trigger**: fixed 4-second delayed notification firing on `hasMadePoliticalDonation` flipping true, gated once per game. ~48 of 50 playthroughs failed to trigger in testing — leading hypothesis is the early root-menu purchase path isn't actually setting the flag. Console.log diagnostic was the agreed next step, not yet done.
- No activation cap on tokens — a leaked/shared token works for anyone who has it, for the remainder of its day-window, on unlimited devices. Not fixed this session; flagged as a good retrofit candidate given the token is already unique per purchase.

## Secrets (Cloudflare dashboard only — never in this repo)

`STRIPE_SECRET_KEY`, `HMAC_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `STRIPE_PRICE_TASTER`, `STRIPE_PRICE_SAVVY`, `STRIPE_PRICE_TYCOON`
