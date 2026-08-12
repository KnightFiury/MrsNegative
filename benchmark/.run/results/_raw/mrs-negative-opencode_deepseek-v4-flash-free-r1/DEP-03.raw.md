## Review

The diff wires `loginLimiter()` into `/login` and comments that it enforces "5 attempts per user per minute (sliding window)" — but nothing in the diff shows what the limiter actually keys on, what window type it uses, or what its configured limit is. The user explicitly asked for "max 5 per user per minute," so the comment is a claim about intent being met, not evidence of it. This is the single most important issue: if `lib/rate-limit.js` keys on `req.ip` instead of the user/attempt subject, the control is trivially bypassed by rotating IPs and the requirement is silently unmet; if it's fixed-window, burst behavior differs; if the limit constant isn't 5, the requirement is silently unmet. The fix is not to trust the comment but to open `lib/rate-limit.js` and verify the key derivation (user-scoped key vs `req.ip`), the window type, and the limit constant — then either adapt the keying or add a per-user limiter, and make the comment true or delete it.

Severity is WORTH-FIXING with UNVERIFIED evidence: I can't confirm the limiter's actual keying/window/limit from the diff, and per the evidence model suspicion earns investigation, not a BLOCKING tag. The concrete verification is a test that hits `/login` six times as one user within a minute, asserts the sixth is limited, and asserts a second user is unaffected — plus a config assertion that the limit is 5 with a sliding window. Rate limiting on a login endpoint is a real credential-stuffing control, so pinning the actual behavior with a regression test is appropriate before this counts as "done." The confident reading here would be: you're not actually confident `loginLimiter()` keys per user with a limit of 5 per sliding minute, are you — and you haven't opened `lib/rate-limit.js` to check?

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "UNVERIFIED",
  "primaryFound": true,
  "evidenceBacked": false,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "require",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "The comment asserts 5/user/min sliding-window behavior that the diff cannot show is true, so it is a genuine intent/security risk raised as WORTH-FIXING (UNVERIFIED) rather than escalating to BLOCKING on unconfirmed keying semantics."
}
```
