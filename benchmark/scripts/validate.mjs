#!/usr/bin/env node
// Structural + metadata validation for benchmark cases.
// Reads every case file, validates frontmatter/body against the rubric
// contract, enforces category minimums and the silence floor, then
// regenerates expected/answers.json.
//
// Deterministic. Exit code 0 = valid, 1 = invalid.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CASES_DIR = join(ROOT, 'cases');
const EXPECTED_DIR = join(ROOT, 'expected');
const ANSWERS_FILE = join(EXPECTED_DIR, 'answers.json');

const CATEGORIES = new Set([
  'security', 'concurrency', 'reliability', 'data-integrity', 'intent',
  'dependencies', 'architecture', 'false-positives', 'self-review', 'lifecycle',
  'maintainability',
]);

// id prefix expected per category directory.
const PREFIX_BY_CATEGORY = {
  security: 'SEC', concurrency: 'CON', reliability: 'REL', 'data-integrity': 'DI',
  intent: 'INT', dependencies: 'DEP', architecture: 'ARC', 'false-positives': 'FP',
  'self-review': 'SR', lifecycle: 'LIF', maintainability: 'MAI',
};

const MODES = new Set(['STRICT', 'BATCH']);
const SEVERITIES = new Set(['BLOCKING', 'WORTH-FIXING', 'NITPICK', 'NO-ISSUE']);
const EVIDENCE = new Set(['CONFIRMED', 'LIKELY', 'UNVERIFIED', 'N/A']);
const INVESTIGATION = new Set(['LOW', 'MEDIUM', 'HIGH', 'VERY-HIGH']);

const REQUIRED_FIELDS = [
  'id', 'category', 'title', 'mode', 'user_request', 'severity_expected',
  'evidence_expected', 'investigation_expected', 'requires_regression_test',
  'primary_finding', 'key_skills',
];

const MIN_PER_CATEGORY = {
  security: 5, concurrency: 4, reliability: 4, 'data-integrity': 3, intent: 4,
  dependencies: 3, architecture: 3, 'false-positives': 4, 'self-review': 3, lifecycle: 2,
  maintainability: 2,
};
const MIN_TOTAL = 30;
const MIN_SILENCE_RATIO = 0.25;

function scalar(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const dq = v.match(/^"(.*)"$/s); if (dq) return dq[1];
  const sq = v.match(/^'(.*)'$/s); if (sq) return sq[1];
  const arr = v.match(/^\[(.*)\]$/s);
  if (arr) return arr[1].split(',').map(s => s.trim()).filter(Boolean);
  return v;
}

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  const obj = {};
  let key = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const m = raw.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (m) {
      key = m[1];
      obj[key] = scalar(m[2].trim());
    }
  }
  return obj;
}

function splitFrontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { fm: null, body: text };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return { fm: null, body: text };
  const fmText = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { fm: parseFrontmatter(fmText), body };
}

function errs(list, msg) { list.push(msg); }
function warn(list, msg) { list.push(`[warn] ${msg}`); }

function readVersion() {
  const v = readFileSync(join(ROOT, 'version.md'), 'utf8');
  const m = v.match(/Current version:\s*\*\*([^*]+)\*\*/);
  return m ? m[1] : 'unknown';
}

