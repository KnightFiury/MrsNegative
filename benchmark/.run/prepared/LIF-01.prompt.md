## Scenario

A prior review raised a BLOCKING finding: SQL injection in a search
endpoint (the `q` parameter was concatenated). The follow-up diff fixes it
with a parameterized query and adds a regression test. The conversation
history records the original finding and its fix requirements.

## User request

> The previous review flagged the search endpoint as SQL injection. We've
> applied the fix. Re-review the change.

## Code change (diff)

```js
// before:
const rows = await db.query(`SELECT ... WHERE name ILIKE '%${q}%'`);

// after:
const rows = await db.query(
  'SELECT ... FROM products WHERE name ILIKE \'%\' || $1 || \'%\'',
  [q],
);
```

## Surrounding context

- Prior review finding (recorded in conversation):
  `BLOCKING — SQL injection in the search term — concatenated into the
  WHERE clause`.
- The follow-up adds `tests/search.injection.test.js`:
  ```js
  test('injection payload is inert', async () => {
    await api.get('/api/search?q=%27%20OR%201%3D1%20--').expect(200)
      .then(r => expect(r.body.length).toBe(0));
  });
  ```
- The regression test was run against the *old* code first (failed — it
  returned rows), then against the fix (passes). That failing-first
  evidence is part of the review context.
- The fix covers the *only* injection point previously flagged.