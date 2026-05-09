# Joey — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Tester
- **Joined:** 2026-05-01T11:58:01.410Z

## Learnings

<!-- Append learnings below -->
- 2026-05-09T18:03:03.845+00:00: Dynamic post author coverage belongs in the existing source-contract admin suites: `tests/adminAuthoritativeRefresh.test.ts` should lock editor state (`emptyFormData`, `toFormData`, author input, JSON payload) while `tests/adminFreshnessContracts.test.ts` should keep authoritative save reloads rehydrating `toFormData(authoritativePost)`. `components/PostEditor/PostEditor.tsx`, `app/api/posts/route.ts`, and `lib/posts.ts` together define the byline-only author contract, with John Townsend as the create/default normalization fallback.
- 2026-05-09T17:28:31.028Z: Author field editability on dynamic posts introduces four critical validation contracts: (1) author initialization to "John Townsend" on create, load from post on edit, (2) author transmission in POST/PUT body with empty-string defaulting, (3) API routes applying default via `author || 'John Townsend'` on create and `author || existingPost.author || 'John Townsend'` on update, (4) admin freshness contract protecting author field from stale-cache regressions after save. Highest-risk edge cases: empty string → silent default without UI feedback (must test), author clobbering on concurrent edits (server as source of truth), author field validation boundary (special chars, XSS, truncation). Implementation gate: author field added to form, `toFormData()` includes author, `onSuccess` callback awaits fresh reload, PUT path preserves existing author on empty submission.
- 2026-05-02T17:49:54.951+00:00: For admin freshness regressions, the safest source-contract gate is a three-part contract: admin loaders must fetch with `cache: 'no-store'`, every mutable admin GET route must emit `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, and mutation success paths must await their authoritative reload before showing success or navigating away.
- 2026-05-02T17:36:50.506+00:00: Admin data freshness issues traced to 5 failure modes: (1) save succeeds but UI doesn't update (onSuccess callback chain broken), (2) refresh hits stale cache (no cache-busting headers), (3) concurrent saves race (no deduplication), (4) manual refresh doesn't bypass cache (default fetch caching), (5) component unmounts before async refresh completes (no AbortController). Most critical: PostEditor/CollectionsManager/SeriesManager don't await loadPosts/loadCollections/loadSeries after save, and all load functions lack `cache: 'no-store'`.
- 2026-05-02T17:36:50.506+00:00: Created comprehensive test strategy (`tests/adminDataFreshness.test.ts`) with 10 source-contract tests covering save→refresh flow, cache invalidation, concurrent save safety, manual refresh accuracy, and component lifecycle safeguards. Strategy document in `.squad/decisions/inbox/joey-admin-data-freshness-test-strategy.md`.
- 2026-05-02T16:04:37.513+00:00: The landed collection-card clipping fix is safe when `components/CollectionsManager/CollectionsManager.tsx` keeps `min-w-0 overflow-hidden` on each mobile card, truncates the markdown summary before the action row, and leaves the desktop `md:block` table wrapper plus `min-w-[720px]` grid unchanged.
- 2026-05-02T16:04:37.513+00:00: The mobile item cards in `components/CollectionsManager/CollectionsManager.tsx` need the preview copy clamped (`line-clamp-2` + word breaking) while keeping the two-button action grid intact, otherwise long summaries can visually crowd or clip the mobile action row even though the desktop table contract stays unchanged.
- 2026-05-02T15:41:30.668+00:00: For `components/CollectionsManager/CollectionsManager.tsx`, the safest reviewer gate for the item-workspace scroll fix is a source-contract pairing: keep the mobile item cards behind `md:hidden`, and keep the dense table’s `overflow-x-auto` + `min-w-[720px]` wrapper desktop-only so mobile pages do not regain horizontal overflow while desktop density survives.
- 2026-05-02T11:41:01.641+00:00: `components/CollectionsManager/CollectionsManager.tsx` now drives collection auto-selection through `loadCollections()` plus a `useEffect`, so selection-state dependencies in that effect can silently break the "New Collection" flow.
- 2026-05-02T11:41:01.641+00:00: The admin shell width split is implemented by `components/RouteAwareMain/RouteAwareMain.tsx` at the root layout boundary and by a tab-to-mode map in `app/admin/page.tsx`; Collections/Series/Images are wide, Dashboard/Create stay constrained.
- 2026-05-02T14:47:34.150+00:00: The current mobile admin shell pass is concentrated in `app/admin/layout.tsx`, `components/RouteAwareMain/RouteAwareMain.tsx`, and `app/admin/page.tsx`; the intended contract is natural mobile page scroll with desktop-only viewport locking plus a horizontally scrollable mobile tab strip.
- 2026-05-02T14:47:34.150+00:00: `tests/adminMobileContracts.test.ts` uses source-contract checks because the repo’s test surface is `node:test` via `tsx --test` without a DOM harness; it now guards the md+ admin shell lock, mobile tab-strip affordances, and the Collections bootstrap auto-select fix.
- 2026-05-02T14:47:34.150+00:00: The mobile admin refactor keeps desktop workflows by swapping to mobile-only panel toggles/cards in `SeriesManager`, `CollectionsManager`, and `ImagesManager`, while retaining lg/xl multi-pane or dense-table layouts at larger breakpoints.
- 2026-05-02T14:47:34.150+00:00: Repo-level confidence for admin UI reviews comes from `npm test`, `npm run lint`, and `npm run build`; the current mobile admin pass clears all three, with build-time blob warnings remaining non-blocking environment noise.

## Admin Freshness Pass — 2026-05-02T17:49:54.951Z

**Orchestration complete:** Cook (backend), Ambrose (frontend), Joey (tester) synchronized on admin data freshness regression suite.

**Joey's scope:**
- Locked three-part admin freshness contract in source tests: loaders use `cache: 'no-store'`, mutable GET routes emit no-store headers, mutation success flows await authoritative reload
- Test suite covers posts, collections, series, images
- Source-contract approach (no browser harness needed) ensures regression prevention
- Future admin refactors cannot silently reintroduce "saved but still stale" behavior

**Cook's backend work:** All mutable admin JSON GET routes return `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, centralized via helper to prevent drift

**Ambrose's frontend work:** All admin loaders use `cache: 'no-store'`, mutation success awaits fresh reload, editors preserve selection from refreshed data

**Impact:** Eliminated three-layer cache staleness issue. Admin UI now always shows authoritative server data immediately after save.

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
