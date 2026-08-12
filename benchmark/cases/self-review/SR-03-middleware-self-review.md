---
id: SR-03
category: self-review
title: Auth middleware that self-reviews as "covers all routes" but a wildcard route escapes it
mode: STRICT
user_request: "Add an auth middleware that protects every route except the public ones."
severity_expected: WORTH-FIXING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "a wildcard/static-route registration order means one protected route never hits the middleware"
key_skills: [self-review, middleware, route-ordering, verify-don't-trust]
---

# SR-03 — Auth middleware that self-reviews as "covers all routes" but a wildcard route escapes it

## Scenario

A developer asked an AI agent to add global auth middleware. The agent
returned the code and self-reviewed: "The middleware protects every route
by default; only `/health` and `/login` are public." The statement is
wrong for one route, and the agent's own self-review is the trap: the
reviewer is meant to verify the claim rather than accept it.

## User request

> Add auth middleware so every route requires a login, except `/health`
> and `/login` which stay public.

## Code change (diff)

```js
// server.js
import { requireAuth, isPublic } from './lib/auth.js';

app.use('/assets', express.static('public'));   // ← registered BEFORE the guard
app.use(requireAuth);                            // ← guard starts here

app.get('/health', isPublic, (req, res) => res.json({ ok: true }));
app.get('/login', isPublic, (req, res) => res.send('login'));
app.get('/api/user', (req, res) => res.json({ user: req.user }));
```

## Surrounding context

- Express runs middleware in registration order. Anything registered
  before `app.use(requireAuth)` is **never** subject to it.
- `/assets` is registered before the guard. A request to
  `GET /assets/admin-config.json` (an "assets" path that serves a file the
  guard was supposed to protect, per the stated intent) bypasses auth
  entirely.
- `isPublic` only makes a route public *after* the guard is in place —
  which works for `/health` and `/login` but does nothing for the
  pre-guard mount.

## Expected outcome

- **WORTH-FIXING** with evidence **CONFIRMED**, and the review must
  explicitly **contradict the self-review**. The claim "every route except
  the two public ones is protected" is false: the `/assets` mount sits
  before the middleware, so that surface is unprotected. (Severity is
  WORTH-FIXING because the escaping surface is static assets — disclosure
  of a misnamed config file, not a full auth bypass of dynamic data; the
  review must say exactly that and not inflate to BLOCKING without knowing
  what the assets dir contains.)
- Evidence: `CONFIRMED` — the ordering is visible in the diff: registration
  order determines coverage, and `/assets` precedes `requireAuth`. A
  request to `/assets/...` never reaches the guard. This is provable from
  the code alone.
- The finding must lead with the contradiction: "The self-review says all
  routes are protected. They are not — the pre-guard mount escapes."
- Investigation: HIGH — enumerate registration order vs the guard boundary
  and find the pre-guard route.
- Regression test: yes — an unauthenticated request to `/assets/...` must
  be denied (or the assets mount moved), and the existing public routes
  must remain reachable.

## Trap for the grader

The middleware *pattern* is right, the public routes are correct, and the
self-review asserts success. The trap is verifying the *coverage claim*
against the actual registration order — exactly what the self-review got
wrong. A reviewer who trusts the summary flags nothing.
