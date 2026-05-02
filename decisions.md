# Team Decisions Log

## Mobile Admin UI Implementation (2026-05-02)

- **2026-05-02T14:47:34.150+00:00**: Mobile admin tabs now use explicit section navigation and card/list affordances, while desktop keeps the existing wide workspace productivity layouts. (Ambrose)
- **2026-05-02T14:47:34.150+00:00**: Shared admin scrolling is owned by natural document flow on mobile and by the locked inner shell on `md+`, which avoids the previous nested-height trap without changing desktop behavior. (Ambrose)

## Mobile Admin Review & Validation (2026-05-02)

- **2026-05-02T14:47:34.150+00:00**: Review verdict — approve. The mobile admin refactor satisfies the plan: admin routes now keep natural scrolling on mobile while preserving md+ viewport locking, the admin tab strip is mobile-scrollable with active-tab centering, and PostEditor/Series/Collections/Images each add mobile-specific surfaces without removing their desktop multi-pane or dense-list workflows. (Joey)
- **2026-05-02T14:47:34.150+00:00**: Validation completed with `npm test`, `npm run lint`, and `npm run build`, all passing. Residual follow-up is low risk: add browser-level/mobile interaction coverage when the project gains a DOM harness, because current protection is source-contract based. (Joey)

## Collections Item-Workspace Scroll Fix (2026-05-02)

- **2026-05-02T15:41:30.668+00:00**: Reviewer gate for the focused Collections item-workspace scroll fix locks two contracts in source tests: mobile stays on stacked cards without horizontal scrolling, and desktop keeps the dense table inside a desktop-only `overflow-x-auto` wrapper with the existing wide three-pane shell. This catches the likely regression surface without waiting for browser harness work, while protecting the intended desktop information density. (Joey)
