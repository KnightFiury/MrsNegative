## Review

🛑 [SECURITY] [CONFIRMED] The guard is a prefix check, not a directory-containment check — and `REPORTS_DIR`'s lack of a trailing separator means every sibling directory sharing the prefix reads as "inside."

- **Evidence**: `path.resolve('/var/reports', '../reports-old/private.pdf')` → `/var/reports-old/private.pdf`. `'/var/reports-old/private.pdf'.startsWith('/var/reports')` is `true`, so the guard passes and `sendFile` serves a file outside the directory. The context confirms `/var/reports-old` and `/var/reportsscratch` exist on the filesystem, so this is a real read path, not a hypothetical.
- **Impact**: an authenticated caller can read any file under `/var/reports-old` or `/var/reportsscratch` — a traversal read that violates the request's core requirement ("never read a file outside that directory").
- **→ Fix**: anchor the check at the boundary: `if (resolved !== REPORTS_DIR && !resolved.startsWith(REPORTS_DIR + path.sep)) { return res.status(403).end(); }`, or equivalently `const rel = path.relative(REPORTS_DIR, resolved); if (rel.startsWith('..') || path.isAbsolute(rel)) { ... }`. Either rejects `/var/reports-old` because the next char after `/var/reports` is not `/`.
- **Verification**: `curl -s -o /dev/null -w "%{http_code}" 'http://host/reports/../reports-old/secret.txt'` — expect `403` with no body; add a regression test that requests the traversal and asserts 403 and an empty response.

Note: the `resolved === REPORTS_DIR` case only matters for a direct request for the directory itself, which `sendFile` rejects anyway — the separator-anchored check covers it regardless. `requireAuth` is present, so the exposure is limited to authenticated users, but that is not the security boundary the user asked for.

"You're not actually confident `startsWith('/var/reports')` is a directory-boundary check, are you — `/var/reports-old` reads as inside the guard."

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
  "notes": "The startsWith prefix check is bypassed by sibling dirs sharing the /var/reports prefix, letting path.resolve('..') escape the boundary; the payload trace is complete and the sibling dirs are given in context, so BLOCKING with CONFIRMED evidence is warranted."
}
```
