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

test("dynamic post author stays editable in the editor and normalizes to John Townsend", async () => {
  const [postEditor, postsRoute, postsLib] = await Promise.all([
    readSource("components/PostEditor/PostEditor.tsx"),
    readSource("app/api/posts/route.ts"),
    readSource("lib/posts.ts"),
  ]);

  assert.match(postEditor, /const DEFAULT_POST_AUTHOR = "John Townsend";/);
  assert.match(postEditor, /const emptyFormData = \{[\s\S]*author: DEFAULT_POST_AUTHOR,[\s\S]*\};/s);
  assert.match(
    postEditor,
    /const toFormData = \(post: NonNullable<PostEditorProps\["initialPost"\]>\) => \(\{[\s\S]*author: post\.author\?\.trim\(\) \|\| DEFAULT_POST_AUTHOR,[\s\S]*\}\);/s,
  );
  assert.match(
    postEditor,
    /<input[\s\S]*name="author"[\s\S]*value=\{formData\.author\}[\s\S]*placeholder=\{DEFAULT_POST_AUTHOR\}/s,
  );
  assert.match(postEditor, /Controls the public byline only\./);
  assert.match(
    postEditor,
    /body: JSON\.stringify\(\{[\s\S]*originalSlug: initialPost\?\.slug,[\s\S]*author: formData\.author,[\s\S]*date: initialPost\?\.date \|\| new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\],[\s\S]*\}\)/s,
  );

  assert.match(postsLib, /export const DEFAULT_DYNAMIC_POST_AUTHOR = "John Townsend";/);
  assert.match(
    postsLib,
    /export function normalizeDynamicPostAuthor\(author: unknown\): string \| undefined \{[\s\S]*const trimmedAuthor = author\.trim\(\);[\s\S]*return trimmedAuthor \|\| undefined;[\s\S]*\}/s,
  );
  assert.match(
    postsRoute,
    /author:\s*normalizeDynamicPostAuthor\(author\) \?\? DEFAULT_DYNAMIC_POST_AUTHOR,/s,
  );
  assert.match(
    postsRoute,
    /author:\s*normalizeDynamicPostAuthor\(author\) \?\?[\s\S]*normalizeDynamicPostAuthor\(existingPost\.author\) \?\?[\s\S]*DEFAULT_DYNAMIC_POST_AUTHOR,/s,
  );
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
