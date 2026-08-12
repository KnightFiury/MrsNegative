## Review

The route's stated intent is "download their own invoices," and this diff does no such thing — it scopes the query by `id` alone and never touches ownership. Any authenticated session can walk sequential ids and download another customer's invoice PDF. That's the whole review in one line; here's the load calculation.

🛑 [SECURITY] [LIKELY] **Missing authorization check — broken access control / IDOR.**
- Evidence: trace the path — `requireAuth` only verifies the session exists and sets `req.user`; it explicitly does not inspect `invoice.user_id`. The query has no `user_id` predicate (`WHERE id = $1` only), and `res.download(invoice.pdf_path)` is reached with no comparison between `req.user.id` and `invoice.user_id`. The diff contains no authorization branch at all, so the exploit is structural, not hypothetical: `GET /invoices/7/download` as any logged-in user returns invoice 7's PDF. I couldn't execute it in-session (no running app), so the tag is LIKELY rather than CONFIRMED — but the absence of the check is directly visible in these lines.
- Impact: any authenticated user reads any other customer's invoice files; combined with sequential integer ids this is trivially enumerable.
- → Fix: scope the query to the owner — `SELECT id, user_id, pdf_path FROM invoices WHERE id = $1 AND user_id = $2` with `[req.params.id, req.user.id]`, and keep the 404 when no row matches (don't reveal which ids exist via a separate check).
- Verification: create users A and B, give A an invoice; log in as B and request A's invoice id — assert 403/404 and no file bytes; then the same request as A returns the PDF.

⚠️ [RELIABILITY] [UNVERIFIED] `if (!invoice)` may never fire — `db.query`'s return shape is unknown to me. If it's the standard `pg` result object, `!invoice` is always false, `invoice.pdf_path` is `undefined`, and `res.download` throws instead of 404ing. Assumed, not verified — I couldn't check the wrapper in-session.
- → Fix: confirm the wrapper's shape; likely `if (!invoice?.rows?.length) return res.status(404).end()`.
- Verification: hit the endpoint with a nonexistent id and assert a 404, not a 500.

💭 [MAINTAINABILITY] The route never mentions ownership in its name or the query, so the missing check reads as intentional — a future reader needs a comment or a clearer name like `/:id` under `/invoices/mine/` to see the security boundary.

Regression stance: **require** — a BLOCKING security fix needs a failing-first test that user B's session requesting user A's invoice id gets no PDF, asserting the payload that currently returns the file returns 404/403 after the fix.

And the confidence-check line: you're not actually confident this endpoint serves only the owner's invoice to the caller, are you — because the diff contains no code that would make it do so.

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
  "notes": "Missing user_id scoping is a clear IDOR on an enumerable sequential-id surface; structural absence of the check earns LIKELY-to-CONFIRMED, and since no payload was run in-session, LIKELY is the honest tag."
}
```
