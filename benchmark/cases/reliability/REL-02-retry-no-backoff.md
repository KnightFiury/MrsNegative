---
id: REL-02
category: reliability
title: Retry loop with no backoff against a failing dependency
mode: STRICT
user_request: "The image service is flaky; retry the resize call a few times before failing."
severity_expected: WORTH-FIXING
evidence_expected: LIKELY
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "tight retry loop without backoff amplifies load on an already-failing service"
key_skills: [reliability, retry, backoff]
---

# REL-02 — Retry loop with no backoff against a failing dependency

## Scenario

An image-resize endpoint calls a third-party resize service. It sometimes
fails, so the agent wrapped it in a retry loop — retrying immediately up
to 4 times.

## User request

> The resize service is flaky — retry it a few times before returning an
> error to the user.

## Code change (diff)

```js
async function resizeImage(key) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${RESIZE_SVC}/resize`, {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      // retry immediately — no delay, no backoff, no jitter
    } else {
      break; // 4xx client error: don't retry
    }
  }
  throw new Error('resize failed');
}
```

## Surrounding context

- The resize service returns 429/503 when it is overloaded (per its docs).
- The endpoint is called by many users; during an incident, many requests
  hit the retry loop at once.
- The call is idempotent (resize by key), so duplicates are not a
  correctness bug — the problem is load.

## Expected outcome

- **WORTH-FIXING.** Immediate retries with no backoff on a *load-indicating*
  status (429/503) retry into a failing service, worsening the outage: the
  service stays saturated, requests pile up, and the retry storm delays
  recovery. Retry is correct in principle; the *policy* is wrong.
- Evidence: `LIKELY` — the amplification mechanism is clear from the code
  (no delay between attempts) and the service's documented overload
  behavior (429/503), but the *actual* incident behavior (how the service
  degrades, whether it recovers) is not observable in-session. The review
  must say what it could not verify, and must not assert a specific outage.
- Impact: degraded availability during incidents; latency spikes.
- Investigation: MEDIUM — one docs check (the service's throttling
  semantics) plus reading the loop.
- Regression test: not required — retry-policy behavior is load-dependent,
  not a deterministic logic bug.
- Fix: exponential backoff with jitter (e.g. `100ms * 2^attempt +
  random`), a cap on total retry time, and treating 429's `Retry-After`
  header as authoritative.

## Trap for the grader

The code "handles the error," so a shallow review approves it. But it is
a retry-without-backoff pattern, which is a recognized failure mode. The
reviewer must distinguish the *loop itself* (fine) from the *policy*
(the problem), and keep the severity honest — this is not data loss and
not BLOCKING.
