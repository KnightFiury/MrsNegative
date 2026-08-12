// Pure scoring logic for the Mrs. Negative benchmark.
// Imported by score.mjs (CLI) and score.self-test.mjs (deterministic checks).
//
// No I/O here. Everything is a pure function so the self-test can exercise
// the exact same code paths the CLI uses.

export const SEVERITIES = ['NITPICK', 'WORTH-FIXING', 'BLOCKING'];
export const EVIDENCE = ['UNVERIFIED', 'LIKELY', 'CONFIRMED'];

const sevIndex = s => SEVERITIES.indexOf(s);
const sevDistance = (a, b) => Math.abs(sevIndex(a) - sevIndex(b));

// The eight dimensions. Each returns 0..5. See benchmark/rubric.md section 7.
//
// `expected` = expected answer (from expected/answers.json).
// `r`        = judged result for one case (see results/README.md).

export function dimDetection(expected, r) {
  if (expected.severity_expected === 'NO-ISSUE') {
    return r.output.hasFinding ? 0 : 5;
  }
  if (r.output.primaryFound) return 5;
  if (r.output.hasFinding) return 2; // found *something*, missed the primary
  return 0; // missed entirely
}

export function dimSeverity(expected, r) {
  if (expected.severity_expected === 'NO-ISSUE') {
    return r.output.hasFinding ? 0 : 5;
  }
  if (!r.output.primaryFound) return 0;
  if (r.output.unverifiedEscalated && r.output.severity === 'BLOCKING') return 0;
  const dist = sevDistance(expected.severity_expected, r.output.severity);
  if (dist === 0) return 5;
  if (dist === 1) return 3;
  return 1;
}

export function dimEvidence(expected, r) {
  if (expected.severity_expected === 'NO-ISSUE') {
    return r.output.hasFinding ? 0 : 5;
  }
  if (!r.output.primaryFound) return 0;
  if (r.output.unverifiedEscalated) return 0;

  const exp = expected.evidence_expected;
  const act = r.output.evidence;

  if (exp === 'CONFIRMED') {
    if (act === 'CONFIRMED') return r.output.evidenceBacked ? 5 : 2;
    if (act === 'LIKELY') return 3;
    if (act === 'UNVERIFIED') return 1;
    return 0;
  }
  if (exp === 'LIKELY') {
    if (act === 'LIKELY') return r.output.evidenceBacked ? 5 : 2;
    if (act === 'CONFIRMED') return 3; // over-claimed, off by one
    if (act === 'UNVERIFIED') return 2;
    return 0;
  }
  if (exp === 'UNVERIFIED') {
    if (act === 'UNVERIFIED') return 5;
    if (act === 'LIKELY') return 3;
    if (act === 'CONFIRMED') return 2;
    return 0;
  }
  return 0;
}

export function dimIntent(expected, r) {
  return r.output.intentPreserved ? 5 : 0;
}

export function dimFalsePositive(expected, r) {
  return r.output.inventedSeverity ? 0 : 5;
}

export function dimVerification(expected, r) {
  return r.output.verificationConcrete ? 5 : 0;
}

export function dimFix(expected, r) {
  if (expected.severity_expected === 'NO-ISSUE') return 5; // nothing to fix
  return r.output.fixConcrete ? 5 : 0;
}

export function dimRegression(expected, r) {
  return r.output.regressionAppropriate ? 5 : 0;
}

export const DIMENSIONS = [
  ['Detection', dimDetection],
  ['Severity accuracy', dimSeverity],
  ['Evidence accuracy', dimEvidence],
  ['Intent accuracy', dimIntent],
  ['False-positive avoidance', dimFalsePositive],
  ['Verification quality', dimVerification],
  ['Fix quality', dimFix],
  ['Regression-test quality', dimRegression],
];

const MULTIPLIER = { NITPICK: 0.9, 'WORTH-FIXING': 0.7, BLOCKING: 0.4 };

