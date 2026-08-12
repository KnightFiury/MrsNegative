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