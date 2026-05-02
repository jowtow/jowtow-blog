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

## Team Session Update

**2026-05-02T11:41:01.641+00:00: Admin Shell & Collections Redesign**

- Architecture review completed; recommendations approved by team
- Ambrose implemented all changes successfully
- Route-scoped admin shell boundary now active
- Collections workspace: three-pane layout with fullscreen editor overlay
- Per-tab layout modes working (wide for Collections/Series/Images; constrained for Dashboard/Create)
- Validation passed; ready for deployment
- Series/Images adoption and search/filter expansion deferred to next pass
