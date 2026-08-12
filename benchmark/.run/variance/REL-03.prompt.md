## Scenario

A Node/Express server streams large files (e.g. exports) to clients. The
handler opens a readable stream from disk and pipes it to the response.
If the client disconnects mid-stream, the readable side is left open.

## User request

> Stream the export file to the browser. Make sure we clean up if the
> client cancels mid-download.

## Code change (diff)

```js
app.get('/exports/:id/download', requireAuth, async (req, res) => {
  const record = await db.query('SELECT path FROM exports WHERE id = $1', [req.params.id]);
  if (!record) return res.status(404).end();

  const src = fs.createReadStream(record.path);
  src.pipe(res);

  // no 'error'/'close' handler on src; no cleanup on res 'close'
});
```

## Surrounding context

- `fs.createReadStream` opens a file descriptor that must be released.
- Clients cancel downloads (or network errors abort them) regularly; on
  abort, `res` emits `close`, but `src` keeps streaming internally.
- The handler leaves the FD open until `src` finishes naturally.