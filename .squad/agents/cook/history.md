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

### 2026-05-09: Author Field Analysis for Editability

**Request:** Analyze backend/data implications of making author field editable with a default of "John Townsend".

**Current Author Flow (Dynamic Posts):**
- **Creation:** PostEditor.tsx (line 274-278) derives author from Netlify user metadata, email, or defaults to "Guest". This is passed to POST /api/posts.
- **Storage:** app/api/posts/route.ts POST (line 49) stores author with fallback: `author: author || 'Guest'`. PUT (line 146) preserves existing author if not provided.
- **Retrieval:** /api/posts GET lists all stored posts with author field intact. Admin page displays author next to post metadata.
- **Rendering:** lib/posts.ts combines static and dynamic posts, mapping author from JSON into PostMetadata type. Published pages render via metadata.author.

**Current Behavior Issues:**
- Author is set at creation time and cannot be edited after—it's baked into the stored JSON.
- No UI input for author in PostEditor (lines 399-547). Author is derived server-side from user context.
- Existing posts have author already set (either from user metadata or "Guest" fallback).
- On edit, author field is preserved unless explicitly overwritten by the API call.

**Recommendations:**

1. **Add author input field to PostEditor** — Add a text input between title/slug and cover image section. Default to "John Townsend" on create, preserve existing value on edit.

2. **Update POST /api/posts** — Accept author from request body. Default to "John Townsend" if not provided (line 49).

3. **Update PUT /api/posts** — Accept author from request body. Preserve existing author if not provided (line 146, already does this—just ensure it defaults to "John Townsend" if blank).

4. **Update PostEditor form data** — Add author to formData state and toFormData() helper. Line 31-36 needs author field.

5. **Update PostEditor submission** — Pass author from formData instead of deriving it (line 274-278).

**Ambiguities & Edge Cases:**

- **Existing Posts:** Current posts have author set to user metadata, email, or "Guest". Changing the default to "John Townsend" only affects *new* posts and edited posts that don't specify author. Should existing posts be migrated? Recommend no migration—let admins explicitly update if needed.
- **Blank Author on Edit:** If user clears the author field and saves, should it fall back to "John Townsend"? Recommend yes—enforce "John Townsend" as the floor value.
- **Static Posts:** Static posts use gray-matter frontmatter (author from YAML). They're read-only in the editor. No changes needed there.
- **Admin Freshness:** Author field changes follow existing no-store cache policy. No new cache contract issues.

**Files to Modify:**
- components/PostEditor/PostEditor.tsx (add UI + formData)
- app/api/posts/route.ts (update defaults)