export function validateCases() {
  const errors = [];
  const warnings = [];
  const cases = [];

  const catDirs = readdirSync(CASES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);
  for (const cat of catDirs) {
    if (!CATEGORIES.has(cat)) warn(warnings, `unknown category directory: ${cat}`);
    const files = readdirSync(join(CASES_DIR, cat)).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const file = join(CASES_DIR, cat, f);
      const { fm, body } = splitFrontmatter(file);
      if (!fm) { errs(errors, `${file}: missing or malformed YAML frontmatter`); continue; }

      for (const k of REQUIRED_FIELDS) {
        if (fm[k] === undefined || fm[k] === '' || (Array.isArray(fm[k]) && fm[k].length === 0)) {
          errs(errors, `${file}: missing required frontmatter field "${k}"`);
        }
      }

      if (fm.category !== cat) errs(errors, `${file}: category "${fm.category}" does not match directory "${cat}"`);
      if (!CATEGORIES.has(fm.category)) errs(errors, `${file}: unknown category "${fm.category}"`);
      if (!MODES.has(fm.mode)) errs(errors, `${file}: mode "${fm.mode}" not in {STRICT, BATCH}`);
      if (!SEVERITIES.has(fm.severity_expected)) errs(errors, `${file}: bad severity_expected "${fm.severity_expected}"`);
      if (!EVIDENCE.has(fm.evidence_expected)) errs(errors, `${file}: bad evidence_expected "${fm.evidence_expected}"`);
      if (!INVESTIGATION.has(fm.investigation_expected)) errs(errors, `${file}: bad investigation_expected "${fm.investigation_expected}"`);
      if (typeof fm.requires_regression_test !== 'boolean') errs(errors, `${file}: requires_regression_test must be a boolean`);

      if (typeof fm.id === 'string' && !/^[A-Z]{2,4}-\d{2}$/.test(fm.id)) {
        errs(errors, `${file}: id "${fm.id}" must match [A-Z]{2,4}-NN`);
      }
      if (fm.id) {
        const prefix = fm.id.split('-')[0];
        if (PREFIX_BY_CATEGORY[cat] !== prefix) {
          errs(errors, `${file}: id prefix "${prefix}" does not match category "${cat}" (expected ${PREFIX_BY_CATEGORY[cat]})`);
        }
      }

      // Cross-field rules (rubric).
      if (fm.severity_expected === 'NO-ISSUE' && fm.evidence_expected !== 'N/A') {
        errs(errors, `${file}: NO-ISSUE must carry evidence_expected N/A`);
      }
      if (fm.severity_expected === 'NO-ISSUE' && typeof fm.primary_finding === 'string' && !fm.primary_finding.startsWith('none')) {
        errs(errors, `${file}: NO-ISSUE primary_finding must start with "none"`);
      }
      if (fm.severity_expected === 'BLOCKING' && fm.requires_regression_test !== true) {
        errs(errors, `${file}: BLOCKING requires requires_regression_test: true`);
      }
      if (fm.severity_expected === 'NO-ISSUE' && fm.requires_regression_test === true && fm.category !== 'lifecycle') {
        errs(errors, `${file}: requires_regression_test: true on a NO-ISSUE case is only valid for lifecycle cases (a test must be confirmed present)`);
      }
      if (fm.severity_expected === 'NITPICK' && fm.requires_regression_test === true) {
        errs(errors, `${file}: NITPICK must not require a regression test`);
      }

      // Body shape.
      const need = ['## Scenario', '## User request', '## Surrounding context', '## Expected outcome'];
      for (const h of need) {
        if (!body.includes(h)) errs(errors, `${file}: body missing "${h}"`);
      }
      if (!body.includes('```')) errs(errors, `${file}: body must contain a code fence (the diff)`);
      if (typeof fm.id === 'string' && !body.trim().startsWith(`# ${fm.id}`)) {
        errs(errors, `${file}: body must open with "# ${fm.id}"`);
      }

      cases.push({ ...fm, file: `cases/${cat}/${f}` });
    }
  }

  // ID uniqueness.
  const seen = new Set();
  for (const c of cases) {
    if (seen.has(c.id)) errs(errors, `duplicate id ${c.id}`); else seen.add(c.id);
  }

  // Category minimums.
  for (const [cat, min] of Object.entries(MIN_PER_CATEGORY)) {
    const n = cases.filter(c => c.category === cat).length;
    if (n < min) errs(errors, `category "${cat}" has ${n} cases, minimum is ${min}`);
  }

  if (cases.length < MIN_TOTAL) errs(errors, `total cases ${cases.length} < minimum ${MIN_TOTAL}`);

  const silent = cases.filter(c => c.severity_expected === 'NO-ISSUE' || c.severity_expected === 'NITPICK').length;
  const ratio = cases.length ? silent / cases.length : 0;
  if (ratio < MIN_SILENCE_RATIO) {
    errs(errors, `silence ratio ${(ratio * 100).toFixed(1)}% < required ${MIN_SILENCE_RATIO * 100}%`);
  }

  return { errors, warnings, cases, silentRatio: ratio };
}

function main() {
  const { errors, warnings, cases, silentRatio } = validateCases();

  for (const w of warnings) console.log(w);
  for (const e of errors) console.error(e);

  if (errors.length) {
    console.error(`\nvalidate: FAILED — ${errors.length} error(s), ${cases.length} cases read.`);
    process.exit(1);
  }

  // Regenerate expected/answers.json.
  const version = readVersion();
  const payload = {
    benchmarkVersion: version,
    generatedAt: new Date().toISOString(),
    count: cases.length,
    silentCount: cases.filter(c => c.severity_expected === 'NO-ISSUE' || c.severity_expected === 'NITPICK').length,
    cases: Object.fromEntries(cases.map(c => [c.id, c])),
  };
  mkdirSync(EXPECTED_DIR, { recursive: true });
  writeFileSync(ANSWERS_FILE, JSON.stringify(payload, null, 2) + '\n');

  console.log(`\nvalidate: OK — ${cases.length} cases, ${(silentRatio * 100).toFixed(1)}% silent, expected answers written to expected/answers.json`);
}

main();
