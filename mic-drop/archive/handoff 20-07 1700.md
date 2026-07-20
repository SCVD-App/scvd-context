# Mic Drop — Project Handoff

**Session:** 12 (Late-night rapid-fire session)
**Date:** 2-3 July 2026 (2300–0100)
**Status:** LIVE — real payments flowing, active beta testing, one open audio mystery
**Version:** v2.2
**Worker:** micdrop (Cloudflare) — v5, unchanged this session

---

## 🚨 Next Session Priority List

| # | Task | Priority |
|---|------|----------|
| 1 | Verify iOS mimeType fix — test in **real Safari**, not a Messenger-tapped link | 🔴 P1 — was confounded tonight, needs clean retest |
| 2 | Investigate PWA/home-screen audio silence bug (NEW — see below) | 🔴 P1 |
| 3 | Distortion investigation — device-independent, AudioContext-related (NEW — see below) | 🔴 P1 |
| 4 | "Meet Your Voice" personal vocal calibration | 🟠 P2 — Scott keen to start this next |
| 5 | Landscape mode | 🟠 P2 — upgraded priority, real-world case confirmed (see below) |
| 6 | Reference-track subtraction (headphone support) | 🟠 P2 — bigger build |
| 7 | ROOM/VOX adaptive gate (ambient scoring problem) | 🟠 P2 |
| 8 | auth.scvd.app SSO | 🟡 P3 |

---

## ✅ Session 12 Completed

| Item | Status | Detail |
|------|--------|--------|
| "Zuckerberg ain't invited" mic-lock tip | ✅ Shipped | Renders above ARM MIC button, only visible when `!armed` so it disappears during actual recording. Copy locked from Session 11. |
| iOS mimeType fallback fix | ✅ Shipped, ⚠️ unverified | Old code fell back to unchecked `"audio/ogg"` string with no `isTypeSupported` check — this is what threw "mimeType is not supported" on Safari. Rebuilt as a proper candidate chain (webm/opus → webm → **mp4/aac** → mp4 → ogg/opus → ogg), each checked via `MediaRecorder.isTypeSupported()`. Falls back to browser default if literally nothing matches rather than crashing. Blob and AudD payload now use `recorder.mimeType` (the actual type the browser picked) instead of the guessed candidate string. |
| Tester debug overlay | ✅ Shipped | Hidden by default — tap the footer version text 5x quickly to open. Captures `window.onerror`, `unhandledrejection`, mimeType selected, blob size/type, AudD server errors, and any `recognizeTrack` catch block errors, each timestamped. Capped at 40 entries. Share button uses native Web Share API (falls back to clipboard copy) so testers can send the actual log text instead of a cropped screenshot. |
| NotReadableError friendly message | ✅ Shipped | Previously fell through to a raw `Mic error: NotReadableError — ...` message. Now gives George's exact bug ("mic's already in use by another app — force close Facebook, Messenger...") a proper user-facing message, and logs the raw error to the debug panel. |

---

## 🐛 New Bugs Identified — Session 12

### 1. PWA / home-screen audio silence (NEW — unconfirmed root cause)
Madelaine tested two ways on iPhone:
- **Via Messenger-tapped link** (in-app WebView): audio plays, AudD fingerprint error fires after a few seconds — consistent with pre-fix behaviour, but **this test is confounded** — Messenger's in-app browser is a different rendering engine from Safari and may have been serving a cached/old version.
- **Via version saved to home screen** (standalone PWA mode): audio does not play **at all** when the mic is armed.

These are two different symptoms and need to be separated before diagnosing either. The home-screen silence is the more concerning one — smells like an iOS Audio Session category conflict specific to standalone/installed mode, possibly related to the existing "Spotify stops on iOS" bug (same family, different trigger).

**Action:** retest with a tester on real Safari (not tapped from Messenger) to get a clean read on whether the mimeType fix actually worked. Log the home-screen bug as its own line item next to the Spotify interruption bug.

