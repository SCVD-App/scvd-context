# Mic Drop — Project Handoff

**Session:** 14
**Date:** 21 July 2026
**Status:** LIVE — landscape driving mode shipped and field-tested, cosmetic skins system shipped
**Version:** v2.1 (unchanged — no worker changes this session)
**Worker:** micdrop (Cloudflare) — v5, unchanged this session (the `/coaching` prompt fix from Session 13 is still owed)

---

## 🚨 Next Session Priority List

| # | Task | Priority |
|---|------|----------|
| 1 | **"Get the Party Started" multiplayer mode** — see new section below. Scoped, not built. | 🟠 P2 — high strategic value, real backend lift |
| 2 | **Cream/off-white skin** — Adrienne's suggestion, deliberately parked this session. See "Why parked" below. | 🟠 P2 |
| 3 | Fix worker's `/coaching` prompt (no Markdown, plain prose, 2 sentences max) | 🟠 P2 — carried over from Session 13, still not touched |
| 4 | Landscape mode not yet extended to modals (Onboarding, Profile, About, Dressing Room, Session Report, Voice ID, debug overlay) — portrait-only by design, revisit if it proves painful in practice | 🟡 P3 |
| 5 | Skins not yet extended to modals either — same scope cut as above, same reasoning | 🟡 P3 |
| 6 | PWA/home-screen audio silence bug (iOS, from Session 12) | 🟡 P3 — not touched this session |
| 7 | ROOM/VOX adaptive gate (ambient scoring problem) | 🟡 P3 — not touched this session |
| 8 | Al — mic insensitivity ("mouth right up against phone") | 🔴 Open, not touched this session |

---

## ✅ Session 14 Completed

### 1. Landscape driving mode — built, tested across 3 real devices, shipped
Field-driven need: the Jaguar's vent mount can only hold the phone landscape, and the app had zero orientation handling at all (flagged Session 12, actioned this session).

- **`manifest.json` fix, found first:** `"orientation": "portrait"` was silently locking rotation for the installed PWA regardless of device rotation settings — changed to `"any"`. This turned out to be layered under a separate Chrome Service Worker/Cache Storage staleness issue (confirmed via Incognito test) that needed a site-specific "Clear & reset," not a general cache clear.
- **New `LandscapeSession` component** — compact two-column-plus-rail layout for the core driving screen (track ID, pitch feedback, mixer, arm/identify). Reuses the existing `LEDMeter`/`Fader`/`PitchIndicator`/`CountdownDisplay` components rather than duplicating logic.
- **Full-height vertical ARM/DISARM rail**, `writing-mode: vertical-rl` for the label. Position went through two iterations based on real mount photos: originally placed left-edge on a centre-mount assumption, **moved to the right edge** once a photo of the actual Jaguar mount showed the phone sits hard against the instrument cluster — the right edge is the one actually closest to a RHD driver's reaching hand.
- **Mixer sized to actual measured `window.innerHeight`**, not a fixed guess — `LEDMeter`/`Fader` both take an optional `heightPx` override, LED height/gap derive dynamically so bars always fill the given height cleanly. Floored at 90px, capped at 276px. Fixed a real overflow bug found via Nokia screenshots (page was taller than viewport, requiring scroll — confirmed by the two screenshots showing different content at the same timestamp).
- `#root`'s portrait-only `max-width: 420px` was silently capping the landscape layout too — added a matching `@media (orientation: landscape) and (max-height: 520px)` override.
- Track info text roughly doubled in size per field feedback once the height-fit issue was resolved.
- **Deliberately out of scope:** Support/About/Backstage/Invite/Voice ID/token entry stay portrait-only. Rotate back to reach them.

**Confirmed working in the actual Jaguar, at the actual mount position, day and heading toward night use.**

### 2. Distortion bug (Session 13) — CLOSED
The Jaguar was the one vehicle from Session 13's device-matrix testing still unconfirmed against the `getBuiltInMicStream()` fix (Adrienne had the only known-working spare key at the time). Confirmed clean in the Jaguar this session — that closes out the full test matrix (Klipsch, Z4, Jaguar) with no reproduction anywhere. Bug terminated.

### 3. Cosmetic skins — theme system + 2 skins shipped, gated to Pro
Additive architecture, not a destructive rewrite: `SKINS` object with `default` (reproduces the exact previously-hardcoded values), plus a `withAlpha(hex, alpha)` helper so tinted panel/border colors derive from one source instead of being hand-typed `rgba()` triples scattered through the file.

