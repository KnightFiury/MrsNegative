## Review

The primary problem is an **IDOR / missing authorization check**. The handler fetches the invoice by id and streams `pdf_path` to the caller, but never verifies that `invoice.user_id === req.user.id`. The surrounding context confirms `requireAuth` only validates the session and never inspects the invoice's owner, and that invoice ids are sequential integers — so any authenticated user can simply iterate `GET /invoices/1/download`, `/invoices/2/download`, ... and download *every* user's invoices. The request explicitly says "their own invoices," so this is a direct semantic violation: the endpoint delivers invoices to the wrong people. Fix by comparing ownership and returning `403` when `invoice.user_id !== req.user.id`.

Secondary, lower-tier concerns: (1) `invoice.pdf_path` flows straight into `res.download`, so if `pdf_path` is ever attacker-influenced the endpoint doubles as an arbitrary file read — worth validating it stays in a trusted storage directory; (2) the handler is `async` with no try/catch, so a rejected `db.query` (or a `res.download` error on a missing file) becomes an unhandled rejection in Express 4; (3) the `if (!invoice)` guard is suspect — a typical `db.query` returns a result object with `rows`, so a no-match query likely still yields a truthy value and the guard should check `invoice.rows[0]` before dereferencing `pdf_path`.

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
  "notes": "Context explicitly confirms requireAuth never checks invoice ownership and ids are enumerable sequential integers, so the IDOR is confirmed; fix with a user_id comparison returning 403, plus a regression test asserting cross-user download is denied."
}
```
