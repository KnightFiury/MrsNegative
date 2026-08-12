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