import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const readSource = async (relativePath: string) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("post saves wait for a fresh post read before claiming success", async () => {
  const [adminPage, postEditor] = await Promise.all([
    readSource("app/admin/page.tsx"),
    readSource("components/PostEditor/PostEditor.tsx"),
  ]);

  assert.match(
    adminPage,
    /const \{ selectedPost \} = await loadPosts\(\{ preferredSlug: savedSlug \}\);[\s\S]*setEditingPost\(selectedPost\);[\s\S]*setActiveTab\('create'\);/s,
  );
  assert.match(
    postEditor,
    /const authoritativePost = await onSuccess\?\.\(payload\.data\.slug\);[\s\S]*if \(authoritativePost\) \{[\s\S]*setFormData\(toFormData\(authoritativePost\)\);[\s\S]*setSuccess\(true\);/s,
  );
  assert.match(postEditor, /await onDelete\?\.\(initialPost\.slug\);/);
  assert.match(adminPage, /throw new Error\(message\);/);
});

test("collections and series mutations re-read the server while preserving selection", async () => {
  const [collectionsManager, seriesManager] = await Promise.all([
    readSource("components/CollectionsManager/CollectionsManager.tsx"),
    readSource("components/SeriesManager/SeriesManager.tsx"),
  ]);

  assert.match(
    collectionsManager,
    /await loadCollections\(\{ preferredSlug: savedSlug \}\);[\s\S]*setSuccess\(/s,
  );
  assert.match(
    collectionsManager,
    /await loadCollections\(\{[\s\S]*preferredSlug: collectionSlug,[\s\S]*preferredItemSlug: savedItem\.slug,[\s\S]*keepItemEditorOpen: true,[\s\S]*preferredMobilePanel: "items",[\s\S]*\}\);[\s\S]*setSuccess\(/s,
  );
  assert.match(
    collectionsManager,
    /await loadCollections\(\{[\s\S]*preferredSlug: selectedCollectionSlug,[\s\S]*preferredItemSlug,[\s\S]*preferredMobilePanel: "items",[\s\S]*\}\);[\s\S]*setSuccess\(successMessage\);/s,
  );
  assert.match(collectionsManager, /throw new Error\(message\);/);

  assert.match(
    seriesManager,
    /await loadSeries\(\{ preferredSlug: savedSlug \}\);[\s\S]*setSeriesSuccess\(/s,
  );
  assert.match(
    seriesManager,
    /await loadSeries\(\{[\s\S]*preferredSlug: seriesSlug,[\s\S]*preferredEntrySlug: savedPost\.slug,[\s\S]*preferredMobilePanel: "posts",[\s\S]*preferredPostsView: "editor",[\s\S]*\}\);[\s\S]*setSeriesSuccess\(/s,
  );
  assert.match(seriesManager, /throw new Error\(message\);/);
});

test("image mutations only show success after the image list reloads", async () => {
  const imagesManager = await readSource("components/ImagesManager/ImagesManager.tsx");

  assert.match(
    imagesManager,
    /const saved = formatBytes\(data\.summary\.savedBytes\);[\s\S]*await loadImages\(\);[\s\S]*setSuccess\(/s,
  );
  assert.match(
    imagesManager,
    /const data = \(await response\.json\(\)\) as \{[\s\S]*summary: DeleteSummary;[\s\S]*\};[\s\S]*await loadImages\(\);[\s\S]*setSuccess\(/s,
  );
  assert.match(imagesManager, /throw new Error\(message\);/);
});
