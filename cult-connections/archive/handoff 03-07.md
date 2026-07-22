# Cult Connections — Project Handoff

**Session:** 1 (migration from Claude artifact to SCVD-App pattern)
**Date:** 4 July 2026
**Status:** BETA — ready for GitHub, not yet deployed, no Stripe/worker live yet
**Version:** v9

---

## Overview

Pop culture Connections-style trivia game. Migrated from a standalone Claude artifact (7 prior iterations) into the SCVD GitHub Pages + Cloudflare Worker pattern, matching Mic Drop / ECEG / Chasin' Curves.

## Stack

Vanilla JS single-file split into `index.html` + `app.js`, no build tools, no React (unlike Chasin' Curves — this one never needed component state complexity). Cloudflare Worker planned for payment/token verification only — **not yet built**.

---

## What changed this session (v7 artifact → v9)

### Content bug fixes
- Seinfeld fallback bank: "Merv Griffin set" was wrongly attributed to Newman (it's Kramer's scheme) — fixed in both `scott` and `seinfeld` banks
- "George's real jobs" wrongly listed Vandelay Industries (his fake company) as a real job — replaced with Real Estate Broker / NY Yankees / Play Now Sporting Goods / Kruger Industrial Smoothing
- Kath & Kim pack: "Dragons Abreast" appeared as both a location and a hobby in the same puzzle — kept under hobbies only
- Verified with a scripted same-puzzle duplicate scanner — clean

### Content model change — live AI generation removed entirely
- Previously: player could paste an Anthropic API key to get infinite live-generated puzzles via `api.anthropic.com`, falling back to 25 static puzzles if no key
- **Now:** no live generation, no API key input anywhere in the app. All puzzles come from the static `FALLBACK_BANKS` object
- Reasoning: removes the need for a player-held API key (never viable for a public product), removes per-user inference cost, removes the risk of AI-generated cross-contamination bugs shipping live. Trade-off accepted: content freshness now depends on manual authoring instead of infinite generation
- `POOLS` (the old AI-prompt theme list) is kept in the code as a **content backlog checklist**, not live logic — it's dead code functionally, but useful as a list of themes to hand-author into real puzzles

### New content — theme backlog only, NOT yet built as real puzzles
Added to `POOLS` as theme ideas for the next authoring cycle, split by generation (the existing `scott`/`kids`/`mixed` player buckets are being reused as the Gen X / Gen Z split rather than building new tagging infrastructure):
- **`scott` pool (Gen X):** 80s/90s tennis (Cash, McEnroe, Agassi, Sampras), classic F1 (Senna, Prost, Mansell), retro sportswear (Reebok/Nike/Adidas/Puma)
- **`kids` pool (Gen Z):** modern tennis, modern F1 / Drive to Survive, streetwear/sneaker culture
- **`mixed` pool:** Big Four tennis, brand logos, equipment (racquets/bats) as a smaller/harder category
- **IMPORTANT: none of this exists as actual playable puzzles yet.** These are prompt-style theme strings, not `FALLBACK_BANKS`-format puzzle objects. First real content task is converting these into full hand-authored, QA'd puzzles.

### Monetization — designed this session, not yet implemented
- **Model:** 30-day full-access free trial (all content), then reverts to the 25 original fallback puzzles for free forever. One-time (non-recurring) purchase restores full access for a fixed duration
- **Tiers** (mirrors ECEG's one-time-purchase pattern, not Mic Drop's subscription pattern):

| Tier | Duration | Price |
|---|---|---|
| Square Eyes | 1 month | $1.50 USD |
| Couch Potato | 6 months | $7.50 USD |
| Pop Culture Vulture | 12 months | $10.00 USD |

- No "forever" tier for now — parked pending a possible future multi-app bundle (see Future Ideas below)
- Trial clock: `localStorage` timestamp only, no backend, no enforcement against clearing site data/reinstalling — acceptable honour-system gate at this stage, not real security
- **Not yet built:** Stripe Price IDs (need 3 new ones created against a *new* Cult Connections product — cannot reuse ECEG's IDs even at matching amounts), Cloudflare Worker (`/create-checkout`, `/verify-token`, webhook, KV namespace), actual token format (planned to mirror ECEG's `cc_[tier]_[days]_[nonce]_[hmac32]` pattern)
- `app.js` already has the client-side scaffold wired and waiting: `CC_TIERS`, `getAccessState()`, `redeemToken()`, `purchaseTier()`, purchase screen UI. It currently points at a placeholder worker URL (`cult-connections.emblen-scott.workers.dev`) that doesn't exist yet.

### Content freshness cadence — decided, not yet operationalised
- Public commitment: new content pack every **90 days**
- Internal stretch goal only, never promised publicly: 30 days
- Target volume per pack: roughly 40–60 new puzzles (not yet built)
- "Great Minds" (a separate, unbuilt Family Feud-style survey concept once discussed for trend-sourcing content) — explicitly parked. Not part of this app. Revisit only as part of 90-day content planning discussions, not as a build item.

---

## Open Actions (in rough priority order)

| # | Task |
|---|------|
| 1 | Create Cloudflare Worker `cult-connections` (mirror ECEG's worker pattern: Stripe checkout, webhook, HMAC token, KV) |
| 2 | Create 3 new Stripe Price IDs for CC's own product (Square Eyes / Couch Potato / Pop Culture Vulture) |
| 3 | Wire real worker URL into `app.js` (`CC_WORKER` constant, currently a placeholder) |
| 4 | Hand-author first real Sport + Fashion puzzle packs from the `POOLS` theme backlog |
| 5 | Push `index.html` + `app.js` to GitHub Pages under SCVD-App org |
| 6 | Get Steve (Ireland) testing post-deploy for UK/Ireland cultural fit on the existing content |
| 7 | Decide fate of a possible cross-app bundle deal (3-4 games, $50–100 one-time) — deferred until 4+ apps are live and the "Field of Dreams" directory site exists. Would need shared entitlement/auth, not CC-specific — do not build CC-specific SSO |

---

## Known Limitations

| Issue | Notes |
|-------|-------|
| Trial clock is client-side only | Resettable by clearing site data / reinstalling — acceptable at current stage, not real enforcement |
| No backend yet at all | App is currently 100% static — Worker doesn't exist, so purchase flow is UI-only until built |
| Sport/Fashion "content" is prompts, not puzzles | Nothing playable exists for these categories yet — see Open Actions #4 |
| POOLS object is now dead code functionally | Kept intentionally as an authoring checklist — don't delete without converting entries to real puzzles first |

---

## Future Ideas (explicitly parked, not scheduled)

- **Cross-app bundle** — 3-4 SCVD games for $50–100 one-time, tied to the "Field of Dreams" directory milestone (4+ live apps) already in the master roadmap. Requires shared entitlement/auth across apps — do not build for CC alone.
- **Domain-level SSO (auth.scvd.app)** — evaluated for CC this session and deliberately deferred. Real justification for it is protecting Mic Drop's subscription revenue and enabling the future bundle, not CC's low-stakes single-purchase model.
- **"Great Minds" survey/trend engine** — crowd-sourcing cultural relevance data from CC's players for future content decisions. Low priority. Would require a backend, which cuts against CC's current static-hosting choice — only worth reopening if this becomes a real cross-app initiative, not a CC-only feature.
- **Cosmetic-only IAP** (tile themes/skins) — raised as a lower-friction alternative to gating during discussion, not chosen, but worth remembering as an option if the trial/tier model underperforms.

---

## Brand/Content Notes

- Target audience: Gen X and Gen Z, Australia/UK/Ireland — deliberately using "UK" rather than "Britain" to stay inclusive of Scotland/Wales/Ireland-adjacent references
- Generational content split reuses existing `scott`/`kids`/`mixed` player-profile buckets rather than new tagging infrastructure
- SCVD integrity model applies: no ads, no auto-renewal, everyone pays the same price
