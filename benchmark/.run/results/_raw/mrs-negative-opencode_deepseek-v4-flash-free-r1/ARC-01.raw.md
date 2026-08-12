## Review

This diff breaks the very thing it claims to do. The request is "protected by default," but `app.use(authRequired)` is mounted *after* `app.use('/admin', adminRoutes)`, so the middleware never sees requests to `/admin/users`. Before the refactor, `routes/admin.js` attached `authRequired` per-route; the diff removes that guard and replaces it with a global one that is ordered too late. Result: `GET /admin/users` now returns the full user list to anyone, with no session. In Express, `app.use` order is the request path — a middleware registered after a router simply doesn't run for it. The whole refactor's intent is inverted.

🛑 [SECURITY] [CONFIRMED] The auth boundary is registered after the admin router, so `/admin/users` is unprotected — exactly the regression the "protected by default" refactor was meant to prevent.
   Evidence: `server.js` order is `app.use('/admin', adminRoutes)` → `app.use(authRequired)` → `app.use(publicRoutes)`. Express dispatches in registration order; requests to `/admin/*` are consumed by the router before `authRequired` is ever reached. `routes/admin.js` no longer attaches the per-route guard that previously protected `/admin/users`. A request with no session hits the route and returns all users.
   Impact: unauthenticated callers can enumerate every user in the system.
   → Fix: register the auth boundary before any protected routes — `app.use(authRequired)` immediately after `express.json()`, before `app.use('/admin', adminRoutes)` — or restore the explicit guard on the admin router as the allowlist/exemption layer; the global middleware should be the default, not the tail.
   Verification: `curl -i /admin/users` with no session/cookie — assert 401; before the fix it returns 200 with the user list. Pin it as a regression test: an integration test that hits `/admin/users` unauthenticated and asserts `401`.

This is the single most important issue in the diff, and it's confirmed by inspection of the middleware ordering — no runtime check needed. Fix is a one-line reorder plus the failing-first test.

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
  "notes": "Route mounted before the global auth middleware leaves /admin/users unauthenticated, directly defeating the refactor's stated 'protected by default' intent; confirmed by the deterministic Express dispatch order in the diff."
}
```