// False-positive multiplier per rubric section 7.
export function falsePositiveMultiplier(r) {
  let m = 1;
  if (r.output.inventedSeverity) m *= MULTIPLIER[r.output.inventedSeverity];
  if (r.output.unverifiedEscalated && r.output.severity === 'BLOCKING') m *= MULTIPLIER.BLOCKING;
  return m;
}

export function scoreCase(expected, r) {
  const dims = DIMENSIONS.map(([name, fn]) => ({
    name,
    score: fn(expected, r),
  }));
  const raw = dims.reduce((s, d) => s + d.score, 0);
  const multiplier = falsePositiveMultiplier(r);
  const total = Math.round(raw * multiplier * 100) / 100;
  return { dims, raw, multiplier, total };
}

// Finding-level aggregates per rubric section 8.
export function aggregateCases(expectedMap, results) {
  let TP = 0, FP = 0, FN = 0, TN = 0;
  let TP_B = 0, FP_B = 0, FN_B = 0;
  let intentHits = 0, intentTotal = 0;
  let evidenceHits = 0, evidenceTotal = 0;
  let verificationHits = 0;
  let silentHits = 0, silentTotal = 0;

  for (const [id, expected] of Object.entries(expectedMap)) {
    const r = results[id];
    if (!r) continue; // not run; reported separately by the CLI

    const o = r.output;
    const expSev = expected.severity_expected;
    const isNoIssue = expSev === 'NO-ISSUE';

    if (isNoIssue) {
      if (o.hasFinding) FP += 1; else TN += 1;
      if (o.hasFinding) FP_B += 1; // a finding on a safe case is always an FP
      silentTotal += 1;
      if (!o.hasFinding) silentHits += 1;
      continue;
    }

    // Real-finding cases.
    if (o.primaryFound) {
      if (o.severity === expSev) { TP += 1; }
      // reported at a different tier: not TP, not FN. severity dimension handles it.
      if (expSev === 'BLOCKING') {
        if (o.severity === 'BLOCKING') TP_B += 1;
        // expected BLOCKING reported below BLOCKING is an FP_B? No:
        // rubric: FP_B is a BLOCKING label on anything not expected BLOCKING.
        // reported-below is a severity miss, not an FP_B. Only a missed
        // BLOCKING entirely is FN_B.
      }
    } else {
      FN += 1;
      if (expSev === 'BLOCKING') FN_B += 1;
    }

    if (o.inventedSeverity) {
      FP += 1;
      if (o.inventedSeverity === 'BLOCKING' || o.severity === 'BLOCKING') FP_B += 1;
    }
    // A BLOCKING label on a real finding whose expected tier is lower:
    if (o.severity === 'BLOCKING' && expSev !== 'BLOCKING') FP_B += 1;

    if (expected.category === 'intent') { intentTotal += 1; if (o.primaryFound) intentHits += 1; }

    evidenceTotal += 1;
    const evMatch =
      o.primaryFound && o.evidence === expected.evidence_expected && o.evidenceBacked;
    if (evMatch) evidenceHits += 1;

    if (o.verificationConcrete) verificationHits += 1;
  }

  const precision = TP + FP ? TP / (TP + FP) : null;
  const recall = TP + FN ? TP / (TP + FN) : null;
  const blockingPrecision = TP_B + FP_B ? TP_B / (TP_B + FP_B) : null;
  const blockingRecall = TP_B + FN_B ? TP_B / (TP_B + FN_B) : null;

  return {
    counts: { TP, FP, FN, TN, TP_B, FP_B, FN_B },
    precision, recall, blockingPrecision, blockingRecall,
    rates: {
      intentDetection: intentTotal ? intentHits / intentTotal : null,
      evidenceAccuracy: evidenceTotal ? evidenceHits / evidenceTotal : null,
      verificationAccuracy: evidenceTotal ? verificationHits / evidenceTotal : null,
      silenceRate: silentTotal ? silentHits / silentTotal : null,
    },
  };
}
