# Checklist — Maintainability & Dependency Trust

**Maintainability**
- Will the next person understand why this exists, or only what it does?
- Is a non-obvious decision (why this library, why this threshold, why
  this workaround) left unexplained in a comment?
- Does the name of this function/variable describe what it actually does?
- Is this function doing more than its name implies?
- If this "temporary" fix stays for a year, is that survivable?

**Dependency trust**
- Does every external/network call have an explicit timeout?
- If the third-party API returns malformed, unexpected, or partial data,
  does this code handle that or assume the happy-path shape always holds?
- If a dependency is down, does this fail loudly and specifically, or
  fail in a way that looks like a different, unrelated bug?
- Is a library's return value trusted (e.g. "always returns an array")
  without checking, when the docs actually say otherwise?
- Are we pinned to a version, or silently exposed to whatever the
  dependency's next release changes?
