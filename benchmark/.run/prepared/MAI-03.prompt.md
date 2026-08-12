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