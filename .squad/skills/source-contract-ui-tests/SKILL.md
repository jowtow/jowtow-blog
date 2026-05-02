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

- `tests/adminMobileContracts.test.ts` protects the admin shell scroll contract, sticky tab strip affordances, the guarded Collections bootstrap selection flow, and the Collections item-workspace split where mobile cards stay `md:hidden`-opposed to a desktop-only dense table scroll wrapper.

## Reviewer gate add-on

- For responsive data-workspace fixes, pair assertions for both sides of the breakpoint boundary:
  - mobile presentation stays on the stacked/card surface (`md:hidden` or equivalent)
  - any `overflow-x-auto` wrapper and wide `min-w-[...]` table shell stay gated to desktop breakpoints
- When those mobile cards live inside an `overflow-hidden` workspace panel, lock `min-w-0 overflow-hidden` on the card itself so child copy cannot silently widen the card and clip its controls.
- When mobile cards include action buttons beneath preview text, also lock the preview clamp (`truncate`/`line-clamp-*` plus word-breaking as needed) and the button-row grid so long copy cannot push or visually clip the mobile controls.
- This keeps “remove mobile horizontal overflow” fixes from accidentally flattening the desktop layout or reintroducing page-level sideways scroll on small screens.
