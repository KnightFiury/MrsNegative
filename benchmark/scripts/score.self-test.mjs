#!/usr/bin/env node
// Deterministic self-test for the benchmark scoring logic.
// Runs synthetic cases through score-lib.mjs and asserts the outcomes.
// Exit code 0 = all assertions pass. This must stay deterministic — no
// I/O, no randomness, no network.

import { scoreCase, aggregateCases } from './score-lib.mjs';

let failures = 0;
function check(name, actual, expected) {
  const ok = Object.is(actual, expected);
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${name}: expected ${expected}, got ${actual}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// --- helpers ------------------------------------------------------------
function result(overrides) {
  return {
    caseId: 'X',
    output: {
      hasFinding: false,
      severity: null,
      evidence: null,
      primaryFound: false,
      evidenceBacked: false,
      verificationConcrete: false,
      fixConcrete: false,
      intentPreserved: true,
      regressionStance: null,
      regressionAppropriate: false,
      inventedSeverity: null,
      unverifiedEscalated: false,
      ...overrides,
    },
  };
}

const noIssue = {
  severity_expected: 'NO-ISSUE', evidence_expected: 'N/A',
  investigation_expected: 'LOW', category: 'false-positives',
  requires_regression_test: false,
};
const blocking = {
  severity_expected: 'BLOCKING', evidence_expected: 'CONFIRMED',
  investigation_expected: 'HIGH', category: 'security',
  requires_regression_test: true,
};
const worthL = {
  severity_expected: 'WORTH-FIXING', evidence_expected: 'LIKELY',
  investigation_expected: 'MEDIUM', category: 'reliability',
  requires_regression_test: false,
};
const unverified = {
  severity_expected: 'WORTH-FIXING', evidence_expected: 'UNVERIFIED',
  investigation_expected: 'MEDIUM', category: 'dependencies',
  requires_regression_test: false,
};

// --- 1. Perfect run: every dimension maxed, no FP multiplier. ------------
const perfectNoIssue = scoreCase(noIssue, result({
  hasFinding: false, verificationConcrete: true, regressionAppropriate: true,
  intentPreserved: true,
}));
check('perfect NO-ISSUE = 40', perfectNoIssue.total, 40);

const perfectBlocking = scoreCase(blocking, result({
  hasFinding: true, severity: 'BLOCKING', evidence: 'CONFIRMED',
  primaryFound: true, evidenceBacked: true, verificationConcrete: true,
  fixConcrete: true, regressionStance: 'require', regressionAppropriate: true,
  intentPreserved: true,
}));
check('perfect BLOCKING = 40', perfectBlocking.total, 40);

// --- 2. NO-ISSUE case that got a finding: heavy FP penalty. -------------
const safeInflated = scoreCase(noIssue, result({
  hasFinding: true, severity: 'BLOCKING', evidence: 'CONFIRMED',
  evidenceBacked: true, inventedSeverity: 'BLOCKING',
}));
// Detection 0, severity 0, evidence 0, intent 5, FP 0, verification 0,
// fix 5 (auto), regression 0 → raw 10, ×0.4 → 4.
check('safe case inflated to BLOCKING is near zero', safeInflated.total, 4);

// --- 3. UNVERIFIED → BLOCKING escalation: maximum penalty. --------------
const escalated = scoreCase(unverified, result({
  hasFinding: true, severity: 'BLOCKING', evidence: 'UNVERIFIED',
  primaryFound: true, evidenceBacked: false, unverifiedEscalated: true,
  verificationConcrete: true, fixConcrete: true, regressionAppropriate: true,
  inventedSeverity: null,
}));
// Detection 5, severity 0 (escalation), evidence 0 (escalation), intent 5,
// FP 5 (no invented finding), verification 5, fix 5, regression 5
// → raw 30, ×0.4 → 12.
check('UNVERIFIED->BLOCKING escalation penalized', escalated.total, 12);

// --- 4. Missed BLOCKING: low detection, but no FP penalty. --------------
const missed = scoreCase(blocking, result({ hasFinding: false, intentPreserved: false }));
// Detection 0, severity 0, evidence 0, intent 0, FP 5 (no inventions),
// verification 0, fix 0, regression 0 → raw 5. The only credit is not
// hallucinating.
check('missed BLOCKING = 5', missed.total, 5);

// --- 5. Tier off-by-one: severity dim degrades, rest intact. ------------
const under = scoreCase(blocking, result({
  hasFinding: true, severity: 'WORTH-FIXING', evidence: 'CONFIRMED',
  primaryFound: true, evidenceBacked: true, verificationConcrete: true,
  fixConcrete: true, regressionStance: 'require', regressionAppropriate: true,
  intentPreserved: true,
}));
// 5 + 3 + 5 + 5 + 5 + 5 + 5 + 5 = 38 (severity 3 instead of 5).
check('BLOCKING reported as WORTH-FIXING = 38', under.total, 38);

// --- 6. Evidence level off-by-one (CONFIRMED vs LIKELY). ----------------
const evOff = scoreCase(blocking, result({
  hasFinding: true, severity: 'BLOCKING', evidence: 'LIKELY',
  primaryFound: true, evidenceBacked: true, verificationConcrete: true,
  fixConcrete: true, regressionStance: 'require', regressionAppropriate: true,
  intentPreserved: true,
}));
// detection 5, severity 5, evidence 3, intent 5, FP 5, verif 5, fix 5, reg 5 = 38.
check('evidence off-by-one = 38', evOff.total, 38);

// --- 7. Evidence label asserted without backing. ------------------------
const unbacked = scoreCase(blocking, result({
  hasFinding: true, severity: 'BLOCKING', evidence: 'CONFIRMED',
  primaryFound: true, evidenceBacked: false, verificationConcrete: true,
  fixConcrete: true, regressionStance: 'require', regressionAppropriate: true,
  intentPreserved: true,
}));
// evidence 2 instead of 5 → 37.
check('CONFIRMED without proof = 37', unbacked.total, 37);

// --- 8. Invented WORTH-FIXING on a real case: ×0.7. ---------------------
const inventedWF = scoreCase(worthL, result({
  hasFinding: true, severity: 'WORTH-FIXING', evidence: 'LIKELY',
  primaryFound: true, evidenceBacked: true, verificationConcrete: true,
  fixConcrete: true, regressionStance: 'decline', regressionAppropriate: true,
  intentPreserved: true, inventedSeverity: 'WORTH-FIXING',
}));
// raw 35 (D5 = 0 because a finding was invented), ×0.7 → 24.5.
check('real finding + invented WORTH-FIXING = 24.5', inventedWF.total, 24.5);

// --- 9. NO-ISSUE answered with a NITPICK: mild penalty only. ------------
const nitpickOnSafe = scoreCase(noIssue, result({
  hasFinding: true, severity: 'NITPICK', evidence: 'N/A',
  inventedSeverity: 'NITPICK', regressionStance: 'decline',
  regressionAppropriate: true, intentPreserved: true,
}));
// Detection 0, severity 0, evidence 0, intent 5, FP 0, verif 0, fix 5 (auto),
// reg 5 → raw 15, ×0.9 → 13.5.
check('safe case + invented NITPICK = 13.5', nitpickOnSafe.total, 13.5);

// --- 10. Aggregates across a mixed run. ---------------------------------
const expectedMap = {
  'SEC-01': blocking,
  'FP-01': noIssue,
  'INT-01': { ...blocking, category: 'intent' },
  'REL-01': worthL,
};
const results = {
  'SEC-01': result({ hasFinding: true, severity: 'BLOCKING', evidence: 'CONFIRMED', primaryFound: true, evidenceBacked: true }),
  'FP-01': result({}),
  'INT-01': result({ hasFinding: true, severity: 'BLOCKING', evidence: 'CONFIRMED', primaryFound: true, evidenceBacked: true }),
  'REL-01': result({ hasFinding: true, severity: 'WORTH-FIXING', evidence: 'LIKELY', primaryFound: true, evidenceBacked: true }),
};
const agg = aggregateCases(expectedMap, results);
check('TP=3', agg.counts.TP, 3);
check('FP=0', agg.counts.FP, 0);
check('FN=0', agg.counts.FN, 0);
check('TN=1', agg.counts.TN, 1);
check('precision=1', agg.precision, 1);
check('recall=1', agg.recall, 1);
check('BLOCKING precision=1', agg.blockingPrecision, 1);
check('BLOCKING recall=1', agg.blockingRecall, 1);
check('intent detection=1', agg.rates.intentDetection, 1);
check('silence rate=1', agg.rates.silenceRate, 1);

// --- 11. FP on a real case drags precision below 1. ----------------------
const fpResults = {
  ...results,
  'FP-01': result({ hasFinding: true, severity: 'WORTH-FIXING', evidence: 'CONFIRMED', inventedSeverity: 'WORTH-FIXING' }),
};
const agg2 = aggregateCases(expectedMap, fpResults);
check('with 1 FP: precision=0.75', agg2.precision, 0.75);
check('with 1 FP: TN=0', agg2.counts.TN, 0);

// --- 12. Expected BLOCKING reported as WORTH-FIXING: not TP, not FN_B. --
const offTierResults = {
  ...results,
  'SEC-01': result({ hasFinding: true, severity: 'WORTH-FIXING', evidence: 'CONFIRMED', primaryFound: true, evidenceBacked: true }),
};
const agg3 = aggregateCases(expectedMap, offTierResults);
check('off-tier BLOCKING: TP=2', agg3.counts.TP, 2);
check('off-tier BLOCKING: FN_B=0', agg3.counts.FN_B, 0);
check('off-tier BLOCKING: TP_B=1', agg3.counts.TP_B, 1);

// --- summary -------------------------------------------------------------
if (failures) {
  console.error(`\nscore.self-test: ${failures} failure(s).`);
  process.exit(1);
}
console.log('\nscore.self-test: all assertions passed.');
