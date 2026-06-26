# Mic Drop — Project Handoff

**Session:** 9  
**Date:** 26 June 2026  
**Status:** SOFT LAUNCH — tonight  
**Version:** v1.8

---

## Tonight's Priority List

| # | Task | Priority |
|---|------|----------|
| 1 | Flip Stripe to LIVE keys | ⚡ DO FIRST |
| 2 | Set up noreply@scvd.app — sender + support for all SCVD apps | ⚡ DO FIRST |
| 3 | Set up inbox monitoring / forwarding on scvd.app | 🔧 Tonight |
| 4 | Fix backing track contamination — narrowband gate on VOX analyser | 🔧 Tonight |
| 5 | Confirm Lou Ouija beta sign-off | 📋 Confirm |
| 6 | George Samsung A17 mic issue follow-up | 🐛 Bug |

---

## App Overview

| Item | Detail |
|------|--------|
| Live URL | https://scvd-app.github.io/Mic-Drop/ |
| Invite URL | https://scvd-app.github.io/Mic-Drop/invite.html |
| Worker | micdrop (Cloudflare) |
| Worker routes | /create-checkout, /webhook, /verify-token, /coaching |
| Auth | HMAC token — `micdrop_[type]_[days]_[hmac32]` |
| Email | Resend via noreply@scvd.app |
| Song ID | AudD — studio recordings only |
| AI coaching | Anthropic Claude Haiku |
| Stack | Vanilla React single-file, no build tools, GitHub Pages |

---

## Stripe Pricing

| Tier | Price | Duration |
|------|-------|----------|
| Monthly | $2.99 | 1 month |
| Quarterly | $7.99 | 3 months |
| Half-Year | $14.99 | 6 months |
| Annual | $24.99 | 12 months |

Sandbox end-to-end confirmed: Stripe → token email → Pro activation ✅

---

## Grade System

| Grade | Threshold |
|-------|-----------|
| 🔪 Coroner | Very low accuracy |
| 🎤 Open Mic | Below average |
| ⭐ Rising Star | Average |
| 🌟 Headliner | Good |
| 💫 Legendary | Excellent |
| 👑 DIVA | 95%+ — Whitney standard. Unreachable. |

---

## Features Built — Confirmed

### Core Audio
- Dual analyser architecture — VOX highpass + ROOM unfiltered
- AudioContext latencyHint: `playback` (fixes Bluetooth distortion)
- Silencer gain node
- Narrowband gate on VOX — **ACTION: implement tonight** (backing track contamination fix)

### Pitch & Scoring
- PitchGraph SVG — real-time pitch visualisation
- PitchBreakdown bars
- "Drop the Receipts" — html2canvas snapshot share mechanic

### Pro Features
- ProSongCard — expandable cards
- Claude Haiku /coaching route — AI vocal coaching
- "The Dressing Room" — Pro-only, polaroid Wall of Receipts (localStorage)
- 18-question Music Personality Quiz

### Infrastructure
- React Error Boundary (fixes blank screen bug)
- Full Stripe sandbox integration confirmed end-to-end
- HMAC token delivery via Resend

---

## Active Bugs

| Issue | Diagnosis | Action |
|-------|-----------|--------|
| George — Samsung A17 mic blocked | Meta app background lock on audio hardware | Force stop Facebook/Messenger, reboot, open Chrome fresh |
| Backing track contamination | VOX analyser picking up song audio | Narrowband gate — implement tonight |
| AudD + live recordings | Known AudD limitation | Documented in onboarding — no fix |

---

## Beta Testers

| Tester | Device | Status | Notes |
|--------|--------|--------|-------|
| Lou Ouija | Unknown | ✅ Primary | Shares with daughter Grace — sign-off pending |
| Madelaine | iPhone | ✅ Active | iOS tester |
| Lorna | Unknown | ✅ Active | |
| George | Samsung A17 | 🐛 Blocked | Mic permission — Meta app lock |
| Corey | Unknown | ⏳ Pending | Tribute singer — invite sent |

---

## Marketing Assets Deployed (Session 9)

- Social media banner pack — Facebook (1640×924), Instagram (1080×1080), TikTok (2560×1440), YouTube (2560×1440)
- invite.html — branded invite card deployed to GitHub Pages
- Open Graph meta tags on invite.html — rich previews on Facebook/Messenger/WhatsApp/Twitter
- Positioning: "Girls Night In Karaoke — No bar tab. No sleazy guys. No shoes required."
- Primary viral mechanic: #DropTheReceipts
- Seed network: Corey, George, Marie, Kellie Ashe, Sheridan

---

## Session History

| Session | Key Work |
|---------|----------|
| 5–6 | Core build — pitch graph, grade system, AudD |
| 7 | Stripe, HMAC tokens, Resend, Pro features |
| 8 | React Error Boundary, Bluetooth fix, dual analyser, Drop the Receipts, Music Quiz, Dressing Room |
| 9 | Marketing assets, invite.html, OG meta tags, scvd-context repo, Stripe live flip |

---

## Archive Index

| File | Description |
|------|-------------|
| `archive/handoff_session8.md` | Session 8 handoff |
| `archive/index_v1.8.html` | Frontend before Session 9 changes |
| `archive/worker_pre_session9.js` | Worker before Session 9 changes |
