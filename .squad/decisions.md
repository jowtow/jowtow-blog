# Squad Decisions

## Active Decisions

- 2026-05-02: Admin supports per-tab layout modes. Collections, Series, and Images use a wide workspace layout; Dashboard and Create stay constrained.
- 2026-05-02: Wide admin tabs break out of the site-wide content wrapper to use the full viewport width.
- 2026-05-02: This pass ships the shell width system plus a full Collections redesign. Series and Images adopt the wider shell without internal redesign in this pass.
- 2026-05-02: Collections desktop layout uses three panes: collection navigator rail, persistent collection editor, and dense item browser.
- 2026-05-02: Collections auto-selects the first collection when one exists.
- 2026-05-02: Item browsing stays stable. The item workspace uses a dense table/list, item rows open the editor on double click, and the primary New Item action lives in the item workspace toolbar.
- 2026-05-02: Item editing opens in a fullscreen overlay. On desktop, the overlay uses a split markdown editor/preview layout.
- 2026-05-02: This redesign is layout-first. Search, filter, and sort expansion are deferred unless a minimal addition falls out naturally from the layout work.

- 2026-05-02: Admin redesign review rejected due to create-flow regression. Blocker: auto-select effect tied to selectedCollectionSlug overwrites New state on reload. Required non-Ambrose revision.
- 2026-05-02: Collections bootstrap selection guard — auto-select only on explicit bootstrap paths. Preserve create mode on user-driven deselection until explicit selection/save. Affects `components/CollectionsManager/CollectionsManager.tsx`.

## Admin Data Freshness Initiative

- 2026-05-02: Root cause of saved-but-stale data: browser/network cache, `revalidatePath()` limitation, and client-side fetch caching without cache-busting. Three caching layers required unified fix.
- 2026-05-02: All admin GET API routes (`/api/posts`, `/api/series`, `/api/collections`, `/api/images`) must return `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.
- 2026-05-02: All admin data-fetch calls (`loadPosts()`, `loadCollections()`, `loadSeries()`, `loadImages()`) add `cache: 'no-store'` option. Affects `app/admin/page.tsx`, `components/CollectionsManager/CollectionsManager.tsx`, `components/SeriesManager/SeriesManager.tsx`, `components/ImagesManager/ImagesManager.tsx`.
- 2026-05-02: Mutable admin JSON GET routes share one helper for no-store cache contract to prevent drift. Applied to `/api/posts`, `/api/collections`, `/api/series`, `/api/images`.
- 2026-05-02: Admin mutation success states now wait for fresh server read before showing success; each editor preserves intended saved selection from refreshed dataset instead of trusting stale local state.
- 2026-05-02: Admin freshness regression suite locked in source tests (contract-based, no browser harness). Covers: loaders use `cache: 'no-store'`, mutable GET routes emit no-store headers, mutation success flows await fresh reload before success messaging.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
