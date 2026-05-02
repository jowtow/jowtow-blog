# Joey — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Tester
- **Joined:** 2026-05-01T11:58:01.410Z

## Learnings

<!-- Append learnings below -->
- 2026-05-02T16:04:37.513+00:00: The landed collection-card clipping fix is safe when `components/CollectionsManager/CollectionsManager.tsx` keeps `min-w-0 overflow-hidden` on each mobile card, truncates the markdown summary before the action row, and leaves the desktop `md:block` table wrapper plus `min-w-[720px]` grid unchanged.
- 2026-05-02T16:04:37.513+00:00: The mobile item cards in `components/CollectionsManager/CollectionsManager.tsx` need the preview copy clamped (`line-clamp-2` + word breaking) while keeping the two-button action grid intact, otherwise long summaries can visually crowd or clip the mobile action row even though the desktop table contract stays unchanged.
- 2026-05-02T15:41:30.668+00:00: For `components/CollectionsManager/CollectionsManager.tsx`, the safest reviewer gate for the item-workspace scroll fix is a source-contract pairing: keep the mobile item cards behind `md:hidden`, and keep the dense table’s `overflow-x-auto` + `min-w-[720px]` wrapper desktop-only so mobile pages do not regain horizontal overflow while desktop density survives.
- 2026-05-02T11:41:01.641+00:00: `components/CollectionsManager/CollectionsManager.tsx` now drives collection auto-selection through `loadCollections()` plus a `useEffect`, so selection-state dependencies in that effect can silently break the "New Collection" flow.
- 2026-05-02T11:41:01.641+00:00: The admin shell width split is implemented by `components/RouteAwareMain/RouteAwareMain.tsx` at the root layout boundary and by a tab-to-mode map in `app/admin/page.tsx`; Collections/Series/Images are wide, Dashboard/Create stay constrained.
- 2026-05-02T14:47:34.150+00:00: The current mobile admin shell pass is concentrated in `app/admin/layout.tsx`, `components/RouteAwareMain/RouteAwareMain.tsx`, and `app/admin/page.tsx`; the intended contract is natural mobile page scroll with desktop-only viewport locking plus a horizontally scrollable mobile tab strip.
- 2026-05-02T14:47:34.150+00:00: `tests/adminMobileContracts.test.ts` uses source-contract checks because the repo’s test surface is `node:test` via `tsx --test` without a DOM harness; it now guards the md+ admin shell lock, mobile tab-strip affordances, and the Collections bootstrap auto-select fix.
- 2026-05-02T14:47:34.150+00:00: The mobile admin refactor keeps desktop workflows by swapping to mobile-only panel toggles/cards in `SeriesManager`, `CollectionsManager`, and `ImagesManager`, while retaining lg/xl multi-pane or dense-table layouts at larger breakpoints.
- 2026-05-02T14:47:34.150+00:00: Repo-level confidence for admin UI reviews comes from `npm test`, `npm run lint`, and `npm run build`; the current mobile admin pass clears all three, with build-time blob warnings remaining non-blocking environment noise.

## Team Session Update

**2026-05-02T16:04:37.513+00:00: Collections Mobile Card Test Coverage Tightening**

- Extended test coverage in `tests/adminMobileContracts.test.ts` for mobile collection item cards
- Added guards for preview clamp, two-button action grid layout contract
- Locked mobile card overflow and button positioning invariants
- Verified desktop dense-table behavior unchanged by mobile card boundary changes
- Validation: `npm test`, `npm run lint`, `npm run build` all passing
- Coverage now guards against mobile preview-clipping and button-grid regressions

**2026-05-02T16:04:37.513+00:00: Collections Card Truncation Review**

- Reviewed Ambrose's mobile item-card truncation patch in `components/CollectionsManager/CollectionsManager.tsx`
- Confirmed the mobile card now truncates preview copy before the Select/Open Editor grid and preserves the card overflow boundary
- Confirmed desktop behavior remains on the existing `md:block` dense table inside the desktop-only horizontal scroll wrapper
- Validation completed: `npm test`, `npm run lint`, and `npm run build` all passed; Netlify Blobs warnings during build remained non-blocking environment noise
- Approved implementation

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
