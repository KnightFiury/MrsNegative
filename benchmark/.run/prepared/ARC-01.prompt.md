## Scenario

An Express app previously applied auth per-route. A refactor introduced a
global auth middleware that protects everything by default, with an
explicit public allowlist. The diff also adds a new admin route. Because
of registration order, the new route is mounted *before* the auth
middleware — it is never protected.

## User request

> Refactor auth into shared middleware so all routes are protected by
> default, and only explicitly-public ones are exempt. Also add an admin
> endpoint to fetch all users.

## Code change (diff)

```js
// lib/auth-middleware.js (new)
export const authRequired = (req, res, next) =>
  req.user ? next() : res.status(401).end();

// server.js
import { authRequired } from './lib/auth-middleware.js';
import adminRoutes from './routes/admin.js';   // new: GET /admin/users
import publicRoutes from './routes/public.js';

app.use(express.json());
app.use('/admin', adminRoutes);        // ← registered FIRST (no auth guard)
app.use(authRequired);                 // ← auth boundary applied AFTER
app.use(publicRoutes);
```

## Surrounding context

- Before the refactor, `/admin/users` carried an explicit `authRequired`
  middleware (in `routes/admin.js`).
- The refactor's intent (from the request) is "protected by default."
- `server.js` shows `app.use('/admin', adminRoutes)` before
  `app.use(authRequired)`, and `routes/admin.js` (visible in the repo) no
  longer attaches the per-route guard.