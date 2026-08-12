#!/usr/bin/env node
// Compare benchmark runs side by side (BASELINE vs MRS_NEGATIVE, etc.).
//
//   node scripts/compare.mjs <runDirA> <runDirB> [--label A B] [--report <file>]
//
// Loads result JSONs from each directory, scores them with score-lib
// (identical logic to score.mjs), and prints:
//   - the headline comparison table
//   - per-8-dimension means
//   - finding-level aggregates (precision/recall/BLOCKING precision/BLOCKING recall)
//   - per-category breakdown for every condition
//   - per-case delta for the first two conditions

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreCase, aggregateCases, DIMENSIONS } from './score-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ANSWERS = JSON.parse(readFileSync(join(ROOT, 'expected', 'answers.json'), 'utf8'));
const expected = ANSWERS.cases;

const args = process.argv.slice(2);
const dirs = [];
const labels = [];
let reportFile = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--label') { while (i + 1 < args.length && !args[i + 1].startsWith('--')) { labels.push(args[++i]); } continue; }
  if (args[i] === '--report') { reportFile = args[i + 1]; i++; continue; }
  dirs.push(args[i]);
}
if (dirs.length < 2) {
  console.error('usage: node scripts/compare.mjs <dirA> <dirB> [--label A B] [--report <file>]');
  process.exit(1);
}
dirs.forEach((d, i) => { if (!existsSync(d)) { console.error(`not found: ${d}`); process.exit(1); } });
const condLabels = labels.length >= dirs.length ? labels : dirs.map(d => basename(d));

function loadResults(path) {
  const out = {};
  const walk = p => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const full = join(p, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.json')) continue;
      let data;
      try { data = JSON.parse(readFileSync(full, 'utf8')); } catch { continue; }
      const id = data.caseId || e.name.replace(/\.json$/, '');
      if (expected[id]) out[id] = data;
    }
  };
  walk(path);
  return out;
}

const conditions = dirs.map(d => loadResults(d));
const notRunEach = conditions.map(r => Object.keys(expected).filter(id => !r[id]));

const dimNames = DIMENSIONS.map(([n]) => n);

function dimMeans(results) {
  const perCase = {};
  for (const [id, exp] of Object.entries(expected)) {
    if (!results[id]) continue;
    const r = results[id];
    if (!r.output || typeof r.output !== 'object') continue;
    perCase[id] = { scored: scoreCase(exp, r) };
  }
  const means = dimNames.map((_, i) => {
    const vals = Object.values(perCase).map(c => c.scored.dims[i].score);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  const totals = Object.values(perCase).map(c => c.scored.total);
  return {
    means, perCase,
    meanTotal: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
    meanRaw: totals.length ? Object.values(perCase).map(c => c.scored.raw).reduce((a, b) => a + b, 0) / totals.length : null,
    casesScored: Object.keys(perCase).length,
  };
}

const scored = conditions.map(c => dimMeans(c));
const aggs = conditions.map(c => aggregateCases(expected, c));

const fmt = (x, d = 3) => (x === null || x === undefined) ? 'n/a' : (d === 0 ? x.toFixed(0) : x.toFixed(d));
const lines = [];
lines.push(`# Benchmark comparison — ${ANSWERS.benchmarkVersion}`);
lines.push('');
lines.push(`| Metric | ${condLabels.join(' | ')} |`);
lines.push(`|---|${condLabels.map(() => '---').join('|')}|`);
lines.push(`| Cases scored | ${scored.map(s => s.casesScored).join(' | ')} |`);
lines.push(`| Mean raw (/40) | ${scored.map(s => fmt(s.meanRaw)).join(' | ')} |`);
lines.push(`| Mean final (/40) | ${scored.map(s => fmt(s.meanTotal)).join(' | ')} |`);
for (let i = 0; i < dimNames.length; i++) {
  lines.push(`| ${dimNames[i]} (/5) | ${scored.map(s => fmt(s.means[i])).join(' | ')} |`);
}
lines.push(`| Precision | ${aggs.map(a => fmt(a.precision)).join(' | ')} |`);
lines.push(`| Recall | ${aggs.map(a => fmt(a.recall)).join(' | ')} |`);
lines.push(`| BLOCKING precision | ${aggs.map(a => fmt(a.blockingPrecision)).join(' | ')} |`);
lines.push(`| BLOCKING recall | ${aggs.map(a => fmt(a.blockingRecall)).join(' | ')} |`);
lines.push(`| FP / FN / TP / TN | ${aggs.map(a => `${a.counts.FP}/${a.counts.FN}/${a.counts.TP}/${a.counts.TN}`).join(' | ')} |`);
lines.push(`| Intent detection | ${aggs.map(a => fmt(a.rates.intentDetection)).join(' | ')} |`);
lines.push(`| Evidence accuracy | ${aggs.map(a => fmt(a.rates.evidenceAccuracy)).join(' | ')} |`);
lines.push(`| Verification accuracy | ${aggs.map(a => fmt(a.rates.verificationAccuracy)).join(' | ')} |`);
lines.push(`| Silence rate (NO-ISSUE) | ${aggs.map(a => fmt(a.rates.silenceRate)).join(' | ')} |`);
lines.push('');
lines.push(`### Not run`);
lines.push('');
for (let i = 0; i < conditions.length; i++) {
  lines.push(`- **${condLabels[i]}** (${notRunEach[i].length}): ${notRunEach[i].join(', ') || 'none'}`);
}
lines.push('');
lines.push(`## Per-category`);
lines.push('');
const cats = {};
for (const id of Object.keys(expected)) { const c = expected[id].category; (cats[c] = cats[c] || []).push(id); }
lines.push(`| Category | Cases | ${condLabels.map(l => `${l} mean`).join(' | ')} |`);
lines.push(`|---|---|${condLabels.map(() => '---').join('|')}|`);
for (const [cat, ids] of Object.entries(cats)) {
  const means = conditions.map(cond => {
    const vals = ids.map(id => scored[conditions.indexOf(cond)].perCase[id]?.scored.total).filter(v => v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  lines.push(`| ${cat} | ${ids.length} | ${means.map(m => fmt(m)).join(' | ')} |`);
}
lines.push('');
lines.push(`## Per-case delta (${condLabels[0]} → ${condLabels[1]})`);
lines.push('');
lines.push(`| Case | Expected | ${condLabels[0]} | ${condLabels[1]} | Δ |`);
lines.push(`|---|---|---:|---:|---:|`);
for (const [id, exp] of Object.entries(expected).sort((a, b) => a[0].localeCompare(b[0]))) {
  const a = scored[0].perCase[id]?.scored.total;
  const b = scored[1].perCase[id]?.scored.total;
  if (a === undefined && b === undefined) continue;
  lines.push(`| ${id} | ${exp.severity_expected} | ${a === undefined ? 'n/a' : a.toFixed(1)} | ${b === undefined ? 'n/a' : b.toFixed(1)} | ${(a !== undefined && b !== undefined) ? (b - a >= 0 ? '+' : '') + (b - a).toFixed(1) : '—'} |`);
}
lines.push('');

const report = lines.join('\n');
if (reportFile) {
  mkdirSync(dirname(resolve(reportFile)), { recursive: true });
  writeFileSync(resolve(reportFile), report);
}
console.log(report);
