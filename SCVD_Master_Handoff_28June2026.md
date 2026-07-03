# SCVD Master Handoff
**Date:** 28 June 2026
**Week:** 1 of 6 (5 weeks + 1 day remaining)
**Status:** Mic Drop live and taking real money. ECEG deployed this morning. Two products in market.

---

## 🎯 The Mission
$10,000 USD/month recurring revenue = Scott doesn't go back to the train roster.
0.001% of 1 billion Spotify users = ~10,000 subscribers at $2.99/month = $30k.
5 weeks and 1 day to become an overnight success.

---

## 📱 Portfolio Status

| # | App | Status | URL |
|---|-----|--------|-----|
| 1 | 🎤 Mic Drop | ✅ LIVE — taking real payments | https://scvd-app.github.io/Mic-Drop/ |
| 2 | 🎰 Easy Come Easy Go | ✅ LIVE — deployed this morning | TBC — confirm URL from ECEG index |
| 3 | 🚗 Chasin' Curves | 🔧 Beta | https://scvd-app.github.io/Chasin-Curves/ |
| 4 | 🏥 SCUH Navigator | ✅ Live — public service tool | GitHub Pages |
| 5 | 📺 Cult Connections | 📋 Concept — next sprint after ECEG | — |
| 6 | 🗺️ GottaGo | 📋 Concept — Week 4 beta target | — |
| 7-12 | Others | 📋 Roadmap | — |

---

## 🎤 Mic Drop — Current State

**Version:** v2.1
**Worker:** micdrop (Cloudflare) — v5
**Live URL:** https://scvd-app.github.io/Mic-Drop/
**Invite URL:** https://scvd-app.github.io/Mic-Drop/invite.html

### What's working
- ✅ Stripe live — real transactions confirmed
- ✅ Email routing — noreply@scvd.app + support@scvd.app → scvdappcreator@gmail.com
- ✅ Token pipeline — payment → Resend email → HMAC token → Pro activation
- ✅ VIP golden glow — 5s hold, 5s fade on token activation
- ✅ Backstage Pass banner — paying subscribers correctly identified
- ✅ Three-step onboarding overlay — fires on first visit only
- ✅ Narrowband gate — HP 200Hz / LP 3000Hz bandpass, MIN_VOX_RMS 0.06
- ✅ Pro report expanded by default — pitch graph + coaching auto-loads
- ✅ Backstage (formerly Dressing Room) — receipt viewer, SAVE RECEIPT button
- ✅ Drop the Receipts — Web Share API, #DropTheReceipts
- ✅ Server-side receipt storage — Cloudflare KV via worker v5, keyed to token
- ✅ Token stacking — extends from current expiry correctly
- ✅ Pro migration — legacy trial-extension users auto-migrated
- ✅ Footer nav — two rows, gold token CTA, Backstage + Invite
- ✅ Personalised invite — invite.html?from=[name]

### Known Issues / Next Session (Audio Engine v3)

#### 🔴 P1 — Quick wins
| Issue | Fix |
|-------|-----|
| Facebook/Messenger holding mic lock (Android + iOS) | Add "Zuckerberg ain't invited" tip near ARM MIC button |
| iOS "Error: mimeType is not supported" on Identify Track | iOS WebKit codec compatibility fix |
| Spotify stops when returning to Mic Drop on iOS | iOS Audio Session category conflict |

**Zuckerberg tip copy (locked):**
> "🚫 Force close Facebook & Messenger before arming — they like to hog the mic. Besides, Zuckerberg ain't invited to this party anyway. He ain't got no candy for you."

#### 🟠 P2 — Audio Engine v3 (dedicated session)

**"Meet Your Voice" — Personal Vocal Calibration System**

The biggest architectural improvement available. Replaces fixed gate parameters with personalised vocal profile per singer.

**The problem it solves:**
- Fixed gate (MIN_VOX_RMS 0.06) fails for soft singers
- Fixed frequency band (200-3000Hz) overlaps heavily with backing track
- Lou's test proved: backing track alone scores 65-85% without any singing
- Spectrum analysis (captured 28 June 2026, 01:52am) confirmed: unamplified voice at ~78.9dB vs mastered backing track at ~95.7dB — nearly 17dB difference. Amplitude gating alone cannot solve this.

**The calibration flow:**

Step 1 — Mic position training:
- Live dB meter, no music
- Target: 80dB+ (green zone)
- Teaches correct phone position AND captures baseline SPL simultaneously

Step 2 — Vocal phrase analysis (6 phrases):
| Phrase | Purpose |
|--------|---------|
| "Over the ocean the old oak grows" | O vowels, low fundamental |
| "Even eagles eat eastern eggs" | E vowels, mid range |
| "Amazing graces are always available" | A vowels, natural resonance peak |
| "I like hiking high Alpine trails" | I vowels, upper range |
| "Under the umbrella the umbrella bird sings" | U vowels, lower register |
| "Peter Piper picked a peck of pickled peppers" | Plosive handling + mic position validation |

Step 3 — Profile confirmed to user:
- Show their fundamental range in Hz
- Show their natural singing dB
- Auto-classify: Strong / Moderate / Soft singer
- Soft singers get personalised message: "You have a naturally gentle voice — we've tuned Mic Drop to listen more carefully for you"

