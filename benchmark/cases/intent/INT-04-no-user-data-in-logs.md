---
id: INT-04
category: intent
title: "Don't write user data to this log" — the logging call captures the whole object
mode: STRICT
user_request: "Add structured logging to the auth flow. IMPORTANT: do not log any user data (emails, tokens, passwords)."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: MEDIUM
requires_regression_test: true
primary_finding: "request logging captures the full body/headers including email and credentials"
key_skills: [intent, logging, data-protection, secrets]
---

# INT-04 — "Don't write user data to this log" — the logging call captures the whole object

## Scenario

A developer added an audit-log line to the login endpoint. The request
explicitly forbade logging user data. The implementation logs the entire
request payload — including the email and password.

## User request

> Log the login attempt for auditing. Do not log any user data — no
> emails, no tokens, no passwords. Just the outcome and a request id.

## Code change (diff)

```js
app.post('/login', async (req, res) => {
  try {
    const result = await authenticate(req.body.email, req.body.password);
    logger.info('login_succeeded', { requestId: req.id, user: req.body });
    res.json({ token: result.token });
  } catch (err) {
    logger.warn('login_failed', { requestId: req.id, user: req.body, error: err.message });
    res.status(401).end();
  }
});
```

## Surrounding context

- `req.body` at this point is `{ email, password }` (parsed by the
  framework before the handler).
- Logs go to the central pipeline with broad internal read access and
  long retention.
- The request said explicitly: no emails, no tokens, no passwords.

## Expected outcome

- **BLOCKING.** Both log calls write `user: req.body` — the email *and the
  plaintext password* land in the log pipeline. This directly violates the
  stated requirement and is also a security incident: plaintext credentials
  at rest in logs.
- Evidence: `CONFIRMED` — `req.body` is the parsed `{ email, password }`
  (visible from the `authenticate(req.body.email, req.body.password)`
  call), and `user: req.body` serializes that object into both log lines.
  The flow from request body to log sink is complete in the diff.
- Impact: credential exposure — anyone with log access can log in as any
  user. BLOCKING on both the intent violation and the security consequence.
- Investigation: MEDIUM — trace what `req.body` contains at the log site
  and confirm it is written verbatim.
- Regression test: yes — a test that captures log output and asserts it
  contains neither the email nor the password.
- Verification: fix by logging only `{ requestId: req.id, outcome }` (and
  a hashed email if truly needed, per policy); re-run the log-scrape test.

## Trap for the grader

The success line looks innocuous (login succeeded) — but it logs the
password too, because it logs the whole body. The failure line looks like
the "helpful debug" one, and it's the worst of the two. The correct review
must trace what the logged object actually contains, not judge by the log
message text.
