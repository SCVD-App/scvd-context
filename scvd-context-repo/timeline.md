# SCVD Apps — 12-Project Master Timeline

**Last Updated:** 26 June 2026 — Session 9  
**Updated by:** Scott Emblen + Claude

---

## Portfolio At A Glance

| # | App | Status | Priority | Target |
|---|-----|--------|----------|--------|
| 1 | 🎤 Mic Drop | SOFT LAUNCH | 🔴 P1 | Tonight 26 Jun 2026 |
| 2 | 🚗 Chasin' Curves | BETA | 🔴 P1 | Public Q3 2026 |
| 3 | 🔧 TGM (Tame Grease Monkey) | IN DEV | 🔴 P1 | Q3 2026 (with Chasin' Curves) |
| 4 | 🚘 CITT / Maverick (James Claude) | IN DEV | 🟠 P2 | Q3 2026 |
| 5 | 📺 Cult Connections | CONCEPT | 🟠 P2 | Q3-Q4 2026 |
| 6 | 🎰 Lottery Winner | CONCEPT | 🟠 P2 | Q4 2026 |
| 7 | 🧠 Great Minds | CONCEPT | 🟠 P2 | Q4 2026 |
| 8 | 📊 Safe Bet | CONCEPT | 🟡 P3 | Q4 2026 |
| 9 | 💬 Vent App | CONCEPT | 🟡 P3 | Q1 2027 |
| 10 | 🗺️ GottaGo | CONCEPT | 🟡 P3 | Q1 2027 |
| 11 | ⚔️ Volta Makashi | CONCEPT | 🟡 P3 | Q2 2027 |
| 12 | 📅 Nagging Reminder | CONCEPT | 🟡 P3 | TBD |

---

## Release Roadmap

| Period | Milestone |
|--------|-----------|
| Tonight — 26 Jun 2026 | 🎤 Mic Drop soft launch — Stripe live, scvd.app email |
| Q3 2026 | 🚗 Chasin' Curves + TGM public \| 🚘 CITT/Maverick Phase 1 |
| Q3–Q4 2026 | 📺 Cult Connections \| 🎰 Lottery Winner \| 🧠 Great Minds |
| When 4+ apps live | 🌾 Field of Dreams app directory launch |
| Q4 2026 | 📊 Safe Bet + additional portfolio apps |
| Q1 2027 | 💬 Vent App \| 🗺️ GottaGo |
| Q2 2027+ | ⚔️ Volta Makashi \| 📅 Nagging Reminder |

---

## Project Details

### 1. 🎤 Mic Drop
- **Status:** SOFT LAUNCH — tonight
- **URL:** https://scvd-app.github.io/Mic-Drop/
- **Invite URL:** https://scvd-app.github.io/Mic-Drop/invite.html
- **Version:** v1.8
- **Stack:** Vanilla React (single-file), Cloudflare Workers, AudD, Anthropic API (Haiku), Stripe, GitHub Pages
- **Open Actions:** Stripe live keys, scvd.app email, narrowband gate fix, George Samsung bug
- **Context file:** `mic-drop/handoff.md`

### 2. 🚗 Chasin' Curves
- **Status:** BETA
- **URL:** https://scvd-app.github.io/Chasin-Curves/ *(confirm URL)*
- **Stack:** Vanilla React, Cloudflare Worker backend, GitHub Pages, Mapbox planned
- **Open Actions:** Multi-user account isolation, community roads feature, zoomable map
- **Beta tester:** Shane "Skeeny"
- **Context file:** `chasin-curves/handoff.md`

### 3. 🔧 TGM (Tame Grease Monkey)
- **Status:** IN DEV — embedded within Chasin' Curves
- **Tiers:** The Record (free specs/rego), The Logbook (free service history), The Guides (Pro AI)
- **Personas:** The Mechanic (precise/scientific), The Maverick/James Claude (deadpan shed companion)
- **Built:** Guide #001 (BMW E85 Z4 bonnet bump stop). Guide #002 (Z4 door lock actuator) research complete
- **Open Actions:** Build Guide #002, implement Workshop Mode (hands-free, voice-interactive, safety photo gate)
- **Context file:** `tgm/handoff.md`

### 4. 🚘 CITT / Maverick (James Claude)
- **Status:** IN DEV
- **Stack:** Standalone HTML, citt-proxy Cloudflare Worker
- **Voices:** 11 characters — James Claude, HAL 9000, KITT, Terminator, RoboCop, Hans Gruber, Dr House, Bond, Goldblum, Nicholson, Arnie/Rocky
- **Persona:** Daniel Craig/George Clooney deadpan. Canonical response to unanswerable: "Because Stone Cold said so."
- **Phases:** 1 = working companion, 2 = route/GPS/weather, 3 = native app, 4 = AI call screening
- **Open Actions:** Resolve voice fallback issue (Chrome DevTools console check)
- **Context file:** `citt-maverick/handoff.md`

### 5. 📺 Cult Connections
- **Status:** CONCEPT
- **Pitch:** Pop culture trivia PWA. Kath & Kim anchor demographic. Est. ~100k verbatim-quoters in Australian market. Strong local angle.
- **Open Actions:** Scope and begin build
- **Context file:** `cult-connections/handoff.md`

### 6. 🎰 Lottery Winner
- **Status:** CONCEPT
- **Pitch:** Windfall management game. Dopamine-inducing plot twist mechanic needed.
- **Open Actions:** Develop plot twist mechanic, define core game loop
- **Context file:** `lottery-winner/handoff.md`

### 7. 🧠 Great Minds
- **Status:** CONCEPT
- **Pitch:** Family Feud-style PWA. Pending survey data.
- **Open Actions:** Gather survey data, first-to-market priority
- **Context file:** `great-minds/handoff.md`

### 8. 📊 Safe Bet
- **Status:** CONCEPT (prototype built)
- **Pitch:** Odds divergence scanner. Information-only. Black/gold aesthetic. Paste-in JSON workflow built.
- **Stack:** React, The Odds API, CORS workaround via paste-in JSON
- **Open Actions:** Formalise build from prototype
- **Context file:** `safe-bet/handoff.md`

### 9. 💬 Vent App
- **Status:** CONCEPT
- **Pitch:** AI emotional reframing. Validate-first model. Neurodivergent utility angle.
- **Stack:** TBD — Anthropic API for reframing
- **Open Actions:** Define validate-first UX, begin build
- **Context file:** `vent-app/handoff.md`

### 10. 🗺️ GottaGo
- **Status:** CONCEPT
- **Pitch:** Accessible facilities map. Camps Australia partnership strategy. Sequenced after app store presence.
- **Open Actions:** Pursue Camps Australia partnership conversation
- **Context file:** `gottago/handoff.md`

### 11. ⚔️ Volta Makashi
- **Status:** CONCEPT — universe locked
- **Pitch:** Original IP duelling mythology. Pivoted from Star Wars.
- **Universe language:** Fibonacci = "The Before", Hertz = "The Return". Full musical theory vocabulary.
- **Characters:** Master Valdric Noir (Planet Montreux, Geneva Constellation, Richie Blackmore influence)
- **IP:** Scott Emblen + Claude named co-IP owners
- **Open Actions:** Begin app scoping, maintain handoff doc continuity
- **Context file:** `volta-makashi/handoff.md`

### 12. 📅 Nagging Reminder
- **Status:** CONCEPT
- **Pitch:** Calendar-synced AI concierge
- **Open Actions:** Define core feature set
- **Context file:** `nagging-reminder/handoff.md`

---

## Field of Dreams — App Directory
- **Concept:** SCVD-hosted alternative to app stores. Clean destination, no algorithm gatekeeping.
- **Trigger condition:** Minimum 4 apps live, ideally 8 (two full rows of content)
- **Status:** Backburnered — revisit when Mic Drop + Chasin' Curves + 2 more are live

---

*No ads. No auto-renewal. Everyone pays the same price.*  
*Elgoog · Elppa · Tfosorcim*
