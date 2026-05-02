import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDynamicCollectionItems } from '../lib/dynamicCollections';

test('normalizeDynamicCollectionItems preserves explicit manual order', () => {
  const normalized = normalizeDynamicCollectionItems([
    {
      collectionSlug: 'mixes',
      slug: 'third',
      title: 'Third',
      markdown: '',
      image: '',
      date: '2024-03-01',
      order: 2,
    },
    {
      collectionSlug: 'mixes',
      slug: 'first',
      title: 'First',
      markdown: '',
      image: '',
      date: '2024-01-01',
      order: 0,
    },
    {
      collectionSlug: 'mixes',
      slug: 'second',
      title: 'Second',
      markdown: '',
      image: '',
      date: '2024-02-01',
      order: 1,
    },
  ]);

  assert.deepEqual(
    normalized.map((item) => ({ slug: item.slug, order: item.order })),
    [
      { slug: 'first', order: 0 },
      { slug: 'second', order: 1 },
      { slug: 'third', order: 2 },
    ]
  );
});

test('normalizeDynamicCollectionItems gives legacy items a stable fallback order', () => {
  const normalized = normalizeDynamicCollectionItems([
    {
      collectionSlug: 'mixes',
      slug: 'manual-tail',
      title: 'Manual tail',
      markdown: '',
      image: '',
      date: '2024-04-10',
      order: 2,
    },
    {
      collectionSlug: 'mixes',
      slug: 'newer-legacy',
      title: 'Newer legacy',
      markdown: '',
      image: '',
      date: '2024-04-01',
    },
    {
      collectionSlug: 'mixes',
      slug: 'older-legacy',
      title: 'Older legacy',
      markdown: '',
      image: '',
      date: '2024-03-01',
    },
  ]);

  assert.deepEqual(
    normalized.map((item) => ({ slug: item.slug, order: item.order })),
    [
      { slug: 'newer-legacy', order: 0 },
      { slug: 'older-legacy', order: 1 },
      { slug: 'manual-tail', order: 2 },
    ]
  );
});
