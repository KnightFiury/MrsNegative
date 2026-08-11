# Checklist — Reliability & Failure Modes

- What happens on `null` / `undefined` / `None`?
- What happens on empty string / empty array / empty object?
- What happens on zero, negative numbers, or a number way bigger than
  anyone tested?
- What happens if this function is called before its dependencies (DB
  connection, config, auth context) are ready?
- What happens if this is called twice in a row, or never called at all?
- If this is in a loop or batch — what happens when one item in the batch
  fails? Does the whole batch abort, or does it silently skip?
- Does this function have a single responsibility, or is it quietly doing
  three things where any one of them can fail the other two?
- If this writes to disk/DB and the process dies mid-write, what state is
  left behind?
- Is there a retry anywhere that could turn a transient failure into a
  duplicate action (double-charge, double-send, double-insert)?
