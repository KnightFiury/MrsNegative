---
id: MAI-02
category: maintainability
title: New email normalizer duplicates an existing shared util
mode: BATCH
user_request: "Ensure emails are normalized before they reach the profile service."
severity_expected: NITPICK
evidence_expected: CONFIRMED
investigation_expected: LOW
requires_regression_test: false
primary_finding: "new normalizeEmail() duplicates the existing normalize('email', …) util — use the shared one instead"
key_skills: [maintainability, duplication, existing-helper]
---

# MAI-02 — New email normalizer duplicates an existing shared util

## Scenario

A profile team needs every email trimmed and lowercased before it hits the
profile service. The platform already has `src/shared/strings.ts` exporting
`normalize(kind, value)` with `kind: 'email'`, which does trim + lowercase
and is used by four other services. The team ships a new file that
re-implements the same two lines locally instead of calling the shared
helper.

## User request

> Normalize email addresses (trim whitespace, lowercase) on every path into
> the profile service so lookups never miss due to formatting.

## Code change (diff)

```ts
// src/user/normalize.ts — NEW
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// src/user/service.ts — uses the new helper
import { normalizeEmail } from './normalize';

export async function findOrCreateProfile(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  return db.upsertProfile({ email });
}
```

## Surrounding context

- `src/shared/strings.ts` has, and has had for two years:
  `normalize('email', v) { return v.trim().toLowerCase(); }` — identical
  semantics, already imported by four other services.
- The new code is behaviorally correct: trim + lowercase matches the shared
  util exactly. There is no bug.
- The platform convention (checklist item "no reinvented shared
  utilities") says to reuse `normalize('email', …)`.

## Expected outcome

- **NITPICK** with evidence **CONFIRMED**, investigation **LOW**. Behavior
  is correct; the finding is duplication: `normalizeEmail` is a copy of the
  shared `normalize('email', …)` with the same semantics. The fix is to
  drop the new file and call the shared helper.
- Name the drift risk: two implementations of "email normalization" will
  diverge the first time one of them adds unicode folding or domain
  handling, and this call site will be the one left behind.
- BATCH mode: one grouped [MAINTAINABILITY] note, tagged NITPICK,
  non-blocking. No regression test required.

## Trap for the grader

Two traps. (a) Treating it as WORTH-FIXING because "the two
implementations might already differ" — they do not; the shared util is
identical and inspectable, so this is duplication, not a latent bug, and
the trap is asserting a divergence that is not there. (b) Treating it as
NO-ISSUE silence — the duplication is real and the project explicitly
conventions against it, so a batched NITPICK is the calibrated answer.
Either extreme (silence or escalation) is a calibration miss.
