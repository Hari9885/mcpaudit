# Contributing to mcpaudit

Thanks for helping make MCP servers safer. The most useful contributions are new detection rules.

## Add a pattern rule (no code needed)

Injection phrases (sec-01) and secret shapes (sec-05) live in [`rules/patterns.yaml`](rules/patterns.yaml).

1. Add your entry under `injection:` (a case-insensitive regex) or `secrets:` (a regex).
2. Bump the `updated:` date in that file.
3. Add a case to a fixture in `fixtures/evil/server.ts` that contains your pattern, and assert it fires in `test/patterns.test.ts`.
4. `npm test` must pass.

Example:

```yaml
injection:
  - "forward (this|the) (data|file|output) to"
```

## Add a structural or probe rule (code)

Structural rules live in `src/rules/structural.ts`; probe rules in `src/prober.ts`. Each rule:

- Uses a frozen ID (`conf-*`, `sec-*`, `qual-*`) — pick the next number in its category.
- Returns a `Finding` with the right `severity` (error −15, warn −5, info −2).
- Has a test asserting it fires on a fixture that should trip it **and** does not fire on `good`.

## Ground rules

- Every rule needs a test against a fixture. No test, no merge.
- `good` must always score A. If your rule makes `good` drop, either `good` has a real problem (fix the fixture) or your rule has a false positive (fix the rule).
- Keep runtime dependencies to zero beyond the SDK, `commander`, and `yaml`.

Run everything with `npm test` and `npm run typecheck` before opening a PR.
