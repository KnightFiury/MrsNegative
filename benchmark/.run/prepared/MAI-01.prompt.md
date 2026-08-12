## Scenario

An auth service issues and extends session tokens. The team defined a single
source of truth for the session lifetime — `SESSION_TTL_SECONDS` in
`config.ts`, computed as `24 * 60 * 60` with a comment — and a review
checklist item says "no magic values where a named constant exists". This
diff lands a session-extend feature that re-uses the same lifetime but
hard-codes the number again instead of importing the constant.

## User request

> Add `extendSession` so a session can be renewed for another session
> lifetime without the user logging in again. Use the same lifetime as
> issuing.

## Code change (diff)

```ts
// src/auth/tokens.ts
import jwt from 'jsonwebtoken';
import { SECRET } from './secrets';

export function issueSessionToken(userId: string) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: 86400 }); // 24h
}

export function extendSession(token: string) {
  const payload = jwt.verify(token, SECRET);
  return jwt.sign(payload, SECRET, { expiresIn: 86400 }); // 24h
}
```

## Surrounding context

- `src/config.ts` already exports `SESSION_TTL_SECONDS = 24 * 60 * 60`
  with the comment "single source of truth for the session lifetime",
  and `tokens.ts` already imports from `./secrets`.
- `86400` is seconds in a day — the same value `SESSION_TTL_SECONDS`
  computes. The token payload and verification logic are correct.
- Nothing about the session-extension behavior is wrong: issuing,
  extending, and verifying all behave as specified.