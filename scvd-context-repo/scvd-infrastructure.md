# SCVD Infrastructure Reference

**Last Updated:** 26 June 2026 — Session 9

---

## GitHub

| Item | Detail |
|------|--------|
| Org | SCVD-App |
| Frontend pattern | Single-file index.html on GitHub Pages — no build tools |
| Context repo | SCVD-App/scvd-context (this repo) |
| Mic Drop repo | SCVD-App/Mic-Drop |
| Chasin' Curves repo | SCVD-App/Chasin-Curves *(confirm)* |

---

## Cloudflare

| Item | Detail |
|------|--------|
| Account | emblen.scott@gmail.com |
| Active Workers | micdrop, citt-proxy |
| Domain | scvd.app (Cloudflare Registrar) |
| Email sender | noreply@scvd.app (Resend) |
| Email support | support@scvd.app (ACTION: set up Session 9) |
| wrangler.toml | NEVER commit to any repo — keep outside GitHub folder always |

---

## Stripe

| Item | Detail |
|------|--------|
| Mode | Sandbox → LIVE (flipping Session 9 tonight) |
| Mic Drop tiers | $2.99/1mo, $7.99/3mo, $14.99/6mo, $24.99/12mo |
| Token format | `micdrop_[type]_[days]_[hmac32]` |
| Webhook | Cloudflare Worker /webhook route |

---

## Third-Party APIs

| Service | Used In | Notes |
|---------|---------|-------|
| AudD | Mic Drop | Song identification. Studio recordings only — live versions unreliable |
| Anthropic API (Haiku) | Mic Drop /coaching route | AI vocal coaching feedback |
| Resend | Mic Drop | Token email delivery via noreply@scvd.app |
| The Odds API | Safe Bet | Paste-in JSON workaround for CORS |
| Mapbox / Google Maps | Chasin' Curves | Planned — replacing state filter |

---

## Brand & Monetisation Rules

- No ads in any SCVD app
- No auto-renewal — opt-in only
- Everyone pays the same price — no tiered pricing by region
- No platform tax — web-first, no App Store
- Brand mythology: **Elgoog** (no tracking), **Elppa** (open web), **Tfosorcim** (anti-lock-in)

---

## Key People

| Person | Role | Notes |
|--------|------|-------|
| Scott Emblen | Builder / Owner | Night shift train crew coordinator, Sunshine Coast hinterland |
| Lorna | Partner | Beta tester |
| Madelaine | Daughter | iOS beta tester |
| Lou Ouija | Primary beta tester | Shares with daughter Grace — Stripe live sign-off |
| George | Beta tester | Samsung A17 mic issue — Meta app background lock |
| Corey | Seed contact | Robbie Williams tribute show lead singer |
| Marie | Seed contact | Local open mic circuit |
| Kellie Ashe | Seed contact | Cherry Red, karaoke Brisbane Northside — viral potential |
| Sheridan | Seed contact | Kellie's sister, unwell — home karaoke use case |
| Shane "Skeeny" | Chasin' Curves beta | Identified multi-user isolation bug |

---

## Session History Summary

| Session | Key Achievements |
|---------|-----------------|
| 1–4 | SCVD brand established, Chasin' Curves concept, Z4 coolant overhaul |
| 5–6 | Mic Drop core build — pitch graph, grade system, AudD integration |
| 7 | Stripe integration, HMAC tokens, Resend email, Pro features |
| 8 | React Error Boundary, Bluetooth fix, dual analyser, Drop the Receipts, Music Quiz, Dressing Room |
| 9 (tonight) | Marketing assets, invite.html, OG tags, scvd-context repo, Stripe live flip |
