# Source Contract UI Tests

## Pattern

When the repo does not have a browser or DOM component test harness, protect high-risk UI refactors with source-contract tests that assert the key layout classes, responsive breakpoints, and workflow guardrails directly from the implementation files.

## Use when

- the existing test setup is `node:test` or other non-DOM tooling
- a refactor is mostly about responsive layout, scroll ownership, or shell wiring
- reviewer confidence depends on a few critical invariants surviving follow-up edits

## Why it works

- It adds cheap regression coverage without introducing new test dependencies.
- It catches accidental removals of breakpoint-specific classes and workflow protections.
- It complements reviewer/manual QA by locking the highest-risk implementation contracts in code.

## Example here

- `tests/adminMobileContracts.test.ts` protects the admin shell scroll contract, sticky tab strip affordances, and the guarded Collections bootstrap selection flow.
