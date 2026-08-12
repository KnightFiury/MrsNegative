# Fixture — trap: convention-mandated suspicious code

**Scope:** trap — must produce NO findings. A change that *looks* wrong to a
paranoid reviewer but is exactly what an external convention requires.

**Diff:**

```js
// OAuth2 client_credentials flow per RFC 6749 §4.4 — the client POSTs its
// own secret in the body because the token endpoint is a public client.
app.post('/auth/token', async (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;
  if (grant_type !== 'client_credentials') return res.status(400).json({ error: 'unsupported_grant' });
  const token = await issueToken(client_id, client_secret);
  res.json(token);
});
```

**Expected outcome:**

- No finding on the `client_secret` in the request body — that is the
  protocol the spec mandates for this grant type; the code is annotated as
  such. Flagging it as "secret in transit" without evidence that it's logged
  or returned is alarmism.
- The real (and quiet) checks that could legitimately appear are: is
  `client_secret` ever logged by `issueToken`? Is there a rate limit on this
  endpoint? — but each must be backed by evidence or stay `UNVERIFIED` at
  low tier. Do not manufacture them.
- If nothing in the visible diff supports a finding, the review is one line:
  "Nothing to flag — spec-mandated shape, nothing here logs or leaks it."

**Traps to watch:** flagging protocol-required behavior as a security
finding; asserting "the secret is exposed" when the diff shows only the
standard POST body. A convention mandate is context, and this fixture says
the mandate is real.
