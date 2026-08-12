---
id: MAI-01
category: maintainability
title: Token lifetime hard-coded where a named constant already exists
mode: BATCH
user_request: "Keep the session token lifetime consistent across issue and extension."
severity_expected: NITPICK
evidence_expected: CONFIRMED
investigation_expected: LOW
requires_regression_test: false
primary_finding: "token lifetime hard-coded as 86400 twice instead of using the existing SESSION_TTL_SECONDS constant"
key_skills: [maintainability, magic-number, drift-risk]
---

# MAI-01 — Token lifetime hard-coded where a named constant already exists

## Scenario

An auth service issues and extends session tokens. The team defined a single
source of truth for the session lifetime — `SESSION_TTL_SECONDS` in
`config.ts`, computed as `24 * 60 * 60` with a comment — and a review
checklist item says "no magic values where a named constant exists". This
diff lands a session-extend feature that re-uses the same lifetime but
hard-codes the number again instead of importing the constant.

## User request

> Add `extendSession` so a session can be renewed for another session
> lifetime without the user logging in again. Use the same lifetime as
> issuing.

## Code change (diff)

```ts
// src/auth/tokens.ts
import jwt from 'jsonwebtoken';
import { SECRET } from './secrets';

export function issueSessionToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: 86400 }); // 24h
}

export function extendSession(token: string) {
  const payload = jwt.verify(token, SECRET);
  return jwt.sign(payload, SECRET, { expiresIn: 86400 }); // 24h
}
```

## Surrounding context

- `src/config.ts` already exports `SESSION_TTL_SECONDS = 24 * 60 * 60`
  with the comment "single source of truth for the session lifetime",
  and `tokens.ts` already imports from `./secrets`.
- `86400` is seconds in a day — the same value `SESSION_TTL_SECONDS`
  computes. The token payload and verification logic are correct.
- Nothing about the session-extension behavior is wrong: issuing,
  extending, and verifying all behave as specified.

## Expected outcome

- **NITPICK** with evidence **CONFIRMED**, investigation **LOW**. The
  behavior is correct; the finding is a maintainability nitpick: the same
  magic value `86400` appears twice (issue + extend) where the named
  constant `SESSION_TTL_SECONDS` already exists and is the documented
  single source of truth. The fix is trivial — import and use it in both
  places.
- The drift risk is concrete enough to state: if the team ever changes the
  session lifetime in `config.ts`, the two hard-coded `86400`s silently
  diverge (one place is the "24h" everyone points at, the other is not).
- BATCH mode is appropriate: one grouped [MAINTAINABILITY] note, tagged
  NITPICK, non-blocking. No regression test required. No other findings.

## Trap for the grader

The trap is treating this as WORTH-FIXING or worse — e.g. "the token
outlives its session" or "re-issuing a token from a verified payload is a
security risk". Both are wrong here: `expiresIn` was passed in both calls,
verification enforces the original expiry, and no security property is
violated. Escalating a correct-behavior magic-number nitpick above NITPICK
is exactly the over-tagging the rubric penalizes. The correct output is one
batched, low-key nitpick and nothing else.