**What gets stored in KV (per token):**
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

**Reference-track subtraction (headphone support unlock):**
Once AudD identifies the song, use the known track's spectral signature to actively subtract backing track energy from the signal — isolating voice regardless of backing track volume. This is the only real solution to Lou's ambient-scoring problem and opens up headphone use properly.

#### 🟡 P3 — Future
- Landscape mode (VU meters look great sideways — confirmed in car mount)
- Songwriter Mode — no AudD, melody development tool
- Server-side receipt storage improvements
- auth.scvd.app — SCVD-level SSO (magic link, estimated 3-4 hours)
- Token single-use enforcement (deferred until auth built)
- Plausible analytics ($9/month)
- Mic Drop 3D printed phone holder STL (Fiverr brief written)

### Beta Tester Status
| Person | Device | Status | Notes |
|--------|--------|--------|-------|
| Lou Ouija | Unknown | ✅ Active | Has Scott's Pro token. Confirmed ambient-scoring gate weakness. |
| Marie Andersen | iPhone 12 | ✅ Active | iOS mimeType + Spotify interruption bugs confirmed. Engaged tester. |
| Al (alfonzo70) | Android | ✅ Active | "Kick ass tool." Full session tested. |
| George | Samsung A17 | 🐛 Workaround | Force close Facebook/Messenger — same root cause as Marie |
| Lorna | Hospital | 🏥 Recovering | Priority 1. Hotcakes with syrup required tomorrow morning. |

---

## 🎰 Easy Come Easy Go — Current State

**Status:** Deployed this morning (28 June 2026)
**Note:** Built in separate chat session — Scott to confirm URL and drop latest index.html for full assessment
**Original handoff:** Easy_Come_Easy_Go_HANDOFF.md (May 14 version)
**Original build:** lottery-game12.jsx (May 14 version)

Known gaps from May 14 handoff (may be resolved in this morning's deploy):
- Fun Stuff category (Big Boys Toys + For the Ladies)
- Temptation system
- Smart phone check logic
- Expanded 40-card event deck
- Karen/Greg notifications not wired to clock

**Next actions:**
- Confirm what's been built in the other chat
- Assess gaps vs May 14 spec
- Stripe integration (if not done)
- GitHub Pages hosting confirmed

---

## 🏗️ SCVD Infrastructure

| Item | Detail |
|------|--------|
| Domain | scvd.app (Cloudflare Registrar) |
| Email routing | noreply@scvd.app + support@scvd.app → scvdappcreator@gmail.com |
| Helpdesk | scvdappcreator@gmail.com (Adrienne to monitor when hired) |
| Active workers | micdrop (v5), chasin-curves (v2.1 restored), maverick-james |
| Deleted workers | white-brook-1589, citt-proxy (orphaned — deleted session 11) |
| GitHub org | SCVD-App |
| Context repo | github.com/SCVD-App/scvd-context |

**Critical rule:** Always confirm worker name in browser tab before editing. Paste-replace whole files only. No manual line edits. (Chasin' Curves was accidentally overwritten with Mic Drop worker — restored from June 18 backup.)

---

## 💡 SCVD Brand & Philosophy

- **No ads. No auto-renewal. Everyone pays the same price.**
- Elgoog (no tracking) · Elppa (open web/no platform tax) · Tfosorcim (anti-lock-in)
- "A good old fashioned F You to Google, Apple and Microsoft"
- Support: support@scvd.app → scvdappcreator@gmail.com
- Future helpdesk: Adrienne (vampire daughter — naturally aligned with UK/US timezones)

---

## 📅 5-Week Roadmap

| Week | Target |
|------|--------|
| Week 1 (done) | Mic Drop live ✅ + ECEG deployed ✅ |
| Week 2 | Mic Drop Audio Engine v3 + Cult Connections sprint |
| Week 3 | Cult Connections live + GottaGo beta begins |
| Week 4 | GottaGo beta hosted + Camps Australia conversation |
| Week 5 | Buffer, polish, distribution push across all products |
| When 4+ live | Field of Dreams app directory launch |

---

## 🎤 Key Positioning & Marketing

**Mic Drop:**
- "No bar tab. No sleazy guys. No shoes required."
- "Not are you good enough — are you better than yesterday."
- Al quote: "It's a kick ass tool." — first genuine external endorsement
- Primary viral mechanic: #DropTheReceipts
- Campaign: 3-image Instagram carousel — Spotify playing → App armed → Person singing
- STL mic phone holder — Fiverr brief written, $20-50 commission

**SCVD About page:** Standardise across all apps — personal story + SCVD brand constants + app-specific story. "Part of the SCVD family — see what else we're building."

---

## 📝 Session Notes

**This handoff covers Sessions 9-11 of Mic Drop + ECEG morning deploy.**

Scott is currently at hospital with Lorna (recovering well, appetite returning — excellent sign). Laptop in hand. Ready to work during Lorna's rest period.

Next fresh session should:
1. Start by reading this document
2. Get ECEG index.html + confirm current state
3. Decide: ECEG gaps first OR Audio Engine v3 first
4. Keep Lorna supplied with hotcakes

