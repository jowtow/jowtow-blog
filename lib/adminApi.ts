import { NextResponse } from 'next/server';

export const ADMIN_MUTABLE_JSON_CACHE_CONTROL =
  'no-store, no-cache, must-revalidate, proxy-revalidate';

export function adminMutableJsonResponse(
  body: unknown,
  init: ResponseInit = {}
) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', ADMIN_MUTABLE_JSON_CACHE_CONTROL);

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}
