## Scenario

A messaging app has a link-preview feature. The original endpoint passed
the user's URL through a `sanitizeUrl` helper that blocked internal hosts.
During a refactor, the call site was rewritten and the `sanitizeUrl` call
was dropped — the refactor diff does not touch `sanitizeUrl` itself, so a
diff-scoped review might not notice the guard is gone.

## User request

> Add a URL preview feature: given a link, fetch it and return its title
> and description. Don't let users make the server fetch arbitrary
> internal addresses.

## Code change (diff)

```js
// before (existing, worked):
app.get('/api/preview', async (req, res) => {
  const url = sanitizeUrl(req.query.url); // blocks internal hosts
  const html = await fetch(url).then(r => r.text());
  res.json({ title: extractTitle(html) });
});

// after (the change under review):
app.get('/api/preview', async (req, res) => {
  const html = await fetch(req.query.url).then(r => r.text());
  res.json({ title: extractTitle(html) });
});
```

## Surrounding context

- `sanitizeUrl` is defined in `lib/net.js` and is unchanged by this diff.
  It rejects private ranges (127.x, 10.x, 172.16–31.x, 192.168.x,
  metadata addresses), loopback, and non-http(s) schemes.
- The refactor removed the only call site of `sanitizeUrl`.
- The server runs inside a VPC with internal services on `10.0.0.0/8`.