## Review

The intent was stated up front — backwards compatibility, "existing clients keep working unchanged" — and the diff delivers the opposite. `serializeUser` now returns `toProfile(user)` = `{ id, name, avatar_url }`: `username` is renamed to `name`, and `email` is dropped. The repo itself documents the consumer: `docs/mobile-api.md` says the iOS/Android client reads both `username` and `email` off `GET /users/:id`. So this is not a hypothetical blast radius — it's a documented contract, narrowed while the task promised to preserve it.

🛑 [INTENT] [CONFIRMED] Response shape changed despite the explicit "must stay backwards compatible" requirement — behavior contradicts stated intent.
   Evidence: the diff swaps `{ id, username, email }` for `{ id, name, avatar_url }`; `docs/mobile-api.md` in-repo documents clients reading `username` and `email` from this endpoint.
   Impact: every existing iOS/Android client breaks parsing this payload on the common path.
   → Fix: keep the legacy fields alongside the helper, e.g. `return { ...toProfile(user), username: user.username, email: user.email };`.
   Verification: write a test asserting `GET /users/:id` still returns `username` and `email`; run it against this diff and watch it fail, then pass after the fix.

Confidence check: you're not actually confident the mobile client keeps working the day `email` stops showing up, are you?

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
  "notes": "The contract break is the primary issue and it is documented in-repo (docs/mobile-api.md), so CONFIRMED and blocking on the common path."
}
```
