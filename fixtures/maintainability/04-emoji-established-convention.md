# Fixture — emoji matching an established convention

**Scope:** maintainability — counter-case to the emoji-in-code rule.

**Diff:**

```diff
@@ runImport(rows) @@
 async function runImport(rows) {
   // this file's convention: every phase line is emoji-tagged
   console.log('📥 ingest started', rows.length);
   for (const row of rows) {
     await upsert(row);
   }
-  console.log('ingest finished');
+  console.log('✅ ingest finished', rows.length);
   return rows.length;
 }
```

**Expected outcome:**

- No finding. The new `✅` log line matches the file's established
  emoji-log convention (carve-out (a)), and the unchanged `📥` line shows
  the convention pre-dates the diff.

**Traps to watch:** flagging the unchanged `📥` line (emoji that pre-dates
the diff) or applying the emoji rule without reading the carve-out is
over-flagging; the expected outcome is no finding.
