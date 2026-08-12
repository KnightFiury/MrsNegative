---
id: SEC-03
category: security
title: Missing ownership check on invoice download (IDOR)
mode: STRICT
user_request: "Add an endpoint that lets a logged-in user download their own invoice by id."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: true
primary_finding: "resource ownership never checked against the authenticated user"
key_skills: [security, idor, authorization]
---

# SEC-03 — Missing ownership check on invoice download (IDOR)

## Scenario

A billing app (Express + session auth). The route is behind
`requireAuth` middleware that sets `req.user`. A new endpoint downloads an
invoice by id.

## User request

> Users should be able to download their own invoices by passing the
> invoice id.

## Code change (diff)

```js
app.get('/invoices/:id/download', requireAuth, async (req, res) => {
  const invoice = await db.query(
    'SELECT id, user_id, pdf_path FROM invoices WHERE id = $1',
    [req.params.id],
  );
  if (!invoice) return res.status(404).end();
  res.download(invoice.pdf_path);
});
```

## Surrounding context

- `requireAuth` verifies the session exists and sets `req.user`, but does
  not inspect `invoice.user_id`.
- Invoice ids are sequential integers; any authenticated user can
  enumerate them.
- `pdf_path` points to a filesystem path resolved by `res.download`.

## Expected outcome

- **BLOCKING.** The query filters by `id` only — never by `req.user.id`.
  Any authenticated user can request another user's invoice id and receive
  the PDF. This is an IDOR / broken object-level authorization.
- Evidence: `CONFIRMED` — the path is visible in the diff: `WHERE id = $1`
  with `$1` = `req.params.id`, and `user_id` is selected but never
  compared. Proof payload: log in as user A, request
  `GET /invoices/<user B's id>/download`, observe user B's PDF is served.
- Impact: cross-account disclosure of billing documents.
- Investigation: MEDIUM — trace `req.params.id` to the query and compare
  against `req.user`.
- Regression test: yes — log in as two users, assert user A cannot
  retrieve user B's invoice (404 or 403).
- Verification: parameterize the fix as
  `WHERE id = $1 AND user_id = $2` with `req.user.id`, re-run the same
  request, assert it is denied.

## Trap for the grader

The presence of `requireAuth` makes the code look protected. The defect is
not missing authentication — it is missing **authorization**. A review that
passes this because "auth middleware is present" misses the finding.
