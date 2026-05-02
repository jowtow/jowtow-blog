# Admin Mutable JSON Cache

## Pattern

When an admin UI saves mutable CMS data and then reloads JSON from the server, route every mutable admin GET through a shared helper that sets `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.

## Use when

- admin pages save and immediately re-read server state
- the response is mutable JSON, not an immutable asset file
- multiple API routes should obey the same freshness contract

## Why it works

- One helper makes the cache contract explicit and consistent.
- Source-contract tests can lock both the helper value and each route's usage.
- It avoids accidentally changing unrelated asset caching like immutable image file responses.

## Example here

- `lib/adminApi.ts`
- `app/api/posts/route.ts`
- `app/api/collections/route.ts`
- `app/api/series/route.ts`
- `app/api/images/route.ts`
