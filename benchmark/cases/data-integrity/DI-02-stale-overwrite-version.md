---
id: DI-02
category: data-integrity
title: Read-modify-write without versioning — stale data silently overwrites new data
mode: STRICT
user_request: "Allow two users to edit a document concurrently without either edit being silently lost."
severity_expected: BLOCKING
evidence_expected: LIKELY
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "the update writes a full object read earlier, so a concurrent edit is silently overwritten"
key_skills: [data-integrity, lost-update, optimistic-concurrency, read-modify-write]
---

# DI-02 — Read-modify-write without versioning — stale data silently overwrites new data

## Scenario

A documents API lets two users edit the same document. The update handler
reads the current document, applies the client's changes onto it, and
writes the whole thing back.

## User request

> Support editing documents. If two people edit at the same time, we must
> not silently lose one person's changes.

## Code change (diff)

```js
app.put('/docs/:id', requireAuth, async (req, res) => {
  const doc = await db.query('SELECT body, version FROM docs WHERE id = $1', [req.params.id]);
  if (!doc) return res.status(404).end();

  const merged = { ...doc.body, ...req.body.changes };
  await db.query(
    'UPDATE docs SET body = $2, version = version + 1 WHERE id = $1',
    [req.params.id, merged],
  );
  res.json({ version: doc.version + 1 });
});
```

## Surrounding context

- `version` exists and is incremented on every write — but the UPDATE does
  **not** include `AND version = $3` (the version the client read).
- Two concurrent editors both read `version = 7`, both merge onto that
  same base, and both UPDATE — the second overwrites the first. Version
  increments, but the lost edit is invisible.
- The response returns `version` to the client, implying the client is
  expected to use optimistic concurrency.

## Expected outcome

- **BLOCKING.** The version column is maintained but never used as a
  concurrency guard. Two concurrent edits both succeed, and the later
  writer silently clobbers the earlier one. The version number goes up
  (8, 9), so nothing in the system notices a conflict occurred.
- Evidence: `LIKELY` — the overwrite path is clear from the code (UPDATE
  without `WHERE version =`), but demonstrating the *actual* collision
  requires two overlapping edits at runtime, which the case cannot run
  in-session. The review must name that the deciding factor (concurrent
  editors actually colliding) needs the runtime, and must not overstate to
  CONFIRMED.
- Impact: silent user-data loss in a collaborative feature — the exact
  scenario the user asked to prevent.
- Investigation: HIGH — trace the read base, the merge, and the write, and
  show the missing version predicate.
- Regression test: yes — two concurrent PUTs with the same base version;
  assert the second fails with a conflict (or that the merge is
  server-side) rather than overwriting.
- Verification: fix with optimistic concurrency —
  `UPDATE docs SET body = $2, version = version + 1 WHERE id = $1 AND
  version = $3`, check `rowCount === 1`, and return 409 with the current
  version on mismatch; re-run the concurrent test.

## Trap for the grader

`version = version + 1` looks like versioning is implemented. The version
is only a counter — never a guard. A review that sees the version column
and approves "versioning is handled" misses the actual finding.
