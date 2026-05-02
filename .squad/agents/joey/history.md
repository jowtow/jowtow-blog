# Joey — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Tester
- **Joined:** 2026-05-01T11:58:01.410Z

## Learnings

<!-- Append learnings below -->
- 2026-05-02T11:41:01.641+00:00: `components/CollectionsManager/CollectionsManager.tsx` now drives collection auto-selection through `loadCollections()` plus a `useEffect`, so selection-state dependencies in that effect can silently break the "New Collection" flow.
- 2026-05-02T11:41:01.641+00:00: The admin shell width split is implemented by `components/RouteAwareMain/RouteAwareMain.tsx` at the root layout boundary and by a tab-to-mode map in `app/admin/page.tsx`; Collections/Series/Images are wide, Dashboard/Create stay constrained.
