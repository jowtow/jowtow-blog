# Stu — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Lead
- **Joined:** 2026-05-01T11:58:01.406Z

## Learnings

<!-- Append learnings below -->
- 2026-05-02T11:41:01.641+00:00: Clean admin width escape should be handled at a route/layout boundary, not with negative margins inside `app/admin/page.tsx`; `app/layout.tsx` currently applies the global `main.content` wrapper to all routes.
- 2026-05-02T11:41:01.641+00:00: `app/admin/page.tsx` is the current admin shell and tab controller; keep per-tab width in a tab-to-layout-mode map so Collections/Series/Images can go wide while Dashboard/Create stay constrained without duplicating chrome.
- 2026-05-02T11:41:01.641+00:00: `components/CollectionsManager/CollectionsManager.tsx` currently mixes collection selection, collection form, item browser, and item editor state in one client component; future churn drops if server-backed collection/item data state is separated from overlay/editor UI state.
- 2026-05-02T11:41:01.641+00:00: In `components/CollectionsManager/CollectionsManager.tsx`, keep first-load auto-selection behind an explicit bootstrap flag so collection reloads do not depend on `selectedCollectionSlug` and overwrite the New/create state.

## Team Session Update

**2026-05-02T11:41:01.641+00:00: Admin Shell & Collections Redesign**

- Architecture review completed; recommendations approved by team
- Ambrose implemented all changes successfully
- Route-scoped admin shell boundary now active
- Collections workspace: three-pane layout with fullscreen editor overlay
- Per-tab layout modes working (wide for Collections/Series/Images; constrained for Dashboard/Create)
- Validation passed; ready for deployment
- Series/Images adoption and search/filter expansion deferred to next pass

**2026-05-02T11:41:01.641+00:00: Collections Regression Fix (Stu)**

- Admin redesign rejected on create-flow regression: auto-select effect tied to `selectedCollectionSlug` overwrote New state
- Stu assigned (Ambrose locked out by reviewer decision)
- Solution: Separated bootstrap auto-selection from reload behavior
- New mode now persists until explicit user selection/save
- Validation passed; regression fixed
- Collections redesign ready for re-review

## Learnings

<!-- 2026-05-02T17:36:50.506+00:00 -->
- 2026-05-02T17:36:50.506+00:00: The `GET /api/series` route was missing `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` while all other admin GET routes (posts, collections, images) already had it — this was the last gap in the "always fresh" guarantee.
- 2026-05-02T17:36:50.506+00:00: Two-layer approach for admin freshness: (1) server-side `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` on every admin GET route response prevents Netlify edge CDN caching; (2) client-side `cache: 'no-store'` on every GET fetch call prevents browser HTTP cache re-use. Both layers are now complete across all four admin data endpoints.
- 2026-05-02T17:36:50.506+00:00: In Next.js 16 (used here), API routes are already dynamic by default (no `export const dynamic = 'force-dynamic'` needed) — confirmed by build output showing all `/api/*` routes marked `ƒ (Dynamic)`. The issue was purely HTTP-layer caching (CDN + browser), not Next.js Full Route Cache.

## Team Session Update

**2026-05-02T17:36:50.506+00:00: Admin Stale Data Fix**

- User reported saved posts/series/collections/images not appearing after saves or refreshes
- Root cause: `GET /api/series` was missing `Cache-Control: no-store` — Netlify CDN could cache the response
- Fix: Added `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` to `/api/series` GET response (and confirmed `/api/images` was similarly completed)
- All four admin GET routes now have consistent no-cache headers
- All four client-side GET fetch calls already had `cache: 'no-store'`
- Build passes; all 11 tests pass
