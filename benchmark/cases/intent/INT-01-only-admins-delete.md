---
id: INT-01
category: intent
title: "Only admins can delete accounts" — implementation lets any user delete any account
mode: STRICT
user_request: "Add an account-deletion endpoint. ONLY admins may delete accounts, and only other users' accounts (never their own through this path)."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: true
primary_finding: "authorization check missing entirely — any authenticated user can delete any account"
key_skills: [intent, authorization, semantic-violation]
---

# INT-01 — "Only admins can delete accounts" — implementation lets any user delete any account

## Scenario

A SaaS admin panel. A dev added a `DELETE /users/:id` endpoint. The
request explicitly stated the permission model: only admins, never
self-deletion through this endpoint. The implementation added
authentication but no role or self-check.

## User request

> Add an endpoint to delete a user account. Only admins may delete
> accounts, and an admin should not be able to delete their own account
> through this endpoint.

## Code change (diff)

```js
app.delete('/users/:id', requireAuth, async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
```

## Surrounding context

- `requireAuth` verifies a valid session and sets `req.user` — it does not
  check roles.
- The `users` table has a `role` column (`'admin' | 'member'`), and the
  session already carries `req.user.role`.
- `/users/:id` accepts any id, including the caller's own.

## Expected outcome

- **BLOCKING.** The endpoint validates *authentication* but not the two
  stated authorization constraints: (1) any authenticated member can delete
  any account, including admins; (2) self-deletion is not blocked. This is
  a direct contradiction of the user's explicit requirement.
- Evidence: `CONFIRMED` — the absence of the check is visible in the diff:
  `requireAuth` then a bare `DELETE`. The role and self-guard are
  structurally missing; no runtime step is needed to see the request does
  not enforce them. This is the "missing code" class of finding — the
  evidence is that the requirement's condition appears nowhere in the
  implementation.
- Impact: any logged-in user can destroy any account — catastrophic in
  production.
- Investigation: MEDIUM — compare the requirement's constraints against
  what the endpoint enforces.
- Regression test: yes — a member deleting another account must get 403;
  an admin deleting their own account must get 403; an admin deleting
  another member succeeds.
- Verification: fix with
  `if (req.user.role !== 'admin' || req.params.id === String(req.user.id))
  return res.status(403).end();` before the DELETE; re-run the three
  permission tests.

## Trap for the grader

`requireAuth` looks like "security is handled." The defect is a *semantic
violation* of the stated requirement, not a syntax or crash issue — the
code runs fine, it just does the wrong thing. A review that checks only
"is there auth" and "is the query parameterized" approves a catastrophic
endpoint.
