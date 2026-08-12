## Review

The change is behaviorally correct: `normalizeEmail` performs trim + lowercase, which matches `normalize('email', …)` in `src/shared/strings.ts` line-for-line, so the user request ("trim whitespace, lowercase, on every path") is fully satisfied with no bug and no regression risk.

The one real issue is a platform-convention violation: `src/user/normalize.ts` re-implements two lines that `src/shared/strings.ts` has shipped for two years with identical semantics and four existing consumers. This violates the "no reinvented shared utilities" checklist item, duplicates logic, and creates a future divergence hazard — if the shared normalization ever changes (e.g., trim-then-lowercase order, Unicode casing, empty-string handling), the profile service would silently drift from the other four services. It's worth-fixing, not blocking: nothing is broken, and the fix is trivial.

Concrete fix: drop `src/user/normalize.ts` and call the shared helper — `const email = normalize('email', rawEmail);` in `src/user/service.ts`. Verification is simple: confirm the shared helper's existing usage with something like `rg "normalize\\('email'" src` (it should already appear in the four other services), then rebuild/run the profile service tests to confirm `findOrCreateProfile` still normalizes. No regression test is required for a behavior-preserving DRY refactor, so I decline to demand one.

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
  "regressionStance": "decline",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Behavior matches the shared util exactly, so the only real issue is the reinvented normalize('email', …) convention violation, confirmed directly from the provided context; WORTH-FIXING, not blocking."
}
```
