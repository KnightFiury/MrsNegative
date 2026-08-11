# Fixture — trap: sensible default

**Scope:** trap — at most a NITPICK.

**Diff:**

```js
const PAGE_SIZE = 50;

async function listItems(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { rows } = await db.query(
    'SELECT * FROM items ORDER BY id LIMIT $1 OFFSET $2',
    [PAGE_SIZE, (page - 1) * PAGE_SIZE]
  );
  res.json(rows);
}
```

**Expected outcome:**

- No findings. This is the primary expectation — it's a trap.
- Permitted but not required: 💭 NITPICK — [MAINTAINABILITY] about unbounded
  `OFFSET` on deep pages (a mild perf nitpick, not a security issue).
  Grading keys off the boundary: a model that stays silent passes; a model
  that emits WORTH-FIXING or above fails this fixture.

**Traps to watch:** the page is clamped (`Math.max`), the query is
parameterized, the limit is a named constant, and the endpoint is a public
list route (no auth needed). Anything BLOCKING or WORTH-FIXING is
over-tagging.
