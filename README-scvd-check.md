# SCVD Regression Check

A dependency-free Node script that checks a deployed source file against a manifest of
known-good markers — exact strings that should (or shouldn't) exist in the file if a given
fix or feature is genuinely present. Run it after any deploy, or any time something that
used to work is behaving like it's regressed.

Grew out of ECEG's "the handoff says it's fixed but the live file disagrees" problem —
this catches that class of drift automatically instead of finding it one playthrough at a time.

## Usage

```bash
node scvd-check.js <file> <manifest.json>              # human-readable report
node scvd-check.js <file> <manifest.json> --json        # machine-readable, for CI/scripts
node scvd-check.js <file> <manifest.json> --history      # for each FAIL, runs git log -S to find
                                                           # which commit last touched that string
                                                           # (must be run from inside the git repo)
```

Exit code is 0 if everything passes, 1 if anything fails — safe to wire into a pre-push
hook or a GitHub Action later if you want this to run automatically.

## Writing a manifest

Each entry is one of two types:

**Presence check** — "this fix/feature should exist":
```json
{
  "id": "short-unique-id",
  "label": "Human-readable description of what this verifies",
  "marker": "exact string that must be found in the file",
  "category": "grouping label for the report"
}
```

**Absence check** — "this bug, once fixed, should never come back":
```json
{
  "id": "short-unique-id",
  "label": "Human-readable description",
  "mustNotContain": "exact string that must NOT be found in the file",
  "category": "grouping label"
}
```

Use absence checks for anything that was fixed by *removing* code (a duplicate charge, a
stray debug flag, a dead double-add) rather than adding it. A presence-only manifest can't
catch someone accidentally reintroducing a deleted bug.

### Marker-writing rules (learned the hard way, first run)

- **Keep markers short and single-line where possible.** Multi-line markers are fragile —
  a single stray space, tab-vs-spaces, or trailing whitespace difference will produce a false
  FAIL even though the code is fine. Prefer the shortest substring that's still uniquely
  identifying.
- **Copy-paste directly from the file**, don't retype from memory — exact spacing around
  colons/commas (`label:"x"` vs `label: "x"`) is a common silent mismatch.
- **Re-run against a known-good file immediately after writing a new entry** to confirm it
  actually matches before trusting it.

## Extending to other apps

This script is app-agnostic — it just needs a manifest. To set one up for Mic Drop, Chasin'
Curves, TGM, or CITT: pull the current deployed file, go through the handoff doc's "✅ Done"
list, and for each item either confirm it's present (write a presence marker) or find what
regression pattern would break it (write an absence marker if it was a bug-removal fix).
Worth doing once per app as a baseline, then it's cheap to keep current — add one entry each
time we fix something new.
