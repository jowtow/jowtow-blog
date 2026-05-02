# Ambrose — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Frontend Dev
- **Joined:** 2026-05-01T11:58:01.407Z

## Learnings

<!-- Append learnings below -->
- 2026-05-02T15:41:30.668+00:00: The Collections item workspace header now uses `w-full min-w-0 overflow-hidden` plus a mobile-stacked control group, keeping phones free of horizontal scroll while restoring the dense side-by-side header from `md+`.
- 2026-05-02T14:47:34.150+00:00: Mobile admin scroll ownership now lives in the page flow below `md`, while `components/RouteAwareMain/RouteAwareMain.tsx`, `app/admin/layout.tsx`, and `app/admin/page.tsx` keep the viewport-locked shell only on desktop.
- 2026-05-02T14:47:34.150+00:00: `app/admin/page.tsx` uses a sticky horizontal tab strip with short mobile labels and per-tab width modes so navigation stays reachable on phones without giving up the wide desktop workspaces.
- 2026-05-02T14:47:34.150+00:00: `components/PostEditor/PostEditor.tsx`, `components/SeriesManager/SeriesManager.tsx`, `components/CollectionsManager/CollectionsManager.tsx`, and `components/ImagesManager/ImagesManager.tsx` now separate browse/edit surfaces on mobile and swap dense desktop rows for card-based mobile affordances where needed.
- 2026-05-02T11:41:01.641+00:00: Added a route-aware admin shell breakout via `components/RouteAwareMain/RouteAwareMain.tsx`, letting `/admin` use full-width inner workspaces while public routes keep the legacy content gutters.
- 2026-05-02T11:41:01.641+00:00: Rebuilt `components/CollectionsManager/CollectionsManager.tsx` into a three-pane workspace with auto-select-first collection behavior, a dense item browser, and a fullscreen split editor overlay for collection items.
- 2026-05-02T11:41:01.641+00:00: `app/admin/page.tsx` now assigns per-tab shell modes so Dashboard/Create stay constrained while Collections/Series/Images render in the wider workspace shell; `components/ImagesManager/ImagesManager.tsx` now fills that shell cleanly.

## Team Session Update

**2026-05-02T15:41:30.668+00:00: Collections Item-Workspace Scroll Fix**

- Fixed Collections item-workspace mobile horizontal overflow
- Constrained section and stacked header controls on small screens
- Preserved md+ dense header layout on desktop
- Updated source-contract tests for mobile/desktop layout contracts
- Joey approved fix with locked contracts for mobile stacked-card/no-sideways-spill and desktop dense table/wide layout
- Validation: `npm test`, `npm run lint`, `npm run build` all passing

**2026-05-02T14:47:34.150+00:00: Mobile Admin UI Implementation & Review Pass**

- Mobile admin UI pass implemented across 7 components (layout, page, RouteAwareMain, editors)
- Natural scrolling on mobile, viewport-locked shell on `md+` deployed without desktop behavior changes
- Admin tab strip mobile-scrollable with active-tab centering
- PostEditor/Series/Collections/Images add mobile-specific card/list surfaces while preserving desktop multi-pane workflows
- Contract tests added by Joey (`tests/adminMobileContracts.test.ts`) guard mobile/desktop scroll contract and tab affordances
- Validation: `npm test`, `npm run lint`, `npm run build` all passing
- Joey approved implementation; low-risk follow-up identified (browser-level mobile interaction coverage when DOM harness available)

**2026-05-02T11:41:01.641+00:00: Admin Shell & Collections Redesign**

- Implementation of admin shell wide mode and Collections workspace redesign completed
- Route-aware admin shell breakout deployed
- Per-tab wide/constrained modes working as designed
- Three-pane Collections workspace with fullscreen item editor overlay functional
- Auto-select-first collection, dense item browser, split markdown editor all verified
- Validation passed; no issues blocking deployment
- Stu approved architecture; ready for next iteration
