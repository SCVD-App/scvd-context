# ECEG Handoff — 20 July 2026 (v1.4)

**Session summary:** Full-day regression sweep and feature session. Fixed six confirmed bugs (three of them structural, spanning multiple arcs), built a new repeatable gambling mechanic with its own character, broadened the family-drift arc to apply universally, fixed a real invite-conversion bug, and shipped a reusable regression-check tool to catch this class of drift automatically going forward.

Supersedes `ECEG_Handoff_01-07-2026.md` (v1.2) and the `scvd-context` copy dated 3 July (v1.3). Archive both.

---

## Bugs fixed

### 1. Old business double-charge
The "Buy the old business — put Steve in charge" menu choice carried its own `cost: 2000000`, on top of the identical charge already applied inside the `buy_business` node it led to. Real cost was $4M charged in two steps, and the `hasBoughtBusiness` completion flag only ever set on the *second* charge — meaning a player short of the second $2M lost the first $2M for nothing, with the option reappearing indefinitely. Fixed by removing the cost from the outer menu choice; it's now a free navigation link, with the real (single) charge happening once inside `buy_biz_purchase`.

### 2. Archived inbox messages dead-ended
Messages that moved from the live notification queue into the archived inbox (Paulson, K.P., etc.) rendered via a separate, bare-bones code path with no body text and no click handler — nothing to tap, ever. Fixed by routing archived messages through the same `renderMessage` used for live ones, with tap-to-expand (▼/▲) added so the body is reachable without permanently showing it inline.

### 3. Murray Cresswell arc — Tycoon Dashboard render-priority bug
Accepting Murray's dinner invite correctly set `nodeKey` to `"politico_root"`, but the Tycoon Dashboard's render check (`tycoonMode && showTycoon`) sat *above* the `politico_` check in the same `if/else` chain — so tycoon-mode players could never actually reach the escalation screen; it just silently sat there unreachable behind the dashboard. Fixed with an escape-hatch pattern: `showTycoon` drops to `false` when the arc is accepted, and a generalized restore (keyed off `showTycoonRef`, not hardcoded node prefixes) brings the dashboard back whenever any narrative arc returns to `"root"` while in tycoon/billionaire mode. This same restore logic is what makes the Paulson favour arc (below) tycoon-mode-safe by default.

### 4. Political arc — repeatable purchases (contract / precinct / port)
All three tiers used range-based gates (e.g. `path < 2`) instead of exact single-shot checks. Since completing a tier caps `politicoPath` at a fixed value via `Math.max()`, the range stayed satisfied forever at that value, so the option never actually retired — confirmed in the wild as 5 duplicate "Govt Water Contract" entries in one playthrough. Tightened to exact checks: contract only at `path < 1`, precinct only at `path < 2 && path >= 1`, port only at `path < 3 && path >= 2`.

### 5. Political arc — silent double-counted passive income
Each tier's intro choice (Sign Up / Acquire / Accept) already applied the correct `passiveAdd`. The outcome node it led to carried the *identical* `passiveAdd` again at the node level, and `handleChoice` sums `choice.passiveAdd + node.passiveAdd` whenever that node's own "What's next?" is clicked — so every completion silently doubled its payout, invisible in the asset list (which just echoes the stored record) but very real in the top-line passive total. Removed the duplicate from all three outcome nodes. Also stripped a dead, never-read duplicate `cost: 5800000` sitting on the precinct outcome node.

### 6. City Mogul screen — bounce-back loop on "Go all the way"
The win-condition effect re-checks `passiveIncome >= MOGUL_PASSIVE_TARGET` on every render where `tierScreen === "tycoon_chase"`, with no memory of whether the player had already seen and dismissed that milestone. Choosing "Go all the way" advanced the screen for one render cycle before the same effect immediately reverted it, since passive income never stopped satisfying the original trigger. Fixed with a `mogulAcknowledged` flag set the moment the player chooses to keep going; the passive-income check now only fires the Mogul screen if that flag isn't already true.

### 7. Good Deeds missing from Game Report (confirmed regression, not a gap)
`gs.givens` was tracking correctly the whole time (parents' mortgage, family gifts — it's what powers the in-game "❤️ Gave:" line), but `buildScorecard` never read it into the end-of-game report, and `ScorecardModal` had no section to render it. **Confirmed via an old screenshot this was actually working live as of 9 July** — this is a genuine regression, not a "documented but never shipped" gap like #2. Recommend running `git log -S"Good Deeds" --oneline -- index.html` to find the exact commit that dropped it, since whatever caused that may have taken other things with it. Fixed going forward: `entry.givens` now captured into the scorecard, new "Good Deeds" section renders under Assets Acquired.

