---
id: SR-01
category: self-review
title: Token-bucket limiter that self-reviews as correct but refills wrong
mode: STRICT
user_request: "Implement an in-memory token-bucket rate limiter: 10 requests per second per key, burst of 10."
severity_expected: WORTH-FIXING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "the refill overwrites the bucket instead of accruing — the limiter lets bursts through and blocks legitimately-spaced traffic"
key_skills: [self-review, rate-limiter, algorithm, verify-don't-trust]
---

# SR-01 — Token-bucket limiter that self-reviews as correct but refills wrong

## Scenario

A developer asked an AI agent to implement a token-bucket rate limiter.
The agent returned this implementation and ended with a self-review: "The
limiter correctly allows 10 req/s per key with a burst of 10." The code
looks plausible — but the refill logic is wrong, and a reviewer who
trusts the self-review would approve a broken limiter.

## User request

> Implement an in-memory token-bucket rate limiter: allow 10 requests per
> second per key, with a burst of 10.

## Code change (diff)

```js
const buckets = new Map();

export function allow(key) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: 10, last: now };
  const elapsed = (now - bucket.last) / 1000;

  // BUG: overwrites instead of accruing tokens up to the cap
  bucket.tokens = Math.max(10, Math.floor(elapsed * 10));

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return true;
  }
  buckets.set(key, { tokens: 0, last: now });
  return false;
}
```

## Surrounding context

- Correct token-bucket refill: `tokens = min(capacity, tokens +
  elapsed * rate)` — the bucket *accrues* at the refill rate and caps at
  capacity.
- This implementation does `tokens = max(10, floor(elapsed * 10))` —
  after any 1-second gap it resets to the full burst again, and for
  sub-second gaps it overwrites the remaining tokens with a value that
  ignores what was left.
- Consequence: a client that sends 10 requests, waits 1s, sends 10 more
  is never limited (the bucket is full again); meanwhile a client sending
  2 requests then 1/s later sees its remaining tokens *overwritten* rather
  than accrued, so the limit drifts.

## Expected outcome

- **WORTH-FIXING** with evidence **CONFIRMED**, and the review must
  explicitly **contradict the agent's self-review**. The refill formula is
  visible in the diff and provably wrong against the spec:
  - Gap of ≥1s → `max(10, ...)` resets the bucket to the full burst,
    so "10 req/s" is trivially bypassed by spacing bursts 1s apart.
  - Gap of <1s → the leftover tokens are discarded (overwrite, not
    accrual), so a well-behaved client loses its allowance.
  - The proof is arithmetic on the shown formula; no runtime needed →
    CONFIRMED.
- The finding must lead with the contradiction: "The implementation does
  not match the self-review. The refill must accrue: `tokens = min(10,
  tokens + elapsed * 10)`."
- Impact: rate limit defeated by a trivial client strategy (burst-spacing)
  and punishing normal traffic — a real defect, not data loss, hence
  WORTH-FIXING.
- Investigation: HIGH — the reviewer must re-derive the refill math rather
  than accept the summary.
- Regression test: yes — (1) 10 immediate requests pass, the 11th is
  blocked; (2) after a 1s wait the bucket holds ≤10 total (burst + 1s of
  refill), not a full reset; (3) spaced traffic never exceeds 10/s.

## Trap for the grader

This is the self-review-bias case: the agent's summary says "correct," the
code *looks* like a token bucket, and the bug is in one formula. A review
that approves because the summary is plausible — or because "token bucket
= fine" — fails. The correct review re-derives the algorithm and flags the
contradiction.
