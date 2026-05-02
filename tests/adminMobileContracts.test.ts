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

test('collections item workspace stacks header controls on mobile without changing desktop density', async () => {
  const collectionsManager = await readSource('components/CollectionsManager/CollectionsManager.tsx');

  assert.match(
    collectionsManager,
    /<section className=\{\`\$\{mobilePanel === "items" \? "block" : "hidden"\} w-full min-w-0 overflow-hidden rounded-2xl border border-\[var\(--color-secondary\)\]\/35 bg-black\/25 xl:block`\}>/,
  );
  assert.match(
    collectionsManager,
    /className="flex flex-col gap-4 border-b border-\[var\(--color-secondary\)\]\/20 px-4 py-3 md:flex-row md:items-start md:justify-between md:px-5 md:py-4"/,
  );
  assert.match(
    collectionsManager,
    /className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end"/,
  );
  assert.match(
    collectionsManager,
    /className="w-full cursor-pointer rounded-md bg-\[var\(--color-primary\)\] px-4 py-2 font-semibold text-\[var\(--text-color-dark\)\] disabled:opacity-50 md:w-auto"/,
  );
});

test('collections item workspace keeps mobile cards and desktop-only horizontal table scroll', async () => {
  const collectionsManager = await readSource('components/CollectionsManager/CollectionsManager.tsx');

  assert.match(
    collectionsManager,
    /grid gap-4 xl:grid-cols-\[240px_minmax\(320px,400px\)_minmax\(0,1fr\)\]/,
  );
  assert.match(
    collectionsManager,
    /<section className=\{`\$\{mobilePanel === "items" \? "block" : "hidden"\} w-full min-w-0 overflow-hidden rounded-2xl border border-\[var\(--color-secondary\)\]\/35 bg-black\/25 xl:block`\}>/,
  );
  assert.match(
    collectionsManager,
    /<div className="grid gap-3 px-4 py-4 md:hidden">[\s\S]*min-w-0 overflow-hidden rounded-2xl border bg-black\/20 p-4 transition[\s\S]*mt-2 truncate text-sm text-\[var\(--text-light\)\]\/55[\s\S]*Open Editor/s,
  );
  assert.match(
    collectionsManager,
    /className="truncate text-sm text-\[var\(--text-light\)\]\/55">[\s\S]*\{getItemSummary\(item\.markdown\)\}/s,
  );
  assert.match(
    collectionsManager,
    /<div className="mt-4 grid grid-cols-2 gap-2">[\s\S]*Select[\s\S]*Open Editor/s,
  );
  assert.match(
    collectionsManager,
    /<div className="mt-2 grid grid-cols-2 gap-2">[\s\S]*Move Earlier[\s\S]*Move Later/s,
  );
  assert.match(
    collectionsManager,
    /\/api\/collections\/\$\{encodeURIComponent\(selectedCollectionSlug\)\}\/items\/reorder/,
  );
  assert.match(
    collectionsManager,
    /<div className="hidden overflow-x-auto md:block">[\s\S]*<div className="min-w-\[720px\]">[\s\S]*grid-cols-\[minmax\(0,2\.1fr\)_150px_120px_120px\][\s\S]*onDoubleClick=\{\(\) => openItemEditor\(item\)\}/s,
  );
  assert.match(
    collectionsManager,
    /aria-label=\{`Move \$\{item\.title\} earlier`\}[\s\S]*aria-label=\{`Move \$\{item\.title\} later`\}/s,
  );
});
