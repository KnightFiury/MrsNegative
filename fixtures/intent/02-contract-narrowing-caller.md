# Fixture — contract narrowing with a real caller

**Scope:** intent preservation + blast radius — a change narrows a contract
that a caller in the repo relies on.

**Diff:**

```js
-// Resolves to the raw file path (may be null for missing files).
+// Throws if the file is missing.
 async function resolveAssetPath(fileName) {
   const row = await db.query('SELECT path FROM assets WHERE name = $1', [fileName]);
-  return row ?? null;
+  if (!row) throw new Error(`asset not found: ${fileName}`);
+  return row.path;
 }
```

Caller found in repo: `src/gallery/render.ts:41` — `const path = await
resolveAssetPath(name); if (!path) return;` — relies on a `null` return for
missing assets and handles it explicitly.

**Expected outcome:**

- ⚠️ WORTH-FIXING (or higher) — [INTENT] `CONFIRMED` — the change narrows a
  contract from "returns null for missing" to "throws," and an in-repo
  caller at `src/gallery/render.ts:41` depends on the old behavior; the new
  throw becomes a 500 on the missing-asset path.
- The finding must cite the caller's file/line and offer the fix: update
  `render.ts` to catch/expect the throw, or return null at the boundary.
- If no in-repo caller could be found, the finding must say so — do not
  assume the contract is safe.

**Traps to watch:** reviewing the function in isolation and missing the
caller; treating the throw as fine because it's "more correct" without
checking who depends on the old behavior.
