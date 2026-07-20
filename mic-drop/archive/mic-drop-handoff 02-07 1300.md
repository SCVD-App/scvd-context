# Mic Drop — Project Handoff

**Session:** 11 (Final — end of June 27-28 marathon session)
**Date:** 28 June 2026
**Status:** LIVE — market ready, real payments flowing, beta feedback active
**Version:** v2.1
**Worker:** micdrop v5

---

## 🌐 URLs & Infrastructure

| Item | Detail |
|------|--------|
| Live URL | https://scvd-app.github.io/Mic-Drop/ |
| Invite URL | https://scvd-app.github.io/Mic-Drop/invite.html |
| Worker | micdrop (Cloudflare) — v5 |
| Worker URL | https://micdrop.emblen-scott.workers.dev |
| Worker routes | /recognize, /enrich, /ping, /active, /create-checkout, /webhook, /verify-token, /admin/generate-token, /coaching, /receipts (GET/POST/DELETE) |
| KV Namespace | MICDROP_KV |
| Email | Resend via noreply@scvd.app |
| Support | support@scvd.app → scvdappcreator@gmail.com |
| Song ID | AudD — studio recordings only |
| AI Coaching | Anthropic Claude Haiku (claude-haiku-4-5) |
| Stack | Vanilla React single-file, no build tools, GitHub Pages |
| Sample Rate | 48000Hz (Bluetooth A2DP native) |

---

## 💳 Stripe — LIVE

| Tier | Price | Duration |
|------|-------|----------|
| Monthly | $2.99 USD | 30 days |
| Quarterly | $7.99 USD | 90 days |
| Half-Year | $14.99 USD | 180 days |
| Annual | $24.99 USD | 365 days |

- Live keys active — first real transaction confirmed ✅
- Webhook: `micdrop-live-webhook` → `/webhook` on Cloudflare Worker
- Statement descriptor: `SCVD MIC DROP` / `MICDROP`
- Token email sent via Resend from `noreply@scvd.app`

---

## 🔑 Token System

- Format: `micdrop_[type]_[days]_[hmac32]`
- HMAC-SHA256 signed — self-validating, no DB lookup required
- Stored in localStorage as `micDrop_proToken` on activation
- Stacking: extends from current expiry if still valid, else starts from now
- Migration: auto-detects legacy trial-extension users, writes `micDrop_proExpiry`
- **Known gap:** Tokens are NOT single-use and NOT identity-locked — deferred until auth.scvd.app is built

### localStorage Keys
| Key | Purpose |
|-----|---------|
| micDrop_onboarded | Onboarding shown — "1" after first visit |
| micDrop_proExpiry | Unix timestamp of Pro access expiry |
| micDrop_proToken | Raw token string for server-side receipt access |
| micDrop_trialStart | Trial start (legacy — migration reads this) |
| micDrop_dressingRoom | Local receipt cache (Backstage wall) |
| micDrop_profile | User profile (name, photo, card style, preset, quiz) |

---

## ✅ Features Built — v2.1

### Onboarding
- 3-step modal fires on first visit only (`micDrop_onboarded` flag)
- Step 1: Play your song
- Step 2: Hold your phone like a mic
- Step 3: Sing along — we're listening to YOU
- Skip option available
- localStorage flag prevents repeat display

### Pro Status System
- `micDrop_proExpiry` timestamp in localStorage
- `isPro = trial.active || proPaid.paid`
- **Backstage Pass banner** — paying subscribers see gold banner with days remaining
- "YOUR PRO TRIAL HAS ENDED" suppressed for paying subscribers
- **VIP golden glow** — 5s full glow, 5s fade on token activation
- Crown + "VIP ACCESS GRANTED" + "THE DRESSING ROOM IS OPEN"

### Audio Architecture
- **Dual analyser** — VOX narrowband + ROOM unfiltered
- VOX chain: HP 200Hz → LP 3000Hz → analyser (bandpass gate)
- MIN_VOX_RMS = 0.06 (rejects backing track bleed)
- Silencer: source → gain(0) → destination (prevents Android speaker routing)
- AudioContext: sampleRate 48000, latencyHint 'playback'
- getUserMedia: echoCancellation false, noiseSuppression false, autoGainControl false

### Pitch & Scoring
- PitchGraph SVG — real-time pitch visualisation
- PitchBreakdown bars — Sharp / Pocket / Flat percentages
- ProSongCard — **expanded by default**, coaching auto-fetches on mount
- Grade system: Coroner → Open Mic → Rising Star → Headliner → Legendary → DIVA (95%+)

### Backstage (formerly Dressing Room)
- Polaroid Wall of Receipts — up to 9 receipts
- Receipt viewer — tap to expand, SAVE RECEIPT button, TAP OUTSIDE TO CLOSE
- **Server-side receipt storage** — Cloudflare KV via worker /receipts routes
- Receipts keyed to last 32 chars of Pro token
- Local localStorage cache + server sync on Backstage open
- Storage notice: "Receipts backed up to the cloud — re-enter your token to restore"

