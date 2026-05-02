# Joey — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Tester
- **Joined:** 2026-05-01T11:58:01.410Z

## Learnings

<!-- Append learnings below -->
- 2026-05-02T15:41:30.668+00:00: For `components/CollectionsManager/CollectionsManager.tsx`, the safest reviewer gate for the item-workspace scroll fix is a source-contract pairing: keep the mobile item cards behind `md:hidden`, and keep the dense table’s `overflow-x-auto` + `min-w-[720px]` wrapper desktop-only so mobile pages do not regain horizontal overflow while desktop density survives.
- 2026-05-02T11:41:01.641+00:00: `components/CollectionsManager/CollectionsManager.tsx` now drives collection auto-selection through `loadCollections()` plus a `useEffect`, so selection-state dependencies in that effect can silently break the "New Collection" flow.
- 2026-05-02T11:41:01.641+00:00: The admin shell width split is implemented by `components/RouteAwareMain/RouteAwareMain.tsx` at the root layout boundary and by a tab-to-mode map in `app/admin/page.tsx`; Collections/Series/Images are wide, Dashboard/Create stay constrained.
- 2026-05-02T14:47:34.150+00:00: The current mobile admin shell pass is concentrated in `app/admin/layout.tsx`, `components/RouteAwareMain/RouteAwareMain.tsx`, and `app/admin/page.tsx`; the intended contract is natural mobile page scroll with desktop-only viewport locking plus a horizontally scrollable mobile tab strip.
- 2026-05-02T14:47:34.150+00:00: `tests/adminMobileContracts.test.ts` uses source-contract checks because the repo’s test surface is `node:test` via `tsx --test` without a DOM harness; it now guards the md+ admin shell lock, mobile tab-strip affordances, and the Collections bootstrap auto-select fix.
- 2026-05-02T14:47:34.150+00:00: The mobile admin refactor keeps desktop workflows by swapping to mobile-only panel toggles/cards in `SeriesManager`, `CollectionsManager`, and `ImagesManager`, while retaining lg/xl multi-pane or dense-table layouts at larger breakpoints.
- 2026-05-02T14:47:34.150+00:00: Repo-level confidence for admin UI reviews comes from `npm test`, `npm run lint`, and `npm run build`; the current mobile admin pass clears all three, with build-time blob warnings remaining non-blocking environment noise.

## Team Session Update

**2026-05-02T15:41:30.668+00:00: Collections Item-Workspace Scroll Fix Review**

- Reviewed Ambrose's Collections item-workspace horizontal overflow fix
- Confirmed mobile behavior: stacked cards without horizontal scrolling (contract locked)
- Confirmed desktop behavior: dense table inside overflow-x-auto wrapper with three-pane shell (contract locked)
- Source-contract coverage protects against regression without browser harness work
- Approved implementation; validation complete (`npm test`, `npm run lint`, `npm run build` passing)

**2026-05-02T14:47:34.150+00:00: Mobile Admin UI Contract Tests & Review**

- Added `tests/adminMobileContracts.test.ts` with source-contract checks for mobile admin shell (no DOM harness available)
- Reviewed Ambrose's mobile admin UI refactor: natural mobile scrolling + desktop viewport lock intact
- Validation completed: all repo tests passing (`npm test`, `npm run lint`, `npm run build`)
- Approved implementation; noted residual low-risk follow-up for browser-level interaction coverage
- Mobile admin tab-strip affordances and scroll contract now guarded by tests