- **Scoped to the main portrait screen + landscape mode** (they share `PitchIndicator`/`Fader`, so theming those once covers both). Modals, Session Report, Voice ID, debug overlay stay default black/gold regardless of skin — same scope-cut reasoning as landscape mode, flagged explicitly rather than silently left half-done.
- **Alpinist** — deep forest green, warm gold, inspired by Scott's Seiko Alpinist. Went through 2 iterations: first pass read too bright/kelly-green on the real device; darkened canvas/panel significantly (`#07130f`/`#0e2019`) to match the watch dial's near-black sunburst falloff.
- **Royal** — navy + gold + brightened blue, Lorna's suggestion. Went through 2 iterations: darkened canvas/panel per Lorna's feedback (`#070c24`/`#0d1740`). Deliberately did **not** reuse the existing muted Room-channel blue (`#2E6DA4`) for this skin's canvas-adjacent accent — that blue would have blended into a navy background, so Room's accent color was brightened (`#5b7fe8`) specifically for this skin to stay visually distinct from both Vox and the canvas.
- Skin selector: tap **🎨 Skin** in the footer nav (third row, next to Voice ID), cycles through all defined skins via `SKIN_ORDER`. Persists to `localStorage` (`micDrop_skin`).
- **Why cream/off-white is parked, not just "todo":** the existing default/Alpinist/Royal skins only needed 5 tokens (canvas/panel/accent/accent2/text) because they all keep the same dark-background assumption baked into the rest of the file — secondary text (`#aaa`/`#666`/`#555`/`#3a3a3a`), unlit LED segments (`rgba(255,255,255,0.05)`), and panel borders (`#1a1a1a`) all only work *because* they sit on black. A light skin breaks that assumption everywhere at once — it needs a second text-hierarchy ramp and inverted LED/border logic, not just new hex values. Real scope, closer to the size of the original theme-system build than to Alpinist/Royal's incremental cost. Worth doing fresh, not rushed at the tail end of a session.

---

## 🎉 "Get the Party Started" — Multiplayer Party Mode (Scoped, Not Built)

Emerged from a marketing conversation, not a feature-request conversation — worth keeping that context, because the growth mechanic *is* the product idea here, not a side effect of it.

**The pitch it grew out of:** girls'-night-in karaoke positioning — skip the bar, skip the drunk crowd and pick-up lines, invite friends around with wine and comfortable clothes, just sing. Landed well because it's specific and vivid, not generic "sing along" copy.

**The mechanic that makes it more than a marketing angle:** instead of one phone passed around, every guest installs Mic Drop and sings on their own phone at the same party. That means the party literally doesn't work until everyone's installed — the growth loop is load-bearing in the product, not bolted on after. Reuses the existing invite-link pattern for "get the app before Friday night."

**Why it's genuinely buildable, not just a nice idea:** no audio-sync problem to solve. Everyone's in the same room hearing the same song from one speaker already. Each phone just needs to know *which* song the party is currently scoring — arm, listen, score locally, exactly like solo mode does today. "Multiplayer" reduces to: a shared room code, a track selected once by the host and broadcast to guests, and everyone's final score reported back to one place for ranking.

**Rough shape** (reuses Worker + KV, same pattern as the rest of the app):
- Host creates a party → short code/link (existing invite-link pattern)
- Guests join via link, pick a display name, land in a waiting room
- Host arms + identifies as normal, result broadcasts the active track to the party
- Everyone sings on their own phone — no new audio/scoring logic needed
- Round ends → each phone POSTs its final accuracy to the party endpoint
- Ranking screen — Diva / Rockstar / **Back Up Singer** for the lowest score, no numeric shame, playful tiers not scoreboard pressure

**Two decisions locked this session:**
1. **Reveal-only ranking, not a live leaderboard during the song.** A live leaderboard would be more addictive but cuts against the actual pitch — "no shoes, no pick-up lines, just fun," not phone-checking mid-song.
2. **Free to host and join, not gated behind Pro.** The whole point is it drives installs and conversions downstream — gating the thing that's supposed to go viral works against that goal.

**Known wrinkle, not yet resolved:** if a single phone gets passed around rather than everyone bringing their own, whoever calibrated Voice ID first has personalized the pitch filter to their own voice range — a friend with a different range could get subtly skewed scoring on that same phone. Not an issue in the "everyone brings their own phone" version, which is the one the marketing angle and the growth loop both depend on anyway — worth deciding explicitly whether single-phone party mode is even supported, or if the product nudges toward everyone installing.

**Not yet decided:** party size limits, whether song choice is host-only or voteable, whether results are shareable/postable after (there's an obvious content-loop opportunity here too — a party's ranking screen is itself shareable content).

---

## 🌐 URLs & Infrastructure (Unchanged)

| Item | Detail |
|------|--------|
| Live URL | https://scvd-app.github.io/Mic-Drop/ |
| Invite URL | https://scvd-app.github.io/Mic-Drop/invite.html |
| Worker | micdrop (Cloudflare) — v5, `/coaching` prompt fix still owed |
| Stack | Vanilla React single-file, no build tools, GitHub Pages |

---

## 📁 Session History

| Session | Key Work |
|---------|----------|
| 5–13 | See archived handoffs |
| 14 | **Landscape driving mode** — shipped, field-tested across main phone + Nokia + actual Jaguar mount, 3 real iteration rounds. **Distortion bug (Session 13) confirmed closed** — Jaguar was the last untested vehicle, now clean. **Cosmetic skins system** — additive theme architecture + Alpinist + Royal skins shipped, gated to Pro. Cream/off-white skin scoped and deliberately parked for next session. **"Get the Party Started" multiplayer mode** — emerged from a marketing brainstorm, scoped end-to-end (architecture, key decisions locked), not built. |

---

## 📋 Filing note

Per Scott's standard practice: this supersedes the Session 13 `handoff.md`. Rename the current live one to `handoff DD-MM HHMM` (today's date/time) and move to `mic-drop/archive/` before replacing it with this file. Paste-replace whole file, confirm the right repo tab is open before pushing (both `Mic-Drop` and `scvd-context`).