### Drop the Receipts
- html2canvas snapshot of Pro report
- Web Share API — share sheet with `#DropTheReceipts` in text
- Falls back to anchor download if Web Share not available

### Footer Nav (two rows)
- Row 1: Support · About · ⭐ Pro
- Row 2: 🎭 Backstage · 🎤 Invite
- Gold token CTA: `✦ Have a token? Enter it here`

### Invite System
- `invite.html?from=[name]` — personalised invite card
- Opens in new tab from Invite button in footer
- User name pulled from profile localStorage

### Infrastructure
- React Error Boundary (fixes blank screen bug)
- 18-question Music Personality Quiz
- Active singer count via KV heartbeat ping
- Admin token generation endpoint (authenticated)

---

## 🐛 Active Bugs & Known Issues

### 🔴 P1 — Quick wins (next session)

| Issue | Evidence | Fix |
|-------|----------|-----|
| Facebook/Messenger mic lock | George (Android) + Marie (iOS) — same root cause | Add "Zuckerberg" tip near ARM MIC button |
| iOS mimeType not supported | Marie iPhone 12 — "Error: mimeType is not supported" on Identify Track | iOS WebKit codec compatibility fix |
| Spotify stops on iOS when returning to Mic Drop | Marie — confirmed after FB/Messenger fix didn't resolve it | iOS Audio Session category conflict |

**Zuckerberg tip copy (locked in):**
> "🚫 Force close Facebook & Messenger before arming — they like to hog the mic. Besides, Zuckerberg ain't invited to this party anyway. He ain't got no candy for you."

### 🟠 P2 — Gate still insufficient

Lou's test confirmed: backing track alone scores 65-85% without any singing.
Spectrum analysis (28 June, 01:52am) confirmed: unamplified voice ~78.9dB vs mastered backing track ~95.7dB — nearly 17dB gap. Amplitude gating alone cannot solve this.

MIN_VOX_RMS 0.06 is not enough. Options:
1. Raise further to 0.08-0.10
2. ROOM/VOX ratio adaptive gate (smarter approach)
3. Reference-track subtraction (proper solution — see Audio Engine v3 below)

### 🟡 P3 — Known deferred items

| Item | Status |
|------|--------|
| Token single-use enforcement | Deferred until auth.scvd.app built |
| auth.scvd.app SSO | Architecture agreed — magic link via Resend — not built |
| localStorage receipt warning | Updated to "re-enter your token to restore" |
| Scott's token day count | Inflated due to stacking on corrupted base — clear micDrop_proExpiry, re-enter token |

---

## 🎵 Audio Engine v3 — Full Spec (Next Major Sprint)

### "Meet Your Voice" — Personal Vocal Calibration

**The problem:** Every singer has a different fundamental frequency range and natural SPL. Fixed gate parameters fail soft singers and can't reliably reject a mastered backing track (17dB louder than an unamplified voice).

**The solution:** Personalised vocal profile per user, captured in a guided 2-3 minute onboarding flow.

**Calibration flow:**

**Step 1 — Mic position training:**
- Live dB meter, no music playing
- Target: 80dB+ (green zone) / 65-80dB (amber) / below 65dB (red)
- Teaches correct phone position AND captures baseline SPL
- Muscle memory training — every subsequent session at the same distance

**Step 2 — Vocal phrase analysis:**
| Phrase | Primary Purpose |
|--------|----------------|
| "Over the ocean the old oak grows" | O vowels, low fundamental |
| "Even eagles eat eastern eggs" | E vowels, mid range |
| "Amazing graces are always available" | A vowels, natural resonance peak |
| "I like hiking high Alpine trails" | I vowels, upper range |
| "Under the umbrella the umbrella bird sings" | U vowels, lower register |
| "Peter Piper picked a peck of pickled peppers" | Plosive handling + mic position validation |

**Step 3 — Profile confirmed:**
- Show fundamental range in Hz
- Show natural singing dB
- Auto-classify: Strong (85dB+) / Moderate (70-85dB) / Soft (below 70dB)
- Soft singer message: "You have a naturally gentle voice — we've tuned Mic Drop to listen more carefully for you"

**Stored in KV (per token):**
```json
{
  "vocal_profile": {
    "fundamental_low": 180,
    "fundamental_high": 420,
    "peak_formant": 245,
    "rms_baseline": 0.042,
    "db_natural": 84,
    "singer_type": "moderate",
    "gate_rms": 0.035,
    "hp_freq": 160,
    "lp_freq": 480,
    "calibrated": true,
    "calibrated_date": "2026-06-28"
  }
}
```

**Reference-track subtraction:**
Once AudD identifies the song, use the known track's spectral signature to actively subtract backing track energy — isolating voice regardless of backing track volume. This is the only real solution to the 17dB gap problem AND opens up headphone support properly.

**Why headphones work with this approach:**
Even faint bleed-through is enough for AudD fingerprinting. Reference subtraction then isolates the voice using known track data, not raw amplitude. Marie's distance problem, Lou's ambient-scoring problem, and the headphone use case all solved by the same mechanism.

