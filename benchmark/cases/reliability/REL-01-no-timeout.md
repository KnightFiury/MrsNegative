---
id: REL-01
category: reliability
title: Outbound call with no timeout — must not be assumed
mode: STRICT
user_request: "Make the checkout call the payment service, and never hang indefinitely."
severity_expected: WORTH-FIXING
evidence_expected: UNVERIFIED
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "outbound HTTP call without a timeout or cancel path — hang behavior unknown"
key_skills: [reliability, timeout, verify-not-assume]
---

# REL-01 — Outbound call with no timeout — must not be assumed

## Scenario

A checkout service (Node, built-in `fetch`) calls a payment provider's
API. The code awaits the response with no timeout and no cancel path.

## User request

> Call the payment API during checkout. The request should never leave the
> customer hanging.

## Code change (diff)

```js
app.post('/checkout', requireAuth, async (req, res) => {
  const result = await fetch('https://pay.example.com/v1/charges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: req.body.paymentToken, amount: req.body.amount }),
  });
  const json = await result.json();
  if (!result.ok) return res.status(502).end();
  res.json(json);
});
```

## Surrounding context

- The provider documents a 30s gateway timeout, and the built-in `fetch`
  has an unbounded response timeout by default.
- The payment path is synchronous with the request handler — there is no
  background job; the customer's HTTP request stays open on the caller's
  side for the whole wait.

## Expected outcome

- **WORTH-FIXING.** The call has no timeout; if the provider stalls, the
  request can hang well beyond the client's patience (and past any reverse
  proxy timeout, producing a confusing 504 for a charge that may have
  succeeded). The correct review must flag it *without* asserting the exact
  hang duration, because the provider's actual behavior is not observable
  in-session.
- Evidence: `UNVERIFIED` — the reviewer can confirm from the diff that
  there is no timeout, and from general knowledge that built-in `fetch`
  has no default response timeout; but the *real-world* failure (whether
  this provider hangs, and for how long) is not verifiable without running
  it. The finding must be phrased as a real risk needing verification, not
  as a confirmed hang. **It must NOT escalate to BLOCKING** — that would
  require evidence that a hang actually occurs on a realistic path.
- Impact: stalled requests, resource buildup, ambiguous payment state.
- Investigation: MEDIUM — one docs check (the provider's gateway timeout
  behavior) is the appropriate depth; not a full trace.
- Regression test: not strictly required — but an integration test that
  mocks a stalled provider and asserts the client aborts within a bound
  would be appropriate for the fix.
- Fix: pass a timeout (`AbortSignal.timeout(10_000)` for built-in
  fetch), map timeout errors to a clear 504/408, and — for payments — add
  an idempotency key so a retry after timeout cannot double-charge.

## Trap for the grader

Two wrong extremes: (a) dismissing it because "the provider is reliable"
— that is an assumption, not a check; (b) claiming BLOCKING because "it
will hang forever" — that is an assertion without evidence. The calibrated
finding is WORTH-FIXING with an explicit `UNVERIFIED` evidence tag and a
named verification step.
