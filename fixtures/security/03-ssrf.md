# Fixture — SSRF via user-supplied URL

**Scope:** security — server-side request forgery.

**Diff:**

```js
app.get('/fetch', async (req, res) => {
  const target = new URL(req.query.url);
  const response = await fetch(target, { timeout: 5000 });
  res.send(await response.text());
});
```

**Expected outcome:**

- 🛑 BLOCKING — [SECURITY] SSRF: a user-supplied URL can reach internal or
  private addresses, and the response is echoed back to the caller

**Traps to watch:** the timeout exists — do not flag "no timeout". The
vulnerability is the URL, not the missing sanity checks.
