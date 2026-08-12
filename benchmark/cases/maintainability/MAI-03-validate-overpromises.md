---
id: MAI-03
category: maintainability
title: validateOrderInput overpromises — it also normalizes
mode: BATCH
user_request: "Validate order input before charging."
severity_expected: NITPICK
evidence_expected: CONFIRMED
investigation_expected: LOW
requires_regression_test: false
primary_finding: "validateOrderInput has a side effect (normalization) its name does not promise — rename or split"
key_skills: [maintainability, misleading-name, side-effect]
---

# MAI-03 — validateOrderInput overpromises — it also normalizes

## Scenario

A checkout service has an input-handling function named `validateOrderInput`
that throws on invalid input. The diff extends it to also *normalize* (trim
+ lowercase the email, strip card whitespace) and return the cleaned value.
The name says "validate"; the body now mutates-and-returns. A future caller
who reads the name and ignores the return value would silently pass
un-normalized data onward.

## User request

> Validate order input before charging, and make sure the email and card
> number are clean (no stray spaces, no mixed case) when they reach the
> payment provider.

## Code change (diff)

```ts
// src/orders/input.ts
export function validateOrderInput(input: OrderInput): OrderInput {
  const cleaned = {
    email: input.email.trim().toLowerCase(),
    cardNumber: input.cardNumber.replace(/\s+/g, ''),
    ...input,
  };
  if (!cleaned.email.includes('@')) throw new Error('invalid email');
  return cleaned;
}

// src/orders/checkout.ts — call sites use the return value
const order = validateOrderInput(req.body);
await charge(order);
```

## Surrounding context

- Every current call site assigns the return value, so today the
  normalization always reaches the payment provider.
- The transformation is benign and idempotent (trim, lowercase, strip
  spaces) — it does not corrupt data.
- The project's naming convention is that a function prefixed
  `validate*` must not mutate its input or produce a "cleaned" output
  unless the name says so.

## Expected outcome

- **NITPICK** with evidence **CONFIRMED**, investigation **LOW**. Behavior
  is correct; the finding is the name: `validateOrderInput` now also
  normalizes and returns a *cleaned* object, which the name does not
  promise. A caller who drops the return value (natural under a
  validate-only reading) silently loses the normalization.
- The fix is naming: rename to something like `validateAndNormalizeOrderInput`
  or split the normalize step out — no behavior change needed.
- BATCH mode: one grouped [MAINTAINABILITY] note, tagged NITPICK,
  non-blocking. No regression test required.

## Trap for the grader

The trap is escalating this to WORTH-FIXING as "silent data corruption" or
"callers may already be dropping the return value". Neither is true: the
transformation is benign, idempotent, and every current call site uses the
return value. The consequence is *future* misuse risk, which is the
definition of a maintainability nitpick, not a bug. The calibrated answer
is a batched NITPICK that names the rename.
