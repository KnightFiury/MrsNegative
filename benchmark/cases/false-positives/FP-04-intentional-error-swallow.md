---
id: FP-04
category: false-positives
title: Error swallowing that is intentional and contractually required
mode: STRICT
user_request: "Record the failed payment attempt but never fail the request over it."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: MEDIUM
requires_regression_test: false
primary_finding: "none — the catch is intentional and bounded"
key_skills: [false-positive, error-handling, intentional-swallow]
---

# FP-04 — Error swallowing that is intentional and contractually required

## Scenario

A checkout endpoint records a failed-payment analytics event. The
recording wraps in try/catch and swallows errors. At a glance this is the
classic "silently swallowing errors" smell. In context, the caller's
contract requires it: the analytics write must never break the checkout.

## User request

> After a failed payment, record an event so we can analyze decline rates.
> This must never break the checkout itself.

## Code change (diff)

```js
async function recordDecline(reason, metadata) {
  try {
    await analytics.track('payment.declined', { reason, ...metadata });
  } catch (err) {
    // intentional: analytics must never affect checkout.
    // (monitoring/alerting on the analytics pipeline is handled separately)
  }
}

app.post('/checkout', requireAuth, async (req, res) => {
  const result = await tryCharge(req.body);
  if (!result.ok) {
    recordDecline(result.reason, { userId: req.user.id });
    return res.status(402).json({ error: 'payment declined' });
  }
  res.json({ ok: true });
});
```

## Surrounding context

- The checkout response does not depend on `recordDecline` in any way; the
  function is fire-and-forget by design.
- The comment states the intent, and the surrounding code shows the
  checkout path never awaits or reads `recordDecline`.
- The team has separate alerting on the analytics pipeline (a monitoring
  ticket exists), so the swallow is not unmonitored silence.

## Expected outcome

- **NO-ISSUE.** The catch is intentional, bounded (one call), and its
  contract — never break checkout — is satisfied. There is no data loss
  path for the *user-visible* flow.
- Any finding that says "silently swallowing errors" is a false positive
  unless it can show a *user-visible* consequence or an *unmonitored*
  failure. Here neither applies: the consequence is confined to analytics
  and the pipeline is separately monitored.
- The correct output is a minimal confirmation (or silence).

## Trap for the grader

Bare `catch {}` blocks are a legitimate pattern to flag — most of the
time. The trap is flagging this one without checking (a) what the swallowed
call affects (nothing user-visible), and (b) whether the failure is
monitored elsewhere (it is). The reviewer must distinguish an accidental
swallow from a deliberate, contract-backed one.
