## Review

This is a security regression. The refactor silently dropped `sanitizeUrl(req.query.url)`, which was the only guard blocking SSRF. The input now flows directly from `req.query.url` into `fetch()`: `app.get('/api/preview', async (req, res) => { const html = await fetch(req.query.url)... })`. The user request explicitly prohibited fetching arbitrary internal addresses, and this change directly violates that requirement.

The severity is BLOCKING. The context confirms `sanitizeUrl` rejected private ranges (`10.x`, `172.16–31.x`, `192.168.x`, loopback, metadata addresses) and that this was its only call site, so the guard is genuinely gone, not just moved. The server runs inside a VPC with internal services on `10.0.0.0/8`, so an attacker can use this endpoint as a blind proxy to reach internal services, cloud metadata, and other network plumbing.

Concrete attack: `GET /api/preview?url=http://169.254.169.254/latest/meta-data/` (AWS metadata) or `?url=http://10.0.0.5/` (internal service). The title/description extraction reflects content back to the caller, making a viable data-exfil channel.

Fix: reinstate the sanitizer before fetching, and harden further since sanitizing the original string alone is insufficient — also validate the resolved IP post-DNS and pin down redirect handling, since SSRF payloads commonly use DNS rebinding or `Location:` redirects to smuggle internal targets past a string check:

```js
app.get('/api/preview', async (req, res) => {
  const url = sanitizeUrl(req.query.url); // blocks internal hosts
  if (!url) return res.status(400).json({ error: 'invalid url' });
  const html = await fetch(url, { redirect: 'manual' }).then(r => r.text());
  res.json({ title: extractTitle(html) });
});
```

This is an established exploit (SSRF), confirmed directly from the provided diff and context — no runtime verification needed to reach the BLOCKING tier. A regression test asserting that internal/loopback/metadata URLs are rejected (and external URLs still work) should be required.

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
  "notes": "SSRF regression confirmed from code: input-to-sink trace (req.query.url into fetch) plus context proving sanitizeUrl was the sole guard and is now dead code."
}
```
