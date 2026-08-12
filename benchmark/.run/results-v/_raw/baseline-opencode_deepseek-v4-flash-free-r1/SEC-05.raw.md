## Review

This change reintroduces a full SSRF vulnerability. The diff removes the only call site of `sanitizeUrl`, so `req.query.url` now flows directly into `fetch()` with no host filtering. Given the server runs inside a VPC with internal services on `10.0.0.0/8`, any user can now point the server at internal hosts (e.g. `http://10.0.0.5/`) and read private data, or at cloud metadata addresses that `sanitizeUrl` previously blocked. This directly violates the user request ("Don't let users make the server fetch arbitrary internal addresses"), and the guard's removal is invisible to a diff-scoped review because `sanitizeUrl` itself is unchanged. Fix: restore the guard — `const url = sanitizeUrl(req.query.url); const html = await fetch(url)...` — ideally with a clear error response when the URL is rejected. Concrete verification: `curl "http://<host>/api/preview?url=http://10.0.0.1/"` now returns internal content instead of being rejected. A regression test asserting internal/loopback URLs are rejected should be required.

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
  "notes": "The diff itself removes the only sanitizeUrl call, so the input-to-sink trace (req.query.url straight into fetch) is directly confirmed from the provided code, and the user explicitly asked for internal addresses to be blocked."
}
```
