# CITT / Maverick (James Claude) — Project Handoff

**Session:** 10
**Date:** 30 July 2026
**Status:** IN DEV — hands-free voice loop fully working end-to-end on Scott's phone (desktop test only, no Bluetooth car test yet)

---

## Overview

The live handoff document hadn't been touched since Session 9 (26 June) despite three sessions of substantial work already having happened since (worker rebuild, VOICE_RULES, hands-free mode, mic-pinning port from Mic Drop) — none of that was captured anywhere before this session. This doc covers only what changed *today*; the gap between Session 9 and today's starting point is real but undocumented, and isn't reconstructed here.

Today was almost entirely debugging, not new features: a chain of four real, distinct bugs in the hands-free voice loop, found and fixed one at a time via a live on-device debug log built partway through, since guessing from symptoms alone had stopped being productive.

## What Changed This Session

**1. Voice defaulting to female — root cause found, partially fixed in code, fully fixed on-device.**
`speak()` built a `SpeechSynthesisUtterance` but never set `.voice` — every persona used whatever the browser considered its default voice, which on Android/Chrome was consistently female. Added explicit voice enumeration (`pickVoice()`) with a male-name-hint matching list. Turned out this device's Chrome only reports voices by region (`"English Australia"`, `"English United Kingdom"`, etc.) with no gender in the name at all — so name-matching had nothing to work with, and all 5 "voices" it offered were audibly identical (same underlying model, different locale tags only).

**Actual fix was outside the app entirely:** Android's own TTS engine (Speech Recognition and Synthesis from Google) had a second, genuinely different voice variant bundled under "English Australia" that Chrome's `getVoices()` doesn't expose for direct selection — found via Settings → Text-to-speech output → gear icon next to the engine → voice picker → **Voice 2**. Confirmed male, confirmed matches Scott's mental image of the character.

**Implication for other testers:** this is a per-device OS setting, not something the app can set or detect. Anyone else running Maverick (Griffo, Mark, Marie, etc.) who gets a female voice by default will need to do the same manual steps on their own phone. **Open action below** — needs to go in onboarding or beta instructions, or every new tester repeats today's entire debugging chain unnecessarily.

**2. TTS silently hanging, permanently killing hands-free mode.**
Some Android Chrome builds don't reliably fire `onend`/`onerror` on a `SpeechSynthesisUtterance` — confirmed happening here once `utt.voice` was set to an explicit voice object. Since the hands-free re-arm logic lived entirely inside `onend`, a hung utterance meant the mic never came back on, silently, with no error anywhere. Added a watchdog timeout (~110ms/char, floored/capped 4–20s) that forces the same cleanup and re-arm regardless of whether the browser event ever fires. Also stopped caching the picked voice object across calls — holding a stale reference across an async voice-list reload is a known trigger for this exact hang.

**3. `isListening` getting stuck `true` forever.**
`startListening()` set `isListening = true` before calling `recognition.start()`, but wrapped that call in a bare try/catch that silently swallowed any thrown error. `recognition.start()` throws synchronously on some Android builds if called too soon after a previous session — no events fire when that happens, so without a reset, `isListening` stayed stuck true and `startListening()`'s own re-entry guard then blocked every future attempt. Fixed: catch now resets state and retries after a short delay, with the failure logged instead of silently eaten.

**4. Recognition running but never hearing anything — the big one.**
Even after fixes 2 and 3, recognition would start and end cleanly on a loop with zero errors and zero transcripts. Added finer-grained event logging (`onaudiostart`/`onsoundstart`/`onspeechstart`) to isolate where the pipeline was failing — confirmed audio capture opened fine but no sound was ever detected, regardless of speaking normally at 15cm from the phone.

Root cause: the app holds a `getUserMedia` stream open continuously (`pinnedMicStream`, ported from Mic Drop Session 13, meant to bias Android away from a Bluetooth-connected car mic). `SpeechRecognition.start()` opens its **own independent** capture of the same physical device. Two concurrent raw captures of one mic appears to silently starve one of them on this device — recognition reports every lifecycle event correctly but never receives real samples.

**Fix:** release the pinned stream immediately before `recognition.start()`, so recognition gets exclusive access to the mic while actually listening. Confirmed working — multiple full exchanges transcribed correctly afterward (`"hey mate you hear me OK"`, `"excellent still tinkering on that code I'll check in with you in a minute"`, etc., verbatim).

**Second-order fix, same root cause:** initially had the pin re-acquired immediately after each listen cycle ended, so it'd be ready again before the next one. This held a live mic capture open through the following `speak()` call — and Android's volume overlay started showing a **phone/call icon** rather than the media icon during playback, meaning Chrome had categorised the tab's whole audio session as a communications/call stream rather than media. That's a narrowband, low-quality codec — audible as "breaking up." Removed the automatic re-pin after listening; the pin is now only established once, at hands-free session start.

**⚠️ Not yet validated:** all of today's testing was on Scott's phone at his desk, no Bluetooth device connected at any point. The original reason `pinnedMicStream` exists — biasing Android away from a Bluetooth-connected car's mic — has not been re-tested since today's changes. Removing the continuous re-pin may or may not still provide enough protection against that original problem in an actual Bluetooth-connected car. **Needs Griffo's real commute, or at minimum a real Bluetooth-connected test, before this is considered fully resolved.**

**5. Debug tooling added (currently always-on, not gated).**
- On-screen debug log strip (top of screen) — logs mic pin state, every recognition lifecycle event, TTS voice selection and completion path (`onend` vs watchdog). Mirrors Mic Drop's tester-overlay pattern.
- **TEST VOICES** button (bottom-left) — cycles through every available English voice, speaking each one's own name, so a genuinely different-sounding voice can be identified by ear without redeploying repeatedly.

Both were essential for diagnosing today's chain of bugs entirely from screenshots, without needing remote debugging (`chrome://inspect`) set up. **Open action below** — neither is gated behind a flag; both are visible to any user right now, including real beta testers.

## Open Actions

| # | Task |
|---|------|
| 1 | **Real Bluetooth/car test** (Griffo's commute or equivalent) to confirm the one-time-pin-at-session-start approach still protects against Android routing recognition to a Bluetooth mic, now that continuous re-pinning has been removed |
| 2 | Gate or remove the debug log strip and TEST VOICES button before wider beta rollout — currently visible to every user, not just Scott |
| 3 | Add the per-device voice-selection steps (Settings → Text-to-speech output → engine gear icon → pick a male voice variant if offered) to onboarding or beta tester instructions, so this isn't rediscovered from scratch per tester |
| 4 | Reconcile the Session 9 → Session 10 documentation gap — three sessions' worth of work (worker rebuild, VOICE_RULES, hands-free mode, mic-pinning port) happened without being captured; not reconstructed in this doc, only flagged |
| 5 | Original Session 9 item — "Resolve voice fallback issue" — effectively superseded by today's work, can be closed |

## Infrastructure

Unchanged this session — `worker.js` (Anthropic API proxy, CORS handling) not touched today; all changes were frontend-only (`index.html`). Confirmed repo: `SCVD-App/maverick`, live at `scvd-app.github.io/maverick/`.

## Filing note

Per Scott's standard practice: this supersedes the Session 9 `handoff.md`. Archive the current live one before replacing it with this file, following the same pattern as Mic Drop/Chasin' Curves — paste-replace whole file, confirm the right repo tab is open before pushing.
