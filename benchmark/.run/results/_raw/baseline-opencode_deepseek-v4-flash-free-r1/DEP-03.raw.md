## Review

The change reuses `loginLimiter` from `lib/rate-limit.js`, whose implementation is not shown in the diff, and then asserts in a comment that it "enforces 5 attempts per user per minute (sliding window)." None of those three claims — the limit value, the per-user keying, or the window type — is supported by anything in the diff. `loginLimiter()` is invoked with no arguments, so neither the key source (per IP vs. per user) nor the limit/window is visible at the call site.

This matters precisely because the user asked to reuse the limiter "if it fits." Fit is unverified: a per-IP-keyed limiter is trivially bypassed by rotating IPs, a fixed-window limiter behaves differently under bursts than a sliding one, and the limit could just as easily be 100 as 5. The comment is a belief stated as a fact, and a mistaken one wouldn't fail any test that isn't written.

Concrete verification is cheap and runnable: read `lib/rate-limit.js` and check how the key is derived and what the limit/window constants are; then exercise the endpoint — send 5 failed logins for user A within 60s and assert the 6th returns 429 while a different user is still allowed, and repeat the same user's attempts from a second IP to confirm keying is per-user and not per-IP.

Concrete fix: after verifying, if the limiter keys on IP rather than user, pass an explicit per-user key at the call site (e.g., key on `req.body.username`) or swap for a per-user limiter; otherwise align the comment with the measured behavior and add a regression test that locks in "5 per user per minute."

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "UNVERIFIED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "confirm",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The gap is confirmed (the comment asserts per-user/5/min/sliding-window with no supporting evidence in the diff), but the actual limiter defect is unverified without reading lib/rate-limit.js, so this is WORTH-FIXING rather than BLOCKING."
}
```
