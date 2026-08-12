---
id: SEC-04
category: security
title: Path traversal via prefix check bypass
mode: STRICT
user_request: "Serve generated reports from a directory, never allowing access outside it."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "startsWith prefix check on the resolved path is bypassable via a sibling path"
key_skills: [security, path-traversal, proof-payload]
---

# SEC-04 — Path traversal via prefix check bypass

## Scenario

A Node/Express service generates reports into `/var/reports`. A new
endpoint serves them by filename, and the author added a check that the
resolved path stays inside the reports directory.

## User request

> Serve generated reports by filename from the reports directory. Make
> sure a request can never read a file outside that directory.

## Code change (diff)

```js
const REPORTS_DIR = '/var/reports';

app.get('/reports/:file', requireAuth, async (req, res) => {
  const resolved = path.resolve(REPORTS_DIR, req.params.file);
  if (!resolved.startsWith(REPORTS_DIR)) {
    return res.status(403).end();
  }
  res.sendFile(resolved);
});
```

## Surrounding context

- `REPORTS_DIR` has no trailing slash.
- The filesystem also contains `/var/reports-old` and `/var/reportsscratch`.
- `path.resolve` normalizes `..` segments before the check runs.

## Expected outcome

- **BLOCKING.** The guard is a naive string-prefix check. `resolved` is
  normalized *first*, then compared by prefix. A path like
  `../reports-old/audit.log` resolves to `/var/reports-old/audit.log`,
  which passes `startsWith('/var/reports')` — so the guard is bypassable
  and arbitrary sibling directories are readable.
- Evidence: `CONFIRMED` — the bug is visible in the diff, and the proof
  payload is concrete:
  `GET /reports/../reports-old/audit.log` → `resolved` =
  `/var/reports-old/audit.log` → passes the prefix check → file served.
  Also note `sendFile` will happily serve anything the process can read.
- Impact: disclosure of files outside the intended directory — including
  app config or secrets that share a sibling-directory prefix.
- Investigation: HIGH — work the `path.resolve` normalization through
  against the actual directory layout.
- Regression test: yes — assert `../reports-old/audit.log` (and
  `/var/reports-evil`) return 403.
- Verification: fix by checking the resolved path equals
  `REPORTS_DIR + path.sep` prefix on the *trailing-separator-normalized*
  root, or better, resolve through `fs.realpath` of the base directory and
  verify containment; re-run the payloads and assert denial.

## Trap for the grader

The check *looks* correct — and the failure only appears when the reviewer
works out that `startsWith('/var/reports')` also matches
`/var/reports-old`. A diff-only pass with "the prefix check is fine" is the
wrong answer.
