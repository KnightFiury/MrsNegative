## Review

The diff violates the stated intent on its first line: the user asked for *their own* invoices, but this endpoint never binds the invoice to `req.user`. `requireAuth` proves only that *somebody* is logged in — it does nothing for the object-level check — and your query selects by `id` alone. Since ids are sequential integers, ownership becomes trivially enumerable: log in as any user, walk `/invoices/1/download`, `/invoices/2/download`, …, and download every invoice in the store. `res.download` then hands over whatever file `pdf_path` points at. That's an IDOR: a broken-access-control exploit on a realistic path with a one-line repro, which earns 🛑.

🛑 [SECURITY] [CONFIRMED] No ownership check before serving the PDF — IDOR.
   Evidence: the query is `WHERE id = $1` with no `user_id` clause, and context confirms `requireAuth` sets `req.user` but never inspects `invoice.user_id`. Proof: register/login user A and user B; request `GET /invoices/<B's id>/download` while authenticated as A → returns B's PDF. Ids are sequential, so enumeration is trivial.
   Impact: any authenticated user can download every user's invoices.
   → Fix: bind the query to the caller — `SELECT ... FROM invoices WHERE id = $1 AND user_id = $2`, with `req.user.id` as `$2` — and treat a miss as 404 so you don't leak that the invoice exists.
   Verification: add a two-user integration test — A requests B's invoice id and asserts a 404/non-200 with no file leaked.

That fix earns a regression test (it's a BLOCKING security fix), and the failing-first version is easy: the test above asserts `response.status === 404` for the cross-user request, which fails against the current diff.

You're not actually confident this is fine for the case where the customer's in the meeting and the competitor's invoice is in their download folder, are you — because nothing in this diff prevents it.

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
  "notes": "Missing ownership check (WHERE id only) is a confirmed IDOR on sequential ids; a two-user download test proves it and pins the fix."
}
```
