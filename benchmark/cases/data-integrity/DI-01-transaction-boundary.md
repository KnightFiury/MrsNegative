---
id: DI-01
category: data-integrity
title: Transaction boundary narrower than the invariant it must protect
mode: STRICT
user_request: "Move money between two accounts in a single atomic transaction; either both sides apply or neither does."
severity_expected: BLOCKING
evidence_expected: CONFIRMED
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "only one of two writes is inside the transaction — a crash between them leaves money half-moved"
key_skills: [data-integrity, transactions, failure-modes]
---

# DI-01 — Transaction boundary narrower than the invariant it must protect

## Scenario

A wallet service transfers funds between accounts. The agent wrapped the
*second* UPDATE in a transaction but left the first UPDATE outside it.

## User request

> Transfer money from one account to another. It must be atomic: if the
> transfer fails partway, neither account may change.

## Code change (diff)

```js
async function transfer(fromId, toId, amount) {
  await db.query(
    'UPDATE accounts SET balance = balance - $3 WHERE id = $1 AND balance >= $3',
    [fromId, toId, amount],
  );
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE accounts SET balance = balance + $2 WHERE id = $1',
      [toId, amount],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

## Surrounding context

- The first UPDATE (debit) runs against the pool, outside any transaction.
- The second UPDATE (credit) is inside an explicit transaction on a
  dedicated client.
- A crash or thrown error between the two statements leaves the debit
  applied and the credit not applied.

## Expected outcome

- **BLOCKING.** The transaction boundary covers only the credit. If
  anything fails between the debit and the `BEGIN`/credit (process crash,
  network drop, constraint error, timeout), the debit is already
  committed and the credit is rolled back — money leaves account A and
  never reaches account B. The invariant "both or neither" is not
  protected.
- Evidence: `CONFIRMED` — the boundary is visible in the code: the debit
  is a pool query with no transaction, the credit is wrapped. The failure
  sequence is deterministic: `debit commits` → [failure] → `credit
  rolls back` → balances inconsistent. A reviewer should also note the
  *separate* correctness gap (the debit's `WHERE balance >= $3` does not
  check whether the row was actually updated — an insufficient balance
  silently "succeeds"), but the transaction boundary is the primary
  finding.
- Impact: silent fund loss — one of the worst failure classes in a money
  system.
- Investigation: HIGH — trace every statement in the flow to which
  transaction (or none) it belongs.
- Regression test: yes — force a failure between the two statements (inject
  an error after the debit, or make the credit fail) and assert both
  balances are unchanged.
- Verification: fix by making both UPDATEs run on the same
  transaction client (`BEGIN` first, then both queries, then `COMMIT`),
  and check `rowCount` on the debit to reject insufficient funds; re-run
  the fault-injection test.

## Trap for the grader

The code has a try/catch/ROLLBACK and a `client` — it looks transactional.
The bug is that the *first* statement silently escapes the transaction. A
review that approves "transactions used" without mapping each statement to
its transaction boundary misses it.
