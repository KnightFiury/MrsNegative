## Review

This diff lands on an authorization seam and skips the only two things the request actually demanded. `requireAuth` gets you an authenticated `req.user` — nothing here ever reads `req.user.role`, so any member can pass `DELETE /users/:id` with any id, including an admin's. And nothing compares `req.user.id` against `req.params.id`, so an admin can delete their own account through the very endpoint the request said must forbid it. The query is parameterized (`$1`), so at least the injection basics are covered — that's the one green thing on this diff.

🛑 [SECURITY] [CONFIRMED] Missing authorization — no admin role check and no self-deletion guard.

- **Evidence:** the handler's full body is `db.query` + `status(204)`. `requireAuth` sets `req.user` and stops (context confirms it checks no roles). A member sends `DELETE /users/:id` for another user → query runs → 204. An admin sends their own id → query runs → 204. Both forbidden by the stated permission model; both execute.
- **Impact:** any authenticated user can delete any account; admins can self-delete via this endpoint.
- **→ Fix:** guard before the query: `if (req.user.role !== 'admin') return res.status(403).end();` then `if (String(req.user.id) === req.params.id) return res.status(400).end();` — compare with the same coercion on both sides, since `req.params.id` is a string.
- **Verification:** as a `member`, delete another user → expect 403, row intact. As an `admin`, delete your own id → expect 400, row intact. Add a regression test asserting both.

You're not actually confident a member calling `DELETE /users/:id` on an admin's account gets anything but a 204, are you?

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
  "notes": "Static trace confirms the failure: the handler never reads req.user.role or req.user.id, so both forbidden paths execute a 204 — member-deletes-admin and admin-self-delete."
}
```
