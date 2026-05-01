import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterCollectionItems,
  getItemSummary,
  sortCollectionItems,
  type AdminCollectionItem,
} from '../components/CollectionsManager/collectionsManagerUtils';

const items: AdminCollectionItem[] = [
  {
    collectionSlug: 'records',
    slug: 'deep-cut',
    title: 'Deep Cut',
    markdown: 'A hidden favorite with layered **notes**.',
    image: '/images/deep-cut.jpg',
    date: '2024-01-10',
  },
  {
    collectionSlug: 'records',
    slug: 'anthem',
    title: 'Anthem',
    markdown: 'The loud opener.',
    image: '/images/anthem.jpg',
    date: '2025-02-01',
  },
  {
    collectionSlug: 'records',
    slug: 'closer',
    title: 'Closer',
    markdown: 'Finale with ![cover](/cover.jpg) [liner notes](/notes).',
    image: '',
    date: '2025-02-01',
  },
];

test('sortCollectionItems orders by newest date and then title', () => {
  const sorted = sortCollectionItems(items);

  assert.deepEqual(
    sorted.map((item) => item.slug),
    ['anthem', 'closer', 'deep-cut'],
  );
});

test('filterCollectionItems matches title, slug, and markdown content', () => {
  assert.deepEqual(
    filterCollectionItems(items, 'favorite').map((item) => item.slug),
    ['deep-cut'],
  );
  assert.deepEqual(
    filterCollectionItems(items, 'closer').map((item) => item.slug),
    ['closer'],
  );
  assert.deepEqual(
    filterCollectionItems(items, '').map((item) => item.slug),
    ['anthem', 'closer', 'deep-cut'],
  );
});

test('getItemSummary strips markdown formatting and image syntax', () => {
  assert.equal(
    getItemSummary('Finale with ![cover](/cover.jpg) [liner notes](/notes).'),
    'Finale with liner notes.',
  );
});
