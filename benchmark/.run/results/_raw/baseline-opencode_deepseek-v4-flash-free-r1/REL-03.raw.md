## Review

The handler never reacts to the client disconnecting. `res` emits `close` when the request aborts, but nothing listens: `src.pipe(res)` keeps its flow-looping internal reader going, the file descriptor stays open, and the FD is only released if `src` reaches EOF naturally. `pipe` does **not** clean up when the destination ends early — this is what the "client cancels" path looks like, and it's exactly the case the user asked to handle. The fix is to stop the source when the socket goes away: `res.on('close', () => src.destroy())`, and also attach `src.on('error', ...)` because a mid-stream read failure with no listener throws as an unhandled `'error'` event and can take the whole process down. On a busy download endpoint where aborts are "regular", the FD leak compounds into exhaustion.

Secondary but real: `if (!record)` is dead code — `db.query()` resolves to a result object that is always truthy, so `record.path` is `undefined` and `fs.createReadStream(undefined)` throws *synchronously* inside the async handler before `pipe`, producing an unhandled rejection (Express 4 does not catch it) instead of a 404. Should be `record.rows[0]?.path`, plus a `res.status(404)` decision. Not the user's ask, but a genuine bug in the diff.

Concrete verification: integration test that starts the download, destroys the client socket after the first data chunk, then asserts the source stream/descriptor was released (e.g. `getActiveResourcesInfo()` or `/proc/<pid>/fd` on Linux, or confirming `src.destroyed === true` after `res` `close`); plus an abort test cover to ensure no unhandled `error`. Concrete fix:

```js
const src = fs.createReadStream(record.path);
res.on('close', () => src.destroy());          // client abort OR normal finish — destroy is idempotent
src.on('error', err => { res.destroy(err); });  // no unhandled 'error' crash
src.pipe(res);
```

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
  "notes": "Primary finding is the missing destroy-on-close (FD leak on every aborted download, the exact case the user asked to handle) plus an unhandled 'error' crash risk; both are confirmed standard Node stream semantics, with the dead 404 check noted as secondary."
}
```
