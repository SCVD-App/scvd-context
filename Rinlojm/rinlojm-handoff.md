# rinlojM — Handoff

## What it is
Cross-portfolio admin grant tool. Lets Scott mint free/comp access (Pro tokens,
lifetime unlocks, etc.) across multiple SCVD apps from one place — his phone,
primarily — without needing to remember each app's own admin credentials or
call each app's admin API directly. Built as a real support/recovery tool
after two separate incidents this session (a Mic Drop admin-token bug, and a
Cult Connections token-delivery gap) both needed a manual "just give this
person access" fix with no clean way to do it.

## Architecture
- **Single Cloudflare Worker** — serves both the frontend (embedded HTML/JS
  string in the worker file) and the API. No GitHub Pages, no separate
  frontend repo — deliberate. The tool can mint free lifetime access to every
  paid app in the portfolio, so it shouldn't sit on public, discoverable
  infrastructure. One obscure `*.workers.dev` URL, bookmarked on-device, is
  the entire distribution model.
- **Two independent gates, both checked server-side, never client-side only:**
  1. A 4-digit PIN — fast, low-friction, gates even seeing the app list.
  2. A long secret phrase — the real authorization gate, required again at
     the actual grant step (not just cached from the unlock step), so a
     client-side "already unlocked" flag can never be trusted for the
     action that actually mints access.
- **Rate limiting** on both PIN and phrase: 5 failed attempts locks out for
  10 minutes, tracked in KV by IP. A 4-digit PIN especially needs this —
  only 10,000 combinations, trivially brute-forceable unthrottled.
- **Per-app adapter pattern** — one `APPS` config object maps each app to
  its own tier list and its own `grant()` function, which knows how to call
  that specific app's actual admin endpoint. Adding a new app means adding
  one entry here; nothing else in the tool changes.
- **Audit log** — every successful grant writes an append-only record (app,
  tier, email, IP, timestamp) to KV. Same principle as the Chasin' Curves
  points ledger: if anyone's ever asked "why does this person have free
  access," there's a real answer.

## Setup required in Cloudflare (rinlojM's own Worker)
- KV namespace bound to the Worker — **variable name must be exactly
  `RINLOJM`** (not `RINLOJM_KV` — this was the cause of the first major
  bug this session; the KV *namespace resource* can be named whatever you
  like, e.g. `RINLOJM_KV`, but the *binding's variable name* is a separate
  field and is what the code actually reads via `env.<name>`).
- Secret: `RINLOJM_PIN` — the 4-digit PIN.
- Secret: `RINLOJM_PHRASE` — the real gate. **Avoid symbol characters as the
  very first or last character** — see Known Quirks below.
- Secret: `MICDROP_ADMIN_KEY` — must be an exact copy of Mic Drop's own
  `MICDROP_TOKEN_SECRET` value (Mic Drop reuses that one secret as both its
  token-signing key and its admin password — there is no separate admin key
  to copy).
- Secret: `CC_ADMIN_KEY` — exact copy of Cult Connections' `ADMIN_KEY`.
- Var: `MICDROP_URL` — Mic Drop's real Worker URL. **Not yet added as of
  this handoff — blocking.**
- Var: `CC_URL` — Cult Connections' real Worker URL. **Not yet added as of
  this handoff — blocking.**

## Endpoints
- `GET /` — serves the frontend (bare UI, no labels/instructions by design —
  Scott knows what it does, and zero on-screen guidance is intentional
  obscurity, not an oversight).
- `POST /api/unlock-pin` — checks PIN, rate-limited, returns the app list on
  success (names only — no tier/grant details until the phrase is entered).
- `POST /api/unlock-phrase` — checks phrase against a chosen app, rate-limited
  independently of the PIN, returns that app's tier list on success.
- `POST /api/grant` — re-verifies the phrase (never trusts a prior "unlocked"
  state), dispatches to the matching app's adapter, logs the grant.

## Per-app support (v1)
- **Mic Drop** — calls `/admin/generate-token`. Does **not** email the
  token — Mic Drop's admin endpoint has no email step, so rinlojM returns
  the token directly on-screen and Scott has to relay it to the recipient
  himself.
- **Cult Connections** — calls `/admin/grant`. **Does** email the token
  automatically (Resend), since that endpoint was built with delivery baked
  in from the start.
- **Wardens of Luminara** — not yet added. No adapter exists because its own
  Stripe integration isn't finished yet — nothing to grant against. Add once
  that's live.

## Known quirks / lessons learned this session
- **KV binding variable name ≠ KV namespace display name.** These are two
  separate fields in Cloudflare's UI and it's easy to only check one of
  them. Always confirm the actual bound variable name in the Bindings tab
  matches exactly what the code references.
- **Cloudflare secrets are write-only** — no way to view a saved value
  after the fact, ever, for any app. If a secret's value is ever in doubt,
  the only real fix is deleting and re-adding it (which is safe for a
  standalone admin key, but genuinely risky for something like Mic Drop's
  `MICDROP_TOKEN_SECRET`, which also signs every already-issued customer
  token — rotating that would silently invalidate every live Pro token at
  once).
- **A secret value ending in a symbol character (confirmed: trailing `!`)
  appears to silently fail to save in Cloudflare's dashboard.** Result was
  not a shorter/truncated value — it was a completely empty one, with the
  dashboard still showing "Value encrypted" as if nothing were wrong. No
  error shown anywhere. Root cause inside Cloudflare's own save path isn't
  visible from here, but the fix that worked was simply choosing a phrase
  where the first and last characters are alphanumeric. Costs nothing in
  actual strength (position doesn't affect guessability), just avoids
  whatever this specific edge case is.
- **The diagnostic technique that actually found it, worth reusing:** when
  a secret-comparison silently fails with no way to inspect either side,
  add a temporary response field reporting only `sentLength`,
  `storedLength`, and the index of the first character where they diverge —
  never the actual characters. Confirms mismatch shape (different lengths?
  same length, different content?) without ever risking exposure of the
  secret itself. Remove once resolved — this was added and removed once
  already this session.
- Client-side `autocomplete="off"` and letting a password manager
  autofill/biometric-gate a field are in direct tension — pick one
  intentionally rather than defaulting to "off" for typo-prevention and
  accidentally losing the autofill convenience too.

## Outstanding / next steps
1. Add `MICDROP_URL` and `CC_URL` vars — blocking, the grant flow cannot
   complete without them even though the PIN/phrase gates now work.
2. Run one real end-to-end grant for each app once those vars are in, to
   confirm the adapters themselves work, not just the gates.
3. Add the Wardens of Luminara adapter once its own Stripe/admin-grant
   endpoint exists.
4. Optional, no urgency: if a longer `RINLOJM_PHRASE` is wanted later than
   the current 15 characters, test incrementally (e.g. 30, then 45) rather
   than jumping straight back to a long value, so any future save failure
   is easier to isolate.
5. Discussed but not started: true WebAuthn/passkey biometric auth as a
   replacement for the phrase step entirely — a legitimate future upgrade,
   scoped as its own project, not a quick add.

## Current status
PIN and phrase gates are confirmed working end-to-end (verified via
Network-tab inspection during this session). Grant flow is built but
**untested** pending the two missing URL vars above.
