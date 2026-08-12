# Checklist — Evidence

The evidence tag is the difference between a suspicion and a finding.
Every finding answers "how sure am I this exists?" before it answers "how
bad is it?" — and a finding can't reach `BLOCKING` without `CONFIRMED` or
`LIKELY` evidence.

- What did I actually inspect to support this finding — a code path, a
  grep, a dependency's source, a trace, a running repro?
- Did I reproduce the failure, or am I inferring it? A payload that was
  never run is `LIKELY`, not `CONFIRMED`.
- Did I check the dependency's real behavior (docs, `node_modules`) before
  assuming a default exists or doesn't?
- If I can't check something in-session, did I say exactly what I couldn't
  check — or did I let an `UNVERIFIED` suspicion masquerade as a fact?
- Is this finding phrased as an assertion when the evidence only supports
  a question? Suspicion earns investigation, not a severity tag.
- For a Security or Concurrency BLOCKING finding: is the proof in the
  Evidence field, or am I describing a risk I can't demonstrate?

**Trap to watch for:** the harder a finding is to verify, the more tempting
it is to assert it confidently. That's backwards — the harder it is to
verify, the lower the evidence tag must go.
