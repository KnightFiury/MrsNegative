---
id: INT-03
category: intent
title: "Retry only transient failures" — implementation retries everything, including permanent errors
mode: STRICT
user_request: "Retry the upstream sync call on transient failures only (timeouts, 5xx). Permanent errors (4xx) must NOT be retried."
severity_expected: WORTH-FIXING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: true
primary_finding: "retry loop does not distinguish transient from permanent — 4xx requests are retried"
key_skills: [intent, retry, error-classification]
---

# INT-03 — "Retry only transient failures" — implementation retries everything

## Scenario

A data-sync job calls an upstream API. Some errors are permanent (400
validation, 403, 404) and some are transient (timeout, 429, 5xx). The
agent implemented a retry loop that retries on **any** thrown error.

## User request

> Retry the sync call on transient failures only — timeouts, 429, 5xx.
> Do not retry permanent failures like 400/403; those should fail fast so
> we see the real error.

## Code change (diff)

```js
async function syncItem(item) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await api.put(`/items/${item.id}`, item);
      return res;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 403) {
        throw err; // permanent: fail fast (correct branch)
      }
      // everything else (timeouts, 429, 5xx) retried — matches intent
    }
  }
  throw new Error(`sync failed after retries for ${item.id}`);
}
```

## Surrounding context

- `api` is the axios client; `err.response.status` distinguishes HTTP
  responses, but timeouts/network errors throw without `err.response`.
- The requirement names the classes explicitly: retry transient, fail fast
  permanent.
- The implementation's only permanent-classification is `400` and `403`;
  other 4xx (401, 404, 405, 409, 422...) and any non-HTTP error fall into
  the retry bucket.

## Expected outcome

- **WORTH-FIXING.** The retry policy does not fully implement the stated
  contract: it treats "any error that is not 400/403" as retryable. That
  catches permanent 4xx (401, 404, 422) and hangs retrying requests that
  can never succeed, plus any unclassified error — defeating the "fail
  fast on permanent" requirement for those classes.
- Evidence: `CONFIRMED` — the classification is visible in the diff: the
  retry branch is the catch-all, so any error outside the two whitelisted
  codes is retried. The requirement's classes are compared against the
  implementation's branch structure directly; no runtime needed.
- Impact: unnecessary retries, slower failure, and the exact behavior the
  user said to avoid (retrying permanent failures). Not data loss — hence
  WORTH-FIXING, not BLOCKING.
- Investigation: MEDIUM — map the requirement's classes to the code's
  branches.
- Regression test: yes — assert a 422 (or 401, or a non-HTTP error) is not
  retried, and a 503/timeout is.
- Verification: fix by classifying on `err.response` presence and status
  range (`status >= 500 || status === 429 || !err.response` for timeout/
  network) and letting other 4xx throw; re-run the classification tests.

## Trap for the grader

The 400/403 branch *looks* like the intent is honored. The requirement is
a *class* contract ("transient only"), and the implementation honors only
two of the permanent codes — everything else drifts into the retry bucket.
The correct review checks the classification against the stated classes,
not just "there is a 400 branch."
