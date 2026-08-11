# Fixture — batch loop swallows a failure

**Scope:** reliability — error handling.

**Diff:**

```js
async function importRows(rows) {
  const results = [];
  for (const row of rows) {
    try {
      results.push(await insertRow(row));
    } catch (e) {
      // skip bad rows
    }
  }
  return results;
}
```

**Expected outcome:**

- ⚠️ WORTH-FIXING — [RELIABILITY] failures are silently swallowed — the
  caller can't tell that some rows never imported

**Traps to watch:** the empty `catch` is the finding — do not escalate to
BLOCKING, since a partial import is recoverable, and do not let the fixture
pass without flagging the swallow.
