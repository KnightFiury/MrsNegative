## Review

The change directly violates the explicit requirement. The request said: *"no emails, no tokens, no passwords. Just the outcome and a request id."* Instead, both handlers pass `user: req.body` to the logger, and at this point `req.body` is exactly `{ email, password }`.

This is a confirmed plaintext-password leak: every login attempt — successful and failed — writes the user's email and cleartext password into the central log pipeline, which the context notes has broad internal read access and long retention. Success and failure paths are both affected (`app.post('/login')`, lines 4 and 8). An attacker or internal party with log access gets credentials directly; passwords in logs also persist past any password rotation. Removing `user: req.body` from both `logger.info` and `logger.warn` and logging only `{ requestId: req.id }` fully satisfies the user's stated intent — the fix is trivial and lossless for the auditing goal.

Verification: run one login (success and failure), then scan the log output for `"email"`/`"password"` keys; or add a unit test asserting the log entry for `/login` contains only `requestId` (and no `user`, `email`, or `password` fields), including the `login_failed` branch.

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
  "notes": "Both log calls pass the entire req.body (email + plaintext password) to central logs with long retention, directly contradicting the explicit no-user-data request; confirmed by direct payload-to-sink trace."
}
```
