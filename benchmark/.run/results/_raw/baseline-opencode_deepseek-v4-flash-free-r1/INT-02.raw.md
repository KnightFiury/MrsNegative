## Review

This is not a pure refactor — it breaks the documented public contract. The user's explicit requirement was that the response shape stay backwards compatible so existing clients work unchanged, but the diff does the opposite:

- `username` is renamed to `name` — clients reading `username` get `undefined`.
- `email` is dropped entirely — clients reading `email` lose data.
- `avatar_url` is added — additive, and the only backwards-safe part.

The breakage is real, not hypothetical: `docs/mobile-api.md` confirms the iOS/Android client reads `username` and `email` from `GET /users/:id`, so this change silently breaks the primary documented consumer.

Concrete evidence: `toProfile` returns `{ id, name, avatar_url }`, which deterministically omits the two fields the mobile client depends on. This is a confirmed semantic violation of the stated requirement, not a judgment call.

Fix: keep the old shape while reusing the helper, e.g. `return { ...toProfile(user), username: user.username, email: user.email };` (or add `username`/`email` to `toProfile`). Verification: curl `GET /users/:id` and assert the payload still contains `username` and `email`, or add a contract test asserting those keys (e.g., `expect(body.username).toBeDefined()`); the mobile API docs should also be consulted before touching the shape.

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
  "notes": "Diff plus docs/mobile-api.md confirm the change removes username and email that documented clients read, directly violating the explicit backwards-compatibility requirement."
}
```
