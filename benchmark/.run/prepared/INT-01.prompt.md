## Scenario

A SaaS admin panel. A dev added a `DELETE /users/:id` endpoint. The
request explicitly stated the permission model: only admins, never
self-deletion through this endpoint. The implementation added
authentication but no role or self-check.

## User request

> Add an endpoint to delete a user account. Only admins may delete
> accounts, and an admin should not be able to delete their own account
> through this endpoint.

## Code change (diff)

```js
app.delete('/users/:id', requireAuth, async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
```

## Surrounding context

- `requireAuth` verifies a valid session and sets `req.user` — it does not
  check roles.
- The `users` table has a `role` column (`'admin' | 'member'`), and the
  session already carries `req.user.role`.
- `/users/:id` accepts any id, including the caller's own.