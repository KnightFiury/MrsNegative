## Review

The transient half is correct: timeouts (no `err.response`), 429, and 5xx all fall through to the retry bucket, exactly as requested. The permanent half under-implements the requirement. The scenario names the permanent set as "400 validation, 403, **404**" — but the branch only exempts 400 and 403. Every other 4xx (401, 404, 405, 409, 422…) lands in the retry bucket, burns all three attempts, and then dies behind a generic `sync failed after retries` message that has discarded the real error the user explicitly wanted to see. That's a direct contradiction of "do not retry permanent failures like 400/403" — the user's own context lists 404 as permanent, and this code retries it.

- **⚠️ [INTENT] [LIKELY]** Permanent failures other than 400/403 — notably 404, named permanent in the context — are retried.
  - Evidence: trace of the branch — `status === 404` fails both `=== 400` and `=== 403` checks, falls through to retry; the surrounding context explicitly classifies 404 as permanent. No execution needed to see the mismatch.
  - Impact: three wasted calls against a dead request, and the real error is masked by the generic exhaustion message.
  - → Fix: classify by status class, not enumeration — retry only timeouts (no `response`), 429, and 5xx: `if (err.response && err.response.status >= 400 && err.response.status < 500 && err.response.status !== 429) throw err;`. Attach the original error on exhaustion (`throw new Error(\`sync failed…\`, { cause: lastErr })`) so the "see the real error" goal survives the retry path too.
  - Verification: mock `api.put` to reject with 404 and assert it throws on attempt 1 (no retry); mock 429 and a timeout and assert 3 attempts, then a throw that carries the original error.
- 💭 [RELIABILITY] The final error string drops the original error entirely — even for genuinely transient failures that exhaust, the caller can't see what actually went wrong.

You're not actually confident a 404 fails fast here, are you — the scenario names it as a permanent error, and this code retries it.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "LIKELY",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "confirm",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The misclassification is directly traceable from the provided context (404 explicitly named permanent yet retried), but is an intent/fail-fast violation with no data loss or crash, so WORTH-FIXING with LIKELY evidence rather than BLOCKING."
}
```
