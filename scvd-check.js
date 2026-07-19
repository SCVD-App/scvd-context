#!/usr/bin/env node
/**
 * scvd-check.js — SCVD regression guard
 *
 * Checks a deployed source file (e.g. index.html) against a manifest of
 * known-good markers: exact strings that should exist in the file if a
 * given fix or feature is genuinely present. Run this after any deploy,
 * or any time you suspect something that used to work has quietly regressed.
 *
 * Usage:
 *   node scvd-check.js <file> <manifest.json>
 *   node scvd-check.js <file> <manifest.json> --history   (uses git log -S to find when a FAIL was last present, if run inside the repo)
 *   node scvd-check.js <file> <manifest.json> --json       (machine-readable output)
 *
 * Manifest format (see *-manifest.json examples):
 * [
 *   { "id": "short-id", "label": "Human description", "marker": "exact string to find", "category": "optional grouping" }
 * ]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function usage() {
  console.log('Usage: node scvd-check.js <file> <manifest.json> [--history] [--json]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();

const filePath = args[0];
const manifestPath = args[1];
const wantHistory = args.includes('--history');
const wantJson = args.includes('--json');

if (!fs.existsSync(filePath)) {
  console.error('File not found: ' + filePath);
  process.exit(1);
}
if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found: ' + manifestPath);
  process.exit(1);
}

const source = fs.readFileSync(filePath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function findLastCommitWithMarker(marker, file) {
  try {
    // -S does a literal (pickaxe) search for the string across history, not a diff-regex search
    const out = execSync(
      `git log -S${JSON.stringify(marker)} --oneline --follow -- ${JSON.stringify(file)}`,
      { cwd: path.dirname(path.resolve(file)) || '.', encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (!out) return 'no commit found containing this string (never existed, or git history unavailable here)';
    const lines = out.split('\n');
    return lines.length + ' commit(s) touched this string. Most recent: ' + lines[0];
  } catch (e) {
    return 'git history check failed (not a git repo, or git not available here)';
  }
}

const results = manifest.map(function (entry) {
  var pass, foundText;
  if (entry.mustNotContain) {
    pass = source.indexOf(entry.mustNotContain) === -1;
    foundText = entry.mustNotContain;
  } else {
    pass = source.indexOf(entry.marker) !== -1;
    foundText = entry.marker;
  }
  const result = { id: entry.id, label: entry.label, category: entry.category || 'general', pass: pass, mode: entry.mustNotContain ? 'absence' : 'presence' };
  if (!pass && wantHistory) {
    result.history = findLastCommitWithMarker(foundText, filePath);
  }
  return result;
});

const passed = results.filter(function (r) { return r.pass; });
const failed = results.filter(function (r) { return !r.pass; });

if (wantJson) {
  console.log(JSON.stringify({ file: filePath, manifest: manifestPath, total: results.length, passed: passed.length, failed: failed.length, results: results }, null, 2));
  process.exit(failed.length > 0 ? 1 : 0);
}

console.log('');
console.log('SCVD Regression Check');
console.log('File:     ' + filePath);
console.log('Manifest: ' + manifestPath);
console.log('='.repeat(60));

const byCategory = {};
results.forEach(function (r) {
  byCategory[r.category] = byCategory[r.category] || [];
  byCategory[r.category].push(r);
});

Object.keys(byCategory).forEach(function (cat) {
  console.log('');
  console.log(cat.toUpperCase());
  byCategory[cat].forEach(function (r) {
    const mark = r.pass ? '✅' : '❌';
    console.log('  ' + mark + '  ' + r.label + (r.id ? '  [' + r.id + ']' : ''));
    if (!r.pass && r.mode === 'absence') {
      console.log('       ↳ REGRESSED: the buggy code has been reintroduced');
    }
    if (!r.pass && r.history) {
      console.log('       ↳ ' + r.history);
    }
  });
});

console.log('');
console.log('='.repeat(60));
console.log(passed.length + '/' + results.length + ' checks passed.');
if (failed.length > 0) {
  console.log('');
  console.log(failed.length + ' REGRESSION(S) DETECTED:');
  failed.forEach(function (r) { console.log('  - ' + r.label); });
  console.log('');
  console.log('Re-run with --history to find which commit dropped each one (requires running inside the git repo).');
}
console.log('');

process.exit(failed.length > 0 ? 1 : 0);
