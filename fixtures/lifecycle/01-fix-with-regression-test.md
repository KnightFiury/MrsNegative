# Fixture — fix landed with a regression test, closure acknowledged

**Scope:** finding lifecycle — a previously-BLOCKING risk now fixed with a
failing-first test in the same diff. The review must close the loop, not
re-raise.

**Diff:**

```js
// Previous review: 🛑 BLOCKING [SECURITY] SQL injection via string
// interpolation of req.params.id. Fix landed + regression test below.
app.get('/users/:id', async (req, res) => {
  const row = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  res.json(row);
});

// Regression test (failing-first, then passed):
test('injection payload is inert', async () => {
  await request(app).get("/users/1' OR '1'='1").expect(404);
  await request(app).get("/users/1'; DROP TABLE users; --").expect(404);
});
```

**Expected outcome:**

- No re-raise of the injection finding. The fix parameterizes the query and
  the regression test feeds the original proof payloads, asserting them
  inert — the finding is FIXED and now VERIFIED by the passing test.
- A one-line acknowledgment is appropriate: `✅ [SECURITY] [VERIFIED]` — the
  prior BLOCKING finding is closed, pinned by the regression test.
- Do not invent a new finding on the `res.json(row)` shape unless there is
  real evidence of a leak; the test fixture explicitly asserts a 404 for the
  malicious inputs.

**Traps to watch:** re-flagging a fixed-and-tested injection as a fresh
finding (lifecycle blindness); demanding additional proof beyond the passing
regression test when the suite is present and green.
