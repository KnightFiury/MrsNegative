## Scenario

An API team consolidated user serialization into a shared helper. The
request said the response shape must stay backwards compatible. The
change swapped a field name (`username` → `name`) and dropped a field
(`email`), and the shared helper is also used by a mobile client
documented in the repo.

## User request

> Refactor the user serializer to use the shared profile helper. The
> response shape must stay backwards compatible — existing clients keep
> working unchanged.

## Code change (diff)

```js
// before (users controller):
function serializeUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

// after (using shared helper):
import { toProfile } from '../lib/profiles';

function serializeUser(user) {
  return toProfile(user); // { id, name, avatar_url } — no email, no username
}
```

## Surrounding context

- `lib/profiles.js` is the shared helper; `toProfile` returns
  `{ id, name, avatar_url }`.
- `docs/mobile-api.md` (in the repo) documents that the iOS/Android client
  reads `username` and `email` from `GET /users/:id`.
- The change is a pure refactor in intent, but it alters the public
  response contract.