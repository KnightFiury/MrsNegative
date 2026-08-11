# Fixture — solves a problem that doesn't exist

**Scope:** necessity (YAGNI).

**Diff:**

```js
// new "bulk export" endpoint and user_settings flag — no UI, no caller,
// no issue or feature request asking for it
app.post('/api/users/:id/export', async (req, res) => {
  await exportUserData(req.params.id, req.body.formats);
  res.json({ ok: true });
});
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [NECESSITY] brand-new endpoint + config flag with zero
  callers and no request behind it — remove it, or get the requirement first

**Traps to watch:** resist auditing the export code itself — the point of
this fixture is that it shouldn't exist at all. The necessity finding is the
one being tested.