### 8. Invite button silently dropping the link
The "Share + Invite" button bundled `text` (containing the app link) together with an image `file` in one `navigator.share()` call. Many share targets — SMS/Messages especially — silently drop the `text` field whenever a file is attached, forwarding only the image. Confirmed in the wild: a real invite sent to a real person arrived as a picture with no link. Split into two separate buttons: **🖼️ Share Card** (image only, no text bundled) and **✉️ Invite a Friend** (text + link only, no file attached, so nothing can eat it). Checked the two other `navigator.share` call sites in the file (game-over screens) — both already text-only, unaffected.

---

## New features

### Paulson's personal favour — clean alternative route to billionaire mode
Gated on `paulsonContact >= 3` (fires only after the $3M co-investment deal has already closed, so the personal ask lands once real trust exists, not on first contact). Richard calls about his daughter-in-law Priya's trade-finance settlement platform — a genuine personal favour, out of character for him, with a promise to personally cover any loss. $5M commitment, resolves 3 months later (tracked off `netWorthHistory` month snapshots) with an $18M lump sum + $240k/month passive, flips `billionaireMode` true. Legacy score +25 across the arc, deliberately mirroring Murray's -20 to -45 — clean money, patient, costs trust rather than principle. Designed to run independently alongside Murray's arc, not mutually exclusive — both dirty and clean routes to the top can be active in the same playthrough.

### Baz's Trading Desk — repeatable gamble, small-business-to-Tycoon bridge
New character (Baz Kalinowski, fast-talking, contrasts hard with Paulson's caution), permanently available from the Invest menu. Three buy-in tiers ($250k / $1M / $5M), each session splits the stake three ways and runs three independent trades. Payout math simulated via Monte Carlo before shipping: **≈-6% average return, 6.4% chance of total wipeout, tail upside to 7-8x on a good run** — a real gamble, not a reliable strategy. (First draft of the payout math was wrong — ran the full stake independently three times instead of splitting it, which tripled the effective EV into a guaranteed money-printer. Caught and fixed before shipping via direct simulation of the shipped functions.)

### Family drift — now universal, not KP-empire-only
Previously hard-gated to `kpPath === "empire"` — only players who chose that specific antagonist storyline ever heard from Mum. Tier 1 now fires at week 3 for every playstyle (added to the weekly clock tick, since the old monthly-snapshot block only evaluates on 4-week boundaries and would never land on week 3). Tiers 2 (month 6) and 3 (month 12) had the KP-path gate stripped entirely.

### Bank / Finance broker — direct access
`FinanceModal` already fully supported NatBank borrowing, repayment, and Vido the Butcher's lending tiers — it just never had a front door, only ever opening as a side effect of a blocked purchase. Added a standalone menu item in the main root menu and a dedicated button in the Tycoon Dashboard, both opening the modal directly.

### Splash screen — now shows for everyone, every time
Was silently skipped for any player with a saved Pro status in `localStorage` (`!loadProStatus()` gating `showSplash`'s initial state), on the apparent theory that returning paying players don't need the pitch repeated. No rationale was documented in code. Since the splash doesn't ask for money and reinforces the no-ads/no-auto-renewal messaging, changed to always show — `useState(true)` regardless of Pro status.

---

## Tooling

### scvd-check.js — regression guard
Dependency-free Node script, app-agnostic. Checks a deployed file against a manifest of known-good markers — exact strings that should (`marker`) or shouldn't (`mustNotContain`) exist. Supports `--history` to shell out to `git log -S` per failure, pinpointing which commit dropped a given fix. `eceg-manifest.json` seeded with all 8 fixes above (18 checks total, including proper absence-checks for the three double-passive-add fixes, so a future edit that reintroduces `passiveAdd: 42000` etc. on those outcome nodes would be caught automatically rather than found in play).

Suggested location: `scvd-check.js` + `README-scvd-check.md` in `scvd-context` root (reusable across all SCVD apps), `eceg-manifest.json` in `lottery-winner/` alongside this handoff.

```bash
node ../scvd-check.js index.html eceg-manifest.json
```

---

## Known gaps / recommended next steps

- **KP's $1M Blackjack invite** — not built. `BlackjackGame` already exists as a fully working component, currently wired to random low-stakes encounters (`gamble_0b`, `gamble_1`, `gamble_2b`) capped at $500k bets, one hand per call. Extending it to a deliberate high-stakes 3-hand KP-specific session is mostly config (configurable bet tier + a hand counter), not new engine work — cheap follow-up whenever there's an appetite for KP's voice on the felt.
- **Handoff/reality drift audit** — three separate instances now confirmed this session and last (archived messages, Good Deeds, and the earlier Worker/secrets recovery from the 3 July handoff) where a "✅ Done" item didn't match the live file. Worth a dedicated session running `git log -S` against every item in the v1.3 handoff to find what else may have quietly regressed.
- **Generic small-business investments** (café, laundromat, storage, trade) confirmed intentionally repeatable — no ownership gating, by design, per direct confirmation. Not a bug; leave as-is.
- **Mic Drop** — separate regression issues flagged, to be picked up in a fresh chat with its own handoff/manifest.
