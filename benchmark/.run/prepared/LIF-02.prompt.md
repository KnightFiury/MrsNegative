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