---
id: ARC-01
category: architecture
title: Auth moved to a middleware boundary — a route escapes it
mode: STRICT
user_request: "Refactor auth into shared middleware so every route is protected by default, and only the public ones opt out."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: VERY-HIGH
requires_regression_test: true
primary_finding: "the auth boundary changed, and the new admin route is registered before the middleware — it bypasses auth entirely"
key_skills: [architecture, auth-boundary, middleware-ordering, seam]
---

# ARC-01 — Auth moved to a middleware boundary — a route escapes it

## Scenario

An Express app previously applied auth per-route. A refactor introduced a
global auth middleware that protects everything by default, with an
explicit public allowlist. The diff also adds a new admin route. Because
of registration order, the new route is mounted *before* the auth
middleware — it is never protected.

## User request

> Refactor auth into shared middleware so all routes are protected by
> default, and only explicitly-public ones are exempt. Also add an admin
> endpoint to fetch all users.

## Code change (diff)

```js
// lib/auth-middleware.js (new)
export const authRequired = (req, res, next) =>
  req.user ? next() : res.status(401).end();

// server.js
import { authRequired } from './lib/auth-middleware.js';
import adminRoutes from './routes/admin.js';   // new: GET /admin/users
import publicRoutes from './routes/public.js';

app.use(express.json());
app.use('/admin', adminRoutes);        // ← registered FIRST (no auth guard)
app.use(authRequired);                 // ← auth boundary applied AFTER
app.use(publicRoutes);
```

## Surrounding context

- Before the refactor, `/admin/users` carried an explicit `authRequired`
  middleware (in `routes/admin.js`).
- The refactor's intent (from the request) is "protected by default."
- `server.js` shows `app.use('/admin', adminRoutes)` before
  `app.use(authRequired)`, and `routes/admin.js` (visible in the repo) no
  longer attaches the per-route guard.

## Expected outcome

- **BLOCKING.** The security boundary changed shape: from per-route
  guards to one global middleware. The new admin router is mounted before
  the global guard, so every admin route bypasses authentication entirely.
  The refactor that was supposed to make auth *stronger* (default-on) made
  it *weaker* for exactly the route that needs it most.
- Evidence: `CONFIRMED` — the ordering is visible: `app.use('/admin',
  adminRoutes)` precedes `app.use(authRequired)`. A request to
  `/admin/users` is handled by the admin router and never reaches
  `authRequired`. The seam is the *registration order relative to the
  middleware boundary*.
- Investigation: VERY-HIGH — architecture cases require mapping routes to
  the middleware boundary they sit under, not just reading the diff line
  by line. The reviewer must reason about Express's registration order and
  where each route falls relative to the guard.
- Impact: unauthenticated access to all-user data.
- Regression test: yes — a request to `/admin/users` without a session
  must 401; the test must exist across the refactor.
- Verification: fix by mounting `authRequired` before the admin router (or
  attaching the guard in the admin router); re-run the unauthenticated
  request.

## Trap for the grader

The diff "moves auth to a middleware" and looks strictly better. The bug
is invisible to a line-by-line read — it requires reasoning about the
*architecture*: which routes the boundary actually covers. A review that
approves the refactor because "authRequired is present" without checking
registration order misses the regression.
