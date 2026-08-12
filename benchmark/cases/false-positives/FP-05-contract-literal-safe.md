---
id: FP-05
category: false-positives
title: Magic value that is the API contract, not a magic number
mode: STRICT
user_request: "Return the user's subscription tier from the plan service."
severity_expected: NO-ISSUE
evidence_expected: N/A
investigation_expected: LOW
requires_regression_test: false
primary_finding: "none — the literal is the external contract's enum value"
key_skills: [false-positive, magic-number, contract-literal]
---

# FP-05 — Magic value that is the API contract, not a magic number

## Scenario

A service returns the user's subscription tier. The handler maps an
internal plan id to the tier string the plan service expects. A
"magic string / extract a constant" NITPICK is tempting — but the literal
is the value the *external contract* requires.

## User request

> Return the user's subscription tier, in the exact format the plan
> service expects.

## Code change (diff)

```js
const PLAN_TO_TIER = {
  'plan_free': 'free',
  'plan_pro': 'pro',
  'plan_biz': 'business',
};

app.get('/api/subscription/tier', requireAuth, async (req, res) => {
  const plan = await getPlan(req.user.id);
  const tier = PLAN_TO_TIER[plan.id] ?? 'free';
  res.json({ tier });
});
```

## Surrounding context

- The plan service's OpenAPI schema (in `docs/plan-service.yaml`)
  enumerates the tier values as exactly `free | pro | business`.
- The mapping is a one-to-one contract translation from internal plan ids
  to the external enum. Extracting "constants" would just move the same
  literals; there is no logic to deduplicate and no duplication across the
  codebase.

## Expected outcome

- **NO-ISSUE.** The string literals are the *contract values* the external
  service requires — they cannot be abstracted away, and they appear once
  in a named mapping object that documents the contract. A "magic string"
  finding is a false positive: the value is not an arbitrary magic number,
  it is a protocol value.
- The correct output is a minimal confirmation (or silence). At most a
  NITPICK *if* the mapping were duplicated elsewhere — here it is not.

## Trap for the grader

"Magic number/string" is the most common over-reached NITPICK. The trap is
flagging literals that are semantically load-bearing (external contract
values) as if they were arbitrary constants. The reviewer must distinguish
a magic value from a contract literal — the latter is the *point* of the
code.
