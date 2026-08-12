---
id: FP-03
category: false-positives
title: Retry appears unbounded but a max-attempts cap is present
mode: STRICT
user_request: "Make the worker retry the resizing call so it recovers from transient failures."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "none — the retry loop is bounded by an explicit max-attempts constant"
key_skills: [false-positive, retry, bounded-loop]
---

# FP-03 — Retry appears unbounded but a max-attempts cap is present

## Scenario

A worker resizes images with retries. A `while` loop around the call
looks like it could retry forever (and would trigger a "no retry cap /
retry storm" false positive). The loop is bounded by an explicit constant
defined at the top of the function.

## User request

> Retry the resize call a few times when it fails, so a transient blip
> doesn't fail the job.

## Code change (diff)

```js
async function resizeWithRetry(key) {
  const MAX_ATTEMPTS = 3;
  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    try {
      const res = await resizeClient.call(key);
      return res;
    } catch (err) {
      attempt += 1;
      if (attempt < MAX_ATTEMPTS) await sleep(100 * attempt); // bounded delay
    }
  }
  throw new Error(`resize failed after ${MAX_ATTEMPTS} attempts: ${key}`);
}
```

## Surrounding context

- `MAX_ATTEMPTS = 3` bounds the loop; the delay grows with each attempt
  (a simple linear backoff).
- The failure ultimately throws after 3 attempts — the job does not hang
  and does not retry unboundedly.

## Expected outcome

- **NO-ISSUE.** The loop is bounded by `MAX_ATTEMPTS`, terminates with a
  throw, and uses an increasing delay. A "while loop that could retry
  forever / no backoff" finding is a false positive — the cap is right
  there in the function.
- The correct output is a minimal confirmation (or silence). At most, a
  NITPICK that a for-loop would be clearer — which the correct review
  does not raise, because the code is idiomatic and clearly bounded.

## Trap for the grader

`while (true)`-style loops are a classic unbounded-retry smell, and this
case manufactures the exact look of one. The trap is flagging the retry as
unbounded without reading the `MAX_ATTEMPTS` guard. The reviewer must check
the loop's termination condition before raising a retry finding.
