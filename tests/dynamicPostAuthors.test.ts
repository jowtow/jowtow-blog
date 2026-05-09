import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  DEFAULT_DYNAMIC_POST_AUTHOR,
  normalizeDynamicPostAuthor,
} from '@/lib/posts';

const readSource = async (relativePath: string) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('normalizeDynamicPostAuthor only falls back for missing or blank values', () => {
  assert.equal(DEFAULT_DYNAMIC_POST_AUTHOR, 'John Townsend');
  assert.equal(normalizeDynamicPostAuthor(undefined), undefined);
  assert.equal(normalizeDynamicPostAuthor('   '), undefined);
  assert.equal(normalizeDynamicPostAuthor(' Jane Doe '), 'Jane Doe');
});

test('dynamic post handlers and blob mapping use the John Townsend fallback', async () => {
  const [postsRoute, postsLib] = await Promise.all([
    readSource('app/api/posts/route.ts'),
    readSource('lib/posts.ts'),
  ]);

  assert.match(
    postsRoute,
    /author:\s*normalizeDynamicPostAuthor\(author\) \?\? DEFAULT_DYNAMIC_POST_AUTHOR/,
  );
  assert.match(
    postsRoute,
    /author:\s*normalizeDynamicPostAuthor\(author\) \?\?[\s\S]*normalizeDynamicPostAuthor\(existingPost\.author\) \?\?[\s\S]*DEFAULT_DYNAMIC_POST_AUTHOR/s,
  );
  assert.match(
    postsLib,
    /author:\s*normalizeDynamicPostAuthor\(postData\.author\) \?\?[\s\S]*DEFAULT_DYNAMIC_POST_AUTHOR/s,
  );
});
