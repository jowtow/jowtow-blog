import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readSource = async (relativePath: string) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('admin loaders always bypass caches when reading mutable data', async () => {
  const [adminPage, collectionsManager, seriesManager, imagesManager] = await Promise.all([
    readSource('app/admin/page.tsx'),
    readSource('components/CollectionsManager/CollectionsManager.tsx'),
    readSource('components/SeriesManager/SeriesManager.tsx'),
    readSource('components/ImagesManager/ImagesManager.tsx'),
  ]);

  assert.match(adminPage, /fetch\('\/api\/posts', \{ cache: 'no-store' \}\)/);
  assert.match(collectionsManager, /fetch\("\/api\/collections", \{ cache: 'no-store' \}\)/);
  assert.match(seriesManager, /fetch\("\/api\/series", \{ cache: 'no-store' \}\)/);
  assert.match(
    imagesManager,
    /fetch\("\/api\/images", \{\s*headers: getAuthHeaders\(\),\s*cache: 'no-store',\s*\}\)/s,
  );
});

test('mutable admin GET routes emit the no-store cache policy', async () => {
  const [adminApi, ...routeSources] = await Promise.all([
    readSource('lib/adminApi.ts'),
    readSource('app/api/posts/route.ts'),
    readSource('app/api/collections/route.ts'),
    readSource('app/api/series/route.ts'),
    readSource('app/api/images/route.ts'),
  ]);

  assert.match(
    adminApi,
    /ADMIN_MUTABLE_JSON_CACHE_CONTROL\s*=\s*'no-store, no-cache, must-revalidate, proxy-revalidate'/,
  );

  routeSources.forEach((source) => {
    assert.match(source, /import \{ adminMutableJsonResponse \} from '@\/lib\/adminApi';/);
    assert.match(source, /export async function GET[\s\S]*return adminMutableJsonResponse\(/s);
  });
});

test('post admin success callbacks await a fresh posts reload before leaving the editor', async () => {
  const [postEditor, adminPage] = await Promise.all([
    readSource('components/PostEditor/PostEditor.tsx'),
    readSource('app/admin/page.tsx'),
  ]);

  assert.match(
    postEditor,
    /onSuccess\?: \(\s*savedSlug: string,\s*\) => Promise<PostEditorProps\["initialPost"\]> \| PostEditorProps\["initialPost"\];/s,
  );
  assert.match(postEditor, /onDelete\?: \(deletedSlug: string\) => Promise<void> \| void;/);
  assert.match(
    postEditor,
    /const authoritativePost = await onSuccess\?\.\(payload\.data\.slug\);[\s\S]*if \(authoritativePost\) \{[\s\S]*setFormData\(toFormData\(authoritativePost\)\);[\s\S]*setSuccess\(true\);/s,
  );
  assert.match(postEditor, /setSuccess\(false\);\s*await onDelete\?\.\(initialPost\.slug\);/s);
  assert.match(
    adminPage,
    /onSuccess=\{async \(savedSlug\) => \{\s*const \{ selectedPost \} = await loadPosts\(\{ preferredSlug: savedSlug \}\);[\s\S]*setActiveTab\('create'\);[\s\S]*return selectedPost;\s*\}\}/s,
  );
  assert.match(
    adminPage,
    /onDelete=\{async \(\) => \{\s*await loadPosts\(\);\s*setEditingPost\(null\);\s*setActiveTab\('dashboard'\);\s*\}\}/s,
  );
});

test('collection, series, and image save flows reload fresh server state before success messaging', async () => {
  const [collectionsManager, seriesManager, imagesManager] = await Promise.all([
    readSource('components/CollectionsManager/CollectionsManager.tsx'),
    readSource('components/SeriesManager/SeriesManager.tsx'),
    readSource('components/ImagesManager/ImagesManager.tsx'),
  ]);

  assert.match(
    collectionsManager,
    /await loadCollections\(\{ preferredSlug: savedSlug \}\);\s*setSuccess\(/s,
  );
  assert.match(
    collectionsManager,
    /await loadCollections\(\{[\s\S]*preferredSlug: collectionSlug,[\s\S]*preferredItemSlug: savedItem\.slug,[\s\S]*preferredMobilePanel: "items",[\s\S]*\}\);[\s\S]*setSuccess\(/s,
  );
  assert.match(
    seriesManager,
    /await loadSeries\(\{ preferredSlug: savedSlug \}\);\s*setSeriesSuccess\(/s,
  );
  assert.match(
    seriesManager,
    /await loadSeries\(\{[\s\S]*preferredSlug: seriesSlug,[\s\S]*preferredEntrySlug: savedPost\.slug,[\s\S]*preferredMobilePanel: "posts",[\s\S]*preferredPostsView: "editor",[\s\S]*\}\);[\s\S]*setSeriesSuccess\(/s,
  );
  assert.match(
    imagesManager,
    /const saved = formatBytes\(data\.summary\.savedBytes\);\s*await loadImages\(\);\s*setSuccess\(\s*`Optimized /s,
  );
  assert.match(
    imagesManager,
    /const data = \(await response\.json\(\)\) as \{[\s\S]*summary: DeleteSummary;[\s\S]*\};\s*await loadImages\(\);\s*setSuccess\(\s*`Deleted /s,
  );
});
