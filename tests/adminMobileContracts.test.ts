import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readSource = async (relativePath: string) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('admin shell keeps viewport locking on md+ only', async () => {
  const [globalsCss, routeAwareMain, adminLayout] = await Promise.all([
    readSource('app/globals.css'),
    readSource('components/RouteAwareMain/RouteAwareMain.tsx'),
    readSource('app/admin/layout.tsx'),
  ]);

  assert.match(
    globalsCss,
    /@media \(min-width: 768px\)\s*\{\s*html\.admin-route,\s*body\.admin-route\s*\{\s*height: 100dvh;\s*overflow: hidden;/s,
  );
  assert.match(
    routeAwareMain,
    /min-h-\[calc\(100dvh-var\(--admin-header-height\)-var\(--admin-footer-height\)\)\] md:flex-1 md:min-h-0 md:h-\[calc\(100dvh-var\(--admin-header-height\)-var\(--admin-footer-height\)\)\] md:overflow-hidden/,
  );
  assert.match(
    adminLayout,
    /min-h-\[calc\(100dvh-var\(--admin-header-height\)-var\(--admin-footer-height\)\)\] w-full flex-col[\s\S]*md:h-full md:min-h-0/s,
  );
});

test('admin page keeps mobile tab-strip affordances and desktop-only inner scrolling', async () => {
  const adminPage = await readSource('app/admin/page.tsx');

  assert.match(
    adminPage,
    /\{ key: 'dashboard', label: 'Dashboard', shortLabel: 'Home', mode: 'constrained' \}[\s\S]*\{ key: 'create', label: 'Create', shortLabel: 'Write', mode: 'constrained' \}[\s\S]*\{ key: 'series', label: 'Series', shortLabel: 'Series', mode: 'wide' \}[\s\S]*\{ key: 'collections', label: 'Collections', shortLabel: 'Collections', mode: 'wide' \}[\s\S]*\{ key: 'images', label: 'Images', shortLabel: 'Images', mode: 'wide' \}/,
  );
  assert.match(adminPage, /scrollIntoView\(\{\s*behavior: 'smooth',\s*block: 'nearest',\s*inline: 'center',\s*\}\);/s);
  assert.match(adminPage, /sticky top-2 z-20[\s\S]*Swipe for more[\s\S]*overflow-x-auto/s);
  assert.match(adminPage, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(adminPage, /className="flex-1 md:min-h-0 md:overflow-y-auto md:overscroll-contain"/);
});

test('collections bootstrap selection is isolated from user-driven new state', async () => {
  const collectionsManager = await readSource('components/CollectionsManager/CollectionsManager.tsx');

  assert.match(
    collectionsManager,
    /const startNewCollection = useCallback\(\(\) => \{\s*setSelectedCollectionSlug\(null\);[\s\S]*setItemEditorOpen\(false\);/s,
  );
  assert.match(
    collectionsManager,
    /if \(preferredSlug\) \{[\s\S]*selectCollection\(matchedCollection\);[\s\S]*return;\s*\}\s*\n\s*\n\s*if \(autoSelectFirst\) \{\s*selectCollection\(sortedCollections\[0\]\);/s,
  );
  assert.match(
    collectionsManager,
    /useEffect\(\(\) => \{\s*void loadCollections\(\{ autoSelectFirst: true \}\);\s*\}, \[loadCollections\]\);/,
  );
  assert.match(
    collectionsManager,
    /\[selectCollection, startNewCollection\],/,
  );
});
