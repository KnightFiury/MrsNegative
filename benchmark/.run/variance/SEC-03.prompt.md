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