# SCVD Apps — Master Timeline

**Last Updated:** 24 August 2026  
**Updated by:** Scott Emblen + Claude

**This update:** Chasin' Curves' one real go-live blocker — the compliance day-cap counting model — just got smaller. NT's rolling-vs-anchored question is confirmed straight from its own guidelines (anchored to rego renewal, not rolling) and shipped as a dual-counter model that runs both counting methods side by side, selected automatically by the vehicle's registration state. TAS's day cap is confirmed too (104 days); only its window model, and the same question for NSW/ACT/SA/VIC, remains open — now a research/phone-call task, not a build. Also: GottaGo's original working prototype and business/partnership package, built in a pre-GitHub session and thought lost, were recovered and filed into `gottago/` for the first time. See `chasin-curves/handoff.md` (Session 16) and `gottago/handoff.md` for full detail.

**Prior update (16 Aug 2026):** Retired Safe Bet (no commercial angle, not Scott's world). Added the Ancient Games series as its own project line — three apps, four games, shipped in the time it used to take to get one concept to beta. Reprioritised: Chasin' Curves is next, then GottaGo.

---

## Portfolio At A Glance

| # | App | Status | Priority | Target |
|---|-----|--------|----------|--------|
| 1 | 🚗 Chasin' Curves | BETA | 🔴 P1 — **NEXT UP** | TBD |
| 2 | 🗺️ GottaGo | CONCEPT | 🔴 P1 — **queued after Chasin' Curves** | TBD |
| 3 | 🔧 TGM (Tame Grease Monkey) | IN DEV | 🔴 P1 | Travels with Chasin' Curves |
| 4 | 🎤 Mic Drop | LIVE | 🟠 P2 | Live — chasing P1 audio bugs |
| 5 | 🚘 CITT / Maverick (James Claude) | IN DEV | 🟠 P2 | TBD |
| 6 | 🏛️ Ancient Games Series | LIVE — 3 apps, 4 games shipped | 🟠 P2 | 05–07 planned, no date set |
| 7 | 📺 Cult Connections | LIVE | 🟠 P2 | Live, active bug list |
| 8 | 🎰 Lottery Winner (Easy Come Easy Go) | LIVE | 🟠 P2 | Live |
| 9 | 🧠 Great Minds | CONCEPT | 🟡 P3 | TBD |
| 10 | 💬 Vent App | CONCEPT | 🟡 P3 | TBD |
| 11 | ⚔️ Volta Makashi | CONCEPT | 🟡 P3 | TBD |
| 12 | 📅 Nagging Reminder | CONCEPT | 🟡 P3 | TBD |

**Retired:** 📊 Safe Bet — see [Retired Projects](#retired-projects) below.

> Statuses for #4, #6, #7, #8 above are pulled from what's actually live on scvd.app and each folder's own handoff — they were still marked CONCEPT/SOFT LAUNCH in the previous version of this file, which had drifted well behind reality. Great Minds / Vent App / Volta Makashi / Nagging Reminder statuses were checked against their handoff stubs on 16 Aug 2026 and are still genuinely CONCEPT — no drift there.

---

## Release Roadmap

| Period | Milestone |
|--------|-----------|
| Next up | 🚗 Chasin' Curves — resume active development |
| Then | 🗺️ GottaGo |
| Ongoing | 🔧 TGM continues alongside Chasin' Curves |
| Live already | 🎤 Mic Drop · 🏛️ Ancient Games Series (Jumpin' Pin, Two Ancient Classics, Hnefatafl) · 📺 Cult Connections · 🎰 Lottery Winner (ECEG) |
| No committed date | 🚘 CITT/Maverick · Ancient Games 05–07 (Pachisi, Patolli, Go) · 🧠 Great Minds · 💬 Vent App · ⚔️ Volta Makashi · 📅 Nagging Reminder |
| Trigger condition met | 🌾 Field of Dreams app directory — see note under Field of Dreams below |

---

## Project Details

### 1. 🚗 Chasin' Curves
- **Status:** BETA — **next project up, one narrowing blocker from a defensible public launch**
- **URL:** https://scvd-app.github.io/Chasin-Curves/ *(confirm URL)*
- **Stack:** Vanilla React, Cloudflare Worker backend, GitHub Pages, Mapbox planned
- **Open Actions:** Confirm TAS's (and NSW/ACT/SA/VIC's) day-cap window model — the last piece of compliance hardening, now a research/phone-call task rather than a build; set Registration State + rego renewal date on Scott's five test vehicles; Murphy Report UI + Roads GPX extraction (post-launch, master-plan phase 3)
- **Beta testers:** Shane "Skeeny"; Sandy & Dave (aunty + husband, 5-week/~7,000km caravan trip, GPS trail + daily share-card live test)
- **Context file:** `chasin-curves/handoff.md`

### 2. 🗺️ GottaGo
- **Status:** PROTOTYPE BUILT, PRE-DEVELOPMENT — **queued right after Chasin' Curves.** A working browser prototype and full business/partnership package already exist from a pre-GitHub session; recovered and filed 23–24 Aug 2026 so they aren't lost track of again.
- **Pitch:** Route-aware public toilet locator. Tagline "Never Be Caught Short." Camps Australia partnership strategy. Sequenced after Chasin' Curves' app store presence.
- **Open Actions:** Architecture decision (solo build / technical co-founder / paid developer) — gates the technical track; admin & partnerships track (ABN, ASIC, trademark filing, patent conversation, Camps Australia letter) can run now in parallel, zero dev time
- **Context file:** `gottago/handoff.md`

### 3. 🔧 TGM (Tame Grease Monkey)
- **Status:** IN DEV — embedded within Chasin' Curves
- **Tiers:** The Record (free specs/rego), The Logbook (free service history), The Guides (Pro AI)
- **Personas:** The Mechanic (precise/scientific), The Maverick/James Claude (deadpan shed companion)
- **Built:** Guide #001 (BMW E85 Z4 bonnet bump stop). Guide #002 (Z4 door lock actuator) research complete
- **Open Actions:** Build Guide #002, implement Workshop Mode (hands-free, voice-interactive, safety photo gate)
- **Context file:** `tgm/handoff.md`

### 4. 🎤 Mic Drop
- **Status:** LIVE — real Stripe payments confirmed
- **URL:** https://scvd-app.github.io/Mic-Drop/
- **Invite URL:** https://scvd-app.github.io/Mic-Drop/invite.html
- **Open Actions:** iOS mimeType bug, PWA home-screen silence, mic-loss distortion (see handoff for full P1/P2/P3 list)
- **Context file:** `mic-drop/handoff.md`

### 5. 🚘 CITT / Maverick (James Claude)
- **Status:** IN DEV
- **Stack:** Standalone HTML, citt-proxy Cloudflare Worker
- **Voices:** 11 characters — James Claude, HAL 9000, KITT, Terminator, RoboCop, Hans Gruber, Dr House, Bond, Goldblum, Nicholson, Arnie/Rocky
- **Persona:** Daniel Craig/George Clooney deadpan. Canonical response to unanswerable: "Because Stone Cold said so."
- **Phases:** 1 = working companion, 2 = route/GPS/weather, 3 = native app, 4 = AI call screening
- **Open Actions:** Resolve voice fallback issue (Chrome DevTools console check)
- **Context file:** `citt-maverick/handoff.md`

### 6. 🏛️ Ancient Games Series
- **Status:** LIVE — three apps, four games shipped: Jumpin' Pin (01), Royal Game of Ur + Nine Men's Morris bundled as Two Ancient Classics (02 + 03), Hnefatafl (04). Three more numbered and researched, not yet built: Pachisi (05), Patolli (06), Go/Weiqi (07).
- **Pace note, worth keeping on record:** the whole series started from a single idea — the initial spark for Ancient Games struck only **10 days** before the third app (Hnefatafl) went live with a full AI opponent, Challenge mode, and real Stripe monetisation, on top of the two apps that shipped before it in that same window. That's a genuine step up in team velocity, not a one-off lucky session.
- **Why it's moving this fast — shared design system:** all four titles share the same Ancient Games visual language (the Sandbar Gold / Deep Channel / Chasin' Curves Pro tones, the `IntroCrawl` component, the freemium-quota pattern, the Stripe Worker pattern) built once and reused rather than rebuilt per game. Each new title in the series is now closer to "reskin + new ruleset" than "build from scratch," which is the real reason the pace has held — worth treating as the template for how future SCVD series should be built, not just an Ancient Games-specific trick.
- **Quality trend:** each entry in the series has shipped with more polish than the last (Jumpin' Pin's Pro tones → ported into Hnefatafl's board and share-card visual identity, share-card fallback logic, runic border typography, king-freedom AI eval) — capability and craft have both been climbing together, not just output volume.
- **Open items:** Ur's AI approach (dice-aware search vs. plain minimax) needs deciding; Ancient Games 05–07 (Pachisi, Patolli, Go) are researched and numbered but not yet built — Go in particular is flagged as its own standalone research spike given the AI difficulty (see roadmap).
- **Context files:** `ancient-games/roadmap.md` (series-wide numbering + 05–07 research), `jumpin-pin/handoff.md`, `two-ancient-classics/handoff.md`, `hnefatafl/handoff.md`

### 7. 📺 Cult Connections
- **Status:** LIVE — playable, monetisation tiers named (Square Eyes / Couch Potato / Pop Culture Vulture)
- **Pitch:** Pop culture trivia PWA. Kath & Kim anchor demographic. Est. ~100k verbatim-quoters in Australian market. Strong local angle.
- **Open Actions:** Puzzle-repetition bug (see handoff — shuffle function naming collision, fix identified not yet confirmed live), build the Cloudflare Worker + Stripe Price IDs for the three tiers
- **Context file:** `cult-connections/handoff.md`

### 8. 🎰 Lottery Winner (Easy Come Easy Go / ECEG)
- **Status:** LIVE
- **Pitch:** Windfall life-simulator — land the big win, then invest it, blow it, or lose it.
- **Context file:** `lottery-winner/eceg-handoff.md`

### 9. 🧠 Great Minds
- **Status:** CONCEPT
- **Pitch:** Family Feud-style PWA. Pending survey data.
- **Open Actions:** Gather survey data, first-to-market priority
- **Context file:** `great-minds/handoff.md`

### 10. 💬 Vent App
- **Status:** CONCEPT
- **Pitch:** AI emotional reframing. Validate-first model. Neurodivergent utility angle.
- **Stack:** TBD — Anthropic API for reframing
- **Open Actions:** Define validate-first UX, begin build
- **Context file:** `vent-app/handoff.md`

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

## Retired Projects

### 📊 Safe Bet — retired 16 August 2026
- **Was:** Odds divergence scanner / arbitrage betting tool. Information-only, black/gold aesthetic, React + The Odds API, paste-in JSON workaround for CORS. Prototype only — per its own handoff, no build was ever started beyond the prototype.
- **Why retired:** Scott's call — no clear commercial application for it, and it's not an area he has personal interest in ("not a betting man"). Not a technical failure, just doesn't belong in the portfolio going forward.
- **Disposition:** Not being actively deleted from GitHub — `safe-bet/handoff.md` stays as historical record — but it's off the roadmap and shouldn't be picked up again without a deliberate decision to revisit.

---

## Field of Dreams — App Directory
- **Concept:** SCVD-hosted alternative to app stores. Clean destination, no algorithm gatekeeping.
- **Trigger condition:** Minimum 4 apps live, ideally 8 (two full rows of content)
- **Status:** **Trigger condition already met.** Live count as of 16 Aug 2026: Mic Drop, Jumpin' Pin, Two Ancient Classics, Hnefatafl, Cult Connections, Lottery Winner (ECEG) — six apps, likely more once Chasin' Curves reaches full launch. Still not scheduled — Scott's stated priority right now is Chasin' Curves then GottaGo — but worth a deliberate decision on when to revisit rather than leaving it as "backburnered until 4 apps live" when that bar has already been cleared.

---

*No ads. No auto-renewal. Everyone pays the same price.*  
*Elgoog · Elppa · Tfosorcim*
