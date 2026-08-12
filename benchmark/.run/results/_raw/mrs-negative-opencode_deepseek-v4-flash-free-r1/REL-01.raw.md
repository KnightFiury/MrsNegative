## Review

The stated intent — "never leave the customer hanging" — is the first thing this code violates. The `fetch` has no timeout and no cancel path. Per the provided context, the provider documents a 30s gateway timeout and Node's built-in `fetch` has an effectively unbounded response timeout by default; the handler is synchronous with the request, so the customer's HTTP connection stays open for the entire wait. A provider that accepts the connection and stalls past its own 30s (or a gateway that dies silently) leaves this route hanging with nothing surfacing to the customer — exactly the failure the request forbids. There's also no error path at all: a rejected fetch (connection refused, DNS failure) throws out of the async handler, which Express 4 doesn't route to error middleware, so the request never gets a response — another hang. And `result.json()` on a non-OK, non-JSON body throws for the same reason.

🛑 [RELIABILITY] [CONFIRMED] No timeout and no cancel path on the payment `fetch` — a stalled provider leaves the customer's checkout hanging, directly contradicting "never leave the customer hanging."
   Evidence: context states the provider's 30s gateway timeout and `fetch`'s unbounded default response timeout; the payment path is synchronous with the request handler, so the customer's HTTP request stays open for the whole wait. A connection that accepts but never responds hangs this route indefinitely. The missing try/catch compounds it: any fetch rejection or non-JSON error body throws out of the async handler with no response sent.
   Impact: customer sits on a spinning checkout for minutes; no error surfaces; server resource held.
   → Fix: wrap the fetch in an `AbortController` with a hard timeout comfortably below the 30s gateway limit (e.g. 15s), clear the timer in a `finally`, map `AbortError` to a `504` response, and add a try/catch returning a `502` on a rejected fetch; guard `result.json()` for non-JSON error bodies.
   Verification: unit test with a stubbed fetch that never resolves — assert the route returns `504` within the timeout window; second test where fetch rejects, asserting a `5xx` is returned. Failing-first against this code.

You're not actually confident this handles the provider stalling past its own 30s timeout without the customer's checkout hanging, are you?

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "BLOCKING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The unbounded fetch timeout and missing error path directly violate the stated 'never hang the customer' intent; context establishes the provider's 30s timeout and fetch's unbounded default, so BLOCKING is evidence-backed, and the fix names an explicit timeout, abort mapping, and failing-first tests."
}
```
