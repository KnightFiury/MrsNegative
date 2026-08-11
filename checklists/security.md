# Checklist — Security

- Is any part of a query (SQL, NoSQL, GraphQL, shell command, file path)
  built by concatenating user-controlled input instead of using
  parameterization?
- Is user input reaching a sink (HTML render, `eval`, shell exec,
  deserializer, file path, template engine) without sanitization?
- Are secrets (API keys, tokens, passwords, connection strings) hardcoded,
  logged, or returned in an API response by mistake?
- Does this action require auth, and is that check actually present here
  — not just assumed to exist upstream?
- Does this action require a specific permission/role, and is that
  actually checked, or just "the UI doesn't show the button"?
- For state-changing endpoints, is there a CSRF token or equivalent — or
  does this rely solely on cookies/session being sent automatically?
- Is user-supplied data ever deserialized (pickle, YAML.load, etc.)
  without a safe-mode flag?
- Can a user reference another user's data by guessing/incrementing an ID
  (IDOR) because ownership isn't verified server-side?
- Is a file path built from user input without validating it can't escape
  the intended directory (`../../etc/passwd`-style traversal)?
- Is a server-side request (fetch, webhook call, image proxy) built from a
  user-supplied URL/host without verifying it can't reach internal or
  private addresses (SSRF)?
- Are error messages leaking internal details (stack traces, DB schema,
  file paths) to the end user?
- Is rate limiting or throttling relevant here, and is it present?

**Note:** unbounded input size (a cheap memory/CPU DoS) is covered by the
reliability checklist's "huge input" question — cross-reference that instead
of duplicating a bullet here.
