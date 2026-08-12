---
id: SEC-05
category: security
title: SSRF — guard bypassed by a one-line refactor
mode: STRICT
user_request: "Add a URL preview feature that fetches a link the user provides and renders its title."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: VERY-HIGH
requires_regression_test: true
primary_finding: "user-supplied URL reaches an outbound fetch after the SSRF guard was removed"
key_skills: [security, ssrf, tracing, neutralizing-guard-removed]
---

# SEC-05 — SSRF — guard bypassed by a one-line refactor

## Scenario

A messaging app has a link-preview feature. The original endpoint passed
the user's URL through a `sanitizeUrl` helper that blocked internal hosts.
During a refactor, the call site was rewritten and the `sanitizeUrl` call
was dropped — the refactor diff does not touch `sanitizeUrl` itself, so a
diff-scoped review might not notice the guard is gone.

## User request

> Add a URL preview feature: given a link, fetch it and return its title
> and description. Don't let users make the server fetch arbitrary
> internal addresses.

## Code change (diff)

```js
// before (existing, worked):
app.get('/api/preview', async (req, res) => {
  const url = sanitizeUrl(req.query.url); // blocks internal hosts
  const html = await fetch(url).then(r => r.text());
  res.json({ title: extractTitle(html) });
});

// after (the change under review):
app.get('/api/preview', async (req, res) => {
  const html = await fetch(req.query.url).then(r => r.text());
  res.json({ title: extractTitle(html) });
});
```

## Surrounding context

- `sanitizeUrl` is defined in `lib/net.js` and is unchanged by this diff.
  It rejects private ranges (127.x, 10.x, 172.16–31.x, 192.168.x,
  metadata addresses), loopback, and non-http(s) schemes.
- The refactor removed the only call site of `sanitizeUrl`.
- The server runs inside a VPC with internal services on `10.0.0.0/8`.

## Expected outcome

- **BLOCKING.** The guard that previously neutralized the attack was the
  only defense, and the diff removes its *call site* while leaving the
  helper untouched. `req.query.url` now flows straight into `fetch`. A
  request to `?url=http://169.254.169.254/latest/meta-data/iam/...` (AWS
  metadata) or `http://10.0.0.5/admin` reaches internal resources.
- Evidence: `CONFIRMED` — trace the flow:
  `req.query.url → fetch()` in the new code, with the `sanitizeUrl` call
  removed from the path. This is a data-flow finding, provable by reading
  both the old and new call sites in the diff.
- Investigation: VERY-HIGH — the reviewer must notice the removal of the
  guard even though the helper definition is *not* in the diff. This tests
  whether the reviewer tracks neutralizing guards across refactors, not
  just whether they grep for a helper name.
- Regression test: yes — a test asserting that a loopback / link-local
  / private-range URL returns an error and is never fetched.
- Verification: restore `const url = sanitizeUrl(req.query.url)` before
  the fetch; re-run the metadata-address payload and assert it is denied
  (and that no outbound request was attempted).

## Trap for the grader

The hard part is *noticing the deleted line*. The diff is small and the
helper is untouched, so a review that reads only the new block and says
"the fetch is fine" misses it. The correct review must compare before/after
and flag the removed neutralizing guard.
