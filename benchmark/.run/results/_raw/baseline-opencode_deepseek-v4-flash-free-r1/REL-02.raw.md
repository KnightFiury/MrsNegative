## Review

The loop delivers the literal request — 5 attempts (4 retries) before failing — and correctly avoids retrying non-429/503 4xx errors. The real problem is that retries are issued **immediately, with no delay, backoff, or jitter**, on exactly the status codes (429/503) the service docs define as "I am overloaded." Given the stated context — many users in flight, all hitting the loop simultaneously during an incident — each failing request spawns up to 4 immediate duplicates, multiplying aggregate traffic up to 5× against an already-saturated service. That is the thundering-herd pattern the overload handling is meant to prevent, so under the exact conditions it targets it makes load *worse*, the opposite of the intent.

Secondary: a transport-level rejection from `fetch` (e.g., connection reset, common under overload) is uncaught — the raw `TypeError` propagates and is not retried, bypassing the `resize failed` path.

Fix: exponential backoff with full jitter before each retry, honoring `Retry-After` when present, e.g. `await sleep(Math.min(2 ** attempt * 50, 500) + Math.random() * 50)`; and wrap `fetch` in try/catch so network errors are treated as retryable. Verify by mocking `fetch` to return 503 repeatedly and asserting the inter-call interval grows (or `Retry-After` is honored) and that attempts cap at 5; regression-test that no retry is issued for 400s.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "confirm",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Primary finding: retrying 429/503 with zero delay amplifies load on an overloaded service (load is the stated problem); secondary: uncaught fetch transport errors are neither retried nor converted to the intended error."
}
```
