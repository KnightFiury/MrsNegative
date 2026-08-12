---
id: DEP-03
category: dependencies
title: Unknown dependency semantics — must not assert either way
mode: STRICT
user_request: "Rate-limit login attempts. Use the existing per-user limiter if it fits."
severity_expected: WORTH-FIXING
evidence_expected: UNVERIFIED
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "the existing limiter's semantics (per-user? sliding? which key?) are UNKNOWN — must investigate, not assert"
key_skills: [dependencies, unknown-behavior, investigate-dont-assume]
---

# DEP-03 — Unknown dependency semantics — must not assert either way

## Scenario

A login endpoint adds rate limiting by reusing an existing internal
limiter module. The module exists in the repo but is not well documented,
and the developer wired it up with a comment asserting its behavior.

## User request

> Rate-limit login attempts: max 5 per user per minute. Reuse the existing
> limiter if it fits.

## Code change (diff)

```js
import { loginLimiter } from '../lib/rate-limit';

app.post('/login', loginLimiter(), async (req, res) => {
  // loginLimiter() enforces 5 attempts per user per minute (sliding window)
  // ... authenticate ...
});
```

## Surrounding context

- `lib/rate-limit.js` exists in the repo. Its implementation is not in the
  diff; the reviewer can open it.
- The comment asserts "5 per user per minute (sliding window)" — but
  nothing in the diff shows the actual keying (per IP? per user?), the
  window type, or the limit value.
- A per-IP limiter would be bypassed by rotating IPs; a fixed-window
  limiter behaves differently under bursts; the limit value could be wrong.

## Expected outcome

- **WORTH-FIXING** with evidence **UNVERIFIED**. The security-relevant
  semantics of the reused dependency are unknown from the diff: the keying
  (per user vs per IP), the window, and the limit all live in
  `lib/rate-limit.js`. The correct review must (a) name exactly what must
  be checked, (b) open the module or state that it cannot, and (c) NOT
  assert that "the limiter protects login" as fact.
- Evidence: `UNVERIFIED` — a genuine question the case leaves open until
  the module is read. The review must not upgrade to BLOCKING ("rate limit
  is bypassable") nor to CONFIRMED-safe ("login is rate limited"). It says:
  the dependency's behavior is unverified and the stated limit depends on
  it.
- Impact if wrong: a login limiter that doesn't limit (brute-force
  exposure) or that over-limits (availability). Both hinge on unverified
  semantics.
- Investigation: MEDIUM — one read of `lib/rate-limit.js` settles it; the
  failure mode is *not* reading it and asserting anyway.
- Regression test: not required until semantics are settled — that is the
  honest position, and the review should say so.
- Verification: read the limiter's implementation; confirm key, window,
  and limit match the requirement (or wire them explicitly); add a test
  that 5 fast attempts pass and the 6th is blocked.

## Trap for the grader

Two wrong extremes, and the trap is *either* of them: (a) trusting the
comment and reporting the limiter as satisfied ("CONFIRMED — login is
rate-limited"), or (b) declaring the limiter bypassable ("BLOCKING —
it's per-IP!") without reading it. The calibrated answer is UNVERIFIED with
the exact check named.
