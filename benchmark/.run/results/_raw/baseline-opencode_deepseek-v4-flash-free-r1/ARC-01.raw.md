## Review

This is a security regression, and the single most important issue in the diff is unambiguous: **`/admin/users` is now completely unauthenticated.**

The ordering in `server.js` decides the outcome. Express runs middleware in registration order, so a request to `GET /admin/users` arrives at the `adminRoutes` router (`app.use('/admin', adminRoutes)`) *before* `app.use(authRequired)` is ever reached. Since `routes/admin.js` was also stripped of its per-route `authRequired` guard during the refactor, there is no authentication check anywhere on the path — `req.user` is never consulted and a 401 is never produced. The trace is: any anonymous request → `GET /admin/users` → `routes/admin.js` handler → returns all users, 200.

This is a direct semantic violation of the request. The user asked for "protected by default, only explicitly-public ones exempt"; the refactor instead produced the exact inverse for the admin route: *unprotected by default, nothing explicitly exempting it.* The old code (per-route `authRequired` on `/admin/users`) at least worked; the new code silently widens exposure to every unauthenticated user — including unauthenticated enumeration of the entire user table.

Verification is trivial and concrete. Without any auth cookie/token/header: `curl -i http://localhost:3000/admin/users` should return `200` plus the users JSON, proving the boundary is bypassed; a correct implementation returns `401`. Before the change the same call returned `401`.

Concrete fix options (pick one):
- **Reorder and mark exceptions** (matches "default protected" intent): mount the boundary before every router and give `authRequired` an explicit public allowlist, e.g.

```js
const PUBLIC_PATHS = new Set(['/healthz']);
export const authRequired = (req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) return next();
  return req.user ? next() : res.status(401).end();
};
// server.js
app.use(express.json());
app.use(authRequired);            // boundary before ALL routers
app.use('/admin', adminRoutes);
app.use(publicRoutes);            // public routes rely on the allowlist
```
- Or, minimally: `app.use('/admin', authRequired, adminRoutes)` and keep `app.use(authRequired)` before `publicRoutes` only.

The overhead of a regression test (assert anonymous `GET /admin/users` returns 401, authenticated returns 200) is fully justified given the severity.

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
  "notes": "The diff itself proves the defect: adminRoutes is mounted before app.use(authRequired) and the per-route guard was deleted, so /admin/users is 401-free; a concrete anonymous curl + explicit fix + regression test are given, and no findings were invented."
}
```
