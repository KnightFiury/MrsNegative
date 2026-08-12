#!/usr/bin/env node
// Minimal benchmark execution harness for Mrs. Negative.
//
// There is deliberately no in-repo LLM abstraction beyond what is needed
// here. It drives the local `opencode run` CLI (any provider/model it can
// reach), so the exact same pipeline works for baseline and persona runs.
//
//   node scripts/run.mjs prepare <outdir>
//       Extract every case body without the answer key into <outdir>.
//
//   node scripts/run.mjs run <prepared> <resultsBase> <condition> <model> <runs>
//       Execute every prepared case `runs` times via `opencode run`.
//       Idempotent: a case whose raw output already exists is skipped, so
//       an interrupted run can be resumed. Raw output goes to
//       <resultsBase>/_raw/<condition>-<model>-r<i>/.
//       For condition mrs-negative, adapters/opencode/AGENTS.md is copied
//       into the run cwd so the persona loads as project instructions.
//
//   node scripts/run.mjs extract <resultsBase> <condition> <model> <runs> <version>
//       Parse the verdict JSON out of each raw run and write result files
//       in the format scripts/score.mjs expects (only parseable runs are
//       written; the rest are recorded in .meta.json and reported as
//       not-run rather than guessed).
//
// Conditions: baseline | mrs-negative.
// The case prompt is byte-identical between conditions; only the system
// context differs (a neutral reviewer line vs. the Mrs. Negative persona).

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');                 // benchmark/
const REPO = join(HERE, '..', '..');           // repo root (PERSONA.md, adapters/)
const CASES = join(ROOT, 'cases');
const ADAPTER = join(REPO, 'adapters', 'opencode', 'AGENTS.md');

const VERDICT_FIELDS = `
- hasFinding (true|false): did you report any finding at all?
- severity (BLOCKING|WORTH-FIXING|NITPICK|null): tier of your primary/only finding; null when silent.
- evidence (CONFIRMED|LIKELY|UNVERIFIED|N/A|null): evidence level you actually established.
- primaryFound (true|false): did you surface the single most important real issue in this code?
- evidenceBacked (true|false): did you show concrete proof (payload, input-to-sink trace, thread interleaving, or a specific docs/source check), not just a label?
- verificationConcrete (true|false): did you name a concrete, runnable verification (exact command/payload/test)?
- fixConcrete (true|false): did you give a concrete, correct fix?
- intentPreserved (true|false): did you correctly read the user request and catch (or avoid inventing) semantic violations of it?
- regressionStance (require|confirm|decline|skip|null): your stance on a regression test.
- regressionAppropriate (true|false): was that stance right for this case? (require on BLOCKING, confirm on a claimed verified fix, decline/skip on minor or safe code).
- inventedSeverity (BLOCKING|WORTH-FIXING|NITPICK|null): worst tier among findings you raised that are NOT actually present; null if none.
- unverifiedEscalated (true|false): true only if your evidence was UNVERIFIED but you still called it BLOCKING.
- notes (string): one short sentence explaining your severity/evidence reasoning.
`.trim();

const SUFFIX = `
Answer in exactly this format:

## Review

(your prose review of the code change, using the surrounding context. Do NOT run any tools or commands â€” reason from the provided context only.)

## Verdict JSON

\`\`\`json
{
  "hasFinding": <bool>,
  "severity": <value>,
  "evidence": <value>,
  "primaryFound": <bool>,
  "evidenceBacked": <bool>,
  "verificationConcrete": <bool>,
  "fixConcrete": <bool>,
  "intentPreserved": <bool>,
  "regressionStance": <value>,
  "regressionAppropriate": <bool>,
  "inventedSeverity": <value>,
  "unverifiedEscalated": <bool>,
  "notes": "<string>"
}
\`\`\`

Field meanings:
${VERDICT_FIELDS}
`;

const BASELINE_SYS = 'You are a professional code reviewer. Review the code change below and report what you find. Do not run tools.';

