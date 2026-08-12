## Scenario

A profile team needs every email trimmed and lowercased before it hits the
profile service. The platform already has `src/shared/strings.ts` exporting
`normalize(kind, value)` with `kind: 'email'`, which does trim + lowercase
and is used by four other services. The team ships a new file that
re-implements the same two lines locally instead of calling the shared
helper.

## User request

> Normalize email addresses (trim whitespace, lowercase) on every path into
> the profile service so lookups never miss due to formatting.

## Code change (diff)

```ts
// src/user/normalize.ts — NEW
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// src/user/service.ts — uses the new helper
import { normalizeEmail } from './normalize';

export async function findOrCreateProfile(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  return db.upsertProfile({ email });
}
```

## Surrounding context

- `src/shared/strings.ts` has, and has had for two years:
  `normalize('email', v) { return v.trim().toLowerCase(); }` — identical
  semantics, already imported by four other services.
- The new code is behaviorally correct: trim + lowercase matches the shared
  util exactly. There is no bug.
- The platform convention (checklist item "no reinvented shared
  utilities") says to reuse `normalize('email', …)`.