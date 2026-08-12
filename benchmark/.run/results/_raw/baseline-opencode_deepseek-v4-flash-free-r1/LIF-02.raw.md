## Review

The claimed fix is **not complete** — the original BLOCKING finding must stay open. The diff confirms the ownership predicate is still absent: the query remains `SELECT * FROM invoices WHERE id = $1` with no `AND user_id = $2` (`req.user.id` never appears), and the new line gates on `req.user.role !== 'admin'`, which is a *different* authorization property. Checking "is the caller an admin" does not check "does the invoice belong to the caller," so it does not satisfy the finding's required fix.

Two concrete consequences visible directly in the diff:

1. **Original IDOR not closed.** The download path still has no ownership constraint. Anyone who passes the role gate (admins, or any role the gate admits) can fetch any invoice by id — cross-user disclosure remains reachable. The scenario notes this explicitly: admins have zero ownership bounds.
2. **Regression introduced.** A non-admin invoice *owner* is now blocked with a 403 from downloading their own invoice, breaking legitimate access the endpoint previously permitted. The change fixed nothing about ownership while breaking the legitimate owner path.

Because the role check replaced rather than supplemented the required ownership check, and because no regression test for the ownership property was added, the follow-up claim ("we've fixed it") is false and closure is denied.

**Concrete verification** (to prove, not just assert): create users A (non-admin) and B (non-admin) plus an admin; (a) as A, request `/invoices/<B's id>/download` — expect the ownership-based 404/403, but the role gate returns 403 while B's own invoice as A also returns 403, confirming the owner regression; (b) as admin, request the same URL — expect 200 with B's invoice, confirming ownership is still unenforced. A grep for `user_id` in the route handler also returns nothing.

**Concrete fix** (matching the original finding): revert to an ownership predicate — `SELECT * FROM invoices WHERE id = $1 AND user_id = $2` bound to `[req.params.id, req.user.id]`, returning 404 when no row matches; if an admin-override is truly intended, add it as an *additional* authorized path, not a replacement for ownership, and add a test asserting a non-owner cannot download another user's invoice.

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
  "notes": "The diff itself proves the ownership predicate (user_id = req.user.id) is still absent, so the original IDOR is unaddressed and a role gate was swapped in that also blocks legitimate non-admin owners."
}
```
