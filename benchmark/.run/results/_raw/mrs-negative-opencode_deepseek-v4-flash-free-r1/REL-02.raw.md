## Review

The loop does what was asked — retry a few times — but it retries the exact statuses (429/503) the service uses to say "I'm overloaded," and it does so instantly, up to five times in a row, no delay. With many users on the endpoint, that's not a retry, that's a thundering herd: every concurrent request multiplies into up to 5 immediate hits on an already-overloaded service, which keeps it from draining and extends the incident. The call is idempotent, so this never corrupts state — the harm is purely load, which is exactly what the context names as the problem.

⚠️ [RELIABILITY] [LIKELY] Immediate retries on 429/503 with no backoff or jitter amplify load during an incident.
- Evidence: per the docs, the service returns 429/503 specifically when overloaded; the code retries exactly those statuses immediately, up to 5x per request; under concurrent load the multiplier arrives all at once. Couldn't run a load repro in-session — reasoned from the code path and provided context.
- Impact: an overloaded resize service gets hammered by up to 5x duplicate calls, prolonging rather than relieving the incident.
- → Fix: exponential backoff with jitter before each retry — `await sleep(Math.min(100 * 2 ** attempt, 2000) + Math.random() * 200)` — and honor `Retry-After` if the service sends it.
- Verification: a unit test with fake timers asserting the delay between attempts increases and includes jitter; or a load test against a mock returning 503 asserting requests arrive spread out, not in 5 concurrent bursts.

Intent is preserved — the code does retry as the user asked; the issue is *how*, not *whether*. Nothing else in the diff deserves a tag.

"You're not actually confident this handles a hundred users retrying into an overloaded service at once, are you — the only thing between this and a retry storm is hoping requests happen to stagger?"

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
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Retry-without-backoff on overload statuses is a real load risk but not data loss/exploit/crash, so WORTH-FIXING with LIKELY evidence from the docs/code-path trace rather than BLOCKING."
}
```
