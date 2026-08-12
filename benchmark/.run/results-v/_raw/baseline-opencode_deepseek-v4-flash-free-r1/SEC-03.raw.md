## Review

The endpoint has a broken authorization check. It selects `user_id` in the query but never compares it to `req.user`, so any authenticated user can request any invoice id (`/invoices/3/download`) and download another user's PDF. Because ids are sequential integers, this is trivially enumerable — a full account-takeover-of-documents risk. Additionally, `invoice` here is the row object (depending on driver, `db.query` may return `{ rows }`, making the surfaced `!invoice`/`invoice.pdf_path` logic wrong), but the dominant finding is the missing ownership check.

Fix: after the query, compare `invoice.user_id` to the logged-in user's id and return 403/404 when they differ:

```js
const invoice = (await db.query(...)).rows[0];
if (!invoice) return res.status(404).end();
if (invoice.user_id !== req.user.id) return res.status(404).end();
res.download(invoice.pdf_path);
```

A regression test should assert that user B gets a 403/404 for user A's invoice id and cannot read the file bytes.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "LIKELY",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Cross-user file disclosure is provable from the diff itself (user_id selected but uncompared, sequential ids), though I cannot run tools to confirm runtime behavior."
}
```
