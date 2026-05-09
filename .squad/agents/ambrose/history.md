# Ambrose — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Frontend Dev
- **Joined:** 2026-05-01T11:58:01.407Z

## Learnings

- 2026-05-09T17:28:31.028+00:00: Author field UI analysis for dynamic posts. Current behavior: author computed at submit (lines 274–278 in PostEditor), not part of formData. Analysis for editable field: add author to emptyFormData and toFormData, place input after slug field in grid (md:grid-cols-3), send formData.author directly in submit payload instead of computed logic. Create mode defaults to "John Townsend"; edit mode preserves initial post author with fallback. No API changes needed. Decision written to `.squad/decisions/inbox/ambrose-author-ui.md`.
- 2026-05-02T17:36:50.506+00:00: Admin data freshness ensures saved posts/collections/items always appear immediately. Added `cache: 'no-store'` to all admin fetch calls (PostEditor, Collections, Series, Images managers) and server-side `Cache-Control` headers on GET endpoints. This prevents browser/Next.js cache from returning stale data after saves. Updated `app/admin/page.tsx:51`, `components/CollectionsManager/CollectionsManager.tsx:182`, `components/SeriesManager/SeriesManager.tsx:189`, `components/ImagesManager/ImagesManager.tsx:151`, and all admin API GET routes (`/api/posts`, `/api/collections`, `/api/series`, `/api/images`).
- 2026-05-02T16:04:37.513+00:00: Collections mobile item cards stay safe inside the overflow-hidden item workspace when each card gets `min-w-0 overflow-hidden` and the summary preview uses `truncate`, preventing long copy from clipping the Select/Open Editor actions.
- 2026-05-02T15:41:30.668+00:00: The Collections item workspace header now uses `w-full min-w-0 overflow-hidden` plus a mobile-stacked control group, keeping phones free of horizontal scroll while restoring the dense side-by-side header from `md+`.
- 2026-05-02T14:47:34.150+00:00: Mobile admin scroll ownership now lives in the page flow below `md`, while `components/RouteAwareMain/RouteAwareMain.tsx`, `app/admin/layout.tsx`, and `app/admin/page.tsx` keep the viewport-locked shell only on desktop.
- 2026-05-02T14:47:34.150+00:00: `app/admin/page.tsx` uses a sticky horizontal tab strip with short mobile labels and per-tab width modes so navigation stays reachable on phones without giving up the wide desktop workspaces.
- 2026-05-02T14:47:34.150+00:00: `components/PostEditor/PostEditor.tsx`, `components/SeriesManager/SeriesManager.tsx`, `components/CollectionsManager/CollectionsManager.tsx`, and `components/ImagesManager/ImagesManager.tsx` now separate browse/edit surfaces on mobile and swap dense desktop rows for card-based mobile affordances where needed.
- 2026-05-02T11:41:01.641+00:00: Added a route-aware admin shell breakout via `components/RouteAwareMain/RouteAwareMain.tsx`, letting `/admin` use full-width inner workspaces while public routes keep the legacy content gutters.
- 2026-05-02T11:41:01.641+00:00: Rebuilt `components/CollectionsManager/CollectionsManager.tsx` into a three-pane workspace with auto-select-first collection behavior, a dense item browser, and a fullscreen split editor overlay for collection items.
- 2026-05-02T11:41:01.641+00:00: `app/admin/page.tsx` now assigns per-tab shell modes so Dashboard/Create stay constrained while Collections/Series/Images render in the wider workspace shell; `components/ImagesManager/ImagesManager.tsx` now fills that shell cleanly.

## Team Session Update

**2026-05-02T17:36:50.506+00:00: Admin Data Freshness Fix**

- Identified cache issue: admin components weren't forcing fresh fetches after saves, causing UI to show stale data
- Problem: Plain `fetch()` calls without cache-busting options hit browser/Next.js cache after save operations
- Solution: Added `cache: 'no-store'` to all admin data-fetch calls + server-side `Cache-Control` headers
- Frontend: Updated 4 admin managers (PostEditor, Collections, Series, Images) to bypass cache on GET requests
- Backend: Added `'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'` headers to all admin API GET responses
- Result: Saved posts/collections/items now always display with latest data from server immediately after save
- Validation: `npm lint`, `npm test` (11/11 passing), `npm run build` all successful
- Ready for deployment; ensures John always sees up-to-date content after saves.

**2026-05-02T16:04:37.513+00:00: Collections Mobile Item Card Truncation**

- Implemented fix for mobile collection item cards clipping action buttons
- Added `min-w-0 overflow-hidden` boundary to each mobile card
- Truncated summary preview text above Select/Open Editor button grid  
- Surgical patch to mobile markup; desktop dense table preserved
- Desktop behavior verified: `md:block` + `overflow-x-auto` wrapper unchanged
- Joey approved implementation with locked source-contract tests
- Validation: `npm test`, `npm run lint`, `npm run build` all passing

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
- 2026-05-02T17:49:54.951+00:00: Admin mutations now wait for an authoritative server reload before success UI appears. Posts stay on the refreshed saved post in `app/admin/page.tsx`/`components/PostEditor/PostEditor.tsx`, collection and series editors reselect the saved item/post after reload, and image bulk actions keep surviving selections instead of clearing them optimistically.

## Admin Freshness Pass — 2026-05-02T17:49:54.951Z

**Orchestration complete:** Cook (backend), Ambrose (frontend), Joey (tester) synchronized on admin data freshness fix.

**Ambrose's scope:**
- All admin load functions (`loadPosts`, `loadCollections`, `loadSeries`, `loadImages`) now use `cache: 'no-store'` 
- Mutation success flows await fresh server read before showing success messaging
- Editors preserve intended saved selection from refreshed dataset instead of trusting stale local state
- Affected files: `app/admin/page.tsx`, `components/PostEditor/PostEditor.tsx`, `components/CollectionsManager/CollectionsManager.tsx`, `components/SeriesManager/SeriesManager.tsx`, `components/ImagesManager/ImagesManager.tsx`

**Cook handled server-side:** Backend now returns `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` headers from all mutable admin JSON GET routes

**Joey locked regression:** Three-part admin freshness contract now tested: loaders use `cache: 'no-store'`, mutable GET routes emit no-store headers, mutation success flows await fresh reload

**Impact:** Saved posts/collections/items now always display with latest server data immediately. Eliminated stale-data behavior that frustrated users.
