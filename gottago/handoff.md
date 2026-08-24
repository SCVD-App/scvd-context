# Project Handoff

**Session:** 10
**Date:** 23 August 2026
**Status:** PROTOTYPE BUILT, PRE-DEVELOPMENT — a working browser prototype and a full business/partnership package already exist from a Claude session that predates this repo's GitHub workflow. Recovered and filed here today so it isn't lost track of again.

---

## Overview

GottaGo is a route-aware, real-time public toilet locator for navigation apps — the pitch is that no existing GPS app tells drivers where to stop for a toilet. Tagline: "Never Be Caught Short." Target market: over-50s, grey nomads, families with young kids, pregnant women, and people with bladder/bowel conditions. Primary platform planned as Google Play (Android first, iOS to follow).

This project has real momentum from an earlier working session, but that session predated the scvd-context/GitHub process, so none of it made it into version control until today — Scott dug up everything he still had and dropped it straight into this folder.

## What's In This Folder

- `gottago-beta-v2.html` — **primary beta app.** Real GPS (with a "demo mode · Brisbane CBD" fallback), Leaflet + OpenStreetMap + Stadia dark tiles, 35 real SE Queensland government facilities embedded. Sonar wedge UI bottom-left (radar-pulse button, five urgency levels from 😎 to 🚨, isosceles wedge narrowing at calm and widening at emergency), bottom nav (Map / Nearby / Rate / Voice), nav-lights FAB (🚦) bottom-right. Confirmed rendering correctly — screenshot on file.
- `gottago-beta.html` — beta v1, kept as reference.
- `gottago-app-v2.html` — full interactive concept demo covering all designed features.
- `gottago-gap-demo.html` — the Camps Australia partnership pitch demo: toggles between 19 council-only facilities (3 dead zones) and 50 facilities with Camps AU data layered in (zero gaps). This is the single best asset for the partnership conversation.
- `GottaGo-Proposal.docx` — full 9-section partnership proposal for Camps Australia, send-ready.
- `GottaGo-Session-1.docx` — session 1 summary from the original build.

**Referenced in the recovered project email but not present in this folder** — worth tracking down if Scott still has them anywhere: `gottago-revenue-v2.html` (interactive revenue model, live sliders, 5-year projections) and `gottago-revenue-model.html` (v1 reference).

## Key Features Designed & Built

- **Smart Sonar** — radar-pulse activation button; scan speed tied to urgency; five urgency levels filter results by quality rating and distance.
- **Port/Starboard Nav Flash** — full-screen edge pulses (left = red, right = green) for upcoming turns, pulse frequency increasing as the turn approaches (500m slow → 20m rapid); flagged as potentially patentable, tucked behind a FAB submenu to preserve screen space.
- **House of Lords Rating Scale** — 🏛️ House of Lords → 👑 Throne Room → 🚻 The Loo → ⛽ Servo Stop → ⚠️ Thunderbox.
- **Six Voice Avatars** — Bazza, Reginald, Morag, Seamus, Gran, Randy — each with urgency-matched scripts.
- **Route Modes** — Quick Dash (short trips) and Long Haul (full trip planning, gap alerts, vehicle type, accessible/baby filters).

## Data Strategy

- Current beta data: Australian Government National Public Toilet Map (toiletmap.gov.au / data.gov.au) — 19,000+ facilities nationally, free for derivative products. 35 real SE QLD facilities embedded in the beta.
- Strategic data partner target: **Camps Australia Wide** (Heatley & Michelle Gilmore, Rainbow Beach QLD) — 15,500+ human-verified highway/regional sites, ~200,000 app subscribers, existing licensing deals with GPSOz and Hema Maps. WikiCamps' recent acquisition by a caravan park chain is framed as an opening for an independent alternative.
- Proposed deal terms: free 12-month GottaGo Pro for current Camps AU premium members, a tracked 50%-off link for their subscribers, 12% net revenue share, $3,000/yr minimum guarantee, "Camps AU Verified" badge, quarterly reporting with audit rights, review at 25,000 active users, 2-year term with 90 days exit notice.

## Subscription Model

- Free — map view, nearest loo, basic ratings.
- GottaGo Plus — $4.99/mo or $39.99/yr — route planning, Long Haul mode, gap alerts, 2 avatars, Camps AU data, offline.
- GottaGo Pro — $7.99/mo or $59.99/yr — all avatars, House of Lords ratings, accessibility/baby filters.
- Fleet/Organisation — $199–$999/yr — white-label, API, multi-user.

## Mapping & Infra

Recommended platform: Mapbox — free up to 25,000 MAU, ~$0.22/user/month beyond that. Beta currently runs on Leaflet + OpenStreetMap + Stadia dark tiles, free, no API key.

## Legal & Registration (priority order)

1. ABN registration (free) — before ASIC.
2. Business name with ASIC ($42/yr or $98/3yr).
3. Trademark search + filing with IP Australia, Classes 9 & 38 (~$500–2,000, 7+ months).
4. Patent conversation re: port/starboard nav flash, before wider public exposure.
5. Company registration (Pty Ltd, $611) — once taking on partners/investors.

## Development Path

All UI design, logic, data sourcing, and feature specs are already done — a developer or co-founder inherits a finished blueprint, not a blank page. Cost ranges surveyed: AU senior dev $80–150/hr (~$40–80k MVP), Eastern European freelancer $40–60/hr (~$20–35k), Upwork $25–45/hr (~$15–25k), or a technical co-founder on equity (recommended — pitch via River City Labs Brisbane, Fishburners, or CoFoundersLab).

## Open Actions

| # | Task |
|---|------|
| 1 | Track down the two missing revenue-model HTML files if Scott still has them anywhere |
| 2 | ABN + business name registration with ASIC |
| 3 | Trademark search for "GottaGo" at IP Australia before filing |
| 4 | Draft and send the Camps Australia partnership letter (proposal doc already send-ready) |
| 5 | Begin technical co-founder search |
| 6 | Patent conversation re: port/starboard nav flash |
| 7 | Commission app icon artwork |
| 8 | Google Play developer account registration |
| 9 | Roadmap idea from Chasin' Curves (23 Aug 2026): port its Logbook + "Share a Day" trip-postcard feature into GottaGo once development resumes — a natural fit given GottaGo's own grey-nomad/caravanning audience |

## Filing Note

This folder was a stub (Session 9, 26 June 2026, "no build started") until today — the prototype and business assets above were actually built in an earlier Claude session that predated the scvd-context/GitHub workflow, so they existed only in that session's chat history and an email until Scott recovered and filed them here. Nothing in this folder has been pushed to any live hosting or app store yet.
