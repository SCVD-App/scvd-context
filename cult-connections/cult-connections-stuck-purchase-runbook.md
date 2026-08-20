# Cult Connections — Stuck Purchase Recovery Runbook

**Last updated:** 20 August 2026
**Applies to:** Cult Connections only (token/expiry architecture — different from Mic Drop's HMAC token system)

## Root cause

Cult Connections generates a token *before* payment and stores it as `"pending"` in KV.
It only becomes `"paid"` when Stripe's webhook arrives and flips it. The client polls
`verify-token` up to 5 times, 1.5 seconds apart (~6 second ceiling) waiting for that flip.
If the webhook is slow, queued, or dropped, the client gives up and shows "Unlock failed"
— even though the payment genuinely succeeded on Stripe's side.

## The fix (deployed 20 Aug 2026)

Three changes, across all three of the app's files (`worker.js`, `app.js`, `index.html` —
this app is NOT a single-file build like Mic Drop, all three matter):

1. **Self-heal (`worker.js`)** — `verify-token` now checks Stripe directly for any
   `"pending"` record, using a `sessionId` stored on the record at checkout-creation time.
   If Stripe confirms `payment_status: "paid"`, the record self-heals to `"paid"` on the
   spot — no more waiting on the webhook at all in the common case.
2. **URL retention on failure (`app.js`)** — the `?cc_token=...` param is now only
   stripped from the URL on a *successful* redemption. A failed attempt leaves it in
   place so a plain refresh can retry.
3. **Manual token entry field (`index.html` + `app.js`)** — a new "Already paid but not
   unlocked? Enter your token" field on the Unlock Full Access screen, wired to the
   existing `redeemToken()` function. This didn't exist before — `redeemToken()` was
   previously only ever called automatically from the URL, with no manual fallback.

## Important caveat: legacy purchases

**Self-heal only works for purchases made *after* this fix was deployed.** Any pending
token created before the `sessionId` field existed has no session reference for self-heal
to check against, and must be recovered manually (see below). This should be a small,
finite list — not an ongoing pattern — since every purchase from here forward carries
`sessionId` from the moment checkout is created.

**Expectation going forward:** most future stuck-unlock cases should now resolve
automatically on the customer's *next* `verify-token` call (e.g. reopening the app, or
tapping the manual field even with no real need) — the self-heal check runs on every
attempt, not just the first. Manual recovery below should become rare, reserved for
genuine edge cases (Stripe API itself unreachable, webhook AND self-heal both failing).

## Manual recovery steps (legacy tokens, or self-heal edge cases)

1. **Confirm the payment actually succeeded.**
   Stripe Dashboard → Transactions → find the charge by amount/email.
   Status should read `Succeeded`.

2. **Find the token.**
   Click into the payment → **Events** tab → find the `POST /v1/checkout/sessions`
   log entry (near the bottom, it's the creation call) → expand it → read
   `metadata.token` from the response body. That's the token string.

3. **Redeem it.**
   Paste that token into the **"Already paid but not unlocked? Enter your token"**
   field on Cult Connections' Unlock Full Access screen (Solo/Family → purchase tiers
   screen). Should resolve on submit — self-heal runs on manual entry too, so even a
   still-`"pending"` record with a `sessionId` will heal itself right here if it hasn't
   already.

4. **If step 3 still fails** (only possible for pre-fix legacy tokens with no
   `sessionId`, or a genuine Stripe outage):
   - Cloudflare Dashboard → Workers → the Cult Connections KV namespace
   - Find the key `cc_token:{the token string}`
   - Manually edit the JSON value, set `"status": "paid"` and a correct `"expiry"`
     (use `null` for lifetime tier purchases, or an ISO date string for time-limited
     tiers — see `TIERS` in `worker.js` for day counts per tier)
   - Save. This directly grants access without going through Stripe again.

## What NOT to do

- Don't ask the customer to re-purchase — they'd be charged twice for one unlock.
- Don't manually edit KV as a first resort — steps 1–3 should resolve the large
  majority of cases without needing dashboard access at all.