function opencodeBin() {
  if (process.env.OPENCODE_BIN) return process.env.OPENCODE_BIN;
  const guess = join(process.env.APPDATA || '', 'npm', 'node_modules', 'opencode-ai', 'bin', 'opencode.exe');
  if (existsSync(guess)) return guess;
  return 'opencode';
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function stripAnswerKey(body) {
  let text = body.trimStart().replace(/^#\s+[^\n]*\n?/, ''); // drop the "# ID — title" heading (title can leak the answer)
  for (const h of ['## Expected outcome', '## Trap for the grader', '## Trap']) {
    const i = text.indexOf(h);
    if (i !== -1) text = text.slice(0, i);
  }
  return text.trim();
}

function splitFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { fm: null, body: text };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) return { fm: null, body: text };
  return { fm: lines.slice(1, end).join('\n'), body: lines.slice(end + 1).join('\n') };
}

function listCases() {
  const out = [];
  for (const cat of readdirSync(CASES, { withFileTypes: true }).filter(d => d.isDirectory())) {
    for (const f of readdirSync(join(CASES, cat.name)).filter(f => f.endsWith('.md'))) {
      const { body } = splitFrontmatter(readFileSync(join(CASES, cat.name, f), 'utf8'));
      const id = f.split('-').slice(0, 2).join('-');
      out.push({ id, prompt: stripAnswerKey(body) });
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function cmdPrepare(outdir) {
  const cases = listCases();
  mkdirSync(outdir, { recursive: true });
  const manifest = { count: cases.length, cases: {} };
  for (const c of cases) {
    writeFileSync(join(outdir, `${c.id}.prompt.md`), c.prompt);
    manifest.cases[c.id] = {};
  }
  writeFileSync(join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`prepared ${cases.length} prompts -> ${outdir}`);
}

function modelDir(model) { return model.replace(/[/:]/g, '_'); }

function runOnce(prepared, rawDir, caseId, condition, model, runIdx) {
  const prompt = readFileSync(join(prepared, `${caseId}.prompt.md`), 'utf8');
  const cwd = join(rawDir, '_cwd');
  mkdirSync(cwd, { recursive: true });
  if (condition === 'mrs-negative') cpSync(ADAPTER, join(cwd, 'AGENTS.md'));
  else if (existsSync(join(cwd, 'AGENTS.md'))) rmSync(join(cwd, 'AGENTS.md'));

  const message = condition === 'baseline'
    ? `${BASELINE_SYS}\n\n${prompt}\n\n${SUFFIX}`
    : `${prompt}\n\n${SUFFIX}`;

  const args = ['run', '-m', model, '--dir', cwd, message];
  const raw = execFileSync(opencodeBin(), args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 6 * 60 * 1000 });
  writeFileSync(join(rawDir, `${caseId}.raw.md`), raw);
}

function cmdRun(prepared, resultsBase, condition, model, runs) {
  const manifest = readJson(join(prepared, 'manifest.json'));
  const ids = Object.keys(manifest.cases).sort();
  const md = modelDir(model);
  for (let i = 1; i <= runs; i++) {
    const rawDir = join(resultsBase, '_raw', `${condition}-${md}-r${i}`);
    mkdirSync(rawDir, { recursive: true });
    const meta = { condition, model, run: i, date: new Date().toISOString(), done: [] };
    for (const id of ids) {
      const outFile = join(rawDir, `${id}.raw.md`);
      if (existsSync(outFile)) { meta.done.push(id); continue; }
      try {
        runOnce(prepared, rawDir, id, condition, model, i);
        meta.done.push(id);
      } catch (e) {
        console.error(`FAIL ${id}: ${e.message.slice(0, 300)}`);
        meta.failed = meta.failed || [];
        meta.failed.push(id);
      }
    }
    writeFileSync(join(rawDir, '.meta.json'), JSON.stringify(meta, null, 2));
    console.log(`run ${i}/${runs}: ${meta.done.length}/${ids.length} done${meta.failed ? `, ${meta.failed.length} failed` : ''}`);
  }
}

function parseVerdict(raw) {
  const fence = raw.match(/```json\s*([\s\S]*?)```/i);
  const text = fence ? fence[1] : raw;
  const brace = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (brace === -1 || end <= brace) return { ok: false, error: 'no JSON object found', verdict: null };
  try {
    const verdict = JSON.parse(text.slice(brace, end + 1));
    return { ok: true, verdict };
  } catch (e) {
    return { ok: false, error: `JSON parse failed: ${e.message}`, verdict: null };
  }
}

function normalizeVerdict(v) {
  const bool = (x, d) => (typeof x === 'boolean' ? x : d);
  const pick = (x, allowed, d) => (allowed.includes(x) ? x : d);
  const out = {
    hasFinding: bool(v.hasFinding, false),
    severity: pick(v.severity, ['BLOCKING', 'WORTH-FIXING', 'NITPICK', null], null),
    evidence: pick(v.evidence, ['CONFIRMED', 'LIKELY', 'UNVERIFIED', 'N/A', null], null),
    primaryFound: bool(v.primaryFound, false),
    evidenceBacked: bool(v.evidenceBacked, false),
    verificationConcrete: bool(v.verificationConcrete, false),
    fixConcrete: bool(v.fixConcrete, false),
    intentPreserved: bool(v.intentPreserved, true),
    regressionStance: pick(v.regressionStance, ['require', 'confirm', 'decline', 'skip', null], null),
    regressionAppropriate: bool(v.regressionAppropriate, false),
    inventedSeverity: pick(v.inventedSeverity, ['BLOCKING', 'WORTH-FIXING', 'NITPICK', null], null),
    unverifiedEscalated: bool(v.unverifiedEscalated, false),
    notes: typeof v.notes === 'string' ? v.notes.slice(0, 500) : '',
  };
  if (out.severity === 'BLOCKING' && out.evidence === 'UNVERIFIED') out.unverifiedEscalated = true;
  if (!out.hasFinding) { out.severity = null; out.evidence = out.evidence === 'N/A' ? 'N/A' : null; out.primaryFound = false; }
  if (out.primaryFound && !out.hasFinding) out.hasFinding = true;
  return out;
}

function cmdExtract(resultsBase, condition, model, runs, version) {
  const answers = readJson(join(ROOT, 'expected', 'answers.json'));
  const md = modelDir(model);
  for (let i = 1; i <= runs; i++) {
    const rawDir = join(resultsBase, '_raw', `${condition}-${md}-r${i}`);
    const outDir = join(resultsBase, `${condition}-${md}-r${i}`);
    mkdirSync(outDir, { recursive: true });
    if (!existsSync(rawDir)) { console.log(`no raw dir: ${rawDir}`); continue; }
    let parsed = 0, failed = 0;
    for (const id of Object.keys(answers.cases)) {
      const rawFile = join(rawDir, `${id}.raw.md`);
      if (!existsSync(rawFile)) continue;
      const res = parseVerdict(readFileSync(rawFile, 'utf8'));
      if (!res.ok) { failed++; continue; }
      writeFileSync(join(outDir, `${id}.json`), JSON.stringify({
        caseId: id, model, condition, run: i, benchmarkVersion: version,
        output: normalizeVerdict(res.verdict),
      }, null, 2));
      parsed++;
    }
    writeFileSync(join(outDir, '.meta.json'), JSON.stringify({ condition, model, run: i, benchmarkVersion: version, parsed, failed }, null, 2));
    console.log(`extract run ${i}: ${parsed} parsed, ${failed} failed -> ${outDir}`);
  }
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'prepare') return cmdPrepare(rest[0]);
  if (cmd === 'run') return cmdRun(rest[0], rest[1], rest[2], rest[3], parseInt(rest[4], 10) || 1);
  if (cmd === 'extract') return cmdExtract(rest[0], rest[1], rest[2], parseInt(rest[3], 10) || 1, rest[4]);
  console.error(`usage:
  node scripts/run.mjs prepare <outdir>
  node scripts/run.mjs run <prepared> <resultsBase> <condition> <model> <runs>
  node scripts/run.mjs extract <resultsBase> <condition> <model> <runs> <version>`);
  process.exit(1);
}

main();

