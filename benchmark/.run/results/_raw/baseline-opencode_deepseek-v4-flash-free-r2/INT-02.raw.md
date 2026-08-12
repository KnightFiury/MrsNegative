## Review

This refactor violates the explicit backwards-compatibility requirement. `docs/mobile-api.md` in the repo documents that the iOS/Android client reads `username` and `email` from `GET /users/:id`, but `toProfile` returns `{ id, name, avatar_url }` — so the response now renames `username` → `name` and drops `email` entirely. Existing mobile clients reading those fields will receive `undefined`/fail deserialization, silently breaking a documented public contract. The "pure refactor" intent is defeated by an altered wire shape; the user's stated constraint was "existing clients keep working unchanged," which this change directly violates.

Concrete evidence: the repo's own `docs/mobile-api.md` specifies the consumed fields; the diff shows the two conflicting shapes with no adapter in `serializeUser`. Verification is straightforward — hit `GET /users/:id` before/after and diff the JSON, or run the existing API contract tests. The fix is to preserve the legacy contract at the boundary, e.g. `serializeUser(user) { const p = toProfile(user); return { id: p.id, username: p.name, email: user.email }; }` (or add an option to `toProfile`), keeping the response key-compatible. This needs a regression test asserting the presence of `username`/`email`, since a contract break of this kind is otherwise silent.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Breaking the documented username/email response contract for the repo's mobile client violates the explicit backwards-compatibility requirement, confirmed against docs/mobile-api.md."
}
```
