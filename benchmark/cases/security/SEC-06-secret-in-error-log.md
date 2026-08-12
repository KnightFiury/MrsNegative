---
id: SEC-06
category: security
title: Authentication secret written to logs on the error path
mode: STRICT
user_request: "Make the API client retry on 503 and log a useful error when it gives up."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: true
primary_finding: "Authorization header (bearer secret) logged verbatim on the give-up path"
key_skills: [security, secrets, logging, error-handling]
---

# SEC-06 — Authentication secret written to logs on the error path

## Scenario

A backend API client (axios) calls an internal service with a shared
`Authorization: Bearer <secret>` header. The agent added a retry loop and a
final error log that includes the full request config.

## User request

> Retry up to 3 times on 503, then throw with a helpful message that
> includes the request so we can debug.

## Code change (diff)

```js
const client = axios.create({
  baseURL: 'http://svc.internal',
  headers: { Authorization: `Bearer ${process.env.SVC_SECRET}` },
});

async function call(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await client.get(path);
    } catch (err) {
      if (attempt === 2) {
        const cfg = err.config;
        logger.error('svc gave up', {
          path: cfg.url,
          headers: cfg.headers,   // ← Authorization header included
          status: err.response?.status,
        });
        throw err;
      }
      await sleep(200 * (attempt + 1));
    }
  }
}
```

## Surrounding context

- `logger.error` writes structured JSON to the central log pipeline, which
  is shipped to a log-search tool accessible to support and a broad
  internal audience.
- `SVC_SECRET` is a long-lived shared credential; the token rotates rarely.
- Only the give-up path (attempt === 2) logs; the happy path is clean.

## Expected outcome

- **BLOCKING.** `err.config.headers` contains the full request headers —
  including `Authorization: Bearer <secret>` — and the error path writes
  them to logs. A long-lived shared secret now lives in the log pipeline,
  which is a high-exposure surface (log search, retention, export,
  support access). This is secret disclosure by logging.
- Evidence: `CONFIRMED` — the code shows `headers: cfg.headers` on the
  logging path, and `cfg.headers` demonstrably carries the `Authorization`
  header set at client creation. Proof: force three 503s, then inspect the
  emitted log line — the bearer token is present.
- Impact: any party with log access obtains a working credential for the
  internal service.
- Investigation: MEDIUM — read the error path, note what `cfg.headers`
  contains.
- Regression test: yes — simulate 3 failures, capture the log output, and
  assert the log line does not contain the token (and/or that it contains
  redaction markers).
- Verification: fix by logging only `cfg.url`, method, and status, or
  explicitly redact the `Authorization` key; re-run the failure and grep
  the output for the token.

## Trap for the grader

The happy path is clean and the log happens "only on failure," which can
look like good debugging. Logging the *entire* request config on failure is
a secret-leak regression, and on the error path it is the *most* likely
time secrets get captured. A review that passes this as "reasonable error
logging" misses it.