### 2. Device-independent audio distortion when mic is armed (NEW — active investigation)
Scott noticed distortion while singing in the Jaguar today. Confirmed testing:
- Present on: Bluetooth speaker, multiple cars, phone's own speaker with **no Bluetooth in the chain**
- **Diagnostic clue:** Scott ran a separate spectrum analyser app to inspect the fault — this snatched the mic away from Mic Drop mid-test. The instant Mic Drop's audio graph stopped running (lost the mic), the distortion vanished — even though Spotify kept playing uninterrupted the whole time. Re-arming Mic Drop's mic brought the distortion back and killed the analyser.
- **Working theory:** the distortion isn't coming from the room, the speaker, or Bluetooth pairing — it's Mic Drop's own active `AudioContext` (forced `sampleRate: 48000`, `latencyHint: 'playback'`, silencer node routed to `destination`) interfering with the OS audio session while Spotify is concurrently playing. Creating/holding this audio graph may be forcing a system-level mixer reconfiguration that manifests as audible distortion on whatever's currently playing — regardless of output device, because it's happening upstream of the speaker.
- **This may be the same root cause as the iOS "Spotify stops when returning to Mic Drop" bug** — different platforms, same underlying mechanism (Mic Drop's audio session grabbing control from whatever else is playing).
- **Not yet reproduced tonight** on a JBL Wonderboom V4 test (Nokia phone) — one clean pass doesn't rule it out, could be intermittent or state-dependent (e.g. only occurs after certain sequences of arm/disarm, or certain prior playback state).

**Test plan in progress:** Nokia running Spotify + Mic Drop (armed/disarmed), Pixel running a spectrum analyser as a **separate, non-contending device** capturing the speaker output from outside the loop — avoids the mic-contention confound from the first test. Klipsch speaker and both cars (Jaguar, BMW) to be tested tomorrow morning.

**Do not attempt a code fix until this is properly diagnosed with real waveform/spectrum evidence** — this is Audio Engine v3 territory, not a blind midnight patch.

---

## 🌍 Real-World Field Insight — Landscape Mode

Scott discovered today that mounting the phone in **landscape orientation in a vent-mounted holder in the Jaguar** naturally rotates the phone so the mic (at the base of the phone in portrait) points toward the driver's seating position — while leaving the volume controls (top of phone in portrait) still accessible at the top of the landscape orientation. Confirmed via spectrum analyser test last night: base of phone = physically closest to driver when mounted landscape.

This means landscape mode isn't just a "looks great on a dash" nice-to-have (VU meters bouncing at night) — it's a **free audio-capture quality improvement** tied directly to how people actually mount phones in cars. Worth bumping priority on this. Also worth considering: the mic-position training step in "Meet Your Voice" calibration could double as validating/reinforcing this orientation benefit for car users specifically.

---

## 🎤 Beta Tester Status (Updated)

| Person | Device | Status | Notes |
|--------|--------|--------|-------|
| Lou Ouija | Unknown | ✅ Active | Has Scott's Pro token. Confirmed ambient-scoring gate weakness (Session 11). |
| Marie Andersen | iPhone 12 | ✅ Active | iOS mimeType + Spotify interruption bugs originally surfaced by her testing. |
| Al (alfonzo70) | Android | ✅ Active | "Kick ass tool." Full session tested. |
| George | Samsung A17 | ✅ Fix shipped | Meta app mic-lock — now gets friendly NotReadableError message instead of raw error. |
| **Madelaine** | iPhone | ✅ Active — tested tonight | Ran two rounds of iOS testing this session. Surfaced the Messenger-WebView confound and the new home-screen audio-silence bug. Had to tap out for an early morning with kids — good sport running tests at 2320 on request. |
| Lorna | Hospital | 🏥 Recovering | Birthday discharge target: Wednesday 8 July. |

**Testing lesson learned tonight:** always confirm testers are opening the app directly in Safari, not via a link tapped inside Messenger — the in-app WebView is a different rendering environment and introduces cache/behaviour confounds that make bug reports unreliable.

---

## 🎵 Audio Engine v3 — Status Check

Spec unchanged from Session 11 (see archive) — "Meet Your Voice" calibration flow, reference-track subtraction, adaptive gate. Scott is keen to prioritise the calibration work next, seeing it as key to actually understanding each user's voice rather than fighting a one-size-fits-all gate.

**New consideration for this spec:** the distortion investigation above may need to inform or precede calibration work — if the underlying issue is AudioContext/session-level interference, that could affect calibration accuracy too (a distorted signal during the 6-phrase calibration flow would produce a bad profile). Worth resolving the distortion root cause, or at least understanding it, before leaning too hard into calibration.

---

## 🌐 URLs & Infrastructure (Unchanged)

| Item | Detail |
|------|--------|
| Live URL | https://scvd-app.github.io/Mic-Drop/ |
| Invite URL | https://scvd-app.github.io/Mic-Drop/invite.html |
| Worker | micdrop (Cloudflare) — v5 |
| Worker routes | /recognize, /enrich, /ping, /active, /create-checkout, /webhook, /verify-token, /admin/generate-token, /coaching, /receipts (GET/POST/DELETE) |
| KV Namespace | MICDROP_KV |
| Email | Resend via noreply@scvd.app |
| Support | support@scvd.app → scvdappcreator@gmail.com |
| Song ID | AudD — studio recordings only |
| AI Coaching | Anthropic Claude Haiku |
| Stack | Vanilla React single-file, no build tools, GitHub Pages |
| Sample Rate | 48000Hz (Bluetooth A2DP native) — **flagged as possible factor in distortion investigation above** |

---

## 💳 Stripe — LIVE (Unchanged)

| Tier | Price | Duration |
|------|-------|----------|
| Monthly | $2.99 USD | 30 days |
| Quarterly | $7.99 USD | 90 days |
| Half-Year | $14.99 USD | 180 days |
| Annual | $24.99 USD | 365 days |

No changes this session. Live keys active, first real transaction confirmed in prior sessions.

---

## 🔑 Token System (Unchanged)

Format: `micdrop_[type]_[days]_[hmac32]`, HMAC-SHA256 signed. Stacking extends from current expiry. Known gap: not single-use, not identity-locked — deferred until auth.scvd.app built. See prior handoffs for full localStorage key reference.

---

## 🐛 Full Known Issues Table (Consolidated & Updated)

| Issue | Status | Notes |
|-------|--------|-------|
| Facebook/Messenger mic lock (Android + iOS) | ✅ Fixed | Zuckerberg tip shipped Session 12 |
| iOS "mimeType is not supported" | ✅ Fix shipped, ⚠️ unverified | Clean Safari retest needed |
| NotReadableError raw message (Samsung/Meta lock) | ✅ Fixed | Friendly message shipped Session 12 |
| Spotify stops on iOS when returning to Mic Drop | 🔴 Open | Possibly same root cause as distortion bug below |
| **PWA/home-screen audio silence on arm** | 🔴 Open — NEW | iOS standalone mode only, needs isolation from Messenger-WebView confound |
| **Device-independent distortion on mic arm during playback** | 🔴 Open — NEW, active investigation | Strong lead: AudioContext/session interference with concurrent playback. Test plan in progress. |
| Backing track scores 65-85% without singing (ambient gate) | 🔴 Open | MIN_VOX_RMS 0.06 insufficient — needs adaptive ROOM/VOX ratio or reference-track subtraction |
| Bluetooth A2DP→HSP profile switching | 🟡 Documented limitation | OS-level, not fully fixable |
| Token not single-use / not identity-locked | 🟡 Deferred | Waiting on auth.scvd.app |

---

## 📁 Session History

| Session | Key Work |
|---------|----------|
| 5–9 | Core build through soft launch |
| 10 | Stripe live, narrowband gate v1, onboarding, VIP glow, Pro migration, server-side receipts, footer cleanup |
| 11 | Real beta feedback round — iOS bugs identified, gate v1 confirmed insufficient, Audio Engine v3 / "Meet Your Voice" concept developed, Zuckerberg tip copy locked, spectrum analysis data captured |
| 12 | Zuckerberg tip shipped, iOS mimeType fix shipped (unverified — Messenger WebView confound), tester debug overlay built, NotReadableError friendly message shipped, PWA home-screen audio silence bug discovered, device-independent distortion investigation opened (strong AudioContext-interference lead), landscape mode field-insight confirmed (mic position in Jaguar vent mount), Madelaine active as iOS tester |

---

## 📋 Critical Operating Rules (Unchanged)

1. Always paste-replace whole files — no manual line edits.
2. Always confirm worker name in browser tab before editing.
3. Worker secrets live in Cloudflare dashboard only — never in code files.
4. **New this session:** always test on real Safari, not a link tapped from inside Messenger — the in-app WebView introduces caching and rendering confounds that make bug reports unreliable.
