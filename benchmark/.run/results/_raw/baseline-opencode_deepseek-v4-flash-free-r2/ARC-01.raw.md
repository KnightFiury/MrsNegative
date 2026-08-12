## Review

**Security regression: `/admin/users` is exposed without authentication.**

Express invokes middleware in registration order, so the trace is airtight from the code alone: `app.use('/admin', adminRoutes)` runs before `app.use(authRequired)`. An unauthenticated request to `GET /admin/users` reaches the admin handler directly and never passes the `authRequired` boundary (routes/admin.js:GET /admin/users). Because the refactor removed the per-route `authRequired` guard from `routes/admin.js` and relied entirely on the shared middleware, the new "protected by default" contract is violated for exactly the route carrying the most sensitive data (all users — PII). `/public` routes mounted after the guard are correctly public, which confirms the ordering intent, but the fix is non-uniform.

**Verification:** `curl -i https://<app>/admin/users` with no session cookie will return `200` + the full user list instead of `401`.

**Fix:** move the auth boundary above the admin mount — `app.use(authRequired)` before `app.use('/admin', adminRoutes)` — or add `authRequired` back to the `admin.js` route definitions. Add a regression test asserting unauthenticated `GET /admin/users` → 401.

The primary issue is complete: it is present, confirmed, evidence-backed, and directly violates the user request ("protected by default").

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
  "notes": "Express ordering trace proves /admin/users is registered before authRequired, confirming an unauthenticated path to all users data directly contradicting the protected-by-default intent."
}
```
