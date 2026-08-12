## Review

The primary problem is exactly the one the request calls out: nothing tears down the source stream when the client disconnects. `Readable.pipe()` only unifies/cleans up on source `end` or when the destination emits `error`/`unpipe`; it does not react to the HTTP response's `close` (the signal fired on client abort). So when a download is cancelled, the `fs.createReadStream` is never destroyed, the file descriptor stays open, and the OS keeps reading the rest of the file to EOF in service of a write target that no longer exists. On a busy server with large exports and frequent cancels, that is a genuine FD/socket leak that accumulates.

Two secondary issues compound it:

1. There is no `error` handler on `src`. If the file can't be read (permissions, file removed between query and open), `src` emits `error`; pipe's internal handler unpipes and re-emits on `res`, and with no listener the event can crash the process (or at best ends the response mid-body). The handler should route this to a 500.
2. `if (!record)` never fires: a `pg`/`mysql` result object is truthy even when zero rows match, so a bad id proceeds to `record.path === undefined` and `createReadStream(undefined)` throws synchronously — unhandled, crashing instead of 404-ing.

Fix: replace the manual pipe with `stream.pipeline(createReadStream(record.path), res, (err) => ...)`, which destroys both sides on abort/error and closes the FD, or minimally add `res.on('close', () => src.destroy())` plus an `src.on('error', ...)` handler; and check `record.rows.length` for the 404 path.

## Verdict JSON

```json
{
  "hasFinding": true,
  "severity": "WORTH-FIXING",
  "evidence": "CONFIRMED",
  "primaryFound": true,
  "evidenceBacked": true,
  "verificationConcrete": true,
  "fixConcrete": true,
  "intentPreserved": true,
  "regressionStance": "confirm",
  "regressionAppropriate": true,
  "inventedSeverity": null,
  "unverifiedEscalated": false,
  "notes": "Res 'close' on abort never destroys the readable stream, leaking the FD until EOF; pipe() lacks cleanup on dest close, and the missing src error handler plus the always-truthy record check add crash paths."
}
```