**Landscape mode:**
User confirmed VU meters look great in landscape on a car dash mount. CSS `@media (orientation: landscape)` responsive layout — dedicated session, not urgent.

---

## 👥 Beta Tester Status

| Person | Device | Status | Notes |
|--------|--------|--------|-------|
| Lou Ouija | Unknown | ✅ Active | Has Scott's Pro token. Confirmed ambient-scoring gate weakness. "If there are glitches I usually find them." |
| Marie Andersen | iPhone 12 | ✅ Active | iOS mimeType + Spotify interruption confirmed. Engaged tester. Instructions helpful. |
| Al (alfonzo70) | Android | ✅ Active | Singer/songwriter. "Kick ass tool." Full session tested. |
| George | Samsung A17 | 🐛 Workaround | Force close Facebook/Messenger — confirmed cross-platform pattern |
| Lorna | Hospital | 🏥 Recovering | Birthday discharge target: Wednesday 8 July. 💐 |
| Madelaine | iOS | ✅ Active | |
| Corey | Android | ⏳ Pending | Tribute show singer |
| Kellie Ashe | Unknown | ⏳ Pending | Brisbane Northside karaoke |
| Sheridan | Unknown | ⏳ Pending | Kellie's sister — home karaoke |

---

## 📣 Marketing

- **Tagline:** "Sing. Score. Drop the Receipts."
- **Karaoke angle:** "No bar tab. No sleazy guys. No shoes required."
- **Progress angle:** "Not are you good enough — are you better than yesterday."
- **Al quote:** "It's a kick ass tool." — first genuine external endorsement
- **Viral mechanic:** #DropTheReceipts
- **Campaign:** 3-image Instagram carousel — Spotify playing → App armed → Person singing
- **Copy locked:** Step 1: 🎵 Play your song anywhere / Step 2: 🎤 Hold your phone like a mic / Step 3: 🎙️ Sing along — we're listening to YOU

**STL Mic Phone Holder:**
- Classic dynamic mic silhouette (SM58 aesthetic)
- Phone slot ~70 degree angle, ~80mm wide
- Hollow handle with M12 galvanised washer ballast (~150-180g)
- ASA filament — UV resistant, Queensland car safe
- "MIC DROP" embossed on base
- QR code on base linking to app
- Free STL download as marketing asset — "link in bio"
- Fiverr brief written — $20-50 budget
- Hero shot: marble benchtop, wine glasses, fairy lights, DIVA score showing

---

## 🔮 Deferred Roadmap

| Feature | Priority | Notes |
|---------|----------|-------|
| Audio Engine v3 — "Meet Your Voice" | 🔴 P1 | Dedicated sprint — see spec above |
| iOS mimeType + Spotify fix | 🔴 P1 | Quick wins — next session |
| Zuckerberg tip | 🔴 P1 | One line change — next session |
| auth.scvd.app SSO | 🟠 P2 | Magic link, ~3-4 hours, shared across all SCVD apps |
| Server-side receipt improvements | 🟠 P2 | Currently keyed to token, will migrate to email with auth |
| Songwriter Mode | 🟡 P3 | No AudD, melody development, interval visualisation |
| Progress timeline graph | 🟡 P3 | Average accuracy over time |
| Personal bests per song | 🟡 P3 | |
| Landscape mode | 🟡 P3 | CSS media query — car mount use case |
| Plausible analytics | 🟡 P3 | $9/month geographic data |
| SCVD About page template | 🟡 P3 | Standardise across all apps |

---

## 📋 Critical Operating Rules

1. **Always paste-replace whole files** — no manual line edits. Fat finger risk is real.
2. **Always confirm worker name in browser tab** before editing — Chasin' Curves was accidentally overwritten with Mic Drop worker code (restored from June 18 backup).
3. **Worker secrets live in Cloudflare dashboard only** — never in code files.
4. **CORS header must include DELETE** for /receipts route — worker v5 ✅

---

## 📁 Session History

| Session | Key Work |
|---------|----------|
| 5-6 | Core build — pitch graph, grade system, AudD |
| 7 | Stripe sandbox, HMAC tokens, Resend, Pro features |
| 8 | Error Boundary, Bluetooth fix, dual analyser, Drop the Receipts, Music Quiz, Backstage |
| 9 | Marketing assets, invite.html, OG tags, scvd-context repo, soft launch, Al beta |
| 10 | Stripe live, first real transaction, email routing, onboarding, VIP glow, narrowband gate, token stacking fix, Pro migration, ProSongCard expanded by default, receipt viewer, Drop the Receipts share sheet, footer nav cleanup |
| 11 | Server-side receipt storage (worker v5), Backstage renamed, footer two-row layout, gold token CTA, real beta feedback — iOS bugs identified, gate v1 confirmed insufficient, Audio Engine v3 / "Meet Your Voice" concept developed, Zuckerberg tip copy locked, spectrum analysis data captured |

