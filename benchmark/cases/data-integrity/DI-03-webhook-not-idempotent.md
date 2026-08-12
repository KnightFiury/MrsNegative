---
id: DI-03
category: data-integrity
title: Webhook handler not idempotent — at-least-once delivery double-applies
mode: STRICT
user_request: "Handle Stripe payment webhooks. A single successful payment must result in exactly one balance credit."
severity_expected: BLOCKING
evidence_expected: LIKELY
investigation_expected: HIGH
requires_regression_test: true
primary_finding: "webhook handler applies the credit without an idempotency key, so a redelivery double-credits"
key_skills: [data-integrity, idempotency, webhooks]
---

# DI-03 — Webhook handler not idempotent — at-least-once delivery double-applies

## Scenario

A billing service receives payment webhooks from Stripe. Stripe delivers
events **at-least-once** (documented): the same event can arrive more than
once, especially after a timeout or retry. The handler credits the
customer's balance on each arrival.

## User request

> Handle the `payment_intent.succeeded` webhook by crediting the customer's
> balance. Make sure a customer is never credited twice for one payment.

## Code change (diff)

```js
app.post('/webhooks/payments', async (req, res) => {
  const event = req.body; // { id: "evt_123", data: { object: { id: "pi_1", customer: "cus_9" } } }
  if (event.type !== 'payment_intent.succeeded') return res.sendStatus(200);

  await db.query(
    'UPDATE customers SET balance = balance + $2 WHERE id = $1',
    [event.data.object.customer, event.data.object.amount],
  );
  res.sendStatus(200);
});
```

## Surrounding context

- Stripe's docs (linked in the repo's `docs/`) state events are delivered
  at-least-once and consumers must be idempotent.
- The service acknowledges the webhook with 200 after applying the
  effect; if the 200 never reaches Stripe (timeout), Stripe redelivers the
  same event.
- There is no `processed_events` table and no `Idempotency-Key` check.

## Expected outcome

- **BLOCKING.** The handler has no idempotency guard, so a redelivered
  `payment_intent.succeeded` credits the balance again. The very contract
  of the event source (at-least-once) guarantees duplicates are possible;
  the handler neither dedupes by event id nor stores processed events.
- Evidence: `LIKELY` — the missing idempotency is visible in the code and
  the at-least-once contract is documented, but proving an actual duplicate
  requires a redelivery at runtime (which the case cannot reproduce
  in-session). The review must cite the documented delivery contract as
  the basis and state that the duplicate is expected under that contract —
  not assert "I saw a duplicate."
- Impact: customers credited twice for one payment; financial reconciliation
  breaks; refunds/chargebacks cascade.
- Investigation: HIGH — read the provider's delivery contract and map the
  handler's effect to it.
- Regression test: yes — deliver the same event id twice in a test and
  assert the balance is credited exactly once.
- Verification: fix by recording processed event ids
  (`INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO
  NOTHING`, only credit when `rowCount === 1`); re-run the double-delivery
  test.

## Trap for the grader

The happy path is perfectly correct — a naive review approves it. The bug
is the missing idempotency under the event source's documented at-least-once
behavior. A review that flags "this might be called twice" without citing
the delivery contract is under-evidenced; a review that ignores the
contract entirely misses the finding.
