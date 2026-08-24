# scvd.app Landing Page — Handoff

**Session:** 16 (24 August 2026)
**Status:** LIVE at https://scvd.app — filed into scvd-context for the first time this session, previously tracked only in its own separate repo.

## Overview

The portfolio landing page for the whole SCVD suite — a "dispatch board" of every app, split-flap status badges, and the three-signal brand philosophy (Elgoog / Elppa / Tfosorcim). Single-file `index.html`, no build tools, same pattern as every other SCVD app.

## What's In This Folder

- `index.html` — the live page.
- `CNAME` — GitHub Pages custom-domain file, contains `scvd.app`.
- `archive/` — empty for now; follow the same session-end archive convention as every other app folder (copy the outgoing `index.html` here before overwriting, per the repo README).

## Where the real repo lives

This folder is a **read-only mirror for context, not the deployed source.** The actual live repo (with its own `.git`, pushed to GitHub Pages and serving the custom domain via its `CNAME`) lives locally at `C:\Dev\SCVD-WEB` on Scott's machine. Deliberately did **not** copy that folder's `.git` in here — nesting one git repo inside another (this one) causes GitHub Desktop to treat it as an embedded repo and silently mis-track its files. Keep the two in sync manually the same way every other app folder here is kept in sync with its own live repo: copy the file across, don't copy the folder.

## Session 16 change

Added a beta-tester expressions-of-interest link to the Chasin' Curves card. It was previously a plain, non-clickable "Private beta — invite only" label; now that label stays (still an accurate expectation to set) and a `mailto:support@scvd.app` link sits alongside it, styled to match every other card's amber link. No new infrastructure — `support@scvd.app` already existed and was already shown in the footer.

The mailto link pre-fills a subject (`Chasin' Curves Beta Interest`) and a short body asking three things: vehicle rego state, what they drive, how often they get out for a drive. The rego-state question isn't incidental — Session 16's other build (see `chasin-curves/handoff.md`) confirmed NT's compliance day-cap model but left TAS and four other states' window model (rolling vs. anchored) unconfirmed. Real logged trips from testers registered in those states is exactly the data that would help close that gap, so this EOI link doubles as a lightweight way to recruit for it.

**Deliberately scoped as a waitlist, not open signup:** clicking the link doesn't grant access to anything — it just starts an email to Scott, who decides who to invite and when. No onboarding-capacity commitment made by adding this.

## Open Actions

| # | Task |
|---|------|
| 1 | Push the `C:\Dev\SCVD-WEB` change live (this folder just mirrors it — the actual deploy is Scott's call, via GitHub Desktop as usual) |
| 2 | If EOI replies start coming in, decide a rough cadence for actually inviting people, paced to actual spare-moment capacity — not obligated to clear the inbox fast |
| 3 | Consider updating the Maverick card similarly once it's further along, if there's ever a reason to solicit interest there too |
