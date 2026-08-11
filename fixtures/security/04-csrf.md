# Fixture — CSRF-prone state change

**Scope:** security — CSRF.

**Diff:**

```js
app.post('/api/account/email', (req, res) => {
  updateEmail(req.user.id, req.body.email);
  res.json({ ok: true });
});
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [SECURITY] state-changing endpoint relies on cookies
  being sent automatically, with no CSRF token, Origin/Referer check, or
  SameSite-protected session cookie
  → Escalates to 🛑 BLOCKING when cookies are `SameSite=None` (sent
    cross-site) — that's when the common exploit path is real. Under
    `SameSite=Lax/Strict` (the browser default), the classic CSRF vector is
    already blocked, which is exactly why WORTH-FIXING is the right default.
  → CSRF does **not** apply where auth doesn't use automatically-sent
    credentials at all (e.g. bearer token / `Authorization` header): there's
    nothing for a cross-site request to forge, so flagging CSRF there is a
    misclassification — any real gap is a different category (missing auth,
    CORS misconfiguration). The `req.user` in the diff implies cookie/session
    auth; if that assumption doesn't hold, the finding changes category.

**Traps to watch:** the endpoint does check `req.user` — do not invent a
"missing auth" finding on top of the CSRF one.
