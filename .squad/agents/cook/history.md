# Cook — History

## Core Context

- **Project:** A Next.js blog with dynamic content, Netlify deployment, and identity management
- **Role:** Backend Dev
- **Joined:** 2026-05-01T11:58:01.409Z

## Learnings

### 2026-05-02: Admin Data Freshness Issue - Root Cause Found

**Problem:** Admin pages display stale content after saves. Users save posts but don't see updates, even after refresh.

**Root Cause:** Browser/network cache on API responses. Three layers of caching:
1. API GET endpoints have no `Cache-Control` headers → browser caches aggressively
2. `revalidatePath()` in mutation handlers only invalidates public pages, not API responses
3. Client-side `fetch()` calls without cache directives can reuse cached responses

**Architecture Trace:**
- Admin page: `app/admin/page.tsx` (client component)
- Fetches: `/api/posts`, `/api/series`, `/api/collections` (no cache policy)
- Saves trigger: POST/PUT/DELETE → calls `revalidatePath()` for public routes
- Netlify Blobs: Used for dynamic posts/series/collections storage

**Solution:** Add `Cache-Control: no-store, no-cache, must-revalidate` to all admin API endpoints.

**Key Files:**
- `app/admin/page.tsx` — admin dashboard (client-side fetch, lines 51, 79-81)
- `app/api/posts/route.ts` — posts API (uses Netlify Blobs, calls revalidatePath)
- `lib/posts.ts` — combines static + dynamic posts via getDynamicPosts()
- `next.config.ts` — has `staleTimes: { dynamic: 0 }` but doesn't affect API responses

**Recommendation Written:** `.squad/decisions/inbox/cook-stale-data-fix.md`

### 2026-05-02T17:49:54.951+00:00: Admin freshness contract centralized

**Audit Result:** The mutable admin JSON GET surface is limited to `/api/posts`, `/api/collections`, `/api/series`, and `/api/images`. The nested collection-item and series-post routes are mutation-only, so they do not need GET cache headers.

**Implementation:** Centralize the admin freshness contract in `lib/adminApi.ts` and have each mutable admin GET route return through that helper. Leave `/api/images/[filename]` on immutable asset caching because it serves image bytes, not mutable admin JSON.

**Verification:** Source-contract tests now lock the helper-backed cache policy, and `npm test`, `npm run lint`, and `npm run build` all pass after the change.

### 2026-05-02T17:49:54.951Z: Admin Freshness Pass Complete

**Orchestration:** Cook, Ambrose, Joey synchronized on admin data freshness regression.

**Cook's deliverable:** Audited mutable admin GET surface (`/api/posts`, `/api/collections`, `/api/series`, `/api/images`), centralized cache-control contract in helper, verified all routes return no-store headers. Left immutable asset endpoint `/api/images/[filename]` untouched.

**Ambrose's deliverable:** Updated all admin load functions to use `cache: 'no-store'`, mutation success states now await fresh reload before messaging, editors preserve selection from refreshed dataset.

**Joey's deliverable:** Locked admin freshness regression suite in source tests covering three-part contract: loaders use no-store, mutable GET routes emit no-store headers, mutations wait for authoritative reload.

**Result:** Eliminated all three caching layers causing admin stale data. Saved content now always appears immediately with live server data.
