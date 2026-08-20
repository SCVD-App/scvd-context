# SCVD Portfolio — Help Desk Quick Reference

**Last updated:** 20 August 2026
**Purpose:** fast, accurate lookup when a customer says "I paid but don't have access."
Each app has a genuinely different recovery mechanism — don't assume one app's fix
applies to another. Verified against live worker code as of the date above; re-check
against actual deployed code if it's been a while, since this doc can drift out of date.

## At-a-glance

| App | Architecture | Customer self-recovery? | Support recovery |
|---|---|---|---|
| Mic Drop | HMAC token, emailed | Yes — re-enter token in-app | Resend email is the only path |
| Cult Connections | Pending/paid + expiry, NOT emailed | Yes, as of 20 Aug — manual token field | Pull token from Stripe Events log |
| Jumpin' Pin | Per-purchase UUID, activation cap, emailed | Yes — "Restore Purchase" by email | Trigger `/restore`, or pull from Stripe |
| Hnefatafl | Per-purchase UUID, activation cap, emailed | Yes — "Restore Purchase" by email | Trigger `/resend-token`, or pull from Stripe |
| ECEG | **Unknown — worker.js not recovered** | — | See "Blocked" section below |
| Two Ancient Classics (Ur, Nine Men's Morris) | **Unknown — worker.js not recovered** | — | See "Blocked" section below |

---

## Mic Drop

**How it works:** one HMAC token per plan/duration (`micdrop_[type]_[days]_[hmac]`),
verified by recomputing the HMAC server-side — no database lookup needed to check
validity, just KV to log the receipt. Lifetime tokens use the literal string `"forever"`
instead of a day count.

**Customer path:** token is emailed automatically via Resend right after payment. They
paste it into "Have a token? Enter it here" in-app.

**If they say they never got the email:**
- Check spam first (ask them, or check Resend's dashboard for delivery status)
- There's currently no in-app "resend" button — the only path back is finding the
  original token. Check Stripe → Transactions → the charge → Events →
  `checkout.session.completed` webhook fire → the email send happens in that same
  worker call, so if the webhook fired, the token was generated even if the email
  bounced. You'd need to reconstruct it manually via the worker's token logic, or
  ideally: **add a manual "resend" trigger to Mic Drop** — this doesn't exist yet and
  is a gap worth closing, same class of issue as Cult Connections had.

**Known risks:** none currently open (Spotify beta hidden, lifetime tier tested and
confirmed working 20 Aug).

---

## Cult Connections

**Full detail:** see `cult-connections-stuck-purchase-runbook.md` (separate file,
same repo). Condensed version:

**How it works:** token generated before payment, stored `"pending"`, flipped to
`"paid"` only when Stripe's webhook lands. No email at all — token only ever exists in
the post-checkout redirect URL.

**Self-heal (added 20 Aug):** `verify-token` now checks Stripe directly for any
`sessionId`-tagged pending record and self-heals without waiting on the webhook. Only
applies to purchases made after this fix — earlier tokens have no `sessionId` stored.

**Customer path:** normally automatic on redirect. If it fails, use the new
**"Already paid but not unlocked? Enter your token"** field on the Unlock screen.

**Support recovery:** Stripe → Transactions → the charge → Events →
`POST /v1/checkout/sessions` → `metadata.token` in the response body → give that to
the customer (or enter it yourself if reproducing).

**Known risk:** legacy tokens from before 20 Aug's fix may need manual KV editing —
see the dedicated runbook for exact steps.

---

## Jumpin' Pin

**How it works:** random UUID token per purchase, activation cap of 10 devices per
token, restore is deliberately email-gated — the token itself is never returned in
any API response, only ever emailed to the address that paid.

**Customer path:** in-app "Restore Purchase" → enter email → hits `/restore` →
worker looks up `jp_email:{email}` → emails the token if found. **Rate-limited to 1
request per email per 5 minutes** — if a customer says "I tried resending and nothing
happened," check whether they tried twice in a row and got silently rate-limited.

**Support recovery:**
- Confirm payment in Stripe first (Transactions tab)
- If restore email genuinely isn't arriving: check `jp_email:{their email}` exists in
  KV (Cloudflare dashboard) — if missing, the webhook likely never fired; check
  Stripe Events for `checkout.session.completed` on their specific charge
- If it exists in KV, check Resend's dashboard for delivery/bounce status

**Known risk:** `verify-token` here has the same "just wait for webhook, no self-heal"
gap as Cult Connections had before the 20 Aug fix. Hasn't caused a reported issue yet,
but the underlying race is real — a stuck restore-before-webhook-lands scenario is
possible in theory, worth patching same as Cult Connections eventually.

---

## Hnefatafl

**How it works:** near-identical pattern to Jumpin' Pin — per-purchase UUID,
10-device activation cap, email-gated restore via Resend.

**Customer path:** in-app restore flow hits `/resend-token` with their email → looks
up `email:{email}` in KV → emails the token. Also rate-limited, 1 per 5 minutes.
Response is deliberately vague either way (`"if-found-email-sent"`) — doesn't confirm
or deny an email has a purchase, so don't be alarmed if a lookup "succeeds" with no
visible confirmation either way; that's by design, not a bug.

**Support recovery:** same pattern as Jumpin' Pin — confirm the Stripe charge first,
then check `email:{their email}` in the Hnefatafl KV namespace for the token.

**Known risk:** `/check-status` also has no Stripe-direct self-heal — same class of
gap as Jumpin' Pin and pre-fix Cult Connections.

---

## Blocked — need source before an accurate doc can be written

**ECEG** and **Two Ancient Classics** (Royal Game of Ur, Nine Men's Morris) both have
their `index.html` in the context repo, but their `worker.js` was never captured — I
don't have their actual purchase/restore logic to verify against. Writing a support
doc from memory of "how it's probably built" is exactly the mistake that cost real
time on Cult Connections this morning — not repeating that here.

**Action needed:** pull the real `worker.js` for each from the Cloudflare dashboard
(same ask as the standing ECEG item) and I'll build accurate entries for both.

---

## General principles for any app not fully documented here

1. **Always check Stripe Transactions first** — confirm the charge actually
   succeeded before doing anything else. If it didn't succeed, this isn't an
   access-recovery issue at all.
2. **Never ask a customer to re-purchase** to fix an access issue — that's a double
   charge for one unlock.
3. **Check for an app-specific rate limit** before assuming "the resend is broken" —
   several of these apps intentionally throttle restore/resend requests.
4. **This document drifts** — if an app's worker.js changes, this doc needs a matching
   update. Treat "last updated" above as a trust signal, not a guarantee.
