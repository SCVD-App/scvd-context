# Chasin' Curves — Project Handoff

**Session:** 9  
**Date:** 26 June 2026  
**Status:** BETA

---

## Overview

Road enthusiast community PWA. Garage section per-user with KV key `garage:memberId`. Scott's five-vehicle fleet confirmed working. Beta tester Shane "Skeeny" identified multi-user account isolation needed.

## Stack

Vanilla React, Cloudflare Worker backend, GitHub Pages. Mapbox/Google Maps planned to replace state filter.

## Open Actions

| # | Task |
|---|------|
| 1 | Multi-user account isolation fix |
| 2 | Community roads — shared, uploader credited via createdBy + avatar |
| 3 | Zoomable map (Mapbox/Google) replacing state filter |
| 4 | Flat earth map Easter egg |
| 5 | Shareable garage links via query param |

## Scott's Fleet (Test Data)

BMW Z4 E85 Imola Red, Jaguar XJ8 X350, LandCruiser, 1995 Mustang 3200 boat, [5th vehicle TBC]

## TGM Integration

TGM (Tame Grease Monkey) is the workshop intelligence depth layer within Chasin' Curves. See `tgm/handoff.md`.

## Content Brand

- Instagram: @ChasinCurves
- Email: chasincurves@gmail.com
- Tagline: "Roads, rivers & riffs."
- Brand kit: Cormorant Garamond + Josefin Sans, Midnight #0d0d0d, Champagne #C9A84C, Monza Red #C0392B, Ocean Blue #2E6DA4, Bone White #f5f3ee

## Beta Testers

| Tester | Status | Notes |
|--------|--------|-------|
| Shane "Skeeny" | ✅ Active | Found multi-user isolation bug |
