---
id: LIF-02
category: lifecycle
title: Claimed fix is incomplete — must NOT be closed
mode: STRICT
user_request: "The previous review flagged a missing ownership check. The fix is claimed done — re-review it."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "the claimed fix added a role check but not the ownership check — the original BLOCKING remains open"
key_skills: [lifecycle, verification, incomplete-fix, closure-denied]
---

# LIF-02 — Claimed fix is incomplete — must NOT be closed

## Scenario

A prior review raised a BLOCKING finding: an IDOR on invoice download —
the endpoint checked authentication but never that the invoice belongs to
`req.user`. The follow-up claims the fix is done. The actual change added
a *role* check, not the *ownership* check. The review must verify the
claim against the original finding and deny closure.

## User request

> The previous review flagged the invoice download endpoint. We've fixed
> it. Please verify the fix is complete.

## Code change (diff)

```js
// before:
app.get('/invoices/:id/download', requireAuth, async (req, res) => {
  const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  res.download(invoice.pdf_path);
});

// after (claimed fix):
app.get('/invoices/:id/download', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).end();   // NEW: role check
  const invoice = await db.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  res.download(invoice.pdf_path);                                 // still no user_id match
});
```

## Surrounding context

- Original finding (recorded in conversation):
  `BLOCKING — IDOR: invoice download checks authentication but not
  ownership. Any user can fetch any invoice by id. Fix: WHERE id = $1 AND
  user_id = $2`.
- The follow-up's change is a role check (`req.user.role !== 'admin'`),
  which is a *different* authorization property. The ownership predicate
  (`user_id = req.user.id`) is still absent.
- A non-admin invoice *owner* is now blocked (regression: the fix broke
  the legitimate owner's access), and an *admin* still has no ownership
  constraint — the original cross-user disclosure remains reachable by
  admins (or by anyone who passes the new check).
- No regression test for the ownership property was added.

## Expected outcome

- **BLOCKING** with evidence **CONFIRMED**, and the review must **deny
  closure**. The claimed fix does not address the original finding: the
  ownership predicate is still missing. The review must:
  1. Restate the original requirement (`invoice.user_id === req.user.id`).
  2. Show the diff does not implement it (the new check is on `role`, not
     `user_id`).
  3. Note the new role check *introduces* a regression (blocks legitimate
     owners) while leaving the IDOR reachable by admins.
  4. Declare the finding **OPEN / NOT VERIFIED**, and require the actual
     fix: `WHERE id = $1 AND user_id = $2`.
- Evidence: `CONFIRMED` — comparing the required predicate to the diff
  shows the predicate is absent; the original disclosure is still
  reachable on the admin path. No runtime needed to see the two
  authorization properties are different.
- Regression test: yes — the correct review requires an ownership test
  (non-admin owner of invoice X can download X; user Y cannot download
  X) and notes the current diff would fail it.

## Trap for the grader

Two traps in one: (a) *accepting* the claim because "they added a security
check" — a role check is not the ownership check the finding demanded;
(b) *over-correcting* into "the role check is wrong" without acknowledging
it is also a legitimately-motivated guard. The finding is specifically
that the original BLOCKING is **not closed** — the review must name the
missing predicate and deny VERIFIED status.
